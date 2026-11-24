import { Router } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { aiKnowledgeBase, organizations } from '../db/schema.ts';
import { type AuthRequest, writeAuditLog } from '../middleware/auth.ts';

const router = Router();

function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Knowledge Base CRUD (Super Admin uploads SOPs, HIRA, legal docs for RAG grounding)
router.get('/knowledge-base', async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(aiKnowledgeBase)
      .where(eq(aiKnowledgeBase.organizationId, req.organizationId!))
      .orderBy(desc(aiKnowledgeBase.createdAt));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load AI knowledge base' });
  }
});

router.post('/knowledge-base', async (req: AuthRequest, res) => {
  try {
    const b = req.body;
    if (!b.title || !b.contentText) {
      return res.status(400).json({ error: 'Title and document content are required' });
    }
    const [created] = await db
      .insert(aiKnowledgeBase)
      .values({
        organizationId: req.organizationId!,
        docType: b.docType || 'SOP',
        title: b.title,
        sourceReference: b.sourceReference || `KB-${Date.now().toString().slice(-5)}`,
        contentText: b.contentText,
        tags: b.tags || [],
        approvedBy: req.authUser!.fullName,
        isActive: true,
        isDemo: false,
      })
      .returning();

    await writeAuditLog({
      organizationId: req.organizationId!,
      userId: req.authUser!.id,
      userName: req.authUser!.fullName,
      action: 'ADD_AI_KNOWLEDGE_DOC',
      entityType: 'ai_knowledge_base',
      entityId: created.id,
      details: { title: created.title, docType: created.docType },
    });

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save knowledge document' });
  }
});

router.delete('/knowledge-base/:id', async (req: AuthRequest, res) => {
  try {
    await db
      .delete(aiKnowledgeBase)
      .where(
        and(
          eq(aiKnowledgeBase.id, req.params.id),
          eq(aiKnowledgeBase.organizationId, req.organizationId!)
        )
      );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete knowledge document' });
  }
});

// Multimodal AI Safety Observation Analysis (Image / Voice transcript / Text)
router.post('/analyze-observation', async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const { description, location, imageDataUrl, mimeType } = req.body;

    if (!description && !imageDataUrl) {
      return res.status(400).json({ error: 'Provide an image, voice transcript, or observation description.' });
    }

    const ai = getGeminiClient();
    const parts: any[] = [];

    if (imageDataUrl && typeof imageDataUrl === 'string') {
      const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      const base64Data = match ? match[2] : imageDataUrl;
      const resolvedMime = match ? match[1] : mimeType || 'image/jpeg';
      parts.push({
        inlineData: {
          mimeType: resolvedMime,
          data: base64Data,
        },
      });
    }

    const kbDocs = await db
      .select()
      .from(aiKnowledgeBase)
      .where(and(eq(aiKnowledgeBase.organizationId, orgId), eq(aiKnowledgeBase.isActive, true)))
      .limit(6);

    const kbContext = kbDocs
      .map((d) => `[${d.sourceReference}] ${d.title}: ${d.contentText.slice(0, 400)}`)
      .join('\n');

    parts.push({
      text: `Analyze this industrial workplace safety observation.
Location: ${location || 'Not specified'}
Field Notes / Transcript: ${description || 'Analyze the attached workplace image only.'}

Company EHS Knowledge Base References:
${kbContext || 'ISO 45001, OSHA, NBC 2016, Indian OSH Code 2020'}

Safety Guardrails:
1. Never accuse, blame, or discipline an individual worker. Focus strictly on observable hazards, conditions, PPE controls, engineering safeguards, and safe behaviors.
2. Clearly express uncertainty or lighting/angle limitations in uncertaintyNotes.
3. Remind the reviewer that a qualified Safety Officer must verify the risk classification.`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: { parts },
      config: {
        systemInstruction:
          'You are ARSHIEL SAFETY AI, an expert Certified Industrial Safety & EHS Engineer. Always return strict structured JSON following the schema. Never invent legal citations or blame employees.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Concise observation title' },
            observationType: {
              type: Type.STRING,
              description: 'One of: Unsafe Condition, Unsafe Act, Near Miss, Safe Act, Stop Work',
            },
            hazardCategory: { type: Type.STRING, description: 'e.g. Working at Height, Fire & Egress, Electrical, PPE, Machine Guarding, Housekeeping' },
            detailedDescription: { type: Type.STRING },
            potentialConsequence: { type: Type.STRING },
            suggestedSeverity: { type: Type.STRING, description: 'Low, Medium, High, or Critical' },
            suggestedLikelihood: { type: Type.STRING, description: 'Rare, Unlikely, Possible, Likely, or Almost Certain' },
            suggestedRiskLevel: { type: Type.STRING, description: 'Low, Medium, High, or Critical' },
            immediateAction: { type: Type.STRING },
            correctiveAction: { type: Type.STRING },
            preventiveAction: { type: Type.STRING },
            bbsCoachingNote: { type: Type.STRING, description: 'Positive, non-punitive Behavior-Based Safety coaching point' },
            applicableStandards: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            confidence: { type: Type.NUMBER, description: 'Confidence score between 0 and 1' },
            uncertaintyNotes: { type: Type.STRING, description: 'Visual ambiguity or missing context notes' },
          },
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());

    res.json({
      ...parsed,
      requiresHumanVerification: true,
      humanVerificationNotice:
        'AI Suggestion Only — Qualified Safety Officer review and verification is mandatory before final risk classification or enforcement.',
    });
  } catch (error: any) {
    console.error('Gemini analyze-observation error:', error);
    res.status(502).json({
      error: error?.message || 'AI observation analysis failed. Verify GEMINI_API_KEY configuration.',
    });
  }
});

