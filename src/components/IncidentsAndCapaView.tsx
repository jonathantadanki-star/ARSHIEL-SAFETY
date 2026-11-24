import React, { useCallback, useEffect, useState } from 'react';
import { Download, FileSpreadsheet, GitBranch, Plus, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { exportIncidentPdf, exportRowsToExcel } from '../lib/pdf';
import { StatusTag } from './IconResolver';
import { ModuleKpiStrip } from './ModuleKpiStrip';

const INCIDENT_TYPES = [
  'Near Miss',
  'Unsafe Act',
  'Unsafe Condition',
  'First Aid Case',
  'Medical Treatment Case',
  'Restricted Work Case',
  'Lost Time Injury (LTI)',
  'Fatality',
  'Dangerous Occurrence',
  'Fire / Explosion',
  'Chemical Spill / Environmental Release',
  'Property Damage',
  'Vehicle / Fleet Incident',
  'Contractor Incident',
  'Occupational Illness',
];

export function IncidentsAndCapaView({
  defaultTab = 'incidents',
  onOpenMasterKpi,
}: {
  defaultTab?: 'incidents' | 'capa';
  onOpenMasterKpi?: () => void;
}) {
  const { organization, hierarchy } = useAuth();
  const [tab, setTab] = useState<'incidents' | 'capa'>(defaultTab);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [capas, setCapas] = useState<any[]>([]);
  const [showIncForm, setShowIncForm] = useState(false);
  const [showCapaForm, setShowCapaForm] = useState(false);
  const [selectedInc, setSelectedInc] = useState<any | null>(null);

  const [incForm, setIncForm] = useState({
    incidentType: 'Near Miss',
    severity: 'Medium',
    plantId: '',
    departmentId: '',
    title: '',
    description: '',
    incidentDate: new Date().toISOString().slice(0, 10),
    incidentTime: new Date().toTimeString().slice(0, 5),
    specificLocation: '',
    personType: 'Employee',
    injuredPersonName: '',
    injuryBodyPart: '',
    witnessName: '',
    witnessStatement: '',
    evidenceFiles: [] as string[],
    immediateActions: '',
    daysLost: 0,
  });

  const [rcaEdit, setRcaEdit] = useState({
    rcaMethod: '5 Why',
    why1: '',
    why2: '',
    why3: '',
    why4: '',
    why5: '',
    fishboneMan: '',
    fishboneMachine: '',
    fishboneMethod: '',
    fishboneMaterial: '',
    fishboneEnvironment: '',
    directCauses: '',
    rootCauses: '',
    status: 'Investigating',
    timelineEvents: [] as { time: string; event: string }[],
    newTimelineTime: '',
    newTimelineEvent: '',
  });

  const [capaForm, setCapaForm] = useState({
    sourceType: 'incident',
    sourceNumber: '',
    title: '',
    description: '',
    actionType: 'Corrective',
    priority: 'High',
    responsiblePerson: '',
    targetDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  });

  const loadData = useCallback(async () => {
    const [incRows, capaRows] = await Promise.all([apiFetch('/api/incidents'), apiFetch('/api/capas')]);
    setIncidents(incRows);
    setCapas(capaRows);
  }, []);

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    const plantObj = hierarchy.plants.find((p) => p.id === incForm.plantId);
    const deptObj = hierarchy.departments.find((d) => d.id === incForm.departmentId);
    await apiFetch('/api/incidents', {
      method: 'POST',
      body: JSON.stringify({
        ...incForm,
        plantName: plantObj?.name || null,
        departmentName: deptObj?.name || null,
        injuredPersonDetails: incForm.injuredPersonName
          ? { name: incForm.injuredPersonName, bodyPartOrNature: incForm.injuryBodyPart, personType: incForm.personType }
          : {},
        witnessDetails: incForm.witnessName
          ? [{ name: incForm.witnessName, statement: incForm.witnessStatement }]
          : [],
      }),
    });
    setShowIncForm(false);
    setIncForm({
      ...incForm,
      title: '',
      description: '',
      immediateActions: '',
      injuredPersonName: '',
      injuryBodyPart: '',
      witnessName: '',
      witnessStatement: '',
      evidenceFiles: [],
    });
    await loadData();
  };

  const openInvestigation = (inc: any) => {
    setSelectedInc(inc);
    const whys = inc.rcaData?.whys || [];
    const fb = inc.rcaData?.fishbone || {};
    setRcaEdit({
      rcaMethod: inc.rcaMethod || '5 Why',
      why1: whys[0] || '',
      why2: whys[1] || '',
      why3: whys[2] || '',
      why4: whys[3] || '',
      why5: whys[4] || '',
      fishboneMan: fb.man || '',
      fishboneMachine: fb.machine || '',
      fishboneMethod: fb.method || '',
      fishboneMaterial: fb.material || '',
      fishboneEnvironment: fb.environment || '',
      directCauses: inc.directCauses || '',
      rootCauses: inc.rootCauses || '',
      status: inc.status || 'Investigating',
      timelineEvents: Array.isArray(inc.timelineEvents) ? inc.timelineEvents : [],
      newTimelineTime: '',
      newTimelineEvent: '',
    });
  };

  const handleSaveInvestigation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInc) return;
    await apiFetch(`/api/incidents/${selectedInc.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        rcaMethod: rcaEdit.rcaMethod,
        rcaData: {
          whys: [rcaEdit.why1, rcaEdit.why2, rcaEdit.why3, rcaEdit.why4, rcaEdit.why5].filter(Boolean),
          fishbone: {
            man: rcaEdit.fishboneMan,
            machine: rcaEdit.fishboneMachine,
            method: rcaEdit.fishboneMethod,
            material: rcaEdit.fishboneMaterial,
            environment: rcaEdit.fishboneEnvironment,
          },
        },
        timelineEvents: rcaEdit.timelineEvents,
        directCauses: rcaEdit.directCauses,
        rootCauses: rcaEdit.rootCauses,
        status: rcaEdit.status,
      }),
    });
    setSelectedInc(null);
    await loadData();
  };

  const handleCreateCapa = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/capas', { method: 'POST', body: JSON.stringify(capaForm) });
    setShowCapaForm(false);
    setCapaForm({ ...capaForm, title: '', description: '' });
    await loadData();
  };

  const handleCloseCapa = async (id: string) => {
    await apiFetch(`/api/capas/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Closed', effectivenessReview: 'Verified closed on site' }),
    });
    await loadData();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Incident Management, RCA &amp; CAPA Register
          </h1>
          <p className="text-sm text-slate-500">
            15 incident classifications, 5-Why &amp; Fishbone RCA investigations, proof-based closure &amp; CAPA tracking.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab('incidents')}
            className={`px-3 py-1.5 text-xs font-semibold rounded border cursor-pointer ${
              tab === 'incidents' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            Incidents ({incidents.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('capa')}
            className={`px-3 py-1.5 text-xs font-semibold rounded border cursor-pointer ${
              tab === 'capa' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            CAPA Register ({capas.length})
          </button>
        </div>
      </div>

      <ModuleKpiStrip
        title={tab === 'incidents' ? 'Incident Management Individual KPIs' : 'CAPA Register Individual KPIs'}
        onOpenMasterKpi={onOpenMasterKpi}
        items={
          tab === 'incidents'
            ? [
                { label: 'Total Incidents', value: incidents.length, hint: 'Reported in workspace' },
                { label: 'Recordable / LTI', value: incidents.filter((i) => i.isRecordable || i.incidentType === 'Lost Time Injury (LTI)').length, hint: 'OSHA/OSHWC recordable', alert: incidents.some((i) => i.incidentType === 'Lost Time Injury (LTI)') },
                { label: 'Open Investigations', value: incidents.filter((i) => i.status !== 'Closed').length, hint: 'RCA in progress' },
                { label: 'Days Lost Total', value: incidents.reduce((s, i) => s + Number(i.daysLost || 0), 0), hint: 'Severity tracking' },
              ]
            : [
                { label: 'Total CAPAs', value: capas.length, hint: 'Corrective & Preventive' },
                { label: 'Open CAPAs', value: capas.filter((c) => c.status !== 'Closed').length, hint: 'Action required' },
                { label: 'Overdue CAPAs', value: capas.filter((c) => c.status !== 'Closed' && (c.status === 'Overdue' || (c.targetDate && c.targetDate < new Date().toISOString().slice(0, 10)))).length, hint: 'Past target date', alert: capas.some((c) => c.status !== 'Closed' && c.status === 'Overdue') },
                { label: 'CAPA Closure Rate', value: `${capas.length > 0 ? Math.round((capas.filter((c) => c.status === 'Closed').length / capas.length) * 100) : 100}%`, hint: 'Verified closure' },
              ]
        }
      />

      {tab === 'incidents' && (
        <>
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => setShowIncForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{showIncForm ? 'Close Form' : 'Report New Incident'}</span>
            </button>
            <button
              type="button"
              onClick={() => exportRowsToExcel(incidents, 'ARSHIEL-Incidents')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white rounded cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
          </div>

          {showIncForm && (
            <form onSubmit={handleCreateIncident} className="bg-white border border-slate-200 rounded-md p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Incident Type *</label>
                  <select
                    value={incForm.incidentType}
                    onChange={(e) => setIncForm({ ...incForm, incidentType: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs"
                  >
                    {INCIDENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Severity *</label>
                  <select
                    value={incForm.severity}
                    onChange={(e) => setIncForm({ ...incForm, severity: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs"
                  >
                    {['Low', 'Medium', 'High', 'Critical'].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Plant</label>
                  <select
                    value={incForm.plantId}
                    onChange={(e) => setIncForm({ ...incForm, plantId: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs"
                  >
                    <option value="">Select Plant...</option>
                    {hierarchy.plants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Incident Title *</label>
                  <input
                    required
                    value={incForm.title}
                    onChange={(e) => setIncForm({ ...incForm, title: e.target.value })}
                    placeholder="Brief headline of what occurred"
                    className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Specific Location *</label>
                  <input
                    required
                    value={incForm.specificLocation}
                    onChange={(e) => setIncForm({ ...incForm, specificLocation: e.target.value })}
                    placeholder="e.g. Bay 3 Packing Line"
                    className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs"
                  />
                </div>
              </div>
              <textarea
                required
                rows={2}
                value={incForm.description}
                onChange={(e) => setIncForm({ ...incForm, description: e.target.value })}
                placeholder="Detailed chronological description..."
                className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs"
              />
              <textarea
                rows={2}
                value={incForm.immediateActions}
                onChange={(e) => setIncForm({ ...incForm, immediateActions: e.target.value })}
                placeholder="Immediate containment / medical first-aid actions taken..."
                className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs"
              />
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  value={incForm.injuredPersonName}
                  onChange={(e) => setIncForm({ ...incForm, injuredPersonName: e.target.value })}
                  placeholder="Affected / Injured Person"
                  className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                />
                <input
                  value={incForm.injuryBodyPart}
                  onChange={(e) => setIncForm({ ...incForm, injuryBodyPart: e.target.value })}
                  placeholder="Injury Nature / Body Part"
                  className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                />
                <input
                  value={incForm.witnessName}
                  onChange={(e) => setIncForm({ ...incForm, witnessName: e.target.value })}
                  placeholder="Witness Name"
                  className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                />
                <input
                  type="number"
                  min={0}
                  value={incForm.daysLost}
                  onChange={(e) => setIncForm({ ...incForm, daysLost: Number(e.target.value) })}
                  placeholder="Days Lost"
                  className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs text-slate-700 flex items-center gap-2 cursor-pointer">
                  <span className="font-semibold">Attach Photo / Evidence:</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () =>
                        setIncForm((prev) => ({
                          ...prev,
                          evidenceFiles: [...prev.evidenceFiles, `${file.name}::${String(reader.result || '').slice(0, 200)}`],
                        }));
                      reader.readAsDataURL(file);
                    }}
                    className="text-xs"
                  />
                  {incForm.evidenceFiles.length > 0 && (
                    <span className="text-emerald-700 font-semibold">
                      ({incForm.evidenceFiles.length} file attached)
                    </span>
                  )}
                </label>
                <button type="submit" className="px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded cursor-pointer">
                  Log Incident
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Incident #</th>
                    <th className="px-3 py-2.5">Type &amp; Title</th>
                    <th className="px-3 py-2.5">Date / Location</th>
                    <th className="px-3 py-2.5">Severity</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {incidents.map((inc) => (
                    <tr key={inc.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{inc.incidentNumber}</td>
                      <td className="px-3 py-3 max-w-sm">
                        <div className="font-semibold text-slate-800">{inc.incidentType}</div>
                        <div className="text-slate-600 truncate">{inc.title}</div>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        <div>{inc.incidentDate} {inc.incidentTime}</div>
                        <div className="text-[11px]">{inc.specificLocation || inc.plantName}</div>
                      </td>
                      <td className="px-3 py-3"><StatusTag status={inc.severity} /></td>
                      <td className="px-3 py-3"><StatusTag status={inc.status} /></td>
                      <td className="px-3 py-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openInvestigation(inc)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-slate-900 text-white rounded text-[11px] cursor-pointer"
                        >
                          <GitBranch className="w-3 h-3" />
                          <span>RCA &amp; Close</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => exportIncidentPdf(inc, organization)}
                          className="inline-flex items-center gap-1 px-2 py-1 border border-slate-300 rounded text-[11px] cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>PDF</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'capa' && (
        <>
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => setShowCapaForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{showCapaForm ? 'Close Form' : 'New CAPA Action'}</span>
            </button>
          </div>

          {showCapaForm && (
            <form onSubmit={handleCreateCapa} className="bg-white border border-slate-200 rounded-md p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                required
                value={capaForm.title}
                onChange={(e) => setCapaForm({ ...capaForm, title: e.target.value })}
                placeholder="CAPA Title"
                className="sm:col-span-2 border border-slate-300 rounded px-2.5 py-1.5 text-xs"
              />
              <select
                value={capaForm.priority}
                onChange={(e) => setCapaForm({ ...capaForm, priority: e.target.value })}
                className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <input
                required
                value={capaForm.responsiblePerson}
                onChange={(e) => setCapaForm({ ...capaForm, responsiblePerson: e.target.value })}
                placeholder="Responsible Owner"
                className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
              />
              <input
                type="date"
                value={capaForm.targetDate}
                onChange={(e) => setCapaForm({ ...capaForm, targetDate: e.target.value })}
                className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
              />
              <input
                value={capaForm.sourceNumber}
                onChange={(e) => setCapaForm({ ...capaForm, sourceNumber: e.target.value })}
                placeholder="Source Ref (e.g. INC-2026-0001)"
                className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
              />
              <textarea
                rows={2}
                value={capaForm.description}
                onChange={(e) => setCapaForm({ ...capaForm, description: e.target.value })}
                placeholder="Corrective/Preventive action implementation details..."
                className="sm:col-span-3 border border-slate-300 rounded px-2.5 py-1.5 text-xs"
              />
              <div className="sm:col-span-3 flex justify-end">
                <button type="submit" className="px-4 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer">
                  Save CAPA
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-2.5">CAPA #</th>
                  <th className="px-3 py-2.5">Source &amp; Action</th>
                  <th className="px-3 py-2.5">Owner</th>
                  <th className="px-3 py-2.5">Target Date</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Verify</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {capas.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{c.actionNumber}</td>
                    <td className="px-3 py-3 max-w-md">
                      <div className="font-semibold text-slate-800">{c.title}</div>
                      <div className="text-[11px] text-slate-500">
                        {c.actionType} · {c.sourceType} {c.sourceNumber || ''}
                      </div>
                    </td>
                    <td className="px-3 py-3">{c.responsiblePerson}</td>
                    <td className="px-3 py-3">{c.targetDate}</td>
                    <td className="px-3 py-3"><StatusTag status={c.status} /></td>
                    <td className="px-3 py-3 text-right">
                      {c.status !== 'Closed' && (
                        <button
                          type="button"
                          onClick={() => handleCloseCapa(c.id)}
                          className="px-2.5 py-1 bg-emerald-700 text-white rounded text-[11px] font-semibold cursor-pointer"
                        >
                          Verify &amp; Close
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 5-Why & Fishbone RCA Investigation Modal */}
      {selectedInc && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveInvestigation}
            className="bg-white border border-slate-200 rounded-lg max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="text-xs font-bold text-red-700">{selectedInc.incidentNumber}</div>
                <h3 className="font-display font-bold text-lg text-slate-900">
                  RCA Investigation — {selectedInc.title}
                </h3>
              </div>
              <button type="button" onClick={() => setSelectedInc(null)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">RCA Methodology</label>
                <select
                  value={rcaEdit.rcaMethod}
                  onChange={(e) => setRcaEdit({ ...rcaEdit, rcaMethod: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                >
                  <option value="5 Why">5-Why Analysis</option>
                  <option value="Fishbone">Fishbone (Ishikawa 6M)</option>
                  <option value="Both">Combined 5-Why + Fishbone</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Investigation Status</label>
                <select
                  value={rcaEdit.status}
                  onChange={(e) => setRcaEdit({ ...rcaEdit, status: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                >
                  <option value="Investigating">Investigating</option>
                  <option value="RCA Complete">RCA Complete</option>
                  <option value="CAPA Pending">CAPA Pending</option>
                  <option value="Closed">Closed (Verified)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-bold text-slate-800">5-Why Root Cause Chain</div>
              {[1, 2, 3, 4, 5].map((n) => (
                <input
                  key={n}
                  value={(rcaEdit as any)[`why${n}`]}
                  onChange={(e) => setRcaEdit({ ...rcaEdit, [`why${n}`]: e.target.value })}
                  placeholder={`Why ${n}...`}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                />
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                value={rcaEdit.fishboneMan}
                onChange={(e) => setRcaEdit({ ...rcaEdit, fishboneMan: e.target.value })}
                placeholder="Fishbone: People / Human Factors"
                className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
              />
              <input
                value={rcaEdit.fishboneMachine}
                onChange={(e) => setRcaEdit({ ...rcaEdit, fishboneMachine: e.target.value })}
                placeholder="Fishbone: Equipment / Machine"
                className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
              />
              <input
                value={rcaEdit.fishboneMethod}
                onChange={(e) => setRcaEdit({ ...rcaEdit, fishboneMethod: e.target.value })}
                placeholder="Fishbone: Process / SOP Method"
                className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
              />
              <input
                value={rcaEdit.fishboneEnvironment}
                onChange={(e) => setRcaEdit({ ...rcaEdit, fishboneEnvironment: e.target.value })}
                placeholder="Fishbone: Workplace Environment"
                className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
              />
            </div>

            <input
              value={rcaEdit.directCauses}
              onChange={(e) => setRcaEdit({ ...rcaEdit, directCauses: e.target.value })}
              placeholder="Direct / Immediate Causes"
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
            />
            <input
              value={rcaEdit.rootCauses}
              onChange={(e) => setRcaEdit({ ...rcaEdit, rootCauses: e.target.value })}
              placeholder="Systemic Root Cause Statement"
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
            />

            <div className="border border-slate-200 rounded p-3 space-y-2">
              <div className="text-xs font-bold text-slate-800">Chronological Investigation Timeline</div>
              <div className="space-y-1 max-h-28 overflow-y-auto text-xs">
                {rcaEdit.timelineEvents.map((ev, i) => (
                  <div key={i} className="flex gap-2 bg-slate-50 px-2 py-1 rounded">
                    <span className="font-mono font-semibold text-slate-700">{ev.time}</span>
                    <span className="text-slate-700">{ev.event}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={rcaEdit.newTimelineTime}
                  onChange={(e) => setRcaEdit({ ...rcaEdit, newTimelineTime: e.target.value })}
                  className="border border-slate-300 rounded px-2 py-1 text-xs"
                />
                <input
                  value={rcaEdit.newTimelineEvent}
                  onChange={(e) => setRcaEdit({ ...rcaEdit, newTimelineEvent: e.target.value })}
                  placeholder="Add timeline event..."
                  className="flex-1 border border-slate-300 rounded px-2 py-1 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!rcaEdit.newTimelineEvent.trim()) return;
                    setRcaEdit((prev) => ({
                      ...prev,
                      timelineEvents: [
                        ...prev.timelineEvents,
                        { time: prev.newTimelineTime || new Date().toTimeString().slice(0, 5), event: prev.newTimelineEvent.trim() },
                      ],
                      newTimelineTime: '',
                      newTimelineEvent: '',
                    }));
                  }}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-900 text-white rounded cursor-pointer"
                >
                  + Event
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedInc(null)}
                className="px-4 py-1.5 text-xs border border-slate-300 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer"
              >
                Save RCA &amp; Update Status
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
