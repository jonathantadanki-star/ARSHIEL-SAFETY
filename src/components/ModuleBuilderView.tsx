import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  FolderPlus,
  GripVertical,
  History,
  Lock,
  MoreVertical,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { AppModule, RoleItem } from '../types';
import { DynamicIcon, StatusTag } from './IconResolver';

const FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'date',
  'time',
  'datetime',
  'dropdown',
  'multiselect',
  'radio',
  'checkbox',
  'file',
  'image',
  'video',
  'signature',
  'qrcode',
  'location',
  'user_select',
  'department_select',
  'plant_select',
];

const ALL_ACTIONS = [
  'view',
  'create',
  'edit',
  'submit',
  'approve',
  'reject',
  'verify',
  'assign',
  'close',
  'extend',
  'suspend',
  'revalidate',
  'export',
  'delete',
  'configure',
];

interface ModuleBuilderViewProps {
  onOpenCustomModule: (moduleId: string) => void;
}

export function ModuleBuilderView({ onOpenCustomModule }: ModuleBuilderViewProps) {
  const { user, refreshSession, hierarchy } = useAuth();
  const [allModules, setAllModules] = useState<AppModule[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'permissions' | 'forms' | 'checklists' | 'workflows' | 'reports' | 'versions'>('details');
  const [search, setSearch] = useState('');
  const [includeArchived, setIncludeArchived] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // Create Module Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [newModName, setNewModName] = useState('');
  const [newModCode, setNewModCode] = useState('');
  const [newModDesc, setNewModDesc] = useState('');
  const [newModIcon, setNewModIcon] = useState('Layers');
  const [newModColor, setNewModColor] = useState('#15803D');

  // Selected Module Details Form
  const [editForm, setEditForm] = useState<Partial<AppModule>>({});

  // Sub-resources for selected module
  const [modPerms, setModPerms] = useState<any[]>([]);
  const [modForms, setModForms] = useState<any[]>([]);
  const [modChecklists, setModChecklists] = useState<any[]>([]);
  const [modWorkflows, setModWorkflows] = useState<any[]>([]);
  const [modReports, setModReports] = useState<any[]>([]);
  const [modVersions, setModVersions] = useState<any[]>([]);
  const [assignedPlantIds, setAssignedPlantIds] = useState<string[]>([]);
  const [assignedDeptIds, setAssignedDeptIds] = useState<string[]>([]);

  // Form Field Adder
  const [newFormName, setNewFormName] = useState('');
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldOptions, setFieldOptions] = useState('');
  const [fieldSection, setFieldSection] = useState('General Details');
  const [fieldMinRule, setFieldMinRule] = useState('');
  const [fieldMaxRule, setFieldMaxRule] = useState('');

  // Checklist Adder
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newChecklistStd, setNewChecklistStd] = useState('ISO 45001');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [targetChecklistId, setTargetChecklistId] = useState<string | null>(null);

  // Workflow Adder
  const [wfName, setWfName] = useState('');
  const [wfMode, setWfMode] = useState('sequential');
  const [wfSteps, setWfSteps] = useState<{ stepName: string; approverRoleName: string; slaHours: number }[]>([
    { stepName: 'Department Head Review', approverRoleName: 'Department Head', slaHours: 4 },
    { stepName: 'Safety Officer Approval', approverRoleName: 'Safety Officer', slaHours: 8 },
  ]);

  // Report Adder
  const [reportName, setReportName] = useState('');
  const [reportType, setReportType] = useState('Summary');

  const notify = (type: 'ok' | 'err', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadAll = useCallback(async () => {
    const [mods, roleList] = await Promise.all([
      apiFetch<AppModule[]>(`/api/modules?includeArchived=${includeArchived}`),
      apiFetch<RoleItem[]>('/api/roles'),
    ]);
    setAllModules(mods);
    setRoles(roleList);
    if (!selectedId && mods.length > 0) {
      setSelectedId(mods[0].id);
    }
  }, [includeArchived, selectedId]);

  useEffect(() => {
    if (!user?.isPlatformOwner) return;
    loadAll();
  }, [loadAll, user?.isPlatformOwner]);

  const selectedModule = useMemo(
    () => allModules.find((m) => m.id === selectedId) || null,
    [allModules, selectedId]
  );

  useEffect(() => {
    if (!selectedModule) return;
    setEditForm({
      moduleName: selectedModule.moduleName,
      moduleCode: selectedModule.moduleCode,
      description: selectedModule.description,
      parentId: selectedModule.parentId,
      icon: selectedModule.icon,
      colour: selectedModule.colour,
      isActive: selectedModule.isActive,
      isVisible: selectedModule.isVisible,
      isPublished: selectedModule.isPublished,
      isArchived: selectedModule.isArchived,
    });

    const loadDetails = async () => {
      const [p, f, c, w, r, v, assn] = await Promise.all([
        apiFetch(`/api/modules/${selectedModule.id}/permissions`),
        apiFetch(`/api/modules/${selectedModule.id}/forms`),
        apiFetch(`/api/modules/${selectedModule.id}/checklists`),
        apiFetch(`/api/modules/${selectedModule.id}/workflows`),
        apiFetch(`/api/modules/${selectedModule.id}/reports`),
        apiFetch(`/api/modules/${selectedModule.id}/versions`),
        apiFetch<any[]>(`/api/modules/${selectedModule.id}/assignments`),
      ]);
      setModPerms(p);
      setModForms(f);
      setSelectedFormId(f[0]?.id || null);
      setModChecklists(c);
      setTargetChecklistId(c[0]?.id || null);
      setModWorkflows(w);
      setModReports(r);
      setModVersions(v);
      setAssignedPlantIds(assn.filter((x) => x.plantId).map((x) => x.plantId));
      setAssignedDeptIds(assn.filter((x) => x.departmentId).map((x) => x.departmentId));
    };
    loadDetails();
  }, [selectedModule]);

  const tree = useMemo(() => {
    const map = new Map<string, AppModule & { children: AppModule[] }>();
    for (const m of allModules) {
      map.set(m.id, { ...m, children: [] });
    }
    const roots: (AppModule & { children: AppModule[] })[] = [];
    for (const node of map.values()) {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }, [allModules]);

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    for (const m of allModules) next[m.id] = true;
    setExpanded(next);
  };

  const collapseAll = () => setExpanded({});

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await apiFetch<AppModule>('/api/modules', {
        method: 'POST',
        body: JSON.stringify({
          parentId: createParentId,
          moduleName: newModName,
          moduleCode: newModCode || undefined,
          description: newModDesc,
          icon: newModIcon,
          colour: newModColor,
          moduleType: 'custom',
        }),
      });
      setShowCreateModal(false);
      setNewModName('');
      setNewModCode('');
      setNewModDesc('');
      if (createParentId) setExpanded((p) => ({ ...p, [createParentId]: true }));
      await loadAll();
      await refreshSession();
      setSelectedId(created.id);
      notify('ok', `Created module "${created.moduleName}" and updated sidebar.`);
    } catch (err: any) {
      notify('err', err.message);
    }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModule) return;
    try {
      await apiFetch(`/api/modules/${selectedModule.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });
      await loadAll();
      await refreshSession();
      notify('ok', 'Module updated & new version snapshot recorded.');
    } catch (err: any) {
      notify('err', err.message);
    }
  };

  const handleDuplicate = async (modId: string) => {
    try {
      const dup = await apiFetch<AppModule>(`/api/modules/${modId}/duplicate`, { method: 'POST' });
      setMenuOpenId(null);
      await loadAll();
      await refreshSession();
      setSelectedId(dup.id);
      notify('ok', `Duplicated "${dup.moduleName}".`);
    } catch (err: any) {
      notify('err', err.message);
    }
  };

  const handleToggleArchive = async (mod: AppModule) => {
    try {
      await apiFetch(`/api/modules/${mod.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isArchived: !mod.isArchived }),
      });
      setMenuOpenId(null);
      await loadAll();
      await refreshSession();
      notify('ok', mod.isArchived ? 'Module restored.' : 'Module archived.');
    } catch (err: any) {
      notify('err', err.message);
    }
  };

  const handleDelete = async (mod: AppModule) => {
    try {
      await apiFetch(`/api/modules/${mod.id}`, { method: 'DELETE' });
      setMenuOpenId(null);
      setSelectedId(null);
      await loadAll();
      await refreshSession();
      notify('ok', `Deleted module "${mod.moduleName}".`);
    } catch (err: any) {
      notify('err', err.message);
    }
  };

  const handleDropOnNode = async (targetParentId: string | null) => {
    if (!draggedId || draggedId === targetParentId) return;
    try {
      await apiFetch('/api/modules/reorder', {
        method: 'POST',
        body: JSON.stringify({
          items: [{ id: draggedId, parentId: targetParentId, displayOrder: 1 }],
        }),
      });
      setDraggedId(null);
      await loadAll();
      await refreshSession();
      notify('ok', 'Module hierarchy updated.');
    } catch (err: any) {
      notify('err', err.message);
    }
  };

  const toggleRolePermission = async (roleId: string, roleSlug: string, action: string) => {
    if (!selectedModule) return;
    if (roleSlug === 'super-admin') {
      notify('err', 'Sole Super Admin permissions are permanently locked to full access across all 15 actions.');
      return;
    }
    if (!user?.isSuperAdmin) {
      notify('err', 'Only the Sole Super Admin (Jonathan Thadanki) can modify module RBAC permissions.');
      return;
    }
    try {
      const current = modPerms.find((p) => p.roleId === roleId)?.allowedActions || [];
      const next = current.includes(action)
        ? current.filter((a: string) => a !== action)
        : [...current, action];

      await apiFetch(`/api/modules/${selectedModule.id}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ roleId, allowedActions: next }),
      });
      const updated = await apiFetch(`/api/modules/${selectedModule.id}/permissions`);
      setModPerms(updated);
      notify('ok', `Updated "${action}" permission and recorded tamper-evident audit diff.`);
    } catch (err: any) {
      notify('err', err?.message || 'Permission update blocked by security policy.');
    }
  };

  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModule || !newFormName.trim()) return;
    const created = await apiFetch(`/api/modules/${selectedModule.id}/forms`, {
      method: 'POST',
      body: JSON.stringify({ formName: newFormName.trim(), fields: [] }),
    });
    setNewFormName('');
    setModForms((prev) => [...prev, created]);
    setSelectedFormId(created.id);
    notify('ok', 'Form created. Add fields below.');
  };

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFormId || !fieldLabel.trim()) return;
    const validationRules: Record<string, any> = {};
    if (fieldType === 'number') {
      if (fieldMinRule !== '') validationRules.min = Number(fieldMinRule);
      if (fieldMaxRule !== '') validationRules.max = Number(fieldMaxRule);
    } else {
      if (fieldMinRule !== '') validationRules.minLength = Number(fieldMinRule);
      if (fieldMaxRule !== '') validationRules.maxLength = Number(fieldMaxRule);
    }

    await apiFetch(`/api/forms/${selectedFormId}/fields`, {
      method: 'POST',
      body: JSON.stringify({
        label: fieldLabel.trim(),
        fieldType,
        isRequired: fieldRequired,
        sectionName: fieldSection,
        validationRules,
        options: fieldOptions
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    });
    setFieldLabel('');
    setFieldOptions('');
    setFieldMinRule('');
    setFieldMaxRule('');
    const refreshed = await apiFetch(`/api/modules/${selectedModule!.id}/forms`);
    setModForms(refreshed);
    notify('ok', 'Form field added.');
  };

  const handleDeleteField = async (fieldId: string) => {
    await apiFetch(`/api/form-fields/${fieldId}`, { method: 'DELETE' });
    const refreshed = await apiFetch(`/api/modules/${selectedModule!.id}/forms`);
    setModForms(refreshed);
  };

  const handleCreateChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModule || !newChecklistTitle.trim()) return;
    const created = await apiFetch(`/api/modules/${selectedModule.id}/checklists`, {
      method: 'POST',
      body: JSON.stringify({
        title: newChecklistTitle.trim(),
        standardCode: newChecklistStd,
      }),
    });
    setNewChecklistTitle('');
    setModChecklists((prev) => [...prev, created]);
    setTargetChecklistId(created.id);
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetChecklistId || !newQuestionText.trim()) return;
    await apiFetch(`/api/checklists/${targetChecklistId}/items`, {
      method: 'POST',
      body: JSON.stringify({ questionText: newQuestionText.trim(), responseType: 'yes_no_na' }),
    });
    setNewQuestionText('');
    const refreshed = await apiFetch(`/api/modules/${selectedModule!.id}/checklists`);
    setModChecklists(refreshed);
  };

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModule || !wfName.trim()) return;
    const created = await apiFetch(`/api/modules/${selectedModule.id}/workflows`, {
      method: 'POST',
      body: JSON.stringify({ workflowName: wfName.trim(), mode: wfMode, steps: wfSteps }),
    });
    setWfName('');
    setModWorkflows((prev) => [...prev, created]);
    notify('ok', 'Approval workflow saved.');
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModule || !reportName.trim()) return;
    const created = await apiFetch(`/api/modules/${selectedModule.id}/reports`, {
      method: 'POST',
      body: JSON.stringify({ reportName: reportName.trim(), reportType }),
    });
    setReportName('');
    setModReports((prev) => [...prev, created]);
  };

  const renderTree = (nodes: (AppModule & { children?: AppModule[] })[], depth = 0) => {
    return nodes
      .filter((n) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return n.moduleName.toLowerCase().includes(q) || n.moduleCode.toLowerCase().includes(q) || (n.children || []).length > 0;
      })
      .map((node) => {
        const hasChildren = Boolean(node.children && node.children.length > 0);
        const isExp = expanded[node.id] ?? depth === 0;
        const isSel = selectedId === node.id;

        return (
          <div key={node.id}>
            <div
              draggable
              onDragStart={() => setDraggedId(node.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.stopPropagation();
                handleDropOnNode(node.id);
              }}
              onClick={() => setSelectedId(node.id)}
              className={`relative group flex items-center justify-between py-1.5 px-2 rounded text-xs cursor-pointer ${
                isSel ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200' : 'hover:bg-slate-100 text-slate-800'
              } ${node.isArchived ? 'opacity-50' : ''}`}
              style={{ marginLeft: `${depth * 14}px` }}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <GripVertical className="w-3 h-3 text-slate-400 shrink-0" />
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpanded((p) => ({ ...p, [node.id]: !isExp }));
                    }}
                    className="p-0.5"
                  >
                    {isExp ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                ) : (
                  <span className="w-4" />
                )}
                <DynamicIcon name={node.icon} className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="truncate">{node.moduleName}</span>
                {node.isArchived && <span className="text-[10px] text-amber-700">(Archived)</span>}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCreateParentId(node.id);
                    setShowCreateModal(true);
                  }}
                  title="Add Child / Sub-Child Module"
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-emerald-100 text-emerald-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenId(menuOpenId === node.id ? null : node.id);
                  }}
                  className="p-0.5 rounded hover:bg-slate-200 text-slate-500"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </div>

              {menuOpenId === node.id && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-2 top-8 z-20 w-44 bg-white border border-slate-200 rounded shadow-md py-1 text-xs"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setCreateParentId(node.id);
                      setShowCreateModal(true);
                      setMenuOpenId(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FolderPlus className="w-3.5 h-3.5" /> Add Child Module
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(node.id)}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Copy className="w-3.5 h-3.5" /> Duplicate Module
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleArchive(node)}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Archive className="w-3.5 h-3.5" /> {node.isArchived ? 'Restore' : 'Archive'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(node)}
                    className="w-full px-3 py-1.5 text-left hover:bg-red-50 text-red-700 flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete (Safe Check)
                  </button>
                </div>
              )}
            </div>
            {hasChildren && isExp && <div className="mt-0.5 space-y-0.5">{renderTree(node.children!, depth + 1)}</div>}
          </div>
        );
      });
  };

  const activeForm = modForms.find((f) => f.id === selectedFormId);

  if (!user?.isPlatformOwner) {
    return (
      <div className="bg-white border border-red-200 rounded-md p-8 text-center space-y-2">
        <Lock className="w-8 h-8 text-red-600 mx-auto" />
        <h2 className="font-display text-lg font-bold text-slate-900">Restricted Access — Sole Super Admin Only</h2>
        <p className="text-xs text-slate-600">
          Dynamic Module Builder is exclusively accessible to Platform Owner Jonathan Thadanki.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Dynamic Unlimited Module Builder
          </h1>
          <p className="text-sm text-slate-500">
            Create unlimited Parent, Child, Sub-Child &amp; N-level EHS modules, forms, checklists, workflows &amp; permissions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreateParentId(null);
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Root Module</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`px-4 py-2.5 rounded border text-xs font-medium ${
            feedback.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {feedback.msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Panel: Recursive Tree Explorer */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-md p-3 space-y-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search module tree..."
              className="w-full border border-slate-300 rounded pl-8 pr-3 py-1.5 text-xs"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-600">
            <div className="flex gap-2">
              <button type="button" onClick={expandAll} className="hover:text-slate-900 font-medium cursor-pointer">
                Expand All
              </button>
              <span>·</span>
              <button type="button" onClick={collapseAll} className="hover:text-slate-900 font-medium cursor-pointer">
                Collapse All
              </button>
            </div>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
              />
              <span>Archived</span>
            </label>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDropOnNode(null)}
            className="text-[11px] text-slate-400 border border-dashed border-slate-200 rounded px-2 py-1 text-center"
          >
            Drag modules onto any parent or drop here for Root level
          </div>

          <div className="max-h-[560px] overflow-y-auto space-y-0.5 pr-1">
            {renderTree(tree)}
          </div>
        </div>

        {/* Right Panel: Selected Module Configurator */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-md p-4 space-y-4">
          {!selectedModule ? (
            <div className="py-16 text-center text-sm text-slate-400">
              Select a module on the left tree to configure details, permissions, forms, checklists, or workflows.
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <DynamicIcon name={selectedModule.icon} className="w-5 h-5 text-emerald-700" />
                  <div>
                    <div className="font-display font-bold text-lg text-slate-900">
                      {selectedModule.moduleName}
                    </div>
                    <div className="text-xs text-slate-500 tabular-nums">
                      Code: {selectedModule.moduleCode} · Type: {selectedModule.moduleType}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusTag status={selectedModule.isArchived ? 'Archived' : selectedModule.isActive ? 'Active' : 'Inactive'} />
                  {!selectedModule.builtInKey && (
                    <button
                      type="button"
                      onClick={() => onOpenCustomModule(selectedModule.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded hover:bg-slate-800 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Open Live Workspace</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Editor Tabs */}
              <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-2">
                {(
                  [
                    ['details', 'Details'],
                    ['permissions', 'Role Permissions'],
                    ['forms', 'Form Builder (19 Types)'],
                    ['checklists', 'Checklists'],
                    ['workflows', 'Approval Workflows'],
                    ['reports', 'Reports'],
                    ['versions', 'Versions & Assignments'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer ${
                      activeTab === key
                        ? 'bg-emerald-700 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* TAB 1: DETAILS */}
              {activeTab === 'details' && (
                <form onSubmit={handleSaveDetails} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Module Name</label>
                      <input
                        value={editForm.moduleName || ''}
                        onChange={(e) => setEditForm({ ...editForm, moduleName: e.target.value })}
                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Module Code</label>
                      <input
                        value={editForm.moduleCode || ''}
                        onChange={(e) => setEditForm({ ...editForm, moduleCode: e.target.value })}
                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Module (Cycle-Safe)</label>
                      <select
                        value={editForm.parentId || ''}
                        onChange={(e) => setEditForm({ ...editForm, parentId: e.target.value || null })}
                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                      >
                        <option value="">-- Root Level Module --</option>
                        {allModules
                          .filter((m) => m.id !== selectedModule.id)
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.moduleName} ({m.moduleCode})
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Icon</label>
                      <select
                        value={editForm.icon || 'Layers'}
                        onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                      >
                        {[
                          'Layers',
                          'ShieldCheck',
                          'AlertTriangle',
                          'FileCheck2',
                          'ClipboardCheck',
                          'Lock',
                          'ScanEye',
                          'Grid3x3',
                          'CheckSquare',
                          'Wrench',
                          'HardHat',
                          'Flame',
                          'Leaf',
                          'Scale',
                          'Factory',
                        ].map((ic) => (
                          <option key={ic} value={ic}>
                            {ic}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                    <textarea
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={2}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editForm.isActive)}
                        onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                      />
                      <span>Active</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editForm.isVisible)}
                        onChange={(e) => setEditForm({ ...editForm, isVisible: e.target.checked })}
                      />
                      <span>Visible in Sidebar</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editForm.isPublished)}
                        onChange={(e) => setEditForm({ ...editForm, isPublished: e.target.checked })}
                      />
                      <span>Published</span>
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded cursor-pointer"
                  >
                    Save Module Changes
                  </button>
                </form>
              )}

              {/* TAB 2: ROLE PERMISSIONS MATRIX (15-Permission Enterprise RBAC) */}
              {activeTab === 'permissions' && (
                <div className="space-y-3">
                  <div className="bg-emerald-50 border border-emerald-200 rounded px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-950">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>
                        <strong>15-Action Enterprise RBAC Matrix:</strong> Super Admin (Jonathan Thadanki) holds permanent, non-revocable full access across all modules.
                      </span>
                    </div>
                    {!user?.isSuperAdmin && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded shrink-0">
                        <Lock className="w-3 h-3" /> Read-Only View
                      </span>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border border-slate-200">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="p-2 text-left font-semibold sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                            Canonical Role
                          </th>
                          {ALL_ACTIONS.map((a) => (
                            <th key={a} className="p-1.5 text-center font-semibold capitalize whitespace-nowrap">
                              {a}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {roles.map((r) => {
                          const isSuperAdminRole = r.slug === 'super-admin';
                          const permRow = modPerms.find((p) => p.roleId === r.id);
                          const allowed: string[] = isSuperAdminRole
                            ? ALL_ACTIONS
                            : permRow?.allowedActions || [];
                          const disabled = isSuperAdminRole || !user?.isSuperAdmin;

                          return (
                            <tr
                              key={r.id}
                              className={isSuperAdminRole ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}
                            >
                              <td className="p-2 font-medium text-slate-800 whitespace-nowrap sticky left-0 bg-inherit border-r border-slate-100">
                                <div className="flex items-center gap-1.5">
                                  <span>{r.name}</span>
                                  {isSuperAdminRole && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-700 text-white">
                                      <Lock className="w-2.5 h-2.5" /> Locked 15/15
                                    </span>
                                  )}
                                </div>
                              </td>
                              {ALL_ACTIONS.map((act) => (
                                <td key={act} className="p-1.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={allowed.includes(act)}
                                    disabled={disabled}
                                    onChange={() => toggleRolePermission(r.id, r.slug, act)}
                                    title={
                                      isSuperAdminRole
                                        ? 'Sole Super Admin automatically holds all 15 permissions'
                                        : !user?.isSuperAdmin
                                          ? 'Only Sole Super Admin can modify role permissions'
                                          : `Toggle ${act} for ${r.name}`
                                    }
                                    className={
                                      disabled
                                        ? 'cursor-not-allowed accent-emerald-700 opacity-85'
                                        : 'cursor-pointer accent-emerald-700'
                                    }
                                  />
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: CUSTOM FORM BUILDER */}
              {activeTab === 'forms' && (
                <div className="space-y-4">
                  <form onSubmit={handleCreateForm} className="flex gap-2">
                    <input
                      value={newFormName}
                      onChange={(e) => setNewFormName(e.target.value)}
                      placeholder="New custom form title..."
                      className="flex-1 border border-slate-300 rounded px-3 py-1.5 text-xs"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded cursor-pointer"
                    >
                      Create Form
                    </button>
                  </form>

                  {modForms.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {modForms.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setSelectedFormId(f.id)}
                          className={`px-3 py-1 text-xs rounded border cursor-pointer ${
                            selectedFormId === f.id
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-semibold'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          {f.formName} ({f.fields?.length || 0})
                        </button>
                      ))}
                    </div>
                  )}

                  {activeForm && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-3">
                      <form onSubmit={handleAddField} className="space-y-2.5 bg-slate-50 border border-slate-200 rounded p-3">
                        <div className="text-xs font-bold text-slate-800">Add Field to &ldquo;{activeForm.formName}&rdquo;</div>
                        <input
                          required
                          value={fieldLabel}
                          onChange={(e) => setFieldLabel(e.target.value)}
                          placeholder="Field Label (e.g. Harness Inspection Tag)"
                          className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={fieldType}
                            onChange={(e) => setFieldType(e.target.value)}
                            className="border border-slate-300 rounded px-2 py-1.5 text-xs bg-white"
                          >
                            {FIELD_TYPES.map((ft) => (
                              <option key={ft} value={ft}>
                                {ft}
                              </option>
                            ))}
                          </select>
                          <input
                            value={fieldSection}
                            onChange={(e) => setFieldSection(e.target.value)}
                            placeholder="Section Name"
                            className="border border-slate-300 rounded px-2 py-1.5 text-xs bg-white"
                          />
                        </div>
                        {['dropdown', 'multiselect', 'radio'].includes(fieldType) && (
                          <input
                            value={fieldOptions}
                            onChange={(e) => setFieldOptions(e.target.value)}
                            placeholder="Comma-separated options (e.g. Pass, Fail, NA)"
                            className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
                          />
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            value={fieldMinRule}
                            onChange={(e) => setFieldMinRule(e.target.value)}
                            placeholder={fieldType === 'number' ? 'Min Value' : 'Min Length'}
                            className="border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                          />
                          <input
                            type="number"
                            value={fieldMaxRule}
                            onChange={(e) => setFieldMaxRule(e.target.value)}
                            placeholder={fieldType === 'number' ? 'Max Value' : 'Max Length'}
                            className="border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                          />
                        </div>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={fieldRequired}
                            onChange={(e) => setFieldRequired(e.target.checked)}
                          />
                          <span>Mandatory Field</span>
                        </label>
                        <button
                          type="submit"
                          className="w-full py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer"
                        >
                          Add Field
                        </button>
                      </form>

                      <div className="border border-slate-200 rounded p-3 space-y-2">
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Live Form Preview ({activeForm.fields?.length || 0} fields)</span>
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {(activeForm.fields || []).map((fld: any) => (
                            <div
                              key={fld.id}
                              className="flex items-center justify-between border border-slate-200 rounded px-2.5 py-1.5 text-xs"
                            >
                              <div>
                                <span className="font-semibold text-slate-900">{fld.label}</span>
                                {fld.isRequired && <span className="text-red-600 ml-1">*</span>}
                                <span className="ml-2 text-[10px] uppercase text-slate-500">
                                  {fld.fieldType} · {fld.sectionName}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteField(fld.id)}
                                className="text-red-600 hover:underline text-[11px] cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                          {(!activeForm.fields || activeForm.fields.length === 0) && (
                            <div className="text-xs text-slate-400">No fields added yet.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: CHECKLIST BUILDER */}
              {activeTab === 'checklists' && (
                <div className="space-y-4">
                  <form onSubmit={handleCreateChecklist} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      value={newChecklistTitle}
                      onChange={(e) => setNewChecklistTitle(e.target.value)}
                      placeholder="Checklist Title"
                      className="border border-slate-300 rounded px-3 py-1.5 text-xs"
                    />
                    <input
                      value={newChecklistStd}
                      onChange={(e) => setNewChecklistStd(e.target.value)}
                      placeholder="Standard (e.g. BIS / OSHA)"
                      className="border border-slate-300 rounded px-3 py-1.5 text-xs"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded cursor-pointer"
                    >
                      Create Checklist
                    </button>
                  </form>

                  {modChecklists.map((cl) => (
                    <div key={cl.id} className="border border-slate-200 rounded p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-xs text-slate-900">
                          {cl.title} <span className="text-slate-500">({cl.standardCode})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTargetChecklistId(cl.id)}
                          className="text-xs text-emerald-700 font-semibold cursor-pointer"
                        >
                          {targetChecklistId === cl.id ? 'Selected' : 'Select'}
                        </button>
                      </div>
                      <ul className="space-y-1 text-xs text-slate-700 list-disc pl-4">
                        {(cl.items || []).map((it: any) => (
                          <li key={it.id}>{it.questionText}</li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  {targetChecklistId && (
                    <form onSubmit={handleAddQuestion} className="flex gap-2">
                      <input
                        value={newQuestionText}
                        onChange={(e) => setNewQuestionText(e.target.value)}
                        placeholder="Add inspection question..."
                        className="flex-1 border border-slate-300 rounded px-3 py-1.5 text-xs"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer"
                      >
                        Add Question
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* TAB 5: APPROVAL WORKFLOW BUILDER */}
              {activeTab === 'workflows' && (
                <div className="space-y-4">
                  <form onSubmit={handleCreateWorkflow} className="bg-slate-50 border border-slate-200 rounded p-3 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        required
                        value={wfName}
                        onChange={(e) => setWfName(e.target.value)}
                        placeholder="Workflow Name (e.g. 3-Level Hazard Sign-off)"
                        className="border border-slate-300 rounded px-3 py-1.5 text-xs bg-white"
                      />
                      <select
                        value={wfMode}
                        onChange={(e) => setWfMode(e.target.value)}
                        className="border border-slate-300 rounded px-3 py-1.5 text-xs bg-white"
                      >
                        <option value="sequential">Sequential Approval</option>
                        <option value="parallel">Parallel Approval</option>
                        <option value="conditional">Conditional (High-Risk Escalation)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      {wfSteps.map((s, idx) => (
                        <div key={idx} className="grid grid-cols-3 gap-2">
                          <input
                            value={s.stepName}
                            onChange={(e) => {
                              const copy = [...wfSteps];
                              copy[idx].stepName = e.target.value;
                              setWfSteps(copy);
                            }}
                            className="border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                          />
                          <select
                            value={s.approverRoleName}
                            onChange={(e) => {
                              const copy = [...wfSteps];
                              copy[idx].approverRoleName = e.target.value;
                              setWfSteps(copy);
                            }}
                            className="border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                          >
                            {roles.map((r) => (
                              <option key={r.id} value={r.name}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            value={s.slaHours}
                            onChange={(e) => {
                              const copy = [...wfSteps];
                              copy[idx].slaHours = Number(e.target.value);
                              setWfSteps(copy);
                            }}
                            className="border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                            placeholder="SLA hrs"
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setWfSteps([...wfSteps, { stepName: `Level ${wfSteps.length + 1} Sign-off`, approverRoleName: 'Plant Head', slaHours: 12 }])
                        }
                        className="text-xs font-semibold text-emerald-700 cursor-pointer"
                      >
                        + Add Approval Level
                      </button>
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer"
                    >
                      Save Workflow
                    </button>
                  </form>

                  <div className="space-y-2">
                    {modWorkflows.map((wf) => (
                      <div key={wf.id} className="border border-slate-200 rounded p-3 text-xs">
                        <div className="font-bold text-slate-900">
                          {wf.workflowName} <span className="text-slate-500 uppercase">({wf.mode})</span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {(wf.steps || []).map((st: any) => (
                            <span key={st.id} className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded">
                              {st.stepOrder}. {st.stepName} ({st.approverRoleName} · {st.slaHours}h SLA)
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: REPORTS */}
              {activeTab === 'reports' && (
                <div className="space-y-3">
                  <form onSubmit={handleCreateReport} className="flex gap-2">
                    <input
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      placeholder="Report Configuration Name..."
                      className="flex-1 border border-slate-300 rounded px-3 py-1.5 text-xs"
                    />
                    <select
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value)}
                      className="border border-slate-300 rounded px-2 py-1.5 text-xs"
                    >
                      <option value="Summary">Summary</option>
                      <option value="Compliance Audit">Compliance Audit</option>
                      <option value="Trend Analytics">Trend Analytics</option>
                    </select>
                    <button
                      type="submit"
                      className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer"
                    >
                      Save Report
                    </button>
                  </form>
                  {modReports.map((r) => (
                    <div key={r.id} className="border border-slate-200 rounded px-3 py-2 text-xs flex justify-between">
                      <span className="font-semibold text-slate-900">{r.reportName}</span>
                      <span className="text-slate-500">{r.reportType}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 7: VERSIONS & ASSIGNMENTS */}
              {activeTab === 'versions' && (
                <div className="space-y-5">
                  <div className="border border-slate-200 rounded p-3.5 space-y-3">
                    <div className="text-xs font-bold text-slate-900">
                      Facility &amp; Department Scope Assignments
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="font-semibold text-slate-700 mb-1">Assigned Plants (blank = all plants)</div>
                        <div className="space-y-1 max-h-36 overflow-y-auto border border-slate-200 rounded p-2">
                          {hierarchy.plants.map((p) => (
                            <label key={p.id} className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={assignedPlantIds.includes(p.id)}
                                onChange={(e) =>
                                  setAssignedPlantIds((prev) =>
                                    e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                                  )
                                }
                              />
                              <span>{p.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-700 mb-1">Assigned Departments</div>
                        <div className="space-y-1 max-h-36 overflow-y-auto border border-slate-200 rounded p-2">
                          {hierarchy.departments.map((d) => (
                            <label key={d.id} className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={assignedDeptIds.includes(d.id)}
                                onChange={(e) =>
                                  setAssignedDeptIds((prev) =>
                                    e.target.checked ? [...prev, d.id] : prev.filter((id) => id !== d.id)
                                  )
                                }
                              />
                              <span>{d.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await apiFetch(`/api/modules/${selectedModule.id}/assignments`, {
                          method: 'PUT',
                          body: JSON.stringify({ plantIds: assignedPlantIds, departmentIds: assignedDeptIds }),
                        });
                        await refreshSession();
                        notify('ok', 'Plant & department assignments saved.');
                      }}
                      className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer"
                    >
                      Save Scope Assignments
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded p-3.5 space-y-2">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-slate-700" />
                      <span>Configuration Version History ({modVersions.length})</span>
                    </div>
                    <div className="divide-y divide-slate-100 text-xs">
                      {modVersions.map((v) => (
                        <div key={v.id} className="py-2 flex items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-slate-900 tabular-nums">v{v.versionNumber}</span> ·{' '}
                            <span className="text-slate-700">{v.changeSummary}</span>
                            <div className="text-[11px] text-slate-400">
                              {new Date(v.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              await apiFetch(`/api/modules/${selectedModule.id}/versions/${v.id}/restore`, {
                                method: 'POST',
                              });
                              await loadAll();
                              await refreshSession();
                              notify('ok', `Restored module configuration to v${v.versionNumber}.`);
                            }}
                            className="px-2.5 py-1 border border-slate-300 rounded text-[11px] hover:bg-slate-100 cursor-pointer"
                          >
                            Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Module Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateModule} className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-5 space-y-3">
            <h3 className="font-display font-bold text-lg text-slate-900">
              {createParentId ? 'Add Child / Sub-Child Module' : 'Create New Root Module'}
            </h3>
            {createParentId && (
              <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2.5 py-1.5">
                Parent: {allModules.find((m) => m.id === createParentId)?.moduleName}
              </div>
            )}
            <input
              required
              value={newModName}
              onChange={(e) => setNewModName(e.target.value)}
              placeholder="Module Name (e.g. Crane & Hoist Inspections)"
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
            <input
              value={newModCode}
              onChange={(e) => setNewModCode(e.target.value)}
              placeholder="Optional Module Code (auto-generated if blank)"
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-mono"
            />
            <textarea
              value={newModDesc}
              onChange={(e) => setNewModDesc(e.target.value)}
              placeholder="Module purpose & operational scope"
              rows={2}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newModIcon}
                onChange={(e) => setNewModIcon(e.target.value)}
                className="border border-slate-300 rounded px-2.5 py-2 text-sm"
              >
                {['Layers', 'ShieldCheck', 'ClipboardCheck', 'Wrench', 'HardHat', 'Flame', 'Leaf', 'Factory'].map((ic) => (
                  <option key={ic} value={ic}>
                    {ic}
                  </option>
                ))}
              </select>
              <input
                type="color"
                value={newModColor}
                onChange={(e) => setNewModColor(e.target.value)}
                className="w-full h-9 border border-slate-300 rounded px-1"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-1.5 text-xs border border-slate-300 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded"
              >
                Create Module
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
