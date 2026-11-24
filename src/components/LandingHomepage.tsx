import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Cpu,
  Database,
  Factory,
  FileCheck2,
  Flame,
  FlaskConical,
  Globe,
  HardHat,
  HeartPulse,
  Layers,
  Leaf,
  Lock,
  Mail,
  Menu,
  MessageSquare,
  Package,
  Phone,
  Scale,
  ScanEye,
  Search,
  Server,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';
import { DynamicIcon } from './IconResolver';
import { GlobalHeader, type NavDomainKey } from './GlobalHeader';
import { PWAInstallButton } from './PWAInstallButton';

export interface CmsServiceItem {
  id: string;
  code: string;
  title: string;
  shortDescription: string;
  icon: string;
  accentColor: string;
  subcategories: string[];
  complianceNote?: string | null;
  displayOrder: number;
  isVisible: boolean;
}

export interface CmsIndustryItem {
  id: string;
  code: string;
  name: string;
  shortName: string;
  description: string;
  imageUrl?: string | null;
  icon: string;
  accentColor: string;
  capabilities: string[];
  recommendedModules: string[];
  displayOrder: number;
  isVisible: boolean;
  isExpandable: boolean;
}

export interface CmsSiteConfig {
  brandName: string;
  companyName: string;
  tagline: string;
  motto: string;
  ownerName: string;
  ownerRole: string;
  heroEyebrow: string;
  heroHeadline: string;
  heroMissionHeadline: string;
  heroDescription: string;
  heroSubheading: string;
  contactEmail: string;
  contactPhones?: string;
  contactRegion: string;
  logoUrl: string;
  heroVisualUrl: string;
  primaryCtaLabel: string;
  demoCtaLabel: string;
}

interface LandingHomepageProps {
  isAuthenticated: boolean;
  userName?: string | null;
  initialSection?: NavDomainKey | null;
  onAccessPlatform: (targetRoute?: string) => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onAfterLogout?: () => void;
}

const AI_CAPABILITIES_20 = [
  { name: 'AI HIRA Generator', desc: 'Hazard Identification & Risk Assessment matrices tailored by process and site.' },
  { name: 'AI JSA / JHA Generator', desc: 'Step-by-step Job Safety Analysis with task hazards and hierarchy of controls.' },
  { name: 'AI Risk Assessment Generator', desc: '5×5 likelihood-severity scoring with residual risk verification prompts.' },
  { name: 'AI SOP Generator', desc: 'Controlled Safe Operating Procedures aligned with ISO 45001 and equipment specs.' },
  { name: 'AI Safety Checklist Generator', desc: 'Custom inspection checklists for equipment, cleanrooms, heights, and contractors.' },
  { name: 'AI Method Statement Generator', desc: 'Safe Work Method Statements (SWMS) ready for Permit-to-Work attachment.' },
  { name: 'AI Incident Investigation', desc: 'Structured event timeline reconstruction and evidence gap analysis.' },
  { name: 'AI Root Cause Analysis', desc: 'Guided 5-Why and Fishbone cause tree drafting from incident facts.' },
  { name: 'AI CAPA Management', desc: 'Corrective and preventive action suggestions with effectiveness criteria.' },
  { name: 'AI Safety Audit', desc: 'Audit finding classification, clause mapping, and non-conformity drafting.' },
  { name: 'AI Legal Register', desc: 'Configurable statutory obligation discovery filtered by country, state, and sector.' },
  { name: 'AI Compliance Tracker', desc: 'Automated due-date monitoring and renewal readiness summaries.' },
  { name: 'AI Safety Training', desc: 'Toolbox talk scripts, induction outlines, and competency assessment quizzes.' },
  { name: 'AI Document Management', desc: '23-section EHS document drafting, version diffs, and ISO/OSHA reference tagging.' },
  { name: 'AI Contractor Management', desc: 'Pre-qualification compliance verification and high-risk job briefing support.' },
  { name: 'AI Emergency Management', desc: 'Site-specific Emergency Response Plans and mock drill evaluation templates.' },
  { name: 'AI Environmental Monitoring', desc: 'Aspect-impact registers, waste logs, and air/water limit exceedance insights.' },
  { name: 'AI ESG & GHG Reporting', desc: 'Scope 1, 2 & 3 carbon accounting summaries aligned with GRI, BRSR, and CSRD.' },
  { name: 'AI Energy Management', desc: 'ISO 50001 energy intensity tracking and site decarbonization opportunities.' },
  { name: 'AI Safety Analytics & Predictive Insights', desc: 'Leading-indicator trend analysis across incidents, observations, and permits.' },
];

const WHY_CHOOSE_12 = [
  { title: 'One Platform for Complete EHS Operations', desc: 'Unify Safety, Health, Environment, Risk, Compliance, and Sustainability in one workspace.' },
  { title: 'AI-Powered Hazard Prevention', desc: 'Detect unsafe conditions early using multimodal photo, voice, and predictive analytics.' },
  { title: 'Unlimited Dynamic Modules', desc: 'Build N-level parent, child, and sub-child modules, custom forms, and workflows without code.' },
  { title: 'Industry-Specific Customization', desc: 'Adapt effortlessly across Semiconductor, Data Centers, Pharma, Manufacturing, FMCG, and Construction.' },
  { title: 'Global and Local Compliance Support', desc: 'Configure ISO, OSHA, Factories Act, OSHWC Code, and regional rules by site and effective date.' },
  { title: 'Centralized EHS Documentation', desc: '23-section controlled repository with child documents, versioning, and statutory references.' },
  { title: 'Digital Permits and Approvals', desc: '20-aspect Digital PTW with Toolbox Talks, Three Golden Rules, QR verification, and audit PDFs.' },
  { title: 'Real-Time Safety Monitoring', desc: '22 live KPIs, 5×5 risk matrix, compliance progress bars, and Master KPI parent dashboards.' },
  { title: 'Enterprise-Grade Security', desc: 'Firebase Authentication, 16+ RBAC roles, and immutable audit trails across every action.' },
  { title: 'Multi-Tenant Architecture', desc: 'Tenant-isolated Cloud SQL PostgreSQL workspaces for multi-plant and MNC deployments.' },
  { title: 'Scalable for Small to Large Organizations', desc: 'Free to start and share—scales seamlessly from a single site to global enterprise portfolios.' },
  { title: 'Sustainability and ESG Integration', desc: 'Track waste, water, electricity, Scope 1–3 GHG emissions, and ESG disclosures natively.' },
];

const EXISTING_CAPABILITIES = [
  { title: 'Enterprise EHS Command Dashboard', desc: '22 live KPI cards with progress bars, 12-month trend line, incident donut, interactive 5×5 risk matrix, and compliance gauges.', route: 'dashboard', icon: BarChart3 },
  { title: 'Master KPI Hub (Separate Parent Line)', desc: 'Dedicated executive, industry-wise, plant-wise, module-wise, and individual department KPI scorecards.', route: 'master-kpi', icon: Layers },
  { title: '20-Aspect Digital Permit to Work', desc: '16+ high-risk permit types with Edit/Delete, Toolbox Talk, Three Golden Rules, QR scan verification, and auto-expiry tracking.', route: 'ptw', icon: FileCheck2 },
  { title: 'Incident Investigation & 5-Why RCA/CAPA', desc: 'End-to-end incident reporting, TRIR/LTIFR calculation, root cause trees, and prioritized CAPA closure tracking.', route: 'incidents', icon: ShieldCheck },
  { title: 'AI Hazard Observation & Copilot', desc: 'Multimodal photo & voice hazard capture with mandatory competent Safety Officer verification before closure.', route: 'observations', icon: ScanEye },
  { title: 'HIRA, HAZOP, JSA & LOTO Control', desc: 'Quantitative risk registers, zero-energy Lockout/Tagout verification, and residual risk scoring.', route: 'risk-assessment', icon: ClipboardCheck },
  { title: '23-Section Document Control Library', desc: 'Parent/child documents with full Add/Edit/Delete, AI suggestions, and ISO/Factory/OSHA clause citations.', route: 'documents', icon: BookOpen },
  { title: 'Mobile PWA for Android, iOS & Desktop', desc: 'Installable cross-device application with offline field draft sync and instant QR pass verification.', route: 'mobile-field', icon: Smartphone },
];

