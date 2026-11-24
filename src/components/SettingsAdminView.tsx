import React, { useCallback, useEffect, useState } from 'react';
import { Building, Download, Globe, Layers, Lock, Palette, Plug, Plus, Shield, Trash2, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { StatusTag } from './IconResolver';
import { HomepageCmsManager } from './HomepageCmsManager';

export function SettingsAdminView() {
  const { user, organization, hierarchy, refreshSession } = useAuth();
  const [tab, setTab] = useState<'homepage-cms' | 'branding' | 'hierarchy' | 'users' | 'templates' | 'integrations' | 'audit'>('homepage-cms');
  const [usersData, setUsersData] = useState<{ users: any[]; userRoles: any[] }>({ users: [], userRoles: [] });
  const [roles, setRoles] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const [branding, setBranding] = useState({
    companyName: organization?.branding?.companyName || organization?.name || '',
    logoUrl: organization?.branding?.logoUrl || '',
    primaryColor: organization?.branding?.primaryColor || '#0F172A',
    accentColor: organization?.branding?.accentColor || '#15803D',
    reportHeader: organization?.branding?.reportHeader || '',
    reportFooter: organization?.branding?.reportFooter || '',
    tagline: organization?.branding?.tagline || '',
  });

  const existingMatrix = (organization?.settings as any)?.riskMatrixThresholds || {
    criticalMin: 16,
    highMin: 10,
    mediumMin: 5,
  };
  const [riskThresholds, setRiskThresholds] = useState(existingMatrix);

  const [buForm, setBuForm] = useState({ name: '', headName: '' });
  const [plantForm, setPlantForm] = useState({ businessUnitId: '', name: '', location: '', state: '', totalEmployees: 100, monthlyManhours: 20000 });
  const [deptForm, setDeptForm] = useState({ plantId: '', name: '', hodName: '' });
  const [areaForm, setAreaForm] = useState({ plantId: '', departmentId: '', name: '', riskLevel: 'Medium' });
  const [locForm, setLocForm] = useState({ plantId: '', areaId: '', name: '' });

  const [userForm, setUserForm] = useState({ fullName: '', email: '', designation: 'Safety Officer', roleId: '' });
  const [roleForm, setRoleForm] = useState({ name: '', description: '', level: 50 });

  // Custom & Editable Industry Templates
  const [editingTpl, setEditingTpl] = useState<any | null>(null);
  const [tplEditText, setTplEditText] = useState({ description: '', hazards: '', permitTypes: '' });
  const [newTpl, setNewTpl] = useState({ industryName: '', description: '', hazards: '', permitTypes: '' });

  const loadAdmin = useCallback(async () => {
    const [u, r, t, l, ints] = await Promise.all([
      apiFetch('/api/users'),
      apiFetch('/api/roles'),
      apiFetch('/api/industry-templates'),
      apiFetch('/api/audit-logs'),
      apiFetch('/api/integrations/status'),
    ]);
    setUsersData(u);
    setRoles(r);
    setTemplates(t);
    setAuditLogs(l);
    setIntegrations(ints);
  }, []);

  useEffect(() => {
    if (!user?.isPlatformOwner) return;
    loadAdmin();
  }, [loadAdmin, user?.isPlatformOwner]);

  const saveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/organizations/current', {
      method: 'PATCH',
      body: JSON.stringify({
        name: branding.companyName,
        branding,
        settings: { riskMatrixThresholds: riskThresholds },
      }),
    });
    await refreshSession();
    setMsg('Company branding, Risk Matrix thresholds & PDF report headers updated.');
  };

  const addBu = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/business-units', { method: 'POST', body: JSON.stringify(buForm) });
    setBuForm({ name: '', headName: '' });
    await refreshSession();
    setMsg('Business Unit created.');
  };

  const addPlant = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/plants', { method: 'POST', body: JSON.stringify(plantForm) });
    setPlantForm({ businessUnitId: '', name: '', location: '', state: '', totalEmployees: 100, monthlyManhours: 20000 });
    await refreshSession();
    setMsg('Facility / Plant added.');
  };

  const addDept = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/departments', { method: 'POST', body: JSON.stringify(deptForm) });
    setDeptForm({ plantId: '', name: '', hodName: '' });
    await refreshSession();
    setMsg('Department added.');
  };

  const addArea = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/areas', { method: 'POST', body: JSON.stringify(areaForm) });
    setAreaForm({ plantId: '', departmentId: '', name: '', riskLevel: 'Medium' });
    await refreshSession();
    setMsg('Area / Zone added.');
  };

  const addLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/locations', { method: 'POST', body: JSON.stringify(locForm) });
    setLocForm({ plantId: '', areaId: '', name: '' });
    await refreshSession();
    setMsg('Work Location added.');
  };

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(userForm) });
    setUserForm({ fullName: '', email: '', designation: 'Safety Officer', roleId: '' });
    await loadAdmin();
    setMsg('User added & assigned role.');
  };

  const addRole = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/roles', { method: 'POST', body: JSON.stringify(roleForm) });
    setRoleForm({ name: '', description: '', level: 50 });
    await loadAdmin();
    setMsg('Custom role created.');
  };

  const applyTemplate = async (id: string) => {
    const res = await apiFetch(`/api/industry-templates/${id}/apply`, { method: 'POST' });
    await refreshSession();
    setMsg(`Applied "${res.industry}" template (${res.modulesAdded} industry modules added).`);
  };

  const saveEditedTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTpl) return;
    await apiFetch(`/api/industry-templates/${editingTpl.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        description: tplEditText.description,
        hazards: tplEditText.hazards.split(',').map((s) => s.trim()).filter(Boolean),
        permitTypes: tplEditText.permitTypes.split(',').map((s) => s.trim()).filter(Boolean),
      }),
    });
    setEditingTpl(null);
    await loadAdmin();
    setMsg('Industry template updated.');
  };

  const createCustomTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/industry-templates', {
      method: 'POST',
      body: JSON.stringify({
        industryName: newTpl.industryName,
        description: newTpl.description,
        hazards: newTpl.hazards.split(',').map((s) => s.trim()).filter(Boolean),
        permitTypes: newTpl.permitTypes.split(',').map((s) => s.trim()).filter(Boolean),
      }),
    });
    setNewTpl({ industryName: '', description: '', hazards: '', permitTypes: '' });
    await loadAdmin();
    setMsg('Custom industry template created.');
  };

  const downloadBackup = async () => {
    const data = await apiFetch('/api/backups/export');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ARSHIEL-BACKUP-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!user?.isPlatformOwner) {
    return (
      <div className="bg-white border border-red-200 rounded-md p-8 text-center space-y-2">
        <Lock className="w-8 h-8 text-red-600 mx-auto" />
        <h2 className="font-display text-lg font-bold text-slate-900">Restricted Access — Sole Super Admin Only</h2>
        <p className="text-xs text-slate-600">
          Admin &amp; Settings is exclusively accessible to Platform Owner Jonathan Thadanki.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Super Admin Control Center &amp; Organization Settings
          </h1>
          <p className="text-sm text-slate-500">
            Branding, Multi-Plant Facility Hierarchy, 16+ RBAC Roles, 14+ Industry Templates, Integrations &amp; Backups.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadBackup}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-900 text-white rounded cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" /> Export JSON Backup
        </button>
      </div>

      {msg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs px-4 py-2 rounded">
          {msg}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2">
        {(
          [
            ['homepage-cms', 'Homepage CMS (Services & Industries)', Globe],
            ['branding', 'Company Branding & Risk Matrix', Palette],
            ['hierarchy', 'Facility Hierarchy (5 Levels)', Building],
            ['users', 'Users & 16+ Roles', Users],
            ['templates', 'Industry Templates', Layers],
            ['integrations', 'Integrations & System Status', Plug],
            ['audit', 'Audit Trail & Sample Data', Shield],
          ] as const
        ).map(([k, label, Icon]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded cursor-pointer ${
              tab === k ? 'bg-emerald-700 text-white' : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {tab === 'homepage-cms' && <HomepageCmsManager />}

      {tab === 'branding' && (
        <form onSubmit={saveBranding} className="bg-white border border-slate-200 rounded-md p-5 space-y-4 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Organization Name</label>
              <input value={branding.companyName} onChange={(e) => setBranding({ ...branding, companyName: e.target.value })} className="w-full border border-slate-300 rounded px-3 py-2 text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Logo Image URL</label>
              <input value={branding.logoUrl} onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })} placeholder="https://..." className="w-full border border-slate-300 rounded px-3 py-2 text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Report Header Text</label>
              <input value={branding.reportHeader} onChange={(e) => setBranding({ ...branding, reportHeader: e.target.value })} className="w-full border border-slate-300 rounded px-3 py-2 text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Report Footer Text</label>
              <input value={branding.reportFooter} onChange={(e) => setBranding({ ...branding, reportFooter: e.target.value })} className="w-full border border-slate-300 rounded px-3 py-2 text-xs" />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3">
            <div className="text-xs font-bold text-slate-900 mb-2">Configurable 5×5 Risk Matrix Score Thresholds</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Critical Min Score</label>
                <input
                  type="number"
                  value={riskThresholds.criticalMin}
                  onChange={(e) => setRiskThresholds({ ...riskThresholds, criticalMin: Number(e.target.value) })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">High Min Score</label>
                <input
                  type="number"
                  value={riskThresholds.highMin}
                  onChange={(e) => setRiskThresholds({ ...riskThresholds, highMin: Number(e.target.value) })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Medium Min Score</label>
                <input
                  type="number"
                  value={riskThresholds.mediumMin}
                  onChange={(e) => setRiskThresholds({ ...riskThresholds, mediumMin: Number(e.target.value) })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                />
              </div>
            </div>
          </div>

          <button type="submit" className="px-4 py-2 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer">
            Save Branding &amp; Governance Settings
          </button>
          <div className="border-t border-slate-200 pt-3 text-xs text-slate-500">
            Platform Owner Attribution: <strong className="text-slate-900">Jonathan Thadanki</strong> · &copy; 2026 ARSHIEL SAFETY
          </div>
        </form>
      )}

      {tab === 'hierarchy' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <form onSubmit={addBu} className="bg-white border border-slate-200 rounded-md p-4 space-y-2">
              <div className="text-xs font-bold text-slate-900">1. Add Business Unit</div>
              <input required value={buForm.name} onChange={(e) => setBuForm({ ...buForm, name: e.target.value })} placeholder="Business Unit Name *" className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
              <input value={buForm.headName} onChange={(e) => setBuForm({ ...buForm, headName: e.target.value })} placeholder="BU Head Name" className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
              <button type="submit" className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded cursor-pointer">Create Business Unit</button>
            </form>

            <form onSubmit={addPlant} className="bg-white border border-slate-200 rounded-md p-4 space-y-2">
              <div className="text-xs font-bold text-slate-900">2. Add Plant / Facility</div>
              <select value={plantForm.businessUnitId} onChange={(e) => setPlantForm({ ...plantForm, businessUnitId: e.target.value })} className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs">
                <option value="">-- Optional Business Unit --</option>
                {(hierarchy.businessUnits || []).map((bu) => <option key={bu.id} value={bu.id}>{bu.name}</option>)}
              </select>
              <input required value={plantForm.name} onChange={(e) => setPlantForm({ ...plantForm, name: e.target.value })} placeholder="Plant Name *" className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
              <div className="grid grid-cols-2 gap-2">
                <input value={plantForm.location} onChange={(e) => setPlantForm({ ...plantForm, location: e.target.value })} placeholder="City / Industrial Park" className="border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
                <input value={plantForm.state} onChange={(e) => setPlantForm({ ...plantForm, state: e.target.value })} placeholder="State" className="border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" value={plantForm.totalEmployees} onChange={(e) => setPlantForm({ ...plantForm, totalEmployees: Number(e.target.value) })} placeholder="Employees" className="border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
                <input type="number" value={plantForm.monthlyManhours} onChange={(e) => setPlantForm({ ...plantForm, monthlyManhours: Number(e.target.value) })} placeholder="Monthly Manhours" className="border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
              </div>
              <button type="submit" className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer">Create Plant</button>
            </form>

            <form onSubmit={addDept} className="bg-white border border-slate-200 rounded-md p-4 space-y-2">
              <div className="text-xs font-bold text-slate-900">3. Add Department under Plant</div>
              <select required value={deptForm.plantId} onChange={(e) => setDeptForm({ ...deptForm, plantId: e.target.value })} className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs">
                <option value="">Select Plant *</option>
                {hierarchy.plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input required value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} placeholder="Department Name *" className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
              <input value={deptForm.hodName} onChange={(e) => setDeptForm({ ...deptForm, hodName: e.target.value })} placeholder="HOD Name" className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
              <button type="submit" className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded cursor-pointer">Create Department</button>
            </form>

            <form onSubmit={addArea} className="bg-white border border-slate-200 rounded-md p-4 space-y-2">
              <div className="text-xs font-bold text-slate-900">4. Add Area / Hazard Zone</div>
              <select required value={areaForm.plantId} onChange={(e) => setAreaForm({ ...areaForm, plantId: e.target.value })} className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs">
                <option value="">Select Plant *</option>
                {hierarchy.plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input required value={areaForm.name} onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })} placeholder="Area / Zone Name *" className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
              <select value={areaForm.riskLevel} onChange={(e) => setAreaForm({ ...areaForm, riskLevel: e.target.value })} className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs">
                <option value="Low">Low Risk Zone</option>
                <option value="Medium">Medium Risk Zone</option>
                <option value="High">High Risk Zone</option>
                <option value="Critical">Critical Hazard Zone</option>
              </select>
              <button type="submit" className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded cursor-pointer">Create Area</button>
            </form>

            <form onSubmit={addLocation} className="bg-white border border-slate-200 rounded-md p-4 space-y-2 lg:col-span-2">
              <div className="text-xs font-bold text-slate-900">5. Add Specific Work Location / Equipment Point</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select required value={locForm.plantId} onChange={(e) => setLocForm({ ...locForm, plantId: e.target.value })} className="border border-slate-300 rounded px-2.5 py-1.5 text-xs">
                  <option value="">Select Plant *</option>
                  {hierarchy.plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select value={locForm.areaId} onChange={(e) => setLocForm({ ...locForm, areaId: e.target.value })} className="border border-slate-300 rounded px-2.5 py-1.5 text-xs">
                  <option value="">Optional Area</option>
                  {(hierarchy.areas || []).filter((a) => !locForm.plantId || a.plantId === locForm.plantId).map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <input required value={locForm.name} onChange={(e) => setLocForm({ ...locForm, name: e.target.value })} placeholder="Specific Bay / Line / Tank *" className="border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
              </div>
              <button type="submit" className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer">Create Location</button>
            </form>
          </div>

          <div className="bg-white border border-slate-200 rounded-md p-4">
            <div className="text-sm font-bold text-slate-900 mb-2">
              Organization Hierarchy ({hierarchy.businessUnits?.length || 0} BU · {hierarchy.plants.length} Plants · {hierarchy.departments.length} Depts · {hierarchy.areas?.length || 0} Areas · {hierarchy.locations?.length || 0} Locations)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {hierarchy.plants.map((p) => (
                <div key={p.id} className="border border-slate-200 rounded p-3 space-y-1.5">
                  <div className="font-bold text-slate-900">{p.name} ({p.code})</div>
                  <div className="text-slate-500">{p.location} · {p.state} · {p.totalEmployees} Employees · {p.monthlyManhours.toLocaleString()} Manhours</div>
                  <div className="text-slate-700 space-y-0.5">
                    {hierarchy.departments.filter((d) => d.plantId === p.id).map((d) => (
                      <div key={d.id}>Dept: {d.name} (HOD: {d.hodName || '-'})</div>
                    ))}
                    {(hierarchy.areas || []).filter((a) => a.plantId === p.id).map((a) => (
                      <div key={a.id} className="text-emerald-800">Area: {a.name} ({a.riskLevel} Risk)</div>
                    ))}
                    {(hierarchy.locations || []).filter((l) => l.plantId === p.id).map((l) => (
                      <div key={l.id} className="text-slate-500">Location: {l.name}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <form onSubmit={addUser} className="bg-white border border-slate-200 rounded-md p-4 space-y-2.5">
            <div className="text-sm font-bold">Invite / Register Enterprise User</div>
            <input required value={userForm.fullName} onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })} placeholder="Full Name *" className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
            <input required type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} placeholder="Work Email *" className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
            <select value={userForm.roleId} onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })} className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs">
              <option value="">Select Role...</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name} (Level {r.level})</option>)}
            </select>
            <button type="submit" className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer">Add User</button>
          </form>

          <form onSubmit={addRole} className="bg-white border border-slate-200 rounded-md p-4 space-y-2.5">
            <div className="text-sm font-bold">Create Unlimited Custom Role</div>
            <input required value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} placeholder="Custom Role Name (e.g. Crane Inspector) *" className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
            <input value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} placeholder="Role Scope Description" className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
            <button type="submit" className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded cursor-pointer"><Plus className="w-3 h-3 inline mr-1" />Add Custom Role</button>
          </form>

          <div className="bg-white border border-slate-200 rounded-md p-4">
            <div className="text-sm font-bold mb-2">Organization Users ({usersData.users.length})</div>
            <div className="divide-y divide-slate-100 text-xs">
              {usersData.users.map((u) => (
                <div key={u.id} className="py-2 flex justify-between">
                  <div><strong>{u.fullName}</strong> · {u.email}</div>
                  <div className="text-emerald-700 font-semibold">{usersData.userRoles.find((ur) => ur.userId === u.id)?.roleName || u.designation}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-md p-4">
            <div className="text-sm font-bold mb-2">RBAC Roles ({roles.length})</div>
            <div className="space-y-1 max-h-60 overflow-y-auto text-xs">
              {roles.map((r) => (
                <div key={r.id} className="flex justify-between py-1 border-b border-slate-100">
                  <span className="font-semibold">{r.name}</span>
                  <span className="text-slate-500">Lvl {r.level}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'templates' && (
        <div className="space-y-4">
          <form onSubmit={createCustomTemplate} className="bg-white border border-slate-200 rounded-md p-4 grid grid-cols-1 sm:grid-cols-4 gap-2">
            <input required value={newTpl.industryName} onChange={(e) => setNewTpl({ ...newTpl, industryName: e.target.value })} placeholder="New Industry Template Name *" className="border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
            <input value={newTpl.description} onChange={(e) => setNewTpl({ ...newTpl, description: e.target.value })} placeholder="Description" className="border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
            <input value={newTpl.hazards} onChange={(e) => setNewTpl({ ...newTpl, hazards: e.target.value })} placeholder="Key Hazards (comma-sep)" className="border border-slate-300 rounded px-2.5 py-1.5 text-xs" />
            <button type="submit" className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded cursor-pointer">+ Create Custom Template</button>
          </form>

          {editingTpl && (
            <form onSubmit={saveEditedTemplate} className="bg-amber-50 border border-amber-200 rounded-md p-4 space-y-2">
              <div className="text-xs font-bold text-amber-950">Customize Template: {editingTpl.industryName}</div>
              <input value={tplEditText.description} onChange={(e) => setTplEditText({ ...tplEditText, description: e.target.value })} placeholder="Description" className="w-full border border-amber-300 rounded px-2.5 py-1.5 text-xs bg-white" />
              <input value={tplEditText.hazards} onChange={(e) => setTplEditText({ ...tplEditText, hazards: e.target.value })} placeholder="Hazards (comma-separated)" className="w-full border border-amber-300 rounded px-2.5 py-1.5 text-xs bg-white" />
              <input value={tplEditText.permitTypes} onChange={(e) => setTplEditText({ ...tplEditText, permitTypes: e.target.value })} placeholder="Suggested Permit Types (comma-separated)" className="w-full border border-amber-300 rounded px-2.5 py-1.5 text-xs bg-white" />
              <div className="flex gap-2">
                <button type="submit" className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer">Save Template Changes</button>
                <button type="button" onClick={() => setEditingTpl(null)} className="px-3 py-1.5 text-xs border border-slate-300 bg-white rounded cursor-pointer">Cancel</button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map((t) => (
              <div key={t.id} className="bg-white border border-slate-200 rounded-md p-4 flex flex-col justify-between gap-3">
                <div>
                  <div className="font-display font-bold text-slate-900">{t.industryName}</div>
                  <div className="text-xs text-slate-600 mt-1">{t.description}</div>
                  <div className="text-[11px] text-slate-500 mt-2">
                    <strong>Hazards:</strong> {(t.hazards || []).slice(0, 3).join(', ')}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => applyTemplate(t.id)}
                    className="flex-1 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded cursor-pointer"
                  >
                    Apply Template
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTpl(t);
                      setTplEditText({
                        description: t.description || '',
                        hazards: (t.hazards || []).join(', '),
                        permitTypes: (t.permitTypes || []).join(', '),
                      });
                    }}
                    className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'integrations' && (
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <div className="font-bold text-sm text-slate-900">Truthful Integration &amp; Infrastructure Readiness</div>
            <div className="text-xs text-slate-500">Live connection checks with honest readiness status (zero simulated connectors).</div>
          </div>
          <div className="divide-y divide-slate-100">
            {integrations.map((item) => (
              <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-slate-900">{item.name} · <span className="font-normal text-slate-500">{item.category}</span></div>
                  <div className="text-xs text-slate-600 mt-0.5">{item.detail}</div>
                </div>
                <StatusTag status={item.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-700">
              <strong>Sample Dataset Controls:</strong> Load or permanently clear clearly-badged SAMPLE DATA records.
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  await apiFetch('/api/organizations/sample-data/seed', { method: 'POST' });
                  await refreshSession();
                  setMsg('Sample dataset loaded.');
                }}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded cursor-pointer"
              >
                Load Sample Data
              </button>
              <button
                type="button"
                onClick={async () => {
                  await apiFetch('/api/organizations/sample-data/clear', { method: 'POST' });
                  await refreshSession();
                  setMsg('Sample dataset removed.');
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Sample Data
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 font-bold text-sm">Enterprise Immutable Audit Trail</div>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr><th className="px-4 py-2">Timestamp</th><th className="px-3 py-2">User</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Entity</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {auditLogs.map((l) => (
                    <tr key={l.id}>
                      <td className="px-4 py-2 text-slate-500">{new Date(l.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-2 font-medium">{l.userName || l.userEmail}</td>
                      <td className="px-3 py-2 font-mono">{l.action}</td>
                      <td className="px-3 py-2">{l.entityType}</td>
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