// Centralized ARSHIEL AI Safety Assistant (RAG over Knowledge Base + EHS Copilot Tools)
router.post('/assistant', async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const { prompt, taskMode, contextSummary } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    const kbDocs = await db
      .select()
      .from(aiKnowledgeBase)
      .where(and(eq(aiKnowledgeBase.organizationId, orgId), eq(aiKnowledgeBase.isActive, true)))
      .orderBy(desc(aiKnowledgeBase.createdAt))
      .limit(12);

    const kbContext = kbDocs
      .map(
        (d, idx) =>
          `[Source ${idx + 1}: ${d.sourceReference} | ${d.docType} | ${d.title}]\n${d.contentText}`
      )
      .join('\n\n');

    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Active Organization: ${org?.name || 'Enterprise Workspace'} (Industry: ${org?.industry || 'Manufacturing'})
Task Mode: ${taskMode || 'General EHS Advisory'}
Live Operational Context: ${contextSummary || 'None provided'}

Approved Company EHS Knowledge Base:
${kbContext || 'No custom company documents uploaded yet; cite standard frameworks clearly and note assumptions.'}

User Request:
${prompt}`,
      config: {
        systemInstruction: `You are the ARSHIEL SAFETY AI Safety Assistant (Platform Owner: Jonathan Thadanki).
Capabilities: HIRA drafting, JSA/JHA/SWMS preparation, HAZOP guideword prompts, 5-Why & Fishbone RCA brainstorming, CAPA drafting, PTW hazard & PPE recommendations, Toolbox Talk scripts, Audit Checklist generation, Incident Executive Summaries, and Indian OSH Code 2020 / Factories Act / ISO 45001 / ISO 14001 compliance guidance.

Strict Rules:
1. Ground answers in the Approved Company EHS Knowledge Base above whenever relevant and explicitly cite [Source Reference] in your response.
2. When information is missing or unverified, explicitly state assumptions and uncertainty rather than fabricating clause numbers or site metrics.
3. End with a brief disclaimer that AI-generated EHS drafts require human Safety Officer / EHS Manager approval before execution.`,
      },
    });

    res.json({
      answer: response.text || '',
      sourcesUsed: kbDocs.map((d) => ({
        id: d.id,
        title: d.title,
        docType: d.docType,
        sourceReference: d.sourceReference,
      })),
      requiresHumanApproval: true,
    });
  } catch (error: any) {
    console.error('Gemini assistant error:', error);
    res.status(502).json({
      error: error?.message || 'AI Assistant request failed. Please verify GEMINI_API_KEY.',
    });
  }
});

// AI Risk Assessment Drafting (HIRA / HAZOP / JSA) - requires qualified EHS human approval
router.post('/suggest-risk', async (req: AuthRequest, res) => {
  try {
    const { methodology, title, activityOrNode, hazardCategory } = req.body;
    if (!title && !activityOrNode) {
      return res.status(400).json({ error: 'Provide activity or assessment title for AI risk drafting.' });
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Draft a workplace ${methodology || 'HIRA'} risk assessment entry:
Title: ${title || ''}
Activity / Process Node: ${activityOrNode || ''}
Hazard Category: ${hazardCategory || 'General Industrial'}

Return structured hazard identification, consequences, existing safeguards, additional engineering/PPE controls, initial L/S (1-5), residual L/S (1-5), and if HAZOP include guideword & deviation.`,
      config: {
        systemInstruction:
          'You are ARSHIEL SAFETY AI, a senior Certified Industrial Safety Engineer. Output concise, accurate engineering hazard controls strictly in JSON. A qualified EHS professional must review and approve before operational use.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hazard: { type: Type.STRING },
            potentialConsequences: { type: Type.STRING },
            existingControls: { type: Type.STRING },
            additionalControls: { type: Type.STRING },
            guideword: { type: Type.STRING },
            deviation: { type: Type.STRING },
            likelihood: { type: Type.INTEGER },
            severity: { type: Type.INTEGER },
            residualLikelihood: { type: Type.INTEGER },
            residualSeverity: { type: Type.INTEGER },
          },
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json({
      ...parsed,
      aiSuggested: true,
      requiresHumanApproval: true,
    });
  } catch (error: any) {
    console.error('Gemini suggest-risk error:', error);
    res.status(502).json({
      error: error?.message || 'AI risk suggestion failed. Verify GEMINI_API_KEY.',
    });
  }
});

