import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Building2,
  CheckCircle2,
  ChevronDown,
  Globe,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  ShieldCheck,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { PWAInstallButton, ShareAppButton } from './PWAInstallButton';

export type NavDomainKey =
  | 'home'
  | 'about'
  | 'services'
  | 'industries'
  | 'safety'
  | 'ehs'
  | 'hse'
  | 'she'
  | 'esg'
  | 'sustainability'
  | 'contact';

export interface GlobalHeaderProps {
  variant: 'public' | 'app';
  brandName?: string;
  companyName?: string;
  logoUrl?: string;
  onNavigateSection?: (key: NavDomainKey) => void;
  onOpenLogin?: () => void;
  onOpenRegister?: () => void;
  onOpenDashboard?: (targetRoute?: string) => void;
  onOpenHomepage?: () => void;
  onAfterLogout?: () => void;
  // App-mode specific workspace controls
  onOpenSidebar?: () => void;
  onOpenNewOrg?: () => void;
  onOpenNotifications?: () => void;
  onSyncOffline?: () => void;
  syncingOffline?: boolean;
  onShareFree?: () => void;
  shareCopied?: boolean;
}

const PRIMARY_NAV_ITEMS: { key: NavDomainKey; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'about', label: 'About Us' },
  { key: 'services', label: 'Our Services' },
  { key: 'industries', label: 'Industries' },
  { key: 'contact', label: 'Contact Us' },
];

const DOMAIN_NAV_ITEMS: { key: NavDomainKey; label: string; routeKey: string }[] = [
  { key: 'safety', label: 'SAFETY', routeKey: 'ptw' },
  { key: 'ehs', label: 'EHS', routeKey: 'dashboard' },
  { key: 'hse', label: 'HSE', routeKey: 'audits' },
  { key: 'she', label: 'SHE', routeKey: 'incidents' },
  { key: 'esg', label: 'ESG', routeKey: 'master-kpi' },
  { key: 'sustainability', label: 'Sustainability', routeKey: 'environment' },
];

