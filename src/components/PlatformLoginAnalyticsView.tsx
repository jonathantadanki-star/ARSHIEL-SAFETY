import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  ChevronDown,
  ChevronRight,
  Code2,
  Database,
  Download,
  FileCode2,
  FileSpreadsheet,
  History,
  Inbox,
  Lock,
  Mail,
  MessageSquare,
  Monitor,
  Phone,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Server,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiDownloadFile, apiFetch } from '../lib/api';
import { exportRowsToCsv, exportRowsToExcel } from '../lib/pdf';

const ASSIGNABLE_ROLES = [
  { slug: 'company-admin', name: 'Company Admin' },
  { slug: 'corporate-ehs-head', name: 'Corporate EHS Head' },
  { slug: 'system-admin', name: 'System Admin' },
  { slug: 'ehs-manager', name: 'Plant EHS Manager' },
  { slug: 'safety-officer', name: 'Safety Officer' },
  { slug: 'department-head', name: 'Department Head' },
  { slug: 'auditor', name: 'Auditor (Read-Only)' },
  { slug: 'supervisor', name: 'Supervisor' },
  { slug: 'contractor', name: 'Contractor' },
  { slug: 'employee', name: 'Employee' },
];

type ControlCenterTab =
  | 'sessions'
  | 'activity'
  | 'audit'
  | 'governance'
  | 'demos'
  | 'infrastructure'
  | 'notifications';