const COMPLIANCE_JURISDICTIONS = [
  {
    region: 'International ISO Standards',
    applicability: 'Configurable per certified management system & scope',
    items: [
      'ISO 45001:2018 – Occupational Health and Safety Management Systems',
      'ISO 14001:2015 – Environmental Management Systems',
      'ISO 50001:2018 – Energy Management Systems',
      'ISO 9001:2015 – Quality Management Systems',
      'ISO 14064 – Greenhouse Gas Accounting & Verification',
      'ISO 14067 – Carbon Footprint of Products',
    ],
  },
  {
    region: 'India Statutory Frameworks (Where Applicable)',
    applicability: 'Configurable by state, facility headcount, industry, and notification effective date',
    items: [
      'Indian Factories Act, 1948 & Applicable State Factory Rules (where applicable)',
      'Occupational Safety, Health and Working Conditions (OSHWC) Code, 2020 (where notified & applicable)',
      'National Building Code of India (NBC) & Applicable State Fire Safety Regulations',
      'Central / State Pollution Control Board (CPCB / SPCB) Consents & Hazardous Waste Rules',
      'BRSR (Business Responsibility and Sustainability Reporting) Disclosures',
    ],
  },
  {
    region: 'Global & Regional Frameworks (Where Applicable)',
    applicability: 'Configurable by country, jurisdiction, and enterprise reporting mandate',
    items: [
      'OSHA 29 CFR 1910 / 1926 Standards (US & multinational benchmarks where applicable)',
      'UN GHS – Globally Harmonized System of Classification & Labelling of Chemicals',
      'GRI (Global Reporting Initiative) Sustainability Reporting Standards',
      'EU CSRD & ESRS Corporate Sustainability Reporting Directives (where applicable)',
      'Local Municipal, Port, Aviation, Healthcare & Industry-Specific Legal Registers',
    ],
  },
];

const FALLBACK_SITE_CONFIG: CmsSiteConfig = {
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
};

