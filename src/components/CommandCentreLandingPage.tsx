import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Building2,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Cpu,
  ExternalLink,
  Eye,
  FileText,
  Flame,
  Globe,
  HardHat,
  Layers,
  Leaf,
  Lock,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Phone,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Sparkles,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  AI_DOCUMENT_TYPES,
  AI_VISION_CAPABILITIES,
  DIGITAL_TWIN_FACILITIES,
  GLOBAL_COMPLIANCE_ENGINE,
  INDUSTRIES_CATALOG,
  LEGAL_POLICIES,
  PTW_WORKFLOW_STAGES,
  SMART_PTW_TYPES,
  type LegalPolicyDoc,
} from '../data/intelligenceCatalog';

interface CommandCentreLandingPageProps {
  onEnterPlatform: (targetRoute?: string) => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onOpenClassicOverview: () => void;
  onAfterLogout: () => void;
}

const NAV_LINKS = [
  { id: 'hero', label: 'Home' },
  { id: 'platform', label: 'Platform' },
  { id: 'ai-features', label: 'AI Features' },
  { id: 'ehs-solutions', label: 'EHS Solutions' },
  { id: 'industries', label: 'Industries' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'assurance', label: 'About' },
  { id: 'contact', label: 'Contact' },
];

const FAQ_ITEMS = [
  {
    q: 'Are the dashboard metrics shown on this homepage live customer data?',
    a: 'No. Every metric, alert, chart, and map pin on this public landing page is clearly labeled as DEMO DATA – NOT LIVE OPERATIONAL DATA. Live tenant operational records appear only after signing in to your isolated ARSHIEL SAFETY organization workspace.',
  },
  {
    q: 'How does ARSHIEL SAFETY handle AI-generated HIRAs, JSAs, SOPs, and risk forecasts?',
    a: 'Every AI-generated document or predictive trend is marked as an AI Draft and requires competent human review and formal sign-off before operational release. AI never auto-approves permits, legal filings, or safety procedures.',
  },
  {
    q: 'Do AI Vision CCTV monitoring and IoT sensors work automatically out of the box?',
    a: 'No. Camera streams (RTSP/ONVIF) and IoT gas/environmental sensors remain inactive until your organization explicitly integrates and authorizes its own hardware feeds under your site privacy and data-retention policies.',
  },
  {
    q: 'What is the difference between ARSHIEL SAFETY and ARSHIEL ASSURANCE?',
    a: 'ARSHIEL SAFETY is our enterprise EHS software platform (PTW, incidents, HIRA, audits, KPIs, ESG, Intelligence Hub). ARSHIEL ASSURANCE is our advisory division providing ISO readiness consultancy, independent gap assessments, audit support, and training — it does not claim to be an accredited third-party certification registrar.',
  },
  {
    q: 'How is multi-tenant company data isolated and protected?',
    a: 'Every record is strictly scoped by organization ID, site, department, and role-based permissions (RBAC). Administrative governance and dynamic module architecture controls are restricted to the verified platform owner.',
  },
];

