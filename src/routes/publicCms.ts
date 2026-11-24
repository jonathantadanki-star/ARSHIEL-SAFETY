import { Router } from 'express';
import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  cmsIndustries,
  cmsServices,
  cmsSiteSettings,
  demoRequests,
  documents,
  notificationDeliveryLogs,
  notifications,
  organizations,
  users,
} from '../db/schema.ts';
import {
  PLATFORM_OWNER_EMAIL,
  type AuthRequest,
  extractClientIp,
  requireSuperAdmin,
  writeAuditLog,
} from '../middleware/auth.ts';
import { recordSecurityEvent, verifySignedDocumentToken } from '../middleware/security.ts';

export const publicCmsRouter = Router();
export const adminCmsRouter = Router();

export const DEFAULT_SITE_CONFIG = {
  brandName: 'ARSHIEL SAFETY',
  companyName: 'ARSHIEL EHS AI SOLUTIONS',
  tagline: 'Smarter Safety. Safer Tomorrow.',
  motto: 'BUILD ON TRUST, DRIVEN BY EXCELLENCE.',
  ownerName: 'Jonathan Thadanki',
  ownerRole: 'Founder, Owner, Creator & Software Developer',
  heroEyebrow: 'Global Enterprise EHS AI Ecosystem',
  heroHeadline: 'Innovating for a Safe & Sustainable World',
  heroMissionHeadline: 'ONE PLATFORM. ALL SAFETY OPERATIONS. AI-POWERED PREVENTION.',
  heroDescription:
    'Your Trusted Partner in Safety, EHS, Sustainability and AI-Driven Compliance Solutions. An intelligent enterprise EHS ecosystem designed to simplify Safety, Health, Environment, Risk Management, Regulatory Compliance and Sustainability across every industry.',
  heroSubheading:
    'Manage your complete EHS operations through one AI-powered platform, from hazard identification and risk assessment to incident management, digital permits, audits, compliance and sustainability reporting.',
  contactEmail: 'jonathan.tadanki@gmail.com',
  contactPhones: '+91 9133 661 933 / +91 81 84 83 40 60 / +91 81 86 80 88 48',
  contactRegion: 'Global Enterprise Deployment · Multi-Region Cloud SQL',
  logoUrl: '/assets/aistudio/Designer__2___1__9fac3732.png',
  heroVisualUrl: '/assets/homepage/hero_ehs_engineer_globe.jpg',
  primaryCtaLabel: 'Access EHS Platform',
  demoCtaLabel: 'Get a Demo',
  showHero: true,
  showServices: true,
  showIndustries: true,
  showPlatformFeatures: true,
  showExistingCapabilities: true,
  showAiDocuments: true,
  showCompliance: true,
  showWhyChoose: true,
  showSecurity: true,
};

