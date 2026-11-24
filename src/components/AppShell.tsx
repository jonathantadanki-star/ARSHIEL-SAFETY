import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  BrainCircuit,
  Building2,
  ChevronDown,
  ChevronRight,
  FileText,
  Globe,
  Info,
  LayoutDashboard,
  Menu,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { AppModule } from '../types';
import { DynamicIcon } from './IconResolver';
import { GlobalHeader, type NavDomainKey } from './GlobalHeader';
import { OfflineIndicator } from './PWAInstallButton';

interface AppShellProps {
  activeRoute: string;
  activeCustomModuleId: string | null;
  onNavigate: (routeKey: string, customModuleId?: string | null) => void;
  onOpenHomepage?: (section?: NavDomainKey) => void;
  onAfterLogout?: () => void;
  children: React.ReactNode;
}

const OWNER_ONLY_BUILT_IN_KEYS = new Set(['module-builder', 'settings']);
const OWNER_ONLY_MODULE_CODES = new Set(['MOD-BLD', 'MOD-SET']);

function buildModuleTree(flat: AppModule[], isOwner: boolean): AppModule[] {
  const visible = flat.filter((m) => {
    if (!m.isActive || !m.isVisible || m.isArchived) return false;
    if (
      !isOwner &&
      (OWNER_ONLY_BUILT_IN_KEYS.has(m.builtInKey || '') || OWNER_ONLY_MODULE_CODES.has(m.moduleCode || ''))
    ) {
      return false;
    }
    return true;
  });
  const map = new Map<string, AppModule>();
  for (const m of visible) {
    map.set(m.id, { ...m, children: [] });
  }
  const roots: AppModule[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRecursive = (list: AppModule[]) => {
    list.sort((a, b) => a.displayOrder - b.displayOrder);
    for (const item of list) {
      if (item.children && item.children.length > 0) sortRecursive(item.children);
    }
  };
  sortRecursive(roots);
  return roots;
}

export function AppShell({
  activeRoute,
  activeCustomModuleId,
  onNavigate,
  onOpenHomepage,
  onAfterLogout,
  children,
}: AppShellProps) {
  const {
    user,
    organization,
    modules,
    switchOrganization,
    refreshSession,
    syncOfflineDrafts,
  } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [intelHubOpen, setIntelHubOpen] = useState<boolean>(true);
  const [sidebarFilter, setSidebarFilter] = useState('');
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showNewOrgModal, setShowNewOrgModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgIndustry, setNewOrgIndustry] = useState('Manufacturing');
  const [newOrgSample, setNewOrgSample] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const tree = useMemo(
    () => buildModuleTree(modules, Boolean(user?.isPlatformOwner)),
    [modules, user?.isPlatformOwner]
  );

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openNotifications = async () => {
    setShowNotifDrawer(true);
    try {
      const list = await apiFetch('/api/notifications');
      setNotificationsList(list);
    } catch {
      setNotificationsList([]);
    }
  };

  const markAllRead = async () => {
    await apiFetch('/api/notifications/read-all', { method: 'POST' });
    setNotificationsList((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await refreshSession();
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    const created = await apiFetch('/api/organizations', {
      method: 'POST',
      body: JSON.stringify({
        name: newOrgName.trim(),
        industry: newOrgIndustry,
        withSampleData: newOrgSample,
      }),
    });
    setShowNewOrgModal(false);
    setNewOrgName('');
    await switchOrganization(created.id);
  };

  const handleSyncOffline = async () => {
    setSyncing(true);
    try {
      await syncOfflineDrafts();
    } finally {
      setSyncing(false);
    }
  };

  const handleNodeSelect = (node: AppModule) => {
    // Non-blocking activity telemetry for Super Admin Control Center (no secrets/passwords)
    apiFetch('/api/activity/track', {
      method: 'POST',
      body: JSON.stringify({
        moduleName: node.moduleName,
        activityType: node.builtInKey === 'dashboard' ? 'dashboard_view' : 'module_access',
        summary: `Opened ${node.moduleName}`,
      }),
    }).catch(() => {});

    if (node.builtInKey) {
      if (node.children && node.children.length > 0) {
        setExpandedIds((prev) => ({ ...prev, [node.id]: true }));
      }
      onNavigate(node.builtInKey, null);
    } else if (node.moduleType === 'category' && node.children && node.children.length > 0) {
      toggleExpand(node.id);
      return;
    } else {
      onNavigate('custom-module', node.id);
    }
    setSidebarOpen(false);
  };

  const renderTreeNodes = (nodes: AppModule[], depth = 0) => {
    return nodes
      .filter((n) => {
        if (!sidebarFilter.trim()) return true;
        const q = sidebarFilter.toLowerCase();
        const selfMatch = n.moduleName.toLowerCase().includes(q) || n.moduleCode.toLowerCase().includes(q);
        const childMatch = (n.children || []).some((c) => c.moduleName.toLowerCase().includes(q));
        return selfMatch || childMatch;
      })
      .map((node) => {
        const hasChildren = Boolean(node.children && node.children.length > 0);
        const isExpanded = Boolean(
          expandedIds[node.id] ??
            (depth === 0 && (node.moduleCode === 'MOD-SAFETY' || node.moduleCode === 'MOD-MASTER-KPI'))
        );
        const isActive =
          (node.builtInKey && activeRoute === node.builtInKey && !activeCustomModuleId) ||
          (!node.builtInKey && activeRoute === 'custom-module' && activeCustomModuleId === node.id);

        return (
          <div key={node.id}>
            <div
              className={`group flex items-center justify-between px-2.5 py-1.5 rounded text-sm cursor-pointer transition-colors ${
                isActive
                  ? 'bg-emerald-700 text-white font-medium'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
              style={{ paddingLeft: `${10 + depth * 14}px` }}
              onClick={() => handleNodeSelect(node)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <DynamicIcon name={node.icon} className="w-4 h-4 shrink-0 opacity-90" />
                <span className="truncate">{node.moduleName}</span>
              </div>
              {hasChildren && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(node.id);
                  }}
                  className="p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                  aria-label="Toggle submenu"
                >
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
            {hasChildren && isExpanded && (
              <div className="mt-0.5 space-y-0.5">{renderTreeNodes(node.children!, depth + 1)}</div>
            )}
          </div>
        );
      });
  };

  const brandName = organization?.branding?.companyName || organization?.name || 'ARSHIEL SAFETY';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Dynamic Database-Driven Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-68 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-14 px-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => onNavigate('dashboard', null)}
          >
            {organization?.branding?.logoUrl ? (
              <img
                src={organization.branding.logoUrl}
                alt={brandName}
                className="w-8 h-8 rounded object-cover bg-white"
              />
            ) : (
              <img
                src="/assets/aistudio/Designer__2___1__9fac3732.png"
                alt="ARSHIEL SAFETY"
                className="w-8 h-8 rounded object-cover bg-slate-950 border border-amber-500/40"
              />
            )}
            <div className="min-w-0">
              <div className="font-display font-bold text-sm text-white tracking-tight truncate">
                ARSHIEL SAFETY
              </div>
              <div className="text-[10px] text-slate-400 truncate">{brandName}</div>
            </div>
          </div>
          <button
            type="button"
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Module Filter */}
        <div className="p-3 border-b border-slate-800 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={sidebarFilter}
              onChange={(e) => setSidebarFilter(e.target.value)}
              placeholder="Filter modules..."
              className="w-full bg-slate-800 border border-slate-700 rounded text-xs text-white placeholder-slate-400 pl-8 pr-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Dynamic Unlimited Module Tree */}
        <nav className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {/* Prominent Enterprise Menu: ARSHIEL INTELLIGENCE HUB */}
          {(() => {
            const intelSubmenus = [
              { key: 'intel-industry', label: 'Industry Intelligence', icon: Building2 },
              { key: 'intel-data', label: 'Data Intelligence', icon: BarChart3 },
              { key: 'intel-my-dashboard', label: 'My Dashboard', icon: LayoutDashboard },
              { key: 'intel-alerts', label: 'Alert Centre', icon: Bell },
              { key: 'intel-reports', label: 'Reports', icon: FileText },
            ];
            const q = sidebarFilter.trim().toLowerCase();
            const matchingSubs = q
              ? intelSubmenus.filter(
                  (s) =>
                    s.label.toLowerCase().includes(q) ||
                    'arshiel intelligence hub'.includes(q)
                )
              : intelSubmenus;
            const isAnyIntelActive = intelSubmenus.some((s) => s.key === activeRoute);

            if (q && matchingSubs.length === 0) return null;

            return (
              <div className="mb-2 pb-2 border-b border-slate-800/90">
                <button
                  type="button"
                  onClick={() => setIntelHubOpen((v) => !v)}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-xs font-bold tracking-wide transition-colors cursor-pointer ${
                    isAnyIntelActive
                      ? 'bg-slate-800 text-amber-300 border border-amber-400/40'
                      : 'bg-slate-800/70 text-amber-300 hover:bg-slate-800 border border-slate-700/70'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <BrainCircuit className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="truncate">ARSHIEL INTELLIGENCE HUB</span>
                  </span>
                  {intelHubOpen || Boolean(q) ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                </button>
                {(intelHubOpen || Boolean(q)) && (
                  <div className="mt-1 space-y-0.5 pl-2">
                    {matchingSubs.map((sub) => {
                      const SubIcon = sub.icon;
                      const isActive = activeRoute === sub.key && !activeCustomModuleId;
                      return (
                        <button
                          key={sub.key}
                          type="button"
                          onClick={() => {
                            onNavigate(sub.key, null);
                            setSidebarOpen(false);
                          }}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-sm transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-emerald-700 text-white font-medium'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <SubIcon className="w-3.5 h-3.5 shrink-0 opacity-90" />
                          <span className="truncate">{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {renderTreeNodes(tree)}
          <div className="pt-2 mt-2 border-t border-slate-800 space-y-1">
            {user?.isPlatformOwner && (
              <div
                onClick={() => {
                  onNavigate('platform-logins', null);
                  setSidebarOpen(false);
                }}
                className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded text-sm cursor-pointer ${
                  activeRoute === 'platform-logins'
                    ? 'bg-emerald-700 text-white font-medium'
                    : 'text-amber-300 hover:bg-slate-800 hover:text-amber-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span className="truncate">Super Admin Control Center</span>
                </div>
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                  OWNER
                </span>
              </div>
            )}
            <div
              onClick={() => {
                onNavigate('mobile-field', null);
                setSidebarOpen(false);
              }}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-sm cursor-pointer ${
                activeRoute === 'mobile-field'
                  ? 'bg-emerald-700 text-white font-medium'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4 shrink-0" />
              <span>Mobile Field Quick View</span>
            </div>
            {onOpenHomepage && (
              <div
                onClick={() => {
                  setSidebarOpen(false);
                  onOpenHomepage();
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded text-sm cursor-pointer text-sky-300 hover:bg-slate-800 hover:text-white"
              >
                <Globe className="w-4 h-4 shrink-0" />
                <span>Public Website Home</span>
              </div>
            )}
          </div>
        </nav>

        {/* Sidebar Owner Attribution (Logout cleanly consolidated inside top-right User Profile menu) */}
        <div className="p-3 border-t border-slate-800 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setShowAboutModal(true)}
            className="w-full flex items-center justify-between text-slate-400 hover:text-white cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              <span>About · Jonathan Thadanki</span>
            </span>
            <span className="text-[10px] text-slate-500 font-semibold">v2026</span>
          </button>
        </div>
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Global Reusable Application Header (Always Visible Dashboard / My Account / Logout) */}
        <GlobalHeader
          variant="app"
          onNavigateSection={(section) => onOpenHomepage?.(section)}
          onOpenDashboard={(route) => onNavigate(route || 'dashboard', null)}
          onOpenHomepage={() => onOpenHomepage?.('home')}
          onAfterLogout={onAfterLogout}
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenNewOrg={() => setShowNewOrgModal(true)}
          onOpenNotifications={openNotifications}
          onSyncOffline={handleSyncOffline}
          syncingOffline={syncing}
        />

        {/* Main Workspace Body */}
        <main className="flex-1 p-4 sm:p-6 pb-20 lg:pb-6 max-w-[1600px] w-full mx-auto">
          {children}
        </main>

        {/* Application Footer */}
        <footer className="hidden lg:flex border-t border-slate-200 bg-white px-6 py-3 items-center justify-between text-xs text-slate-500">
          <div>
            &copy; 2026 <strong className="text-slate-800">ARSHIEL SAFETY</strong> (ARSHIEL EHS AI SOLUTIONS) · Developer, Creator &amp; Owner:{' '}
            <strong className="text-slate-900">Jonathan Thadanki</strong>
          </div>
          <div>One Platform. All Safety Operations. AI-Powered Prevention.</div>
        </footer>
      </div>

      {/* Mobile Compact Bottom Quick Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 h-14 grid grid-cols-4 text-[11px] font-medium text-slate-600">
        <button
          type="button"
          onClick={() => onNavigate('dashboard', null)}
          className={`flex flex-col items-center justify-center ${activeRoute === 'dashboard' ? 'text-emerald-700 font-semibold' : ''}`}
        >
          <span>Dashboard</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('mobile-field', null)}
          className={`flex flex-col items-center justify-center ${activeRoute === 'mobile-field' ? 'text-emerald-700 font-semibold' : ''}`}
        >
          <span>Field Quick</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('ptw', null)}
          className={`flex flex-col items-center justify-center ${activeRoute === 'ptw' ? 'text-emerald-700 font-semibold' : ''}`}
        >
          <span>Permits</span>
        </button>
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center justify-center"
        >
          <span>Modules</span>
        </button>
      </nav>

      {/* Notifications Drawer */}
      {showNotifDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
          <div className="w-full max-w-md bg-white h-full border-l border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="font-display font-bold text-slate-900">Safety Alerts &amp; Notifications</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs font-medium text-emerald-700 hover:underline cursor-pointer"
                >
                  Mark all read
                </button>
                <button
                  type="button"
                  onClick={() => setShowNotifDrawer(false)}
                  className="p-1 text-slate-500 hover:text-slate-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {notificationsList.length === 0 ? (
                <div className="p-6 text-sm text-slate-500 text-center">No notifications yet.</div>
              ) : (
                notificationsList.map((n) => (
                  <div key={n.id} className={`p-4 ${n.isRead ? 'bg-white' : 'bg-emerald-50/40'}`}>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="uppercase font-semibold">{n.type}</span>
                      <span className="tabular-nums">{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900 mt-1">{n.title}</div>
                    <div className="text-xs text-slate-600 mt-0.5">{n.message}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Organization Modal */}
      {showNewOrgModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateOrg}
            className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-slate-900">Create New Organization</h3>
              <button type="button" onClick={() => setShowNewOrgModal(false)}>
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Organization / Company Name</label>
              <input
                required
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="e.g. Apex Steel & Energy Ltd"
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Industry Sector</label>
              <select
                value={newOrgIndustry}
                onChange={(e) => setNewOrgIndustry(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              >
                {[
                  'Manufacturing',
                  'Chemical',
                  'Oil & Gas',
                  'Pharma',
                  'Construction',
                  'Data Centers',
                  'Semiconductor',
                  'FMCG',
                  'Warehousing',
                  'Logistics',
                  'Electrical',
                  'IT Infrastructure',
                  'Corporate Offices',
                  'Healthcare',
                ].map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={newOrgSample}
                onChange={(e) => setNewOrgSample(e.target.checked)}
              />
              <span>Load clearly-badged SAMPLE DATA for evaluation (removable anytime)</span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewOrgModal(false)}
                className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-emerald-700 text-white rounded hover:bg-emerald-800"
              >
                Provision Workspace
              </button>
            </div>
          </form>
        </div>
      )}

      {/* About ARSHIEL SAFETY Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-slate-900">About ARSHIEL SAFETY</h3>
              <button type="button" onClick={() => setShowAboutModal(false)}>
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">
                One Platform. All Safety Operations. AI-Powered Prevention.
              </p>
              <p>
                Enterprise EHS Governance Platform featuring Dynamic Unlimited Module Architecture,
                20-Aspect Digital PTW, Multimodal AI Hazard Observations, HIRA/HAZOP/JSA, Audits,
                OSH Code 2020 Compliance, and multi-tenant Cloud SQL persistence.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs space-y-1">
                <div>
                  <strong>Developer, Creator &amp; Owner:</strong> Jonathan Thadanki
                </div>
                <div>
                  <strong>Copyright:</strong> &copy; 2026 ARSHIEL SAFETY · ARSHIEL EHS AI SOLUTIONS
                </div>
                <div>
                  <strong>Active Workspace:</strong> {organization?.name}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Offline Banner */}
      <OfflineIndicator />
    </div>
  );
}
