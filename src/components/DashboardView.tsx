import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckSquare,
  Download,
  FileCheck2,
  FileSpreadsheet,
  Filter,
  Info,
  Plus,
  Printer,
  RefreshCw,
  Scale,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { exportKpiSummaryPdf, exportRowsToExcel } from '../lib/pdf';
import { StatusTag } from './IconResolver';

interface DashboardViewProps {
  onNavigate: (routeKey: string, customModuleId?: string | null) => void;
}

type CategoryKey = 'workforce' | 'lagging' | 'leading' | 'actions' | 'permits' | 'compliance';

const CATEGORY_TABS: {
  key: CategoryKey;
  index: string;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    key: 'workforce',
    index: '01',
    label: 'Workforce',
    subtitle: 'Headcount, manhours, contractors, induction & medical fitness',
    icon: Users,
  },
  {
    key: 'lagging',
    index: '02',
    label: 'Lagging Indicators',
    subtitle: 'Incidents, LTI, LTIFR, TRIR, severity rate & event trends',
    icon: ShieldAlert,
  },
  {
    key: 'leading',
    index: '03',
    label: 'Leading Indicators',
    subtitle: 'Proactive safety: inspections, audits, BBS, HIRA 5×5 & drills',
    icon: Activity,
  },
  {
    key: 'actions',
    index: '04',
    label: 'Actions (CAPA)',
    subtitle: '8-status corrective & preventive action closure performance',
    icon: CheckSquare,
  },
  {
    key: 'permits',
    index: '05',
    label: 'Permits (PTW)',
    subtitle: '23 permit types & 3-stage approval pipeline compliance',
    icon: FileCheck2,
  },
  {
    key: 'compliance',
    index: '06',
    label: 'Compliance & ESG',
    subtitle: 'Jurisdiction-configurable legal register, ISO systems & energy/waste',
    icon: Scale,
  },
];

const DONUT_COLORS = [
  '#15803D',
  '#1D4ED8',
  '#D97706',
  '#DC2626',
  '#0D9488',
  '#7C3AED',
  '#64748B',
  '#059669',
];

function complianceColorSet(pct: number) {
  if (pct >= 85) {
    return {
      topBorder: 'border-t-emerald-700',
      text: 'text-emerald-700',
      bar: 'bg-emerald-700',
    };
  }
  if (pct >= 65) {
    return {
      topBorder: 'border-t-amber-500',
      text: 'text-amber-700',
      bar: 'bg-amber-500',
    };
  }
  return {
    topBorder: 'border-t-red-600',
    text: 'text-red-700',
    bar: 'bg-red-600',
  };
}

function SemiGauge({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const radius = 64;
  const cx = 84;
  const cy = 78;
  const circumference = Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 168 96" className="w-40 h-24 overflow-visible">
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
        <text
          x={cx}
          y={cy - 10}
          textAnchor="middle"
          className="fill-slate-900 font-display font-bold"
          style={{ fontSize: '24px' }}
        >
          {clamped}%
        </text>
      </svg>
      <div className="text-xs text-slate-600 -mt-1">{label}</div>
    </div>
  );
}

function riskCellStyle(score: number) {
  if (score > 16) return 'bg-red-500/85 text-white hover:bg-red-600';
  if (score > 9) return 'bg-orange-400/90 text-slate-950 hover:bg-orange-500';
  if (score > 4) return 'bg-amber-200 text-slate-900 hover:bg-amber-300';
  return 'bg-emerald-200/85 text-slate-900 hover:bg-emerald-300';
}

interface KpiCardSpec {
  label: string;
  value: string | number;
  pct: number;
  caption: string;
  tone?: 'neutral' | 'good' | 'warn' | 'danger' | 'blue';
  onClick?: () => void;
}

