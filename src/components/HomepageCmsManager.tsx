import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Globe,
  Layers,
  Mail,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { apiFetch } from '../lib/api';

const ICON_OPTIONS = [
  'ShieldCheck',
  'Layers',
  'HardHat',
  'ClipboardCheck',
  'Globe',
  'FlaskConical',
  'Leaf',
  'Zap',
  'HeartPulse',
  'Flame',
  'Award',
  'Scale',
  'Cpu',
  'Server',
  'Factory',
  'Building2',
  'Package',
  'Wrench',
  'Truck',
];

export function HomepageCmsManager() {
  const [subTab, setSubTab] = useState<'services' | 'industries' | 'site' | 'demos'>('services');
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<any[]>([]);
  const [industries, setIndustries] = useState<any[]>([]);
  const [siteConfig, setSiteConfig] = useState<Record<string, any>>({});
  const [demoRequests, setDemoRequests] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Service Form State
  const [editingService, setEditingService] = useState<any | null>(null);
  const [svcForm, setSvcForm] = useState({
    title: '',
    shortDescription: '',
    icon: 'ShieldCheck',
    accentColor: '#FFC629',
    subcategoriesText: '',
    complianceNote: '',
  });

  // Industry Form State
  const [editingIndustry, setEditingIndustry] = useState<any | null>(null);
  const [indForm, setIndForm] = useState({
    name: '',
    shortName: '',
    description: '',
    imageUrl: '/assets/homepage/ind_global_industries.jpg',
    icon: 'Factory',
    accentColor: '#00BFFF',
    capabilitiesText: '',
    recommendedModulesText: '',
    isExpandable: false,
  });

  const [pendingDelete, setPendingDelete] = useState<{
    kind: 'service' | 'industry';
    id: string;
    label: string;
    warning?: string;
  } | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/cms/all');
      setServices(data.services || []);
      setIndustries(data.industries || []);
      setSiteConfig(data.siteConfig || {});
      setDemoRequests(data.demoRequests || []);
    } catch (err: any) {
      setFeedback({ type: 'err', text: err?.message || 'Failed to load homepage CMS.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const notify = (text: string, type: 'ok' | 'err' = 'ok') => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 5000);
  };

  // ---- SERVICES CRUD ----
  const saveService = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: svcForm.title,
      shortDescription: svcForm.shortDescription,
      icon: svcForm.icon,
      accentColor: svcForm.accentColor,
      complianceNote: svcForm.complianceNote || null,
      subcategories: svcForm.subcategoriesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    try {
      if (editingService) {
        await apiFetch(`/api/cms/services/${editingService.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        notify('Service category updated on live homepage.');
      } else {
        await apiFetch('/api/cms/services', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        notify('New service category published to homepage.');
      }
      setEditingService(null);
      setSvcForm({
        title: '',
        shortDescription: '',
        icon: 'ShieldCheck',
        accentColor: '#FFC629',
        subcategoriesText: '',
        complianceNote: '',
      });
      await loadAll();
    } catch (err: any) {
      notify(err?.message || 'Could not save service category.', 'err');
    }
  };

  const toggleServiceVisibility = async (svc: any) => {
    await apiFetch(`/api/cms/services/${svc.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isVisible: !svc.isVisible }),
    });
    await loadAll();
    notify(`"${svc.title}" is now ${svc.isVisible ? 'hidden from' : 'visible on'} the public homepage.`);
  };

  const moveService = async (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= services.length) return;
    const reordered = [...services];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    setServices(reordered);
    await apiFetch('/api/cms/services/reorder', {
      method: 'POST',
      body: JSON.stringify({ orderedIds: reordered.map((s) => s.id) }),
    });
    notify('Homepage service display order updated.');
  };

  // ---- INDUSTRIES CRUD ----
  const saveIndustry = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: indForm.name,
      shortName: indForm.shortName || indForm.name,
      description: indForm.description,
      imageUrl: indForm.imageUrl,
      icon: indForm.icon,
      accentColor: indForm.accentColor,
      isExpandable: indForm.isExpandable,
      capabilities: indForm.capabilitiesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      recommendedModules: indForm.recommendedModulesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    try {
      if (editingIndustry) {
        await apiFetch(`/api/cms/industries/${editingIndustry.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        notify('Industry card updated on live homepage.');
      } else {
        await apiFetch('/api/cms/industries', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        notify('New industry added to live homepage.');
      }
      setEditingIndustry(null);
      setIndForm({
        name: '',
        shortName: '',
        description: '',
        imageUrl: '/assets/homepage/ind_global_industries.jpg',
        icon: 'Factory',
        accentColor: '#00BFFF',
        capabilitiesText: '',
        recommendedModulesText: '',
        isExpandable: false,
      });
      await loadAll();
    } catch (err: any) {
      notify(err?.message || 'Could not save industry.', 'err');
    }
  };

  const handleIndustryImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setIndForm((prev) => ({ ...prev, imageUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleIndustryVisibility = async (ind: any) => {
    await apiFetch(`/api/cms/industries/${ind.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isVisible: !ind.isVisible }),
    });
    await loadAll();
    notify(`"${ind.name}" is now ${ind.isVisible ? 'hidden from' : 'visible on'} the public homepage.`);
  };

  const moveIndustry = async (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= industries.length) return;
    const reordered = [...industries];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    setIndustries(reordered);
    await apiFetch('/api/cms/industries/reorder', {
      method: 'POST',
      body: JSON.stringify({ orderedIds: reordered.map((i) => i.id) }),
    });
    notify('Homepage industry display order updated.');
  };

  const executeDelete = async (force: boolean) => {
    if (!pendingDelete) return;
    const url =
      pendingDelete.kind === 'service'
        ? `/api/cms/services/${pendingDelete.id}${force ? '?force=true' : ''}`
        : `/api/cms/industries/${pendingDelete.id}${force ? '?force=true' : ''}`;
    try {
      await apiFetch(url, { method: 'DELETE' });
      setPendingDelete(null);
      await loadAll();
      notify(`Deleted "${pendingDelete.label}" from homepage CMS.`);
    } catch (err: any) {
      if (!force) {
        setPendingDelete((prev) => (prev ? { ...prev, warning: err?.message } : null));
      } else {
        notify(err?.message || 'Delete failed.', 'err');
      }
    }
  };

  const saveSiteSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/cms/site-config', {
        method: 'PATCH',
        body: JSON.stringify(siteConfig),
      });
      notify('Public homepage headlines, motto, branding & contact settings saved.');
    } catch (err: any) {
      notify(err?.message || 'Failed to save homepage settings.', 'err');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 text-white rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="font-display font-bold text-base">
            Dynamic Homepage CMS — Services, Industries &amp; Brand Content
          </div>
          <div className="text-xs text-slate-300">
            Add, edit, delete (with dependency checks), reorder, upload images, and toggle visibility on the live public website without editing source code.
          </div>
        </div>
        <a
          href="/"
          className="px-3 py-1.5 text-xs font-bold bg-amber-400 text-slate-950 rounded hover:brightness-110 whitespace-nowrap shrink-0"
        >
          View Live Homepage &rarr;
        </a>
      </div>

      {feedback && (
        <div
          className={`text-xs px-4 py-2.5 rounded border ${
            feedback.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['services', `Services & Subcategories (${services.length})`, Layers],
            ['industries', `Industries We Serve (${industries.length})`, Globe],
            ['site', 'Hero Copy, Motto & Branding', Save],
            ['demos', `Demo & Contact Leads (${demoRequests.length})`, Mail],
          ] as const
        ).map(([k, label, Icon]) => (
          <button
            key={k}
            type="button"
            onClick={() => setSubTab(k)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded cursor-pointer ${
              subTab === k
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Dependency-Checked Delete Confirmation Modal */}
      {pendingDelete && (
        <div className="bg-red-50 border border-red-300 rounded-md p-4 space-y-2.5 text-xs">
          <div className="font-bold text-red-950">
            Confirm Deletion: {pendingDelete.label}
          </div>
          {pendingDelete.warning ? (
            <div className="text-red-800">{pendingDelete.warning}</div>
          ) : (
            <div className="text-red-800">
              Dependency check will run before removal. You can also hide this card without deleting it.
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => executeDelete(Boolean(pendingDelete.warning))}
              className="px-3 py-1.5 font-semibold bg-red-600 text-white rounded cursor-pointer"
            >
              {pendingDelete.warning ? 'Force Delete Permanently' : 'Run Dependency Check & Delete'}
            </button>
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              className="px-3 py-1.5 font-semibold bg-white border border-slate-300 text-slate-700 rounded cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-md">
          Loading Homepage CMS records from Cloud SQL...
        </div>
      ) : null}

      {/* TAB 1: SERVICES CMS */}
      {!loading && subTab === 'services' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <form
            onSubmit={saveService}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-slate-900">
                {editingService ? `Edit Service: ${editingService.title}` : 'Add Unlimited New Service Category'}
              </div>
              {editingService && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingService(null);
                    setSvcForm({
                      title: '',
                      shortDescription: '',
                      icon: 'ShieldCheck',
                      accentColor: '#FFC629',
                      subcategoriesText: '',
                      complianceNote: '',
                    });
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Service Category Title *</label>
              <input
                required
                value={svcForm.title}
                onChange={(e) => setSvcForm({ ...svcForm, title: e.target.value })}
                placeholder="e.g. 13. Process Safety Management (PSM)"
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Short Description *</label>
              <textarea
                required
                rows={2}
                value={svcForm.shortDescription}
                onChange={(e) => setSvcForm({ ...svcForm, shortDescription: e.target.value })}
                placeholder="Concise overview shown on the homepage card"
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Icon</label>
                <select
                  value={svcForm.icon}
                  onChange={(e) => setSvcForm({ ...svcForm, icon: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                >
                  {ICON_OPTIONS.map((ic) => (
                    <option key={ic} value={ic}>{ic}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Accent Color</label>
                <input
                  type="color"
                  value={svcForm.accentColor}
                  onChange={(e) => setSvcForm({ ...svcForm, accentColor: e.target.value })}
                  className="w-full h-8 border border-slate-300 rounded px-1 cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subcategories (one per line — unlimited)
              </label>
              <textarea
                rows={6}
                value={svcForm.subcategoriesText}
                onChange={(e) => setSvcForm({ ...svcForm, subcategoriesText: e.target.value })}
                placeholder={'Process Hazard Analysis\nManagement of Change\nPre-Startup Safety Review'}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Optional Compliance / Jurisdiction Note
              </label>
              <input
                value={svcForm.complianceNote}
                onChange={(e) => setSvcForm({ ...svcForm, complianceNote: e.target.value })}
                placeholder="e.g. Configurable per country, state, and effective date"
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded cursor-pointer inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{editingService ? 'Update Service Category' : 'Add Service to Homepage'}</span>
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md divide-y divide-slate-100">
            <div className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-slate-500">
              Active Homepage Services (Reorder, Edit, Hide, or Delete)
            </div>
            {services.map((svc, idx) => (
              <div key={svc.id} className="p-3.5 flex items-start justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400">#{idx + 1}</span>
                    <span className="font-bold text-slate-900">{svc.title}</span>
                    {!svc.isVisible && (
                      <span className="text-[10px] font-semibold text-amber-700">Hidden</span>
                    )}
                  </div>
                  <div className="text-slate-600 mt-0.5 line-clamp-2">{svc.shortDescription}</div>
                  <div className="text-[11px] text-slate-400 mt-1 tabular-nums">
                    {(svc.subcategories || []).length} subcategories · Icon: {svc.icon}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveService(idx, -1)}
                    disabled={idx === 0}
                    className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveService(idx, 1)}
                    disabled={idx === services.length - 1}
                    className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleServiceVisibility(svc)}
                    className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
                    title={svc.isVisible ? 'Hide from Homepage' : 'Show on Homepage'}
                  >
                    {svc.isVisible ? <Eye className="w-3.5 h-3.5 text-emerald-700" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingService(svc);
                      setSvcForm({
                        title: svc.title || '',
                        shortDescription: svc.shortDescription || '',
                        icon: svc.icon || 'ShieldCheck',
                        accentColor: svc.accentColor || '#FFC629',
                        subcategoriesText: (svc.subcategories || []).join('\n'),
                        complianceNote: svc.complianceNote || '',
                      });
                    }}
                    className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
                    title="Edit Service"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete({ kind: 'service', id: svc.id, label: svc.title })}
                    className="p-1.5 border border-red-200 rounded hover:bg-red-50 cursor-pointer"
                    title="Delete Service"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: INDUSTRIES CMS */}
      {!loading && subTab === 'industries' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <form
            onSubmit={saveIndustry}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-slate-900">
                {editingIndustry ? `Edit Industry: ${editingIndustry.name}` : 'Add Unlimited New Industry'}
              </div>
              {editingIndustry && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingIndustry(null);
                    setIndForm({
                      name: '',
                      shortName: '',
                      description: '',
                      imageUrl: '/assets/homepage/ind_global_industries.jpg',
                      icon: 'Factory',
                      accentColor: '#00BFFF',
                      capabilitiesText: '',
                      recommendedModulesText: '',
                      isExpandable: false,
                    });
                  }}
                  className="text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Industry Name *</label>
                <input
                  required
                  value={indForm.name}
                  onChange={(e) => setIndForm({ ...indForm, name: e.target.value })}
                  placeholder="e.g. Aviation & Aerospace"
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Short Card Label *</label>
                <input
                  required
                  value={indForm.shortName}
                  onChange={(e) => setIndForm({ ...indForm, shortName: e.target.value })}
                  placeholder="e.g. Aviation"
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Industry Description *</label>
              <textarea
                required
                rows={2}
                value={indForm.description}
                onChange={(e) => setIndForm({ ...indForm, description: e.target.value })}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Icon</label>
                <select
                  value={indForm.icon}
                  onChange={(e) => setIndForm({ ...indForm, icon: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                >
                  {ICON_OPTIONS.map((ic) => (
                    <option key={ic} value={ic}>{ic}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Accent Color</label>
                <input
                  type="color"
                  value={indForm.accentColor}
                  onChange={(e) => setIndForm({ ...indForm, accentColor: e.target.value })}
                  className="w-full h-8 border border-slate-300 rounded px-1 cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Industry Image URL or Upload</label>
              <input
                value={indForm.imageUrl}
                onChange={(e) => setIndForm({ ...indForm, imageUrl: e.target.value })}
                placeholder="/assets/homepage/ind_global_industries.jpg"
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs mb-1.5"
              />
              <input
                type="file"
                accept="image/*"
                onChange={handleIndustryImageUpload}
                className="text-[11px] text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sectors / Safety Scope (one per line)
              </label>
              <textarea
                rows={5}
                value={indForm.capabilitiesText}
                onChange={(e) => setIndForm({ ...indForm, capabilitiesText: e.target.value })}
                placeholder={'Ramp Safety\nFuel Storage & Fire\nHangar Maintenance'}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Recommended Platform Modules (comma-separated)
              </label>
              <input
                value={indForm.recommendedModulesText}
                onChange={(e) => setIndForm({ ...indForm, recommendedModulesText: e.target.value })}
                placeholder="Digital PTW, AI Hazard Observation, ISO 45001 Audits"
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={indForm.isExpandable}
                onChange={(e) => setIndForm({ ...indForm, isExpandable: e.target.checked })}
              />
              <span>Full-width expandable multi-sector category card</span>
            </label>

            <button
              type="submit"
              className="w-full py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded cursor-pointer inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{editingIndustry ? 'Update Industry Card' : 'Publish Industry to Homepage'}</span>
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md divide-y divide-slate-100">
            <div className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-slate-500">
              Active Homepage Industries (Reorder, Edit, Upload Image, Hide, or Delete)
            </div>
            {industries.map((ind, idx) => (
              <div key={ind.id} className="p-3.5 flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-3 min-w-0">
                  <img
                    src={ind.imageUrl || '/assets/homepage/ind_global_industries.jpg'}
                    alt={ind.name}
                    className="w-14 h-11 rounded object-cover border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400">#{idx + 1}</span>
                      <span className="font-bold text-slate-900">{ind.name}</span>
                      {!ind.isVisible && <span className="text-[10px] font-semibold text-amber-700">Hidden</span>}
                    </div>
                    <div className="text-slate-600 mt-0.5 line-clamp-2">{ind.description}</div>
                    <div className="text-[11px] text-slate-400 mt-1 tabular-nums">
                      {(ind.capabilities || []).length} sectors · Short label: {ind.shortName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveIndustry(idx, -1)}
                    disabled={idx === 0}
                    className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveIndustry(idx, 1)}
                    disabled={idx === industries.length - 1}
                    className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleIndustryVisibility(ind)}
                    className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
                  >
                    {ind.isVisible ? <Eye className="w-3.5 h-3.5 text-emerald-700" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingIndustry(ind);
                      setIndForm({
                        name: ind.name || '',
                        shortName: ind.shortName || '',
                        description: ind.description || '',
                        imageUrl: ind.imageUrl || '/assets/homepage/ind_global_industries.jpg',
                        icon: ind.icon || 'Factory',
                        accentColor: ind.accentColor || '#00BFFF',
                        capabilitiesText: (ind.capabilities || []).join('\n'),
                        recommendedModulesText: (ind.recommendedModules || []).join(', '),
                        isExpandable: Boolean(ind.isExpandable),
                      });
                    }}
                    className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete({ kind: 'industry', id: ind.id, label: ind.name })}
                    className="p-1.5 border border-red-200 rounded hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: EDITABLE HOMEPAGE TEXT, MOTTO & BRANDING */}
      {!loading && subTab === 'site' && (
        <form onSubmit={saveSiteSettings} className="bg-white border border-slate-200 rounded-md p-5 space-y-4 max-w-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Website / App Name</label>
              <input
                value={siteConfig.brandName || ''}
                onChange={(e) => setSiteConfig({ ...siteConfig, brandName: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company Subtitle</label>
              <input
                value={siteConfig.companyName || ''}
                onChange={(e) => setSiteConfig({ ...siteConfig, companyName: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tagline</label>
              <input
                value={siteConfig.tagline || ''}
                onChange={(e) => setSiteConfig({ ...siteConfig, tagline: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Gold Banner Motto</label>
              <input
                value={siteConfig.motto || ''}
                onChange={(e) => setSiteConfig({ ...siteConfig, motto: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Developer, Creator &amp; Owner Name</label>
              <input
                value={siteConfig.ownerName || ''}
                onChange={(e) => setSiteConfig({ ...siteConfig, ownerName: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Email</label>
              <input
                value={siteConfig.contactEmail || ''}
                onChange={(e) => setSiteConfig({ ...siteConfig, contactEmail: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Contact Phone Numbers</label>
              <input
                value={siteConfig.contactPhones || ''}
                onChange={(e) => setSiteConfig({ ...siteConfig, contactPhones: e.target.value })}
                placeholder="+91 9133 661 933 / +91 81 84 83 40 60 / +91 81 86 80 88 48"
                className="w-full border border-slate-300 rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="text-xs space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hero Main Mission Heading</label>
              <input
                value={siteConfig.heroMissionHeadline || ''}
                onChange={(e) => setSiteConfig({ ...siteConfig, heroMissionHeadline: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hero Supporting Description</label>
              <textarea
                rows={2}
                value={siteConfig.heroDescription || ''}
                onChange={(e) => setSiteConfig({ ...siteConfig, heroDescription: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hero Subheading</label>
              <textarea
                rows={2}
                value={siteConfig.heroSubheading || ''}
                onChange={(e) => setSiteConfig({ ...siteConfig, heroSubheading: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded cursor-pointer"
          >
            Save Live Homepage Configuration
          </button>
        </form>
      )}

      {/* TAB 4: DEMO REQUESTS */}
      {!loading && subTab === 'demos' && (
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 font-bold text-sm text-slate-900">
            Submitted Enterprise Demo &amp; Contact Requests ({demoRequests.length})
          </div>
          {demoRequests.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No demo requests submitted yet from the public homepage.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-3 py-2">Contact</th>
                    <th className="px-3 py-2">Company &amp; Industry</th>
                    <th className="px-3 py-2">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {demoRequests.map((req) => (
                    <tr key={req.id}>
                      <td className="px-4 py-2.5 text-slate-500 tabular-nums whitespace-nowrap">
                        {new Date(req.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-900">{req.fullName}</div>
                        <div className="text-slate-500">{req.workEmail} {req.phone ? `· ${req.phone}` : ''}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-900">{req.companyName}</div>
                        <div className="text-slate-500">{req.industry}</div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-700 max-w-md">{req.message || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