const DEFAULT_SERVICES = [
  {
    code: 'SVC-01',
    title: '01. Safety Management',
    shortDescription:
      'End-to-end occupational, industrial, construction, process, electrical, and high-risk workplace safety controls.',
    icon: 'ShieldCheck',
    accentColor: '#FFC629',
    subcategories: [
      'Occupational Health and Safety',
      'Industrial Safety',
      'Construction Safety',
      'Electrical Safety',
      'Mechanical Safety',
      'Process Safety',
      'Fire and Life Safety',
      'Workplace Safety',
      'Machine Safety',
      'Work at Height',
      'Confined Space Safety',
      'Lifting and Rigging Safety',
      'Contractor Safety',
      'Behaviour-Based Safety',
      'Emergency Preparedness and Response',
      'Safety Training and Competency Management',
    ],
    displayOrder: 1,
    isSystem: true,
  },
  {
    code: 'SVC-02',
    title: '02. EHS Management',
    shortDescription:
      'Integrated Environment, Health & Safety systems with digital transformation, real-time KPIs, and management review.',
    icon: 'Layers',
    accentColor: '#00BFFF',
    subcategories: [
      'Environment, Health and Safety Management',
      'Integrated EHS Management Systems',
      'EHS Risk Management',
      'EHS Performance Monitoring',
      'EHS Audits and Inspections',
      'EHS Documentation',
      'EHS KPI and Dashboard',
      'EHS Digital Transformation',
      'EHS Management Review',
      'Continuous Improvement',
    ],
    displayOrder: 2,
    isSystem: true,
  },
  {
    code: 'SVC-03',
    title: '03. HSE Management',
    shortDescription:
      'Site-level and project-level HSE governance, contractor leadership, performance evaluation, and executive analytics.',
    icon: 'HardHat',
    accentColor: '#FFC629',
    subcategories: [
      'Health, Safety and Environment',
      'HSE Management Systems',
      'HSE Site Management',
      'HSE Project Management',
      'HSE Contractor Management',
      'HSE Leadership and Governance',
      'HSE Reporting and Analytics',
      'HSE Performance Evaluation',
    ],
    displayOrder: 3,
    isSystem: true,
  },
  {
    code: 'SVC-04',
    title: '04. SHE Management',
    shortDescription:
      'Structured Safety, Health and Environment policies, field inspections, risk registers, and compliance monitoring.',
    icon: 'ClipboardCheck',
    accentColor: '#39FF14',
    subcategories: [
      'Safety, Health and Environment',
      'SHE Policies and Procedures',
      'SHE Inspections',
      'SHE Risk Assessments',
      'SHE Audits',
      'SHE Training',
      'SHE Compliance Monitoring',
      'SHE Performance Management',
    ],
    displayOrder: 4,
    isSystem: true,
  },
  {
    code: 'SVC-05',
    title: '05. ESG Management',
    shortDescription:
      'Enterprise Environmental, Social & Governance risk tracking with GRI, BRSR, and CSRD disclosure readiness.',
    icon: 'Globe',
    accentColor: '#39FF14',
    subcategories: [
      'Environmental, Social and Governance',
      'ESG Risk Assessment',
      'ESG Performance Tracking',
      'ESG Reporting',
      'GRI Reporting',
      'BRSR Reporting',
      'CSRD Reporting',
      'ESG Data Management',
      'ESG Audit and Compliance',
      'Corporate Sustainability Reporting',
    ],
    displayOrder: 5,
    isSystem: true,
  },
  {
    code: 'SVC-06',
    title: '06. GHS – Global Harmonized System',
    shortDescription:
      'Chemical hazard classification, GHS pictogram labelling, SDS libraries, inventory, and safe handling controls.',
    icon: 'FlaskConical',
    accentColor: '#00BFFF',
    subcategories: [
      'Chemical Classification',
      'Chemical Hazard Identification',
      'GHS Labelling',
      'Safety Data Sheets (SDS)',
      'Chemical Inventory Management',
      'Chemical Risk Assessment',
      'Hazard Communication',
      'Chemical Handling and Storage Safety',
    ],
    displayOrder: 6,
    isSystem: true,
  },
  {
    code: 'SVC-07',
    title: '07. Environmental Management',
    shortDescription:
      'Aspect-impact registers, hazardous waste tracking, air emissions, water/wastewater monitoring, and pollution prevention.',
    icon: 'Leaf',
    accentColor: '#39FF14',
    subcategories: [
      'Environmental Risk Assessment',
      'Environmental Aspect and Impact Assessment',
      'Waste Management',
      'Hazardous Waste Management',
      'Air Emission Monitoring',
      'Water and Wastewater Management',
      'Pollution Prevention',
      'Environmental Audits',
      'Environmental Legal Compliance',
      'Resource Conservation',
    ],
    displayOrder: 7,
    isSystem: true,
  },
  {
    code: 'SVC-08',
    title: '08. Sustainability Management',
    shortDescription:
      'Carbon footprint accounting across Scope 1, 2 & 3 emissions, energy optimization, decarbonization, and Net Zero roadmaps.',
    icon: 'Zap',
    accentColor: '#39FF14',
    subcategories: [
      'Sustainability Management Systems',
      'Carbon Footprint Management',
      'Greenhouse Gas (GHG) Accounting',
      'Scope 1, Scope 2 and Scope 3 Emissions',
      'Energy Management',
      'Water Sustainability',
      'Climate Risk Management',
      'Decarbonization',
      'Net Zero Roadmap',
      'Sustainable Operations',
      'Circular Economy',
      'Sustainability Reporting',
    ],
    displayOrder: 8,
    isSystem: true,
  },
  {
    code: 'SVC-09',
    title: '09. Occupational Health & Industrial Hygiene',
    shortDescription:
      'Workplace exposure monitoring, noise & heat stress management, ergonomics, and occupational health surveillance.',
    icon: 'HeartPulse',
    accentColor: '#F43F5E',
    subcategories: [
      'Occupational Health Management',
      'Industrial Hygiene',
      'Ergonomics',
      'Workplace Exposure Monitoring',
      'Noise Monitoring',
      'Heat Stress Management',
      'Occupational Health Surveillance',
      'Workplace Health Risk Assessment',
    ],
    displayOrder: 9,
    isSystem: true,
  },
  {
    code: 'SVC-10',
    title: '10. Fire & Emergency Management',
    shortDescription:
      'Fire risk assessments, alarm/extinguisher asset registers, emergency response plans, mock drills, and evacuation control.',
    icon: 'Flame',
    accentColor: '#F97316',
    subcategories: [
      'Fire Risk Assessment',
      'Fire Safety Inspection',
      'Fire Extinguisher Management',
      'Fire Alarm and Detection Systems',
      'Emergency Response Plans',
      'Mock Drill Management',
      'Evacuation Management',
      'Business Continuity and Emergency Preparedness',
    ],
    displayOrder: 10,
    isSystem: true,
  },
  {
    code: 'SVC-11',
    title: '11. Quality & Operational Excellence',
    shortDescription:
      'ISO 9001 Integrated Management Systems, CAPA workflows, structured Root Cause Analysis, and controlled documents.',
    icon: 'Award',
    accentColor: '#FFC629',
    subcategories: [
      'Quality Management Systems',
      'ISO 9001',
      'Integrated Management Systems',
      'Operational Risk Management',
      'Corrective and Preventive Actions',
      'Root Cause Analysis',
      'Continuous Improvement',
      'Document Control',
    ],
    displayOrder: 11,
    isSystem: true,
  },
  {
    code: 'SVC-12',
    title: '12. Regulatory & ISO Compliance',
    shortDescription:
      'Jurisdiction-aware regulatory registers configurable by country, state, industry, and effective applicability date.',
    icon: 'Scale',
    accentColor: '#00BFFF',
    complianceNote:
      'All standards and statutory references are configurable per country, state, industry, and effective date—never assumed universally applicable.',
    subcategories: [
      'ISO 45001 – Occupational Health and Safety',
      'ISO 14001 – Environmental Management',
      'ISO 50001 – Energy Management',
      'ISO 9001 – Quality Management',
      'ISO 14064 – Greenhouse Gas Accounting',
      'ISO 14067 – Carbon Footprint',
      'OSHA Standards (where applicable)',
      'Indian Factories Act, 1948 (where applicable)',
      'Occupational Safety, Health and Working Conditions Code, 2020 (where applicable)',
      'Applicable Central and State Rules',
      'National Building Code (NBC)',
      'Applicable Fire Safety Regulations',
      'Applicable Pollution Control Board Requirements',
      'Applicable Local and International Legal Requirements',
    ],
    displayOrder: 12,
    isSystem: true,
  },
];

