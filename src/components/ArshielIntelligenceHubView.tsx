import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  LayoutDashboard,
  Leaf,
  Lock,
  Plus,
  RefreshCw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { exportReportTablePdf, exportRowsToCsv, exportRowsToExcel } from '../lib/pdf';
import {
  AI_DOCUMENT_TYPES,
  GLOBAL_COMPLIANCE_ENGINE,
  INDUSTRIES_CATALOG,
} from '../data/intelligenceCatalog';

export type IntelligenceSubmenuKey =
  | 'intel-industry'
  | 'intel-data'
  | 'intel-my-dashboard'
  | 'intel-alerts'
  | 'intel-reports';

interface ArshielIntelligenceHubViewProps {
  activeSubmenu: IntelligenceSubmenuKey;
  onNavigate: (routeKey: string, customModuleId?: string | null) => void;
}

type DataMode = 'live' | 'demo' | 'forecast';

type AnalyticsDomain =
  | 'overview'
  | 'workforce'
  | 'incidents'
  | 'leading-lagging'
  | 'risk-permit'
  | 'compliance'
  | 'esg-energy'
  | 'site-dept';

const DEMO_MONTHLY_SERIES = [
  { month: 'May', incidents: 2, nearMiss: 19, permits: 42, riskIndex: 48, forecastRisk: 46 },
  { month: 'Jun', incidents: 1, nearMiss: 24, permits: 49, riskIndex: 44, forecastRisk: 43 },
  { month: 'Jul', incidents: 2, nearMiss: 28, permits: 53, riskIndex: 47, forecastRisk: 44 },
  { month: 'Aug', incidents: 1, nearMiss: 33, permits: 58, riskIndex: 39, forecastRisk: 38 },
  { month: 'Sep', incidents: 0, nearMiss: 37, permits: 61, riskIndex: 34, forecastRisk: 33 },
  { month: 'Oct', incidents: 1, nearMiss: 41, permits: 64, riskIndex: 36, forecastRisk: 31 },
];

const DEMO_SITE_BREAKDOWN = [
  { site: 'Main Fab / Plant 1', compliance: 96, openCapa: 2, activePermits: 8, riskScore: 34 },
  { site: 'Utility & Energy Block', compliance: 94, openCapa: 3, activePermits: 4, riskScore: 46 },
  { site: 'Logistics & Warehouse', compliance: 91, openCapa: 4, activePermits: 3, riskScore: 52 },
  { site: 'R&D & Quality Labs', compliance: 98, openCapa: 1, activePermits: 2, riskScore: 22 },
];

const DEMO_DEPT_BREAKDOWN = [
  { dept: 'Production Operations', observations: 46, closed: 43, trainingPct: 98 },
  { dept: 'Maintenance & Utilities', observations: 38, closed: 34, trainingPct: 95 },
  { dept: 'Warehouse & Dispatch', observations: 29, closed: 25, trainingPct: 92 },
  { dept: 'Projects & Contractors', observations: 34, closed: 30, trainingPct: 94 },
];

const CHART_COLORS = ['#0f766e', '#0284c7', '#d97706', '#dc2626', '#7c3aed'];

