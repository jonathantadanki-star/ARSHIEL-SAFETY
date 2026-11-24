import React, { useCallback, useEffect, useState } from 'react';
import { CheckSquare, Download, Plus, Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { exportAuditPdf } from '../lib/pdf';
import { StatusTag } from './IconResolver';
import { ModuleKpiStrip } from './ModuleKpiStrip';

const STANDARD_AUDIT_QUESTIONS = [
  'Are all portable fire extinguishers unobstructed, pressurized, and tagged within 30 days?',
  'Are emergency exits, pathways, and muster assembly signage clear and illuminated?',
  'Are electrical panels locked, labeled with voltage ratings, and fitted with insulated mats?',
  'Are machine guards and emergency stop pushbuttons intact and functional?',
  'Are active Work Permits and LOTO locks displayed at high-risk maintenance locations?',
];

export function AuditsAndEquipmentView({
  defaultTab = 'audits',
  onOpenMasterKpi,
}: {
  defaultTab?: 'audits' | 'equipment';
  onOpenMasterKpi?: () => void;
}) {
  const { organization, hierarchy } = useAuth();
  const [tab, setTab] = useState<'audits' | 'equipment'>(defaultTab);
  const [audits, setAudits] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);

  const [auditForm, setAuditForm] = useState({
    title: '',
    auditType: 'ISO 45001 / NBC 2016 Safety Audit',
    plantId: '',
    responses: STANDARD_AUDIT_QUESTIONS.map((q) => ({ questionText: q, status: 'Yes', remarks: '' })),
  });

  const [equipForm, setEquipForm] = useState({
    name: '',
    category: 'Lifting Gear / Crane',
    location: '',
    inspectionFrequency: 'Monthly',
    nextDueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    certificationNumber: '',
  });

  const loadAll = useCallback(async () => {
    const [a, e] = await Promise.all([apiFetch('/api/audits'), apiFetch('/api/equipment')]);
    setAudits(a);
    setEquipment(e);
  }, []);

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSaveAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/audits', {
      method: 'POST',
      body: JSON.stringify({
        title: auditForm.title,
        auditType: auditForm.auditType,
        plantId: auditForm.plantId || null,
        checklistResponses: auditForm.responses,
        status: 'Completed',
      }),
    });
    setAuditForm({ ...auditForm, title: '' });
    await loadAll();
  };

  const handleCreateEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/equipment', { method: 'POST', body: JSON.stringify(equipForm) });
    setEquipForm({ ...equipForm, name: '', location: '', certificationNumber: '' });
    await loadAll();
  };

  const handleInspectEquipment = async (id: string) => {
    await apiFetch(`/api/equipment/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'Operational',
        nextDueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        defectsFound: 'None — Passed Periodic Inspection',
      }),
    });
    await loadAll();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Safety Audits &amp; Equipment Inspection Register
          </h1>
          <p className="text-sm text-slate-500">
            Execute BIS / OSHA / NBC 2016 / ISO 45001 checklists (auto-generates CAPAs on NC) and track asset certifications.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab('audits')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border cursor-pointer ${
              tab === 'audits' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Audits ({audits.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('equipment')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border cursor-pointer ${
              tab === 'equipment' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Equipment ({equipment.length})</span>
          </button>
        </div>
      </div>

      <ModuleKpiStrip
        title={tab === 'audits' ? 'Safety Audits Individual KPIs' : 'Equipment & Asset Safety Individual KPIs'}
        onOpenMasterKpi={onOpenMasterKpi}
        items={
          tab === 'audits'
            ? [
                { label: 'Total Safety Audits', value: audits.length, hint: 'ISO 45001 · OSHA · BIS' },
                { label: 'Avg Compliance Score', value: `${audits.length > 0 ? Math.round(audits.reduce((s, a) => s + Number(a.complianceScore ?? 100), 0) / audits.length) : 100}%`, hint: 'Checklist average' },
                { label: 'Non-Conformances', value: audits.reduce((s, a) => s + Number(a.nonCompliantItems || 0), 0), hint: 'Auto-routed to CAPA', alert: audits.some((a) => Number(a.nonCompliantItems || 0) > 0) },
                { label: 'Completed Audits', value: audits.filter((a) => a.status === 'Completed').length, hint: 'Signed audit reports' },
              ]
            : [
                { label: 'Registered Assets', value: equipment.length, hint: 'Cranes · Fire · Pressure' },
                { label: 'Operational / Inspected', value: equipment.filter((e) => e.status === 'Operational' || e.status === 'Inspected').length, hint: 'Certified ready' },
                { label: 'Overdue / Defective', value: equipment.filter((e) => e.status !== 'Operational' && e.status !== 'Inspected').length, hint: 'Maintenance needed', alert: equipment.some((e) => e.status !== 'Operational' && e.status !== 'Inspected') },
                { label: 'Asset Readiness %', value: `${equipment.length > 0 ? Math.round((equipment.filter((e) => e.status === 'Operational' || e.status === 'Inspected').length / equipment.length) * 100) : 100}%`, hint: 'Inspection compliance' },
              ]
        }
      />

      {tab === 'audits' && (
        <div className="space-y-4">
          <form onSubmit={handleSaveAudit} className="bg-white border border-slate-200 rounded-md p-4 space-y-3">
            <div className="text-sm font-bold text-slate-900">Execute Safety Audit Checklist</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                required
                value={auditForm.title}
                onChange={(e) => setAuditForm({ ...auditForm, title: e.target.value })}
                placeholder="Audit Title (e.g. Monthly Fire & Electrical Walkdown)"
                className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
              />
              <select
                value={auditForm.auditType}
                onChange={(e) => setAuditForm({ ...auditForm, auditType: e.target.value })}
                className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
              >
                <option value="ISO 45001 / NBC 2016 Safety Audit">ISO 45001 / NBC 2016 Safety Audit</option>
                <option value="BIS Fire Safety Inspection">BIS Fire Safety Inspection</option>
                <option value="OSHA Workplace Walkdown">OSHA Workplace Walkdown</option>
                <option value="ISO 14001 Environmental Audit">ISO 14001 Environmental Audit</option>
              </select>
              <select
                value={auditForm.plantId}
                onChange={(e) => setAuditForm({ ...auditForm, plantId: e.target.value })}
                className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
              >
                <option value="">Select Plant...</option>
                {hierarchy.plants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 border border-slate-200 rounded p-3 bg-slate-50">
              <div className="text-xs font-semibold text-slate-700">
                Checklist Items (Selecting &ldquo;No&rdquo; automatically creates a CAPA action)
              </div>
              {auditForm.responses.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white border border-slate-200 rounded p-2 text-xs">
                  <div className="sm:col-span-7 text-slate-800">{item.questionText}</div>
                  <select
                    value={item.status}
                    onChange={(e) => {
                      const copy = [...auditForm.responses];
                      copy[idx].status = e.target.value;
                      setAuditForm({ ...auditForm, responses: copy });
                    }}
                    className="sm:col-span-2 border border-slate-300 rounded px-2 py-1"
                  >
                    <option value="Yes">Yes (Compliant)</option>
                    <option value="No">No (NC -&gt; Auto CAPA)</option>
                    <option value="NA">N/A</option>
                  </select>
                  <input
                    value={item.remarks}
                    onChange={(e) => {
                      const copy = [...auditForm.responses];
                      copy[idx].remarks = e.target.value;
                      setAuditForm({ ...auditForm, responses: copy });
                    }}
                    placeholder="Auditor remarks"
                    className="sm:col-span-3 border border-slate-300 rounded px-2 py-1"
                  />
                </div>
              ))}
            </div>

            <button type="submit" className="px-4 py-2 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer">
              Submit Audit &amp; Generate Score / CAPAs
            </button>
          </form>

          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Audit #</th>
                  <th className="px-3 py-2.5">Title &amp; Type</th>
                  <th className="px-3 py-2.5">Auditor</th>
                  <th className="px-3 py-2.5 text-right">Score</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {audits.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-semibold">{a.auditNumber}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-slate-900">{a.title}</div>
                      <div className="text-[11px] text-slate-500">{a.auditType}</div>
                    </td>
                    <td className="px-3 py-2.5">{a.leadAuditor}</td>
                    <td className="px-3 py-2.5 text-right font-bold">{a.complianceScore}%</td>
                    <td className="px-3 py-2.5"><StatusTag status={a.status} /></td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => exportAuditPdf(a, organization)}
                        className="inline-flex items-center gap-1 px-2 py-1 border border-slate-300 rounded text-[11px] cursor-pointer"
                      >
                        <Download className="w-3 h-3" /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'equipment' && (
        <div className="space-y-4">
          <form onSubmit={handleCreateEquipment} className="bg-white border border-slate-200 rounded-md p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              required
              value={equipForm.name}
              onChange={(e) => setEquipForm({ ...equipForm, name: e.target.value })}
              placeholder="Equipment / Asset Name *"
              className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
            />
            <select
              value={equipForm.category}
              onChange={(e) => setEquipForm({ ...equipForm, category: e.target.value })}
              className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
            >
              {['Lifting Gear / Crane', 'Pressure Vessel / Boiler', 'Fire Extinguisher / Hydrant', 'Forklift / MHE', 'Electrical Panel / Transformer', 'Gas Detector / Calibration'].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              required
              value={equipForm.location}
              onChange={(e) => setEquipForm({ ...equipForm, location: e.target.value })}
              placeholder="Installed Location *"
              className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
            />
            <input
              value={equipForm.certificationNumber}
              onChange={(e) => setEquipForm({ ...equipForm, certificationNumber: e.target.value })}
              placeholder="Statutory Certificate # (Form 11 / PESO)"
              className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
            />
            <input
              type="date"
              value={equipForm.nextDueDate}
              onChange={(e) => setEquipForm({ ...equipForm, nextDueDate: e.target.value })}
              className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
            />
            <button type="submit" className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Register Asset
            </button>
          </form>

          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Asset #</th>
                  <th className="px-3 py-2.5">Equipment &amp; Category</th>
                  <th className="px-3 py-2.5">Location</th>
                  <th className="px-3 py-2.5">Next Due</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {equipment.map((eq) => (
                  <tr key={eq.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-semibold">{eq.equipmentId}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-slate-900">{eq.name}</div>
                      <div className="text-[11px] text-slate-500">{eq.category} · {eq.certificationNumber}</div>
                    </td>
                    <td className="px-3 py-2.5">{eq.location}</td>
                    <td className="px-3 py-2.5">{eq.nextDueDate}</td>
                    <td className="px-3 py-2.5"><StatusTag status={eq.status} /></td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleInspectEquipment(eq.id)}
                        className="px-2.5 py-1 bg-slate-900 text-white rounded text-[11px] cursor-pointer"
                      >
                        Log Inspection
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