const DEFAULT_INDUSTRIES = [
  {
    code: 'IND-01',
    name: 'Semiconductor Industry',
    shortName: 'Semiconductors',
    description:
      'Ultra-cleanroom EHS governance for wafer fabrication, specialty toxic gas monitoring, high-voltage tools, and chemical safety.',
    imageUrl: '/assets/homepage/ind_semiconductor_fab.jpg',
    icon: 'Cpu',
    accentColor: '#00BFFF',
    capabilities: [
      'Semiconductor Manufacturing',
      'Wafer Fabrication',
      'Cleanroom Safety',
      'Chemical Safety',
      'Gas Safety',
      'High Voltage Safety',
      'Process Safety',
      'Equipment Safety',
      'Environmental Compliance',
    ],
    recommendedModules: ['20-Aspect Digital PTW', 'LOTO & Energy Isolation', 'GHS Chemical & SDS', 'AI Hazard Observation'],
    displayOrder: 1,
    isExpandable: false,
  },
  {
    code: 'IND-02',
    name: 'Data Centers',
    shortName: 'Data Centers',
    description:
      'Mission-critical EHS controls for hyperscale, colocation, AI, and cloud data centers covering UPS, BESS, cooling, and fire safety.',
    imageUrl: '/assets/homepage/ind_data_center.jpg',
    icon: 'Server',
    accentColor: '#00BFFF',
    capabilities: [
      'Hyperscale Data Centers',
      'Colocation Data Centers',
      'Enterprise Data Centers',
      'AI Data Centers',
      'Cloud Infrastructure',
      'Electrical and UPS Safety',
      'Battery and Energy Storage Safety',
      'Fire Protection',
      'Cooling System Safety',
      'Critical Infrastructure Safety',
    ],
    recommendedModules: ['Electrical & Arc Flash PTW', 'Fire & Emergency Systems', 'Contractor Gate Control', 'Energy & GHG KPIs'],
    displayOrder: 2,
    isExpandable: false,
  },
  {
    code: 'IND-03',
    name: 'Pharmaceutical Industry',
    shortName: 'Pharma',
    description:
      'GMP-aligned EHS management for API synthesis, formulation plants, biotechnology, vaccine manufacturing, and laboratory biosafety.',
    imageUrl: '/assets/homepage/ind_pharma_lab.jpg',
    icon: 'FlaskConical',
    accentColor: '#FFC629',
    capabilities: [
      'Pharmaceutical Manufacturing',
      'API Manufacturing',
      'Formulation Plants',
      'Biotechnology',
      'Vaccine Manufacturing',
      'Laboratory Safety',
      'Chemical and Biological Safety',
      'GMP-related EHS',
      'Process Safety',
      'Environmental Compliance',
    ],
    recommendedModules: ['HAZOP & Process Risk', 'Industrial Hygiene', '23-Section Document Control', 'Effluent & Hazardous Waste'],
    displayOrder: 3,
    isExpandable: false,
  },
  {
    code: 'IND-04',
    name: 'Manufacturing Industry',
    shortName: 'Manufacturing',
    description:
      'Comprehensive factory floor safety for automotive, steel, cement, heavy engineering, chemical, and electronics manufacturing.',
    imageUrl: '/assets/homepage/ind_manufacturing_plant.jpg',
    icon: 'Factory',
    accentColor: '#FFC629',
    capabilities: [
      'Automotive',
      'Automobile Components',
      'Heavy Engineering',
      'Steel and Metal Industries',
      'Cement',
      'Chemical Manufacturing',
      'Electronics Manufacturing',
      'Electrical Manufacturing',
      'Machinery and Equipment',
      'Industrial Manufacturing',
    ],
    recommendedModules: ['Machine Guarding & LOTO', 'Incident & 5-Why RCA', 'ISO 45001 Audits', 'Master KPI Dashboard'],
    displayOrder: 4,
    isExpandable: false,
  },
  {
    code: 'IND-05',
    name: 'MNC & Corporate Organizations',
    shortName: 'Corporate & IT',
    description:
      'Multi-site enterprise EHS, ESG reporting, ergonomics, fire readiness, and corporate governance across global campuses and GCCs.',
    imageUrl: '/assets/homepage/ind_corporate_mnc.jpg',
    icon: 'Building2',
    accentColor: '#00BFFF',
    capabilities: [
      'Multinational Companies',
      'Corporate Offices',
      'IT Companies',
      'Software Companies',
      'Business Process Outsourcing',
      'Global Capability Centres (GCC)',
      'Shared Services Centres',
      'Corporate Headquarters',
      'Enterprise Risk and Compliance Teams',
    ],
    recommendedModules: ['Multi-Tenant Enterprise Hub', 'ESG / GRI / BRSR Reporting', 'Ergonomics & Fire Drills', 'Legal Compliance Register'],
    displayOrder: 5,
    isExpandable: false,
  },
  {
    code: 'IND-06',
    name: 'Construction & Infrastructure',
    shortName: 'Construction',
    description:
      'Field-ready mobile safety for commercial, residential, industrial, EPC, civil, mechanical, oil & gas, and renewable projects.',
    imageUrl: '/assets/homepage/ind_construction_infra.jpg',
    icon: 'HardHat',
    accentColor: '#FFC629',
    capabilities: [
      'Commercial Construction',
      'Residential Construction',
      'Industrial Construction',
      'Infrastructure Projects',
      'Civil Engineering',
      'Electrical Projects',
      'Mechanical Projects',
      'EPC Projects',
      'Oil and Gas Construction',
      'Renewable Energy Projects',
    ],
    recommendedModules: ['Work at Height & Lifting PTW', 'Toolbox Talk & QR Passes', 'Contractor Safety Portal', 'AI Photo Hazard Scan'],
    displayOrder: 6,
    isExpandable: false,
  },
  {
    code: 'IND-07',
    name: 'FMCG Industry',
    shortName: 'FMCG',
    description:
      'High-velocity plant, cold-chain, warehousing, and distribution safety for food & beverage, dairy, personal care, and packaging.',
    imageUrl: '/assets/homepage/ind_fmcg_facility.jpg',
    icon: 'Package',
    accentColor: '#39FF14',
    capabilities: [
      'Food and Beverage',
      'Dairy',
      'Personal Care',
      'Home Care',
      'Consumer Goods',
      'Packaging',
      'Warehousing',
      'Distribution Centres',
      'Cold Chain Operations',
    ],
    recommendedModules: ['Ammonia & Cold Chain Safety', 'Forklift & Warehouse Inspections', 'PPE Store Management', 'Weekly Safety Tracker'],
    displayOrder: 7,
    isExpandable: false,
  },
  {
    code: 'IND-08',
    name: 'Healthcare & Clinical Labs',
    shortName: 'Healthcare',
    description:
      'Biosafety, radiation and infection control, medical gas management, biomedical waste, and occupational health for hospitals and labs.',
    imageUrl: '/assets/homepage/ind_healthcare_clinical.jpg',
    icon: 'HeartPulse',
    accentColor: '#00BFFF',
    capabilities: [
      'Hospitals and Healthcare',
      'Diagnostic & Research Laboratories',
      'Biomedical Waste Management',
      'Infection & Biosafety Controls',
      'Radiation & Laser Safety',
      'Medical Gas Pipeline Safety',
      'Occupational Health Surveillance',
      'Hospital Fire & Evacuation Readiness',
    ],
    recommendedModules: ['Occupational Health', 'Hazardous & Bio Waste', 'Emergency Evacuation', 'Compliance Audits'],
    displayOrder: 8,
    isExpandable: false,
  },
  {
    code: 'IND-09',
    name: 'All Other Industries & Sectors',
    shortName: 'All Industries',
    description:
      'Expandable, industry-independent EHS architecture powered by ARSHIEL Unlimited Dynamic Module Builder for any present or future sector.',
    imageUrl: '/assets/homepage/ind_global_industries.jpg',
    icon: 'Globe',
    accentColor: '#39FF14',
    capabilities: [
      'Oil and Gas',
      'Petrochemicals',
      'Power Generation',
      'Renewable Energy',
      'Mining',
      'Logistics and Transportation',
      'Warehousing',
      'Aviation',
      'Ports and Shipping',
      'Hospitals and Healthcare',
      'Laboratories',
      'Education and Universities',
      'Hospitality',
      'Retail',
      'Telecom',
      'Agriculture',
      'Textile',
      'Pulp and Paper',
      'Water Treatment',
      'Waste Management',
      'Government Organizations',
      'Public Sector Undertakings',
      'Utilities',
      'Any Other Present or Future Industry',
    ],
    recommendedModules: ['Unlimited Dynamic Module Builder', 'Custom Forms & Checklists', 'Configurable Multi-Level Workflows', 'AI Copilot'],
    displayOrder: 9,
    isExpandable: true,
  },
];