export function CommandCentreLandingPage({
  onEnterPlatform,
  onOpenLogin,
  onOpenRegister,
  onOpenClassicOverview,
  onAfterLogout,
}: CommandCentreLandingPageProps) {
  const { firebaseUser, user, logout } = useAuth();
  const isAuthenticated = Boolean(firebaseUser);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Interactive Command Centre Tabs
  const [commandTab, setCommandTab] = useState<'workforce' | 'realtime' | 'predictive' | 'kpi'>('workforce');
  const [predictiveMode, setPredictiveMode] = useState<'historical' | 'forecast'>('forecast');

  // Interactive Vision, PTW, Digital Twin, AI Docs, Compliance, Industries
  const [selectedVisionIdx, setSelectedVisionIdx] = useState(0);
  const [selectedPtwCode, setSelectedPtwCode] = useState(SMART_PTW_TYPES[0].code);
  const [selectedFacilityId, setSelectedFacilityId] = useState(DIGITAL_TWIN_FACILITIES[0].id);
  const [selectedTwinLayer, setSelectedTwinLayer] = useState<string>('all');
  const [selectedZoneId, setSelectedZoneId] = useState<string>(DIGITAL_TWIN_FACILITIES[0].zones[0].id);
  const [selectedDocIdx, setSelectedDocIdx] = useState(0);

  // Compliance Filters
  const [complianceCountry, setComplianceCountry] = useState('All');
  const [complianceSearch, setComplianceSearch] = useState('');

  // Industry Selector (All 15)
  const [selectedIndustryId, setSelectedIndustryId] = useState(INDUSTRIES_CATALOG[0].id);

  // FAQ & Legal Policy Modal
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [activePolicy, setActivePolicy] = useState<LegalPolicyDoc | null>(null);

  // Live Request a Demo / Book Assessment Form
  const [inquiryType, setInquiryType] = useState<'ARSHIEL SAFETY Demo' | 'ARSHIEL ASSURANCE Assessment'>('ARSHIEL SAFETY Demo');
  const [demoName, setDemoName] = useState('');
  const [demoEmail, setDemoEmail] = useState('');
  const [demoCompany, setDemoCompany] = useState('');
  const [demoPhone, setDemoPhone] = useState('');
  const [demoIndustry, setDemoIndustry] = useState('Semiconductor');
  const [demoMessage, setDemoMessage] = useState('');
  const [submittingDemo, setSubmittingDemo] = useState(false);
  const [demoResult, setDemoResult] = useState<{ ok: boolean; text: string } | null>(null);

  const selectedPtw = useMemo(
    () => SMART_PTW_TYPES.find((p) => p.code === selectedPtwCode) || SMART_PTW_TYPES[0],
    [selectedPtwCode]
  );

  const selectedFacility = useMemo(
    () => DIGITAL_TWIN_FACILITIES.find((f) => f.id === selectedFacilityId) || DIGITAL_TWIN_FACILITIES[0],
    [selectedFacilityId]
  );

  const visibleZones = useMemo(() => {
    if (selectedTwinLayer === 'all') return selectedFacility.zones;
    return selectedFacility.zones.filter((z) => z.type === selectedTwinLayer);
  }, [selectedFacility, selectedTwinLayer]);

  const activeZone = useMemo(
    () => selectedFacility.zones.find((z) => z.id === selectedZoneId) || selectedFacility.zones[0],
    [selectedFacility, selectedZoneId]
  );

  const selectedIndustry = useMemo(
    () => INDUSTRIES_CATALOG.find((i) => i.id === selectedIndustryId) || INDUSTRIES_CATALOG[0],
    [selectedIndustryId]
  );

  const complianceCountries = useMemo(
    () => ['All', ...Array.from(new Set(GLOBAL_COMPLIANCE_ENGINE.map((c) => c.country)))],
    []
  );

  const filteredCompliance = useMemo(() => {
    const q = complianceSearch.trim().toLowerCase();
    return GLOBAL_COMPLIANCE_ENGINE.filter((row) => {
      if (complianceCountry !== 'All' && row.country !== complianceCountry) return false;
      if (!q) return true;
      return (
        row.regulation.toLowerCase().includes(q) ||
        row.state.toLowerCase().includes(q) ||
        row.industry.toLowerCase().includes(q) ||
        row.activity.toLowerCase().includes(q) ||
        row.requirement.toLowerCase().includes(q)
      );
    });
  }, [complianceCountry, complianceSearch]);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      setShowLogoutConfirm(false);
      onAfterLogout();
    } finally {
      setLoggingOut(false);
    }
  };

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDemoResult(null);
    const emailTrimmed = demoEmail.trim();
    if (!demoName.trim() || !emailTrimmed || !demoCompany.trim()) {
      setDemoResult({ ok: false, text: 'Please fill in Full Name, Work Email, and Organization.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setDemoResult({ ok: false, text: 'Please enter a valid work email address.' });
      return;
    }

    setSubmittingDemo(true);
    try {
      const res = await fetch('/api/public/demo-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: demoName.trim(),
          email: emailTrimmed,
          company: demoCompany.trim(),
          phone: demoPhone.trim(),
          industry: demoIndustry,
          message: `[${inquiryType}] ${demoMessage.trim() || 'Requested enterprise briefing.'}`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not submit inquiry right now.');
      }
      setDemoResult({
        ok: true,
        text: `Thank you, ${demoName.trim()}. Your ${inquiryType} inquiry has been recorded and routed to Jonathan Thadanki (jonathan.tadanki@gmail.com).`,
      });
      setDemoName('');
      setDemoEmail('');
      setDemoCompany('');
      setDemoPhone('');
      setDemoMessage('');
    } catch (err: any) {
      setDemoResult({ ok: false, text: err?.message || 'Submission failed. Please try again or email jonathan.tadanki@gmail.com directly.' });
    } finally {
      setSubmittingDemo(false);
    }
  };

  const zoneTypeStyle = (type: string) => {
    switch (type) {
      case 'hazard':
        return { bg: 'bg-red-600', ring: 'ring-red-400/50', label: 'Hazard Zone' };
      case 'exit':
        return { bg: 'bg-emerald-600', ring: 'ring-emerald-400/50', label: 'Emergency Exit' };
      case 'fire':
        return { bg: 'bg-amber-500', ring: 'ring-amber-300/50', label: 'Fire Protection' };
      case 'assembly':
        return { bg: 'bg-sky-500', ring: 'ring-sky-300/50', label: 'Assembly Point' };
      case 'firstaid':
        return { bg: 'bg-teal-500', ring: 'ring-teal-300/50', label: 'First Aid / Medical' };
      default:
        return { bg: 'bg-violet-600', ring: 'ring-violet-400/50', label: 'Restricted Zone' };
    }
  };

  return (
    <div className="min-h-screen bg-[#020817] text-slate-100 antialiased selection:bg-[#FFC629] selection:text-[#020817]">
      {/* ================= STICKY COMMAND CENTRE HEADER ================= */}
      <header className="sticky top-0 z-50 bg-[#020817]/95 backdrop-blur-md border-b border-slate-800/90">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Left: Brand Lockup (Clean Single-Line Wordmark) */}
          <button
            type="button"
            onClick={() => scrollToSection('hero')}
            className="flex items-center gap-2.5 shrink-0 text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC629] rounded"
          >
            <img
              src="/assets/aistudio/Designer__2___1__9fac3732.png"
              alt="ARSHIEL SAFETY Logo"
              className="w-9 h-9 rounded-md object-cover border border-[#FFC629]/50 bg-[#020817] shrink-0"
            />
            <span className="font-display font-extrabold text-base tracking-tight arshiel-gold-text whitespace-nowrap">
              ARSHIEL SAFETY
            </span>
          </button>

          {/* Center: Desktop Navigation */}
          <nav aria-label="Primary Command Navigation" className="hidden xl:flex items-center gap-6 text-[13px] font-medium text-slate-300">
            {NAV_LINKS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className="hover:text-[#FFC629] transition-colors whitespace-nowrap cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right: Auth & Enter Platform Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {!isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3 sm:px-3.5 py-1.5 text-xs sm:text-[13px] font-semibold text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-[#00BFFF] rounded-md transition-colors whitespace-nowrap cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#00BFFF]" />
                  <span>Login</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenRegister}
                  className="hidden sm:inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3.5 py-1.5 text-xs sm:text-[13px] font-semibold text-slate-100 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-[#FFC629]" />
                  <span>Register</span>
                </button>
                <button
                  type="button"
                  onClick={() => onEnterPlatform('intel-industry')}
                  className="hidden md:inline-flex items-center justify-center gap-1.5 min-h-[38px] px-4 py-1.5 text-xs sm:text-[13px] font-bold text-[#020817] bg-[#FFC629] hover:bg-[#ffd252] rounded-md transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span>Enter Platform</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onEnterPlatform('dashboard')}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3.5 py-1.5 text-xs sm:text-[13px] font-bold text-[#020817] bg-[#FFC629] hover:bg-[#ffd252] rounded-md transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span>Enter Platform</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <span className="hidden md:inline-block text-xs text-slate-300 max-w-[130px] truncate px-2">
                  {user?.fullName || firebaseUser?.displayName || firebaseUser?.email}
                </span>
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs sm:text-[13px] font-bold text-red-200 hover:text-white bg-red-950/60 hover:bg-red-700 border border-red-700/60 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="xl:hidden inline-flex items-center justify-center min-h-[38px] min-w-[38px] p-2 rounded-md border border-slate-700 text-slate-200 hover:border-[#FFC629] cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden bg-[#061126] border-t border-slate-800 px-4 py-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {NAV_LINKS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className="text-left px-3 py-2.5 rounded-md bg-slate-900/90 border border-slate-800 text-sm font-medium text-slate-200 hover:text-[#FFC629] cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
              {!isAuthenticated ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenLogin();
                    }}
                    className="flex-1 min-h-[44px] px-4 py-2 rounded-md bg-slate-900 border border-[#00BFFF]/60 text-sm font-semibold text-white cursor-pointer"
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenRegister();
                    }}
                    className="flex-1 min-h-[44px] px-4 py-2 rounded-md bg-[#FFC629] text-[#020817] text-sm font-bold cursor-pointer"
                  >
                    Register
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onEnterPlatform('dashboard');
                    }}
                    className="flex-1 min-h-[44px] px-4 py-2 rounded-md bg-[#FFC629] text-[#020817] text-sm font-bold cursor-pointer"
                  >
                    Enter Platform
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowLogoutConfirm(true);
                    }}
                    className="min-h-[44px] px-4 py-2 rounded-md bg-red-700 text-white text-sm font-bold cursor-pointer"
                  >
                    Logout
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenClassicOverview();
                }}
                className="w-full min-h-[40px] px-3 py-2 rounded-md border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
              >
                Open Classic Platform Overview (/overview)
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ================= HERO: AI DIGITAL EHS COMMAND CENTRE ================= */}
      <section id="hero" className="relative overflow-hidden border-b border-slate-800/80">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 pointer-events-none"
          style={{ backgroundImage: 'url(/assets/aistudio/HOME_PAGE_2e68c67d.jpg)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020817]/80 via-[#020817]/90 to-[#020817] pointer-events-none" />

        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Narrative */}
          <div className="lg:col-span-6 space-y-6">
            <div className="text-xs font-semibold tracking-[0.18em] uppercase text-[#00BFFF]">
              AI-POWERED ENTERPRISE EHS &amp; DIGITAL SAFETY INTELLIGENCE PLATFORM
            </div>

            <h1 className="font-display font-extrabold text-3xl sm:text-5xl xl:text-[54px] leading-[1.08] tracking-tight text-white">
              INTELLIGENT EHS.{' '}
              <span className="text-[#FFC629]">PROACTIVE SAFETY.</span>{' '}
              ZERO COMPROMISE.
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
              Transform workplace safety with AI-powered risk intelligence, digital EHS operations,
              predictive analytics, global compliance management and intelligent safety automation.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onEnterPlatform('dashboard')}
                className="inline-flex items-center gap-2 min-h-[46px] px-6 py-3 rounded-md bg-[#FFC629] hover:bg-[#ffd252] text-[#020817] font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Enter Platform</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('ai-features')}
                className="inline-flex items-center gap-2 min-h-[46px] px-5 py-3 rounded-md bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                <BrainCircuit className="w-4 h-4 text-[#00BFFF]" />
                <span>Explore AI Features</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setInquiryType('ARSHIEL SAFETY Demo');
                  scrollToSection('contact');
                }}
                className="inline-flex items-center gap-2 min-h-[46px] px-5 py-3 rounded-md border border-[#00BFFF]/50 hover:border-[#FFC629] text-[#00BFFF] hover:text-[#FFC629] font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Request a Demo</span>
              </button>
            </div>

            {/* Secondary link preserving access to existing overview homepage */}
            <div className="pt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400">
              <span>24+ Enterprise EHS Modules</span>
              <span>15 Industry Intelligence Packs</span>
              <span>Multi-Tenant RBAC Architecture</span>
              <button
                type="button"
                onClick={onOpenClassicOverview}
                className="text-slate-300 underline underline-offset-4 hover:text-[#FFC629] cursor-pointer"
              >
                View Classic Overview
              </button>
            </div>
          </div>

          {/* Right: ARSHIEL AI EHS Command Centre Interactive Preview (Explicit Demo Data Labeling) */}
          <div className="lg:col-span-6">
            <div className="rounded-xl bg-[#071226]/95 border border-slate-800 overflow-hidden">
              {/* Top Command Strip */}
              <div className="px-4 py-3 bg-[#0A1833] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#FFC629]" />
                  <span className="font-display font-bold text-xs tracking-wide text-white uppercase">
                    ARSHIEL AI EHS Command Centre · Interactive Preview
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-[#FFC629] border border-amber-500/40">
                  DEMO DATA – NOT LIVE OPERATIONAL DATA
                </span>
              </div>

              {/* Control Room Hero Visual */}
              <div className="relative h-44 sm:h-52 border-b border-slate-800 overflow-hidden">
                <img
                  src="/assets/aistudio/HOME_PAGE_2e68c67d.jpg"
                  alt="ARSHIEL AI Digital EHS Command Centre"
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071226] via-[#071226]/35 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-semibold text-[#00BFFF] uppercase tracking-wider">
                      Unified Multi-Site Safety Operations Preview
                    </div>
                    <div className="text-sm font-bold text-white">
                      Workforce · Permits · Risk Heatmaps · AI Vision · Compliance · ESG
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEnterPlatform('intel-data')}
                    className="text-xs font-bold text-[#020817] bg-[#FFC629] hover:bg-[#ffd252] px-3 py-1.5 rounded cursor-pointer whitespace-nowrap"
                  >
                    Open Live Workspace
                  </button>
                </div>
              </div>

              {/* Structured 9-Signal Preview Matrix */}
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                {[
                  { label: 'Workforce Overview', value: '1,420', status: 'Nominal · 98% Inducted', tone: 'text-emerald-400' },
                  { label: 'Critical Risk Alerts', value: '02', status: 'Review Pending (Demo)', tone: 'text-red-400' },
                  { label: 'Incident Monitoring', value: '01 Open', status: 'RCA in Progress', tone: 'text-amber-300' },
                  { label: 'Predictive Risk Index', value: 'Low-Mod', status: 'AI Forecast (Draft)', tone: 'text-[#00BFFF]' },
                  { label: 'Environmental Status', value: 'PM2.5 34', status: 'Within SPCB Norm (Demo)', tone: 'text-emerald-400' },
                  { label: 'Site Safety Map', value: '6 Zones', status: 'Digital Twin Ready', tone: 'text-[#00BFFF]' },
                  { label: 'Smart Permit Status', value: '14 Active', status: 'QR & LOTO Verified', tone: 'text-emerald-400' },
                  { label: 'Compliance Register', value: '96.4%', status: 'ISO & Statutory Tracked', tone: 'text-[#FFC629]' },
                  { label: 'AI Vision Status', value: 'Standby', status: 'Awaiting RTSP Config', tone: 'text-slate-300' },
                ].map((tile) => (
                  <div
                    key={tile.label}
                    className="rounded-lg bg-[#040C1B] border border-slate-800/90 p-2.5 flex flex-col justify-between"
                  >
                    <div className="text-[11px] text-slate-400 truncate">{tile.label}</div>
                    <div className="font-mono font-bold text-base text-white tabular-nums mt-1">{tile.value}</div>
                    <div className={`text-[10px] font-medium mt-0.5 truncate ${tile.tone}`}>{tile.status}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 01. AI EHS COMMAND CENTRE (4 SEPARATE PANELS) ================= */}
      <section id="platform" className="max-w-[1440px] mx-auto px-4 sm:px-6 py-16 lg:py-20 border-b border-slate-800/80">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FFC629] mb-2">
              01. AI EHS Command Centre Architecture
            </div>
            <h2 className="font-display font-bold text-2xl sm:text-4xl text-white tracking-tight">
              Four Dedicated Intelligence Panels — Zero Cluttered Scoreboards
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl">
              Workforce readiness, active safety events, predictive risk modeling, and six-category EHS KPIs are cleanly
              separated so leadership never confuses historical records, live alerts, and AI forecasts.
            </p>
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded bg-amber-500/10 text-[#FFC629] border border-amber-500/30 self-start lg:self-auto">
            DEMO DATA – NOT LIVE OPERATIONAL DATA
          </div>
        </div>

        {/* 4-Panel Segmented Navigation */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
          {[
            { id: 'workforce' as const, label: 'A. Workforce Intelligence', icon: Users },
            { id: 'realtime' as const, label: 'B. Real-Time Safety', icon: ShieldAlert },
            { id: 'predictive' as const, label: 'C. Predictive Risk Analytics', icon: BrainCircuit },
            { id: 'kpi' as const, label: 'D. 6-Category EHS KPIs', icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = commandTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCommandTab(tab.id)}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border text-left text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#0C1D3A] border-[#FFC629] text-white'
                    : 'bg-[#061126] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#FFC629]' : 'text-slate-500'}`} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Panel Content */}
        <div className="rounded-xl bg-[#061126] border border-slate-800 p-5 sm:p-6">
          {commandTab === 'workforce' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display font-bold text-lg text-white">Workforce Safety &amp; Competency Intelligence</h3>
                <span className="text-xs text-slate-400">Sample Enterprise Plant · Demo Dataset</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total Workforce', val: '1,420', note: 'Employees + Contractors', tone: 'text-white' },
                  { label: 'Active On-Site Today', val: '1,184', note: 'Shift A & B Headcount', tone: 'text-emerald-400' },
                  { label: 'Contractor Workforce', val: '386', note: '12 Approved Vendors', tone: 'text-[#00BFFF]' },
                  { label: 'Authorized Visitors', val: '28', note: 'Escorted & Briefed', tone: 'text-slate-200' },
                  { label: 'Workers Trained', val: '97.4%', note: '1,383 / 1,420 Current', tone: 'text-emerald-400' },
                  { label: 'Medical Fitness Valid', val: '98.8%', note: 'Annual OH Exam Valid', tone: 'text-emerald-400' },
                  { label: 'High-Risk Competency', val: '94.2%', note: 'LOTO / WAH / Confined', tone: 'text-[#FFC629]' },
                  { label: 'Missing Induction Alerts', val: '05', note: 'Gate Hold Enforced', tone: 'text-red-400' },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg bg-[#030A18] border border-slate-800 p-4">
                    <div className="text-xs text-slate-400">{m.label}</div>
                    <div className={`font-mono font-bold text-2xl tabular-nums mt-1 ${m.tone}`}>{m.val}</div>
                    <div className="text-[11px] text-slate-500 mt-1">{m.note}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {commandTab === 'realtime' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display font-bold text-lg text-white">Real-Time Operational Safety Intelligence</h3>
                <span className="text-xs text-slate-400">Connect Live Workspace for Real-Time Tenant Events</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Open Incidents', val: '01', status: 'Investigation Active', tone: 'text-amber-300' },
                  { label: 'High-Risk Activities', val: '06', status: 'Hot Work / Confined / HV', tone: 'text-[#FFC629]' },
                  { label: 'Critical Hazards Open', val: '02', status: 'Controls Escalated', tone: 'text-red-400' },
                  { label: 'Unsafe Acts Logged', val: '18', status: '15 Coached & Closed', tone: 'text-[#00BFFF]' },
                  { label: 'Unsafe Conditions', val: '24', status: '21 Engineering Closed', tone: 'text-emerald-400' },
                  { label: 'Near Miss Reports', val: '31', status: 'Leading Reporting Active', tone: 'text-emerald-400' },
                  { label: 'Emergency Alerts', val: '00', status: 'All Clear (Nominal)', tone: 'text-emerald-400' },
                  { label: 'Overdue CAPAs', val: '03', status: 'HOD Escalation Triggered', tone: 'text-red-400' },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg bg-[#030A18] border border-slate-800 p-4">
                    <div className="text-xs text-slate-400">{m.label}</div>
                    <div className={`font-mono font-bold text-2xl tabular-nums mt-1 ${m.tone}`}>{m.val}</div>
                    <div className="text-[11px] text-slate-500 mt-1">{m.status}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {commandTab === 'predictive' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display font-bold text-lg text-white">Predictive Risk Analytics &amp; Pattern Detection</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Explicitly separates verified historical observations from AI-estimated risk forecasts.
                  </p>
                </div>
                <div className="inline-flex rounded-md border border-slate-700 bg-[#030A18] p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setPredictiveMode('historical')}
                    className={`px-3 py-1.5 rounded font-semibold cursor-pointer ${
                      predictiveMode === 'historical' ? 'bg-slate-800 text-white' : 'text-slate-400'
                    }`}
                  >
                    Historical Baseline (Demo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPredictiveMode('forecast')}
                    className={`px-3 py-1.5 rounded font-semibold cursor-pointer ${
                      predictiveMode === 'forecast' ? 'bg-[#00BFFF] text-[#020817]' : 'text-slate-400'
                    }`}
                  >
                    AI Forecast (Estimate)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="rounded-lg bg-[#030A18] border border-slate-800 p-4 space-y-3">
                  <div className="text-xs font-bold text-[#FFC629] uppercase tracking-wider">
                    High-Risk Locations ({predictiveMode === 'forecast' ? 'Next 30-Day AI Forecast' : 'Last 90-Day Baseline'})
                  </div>
                  {[
                    { area: 'Solvent Reactor Block B', score: predictiveMode === 'forecast' ? 78 : 71, level: 'High Risk' },
                    { area: 'Loading Dock Bays 1–8', score: predictiveMode === 'forecast' ? 66 : 62, level: 'Moderate-High' },
                    { area: 'HV Switchgear Utility Hall', score: predictiveMode === 'forecast' ? 54 : 58, level: 'Controlled' },
                    { area: 'Packaging Line 3 Conveyors', score: predictiveMode === 'forecast' ? 42 : 47, level: 'Low-Moderate' },
                  ].map((loc) => (
                    <div key={loc.area} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-200 font-medium">{loc.area}</span>
                        <span className="font-mono text-slate-300 tabular-nums">{loc.score}/100 · {loc.level}</span>
                      </div>
                      <div className="h-2 rounded bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded ${
                            loc.score >= 70 ? 'bg-red-500' : loc.score >= 55 ? 'bg-amber-400' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${loc.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg bg-[#030A18] border border-slate-800 p-4 space-y-2.5">
                  <div className="text-xs font-bold text-[#00BFFF] uppercase tracking-wider">
                    Repeated Incident Patterns Detected
                  </div>
                  {[
                    { pattern: 'Shift-handover permit extensions on Hot Work', freq: '4 occurrences / 60d', action: 'Enforce mandatory HOD re-gas check' },
                    { pattern: 'Forklift-pedestrian near misses during evening dispatch', freq: '6 reports / 60d', action: 'Add physical barrier & spotter protocol' },
                    { pattern: 'Overdue calibration on portable 4-gas monitors', freq: '3 units due', action: 'Automated pre-issuance PTW lock' },
                  ].map((item) => (
                    <div key={item.pattern} className="p-2.5 rounded bg-[#071226] border border-slate-800 text-xs space-y-1">
                      <div className="font-semibold text-white">{item.pattern}</div>
                      <div className="text-amber-300 font-mono text-[11px]">{item.freq}</div>
                      <div className="text-slate-400 text-[11px]">Suggested Preventive Control: {item.action}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg bg-[#030A18] border border-slate-800 p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      AI Forecast Governance Disclosure
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Predictive risk probabilities are advisory statistical estimates computed from logged observations,
                      near misses, permit volume, and overdue actions.
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Competent EHS officers review and approve all preventive actions before work authorization changes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEnterPlatform('intel-data')}
                    className="w-full py-2.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-[#FFC629] border border-slate-700 cursor-pointer"
                  >
                    Open Data Intelligence (Live / Demo / Forecast) →
                  </button>
                </div>
              </div>
            </div>
          )}

          {commandTab === 'kpi' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display font-bold text-lg text-white">
                  EHS KPI Intelligence — Six Separated Performance Domains
                </h3>
                <span className="text-xs text-slate-400">Never combined into a single ambiguous score</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    cat: '1. Workforce KPIs',
                    items: [
                      ['Safety Training Completion', '97.4%'],
                      ['Contractor Induction Pass', '99.1%'],
                      ['Medical Fitness Validity', '98.8%'],
                    ],
                  },
                  {
                    cat: '2. Lagging Indicators',
                    items: [
                      ['LTIFR (per 1M Man-Hours)', '0.00'],
                      ['TRIR (OSHA Standard)', '0.24'],
                      ['Severity Rate (Days Lost)', '0.00'],
                    ],
                  },
                  {
                    cat: '3. Leading Indicators',
                    items: [
                      ['Near Misses Logged (YTD)', '142'],
                      ['Safety Walkdowns Completed', '96%'],
                      ['Toolbox Talk Coverage', '100%'],
                    ],
                  },
                  {
                    cat: '4. CAPA & Actions',
                    items: [
                      ['On-Time CAPA Closure', '94.5%'],
                      ['Overdue High-Risk Actions', '03'],
                      ['Avg Closure Lead Time', '4.2 days'],
                    ],
                  },
                  {
                    cat: '5. Permit to Work KPIs',
                    items: [
                      ['PTW Audit Compliance', '98.6%'],
                      ['LOTO Zero-Deviation Rate', '100%'],
                      ['Expired-Not-Closed Permits', '00'],
                    ],
                  },
                  {
                    cat: '6. Compliance & ISO KPIs',
                    items: [
                      ['Statutory Register Current', '96.4%'],
                      ['ISO 45001 / 14001 Audit Pass', '95.0%'],
                      ['Equipment Calibration Valid', '99.2%'],
                    ],
                  },
                ].map((group) => (
                  <div key={group.cat} className="rounded-lg bg-[#030A18] border border-slate-800 p-4 space-y-2.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#FFC629]">{group.cat}</div>
                    <div className="divide-y divide-slate-800/80">
                      {group.items.map(([k, v]) => (
                        <div key={k} className="py-2 flex items-center justify-between gap-2 text-xs">
                          <span className="text-slate-300">{k}</span>
                          <span className="font-mono font-bold text-white tabular-nums">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ================= 02. AI VISION SAFETY MONITORING ================= */}
      <section id="ai-features" className="max-w-[1440px] mx-auto px-4 sm:px-6 py-16 lg:py-20 border-b border-slate-800/80">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#00BFFF]">
              02. AI Vision Safety Monitoring Architecture
            </div>
            <h2 className="font-display font-bold text-2xl sm:text-4xl text-white tracking-tight">
              Computer-Vision Hazard Detection Built for Human Verification
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Connect existing industrial CCTV / RTSP cameras to monitor PPE compliance, restricted perimeter intrusion,
              forklift proximity, fire/smoke signatures, and machine-guard status — with mandatory human EHS verification
              before any disciplinary or operational action.
            </p>

            {/* Real Industrial Reference Asset */}
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#061126]">
              <div className="relative">
                <img
                  src="/assets/aistudio/AI_vison_safety_a3a31deb.jpg"
                  alt="ARSHIEL AI Vision Industrial Safety Monitoring Preview"
                  className="w-full h-60 object-cover"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-[#020817]/90 border border-amber-500/40 text-[10px] font-bold text-[#FFC629] uppercase">
                  CONCEPTUAL PREVIEW · REQUIRES RTSP/CCTV INTEGRATION
                </div>
              </div>
              <div className="p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <Camera className="w-4 h-4 text-[#00BFFF]" />
                  <span>Active Selection: {AI_VISION_CAPABILITIES[selectedVisionIdx].title}</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {AI_VISION_CAPABILITIES[selectedVisionIdx].detail}
                </p>
              </div>
            </div>

            {/* Honest Disclosure & Privacy Box */}
            <div className="rounded-lg bg-[#071328] border border-slate-800 p-4 text-xs text-slate-300 space-y-1.5">
              <div className="font-bold text-[#FFC629] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Camera Integration, Human Verification &amp; Privacy Disclosure</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Live AI Vision monitoring is disabled by default and activates only when a tenant connects authorized
                RTSP/ONVIF camera streams. Supports face-blur privacy masking, configurable frame retention windows,
                immutable event logs, and human safety officer sign-off.
              </p>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AI_VISION_CAPABILITIES.map((cap, idx) => {
              const active = idx === selectedVisionIdx;
              return (
                <button
                  key={cap.title}
                  type="button"
                  onClick={() => setSelectedVisionIdx(idx)}
                  className={`text-left rounded-lg p-4 border transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#0C1D3A] border-[#00BFFF]'
                      : 'bg-[#061126] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-display font-bold text-sm text-white">{cap.title}</span>
                    <Eye className={`w-4 h-4 shrink-0 ${active ? 'text-[#00BFFF]' : 'text-slate-500'}`} />
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{cap.detail}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= 03. SMART PERMIT TO WORK (PTW) ================= */}
      <section id="ehs-solutions" className="max-w-[1440px] mx-auto px-4 sm:px-6 py-16 lg:py-20 border-b border-slate-800/80">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FFC629] mb-2">
              03. Smart Permit to Work (PTW) &amp; Energy Isolation
            </div>
            <h2 className="font-display font-bold text-2xl sm:text-4xl text-white tracking-tight">
              10+ High-Risk Digital Permits with 6-Stage Verified Sign-Off
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl">
              Enforce LOTO isolation verification, continuous gas testing, SIMOPS conflict checks, shift extensions,
              instant suspension, and QR field validation on every high-risk job.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onEnterPlatform('ptw')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#FFC629] hover:bg-[#ffd252] text-[#020817] font-bold text-xs cursor-pointer self-start lg:self-auto whitespace-nowrap"
          >
            <span>Open Live PTW Module</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Permit Type Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
          {SMART_PTW_TYPES.map((p) => {
            const active = p.code === selectedPtw.code;
            return (
              <button
                key={p.code}
                type="button"
                onClick={() => setSelectedPtwCode(p.code)}
                className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#0C1D3A] border-[#FFC629] text-white'
                    : 'bg-[#061126] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                  <span className="text-[#00BFFF]">{p.code}</span>
                  <span
                    className={
                      p.risk === 'Critical'
                        ? 'text-red-400 font-bold'
                        : p.risk === 'High'
                        ? 'text-amber-300 font-bold'
                        : 'text-emerald-400'
                    }
                  >
                    {p.risk}
                  </span>
                </div>
                <div className="text-xs font-semibold mt-1 truncate">{p.name}</div>
              </button>
            );
          })}
        </div>

        {/* Selected Permit Control Strip + 6-Stage Workflow */}
        <div className="rounded-xl bg-[#061126] border border-slate-800 p-5 sm:p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
            <div>
              <div className="text-xs font-mono text-[#00BFFF]">
                {selectedPtw.code} · {selectedPtw.risk.toUpperCase()} RISK PERMIT PROTOCOL
              </div>
              <h3 className="font-display font-bold text-xl text-white mt-0.5">{selectedPtw.name}</h3>
              <p className="text-xs text-slate-300 mt-1">
                Mandatory Pre-Issuance Controls: <span className="text-white">{selectedPtw.controls}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-mono">
              <span className="px-2.5 py-1 rounded bg-[#030A18] border border-slate-700 text-emerald-400">
                QR Field Verification
              </span>
              <span className="px-2.5 py-1 rounded bg-[#030A18] border border-slate-700 text-[#FFC629]">
                Shift Validity &amp; Extension Log
              </span>
              <span className="px-2.5 py-1 rounded bg-[#030A18] border border-slate-700 text-red-300">
                1-Click Emergency Suspend
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {PTW_WORKFLOW_STAGES.map((stage) => (
              <div key={stage.step} className="rounded-lg bg-[#030A18] border border-slate-800 p-3.5 space-y-1.5">
                <div className="font-mono text-xs font-bold text-[#FFC629]">Stage {stage.step}</div>
                <div className="text-sm font-bold text-white leading-snug">{stage.title}</div>
                <div className="text-[11px] font-semibold text-[#00BFFF]">{stage.role}</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{stage.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 04. DIGITAL TWIN SAFETY MAP ================= */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 py-16 lg:py-20 border-b border-slate-800/80">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#00BFFF] mb-2">
              04. Digital Twin Safety Map &amp; Emergency Zoning
            </div>
            <h2 className="font-display font-bold text-2xl sm:text-4xl text-white tracking-tight">
              Interactive Facility Hazard, Egress &amp; Fire Protection Mapping
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl">
              Upload your own plant CAD/floor plans to map high-risk zones, emergency exits, fire extinguishers,
              first-aid stations, assembly points, and restricted electrical rooms.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 border border-slate-800 bg-[#061126] px-3 py-1.5 rounded self-start lg:self-auto">
            No Simulated Personnel GPS — Supports Authorized Zone Pinning Only
          </span>
        </div>

        {/* Facility Selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          {DIGITAL_TWIN_FACILITIES.map((fac) => (
            <button
              key={fac.id}
              type="button"
              onClick={() => {
                setSelectedFacilityId(fac.id);
                setSelectedZoneId(fac.zones[0].id);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                fac.id === selectedFacility.id
                  ? 'bg-[#00BFFF] text-[#020817] border-[#00BFFF]'
                  : 'bg-[#061126] text-slate-300 border-slate-800 hover:border-slate-600'
              }`}
            >
              {fac.name}
            </button>
          ))}
        </div>

        {/* Layer Filter Toggles */}
        <div className="flex flex-wrap items-center gap-2 mb-5 text-xs">
          <span className="text-slate-400 font-semibold mr-1">Map Layers:</span>
          {[
            { key: 'all', label: 'All Safety Layers' },
            { key: 'hazard', label: 'Hazards' },
            { key: 'exit', label: 'Emergency Exits' },
            { key: 'fire', label: 'Fire Protection' },
            { key: 'assembly', label: 'Assembly Points' },
            { key: 'firstaid', label: 'First Aid' },
            { key: 'restricted', label: 'Restricted Zones' },
          ].map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => setSelectedTwinLayer(l.key)}
              className={`px-2.5 py-1 rounded border cursor-pointer ${
                selectedTwinLayer === l.key
                  ? 'bg-[#FFC629] text-[#020817] border-[#FFC629] font-bold'
                  : 'bg-[#030A18] text-slate-300 border-slate-800 hover:border-slate-600'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Interactive Digital Twin Visual Canvas */}
          <div className="lg:col-span-8 relative rounded-xl overflow-hidden border border-slate-800 bg-[#050E20] min-h-[340px] sm:min-h-[420px]">
            <img
              src="/assets/aistudio/digital_veiw_673a14ce.jpg"
              alt={`Digital Twin Safety Map — ${selectedFacility.name}`}
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-[#020817]/35" />

            <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-[#020817]/90 border border-slate-700 text-[11px] font-semibold text-white">
              {selectedFacility.name} · Interactive Safety Layer Preview (Demo)
            </div>

            {/* Interactive Zone Markers */}
            {visibleZones.map((zone) => {
              const st = zoneTypeStyle(zone.type);
              const isSelected = activeZone?.id === zone.id;
              return (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => setSelectedZoneId(zone.id)}
                  style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md text-[11px] font-bold text-white shadow-lg ring-4 transition-transform cursor-pointer whitespace-nowrap ${st.bg} ${st.ring} ${
                    isSelected ? 'scale-110 z-20 ring-white' : 'z-10 hover:scale-105'
                  }`}
                >
                  <MapPin className="w-3 h-3 inline mr-1 -mt-0.5" />
                  {zone.label}
                </button>
              );
            })}
          </div>

          {/* Zone Inspector Panel */}
          <div className="lg:col-span-4 rounded-xl bg-[#061126] border border-slate-800 p-5 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-[#FFC629]">
                Selected Safety Zone Inspector
              </div>
              {activeZone && (
                <div className="rounded-lg bg-[#030A18] border border-slate-800 p-4 space-y-2">
                  <div className="text-[11px] font-mono uppercase text-[#00BFFF]">
                    {zoneTypeStyle(activeZone.type).label}
                  </div>
                  <div className="font-display font-bold text-lg text-white">{activeZone.label}</div>
                  <p className="text-xs text-slate-300 leading-relaxed">{activeZone.note}</p>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-300">All Mapped Zones ({selectedFacility.zones.length})</div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {selectedFacility.zones.map((z) => (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => setSelectedZoneId(z.id)}
                      className={`w-full text-left px-3 py-2 rounded border text-xs flex items-center justify-between cursor-pointer ${
                        activeZone?.id === z.id
                          ? 'bg-[#0C1D3A] border-[#00BFFF] text-white'
                          : 'bg-[#030A18] border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="truncate font-medium">{z.label}</span>
                      <span className="text-[10px] uppercase text-slate-400 shrink-0 ml-2">
                        {zoneTypeStyle(z.type).label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 pt-3 border-t border-slate-800">
              Organizations upload custom site floor plans inside their workspace to pin exits, hydrants, evacuation
              routes, and authorized work-permit areas.
            </div>
          </div>
        </div>
      </section>

      {/* ================= 05. AI EHS DOCUMENT INTELLIGENCE ================= */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 py-16 lg:py-20 border-b border-slate-800/80">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FFC629]">
              05. AI EHS Document Intelligence &amp; Human Governance
            </div>
            <h2 className="font-display font-bold text-2xl sm:text-4xl text-white tracking-tight">
              15 AI-Assisted EHS Document Workflows with Mandatory Approval Gates
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Accelerate safety engineering paperwork from HIRA and JSA to 5-Why RCA and Emergency Response Plans —
              grounded in your organization&apos;s own uploaded RAG Knowledge Base.
            </p>

            {/* Mandatory AI Transparency Governance Card */}
            <div className="rounded-xl bg-[#071328] border border-amber-500/40 p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#FFC629]">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>AI Transparency &amp; Human Approval Governance</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-2.5 rounded bg-[#030A18] border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Document Status</div>
                  <div className="font-bold text-[#FFC629] mt-0.5">AI-GENERATED DRAFT</div>
                </div>
                <div className="p-2.5 rounded bg-[#030A18] border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Auto-Approval</div>
                  <div className="font-bold text-red-400 mt-0.5">STRICTLY DISABLED</div>
                </div>
                <div className="p-2.5 rounded bg-[#030A18] border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Verification Gate</div>
                  <div className="font-semibold text-white mt-0.5">Competent Safety Reviewer</div>
                </div>
                <div className="p-2.5 rounded bg-[#030A18] border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Audit Traceability</div>
                  <div className="font-semibold text-emerald-400 mt-0.5">References &amp; Revision Log</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onEnterPlatform('ai-assistant')}
                className="w-full py-2.5 px-4 rounded-md bg-[#FFC629] hover:bg-[#ffd252] text-[#020817] font-bold text-xs cursor-pointer"
              >
                Launch AI Safety Document Copilot →
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {AI_DOCUMENT_TYPES.map((doc, idx) => {
              const active = idx === selectedDocIdx;
              return (
                <button
                  key={doc.name}
                  type="button"
                  onClick={() => setSelectedDocIdx(idx)}
                  className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#0C1D3A] border-[#FFC629] text-white'
                      : 'bg-[#061126] border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#00BFFF]">
                      {doc.category}
                    </span>
                    <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  </div>
                  <div className="text-xs font-bold text-white leading-snug">{doc.name}</div>
                  <div className="text-[10px] text-slate-400 mt-1.5">AI Draft · Human Sign-Off</div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= 06. GLOBAL LEGAL & ISO COMPLIANCE ENGINE ================= */}
      <section id="compliance" className="max-w-[1440px] mx-auto px-4 sm:px-6 py-16 lg:py-20 border-b border-slate-800/80">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#00BFFF] mb-2">
              06. Global Legal &amp; ISO Compliance Engine
            </div>
            <h2 className="font-display font-bold text-2xl sm:text-4xl text-white tracking-tight">
              Structured Statutory Hierarchy: Country → State → Industry → Requirement
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-3xl">
              Track Indian Factories Act transitional provisions, OSHWC Code 2020, State Factory Rules, CEA Electrical,
              NBC Fire Safety, CPCB/SPCB Environmental Norms, OSHA, NFPA, ISO 9001/14001/45001/50001/27001, and ESG/GHG
              disclosures with official source links.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onEnterPlatform('legal')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-white cursor-pointer self-start lg:self-auto whitespace-nowrap"
          >
            <Scale className="w-4 h-4 text-[#FFC629]" />
            <span>Open Legal Register Workspace</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
          <div className="flex flex-wrap gap-1.5">
            {complianceCountries.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setComplianceCountry(c)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold border cursor-pointer ${
                  complianceCountry === c
                    ? 'bg-[#FFC629] text-[#020817] border-[#FFC629]'
                    : 'bg-[#061126] text-slate-300 border-slate-800 hover:border-slate-600'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-md sm:ml-auto">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={complianceSearch}
              onChange={(e) => setComplianceSearch(e.target.value)}
              placeholder="Filter by state, regulation, ISO, OSHA, OSHWC..."
              className="w-full bg-[#061126] border border-slate-700 rounded-md pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00BFFF]"
            />
          </div>
        </div>

        {/* Compliance Table */}
        <div className="rounded-xl border border-slate-800 bg-[#061126] overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[820px]">
            <thead>
              <tr className="bg-[#0A1833] text-slate-300 border-b border-slate-800">
                <th className="py-3 px-4 font-semibold">Country / State</th>
                <th className="py-3 px-4 font-semibold">Industry &amp; Activity</th>
                <th className="py-3 px-4 font-semibold">Applicable Regulation</th>
                <th className="py-3 px-4 font-semibold">Compliance Requirement &amp; Effective Note</th>
                <th className="py-3 px-4 font-semibold">Official Source &amp; Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredCompliance.map((row) => (
                <tr key={row.id} className="hover:bg-[#0A1833]/60 transition-colors">
                  <td className="py-3.5 px-4 align-top">
                    <div className="font-bold text-white">{row.country}</div>
                    <div className="text-[11px] text-[#00BFFF] mt-0.5">{row.state}</div>
                  </td>
                  <td className="py-3.5 px-4 align-top">
                    <div className="font-semibold text-slate-200">{row.industry}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{row.activity}</div>
                  </td>
                  <td className="py-3.5 px-4 align-top max-w-xs">
                    <div className="font-semibold text-[#FFC629]">{row.regulation}</div>
                    <div className="text-[11px] text-slate-400 mt-1">{row.effectiveDate}</div>
                  </td>
                  <td className="py-3.5 px-4 align-top max-w-md">
                    <div className="text-slate-200 leading-relaxed">{row.requirement}</div>
                    <div className="text-[11px] text-slate-400 mt-1">{row.amendmentNote}</div>
                  </td>
                  <td className="py-3.5 px-4 align-top">
                    <a
                      href={row.officialSourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#00BFFF] hover:underline font-semibold"
                    >
                      <span>{row.officialSourceName}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <div className="text-[10px] text-emerald-400 mt-1 font-medium">{row.verificationStatus}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Non-Authority Disclaimer */}
        <div className="mt-4 rounded-lg bg-[#051024] border border-slate-800 px-4 py-3 text-xs text-slate-400">
          <strong className="text-slate-200">Compliance Authority Notice:</strong> ARSHIEL SAFETY provides a structured
          compliance register and official-source linkage tool. It is not a government authority, legal advisor, or
          statutory gazette. Always verify current state/central notifications and engage qualified EHS legal counsel.
        </div>
      </section>

      {/* ================= 07. ESG, EMERGENCY COMMAND & SMART DEVICES ================= */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 py-16 lg:py-20 border-b border-slate-800/80">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ESG & Environmental Intelligence */}
          <div className="lg:col-span-6 rounded-xl bg-[#061126] border border-slate-800 overflow-hidden flex flex-col">
            <div className="relative h-48 border-b border-slate-800">
              <img
                src="/assets/aistudio/ESG__GHG_f503b643.jpg"
                alt="ARSHIEL Environmental & ESG GHG Sustainability Intelligence"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#061126] via-[#061126]/30 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  <Leaf className="w-4 h-4" />
                  <span>Environmental, Carbon &amp; ESG Intelligence</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#020817]/90 text-[#FFC629] border border-amber-500/40">
                  DEMO PREVIEW
                </span>
              </div>
            </div>
            <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
              <p className="text-xs text-slate-300 leading-relaxed">
                Track Scope 1, 2 &amp; 3 GHG emissions, ambient air quality, water withdrawal/ZLD recycling, hazardous
                waste manifests, energy intensity, environmental incidents, and BRSR/GRI sustainability KPIs.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                {[
                  ['Scope 1+2 GHG', '1,840 tCO2e'],
                  ['Water Recycled', '72.4%'],
                  ['Waste Diverted', '88.0%'],
                  ['Renewable Share', '54.2%'],
                ].map(([k, v]) => (
                  <div key={k} className="p-2.5 rounded bg-[#030A18] border border-slate-800">
                    <div className="text-[11px] text-slate-400">{k}</div>
                    <div className="font-mono font-bold text-white tabular-nums mt-0.5">{v}</div>
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                Real-time CEMS/OCEMS or air-quality telemetry applies only when connected to authorized facility sensors.
              </div>
            </div>
          </div>

          {/* Incident & Emergency Command + Energy & Smart Device Readiness */}
          <div className="lg:col-span-6 grid grid-cols-1 gap-6">
            <div className="rounded-xl bg-[#061126] border border-slate-800 p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-wider">
                  <Siren className="w-4 h-4" />
                  <span>Incident &amp; Emergency Command Centre</span>
                </div>
                <button
                  type="button"
                  onClick={() => onEnterPlatform('incidents')}
                  className="text-xs font-semibold text-[#FFC629] hover:underline cursor-pointer"
                >
                  Open Module →
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                End-to-end incident intake, immediate containment, 5-Why &amp; Fishbone RCA, CAPA assignment with SLA
                escalation, mock evacuation drills, fire-equipment registers, and role-gated emergency broadcasts.
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded bg-[#030A18] border border-slate-800">
                  <div className="text-slate-400 text-[11px]">RCA Methods</div>
                  <div className="font-semibold text-white mt-0.5">5-Why · Fishbone</div>
                </div>
                <div className="p-2.5 rounded bg-[#030A18] border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Escalation</div>
                  <div className="font-semibold text-white mt-0.5">In-App &amp; Email</div>
                </div>
                <div className="p-2.5 rounded bg-[#030A18] border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Audit Export</div>
                  <div className="font-semibold text-white mt-0.5">PDF · Excel · CSV</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-[#061126] border border-slate-800 p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[#00BFFF] text-xs font-bold uppercase tracking-wider">
                  <Cpu className="w-4 h-4" />
                  <span>Energy &amp; Smart Device Integration Architecture</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">API / MQTT READY</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Structured ingestion architecture for IoT environmental sensors, portable 4-gas detectors, smart PPE
                tags, industrial wearables, energy sub-meters, and automated calibration expiry registers.
              </p>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {['4-Gas Detectors', 'Air & Noise Sensors', 'Energy Sub-Meters', 'Smart PPE', 'Calibration Register'].map(
                  (item) => (
                    <span key={item} className="px-2.5 py-1 rounded bg-[#030A18] border border-slate-800 text-slate-300">
                      {item}
                    </span>
                  )
                )}
              </div>
              <div className="text-[11px] text-slate-400">
                Hardware connectivity is inactive by default until external device gateways are configured by your site IT/OT team.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 08. INDUSTRIES WE SERVE (ALL 15 INTERACTIVE CARDS) ================= */}
      <section id="industries" className="max-w-[1440px] mx-auto px-4 sm:px-6 py-16 lg:py-20 border-b border-slate-800/80">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FFC629] mb-2">
              08. Industry-Specific EHS Intelligence (15 Sectors)
            </div>
            <h2 className="font-display font-bold text-2xl sm:text-4xl text-white tracking-tight">
              Select Any Industry to Inspect Tailored Risks, Permits &amp; Controls
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onEnterPlatform('intel-industry')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#FFC629] hover:bg-[#ffd252] text-[#020817] font-bold text-xs cursor-pointer self-start lg:self-auto whitespace-nowrap"
          >
            <span>Open Industry Intelligence Hub</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 15 Selectable Industry Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 mb-6">
          {INDUSTRIES_CATALOG.map((ind) => {
            const active = ind.id === selectedIndustry.id;
            return (
              <button
                key={ind.id}
                type="button"
                onClick={() => setSelectedIndustryId(ind.id)}
                className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#0C1D3A] border-[#FFC629] text-white'
                    : 'bg-[#061126] border-slate-800 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="text-xs font-bold leading-snug">{ind.name}</div>
                <div className="text-[10px] text-slate-400 mt-1 truncate">{ind.sectorGroup}</div>
              </button>
            );
          })}
        </div>

        {/* Selected Industry Dynamic Preview */}
        <div className="rounded-xl bg-[#061126] border border-slate-800 p-5 sm:p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <div className="text-xs font-semibold text-[#00BFFF] uppercase tracking-wider">
                {selectedIndustry.sectorGroup}
              </div>
              <h3 className="font-display font-bold text-2xl text-white mt-0.5">
                {selectedIndustry.name} — EHS Intelligence Blueprint
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl">{selectedIndustry.summary}</p>
            </div>
            <button
              type="button"
              onClick={() => onEnterPlatform('intel-industry')}
              className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 border border-[#00BFFF]/50 text-xs font-semibold text-[#00BFFF] cursor-pointer self-start md:self-auto whitespace-nowrap"
            >
              Launch in Workspace →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="rounded-lg bg-[#030A18] border border-slate-800 p-4 space-y-2.5">
              <div className="font-bold text-red-400 uppercase tracking-wider">Top Industry Hazards</div>
              {selectedIndustry.topRisks.map((r) => (
                <div key={r.hazard} className="pb-2 border-b border-slate-800/70 last:border-0 last:pb-0">
                  <div className="font-semibold text-white">{r.hazard}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Control: {r.primaryControl}</div>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-[#030A18] border border-slate-800 p-4 space-y-3">
              <div>
                <div className="font-bold text-[#FFC629] uppercase tracking-wider mb-1.5">Mandatory Permits</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedIndustry.mandatoryPermits.map((p) => (
                    <span key={p} className="px-2 py-0.5 rounded bg-[#071226] border border-slate-700 text-slate-200">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-bold text-[#00BFFF] uppercase tracking-wider mb-1.5">HIRA / JSA &amp; SOP Packs</div>
                <ul className="space-y-1 text-slate-300 list-disc pl-4">
                  {selectedIndustry.hiraJsaTemplates.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-lg bg-[#030A18] border border-slate-800 p-4 space-y-3">
              <div>
                <div className="font-bold text-emerald-400 uppercase tracking-wider mb-1.5">
                  Applicable Legal &amp; ISO Frameworks
                </div>
                <ul className="space-y-1 text-slate-300 list-disc pl-4">
                  {selectedIndustry.legalCompliance.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="font-bold text-slate-300 uppercase tracking-wider mb-1.5">Emergency Preparedness</div>
                <ul className="space-y-1 text-slate-400 list-disc pl-4">
                  {selectedIndustry.emergencyScenarios.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 09. BRAND SEPARATION: ARSHIEL SAFETY vs ARSHIEL ASSURANCE ================= */}
      <section id="assurance" className="max-w-[1440px] mx-auto px-4 sm:px-6 py-16 lg:py-20 border-b border-slate-800/80">
        <div className="mb-8">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#00BFFF] mb-2">
            09. Clear Brand Positioning &amp; Governance Separation
          </div>
          <h2 className="font-display font-bold text-2xl sm:text-4xl text-white tracking-tight">
            Two Focused Divisions — Transparent Scope, Zero Fabricated Accreditations
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ARSHIEL SAFETY */}
          <div className="rounded-xl bg-[#061126] border border-[#FFC629]/40 p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-[#FFC629]">
                Software &amp; Digital Intelligence Division
              </div>
              <h3 className="font-display font-extrabold text-2xl text-white">ARSHIEL SAFETY</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                AI-powered enterprise EHS software platform for multi-site digital operations: Smart Permit to Work,
                LOTO, Incident/RCA/CAPA, HIRA/HAZOP, Safety Audits, Equipment Registers, ESG/GHG tracking, Master KPI
                Hub, and the ARSHIEL Intelligence Hub.
              </p>
              <ul className="space-y-2 text-xs text-slate-300 pt-1">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#FFC629] shrink-0 mt-0.5" />
                  <span>Multi-tenant PostgreSQL &amp; RBAC SaaS architecture with strict organization isolation</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#FFC629] shrink-0 mt-0.5" />
                  <span>AI-assisted drafting tools with mandatory human review and audit trails</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#FFC629] shrink-0 mt-0.5" />
                  <span>Installable Progressive Web App (PWA) for desktop, tablet, and field mobile use</span>
                </li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => onEnterPlatform('dashboard')}
                className="px-5 py-2.5 rounded-md bg-[#FFC629] hover:bg-[#ffd252] text-[#020817] font-bold text-xs cursor-pointer"
              >
                Enter ARSHIEL SAFETY
              </button>
              <button
                type="button"
                onClick={() => {
                  setInquiryType('ARSHIEL SAFETY Demo');
                  scrollToSection('contact');
                }}
                className="px-5 py-2.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-semibold text-xs cursor-pointer"
              >
                Request a Demo
              </button>
            </div>
          </div>

          {/* ARSHIEL ASSURANCE */}
          <div className="rounded-xl bg-[#061126] border border-[#00BFFF]/40 p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-[#00BFFF]">
                Consultancy, Assessments &amp; Advisory Division
              </div>
              <h3 className="font-display font-extrabold text-2xl text-white">ARSHIEL ASSURANCE</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Dedicated EHS consultancy, ISO readiness advisory (ISO 9001, 14001, 45001, 50001, 27001), independent
                safety gap assessments, statutory compliance reviews, internal audit support, and workforce safety
                competency training.
              </p>
              <ul className="space-y-2 text-xs text-slate-300 pt-1">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#00BFFF] shrink-0 mt-0.5" />
                  <span>Pre-certification readiness assessments, gap analysis &amp; documentation alignment</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#00BFFF] shrink-0 mt-0.5" />
                  <span>Independent site safety walkdowns, HIRA/HAZOP facilitation &amp; audit preparation</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                  <span className="text-slate-400">
                    <strong className="text-slate-200">Transparency Statement:</strong> ARSHIEL ASSURANCE provides
                    consultancy, readiness assessments, and training only. Accredited third-party ISO certificates are
                    issued exclusively by independent accredited certification bodies.
                  </span>
                </li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setInquiryType('ARSHIEL ASSURANCE Assessment');
                  scrollToSection('contact');
                }}
                className="px-5 py-2.5 rounded-md bg-[#00BFFF] hover:bg-[#38cfff] text-[#020817] font-bold text-xs cursor-pointer"
              >
                Book an Assessment
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('contact')}
                className="px-5 py-2.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-semibold text-xs cursor-pointer"
              >
                Contact Us
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 10. SECURITY, FAQ & LIVE DEMO / CONTACT FORM ================= */}
      <section id="contact" className="max-w-[1440px] mx-auto px-4 sm:px-6 py-16 lg:py-20 border-b border-slate-800/80">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left: Security, Ownership & FAQ */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FFC629] mb-2">
                10. Security, Data Protection &amp; Direct Support
              </div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight">
                Built for Multi-Tenant Enterprise Isolation &amp; Accountability
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                { title: 'Strict Tenant Isolation', desc: 'Organization-scoped queries and role-based access enforcement across every EHS module.' },
                { title: 'Immutable Audit Trails', desc: 'Login/logout events, permit approvals, and administrative changes are logged with timestamps.' },
                { title: 'Verified Owner Governance', desc: 'Platform architecture, module builder, and super-admin controls are locked to the platform owner.' },
                { title: 'Zero Unverified Claims', desc: 'Clear separation between live tenant data, demo previews, AI drafts, and official statutory links.' },
              ].map((card) => (
                <div key={card.title} className="rounded-lg bg-[#061126] border border-slate-800 p-4">
                  <div className="font-bold text-white mb-1">{card.title}</div>
                  <p className="text-slate-400 leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>

            {/* Direct Contact Card — Jonathan Thadanki */}
            <div className="rounded-xl bg-[#061126] border border-slate-800 p-5 space-y-3 text-xs">
              <div className="text-xs font-bold uppercase tracking-wider text-[#FFC629]">
                Founder, Owner &amp; Lead Developer Contact
              </div>
              <div className="text-base font-display font-bold text-white">Jonathan Thadanki</div>
              <div className="text-slate-400">ARSHIEL SAFETY (ARSHIEL EHS AI SOLUTIONS) · ARSHIEL ASSURANCE</div>
              <div className="space-y-2 pt-1">
                <a
                  href="mailto:jonathan.tadanki@gmail.com"
                  className="flex items-center gap-2 text-slate-200 hover:text-[#FFC629]"
                >
                  <Mail className="w-4 h-4 text-[#00BFFF] shrink-0" />
                  <span>jonathan.tadanki@gmail.com</span>
                </a>
                <div className="flex items-start gap-2 text-slate-200">
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="font-mono tabular-nums">
                    +91 9133 661 933 / +91 81 84 83 40 60 / +91 81 86 80 88 48
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive FAQ */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Frequently Asked Questions
              </div>
              {FAQ_ITEMS.map((item, idx) => {
                const open = openFaqIdx === idx;
                return (
                  <div key={item.q} className="rounded-lg bg-[#061126] border border-slate-800 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenFaqIdx(open ? null : idx)}
                      className="w-full px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <span>{item.q}</span>
                      {open ? (
                        <ChevronUp className="w-4 h-4 text-[#FFC629] shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {open && (
                      <div className="px-4 pb-3.5 text-xs text-slate-300 leading-relaxed border-t border-slate-800/70 pt-2.5">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Live Request a Demo / Book an Assessment Form */}
          <div className="lg:col-span-6 rounded-xl bg-[#061126] border border-slate-800 p-6 sm:p-8 space-y-5">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#00BFFF]">
                Direct Enterprise Inquiry
              </div>
              <h3 className="font-display font-bold text-2xl text-white mt-1">
                Request a Demo or Book an Assessment
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Submissions are recorded directly in the ARSHIEL database and routed to Jonathan Thadanki.
              </p>
            </div>

            {/* Inquiry Type Switch */}
            <div className="grid grid-cols-2 gap-2">
              {(['ARSHIEL SAFETY Demo', 'ARSHIEL ASSURANCE Assessment'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setInquiryType(t)}
                  className={`py-2.5 px-3 rounded-md text-xs font-bold border transition-colors cursor-pointer ${
                    inquiryType === t
                      ? 'bg-[#FFC629] text-[#020817] border-[#FFC629]'
                      : 'bg-[#030A18] text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <form onSubmit={handleDemoSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">Full Name *</label>
                  <input
                    required
                    value={demoName}
                    onChange={(e) => setDemoName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full rounded-md bg-[#030A18] border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FFC629]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">Work Email *</label>
                  <input
                    required
                    type="email"
                    value={demoEmail}
                    onChange={(e) => setDemoEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full rounded-md bg-[#030A18] border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FFC629]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">Organization / Company *</label>
                  <input
                    required
                    value={demoCompany}
                    onChange={(e) => setDemoCompany(e.target.value)}
                    placeholder="Company name"
                    className="w-full rounded-md bg-[#030A18] border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FFC629]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">Primary Industry</label>
                  <select
                    value={demoIndustry}
                    onChange={(e) => setDemoIndustry(e.target.value)}
                    className="w-full rounded-md bg-[#030A18] border border-slate-700 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#FFC629]"
                  >
                    {INDUSTRIES_CATALOG.map((ind) => (
                      <option key={ind.id} value={ind.name}>
                        {ind.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">Phone / WhatsApp (Optional)</label>
                <input
                  value={demoPhone}
                  onChange={(e) => setDemoPhone(e.target.value)}
                  placeholder="+91 / International phone"
                  className="w-full rounded-md bg-[#030A18] border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FFC629]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  EHS Requirements, Sites &amp; Compliance Goals
                </label>
                <textarea
                  rows={4}
                  value={demoMessage}
                  onChange={(e) => setDemoMessage(e.target.value)}
                  placeholder="Share number of sites, target standards (ISO 45001/14001, OSHA, OSHWC), or assessment scope..."
                  className="w-full rounded-md bg-[#030A18] border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FFC629]"
                />
              </div>

              {demoResult && (
                <div
                  className={`p-3 rounded-md text-xs font-medium border ${
                    demoResult.ok
                      ? 'bg-emerald-950/60 border-emerald-600/60 text-emerald-200'
                      : 'bg-red-950/60 border-red-600/60 text-red-200'
                  }`}
                >
                  {demoResult.text}
                </div>
              )}

              <button
                type="submit"
                disabled={submittingDemo}
                className="w-full min-h-[46px] py-3 px-6 rounded-md bg-[#FFC629] hover:bg-[#ffd252] disabled:opacity-60 text-[#020817] font-bold text-sm transition-colors cursor-pointer"
              >
                {submittingDemo ? 'Submitting Inquiry...' : `Submit ${inquiryType} Request`}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ================= QUIET LEGAL & COMPLIANCE FOOTER ================= */}
      <footer className="bg-[#010510] text-slate-400">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
            <div className="space-y-1">
              <div className="font-display font-extrabold text-base arshiel-gold-text">
                ARSHIEL SAFETY · ARSHIEL ASSURANCE
              </div>
              <div className="text-xs text-slate-400">
                ARSHIEL EHS AI SOLUTIONS — Founded, Owned &amp; Developed by{' '}
                <strong className="text-white">Jonathan Thadanki</strong>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                jonathan.tadanki@gmail.com · +91 9133 661 933 / +91 81 84 83 40 60 / +91 81 86 80 88 48
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onOpenClassicOverview}
                className="px-3.5 py-2 rounded-md border border-slate-800 hover:border-slate-600 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
              >
                Classic Overview (/overview)
              </button>
              <button
                type="button"
                onClick={() => onEnterPlatform('dashboard')}
                className="px-3.5 py-2 rounded-md bg-[#FFC629] text-[#020817] text-xs font-bold cursor-pointer"
              >
                Enter Platform
              </button>
            </div>
          </div>

          {/* Legal & Regulatory Policy Links */}
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {LEGAL_POLICIES.map((pol) => (
                <button
                  key={pol.id}
                  type="button"
                  onClick={() => setActivePolicy(pol)}
                  className="hover:text-[#FFC629] transition-colors cursor-pointer"
                >
                  {pol.title}
                </button>
              ))}
            </div>
            <div className="text-[11px] text-slate-500">
              &copy; 2026 ARSHIEL SAFETY &amp; ARSHIEL ASSURANCE · Jonathan Thadanki. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* ================= LEGAL POLICY MODAL VIEWER ================= */}
      {activePolicy && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#061126] border border-slate-700 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display font-bold text-lg text-white">{activePolicy.title}</h3>
                <div className="text-[11px] text-[#00BFFF]">{activePolicy.updatedAt} · ARSHIEL SAFETY &amp; ARSHIEL ASSURANCE</div>
              </div>
              <button
                type="button"
                onClick={() => setActivePolicy(null)}
                className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                aria-label="Close legal policy"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
              {activePolicy.sections.map((sec) => (
                <div key={sec.heading} className="space-y-1">
                  <h4 className="font-bold text-white">{sec.heading}</h4>
                  <p className="text-slate-300">{sec.body}</p>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setActivePolicy(null)}
                className="px-4 py-2 rounded-md bg-[#FFC629] text-[#020817] text-xs font-bold cursor-pointer"
              >
                Close Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= LOGOUT CONFIRMATION MODAL ================= */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#061126] border border-slate-700 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-display font-bold text-lg text-white">Confirm Secure Logout</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your active ARSHIEL SAFETY session will be securely terminated and recorded in the security audit trail.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={loggingOut}
                className="px-4 py-2 rounded-md bg-slate-800 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                disabled={loggingOut}
                className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
              >
                {loggingOut ? 'Signing Out...' : 'Yes, Logout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