// AI-Driven Suggestions for Normal & Child Documents (with ISO, Factories Act/OSHWC & OSHA rules)
router.post('/suggest-document', async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const {
      title,
      sectionName,
      parentTitle,
      isChildDocument,
      existingContent,
      country,
      state,
    } = req.body;

    if (!title && !sectionName) {
      return res.status(400).json({ error: 'Provide a document title or section to generate AI suggestions.' });
    }

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Generate an AI-driven EHS document draft and verified regulatory reference suggestions.
Platform Owner: Jonathan Thadanki
Organization: ${org?.name || 'Enterprise EHS Workspace'} (Industry: ${org?.industry || 'Manufacturing'})
Country / State: ${country || 'India & Global'} / ${state || 'Central / All States'}
Section Category: ${sectionName || 'General EHS'}
Document Level: ${isChildDocument ? `Child Document under "${parentTitle || 'Parent Document'}"` : 'Parent / Normal Controlled Document'}
Document Title: ${title || sectionName}
Existing Notes / Draft Content: ${existingContent || 'None yet'}

Instructions:
1. Draft clear, actionable EHS procedures/controls/checklist items in suggestedContent, explicitly marked at top as "AI-GENERATED DRAFT – COMPETENT EHS REVIEW & APPROVAL REQUIRED".
2. Provide verified reference designations only (no fabricated clause numbers; append "(Verification Required)" where site/state applicability must be confirmed):
   - isoReferences: e.g., ISO 45001:2018, ISO 14001:2015, ISO 50001:2018, ISO 9001:2015
   - factoryRulesReferences: India Factories Act, 1948 (Legacy/Transition Reference), OSHWC Code, 2020, and applicable State Factory Rules
   - oshaReferences: OSHA 29 CFR 1910 / 29 CFR 1926, NFPA, NBC India references
3. Provide 4-6 practical improvementSuggestions and recommendedChildDocuments if applicable.`,
      config: {
        systemInstruction:
          'You are ARSHIEL SAFETY AI (Owner: Jonathan Thadanki), an expert EHS Compliance Architect. Output strictly structured JSON matching the schema. Never invent fake legal citations or approve operational release.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedContent: { type: Type.STRING },
            isoReferences: { type: Type.ARRAY, items: { type: Type.STRING } },
            factoryRulesReferences: { type: Type.ARRAY, items: { type: Type.STRING } },
            oshaReferences: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvementSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedChildDocuments: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json({
      ...parsed,
      attribution: 'ARSHIEL SAFETY AI Draft · Platform Owner: Jonathan Thadanki',
      requiresHumanApproval: true,
    });
  } catch (error: any) {
    console.error('Gemini suggest-document error:', error);
    res.status(502).json({
      error: error?.message || 'AI document suggestion failed. Verify GEMINI_API_KEY configuration.',
    });
  }
});

// AI-Driven Suggestions inside Dynamic Parent & Child Modules
router.post('/suggest-module-guidance', async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const { moduleName, moduleCode, description, formName, fieldLabels } = req.body;

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Provide concise AI-driven EHS compliance and safety guidance for this dynamic module:
Organization: ${org?.name || 'Enterprise Workspace'} (${org?.industry || 'Manufacturing'})
Module: ${moduleName || 'Custom EHS Module'} (${moduleCode || ''})
Description: ${description || 'N/A'}
Active Form: ${formName || 'Record Submission'}
Fields: ${Array.isArray(fieldLabels) ? fieldLabels.join(', ') : 'General EHS fields'}

Include applicable ISO standards, India Factories Act 1948 / OSHWC Code 2020 rules, OSHA 29 CFR rules, key hazard checks before submission, and recommended child documents/records.`,
      config: {
        systemInstruction:
          'You are ARSHIEL SAFETY AI (Owner: Jonathan Thadanki). Return strict JSON with concise, practical, audit-ready guidance.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summaryGuidance: { type: Type.STRING },
            isoReferences: { type: Type.ARRAY, items: { type: Type.STRING } },
            factoryRulesReferences: { type: Type.ARRAY, items: { type: Type.STRING } },
            oshaReferences: { type: Type.ARRAY, items: { type: Type.STRING } },
            keyChecks: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json({
      ...parsed,
      requiresHumanApproval: true,
      attribution: 'ARSHIEL SAFETY AI · Platform Owner: Jonathan Thadanki',
    });
  } catch (error: any) {
    console.error('Gemini suggest-module-guidance error:', error);
    res.status(502).json({
      error: error?.message || 'AI module guidance failed. Verify GEMINI_API_KEY configuration.',
    });
  }
});