let cmsSeedPromise: Promise<void> | null = null;

export async function ensureCmsSeeded() {
  if (!cmsSeedPromise) {
    cmsSeedPromise = (async () => {
      const existingServices = await db.select({ id: cmsServices.id }).from(cmsServices).limit(1);
      if (existingServices.length === 0) {
        await db.insert(cmsServices).values(DEFAULT_SERVICES).onConflictDoNothing();
      }

      const existingIndustries = await db.select({ id: cmsIndustries.id }).from(cmsIndustries).limit(1);
      if (existingIndustries.length === 0) {
        await db.insert(cmsIndustries).values(DEFAULT_INDUSTRIES).onConflictDoNothing();
      }

      const existingConfig = await db
        .select({ id: cmsSiteSettings.id })
        .from(cmsSiteSettings)
        .where(eq(cmsSiteSettings.key, 'homepage_config'))
        .limit(1);
      if (existingConfig.length === 0) {
        await db
          .insert(cmsSiteSettings)
          .values({ key: 'homepage_config', config: DEFAULT_SITE_CONFIG })
          .onConflictDoNothing();
      }
    })().catch((err) => {
      cmsSeedPromise = null;
      throw err;
    });
  }
  return cmsSeedPromise;
}

// ============================================================================
// PUBLIC ROUTES (No Authentication Required — Serves Public Landing Page)
// ============================================================================

publicCmsRouter.get('/homepage', async (_req, res) => {
  try {
    await ensureCmsSeeded();
    const [services, industries, settingsRow] = await Promise.all([
      db
        .select()
        .from(cmsServices)
        .where(eq(cmsServices.isVisible, true))
        .orderBy(asc(cmsServices.displayOrder), asc(cmsServices.createdAt)),
      db
        .select()
        .from(cmsIndustries)
        .where(eq(cmsIndustries.isVisible, true))
        .orderBy(asc(cmsIndustries.displayOrder), asc(cmsIndustries.createdAt)),
      db
        .select()
        .from(cmsSiteSettings)
        .where(eq(cmsSiteSettings.key, 'homepage_config'))
        .limit(1),
    ]);

    const mergedConfig = { ...DEFAULT_SITE_CONFIG, ...(settingsRow[0]?.config || {}) };
    if (mergedConfig.ownerRole === 'Developer, Creator & Owner') {
      mergedConfig.ownerRole = DEFAULT_SITE_CONFIG.ownerRole;
    }

    res.json({
      siteConfig: mergedConfig,
      services,
      industries,
    });
  } catch (error) {
    console.error('GET /api/public/homepage error:', error);
    res.status(500).json({ error: 'Failed to load homepage content' });
  }
});

const OWNER_ALERT_EMAIL = (process.env.OWNER_EMAIL || PLATFORM_OWNER_EMAIL).trim();
const OWNER_ALERT_PHONE_DISPLAY = '+91 9133 661 933';
const OWNER_ALERT_PHONE_E164 = (process.env.OWNER_SMS_PHONE || '+919133661933').replace(/\s+/g, '');

