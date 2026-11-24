import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Grid3x3, Lock, Plus, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { StatusTag } from './IconResolver';
import { ModuleKpiStrip } from './ModuleKpiStrip';

export function RiskAndLotoView({
  defaultTab = 'risk',
  onOpenMasterKpi,
}: {
  defaultTab?: 'risk' | 'loto';
  onOpenMasterKpi?: () => void;
}) {
  const { hierarchy } = useAuth();
  const [tab, setTab] = useState<'risk' | 'loto'>(defaultTab);
  const [risks, setRisks] = useState<any[]>([]);
  const [lotos, setLotos] = useState<any[]>([]);
  const [aiDrafting, setAiDrafting] = useState(false);
  const [aiDraftedFlag, setAiDraftedFlag] = useState(false);

  const [riskForm, setRiskForm] = useState({
    methodology: 'HIRA',
    plantId: '',
    title: '',
    activityOrNode: '',
    guideword: 'More / High Pressure',
    deviation: '',
    hazardCategory: 'Mechanical',
    hazard: '',
    potentialConsequences: '',
    existingControls: '',
    likelihood: 3,
    severity: 4,
    additionalControls: '',
    residualLikelihood: 1,
    residualSeverity: 2,
  });

  const [lotoForm, setLotoForm] = useState({
    plantId: '',
    equipmentId: '',
    equipmentName: '',
    energySources: 'Electrical 415V, Pneumatic',
    lockNumber: '',
    tagNumber: '',
    zeroEnergyVerified: true,
  });

  const loadAll = useCallback(async () => {
    const [r, l] = await Promise.all([apiFetch('/api/risk-assessments'), apiFetch('/api/loto')]);
    setRisks(r);
    setLotos(l);
  }, []);

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleDraftWithAi = async () => {
    if (!riskForm.activityOrNode && !riskForm.title) return;
    setAiDrafting(true);
    try {
      const suggestion = await apiFetch<any>('/api/ai/suggest-risk', {
        method: 'POST',
        body: JSON.stringify({
          methodology: riskForm.methodology,
          activityOrNode: riskForm.activityOrNode || riskForm.title,
          hazardCategory: riskForm.hazardCategory,
        }),
      });
      setRiskForm((prev) => ({
        ...prev,
        hazard: suggestion.hazard || prev.hazard,
        potentialConsequences: suggestion.potentialConsequences || prev.potentialConsequences,
        existingControls: suggestion.existingControls || prev.existingControls,
        additionalControls: suggestion.additionalControls || prev.additionalControls,
        guideword: suggestion.guideword || prev.guideword,
        deviation: suggestion.deviation || prev.deviation,
        likelihood: Number(suggestion.likelihood || prev.likelihood),
        severity: Number(suggestion.severity || prev.severity),
        residualLikelihood: Number(suggestion.residualLikelihood || prev.residualLikelihood),
        residualSeverity: Number(suggestion.residualSeverity || prev.residualSeverity),
      }));
      setAiDraftedFlag(true);
    } finally {
      setAiDrafting(false);
    }
  };

  const handleCreateRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/risk-assessments', {
      method: 'POST',
      body: JSON.stringify({ ...riskForm, aiSuggested: aiDraftedFlag }),
    });
    setAiDraftedFlag(false);
    setRiskForm({ ...riskForm, title: '', activityOrNode: '', hazard: '', potentialConsequences: '' });
    await loadAll();
  };

  const handleApproveRisk = async (id: string) => {
    await apiFetch(`/api/risk-assessments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Approved' }),
    });
    await loadAll();
  };

  const handleCreateLoto = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/loto', {
      method: 'POST',
      body: JSON.stringify({
        ...lotoForm,
        energySources: lotoForm.energySources.split(',').map((s) => s.trim()).filter(Boolean),
      }),
    });
    setLotoForm({ ...lotoForm, equipmentId: '', equipmentName: '', lockNumber: '', tagNumber: '' });
    await loadAll();
  };

  const handleUpdateLoto = async (id: string, status: string, zeroEnergyVerified?: boolean) => {
    await apiFetch(`/api/loto/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, zeroEnergyVerified }),
    });
    await loadAll();
  };

  // Build 5x5 risk matrix counts
  const matrixCount = (l: number, s: number) =>
    risks.filter((r) => r.likelihood === l && r.severity === s).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Risk Assessment (HIRA / HAZOP / JSA) &amp; LOTO Control
          </h1>
          <p className="text-sm text-slate-500">
            Configurable 5×5 hazard risk matrix, HAZOP guidewords, JSA/SWMS, and Lockout/Tagout zero-energy isolation.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab('risk')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border cursor-pointer ${
              tab === 'risk' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            <Grid3x3 className="w-3.5 h-3.5" />
            <span>HIRA / HAZOP / JSA ({risks.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('loto')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border cursor-pointer ${
              tab === 'loto' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>LOTO Isolation ({lotos.length})</span>
          </button>
        </div>
      </div>

      <ModuleKpiStrip
        title={tab === 'risk' ? 'Risk Assessment (HIRA / HAZOP / JSA) Individual KPIs' : 'LOTO Energy Isolation Individual KPIs'}
        onOpenMasterKpi={onOpenMasterKpi}
        items={
          tab === 'risk'
            ? [
                { label: 'Total Assessments', value: risks.length, hint: 'HIRA · HAZOP · JSA' },
                { label: 'High/Critical Risks', value: risks.filter((r) => r.initialRiskScore >= 12).length, hint: 'Score >= 12', alert: risks.some((r) => r.initialRiskScore >= 16) },
                { label: 'Approved Controls', value: risks.filter((r) => r.status === 'Approved' || r.status === 'Active').length, hint: 'Verified safeguards' },
                { label: 'Avg Residual Score', value: risks.length > 0 ? (risks.reduce((s, r) => s + Number(r.residualRiskScore || 0), 0) / risks.length).toFixed(1) : '0.0', hint: 'Post-control risk' },
              ]
            : [
                { label: 'Total LOTO Records', value: lotos.length, hint: 'Isolation logs' },
                { label: 'Zero-Energy Verified', value: lotos.filter((l) => l.zeroEnergyVerified).length, hint: 'Try-out confirmed' },
                { label: 'Active Isolations', value: lotos.filter((l) => l.status !== 'Cleared').length, hint: 'Locks applied' },
                { label: 'Verification Rate', value: `${lotos.length > 0 ? Math.round((lotos.filter((l) => l.zeroEnergyVerified).length / lotos.length) * 100) : 100}%`, hint: 'Zero-energy compliance' },
              ]
        }
      />

      {tab === 'risk' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Risk Form */}
            <form onSubmit={handleCreateRisk} className="lg:col-span-7 bg-white border border-slate-200 rounded-md p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-700" />
                  <span>Create HIRA / HAZOP / JSA Assessment</span>
                </div>
                <button
                  type="button"
                  onClick={handleDraftWithAi}
                  disabled={aiDrafting || (!riskForm.activityOrNode && !riskForm.title)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-slate-900 disabled:opacity-50 text-white rounded cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{aiDrafting ? 'Drafting...' : 'Draft Hazards with ARSHIEL AI'}</span>
                </button>
              </div>
              {aiDraftedFlag && (
                <div className="text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded px-3 py-1.5 font-medium">
                  AI-Drafted Hazard &amp; Controls populated — Safety Officer review &amp; approval required before finalizing.
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={riskForm.methodology}
                  onChange={(e) => setRiskForm({ ...riskForm, methodology: e.target.value })}
                  className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                >
                  {['HIRA', 'HAZOP', 'JSA', 'JHA', 'SWMS', 'LMRA', 'Environmental Risk', 'Ergonomic'].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={riskForm.plantId}
                  onChange={(e) => setRiskForm({ ...riskForm, plantId: e.target.value })}
                  className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                >
                  <option value="">All Plants</option>
                  {hierarchy.plants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  value={riskForm.hazardCategory}
                  onChange={(e) => setRiskForm({ ...riskForm, hazardCategory: e.target.value })}
                  placeholder="Hazard Category"
                  className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  required
                  value={riskForm.title}
                  onChange={(e) => setRiskForm({ ...riskForm, title: e.target.value })}
                  placeholder="Assessment Title *"
                  className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                />
                <input
                  required
                  value={riskForm.activityOrNode}
                  onChange={(e) => setRiskForm({ ...riskForm, activityOrNode: e.target.value })}
                  placeholder="Activity / Process Node *"
                  className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                />
              </div>
              {riskForm.methodology === 'HAZOP' && (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={riskForm.guideword}
                    onChange={(e) => setRiskForm({ ...riskForm, guideword: e.target.value })}
                    placeholder="HAZOP Guideword (No/More/Less/Reverse)"
                    className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                  />
                  <input
                    value={riskForm.deviation}
                    onChange={(e) => setRiskForm({ ...riskForm, deviation: e.target.value })}
                    placeholder="Process Deviation"
                    className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                  />
                </div>
              )}
              <input
                required
                value={riskForm.hazard}
                onChange={(e) => setRiskForm({ ...riskForm, hazard: e.target.value })}
                placeholder="Identified Hazard *"
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={riskForm.potentialConsequences}
                  onChange={(e) => setRiskForm({ ...riskForm, potentialConsequences: e.target.value })}
                  placeholder="Potential Consequences"
                  className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                />
                <input
                  value={riskForm.existingControls}
                  onChange={(e) => setRiskForm({ ...riskForm, existingControls: e.target.value })}
                  placeholder="Existing Safeguards"
                  className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                />
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold">Init L (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={riskForm.likelihood}
                    onChange={(e) => setRiskForm({ ...riskForm, likelihood: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold">Init S (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={riskForm.severity}
                    onChange={(e) => setRiskForm({ ...riskForm, severity: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold">Res L (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={riskForm.residualLikelihood}
                    onChange={(e) => setRiskForm({ ...riskForm, residualLikelihood: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold">Res S (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={riskForm.residualSeverity}
                    onChange={(e) => setRiskForm({ ...riskForm, residualSeverity: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded px-2 py-1"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer"
              >
                Save Risk Assessment (Initial Score: {riskForm.likelihood * riskForm.severity})
              </button>
            </form>

            {/* Interactive 5x5 Risk Matrix Heatmap */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-4 space-y-3">
              <div className="text-sm font-bold text-slate-900">5×5 Risk Matrix Heatmap (L × S)</div>
              <div className="grid grid-cols-6 gap-1 text-[11px] text-center tabular-nums">
                <div className="font-bold text-slate-500 p-1">L \ S</div>
                {[1, 2, 3, 4, 5].map((s) => (
                  <div key={s} className="font-bold text-slate-600 p-1">
                    S{s}
                  </div>
                ))}
                {[5, 4, 3, 2, 1].map((l) => (
                  <React.Fragment key={l}>
                    <div className="font-bold text-slate-600 p-1.5">L{l}</div>
                    {[1, 2, 3, 4, 5].map((s) => {
                      const score = l * s;
                      const cnt = matrixCount(l, s);
                      const bg =
                        score >= 16
                          ? 'bg-red-600 text-white'
                          : score >= 10
                            ? 'bg-amber-500 text-white'
                            : score >= 5
                              ? 'bg-yellow-200 text-slate-900'
                              : 'bg-emerald-100 text-emerald-900';
                      return (
                        <div key={s} className={`rounded p-1.5 font-semibold ${bg}`}>
                          {score} {cnt > 0 ? `(${cnt})` : ''}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
              <div className="text-[11px] text-slate-500">
                Scores 16–25: Critical · 10–15: High · 5–9: Medium · 1–4: Low
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Ref #</th>
                  <th className="px-3 py-2.5">Methodology &amp; Title</th>
                  <th className="px-3 py-2.5">Hazard</th>
                  <th className="px-3 py-2.5 text-center">Initial</th>
                  <th className="px-3 py-2.5 text-center">Residual</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {risks.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-semibold">{r.assessmentNumber}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-slate-900">{r.methodology} · {r.title}</div>
                      <div className="text-[11px] text-slate-500">{r.activityOrNode}</div>
                    </td>
                    <td className="px-3 py-2.5 max-w-xs">{r.hazard}</td>
                    <td className="px-3 py-2.5 text-center font-bold">{r.initialRiskScore}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-emerald-700">{r.residualRiskScore}</td>
                    <td className="px-3 py-2.5"><StatusTag status={r.status} /></td>
                    <td className="px-3 py-2.5 text-right">
                      {r.status !== 'Approved' && (
                        <button
                          type="button"
                          onClick={() => handleApproveRisk(r.id)}
                          className="px-2.5 py-1 bg-emerald-700 text-white rounded text-[11px] cursor-pointer"
                        >
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'loto' && (
        <div className="space-y-4">
          <form onSubmit={handleCreateLoto} className="bg-white border border-slate-200 rounded-md p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              required
              value={lotoForm.equipmentId}
              onChange={(e) => setLotoForm({ ...lotoForm, equipmentId: e.target.value })}
              placeholder="Equipment ID (e.g. EQ-PMP-12)"
              className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
            />
            <input
              required
              value={lotoForm.equipmentName}
              onChange={(e) => setLotoForm({ ...lotoForm, equipmentName: e.target.value })}
              placeholder="Equipment Name & Isolation Point"
              className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
            />
            <input
              value={lotoForm.energySources}
              onChange={(e) => setLotoForm({ ...lotoForm, energySources: e.target.value })}
              placeholder="Energy Sources (comma-separated)"
              className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
            />
            <input
              value={lotoForm.lockNumber}
              onChange={(e) => setLotoForm({ ...lotoForm, lockNumber: e.target.value })}
              placeholder="Padlock Number"
              className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
            />
            <input
              value={lotoForm.tagNumber}
              onChange={(e) => setLotoForm({ ...lotoForm, tagNumber: e.target.value })}
              placeholder="Danger Tag Number"
              className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
            />
            <label className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
              <input
                type="checkbox"
                checked={lotoForm.zeroEnergyVerified}
                onChange={(e) => setLotoForm({ ...lotoForm, zeroEnergyVerified: e.target.checked })}
              />
              <span>Zero-Energy State Tested &amp; Verified</span>
            </label>
            <div className="sm:col-span-3 flex justify-end">
              <button type="submit" className="px-4 py-1.5 text-xs font-semibold bg-red-600 text-white rounded cursor-pointer">
                Apply LOTO Isolation
              </button>
            </div>
          </form>

          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-2.5">LOTO #</th>
                  <th className="px-3 py-2.5">Equipment</th>
                  <th className="px-3 py-2.5">Lock / Tag</th>
                  <th className="px-3 py-2.5">Zero Energy</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {lotos.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-semibold">{l.lotoNumber}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-slate-900">{l.equipmentName}</div>
                      <div className="text-[11px] text-slate-500">{(l.energySources || []).join(', ')}</div>
                    </td>
                    <td className="px-3 py-2.5">{l.lockNumber} / {l.tagNumber}</td>
                    <td className="px-3 py-2.5">
                      {l.zeroEnergyVerified ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                        </span>
                      ) : (
                        <span className="text-amber-700 font-semibold">Pending Test</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5"><StatusTag status={l.status} /></td>
                    <td className="px-3 py-2.5 text-right space-x-1.5">
                      {!l.zeroEnergyVerified && (
                        <button
                          type="button"
                          onClick={() => handleUpdateLoto(l.id, 'Verified', true)}
                          className="px-2 py-1 bg-emerald-700 text-white rounded text-[11px] cursor-pointer"
                        >
                          Verify Zero Energy
                        </button>
                      )}
                      {l.status !== 'Restored' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateLoto(l.id, 'Restored', l.zeroEnergyVerified)}
                          className="px-2 py-1 bg-slate-900 text-white rounded text-[11px] cursor-pointer"
                        >
                          De-Isolate &amp; Restore
                        </button>
                      )}
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
