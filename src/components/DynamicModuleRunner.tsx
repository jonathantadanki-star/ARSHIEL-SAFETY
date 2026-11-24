import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckSquare,
  Download,
  Edit3,
  FileSpreadsheet,
  FolderTree,
  GitPullRequest,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { exportRowsToCsv, exportRowsToExcel } from '../lib/pdf';
import { StatusTag } from './IconResolver';
import { ModuleKpiStrip } from './ModuleKpiStrip';

export function DynamicModuleRunner({
  moduleId,
  onNavigateModule,
  onOpenMasterKpi,
}: {
  moduleId: string;
  onNavigateModule?: (childModuleId: string) => void;
  onOpenMasterKpi?: () => void;
}) {
  const { modules, hierarchy } = useAuth();
  const mod = modules.find((m) => m.id === moduleId);
  const childModules = useMemo(
    () => modules.filter((m) => m.parentId === moduleId && !m.isArchived && m.isActive),
    [modules, moduleId]
  );
  const parentModule = useMemo(
    () => (mod?.parentId ? modules.find((m) => m.id === mod.parentId) : undefined),
    [modules, mod]
  );

  const [tab, setTab] = useState<'records' | 'checklist' | 'approvals'>('records');
  const [forms, setForms] = useState<any[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [orgUsers, setOrgUsers] = useState<any[]>([]);

  const [activeFormId, setActiveFormId] = useState<string>('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [plantId, setPlantId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit submission modal
  const [editingSub, setEditingSub] = useState<any | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [editStatus, setEditStatus] = useState('Submitted');

  // Checklist executor state
  const [activeChecklistId, setActiveChecklistId] = useState<string>('');
  const [checklistAnswers, setChecklistAnswers] = useState<Record<string, { status: string; remarks: string }>>({});
  const [checklistPlantId, setChecklistPlantId] = useState('');

  // Approval action note
  const [actionComments, setActionComments] = useState<Record<string, string>>({});

  // Delete confirmation & AI guidance state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGuidance, setAiGuidance] = useState<any | null>(null);

  const loadModuleWorkspace = useCallback(async () => {
    const [f, c, s, a, u] = await Promise.all([
      apiFetch(`/api/modules/${moduleId}/forms`),
      apiFetch(`/api/modules/${moduleId}/checklists`),
      apiFetch(`/api/modules/${moduleId}/submissions`),
      apiFetch(`/api/approvals/instances?moduleId=${moduleId}`),
      apiFetch('/api/users').catch(() => ({ users: [] })),
    ]);
    setForms(f);
    setChecklists(c);
    setSubmissions(s);
    setApprovals(a);
    setOrgUsers(u.users || []);
    if (f[0]?.id && !activeFormId) setActiveFormId(f[0].id);
    if (c[0]?.id && !activeChecklistId) setActiveChecklistId(c[0].id);
  }, [moduleId, activeFormId, activeChecklistId]);

  useEffect(() => {
    loadModuleWorkspace();
  }, [loadModuleWorkspace]);

  const currentForm = forms.find((f) => f.id === activeFormId);
  const currentChecklist = checklists.find((c) => c.id === activeChecklistId);

  const filteredSubmissions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return submissions;
    return submissions.filter(
      (s) =>
        String(s.submissionNumber || '').toLowerCase().includes(q) ||
        String(s.submittedByName || '').toLowerCase().includes(q) ||
        String(s.searchableSummary || '').toLowerCase().includes(q) ||
        String(s.status || '').toLowerCase().includes(q) ||
        JSON.stringify(s.data || {}).toLowerCase().includes(q)
    );
  }, [submissions, searchQuery]);

  const handleFileInput = (fieldKey: string, file: File | undefined, targetSetter: React.Dispatch<React.SetStateAction<Record<string, any>>>) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      targetSetter((prev) => ({
        ...prev,
        [fieldKey]: `${file.name} (${Math.round(file.size / 1024)} KB) · ${String(reader.result || '').slice(0, 120)}`,
      }));
    };
    reader.readAsDataURL(file);
  };

  const renderFieldInput = (
    fld: any,
    valueObj: Record<string, any>,
    setValueObj: React.Dispatch<React.SetStateAction<Record<string, any>>>
  ) => {
    const val = valueObj[fld.fieldKey];
    const setVal = (next: any) => setValueObj((prev) => ({ ...prev, [fld.fieldKey]: next }));

    switch (fld.fieldType) {
      case 'textarea':
        return (
          <textarea
            required={fld.isRequired}
            value={val || ''}
            onChange={(e) => setVal(e.target.value)}
            placeholder={fld.placeholder || ''}
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
            rows={2}
          />
        );
      case 'dropdown':
        return (
          <select
            required={fld.isRequired}
            value={val || ''}
            onChange={(e) => setVal(e.target.value)}
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
          >
            <option value="">Select...</option>
            {(fld.options || []).map((opt: string) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      case 'radio':
        return (
          <div className="flex flex-wrap gap-3 py-1">
            {(fld.options || ['Yes', 'No']).map((opt: string) => (
              <label key={opt} className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="radio"
                  name={`radio-${fld.id}`}
                  checked={val === opt}
                  onChange={() => setVal(opt)}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        );
      case 'multiselect': {
        const selected: string[] = Array.isArray(val) ? val : [];
        return (
          <div className="flex flex-wrap gap-2 border border-slate-200 rounded p-2 bg-slate-50">
            {(fld.options || []).map((opt: string) => {
              const isChecked = selected.includes(opt);
              return (
                <label key={opt} className="inline-flex items-center gap-1 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      if (e.target.checked) setVal([...selected, opt]);
                      else setVal(selected.filter((x) => x !== opt));
                    }}
                  />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
        );
      }
      case 'checkbox':
        return (
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={Boolean(val)} onChange={(e) => setVal(e.target.checked)} />
            <span>{fld.placeholder || 'Confirmed'}</span>
          </label>
        );
      case 'file':
      case 'image':
      case 'video':
        return (
          <div className="space-y-1">
            <input
              type="file"
              accept={fld.fieldType === 'image' ? 'image/*' : fld.fieldType === 'video' ? 'video/*' : undefined}
              onChange={(e) => handleFileInput(fld.fieldKey, e.target.files?.[0], setValueObj)}
              className="w-full text-xs border border-slate-300 rounded px-2 py-1"
            />
            {val && <div className="text-[11px] text-emerald-700 truncate">Attached: {String(val).split(' · ')[0]}</div>}
          </div>
        );
      case 'signature':
        return (
          <input
            type="text"
            required={fld.isRequired}
            value={val || ''}
            onChange={(e) => setVal(e.target.value)}
            placeholder="Type full legal name to sign digitally"
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs italic font-serif bg-slate-50"
          />
        );
      case 'qrcode':
        return (
          <input
            type="text"
            required={fld.isRequired}
            value={val || ''}
            onChange={(e) => setVal(e.target.value)}
            placeholder="Scan or enter QR / Barcode token"
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono"
          />
        );
      case 'location':
        return (
          <input
            type="text"
            required={fld.isRequired}
            value={val || ''}
            onChange={(e) => setVal(e.target.value)}
            placeholder="Zone / GPS / Bay coordinates"
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
          />
        );
      case 'user_select':
        return (
          <select
            required={fld.isRequired}
            value={val || ''}
            onChange={(e) => setVal(e.target.value)}
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
          >
            <option value="">Select Employee / User...</option>
            {orgUsers.map((u) => (
              <option key={u.id} value={u.fullName}>
                {u.fullName} ({u.designation || u.email})
              </option>
            ))}
          </select>
        );
      case 'department_select':
        return (
          <select
            required={fld.isRequired}
            value={val || ''}
            onChange={(e) => setVal(e.target.value)}
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
          >
            <option value="">Select Department...</option>
            {hierarchy.departments.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        );
      case 'plant_select':
        return (
          <select
            required={fld.isRequired}
            value={val || ''}
            onChange={(e) => setVal(e.target.value)}
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
          >
            <option value="">Select Plant / Site...</option>
            {hierarchy.plants.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        );
      default:
        return (
          <input
            type={
              fld.fieldType === 'number'
                ? 'number'
                : fld.fieldType === 'date'
                  ? 'date'
                  : fld.fieldType === 'time'
                    ? 'time'
                    : fld.fieldType === 'datetime'
                      ? 'datetime-local'
                      : 'text'
            }
            required={fld.isRequired}
            value={val || ''}
            onChange={(e) => setVal(e.target.value)}
            placeholder={fld.placeholder || ''}
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
          />
        );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentForm) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const created = await apiFetch<any>(`/api/forms/${currentForm.id}/submissions`, {
        method: 'POST',
        body: JSON.stringify({ plantId: plantId || null, data: formData }),
      });
      setFormData({});
      setMsg({
        type: 'ok',
        text: created.approvalInstance
          ? `Record ${created.submissionNumber} submitted and routed to Approval Workflow.`
          : `Record ${created.submissionNumber} saved to Cloud SQL PostgreSQL.`,
      });
      await loadModuleWorkspace();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub) return;
    try {
      await apiFetch(`/api/form-submissions/${editingSub.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ data: editData, status: editStatus }),
      });
      setEditingSub(null);
      setMsg({ type: 'ok', text: `Updated submission ${editingSub.submissionNumber}.` });
      await loadModuleWorkspace();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message });
    }
  };

  const handleExecuteChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentChecklist) return;
    setMsg(null);
    try {
      const responses = (currentChecklist.items || []).map((it: any) => ({
        questionText: it.questionText,
        status: checklistAnswers[it.id]?.status || 'Yes',
        remarks: checklistAnswers[it.id]?.remarks || '',
      }));
      const res = await apiFetch<any>(`/api/modules/${moduleId}/checklists/${currentChecklist.id}/execute`, {
        method: 'POST',
        body: JSON.stringify({ plantId: checklistPlantId || null, responses }),
      });
      setChecklistAnswers({});
      setMsg({
        type: 'ok',
        text: `Checklist completed (${res.audit.complianceScore}% compliance). ${res.generatedCapas} auto-CAPA action(s) generated for non-conformances.`,
      });
      await loadModuleWorkspace();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message });
    }
  };

  const handleApprovalAction = async (instanceId: string, action: string) => {
    setMsg(null);
    try {
      await apiFetch(`/api/approvals/instances/${instanceId}/action`, {
        method: 'POST',
        body: JSON.stringify({ action, comments: actionComments[instanceId] || '' }),
      });
      setActionComments((prev) => ({ ...prev, [instanceId]: '' }));
      setMsg({ type: 'ok', text: `Approval workflow action "${action}" recorded.` });
      await loadModuleWorkspace();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message });
    }
  };

  const handleDeleteSubmission = async (subId: string, subNum: string) => {
    setMsg(null);
    try {
      await apiFetch(`/api/form-submissions/${subId}`, { method: 'DELETE' });
      setConfirmDeleteId(null);
      setMsg({ type: 'ok', text: `Deleted submission ${subNum}.` });
      await loadModuleWorkspace();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message });
    }
  };

  const handleAiModuleSuggestions = async () => {
    if (!mod) return;
    setAiLoading(true);
    setMsg(null);
    try {
      const res = await apiFetch('/api/ai/suggest-module-guidance', {
        method: 'POST',
        body: JSON.stringify({
          moduleName: mod.moduleName,
          moduleCode: mod.moduleCode,
          description: mod.description,
          formName: currentForm?.formName,
          fieldLabels: (currentForm?.fields || []).map((f: any) => f.label),
        }),
      });
      setAiGuidance(res);
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'Failed to generate AI suggestions.' });
    } finally {
      setAiLoading(false);
    }
  };

  if (!mod) {
    return <div className="text-sm text-slate-500">Module not found.</div>;
  }

  const exportPayload = filteredSubmissions.map((s) => ({
    SubmissionNumber: s.submissionNumber,
    SubmittedBy: s.submittedByName,
    Status: s.status,
    Date: s.createdAt,
    ...s.data,
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
            <span>Custom Module Workspace · {mod.moduleCode}</span>
            {parentModule && onNavigateModule && (
              <button
                type="button"
                onClick={() => onNavigateModule(parentModule.id)}
                className="underline text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                &larr; Parent: {parentModule.moduleName}
              </button>
            )}
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900">{mod.moduleName}</h1>
          <p className="text-sm text-slate-500">{mod.description || 'Dynamic user-configured EHS module'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleAiModuleSuggestions}
            disabled={aiLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-amber-300 rounded cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{aiLoading ? 'Analyzing...' : 'AI Suggestions (ISO/OSHA/Factory)'}</span>
          </button>
          <button
            type="button"
            onClick={() => exportRowsToCsv(exportPayload, `${mod.moduleCode}-Submissions`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white rounded text-slate-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            type="button"
            onClick={() => exportRowsToExcel(exportPayload, `${mod.moduleCode}-Submissions`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white rounded text-slate-700 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      <ModuleKpiStrip
        title={`${mod.moduleName} Individual KPIs`}
        onOpenMasterKpi={onOpenMasterKpi}
        items={[
          { label: 'Total Records', value: submissions.length, hint: `${forms.length} active form(s)` },
          {
            label: 'Approved / Closed',
            value: submissions.filter((s) => s.status === 'Approved' || s.status === 'Closed').length,
            hint: `${submissions.length > 0 ? Math.round((submissions.filter((s) => s.status === 'Approved' || s.status === 'Closed').length / submissions.length) * 100) : 100}% completion`,
          },
          {
            label: 'Pending Approvals',
            value: approvals.filter((a) => a.status === 'Pending').length,
            hint: `${approvals.length} workflow instance(s)`,
            alert: approvals.filter((a) => a.status === 'Pending').length > 0,
          },
          { label: 'Checklist Templates', value: checklists.length, hint: `${childModules.length} child node(s)` },
        ]}
      />

      {childModules.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-md p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wide">
            <FolderTree className="w-3.5 h-3.5 text-emerald-700" />
            <span>Child Modules / Documents ({childModules.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {childModules.map((cm) => (
              <button
                key={cm.id}
                type="button"
                onClick={() => onNavigateModule?.(cm.id)}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-slate-800 rounded cursor-pointer"
              >
                {cm.moduleName} ({cm.moduleCode})
              </button>
            ))}
          </div>
        </div>
      )}

      {aiGuidance && (
        <div className="bg-amber-50/70 border border-amber-300 rounded-md p-4 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>AI-Driven EHS Guidance (Draft — Safety Officer Review Required)</span>
            </div>
            <button type="button" onClick={() => setAiGuidance(null)} className="text-slate-500 hover:text-slate-800">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-slate-700 whitespace-pre-line">{aiGuidance.summaryGuidance}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="bg-white border border-slate-200 rounded p-2">
              <div className="font-bold text-slate-800 mb-1">ISO Standards</div>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                {(aiGuidance.isoReferences || []).map((r: string, i: number) => <li key={i}>{r}</li>)}
              </ul>
            </div>
            <div className="bg-white border border-slate-200 rounded p-2">
              <div className="font-bold text-slate-800 mb-1">Factory Rules / OSHWC 2020</div>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                {(aiGuidance.factoryRulesReferences || []).map((r: string, i: number) => <li key={i}>{r}</li>)}
              </ul>
            </div>
            <div className="bg-white border border-slate-200 rounded p-2">
              <div className="font-bold text-slate-800 mb-1">OSHA 29 CFR / NFPA</div>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                {(aiGuidance.oshaReferences || []).map((r: string, i: number) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          </div>
          {(aiGuidance.keyChecks || []).length > 0 && (
            <div className="bg-white border border-slate-200 rounded p-2">
              <div className="font-bold text-slate-800 mb-1">Recommended Safety Checks</div>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                {aiGuidance.keyChecks.map((k: string, i: number) => <li key={i}>{k}</li>)}
              </ul>
            </div>
          )}
          <div className="text-[11px] text-slate-500">{aiGuidance.attribution}</div>
        </div>
      )}

      {/* Workspace Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setTab('records')}
          className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer ${
            tab === 'records' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'
          }`}
        >
          Forms &amp; Records ({submissions.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('checklist')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded cursor-pointer ${
            tab === 'checklist' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Checklist Execution ({checklists.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('approvals')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded cursor-pointer ${
            tab === 'approvals' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'
          }`}
        >
          <GitPullRequest className="w-3.5 h-3.5" />
          <span>Approval Inbox &amp; Trail ({approvals.length})</span>
        </button>
      </div>

      {msg && (
        <div
          className={`text-xs px-4 py-2.5 rounded border ${
            msg.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {msg.text}
        </div>
      )}

      {tab === 'records' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Dynamic Form Entry */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-4 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-700" />
              <span>Submit Record</span>
            </h2>

            {forms.length === 0 ? (
              <div className="text-xs text-slate-500 py-4">
                No custom forms attached to this module yet. Open <strong>Dynamic Module Builder</strong> to add fields.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Form</label>
                  <select
                    value={activeFormId}
                    onChange={(e) => setActiveFormId(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                  >
                    {forms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.formName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Facility / Plant</label>
                  <select
                    value={plantId}
                    onChange={(e) => setPlantId(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                  >
                    <option value="">-- Organization Wide --</option>
                    {hierarchy.plants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {(currentForm?.fields || []).map((fld: any) => (
                  <div key={fld.id}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {fld.label} {fld.isRequired && <span className="text-red-600">*</span>}
                    </label>
                    {renderFieldInput(fld, formData, setFormData)}
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting...' : 'Submit Record'}</span>
                </button>
              </form>
            )}
          </div>

          {/* Submissions Table */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="font-bold text-sm text-slate-900">
                Submitted Module Records ({filteredSubmissions.length})
              </div>
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter records..."
                  className="w-full border border-slate-300 rounded pl-8 pr-2.5 py-1 text-xs"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Submission #</th>
                    <th className="px-3 py-2.5">Summary</th>
                    <th className="px-3 py-2.5">Submitted By</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {filteredSubmissions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-semibold text-slate-900">{s.submissionNumber}</td>
                      <td className="px-3 py-2.5 text-slate-600 max-w-xs truncate">
                        {s.searchableSummary || JSON.stringify(s.data)}
                      </td>
                      <td className="px-3 py-2.5">{s.submittedByName}</td>
                      <td className="px-3 py-2.5">
                        <StatusTag status={s.status} />
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2.5 text-right space-x-1 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSub(s);
                            setEditData({ ...(s.data || {}) });
                            setEditStatus(s.status || 'Submitted');
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 border border-slate-300 rounded text-[11px] hover:bg-slate-100 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                        {confirmDeleteId === s.id ? (
                          <span className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteSubmission(s.id, s.submissionNumber)}
                              className="px-2 py-1 bg-red-600 text-white rounded text-[11px] font-semibold cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 border border-slate-300 rounded text-[11px] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(s.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 border border-red-200 text-red-700 rounded text-[11px] hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredSubmissions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        No submissions match the current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Checklist Execution Tab */}
      {tab === 'checklist' && (
        <div className="bg-white border border-slate-200 rounded-md p-5 space-y-4">
          {checklists.length === 0 ? (
            <div className="text-xs text-slate-500 py-6 text-center">
              No inspection checklists configured for this module yet. Add one in Dynamic Module Builder.
            </div>
          ) : (
            <form onSubmit={handleExecuteChecklist} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Checklist</label>
                  <select
                    value={activeChecklistId}
                    onChange={(e) => setActiveChecklistId(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs"
                  >
                    {checklists.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.standardCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Facility / Plant</label>
                  <select
                    value={checklistPlantId}
                    onChange={(e) => setChecklistPlantId(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs"
                  >
                    <option value="">Organization Wide</option>
                    {hierarchy.plants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                {(currentChecklist?.items || []).map((item: any, idx: number) => {
                  const ans = checklistAnswers[item.id] || { status: 'Yes', remarks: '' };
                  return (
                    <div key={item.id} className="border border-slate-200 rounded p-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                      <div className="md:col-span-6 text-xs font-medium text-slate-900">
                        {idx + 1}. {item.questionText}
                      </div>
                      <div className="md:col-span-2">
                        <select
                          value={ans.status}
                          onChange={(e) =>
                            setChecklistAnswers((prev) => ({
                              ...prev,
                              [item.id]: { ...ans, status: e.target.value },
                            }))
                          }
                          className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                        >
                          <option value="Yes">Yes (Compliant)</option>
                          <option value="No">No (Non-Conformance)</option>
                          <option value="NA">Not Applicable</option>
                        </select>
                      </div>
                      <div className="md:col-span-4">
                        <input
                          value={ans.remarks}
                          onChange={(e) =>
                            setChecklistAnswers((prev) => ({
                              ...prev,
                              [item.id]: { ...ans, remarks: e.target.value },
                            }))
                          }
                          placeholder="Inspector remarks / NC evidence"
                          className="w-full border border-slate-300 rounded px-2.5 py-1 text-xs"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded cursor-pointer"
              >
                Submit Inspection &amp; Auto-Generate CAPAs for Non-Conformances
              </button>
            </form>
          )}
        </div>
      )}

      {/* Multi-Level Approval Workflow Inbox & Timeline */}
      {tab === 'approvals' && (
        <div className="space-y-3">
          {approvals.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-md p-8 text-center text-xs text-slate-500">
              No active approval workflow instances for this module yet. Submissions routed through a configured workflow appear here.
            </div>
          ) : (
            approvals.map((inst) => (
              <div key={inst.id} className="bg-white border border-slate-200 rounded-md p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-slate-900 tabular-nums">
                      {inst.entityNumber} · Submitted by {inst.submittedByName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Current Level: Step {inst.currentStepOrder} of {Math.max(inst.steps?.length || 1, 1)}
                    </div>
                  </div>
                  <StatusTag status={inst.status} />
                </div>

                {/* History Timeline */}
                <div className="bg-slate-50 border border-slate-200 rounded p-2.5 space-y-1 text-xs">
                  {(inst.history || []).map((h: any) => (
                    <div key={h.id} className="flex justify-between gap-2">
                      <span>
                        <strong className="uppercase">{h.action}</strong> by {h.actorName} (Step {h.stepOrder})
                        {h.comments ? ` — ${h.comments}` : ''}
                      </span>
                      <span className="text-slate-400 tabular-nums shrink-0">
                        {new Date(h.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={actionComments[inst.id] || ''}
                    onChange={(e) => setActionComments((prev) => ({ ...prev, [inst.id]: e.target.value }))}
                    placeholder="Decision comments / delegation note..."
                    className="flex-1 min-w-[200px] border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                  />
                  {inst.status === 'Pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApprovalAction(inst.id, 'approve')}
                        className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer"
                      >
                        Approve Step
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprovalAction(inst.id, 'reject')}
                        className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprovalAction(inst.id, 'escalate')}
                        className="px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white rounded cursor-pointer"
                      >
                        Escalate
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprovalAction(inst.id, 'delegate')}
                        className="px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white rounded cursor-pointer"
                      >
                        Delegate
                      </button>
                    </>
                  )}
                  {inst.status === 'Rejected' && (
                    <button
                      type="button"
                      onClick={() => handleApprovalAction(inst.id, 'resubmit')}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded cursor-pointer"
                    >
                      Resubmit
                    </button>
                  )}
                  {inst.status === 'Approved' && (
                    <button
                      type="button"
                      onClick={() => handleApprovalAction(inst.id, 'close')}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded cursor-pointer"
                    >
                      Close Record
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Edit Submission Modal */}
      {editingSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveEdit} className="bg-white border border-slate-200 rounded-lg max-w-lg w-full p-5 space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="font-display font-bold text-base text-slate-900">
                Edit Record — {editingSub.submissionNumber}
              </div>
              <button type="button" onClick={() => setEditingSub(null)}>
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
              >
                <option value="Submitted">Submitted</option>
                <option value="In Progress">In Progress</option>
                <option value="Approved">Approved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
            {Object.keys(editData).map((key) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{key}</label>
                <input
                  value={String(editData[key] ?? '')}
                  onChange={(e) => setEditData((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingSub(null)} className="px-3 py-1.5 text-xs border border-slate-300 rounded">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