// AI-Driven Executive & Individual KPI Insights
router.post('/kpi-insights', async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const { scopeLabel, kpiPayload } = req.body;

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Analyze these live ARSHIEL SAFETY KPI metrics and deliver actionable EHS leadership insights.
Platform Owner: Jonathan Thadanki
Organization: ${org?.name || 'Enterprise Workspace'} (Industry: ${org?.industry || 'Manufacturing'})
KPI Scope: ${scopeLabel || 'Master KPI Dashboard'}
Live Cloud SQL KPI Metrics JSON:
${JSON.stringify(kpiPayload || {}, null, 2).slice(0, 6000)}

Instructions:
1. Summarize safety & compliance health accurately based ONLY on the provided metrics (do not invent numbers).
2. Highlight top strengths, top priority operational/compliance risks, and concrete 30-day corrective recommendations.
3. Cite applicable ISO 45001:2018 / ISO 14001:2015, India OSHWC Code 2020 / Factories Act 1948, and OSHA 29 CFR 1910/1926 standards (marked verification required where jurisdiction-specific).`,
      config: {
        systemInstruction:
          'You are ARSHIEL SAFETY AI (Owner: Jonathan Thadanki), an executive EHS Intelligence Architect. Output strict JSON matching the schema. Never fabricate metrics.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: { type: Type.STRING },
            topStrengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            priorityRisks: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
            standardReferences: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json({
      ...parsed,
      attribution: 'ARSHIEL SAFETY AI KPI Intelligence · Owner: Jonathan Thadanki',
      requiresHumanApproval: true,
    });
  } catch (error: any) {
    console.error('Gemini kpi-insights error:', error);
    res.status(502).json({
      error: error?.message || 'AI KPI insight generation failed. Verify GEMINI_API_KEY configuration.',
    });
  }
});

export default router;