async function dispatchDemoAlerts(created: typeof demoRequests.$inferSelect) {
  const emailSubject = `[ARSHIEL SAFETY] New Demo Request from ${created.fullName} (${created.companyName})`;
  const plainTextBody = [
    `New Enterprise Demo Request — ARSHIEL SAFETY`,
    `Name: ${created.fullName}`,
    `Company: ${created.companyName}`,
    `Industry: ${created.industry}`,
    `Email: ${created.workEmail}`,
    `Phone: ${created.phone || 'Not provided'}`,
    `Message: ${created.message || 'No additional notes'}`,
    `Submitted: ${new Date(created.createdAt).toLocaleString()}`,
  ].join('\n');

  const smsText = `ARSHIEL SAFETY Demo Request: ${created.fullName} (${created.companyName} | ${created.industry}). Email: ${created.workEmail}${created.phone ? ` | Ph: ${created.phone}` : ''}. ${created.message ? `Msg: ${created.message.slice(0, 120)}` : ''}`.slice(0, 320);

  let emailSent = false;
  let smsSent = false;
  let emailProvider: string | null = null;
  let smsProvider: string | null = null;

  // 1. Server-side Email Delivery via Resend (if RESEND_API_KEY configured in Secrets)
  if (process.env.RESEND_API_KEY) {
    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'ARSHIEL SAFETY <onboarding@resend.dev>';
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
          <div style="background:#020817;color:#FFC629;padding:18px 22px">
            <h2 style="margin:0;font-size:18px">ARSHIEL SAFETY — New Enterprise Demo Request</h2>
            <p style="margin:4px 0 0;color:#cbd5e1;font-size:12px">ARSHIEL EHS AI SOLUTIONS · Jonathan Thadanki</p>
          </div>
          <div style="padding:20px 22px;color:#0f172a;font-size:14px;line-height:1.6">
            <p><strong>Full Name:</strong> ${created.fullName}</p>
            <p><strong>Work Email:</strong> <a href="mailto:${created.workEmail}">${created.workEmail}</a></p>
            <p><strong>Organization / Company:</strong> ${created.companyName}</p>
            <p><strong>Primary Industry:</strong> ${created.industry}</p>
            <p><strong>Phone / WhatsApp:</strong> ${created.phone || 'Not provided'}</p>
            <p><strong>EHS Requirements &amp; Sites:</strong><br/>${(created.message || 'None provided').replace(/\n/g, '<br/>')}</p>
          </div>
        </div>
      `;
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [OWNER_ALERT_EMAIL],
          reply_to: created.workEmail,
          subject: emailSubject,
          text: plainTextBody,
          html,
        }),
      });
      if (resp.ok) {
        emailSent = true;
        emailProvider = 'Resend';
      } else {
        console.error('Resend email error:', resp.status, await resp.text());
      }
    } catch (e) {
      console.error('Resend dispatch failed:', e);
    }
  }

  // 2. Server-side Normal SMS Delivery via Twilio (if TWILIO_* configured in Secrets)
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) {
    try {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const authHeader = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
      const params = new URLSearchParams({
        To: OWNER_ALERT_PHONE_E164,
        From: process.env.TWILIO_FROM_NUMBER,
        Body: smsText,
      });
      const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      if (resp.ok) {
        smsSent = true;
        smsProvider = 'Twilio SMS';
      } else {
        console.error('Twilio SMS error:', resp.status, await resp.text());
      }
    } catch (e) {
      console.error('Twilio SMS dispatch failed:', e);
    }
  }
  // 2b. Optional Fast2SMS (India normal SMS gateway)
  else if (process.env.FAST2SMS_API_KEY) {
    try {
      const localIndianDigits = OWNER_ALERT_PHONE_E164.replace(/^\+91/, '').replace(/\D/g, '');
      const resp = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'q',
          message: smsText,
          language: 'english',
          flash: 0,
          numbers: localIndianDigits,
        }),
      });
      if (resp.ok) {
        smsSent = true;
        smsProvider = 'Fast2SMS';
      } else {
        console.error('Fast2SMS error:', resp.status, await resp.text());
      }
    } catch (e) {
      console.error('Fast2SMS dispatch failed:', e);
    }
  }

  // 3. Optional Custom Webhook Relay (Zapier / Make / n8n for custom email + SMS automation)
  if (process.env.DEMO_ALERT_WEBHOOK_URL) {
    try {
      const resp = await fetch(process.env.DEMO_ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'demo_request.created',
          ownerEmail: OWNER_ALERT_EMAIL,
          ownerPhone: OWNER_ALERT_PHONE_E164,
          subject: emailSubject,
          smsText,
          plainTextBody,
          request: created,
        }),
      });
      if (resp.ok) {
        if (!emailSent) {
          emailSent = true;
          emailProvider = 'Webhook';
        }
        if (!smsSent) {
          smsSent = true;
          smsProvider = 'Webhook';
        }
      }
    } catch (e) {
      console.error('Demo alert webhook failed:', e);
    }
  }

  // 3b. Optional Discord Admin Alert Webhook (if DISCORD_WEBHOOK_URL configured)
  let discordStatus: 'delivered' | 'failed' | 'unconfigured' = 'unconfigured';
  let discordError: string | null = null;
  if (process.env.DISCORD_WEBHOOK_URL) {
    try {
      const resp = await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'ARSHIEL SAFETY Demo Alerts',
          content: `**[NEW DEMO REQUEST]** ${created.fullName} (${created.companyName} · ${created.industry})\nEmail: ${created.workEmail}${created.phone ? ` · Phone: ${created.phone}` : ''}\n${created.message || ''}`.slice(0, 1900),
        }),
      });
      if (resp.ok) {
        discordStatus = 'delivered';
      } else {
        discordStatus = 'failed';
        discordError = `Discord HTTP ${resp.status}`;
      }
    } catch (e: any) {
      discordStatus = 'failed';
      discordError = e?.message || 'Discord webhook dispatch error';
    }
  }

  // 4. Always create an immediate in-app notification & honest delivery logs for Sole Super Admin Jonathan Thadanki
  try {
    const [ownerUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, PLATFORM_OWNER_EMAIL))
      .limit(1);
    let targetOrgId = ownerUser?.organizationId || null;
    if (!targetOrgId) {
      const [firstOrg] = await db.select().from(organizations).limit(1);
      targetOrgId = firstOrg?.id || null;
    }
    if (targetOrgId) {
      await db.insert(notifications).values({
        organizationId: targetOrgId,
        userId: ownerUser?.id || null,
        targetRole: 'super-admin',
        type: 'demo_request',
        severity: 'warning',
        title: `New Demo Request: ${created.fullName} (${created.companyName})`,
        message: `${created.industry} · Email: ${created.workEmail}${created.phone ? ` · Phone: ${created.phone}` : ''}${created.message ? ` — ${created.message.slice(0, 140)}` : ''}`,
        entityType: 'demo_request',
        entityId: created.id,
      });

      const now = new Date();
      await db.insert(notificationDeliveryLogs).values([
        {
          organizationId: targetOrgId,
          eventCategory: 'demo_request',
          channel: 'in_app',
          provider: 'postgres_in_app',
          recipient: OWNER_ALERT_EMAIL,
          subject: emailSubject,
          body: plainTextBody,
          status: 'delivered',
          attemptCount: 1,
          httpStatus: 200,
          lastAttemptAt: now,
        },
        {
          organizationId: targetOrgId,
          eventCategory: 'demo_request',
          channel: 'email',
          provider: emailProvider ? emailProvider.toLowerCase() : 'resend',
          recipient: OWNER_ALERT_EMAIL,
          subject: emailSubject,
          body: plainTextBody,
          status: emailSent ? 'delivered' : process.env.RESEND_API_KEY ? 'failed' : 'unconfigured',
          attemptCount: 1,
          errorMessage: emailSent ? null : process.env.RESEND_API_KEY ? 'Resend API delivery failed' : 'RESEND_API_KEY not configured',
          lastAttemptAt: now,
        },
        {
          organizationId: targetOrgId,
          eventCategory: 'demo_request',
          channel: 'sms',
          provider: smsProvider ? smsProvider.toLowerCase() : 'sms_gateway',
          recipient: OWNER_ALERT_PHONE_E164,
          subject: emailSubject,
          body: smsText,
          status: smsSent ? 'delivered' : (process.env.TWILIO_ACCOUNT_SID || process.env.FAST2SMS_API_KEY) ? 'failed' : 'unconfigured',
          attemptCount: 1,
          errorMessage: smsSent ? null : 'SMS gateway credentials not configured',
          lastAttemptAt: now,
        },
        ...(process.env.DISCORD_WEBHOOK_URL
          ? [
              {
                organizationId: targetOrgId,
                eventCategory: 'demo_request',
                channel: 'discord',
                provider: 'discord',
                recipient: 'discord_admin_webhook',
                subject: emailSubject,
                body: plainTextBody,
                status: discordStatus,
                attemptCount: 1,
                errorMessage: discordError,
                lastAttemptAt: now,
              },
            ]
          : []),
      ]);
    }
  } catch (notifErr) {
    console.error('Owner demo notification insert failed:', notifErr);
  }

  const mailtoUrl = `mailto:${OWNER_ALERT_EMAIL}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(plainTextBody)}`;
  const smsUrl = `sms:${OWNER_ALERT_PHONE_E164}?body=${encodeURIComponent(smsText)}`;
  const whatsappUrl = `https://wa.me/${OWNER_ALERT_PHONE_E164.replace(/\D/g, '')}?text=${encodeURIComponent(plainTextBody)}`;

  return {
    emailSent,
    smsSent,
    emailProvider,
    smsProvider,
    ownerEmail: OWNER_ALERT_EMAIL,
    ownerPhone: OWNER_ALERT_PHONE_DISPLAY,
    mailtoUrl,
    smsUrl,
    whatsappUrl,
  };
}

