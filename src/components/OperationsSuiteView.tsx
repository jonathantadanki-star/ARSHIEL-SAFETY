import React, { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Download,
  Edit3,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FolderPlus,
  Plus,
  QrCode,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { exportRowsToExcel } from '../lib/pdf';
import { StatusTag } from './IconResolver';
import { ModuleKpiStrip } from './ModuleKpiStrip';

const DOC_23_SECTIONS = [
  { num: 1, name: 'Policies' },
  { num: 2, name: 'OHS Manual' },
  { num: 3, name: 'SOPs' },
  { num: 4, name: 'Factory Safety Rules' },
  { num: 5, name: 'HSE Promotions' },
  { num: 6, name: 'Emergency Response' },
  { num: 7, name: 'Welfare' },
  { num: 8, name: 'Safety Committee' },
  { num: 9, name: 'Worker Screening' },
  { num: 10, name: 'Inspector Inspection' },
  { num: 11, name: 'Equipment Checklists' },
  { num: 12, name: 'Risk Management / SWMS' },
  { num: 13, name: 'Permit System' },
  { num: 14, name: 'Store' },
  { num: 15, name: 'Trainings' },
  { num: 16, name: 'Induction' },
  { num: 17, name: 'Risk Assessment' },
  { num: 18, name: 'Statutory Registers' },
  { num: 19, name: 'Safety Audits' },
  { num: 20, name: 'Test Certifications' },
  { num: 21, name: 'Gate Management' },
  { num: 22, name: 'Training PPTs' },
  { num: 23, name: 'Legal Requirements' },
];

const DOC_STATUSES = ['Completed', 'Not Updated', 'Not Started', 'In Progress', 'Under Review'];

const OFFICIAL_REFERENCE_LINKS = [
  { label: 'India Code (Acts & Rules)', url: 'https://www.indiacode.nic.in/indiacode/handle/123456789/22041?view_type=browse' },
  { label: 'Ministry of Labour (OSHWC Code)', url: 'https://www.labour.gov.in/offerings/schemes-and-services/details/labour-codes-gzNzQzMtQWa' },
  { label: 'ISO 45001 (OH&S)', url: 'https://www.iso.org/standard/45001' },
  { label: 'ISO 14001 (Environment)', url: 'https://www.iso.org/standard/14001' },
  { label: 'OSHA 29 CFR 1910 (General)', url: 'https://www.osha.gov/laws-regs/regulations/standardnumber/1910' },
  { label: 'OSHA 29 CFR 1926 (Construction)', url: 'https://www.osha.gov/laws-regs/regulations/standardnumber/1926' },
  { label: 'NFPA Codes & Standards', url: 'https://www.nfpa.org/codes-and-standards' },
  { label: 'CPCB Environmental Rules', url: 'https://cpcb.nic.in/web/rules/' },
];

function downloadWordDoc(doc: any, childDocs: any[]) {
  const isoList = Array.isArray(doc.isoReferences) ? doc.isoReferences : [];
  const factoryList = Array.isArray(doc.factoryRulesReferences) ? doc.factoryRulesReferences : [];
  const oshaList = Array.isArray(doc.oshaReferences) ? doc.oshaReferences : [];
  const html = `
  <html><head><meta charset="utf-8"><title>${doc.title}</title></head>
  <body style="font-family: Arial, sans-serif; padding: 24px; color: #0f172a;">
    <h1 style="margin-bottom:4px;">ARSHIEL SAFETY — Controlled EHS Document</h1>
    <p style="color:#475569; margin-top:0;">Owner &amp; Platform Architect: <strong>${doc.authorAttribution || 'Jonathan Thadanki'}</strong></p>
    <hr/>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse; width:100%; font-size:12px;">
      <tr><td><strong>Document Code</strong></td><td>${doc.documentCode}</td><td><strong>Version</strong></td><td>v${doc.version}</td></tr>
      <tr><td><strong>Title</strong></td><td>${doc.title}</td><td><strong>Status</strong></td><td>${doc.status}</td></tr>
      <tr><td><strong>Section</strong></td><td>${doc.sectionNumber}. ${doc.sectionName}</td><td><strong>Owner</strong></td><td>${doc.ownerName || 'EHS Team'}</td></tr>
    </table>
    <h3>Document Content &amp; Procedure</h3>
    <pre style="white-space:pre-wrap; font-family: Arial, sans-serif; background:#f8fafc; padding:12px; border:1px solid #cbd5e1;">${doc.contentText || 'No text body recorded yet.'}</pre>
    <h3>Regulatory &amp; Standard References</h3>
    <ul>
      <li><strong>ISO Standards:</strong> ${isoList.join(', ') || 'Verify applicable ISO standard'}</li>
      <li><strong>Factory Rules / OSHWC 2020:</strong> ${factoryList.join(', ') || 'Verify state factory rules'}</li>
      <li><strong>OSHA Rules / NFPA:</strong> ${oshaList.join(', ') || 'Verify OSHA 29 CFR applicability'}</li>
    </ul>
    ${doc.aiSuggestions ? `<h3>AI-Driven EHS Suggestions (Human Verification Required)</h3><p>${doc.aiSuggestions}</p>` : ''}
    ${childDocs.length > 0 ? `<h3>Linked Child Documents (${childDocs.length})</h3><ul>${childDocs.map((c) => `<li><strong>${c.documentCode}</strong> — ${c.title} (v${c.version}, ${c.status})</li>`).join('')}</ul>` : ''}
    <hr/>
    <p style="font-size:11px; color:#64748b;">Generated from ARSHIEL SAFETY · Free to Use &amp; Share · Attribution: Jonathan Thadanki</p>
  </body></html>`;
  const blob = new Blob([html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.documentCode || 'ARSHIEL-DOC'}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

export function OperationsSuiteView({
  routeKey,
  onOpenMasterKpi,
}: {
  routeKey: string;
  onOpenMasterKpi?: () => void;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [contractorsData, setContractorsData] = useState<{ contractors: any[]; workers: any[] }>({
    contractors: [],
    workers: [],
  });
  const [qrPreview, setQrPreview] = useState<{ title: string; url: string; token: string } | null>(null);
  const [selectedSection, setSelectedSection] = useState<number>(0);
  const [docSearch, setDocSearch] = useState('');
  const [showArchivedDocs, setShowArchivedDocs] = useState(false);

  // Generic quick form states
  const [f1, setF1] = useState('');
  const [f2, setF2] = useState('');
  const [f3, setF3] = useState('');
  const [f4, setF4] = useState('');
  const [num1, setNum1] = useState('10');
  const [fileDataUrl, setFileDataUrl] = useState('');

  // Document & Child Document Management States
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});
  const [viewingDoc, setViewingDoc] = useState<any | null>(null);
  const [docModalMode, setDocModalMode] = useState<'create' | 'edit' | 'create-child' | null>(null);
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const [docParentId, setDocParentId] = useState<string>('');
  const [docSectionNum, setDocSectionNum] = useState<number>(1);
  const [docTitle, setDocTitle] = useState('');
  const [docVersion, setDocVersion] = useState('1.0');
  const [docStatus, setDocStatus] = useState('Completed');
  const [docContent, setDocContent] = useState('');
  const [docIsoRefs, setDocIsoRefs] = useState('ISO 45001:2018, ISO 14001:2015');
  const [docFactoryRefs, setDocFactoryRefs] = useState('OSHWC Code, 2020, Factories Act, 1948 (Transition), State Factory Rules');
  const [docOshaRefs, setDocOshaRefs] = useState('OSHA 29 CFR 1910, OSHA 29 CFR 1926');
  const [docAuthorAttr, setDocAuthorAttr] = useState('Jonathan Thadanki');
  const [docAiNotes, setDocAiNotes] = useState('');
  const [docFileUrl, setDocFileUrl] = useState('');
  const [docFileName, setDocFileName] = useState('');
  const [confirmDeleteDocId, setConfirmDeleteDocId] = useState<string | null>(null);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiDocResult, setAiDocResult] = useState<any | null>(null);
  const [docFeedback, setDocFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Legal Edit/Delete/AI states
  const [legalFilter, setLegalFilter] = useState<'all' | 'oshwc' | 'osha' | 'iso'>('all');
  const [editingLegal, setEditingLegal] = useState<any | null>(null);
  const [confirmDeleteLegalId, setConfirmDeleteLegalId] = useState<string | null>(null);
  const [aiLegalLoading, setAiLegalLoading] = useState(false);
  const [aiLegalOutput, setAiLegalOutput] = useState<any | null>(null);

  const loadData = useCallback(async () => {
    setF1('');
    setF2('');
    setF3('');
    setF4('');
    setFileDataUrl('');
    if (routeKey === 'contractors') {
      const data = await apiFetch('/api/contractors');
      setContractorsData(data);
      return;
    }
    const endpointMap: Record<string, string> = {
      training: '/api/trainings',
      emergency: '/api/emergency',
      environment: '/api/environment',
      legal: '/api/legal',
      documents: '/api/documents',
      'weekly-tracking': '/api/weekly-activities',
      'ppe-store': '/api/ppe',
      gate: '/api/gate',
      committee: '/api/committees',
    };
    const ep = endpointMap[routeKey];
    if (ep) {
      const data = await apiFetch(ep);
      setRows(data);
    }
  }, [routeKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showQr = async (title: string, token: string) => {
    const url = await QRCode.toDataURL(token, { width: 200, margin: 1 });
    setQrPreview({ title, url, token });
  };

  // ---------------- CONTRACTORS & WORKERS ----------------
  if (routeKey === 'contractors') {
    const addVendor = async (e: React.FormEvent) => {
      e.preventDefault();
      await apiFetch('/api/contractors', {
        method: 'POST',
        body: JSON.stringify({ companyName: f1, supervisorName: f2, gstNumber: f3, licenseNumber: f4 }),
      });
      await loadData();
    };
    const addWorker = async (e: React.FormEvent) => {
      e.preventDefault();
      await apiFetch('/api/workers', {
        method: 'POST',
        body: JSON.stringify({ fullName: f1, skillCategory: f2 || 'Technician', contractorId: contractorsData.contractors[0]?.id }),
      });
      await loadData();
    };
    const activeVendors = contractorsData.contractors.filter((c) => c.status === 'Active').length;
    const avgVendorScore =
      contractorsData.contractors.length > 0
        ? Math.round(
            contractorsData.contractors.reduce((s, c) => s + Number(c.evaluationScore ?? 85), 0) /
              contractorsData.contractors.length
          )
        : 100;
    const inductedWorkers = contractorsData.workers.filter((w) => Boolean(w.inductionDate)).length;

    return (
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Contractor &amp; Workforce Compliance</h1>
          <p className="text-sm text-slate-500">Vendor GST/ESI/PF compliance, safety inductions, and worker QR pass tokens.</p>
        </div>

        <ModuleKpiStrip
          title="Contractor & Workforce Individual KPIs"
          onOpenMasterKpi={onOpenMasterKpi}
          items={[
            { label: 'Registered Contractors', value: contractorsData.contractors.length, hint: `${activeVendors} Active` },
            { label: 'Avg Vendor Score', value: `${avgVendorScore}/100`, hint: 'Evaluation benchmark' },
            { label: 'Contract Workers', value: contractorsData.workers.length, hint: `${inductedWorkers} Inducted` },
            { label: 'QR Pass Readiness', value: contractorsData.workers.length > 0 ? '100%' : '0%', hint: 'Active gate tokens' },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <form onSubmit={addVendor} className="bg-white border border-slate-200 rounded-md p-4 space-y-2.5">
            <div className="text-sm font-bold text-slate-900">Onboard Contractor Company</div>
            <input required value={f1} onChange={(e) => setF1(e.target.value)} placeholder="Company Name *" className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
            <div className="grid grid-cols-3 gap-2">
              <input value={f2} onChange={(e) => setF2(e.target.value)} placeholder="Supervisor Name" className="border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
              <input value={f3} onChange={(e) => setF3(e.target.value)} placeholder="GST #" className="border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
              <input value={f4} onChange={(e) => setF4(e.target.value)} placeholder="Labor License #" className="border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
            </div>
            <button type="submit" className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer">
              Add Contractor
            </button>
          </form>

          <form onSubmit={addWorker} className="bg-white border border-slate-200 rounded-md p-4 space-y-2.5">
            <div className="text-sm font-bold text-slate-900">Register Contractor Worker &amp; QR Badge</div>
            <div className="grid grid-cols-2 gap-2">
              <input required value={f1} onChange={(e) => setF1(e.target.value)} placeholder="Worker Full Name *" className="border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
              <input value={f2} onChange={(e) => setF2(e.target.value)} placeholder="Skill (e.g. Certified Welder)" className="border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
            </div>
            <button type="submit" className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded cursor-pointer">
              Issue Worker QR Pass
            </button>
          </form>
        </div>

        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 font-bold text-sm">Registered Contractors ({contractorsData.contractors.length})</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr><th className="px-4 py-2">Vendor Code</th><th className="px-3 py-2">Company</th><th className="px-3 py-2">Supervisor</th><th className="px-3 py-2">Score</th><th className="px-3 py-2">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {contractorsData.contractors.map((c) => (
                  <tr key={c.id}><td className="px-4 py-2 font-semibold">{c.vendorCode}</td><td className="px-3 py-2">{c.companyName}</td><td className="px-3 py-2">{c.supervisorName}</td><td className="px-3 py-2">{c.evaluationScore}/100</td><td className="px-3 py-2"><StatusTag status={c.status} /></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 font-bold text-sm">Contractor Workers &amp; QR Passes ({contractorsData.workers.length})</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr><th className="px-4 py-2">Worker ID</th><th className="px-3 py-2">Name &amp; Skill</th><th className="px-3 py-2">Induction</th><th className="px-3 py-2">Attendance</th><th className="px-3 py-2 text-right">QR Badge</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {contractorsData.workers.map((w) => (
                  <tr key={w.id}>
                    <td className="px-4 py-2 font-semibold">{w.workerId}</td>
                    <td className="px-3 py-2"><div className="font-semibold">{w.fullName}</div><div className="text-[11px] text-slate-500">{w.skillCategory}</div></td>
                    <td className="px-3 py-2">{w.inductionDate || '-'}</td>
                    <td className="px-3 py-2"><StatusTag status={w.attendanceStatus} /></td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => showQr(w.fullName, w.qrCodeToken)} className="inline-flex items-center gap-1 px-2 py-1 border border-slate-300 rounded text-[11px] cursor-pointer">
                        <QrCode className="w-3 h-3" /> QR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {qrPreview && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setQrPreview(null)}>
            <div className="bg-white rounded-lg p-6 text-center space-y-2 max-w-xs w-full" onClick={(e) => e.stopPropagation()}>
              <div className="font-bold text-sm">{qrPreview.title}</div>
              <img src={qrPreview.url} alt="QR" className="mx-auto" />
              <div className="text-xs font-mono text-slate-600">{qrPreview.token}</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------- DOCUMENT MANAGEMENT (NORMAL + CHILD DOCS + ADD/EDIT/DELETE + AI SUGGESTIONS) ----------------
  if (routeKey === 'documents') {
    const parseTags = (raw: string) =>
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    const openCreateModal = (parentDoc?: any) => {
      setDocModalMode(parentDoc ? 'create-child' : 'create');
      setEditingDoc(null);
      setDocParentId(parentDoc ? parentDoc.id : '');
      setDocSectionNum(parentDoc ? parentDoc.sectionNumber : selectedSection || 1);
      setDocTitle('');
      setDocVersion('1.0');
      setDocStatus('In Progress');
      setDocContent('');
      setDocIsoRefs('ISO 45001:2018, ISO 14001:2015');
      setDocFactoryRefs('OSHWC Code, 2020, Factories Act, 1948 (Transition), State Factory Rules');
      setDocOshaRefs('OSHA 29 CFR 1910, OSHA 29 CFR 1926');
      setDocAuthorAttr('Jonathan Thadanki');
      setDocAiNotes('');
      setDocFileUrl('');
      setDocFileName('');
      setAiDocResult(null);
    };

    const openEditModal = (doc: any) => {
      setDocModalMode('edit');
      setEditingDoc(doc);
      setDocParentId(doc.parentDocumentId || '');
      setDocSectionNum(doc.sectionNumber || 1);
      setDocTitle(doc.title || '');
      setDocVersion(doc.version || '1.0');
      setDocStatus(doc.status || 'Completed');
      setDocContent(doc.contentText || '');
      setDocIsoRefs((doc.isoReferences || []).join(', '));
      setDocFactoryRefs((doc.factoryRulesReferences || []).join(', '));
      setDocOshaRefs((doc.oshaReferences || []).join(', '));
      setDocAuthorAttr(doc.authorAttribution || 'Jonathan Thadanki');
      setDocAiNotes(doc.aiSuggestions || '');
      setDocFileUrl(doc.fileDataUrl || '');
      setDocFileName(doc.fileName || '');
      setAiDocResult(null);
    };

    const saveDocumentModal = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!docTitle.trim()) return;
      const sec = DOC_23_SECTIONS.find((s) => s.num === Number(docSectionNum)) || DOC_23_SECTIONS[0];
      const payload = {
        parentDocumentId: docParentId || null,
        sectionNumber: sec.num,
        sectionName: sec.name,
        title: docTitle.trim(),
        version: docVersion || '1.0',
        status: docStatus,
        contentText: docContent,
        isoReferences: parseTags(docIsoRefs),
        factoryRulesReferences: parseTags(docFactoryRefs),
        oshaReferences: parseTags(docOshaRefs),
        authorAttribution: docAuthorAttr || 'Jonathan Thadanki',
        aiSuggestions: docAiNotes || null,
        fileDataUrl: docFileUrl || null,
        fileName: docFileName || `${docTitle.trim().replace(/[^a-zA-Z0-9_-]+/g, '_')}.pdf`,
      };
      try {
        if (docModalMode === 'edit' && editingDoc) {
          const updated = await apiFetch(`/api/documents/${editingDoc.id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          });
          if (viewingDoc?.id === editingDoc.id) setViewingDoc(updated);
          setDocFeedback({ type: 'ok', text: `Updated "${updated.title}" successfully.` });
        } else {
          const created = await apiFetch('/api/documents', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          if (docParentId) {
            setExpandedParents((prev) => ({ ...prev, [docParentId]: true }));
          }
          setDocFeedback({
            type: 'ok',
            text: `${docParentId ? 'Child document' : 'Document'} "${created.title}" created.`,
          });
        }
        setDocModalMode(null);
        await loadData();
      } catch (err: any) {
        setDocFeedback({ type: 'err', text: err.message || 'Failed to save document.' });
      }
    };

    const handleDeleteDocument = async (doc: any) => {
      try {
        await apiFetch(`/api/documents/${doc.id}`, { method: 'DELETE' });
        setConfirmDeleteDocId(null);
        if (viewingDoc?.id === doc.id) setViewingDoc(null);
        setDocFeedback({ type: 'ok', text: `Deleted "${doc.title}".` });
        await loadData();
      } catch (err: any) {
        setDocFeedback({ type: 'err', text: err.message || 'Failed to delete document.' });
      }
    };

    const runAiDocumentSuggest = async (targetDoc?: any) => {
      setAiSuggesting(true);
      setDocFeedback(null);
      try {
        const titleToUse = targetDoc ? targetDoc.title : docTitle;
        const secNum = targetDoc ? targetDoc.sectionNumber : docSectionNum;
        const secName = DOC_23_SECTIONS.find((s) => s.num === Number(secNum))?.name || 'EHS Policies';
        const pId = targetDoc ? targetDoc.parentDocumentId : docParentId;
        const parentDoc = pId ? rows.find((r) => r.id === pId) : null;
        const res = await apiFetch<any>('/api/ai/suggest-document', {
          method: 'POST',
          body: JSON.stringify({
            title: titleToUse || secName,
            sectionName: secName,
            parentTitle: parentDoc?.title || '',
            isChildDocument: Boolean(pId),
            existingContent: targetDoc ? targetDoc.contentText : docContent,
          }),
        });
        setAiDocResult(res);
      } catch (err: any) {
        setDocFeedback({ type: 'err', text: err.message || 'AI suggestion failed.' });
      } finally {
        setAiSuggesting(false);
      }
    };

    const filteredDocs = rows.filter((d) => {
      if (!showArchivedDocs && d.isArchived) return false;
      if (selectedSection !== 0 && d.sectionNumber !== selectedSection) return false;
      if (docSearch.trim()) {
        const q = docSearch.toLowerCase();
        return (
          String(d.title || '').toLowerCase().includes(q) ||
          String(d.documentCode || '').toLowerCase().includes(q) ||
          String(d.sectionName || '').toLowerCase().includes(q) ||
          JSON.stringify(d.isoReferences || []).toLowerCase().includes(q) ||
          JSON.stringify(d.factoryRulesReferences || []).toLowerCase().includes(q) ||
          JSON.stringify(d.oshaReferences || []).toLowerCase().includes(q)
        );
      }
      return true;
    });

    const activeDocsList = rows.filter((d) => !d.isArchived);
    const normalDocsCount = activeDocsList.filter((d) => !d.parentDocumentId).length;
    const childDocsCount = activeDocsList.filter((d) => Boolean(d.parentDocumentId)).length;
    const completedDocsCount = activeDocsList.filter((d) => d.status === 'Completed').length;
    const docCompletionPct =
      activeDocsList.length > 0 ? Math.round((completedDocsCount / activeDocsList.length) * 100) : 100;
    const coveredSectionsCount = new Set(activeDocsList.map((d) => d.sectionNumber)).size;
    const regTaggedCount = activeDocsList.filter(
      (d) =>
        (Array.isArray(d.isoReferences) && d.isoReferences.length > 0) ||
        (Array.isArray(d.factoryRulesReferences) && d.factoryRulesReferences.length > 0) ||
        (Array.isArray(d.oshaReferences) && d.oshaReferences.length > 0)
    ).length;

    const isDescendant = (candidateId: string, ancestorId?: string): boolean => {
      if (!ancestorId) return false;
      let curr = rows.find((r) => r.id === candidateId);
      const visited = new Set<string>();
      while (curr?.parentDocumentId) {
        if (curr.parentDocumentId === ancestorId) return true;
        if (visited.has(curr.id)) break;
        visited.add(curr.id);
        curr = rows.find((r) => r.id === curr.parentDocumentId);
      }
      return false;
    };

    const parentDocs = filteredDocs.filter((d) => !d.parentDocumentId);
    const getChildren = (parentId: string) => filteredDocs.filter((d) => d.parentDocumentId === parentId);
    const visibleIdsSet = new Set(filteredDocs.map((p) => p.id));
    const orphanChildren = filteredDocs.filter((d) => d.parentDocumentId && !visibleIdsSet.has(d.parentDocumentId));

    const renderDocRow = (d: any, depth = 0): React.ReactNode => {
      const children = getChildren(d.id);
      const isChild = depth > 0 || Boolean(d.parentDocumentId);
      const isExpanded = expandedParents[d.id] ?? true;
      return (
        <React.Fragment key={d.id}>
          <tr className={`${d.isArchived ? 'opacity-60' : ''} ${isChild ? 'bg-slate-50/70' : 'hover:bg-slate-50'}`}>
            <td className="px-4 py-2.5 font-mono whitespace-nowrap">
              <div className="flex items-center gap-1.5" style={{ paddingLeft: `${depth * 18}px` }}>
                {children.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setExpandedParents((p) => ({ ...p, [d.id]: !isExpanded }))}
                    className="text-slate-500 hover:text-slate-900 cursor-pointer"
                    title="Toggle child documents"
                  >
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                )}
                {isChild && <span className="text-emerald-700 font-bold">↳</span>}
                <span>{d.documentCode}</span>
              </div>
            </td>
            <td className="px-3 py-2.5">
              <button
                type="button"
                onClick={() => {
                  setViewingDoc(d);
                  setAiDocResult(null);
                }}
                className="font-semibold text-slate-900 hover:text-emerald-700 text-left cursor-pointer"
              >
                {d.title}
              </button>
              <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                <span>Sec {d.sectionNumber}: {d.sectionName}</span>
                {isChild && <span className="text-emerald-700 font-semibold">Child Document</span>}
                {children.length > 0 && (
                  <span className="text-slate-700 font-medium">{children.length} Child Doc(s)</span>
                )}
                {d.authorAttribution && <span>· Ref: {d.authorAttribution}</span>}
              </div>
              <div className="flex flex-wrap gap-1 mt-1 text-[10px]">
                {(d.isoReferences || []).slice(0, 2).map((ref: string, i: number) => (
                  <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded font-medium">
                    {ref}
                  </span>
                ))}
                {(d.factoryRulesReferences || []).slice(0, 1).map((ref: string, i: number) => (
                  <span key={i} className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-medium">
                    {ref}
                  </span>
                ))}
                {(d.oshaReferences || []).slice(0, 1).map((ref: string, i: number) => (
                  <span key={i} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-medium">
                    {ref}
                  </span>
                ))}
              </div>
            </td>
            <td className="px-3 py-2.5 tabular-nums whitespace-nowrap">v{d.version}</td>
            <td className="px-3 py-2.5"><StatusTag status={d.isArchived ? 'Archived' : d.status} /></td>
            <td className="px-3 py-2.5 text-right whitespace-nowrap">
              <div className="inline-flex flex-wrap items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setViewingDoc(d);
                    setAiDocResult(null);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-slate-900 text-white rounded text-[11px] hover:bg-slate-800 cursor-pointer"
                  title="Open inside document, manage child docs & AI suggestions"
                >
                  <BookOpen className="w-3 h-3" /> Open
                </button>
                <button
                  type="button"
                  onClick={() => openCreateModal(d)}
                  className="inline-flex items-center gap-1 px-2 py-1 border border-emerald-300 bg-emerald-50 text-emerald-800 rounded text-[11px] hover:bg-emerald-100 cursor-pointer"
                  title="Add child document inside this document"
                >
                  <FolderPlus className="w-3 h-3" /> +Child
                </button>
                <button
                  type="button"
                  onClick={() => openEditModal(d)}
                  className="inline-flex items-center gap-1 px-2 py-1 border border-slate-300 rounded text-[11px] hover:bg-slate-100 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" /> Edit
                </button>
                {confirmDeleteDocId === d.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(d)}
                      className="px-2 py-1 bg-red-600 text-white rounded text-[11px] font-semibold cursor-pointer"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteDocId(null)}
                      className="px-2 py-1 border border-slate-300 rounded text-[11px] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteDocId(d.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 border border-red-200 text-red-700 rounded text-[11px] hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Del
                  </button>
                )}
              </div>
            </td>
          </tr>
          {isExpanded && children.map((child) => renderDocRow(child, depth + 1))}
        </React.Fragment>
      );
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">
              EHS Document Control (Normal &amp; Child Documents)
            </h1>
            <p className="text-sm text-slate-500">
              Add, Edit &amp; Delete normal/child documents with AI-driven suggestions, ISO, Factory Rules &amp; OSHA references · Owner: Jonathan Thadanki.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openCreateModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Normal Document
            </button>
            <button
              type="button"
              onClick={() => exportRowsToExcel(rows, 'ARSHIEL-Controlled-Documents')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white rounded text-slate-700 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
            </button>
          </div>
        </div>

        {docFeedback && (
          <div
            className={`text-xs px-4 py-2.5 rounded border ${
              docFeedback.type === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            {docFeedback.text}
          </div>
        )}

        <ModuleKpiStrip
          title="Document Control Individual KPIs"
          onOpenMasterKpi={onOpenMasterKpi}
          items={[
            { label: 'Total Controlled Docs', value: activeDocsList.length, hint: `${normalDocsCount} Normal · ${childDocsCount} Child` },
            { label: 'Document Completion %', value: `${docCompletionPct}%`, hint: `${completedDocsCount} Completed` },
            { label: '23-Section Coverage', value: `${coveredSectionsCount}/23`, hint: 'ISO / Statutory sections' },
            { label: 'ISO/Factory/OSHA Tagged', value: `${regTaggedCount}/${activeDocsList.length}`, hint: 'Regulatory traceability' },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-md p-2 max-h-[540px] overflow-y-auto space-y-0.5 text-xs">
            <button
              type="button"
              onClick={() => setSelectedSection(0)}
              className={`w-full text-left px-3 py-1.5 rounded font-semibold cursor-pointer ${
                selectedSection === 0 ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'
              }`}
            >
              All 23 Sections ({rows.length})
            </button>
            {DOC_23_SECTIONS.map((s) => (
              <button
                key={s.num}
                type="button"
                onClick={() => setSelectedSection(s.num)}
                className={`w-full text-left px-3 py-1.5 rounded flex justify-between cursor-pointer ${
                  selectedSection === s.num ? 'bg-emerald-700 text-white font-semibold' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span>{s.num}. {s.name}</span>
                <span className="tabular-nums opacity-75">{rows.filter((r) => r.sectionNumber === s.num).length}</span>
              </button>
            ))}
          </div>

          <div className="lg:col-span-9 bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <input
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                placeholder="Search document title, code, ISO, Factory Rules, or OSHA..."
                className="flex-1 min-w-[200px] border border-slate-300 rounded px-2.5 py-1.5 text-xs"
              />
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showArchivedDocs}
                  onChange={(e) => setShowArchivedDocs(e.target.checked)}
                />
                <span>Show Archived</span>
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2">Code / Hierarchy</th>
                    <th className="px-3 py-2">Document &amp; References (ISO / Factory / OSHA)</th>
                    <th className="px-3 py-2">Ver</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parentDocs.map((d) => renderDocRow(d, 0))}
                  {orphanChildren.map((d) => renderDocRow(d, 1))}
                  {filteredDocs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No documents match your filter. Click <strong>Add Normal Document</strong> to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Inside Document & Child Document Workspace Modal */}
        {viewingDoc && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3 sm:p-4" onClick={() => setViewingDoc(null)}>
            <div
              className="bg-white border border-slate-200 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <div className="text-[11px] font-mono text-emerald-700 font-semibold">
                    {viewingDoc.documentCode} · v{viewingDoc.version} · {viewingDoc.parentDocumentId ? 'CHILD DOCUMENT' : 'NORMAL / PARENT DOCUMENT'}
                  </div>
                  <h2 className="font-display text-xl font-bold text-slate-900">{viewingDoc.title}</h2>
                  <div className="text-xs text-slate-500">
                    Section {viewingDoc.sectionNumber}: {viewingDoc.sectionName} · Owner/Attribution:{' '}
                    <strong className="text-slate-800">{viewingDoc.authorAttribution || 'Jonathan Thadanki'}</strong>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => runAiDocumentSuggest(viewingDoc)}
                    disabled={aiSuggesting}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-slate-900 text-amber-300 rounded cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{aiSuggesting ? 'Thinking...' : 'AI Suggestions'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadWordDoc(viewingDoc, rows.filter((r) => r.parentDocumentId === viewingDoc.id))}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold border border-slate-300 bg-white rounded cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" /> Word (.doc)
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(viewingDoc)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => openCreateModal(viewingDoc)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold border border-emerald-300 bg-emerald-50 text-emerald-800 rounded cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" /> Add Child Doc
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingDoc(null)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Regulatory References */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-blue-50/60 border border-blue-200 rounded p-3">
                  <div className="font-bold text-blue-950 mb-1">ISO Standards References</div>
                  <ul className="list-disc pl-4 space-y-0.5 text-blue-900">
                    {(viewingDoc.isoReferences || []).length > 0
                      ? viewingDoc.isoReferences.map((x: string, i: number) => <li key={i}>{x}</li>)
                      : <li>ISO 45001:2018 (Verify applicability)</li>}
                  </ul>
                </div>
                <div className="bg-amber-50/60 border border-amber-200 rounded p-3">
                  <div className="font-bold text-amber-950 mb-1">Factory Rules / OSHWC Code 2020</div>
                  <ul className="list-disc pl-4 space-y-0.5 text-amber-900">
                    {(viewingDoc.factoryRulesReferences || []).length > 0
                      ? viewingDoc.factoryRulesReferences.map((x: string, i: number) => <li key={i}>{x}</li>)
                      : <li>OSHWC Code 2020 / Factories Act 1948 Transition</li>}
                  </ul>
                </div>
                <div className="bg-emerald-50/60 border border-emerald-200 rounded p-3">
                  <div className="font-bold text-emerald-950 mb-1">OSHA Rules / NFPA</div>
                  <ul className="list-disc pl-4 space-y-0.5 text-emerald-900">
                    {(viewingDoc.oshaReferences || []).length > 0
                      ? viewingDoc.oshaReferences.map((x: string, i: number) => <li key={i}>{x}</li>)
                      : <li>OSHA 29 CFR 1910 / 1926</li>}
                  </ul>
                </div>
              </div>

              {/* Editable/Readable Content Body */}
              <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs space-y-1">
                <div className="font-bold text-slate-800 uppercase tracking-wide">Document Content / Procedure</div>
                <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                  {viewingDoc.contentText || 'No text content yet. Click "Edit" or "AI Suggestions" to populate this document.'}
                </div>
                {viewingDoc.fileDataUrl && (
                  <div className="pt-2">
                    <a
                      href={viewingDoc.fileDataUrl}
                      download={viewingDoc.fileName || `${viewingDoc.documentCode}.pdf`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-800 hover:bg-slate-100"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Attached File ({viewingDoc.fileName})
                    </a>
                  </div>
                )}
              </div>

              {viewingDoc.aiSuggestions && (
                <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs space-y-1">
                  <div className="font-bold text-amber-900">Saved AI Advisory Notes (Requires Competent EHS Approval)</div>
                  <div className="whitespace-pre-wrap text-amber-950">{viewingDoc.aiSuggestions}</div>
                </div>
              )}

              {/* Live AI Suggestions Output Inside Viewer */}
              {aiDocResult && (
                <div className="bg-slate-900 text-slate-100 rounded-md p-4 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>AI-Driven Document Draft &amp; Compliance Suggestions</span>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const mergedContent = viewingDoc.contentText
                          ? `${viewingDoc.contentText}\n\n${aiDocResult.suggestedContent}`
                          : aiDocResult.suggestedContent;
                        const updated = await apiFetch(`/api/documents/${viewingDoc.id}`, {
                          method: 'PATCH',
                          body: JSON.stringify({
                            contentText: mergedContent,
                            isoReferences: aiDocResult.isoReferences || viewingDoc.isoReferences,
                            factoryRulesReferences: aiDocResult.factoryRulesReferences || viewingDoc.factoryRulesReferences,
                            oshaReferences: aiDocResult.oshaReferences || viewingDoc.oshaReferences,
                            aiSuggestions: (aiDocResult.improvementSuggestions || []).join('\n• '),
                          }),
                        });
                        setViewingDoc(updated);
                        setAiDocResult(null);
                        setDocFeedback({ type: 'ok', text: 'Applied AI draft & ISO/Factory/OSHA references to document.' });
                        await loadData();
                      }}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded cursor-pointer"
                    >
                      Apply AI Draft &amp; References to Document
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap bg-slate-800 p-2.5 rounded text-slate-200 max-h-48 overflow-y-auto">
                    {aiDocResult.suggestedContent}
                  </pre>
                  {(aiDocResult.improvementSuggestions || []).length > 0 && (
                    <div>
                      <div className="font-semibold text-emerald-300 mb-1">Improvement Recommendations:</div>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-300">
                        {aiDocResult.improvementSuggestions.map((s: string, i: number) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Child Documents Inside This Document (Works for Normal & Child Documents) */}
              <div className="border border-slate-200 rounded-md overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Child Documents Inside &ldquo;{viewingDoc.title}&rdquo; ({rows.filter((r) => r.parentDocumentId === viewingDoc.id).length})
                  </span>
                  <button
                    type="button"
                    onClick={() => openCreateModal(viewingDoc)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-emerald-700 text-white rounded cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Child Document
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {rows.filter((r) => r.parentDocumentId === viewingDoc.id).length === 0 ? (
                    <div className="p-4 text-xs text-slate-400 text-center">
                      No child documents yet. Click &ldquo;Add Child Document&rdquo; to attach sub-SOPs, checklists, or registers inside this document.
                    </div>
                  ) : (
                    rows
                      .filter((r) => r.parentDocumentId === viewingDoc.id)
                      .map((child) => (
                        <div key={child.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div>
                            <div className="font-semibold text-slate-900">
                              {child.documentCode} · {child.title} (v{child.version})
                            </div>
                            <div className="text-[11px] text-slate-500">
                              ISO: {(child.isoReferences || []).join(', ') || '-'} · Factory/OSHWC: {(child.factoryRulesReferences || []).join(', ') || '-'} · OSHA: {(child.oshaReferences || []).join(', ') || '-'}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            <StatusTag status={child.status} />
                            <button
                              type="button"
                              onClick={() => {
                                setViewingDoc(child);
                                setAiDocResult(null);
                              }}
                              className="px-2 py-1 bg-slate-900 text-white rounded text-[11px] cursor-pointer"
                            >
                              Open
                            </button>
                            <button
                              type="button"
                              onClick={() => openCreateModal(child)}
                              className="px-2 py-1 border border-emerald-300 bg-emerald-50 text-emerald-800 rounded text-[11px] cursor-pointer"
                            >
                              +Sub-Child
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(child)}
                              className="px-2 py-1 border border-slate-300 rounded text-[11px] cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(child)}
                              className="px-2 py-1 border border-red-200 text-red-700 rounded text-[11px] cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add / Edit Document & Child Document Modal */}
        {docModalMode && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3 sm:p-4">
            <form
              onSubmit={saveDocumentModal}
              className="bg-white border border-slate-200 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 space-y-3 text-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="font-display font-bold text-base text-slate-900">
                  {docModalMode === 'edit'
                    ? `Edit Document — ${editingDoc?.documentCode}`
                    : docModalMode === 'create-child'
                      ? 'Add Child Document'
                      : 'Add Normal Document'}
                </div>
                <button type="button" onClick={() => setDocModalMode(null)}>
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">23-Section Category</label>
                  <select
                    value={docSectionNum}
                    onChange={(e) => setDocSectionNum(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    {DOC_23_SECTIONS.map((s) => (
                      <option key={s.num} value={s.num}>
                        {s.num}. {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Parent Document (Optional — makes this a Child Doc)</label>
                  <select
                    value={docParentId}
                    onChange={(e) => setDocParentId(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    <option value="">-- Normal / Top-Level Document --</option>
                    {rows
                      .filter((r) => r.id !== editingDoc?.id && !isDescendant(r.id, editingDoc?.id))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.documentCode} · {p.title} {p.parentDocumentId ? '(Child Doc)' : ''}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Document Title *</label>
                  <input
                    required
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="e.g. Lockout Tagout (LOTO) Child Checklist"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Version</label>
                  <input
                    value={docVersion}
                    onChange={(e) => setDocVersion(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={docStatus}
                    onChange={(e) => setDocStatus(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    {DOC_STATUSES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded p-2.5">
                <span className="text-slate-700 font-medium">
                  Need help drafting clauses or ISO / Factory Rules / OSHA citations?
                </span>
                <button
                  type="button"
                  onClick={() => runAiDocumentSuggest()}
                  disabled={aiSuggesting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-amber-300 font-semibold rounded cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{aiSuggesting ? 'Generating...' : 'AI Suggest Draft & Rules'}</span>
                </button>
              </div>

              {aiDocResult && (
                <div className="bg-amber-50 border border-amber-300 rounded p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900">AI Suggestion Ready (Draft — Review Before Approval)</span>
                    <button
                      type="button"
                      onClick={() => {
                        setDocContent(aiDocResult.suggestedContent || docContent);
                        if (aiDocResult.isoReferences?.length) setDocIsoRefs(aiDocResult.isoReferences.join(', '));
                        if (aiDocResult.factoryRulesReferences?.length) setDocFactoryRefs(aiDocResult.factoryRulesReferences.join(', '));
                        if (aiDocResult.oshaReferences?.length) setDocOshaRefs(aiDocResult.oshaReferences.join(', '));
                        if (aiDocResult.improvementSuggestions?.length) setDocAiNotes(aiDocResult.improvementSuggestions.join(' | '));
                        setAiDocResult(null);
                      }}
                      className="px-2.5 py-1 bg-emerald-700 text-white rounded font-semibold cursor-pointer"
                    >
                      Apply into Form
                    </button>
                  </div>
                  <div className="text-[11px] text-amber-950 line-clamp-3">{aiDocResult.suggestedContent}</div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Document Content / Procedure Steps</label>
                <textarea
                  rows={4}
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  placeholder="Enter operational procedures, safety controls, scope, or use AI Suggest Draft above..."
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ISO Standards (comma separated)</label>
                  <input
                    value={docIsoRefs}
                    onChange={(e) => setDocIsoRefs(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Factory Rules / OSHWC 2020</label>
                  <input
                    value={docFactoryRefs}
                    onChange={(e) => setDocFactoryRefs(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">OSHA Rules / NFPA</label>
                  <input
                    value={docOshaRefs}
                    onChange={(e) => setDocOshaRefs(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2 py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-end">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reference / Attribution Name</label>
                  <input
                    value={docAuthorAttr}
                    onChange={(e) => setDocAuthorAttr(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded cursor-pointer bg-slate-50">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{docFileName ? `Attached: ${docFileName}` : 'Attach PDF / DOCX / Image'}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setDocFileName(file.name);
                        const reader = new FileReader();
                        reader.onload = () => setDocFileUrl(String(reader.result || ''));
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button type="button" onClick={() => setDocModalMode(null)} className="px-4 py-1.5 border border-slate-300 rounded">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-emerald-700 text-white font-semibold rounded cursor-pointer">
                  {docModalMode === 'edit' ? 'Save Document Changes' : 'Save Document'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // ---------------- LEGAL & REGULATORY COMPLIANCE (OSH CODE 2020 / FACTORIES / OSHA / ISO) ----------------
  if (routeKey === 'legal') {
    const filteredLegal = rows.filter((l) => {
      if (legalFilter === 'all') return true;
      const hay = `${l.statuteName || ''} ${l.sectionRef || ''} ${l.obligation || ''}`.toLowerCase();
      if (legalFilter === 'oshwc') return hay.includes('osh') || hay.includes('factor') || hay.includes('india');
      if (legalFilter === 'osha') return hay.includes('osha') || hay.includes('cfr') || hay.includes('nfpa');
      if (legalFilter === 'iso') return hay.includes('iso');
      return true;
    });

    const compliantCount = rows.filter((r) => r.complianceStatus === 'Compliant').length;
    const reviewCount = rows.filter((r) => r.complianceStatus !== 'Compliant').length;
    const legalPct = rows.length > 0 ? Math.round((compliantCount / rows.length) * 100) : 100;

    const addLegal = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!f1.trim()) return;
      await apiFetch('/api/legal', {
        method: 'POST',
        body: JSON.stringify({
          obligation: f1.trim(),
          statuteName: f2.trim() || 'OSH Code 2020 / Factories Act 1948',
          sectionRef: f3.trim() || 'Sec 6 / ISO 45001',
          state: f4.trim() || 'Central / All States',
          complianceStatus: 'Under Legal Review',
        }),
      });
      await loadData();
    };

    const saveLegalEdit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingLegal) return;
      await apiFetch(`/api/legal/${editingLegal.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editingLegal),
      });
      setEditingLegal(null);
      await loadData();
    };

    const deleteLegal = async (id: string) => {
      await apiFetch(`/api/legal/${id}`, { method: 'DELETE' });
      setConfirmDeleteLegalId(null);
      await loadData();
    };

    const runAiLegalAdvisory = async () => {
      setAiLegalLoading(true);
      try {
        const res = await apiFetch<any>('/api/ai/suggest-document', {
          method: 'POST',
          body: JSON.stringify({
            title: f1.trim() || 'Legal & Statutory Compliance Register (OSHWC 2020, Factories Act, OSHA, ISO)',
            sectionName: 'Legal Requirements',
            isChildDocument: false,
            state: f4.trim() || 'Central / All States',
            existingContent: rows.slice(0, 6).map((r) => `${r.statuteName} (${r.sectionRef}): ${r.obligation}`).join('\n'),
          }),
        });
        setAiLegalOutput(res);
      } finally {
        setAiLegalLoading(false);
      }
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">
              Legal &amp; Regulatory Compliance (OSH Code 2020 · Factories Rules · OSHA · ISO)
            </h1>
            <p className="text-sm text-slate-500">
              Track statutory registers, OSHA 29 CFR, India OSHWC Code 2020, Factories Act 1948 transition &amp; ISO 45001/14001 obligations · Owner: Jonathan Thadanki.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runAiLegalAdvisory}
              disabled={aiLegalLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 text-amber-300 rounded cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{aiLegalLoading ? 'Analyzing...' : 'AI Regulatory Suggestions'}</span>
            </button>
            <button
              type="button"
              onClick={() => exportRowsToExcel(rows, 'ARSHIEL-Legal-Register')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white rounded cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
            </button>
          </div>
        </div>

        <ModuleKpiStrip
          title="Legal & Statutory Compliance Individual KPIs"
          onOpenMasterKpi={onOpenMasterKpi}
          items={[
            { label: 'Total Legal Obligations', value: rows.length, hint: 'Tracked registers' },
            { label: 'Statutory Compliance %', value: `${legalPct}%`, hint: `${compliantCount} Compliant` },
            { label: 'Under Review / Action', value: reviewCount, hint: 'Pending verification', alert: reviewCount > 0 },
            { label: 'Regulatory Sources', value: OFFICIAL_REFERENCE_LINKS.length, hint: 'OSHWC · ISO · OSHA · NFPA' },
          ]}
        />

        {/* Official Regulatory Reference Links */}
        <div className="bg-white border border-slate-200 rounded-md p-3">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
            Official Standards &amp; Statutory Portals (Verification References)
          </div>
          <div className="flex flex-wrap gap-2">
            {OFFICIAL_REFERENCE_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-800 rounded"
              >
                <span>{link.label}</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            ))}
          </div>
        </div>

        {aiLegalOutput && (
          <div className="bg-slate-900 text-slate-100 rounded-md p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>AI Regulatory Compliance Draft (Legal / Safety Officer Verification Mandatory)</span>
              </div>
              <button type="button" onClick={() => setAiLegalOutput(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="whitespace-pre-wrap bg-slate-800 p-2.5 rounded text-slate-200 max-h-48 overflow-y-auto">
              {aiLegalOutput.suggestedContent}
            </pre>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="bg-slate-800 border border-slate-700 rounded p-2">
                <div className="font-semibold text-blue-300 mb-1">ISO References</div>
                <div>{(aiLegalOutput.isoReferences || []).join(' · ')}</div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded p-2">
                <div className="font-semibold text-amber-300 mb-1">Factory Rules / OSHWC 2020</div>
                <div>{(aiLegalOutput.factoryRulesReferences || []).join(' · ')}</div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded p-2">
                <div className="font-semibold text-emerald-300 mb-1">OSHA / NFPA</div>
                <div>{(aiLegalOutput.oshaReferences || []).join(' · ')}</div>
              </div>
            </div>
          </div>
        )}

        {/* Add Legal Obligation Form */}
        <form onSubmit={addLegal} className="bg-white border border-slate-200 rounded-md p-4 grid grid-cols-1 sm:grid-cols-5 gap-2">
          <input required value={f1} onChange={(e) => setF1(e.target.value)} placeholder="Legal Obligation Summary *" className="sm:col-span-2 border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
          <input value={f2} onChange={(e) => setF2(e.target.value)} placeholder="Statute (e.g. OSHWC Code 2020)" className="border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
          <input value={f3} onChange={(e) => setF3(e.target.value)} placeholder="Section / Rule Ref" className="border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
          <div className="flex gap-2">
            <input value={f4} onChange={(e) => setF4(e.target.value)} placeholder="State / Scope" className="w-28 border border-slate-300 rounded px-2 py-1.5 text-xs" />
            <button type="submit" className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        </form>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { k: 'all', label: `All Statutes (${rows.length})` },
            { k: 'oshwc', label: 'India OSHWC / Factory Rules' },
            { k: 'osha', label: 'OSHA 29 CFR / NFPA' },
            { k: 'iso', label: 'ISO 45001 / ISO 14001' },
          ].map((tab) => (
            <button
              key={tab.k}
              type="button"
              onClick={() => setLegalFilter(tab.k as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded border cursor-pointer ${
                legalFilter === tab.k ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Statute &amp; Section</th>
                  <th className="px-3 py-2.5">Obligation</th>
                  <th className="px-3 py-2.5">Jurisdiction</th>
                  <th className="px-3 py-2.5">Due Date</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {filteredLegal.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-slate-900">{l.statuteName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{l.sectionRef}</div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 max-w-md">{l.obligation}</td>
                    <td className="px-3 py-2.5 text-slate-600">{l.state}</td>
                    <td className="px-3 py-2.5 text-slate-600">{l.dueDate}</td>
                    <td className="px-3 py-2.5"><StatusTag status={l.complianceStatus} /></td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap space-x-1">
                      <button
                        type="button"
                        onClick={() => setEditingLegal({ ...l })}
                        className="inline-flex items-center gap-1 px-2 py-1 border border-slate-300 rounded text-[11px] hover:bg-slate-100 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" /> Edit
                      </button>
                      {confirmDeleteLegalId === l.id ? (
                        <>
                          <button type="button" onClick={() => deleteLegal(l.id)} className="px-2 py-1 bg-red-600 text-white rounded text-[11px] font-semibold cursor-pointer">
                            Confirm
                          </button>
                          <button type="button" onClick={() => setConfirmDeleteLegalId(null)} className="px-2 py-1 border border-slate-300 rounded text-[11px] cursor-pointer">
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteLegalId(l.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 border border-red-200 text-red-700 rounded text-[11px] hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Del
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredLegal.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No legal obligations match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {editingLegal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
            <form onSubmit={saveLegalEdit} className="bg-white border border-slate-200 rounded-lg max-w-lg w-full p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="font-display font-bold text-base text-slate-900">Edit Legal Compliance Record</div>
                <button type="button" onClick={() => setEditingLegal(null)}><X className="w-4 h-4 text-slate-500" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Statute Name</label>
                  <input value={editingLegal.statuteName || ''} onChange={(e) => setEditingLegal({ ...editingLegal, statuteName: e.target.value })} className="w-full border border-slate-300 rounded px-2.5 py-1.5" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Section / Rule Ref</label>
                  <input value={editingLegal.sectionRef || ''} onChange={(e) => setEditingLegal({ ...editingLegal, sectionRef: e.target.value })} className="w-full border border-slate-300 rounded px-2.5 py-1.5" />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Obligation Summary</label>
                <textarea rows={2} value={editingLegal.obligation || ''} onChange={(e) => setEditingLegal({ ...editingLegal, obligation: e.target.value })} className="w-full border border-slate-300 rounded px-2.5 py-1.5" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State / Jurisdiction</label>
                  <input value={editingLegal.state || ''} onChange={(e) => setEditingLegal({ ...editingLegal, state: e.target.value })} className="w-full border border-slate-300 rounded px-2.5 py-1.5" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
                  <input type="date" value={editingLegal.dueDate || ''} onChange={(e) => setEditingLegal({ ...editingLegal, dueDate: e.target.value })} className="w-full border border-slate-300 rounded px-2.5 py-1.5" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Compliance Status</label>
                  <select value={editingLegal.complianceStatus || 'Under Legal Review'} onChange={(e) => setEditingLegal({ ...editingLegal, complianceStatus: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1.5">
                    <option value="Compliant">Compliant</option>
                    <option value="Under Legal Review">Under Legal Review</option>
                    <option value="Action Required">Action Required</option>
                    <option value="Non-Compliant">Non-Compliant</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Evidence / Inspection Notes</label>
                <input value={editingLegal.evidenceSummary || ''} onChange={(e) => setEditingLegal({ ...editingLegal, evidenceSummary: e.target.value })} className="w-full border border-slate-300 rounded px-2.5 py-1.5" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button type="button" onClick={() => setEditingLegal(null)} className="px-3 py-1.5 border border-slate-300 rounded">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-emerald-700 text-white font-semibold rounded cursor-pointer">Save Changes</button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // ---------------- PPE & SAFETY STORE ----------------
  if (routeKey === 'ppe-store') {
    const addPpe = async (e: React.FormEvent) => {
      e.preventDefault();
      await apiFetch('/api/ppe', {
        method: 'POST',
        body: JSON.stringify({ itemName: f1, category: f2 || 'Head Protection', currentStock: Number(num1), minStock: 15 }),
      });
      await loadData();
    };
    const lowStock = rows.filter((p) => p.currentStock <= p.minStock).length;
    const totalUnits = rows.reduce((s, p) => s + Number(p.currentStock || 0), 0);
    return (
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">PPE &amp; Safety Store Inventory</h1>
          <p className="text-sm text-slate-500">Track PPE stock levels, issue records, expiry dates, and low-stock reorder alerts.</p>
        </div>
        <ModuleKpiStrip
          title="PPE Store Individual KPIs"
          onOpenMasterKpi={onOpenMasterKpi}
          items={[
            { label: 'SKU Items Tracked', value: rows.length, hint: 'Active store catalog' },
            { label: 'Total Stock Units', value: totalUnits.toLocaleString(), hint: 'Ready for issue' },
            { label: 'Low Stock Alerts', value: lowStock, hint: 'Below min threshold', alert: lowStock > 0 },
            { label: 'Stock Readiness %', value: rows.length > 0 ? `${Math.round(((rows.length - lowStock) / rows.length) * 100)}%` : '100%', hint: 'Healthy inventory ratio' },
          ]}
        />
        <form onSubmit={addPpe} className="bg-white border border-slate-200 rounded-md p-4 flex flex-wrap gap-2">
          <input required value={f1} onChange={(e) => setF1(e.target.value)} placeholder="PPE Item Name *" className="flex-1 border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
          <input value={f2} onChange={(e) => setF2(e.target.value)} placeholder="Category (e.g. Fall Protection)" className="border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
          <input type="number" value={num1} onChange={(e) => setNum1(e.target.value)} placeholder="Initial Qty" className="w-24 border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
          <button type="submit" className="px-4 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer">Add PPE Stock</button>
        </form>
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr><th className="px-4 py-2">Code</th><th className="px-3 py-2">Item &amp; Category</th><th className="px-3 py-2 text-right">Stock</th><th className="px-3 py-2 text-right">Min</th><th className="px-3 py-2">Alert</th><th className="px-3 py-2 text-right">Transactions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2 font-mono">{p.itemCode}</td>
                  <td className="px-3 py-2"><div className="font-semibold">{p.itemName}</div><div className="text-[11px] text-slate-500">{p.category}</div></td>
                  <td className="px-3 py-2 text-right font-bold">{p.currentStock} {p.unit}</td>
                  <td className="px-3 py-2 text-right">{p.minStock}</td>
                  <td className="px-3 py-2"><StatusTag status={p.currentStock <= p.minStock ? 'Critical Low' : 'Healthy'} /></td>
                  <td className="px-3 py-2 text-right space-x-1">
                    <button type="button" onClick={async () => { await apiFetch(`/api/ppe/${p.id}/transaction`, { method: 'POST', body: JSON.stringify({ type: 'Stock In', qty: 10 }) }); await loadData(); }} className="px-2 py-1 bg-emerald-700 text-white rounded text-[11px] cursor-pointer">+10 In</button>
                    <button type="button" onClick={async () => { await apiFetch(`/api/ppe/${p.id}/transaction`, { method: 'POST', body: JSON.stringify({ type: 'Issue', qty: 1, recipient: 'Field Crew' }) }); await loadData(); }} className="px-2 py-1 bg-slate-900 text-white rounded text-[11px] cursor-pointer">Issue 1</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ---------------- GATE & VISITOR CONTROL ----------------
  if (routeKey === 'gate') {
    const addGate = async (e: React.FormEvent) => {
      e.preventDefault();
      await apiFetch('/api/gate', {
        method: 'POST',
        body: JSON.stringify({ personOrDriverName: f1, entryType: f2 || 'Visitor', companyName: f3, vehicleNumber: f4, inductionVerified: true }),
      });
      await loadData();
    };
    const checkedInCount = rows.filter((g) => g.status === 'Checked In').length;
    const inductedCount = rows.filter((g) => g.inductionVerified).length;
    return (
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Gate Security, Visitor &amp; Vehicle Control</h1>
          <p className="text-sm text-slate-500">Digital QR visitor passes, contractor induction verification, and emergency headcount muster.</p>
        </div>
        <ModuleKpiStrip
          title="Gate Security Individual KPIs"
          onOpenMasterKpi={onOpenMasterKpi}
          items={[
            { label: 'Total Gate Passes', value: rows.length, hint: 'Logged entries' },
            { label: 'Currently On-Site', value: checkedInCount, hint: 'Muster headcount' },
            { label: 'Induction Verified', value: inductedCount, hint: 'Safety briefed' },
            { label: 'Induction Compliance %', value: rows.length > 0 ? `${Math.round((inductedCount / rows.length) * 100)}%` : '100%', hint: 'Gate clearance rate' },
          ]}
        />
        <form onSubmit={addGate} className="bg-white border border-slate-200 rounded-md p-4 grid grid-cols-1 sm:grid-cols-5 gap-2">
          <input required value={f1} onChange={(e) => setF1(e.target.value)} placeholder="Visitor / Driver Name *" className="border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
          <select value={f2 || 'Visitor'} onChange={(e) => setF2(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-xs">
            <option value="Visitor">Visitor</option><option value="Contractor">Contractor</option><option value="Vehicle / Fleet">Vehicle / Fleet</option>
          </select>
          <input value={f3} onChange={(e) => setF3(e.target.value)} placeholder="Company" className="border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
          <input value={f4} onChange={(e) => setF4(e.target.value)} placeholder="Vehicle / Plate #" className="border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
          <button type="submit" className="py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer">Check In &amp; Issue QR</button>
        </form>
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr><th className="px-4 py-2">Pass #</th><th className="px-3 py-2">Person / Company</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((g) => (
                <tr key={g.id}>
                  <td className="px-4 py-2 font-mono font-semibold">{g.passNumber}</td>
                  <td className="px-3 py-2"><div className="font-semibold">{g.personOrDriverName}</div><div className="text-[11px] text-slate-500">{g.companyName} {g.vehicleNumber}</div></td>
                  <td className="px-3 py-2">{g.entryType}</td>
                  <td className="px-3 py-2"><StatusTag status={g.status} /></td>
                  <td className="px-3 py-2 text-right space-x-1">
                    {g.status === 'Checked In' && (
                      <button type="button" onClick={async () => { await apiFetch(`/api/gate/${g.id}/checkout`, { method: 'POST' }); await loadData(); }} className="px-2 py-1 bg-slate-900 text-white rounded text-[11px] cursor-pointer">Check Out</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ---------------- TRAINING / EMERGENCY / ENVIRONMENT / LEGAL / WEEKLY / COMMITTEE ----------------
  const configs: Record<string, { title: string; subtitle: string; endpoint: string; p1: string; p2: string; p3: string }> = {
    training: { title: 'Training, Induction & Competency Matrix', subtitle: 'Track safety inductions, specialized trainings, quiz scores & renewal alerts.', endpoint: '/api/trainings', p1: 'Training Title', p2: 'Category (e.g. LOTO / Fire)', p3: 'Trainer Name' },
    emergency: { title: 'Emergency Preparedness & Fire Safety', subtitle: 'Mock drills, response times, assembly points & emergency contact matrix.', endpoint: '/api/emergency', p1: 'Drill / ERP Title', p2: 'Scenario (e.g. Chemical Leak)', p3: 'Assembly Point' },
    environment: { title: 'Environment & Sustainability (ISO 14001 / BRSR)', subtitle: 'Monitor emissions, ETP water, hazardous waste, energy & statutory limits.', endpoint: '/api/environment', p1: 'Metric Name (e.g. Scope 2 Electricity)', p2: 'Type (Air/Water/Waste/GHG)', p3: 'Unit (kWh/KL/MT)' },
    legal: { title: 'Legal & Regulatory Compliance (OSH Code 2020)', subtitle: 'Track Central OSH Code 2020, Factories Act 1948 transition & State Rules.', endpoint: '/api/legal', p1: 'Obligation Summary', p2: 'Statute (e.g. OSH Code 2020)', p3: 'State / Jurisdiction' },
    'weekly-tracking': { title: 'Weekly Safety Tracking Module', subtitle: 'Parent -> Child weekly safety compliance checks & verification.', endpoint: '/api/weekly-activities', p1: 'Weekly Safety Activity', p2: 'Parent Category (e.g. Fire Safety)', p3: 'Child Category' },
    committee: { title: 'Safety Committee & Worker Welfare', subtitle: 'Bi-partite safety committee meetings, minutes, welfare & worker feedback.', endpoint: '/api/committees', p1: 'Meeting / Welfare Check Title', p2: 'Type (Meeting / Welfare Check)', p3: 'Agenda / Notes' },
  };

  const cfg = configs[routeKey];
  if (!cfg) return null;

  const handleGenericCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const bodyMap: Record<string, any> = {
      training: { title: f1, category: f2 || 'Safety Training', trainerName: f3 || 'EHS Trainer', quizScore: 92, status: 'Completed' },
      emergency: { title: f1, scenarioType: f2 || 'Fire Drill', assemblyPoint: f3 || 'Assembly Point A', participantsCount: Number(num1 || 50) },
      environment: { metricName: f1, recordType: f2 || 'Energy', unit: f3 || 'kWh', quantity: Number(num1 || 100) },
      legal: { obligation: f1, statuteName: f2 || 'OSH Code 2020', state: f3 || 'Central / All States', complianceStatus: 'Compliant' },
      'weekly-tracking': { activityName: f1, parentCategory: f2 || 'Fire Safety', childCategory: f3 || 'Weekly Walkdown', status: 'Completed' },
      committee: { title: f1, recordType: f2 || 'Meeting', agenda: f3, status: 'Completed' },
    };
    await apiFetch(cfg.endpoint, { method: 'POST', body: JSON.stringify(bodyMap[routeKey]) });
    await loadData();
  };

  const doneCount = rows.filter((r) => ['Completed', 'Within Limit', 'Compliant', 'Active'].includes(r.status || r.complianceStatus || '')).length;
  const modPct = rows.length > 0 ? Math.round((doneCount / rows.length) * 100) : 100;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">{cfg.title}</h1>
          <p className="text-sm text-slate-500">{cfg.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => exportRowsToExcel(rows, `ARSHIEL-${routeKey}`)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white rounded cursor-pointer"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
        </button>
      </div>

      <ModuleKpiStrip
        title={`${cfg.title.split('(')[0].trim()} Individual KPIs`}
        onOpenMasterKpi={onOpenMasterKpi}
        items={[
          { label: 'Total Records', value: rows.length, hint: 'Cloud SQL tracked' },
          { label: 'Compliant / Completed', value: doneCount, hint: 'Verified records' },
          { label: 'Open / Pending', value: Math.max(0, rows.length - doneCount), hint: 'Requires action' },
          { label: 'Module Compliance %', value: `${modPct}%`, hint: 'Live module score' },
        ]}
      />

      <form onSubmit={handleGenericCreate} className="bg-white border border-slate-200 rounded-md p-4 grid grid-cols-1 sm:grid-cols-4 gap-2">
        <input required value={f1} onChange={(e) => setF1(e.target.value)} placeholder={`${cfg.p1} *`} className="border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
        <input value={f2} onChange={(e) => setF2(e.target.value)} placeholder={cfg.p2} className="border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
        <input value={f3} onChange={(e) => setF3(e.target.value)} placeholder={cfg.p3} className="border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
        <button type="submit" className="inline-flex items-center justify-center gap-1 px-4 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Add Record
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr><th className="px-4 py-2.5">Title / Obligation / Metric</th><th className="px-3 py-2.5">Category / Statute</th><th className="px-3 py-2.5">Detail</th><th className="px-3 py-2.5">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 font-semibold text-slate-900">
                  {r.title || r.obligation || r.metricName || r.activityName}
                </td>
                <td className="px-3 py-2.5 text-slate-600">
                  {r.category || r.statuteName || r.recordType || r.parentCategory}
                </td>
                <td className="px-3 py-2.5 text-slate-600">
                  {r.trainerName || r.state || r.unit || r.childCategory || r.assemblyPoint || '-'}
                  {r.quantity !== undefined ? ` (${r.quantity} ${r.unit})` : ''}
                </td>
                <td className="px-3 py-2.5">
                  <StatusTag status={r.status || r.complianceStatus || 'Active'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