function formatDuration(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return '—';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export function PlatformLoginAnalyticsView() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ControlCenterTab>('sessions');
  const [sessionSubTab, setSessionSubTab] = useState<'users' | 'events'>('users');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Tab 1 & 4 state
  const [summary, setSummary] = useState<any>(null);
  const [usersTable, setUsersTable] = useState<any[]>([]);
  const [recentLogins, setRecentLogins] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  // Tab 2: Activity Monitor state
  const [activityItems, setActivityItems] = useState<any[]>([]);
  const [activityModuleFilter, setActivityModuleFilter] = useState('all');
  const [activityTypeFilter, setActivityTypeFilter] = useState('all');

  // Tab 3: Tamper-Evident Audit History state
  const [auditItems, setAuditItems] = useState<any[]>([]);
  const [auditModuleFilter, setAuditModuleFilter] = useState('all');
  const [auditFrom, setAuditFrom] = useState('');
  const [auditTo, setAuditTo] = useState('');
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

  // Governance busy state
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  // Tab 5: Demo Requests Inbox state
  const [demoItems, setDemoItems] = useState<any[]>([]);
  const [busyDemoId, setBusyDemoId] = useState<string | null>(null);

  // Tab 6: Infrastructure, Quotas & Source Export state
  const [systemOverview, setSystemOverview] = useState<any>(null);
  const [busyQuota, setBusyQuota] = useState(false);
  const [downloadingSource, setDownloadingSource] = useState(false);

  // Tab 7: Notification Engine & Escalation Rules state
  const [notifLogs, setNotifLogs] = useState<any[]>([]);
  const [notifChannelFilter, setNotifChannelFilter] = useState('all');
  const [notifStatusFilter, setNotifStatusFilter] = useState('all');
  const [escalationRules, setEscalationRules] = useState<any[]>([]);
  const [busyNotifAction, setBusyNotifAction] = useState<string | null>(null);
  const [dispatchForm, setDispatchForm] = useState({
    eventCategory: 'emergency',
    severity: 'critical',
    title: '',
    message: '',
    channels: ['in_app', 'email', 'push', 'discord'] as string[],
  });
  const [newRuleForm, setNewRuleForm] = useState({
    ruleName: '',
    eventCategory: 'overdue_task',
    triggerThresholdHours: 24,
    escalateToRole: 'Plant EHS Manager',
    escalateToEmail: 'jonathan.tadanki@gmail.com',
    channels: ['in_app', 'email'] as string[],
  });

  const loadSessionsAndUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/platform-owner/login-analytics');
      setSummary(res.summary);
      setUsersTable(res.usersTable || []);
      setRecentLogins(res.recentLogins || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load Super Admin analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadActivityLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set('search', search.trim());
      if (activityModuleFilter !== 'all') qs.set('module', activityModuleFilter);
      if (activityTypeFilter !== 'all') qs.set('activityType', activityTypeFilter);
      const res = await apiFetch(`/api/platform-owner/activity-logs?${qs.toString()}`);
      setActivityItems(res.items || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load user activity logs.');
    } finally {
      setLoading(false);
    }
  }, [search, activityModuleFilter, activityTypeFilter]);

  const loadAuditHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set('search', search.trim());
      if (auditModuleFilter !== 'all') qs.set('module', auditModuleFilter);
      if (auditFrom) qs.set('from', auditFrom);
      if (auditTo) qs.set('to', auditTo);
      const res = await apiFetch(`/api/platform-owner/audit-history?${qs.toString()}`);
      setAuditItems(res.items || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load tamper-evident audit history.');
    } finally {
      setLoading(false);
    }
  }, [search, auditModuleFilter, auditFrom, auditTo]);

  const loadDemoRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/platform-owner/demo-requests');
      setDemoItems(res.items || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load demo requests inbox.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSystemOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/platform-owner/system-overview');
      setSystemOverview(res);
    } catch (err: any) {
      setError(err?.message || 'Unable to load infrastructure and quota metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadNotificationEngine = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (notifChannelFilter !== 'all') qs.set('channel', notifChannelFilter);
      if (notifStatusFilter !== 'all') qs.set('status', notifStatusFilter);
      const [logsRes, rulesRes] = await Promise.all([
        apiFetch(`/api/platform-owner/notification-logs?${qs.toString()}`),
        apiFetch('/api/platform-owner/escalation-rules'),
      ]);
      setNotifLogs(logsRes.items || []);
      setEscalationRules(rulesRes.items || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load notification engine logs & rules.');
    } finally {
      setLoading(false);
    }
  }, [notifChannelFilter, notifStatusFilter]);

  useEffect(() => {
    if (!user?.isPlatformOwner) return;
    if (activeTab === 'sessions' || activeTab === 'governance') {
      loadSessionsAndUsers();
    } else if (activeTab === 'activity') {
      loadActivityLogs();
    } else if (activeTab === 'audit') {
      loadAuditHistory();
    } else if (activeTab === 'demos') {
      loadDemoRequests();
    } else if (activeTab === 'infrastructure') {
      loadSystemOverview();
    } else if (activeTab === 'notifications') {
      loadNotificationEngine();
    }
  }, [
    user?.isPlatformOwner,
    activeTab,
    loadSessionsAndUsers,
    loadActivityLogs,
    loadAuditHistory,
    loadDemoRequests,
    loadSystemOverview,
    loadNotificationEngine,
  ]);

  const handleDownloadSourceArchive = async () => {
    setDownloadingSource(true);
    setError(null);
    try {
      await apiDownloadFile(
        '/api/platform-owner/source-archive',
        `arshiel-safety-source-${new Date().toISOString().slice(0, 10)}.tar.gz`
      );
      setNotice('Clean ARSHIEL SAFETY source code archive (.tar.gz, zero secrets) downloaded.');
    } catch (err: any) {
      setError(err?.message || 'Failed to download source code archive.');
    } finally {
      setDownloadingSource(false);
    }
  };

  const handleDownloadRlsSql = async () => {
    setError(null);
    try {
      await apiDownloadFile('/api/platform-owner/rls-policy', 'arshiel-rls-tenant-isolation.sql');
      setNotice('PostgreSQL / Supabase RLS tenant isolation SQL script downloaded.');
    } catch (err: any) {
      setError(err?.message || 'Failed to download RLS SQL file.');
    }
  };

  const handleDownloadJsonBackup = async () => {
    setError(null);
    try {
      const data = await apiFetch('/api/backups/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `arshiel-safety-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setNotice('Full workspace JSON backup exported successfully.');
    } catch (err: any) {
      setError(err?.message || 'Failed to export JSON backup.');
    }
  };

  const handleUpdateTierPreset = async (tierPreset: 'starter' | 'growth' | 'enterprise') => {
    setBusyQuota(true);
    setError(null);
    try {
      await apiFetch('/api/platform-owner/quotas', {
        method: 'PATCH',
        body: JSON.stringify({ tierPreset }),
      });
      setNotice(`Platform quota tier updated manually to "${tierPreset}". Auto paid upgrade remains off unless explicitly enabled.`);
      await loadSystemOverview();
    } catch (err: any) {
      setError(err?.message || 'Failed to update quota tier.');
    } finally {
      setBusyQuota(false);
    }
  };

  const handleToggleAutoPaidUpgrade = async () => {
    if (!systemOverview?.quotas) return;
    setBusyQuota(true);
    setError(null);
    try {
      const nextVal = !systemOverview.quotas.autoPaidUpgradeEnabled;
      await apiFetch('/api/platform-owner/quotas', {
        method: 'PATCH',
        body: JSON.stringify({ autoPaidUpgradeEnabled: nextVal }),
      });
      setNotice(`Automatic paid upgrades ${nextVal ? 'ENABLED' : 'LOCKED OFF (Zero-Cost Guardrail Active)'}.`);
      await loadSystemOverview();
    } catch (err: any) {
      setError(err?.message || 'Failed to update cost guardrail.');
    } finally {
      setBusyQuota(false);
    }
  };

  const handleRunAutomatedScan = async () => {
    setBusyNotifAction('scan');
    setError(null);
    try {
      const res = await apiFetch('/api/platform-owner/notifications/run-checks', { method: 'POST' });
      const f = res.findings || {};
      setNotice(
        `Automated EHS scan completed: ${f.overdueCapas ?? 0} overdue CAPAs, ${f.expiringTrainings ?? 0} expiring trainings, ${f.expiringCertificates ?? 0} equipment certs due, ${f.openCriticalIncidents ?? 0} critical incidents.`
      );
      await loadNotificationEngine();
    } catch (err: any) {
      setError(err?.message || 'Automated EHS alert scan failed.');
    } finally {
      setBusyNotifAction(null);
    }
  };

  const handleRetryLog = async (logId: string) => {
    setBusyNotifAction(logId);
    setError(null);
    try {
      const res = await apiFetch(`/api/platform-owner/notifications/retry/${logId}`, { method: 'POST' });
      setNotice(`Retry completed with status "${res.log?.status || 'updated'}".`);
      await loadNotificationEngine();
    } catch (err: any) {
      setError(err?.message || 'Retry request failed.');
    } finally {
      setBusyNotifAction(null);
    }
  };

  const handleRetryAllFailed = async () => {
    setBusyNotifAction('retry-all');
    setError(null);
    try {
      const res = await apiFetch('/api/platform-owner/notifications/retry-all-failed', { method: 'POST' });
      setNotice(`Retried ${res.retriedCount ?? 0} failed delivery log(s).`);
      await loadNotificationEngine();
    } catch (err: any) {
      setError(err?.message || 'Retry all failed deliveries error.');
    } finally {
      setBusyNotifAction(null);
    }
  };

  const handleDispatchAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchForm.title.trim() || !dispatchForm.message.trim()) return;
    setBusyNotifAction('dispatch');
    setError(null);
    try {
      const res = await apiFetch('/api/platform-owner/notifications/dispatch', {
        method: 'POST',
        body: JSON.stringify(dispatchForm),
      });
      const logs = res.deliveryLogs || [];
      const delivered = logs.filter((l: any) => l.status === 'delivered').length;
      const unconf = logs.filter((l: any) => l.status === 'unconfigured').length;
      setNotice(
        `Alert dispatched across ${logs.length} channel(s): ${delivered} delivered, ${unconf} unconfigured (real status logged).`
      );
      setDispatchForm((prev) => ({ ...prev, title: '', message: '' }));
      await loadNotificationEngine();
    } catch (err: any) {
      setError(err?.message || 'Failed to dispatch alert.');
    } finally {
      setBusyNotifAction(null);
    }
  };

  const handleToggleRule = async (rule: any) => {
    setBusyNotifAction(rule.id);
    setError(null);
    try {
      await apiFetch(`/api/platform-owner/escalation-rules/${rule.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      await loadNotificationEngine();
    } catch (err: any) {
      setError(err?.message || 'Failed to update escalation rule.');
    } finally {
      setBusyNotifAction(null);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    setBusyNotifAction(ruleId);
    setError(null);
    try {
      await apiFetch(`/api/platform-owner/escalation-rules/${ruleId}`, { method: 'DELETE' });
      setEscalationRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete escalation rule.');
    } finally {
      setBusyNotifAction(null);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleForm.ruleName.trim()) return;
    setBusyNotifAction('create-rule');
    setError(null);
    try {
      await apiFetch('/api/platform-owner/escalation-rules', {
        method: 'POST',
        body: JSON.stringify(newRuleForm),
      });
      setNewRuleForm({
        ruleName: '',
        eventCategory: 'overdue_task',
        triggerThresholdHours: 24,
        escalateToRole: 'Plant EHS Manager',
        escalateToEmail: 'jonathan.tadanki@gmail.com',
        channels: ['in_app', 'email'],
      });
      setNotice('Escalation rule added.');
      await loadNotificationEngine();
    } catch (err: any) {
      setError(err?.message || 'Failed to create escalation rule.');
    } finally {
      setBusyNotifAction(null);
    }
  };

  const handleUpdateDemoStatus = async (demoId: string, status: string) => {
    setBusyDemoId(demoId);
    setError(null);
    try {
      await apiFetch(`/api/platform-owner/demo-requests/${demoId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setDemoItems((prev) => prev.map((d) => (d.id === demoId ? { ...d, status } : d)));
      setNotice(`Demo request status updated to "${status}".`);
    } catch (err: any) {
      setError(err?.message || 'Unable to update demo request status.');
    } finally {
      setBusyDemoId(null);
    }
  };

  const handleToggleUserStatus = async (targetUser: any) => {
    setBusyUserId(targetUser.id);
    setError(null);
    try {
      const nextStatus = !targetUser.isActive;
      await apiFetch(`/api/platform-owner/users/${targetUser.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          isActive: nextStatus,
          reason: nextStatus ? 'Reactivated in Super Admin Control Center' : 'Deactivated in Super Admin Control Center',
        }),
      });
      setNotice(`Account ${targetUser.email} ${nextStatus ? 'activated' : 'deactivated'} and recorded in audit trail.`);
      await loadSessionsAndUsers();
    } catch (err: any) {
      setError(err?.message || 'Unable to change user status.');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleAssignUserRole = async (targetUser: any, newRoleSlug: string) => {
    setBusyUserId(targetUser.id);
    setError(null);
    try {
      await apiFetch(`/api/platform-owner/users/${targetUser.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({
          roleSlug: newRoleSlug,
          reason: `Assigned canonical role "${newRoleSlug}" via Super Admin Control Center`,
        }),
      });
      setNotice(`Updated role for ${targetUser.email} → "${newRoleSlug}". Audit diff recorded.`);
      await loadSessionsAndUsers();
    } catch (err: any) {
      setError(err?.message || 'Role assignment blocked by security policy.');
    } finally {
      setBusyUserId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return usersTable;
    return usersTable.filter(
      (u) =>
        (u.fullName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.organizationName || '').toLowerCase().includes(q) ||
        (u.assignedRole || '').toLowerCase().includes(q)
    );
  }, [usersTable, search]);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recentLogins;
    return recentLogins.filter(
      (ev) =>
        (ev.fullName || '').toLowerCase().includes(q) ||
        (ev.email || '').toLowerCase().includes(q) ||
        (ev.organizationName || '').toLowerCase().includes(q) ||
        (ev.eventType || '').toLowerCase().includes(q) ||
        (ev.browser || '').toLowerCase().includes(q)
    );
  }, [recentLogins, search]);

  if (!user?.isPlatformOwner) {
    return (
      <div className="bg-white border border-red-200 rounded-md p-8 text-center space-y-2">
        <Lock className="w-8 h-8 text-red-600 mx-auto" />
        <h2 className="font-display text-lg font-bold text-slate-900">Restricted Access — Sole Super Admin Only</h2>
        <p className="text-xs text-slate-600">
          The Super Admin Control Center is exclusively accessible to Platform Owner Jonathan Thadanki.
        </p>
      </div>
    );
  }

  const activeRatePct =
    summary && summary.totalRegisteredUsers > 0
      ? Math.round((summary.uniqueUsersLoggedIn / summary.totalRegisteredUsers) * 100)
      : 0;
  const maxUserLogins = Math.max(...usersTable.map((u) => u.totalLogins || 0), 1);

  const handleRefresh = () => {
    if (activeTab === 'sessions' || activeTab === 'governance') loadSessionsAndUsers();
    else if (activeTab === 'activity') loadActivityLogs();
    else if (activeTab === 'audit') loadAuditHistory();
    else if (activeTab === 'demos') loadDemoRequests();
    else if (activeTab === 'infrastructure') loadSystemOverview();
    else loadNotificationEngine();
  };

  return (
    <div className="space-y-5">
      {/* Sole Super Admin Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Sole Super Admin Only · Exclusive to Jonathan Thadanki (jonathan.tadanki@gmail.com)</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            Super Admin Control Center
          </h1>
          <p className="text-sm text-slate-500">
            Centralized login telemetry, RBAC governance, infrastructure quotas, multi-channel notifications, and clean source code export.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadSourceArchive}
            disabled={downloadingSource}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>{downloadingSource ? 'Packaging...' : 'Download Source (.tar.gz)'}</span>
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'demos') {
                exportRowsToCsv(
                  demoItems.map((d) => ({
                    SubmittedAt: new Date(d.createdAt).toLocaleString(),
                    FullName: d.fullName,
                    WorkEmail: d.workEmail,
                    Company: d.companyName,
                    Industry: d.industry || '',
                    Phone: d.phone || '',
                    Requirements: d.message || '',
                    Status: d.status || 'New',
                  })),
                  'ARSHIEL-Demo-Requests'
                );
              } else if (activeTab === 'audit') {
                exportRowsToCsv(
                  auditItems.map((a) => ({
                    Timestamp: new Date(a.createdAt).toLocaleString(),
                    User: a.userName || '',
                    Email: a.userEmail || '',
                    Role: a.userRole || '',
                    Module: a.moduleName || a.entityType,
                    Record: a.recordNumber || a.entityId || '',
                    Action: a.action,
                    Status: a.approvalStatus || '',
                    Reason: a.reasonForChange || '',
                    IP: a.ipAddress || '',
                  })),
                  'ARSHIEL-Audit-History'
                );
              } else {
                exportRowsToCsv(
                  usersTable.map((u) => ({
                    Name: u.fullName,
                    Email: u.email,
                    Role: u.assignedRole,
                    Status: u.isActive ? 'Active' : 'Deactivated',
                    Workspace: u.organizationName,
                    TotalLogins: u.totalLogins,
                    Browser: u.lastBrowser,
                    Device: u.lastDeviceType,
                    LastLogin: u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '',
                  })),
                  'ARSHIEL-SuperAdmin-Users'
                );
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'demos') {
                exportRowsToExcel(
                  demoItems.map((d) => ({
                    SubmittedAt: new Date(d.createdAt).toLocaleString(),
                    FullName: d.fullName,
                    WorkEmail: d.workEmail,
                    Company: d.companyName,
                    Industry: d.industry || '',
                    Phone: d.phone || '',
                    Requirements: d.message || '',
                    Status: d.status || 'New',
                  })),
                  'ARSHIEL-Demo-Requests'
                );
              } else if (activeTab === 'audit') {
                exportRowsToExcel(
                  auditItems.map((a) => ({
                    Timestamp: new Date(a.createdAt).toLocaleString(),
                    User: a.userName || '',
                    Role: a.userRole || '',
                    Module: a.moduleName || a.entityType,
                    Record: a.recordNumber || a.entityId || '',
                    Action: a.action,
                    PreviousValue: JSON.stringify(a.previousValue || {}),
                    UpdatedValue: JSON.stringify(a.updatedValue || {}),
                    Reason: a.reasonForChange || '',
                    IP: a.ipAddress || '',
                  })),
                  'ARSHIEL-Audit-History'
                );
              } else {
                exportRowsToExcel(
                  usersTable.map((u) => ({
                    Name: u.fullName,
                    Email: u.email,
                    Role: u.assignedRole,
                    Status: u.isActive ? 'Active' : 'Deactivated',
                    Workspace: u.organizationName,
                    TotalLogins: u.totalLogins,
                    LastLogin: u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '',
                  })),
                  'ARSHIEL-SuperAdmin-Users'
                );
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* 7 Dedicated Control Center Navigation Tabs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
        {(
          [
            { key: 'sessions', label: 'A. Login & Sessions', sub: 'Logins, duration & devices', icon: Users },
            { key: 'activity', label: 'B. Activity Monitor', sub: 'Views, creates & approvals', icon: Activity },
            { key: 'audit', label: 'C. Audit History', sub: 'Append-only JSON diffs', icon: History },
            { key: 'governance', label: 'D. User & RBAC', sub: 'Assign 8+ canonical roles', icon: UserCog },
            { key: 'demos', label: 'E. Demo Leads', sub: 'Email, SMS & WA follow-up', icon: Inbox },
            { key: 'infrastructure', label: 'F. Quotas & Source', sub: 'DB, storage, RLS & source', icon: Server },
            { key: 'notifications', label: 'G. Alerts Engine', sub: 'Logs, retries & escalation', icon: Bell },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`text-left p-3 rounded-md border transition-colors cursor-pointer ${
                active
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-display font-bold text-xs">{tab.label}</span>
                <Icon className={`w-4 h-4 ${active ? 'text-emerald-400' : 'text-emerald-700'}`} />
              </div>
              <div className={`text-[11px] ${active ? 'text-slate-300' : 'text-slate-500'}`}>{tab.sub}</div>
            </button>
          );
        })}
      </div>

      {notice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded px-4 py-2.5 flex items-center justify-between">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-900 text-xs rounded px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB A: LOGIN & SESSION ACTIVITY                                      */}
      {/* ==================================================================== */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-white border border-slate-200 border-t-2 border-t-emerald-700 rounded-md p-3.5">
              <div className="text-[11px] font-semibold uppercase text-slate-500">Registered Users</div>
              <div className="mt-1 text-2xl font-display font-bold text-slate-900 tabular-nums">
                {summary?.totalRegisteredUsers ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {summary?.uniqueUsersLoggedIn ?? 0} signed in ({activeRatePct}%)
              </div>
            </div>
            <div className="bg-white border border-slate-200 border-t-2 border-t-slate-800 rounded-md p-3.5">
              <div className="text-[11px] font-semibold uppercase text-slate-500">Total Login Sessions</div>
              <div className="mt-1 text-2xl font-display font-bold text-slate-900 tabular-nums">
                {summary?.totalLoginSessions ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Across {summary?.totalOrganizations ?? 0} workspace(s)
              </div>
            </div>
            <div className="bg-white border border-slate-200 border-t-2 border-t-blue-600 rounded-md p-3.5">
              <div className="text-[11px] font-semibold uppercase text-slate-500">Logins Today / 7d</div>
              <div className="mt-1 text-2xl font-display font-bold text-slate-900 tabular-nums">
                {summary?.loginsToday ?? 0} <span className="text-sm text-slate-400">/ {summary?.loginsLast7Days ?? 0}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Active daily &amp; weekly traffic</div>
            </div>
            <div className="bg-white border border-slate-200 border-t-2 border-t-red-600 rounded-md p-3.5">
              <div className="text-[11px] font-semibold uppercase text-slate-500">Logouts / Failed</div>
              <div className="mt-1 text-2xl font-display font-bold text-slate-900 tabular-nums">
                {summary?.logoutEvents ?? 0} <span className="text-sm text-red-600">/ {summary?.failedLoginAttempts ?? 0}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Tracked sign-outs &amp; failures</div>
            </div>
            <div className="bg-white border border-slate-200 border-t-2 border-t-amber-600 rounded-md p-3.5">
              <div className="text-[11px] font-semibold uppercase text-slate-500">Devices</div>
              <div className="mt-1 space-y-0.5 text-xs tabular-nums">
                {(summary?.deviceBreakdown || []).map((d: any) => (
                  <div key={d.device} className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-slate-700">
                      {d.device === 'Desktop' ? <Monitor className="w-3 h-3" /> : <Smartphone className="w-3 h-3 text-emerald-700" />}
                      {d.device}
                    </span>
                    <span className="font-bold text-slate-900">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-md p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSessionSubTab('users')}
                className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer ${
                  sessionSubTab === 'users' ? 'bg-slate-900 text-white' : 'bg-slate-50 border border-slate-200 text-slate-700'
                }`}
              >
                Users Summary ({usersTable.length})
              </button>
              <button
                type="button"
                onClick={() => setSessionSubTab('events')}
                className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer ${
                  sessionSubTab === 'events' ? 'bg-slate-900 text-white' : 'bg-slate-50 border border-slate-200 text-slate-700'
                }`}
              >
                Chronological Session Events ({recentLogins.length})
              </button>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search user, email, role, browser..."
                className="w-full border border-slate-300 rounded pl-8 pr-3 py-1.5 text-xs"
              />
            </div>
          </div>

          {sessionSubTab === 'users' ? (
            <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                    <tr>
                      <th className="px-4 py-2.5">#</th>
                      <th className="px-3 py-2.5">User &amp; Role</th>
                      <th className="px-3 py-2.5">Email</th>
                      <th className="px-3 py-2.5">Workspace</th>
                      <th className="px-3 py-2.5">Logins</th>
                      <th className="px-3 py-2.5">Browser / Device</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Last Login</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 tabular-nums">
                    {filteredUsers.map((u, idx) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span>{u.fullName}</span>
                            {u.isPlatformOwner && (
                              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-700 text-white">
                                SOLE SUPER ADMIN
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">{u.assignedRole}</div>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-slate-700">{u.email}</td>
                        <td className="px-3 py-2.5 text-slate-700">{u.organizationName}</td>
                        <td className="px-3 py-2.5 min-w-[120px]">
                          <div className="font-bold text-slate-900 mb-0.5">{u.totalLogins}</div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-700"
                              style={{ width: `${Math.max(8, Math.round((u.totalLogins / maxUserLogins) * 100))}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">{u.lastBrowser} · {u.lastDeviceType}</td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              u.isActive ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {u.isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                    <tr>
                      <th className="px-4 py-2.5">Timestamp</th>
                      <th className="px-3 py-2.5">Event</th>
                      <th className="px-3 py-2.5">User &amp; Email</th>
                      <th className="px-3 py-2.5">Duration</th>
                      <th className="px-3 py-2.5">Browser / Device</th>
                      <th className="px-3 py-2.5">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 tabular-nums">
                    {filteredEvents.map((ev) => (
                      <tr key={ev.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 whitespace-nowrap text-slate-700">
                          {new Date(ev.loggedInAt).toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              ev.eventType === 'logout'
                                ? 'bg-slate-100 text-slate-700'
                                : ev.eventType === 'failed_login'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {ev.eventType || 'login'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-slate-900">{ev.fullName}</div>
                          <div className="font-mono text-[11px] text-slate-500">{ev.email}</div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-700">{formatDuration(ev.sessionDurationSeconds)}</td>
                        <td className="px-3 py-2.5 text-slate-600">{ev.browser} · {ev.deviceType}</td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">{ev.ipAddress}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB B: USER ACTIVITY MONITOR                                         */}
      {/* ==================================================================== */}
      {activeTab === 'activity' && (
        <div className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-md p-3 flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search user, module, record ID, summary..."
                className="w-full border border-slate-300 rounded pl-8 pr-3 py-1.5 text-xs"
              />
            </div>
            <select
              value={activityModuleFilter}
              onChange={(e) => setActivityModuleFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
            >
              <option value="all">All Modules</option>
              <option value="dashboard">Dashboard</option>
              <option value="permit">Permit to Work</option>
              <option value="incident">Incidents</option>
              <option value="module">Module Builder</option>
              <option value="audit">Audits</option>
            </select>
            <select
              value={activityTypeFilter}
              onChange={(e) => setActivityTypeFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
            >
              <option value="all">All Activity Types</option>
              <option value="module_access">Module Access</option>
              <option value="dashboard_view">Dashboard View</option>
              <option value="record_create">Record Create</option>
              <option value="record_submit">Record Submit</option>
              <option value="record_edit">Record Edit</option>
              <option value="record_approve">Record Approve</option>
              <option value="record_reject">Record Reject</option>
              <option value="record_archive">Record Archive</option>
            </select>
            <button
              type="button"
              onClick={loadActivityLogs}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer"
            >
              Apply
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Timestamp</th>
                    <th className="px-3 py-2.5">User &amp; Role</th>
                    <th className="px-3 py-2.5">Module</th>
                    <th className="px-3 py-2.5">Activity Type</th>
                    <th className="px-3 py-2.5">Record / Summary</th>
                    <th className="px-3 py-2.5">Device / IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {activityItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-900">{item.userName || item.userEmail}</div>
                        <div className="text-[11px] text-slate-500">{item.userRole || 'User'}</div>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-800">{item.moduleName}</td>
                      <td className="px-3 py-2.5">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold uppercase">
                          {item.activityType}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-700 max-w-md">
                        {item.recordId && <span className="font-mono font-bold mr-1.5">{item.recordId}</span>}
                        <span>{item.summary || '—'}</span>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-slate-500 font-mono">
                        {item.deviceType || 'Desktop'} · {item.ipAddress || '—'}
                      </td>
                    </tr>
                  ))}
                  {!loading && activityItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        No matching user activity entries yet. Navigate modules or approve records to populate live activity.
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
      {/* TAB C: TAMPER-EVIDENT AUDIT & CHANGE HISTORY                         */}
      {/* ==================================================================== */}
      {activeTab === 'audit' && (
        <div className="space-y-3">
          <div className="bg-slate-900 text-white rounded-md px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Tamper-Evident Append-Only Ledger:</strong> Audit rows cannot be edited or deleted by any account (enforced with HTTP 403 at backend API).
              </span>
            </div>
            <span className="text-slate-300 tabular-nums">{auditItems.length} record(s) loaded</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-md p-3 flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search user, record #, action, reason..."
                className="w-full border border-slate-300 rounded pl-8 pr-3 py-1.5 text-xs"
              />
            </div>
            <select
              value={auditModuleFilter}
              onChange={(e) => setAuditModuleFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
            >
              <option value="all">All Modules</option>
              <option value="permit">Permit to Work</option>
              <option value="security">Security / RBAC</option>
              <option value="user">User Governance</option>
              <option value="authentication">Authentication</option>
              <option value="incident">Incidents</option>
            </select>
            <input
              type="date"
              value={auditFrom}
              onChange={(e) => setAuditFrom(e.target.value)}
              className="text-xs border border-slate-300 rounded px-2 py-1.5"
            />
            <input
              type="date"
              value={auditTo}
              onChange={(e) => setAuditTo(e.target.value)}
              className="text-xs border border-slate-300 rounded px-2 py-1.5"
            />
            <button
              type="button"
              onClick={loadAuditHistory}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer"
            >
              Filter
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                  <tr>
                    <th className="px-3 py-2.5 w-8">Diff</th>
                    <th className="px-3 py-2.5">Timestamp</th>
                    <th className="px-3 py-2.5">Actor &amp; Role</th>
                    <th className="px-3 py-2.5">Module / Record</th>
                    <th className="px-3 py-2.5">Action</th>
                    <th className="px-3 py-2.5">Reason / Status</th>
                    <th className="px-3 py-2.5">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {auditItems.map((row) => {
                    const isOpen = expandedAuditId === row.id;
                    const hasDiff =
                      (row.previousValue && Object.keys(row.previousValue).length > 0) ||
                      (row.updatedValue && Object.keys(row.updatedValue).length > 0);
                    return (
                      <React.Fragment key={row.id}>
                        <tr
                          onClick={() => setExpandedAuditId(isOpen ? null : row.id)}
                          className="hover:bg-slate-50 cursor-pointer"
                        >
                          <td className="px-3 py-2.5 text-slate-400">
                            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">
                            {new Date(row.createdAt).toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-slate-900">{row.userName || row.userEmail || 'System'}</div>
                            <div className="text-[11px] text-slate-500">{row.userRole || '—'}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-slate-800">{row.moduleName || row.entityType}</div>
                            <div className="font-mono text-[11px] text-slate-500">{row.recordNumber || row.entityId || '—'}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                String(row.action).includes('BLOCKED') || String(row.action).includes('REJECT')
                                  ? 'bg-red-100 text-red-800'
                                  : String(row.action).includes('APPROVE')
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {row.action}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 max-w-xs">
                            <div className="truncate text-slate-700">{row.reasonForChange || '—'}</div>
                            {row.approvalStatus && (
                              <span className="text-[10px] font-semibold text-emerald-700">{row.approvalStatus}</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">{row.ipAddress || '—'}</td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-slate-50/90">
                            <td colSpan={7} className="px-6 py-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                                <div className="bg-white border border-red-200 rounded p-2.5">
                                  <div className="font-bold text-red-800 uppercase mb-1">Before (Previous Value)</div>
                                  <pre className="font-mono text-slate-700 whitespace-pre-wrap break-all overflow-x-auto">
                                    {hasDiff && row.previousValue
                                      ? JSON.stringify(row.previousValue, null, 2)
                                      : 'N/A (New Record / Event)'}
                                  </pre>
                                </div>
                                <div className="bg-white border border-emerald-200 rounded p-2.5">
                                  <div className="font-bold text-emerald-800 uppercase mb-1">After (Updated Value / Details)</div>
                                  <pre className="font-mono text-slate-700 whitespace-pre-wrap break-all overflow-x-auto">
                                    {JSON.stringify(row.updatedValue || row.details || {}, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {!loading && auditItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No audit entries matching the current filter.
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
      {/* TAB D: USER & RBAC GOVERNANCE (ROLES 2–9 · SOLE SUPER ADMIN LOCK)    */}
      {/* ==================================================================== */}
      {activeTab === 'governance' && (
        <div className="space-y-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-md px-4 py-3 text-xs text-emerald-950 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <strong>Sole Super Admin Governance Policy:</strong> Only <strong>Jonathan Thadanki (jonathan.tadanki@gmail.com)</strong> holds the Super Admin role. All other accounts start as least-privilege <strong>Employee / Worker</strong> and can be assigned any of canonical roles 2–9 below. Duplicate Super Admin assignment is permanently blocked at the database &amp; API layers.
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-2.5">User</th>
                    <th className="px-3 py-2.5">Email</th>
                    <th className="px-3 py-2.5">Workspace</th>
                    <th className="px-3 py-2.5">Assigned Canonical Role</th>
                    <th className="px-3 py-2.5">Account Status</th>
                    <th className="px-3 py-2.5 text-right">Governance Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className={u.isPlatformOwner ? 'bg-emerald-50/40' : 'hover:bg-slate-50'}>
                      <td className="px-4 py-3 font-semibold text-slate-900">{u.fullName}</td>
                      <td className="px-3 py-3 font-mono text-[11px] text-slate-700">{u.email}</td>
                      <td className="px-3 py-3 text-slate-600">{u.organizationName}</td>
                      <td className="px-3 py-3">
                        {u.isPlatformOwner ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-700 text-white text-[11px] font-bold">
                            <Lock className="w-3 h-3" />
                            <span>Sole Super Admin — Protected</span>
                          </span>
                        ) : (
                          <select
                            disabled={busyUserId === u.id}
                            value={u.assignedRoleSlug || 'employee'}
                            onChange={(e) => handleAssignUserRole(u, e.target.value)}
                            className="border border-slate-300 rounded px-2.5 py-1 text-xs bg-white font-medium"
                          >
                            {ASSIGNABLE_ROLES.map((r) => (
                              <option key={r.slug} value={r.slug}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {u.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {u.isPlatformOwner ? (
                          <span className="text-[11px] text-slate-400 italic">Protected Owner Account</span>
                        ) : (
                          <button
                            type="button"
                            disabled={busyUserId === u.id}
                            onClick={() => handleToggleUserStatus(u)}
                            className={`px-3 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                              u.isActive
                                ? 'border border-red-200 text-red-700 hover:bg-red-50'
                                : 'bg-emerald-700 text-white hover:bg-emerald-800'
                            }`}
                          >
                            {busyUserId === u.id
                              ? 'Saving...'
                              : u.isActive
                                ? 'Deactivate Account'
                                : 'Reactivate Account'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB E: ENTERPRISE DEMO REQUESTS INBOX (EMAIL & SMS FOLLOW-UP)        */}
      {/* ==================================================================== */}
      {activeTab === 'demos' && (
        <div className="space-y-3">
          <div className="bg-slate-900 text-white rounded-md px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Demo Requests Inbox (Super Admin Only):</strong> Every public homepage demo request is stored here, pushed to your Notifications bell, and routed to <strong>jonathan.tadanki@gmail.com</strong> &amp; <strong>+91 9133 661 933</strong>.
              </span>
            </div>
            <span className="text-slate-300 tabular-nums">{demoItems.length} request(s)</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Submitted</th>
                    <th className="px-3 py-2.5">Contact &amp; Company</th>
                    <th className="px-3 py-2.5">Industry</th>
                    <th className="px-3 py-2.5">Requirements / Message</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5 text-right">Direct Reply</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {demoItems.map((d) => {
                    const cleanPhone = String(d.phone || '').replace(/[^\d+]/g, '');
                    const waPhone = cleanPhone.replace(/^\+/, '');
                    const replySubj = encodeURIComponent(`ARSHIEL SAFETY Demo Request — ${d.companyName}`);
                    const replyBody = encodeURIComponent(
                      `Hello ${d.fullName},\n\nThank you for requesting an ARSHIEL SAFETY Enterprise EHS demo for ${d.companyName}. Let us schedule a convenient time to walk through your requirements.\n\nBest regards,\nJonathan Thadanki\nARSHIEL SAFETY · +91 9133 661 933`
                    );
                    return (
                      <tr key={d.id} className="hover:bg-slate-50 align-top">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600 tabular-nums">
                          {new Date(d.createdAt).toLocaleString()}
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-semibold text-slate-900">{d.fullName}</div>
                          <div className="font-medium text-emerald-800">{d.companyName}</div>
                          <div className="font-mono text-[11px] text-slate-500">{d.workEmail}</div>
                          {d.phone && <div className="font-mono text-[11px] text-slate-600">{d.phone}</div>}
                        </td>
                        <td className="px-3 py-3 text-slate-700">{d.industry || '—'}</td>
                        <td className="px-3 py-3 text-slate-700 max-w-sm whitespace-pre-wrap">
                          {d.message || <span className="text-slate-400 italic">No extra notes</span>}
                        </td>
                        <td className="px-3 py-3">
                          <select
                            disabled={busyDemoId === d.id}
                            value={d.status || 'New'}
                            onChange={(e) => handleUpdateDemoStatus(d.id, e.target.value)}
                            className="border border-slate-300 rounded px-2 py-1 text-xs bg-white font-semibold"
                          >
                            <option value="New">New</option>
                            <option value="Contacted">Contacted</option>
                            <option value="Scheduled">Scheduled</option>
                            <option value="Closed">Closed</option>
                          </select>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="inline-flex flex-wrap justify-end gap-1.5">
                            <a
                              href={`mailto:${d.workEmail}?subject=${replySubj}&body=${replyBody}`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-900 text-white hover:bg-slate-800 text-[11px] font-semibold"
                            >
                              <Mail className="w-3 h-3" />
                              <span>Email</span>
                            </a>
                            {cleanPhone && (
                              <>
                                <a
                                  href={`sms:${cleanPhone}?body=${replyBody}`}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-[11px] font-semibold"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  <span>SMS</span>
                                </a>
                                <a
                                  href={`tel:${cleanPhone}`}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-[11px] font-semibold"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>Call</span>
                                </a>
                                {waPhone && (
                                  <a
                                    href={`https://wa.me/${waPhone}?text=${replyBody}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-700 text-white hover:bg-emerald-800 text-[11px] font-semibold"
                                  >
                                    <span>WA</span>
                                  </a>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && demoItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        No enterprise demo requests submitted yet.
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
      {/* TAB F: INFRASTRUCTURE, ZERO-COST QUOTAS, SECURITY & SOURCE EXPORT    */}
      {/* ==================================================================== */}
      {activeTab === 'infrastructure' && (
        <div className="space-y-4">
          {systemOverview?.quotaWarnings?.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 text-amber-950 rounded-md px-4 py-3 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Quota Threshold Warning (&ge;{systemOverview.quotas?.warningThresholdPct}%):</strong>{' '}
                {systemOverview.quotaWarnings
                  .map((w: any) => `${w.metric} (${w.used} / ${w.limit} — ${w.pct}%)`)
                  .join(' · ')}
              </div>
            </div>
          )}

          {/* Export & Governance Action Bar */}
          <div className="bg-slate-900 text-white rounded-md p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                {systemOverview?.quotas?.planName || 'Zero-Cost Starter Tier'} ·{' '}
                {systemOverview?.quotas?.targetUserBand || '50–500 Active Users'}
              </div>
              <div className="text-xs text-slate-300">
                Key Contact: <strong>Jonathan Thadanki</strong> ({systemOverview?.keyContact?.email || 'jonathan.tadanki@gmail.com'} ·{' '}
                {systemOverview?.keyContact?.phone || '+919133661933'}) · Auto Paid Upgrades:{' '}
                <strong className={systemOverview?.quotas?.autoPaidUpgradeEnabled ? 'text-amber-300' : 'text-emerald-400'}>
                  {systemOverview?.quotas?.autoPaidUpgradeEnabled ? 'ENABLED' : 'OFF (Manual Control Only)'}
                </strong>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadSourceArchive}
                disabled={downloadingSource}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>{downloadingSource ? 'Packaging...' : 'Download Clean Source (.tar.gz)'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadRlsSql}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold cursor-pointer"
              >
                <FileCode2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Download RLS SQL</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadJsonBackup}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-sky-400" />
                <span>Export Full JSON Backup</span>
              </button>
            </div>
          </div>

          {/* Live Platform Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 tabular-nums">
            {[
              { label: 'Total Companies', value: systemOverview?.metrics?.totalCompanies ?? 0, sub: `Max ${systemOverview?.quotas?.maxCompanies ?? 25}` },
              { label: 'Registered Users', value: systemOverview?.metrics?.totalRegisteredUsers ?? 0, sub: `Active 7d: ${systemOverview?.metrics?.activeUsers7d ?? 0} / 30d: ${systemOverview?.metrics?.activeUsers30d ?? 0}` },
              { label: 'Active Sites', value: systemOverview?.metrics?.activeSites ?? 0, sub: `Max ${systemOverview?.quotas?.maxSites ?? 100}` },
              { label: 'PostgreSQL DB', value: `${systemOverview?.metrics?.databaseUsageMb ?? 0} MB`, sub: `Limit ${systemOverview?.quotas?.maxDatabaseMb ?? 500} MB` },
              { label: 'Document Storage', value: `${systemOverview?.metrics?.storageUsageMb ?? 0} MB`, sub: `${systemOverview?.metrics?.totalDocuments ?? 0} controlled docs` },
              { label: 'Monthly Alerts', value: systemOverview?.metrics?.notificationsThisMonth ?? 0, sub: `Emails delivered: ${systemOverview?.metrics?.emailsDeliveredThisMonth ?? 0}` },
              { label: 'Failed Alerts', value: systemOverview?.metrics?.failedNotificationsCount ?? 0, sub: `Unconfigured: ${systemOverview?.metrics?.unconfiguredNotificationsCount ?? 0}` },
              { label: 'Push Devices', value: systemOverview?.metrics?.registeredPushDevices ?? 0, sub: 'Active FCM tokens' },
              { label: 'Security Events', value: systemOverview?.metrics?.securityEventsCount ?? 0, sub: 'Rate limits, 403, uploads' },
              { label: 'API 5xx Errors', value: systemOverview?.metrics?.apiErrorsCount ?? 0, sub: 'Tracked server exceptions' },
            ].map((card) => (
              <div key={card.label} className="bg-white border border-slate-200 border-t-2 border-t-slate-800 rounded-md p-3">
                <div className="text-[11px] font-semibold uppercase text-slate-500">{card.label}</div>
                <div className="mt-1 text-xl font-display font-bold text-slate-900">{card.value}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{card.sub}</div>
              </div>
            ))}
          </div>

          {/* Quota Bars & Manual Tier Governance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-slate-900">Free-Tier Quota Utilization</h3>
                <span className="text-[11px] text-slate-500">
                  Warning at {systemOverview?.quotas?.warningThresholdPct ?? 80}%
                </span>
              </div>
              {[
                { label: 'Companies', pct: systemOverview?.utilization?.companiesPct ?? 0 },
                { label: 'Registered Users', pct: systemOverview?.utilization?.usersPct ?? 0 },
                { label: 'Active Sites', pct: systemOverview?.utilization?.sitesPct ?? 0 },
                { label: 'PostgreSQL Database (MB)', pct: systemOverview?.utilization?.databasePct ?? 0 },
                { label: 'Document & Photo Storage (MB)', pct: systemOverview?.utilization?.storagePct ?? 0 },
                { label: 'Monthly Emails (Resend Free Tier)', pct: systemOverview?.utilization?.emailsPct ?? 0 },
              ].map((bar) => (
                <div key={bar.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 font-medium">{bar.label}</span>
                    <span className="font-mono font-bold text-slate-900">{bar.pct}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        bar.pct >= (systemOverview?.quotas?.warningThresholdPct ?? 80)
                          ? 'bg-red-600'
                          : bar.pct >= 50
                            ? 'bg-amber-500'
                            : 'bg-emerald-600'
                      }`}
                      style={{ width: `${Math.max(2, bar.pct)}%` }}
                    />
                  </div>
                </div>
              ))}

              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-600 mr-1">Manual Tier Preset:</span>
                {(['starter', 'growth', 'enterprise'] as const).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    disabled={busyQuota}
                    onClick={() => handleUpdateTierPreset(tier)}
                    className="px-2.5 py-1 rounded text-[11px] font-semibold border border-slate-300 bg-white hover:bg-slate-900 hover:text-white capitalize cursor-pointer"
                  >
                    {tier}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={busyQuota}
                  onClick={handleToggleAutoPaidUpgrade}
                  className="ml-auto px-2.5 py-1 rounded text-[11px] font-semibold border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 cursor-pointer"
                >
                  Auto Paid Upgrade: {systemOverview?.quotas?.autoPaidUpgradeEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Live Provider Readiness Matrix (Honest Status — Zero Fake Integrations) */}
            <div className="bg-white border border-slate-200 rounded-md p-4 space-y-2.5">
              <h3 className="font-display text-sm font-bold text-slate-900">
                Real Infrastructure &amp; Provider Readiness
              </h3>
              <p className="text-[11px] text-slate-500">
                External integrations execute only when real backend secrets exist. Unconfigured channels are honestly logged as <span className="font-mono">unconfigured</span>.
              </p>
              <div className="divide-y divide-slate-100 text-xs">
                {systemOverview?.providers &&
                  Object.entries(systemOverview.providers).map(([key, info]: [string, any]) => (
                    <div key={key} className="py-2 flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-900">{info.provider}</div>
                        <div className="text-[11px] text-slate-500">
                          {info.tier}
                          {info.envHint && !info.configured ? ` · Set ${info.envHint}` : ''}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                          info.configured
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {info.configured ? 'Configured' : 'Optional / Off'}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Security Events & API Error Logs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-display text-xs font-bold text-slate-800 uppercase">
                Recent Security Events ({systemOverview?.securityEvents?.length ?? 0})
              </div>
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/70 text-[10px] text-slate-500 uppercase border-b border-slate-100">
                    <tr>
                      <th className="px-3 py-2">Time</th>
                      <th className="px-3 py-2">Event</th>
                      <th className="px-3 py-2">Endpoint</th>
                      <th className="px-3 py-2">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 tabular-nums">
                    {(systemOverview?.securityEvents || []).map((ev: any) => (
                      <tr key={ev.id}>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                          {new Date(ev.createdAt).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 font-semibold text-red-700">{ev.eventType}</td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-700 truncate max-w-[180px]">
                          {ev.method} {ev.endpoint}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{ev.ipAddress || '—'}</td>
                      </tr>
                    ))}
                    {(!systemOverview?.securityEvents || systemOverview.securityEvents.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                          No security events recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-display text-xs font-bold text-slate-800 uppercase">
                Recent API 5xx Errors ({systemOverview?.apiErrors?.length ?? 0})
              </div>
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/70 text-[10px] text-slate-500 uppercase border-b border-slate-100">
                    <tr>
                      <th className="px-3 py-2">Time</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Path &amp; Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 tabular-nums">
                    {(systemOverview?.apiErrors || []).map((errRow: any) => (
                      <tr key={errRow.id}>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                          {new Date(errRow.createdAt).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 font-mono font-bold text-red-700">{errRow.statusCode}</td>
                        <td className="px-3 py-2 text-slate-700">
                          <div className="font-mono text-[11px]">{errRow.method} {errRow.path}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">{errRow.errorMessage}</div>
                        </td>
                      </tr>
                    ))}
                    {(!systemOverview?.apiErrors || systemOverview.apiErrors.length === 0) && (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-slate-400">
                          Zero API 5xx server errors logged.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB G: MULTI-CHANNEL NOTIFICATION ENGINE & ESCALATION RULES          */}
      {/* ==================================================================== */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          {/* Automated EHS Scan & Manual Dispatcher */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <form
              onSubmit={handleDispatchAlert}
              className="bg-white border border-slate-200 rounded-md p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Dispatch Real Multi-Channel Alert
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={busyNotifAction === 'scan'}
                    onClick={handleRunAutomatedScan}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold cursor-pointer"
                  >
                    <Play className="w-3 h-3" />
                    <span>{busyNotifAction === 'scan' ? 'Scanning...' : 'Run EHS Alert Scan'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={busyNotifAction === 'retry-all'}
                    onClick={handleRetryAllFailed}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retry Failed</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={dispatchForm.eventCategory}
                  onChange={(e) => setDispatchForm((p) => ({ ...p, eventCategory: e.target.value }))}
                  className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                >
                  <option value="emergency">Emergency Alert</option>
                  <option value="incident_escalation">Incident Escalation</option>
                  <option value="overdue_task">Overdue Task Reminder</option>
                  <option value="training_expiry">Training Expiry</option>
                  <option value="certificate_expiry">Certificate Expiry</option>
                  <option value="quota_alert">Quota / Cost Alert</option>
                </select>
                <select
                  value={dispatchForm.severity}
                  onChange={(e) => setDispatchForm((p) => ({ ...p, severity: e.target.value }))}
                  className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                >
                  <option value="critical">Critical</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </select>
              </div>

              <input
                required
                value={dispatchForm.title}
                onChange={(e) => setDispatchForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Alert subject / headline..."
                className="w-full text-xs border border-slate-300 rounded px-3 py-1.5"
              />
              <textarea
                required
                rows={2}
                value={dispatchForm.message}
                onChange={(e) => setDispatchForm((p) => ({ ...p, message: e.target.value }))}
                placeholder="Detailed EHS notification body..."
                className="w-full text-xs border border-slate-300 rounded px-3 py-1.5"
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {(['in_app', 'email', 'push', 'discord', 'sms'] as const).map((ch) => {
                    const checked = dispatchForm.channels.includes(ch);
                    return (
                      <label key={ch} className="inline-flex items-center gap-1 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setDispatchForm((p) => ({
                              ...p,
                              channels: checked
                                ? p.channels.filter((c) => c !== ch)
                                : [...p.channels, ch],
                            }))
                          }
                        />
                        <span className="uppercase font-mono text-[11px]">{ch}</span>
                      </label>
                    );
                  })}
                </div>
                <button
                  type="submit"
                  disabled={busyNotifAction === 'dispatch'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{busyNotifAction === 'dispatch' ? 'Sending...' : 'Dispatch Alert'}</span>
                </button>
              </div>
            </form>

            {/* Escalation Rules Manager */}
            <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3">
              <h3 className="font-display text-sm font-bold text-slate-900">
                Configurable Escalation Rules ({escalationRules.length})
              </h3>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {escalationRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="border border-slate-200 rounded px-3 py-2 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{rule.ruleName}</div>
                      <div className="text-[11px] text-slate-500">
                        {rule.eventCategory} · {rule.triggerThresholdHours}h · {rule.escalateToRole} ·{' '}
                        <span className="font-mono">{(rule.channels || []).join(', ')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={busyNotifAction === rule.id}
                        onClick={() => handleToggleRule(rule)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase cursor-pointer ${
                          rule.isActive
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {rule.isActive ? 'Active' : 'Paused'}
                      </button>
                      <button
                        type="button"
                        disabled={busyNotifAction === rule.id}
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                        title="Delete rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleCreateRule} className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  required
                  value={newRuleForm.ruleName}
                  onChange={(e) => setNewRuleForm((p) => ({ ...p, ruleName: e.target.value }))}
                  placeholder="New rule name..."
                  className="text-xs border border-slate-300 rounded px-2.5 py-1.5"
                />
                <select
                  value={newRuleForm.eventCategory}
                  onChange={(e) => setNewRuleForm((p) => ({ ...p, eventCategory: e.target.value }))}
                  className="text-xs border border-slate-300 rounded px-2 py-1.5 bg-white"
                >
                  <option value="overdue_task">overdue_task</option>
                  <option value="training_expiry">training_expiry</option>
                  <option value="certificate_expiry">certificate_expiry</option>
                  <option value="incident_escalation">incident_escalation</option>
                  <option value="emergency">emergency</option>
                </select>
                <button
                  type="submit"
                  disabled={busyNotifAction === 'create-rule'}
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Rule</span>
                </button>
              </form>
            </div>
          </div>

          {/* Delivery Logs Table */}
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="font-display text-xs font-bold text-slate-800 uppercase">
                Notification Delivery Logs ({notifLogs.length})
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={notifChannelFilter}
                  onChange={(e) => setNotifChannelFilter(e.target.value)}
                  className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                >
                  <option value="all">All Channels</option>
                  <option value="in_app">In-App</option>
                  <option value="email">Email (Resend)</option>
                  <option value="push">Push (FCM)</option>
                  <option value="discord">Discord</option>
                  <option value="sms">SMS</option>
                </select>
                <select
                  value={notifStatusFilter}
                  onChange={(e) => setNotifStatusFilter(e.target.value)}
                  className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="delivered">Delivered</option>
                  <option value="failed">Failed</option>
                  <option value="unconfigured">Unconfigured</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                  <tr>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Channel / Provider</th>
                    <th className="px-3 py-2">Event &amp; Subject</th>
                    <th className="px-3 py-2">Recipient</th>
                    <th className="px-3 py-2">Status &amp; Attempts</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {notifLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 align-top">
                      <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                        {new Date(log.lastAttemptAt || log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-mono font-bold uppercase text-slate-800">{log.channel}</span>
                        <div className="text-[10px] text-slate-500">{log.provider}</div>
                      </td>
                      <td className="px-3 py-2 max-w-sm">
                        <div className="font-semibold text-slate-900">{log.subject}</div>
                        <div className="text-[11px] text-slate-500">{log.eventCategory}</div>
                        {log.errorMessage && (
                          <div className="text-[11px] text-red-700 mt-0.5">{log.errorMessage}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-600">{log.recipient}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.status === 'delivered'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : log.status === 'failed'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {log.status}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Attempt {log.attemptCount}/{log.maxRetries}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {log.status !== 'delivered' && (
                          <button
                            type="button"
                            disabled={busyNotifAction === log.id}
                            onClick={() => handleRetryLog(log.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-900 hover:text-white text-[11px] font-semibold cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Retry</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!loading && notifLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        No notification delivery logs recorded yet. Run an EHS scan or dispatch an alert above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
