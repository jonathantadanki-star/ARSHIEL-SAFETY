import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Building2,
  Download,
  Factory,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { exportKpiSummaryPdf, exportRowsToCsv, exportRowsToExcel } from '../lib/pdf';

export type MasterKpiMode =
  | 'master-kpi'
  | 'kpi-executive'
  | 'kpi-industry'
  | 'kpi-plant'
  | 'kpi-module'
  | 'kpi-individual';

interface MasterKpiDashboardViewProps {
  initialMode?: string;
  onNavigate: (routeKey: string, customModuleId?: string | null) => void;
}

const KPI_TABS: { key: Exclude<MasterKpiMode, 'master-kpi'>; label: string }[] = [
  { key: 'kpi-executive', label: 'Master Executive KPIs' },
  { key: 'kpi-industry', label: 'Industry-Wise KPIs' },
  { key: 'kpi-plant', label: 'Plant / Site KPIs' },
  { key: 'kpi-module', label: 'Individual Module KPIs' },
  { key: 'kpi-individual', label: 'Department & Owner KPIs' },
];

export function MasterKpiDashboardView({
  initialMode = 'master-kpi',
  onNavigate,
}: MasterKpiDashboardViewProps) {
  const { organization, hierarchy } = useAuth();

  const normalizeTab = (mode: string): Exclude<MasterKpiMode, 'master-kpi'> => {
    if (
      mode === 'kpi-industry' ||
      mode === 'kpi-plant' ||
      mode === 'kpi-module' ||
      mode === 'kpi-individual' ||
      mode === 'kpi-executive'
    ) {
      return mode;
    }
    return 'kpi-executive';
  };

  const [activeTab, setActiveTab] = useState<Exclude<MasterKpiMode, 'master-kpi'>>(
    normalizeTab(initialMode)
  );
  const [plantId, setPlantId] = useState('all');
  const [timeframe, setTimeframe] = useState('all');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Individual Drill-Down Selectors
  const [selectedIndustryName, setSelectedIndustryName] = useState<string>('');
  const [selectedPlantId, setSelectedPlantId] = useState<string>('');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [selectedOwnerName, setSelectedOwnerName] = useState<string>('');

  // AI KPI Insights
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<any | null>(null);

  useEffect(() => {
    setActiveTab(normalizeTab(initialMode));
  }, [initialMode]);

  const loadMasterKpis = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const qs = new URLSearchParams({ plantId, timeframe });
      const res = await apiFetch<any>(`/api/dashboard/master-kpis?${qs.toString()}`);
      setData(res);
      if (res?.industryKpis?.length && !selectedIndustryName) {
        const active = res.industryKpis.find((i: any) => i.isActiveWorkspace) || res.industryKpis[0];
        if (active) setSelectedIndustryName(active.industryName);
      }
      if (res?.plantKpis?.length && !selectedPlantId) {
        setSelectedPlantId(res.plantKpis[0].plantId);
      }
      if (res?.moduleKpis?.length && !selectedModuleId) {
        setSelectedModuleId(res.moduleKpis[0].id);
      }
      if (res?.ownerKpis?.length && !selectedOwnerName) {
        setSelectedOwnerName(res.ownerKpis[0].ownerName);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load Master KPI data.');
    } finally {
      setLoading(false);
    }
  }, [plantId, timeframe, selectedIndustryName, selectedPlantId, selectedModuleId, selectedOwnerName]);

  useEffect(() => {
    loadMasterKpis();
  }, [loadMasterKpis]);

  const master = data?.masterSummary || {};
  const industryKpis: any[] = data?.industryKpis || [];
  const plantKpis: any[] = data?.plantKpis || [];
  const moduleKpis: any[] = data?.moduleKpis || [];
  const departmentKpis: any[] = data?.departmentKpis || [];
  const ownerKpis: any[] = data?.ownerKpis || [];

  const focusedIndustry = useMemo(
    () =>
      industryKpis.find((i) => i.industryName === selectedIndustryName) ||
      industryKpis.find((i) => i.isActiveWorkspace) ||
      industryKpis[0] ||
      null,
    [industryKpis, selectedIndustryName]
  );

  const focusedPlant = useMemo(
    () => plantKpis.find((p) => p.plantId === selectedPlantId) || plantKpis[0] || null,
    [plantKpis, selectedPlantId]
  );

  const focusedModule = useMemo(
    () => moduleKpis.find((m) => m.id === selectedModuleId) || moduleKpis[0] || null,
    [moduleKpis, selectedModuleId]
  );

  const focusedOwner = useMemo(
    () => ownerKpis.find((o) => o.ownerName === selectedOwnerName) || ownerKpis[0] || null,
    [ownerKpis, selectedOwnerName]
  );

  const runAiInsights = async () => {
    if (!data) return;
    setAiLoading(true);
    setErrorMsg(null);
    try {
      const scopeMap: Record<string, { label: string; payload: unknown }> = {
        'kpi-executive': { label: 'Master Executive EHS KPIs', payload: master },
        'kpi-industry': {
          label: `Industry KPI (${focusedIndustry?.industryName || 'All Industries'})`,
          payload: focusedIndustry || industryKpis.slice(0, 6),
        },
        'kpi-plant': {
          label: `Plant KPI (${focusedPlant?.plantName || 'All Plants'})`,
          payload: focusedPlant || plantKpis,
        },
        'kpi-module': {
          label: `Module KPI (${focusedModule?.moduleName || 'All Modules'})`,
          payload: focusedModule || moduleKpis,
        },
        'kpi-individual': {
          label: `Department & Owner KPI (${focusedOwner?.ownerName || 'All Owners'})`,
          payload: { focusedOwner, departmentKpis: departmentKpis.slice(0, 8) },
        },
      };
      const target = scopeMap[activeTab];
      const res = await apiFetch('/api/ai/kpi-insights', {
        method: 'POST',
        body: JSON.stringify({ scopeLabel: target.label, kpiPayload: target.payload }),
      });
      setAiInsights(res);
    } catch (err: any) {
      setErrorMsg(err?.message || 'AI KPI insight generation failed.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleExportCurrentExcel = () => {
    if (activeTab === 'kpi-industry') {
      exportRowsToExcel(
        industryKpis.map((i) => ({
          Industry: i.industryName,
          WorkspaceActive: i.isActiveWorkspace ? 'Yes' : 'No',
          CompliancePct: i.compliancePct,
          HazardsCount: i.hazards?.length || 0,
          PermitTypes: i.permitTypes?.length || 0,
          Incidents: i.relevantIncidents,
          Permits: i.relevantPermits,
          Risks: i.relevantRisks,
        })),
        'ARSHIEL-Industry-KPIs'
      );
      return;
    }
    if (activeTab === 'kpi-plant') {
      exportRowsToExcel(plantKpis, 'ARSHIEL-Plant-KPIs');
      return;
    }
    if (activeTab === 'kpi-module') {
      exportRowsToExcel(moduleKpis, 'ARSHIEL-Module-KPIs');
      return;
    }
    if (activeTab === 'kpi-individual') {
      exportRowsToExcel(ownerKpis, 'ARSHIEL-Individual-Owner-KPIs');
      return;
    }
    exportRowsToExcel(
      Object.entries(master).map(([Metric, Value]) => ({ Metric, Value })),
      'ARSHIEL-Master-KPI-Summary'
    );
  };

  const handleExportCurrentCsv = () => {
    if (activeTab === 'kpi-module') {
      exportRowsToCsv(moduleKpis, 'ARSHIEL-Module-KPIs');
    } else if (activeTab === 'kpi-plant') {
      exportRowsToCsv(plantKpis, 'ARSHIEL-Plant-KPIs');
    } else if (activeTab === 'kpi-individual') {
      exportRowsToCsv(ownerKpis, 'ARSHIEL-Individual-Owner-KPIs');
    } else if (activeTab === 'kpi-industry') {
      exportRowsToCsv(industryKpis, 'ARSHIEL-Industry-KPIs');
    } else {
      exportRowsToCsv(
        Object.entries(master).map(([Metric, Value]) => ({ Metric, Value })),
        'ARSHIEL-Master-KPI-Summary'
      );
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Parent Line · Master &amp; Individual KPI Intelligence · Owner: Jonathan Thadanki
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            Master KPI Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Unified Cloud SQL KPI Command covering Enterprise Master, Every Industry ({industryKpis.length}), Every Plant ({plantKpis.length}), Every Module ({moduleKpis.length}), and Every Department / Owner.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={runAiInsights}
            disabled={aiLoading || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-amber-300 rounded cursor-pointer disabled:opacity-60"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{aiLoading ? 'Analyzing KPIs...' : 'AI KPI Insights'}</span>
          </button>
          <button
            type="button"
            onClick={() => exportKpiSummaryPdf(master, organization)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
          <button
            type="button"
            onClick={handleExportCurrentExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
          <button
            type="button"
            onClick={handleExportCurrentCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded cursor-pointer"
          >
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Filters + Segmented Tab Bar */}
      <div className="bg-white border border-slate-200 rounded-md p-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {KPI_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded border cursor-pointer transition-colors ${
                activeTab === t.key
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={plantId}
            onChange={(e) => setPlantId(e.target.value)}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
          >
            <option value="all">All Plants ({hierarchy.plants.length})</option>
            {hierarchy.plants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="365d">Last 12 Months</option>
          </select>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs px-4 py-2.5 rounded">
          {errorMsg}
        </div>
      )}

      {/* AI KPI Insights Panel */}
      {aiInsights && (
        <div className="bg-slate-900 text-slate-100 rounded-md p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>AI Executive KPI Analysis (Advisory — Verify Before Governance Action)</span>
            </div>
            <button type="button" onClick={() => setAiInsights(null)} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-slate-200 leading-relaxed">{aiInsights.executiveSummary}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-800 border border-slate-700 rounded p-3">
              <div className="font-bold text-emerald-300 mb-1">Top Strengths</div>
              <ul className="list-disc pl-4 space-y-1 text-slate-200">
                {(aiInsights.topStrengths || []).map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded p-3">
              <div className="font-bold text-red-300 mb-1">Priority Risks</div>
              <ul className="list-disc pl-4 space-y-1 text-slate-200">
                {(aiInsights.priorityRisks || []).map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded p-3">
              <div className="font-bold text-amber-300 mb-1">30-Day Recommendations</div>
              <ul className="list-disc pl-4 space-y-1 text-slate-200">
                {(aiInsights.recommendedActions || []).map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="text-[11px] text-slate-400">
            References: {(aiInsights.standardReferences || []).join(' · ')} · {aiInsights.attribution}
          </div>
        </div>
      )}

      {/* TAB 1: MASTER EXECUTIVE OVERVIEW */}
      {activeTab === 'kpi-executive' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Master Compliance Index', value: `${master.compositeComplianceIndex ?? 0}%`, hint: '10-pillar composite' },
              { label: 'TRIR (200k hrs)', value: master.trir ?? 0, hint: `${master.recordableCount ?? 0} recordable`, alert: Number(master.trir || 0) > 0 },
              { label: 'LTIFR (1M hrs)', value: master.ltifr ?? 0, hint: `${master.ltiCount ?? 0} LTI cases`, alert: Number(master.ltiCount || 0) > 0 },
              { label: 'Total Manhours', value: Number(master.totalManhours || 0).toLocaleString(), hint: `${master.totalEmployees ?? 0} emp · ${master.totalContractors ?? 0} con` },
              { label: 'CAPA Closure Rate', value: `${master.capaClosurePct ?? 100}%`, hint: `${master.openCapas ?? 0} open · ${master.overdueCapas ?? 0} overdue`, alert: Number(master.overdueCapas || 0) > 0 },
              { label: 'Legal OSHWC Compliance', value: `${master.legalCompliancePct ?? 100}%`, hint: `${master.totalLegal ?? 0} statutes tracked` },
              { label: 'PTW Compliance Rate', value: `${master.ptwCompliancePct ?? 100}%`, hint: `${master.activePermits ?? 0} active · ${master.expiredPermits ?? 0} expired`, alert: Number(master.expiredPermits || 0) > 0 },
              { label: 'LOTO Zero-Energy %', value: `${master.lotoCompliancePct ?? 100}%`, hint: `${master.totalLoto ?? 0} isolations` },
              { label: 'Audit Avg Score', value: `${master.avgAuditScore ?? 100}%`, hint: `${master.totalAudits ?? 0} audits` },
              { label: 'Equipment Readiness', value: `${master.equipCompliancePct ?? 100}%`, hint: `${master.totalEquipment ?? 0} assets` },
              { label: 'Training Completion', value: `${master.trainingCompliancePct ?? 100}%`, hint: `${master.totalTrainings ?? 0} sessions` },
              { label: 'Documents (Norm/Child)', value: `${master.normalDocuments ?? 0} / ${master.childDocuments ?? 0}`, hint: `${master.coveredSectionsCount ?? 0}/23 sections · ${master.docCompliancePct ?? 100}% done` },
            ].map((card) => (
              <div
                key={card.label}
                className={`bg-white border rounded-md p-3.5 ${card.alert ? 'border-red-300' : 'border-slate-200'}`}
              >
                <div className="text-[11px] font-semibold text-slate-500 truncate">{card.label}</div>
                <div className={`text-2xl font-display font-bold tabular-nums mt-1 ${card.alert ? 'text-red-700' : 'text-slate-900'}`}>
                  {loading ? '—' : card.value}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 truncate">{card.hint}</div>
              </div>
            ))}
          </div>

          {/* Document & Regulatory Coverage Strip + Module Health Bar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Individual Module Compliance Scorecard</h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('kpi-module')}
                  className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                >
                  Inspect All {moduleKpis.length} Modules &rarr;
                </button>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {moduleKpis.map((m) => (
                  <div key={m.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => onNavigate(m.routeKey, m.customModuleId)}
                        className="font-medium text-slate-800 hover:text-emerald-700 truncate text-left cursor-pointer"
                      >
                        {m.moduleName} <span className="text-slate-400 font-mono">({m.totalRecords})</span>
                      </button>
                      <span className="font-bold tabular-nums text-slate-900">{m.compliancePct}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded overflow-hidden">
                      <div
                        className={`h-full rounded ${
                          m.compliancePct >= 85
                            ? 'bg-emerald-700'
                            : m.compliancePct >= 65
                              ? 'bg-amber-600'
                              : 'bg-red-600'
                        }`}
                        style={{ width: `${Math.max(m.compliancePct, 4)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-4 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Document &amp; Regulatory Coverage KPIs</h3>
              <div className="grid grid-cols-2 gap-2.5 text-xs tabular-nums">
                <div className="border border-slate-200 rounded p-3 bg-slate-50">
                  <div className="text-slate-500">Normal Documents</div>
                  <div className="text-xl font-bold text-slate-900">{master.normalDocuments ?? 0}</div>
                </div>
                <div className="border border-slate-200 rounded p-3 bg-slate-50">
                  <div className="text-slate-500">Child Documents</div>
                  <div className="text-xl font-bold text-emerald-700">{master.childDocuments ?? 0}</div>
                </div>
                <div className="border border-slate-200 rounded p-3 bg-slate-50">
                  <div className="text-slate-500">ISO-Tagged Docs</div>
                  <div className="text-xl font-bold text-slate-900">{master.isoTaggedDocs ?? 0} / {master.totalDocuments ?? 0}</div>
                </div>
                <div className="border border-slate-200 rounded p-3 bg-slate-50">
                  <div className="text-slate-500">Factory/OSHA Tagged</div>
                  <div className="text-xl font-bold text-slate-900">{master.factoryTaggedDocs ?? 0} / {master.oshaTaggedDocs ?? 0}</div>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('documents', null)}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded cursor-pointer"
                >
                  Open Normal &amp; Child Documents
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('legal', null)}
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white text-slate-700 rounded cursor-pointer"
                >
                  Open Legal OSHWC Register
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INDUSTRY-WISE INDIVIDUAL KPI DASHBOARD */}
      {activeTab === 'kpi-industry' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Factory className="w-4 h-4 text-emerald-700" />
                <span className="text-sm font-bold text-slate-900">
                  Individual Industry KPI Selector ({industryKpis.length} Industries)
                </span>
              </div>
              <select
                value={focusedIndustry?.industryName || ''}
                onChange={(e) => setSelectedIndustryName(e.target.value)}
                className="text-xs border border-slate-300 rounded px-3 py-1.5 bg-white font-semibold"
              >
                {industryKpis.map((ind) => (
                  <option key={ind.id} value={ind.industryName}>
                    {ind.industryName} {ind.isActiveWorkspace ? '(Active Organization)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {focusedIndustry && (
              <div className="space-y-3 pt-1">
                <div className="text-xs text-slate-600">{focusedIndustry.description}</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="border border-slate-200 rounded p-3 bg-slate-50">
                    <div className="text-[11px] text-slate-500">Industry Readiness</div>
                    <div className="text-xl font-bold tabular-nums text-emerald-700">{focusedIndustry.compliancePct}%</div>
                  </div>
                  <div className="border border-slate-200 rounded p-3 bg-slate-50">
                    <div className="text-[11px] text-slate-500">Key Hazards</div>
                    <div className="text-xl font-bold tabular-nums text-slate-900">{focusedIndustry.hazards?.length || 0}</div>
                  </div>
                  <div className="border border-slate-200 rounded p-3 bg-slate-50">
                    <div className="text-[11px] text-slate-500">Permit Types</div>
                    <div className="text-xl font-bold tabular-nums text-slate-900">{focusedIndustry.permitTypes?.length || 0}</div>
                  </div>
                  <div className="border border-slate-200 rounded p-3 bg-slate-50">
                    <div className="text-[11px] text-slate-500">Matched Incidents</div>
                    <div className="text-xl font-bold tabular-nums text-slate-900">{focusedIndustry.relevantIncidents}</div>
                  </div>
                  <div className="border border-slate-200 rounded p-3 bg-slate-50">
                    <div className="text-[11px] text-slate-500">Matched Permits</div>
                    <div className="text-xl font-bold tabular-nums text-slate-900">{focusedIndustry.relevantPermits}</div>
                  </div>
                  <div className="border border-slate-200 rounded p-3 bg-slate-50">
                    <div className="text-[11px] text-slate-500">Matched Risks</div>
                    <div className="text-xl font-bold tabular-nums text-slate-900">{focusedIndustry.relevantRisks}</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="border border-slate-200 rounded p-3">
                    <div className="font-bold text-slate-900 mb-1">Sector Hazards</div>
                    <div className="text-slate-600">{(focusedIndustry.hazards || []).join(' · ') || 'General Industrial'}</div>
                  </div>
                  <div className="border border-slate-200 rounded p-3">
                    <div className="font-bold text-slate-900 mb-1">Mandatory PTW Classes</div>
                    <div className="text-slate-600">{(focusedIndustry.permitTypes || []).join(' · ') || 'Standard PTW'}</div>
                  </div>
                  <div className="border border-slate-200 rounded p-3">
                    <div className="font-bold text-slate-900 mb-1">Regulatory &amp; ISO Scope</div>
                    <div className="text-slate-600">
                      {(focusedIndustry.legalCategories || []).join(' · ')} · {(focusedIndustry.isoStandards || []).join(' · ')}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 font-bold text-sm text-slate-900">
              All Industry Sectors KPI Matrix ({industryKpis.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left tabular-nums">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Industry</th>
                    <th className="px-3 py-2.5 text-right">Readiness %</th>
                    <th className="px-3 py-2.5 text-right">Hazards</th>
                    <th className="px-3 py-2.5 text-right">Permit Types</th>
                    <th className="px-3 py-2.5 text-right">Live Incidents</th>
                    <th className="px-3 py-2.5 text-right">Live Permits</th>
                    <th className="px-3 py-2.5 text-right">Live Risks</th>
                    <th className="px-3 py-2.5 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {industryKpis.map((ind) => (
                    <tr
                      key={ind.id}
                      className={`hover:bg-slate-50 ${ind.industryName === focusedIndustry?.industryName ? 'bg-emerald-50/40' : ''}`}
                    >
                      <td className="px-4 py-2.5 font-semibold text-slate-900">
                        {ind.industryName}
                        {ind.isActiveWorkspace && (
                          <span className="ml-2 text-[10px] font-bold text-emerald-700 uppercase">Active</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-emerald-700">{ind.compliancePct}%</td>
                      <td className="px-3 py-2.5 text-right">{ind.hazards?.length || 0}</td>
                      <td className="px-3 py-2.5 text-right">{ind.permitTypes?.length || 0}</td>
                      <td className="px-3 py-2.5 text-right">{ind.relevantIncidents}</td>
                      <td className="px-3 py-2.5 text-right">{ind.relevantPermits}</td>
                      <td className="px-3 py-2.5 text-right">{ind.relevantRisks}</td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedIndustryName(ind.industryName)}
                          className="text-emerald-700 font-semibold hover:underline cursor-pointer"
                        >
                          Focus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PLANT / SITE INDIVIDUAL KPI DASHBOARD */}
      {activeTab === 'kpi-plant' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-700" />
                <span className="text-sm font-bold text-slate-900">
                  Individual Facility / Plant KPI Scorecard ({plantKpis.length} Sites)
                </span>
              </div>
              <select
                value={focusedPlant?.plantId || ''}
                onChange={(e) => setSelectedPlantId(e.target.value)}
                className="text-xs border border-slate-300 rounded px-3 py-1.5 bg-white font-semibold"
              >
                {plantKpis.map((p) => (
                  <option key={p.plantId} value={p.plantId}>
                    {p.plantName} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            {focusedPlant ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {[
                  { label: 'Site Compliance Index', val: `${focusedPlant.complianceIndex}%` },
                  { label: 'TRIR / LTIFR', val: `${focusedPlant.trir} / ${focusedPlant.ltifr}` },
                  { label: 'Monthly Manhours', val: Number(focusedPlant.manhours || 0).toLocaleString() },
                  { label: 'CAPA Closure %', val: `${focusedPlant.capaClosurePct}%` },
                  { label: 'Audit Avg Score', val: `${focusedPlant.auditScorePct}%` },
                  { label: 'Legal & Equipment', val: `${focusedPlant.legalCompliancePct}% / ${focusedPlant.equipmentPct}%` },
                ].map((c) => (
                  <div key={c.label} className="border border-slate-200 rounded p-3 bg-slate-50">
                    <div className="text-[11px] text-slate-500">{c.label}</div>
                    <div className="text-lg font-bold tabular-nums text-slate-900 mt-0.5">{c.val}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-4">No facilities configured yet.</div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left tabular-nums">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Plant / Code</th>
                    <th className="px-3 py-2.5 text-right">Workforce</th>
                    <th className="px-3 py-2.5 text-right">Manhours</th>
                    <th className="px-3 py-2.5 text-right">TRIR</th>
                    <th className="px-3 py-2.5 text-right">Incidents</th>
                    <th className="px-3 py-2.5 text-right">Open CAPA</th>
                    <th className="px-3 py-2.5 text-right">Active PTW</th>
                    <th className="px-3 py-2.5 text-right">Audit %</th>
                    <th className="px-3 py-2.5 text-right">Index %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {plantKpis.map((p) => (
                    <tr
                      key={p.plantId}
                      onClick={() => setSelectedPlantId(p.plantId)}
                      className={`hover:bg-slate-50 cursor-pointer ${
                        p.plantId === focusedPlant?.plantId ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <td className="px-4 py-2.5 font-semibold text-slate-900">
                        {p.plantName} <span className="text-slate-400 font-mono">({p.code})</span>
                      </td>
                      <td className="px-3 py-2.5 text-right">{p.employees + p.contractors}</td>
                      <td className="px-3 py-2.5 text-right">{Number(p.manhours || 0).toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right">{p.trir}</td>
                      <td className="px-3 py-2.5 text-right">{p.incidentsCount}</td>
                      <td className="px-3 py-2.5 text-right">{p.openCapas}</td>
                      <td className="px-3 py-2.5 text-right">{p.activePermits}</td>
                      <td className="px-3 py-2.5 text-right">{p.auditScorePct}%</td>
                      <td className="px-3 py-2.5 text-right font-bold text-emerald-700">{p.complianceIndex}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INDIVIDUAL MODULE KPI DASHBOARD */}
      {activeTab === 'kpi-module' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-700" />
                <span className="text-sm font-bold text-slate-900">
                  Individual Module KPI Focus ({moduleKpis.length} Core &amp; Custom Modules)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={focusedModule?.id || ''}
                  onChange={(e) => setSelectedModuleId(e.target.value)}
                  className="text-xs border border-slate-300 rounded px-3 py-1.5 bg-white font-semibold"
                >
                  {moduleKpis.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.moduleName} ({m.moduleCode})
                    </option>
                  ))}
                </select>
                {focusedModule && (
                  <button
                    type="button"
                    onClick={() => onNavigate(focusedModule.routeKey, focusedModule.customModuleId)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer"
                  >
                    <span>Open Module</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {focusedModule && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div className="border border-slate-200 rounded p-3 bg-slate-50">
                  <div className="text-[11px] text-slate-500">Total Records</div>
                  <div className="text-xl font-bold tabular-nums text-slate-900">{focusedModule.totalRecords}</div>
                </div>
                <div className="border border-slate-200 rounded p-3 bg-slate-50">
                  <div className="text-[11px] text-slate-500">Open / Actionable</div>
                  <div className="text-xl font-bold tabular-nums text-amber-700">{focusedModule.openOrPending}</div>
                </div>
                <div className="border border-slate-200 rounded p-3 bg-slate-50">
                  <div className="text-[11px] text-slate-500">Compliance Score</div>
                  <div className="text-xl font-bold tabular-nums text-emerald-700">{focusedModule.compliancePct}%</div>
                </div>
                <div className="border border-slate-200 rounded p-3 bg-slate-50">
                  <div className="text-[11px] text-slate-500">{focusedModule.keyMetricLabel}</div>
                  <div className="text-xl font-bold tabular-nums text-slate-900">{focusedModule.keyMetricValue}</div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left tabular-nums">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Code</th>
                    <th className="px-3 py-2.5">Module Name</th>
                    <th className="px-3 py-2.5">Category</th>
                    <th className="px-3 py-2.5 text-right">Records</th>
                    <th className="px-3 py-2.5 text-right">Open</th>
                    <th className="px-3 py-2.5 text-right">Completed</th>
                    <th className="px-3 py-2.5">Key Indicator</th>
                    <th className="px-3 py-2.5 text-right">Compliance %</th>
                    <th className="px-3 py-2.5 text-right">Drill Down</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {moduleKpis.map((m) => (
                    <tr
                      key={m.id}
                      className={`hover:bg-slate-50 ${m.id === focusedModule?.id ? 'bg-emerald-50/40' : ''}`}
                    >
                      <td className="px-4 py-2.5 font-mono text-slate-500">{m.moduleCode}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900">{m.moduleName}</td>
                      <td className="px-3 py-2.5 text-slate-600">{m.category}</td>
                      <td className="px-3 py-2.5 text-right">{m.totalRecords}</td>
                      <td className="px-3 py-2.5 text-right">{m.openOrPending}</td>
                      <td className="px-3 py-2.5 text-right">{m.completedOrCompliant}</td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {m.keyMetricLabel}: <strong className="text-slate-900">{m.keyMetricValue}</strong>
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-emerald-700">{m.compliancePct}%</td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => onNavigate(m.routeKey, m.customModuleId)}
                          className="text-emerald-700 font-semibold hover:underline cursor-pointer"
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DEPARTMENT & INDIVIDUAL OWNER KPI DASHBOARD */}
      {activeTab === 'kpi-individual' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-700" />
                <span className="text-sm font-bold text-slate-900">
                  Individual Person / Safety Owner KPI Focus ({ownerKpis.length} Contributors)
                </span>
              </div>
              <select
                value={focusedOwner?.ownerName || ''}
                onChange={(e) => setSelectedOwnerName(e.target.value)}
                className="text-xs border border-slate-300 rounded px-3 py-1.5 bg-white font-semibold"
              >
                {ownerKpis.map((o) => (
                  <option key={o.ownerName} value={o.ownerName}>
                    {o.ownerName} ({o.designation})
                  </option>
                ))}
              </select>
            </div>

            {focusedOwner && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {[
                  { label: 'Reliability Score', val: `${focusedOwner.reliabilityScore}%` },
                  { label: 'CAPA Closure %', val: `${focusedOwner.capaClosurePct}%` },
                  { label: 'CAPAs (Closed/Total)', val: `${focusedOwner.closedCapas}/${focusedOwner.assignedCapas}` },
                  { label: 'Observations Logged', val: focusedOwner.observationsLogged },
                  { label: 'Permits & Audits', val: `${focusedOwner.permitsManaged} / ${focusedOwner.auditsLed}` },
                  { label: 'Docs & Forms', val: `${focusedOwner.documentsOwned} / ${focusedOwner.submissionsCount}` },
                ].map((c) => (
                  <div key={c.label} className="border border-slate-200 rounded p-3 bg-slate-50">
                    <div className="text-[11px] text-slate-500">{c.label}</div>
                    <div className="text-lg font-bold tabular-nums text-slate-900 mt-0.5">{c.val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Department KPI Matrix */}
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2 font-bold text-sm text-slate-900">
              <Activity className="w-4 h-4 text-emerald-700" />
              <span>Individual Department KPIs ({departmentKpis.length})</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left tabular-nums">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Department</th>
                    <th className="px-3 py-2.5">Plant</th>
                    <th className="px-3 py-2.5">HOD</th>
                    <th className="px-3 py-2.5 text-right">Incidents</th>
                    <th className="px-3 py-2.5 text-right">Open CAPA</th>
                    <th className="px-3 py-2.5 text-right">Observations</th>
                    <th className="px-3 py-2.5 text-right">Permits</th>
                    <th className="px-3 py-2.5 text-right">Score %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departmentKpis.map((d) => (
                    <tr key={d.departmentId} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-semibold text-slate-900">{d.departmentName}</td>
                      <td className="px-3 py-2.5 text-slate-600">{d.plantName}</td>
                      <td className="px-3 py-2.5 text-slate-600">{d.hodName}</td>
                      <td className="px-3 py-2.5 text-right">{d.incidents}</td>
                      <td className="px-3 py-2.5 text-right">{d.openCapas}</td>
                      <td className="px-3 py-2.5 text-right">{d.observations}</td>
                      <td className="px-3 py-2.5 text-right">{d.permits}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-emerald-700">{d.complianceScore}%</td>
                    </tr>
                  ))}
                  {departmentKpis.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                        No departments configured yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Individual Owner Matrix */}
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 font-bold text-sm text-slate-900">
              Individual Person / Champion Leaderboard ({ownerKpis.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left tabular-nums">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Owner / User</th>
                    <th className="px-3 py-2.5">Role</th>
                    <th className="px-3 py-2.5 text-right">CAPAs</th>
                    <th className="px-3 py-2.5 text-right">Obs</th>
                    <th className="px-3 py-2.5 text-right">Permits</th>
                    <th className="px-3 py-2.5 text-right">Audits</th>
                    <th className="px-3 py-2.5 text-right">Docs</th>
                    <th className="px-3 py-2.5 text-right">Reliability %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ownerKpis.map((o) => (
                    <tr
                      key={o.ownerName}
                      onClick={() => setSelectedOwnerName(o.ownerName)}
                      className={`hover:bg-slate-50 cursor-pointer ${
                        o.ownerName === focusedOwner?.ownerName ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <td className="px-4 py-2.5 font-semibold text-slate-900">{o.ownerName}</td>
                      <td className="px-3 py-2.5 text-slate-600">{o.designation}</td>
                      <td className="px-3 py-2.5 text-right">
                        {o.closedCapas}/{o.assignedCapas}
                      </td>
                      <td className="px-3 py-2.5 text-right">{o.observationsLogged}</td>
                      <td className="px-3 py-2.5 text-right">{o.permitsManaged}</td>
                      <td className="px-3 py-2.5 text-right">{o.auditsLed}</td>
                      <td className="px-3 py-2.5 text-right">{o.documentsOwned}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-emerald-700">{o.reliabilityScore}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
