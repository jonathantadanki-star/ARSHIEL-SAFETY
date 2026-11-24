import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingHomepage } from './components/LandingHomepage';
import { CommandCentreLandingPage } from './components/CommandCentreLandingPage';
import {
  ArshielIntelligenceHubView,
  type IntelligenceSubmenuKey,
} from './components/ArshielIntelligenceHubView';
import { LoginScreen } from './components/LoginScreen';
import { AppShell } from './components/AppShell';
import { type NavDomainKey } from './components/GlobalHeader';
import { DashboardView } from './components/DashboardView';
import { ModuleBuilderView } from './components/ModuleBuilderView';
import { DynamicModuleRunner } from './components/DynamicModuleRunner';
import { PermitToWorkView } from './components/PermitToWorkView';
import { IncidentsAndCapaView } from './components/IncidentsAndCapaView';
import { AiObservationsView } from './components/AiObservationsView';
import { RiskAndLotoView } from './components/RiskAndLotoView';
import { AuditsAndEquipmentView } from './components/AuditsAndEquipmentView';
import { AiAssistantView } from './components/AiAssistantView';
import { OperationsSuiteView } from './components/OperationsSuiteView';
import { SettingsAdminView } from './components/SettingsAdminView';
import { AnalyticsReportsView, MobileFieldView } from './components/MobileAndAnalyticsViews';
import { MasterKpiDashboardView } from './components/MasterKpiDashboardView';
import { PlatformLoginAnalyticsView } from './components/PlatformLoginAnalyticsView';

type AppSurface = 'landing' | 'classic-landing' | 'login' | 'register' | 'app';

const PROTECTED_PATH_TO_ROUTE: Record<string, string> = {
  '/app': 'dashboard',
  '/dashboard': 'dashboard',
  '/admin': 'settings',
  '/settings': 'settings',
  '/safety': 'ptw',
  '/ptw': 'ptw',
  '/ehs': 'dashboard',
  '/hse': 'audits',
  '/she': 'incidents',
  '/esg': 'master-kpi',
  '/sustainability': 'environment',
  '/master-kpi': 'master-kpi',
  '/incidents': 'incidents',
  '/audits': 'audits',
  '/observations': 'observations',
  '/risk-assessment': 'risk-assessment',
  '/module-builder': 'module-builder',
  '/intelligence': 'intel-industry',
  '/intelligence/industry': 'intel-industry',
  '/intelligence/data': 'intel-data',
  '/intelligence/my-dashboard': 'intel-my-dashboard',
  '/intelligence/alerts': 'intel-alerts',
  '/intelligence/reports': 'intel-reports',
};

const OWNER_ONLY_ROUTES = new Set(['module-builder', 'settings', 'platform-logins']);