// Time-limited HMAC-signed private document download endpoint (never allows unauthenticated raw ID access)
publicCmsRouter.get('/documents/download', async (req, res) => {
  try {
    const token = String(req.query.token || '').trim();
    const verified = verifySignedDocumentToken(token);
    if (!verified.valid) {
      await recordSecurityEvent({
        eventType: 'INVALID_SIGNED_URL',
        severity: 'warning',
        ipAddress: extractClientIp(req),
        endpoint: req.originalUrl,
        method: req.method,
        details: { reason: verified.reason },
      });
      res.status(403).json({ error: verified.reason || 'Invalid or expired signed download link' });
      return;
    }

    const [doc] = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, verified.documentId),
          eq(documents.organizationId, verified.organizationId)
        )
      )
      .limit(1);

    if (!doc) {
      res.status(404).json({ error: 'Document not found or access revoked' });
      return;
    }

    const safeFileName = (doc.fileName || `${doc.documentCode || 'document'}.txt`).replace(/["\r\n]/g, '_');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);

    if (doc.fileDataUrl && doc.fileDataUrl.startsWith('data:')) {
      const match = doc.fileDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        res.setHeader('Content-Type', match[1]);
        res.send(Buffer.from(match[2], 'base64'));
        return;
      }
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(doc.contentText || `${doc.title}\nCode: ${doc.documentCode}\nVersion: ${doc.version}`);
  } catch (error) {
    console.error('GET /api/public/documents/download error:', error);
    res.status(500).json({ error: 'Failed to serve signed document' });
  }
});

publicCmsRouter.post('/demo-requests', async (req, res) => {
  try {
    const { fullName, workEmail, companyName, industry, phone, message } = req.body || {};
    if (!fullName || !String(fullName).trim()) {
      res.status(400).json({ error: 'Full name is required.' });
      return;
    }
    const emailStr = String(workEmail || '').trim();
    if (!emailStr || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
      res.status(400).json({ error: 'A valid work email address is required.' });
      return;
    }
    if (!companyName || !String(companyName).trim()) {
      res.status(400).json({ error: 'Company or organization name is required.' });
      return;
    }

    const [created] = await db
      .insert(demoRequests)
      .values({
        fullName: String(fullName).trim(),
        workEmail: emailStr,
        companyName: String(companyName).trim(),
        industry: String(industry || 'Manufacturing').trim(),
        phone: phone ? String(phone).trim() : null,
        message: message ? String(message).trim() : null,
        status: 'New',
      })
      .returning();

    const delivery = await dispatchDemoAlerts(created);

    res.status(201).json({
      id: created.id,
      message:
        delivery.emailSent && delivery.smsSent
          ? `Thank you! Your demo request has been emailed to ${delivery.ownerEmail} and sent by SMS to ${delivery.ownerPhone}.`
          : `Thank you! Your demo request has been recorded for Jonathan Thadanki (${delivery.ownerEmail} · ${delivery.ownerPhone}).`,
      request: created,
      delivery,
    });
  } catch (error) {
    console.error('POST /api/public/demo-requests error:', error);
    res.status(500).json({ error: 'Failed to submit demo request' });
  }
});

// ============================================================================
// ADMIN CMS ROUTES (Authenticated — Strictly Sole Super Admin Only)
// ============================================================================

async function auditCms(
  req: AuthRequest,
  action: string,
  entityType: string,
  entityId?: string | null,
  details?: Record<string, unknown>
) {
  await writeAuditLog({
    organizationId: req.organizationId ?? null,
    userId: req.authUser?.id ?? null,
    userEmail: req.authUser?.email ?? null,
    userName: req.authUser?.fullName ?? null,
    action,
    entityType,
    entityId: entityId ?? null,
    details,
  });
}