export function LandingHomepage({
  isAuthenticated,
  userName,
  initialSection = null,
  onAccessPlatform,
  onOpenLogin,
  onOpenRegister,
  onAfterLogout,
}: LandingHomepageProps) {
  const [siteConfig, setSiteConfig] = useState<CmsSiteConfig>(FALLBACK_SITE_CONFIG);
  const [services, setServices] = useState<CmsServiceItem[]>([]);
  const [industries, setIndustries] = useState<CmsIndustryItem[]>([]);
  const [loadingCms, setLoadingCms] = useState(true);

  // Interactive UI states
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [expandedServices, setExpandedServices] = useState<Record<string, boolean>>({});
  const [industrySearch, setIndustrySearch] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<CmsIndustryItem | null>(null);
  const [expandAllOtherSectors, setExpandAllOtherSectors] = useState(false);
  const [activeComplianceTab, setActiveComplianceTab] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);

  // Demo / Contact Form state
  const [demoForm, setDemoForm] = useState({
    fullName: '',
    workEmail: '',
    companyName: '',
    industry: 'Semiconductor Industry',
    phone: '',
    message: '',
  });
  const [submittingDemo, setSubmittingDemo] = useState(false);
  const [demoStatus, setDemoStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [demoDelivery, setDemoDelivery] = useState<{
    emailSent: boolean;
    smsSent: boolean;
    emailProvider: string;
    smsProvider: string;
    ownerEmail: string;
    ownerPhone: string;
    mailtoUrl: string;
    smsUrl: string;
    whatsappUrl: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/public/homepage')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        if (data.siteConfig) setSiteConfig({ ...FALLBACK_SITE_CONFIG, ...data.siteConfig });
        if (Array.isArray(data.services)) setServices(data.services);
        if (Array.isArray(data.industries)) setIndustries(data.industries);
      })
      .catch(() => {
        // Resilient fallback handled cleanly
      })
      .finally(() => {
        if (active) setLoadingCms(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.shortDescription.toLowerCase().includes(q) ||
        (s.subcategories || []).some((sub) => sub.toLowerCase().includes(q))
    );
  }, [services, serviceSearch]);

  const filteredIndustries = useMemo(() => {
    const q = industrySearch.trim().toLowerCase();
    if (!q) return industries;
    return industries.filter(
      (ind) =>
        ind.name.toLowerCase().includes(q) ||
        ind.shortName.toLowerCase().includes(q) ||
        ind.description.toLowerCase().includes(q) ||
        (ind.capabilities || []).some((c) => c.toLowerCase().includes(q))
    );
  }, [industries, industrySearch]);

  const handleShareFree = async () => {
    const url = window.location.origin;
    const shareData = {
      title: `${siteConfig.brandName} — ${siteConfig.companyName}`,
      text: `${siteConfig.heroMissionHeadline} Developed & Owned by ${siteConfig.ownerName}. Free to use & share.`,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2600);
    } catch {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2600);
    }
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleGlobalNavSection = (key: NavDomainKey) => {
    const map: Record<NavDomainKey, { section: string; filter?: string; appRoute?: string }> = {
      home: { section: 'home' },
      about: { section: 'why-arshiel' },
      services: { section: 'services', filter: '' },
      industries: { section: 'industries' },
      safety: { section: 'services', filter: 'Safety', appRoute: 'ptw' },
      ehs: { section: 'platform-features', appRoute: 'dashboard' },
      hse: { section: 'compliance', appRoute: 'audits' },
      she: { section: 'services', filter: 'Occupational Health', appRoute: 'incidents' },
      esg: { section: 'services', filter: 'ESG', appRoute: 'master-kpi' },
      sustainability: { section: 'services', filter: 'Sustainability', appRoute: 'environment' },
      contact: { section: 'contact' },
    };
    const target = map[key];
    if (!target) return;
    if (target.filter !== undefined) {
      setServiceSearch(target.filter);
    }
    scrollToSection(target.section);
  };

  useEffect(() => {
    if (!initialSection) return;
    const timer = setTimeout(() => {
      handleGlobalNavSection(initialSection);
    }, 120);
    return () => clearTimeout(timer);
  }, [initialSection]);

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDemoStatus(null);
    setDemoDelivery(null);
    if (!demoForm.fullName.trim() || !demoForm.companyName.trim()) {
      setDemoStatus({ type: 'error', text: 'Please enter your full name and company name.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(demoForm.workEmail.trim())) {
      setDemoStatus({ type: 'error', text: 'Please provide a valid work email address.' });
      return;
    }
    setSubmittingDemo(true);
    try {
      const res = await fetch('/api/public/demo-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(demoForm),
      });
      const json = await res.json();
      if (!res.ok) {
        setDemoStatus({ type: 'error', text: json?.error || 'Could not submit request.' });
      } else {
        setDemoStatus({
          type: 'success',
          text: json.message || 'Demo request received! Sent to Jonathan Thadanki.',
        });
        if (json.delivery) {
          setDemoDelivery(json.delivery);
        }
        setDemoForm({
          fullName: '',
          workEmail: '',
          companyName: '',
          industry: 'Semiconductor Industry',
          phone: '',
          message: '',
        });
      }
    } catch {
      setDemoStatus({ type: 'error', text: 'Network error while submitting request. Please try again.' });
    } finally {
      setSubmittingDemo(false);
    }
  };

  const heroServicePillars = [
    { label: 'Safety', icon: ShieldCheck, color: '#FFC629' },
    { label: 'Environment', icon: Leaf, color: '#39FF14' },
    { label: 'Health', icon: HeartPulse, color: '#F43F5E' },
    { label: 'HSE Compliance', icon: ClipboardCheck, color: '#00BFFF' },
    { label: 'Sustainability', icon: Globe, color: '#39FF14' },
    { label: 'ESG', icon: Award, color: '#FFC629' },
  ];

  const solutionCards10 = [
    { title: 'AI-Powered EHS Solutions', desc: 'Multimodal hazard vision, voice capture, and intelligent prevention recommendations.', icon: Cpu, route: 'observations' },
    { title: 'Safety Management', desc: 'Digital Permits, LOTO, Work at Height, Confined Space, and Incident RCA/CAPA.', icon: ShieldCheck, route: 'ptw' },
    { title: 'Environmental Management', desc: 'Waste, hazardous waste, water intake, air emissions, and pollution prevention.', icon: Leaf, route: 'environment' },
    { title: 'Occupational Health', desc: 'Industrial hygiene, workplace exposure monitoring, ergonomics, and health surveillance.', icon: HeartPulse, route: 'dashboard' },
    { title: 'HSE Compliance Management', desc: 'Automated audits, inspections, equipment certifications, and closure tracking.', icon: ClipboardCheck, route: 'audits' },
    { title: 'ESG & Sustainability', desc: 'Scope 1, 2 & 3 GHG accounting, energy performance, GRI, BRSR, and CSRD readiness.', icon: Globe, route: 'master-kpi' },
    { title: 'Risk Assessment & Analytics', desc: 'Interactive 5×5 risk matrix, HIRA, HAZOP, JSA/JHA, and 22 live EHS KPI graphs.', icon: BarChart3, route: 'risk-assessment' },
    { title: 'Legal Compliance Management', desc: 'Jurisdiction-configurable ISO, OSHA, Factories Act, and OSHWC statutory registers.', icon: Scale, route: 'legal' },
    { title: 'EHS Consulting & Support', desc: 'Enterprise deployment architecture, multi-plant rollouts, and custom module templates.', icon: UserCheck, route: 'dashboard' },
    { title: 'AI Document Generation', desc: 'Controlled 23-section EHS documentation with AI drafting and competent review gates.', icon: Sparkles, route: 'ai-assistant' },
  ];

  return (
    <div id="home" className="min-h-screen bg-[#020817] text-white selection:bg-[#FFC629]/30 selection:text-[#FFC629] overflow-x-clip">
      {/* =====================================================================
          1. REUSABLE GLOBAL ARSHIEL SAFETY HEADER (Responsive Login / Logout)
         ===================================================================== */}
      <GlobalHeader
        variant="public"
        brandName={siteConfig.brandName}
        companyName={siteConfig.companyName}
        logoUrl={siteConfig.logoUrl}
        onNavigateSection={handleGlobalNavSection}
        onOpenLogin={onOpenLogin}
        onOpenRegister={onOpenRegister}
        onOpenDashboard={(route) => onAccessPlatform(route || 'dashboard')}
        onAfterLogout={onAfterLogout}
        onShareFree={handleShareFree}
        shareCopied={shareCopied}
      />

      {/* =====================================================================
          2. CINEMATIC FUTURISTIC HERO SECTION (Model 3 Component Architecture)
         ===================================================================== */}
      <section className="relative arshiel-hex-bg bg-[#020817] pt-10 pb-14 lg:pt-14 lg:pb-16 border-b border-[#00BFFF]/20 overflow-hidden">
        {/* Animated Circuit Lines & Floating Digital Particles (Compositor-Only) */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 w-full h-full opacity-35"
          viewBox="0 0 1440 760"
          preserveAspectRatio="none"
        >
          <path
            d="M0 140 L260 140 L310 190 L610 190"
            fill="none"
            stroke="#00BFFF"
            strokeWidth="1.2"
            className="arshiel-circuit-flow"
          />
          <path
            d="M1440 160 L1140 160 L1080 220 L830 220"
            fill="none"
            stroke="#FFC629"
            strokeWidth="1.2"
            className="arshiel-circuit-flow"
          />
          <path
            d="M0 610 L360 610 L420 550 L740 550"
            fill="none"
            stroke="#39FF14"
            strokeWidth="1.2"
            className="arshiel-circuit-flow"
          />
          <path
            d="M1440 620 L1090 620 L1020 560 L780 560"
            fill="none"
            stroke="#00BFFF"
            strokeWidth="1.2"
            className="arshiel-circuit-flow"
          />
        </svg>

        {/* Subtle Floating Green & Gold Light Particles */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="arshiel-drift absolute top-24 left-[12%] w-2 h-2 rounded-full bg-[#39FF14]/60 blur-[1px]" />
          <div className="arshiel-drift absolute top-44 left-[42%] w-1.5 h-1.5 rounded-full bg-[#FFC629]/70 blur-[1px]" style={{ animationDelay: '2s' }} />
          <div className="arshiel-drift absolute top-28 right-[18%] w-2 h-2 rounded-full bg-[#00BFFF]/70 blur-[1px]" style={{ animationDelay: '3.5s' }} />
          <div className="arshiel-drift absolute bottom-32 left-[28%] w-2 h-2 rounded-full bg-[#00BFFF]/55 blur-[1px]" style={{ animationDelay: '1.5s' }} />
          <div className="arshiel-drift absolute bottom-24 right-[28%] w-2 h-2 rounded-full bg-[#39FF14]/60 blur-[1px]" style={{ animationDelay: '4s' }} />
        </div>

        <div className="relative max-w-[1380px] mx-auto px-4 sm:px-6 space-y-10">
          {/* 3-Column Futuristic Hero Composition (Left: Proposition · Center: Animated ARSHIEL Emblem · Right: Digital Earth & Safety Engineer) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* LEFT COLUMN: Value Proposition & Service Pillars */}
            <div className="lg:col-span-5 space-y-5">
              <div className="text-xs font-semibold tracking-wider text-[#00BFFF]">
                {siteConfig.heroEyebrow} · {siteConfig.ownerRole}: {siteConfig.ownerName}
              </div>

              <h1
                className="font-display font-extrabold leading-[1.08] tracking-tight text-white"
                style={{ fontSize: 'clamp(2.15rem, 3.6vw, 3.4rem)', textWrap: 'balance' }}
              >
                Innovating for a{' '}
                <span className="arshiel-gold-text">Safe &amp; Sustainable</span> World
              </h1>

              <div className="text-sm sm:text-base font-display font-bold tracking-wide text-[#00BFFF]">
                {siteConfig.heroMissionHeadline}
              </div>

              <p className="text-sm sm:text-[15px] text-[#C0C7D1] leading-relaxed">
                {siteConfig.heroDescription}
              </p>

              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                {siteConfig.heroSubheading}
              </p>

              {/* 6 Service Icons Row (Safety, Environment, Health, HSE Compliance, Sustainability, ESG) */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                {heroServicePillars.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => scrollToSection('services')}
                      className="group flex flex-col items-center justify-center text-center p-2.5 rounded-lg bg-[#06152C]/80 border border-slate-800 hover:border-[#FFC629]/60 transition-all cursor-pointer"
                    >
                      <Icon className="w-5 h-5 mb-1.5 transition-transform group-hover:-translate-y-0.5" style={{ color: item.color }} />
                      <span className="text-[11px] font-semibold text-slate-200 leading-tight">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Primary Hero Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onAccessPlatform('dashboard')}
                  className="arshiel-gold-shimmer inline-flex items-center gap-2 px-5 py-3 text-sm font-bold text-[#020817] bg-gradient-to-r from-[#FFC629] to-[#f5b400] hover:brightness-110 rounded-lg shadow-[0_0_26px_rgba(255,198,41,0.35)] transition-all whitespace-nowrap cursor-pointer"
                >
                  <span>{isAuthenticated ? 'Open EHS Dashboard' : siteConfig.primaryCtaLabel}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection('services')}
                  className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-semibold text-white bg-[#06152C] hover:bg-[#0b2347] border border-[#00BFFF]/50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span>Explore Our Services</span>
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection('industries')}
                  className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-semibold text-[#C0C7D1] hover:text-white border border-slate-700 hover:border-[#39FF14]/60 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span>Explore Industries</span>
                </button>
              </div>
            </div>

            {/* CENTER COLUMN: Animated Glowing ARSHIEL Brand Identity Medallion */}
            <div className="lg:col-span-3 flex flex-col items-center justify-center text-center py-4">
              <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
                {/* Rotating Orbital Neon Rings */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 260 260"
                  className="absolute inset-0 w-full h-full arshiel-orbit-slow"
                >
                  <circle
                    cx="130"
                    cy="130"
                    r="122"
                    fill="none"
                    stroke="url(#goldRing)"
                    strokeWidth="1.5"
                    strokeDasharray="36 14 8 14"
                  />
                  <defs>
                    <linearGradient id="goldRing" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFC629" />
                      <stop offset="50%" stopColor="#00BFFF" />
                      <stop offset="100%" stopColor="#39FF14" />
                    </linearGradient>
                  </defs>
                </svg>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 260 260"
                  className="absolute inset-3 w-[calc(100%-1.5rem)] h-[calc(100%-1.5rem)] arshiel-orbit-reverse opacity-70"
                >
                  <circle
                    cx="130"
                    cy="130"
                    r="116"
                    fill="none"
                    stroke="#00BFFF"
                    strokeWidth="1"
                    strokeDasharray="10 12"
                  />
                </svg>

                {/* Radial Aura Glow */}
                <div className="arshiel-glow-pulse absolute inset-6 rounded-full bg-gradient-to-tr from-[#00BFFF]/25 via-[#FFC629]/25 to-[#39FF14]/20 blur-xl" />

                {/* Official ARSHIEL Emblem */}
                <div className="relative z-10 w-40 h-40 sm:w-44 sm:h-44 rounded-full p-1 bg-gradient-to-b from-[#FFC629] via-[#00BFFF]/70 to-[#39FF14]/70 shadow-[0_0_40px_rgba(255,198,41,0.3)] arshiel-float">
                  <img
                    src={siteConfig.logoUrl}
                    alt="ARSHIEL EHS AI SOLUTIONS Brand Emblem"
                    referrerPolicy="no-referrer"
                    className="w-full h-full rounded-full object-cover bg-[#020817]"
                  />
                </div>
              </div>

              <div className="mt-4 space-y-1">
                <div className="font-display font-extrabold text-3xl tracking-wider arshiel-gold-text">
                  ARSHIEL
                </div>
                <div className="text-xs font-bold tracking-[0.22em] text-white">
                  <span className="text-[#39FF14]">EHS</span>{' '}
                  <span className="text-[#00BFFF]">AI</span> SOLUTIONS
                </div>
                <div className="text-xs italic text-[#C0C7D1] pt-0.5">{siteConfig.tagline}</div>
              </div>
            </div>

            {/* RIGHT COLUMN: Cinematic Safety Engineer + Digital Earth + Animated AI Chip */}
            <div className="lg:col-span-4 space-y-4">
              <div className="relative rounded-xl overflow-hidden border border-[#00BFFF]/40 bg-[#06152C] shadow-[0_0_45px_rgba(0,191,255,0.18)]">
                <img
                  src={siteConfig.heroVisualUrl}
                  alt="Safety engineer overlooking industrial plant, renewable wind turbines, smart green city, and digital Earth hologram"
                  referrerPolicy="no-referrer"
                  className="w-full h-64 sm:h-72 object-cover"
                />
                {/* Measured contrast scrim */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#020817] via-[#020817]/30 to-transparent" />

                {/* Animated AI Microchip Overlay (Top-Right) */}
                <div className="absolute top-3 right-3 bg-[#020817]/85 backdrop-blur-md border border-[#00BFFF]/60 rounded-lg px-3 py-2 flex items-center gap-2 shadow-[0_0_18px_rgba(0,191,255,0.35)]">
                  <Cpu className="w-5 h-5 text-[#00BFFF]" />
                  <div className="leading-tight">
                    <div className="text-xs font-bold text-white">AI Safety Engine</div>
                    <div className="text-[10px] text-[#39FF14]">Predictive Prevention</div>
                  </div>
                </div>

                {/* Bottom Operational Pillars (Comply · Prevent · Protect · Sustain) */}
                <div className="absolute bottom-3 left-3 right-3 grid grid-cols-4 gap-1.5">
                  {['Comply', 'Prevent', 'Protect', 'Sustain'].map((pillar) => (
                    <div
                      key={pillar}
                      className="bg-[#020817]/85 backdrop-blur-md border border-[#39FF14]/40 rounded px-2 py-1.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-white"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#39FF14] shrink-0" />
                      <span className="truncate">{pillar}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Compact Enterprise Access & Mobile Readiness Strip */}
              <div className="bg-[#06152C]/85 border border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="text-[#C0C7D1]">
                  Free to use &amp; share across <strong className="text-white">Android, iOS &amp; Desktop</strong>
                </div>
                <div className="flex items-center gap-2">
                  <PWAInstallButton compact />
                  <button
                    type="button"
                    onClick={() => onAccessPlatform('master-kpi')}
                    className="text-[#FFC629] hover:underline font-semibold whitespace-nowrap cursor-pointer"
                  >
                    Master KPIs &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Model 3 Horizontal Glassmorphism Industry Preview Strip (Swipeable on Mobile) */}
          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="text-xs font-bold tracking-[0.18em] uppercase text-[#C0C7D1]">
                Industries We Serve — Global Coverage
              </div>
              <button
                type="button"
                onClick={() => scrollToSection('industries')}
                className="text-xs font-semibold text-[#00BFFF] hover:text-[#FFC629] transition-colors cursor-pointer"
              >
                Inspect All Industries &amp; 24+ Sectors &rarr;
              </button>
            </div>

            <div className="flex lg:grid lg:grid-cols-9 gap-2.5 overflow-x-auto pb-2 snap-x">
              {(industries.length > 0 ? industries : []).map((ind) => (
                <button
                  key={ind.id}
                  type="button"
                  onClick={() => {
                    setSelectedIndustry(ind);
                    scrollToSection('industries');
                  }}
                  className="group relative min-w-[140px] lg:min-w-0 snap-start rounded-lg overflow-hidden border border-[#00BFFF]/35 hover:border-[#FFC629] bg-[#06152C] transition-all duration-200 hover:-translate-y-0.5 text-left cursor-pointer"
                >
                  <div className="relative h-20 w-full overflow-hidden bg-[#06152C]">
                    {ind.imageUrl ? (
                      <img
                        src={ind.imageUrl}
                        alt={ind.name}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#06152C] to-[#0b2a52]">
                        <DynamicIcon name={ind.icon} className="w-6 h-6 text-[#00BFFF]" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020817] via-[#020817]/35 to-transparent" />
                  </div>
                  <div className="px-2 py-2 flex items-center justify-between gap-1 bg-[#020817]/90">
                    <span className="text-[11px] font-semibold text-white truncate group-hover:text-[#FFC629]">
                      {ind.shortName}
                    </span>
                    <ChevronRight className="w-3 h-3 text-[#00BFFF] shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Model 3 Signature Bottom Gold Glowing Brand Motto Banner */}
          <div className="pt-2 flex items-center justify-center">
            <div className="flex items-center gap-4 w-full max-w-3xl">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#FFC629]/70 to-[#FFC629]" />
              <div className="arshiel-gold-shimmer px-6 py-2 rounded-full border border-[#FFC629]/70 bg-[#06152C]/90 shadow-[0_0_24px_rgba(255,198,41,0.22)] text-center">
                <span className="font-display font-bold text-xs sm:text-sm tracking-[0.2em] text-[#FFC629]">
                  {siteConfig.motto}
                </span>
              </div>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#FFC629]/70 to-[#FFC629]" />
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. WHAT WE DO – OUR SERVICES & EXPERTISE (Light Readable Section)
         ===================================================================== */}
      <section id="services" className="bg-white text-slate-900 py-16 lg:py-20 border-b border-slate-200">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 space-y-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-3xl space-y-2.5">
              <div className="text-xs font-bold tracking-[0.18em] uppercase text-emerald-700">
                What We Do — Our Services &amp; Expertise
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight" style={{ textWrap: 'balance' }}>
                12 Integrated EHS, HSE, SHE, ESG, GHS &amp; Sustainability Practice Pillars
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Every service category below is dynamically configurable from the Admin Control Center and directly backed by live workflows inside the ARSHIEL SAFETY platform.
              </p>
            </div>

            {/* Instant Search across all 12 services & 120+ subcategories */}
            <div className="w-full lg:w-80">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  placeholder="Search Safety, ESG, GHS, ISO 45001..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900"
                />
              </div>
            </div>
          </div>

          {loadingCms && services.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-56 rounded-xl border border-slate-200 bg-slate-50 animate-pulse" />
              ))}
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-10 text-center space-y-2">
              <div className="font-display font-bold text-slate-900">No matching service capabilities</div>
              <p className="text-sm text-slate-500">Try clearing your search filter to explore all 12 service pillars.</p>
              <button
                type="button"
                onClick={() => setServiceSearch('')}
                className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-md cursor-pointer"
              >
                Reset Search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredServices.map((svc) => {
                const isExpanded = Boolean(expandedServices[svc.id] || serviceSearch.trim().length > 0);
                const visibleSubs = isExpanded ? svc.subcategories : (svc.subcategories || []).slice(0, 6);
                const remaining = (svc.subcategories || []).length - visibleSubs.length;

                return (
                  <article
                    key={svc.id}
                    className="bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-6 flex flex-col justify-between transition-colors"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#020817] shrink-0"
                            style={{ color: svc.accentColor || '#FFC629' }}
                          >
                            <DynamicIcon name={svc.icon} className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-display font-bold text-base text-slate-950 leading-snug">
                              {svc.title}
                            </h3>
                            <div className="text-xs text-slate-500 tabular-nums">
                              {(svc.subcategories || []).length} specialized capabilities
                            </div>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-slate-600 leading-relaxed">{svc.shortDescription}</p>

                      {svc.complianceNote && (
                        <div className="text-xs text-slate-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                          <strong>Jurisdiction Control:</strong> {svc.complianceNote}
                        </div>
                      )}

                      <ul className="space-y-1.5 border-t border-slate-100 pt-3">
                        {visibleSubs.map((sub, i) => (
                          <li key={`${svc.id}-sub-${i}`} className="flex items-start gap-2 text-xs text-slate-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                            <span>{sub}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      {(svc.subcategories || []).length > 6 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedServices((prev) => ({ ...prev, [svc.id]: !prev[svc.id] }))
                          }
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 hover:text-emerald-700 cursor-pointer"
                        >
                          <span>
                            {isExpanded
                              ? 'Show Less'
                              : `Show +${remaining} More Capabilities`}
                          </span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Included in ARSHIEL Platform</span>
                      )}

                      <button
                        type="button"
                        onClick={() => onAccessPlatform('dashboard')}
                        className="text-xs font-semibold text-emerald-700 hover:underline whitespace-nowrap cursor-pointer"
                      >
                        Launch Module &rarr;
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================================
          4. WHO WE SERVE – INDUSTRIES WE SUPPORT (Dark Futuristic Showcase)
         ===================================================================== */}
      <section id="industries" className="relative bg-[#06152C] text-white py-16 lg:py-20 border-b border-[#00BFFF]/20">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 space-y-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-3xl space-y-2.5">
              <div className="text-xs font-bold tracking-[0.18em] uppercase text-[#FFC629]">
                Who We Serve — Industries We Support
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight" style={{ textWrap: 'balance' }}>
                One Intelligent EHS Platform. Every Industry. Global Safety Solutions.
              </h2>
              <p className="text-sm sm:text-base text-[#C0C7D1] leading-relaxed">
                ARSHIEL SAFETY delivers adaptable AI-powered EHS, HSE, SHE, ESG, GHS and Sustainability solutions for diverse industries—from advanced semiconductor fabs and hyperscale data centers to manufacturing plants, pharma labs, corporate campuses, and any future sector via our Unlimited Dynamic Module Builder.
              </p>
            </div>

            <div className="w-full lg:w-80">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={industrySearch}
                  onChange={(e) => setIndustrySearch(e.target.value)}
                  placeholder="Search Semiconductor, Data Center, Oil..."
                  className="w-full bg-[#020817] border border-[#00BFFF]/40 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#FFC629]"
                />
              </div>
            </div>
          </div>

          {/* Interactive Selected Industry Spotlight Drawer */}
          {selectedIndustry && (
            <div className="bg-[#020817] border border-[#FFC629]/60 rounded-xl p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-4 rounded-lg overflow-hidden border border-slate-800">
                <img
                  src={selectedIndustry.imageUrl || '/assets/homepage/ind_global_industries.jpg'}
                  alt={selectedIndustry.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-52 object-cover"
                />
              </div>
              <div className="lg:col-span-8 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-[#00BFFF]">Selected Industry Solution</div>
                    <h3 className="font-display text-2xl font-bold text-white mt-0.5">{selectedIndustry.name}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedIndustry(null)}
                    className="p-1.5 rounded border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                    aria-label="Close industry details"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-[#C0C7D1]">{selectedIndustry.description}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(selectedIndustry.capabilities || []).map((cap, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-200 bg-[#06152C] border border-slate-800 rounded px-2.5 py-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#39FF14] shrink-0" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
                {selectedIndustry.recommendedModules?.length > 0 && (
                  <div className="text-xs text-[#C0C7D1] pt-1">
                    <strong className="text-[#FFC629]">Recommended ARSHIEL Modules:</strong>{' '}
                    {selectedIndustry.recommendedModules.join(' · ')}
                  </div>
                )}
                <div className="flex flex-wrap gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => onAccessPlatform('dashboard')}
                    className="px-4 py-2 text-xs font-bold text-[#020817] bg-[#FFC629] hover:brightness-110 rounded-md cursor-pointer"
                  >
                    Launch Workspace for {selectedIndustry.shortName}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDemoForm((prev) => ({ ...prev, industry: selectedIndustry.name }));
                      scrollToSection('contact');
                    }}
                    className="px-4 py-2 text-xs font-semibold text-white border border-[#00BFFF]/50 hover:border-[#FFC629] rounded-md cursor-pointer"
                  >
                    Request Tailored Demo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Industry Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredIndustries.map((ind) => {
              const isAllOther = ind.isExpandable;
              const capList = ind.capabilities || [];
              const shownCaps = isAllOther && !expandAllOtherSectors && !industrySearch.trim()
                ? capList.slice(0, 10)
                : capList;

              return (
                <article
                  key={ind.id}
                  className={`group rounded-xl overflow-hidden bg-[#020817]/90 border transition-all duration-200 flex flex-col justify-between ${
                    isAllOther
                      ? 'md:col-span-2 lg:col-span-3 border-[#39FF14]/45 hover:border-[#39FF14]'
                      : 'border-[#00BFFF]/30 hover:border-[#FFC629]'
                  }`}
                >
                  <div>
                    <div className={`relative overflow-hidden bg-[#06152C] ${isAllOther ? 'h-44' : 'h-48'}`}>
                      <img
                        src={ind.imageUrl || '/assets/homepage/ind_global_industries.jpg'}
                        alt={ind.name}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#020817] via-[#020817]/40 to-transparent" />
                      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-9 h-9 rounded-lg bg-[#020817]/90 border border-slate-700 flex items-center justify-center shrink-0"
                            style={{ color: ind.accentColor || '#00BFFF' }}
                          >
                            <DynamicIcon name={ind.icon} className="w-4 h-4" />
                          </div>
                          <h3 className="font-display font-bold text-lg text-white leading-tight">
                            {ind.name}
                          </h3>
                        </div>
                        <span className="text-xs font-mono tabular-nums text-[#C0C7D1]">
                          {capList.length} sectors
                        </span>
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      <p className="text-sm text-[#C0C7D1] leading-relaxed">{ind.description}</p>

                      <div className={`grid gap-1.5 ${isAllOther ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2'}`}>
                        {shownCaps.map((cap, idx) => (
                          <div key={`${ind.id}-cap-${idx}`} className="flex items-center gap-2 text-xs text-slate-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#39FF14] shrink-0" />
                            <span className="truncate" title={cap}>{cap}</span>
                          </div>
                        ))}
                      </div>

                      {isAllOther && (
                        <div className="text-xs text-[#FFC629] bg-[#06152C] border border-[#FFC629]/30 rounded-md px-3 py-2">
                          Not limited to listed sectors: ARSHIEL SAFETY supports any present or future industry through the Unlimited Dynamic Module Builder.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-5 py-3.5 border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-2 bg-[#020817]">
                    {isAllOther && capList.length > 10 ? (
                      <button
                        type="button"
                        onClick={() => setExpandAllOtherSectors((v) => !v)}
                        className="text-xs font-semibold text-[#39FF14] hover:underline cursor-pointer"
                      >
                        {expandAllOtherSectors ? 'Collapse Sector List' : `Expand All ${capList.length} Supported Sectors`}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedIndustry(ind)}
                        className="text-xs font-semibold text-[#00BFFF] hover:text-[#FFC629] transition-colors cursor-pointer"
                      >
                        View Industry Details
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onAccessPlatform('dashboard')}
                      className="text-xs font-semibold text-[#FFC629] hover:underline whitespace-nowrap cursor-pointer"
                    >
                      Launch EHS Workspace &rarr;
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. ARSHIEL AI-POWERED EHS PLATFORM FEATURES + OUR 10 SOLUTIONS
         ===================================================================== */}
      <section id="platform-features" className="bg-white text-slate-900 py-16 lg:py-20 border-b border-slate-200">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 space-y-12">
          <div className="max-w-3xl space-y-2.5">
            <div className="text-xs font-bold tracking-[0.18em] uppercase text-emerald-700">
              ARSHIEL AI-Powered EHS Platform Features
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight" style={{ textWrap: 'balance' }}>
              Core Platform Architecture Built for Zero-Harm Enterprise Operations
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Four foundational enterprise pillars powering ten integrated EHS, ESG, and AI-driven compliance solution suites.
            </p>
          </div>

          {/* 4 Signature Retained Core Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                num: '01.',
                title: 'Unlimited Dynamic Module Builder',
                desc: 'Create unlimited N-level parent, child and sub-child modules, custom forms, checklists, workflows and approval processes.',
                icon: Boxes,
                route: 'module-builder',
              },
              {
                num: '02.',
                title: 'AI Hazard Observation',
                desc: 'Multimodal photo and voice analysis, hazard identification, risk suggestions and mandatory Safety Officer verification.',
                icon: ScanEye,
                route: 'observations',
              },
              {
                num: '03.',
                title: '20-Aspect Digital Permit to Work',
                desc: 'Digital PTW with 20 safety aspects, Toolbox Talks, Three Golden Rules, QR verification and audit-ready PDFs.',
                icon: FileCheck2,
                route: 'ptw',
              },
              {
                num: '04.',
                title: 'Tenant-Isolated Cloud SQL',
                desc: 'Secure multi-tenant architecture with isolated enterprise EHS workspaces, access control and audit trails.',
                icon: Database,
                route: 'settings',
              },
            ].map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.num}
                  className="bg-[#020817] text-white border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-[#FFC629] tabular-nums">{feat.num}</span>
                      <Icon className="w-6 h-6 text-[#00BFFF]" />
                    </div>
                    <h3 className="font-display font-bold text-lg text-white leading-snug">{feat.title}</h3>
                    <p className="text-xs sm:text-sm text-[#C0C7D1] leading-relaxed">{feat.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAccessPlatform(feat.route)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FFC629] hover:underline cursor-pointer"
                  >
                    <span>Open in Platform</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* 10 Enterprise Solutions Suite (Model 3 Solutions Section) */}
          <div className="space-y-5 pt-4 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <h3 className="font-display text-2xl font-bold text-slate-950">Our Solutions Suite</h3>
                <p className="text-sm text-slate-600">Modular enterprise solutions ready to activate per facility or global business unit.</p>
              </div>
              <button
                type="button"
                onClick={() => onAccessPlatform('dashboard')}
                className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                Explore All Active Modules &rarr;
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {solutionCards10.map((sol) => {
                const Icon = sol.icon;
                return (
                  <div
                    key={sol.title}
                    className="bg-slate-50 border border-slate-200 hover:border-slate-900 rounded-lg p-4 flex flex-col justify-between transition-colors"
                  >
                    <div className="space-y-2.5">
                      <Icon className="w-5 h-5 text-emerald-700" />
                      <h4 className="font-display font-bold text-sm text-slate-950">{sol.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{sol.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAccessPlatform(sol.route)}
                      className="mt-4 text-xs font-semibold text-slate-900 hover:text-emerald-700 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Learn More</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          6. EXISTING PLATFORM CAPABILITIES (Live Production Modules Showcase)
         ===================================================================== */}
      <section id="capabilities" className="bg-slate-50 text-slate-900 py-16 border-b border-slate-200">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-3xl space-y-2">
              <div className="text-xs font-bold tracking-[0.18em] uppercase text-slate-500">
                Existing Platform Capabilities — Live Today
              </div>
              <h2 className="font-display text-3xl font-extrabold text-slate-950 tracking-tight">
                Production-Ready Enterprise EHS Modules &amp; Real-Time KPI Dashboards
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onAccessPlatform('dashboard')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-slate-950 text-white hover:bg-slate-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Enter Live EHS Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {EXISTING_CAPABILITIES.map((cap) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.title}
                  onClick={() => onAccessPlatform(cap.route)}
                  className="bg-white border border-slate-200 hover:border-emerald-700 rounded-lg p-5 flex flex-col justify-between gap-4 cursor-pointer transition-colors"
                >
                  <div className="space-y-2.5">
                    <div className="w-9 h-9 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-display font-bold text-sm text-slate-950">{cap.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{cap.desc}</p>
                  </div>
                  <div className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1">
                    <span>Launch Workspace</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          7. AI DOCUMENT GENERATION & 20 AI-POWERED EHS CAPABILITIES
         ===================================================================== */}
      <section id="ai-documents" className="bg-[#020817] text-white py-16 lg:py-20 border-b border-[#00BFFF]/20">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 space-y-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-3xl space-y-2.5">
              <div className="text-xs font-bold tracking-[0.18em] uppercase text-[#00BFFF]">
                AI Document Generation &amp; Intelligent Automation
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight" style={{ textWrap: 'balance' }}>
                20 AI-Powered EHS Modules with Mandatory Competent-Person Verification
              </h2>
              <p className="text-sm sm:text-base text-[#C0C7D1] leading-relaxed">
                Accelerate HIRA, JSA/JHA, SOPs, Method Statements, Incident RCA, Audits, Legal Registers, and ESG/GHG reports—while keeping qualified safety professionals in complete approval control.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onAccessPlatform('ai-assistant')}
              className="inline-flex items-center gap-2 px-5 py-3 text-xs font-bold text-[#020817] bg-[#FFC629] hover:brightness-110 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch AI Safety Copilot</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {AI_CAPABILITIES_20.map((item, idx) => (
              <div
                key={item.name}
                className="bg-[#06152C]/80 border border-slate-800 hover:border-[#00BFFF]/60 rounded-lg p-4 space-y-1.5 transition-colors"
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-[#FFC629] tabular-nums">
                  <span>{String(idx + 1).padStart(2, '0')}.</span>
                  <Cpu className="w-3.5 h-3.5 text-[#00BFFF]" />
                </div>
                <h3 className="font-display font-bold text-sm text-white">{item.name}</h3>
                <p className="text-xs text-[#C0C7D1] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Mandatory Governance Notice */}
          <div className="bg-[#06152C] border border-[#FFC629]/45 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start sm:items-center gap-2.5 text-[#C0C7D1]">
              <ShieldCheck className="w-5 h-5 text-[#FFC629] shrink-0" />
              <span>
                <strong className="text-white">Human-in-the-Loop Governance:</strong> AI-generated documents, risk ratings, and compliance recommendations must always be reviewed and approved by authorized competent personnel before official operational use.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          8. COMPLIANCE AND ISO STANDARDS (Configurable by Country/State/Industry)
         ===================================================================== */}
      <section id="compliance" className="bg-white text-slate-900 py-16 lg:py-20 border-b border-slate-200">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 space-y-8">
          <div className="max-w-3xl space-y-2.5">
            <div className="text-xs font-bold tracking-[0.18em] uppercase text-emerald-700">
              Compliance &amp; ISO Standards
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight" style={{ textWrap: 'balance' }}>
              Jurisdiction-Configurable Global Standards &amp; Statutory Compliance
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Every legal obligation, ISO clause, and statutory register in ARSHIEL SAFETY is configurable by country, state, industry classification, and effective date—ensuring your sites track only what truly applies.
            </p>
          </div>

          {/* Interactive Jurisdiction Selector */}
          <div className="flex flex-wrap gap-2">
            {COMPLIANCE_JURISDICTIONS.map((jur, idx) => (
              <button
                key={jur.region}
                type="button"
                onClick={() => setActiveComplianceTab(idx)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  activeComplianceTab === idx
                    ? 'bg-slate-950 text-white border-slate-950'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'
                }`}
              >
                {jur.region}
              </button>
            ))}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-950">
                  {COMPLIANCE_JURISDICTIONS[activeComplianceTab].region}
                </h3>
                <p className="text-xs text-slate-600">
                  {COMPLIANCE_JURISDICTIONS[activeComplianceTab].applicability}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onAccessPlatform('legal')}
                className="text-xs font-bold text-emerald-700 hover:underline whitespace-nowrap cursor-pointer"
              >
                Open Legal Register &rarr;
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {COMPLIANCE_JURISDICTIONS[activeComplianceTab].items.map((item) => (
                <div key={item} className="flex items-start gap-2.5 bg-white border border-slate-200 rounded-lg p-3.5 text-xs sm:text-sm text-slate-800">
                  <Scale className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          9. WHY CHOOSE ARSHIEL SAFETY (12 Benefits + About Creator/Owner)
         ===================================================================== */}
      <section id="why-arshiel" className="bg-slate-50 text-slate-900 py-16 lg:py-20 border-b border-slate-200">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-4">
              <div className="text-xs font-bold tracking-[0.18em] uppercase text-emerald-700">
                Why Choose ARSHIEL SAFETY · About Us
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight" style={{ textWrap: 'balance' }}>
                Engineered for Practical Field Execution &amp; Boardroom Governance
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Built from real-world industrial EHS expertise, ARSHIEL SAFETY bridges frontline safety officers, site engineers, contractors, and executive compliance leaders on one unified intelligent platform.
              </p>

              {/* Developer, Creator & Owner Attribution Card */}
              <div className="bg-[#020817] text-white rounded-xl p-6 border border-[#FFC629]/45 space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={siteConfig.logoUrl}
                    alt="ARSHIEL SAFETY"
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-lg object-cover border border-[#FFC629]/60"
                  />
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#FFC629]">
                      {siteConfig.ownerRole}
                    </div>
                    <div className="font-display font-bold text-xl text-white">
                      {siteConfig.ownerName}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-[#C0C7D1] leading-relaxed">
                  Architected, developed, created, and owned by <strong className="text-white">{siteConfig.ownerName}</strong> as a free-to-use, shareable global Enterprise EHS AI Solutions platform built on trust and driven by excellence.
                </p>
                <div className="text-xs text-[#39FF14] font-semibold">
                  {siteConfig.motto}
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {WHY_CHOOSE_12.map((benefit, idx) => (
                <div
                  key={benefit.title}
                  className="bg-white border border-slate-200 rounded-lg p-4 space-y-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-700 tabular-nums">
                      {String(idx + 1).padStart(2, '0')}.
                    </span>
                    <h3 className="font-display font-bold text-sm text-slate-950">{benefit.title}</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{benefit.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          10. SECURITY AND ENTERPRISE ARCHITECTURE
         ===================================================================== */}
      <section id="security" className="bg-[#06152C] text-white py-16 border-b border-[#00BFFF]/20">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 space-y-8">
          <div className="max-w-3xl space-y-2">
            <div className="text-xs font-bold tracking-[0.18em] uppercase text-[#00BFFF]">
              Security &amp; Enterprise Architecture
            </div>
            <h2 className="font-display text-3xl font-extrabold text-white tracking-tight">
              Multi-Tenant Cloud SQL Isolation, RBAC &amp; Audit-Ready Governance
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: Database,
                title: 'Tenant-Isolated Cloud SQL',
                desc: 'Dedicated organization scoping across PostgreSQL relational tables for every plant, department, and record.',
              },
              {
                icon: Lock,
                title: '16+ Enterprise RBAC Roles',
                desc: 'Granular role-based access control from Super Admin and Safety Officer to Contractors and Viewers.',
              },
              {
                icon: ShieldCheck,
                title: 'Immutable Audit Trails',
                desc: 'Every permit approval, document edit, module change, and compliance update is timestamped and logged.',
              },
              {
                icon: Smartphone,
                title: 'Android, iOS & Desktop PWA',
                desc: 'Responsive cross-device installation with offline field draft capture and automatic synchronization.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="bg-[#020817]/90 border border-[#00BFFF]/25 rounded-xl p-5 space-y-2.5">
                  <Icon className="w-6 h-6 text-[#FFC629]" />
                  <h3 className="font-display font-bold text-base text-white">{item.title}</h3>
                  <p className="text-xs text-[#C0C7D1] leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          11. CALL TO ACTION – GET STARTED & INTERACTIVE DEMO / CONTACT FORM
         ===================================================================== */}
      <section id="contact" className="bg-[#020817] text-white py-16 lg:py-20 border-b border-slate-800">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-6 space-y-5">
            <div className="text-xs font-bold tracking-[0.18em] uppercase text-[#FFC629]">
              Get Started · Free to Use &amp; Share
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight" style={{ textWrap: 'balance' }}>
              Launch Your Enterprise EHS AI Workspace in Seconds
            </h2>
            <p className="text-sm sm:text-base text-[#C0C7D1] leading-relaxed">
              Sign in directly with Google to provision your isolated organization workspace—complete with 22 live KPIs, Digital PTW, Unlimited Module Builder, and AI Copilot—or schedule an enterprise walkthrough with <strong className="text-white">{siteConfig.ownerName}</strong>.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={() => onAccessPlatform('dashboard')}
                className="arshiel-gold-shimmer inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-[#020817] bg-gradient-to-r from-[#FFC629] to-[#f5b400] hover:brightness-110 rounded-lg cursor-pointer"
              >
                <span>{isAuthenticated ? 'Go to EHS Dashboard' : 'Get Started Free'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleShareFree}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#06152C] border border-[#00BFFF]/45 hover:border-[#FFC629] rounded-lg cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-[#39FF14]" />
                <span>{shareCopied ? 'URL Copied to Clipboard' : 'Share Platform Free'}</span>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-2 text-xs text-[#C0C7D1]">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#FFC629] shrink-0" />
                <span>Direct Contact: <strong className="text-white">{siteConfig.contactEmail}</strong></span>
              </div>
              {siteConfig.contactPhones && (
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-[#00BFFF] shrink-0 mt-0.5" />
                  <span>
                    Contact Numbers:{' '}
                    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      {siteConfig.contactPhones.split('/').map((rawNum, idx, arr) => {
                        const cleanLabel = rawNum.trim();
                        const telHref = `tel:${cleanLabel.replace(/\s+/g, '')}`;
                        return (
                          <React.Fragment key={cleanLabel}>
                            <a
                              href={telHref}
                              className="font-bold text-white hover:text-[#FFC629] transition-colors"
                            >
                              {cleanLabel}
                            </a>
                            {idx < arr.length - 1 && <span className="text-slate-500">/</span>}
                          </React.Fragment>
                        );
                      })}
                    </span>
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#39FF14] shrink-0" />
                <span>{siteConfig.ownerRole}: <strong className="text-white">{siteConfig.ownerName}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#00BFFF] shrink-0" />
                <span>{siteConfig.contactRegion}</span>
              </div>
            </div>
          </div>

          {/* Validated Enterprise Demo & Contact Form */}
          <form
            onSubmit={handleDemoSubmit}
            className="lg:col-span-6 bg-[#06152C] border border-[#00BFFF]/35 rounded-xl p-6 sm:p-7 space-y-4"
          >
            <div>
              <h3 className="font-display font-bold text-xl text-white">Request an Enterprise Demo or Consultation</h3>
              <p className="text-xs text-[#C0C7D1] mt-1">
                Tell us your industry and site requirements—dispatched directly to Jonathan Thadanki via Email ({siteConfig.contactEmail}) &amp; SMS (+91 9133 661 933).
              </p>
            </div>

            {demoStatus && (
              <div
                className={`text-xs rounded-lg p-3.5 border space-y-2.5 ${
                  demoStatus.type === 'success'
                    ? 'bg-emerald-950/85 border-emerald-500/50 text-emerald-100'
                    : 'bg-red-950/80 border-red-500/50 text-red-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{demoStatus.text}</span>
                </div>

                {demoStatus.type === 'success' && demoDelivery && (
                  <div className="space-y-2 pt-2 border-t border-emerald-500/30">
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span
                        className={`px-2 py-0.5 rounded font-semibold ${
                          demoDelivery.emailSent
                            ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
                            : 'bg-slate-900/80 text-slate-200 border border-slate-700'
                        }`}
                      >
                        Email ({demoDelivery.ownerEmail}): {demoDelivery.emailSent ? 'Sent Automatically' : 'Saved + 1-Tap Ready'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-semibold ${
                          demoDelivery.smsSent
                            ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
                            : 'bg-slate-900/80 text-slate-200 border border-slate-700'
                        }`}
                      >
                        SMS ({demoDelivery.ownerPhone}): {demoDelivery.smsSent ? 'Sent Automatically' : 'Saved + 1-Tap Ready'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={demoDelivery.mailtoUrl}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#FFC629] text-[#020817] font-bold text-[11px] hover:brightness-110 transition-all"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Send Email to {demoDelivery.ownerEmail}</span>
                      </a>
                      <a
                        href={demoDelivery.smsUrl}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#00BFFF] text-[#020817] font-bold text-[11px] hover:brightness-110 transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Send Normal SMS (+91 9133 661 933)</span>
                      </a>
                      <a
                        href={demoDelivery.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-500 transition-all"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                <input
                  required
                  value={demoForm.fullName}
                  onChange={(e) => setDemoForm({ ...demoForm, fullName: e.target.value })}
                  placeholder="Your full name"
                  className="w-full bg-[#020817] border border-slate-700 focus:border-[#FFC629] rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Work Email *</label>
                <input
                  required
                  type="email"
                  value={demoForm.workEmail}
                  onChange={(e) => setDemoForm({ ...demoForm, workEmail: e.target.value })}
                  placeholder="name@company.com"
                  className="w-full bg-[#020817] border border-slate-700 focus:border-[#FFC629] rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Organization / Company *</label>
                <input
                  required
                  value={demoForm.companyName}
                  onChange={(e) => setDemoForm({ ...demoForm, companyName: e.target.value })}
                  placeholder="Company name"
                  className="w-full bg-[#020817] border border-slate-700 focus:border-[#FFC629] rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Industry</label>
                <select
                  value={demoForm.industry}
                  onChange={(e) => setDemoForm({ ...demoForm, industry: e.target.value })}
                  className="w-full bg-[#020817] border border-slate-700 focus:border-[#FFC629] rounded-md px-3 py-2 text-sm text-white focus:outline-none"
                >
                  {(industries.length > 0
                    ? industries.map((i) => i.name)
                    : [
                        'Semiconductor Industry',
                        'Data Centers',
                        'Pharmaceutical Industry',
                        'Manufacturing Industry',
                        'MNC & Corporate Organizations',
                        'Construction & Infrastructure',
                        'FMCG Industry',
                        'Healthcare & Clinical Labs',
                        'All Other Industries & Sectors',
                      ]
                  ).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone / WhatsApp (Optional)</label>
              <input
                value={demoForm.phone}
                onChange={(e) => setDemoForm({ ...demoForm, phone: e.target.value })}
                placeholder="+91 / International phone"
                className="w-full bg-[#020817] border border-slate-700 focus:border-[#FFC629] rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">EHS Requirements &amp; Sites</label>
              <textarea
                rows={3}
                value={demoForm.message}
                onChange={(e) => setDemoForm({ ...demoForm, message: e.target.value })}
                placeholder="Tell us about your facilities, compliance frameworks (ISO 45001, OSHA, OSHWC, ESG), or custom modules needed..."
                className="w-full bg-[#020817] border border-slate-700 focus:border-[#FFC629] rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submittingDemo}
              className="w-full py-3 text-sm font-bold text-[#020817] bg-[#FFC629] hover:brightness-110 disabled:opacity-60 rounded-lg transition-all cursor-pointer"
            >
              {submittingDemo ? 'Submitting Request...' : 'Submit Enterprise Demo Request'}
            </button>
          </form>
        </div>
      </section>

      {/* =====================================================================
          12. ENTERPRISE FOOTER (Contact, About, Privacy Policy, Terms & Owner)
         ===================================================================== */}
      <footer className="bg-[#010510] text-slate-400 py-12">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <img
                  src={siteConfig.logoUrl}
                  alt="ARSHIEL SAFETY"
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-md object-cover border border-[#FFC629]/60"
                />
                <div>
                  <div className="font-display font-extrabold text-base arshiel-gold-text">
                    {siteConfig.brandName}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-300">
                    {siteConfig.companyName} · {siteConfig.tagline}
                  </div>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-slate-400 max-w-md">
                Comprehensive AI-powered Enterprise EHS, HSE, SHE, ESG, GHS &amp; Sustainability Management platform built for global industries.
              </p>
              <div className="text-xs font-semibold text-[#FFC629] tracking-wider">
                {siteConfig.motto}
              </div>
            </div>

            <div className="md:col-span-2 space-y-2 text-xs">
              <div className="font-bold text-white uppercase tracking-wider text-[11px]">Navigation</div>
              {[
                ['What We Do (Services)', 'services'],
                ['Industries We Serve', 'industries'],
                ['Platform Features', 'platform-features'],
                ['AI Capabilities', 'ai-documents'],
                ['Compliance & ISO', 'compliance'],
              ].map(([label, target]) => (
                <button
                  key={target}
                  type="button"
                  onClick={() => scrollToSection(target)}
                  className="block hover:text-[#FFC629] transition-colors cursor-pointer"
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="md:col-span-2 space-y-2 text-xs">
              <div className="font-bold text-white uppercase tracking-wider text-[11px]">Platform</div>
              <button type="button" onClick={() => onAccessPlatform('dashboard')} className="block hover:text-[#FFC629] cursor-pointer">
                EHS KPI Dashboard
              </button>
              <button type="button" onClick={() => onAccessPlatform('master-kpi')} className="block hover:text-[#FFC629] cursor-pointer">
                Master KPI Hub
              </button>
              <button type="button" onClick={() => onAccessPlatform('ptw')} className="block hover:text-[#FFC629] cursor-pointer">
                Digital Permit to Work
              </button>
              <button type="button" onClick={() => onAccessPlatform('observations')} className="block hover:text-[#FFC629] cursor-pointer">
                AI Hazard Observations
              </button>
              <button type="button" onClick={() => onAccessPlatform('audits')} className="block hover:text-[#FFC629] cursor-pointer">
                Safety Audits &amp; Inspections
              </button>
            </div>

            <div className="md:col-span-3 space-y-2 text-xs">
              <div className="font-bold text-white uppercase tracking-wider text-[11px]">Ownership &amp; Legal</div>
              <div className="text-slate-300">
                <strong>{siteConfig.ownerRole}:</strong> {siteConfig.ownerName}
              </div>
              <div>Email: {siteConfig.contactEmail}</div>
              {siteConfig.contactPhones && (
                <div>Phone: {siteConfig.contactPhones}</div>
              )}
              <div className="flex items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setLegalModal('privacy')}
                  className="hover:text-[#FFC629] underline cursor-pointer"
                >
                  Privacy Policy
                </button>
                <button
                  type="button"
                  onClick={() => setLegalModal('terms')}
                  className="hover:text-[#FFC629] underline cursor-pointer"
                >
                  Terms of Use
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <div>
              &copy; 2026 <strong className="text-slate-200">{siteConfig.brandName}</strong> ({siteConfig.companyName}) · Developed, Created &amp; Owned by{' '}
              <strong className="text-[#FFC629]">{siteConfig.ownerName}</strong>
            </div>
            <div>{siteConfig.heroMissionHeadline}</div>
          </div>
        </div>
      </footer>

      {/* Privacy Policy / Terms Modal */}
      {legalModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#06152C] border border-[#00BFFF]/40 rounded-xl max-w-xl w-full p-6 space-y-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-display font-bold text-lg text-white">
                {legalModal === 'privacy' ? 'ARSHIEL SAFETY — Privacy Policy' : 'ARSHIEL SAFETY — Terms of Use'}
              </h3>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {legalModal === 'privacy' ? (
              <div className="space-y-2.5 text-xs leading-relaxed text-[#C0C7D1]">
                <p>
                  ARSHIEL SAFETY ({siteConfig.companyName}), developed, created, and owned by <strong className="text-white">{siteConfig.ownerName}</strong>, isolates every organization workspace using multi-tenant PostgreSQL scoping and authenticated Firebase sessions.
                </p>
                <p>
                  Operational EHS records, permits, observations, audit trails, and submitted demo requests are stored securely for your organization&apos;s safety operations and are never sold to third parties.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 text-xs leading-relaxed text-[#C0C7D1]">
                <p>
                  ARSHIEL SAFETY is provided free to use and share for enterprise and organizational safety management. All AI-generated HIRA, JSA, SOP, CAPA, and compliance outputs serve as decision support and MUST be verified and approved by authorized competent EHS personnel prior to field execution.
                </p>
                <p>
                  Statutory and ISO compliance registers must be configured according to your country, state, industry, and applicable effective legal dates.
                </p>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="px-4 py-2 text-xs font-bold bg-[#FFC629] text-[#020817] rounded-md cursor-pointer"
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