function parseLocationState(): { surface: AppSurface; route: string } {
  if (typeof window === 'undefined') return { surface: 'landing', route: 'dashboard' };
  const path = (window.location.pathname || '/').toLowerCase().replace(/\/+$/, '') || '/';
  const hash = (window.location.hash || '').toLowerCase();

  if (path === '/overview' || path === '/classic-home') {
    return { surface: 'classic-landing', route: 'dashboard' };
  }
  if (path === '/login') {
    return { surface: 'login', route: 'dashboard' };
  }
  if (path === '/register' || path === '/signup') {
    return { surface: 'register', route: 'dashboard' };
  }
  if (path in PROTECTED_PATH_TO_ROUTE) {
    return { surface: 'app', route: PROTECTED_PATH_TO_ROUTE[path] };
  }
  if (path.startsWith('/app/') || hash === '#app' || hash === '#exec') {
    const sub = path.replace(/^\/app\//, '');
    return { surface: 'app', route: sub || 'dashboard' };
  }
  return { surface: 'landing', route: 'dashboard' };
}

function ArshielWorkspace() {
  const { firebaseUser, authLoading, user, error } = useAuth();
  const initial = parseLocationState();

  const [surface, setSurface] = useState<AppSurface>(initial.surface);
  const [activeRoute, setActiveRoute] = useState<string>(initial.route);
  const [activeCustomModuleId, setActiveCustomModuleId] = useState<string | null>(null);
  const [landingSection, setLandingSection] = useState<NavDomainKey | null>(null);
  const [redirectNotice, setRedirectNotice] = useState<string | null>(null);
  const [postLoginRoute, setPostLoginRoute] = useState<string>(initial.route);

  // Listen to browser back/forward navigation
  useEffect(() => {
    const onPopState = () => {
      const parsed = parseLocationState();
      setSurface(parsed.surface);
      setActiveRoute(parsed.route);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Enforce route protection & automatic post-login dashboard redirect
  useEffect(() => {
    if (authLoading) return;

    // 1. Direct access to protected URLs by unauthenticated users → redirect to /login
    if (surface === 'app' && !firebaseUser) {
      setPostLoginRoute(activeRoute || 'dashboard');
      setRedirectNotice('Please sign in to access your protected ARSHIEL SAFETY workspace.');
      setSurface('login');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.history.replaceState({ surface: 'login' }, '', '/login');
      }
      return;
    }

    // 2. Authenticated users visiting /login or /register → redirect straight to authorized dashboard
    if ((surface === 'login' || surface === 'register') && firebaseUser) {
      setRedirectNotice(null);
      setActiveRoute(postLoginRoute || 'dashboard');
      setSurface('app');
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/app')) {
        window.history.replaceState({ surface: 'app' }, '', '/app');
      }
    }
  }, [authLoading, firebaseUser, surface, activeRoute, postLoginRoute]);

  // Dynamic canonical URL & OpenGraph sync
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const origin = window.location.origin;
    const canonicalHref = origin + window.location.pathname;
    const logoAbsolute = `${origin}/assets/aistudio/Designer__2___1__9fac3732.png`;

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalHref;

    const upsertMeta = (attr: 'property' | 'name', key: string, value: string) => {
      let tag = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.content = value;
    };

    upsertMeta('property', 'og:url', canonicalHref);
    upsertMeta('property', 'og:image', logoAbsolute);
    upsertMeta('name', 'twitter:image', logoAbsolute);
  }, [surface]);

  const openLogin = () => {
    if (firebaseUser) {
      enterApp('dashboard');
      return;
    }
    setRedirectNotice(null);
    setSurface('login');
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.history.pushState({ surface: 'login' }, '', '/login');
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const openRegister = () => {
    if (firebaseUser) {
      enterApp('dashboard');
      return;
    }
    setRedirectNotice(null);
    setSurface('register');
    if (typeof window !== 'undefined' && window.location.pathname !== '/register') {
      window.history.pushState({ surface: 'register' }, '', '/register');
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const enterApp = (targetRoute = 'dashboard') => {
    const safeRoute =
      firebaseUser && !user?.isPlatformOwner && OWNER_ONLY_ROUTES.has(targetRoute)
        ? 'dashboard'
        : targetRoute;
    setActiveRoute(safeRoute);
    setPostLoginRoute(safeRoute);
    setActiveCustomModuleId(null);

    if (!firebaseUser) {
      setRedirectNotice('Sign in or create an account to open your ARSHIEL SAFETY workspace.');
      setSurface('login');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.history.pushState({ surface: 'login' }, '', '/login');
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    setSurface('app');
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/app')) {
      window.history.pushState({ surface: 'app' }, '', '/app');
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const openPublicHomepage = (section?: NavDomainKey) => {
    setLandingSection(section || null);
    setSurface('landing');
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.pushState({ surface: 'landing' }, '', '/');
    }
    if (!section || section === 'home') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const openClassicOverview = (section?: NavDomainKey) => {
    setLandingSection(section || null);
    setSurface('classic-landing');
    if (typeof window !== 'undefined' && window.location.pathname !== '/overview') {
      window.history.pushState({ surface: 'classic-landing' }, '', '/overview');
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handleAfterLogout = () => {
    setRedirectNotice(null);
    setActiveRoute('dashboard');
    setPostLoginRoute('dashboard');
    setActiveCustomModuleId(null);
    setLandingSection('home');
    setSurface('landing');
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.replaceState({ surface: 'landing' }, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  if (surface === 'landing') {
    return (
      <CommandCentreLandingPage
        onEnterPlatform={enterApp}
        onOpenLogin={openLogin}
        onOpenRegister={openRegister}
        onOpenClassicOverview={() => openClassicOverview('home')}
        onAfterLogout={handleAfterLogout}
      />
    );
  }

  if (surface === 'classic-landing') {
    return (
      <LandingHomepage
        isAuthenticated={Boolean(firebaseUser)}
        userName={user?.fullName || firebaseUser?.displayName}
        initialSection={landingSection}
        onAccessPlatform={enterApp}
        onOpenLogin={openLogin}
        onOpenRegister={openRegister}
        onAfterLogout={handleAfterLogout}
      />
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#020817] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="font-display font-bold text-lg arshiel-gold-text">ARSHIEL SAFETY</div>
          <div className="text-xs text-slate-400">Verifying Authenticated Session...</div>
        </div>
      </div>
    );
  }

  if (surface === 'login' || surface === 'register' || !firebaseUser) {
    return (
      <LoginScreen
        initialMode={surface === 'register' ? 'register' : 'login'}
        redirectNotice={redirectNotice}
        onSwitchMode={(nextMode) => {
          setSurface(nextMode);
          if (typeof window !== 'undefined') {
            window.history.replaceState({ surface: nextMode }, '', nextMode === 'register' ? '/register' : '/login');
          }
        }}
        onBackToHomepage={(section) => openPublicHomepage(section)}
      />
    );
  }

  if (!user && error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-red-200 rounded-lg p-6 max-w-md w-full space-y-3">
          <div className="font-display font-bold text-slate-900">Workspace Initialization Error</div>
          <p className="text-xs text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => openPublicHomepage('home')}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded cursor-pointer"
          >
            Back to Public Homepage
          </button>
        </div>
      </div>
    );
  }

  const navigate = (routeKey: string, customModuleId: string | null = null) => {
    const safeRoute = !user?.isPlatformOwner && OWNER_ONLY_ROUTES.has(routeKey) ? 'dashboard' : routeKey;
    setActiveRoute(safeRoute);
    setActiveCustomModuleId(customModuleId);
  };

  const renderContent = () => {
    const openMasterKpi = () => navigate('master-kpi', null);

    if (activeRoute === 'custom-module' && activeCustomModuleId) {
      return (
        <DynamicModuleRunner
          moduleId={activeCustomModuleId}
          onNavigateModule={(id) => navigate('custom-module', id)}
          onOpenMasterKpi={openMasterKpi}
        />
      );
    }

    switch (activeRoute) {
      case 'dashboard':
        return <DashboardView onNavigate={navigate} />;
      case 'intel-industry':
      case 'intel-data':
      case 'intel-my-dashboard':
      case 'intel-alerts':
      case 'intel-reports':
        return (
          <ArshielIntelligenceHubView
            activeSubmenu={activeRoute as IntelligenceSubmenuKey}
            onNavigate={navigate}
          />
        );
      case 'master-kpi':
      case 'kpi-executive':
      case 'kpi-industry':
      case 'kpi-plant':
      case 'kpi-module':
      case 'kpi-individual':
        return <MasterKpiDashboardView initialMode={activeRoute} onNavigate={navigate} />;
      case 'ai-assistant':
        return <AiAssistantView />;
      case 'incidents':
        return <IncidentsAndCapaView defaultTab="incidents" onOpenMasterKpi={openMasterKpi} />;
      case 'rca-capa':
        return <IncidentsAndCapaView defaultTab="capa" onOpenMasterKpi={openMasterKpi} />;
      case 'ptw':
        return <PermitToWorkView onOpenMasterKpi={openMasterKpi} />;
      case 'loto':
        return <RiskAndLotoView defaultTab="loto" onOpenMasterKpi={openMasterKpi} />;
      case 'observations':
        return <AiObservationsView onOpenMasterKpi={openMasterKpi} />;
      case 'risk-assessment':
        return <RiskAndLotoView defaultTab="risk" onOpenMasterKpi={openMasterKpi} />;
      case 'audits':
        return <AuditsAndEquipmentView defaultTab="audits" onOpenMasterKpi={openMasterKpi} />;
      case 'equipment':
        return <AuditsAndEquipmentView defaultTab="equipment" onOpenMasterKpi={openMasterKpi} />;
      case 'module-builder':
        return user?.isPlatformOwner ? (
          <ModuleBuilderView
            onOpenCustomModule={(id) => navigate('custom-module', id)}
          />
        ) : (
          <DashboardView onNavigate={navigate} />
        );
      case 'settings':
        return user?.isPlatformOwner ? (
          <SettingsAdminView />
        ) : (
          <DashboardView onNavigate={navigate} />
        );
      case 'analytics':
        return <AnalyticsReportsView />;
      case 'mobile-field':
        return <MobileFieldView onNavigate={(r) => navigate(r, null)} />;
      case 'platform-logins':
        return user?.isPlatformOwner ? (
          <PlatformLoginAnalyticsView />
        ) : (
          <DashboardView onNavigate={navigate} />
        );
      default:
        return <OperationsSuiteView routeKey={activeRoute} onOpenMasterKpi={openMasterKpi} />;
    }
  };

  return (
    <AppShell
      activeRoute={activeRoute}
      activeCustomModuleId={activeCustomModuleId}
      onNavigate={navigate}
      onOpenHomepage={openPublicHomepage}
      onAfterLogout={handleAfterLogout}
    >
      {renderContent()}
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ArshielWorkspace />
    </AuthProvider>
  );
}