adminCmsRouter.use(requireSuperAdmin);

adminCmsRouter.get('/all', async (_req: AuthRequest, res) => {
  try {
    await ensureCmsSeeded();
    const [services, industries, settingsRow, requests] = await Promise.all([
      db.select().from(cmsServices).orderBy(asc(cmsServices.displayOrder), asc(cmsServices.createdAt)),
      db.select().from(cmsIndustries).orderBy(asc(cmsIndustries.displayOrder), asc(cmsIndustries.createdAt)),
      db.select().from(cmsSiteSettings).where(eq(cmsSiteSettings.key, 'homepage_config')).limit(1),
      db.select().from(demoRequests).orderBy(desc(demoRequests.createdAt)).limit(100),
    ]);

    const mergedAdminConfig = { ...DEFAULT_SITE_CONFIG, ...(settingsRow[0]?.config || {}) };
    if (mergedAdminConfig.ownerRole === 'Developer, Creator & Owner') {
      mergedAdminConfig.ownerRole = DEFAULT_SITE_CONFIG.ownerRole;
    }

    res.json({
      siteConfig: mergedAdminConfig,
      services,
      industries,
      demoRequests: requests,
    });
  } catch (error) {
    console.error('GET /api/cms/all error:', error);
    res.status(500).json({ error: 'Failed to load CMS management data' });
  }
});

adminCmsRouter.patch('/site-config', async (req: AuthRequest, res) => {
  try {
    await ensureCmsSeeded();
    const incoming = req.body || {};
    const existing = await db
      .select()
      .from(cmsSiteSettings)
      .where(eq(cmsSiteSettings.key, 'homepage_config'))
      .limit(1);

    const merged = {
      ...DEFAULT_SITE_CONFIG,
      ...(existing[0]?.config || {}),
      ...incoming,
    };

    const [updated] = await db
      .update(cmsSiteSettings)
      .set({ config: merged, updatedAt: new Date() })
      .where(eq(cmsSiteSettings.key, 'homepage_config'))
      .returning();

    await auditCms(req, 'cms.update_site_config', 'cms_site_settings', updated?.id);
    res.json({ siteConfig: updated?.config || merged });
  } catch (error) {
    console.error('PATCH /api/cms/site-config error:', error);
    res.status(500).json({ error: 'Failed to update site configuration' });
  }
});

// Services CRUD + Reorder
adminCmsRouter.post('/services', async (req: AuthRequest, res) => {
  try {
    const body = req.body || {};
    if (!body.title || !String(body.title).trim()) {
      res.status(400).json({ error: 'Service title is required' });
      return;
    }
    const existing = await db.select({ id: cmsServices.id }).from(cmsServices);
    const code = body.code?.trim() || `SVC-${Date.now().toString().slice(-5)}`;
    const subcategories = Array.isArray(body.subcategories)
      ? body.subcategories.map((s: unknown) => String(s).trim()).filter(Boolean)
      : String(body.subcategories || '')
          .split(/\n|,/)
          .map((s) => s.trim())
          .filter(Boolean);

    const [created] = await db
      .insert(cmsServices)
      .values({
        code,
        title: String(body.title).trim(),
        shortDescription: String(body.shortDescription || 'Enterprise EHS service capability.').trim(),
        icon: String(body.icon || 'ShieldCheck').trim(),
        accentColor: String(body.accentColor || '#FFC629').trim(),
        subcategories,
        complianceNote: body.complianceNote ? String(body.complianceNote).trim() : null,
        displayOrder: Number.isFinite(Number(body.displayOrder)) ? Number(body.displayOrder) : existing.length + 1,
        isVisible: body.isVisible !== undefined ? Boolean(body.isVisible) : true,
        isSystem: false,
      })
      .returning();

    await auditCms(req, 'cms.create_service', 'cms_service', created.id, { title: created.title });
    res.status(201).json(created);
  } catch (error) {
    console.error('POST /api/cms/services error:', error);
    res.status(500).json({ error: 'Failed to create service category' });
  }
});

adminCmsRouter.patch('/services/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) updateData.title = String(body.title).trim();
    if (body.shortDescription !== undefined) updateData.shortDescription = String(body.shortDescription).trim();
    if (body.icon !== undefined) updateData.icon = String(body.icon).trim();
    if (body.accentColor !== undefined) updateData.accentColor = String(body.accentColor).trim();
    if (body.complianceNote !== undefined) updateData.complianceNote = body.complianceNote ? String(body.complianceNote).trim() : null;
    if (body.displayOrder !== undefined) updateData.displayOrder = Number(body.displayOrder);
    if (body.isVisible !== undefined) updateData.isVisible = Boolean(body.isVisible);
    if (body.subcategories !== undefined) {
      updateData.subcategories = Array.isArray(body.subcategories)
        ? body.subcategories.map((s: unknown) => String(s).trim()).filter(Boolean)
        : String(body.subcategories)
            .split(/\n|,/)
            .map((s) => s.trim())
            .filter(Boolean);
    }

    const [updated] = await db
      .update(cmsServices)
      .set(updateData)
      .where(eq(cmsServices.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Service category not found' });
      return;
    }

    await auditCms(req, 'cms.update_service', 'cms_service', id, { title: updated.title });
    res.json(updated);
  } catch (error) {
    console.error('PATCH /api/cms/services/:id error:', error);
    res.status(500).json({ error: 'Failed to update service category' });
  }
});

adminCmsRouter.delete('/services/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const force = req.query.force === 'true';
    const [existing] = await db.select().from(cmsServices).where(eq(cmsServices.id, id)).limit(1);
    if (!existing) {
      res.status(404).json({ error: 'Service category not found' });
      return;
    }
    if ((existing.subcategories?.length || 0) > 0 && !force) {
      res.status(409).json({
        error: `Service "${existing.title}" has ${existing.subcategories.length} active subcategories. Confirm force deletion or disable visibility instead.`,
        subcategoriesCount: existing.subcategories.length,
        requiresForce: true,
      });
      return;
    }

    await db.delete(cmsServices).where(eq(cmsServices.id, id));
    await auditCms(req, 'cms.delete_service', 'cms_service', id, { title: existing.title });
    res.json({ deleted: true, id });
  } catch (error) {
    console.error('DELETE /api/cms/services/:id error:', error);
    res.status(500).json({ error: 'Failed to delete service category' });
  }
});