function KpiMetricCard({ card, loading }: { card: KpiCardSpec; loading: boolean }) {
  const toneMap = {
    neutral: { top: 'border-t-slate-800', val: 'text-slate-900', bar: 'bg-slate-800' },
    good: { top: 'border-t-emerald-700', val: 'text-emerald-700', bar: 'bg-emerald-700' },
    warn: { top: 'border-t-amber-500', val: 'text-amber-700', bar: 'bg-amber-500' },
    danger: { top: 'border-t-red-600', val: 'text-red-700', bar: 'bg-red-600' },
    blue: { top: 'border-t-blue-600', val: 'text-blue-700', bar: 'bg-blue-600' },
  };
  const colors = toneMap[card.tone || 'neutral'];
  const clampedPct = Math.max(0, Math.min(100, Math.round(card.pct)));

  return (
    <div
      onClick={card.onClick}
      className={`bg-white border border-slate-200 border-t-[3px] ${colors.top} rounded-md p-3.5 flex flex-col justify-between ${
        card.onClick ? 'cursor-pointer hover:border-slate-300 transition-colors' : ''
      }`}
    >
      <div>
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500 gap-1">
          <span className="truncate" title={card.label}>
            {card.label}
          </span>
          <span className="tabular-nums text-[10px] font-bold text-slate-400 shrink-0">
            {loading ? '' : `${clampedPct}%`}
          </span>
        </div>
        <div className={`mt-1.5 text-2xl font-display font-bold tabular-nums ${colors.val}`}>
          {loading ? '—' : typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
        </div>
      </div>
      <div className="mt-2.5 space-y-1">
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${colors.bar} rounded-full transition-all duration-300`}
            style={{ width: `${loading ? 0 : Math.max(clampedPct, clampedPct > 0 ? 6 : 0)}%` }}
          />
        </div>
        <div className="text-[11px] text-slate-500 truncate tabular-nums" title={card.caption}>
          {card.caption}
        </div>
      </div>
    </div>
  );
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const { organization, hierarchy, refreshSession } = useAuth();
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('workforce');
  const [plantId, setPlantId] = useState('all');
  const [businessUnitId, setBusinessUnitId] = useState('all');
  const [departmentId, setDepartmentId] = useState('all');
  const [contractorName, setContractorName] = useState('all');
  const [timeframe, setTimeframe] = useState('all');
  const [exposureBase, setExposureBase] = useState<'200000' | '1000000'>('200000');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [clearingSample, setClearingSample] = useState(false);
  const [selectedRiskCell, setSelectedRiskCell] = useState<any | null>(null);

  const loadKpis = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        plantId,
        businessUnitId,
        departmentId,
        contractorName,
        timeframe,
        exposureBase,
      });
      const res = await apiFetch(`/api/dashboard/kpis?${qs.toString()}`);
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [plantId, businessUnitId, departmentId, contractorName, timeframe, exposureBase]);

  useEffect(() => {
    loadKpis();
  }, [loadKpis]);

  useEffect(() => {
    const onDataChanged = () => loadKpis();
    const onFocus = () => loadKpis();
    window.addEventListener('arshiel:data-changed', onDataChanged);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('arshiel:data-changed', onDataChanged);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadKpis]);

  const handleClearSampleData = async () => {
    setClearingSample(true);
    try {
      await apiFetch('/api/organizations/sample-data/clear', { method: 'POST' });
      await refreshSession();
      await loadKpis();
    } finally {
      setClearingSample(false);
    }
  };

  const kpis = data?.kpis || {};
  const six = data?.sixCategories || {};
  const wf = six.workforce || { summary: {}, distribution: [], contractorPerformance: [], trainingByDepartment: [], records: [] };
  const lag = six.lagging || { formulaConfig: {}, summary: {}, incidentsByType: [], incidentVsNearMiss12m: [], departmentEvents: [], records: [] };
  const lead = six.leading || { summary: {}, observationsByType: [], monthlyInspectionScores: [], riskMatrix5x5: [], records: [] };
  const act = six.actions || { summary: {}, byStatus: [], bySource: [], capaByPriority: [], records: [] };
  const ptw = six.permits || { summary: {}, byStatus: [], byType: [], all23Types: [], records: [] };
  const comp = six.compliance || { summary: {}, isoSystems: [], monthlyWaste12m: [], monthlyEnergy12m: [], records: [], jurisdictionNote: '' };

  const filteredDepts =
    plantId === 'all'
      ? hierarchy.departments
      : hierarchy.departments.filter((d) => d.plantId === plantId);

  const activeMeta = CATEGORY_TABS.find((t) => t.key === activeCategory)!;

  const exportCurrentCategoryExcel = () => {
    const mapSummary = (obj: Record<string, any>) =>
      Object.entries(obj || {}).map(([metric, value]) => ({
        Category: activeMeta.label,
        Metric: metric.replace(/([A-Z])/g, ' $1').trim(),
        Value: value ?? 0,
      }));
    const sourceMap: Record<CategoryKey, Record<string, any>> = {
      workforce: wf.summary,
      lagging: lag.summary,
      leading: lead.summary,
      actions: act.summary,
      permits: ptw.summary,
      compliance: comp.summary,
    };
    exportRowsToExcel(mapSummary(sourceMap[activeCategory]), `ARSHIEL-${activeMeta.key.toUpperCase()}-KPIs`);
  };

  const renderBarChart = (title: string, items: { label: string; value: number }[], barColor = 'bg-emerald-700') => {
    const max = Math.max(...(items || []).map((i) => i.value), 1);
    return (
      <div className="bg-white border border-slate-200 rounded-md p-4">
        <h3 className="text-sm font-bold text-slate-900 mb-3">{title}</h3>
        {!items || items.length === 0 ? (
          <div className="text-xs text-slate-400 py-6 text-center">No records in selected filter</div>
        ) : (
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={`${item.label}-${idx}`} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-700 font-medium truncate pr-2">{item.label}</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{item.value}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColor} rounded-full transition-all duration-300`}
                    style={{ width: `${item.value > 0 ? Math.max((item.value / max) * 100, 5) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Category-specific KPI Card Builders (strictly segregated!)
  const workforceCards: KpiCardSpec[] = (() => {
    const s = wf.summary || {};
    const total = Math.max(1, Number(s.totalWorkforce || 0));
    const toneForPct = (p: number) => (p >= 85 ? 'good' : p >= 65 ? 'warn' : 'danger');
    return [
      { label: 'Total Workforce', value: s.totalWorkforce ?? 0, pct: 100, caption: 'Permanent + Contract + Temp', tone: 'neutral' },
      { label: 'Permanent Employees', value: s.permanentEmployees ?? 0, pct: Math.round(((s.permanentEmployees || 0) / total) * 100), caption: 'Direct payroll headcount', tone: 'blue' },
      { label: 'Contract Workforce', value: s.contractWorkforce ?? 0, pct: Math.round(((s.contractWorkforce || 0) / total) * 100), caption: 'Third-party vendor staff', tone: 'neutral', onClick: () => onNavigate('contractors') },
      { label: 'Temporary Workers', value: s.temporaryWorkers ?? 0, pct: Math.round(((s.temporaryWorkers || 0) / total) * 100), caption: 'Short-term / seasonal', tone: 'neutral' },
      { label: 'Site Visitors Logged', value: s.visitorsLogged ?? 0, pct: s.visitorsLogged > 0 ? 100 : 0, caption: 'Gate pass visitor entries', tone: 'blue', onClick: () => onNavigate('gate-entry') },
      { label: 'Total Exposure Manhours', value: s.totalManhours ?? 0, pct: Math.min(100, Math.round(((s.totalManhours || 0) / 200000) * 100)), caption: 'Cumulative hours worked', tone: 'good' },
      { label: 'Manhours Without LTI', value: s.manhoursWithoutLti ?? 0, pct: s.totalManhours > 0 ? Math.round(((s.manhoursWithoutLti || 0) / s.totalManhours) * 100) : 100, caption: 'Safe streak exposure hours', tone: 'good' },
      { label: 'Overtime Hours', value: s.overtimeHours ?? 0, pct: s.totalManhours > 0 ? Math.min(100, Math.round(((s.overtimeHours || 0) / s.totalManhours) * 100)) : 0, caption: 'Fatigue risk monitoring', tone: (s.overtimeHours || 0) > 500 ? 'warn' : 'neutral' },
      { label: 'Avg Daily Strength', value: s.avgDailyStrength ?? 0, pct: Math.round(((s.avgDailyStrength || 0) / total) * 100), caption: 'Estimated daily presence', tone: 'neutral' },
      { label: 'Contractor Compliance %', value: `${s.contractorCompliancePct ?? 100}%`, pct: Number(s.contractorCompliancePct ?? 100), caption: 'Active compliant vendors', tone: toneForPct(Number(s.contractorCompliancePct ?? 100)), onClick: () => onNavigate('contractors') },
      { label: 'Training Coverage %', value: `${s.trainingCoveragePct ?? 100}%`, pct: Number(s.trainingCoveragePct ?? 100), caption: 'Mandatory training completed', tone: toneForPct(Number(s.trainingCoveragePct ?? 100)), onClick: () => onNavigate('training') },
      { label: 'Safety Induction %', value: `${s.inductionCompletionPct ?? 100}%`, pct: Number(s.inductionCompletionPct ?? 100), caption: 'Site safety orientation', tone: toneForPct(Number(s.inductionCompletionPct ?? 100)) },
      { label: 'Medical Fitness %', value: `${s.medicalCompliancePct ?? 100}%`, pct: Number(s.medicalCompliancePct ?? 100), caption: 'Valid fitness certificates', tone: toneForPct(Number(s.medicalCompliancePct ?? 100)) },
      { label: 'PPE Compliance %', value: `${s.ppeCompliancePct ?? 100}%`, pct: Number(s.ppeCompliancePct ?? 100), caption: 'Mandatory PPE stock & issue', tone: toneForPct(Number(s.ppeCompliancePct ?? 100)), onClick: () => onNavigate('ppe-store') },
    ];
  })();

  const laggingCards: KpiCardSpec[] = (() => {
    const s = lag.summary || {};
    const zeroHarm = (v: number): KpiCardSpec['tone'] => (v > 0 ? 'danger' : 'good');
    const warnIfPos = (v: number): KpiCardSpec['tone'] => (v > 0 ? 'warn' : 'good');
    const riskPct = (v: number) => (v === 0 ? 100 : Math.min(100, Math.max(20, v * 20)));
    return [
      { label: 'Fatalities', value: s.fatalities ?? 0, pct: riskPct(s.fatalities || 0), caption: (s.fatalities || 0) === 0 ? 'Zero-harm target met' : 'CRITICAL ALERT', tone: zeroHarm(s.fatalities || 0), onClick: () => onNavigate('incidents') },
      { label: 'Lost Time Injuries (LTI)', value: s.ltiCount ?? 0, pct: riskPct(s.ltiCount || 0), caption: `Last LTI: ${s.lastLtiDate || 'None'}`, tone: zeroHarm(s.ltiCount || 0), onClick: () => onNavigate('incidents') },
      { label: 'LTIFR (per 1M hrs)', value: s.ltifr ?? 0, pct: riskPct(s.ltifr || 0), caption: '(LTI × 1,000,000) / Manhours', tone: zeroHarm(s.ltifr || 0) },
      { label: 'Total Recordable (TRI)', value: s.totalRecordableIncidents ?? 0, pct: riskPct(s.totalRecordableIncidents || 0), caption: 'LTI + MTC + RWC + Fatalities', tone: zeroHarm(s.totalRecordableIncidents || 0), onClick: () => onNavigate('incidents') },
      { label: `TRIR (${exposureBase === '1000000' ? '1M' : '200k'} hrs)`, value: s.configurableTriRate ?? s.trir ?? 0, pct: riskPct(s.configurableTriRate || 0), caption: `Exposure base: ${Number(exposureBase).toLocaleString()} hrs`, tone: zeroHarm(s.configurableTriRate || 0) },
      { label: 'Medical Treatment (MTC)', value: s.mtcCount ?? 0, pct: riskPct(s.mtcCount || 0), caption: 'Recordable medical cases', tone: warnIfPos(s.mtcCount || 0) },
      { label: 'First Aid Cases (FAC)', value: s.firstAidCount ?? 0, pct: riskPct(s.firstAidCount || 0), caption: 'Minor on-site treatment', tone: warnIfPos(s.firstAidCount || 0) },
      { label: 'Restricted Work / DART', value: s.restrictedWorkCases ?? 0, pct: riskPct(s.restrictedWorkCases || 0), caption: 'Days away / restricted transfer', tone: zeroHarm(s.restrictedWorkCases || 0) },
      { label: 'Lost Workdays', value: s.lostWorkdays ?? 0, pct: riskPct(s.lostWorkdays || 0), caption: 'Total mandays lost to injury', tone: zeroHarm(s.lostWorkdays || 0) },
      { label: 'Days Since Last LTI', value: s.daysSinceLastLti ?? 0, pct: Math.min(100, Math.round(((s.daysSinceLastLti || 0) / 365) * 100)), caption: 'Continuous safe days streak', tone: 'good' },
      { label: 'Severity Rate', value: s.severityRate ?? 0, pct: riskPct(s.severityRate || 0), caption: '(Lost Days × 1M) / Manhours', tone: warnIfPos(s.severityRate || 0) },
      { label: 'Property Damage', value: s.propertyDamageCount ?? 0, pct: riskPct(s.propertyDamageCount || 0), caption: 'Asset / structure events', tone: warnIfPos(s.propertyDamageCount || 0) },
      { label: 'Fire Incidents', value: s.fireIncidents ?? 0, pct: riskPct(s.fireIncidents || 0), caption: 'Fire / ignition / smoke', tone: zeroHarm(s.fireIncidents || 0) },
      { label: 'Electrical Incidents', value: s.electricalIncidents ?? 0, pct: riskPct(s.electricalIncidents || 0), caption: 'Shock / arc flash events', tone: zeroHarm(s.electricalIncidents || 0) },
      { label: 'Environmental Incidents', value: s.environmentalIncidents ?? 0, pct: riskPct(s.environmentalIncidents || 0), caption: 'Spill / release events', tone: warnIfPos(s.environmentalIncidents || 0) },
      { label: 'Chemical Spills / Gas', value: s.chemicalSpills ?? 0, pct: riskPct(s.chemicalSpills || 0), caption: 'Hazardous material releases', tone: zeroHarm(s.chemicalSpills || 0) },
      { label: 'Occupational Illness', value: s.occupationalIllness ?? 0, pct: riskPct(s.occupationalIllness || 0), caption: 'Health / ergonomic cases', tone: warnIfPos(s.occupationalIllness || 0) },
      { label: 'Vehicle / Fleet Incidents', value: s.vehicleIncidents ?? 0, pct: riskPct(s.vehicleIncidents || 0), caption: 'Site traffic / forklift', tone: warnIfPos(s.vehicleIncidents || 0) },
      { label: 'High-Potential (HiPo)', value: s.highPotentialIncidents ?? 0, pct: riskPct(s.highPotentialIncidents || 0), caption: 'Critical / High severity', tone: zeroHarm(s.highPotentialIncidents || 0) },
      { label: 'Process Safety Events', value: s.processSafetyEvents ?? 0, pct: riskPct(s.processSafetyEvents || 0), caption: 'PSM / containment loss', tone: zeroHarm(s.processSafetyEvents || 0) },
      { label: 'Contractor Incidents', value: s.contractorIncidents ?? 0, pct: riskPct(s.contractorIncidents || 0), caption: 'Vendor-involved events', tone: warnIfPos(s.contractorIncidents || 0) },
      { label: 'Investigations Completed', value: s.investigationsCompleted ?? 0, pct: (lag.records?.length || 0) > 0 ? Math.round(((s.investigationsCompleted || 0) / lag.records.length) * 100) : 100, caption: `RCA completed: ${s.rcaCompleted ?? 0}`, tone: 'blue' },
    ];
  })();

  const leadingCards: KpiCardSpec[] = (() => {
    const s = lead.summary || {};
    const toneForPct = (p: number) => (p >= 85 ? 'good' : p >= 65 ? 'warn' : 'danger');
    return [
      { label: 'Training Compliance %', value: `${s.trainingCompliancePct ?? 100}%`, pct: Number(s.trainingCompliancePct ?? 100), caption: `${s.trainingsCompleted ?? 0} of ${s.totalTrainings ?? 0} completed`, tone: toneForPct(Number(s.trainingCompliancePct ?? 100)), onClick: () => onNavigate('training') },
      { label: 'Toolbox Talks (TBT)', value: s.toolboxTalksConducted ?? 0, pct: (s.toolboxTalksConducted || 0) > 0 ? 100 : 0, caption: 'Pre-work safety briefings', tone: 'good' },
      { label: 'Inspection Compliance %', value: `${s.inspectionCompliancePct ?? 100}%`, pct: Number(s.inspectionCompliancePct ?? 100), caption: `${s.inspectionsCompleted ?? 0} inspections completed`, tone: toneForPct(Number(s.inspectionCompliancePct ?? 100)), onClick: () => onNavigate('equipment') },
      { label: 'Audit Compliance %', value: `${s.auditCompliancePct ?? 100}%`, pct: Number(s.auditCompliancePct ?? 100), caption: `Closure: ${s.auditClosurePct ?? 100}% (${s.auditsCompleted ?? 0}/${s.totalAudits ?? 0})`, tone: toneForPct(Number(s.auditCompliancePct ?? 100)), onClick: () => onNavigate('audits') },
      { label: 'BBS Observations', value: s.bbsObservations ?? 0, pct: Number(s.observationClosurePct ?? 100), caption: `${s.observationClosurePct ?? 100}% closed`, tone: 'blue', onClick: () => onNavigate('observations') },
      { label: 'Near Miss Reports', value: kpis.nearMissCount ?? 0, pct: (kpis.nearMissCount || 0) > 0 ? 100 : 25, caption: 'Proactive near-miss reporting', tone: 'good', onClick: () => onNavigate('observations') },
      { label: 'Unsafe Acts / Conditions', value: `${kpis.unsafeActs ?? 0} / ${kpis.unsafeConditions ?? 0}`, pct: Number(s.observationClosurePct ?? 100), caption: `${s.hazardsReported ?? 0} total hazards reported`, tone: 'warn', onClick: () => onNavigate('observations') },
      { label: 'HIRA / JSA Completed', value: s.hiraJsaCompleted ?? 0, pct: (s.totalRiskAssessments || 0) > 0 ? Math.round(((s.hiraJsaCompleted || 0) / s.totalRiskAssessments) * 100) : 100, caption: `Of ${s.totalRiskAssessments ?? 0} assessments`, tone: 'good', onClick: () => onNavigate('risk-matrix') },
      { label: 'Mock Drills Conducted', value: s.mockDrillsConducted ?? 0, pct: (s.mockDrillsConducted || 0) > 0 ? 100 : 0, caption: 'Emergency preparedness drills', tone: 'blue', onClick: () => onNavigate('emergency') },
      { label: 'Safety Committee Meetings', value: s.safetyCommitteeMeetings ?? 0, pct: (s.safetyCommitteeMeetings || 0) > 0 ? 100 : 0, caption: 'Joint worker-mgmt reviews', tone: 'neutral', onClick: () => onNavigate('committees') },
      { label: 'LOTO Compliance %', value: `${s.lotoCompliancePct ?? 100}%`, pct: Number(s.lotoCompliancePct ?? 100), caption: 'Zero-energy verifications', tone: toneForPct(Number(s.lotoCompliancePct ?? 100)), onClick: () => onNavigate('loto') },
      { label: 'Equipment Operational %', value: `${s.equipmentOperationalPct ?? 100}%`, pct: Number(s.equipmentOperationalPct ?? 100), caption: 'Inspected safe machinery', tone: toneForPct(Number(s.equipmentOperationalPct ?? 100)), onClick: () => onNavigate('equipment') },
    ];
  })();

  const actionCards: KpiCardSpec[] = (() => {
    const s = act.summary || {};
    const total = Math.max(1, Number(s.totalActions || 0));
    return [
      { label: 'Total CAPA Actions', value: s.totalActions ?? 0, pct: 100, caption: 'All tracked corrective & preventive', tone: 'neutral', onClick: () => onNavigate('incidents') },
      { label: 'CAPA Closure Rate %', value: `${s.capaClosurePct ?? 100}%`, pct: Number(s.capaClosurePct ?? 100), caption: `On-time closure: ${s.onTimeClosurePct ?? 100}%`, tone: Number(s.capaClosurePct ?? 100) >= 85 ? 'good' : 'warn' },
      { label: 'Open', value: s.openActions ?? 0, pct: Math.round(((s.openActions || 0) / total) * 100), caption: 'Awaiting assignment/action', tone: (s.openActions || 0) > 0 ? 'warn' : 'good' },
      { label: 'Assigned', value: s.assignedActions ?? 0, pct: Math.round(((s.assignedActions || 0) / total) * 100), caption: 'Owner notified', tone: 'blue' },
      { label: 'In Progress', value: s.inProgressActions ?? 0, pct: Math.round(((s.inProgressActions || 0) / total) * 100), caption: 'Implementation underway', tone: 'blue' },
      { label: 'Pending Verification', value: s.pendingVerificationActions ?? 0, pct: Math.round(((s.pendingVerificationActions || 0) / total) * 100), caption: 'Awaiting EHS verification', tone: 'warn' },
      { label: 'Closed', value: s.closedActions ?? 0, pct: Math.round(((s.closedActions || 0) / total) * 100), caption: 'Verified & closed', tone: 'good' },
      { label: 'Overdue Actions', value: s.overdueActions ?? 0, pct: (s.overdueActions || 0) === 0 ? 100 : Math.round(((s.overdueActions || 0) / total) * 100), caption: `${s.highPriorityOpen ?? 0} high/critical open`, tone: (s.overdueActions || 0) > 0 ? 'danger' : 'good' },
      { label: 'Rejected', value: s.rejectedActions ?? 0, pct: Math.round(((s.rejectedActions || 0) / total) * 100), caption: 'Evidence rejected', tone: (s.rejectedActions || 0) > 0 ? 'danger' : 'neutral' },
      { label: 'Reopened', value: s.reopenedActions ?? 0, pct: Math.round(((s.reopenedActions || 0) / total) * 100), caption: 'Effectiveness check failed', tone: (s.reopenedActions || 0) > 0 ? 'warn' : 'neutral' },
    ];
  })();

  const permitCards: KpiCardSpec[] = (() => {
    const s = ptw.summary || {};
    const total = Math.max(1, Number(s.totalPermits || 0));
    const pct = Number(s.ptwCompliancePct ?? 100);
    return [
      { label: 'PTW Compliance %', value: `${pct}%`, pct, caption: 'Live auto-updated on permit changes', tone: pct >= 85 ? 'good' : pct >= 65 ? 'warn' : 'danger', onClick: () => onNavigate('ptw') },
      { label: 'Total Permits', value: s.totalPermits ?? 0, pct: 100, caption: 'Across 23 enterprise permit types', tone: 'neutral', onClick: () => onNavigate('ptw') },
      { label: 'Stage 1: Drafts', value: s.draftPermits ?? 0, pct: Math.round(((s.draftPermits || 0) / total) * 100), caption: 'Editable by requester', tone: 'neutral', onClick: () => onNavigate('ptw') },
      { label: 'Stage 2: Pending Dept Head', value: s.pendingDeptHeadPermits ?? 0, pct: Math.round(((s.pendingDeptHeadPermits || 0) / total) * 100), caption: 'Locked · awaiting HOD sign-off', tone: (s.pendingDeptHeadPermits || 0) > 0 ? 'warn' : 'good', onClick: () => onNavigate('ptw') },
      { label: 'Stage 3: Pending Safety', value: s.pendingSafetyPermits ?? 0, pct: Math.round(((s.pendingSafetyPermits || 0) / total) * 100), caption: 'Dept approved · awaiting Safety', tone: (s.pendingSafetyPermits || 0) > 0 ? 'blue' : 'good', onClick: () => onNavigate('ptw') },
      { label: 'Active Permits', value: s.activePermits ?? 0, pct: Math.round(((s.activePermits || 0) / total) * 100), caption: '3-stage fully approved & live', tone: 'good', onClick: () => onNavigate('ptw') },
      { label: 'Suspended', value: s.suspendedPermits ?? 0, pct: Math.round(((s.suspendedPermits || 0) / total) * 100), caption: 'Stop-work triggered by Safety', tone: (s.suspendedPermits || 0) > 0 ? 'warn' : 'neutral', onClick: () => onNavigate('ptw') },
      { label: 'Expired (Not Closed)', value: s.expiredPermits ?? 0, pct: (s.expiredPermits || 0) === 0 ? 100 : Math.round(((s.expiredPermits || 0) / total) * 100), caption: 'Requires Safety revalidate/close', tone: (s.expiredPermits || 0) > 0 ? 'danger' : 'good', onClick: () => onNavigate('ptw') },
      { label: 'Closed Permits', value: s.closedPermits ?? 0, pct: Math.round(((s.closedPermits || 0) / total) * 100), caption: 'Restored & verified by Safety', tone: 'good', onClick: () => onNavigate('ptw') },
      { label: 'High-Risk Permits', value: s.highRiskPermits ?? 0, pct: Math.round(((s.highRiskPermits || 0) / total) * 100), caption: 'Hot / Confined / Height / LOTO', tone: (s.highRiskPermits || 0) > 0 ? 'warn' : 'neutral', onClick: () => onNavigate('ptw') },
      { label: 'Returned / Rejected', value: `${s.returnedPermits ?? 0} / ${s.rejectedPermits ?? 0}`, pct: Math.round((((s.returnedPermits || 0) + (s.rejectedPermits || 0)) / total) * 100), caption: 'Quality gates enforced', tone: 'neutral' },
      { label: 'Permit Violations', value: s.permitViolations ?? 0, pct: (s.permitViolations || 0) === 0 ? 100 : 40, caption: 'PTW-linked unsafe observations', tone: (s.permitViolations || 0) > 0 ? 'danger' : 'good' },
    ];
  })();

  const complianceCards: KpiCardSpec[] = (() => {
    const s = comp.summary || {};
    const legalPct = Number(s.legalCompliancePct ?? 100);
    return [
      { label: 'Legal Compliance %', value: `${legalPct}%`, pct: legalPct, caption: `${s.compliantCount ?? 0} of ${s.totalObligations ?? 0} verified compliant`, tone: legalPct >= 85 ? 'good' : legalPct >= 65 ? 'warn' : 'danger', onClick: () => onNavigate('legal') },
      { label: 'Applicable Obligations', value: s.applicableCount ?? 0, pct: (s.totalObligations || 0) > 0 ? Math.round(((s.applicableCount || 0) / s.totalObligations) * 100) : 0, caption: 'Confirmed applicable to site', tone: 'blue', onClick: () => onNavigate('legal') },
      { label: 'Pending Assessment', value: s.pendingAssessmentCount ?? 0, pct: (s.totalObligations || 0) > 0 ? Math.round(((s.pendingAssessmentCount || 0) / s.totalObligations) * 100) : 0, caption: 'Awaiting EHS/Legal applicability review', tone: (s.pendingAssessmentCount || 0) > 0 ? 'warn' : 'good', onClick: () => onNavigate('legal') },
      { label: 'Overdue Legal', value: s.overdueCount ?? 0, pct: (s.overdueCount || 0) === 0 ? 100 : 30, caption: `${s.expiringWithin30Days ?? 0} expiring within 30 days`, tone: (s.overdueCount || 0) > 0 ? 'danger' : 'good', onClick: () => onNavigate('legal') },
      { label: 'Waste Generated', value: `${s.wasteGeneratedTonnes ?? 0} t`, pct: 75, caption: `${s.hazardousWasteTonnes ?? 0} t hazardous waste`, tone: 'good', onClick: () => onNavigate('environment') },
      { label: 'Electricity Used', value: `${Number(s.electricityMwh ?? 0).toLocaleString()} MWh`, pct: 70, caption: 'Tracked ISO 50001 energy', tone: 'blue', onClick: () => onNavigate('environment') },
      { label: 'Water Consumption', value: `${Number(s.waterKl ?? 0).toLocaleString()} kL`, pct: 65, caption: 'Industrial water intake', tone: 'blue', onClick: () => onNavigate('environment') },
      { label: 'GHG Emissions', value: `${Number(s.ghgEmissionsTco2e ?? 0).toLocaleString()} tCO2e`, pct: 80, caption: 'Scope 1 & Scope 2 total', tone: 'neutral', onClick: () => onNavigate('environment') },
    ];
  })();

  // Chart data helpers
  const trend12m: { month: string; label: string; incidents: number; nearMisses: number }[] = lag.incidentVsNearMiss12m || [];
  const maxTrendVal = Math.max(4, ...trend12m.map((t) => Math.max(t.incidents, t.nearMisses)));
  const incidentCategories: { label: string; value: number }[] = lag.incidentsByType || [];
  const totalIncidentsDonut = incidentCategories.reduce((s, x) => s + x.value, 0);
  const deptEvents: { departmentName: string; events: number }[] = lag.departmentEvents || [];
  const maxDeptEvents = Math.max(1, ...deptEvents.map((d) => d.events));

  const riskMatrix5x5: any[] = lead.riskMatrix5x5 || [];
  const monthlyScores: { month: string; label: string; score: number }[] = lead.monthlyInspectionScores || [];

  const capaByPriority: { priority: string; closed: number; openOnTrack: number; overdue: number; total: number }[] = act.capaByPriority || [];
  const maxCapaBar = Math.max(1, ...capaByPriority.map((c) => c.total));

  const monthlyWaste12m: { month: string; label: string; tonnes: number }[] = comp.monthlyWaste12m || [];
  const maxWasteTonnes = Math.max(1, ...monthlyWaste12m.map((m) => m.tonnes));
  const monthlyEnergy12m: { month: string; label: string; mwh: number }[] = comp.monthlyEnergy12m || [];
  const maxEnergyMwh = Math.max(10, ...monthlyEnergy12m.map((m) => m.mwh));

  return (
    <div className="space-y-5">
      {/* Global Command Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            Enterprise EHS Command Dashboard · 6-Category KPI Architecture
          </h1>
          <p className="text-sm text-slate-500">
            Live PostgreSQL metrics across {hierarchy.plants.length} facility(ies) · {organization?.industry} · Strictly segregated KPI sections
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={loadKpis}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('incidents')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Report Incident</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('ptw')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Issue Permit</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('observations')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>AI Observation</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('master-kpi')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Master KPI Hub</span>
          </button>
        </div>
      </div>

      {/* Sample Data Banner */}
      {data?.hasSampleData && (
        <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-start sm:items-center gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <div>
              <span className="font-bold uppercase tracking-wide mr-1.5">SAMPLE DATA ACTIVE:</span>
              <span>Your workspace includes clearly-marked evaluation records so you can test workflows immediately.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearSampleData}
            disabled={clearingSample}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 rounded shrink-0 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{clearingSample ? 'Removing...' : 'Clear Sample Data'}</span>
          </button>
        </div>
      )}

      {/* Global Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-md p-3 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Filter className="w-3.5 h-3.5" />
            <span>Scope:</span>
          </div>
          <select
            value={businessUnitId}
            onChange={(e) => setBusinessUnitId(e.target.value)}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
          >
            <option value="all">All Business Units ({hierarchy.businessUnits?.length || 0})</option>
            {(hierarchy.businessUnits || []).map((bu) => (
              <option key={bu.id} value={bu.id}>
                {bu.name}
              </option>
            ))}
          </select>

          <select
            value={plantId}
            onChange={(e) => {
              setPlantId(e.target.value);
              setDepartmentId('all');
            }}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
          >
            <option value="all">All Plants / Sites ({hierarchy.plants.length})</option>
            {hierarchy.plants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
          >
            <option value="all">All Departments</option>
            {filteredDepts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={contractorName}
            onChange={(e) => setContractorName(e.target.value)}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
          >
            <option value="all">All Contractors</option>
            {(data?.contractorsList || []).map((c: string, idx: number) => (
              <option key={`contractor-${c}-${idx}`} value={c}>
                {c}
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

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
          <button
            type="button"
            onClick={() => exportKpiSummaryPdf(kpis, organization)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
          <button
            type="button"
            onClick={exportCurrentCategoryExcel}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel ({activeMeta.label})</span>
          </button>
        </div>
      </div>

      {/* SIX SEPARATE DEDICATED KPI CATEGORY SELECTOR */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 print:hidden">
        {CATEGORY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveCategory(tab.key)}
              className={`text-left p-3 rounded-md border transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-[10px] font-bold tracking-wider uppercase ${
                    isActive ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  Category {tab.index}
                </span>
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-emerald-700'}`} />
              </div>
              <div className="font-display font-bold text-sm leading-tight">{tab.label}</div>
              <div
                className={`text-[10px] mt-1 line-clamp-2 ${
                  isActive ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                {tab.subtitle}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Category Banner */}
      <div className="bg-white border border-slate-200 border-l-4 border-l-emerald-700 rounded-md px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            Dedicated KPI Category {activeMeta.index} of 06
          </div>
          <h2 className="font-display text-lg font-bold text-slate-900">{activeMeta.label}</h2>
          <p className="text-xs text-slate-500">{activeMeta.subtitle}</p>
        </div>

        {activeCategory === 'lagging' && (
          <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded px-3 py-1.5">
            <span className="font-semibold text-slate-700">Exposure Base:</span>
            <button
              type="button"
              onClick={() => setExposureBase('200000')}
              className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                exposureBase === '200000' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              200,000 hrs (OSHA)
            </button>
            <button
              type="button"
              onClick={() => setExposureBase('1000000')}
              className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                exposureBase === '1000000' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              1,000,000 hrs (ISO/ILO)
            </button>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* CATEGORY 01: WORKFORCE                                               */}
      {/* ==================================================================== */}
      {activeCategory === 'workforce' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3">
            {workforceCards.map((c) => (
              <KpiMetricCard key={c.label} card={c} loading={loading} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {renderBarChart('Workforce Headcount Composition', wf.distribution || [], 'bg-slate-900')}
            {renderBarChart(
              'Contractor Safety Evaluation Score (%)',
              (wf.contractorPerformance || []).map((c: any) => ({
                label: c.companyName,
                value: c.evaluationScore ?? 0,
              })),
              'bg-emerald-700'
            )}
            <div className="bg-white border border-slate-200 rounded-md p-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Training Coverage by Department</h3>
              <div className="space-y-2.5">
                {(wf.trainingByDepartment || []).map((dept: any) => {
                  const colors = complianceColorSet(dept.pct);
                  return (
                    <div key={dept.departmentName} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-700 truncate">{dept.departmentName}</span>
                        <span className={`font-bold tabular-nums ${colors.text}`}>{dept.pct}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${colors.bar} rounded-full`} style={{ width: `${dept.pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {(!wf.trainingByDepartment || wf.trainingByDepartment.length === 0) && (
                  <div className="text-xs text-slate-400 py-6 text-center">No department training records</div>
                )}
              </div>
            </div>
          </div>

          {/* Workforce Drill-Down Table */}
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Workforce &amp; Contractor Personnel Roster</h3>
              <button
                type="button"
                onClick={() => onNavigate('contractors')}
                className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
              >
                Manage Contractors &amp; Workers →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-2">Worker Name</th>
                    <th className="px-3 py-2">Trade / Skill</th>
                    <th className="px-3 py-2">Induction Date</th>
                    <th className="px-3 py-2">Medical Fitness</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(wf.records || []).slice(0, 12).map((w: any) => (
                    <tr key={w.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-semibold text-slate-900">{w.workerName}</td>
                      <td className="px-3 py-2.5 text-slate-600">{w.tradeSkill || 'General'}</td>
                      <td className="px-3 py-2.5 tabular-nums">{w.inductionDate || 'Pending'}</td>
                      <td className="px-3 py-2.5 tabular-nums">{w.medicalFitnessDate || 'Pending'}</td>
                      <td className="px-3 py-2.5"><StatusTag status={w.status || 'Active'} /></td>
                    </tr>
                  ))}
                  {(!wf.records || wf.records.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                        Headcount aggregated from facility workforce configuration ({wf.summary?.totalWorkforce ?? 0} total).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* CATEGORY 02: LAGGING INDICATORS                                      */}
      {/* ==================================================================== */}
      {activeCategory === 'lagging' && (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-[11px] text-slate-600 flex flex-wrap gap-x-6 gap-y-1 tabular-nums">
            <span><strong>LTIFR:</strong> {lag.formulaConfig?.ltifrFormula}</span>
            <span><strong>TRIR:</strong> {lag.formulaConfig?.trirFormula}</span>
            <span><strong>Severity:</strong> {lag.formulaConfig?.severityFormula}</span>
            <span><strong>Exposure:</strong> {Number(lag.formulaConfig?.totalManhours || 0).toLocaleString()} hrs</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
            {laggingCards.map((c) => (
              <KpiMetricCard key={c.label} card={c} loading={loading} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 12-Month Incident vs Near Miss Trend */}
            <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-col justify-between">
              <h3 className="text-sm font-bold text-slate-900 mb-3">12-Month Incident vs Near Miss Trend</h3>
              <svg viewBox="0 0 360 170" className="w-full h-44">
                {[0, 0.25, 0.5, 0.75, 1].map((frac, idx) => {
                  const y = 140 - frac * 115;
                  return (
                    <g key={idx}>
                      <line x1="28" y1={y} x2="350" y2={y} stroke="#E2E8F0" strokeWidth="1" />
                      <text x="22" y={y + 3} textAnchor="end" className="fill-slate-400" style={{ fontSize: '9px' }}>
                        {Math.round(maxTrendVal * frac)}
                      </text>
                    </g>
                  );
                })}
                {trend12m.length > 1 && (
                  <>
                    <polyline
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth="2"
                      points={trend12m
                        .map((pt, i) => `${36 + (i / (trend12m.length - 1)) * 306},${140 - (pt.nearMisses / maxTrendVal) * 115}`)
                        .join(' ')}
                    />
                    <polyline
                      fill="none"
                      stroke="#DC2626"
                      strokeWidth="2"
                      points={trend12m
                        .map((pt, i) => `${36 + (i / (trend12m.length - 1)) * 306},${140 - (pt.incidents / maxTrendVal) * 115}`)
                        .join(' ')}
                    />
                    {trend12m.map((pt, i) => {
                      const x = 36 + (i / (trend12m.length - 1)) * 306;
                      return (
                        <g key={pt.month}>
                          <circle cx={x} cy={140 - (pt.nearMisses / maxTrendVal) * 115} r="3" fill="#2563EB">
                            <title>{`${pt.label}: ${pt.nearMisses} Near Miss(es)`}</title>
                          </circle>
                          <circle cx={x} cy={140 - (pt.incidents / maxTrendVal) * 115} r="3" fill="#DC2626">
                            <title>{`${pt.label}: ${pt.incidents} Incident(s)`}</title>
                          </circle>
                          <text x={x} y="156" textAnchor="middle" className="fill-slate-500" style={{ fontSize: '6.5px' }}>
                            {pt.label}
                          </text>
                        </g>
                      );
                    })}
                  </>
                )}
              </svg>
              <div className="flex items-center gap-4 text-xs text-slate-600 mt-2">
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-600 inline-block" /> Incidents</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" /> Near Misses</span>
              </div>
            </div>

            {/* Incident Category Donut */}
            <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-col justify-between">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Incident Category Breakdown</h3>
              <div className="flex flex-col sm:flex-row items-center gap-4 my-auto">
                <div className="relative w-36 h-36 shrink-0">
                  <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                    <circle cx="60" cy="60" r="44" fill="none" stroke="#E2E8F0" strokeWidth="18" />
                    {totalIncidentsDonut > 0 &&
                      (() => {
                        const circ = 2 * Math.PI * 44;
                        let offset = 0;
                        return incidentCategories.map((cat, idx) => {
                          const segLen = (cat.value / totalIncidentsDonut) * circ;
                          const cur = offset;
                          offset += segLen;
                          return (
                            <circle
                              key={`${cat.label}-${idx}`}
                              cx="60"
                              cy="60"
                              r="44"
                              fill="none"
                              stroke={DONUT_COLORS[idx % DONUT_COLORS.length]}
                              strokeWidth="18"
                              strokeDasharray={`${segLen} ${circ - segLen}`}
                              strokeDashoffset={-cur}
                            />
                          );
                        });
                      })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <div className="font-display font-bold text-2xl text-slate-900 tabular-nums leading-none">
                      {totalIncidentsDonut}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">incidents</div>
                  </div>
                </div>
                <div className="flex-1 w-full space-y-1.5 text-xs">
                  {incidentCategories.slice(0, 7).map((cat, idx) => (
                    <div key={`${cat.label}-${idx}`} className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 truncate text-slate-700">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }}
                        />
                        <span className="truncate">{cat.label}</span>
                      </span>
                      <span className="font-bold text-slate-900 tabular-nums">{cat.value}</span>
                    </div>
                  ))}
                  {incidentCategories.length === 0 && <div className="text-slate-400">Zero incidents logged</div>}
                </div>
              </div>
            </div>

            {/* Department-Wise Safety Events */}
            <div className="bg-white border border-slate-200 rounded-md p-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Department-Wise Safety Events</h3>
              <div className="space-y-2.5">
                {deptEvents.map((d) => (
                  <div key={d.departmentName} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 font-medium truncate">{d.departmentName}</span>
                      <span className="font-bold text-slate-900 tabular-nums">{d.events}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-600 rounded-full"
                        style={{ width: `${Math.max((d.events / maxDeptEvents) * 100, d.events > 0 ? 8 : 0)}%` }}
                      />
                    </div>
                  </div>
                ))}
                {deptEvents.length === 0 && <div className="text-xs text-slate-400 py-6 text-center">No events recorded</div>}
              </div>
            </div>
          </div>

          {/* Incidents Drill-Down Table */}
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Incident Register Drill-Down</h3>
              <button type="button" onClick={() => onNavigate('incidents')} className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer">
                Open Full Incident &amp; RCA Module →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-2">Incident #</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Severity</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(lag.records || []).slice(0, 12).map((inc: any) => (
                    <tr key={inc.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-semibold text-slate-900">{inc.incidentNumber}</td>
                      <td className="px-3 py-2.5 text-slate-700">{inc.incidentType}</td>
                      <td className="px-3 py-2.5 text-slate-800 max-w-xs truncate">{inc.title}</td>
                      <td className="px-3 py-2.5"><StatusTag status={inc.severity} /></td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-600">{inc.incidentDate}</td>
                      <td className="px-3 py-2.5"><StatusTag status={inc.status} /></td>
                    </tr>
                  ))}
                  {(!lag.records || lag.records.length === 0) && (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No incidents in selected filter</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* CATEGORY 03: LEADING INDICATORS                                      */}
      {/* ==================================================================== */}
      {activeCategory === 'leading' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
            {leadingCards.map((c) => (
              <KpiMetricCard key={c.label} card={c} loading={loading} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Interactive 5x5 Risk Matrix */}
            <div className="bg-white border border-slate-200 rounded-md p-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3">
                5&times;5 Risk Matrix (Open Hazards + Active Risk Assessments)
              </h3>
              <div className="space-y-1">
                {[5, 4, 3, 2, 1].map((l) => (
                  <div key={`L${l}`} className="grid grid-cols-6 gap-1 items-center">
                    <div className="text-[11px] font-semibold text-slate-500 text-right pr-1.5">L{l}</div>
                    {[1, 2, 3, 4, 5].map((s) => {
                      const cell = riskMatrix5x5.find((c) => c.likelihood === l && c.severity === s) || {
                        likelihood: l,
                        severity: s,
                        score: l * s,
                        count: 0,
                        items: [],
                      };
                      return (
                        <button
                          key={`L${l}S${s}`}
                          type="button"
                          onClick={() => setSelectedRiskCell(cell)}
                          className={`h-9 rounded text-xs font-bold tabular-nums transition-colors cursor-pointer ${riskCellStyle(
                            cell.score
                          )}`}
                        >
                          {cell.count > 0 ? cell.count : ''}
                        </button>
                      );
                    })}
                  </div>
                ))}
                <div className="grid grid-cols-6 gap-1 pt-0.5 text-[11px] font-semibold text-slate-500 text-center">
                  <div /><div>S1</div><div>S2</div><div>S3</div><div>S4</div><div>S5</div>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 mt-2">
                Click any cell to inspect open hazards &amp; risk assessments in that band.
              </div>
            </div>

            {/* Semi-Gauges: Audit & Inspection Score */}
            <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-col justify-between">
              <h3 className="text-sm font-bold text-slate-900 mb-2">Audit &amp; Inspection Readiness Gauges</h3>
              <div className="grid grid-cols-2 gap-2 my-auto">
                <SemiGauge value={Number(lead.summary?.auditCompliancePct ?? 100)} label="Audit Score" color="#15803D" />
                <SemiGauge value={Number(lead.summary?.inspectionCompliancePct ?? 100)} label="Inspection %" color="#1D4ED8" />
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Last 12-Month Avg:</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {monthlyScores.length > 0
                    ? `${Math.round(monthlyScores.reduce((s, m) => s + m.score, 0) / monthlyScores.length)}%`
                    : '—'}
                </span>
              </div>
            </div>

            {renderBarChart('Proactive Observations by Type', lead.observationsByType || [], 'bg-emerald-700')}
          </div>

          {/* Observations Drill-Down Table */}
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Safety Observations &amp; Hazard Reporting Register</h3>
              <button type="button" onClick={() => onNavigate('observations')} className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer">
                Open Safety Observations Module →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-2">Obs #</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Severity</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(lead.records || []).slice(0, 12).map((o: any) => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-semibold text-slate-900">{o.observationNumber}</td>
                      <td className="px-3 py-2.5 text-slate-700">{o.observationType}</td>
                      <td className="px-3 py-2.5 text-slate-800 max-w-xs truncate">{o.title}</td>
                      <td className="px-3 py-2.5"><StatusTag status={o.severity} /></td>
                      <td className="px-3 py-2.5"><StatusTag status={o.status} /></td>
                    </tr>
                  ))}
                  {(!lead.records || lead.records.length === 0) && (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No observations logged</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* CATEGORY 04: ACTIONS (CAPA)                                          */}
      {/* ==================================================================== */}
      {activeCategory === 'actions' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {actionCards.map((c) => (
              <KpiMetricCard key={c.label} card={c} loading={loading} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* CAPA Closure by Priority */}
            <div className="bg-white border border-slate-200 rounded-md p-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3">CAPA Closure Performance by Priority</h3>
              <div className="space-y-3">
                {capaByPriority.map((row) => (
                  <div key={row.priority} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800">{row.priority}</span>
                      <span className="text-slate-500 tabular-nums">
                        {row.closed} closed · {row.openOnTrack} open · {row.overdue} overdue
                      </span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
                      <div className="bg-emerald-600 h-full" style={{ width: `${(row.closed / maxCapaBar) * 100}%` }} />
                      <div className="bg-amber-400 h-full" style={{ width: `${(row.openOnTrack / maxCapaBar) * 100}%` }} />
                      <div className="bg-red-600 h-full" style={{ width: `${(row.overdue / maxCapaBar) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-600 mt-3">
                <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block" /> Closed</span>
                <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> On Track</span>
                <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-600 inline-block" /> Overdue</span>
              </div>
            </div>

            {renderBarChart('Actions Across All 8 Workflow Statuses', act.byStatus || [], 'bg-slate-900')}
            {renderBarChart('Actions by Origin Source', act.bySource || [], 'bg-blue-600')}
          </div>

          {/* CAPA Drill-Down Table */}
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Action Tracker &amp; CAPA Verification Table</h3>
              <button type="button" onClick={() => onNavigate('incidents')} className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer">
                Manage CAPAs →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-2">CAPA #</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Priority</th>
                    <th className="px-3 py-2">Responsible Owner</th>
                    <th className="px-3 py-2">Target Date</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(act.records || []).slice(0, 15).map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-semibold text-slate-900">{c.actionNumber}</td>
                      <td className="px-3 py-2.5 text-slate-800 max-w-xs truncate">{c.title}</td>
                      <td className="px-3 py-2.5"><StatusTag status={c.priority} /></td>
                      <td className="px-3 py-2.5 text-slate-700">{c.responsiblePerson}</td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-600">{c.targetDate}</td>
                      <td className="px-3 py-2.5"><StatusTag status={c.status} /></td>
                    </tr>
                  ))}
                  {(!act.records || act.records.length === 0) && (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No CAPAs logged</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* CATEGORY 05: PERMITS (PTW — 23 TYPES & 3-STAGE PIPELINE)             */}
      {/* ==================================================================== */}
      {activeCategory === 'permits' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
            {permitCards.map((c) => (
              <KpiMetricCard key={c.label} card={c} loading={loading} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {renderBarChart('Permits by 3-Stage Lifecycle Status', ptw.byStatus || [], 'bg-emerald-700')}

            {/* All 23 Permit Types Matrix */}
            <div className="bg-white border border-slate-200 rounded-md p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">All 23 Enterprise Permit Types Volume</h3>
                <button type="button" onClick={() => onNavigate('ptw')} className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer">
                  Open PTW Module →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1 text-xs">
                {(ptw.byType || []).map((pt: { label: string; value: number }) => (
                  <div
                    key={pt.label}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded border ${
                      pt.value > 0 ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <span className="truncate text-slate-800 pr-2">{pt.label}</span>
                    <span className={`font-bold tabular-nums ${pt.value > 0 ? 'text-emerald-800' : 'text-slate-400'}`}>
                      {pt.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Permits Drill-Down Table */}
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Active &amp; Recent Permits Register (Auto-Synced)</h3>
              <button type="button" onClick={() => onNavigate('ptw')} className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer">
                Manage 3-Stage PTW Approvals →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-2">Permit #</th>
                    <th className="px-3 py-2">Permit Type</th>
                    <th className="px-3 py-2">Location</th>
                    <th className="px-3 py-2">Requester</th>
                    <th className="px-3 py-2">Validity</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(ptw.records || []).slice(0, 15).map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => onNavigate('ptw')}>
                      <td className="px-4 py-2.5 font-semibold text-slate-900">{p.permitNumber}</td>
                      <td className="px-3 py-2.5 text-slate-800">{p.permitType}</td>
                      <td className="px-3 py-2.5 text-slate-600">{p.workLocation}</td>
                      <td className="px-3 py-2.5 text-slate-600">{p.applicantName}</td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-500">{p.endDate?.replace('T', ' ')}</td>
                      <td className="px-3 py-2.5"><StatusTag status={p.status} /></td>
                    </tr>
                  ))}
                  {(!ptw.records || ptw.records.length === 0) && (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No work permits recorded</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* CATEGORY 06: COMPLIANCE & ESG                                        */}
      {/* ==================================================================== */}
      {activeCategory === 'compliance' && (
        <div className="space-y-4">
          {comp.jurisdictionNote && (
            <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-2.5 flex items-start gap-2 text-xs text-blue-950">
              <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <span>{comp.jurisdictionNote}</span>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {complianceCards.map((c) => (
              <KpiMetricCard key={c.label} card={c} loading={loading} />
            ))}
          </div>

          {/* ISO Management Systems Readiness */}
          <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">ISO &amp; International Management Systems Readiness</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(comp.isoSystems || []).map((iso: any) => {
                const colors = complianceColorSet(iso.score || 0);
                return (
                  <div key={iso.code} className="border border-slate-200 rounded p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{iso.code}</span>
                      <span className={`font-bold tabular-nums ${colors.text}`}>{iso.score}%</span>
                    </div>
                    <div className="text-xs text-slate-600">{iso.name}</div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${colors.bar}`} style={{ width: `${Math.max(4, iso.score || 0)}%` }} />
                    </div>
                    <div className="text-[11px] text-slate-500">{iso.status}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Waste & Energy 12-Month Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-md p-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3">12-Month Waste Generation (Tonnes)</h3>
              <div className="grid grid-cols-12 gap-1.5 items-end h-32 pt-2">
                {monthlyWaste12m.map((m) => (
                  <div key={m.month} className="flex flex-col items-center justify-end h-full">
                    <div
                      className="w-full bg-emerald-700 rounded-t"
                      style={{ height: `${Math.max((m.tonnes / maxWasteTonnes) * 100, m.tonnes > 0 ? 8 : 2)}%` }}
                      title={`${m.label}: ${m.tonnes} t`}
                    />
                    <span className="text-[9px] text-slate-500 mt-1 truncate">{m.label.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-md p-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3">12-Month Electricity Consumption (MWh)</h3>
              <div className="grid grid-cols-12 gap-1.5 items-end h-32 pt-2">
                {monthlyEnergy12m.map((m) => (
                  <div key={m.month} className="flex flex-col items-center justify-end h-full">
                    <div
                      className="w-full bg-blue-600 rounded-t"
                      style={{ height: `${Math.max((m.mwh / maxEnergyMwh) * 100, m.mwh > 0 ? 8 : 2)}%` }}
                      title={`${m.label}: ${m.mwh} MWh`}
                    />
                    <span className="text-[9px] text-slate-500 mt-1 truncate">{m.label.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legal Register Drill-Down Table */}
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Jurisdiction-Configurable Legal &amp; Statutory Register</h3>
              <button type="button" onClick={() => onNavigate('legal')} className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer">
                Open Legal Compliance Register →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-2">Act / Standard</th>
                    <th className="px-3 py-2">Jurisdiction</th>
                    <th className="px-3 py-2">Applicability</th>
                    <th className="px-3 py-2">Due Date</th>
                    <th className="px-3 py-2">Compliance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(comp.records || []).slice(0, 15).map((l: any) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-semibold text-slate-900">{l.actName}</td>
                      <td className="px-3 py-2.5 text-slate-600">{l.jurisdiction || l.country || 'Configurable'}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            l.applicability === 'Applicable'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {l.applicability || 'Pending Assessment'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-600">{l.dueDate || '—'}</td>
                      <td className="px-3 py-2.5"><StatusTag status={l.complianceStatus} /></td>
                    </tr>
                  ))}
                  {(!comp.records || comp.records.length === 0) && (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No legal obligations configured yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5x5 Risk Cell Drill-Down Modal */}
      {selectedRiskCell && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-lg w-full p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="font-display font-bold text-base text-slate-900">
                Risk Matrix Band L{selectedRiskCell.likelihood} &times; S{selectedRiskCell.severity} (Score {selectedRiskCell.score})
              </h3>
              <button type="button" onClick={() => setSelectedRiskCell(null)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto text-xs">
              {(selectedRiskCell.items || []).length === 0 ? (
                <div className="text-slate-400 py-4 text-center">No open hazards or active risks in this cell.</div>
              ) : (
                selectedRiskCell.items.map((item: any) => (
                  <div key={item.id} className="border border-slate-200 rounded p-2.5 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{item.title}</span>
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                        {item.source}
                      </span>
                    </div>
                    {item.hazard && <div className="text-slate-600 mt-1">{item.hazard}</div>}
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setSelectedRiskCell(null);
                  onNavigate('risk-matrix');
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer"
              >
                Open Risk Matrix Module
              </button>
              <button
                type="button"
                onClick={() => setSelectedRiskCell(null)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