export function GlobalHeader({
  variant,
  brandName = 'ARSHIEL SAFETY',
  companyName = 'ARSHIEL EHS AI SOLUTIONS',
  logoUrl = '/assets/aistudio/Designer__2___1__9fac3732.png',
  onNavigateSection,
  onOpenLogin,
  onOpenRegister,
  onOpenDashboard,
  onOpenHomepage,
  onAfterLogout,
  onOpenSidebar,
  onOpenNewOrg,
  onOpenNotifications,
  onSyncOffline,
  syncingOffline = false,
  onShareFree,
  shareCopied = false,
}: GlobalHeaderProps) {
  const {
    firebaseUser,
    user,
    organization,
    organizations,
    unreadCount,
    offlineDraftCount,
    switchOrganization,
    refreshSession,
    logout,
  } = useAuth();

  const isAuthenticated = Boolean(firebaseUser);
  const displayName = user?.fullName || firebaseUser?.displayName || firebaseUser?.email?.split('@')[0] || 'Account';
  const displayEmail = user?.email || firebaseUser?.email || '';
  const displayRole =
    user?.primaryRoleName ||
    (user?.isPlatformOwner ? 'Super Admin' : user?.roles?.[0]?.name || 'Employee / Worker');
  const avatarUrl = user?.avatarUrl || firebaseUser?.photoURL || null;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [profileName, setProfileName] = useState(displayName);
  const [profileDesignation, setProfileDesignation] = useState(user?.designation || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSavedMsg, setProfileSavedMsg] = useState<string | null>(null);

  const accountDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProfileName(displayName);
    setProfileDesignation(user?.designation || '');
  }, [displayName, user?.designation]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDomainClick = (item: { key: NavDomainKey; label: string; routeKey?: string }) => {
    setMobileMenuOpen(false);
    if (variant === 'app') {
      if (item.key === 'home' || item.key === 'about' || item.key === 'services' || item.key === 'industries' || item.key === 'contact') {
        onOpenHomepage?.();
        setTimeout(() => {
          onNavigateSection?.(item.key);
        }, 120);
        return;
      }
      if (item.routeKey) {
        onOpenDashboard?.(item.routeKey);
        return;
      }
    }
    onNavigateSection?.(item.key);
  };

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      setShowLogoutConfirm(false);
      setAccountMenuOpen(false);
      setMobileMenuOpen(false);
      setShowAccountModal(false);
      onAfterLogout?.();
    } finally {
      setLoggingOut(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSavedMsg(null);
    try {
      await apiFetch('/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: profileName.trim(),
          designation: profileDesignation.trim(),
        }),
      });
      await refreshSession();
      setProfileSavedMsg('Account profile updated successfully.');
    } catch (err: any) {
      setProfileSavedMsg(err?.message || 'Unable to update profile right now.');
    } finally {
      setSavingProfile(false);
    }
  };

  const isPublicStyle = variant === 'public';

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-colors ${
          isPublicStyle
            ? 'bg-[#020817]/95 backdrop-blur-md border-b border-[#00BFFF]/25 text-white'
            : 'bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-900'
        }`}
      >
        {/* Row 1: Main Brand + Primary Navigation + Auth Actions */}
        <div
          className={`${
            isPublicStyle ? 'max-w-[1440px] mx-auto' : 'w-full'
          } px-3 sm:px-5 h-16 flex items-center justify-between gap-2 sm:gap-4`}
        >
          {/* Left: Brand Lockup (Public) OR Sidebar Trigger + Org Switcher (App) */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {!isPublicStyle && onOpenSidebar && (
              <button
                type="button"
                onClick={onOpenSidebar}
                className="lg:hidden p-2 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 shrink-0 cursor-pointer"
                aria-label="Open modules sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {isPublicStyle ? (
              <button
                type="button"
                onClick={() => handleDomainClick({ key: 'home', label: 'Home' })}
                className="flex items-center gap-2.5 shrink-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC629] rounded cursor-pointer"
              >
                <img
                  src={logoUrl}
                  alt="ARSHIEL SAFETY Official Logo"
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-md object-cover border border-[#FFC629]/60 bg-[#020817] shadow-[0_0_16px_rgba(255,198,41,0.28)] shrink-0"
                />
                <div className="leading-tight min-w-0">
                  <div className="font-display font-extrabold text-sm sm:text-base tracking-tight arshiel-gold-text whitespace-nowrap">
                    {brandName}
                  </div>
                  <div className="hidden xs:block text-[10px] font-semibold tracking-wider text-[#C0C7D1] whitespace-nowrap">
                    {companyName}
                  </div>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => onOpenDashboard?.('dashboard')}
                  className="lg:hidden flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <img
                    src={logoUrl}
                    alt="ARSHIEL SAFETY"
                    className="w-8 h-8 rounded object-cover border border-amber-500/40 bg-slate-950"
                  />
                </button>
                <Building2 className="w-4 h-4 text-slate-500 shrink-0 hidden sm:block" />
                <select
                  value={organization?.id || ''}
                  onChange={(e) => switchOrganization(e.target.value)}
                  className="text-xs sm:text-sm font-semibold text-slate-800 bg-transparent border border-slate-200 rounded-md px-2 py-1.5 max-w-[140px] sm:max-w-[230px] truncate focus:outline-none focus:border-emerald-700"
                  aria-label="Active Organization"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.industry})
                    </option>
                  ))}
                </select>
                {onOpenNewOrg && (
                  <button
                    type="button"
                    onClick={onOpenNewOrg}
                    className="hidden xl:inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 rounded-md cursor-pointer shrink-0"
                    title="Create new enterprise workspace"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Org</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Center: Desktop Navigation Links */}
          {isPublicStyle && (
            <nav
              aria-label="Primary Navigation"
              className="hidden lg:flex items-center gap-4 xl:gap-6 text-[13px] font-medium text-[#C0C7D1]"
            >
              {PRIMARY_NAV_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleDomainClick(item)}
                  className="hover:text-[#FFC629] transition-colors whitespace-nowrap cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </nav>
          )}

          {/* Right: Dynamic Auth Controls (Desktop + Mobile Always Visible!) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* App-mode quick actions */}
            {!isPublicStyle && offlineDraftCount > 0 && onSyncOffline && (
              <button
                type="button"
                onClick={onSyncOffline}
                disabled={syncingOffline}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1.5 rounded-md cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingOffline ? 'animate-spin' : ''}`} />
                <span className="tabular-nums">{offlineDraftCount}</span>
              </button>
            )}

            {!isPublicStyle && (
              <>
                <div className="hidden xl:flex items-center gap-2">
                  <ShareAppButton />
                  <PWAInstallButton compact />
                </div>
                <button
                  type="button"
                  onClick={() => onOpenDashboard?.('ai-assistant')}
                  className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-md cursor-pointer whitespace-nowrap"
                >
                  <span>AI Safety Copilot</span>
                </button>
                {onOpenNotifications && (
                  <button
                    type="button"
                    onClick={onOpenNotifications}
                    className="relative p-2 rounded-md border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer"
                    aria-label="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-bold px-1 rounded tabular-nums">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                )}
              </>
            )}

            {isPublicStyle && onShareFree && (
              <button
                type="button"
                onClick={onShareFree}
                className="hidden 2xl:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#C0C7D1] hover:text-white border border-slate-700/80 hover:border-[#00BFFF]/60 rounded-md transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>{shareCopied ? 'Link Copied' : 'Share Free'}</span>
              </button>
            )}

            {/* === UNAUTHENTICATED VISITORS: Login & Register / Sign Up === */}
            {!isAuthenticated ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-[#00BFFF]/55 hover:border-[#FFC629] rounded-md transition-all cursor-pointer whitespace-nowrap"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#00BFFF]" />
                  <span>Login</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenRegister}
                  className="hidden sm:inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm font-bold text-[#020817] bg-gradient-to-r from-[#FFC629] to-[#f5b400] hover:brightness-110 rounded-md shadow-[0_0_20px_rgba(255,198,41,0.3)] transition-all cursor-pointer whitespace-nowrap"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register / Sign Up</span>
                </button>
              </div>
            ) : (
              /* === AUTHENTICATED USERS: Dashboard + User Profile / My Account + Prominent Logout === */
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Dashboard CTA (always visible on md+ for public site, or quick link in app) */}
                {isPublicStyle && (
                  <button
                    type="button"
                    onClick={() => onOpenDashboard?.('dashboard')}
                    className="hidden md:inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 text-xs font-bold text-[#020817] bg-gradient-to-r from-[#FFC629] to-[#f5b400] hover:brightness-110 rounded-md transition-all cursor-pointer whitespace-nowrap"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Dashboard</span>
                  </button>
                )}

                {/* User Profile / My Account Dropdown */}
                <div className="relative" ref={accountDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen((v) => !v)}
                    className={`inline-flex items-center gap-2 min-h-[38px] px-2 sm:px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                      isPublicStyle
                        ? 'bg-[#06152C] border-slate-700 hover:border-[#00BFFF]/70 text-white'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-900'
                    }`}
                    aria-label="User Profile and My Account"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        referrerPolicy="no-referrer"
                        className="w-7 h-7 rounded object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded bg-slate-900 text-amber-400 text-xs font-bold flex items-center justify-center shrink-0">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="hidden md:block text-left text-xs leading-tight max-w-[130px]">
                      <div className="font-semibold truncate">{displayName}</div>
                      <div className={`text-[10px] truncate ${isPublicStyle ? 'text-[#00BFFF]' : 'text-slate-500'}`}>
                        {displayRole}
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 opacity-70 hidden sm:block" />
                  </button>

                  {accountMenuOpen && (
                    <div className="absolute right-0 mt-2 w-60 rounded-xl bg-white border border-slate-200 shadow-2xl text-slate-900 py-2 z-50">
                      <div className="px-4 py-2.5 border-b border-slate-100">
                        <div className="text-sm font-bold text-slate-900 truncate">{displayName}</div>
                        <div className="text-xs text-slate-500 truncate">{displayEmail}</div>
                        <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="w-3 h-3" />
                          <span>{displayRole}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          onOpenDashboard?.('dashboard');
                        }}
                        className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                      >
                        <LayoutDashboard className="w-4 h-4 text-emerald-700" />
                        <span>Dashboard</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          setShowAccountModal(true);
                        }}
                        className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                      >
                        <User className="w-4 h-4 text-sky-600" />
                        <span>Profile &amp; Account Settings</span>
                      </button>
                      {user?.isPlatformOwner && (
                        <button
                          type="button"
                          onClick={() => {
                            setAccountMenuOpen(false);
                            onOpenDashboard?.('platform-logins');
                          }}
                          className="w-full px-4 py-2 text-left text-xs font-semibold text-amber-700 hover:bg-amber-50 flex items-center gap-2.5 cursor-pointer"
                        >
                          <ShieldCheck className="w-4 h-4 text-amber-600" />
                          <span>Super Admin Control Center</span>
                        </button>
                      )}
                      {!isPublicStyle && onOpenHomepage && (
                        <button
                          type="button"
                          onClick={() => {
                            setAccountMenuOpen(false);
                            onOpenHomepage();
                          }}
                          className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                        >
                          <Globe className="w-4 h-4 text-amber-600" />
                          <span>Public Website</span>
                        </button>
                      )}
                      <div className="my-1.5 border-t border-slate-100" />
                      <button
                        type="button"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          setShowLogoutConfirm(true);
                        }}
                        className="w-full px-4 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2.5 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Public site keeps quick top-right Logout button; App desktop/laptop keeps Logout cleanly inside top-right User Profile Menu */}
                {isPublicStyle && (
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(true)}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-md border transition-all cursor-pointer whitespace-nowrap bg-red-500/15 hover:bg-red-600 text-red-200 hover:text-white border-red-400/50 hover:border-red-500"
                    title="Sign out securely"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Logout</span>
                  </button>
                )}
              </div>
            )}

            {/* Mobile / Tablet Hamburger Menu Trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className={`lg:hidden inline-flex items-center justify-center min-h-[38px] min-w-[38px] p-2 rounded-md border transition-colors cursor-pointer ${
                isPublicStyle
                  ? 'border-slate-700 text-slate-200 hover:border-[#FFC629] hover:text-white'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Row 2: Dedicated Corporate Domain Navigation Bar (SAFETY · EHS · HSE · SHE · ESG · Sustainability) */}
        <div
          className={`hidden md:block border-t ${
            isPublicStyle
              ? 'border-slate-800/80 bg-[#051025]/95 text-[#C0C7D1]'
              : 'border-slate-100 bg-slate-50/90 text-slate-600'
          }`}
        >
          <div
            className={`${
              isPublicStyle ? 'max-w-[1440px] mx-auto' : 'w-full'
            } px-4 sm:px-6 h-9 flex items-center justify-between gap-4 text-xs`}
          >
            <nav aria-label="EHS Domain Navigation" className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
              {!isPublicStyle &&
                PRIMARY_NAV_ITEMS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleDomainClick(item)}
                    className="px-2 py-1 rounded font-medium hover:text-emerald-700 hover:bg-white transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              {!isPublicStyle && <span className="text-slate-300 mx-1">|</span>}
              {DOMAIN_NAV_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleDomainClick(item)}
                  className={`px-2.5 py-1 rounded font-semibold tracking-wide transition-colors whitespace-nowrap cursor-pointer ${
                    isPublicStyle
                      ? 'hover:text-[#FFC629] hover:bg-white/5'
                      : 'text-slate-800 hover:text-emerald-700 hover:bg-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="hidden xl:flex items-center gap-3 text-[11px] shrink-0">
              {isAuthenticated ? (
                <>
                  <button
                    type="button"
                    onClick={() => onOpenDashboard?.('dashboard')}
                    className={`font-semibold hover:underline cursor-pointer ${
                      isPublicStyle ? 'text-[#39FF14]' : 'text-emerald-700'
                    }`}
                  >
                    Dashboard
                  </button>
                  <span className="opacity-30">•</span>
                  <button
                    type="button"
                    onClick={() => setShowAccountModal(true)}
                    className={`font-semibold hover:underline cursor-pointer ${
                      isPublicStyle ? 'text-[#00BFFF]' : 'text-slate-700'
                    }`}
                  >
                    My Account
                  </button>
                </>
              ) : (
                <span className="text-slate-400">
                  Enterprise EHS AI Platform · Free to Use &amp; Share
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Mobile / Tablet Responsive Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            className={`lg:hidden border-t px-4 py-4 space-y-4 shadow-2xl ${
              isPublicStyle
                ? 'bg-[#040E21] border-[#00BFFF]/25 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Primary Website Links */}
            <div className="grid grid-cols-2 gap-2">
              {PRIMARY_NAV_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleDomainClick(item)}
                  className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    isPublicStyle
                      ? 'bg-[#081A38] text-slate-100 hover:text-[#FFC629]'
                      : 'bg-slate-50 text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Domain Links: SAFETY, EHS, HSE, SHE, ESG, Sustainability */}
            <div>
              <div
                className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${
                  isPublicStyle ? 'text-[#FFC629]' : 'text-slate-500'
                }`}
              >
                EHS &amp; Sustainability Domains
              </div>
              <div className="grid grid-cols-3 gap-2">
                {DOMAIN_NAV_ITEMS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleDomainClick(item)}
                    className={`px-2.5 py-2 rounded-lg text-xs font-bold text-center border transition-colors cursor-pointer ${
                      isPublicStyle
                        ? 'bg-[#06152C] border-[#00BFFF]/30 text-white hover:border-[#FFC629]'
                        : 'bg-white border-slate-200 text-slate-800 hover:border-emerald-600'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Auth / Account Actions in Mobile Drawer */}
            <div className={`pt-3 border-t ${isPublicStyle ? 'border-slate-800' : 'border-slate-200'}`}>
              {!isAuthenticated ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenLogin?.();
                    }}
                    className="min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-white/10 border border-[#00BFFF]/55 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 text-[#00BFFF]" />
                    <span>Login</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenRegister?.();
                    }}
                    className="min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-bold text-[#020817] bg-[#FFC629] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Register</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">{displayName}</div>
                      <div className={`text-xs truncate ${isPublicStyle ? 'text-slate-400' : 'text-slate-500'}`}>
                        {displayRole} · {displayEmail}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenDashboard?.('dashboard');
                      }}
                      className="min-h-[42px] px-3 py-2 rounded-lg text-xs font-bold bg-emerald-700 text-white flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      <span>Dashboard</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setShowAccountModal(true);
                      }}
                      className={`min-h-[42px] px-3 py-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 cursor-pointer ${
                        isPublicStyle
                          ? 'bg-[#06152C] border-slate-700 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>My Account</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setShowLogoutConfirm(true);
                      }}
                      className="min-h-[42px] px-3 py-2 rounded-lg text-xs font-bold bg-red-600 text-white flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* === LOGOUT CONFIRMATION MODAL === */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-slate-900">Confirm Secure Logout</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Signed in as <strong className="text-slate-700">{displayEmail || displayName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Your active ARSHIEL SAFETY session and authentication tokens will be securely cleared, and this logout event will be recorded in the security audit trail.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={loggingOut}
                className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Stay Signed In
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                disabled={loggingOut}
                className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg inline-flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{loggingOut ? 'Signing Out...' : 'Yes, Logout'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === MY ACCOUNT & PROFILE MODAL === */}
      {showAccountModal && isAuthenticated && (
        <div className="fixed inset-0 z-[100] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-400 font-bold text-lg flex items-center justify-center">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="font-display font-bold text-lg text-slate-900">My Account</h3>
                  <div className="text-xs text-slate-500">{displayEmail}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAccountModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-slate-500 font-medium">Assigned Role (RBAC)</div>
                <div className="font-bold text-emerald-700 mt-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{displayRole}</span>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-slate-500 font-medium">Active Organization</div>
                <div className="font-bold text-slate-900 mt-1 truncate">
                  {organization?.name || 'ARSHIEL Workspace'}
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Designation / Title</label>
                <input
                  value={profileDesignation}
                  onChange={(e) => setProfileDesignation(e.target.value)}
                  placeholder="e.g. Safety Officer, EHS Manager, Plant Head"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-700"
                />
              </div>

              {profileSavedMsg && (
                <div className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{profileSavedMsg}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAccountModal(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
                <div className="flex items-center gap-2">
                  {user?.isPlatformOwner && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAccountModal(false);
                        onOpenDashboard?.('settings');
                      }}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      Admin Settings
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg cursor-pointer"
                  >
                    {savingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