adminCmsRouter.post('/services/reorder', async (req: AuthRequest, res) => {
  try {
    const orderedIds: string[] = Array.isArray(req.body?.orderedIds) ? req.body.orderedIds : [];
    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(cmsServices)
        .set({ displayOrder: i + 1, updatedAt: new Date() })
        .where(eq(cmsServices.id, orderedIds[i]));
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('POST /api/cms/services/reorder error:', error);
    res.status(500).json({ error: 'Failed to reorder services' });
  }
});

// Industries CRUD + Reorder
adminCmsRouter.post('/industries', async (req: AuthRequest, res) => {
  try {
    const body = req.body || {};
    if (!body.name || !String(body.name).trim()) {
      res.status(400).json({ error: 'Industry name is required' });
      return;
    }
    const existing = await db.select({ id: cmsIndustries.id }).from(cmsIndustries);
    const code = body.code?.trim() || `IND-${Date.now().toString().slice(-5)}`;
    const capabilities = Array.isArray(body.capabilities)
      ? body.capabilities.map((s: unknown) => String(s).trim()).filter(Boolean)
      : String(body.capabilities || '')
          .split(/\n|,/)
          .map((s) => s.trim())
          .filter(Boolean);
    const recommendedModules = Array.isArray(body.recommendedModules)
      ? body.recommendedModules.map((s: unknown) => String(s).trim()).filter(Boolean)
      : String(body.recommendedModules || '')
          .split(/\n|,/)
          .map((s) => s.trim())
          .filter(Boolean);

    const [created] = await db
      .insert(cmsIndustries)
      .values({
        code,
        name: String(body.name).trim(),
        shortName: String(body.shortName || body.name).trim(),
        description: String(body.description || 'Enterprise EHS & AI compliance solution tailored for this industry.').trim(),
        imageUrl: body.imageUrl ? String(body.imageUrl).trim() : '/assets/homepage/ind_global_industries.jpg',
        icon: String(body.icon || 'Factory').trim(),
        accentColor: String(body.accentColor || '#00BFFF').trim(),
        capabilities,
        recommendedModules,
        displayOrder: Number.isFinite(Number(body.displayOrder)) ? Number(body.displayOrder) : existing.length + 1,
        isVisible: body.isVisible !== undefined ? Boolean(body.isVisible) : true,
        isExpandable: Boolean(body.isExpandable),
      })
      .returning();

    await auditCms(req, 'cms.create_industry', 'cms_industry', created.id, { name: created.name });
    res.status(201).json(created);
  } catch (error) {
    console.error('POST /api/cms/industries error:', error);
    res.status(500).json({ error: 'Failed to create industry' });
  }
});

adminCmsRouter.patch('/industries/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.shortName !== undefined) updateData.shortName = String(body.shortName).trim();
    if (body.description !== undefined) updateData.description = String(body.description).trim();
    if (body.imageUrl !== undefined) updateData.imageUrl = String(body.imageUrl).trim();
    if (body.icon !== undefined) updateData.icon = String(body.icon).trim();
    if (body.accentColor !== undefined) updateData.accentColor = String(body.accentColor).trim();
    if (body.displayOrder !== undefined) updateData.displayOrder = Number(body.displayOrder);
    if (body.isVisible !== undefined) updateData.isVisible = Boolean(body.isVisible);
    if (body.isExpandable !== undefined) updateData.isExpandable = Boolean(body.isExpandable);
    if (body.capabilities !== undefined) {
      updateData.capabilities = Array.isArray(body.capabilities)
        ? body.capabilities.map((s: unknown) => String(s).trim()).filter(Boolean)
        : String(body.capabilities)
            .split(/\n|,/)
            .map((s) => s.trim())
            .filter(Boolean);
    }
    if (body.recommendedModules !== undefined) {
      updateData.recommendedModules = Array.isArray(body.recommendedModules)
        ? body.recommendedModules.map((s: unknown) => String(s).trim()).filter(Boolean)
        : String(body.recommendedModules)
            .split(/\n|,/)
            .map((s) => s.trim())
            .filter(Boolean);
    }

    const [updated] = await db
      .update(cmsIndustries)
      .set(updateData)
      .where(eq(cmsIndustries.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Industry not found' });
      return;
    }

    await auditCms(req, 'cms.update_industry', 'cms_industry', id, { name: updated.name });
    res.json(updated);
  } catch (error) {
    console.error('PATCH /api/cms/industries/:id error:', error);
    res.status(500).json({ error: 'Failed to update industry' });
  }
});

adminCmsRouter.delete('/industries/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const force = req.query.force === 'true';
    const [existing] = await db.select().from(cmsIndustries).where(eq(cmsIndustries.id, id)).limit(1);
    if (!existing) {
      res.status(404).json({ error: 'Industry not found' });
      return;
    }
    if ((existing.capabilities?.length || 0) > 0 && !force) {
      res.status(409).json({
        error: `Industry "${existing.name}" has ${existing.capabilities.length} configured sectors/capabilities. Confirm force deletion or hide it instead.`,
        requiresForce: true,
      });
      return;
    }
    await db.delete(cmsIndustries).where(eq(cmsIndustries.id, id));
    await auditCms(req, 'cms.delete_industry', 'cms_industry', id, { name: existing.name });
    res.json({ deleted: true, id });
  } catch (error) {
    console.error('DELETE /api/cms/industries/:id error:', error);
    res.status(500).json({ error: 'Failed to delete industry' });
  }
});

adminCmsRouter.post('/industries/reorder', async (req: AuthRequest, res) => {
  try {
    const orderedIds: string[] = Array.isArray(req.body?.orderedIds) ? req.body.orderedIds : [];
    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(cmsIndustries)
        .set({ displayOrder: i + 1, updatedAt: new Date() })
        .where(eq(cmsIndustries.id, orderedIds[i]));
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('POST /api/cms/industries/reorder error:', error);
    res.status(500).json({ error: 'Failed to reorder industries' });
  }
});