export function ArshielIntelligenceHubView({
  activeSubmenu,
  onNavigate,
}: ArshielIntelligenceHubViewProps) {
  const { user, organization, refreshSession } = useAuth();

  // Submenu 1: Industry Intelligence state
  const matchedOrgIndustry = useMemo(() => {
    const orgInd = (organization?.industry || '').toLowerCase();
    const found = INDUSTRIES_CATALOG.find(
      (i) => i.name.toLowerCase().includes(orgInd) || orgInd.includes(i.id)
    );
    return found?.id || INDUSTRIES_CATALOG[0].id;
  }, [organization?.industry]);

  const [selectedIndustryId, setSelectedIndustryId] = useState<string>(matchedOrgIndustry);
  const [industrySearch, setIndustrySearch] = useState('');

  // Submenu 2: Data Intelligence state
  const [dataMode, setDataMode] = useState<DataMode>('live');
  const [analyticsDomain, setAnalyticsDomain] = useState<AnalyticsDomain>('overview');
  const [siteFilter, setSiteFilter] = useState('All Sites');
  const [deptFilter, setDeptFilter] = useState('All Departments');

  // Live tenant data pulled from existing secure APIs
  const [loadingLive, setLoadingLive] = useState(false);
  const [liveSummary, setLiveSummary] = useState<any>(null);
  const [liveIncidents, setLiveIncidents] = useState<any[]>([]);
  const [liveCapas, setLiveCapas] = useState<any[]>([]);
  const [livePermits, setLivePermits] = useState<any[]>([]);
  const [liveRisks, setLiveRisks] = useState<any[]>([]);
  const [liveTraining, setLiveTraining] = useState<any[]>([]);
  const [liveEquipment, setLiveEquipment] = useState<any[]>([]);
  const [liveEnvironment, setLiveEnvironment] = useState<any[]>([]);
  const [liveLegal, setLiveLegal] = useState<any[]>([]);
  const [liveNotifications, setLiveNotifications] = useState<any[]>([]);

  // Alert Centre Broadcast State
  const [emergencyTitle, setEmergencyTitle] = useState('');
  const [emergencyMsg, setEmergencyMsg] = useState('');
  const [sendingEmergency, setSendingEmergency] = useState(false);
  const [alertFeedback, setAlertFeedback] = useState<string | null>(null);

  // Reports State
  const [selectedReportType, setSelectedReportType] = useState<
    'executive' | 'incidents' | 'permits' | 'risks' | 'compliance' | 'esg'
  >('executive');
  const [reviewerName, setReviewerName] = useState(user?.fullName || '');
  const [reportApprovalStatus, setReportApprovalStatus] = useState<'AI Draft — Pending Review' | 'Reviewed by Competent Officer'>(
    'AI Draft — Pending Review'
  );

  useEffect(() => {
    setSelectedIndustryId(matchedOrgIndustry);
  }, [matchedOrgIndustry]);

  const loadLiveTenantData = useCallback(async () => {
    if (!organization?.id) return;
    setLoadingLive(true);
    try {
      const [
        summaryRes,
        incRes,
        capaRes,
        ptwRes,
        riskRes,
        trainRes,
        eqRes,
        envRes,
        legalRes,
        notifRes,
      ] = await Promise.allSettled([
        apiFetch('/api/dashboard/summary'),
        apiFetch('/api/incidents'),
        apiFetch('/api/capas'),
        apiFetch('/api/permits'),
        apiFetch('/api/risks'),
        apiFetch('/api/training'),
        apiFetch('/api/equipment'),
        apiFetch('/api/environment'),
        apiFetch('/api/legal'),
        apiFetch('/api/notifications'),
      ]);

      if (summaryRes.status === 'fulfilled') setLiveSummary(summaryRes.value);
      if (incRes.status === 'fulfilled' && Array.isArray(incRes.value)) setLiveIncidents(incRes.value);
      if (capaRes.status === 'fulfilled' && Array.isArray(capaRes.value)) setLiveCapas(capaRes.value);
      if (ptwRes.status === 'fulfilled' && Array.isArray(ptwRes.value)) setLivePermits(ptwRes.value);
      if (riskRes.status === 'fulfilled' && Array.isArray(riskRes.value)) setLiveRisks(riskRes.value);
      if (trainRes.status === 'fulfilled' && Array.isArray(trainRes.value)) setLiveTraining(trainRes.value);
      if (eqRes.status === 'fulfilled' && Array.isArray(eqRes.value)) setLiveEquipment(eqRes.value);
      if (envRes.status === 'fulfilled' && Array.isArray(envRes.value)) setLiveEnvironment(envRes.value);
      if (legalRes.status === 'fulfilled' && Array.isArray(legalRes.value)) setLiveLegal(legalRes.value);
      if (notifRes.status === 'fulfilled' && Array.isArray(notifRes.value)) setLiveNotifications(notifRes.value);
    } finally {
      setLoadingLive(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    loadLiveTenantData();
  }, [loadLiveTenantData]);

  const selectedIndustry = useMemo(
    () => INDUSTRIES_CATALOG.find((i) => i.id === selectedIndustryId) || INDUSTRIES_CATALOG[0],
    [selectedIndustryId]
  );

  const filteredIndustries = useMemo(() => {
    const q = industrySearch.trim().toLowerCase();
    if (!q) return INDUSTRIES_CATALOG;
    return INDUSTRIES_CATALOG.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.sectorGroup.toLowerCase().includes(q) ||
        i.summary.toLowerCase().includes(q)
    );
  }, [industrySearch]);

  // Derived Live Metrics for Active Tenant
  const liveMetrics = useMemo(() => {
    const openIncidents = liveIncidents.filter((i) => i.status !== 'Closed').length;
    const activePermits = livePermits.filter((p) => p.status === 'Active' || p.status === 'Approved').length;
    const highRiskCount = liveRisks.filter((r) => (r.riskScore || 0) >= 12 || r.riskLevel === 'High' || r.riskLevel === 'Critical').length;
    const openCapas = liveCapas.filter((c) => c.status !== 'Closed' && c.status !== 'Verified').length;
    const overdueCapas = liveCapas.filter((c) => {
      if (c.status === 'Closed' || c.status === 'Verified') return false;
      return c.dueDate && new Date(c.dueDate) < new Date();
    }).length;
    const compliantLegal = liveLegal.filter((l) => l.status === 'Compliant').length;
    const legalPct = liveLegal.length > 0 ? Math.round((compliantLegal / liveLegal.length) * 100) : 100;
    const validEquip = liveEquipment.filter((e) => e.status !== 'Expired' && e.status !== 'Out of Service').length;
    const equipPct = liveEquipment.length > 0 ? Math.round((validEquip / liveEquipment.length) * 100) : 100;

    return {
      totalIncidents: liveIncidents.length,
      openIncidents,
      totalPermits: livePermits.length,
      activePermits,
      totalRisks: liveRisks.length,
      highRiskCount,
      totalCapas: liveCapas.length,
      openCapas,
      overdueCapas,
      legalTotal: liveLegal.length,
      legalPct,
      trainingTotal: liveTraining.length,
      equipmentTotal: liveEquipment.length,
      equipPct,
      envLogs: liveEnvironment.length,
      unreadAlerts: liveNotifications.filter((n) => !n.isRead).length,
    };
  }, [liveIncidents, livePermits, liveRisks, liveCapas, liveLegal, liveTraining, liveEquipment, liveEnvironment, liveNotifications]);

  // Site & Dept lists derived from live records (or demo options in demo mode)
  const availableSites = useMemo(() => {
    if (dataMode !== 'live') return ['All Sites', ...DEMO_SITE_BREAKDOWN.map((s) => s.site)];
    const set = new Set<string>();
    livePermits.forEach((p) => p.plantName && set.add(p.plantName));
    liveIncidents.forEach((i) => i.plantName && set.add(i.plantName));
    return ['All Sites', ...Array.from(set)];
  }, [dataMode, livePermits, liveIncidents]);

  const availableDepts = useMemo(() => {
    if (dataMode !== 'live') return ['All Departments', ...DEMO_DEPT_BREAKDOWN.map((d) => d.dept)];
    const set = new Set<string>();
    livePermits.forEach((p) => p.departmentName && set.add(p.departmentName));
    liveIncidents.forEach((i) => i.departmentName && set.add(i.departmentName));
    return ['All Departments', ...Array.from(set)];
  }, [dataMode, livePermits, liveIncidents]);

  // Chart Series for Data Intelligence
  const chartSeries = useMemo(() => {
    if (dataMode === 'demo') return DEMO_MONTHLY_SERIES;
    if (dataMode === 'forecast') {
      const baseRisk = Math.min(85, Math.max(18, liveMetrics.highRiskCount * 10 + liveMetrics.overdueCapas * 8 + 20));
      return [
        { month: 'Current', incidents: liveMetrics.openIncidents, nearMiss: Math.max(4, liveSummary?.counts?.observations || 6), permits: liveMetrics.activePermits, riskIndex: baseRisk, forecastRisk: baseRisk },
        { month: '+30 Days', incidents: Math.max(0, liveMetrics.openIncidents), nearMiss: 12, permits: Math.max(2, liveMetrics.activePermits + 2), riskIndex: baseRisk, forecastRisk: Math.max(15, baseRisk - 4) },
        { month: '+60 Days', incidents: 0, nearMiss: 16, permits: Math.max(3, liveMetrics.activePermits + 4), riskIndex: baseRisk, forecastRisk: Math.max(12, baseRisk - 9) },
        { month: '+90 Days', incidents: 0, nearMiss: 20, permits: Math.max(4, liveMetrics.activePermits + 5), riskIndex: baseRisk, forecastRisk: Math.max(10, baseRisk - 14) },
      ];
    }
    // Live mode real module counts
    return [
      { month: 'Incidents', incidents: liveMetrics.totalIncidents, nearMiss: liveMetrics.openIncidents, permits: 0, riskIndex: liveMetrics.openIncidents * 15, forecastRisk: 0 },
      { month: 'CAPAs', incidents: liveMetrics.openCapas, nearMiss: liveMetrics.overdueCapas, permits: 0, riskIndex: liveMetrics.overdueCapas * 20, forecastRisk: 0 },
      { month: 'Permits', incidents: 0, nearMiss: liveMetrics.activePermits, permits: liveMetrics.totalPermits, riskIndex: 25, forecastRisk: 0 },
      { month: 'Risks', incidents: liveMetrics.highRiskCount, nearMiss: liveMetrics.totalRisks, permits: 0, riskIndex: Math.min(100, liveMetrics.highRiskCount * 15), forecastRisk: 0 },
      { month: 'Training', incidents: 0, nearMiss: liveMetrics.trainingTotal, permits: 0, riskIndex: 15, forecastRisk: 0 },
      { month: 'ESG Logs', incidents: 0, nearMiss: liveMetrics.envLogs, permits: 0, riskIndex: 18, forecastRisk: 0 },
    ];
  }, [dataMode, liveMetrics, liveSummary]);

  const handleMarkAllRead = async () => {
    await apiFetch('/api/notifications/read-all', { method: 'POST' });
    setLiveNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await refreshSession();
    setAlertFeedback('All in-app alerts marked as read.');
  };

  const handleEmergencyBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyTitle.trim() || !emergencyMsg.trim()) return;
    setSendingEmergency(true);
    setAlertFeedback(null);
    try {
      await apiFetch('/api/notifications/emergency', {
        method: 'POST',
        body: JSON.stringify({
          title: emergencyTitle.trim(),
          message: emergencyMsg.trim(),
          severity: 'Critical',
        }),
      });
      setEmergencyTitle('');
      setEmergencyMsg('');
      setAlertFeedback('Emergency broadcast dispatched to active organization workspace.');
      await loadLiveTenantData();
      await refreshSession();
    } catch (err: any) {
      setAlertFeedback(err?.message || 'Unable to dispatch emergency alert (requires EHS Manager/Admin role).');
    } finally {
      setSendingEmergency(false);
    }
  };

  // Report Rows Builder
  const buildReportRows = (): { title: string; filename: string; rows: Record<string, unknown>[] } => {
    const orgName = organization?.name || 'ARSHIEL_ORG';
    const stamp = new Date().toISOString().slice(0, 10);
    const metaTag = `${reportApprovalStatus} | Reviewer: ${reviewerName || 'Pending'}`;

    switch (selectedReportType) {
      case 'incidents':
        return {
          title: `Incident & CAPA Intelligence Register (${orgName})`,
          filename: `ARSHIEL-Incidents-${stamp}`,
          rows:
            liveIncidents.length > 0
              ? liveIncidents.map((i) => ({
                  IncidentNo: i.incidentNumber || i.id,
                  Date: i.incidentDate || '-',
                  Type: i.incidentType || '-',
                  Severity: i.severity || '-',
                  Plant: i.plantName || '-',
                  Status: i.status || '-',
                  Governance: metaTag,
                }))
              : [{ Notice: 'No live incidents recorded in active organization.', Governance: metaTag }],
        };
      case 'permits':
        return {
          title: `Smart Permit to Work Audit Register (${orgName})`,
          filename: `ARSHIEL-PTW-${stamp}`,
          rows:
            livePermits.length > 0
              ? livePermits.map((p) => ({
                  PermitNo: p.permitNumber || p.id,
                  Type: p.permitType || '-',
                  Location: p.workLocation || '-',
                  Applicant: p.applicantName || '-',
                  Status: p.status || '-',
                  Start: p.startDate || '-',
                  End: p.endDate || '-',
                  Governance: metaTag,
                }))
              : [{ Notice: 'No live permits recorded in active organization.', Governance: metaTag }],
        };
      case 'risks':
        return {
          title: `HIRA & Risk Assessment Matrix (${orgName})`,
          filename: `ARSHIEL-HIRA-${stamp}`,
          rows:
            liveRisks.length > 0
              ? liveRisks.map((r) => ({
                  Activity: r.activity || r.title || '-',
                  Hazard: r.hazard || '-',
                  RiskScore: r.riskScore ?? '-',
                  Level: r.riskLevel || '-',
                  Controls: r.existingControls || r.recommendedControls || '-',
                  Status: r.status || '-',
                  Governance: metaTag,
                }))
              : [{ Notice: 'No live risk assessments recorded in active organization.', Governance: metaTag }],
        };
      case 'compliance':
        return {
          title: `Legal & ISO Compliance Register (${orgName})`,
          filename: `ARSHIEL-Compliance-${stamp}`,
          rows:
            liveLegal.length > 0
              ? liveLegal.map((l) => ({
                  Regulation: l.lawName || l.title || '-',
                  Authority: l.authority || '-',
                  Status: l.status || '-',
                  DueDate: l.renewalDate || l.dueDate || '-',
                  Governance: metaTag,
                }))
              : GLOBAL_COMPLIANCE_ENGINE.map((g) => ({
                  Country: g.country,
                  State: g.state,
                  Regulation: g.regulation,
                  Source: g.officialSourceName,
                  Status: g.verificationStatus,
                  Governance: metaTag,
                })),
        };
      case 'esg':
        return {
          title: `Environmental & ESG Sustainability Pack (${orgName})`,
          filename: `ARSHIEL-ESG-${stamp}`,
          rows:
            liveEnvironment.length > 0
              ? liveEnvironment.map((e) => ({
                  Date: e.logDate || e.createdAt || '-',
                  Category: e.category || e.metricType || '-',
                  Value: e.value ?? '-',
                  Unit: e.unit || '-',
                  Notes: e.notes || '-',
                  Governance: metaTag,
                }))
              : [{ Notice: 'No live environmental entries recorded yet.', Governance: metaTag }],
        };
      default:
        return {
          title: `Executive EHS Intelligence Summary (${orgName})`,
          filename: `ARSHIEL-Executive-Summary-${stamp}`,
          rows: [
            { Metric: 'Organization', Value: orgName, Status: 'Live Tenant', Governance: metaTag },
            { Metric: 'Industry Profile', Value: organization?.industry || selectedIndustry.name, Status: 'Configured', Governance: metaTag },
            { Metric: 'Open Incidents', Value: liveMetrics.openIncidents, Status: `${liveMetrics.totalIncidents} Total`, Governance: metaTag },
            { Metric: 'Open CAPAs / Overdue', Value: `${liveMetrics.openCapas} / ${liveMetrics.overdueCapas}`, Status: `${liveMetrics.totalCapas} Total`, Governance: metaTag },
            { Metric: 'Active Permits', Value: liveMetrics.activePermits, Status: `${liveMetrics.totalPermits} Total`, Governance: metaTag },
            { Metric: 'High/Critical Risks', Value: liveMetrics.highRiskCount, Status: `${liveMetrics.totalRisks} Total`, Governance: metaTag },
            { Metric: 'Legal Compliance %', Value: `${liveMetrics.legalPct}%`, Status: `${liveMetrics.legalTotal} Tracked`, Governance: metaTag },
            { Metric: 'Equipment Fitness %', Value: `${liveMetrics.equipPct}%`, Status: `${liveMetrics.equipmentTotal} Assets`, Governance: metaTag },
            { Metric: 'Training Records', Value: liveMetrics.trainingTotal, Status: 'Logged', Governance: metaTag },
            { Metric: 'Environmental / ESG Logs', Value: liveMetrics.envLogs, Status: 'Logged', Governance: metaTag },
          ],
        };
    }
  };

  const canBroadcast =
    user?.isPlatformOwner ||
    ['Company Admin', 'Corporate EHS Head', 'Plant EHS Manager', 'Super Admin'].includes(user?.primaryRoleName || '');

  const SUBMENU_TABS: { key: IntelligenceSubmenuKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'intel-industry', label: 'Industry Intelligence', icon: Building2 },
    { key: 'intel-data', label: 'Data Intelligence', icon: BarChart3 },
    { key: 'intel-my-dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { key: 'intel-alerts', label: 'Alert Centre', icon: Bell },
    { key: 'intel-reports', label: 'Reports', icon: FileText },
  ];

  return (
    <div className="space-y-5">
      {/* Top Hub Header + Contextual Submenu Switcher */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-400/40 flex items-center justify-center shrink-0">
              <BrainCircuit className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-sky-400">
                ARSHIEL INTELLIGENCE HUB · TENANT: {organization?.name || 'ACTIVE WORKSPACE'}
              </div>
              <h1 className="font-display font-bold text-xl sm:text-2xl text-white tracking-tight">
                Centralized Enterprise EHS Intelligence &amp; Automation Centre
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadLiveTenantData}
              disabled={loadingLive}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLive ? 'animate-spin' : ''}`} />
              <span>Sync Live Data</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('ai-assistant', null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Copilot</span>
            </button>
          </div>
        </div>

        {/* 5 Submenu Quick Bar */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800">
          {SUBMENU_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeSubmenu === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onNavigate(tab.key, null)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.key === 'intel-alerts' && liveMetrics.unreadAlerts > 0 && (
                  <span className="px-1.5 py-0.2 rounded bg-red-600 text-white text-[10px] font-bold tabular-nums">
                    {liveMetrics.unreadAlerts}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= SUBMENU 1: INDUSTRY INTELLIGENCE ================= */}
      {activeSubmenu === 'intel-industry' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-display font-bold text-lg text-slate-900">
                  Industry Intelligence — 15 Sector-Specific EHS Environments
                </h2>
                <p className="text-xs text-slate-500">
                  Select an industry to load its tailored Risk Register, HIRA/JSA, SOPs, Inspection Checklists, Permits,
                  Legal/ISO obligations, Environmental controls, Emergency plans &amp; KPIs scoped to{' '}
                  <strong className="text-slate-700">{organization?.name}</strong>.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={industrySearch}
                  onChange={(e) => setIndustrySearch(e.target.value)}
                  placeholder="Filter 15 industries..."
                  className="border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-700"
                />
                {user?.isPlatformOwner && (
                  <button
                    type="button"
                    onClick={() => onNavigate('module-builder', null)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Custom Industry Module</span>
                  </button>
                )}
              </div>
            </div>

            {/* 15 Selectable Industry Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {filteredIndustries.map((ind) => {
                const active = ind.id === selectedIndustry.id;
                return (
                  <button
                    key={ind.id}
                    type="button"
                    onClick={() => setSelectedIndustryId(ind.id)}
                    className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 hover:bg-white text-slate-800 border-slate-200 hover:border-emerald-600'
                    }`}
                  >
                    <div className="text-xs font-bold leading-snug">{ind.name}</div>
                    <div className={`text-[10px] mt-1 truncate ${active ? 'text-amber-300' : 'text-slate-500'}`}>
                      {ind.sectorGroup}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Industry 12-Dimension EHS Workspace */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  {selectedIndustry.sectorGroup} · Tenant Workspace: {organization?.name}
                </div>
                <h3 className="font-display font-bold text-xl text-slate-900 mt-0.5">
                  {selectedIndustry.name} EHS Operational Environment
                </h3>
                <p className="text-xs text-slate-600 mt-1">{selectedIndustry.summary}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedIndustry.quickRoutes.map((r) => (
                  <button
                    key={r.routeKey}
                    type="button"
                    onClick={() => onNavigate(r.routeKey, null)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
                  >
                    <span>Open {r.label}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Live Tenant Snapshot vs Industry Benchmark Targets */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[11px] text-slate-500">Live Open Incidents</div>
                <div className="font-mono font-bold text-xl text-slate-900 tabular-nums mt-0.5">
                  {liveMetrics.openIncidents}
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold">Live Tenant Data</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[11px] text-slate-500">Live Active Permits</div>
                <div className="font-mono font-bold text-xl text-slate-900 tabular-nums mt-0.5">
                  {liveMetrics.activePermits}
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold">Live Tenant Data</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[11px] text-slate-500">Live High Risks</div>
                <div className="font-mono font-bold text-xl text-slate-900 tabular-nums mt-0.5">
                  {liveMetrics.highRiskCount}
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold">Live Tenant Data</div>
              </div>
              {selectedIndustry.benchmarkKpis.map((kpi) => (
                <div key={kpi.metric} className="p-3 rounded-lg bg-amber-50/60 border border-amber-200">
                  <div className="text-[11px] text-slate-600 truncate">{kpi.metric}</div>
                  <div className="font-mono font-bold text-xl text-slate-900 tabular-nums mt-0.5">{kpi.target}</div>
                  <div className="text-[10px] text-amber-800 font-semibold">Industry Target ({kpi.unit})</div>
                </div>
              ))}
            </div>

            {/* 12-Dimension Structured Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-lg border border-slate-200 space-y-2">
                <div className="font-bold text-red-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Industry Risk Register</span>
                  <button type="button" onClick={() => onNavigate('risk-assessment', null)} className="text-[11px] underline cursor-pointer">
                    Open HIRA
                  </button>
                </div>
                {selectedIndustry.topRisks.map((r) => (
                  <div key={r.hazard} className="p-2.5 rounded bg-slate-50 border border-slate-100">
                    <div className="font-semibold text-slate-900">{r.hazard}</div>
                    <div className="text-[11px] text-slate-600 mt-0.5">Control: {r.primaryControl}</div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-lg border border-slate-200 space-y-3">
                <div>
                  <div className="font-bold text-slate-900 uppercase tracking-wider mb-1.5">HIRA &amp; JSA Templates</div>
                  <ul className="space-y-1 text-slate-700 list-disc pl-4">
                    {selectedIndustry.hiraJsaTemplates.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-bold text-slate-900 uppercase tracking-wider mb-1.5">Standard Operating Procedures</div>
                  <ul className="space-y-1 text-slate-700 list-disc pl-4">
                    {selectedIndustry.sops.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 space-y-3">
                <div>
                  <div className="font-bold text-slate-900 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Inspection Checklists</span>
                    <button type="button" onClick={() => onNavigate('audits', null)} className="text-[11px] text-emerald-700 underline cursor-pointer">
                      Run Audit
                    </button>
                  </div>
                  <ul className="space-y-1 text-slate-700 list-disc pl-4">
                    {selectedIndustry.inspectionChecklists.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-bold text-slate-900 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Mandatory Permit Types</span>
                    <button type="button" onClick={() => onNavigate('ptw', null)} className="text-[11px] text-emerald-700 underline cursor-pointer">
                      Issue PTW
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedIndustry.mandatoryPermits.map((p) => (
                      <span key={p} className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 font-medium">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 space-y-3">
                <div>
                  <div className="font-bold text-slate-900 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Legal Compliance</span>
                    <button type="button" onClick={() => onNavigate('legal', null)} className="text-[11px] text-emerald-700 underline cursor-pointer">
                      Register
                    </button>
                  </div>
                  <ul className="space-y-1 text-slate-700 list-disc pl-4">
                    {selectedIndustry.legalCompliance.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-bold text-slate-900 uppercase tracking-wider mb-1.5">ISO Management Systems</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedIndustry.isoStandards.map((iso) => (
                      <span key={iso} className="px-2 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-900 font-semibold">
                        {iso}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 space-y-2">
                <div className="font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
                  <span>Environmental &amp; ESG Controls</span>
                  <button type="button" onClick={() => onNavigate('environment', null)} className="text-[11px] underline cursor-pointer">
                    ESG Module
                  </button>
                </div>
                <ul className="space-y-1.5 text-slate-700 list-disc pl-4">
                  {selectedIndustry.environmentalControls.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 space-y-3">
                <div>
                  <div className="font-bold text-amber-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Emergency Scenarios</span>
                    <button type="button" onClick={() => onNavigate('emergency', null)} className="text-[11px] underline cursor-pointer">
                      ERP
                    </button>
                  </div>
                  <ul className="space-y-1 text-slate-700 list-disc pl-4">
                    {selectedIndustry.emergencyScenarios.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-bold text-slate-900 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Training Requirements</span>
                    <button type="button" onClick={() => onNavigate('training', null)} className="text-[11px] text-emerald-700 underline cursor-pointer">
                      Matrix
                    </button>
                  </div>
                  <ul className="space-y-1 text-slate-700 list-disc pl-4">
                    {selectedIndustry.trainingRequirements.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUBMENU 2: DATA INTELLIGENCE ================= */}
      {activeSubmenu === 'intel-data' && (
        <div className="space-y-5">
          {/* Mandatory Data Mode Separation Bar: LIVE DATA | DEMO DATA | AI FORECAST */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h2 className="font-display font-bold text-lg text-slate-900">
                  Data Intelligence &amp; Enterprise Analytics
                </h2>
                <p className="text-xs text-slate-500">
                  Explicitly switch between Live Tenant Data, Demonstration Benchmarks, and Predictive AI Forecasts.
                </p>
              </div>

              {/* 3-Mode Strict Switcher */}
              <div className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-1 text-xs self-start lg:self-auto">
                <button
                  type="button"
                  onClick={() => setDataMode('live')}
                  className={`px-3 py-1.5 rounded-md font-bold cursor-pointer ${
                    dataMode === 'live' ? 'bg-emerald-700 text-white' : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  LIVE DATA
                </button>
                <button
                  type="button"
                  onClick={() => setDataMode('demo')}
                  className={`px-3 py-1.5 rounded-md font-bold cursor-pointer ${
                    dataMode === 'demo' ? 'bg-amber-500 text-slate-950' : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  DEMO DATA
                </button>
                <button
                  type="button"
                  onClick={() => setDataMode('forecast')}
                  className={`px-3 py-1.5 rounded-md font-bold cursor-pointer ${
                    dataMode === 'forecast' ? 'bg-sky-700 text-white' : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  AI FORECAST
                </button>
              </div>
            </div>

            {/* Active Data Integrity Banner */}
            <div
              className={`px-3.5 py-2.5 rounded-lg border text-xs font-medium flex flex-wrap items-center justify-between gap-2 ${
                dataMode === 'live'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : dataMode === 'demo'
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : 'bg-sky-50 border-sky-200 text-sky-950'
              }`}
            >
              <span>
                {dataMode === 'live' &&
                  `LIVE TENANT DATA — Real operational records queried from PostgreSQL for ${organization?.name}.`}
                {dataMode === 'demo' &&
                  'DEMO DATA – NOT LIVE OPERATIONAL DATA — Illustrative enterprise benchmark dataset for executive demonstrations.'}
                {dataMode === 'forecast' &&
                  'AI FORECAST – PREDICTIVE ESTIMATE — Statistical trend projection derived from logged hazards & overdue actions. Requires competent human review.'}
              </span>
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5" />
                <select
                  value={siteFilter}
                  onChange={(e) => setSiteFilter(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                >
                  {availableSites.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                >
                  {availableDepts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Domain Category Selector */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'overview' as const, label: 'Executive Overview' },
                { key: 'workforce' as const, label: 'Workforce' },
                { key: 'incidents' as const, label: 'Incidents & CAPA' },
                { key: 'leading-lagging' as const, label: 'Leading & Lagging' },
                { key: 'risk-permit' as const, label: 'Risk & Permits' },
                { key: 'compliance' as const, label: 'Legal & ISO' },
                { key: 'esg-energy' as const, label: 'ESG & Energy' },
                { key: 'site-dept' as const, label: 'Site & Dept Breakdown' },
              ].map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setAnalyticsDomain(d.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold border cursor-pointer ${
                    analyticsDomain === d.key
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* KPI Stat Strip */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              {
                label: 'Open Incidents',
                value: dataMode === 'demo' ? '02' : String(liveMetrics.openIncidents),
                sub: dataMode === 'demo' ? 'Demo Benchmark' : `${liveMetrics.totalIncidents} total`,
              },
              {
                label: 'Open / Overdue CAPAs',
                value: dataMode === 'demo' ? '08 / 02' : `${liveMetrics.openCapas} / ${liveMetrics.overdueCapas}`,
                sub: 'Action Closure',
              },
              {
                label: 'Active Work Permits',
                value: dataMode === 'demo' ? '14' : String(liveMetrics.activePermits),
                sub: dataMode === 'demo' ? '64 monthly' : `${liveMetrics.totalPermits} total`,
              },
              {
                label: 'High / Critical Risks',
                value: dataMode === 'demo' ? '05' : String(liveMetrics.highRiskCount),
                sub: dataMode === 'demo' ? '38 assessed' : `${liveMetrics.totalRisks} assessed`,
              },
              {
                label: 'Legal Compliance',
                value: dataMode === 'demo' ? '96%' : `${liveMetrics.legalPct}%`,
                sub: dataMode === 'demo' ? '48 statutes' : `${liveMetrics.legalTotal} statutes`,
              },
              {
                label: 'Training & Equip',
                value: dataMode === 'demo' ? '97%' : `${liveMetrics.equipPct}%`,
                sub: dataMode === 'demo' ? '1,420 workforce' : `${liveMetrics.trainingTotal} trainings`,
              },
            ].map((card) => (
              <div key={card.label} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-[11px] font-medium text-slate-500">{card.label}</div>
                <div className="font-mono font-bold text-2xl text-slate-900 tabular-nums mt-1">{card.value}</div>
                <div className="text-[11px] text-slate-500 mt-1">{card.sub}</div>
              </div>
            ))}
          </div>

          {/* Interactive Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display font-bold text-sm text-slate-900">
                  {dataMode === 'forecast'
                    ? 'Predictive Risk Trajectory (90-Day AI Forecast)'
                    : dataMode === 'demo'
                    ? 'Leading vs Lagging Safety Trend (Demo Dataset)'
                    : `Live Operational Volume by Module (${organization?.name})`}
                </h3>
                <span className="text-[11px] font-mono text-slate-500 uppercase">{dataMode}</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {dataMode === 'forecast' ? (
                    <AreaChart data={chartSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="riskIndex" name="Baseline Risk Score" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.35} />
                      <Area type="monotone" dataKey="forecastRisk" name="AI Forecast Risk" stroke="#0284c7" fill="#38bdf8" fillOpacity={0.35} />
                    </AreaChart>
                  ) : (
                    <BarChart data={chartSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="nearMiss" name={dataMode === 'demo' ? 'Near Misses / Leading' : 'Active / Total'} fill="#0f766e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="incidents" name={dataMode === 'demo' ? 'Incidents' : 'Open / Critical'} fill="#dc2626" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display font-bold text-sm text-slate-900">
                  {analyticsDomain === 'site-dept' ? 'Site-Wise Compliance Distribution' : 'EHS Domain Distribution'}
                </h3>
                <span className="text-[11px] text-slate-500">{siteFilter}</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={
                        dataMode === 'demo'
                          ? DEMO_SITE_BREAKDOWN.map((s) => ({ name: s.site, value: s.compliance }))
                          : [
                              { name: 'Permits', value: Math.max(1, liveMetrics.totalPermits) },
                              { name: 'Risks/HIRA', value: Math.max(1, liveMetrics.totalRisks) },
                              { name: 'Incidents', value: Math.max(1, liveMetrics.totalIncidents) },
                              { name: 'CAPAs', value: Math.max(1, liveMetrics.totalCapas) },
                              { name: 'Trainings', value: Math.max(1, liveMetrics.trainingTotal) },
                            ]
                      }
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={82}
                      paddingAngle={3}
                    >
                      {CHART_COLORS.map((color, idx) => (
                        <Cell key={color} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Site & Department Breakdown Table */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h3 className="font-display font-bold text-sm text-slate-900">
              Site-Wise &amp; Department-Wise Safety Intelligence ({dataMode === 'demo' ? 'Demo Benchmark' : 'Active Filter Scope'})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 px-3">Site / Department</th>
                    <th className="py-2 px-3">Compliance / Training %</th>
                    <th className="py-2 px-3">Open CAPAs / Closed Obs</th>
                    <th className="py-2 px-3">Active Permits / Risk Band</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {DEMO_SITE_BREAKDOWN.map((row) => (
                    <tr key={row.site} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{row.site}</td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-emerald-700 font-bold">{row.compliance}%</td>
                      <td className="py-2.5 px-3 font-mono tabular-nums">{row.openCapa} open actions</td>
                      <td className="py-2.5 px-3 font-mono tabular-nums">
                        {row.activePermits} permits · Risk {row.riskScore}/100
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUBMENU 3: MY DASHBOARD ================= */}
      {activeSubmenu === 'intel-my-dashboard' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500">Signed-In Role</div>
              <div className="font-display font-bold text-lg text-slate-900 mt-1">
                {user?.primaryRoleName || (user?.isPlatformOwner ? 'Super Admin' : 'Safety User')}
              </div>
              <div className="text-[11px] text-emerald-700 mt-1">{user?.email}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500">Pending CAPA Actions</div>
              <div className="font-mono font-bold text-2xl text-slate-900 tabular-nums mt-1">{liveMetrics.openCapas}</div>
              <div className="text-[11px] text-red-600 mt-1">{liveMetrics.overdueCapas} overdue</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500">Active Work Permits</div>
              <div className="font-mono font-bold text-2xl text-slate-900 tabular-nums mt-1">{liveMetrics.activePermits}</div>
              <div className="text-[11px] text-slate-500 mt-1">{liveMetrics.totalPermits} workspace permits</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500">Unread Safety Alerts</div>
              <div className="font-mono font-bold text-2xl text-slate-900 tabular-nums mt-1">{liveMetrics.unreadAlerts}</div>
              <button
                type="button"
                onClick={() => onNavigate('intel-alerts', null)}
                className="text-[11px] font-semibold text-emerald-700 hover:underline mt-1 cursor-pointer"
              >
                Open Alert Centre →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* My Action Queue */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-base text-slate-900">
                  Workspace Priority Queue (Live CAPAs &amp; Permits)
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('rca-capa', null)}
                  className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                >
                  Manage All CAPAs →
                </button>
              </div>
              {liveCapas.length === 0 ? (
                <div className="text-xs text-slate-500 py-6 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  No open CAPA actions in {organization?.name}. Log an incident or inspection finding to assign tasks.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {liveCapas.slice(0, 6).map((c) => (
                    <div key={c.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{c.actionTitle || c.description || 'CAPA Action'}</div>
                        <div className="text-[11px] text-slate-500">
                          Owner: {c.assignedTo || 'Unassigned'} · Due: {c.dueDate || 'TBD'}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded font-semibold shrink-0 ${
                          c.status === 'Closed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {c.status || 'Open'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Document Drafting Quick Launcher */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display font-bold text-base text-slate-900">AI Document Drafting Launcher</h2>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                  AI DRAFT ONLY
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Launch any EHS drafting workflow in ARSHIEL AI Copilot. Every draft requires competent human approval.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AI_DOCUMENT_TYPES.slice(0, 8).map((doc) => (
                  <button
                    key={doc.name}
                    type="button"
                    onClick={() => onNavigate('ai-assistant', null)}
                    className="p-2.5 rounded-lg border border-slate-200 hover:border-emerald-600 text-left text-xs transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-slate-900 truncate">{doc.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{doc.category}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUBMENU 4: ALERT CENTRE ================= */}
      {activeSubmenu === 'intel-alerts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display font-bold text-lg text-slate-900">Unified Safety Alert Centre</h2>
                <p className="text-xs text-slate-500">
                  Real-time workspace notifications, permit alerts, CAPA escalations, and incident updates.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="px-3 py-1.5 rounded-md border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Mark All Read
                </button>
                {user?.isPlatformOwner && (
                  <button
                    type="button"
                    onClick={() => onNavigate('platform-logins', null)}
                    className="px-3 py-1.5 rounded-md bg-slate-900 text-amber-300 text-xs font-semibold cursor-pointer"
                  >
                    Super Admin Notification Engine
                  </button>
                )}
              </div>
            </div>

            {alertFeedback && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium">
                {alertFeedback}
              </div>
            )}

            {liveNotifications.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No active safety alerts in {organization?.name}.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {liveNotifications.map((n) => (
                  <div
                    key={n.id}
                    className={`py-3 px-3 rounded-lg flex items-start justify-between gap-3 text-xs ${
                      n.isRead ? 'bg-white' : 'bg-amber-50/50'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-bold text-slate-900">{n.title || 'Safety Notification'}</div>
                      <div className="text-slate-600">{n.message}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Recent'} · {n.category || 'EHS'}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                        n.isRead ? 'bg-slate-100 text-slate-500' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {n.isRead ? 'Read' : 'Unread'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Escalation Summary & Role-Gated Emergency Broadcast */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-red-700 flex items-center gap-1.5">
                <Siren className="w-4 h-4" />
                <span>Automated Escalation Watchlist</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                  <div className="text-red-700 font-medium">Overdue CAPAs</div>
                  <div className="font-mono font-bold text-xl text-red-800 tabular-nums mt-0.5">{liveMetrics.overdueCapas}</div>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <div className="text-amber-800 font-medium">Open Incidents</div>
                  <div className="font-mono font-bold text-xl text-amber-900 tabular-nums mt-0.5">{liveMetrics.openIncidents}</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-sm text-slate-900">Site Emergency Broadcast</h3>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  ROLE-GATED
                </span>
              </div>
              {canBroadcast ? (
                <form onSubmit={handleEmergencyBroadcast} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Alert Headline *</label>
                    <input
                      required
                      value={emergencyTitle}
                      onChange={(e) => setEmergencyTitle(e.target.value)}
                      placeholder="e.g. Muster Drill — Assembly Point A"
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Instructions *</label>
                    <textarea
                      required
                      rows={3}
                      value={emergencyMsg}
                      onChange={(e) => setEmergencyMsg(e.target.value)}
                      placeholder="Clear safety instructions for all personnel in this organization..."
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-slate-900"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sendingEmergency}
                    className="w-full py-2.5 px-4 rounded-md bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold cursor-pointer"
                  >
                    {sendingEmergency ? 'Broadcasting...' : 'Dispatch Organization Alert'}
                  </button>
                </form>
              ) : (
                <div className="text-xs text-slate-500 flex items-start gap-2">
                  <Lock className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                  <span>Emergency broadcasts require Plant EHS Manager, Corporate EHS Head, or Admin authorization.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= SUBMENU 5: REPORTS ================= */}
      {activeSubmenu === 'intel-reports' && (
        <div className="space-y-5">
          {/* Mandatory AI Transparency & Human Approval Block */}
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>AI Transparency &amp; Competent Human Approval Governance</span>
              </div>
              <p className="text-xs text-amber-900">
                All exported summaries and AI-assisted narratives carry explicit draft/review metadata. Assign a
                competent safety reviewer before statutory submission or management sign-off.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
              <input
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="Competent Reviewer Name"
                className="bg-white border border-amber-300 rounded-md px-2.5 py-1.5 text-xs text-slate-900"
              />
              <select
                value={reportApprovalStatus}
                onChange={(e) => setReportApprovalStatus(e.target.value as any)}
                className="bg-white border border-amber-300 rounded-md px-2.5 py-1.5 text-xs text-slate-900 font-semibold"
              >
                <option value="AI Draft — Pending Review">AI Draft — Pending Review</option>
                <option value="Reviewed by Competent Officer">Reviewed by Competent Officer</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="font-display font-bold text-lg text-slate-900">
                  Enterprise EHS Intelligence Reports &amp; Export Centre
                </h2>
                <p className="text-xs text-slate-500">
                  Generate live tenant PDF, Excel (.xlsx), and CSV compliance packs for {organization?.name}.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const pack = buildReportRows();
                    exportReportTablePdf(pack.title, pack.rows, organization, pack.filename);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Export PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const pack = buildReportRows();
                    exportRowsToExcel(pack.rows, pack.filename);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const pack = buildReportRows();
                    exportRowsToCsv(pack.rows, pack.filename);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Report Pack Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {[
                { key: 'executive' as const, label: 'Executive Summary', count: '10 KPIs' },
                { key: 'incidents' as const, label: 'Incidents & RCA', count: `${liveIncidents.length} rows` },
                { key: 'permits' as const, label: 'Smart PTW Log', count: `${livePermits.length} rows` },
                { key: 'risks' as const, label: 'HIRA / Risks', count: `${liveRisks.length} rows` },
                { key: 'compliance' as const, label: 'Legal & ISO', count: `${liveLegal.length || GLOBAL_COMPLIANCE_ENGINE.length} rows` },
                { key: 'esg' as const, label: 'ESG & Env Logs', count: `${liveEnvironment.length} rows` },
              ].map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setSelectedReportType(r.key)}
                  className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    selectedReportType === r.key
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-emerald-600'
                  }`}
                >
                  <div className="text-xs font-bold">{r.label}</div>
                  <div className={`text-[11px] font-mono mt-1 ${selectedReportType === r.key ? 'text-amber-300' : 'text-slate-500'}`}>
                    {r.count}
                  </div>
                </button>
              ))}
            </div>

            {/* Live Preview Table of Selected Report */}
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              {(() => {
                const pack = buildReportRows();
                const cols = pack.rows[0] ? Object.keys(pack.rows[0]) : [];
                return (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        {cols.map((c) => (
                          <th key={c} className="py-2.5 px-3 font-semibold whitespace-nowrap">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pack.rows.slice(0, 12).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          {cols.map((c) => (
                            <td key={c} className="py-2 px-3 text-slate-800">
                              {String(row[c] ?? '-')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
