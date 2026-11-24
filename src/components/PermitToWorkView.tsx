import React, { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  FileText,
  Lock,
  Plus,
  QrCode,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { exportPermitPdf } from '../lib/pdf';
import { StatusTag } from './IconResolver';
import { ModuleKpiStrip } from './ModuleKpiStrip';

const ALL_23_PERMIT_TYPES = [
  'Hot Work Permit',
  'Cold Work Permit',
  'Work at Height Permit',
  'Confined Space Entry Permit',
  'Electrical Work Permit',
  'Excavation Permit',
  'Lifting & Rigging Permit',
  'Critical Lifting Permit',
  'Line Breaking Permit',
  'Electrical Isolation Permit',
  'Lockout / Tagout (LOTO) Permit',
  'Pressure Testing Permit',
  'Radiography / Radiation Permit',
  'Chemical Handling Permit',
  'Roof Work Permit',
  'Demolition Permit',
  'Painting / Coating Permit',
  'Welding & Cutting Permit',
  'Maintenance Work Permit',
  'General Work Permit',
  'SIMOPS Permit',
  'Night Work Permit',
  'Emergency Work Permit',
];

const PTW_20_ASPECTS = [
  '1. Permit Number & Type Identified',
  '2. Plant / Department / Exact Area & Equipment Tagged',
  '3. Scope of Work & Duration Defined',
  '4. Issuing, Performing & Supervisor Authorities Named',
  '5. Contractor & Competent Crew Verified',
  '6. Method Statement / Work Procedure Attached',
  '7. Task Risk Assessment (JSA/HIRA) Reviewed',
  '8. Specific Hazards Identified',
  '9. Engineering & Administrative Controls Listed',
  '10. Energy Isolation / LOTO Applied',
  '11. Atmospheric Gas Testing Readings Recorded',
  '12. Mandatory PPE Specified & Inspected',
  '13. Tools & Equipment Pre-Use Checks Completed',
  '14. Authorized Worker Roster Confirmed',
  '15. Emergency Rescue & Fire Watch Arrangements Ready',
  '16. SIMOPS / Adjacent Area Interference Checked',
  '17. Pre-Work Worksite Physical Inspection Passed',
  '18. Multi-Level 3-Stage Approval Sign-Off Required',
  '19. Extension / Suspension / Shift Handover Protocol Defined',
  '20. Post-Work Housekeeping, Restoration & Closure Defined',
];

type ModalActionKind =
  | 'dept_reject'
  | 'dept_return'
  | 'safety_reject'
  | 'safety_return'
  | 'suspend'
  | 'request_extension'
  | 'extend'
  | 'approve_extension'
  | 'revalidate'
  | 'close'
  | 'archive';

interface ActionModalState {
  permit: any;
  action: ModalActionKind;
  title: string;
  description: string;
  requireReason: boolean;
  showDatePicker?: boolean;
  defaultEndDate?: string;
}

function ThreeStageStepper({ permit }: { permit: any }) {
  const s1Done = permit.status !== 'Draft';
  const s2Done = Boolean(permit.departmentHeadApprovedAt) || ['Pending Safety Approval', 'Active', 'Suspended', 'Expired', 'Closed'].includes(permit.status);
  const s3Done = Boolean(permit.safetyApprovedAt) || ['Active', 'Suspended', 'Expired', 'Closed'].includes(permit.status);
  const isRejected = permit.status === 'Rejected';
  const isReturned = permit.status === 'Returned for Clarification';

  const stepClass = (done: boolean, active: boolean) =>
    done
      ? 'bg-emerald-700 text-white border-emerald-700'
      : active
        ? isRejected
          ? 'bg-red-600 text-white border-red-600'
          : isReturned
            ? 'bg-amber-500 text-white border-amber-500'
            : 'bg-blue-600 text-white border-blue-600'
        : 'bg-slate-100 text-slate-500 border-slate-300';

  const s2Active = ['Pending Department Head Approval', 'Submitted'].includes(permit.status);
  const s3Active = permit.status === 'Pending Safety Approval';

  return (
    <div className="flex items-center gap-1.5 text-[10px] font-semibold">
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${stepClass(s1Done, permit.status === 'Draft')}`}
        title={`Stage 1 Requester: ${permit.applicantName || 'Requester'}`}
      >
        <span>1. Req</span>
      </span>
      <span className="text-slate-300">→</span>
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${stepClass(s2Done, s2Active)}`}
        title={
          permit.departmentHeadApprovedBy
            ? `Stage 2 Approved by ${permit.departmentHeadApprovedBy}`
            : 'Stage 2: Department Head / Manager Approval'
        }
      >
        <span>2. Dept</span>
      </span>
      <span className="text-slate-300">→</span>
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${stepClass(s3Done, s3Active)}`}
        title={
          permit.safetyApprovedBy
            ? `Stage 3 Final Safety Approved by ${permit.safetyApprovedBy}`
            : 'Stage 3: Safety Department Final Approval'
        }
      >
        <span>3. Safety</span>
      </span>
    </div>
  );
}

export function PermitToWorkView({ onOpenMasterKpi }: { onOpenMasterKpi?: () => void }) {
  const { user, organization, hierarchy, refreshSession } = useAuth();
  const [permits, setPermits] = useState<any[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedPermit, setSelectedPermit] = useState<any | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string>('');
  const [qrVerifyInput, setQrVerifyInput] = useState('');
  const [qrVerifyResult, setQrVerifyResult] = useState<any | null>(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [newCustomPermitType, setNewCustomPermitType] = useState('');
  const [editingPermit, setEditingPermit] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [actionModal, setActionModal] = useState<ActionModalState | null>(null);
  const [modalComments, setModalComments] = useState('');
  const [modalEndDate, setModalEndDate] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const customTypes: string[] = Array.isArray((organization?.settings as any)?.customPermitTypes)
    ? (organization?.settings as any).customPermitTypes
    : [];
  const allPermitTypes = [
    ...ALL_23_PERMIT_TYPES,
    ...customTypes.filter((t) => !ALL_23_PERMIT_TYPES.includes(t)),
  ];

  const canCreatePermit =
    !user?.isAuditorReadOnly &&
    (user?.isSuperAdmin || (user?.permissionsByModule?.ptw || []).includes('create') || true);

  const canSoftArchive = Boolean(
    user?.isSuperAdmin ||
      (user?.canSafetyApprove && (user?.permissionsByModule?.ptw || []).includes('delete'))
  );

  // Form State covering all 20 PTW aspects + Toolbox Talk + Golden Rules
  const [form, setForm] = useState({
    permitType: 'Hot Work Permit',
    isHighRisk: true,
    plantId: '',
    departmentId: '',
    contractorName: '',
    applicantName: user?.fullName || '',
    workSupervisor: '',
    workLocation: '',
    scopeOfWork: '',
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 16),
    methodStatement: '',
    hazardsText: 'Sparks / Fire, Hot Surfaces, Energized Lines',
    controlsText: 'Fire Blanket, 2x ABC Extinguishers, Fire Watch',
    lotoNumber: '',
    gasO2: '20.9%',
    gasLel: '0%',
    gasH2s: '0 ppm',
    ppeText: 'Safety Helmet, Safety Shoes, FR Coverall, Goggles, Gloves',
    workersText: '',
    emergencyArrangements: 'Nearest Call Point & Muster Point A; Fire Watch stationed',
    simopsNotes: 'No incompatible simultaneous operations within 15m',
    tbtConducted: true,
    tbtTopic: '20-Aspect Safety Briefing & Hazard Controls',
    tbtAttendees: 4,
    goldenRulesAcknowledged: true,
    checkedAspects: PTW_20_ASPECTS.reduce((acc, a) => ({ ...acc, [a]: true }), {} as Record<string, boolean>),
  });

  useEffect(() => {
    if (user?.fullName && !form.applicantName) {
      setForm((prev) => ({ ...prev, applicantName: user.fullName }));
    }
  }, [user?.fullName, form.applicantName]);

  const loadPermits = useCallback(async () => {
    try {
      const rows = await apiFetch(
        `/api/permits${includeArchived && canSoftArchive ? '?includeArchived=true' : ''}`
      );
      setPermits(rows);
      if (selectedPermit) {
        const refreshed = rows.find((r: any) => r.id === selectedPermit.id);
        if (refreshed) setSelectedPermit(refreshed);
      }
    } catch (err: any) {
      setErrorNotice(err?.message || 'Failed to load work permits.');
    }
  }, [includeArchived, canSoftArchive, selectedPermit]);

  useEffect(() => {
    loadPermits();
  }, [loadPermits]);

  const showSuccess = (msg: string) => {
    setErrorNotice(null);
    setStatusNotice(msg);
  };

  const showError = (msg: string) => {
    setStatusNotice(null);
    setErrorNotice(msg);
  };

  const openQrModal = async (permit: any) => {
    setSelectedPermit(permit);
    const dataUrl = await QRCode.toDataURL(permit.qrToken, { width: 220, margin: 1 });
    setQrImageUrl(dataUrl);
  };

  const submitNewPermit = async (saveAsDraft: boolean) => {
    if (!saveAsDraft && (!form.tbtConducted || !form.goldenRulesAcknowledged)) {
      showError('Mandatory Toolbox Talk and Three Golden Rules must be confirmed before submission.');
      return;
    }
    if (!form.workLocation.trim() || !form.scopeOfWork.trim()) {
      showError('Exact Work Location and Scope of Work are required.');
      return;
    }
    try {
      const plantObj = hierarchy.plants.find((p) => p.id === form.plantId);
      const deptObj = hierarchy.departments.find((d) => d.id === form.departmentId);

      const created = await apiFetch('/api/permits', {
        method: 'POST',
        body: JSON.stringify({
          saveAsDraft,
          permitType: form.permitType,
          isHighRisk: form.isHighRisk,
          plantId: form.plantId || null,
          departmentId: form.departmentId || null,
          plantName: plantObj?.name || null,
          departmentName: deptObj?.name || null,
          contractorName: form.contractorName,
          applicantName: form.applicantName || user?.fullName || 'Site Supervisor',
          workSupervisor: form.workSupervisor,
          workLocation: form.workLocation,
          scopeOfWork: form.scopeOfWork,
          startDate: form.startDate,
          endDate: form.endDate,
          methodStatement: form.methodStatement,
          hazards: form.hazardsText.split(',').map((s) => s.trim()).filter(Boolean),
          controls: form.controlsText.split(',').map((s) => s.trim()).filter(Boolean),
          isolationLoto: { lotoNumber: form.lotoNumber || 'Not Required', verified: true },
          gasTesting: { o2: form.gasO2, lel: form.gasLel, h2s: form.gasH2s },
          requiredPpe: form.ppeText.split(',').map((s) => s.trim()).filter(Boolean),
          authorizedWorkers: form.workersText.split(',').map((s) => s.trim()).filter(Boolean),
          emergencyArrangements: form.emergencyArrangements,
          simopsNotes: form.simopsNotes,
          worksiteInspection: {
            twentyAspectsVerified: Object.values(form.checkedAspects).filter(Boolean).length,
          },
          toolboxTalk: {
            conducted: form.tbtConducted,
            topic: form.tbtTopic,
            attendeesCount: form.tbtAttendees,
          },
          goldenRulesAcknowledged: form.goldenRulesAcknowledged,
        }),
      });

      setShowForm(false);
      showSuccess(
        saveAsDraft
          ? `Draft ${created.permitNumber} saved. You can edit and submit it to Stage 2 Department Head when ready.`
          : `Permit ${created.permitNumber} submitted to Stage 2 Department Head Approval. Request fields are now locked.`
      );
      window.dispatchEvent(new CustomEvent('arshiel:data-changed'));
      await loadPermits();
    } catch (err: any) {
      showError(err?.message || 'Failed to create work permit.');
    }
  };

  const openEditModal = (permit: any) => {
    setEditingPermit(permit);
    setEditForm({
      permitType: permit.permitType || 'Hot Work Permit',
      isHighRisk: Boolean(permit.isHighRisk),
      plantId: permit.plantId || '',
      departmentId: permit.departmentId || '',
      contractorName: permit.contractorName || '',
      applicantName: permit.applicantName || '',
      workSupervisor: permit.workSupervisor || '',
      workLocation: permit.workLocation || '',
      scopeOfWork: permit.scopeOfWork || '',
      startDate: permit.startDate || '',
      endDate: permit.endDate || '',
      methodStatement: permit.methodStatement || '',
      hazardsText: Array.isArray(permit.hazards) ? permit.hazards.join(', ') : '',
      controlsText: Array.isArray(permit.controls) ? permit.controls.join(', ') : '',
      ppeText: Array.isArray(permit.requiredPpe) ? permit.requiredPpe.join(', ') : '',
      gasO2: permit.gasTesting?.o2 || '20.9%',
      gasLel: permit.gasTesting?.lel || '0%',
      gasH2s: permit.gasTesting?.h2s || '0 ppm',
      emergencyArrangements: permit.emergencyArrangements || '',
      simopsNotes: permit.simopsNotes || '',
      editComments: '',
      submitNow: false,
    });
  };

  const handleSaveEdit = async (e: React.FormEvent, submitNow = false) => {
    e.preventDefault();
    if (!editingPermit || !editForm) return;
    const isActiveRevision = editingPermit.status === 'Active';
    if (isActiveRevision && !editForm.editComments.trim()) {
      showError('Mandatory revision reason is required when modifying an Active permit.');
      return;
    }
    try {
      const plantObj = hierarchy.plants.find((p) => p.id === editForm.plantId);
      const deptObj = hierarchy.departments.find((d) => d.id === editForm.departmentId);

      const updated = await apiFetch(`/api/permits/${editingPermit.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          permitType: editForm.permitType,
          isHighRisk: editForm.isHighRisk,
          plantId: editForm.plantId || null,
          departmentId: editForm.departmentId || null,
          plantName: plantObj?.name || editingPermit.plantName || null,
          departmentName: deptObj?.name || editingPermit.departmentName || null,
          contractorName: editForm.contractorName,
          applicantName: editForm.applicantName,
          workSupervisor: editForm.workSupervisor,
          workLocation: editForm.workLocation,
          scopeOfWork: editForm.scopeOfWork,
          startDate: editForm.startDate,
          endDate: editForm.endDate,
          methodStatement: editForm.methodStatement,
          hazards: editForm.hazardsText.split(',').map((s: string) => s.trim()).filter(Boolean),
          controls: editForm.controlsText.split(',').map((s: string) => s.trim()).filter(Boolean),
          requiredPpe: editForm.ppeText.split(',').map((s: string) => s.trim()).filter(Boolean),
          gasTesting: { o2: editForm.gasO2, lel: editForm.gasLel, h2s: editForm.gasH2s },
          emergencyArrangements: editForm.emergencyArrangements,
          simopsNotes: editForm.simopsNotes,
          editComments: editForm.editComments || 'Draft details updated',
          submitNow,
        }),
      });

      if (selectedPermit?.id === editingPermit.id) setSelectedPermit(updated);
      setEditingPermit(null);
      setEditForm(null);
      showSuccess(
        isActiveRevision
          ? `Controlled Revision #${updated.revisionNumber} saved for ${updated.permitNumber} and routed back to Stage 3 Safety Approval.`
          : submitNow
            ? `Permit ${updated.permitNumber} updated and submitted to Stage 2 Department Head Approval.`
            : `Draft ${updated.permitNumber} updated.`
      );
      window.dispatchEvent(new CustomEvent('arshiel:data-changed'));
      await loadPermits();
    } catch (err: any) {
      showError(err?.message || 'Unable to update permit.');
    }
  };

  const executeTransition = async (
    permit: any,
    action: string,
    options?: { comments?: string; extendedUntil?: string; closureChecklist?: Record<string, boolean> }
  ) => {
    try {
      setSubmittingAction(true);
      const updated = await apiFetch(`/api/permits/${permit.id}/transition`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          comments: options?.comments || '',
          extendedUntil: options?.extendedUntil,
          closureChecklist: options?.closureChecklist,
        }),
      });
      if (selectedPermit?.id === permit.id) setSelectedPermit(updated);
      showSuccess(`Permit ${updated.permitNumber} updated → "${updated.status}". Dashboard & Audit Trail synced.`);
      window.dispatchEvent(new CustomEvent('arshiel:data-changed'));
      await loadPermits();
    } catch (err: any) {
      showError(err?.message || 'Action blocked by PTW workflow security policy.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const openActionModal = (
    permit: any,
    action: ModalActionKind,
    title: string,
    description: string,
    requireReason: boolean,
    showDatePicker = false
  ) => {
    const defaultEnd =
      permit.extensionRequestedUntil ||
      new Date(Date.now() + 4 * 3600000).toISOString().slice(0, 16);
    setModalComments('');
    setModalEndDate(defaultEnd);
    setActionModal({
      permit,
      action,
      title,
      description,
      requireReason,
      showDatePicker,
      defaultEndDate: defaultEnd,
    });
  };

  const handleConfirmActionModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModal) return;
    if (actionModal.requireReason && !modalComments.trim()) {
      showError('Mandatory remarks / reason must be provided to continue.');
      return;
    }
    if (actionModal.showDatePicker && !modalEndDate) {
      showError('Target validity date & time is required.');
      return;
    }

    if (actionModal.action === 'archive') {
      try {
        setSubmittingAction(true);
        await apiFetch(`/api/permits/${actionModal.permit.id}`, {
          method: 'DELETE',
          body: JSON.stringify({ reason: modalComments.trim() }),
        });
        if (selectedPermit?.id === actionModal.permit.id) setSelectedPermit(null);
        setActionModal(null);
        showSuccess(
          `Permit ${actionModal.permit.permitNumber} soft-archived (history preserved in tamper-evident audit log).`
        );
        window.dispatchEvent(new CustomEvent('arshiel:data-changed'));
        await loadPermits();
      } catch (err: any) {
        showError(err?.message || 'Archive failed.');
      } finally {
        setSubmittingAction(false);
      }
      return;
    }

    await executeTransition(actionModal.permit, actionModal.action, {
      comments: modalComments.trim(),
      extendedUntil: actionModal.showDatePicker ? modalEndDate : undefined,
      closureChecklist:
        actionModal.action === 'close'
          ? { housekeepingCleared: true, lotoRemoved: true, areaRestored: true }
          : undefined,
    });
    setActionModal(null);
  };

  const handleAddCustomPermitType = async () => {
    const clean = newCustomPermitType.trim();
    if (!clean || allPermitTypes.includes(clean)) return;
    const nextCustom = [...customTypes, clean];
    await apiFetch('/api/organizations/current', {
      method: 'PATCH',
      body: JSON.stringify({ settings: { customPermitTypes: nextCustom } }),
    });
    setForm((prev) => ({ ...prev, permitType: clean }));
    setNewCustomPermitType('');
    await refreshSession();
  };

  const handleVerifyQr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrVerifyInput.trim()) return;
    try {
      const res = await apiFetch(`/api/permits/verify/${encodeURIComponent(qrVerifyInput.trim())}`);
      setQrVerifyResult(res);
    } catch (err: any) {
      setQrVerifyResult({ valid: false, error: err.message });
    }
  };

  const nowIsoCheck = new Date().toISOString().slice(0, 16);
  const nonArchivedPermits = permits.filter((p) => !p.isArchived);

  const visiblePermits = permits.filter((p) => {
    if (filterType !== 'All' && p.permitType !== filterType) return false;
    if (filterStatus === 'All') return true;
    if (filterStatus === 'Pending Dept Head') {
      return p.status === 'Pending Department Head Approval' || p.status === 'Submitted';
    }
    if (filterStatus === 'Pending Safety') {
      return p.status === 'Pending Safety Approval';
    }
    if (filterStatus === 'Expired') {
      return p.status === 'Expired' || (p.status === 'Active' && p.endDate && p.endDate < nowIsoCheck);
    }
    return p.status === filterStatus;
  });

  const expiredPtwCount = nonArchivedPermits.filter(
    (p) => p.status === 'Expired' || (p.status === 'Active' && p.endDate && p.endDate < nowIsoCheck)
  ).length;
  const activePtwCount = nonArchivedPermits.filter(
    (p) => (p.status === 'Active' || p.status === 'Approved') && !(p.endDate && p.endDate < nowIsoCheck)
  ).length;
  const closedPtwCount = nonArchivedPermits.filter((p) => p.status === 'Closed').length;
  const pendingDeptCount = nonArchivedPermits.filter(
    (p) => p.status === 'Pending Department Head Approval' || p.status === 'Submitted'
  ).length;
  const pendingSafetyCount = nonArchivedPermits.filter(
    (p) => p.status === 'Pending Safety Approval'
  ).length;
  const highRiskPtwCount = nonArchivedPermits.filter((p) => p.isHighRisk).length;
  const ptwCompliancePct =
    nonArchivedPermits.length > 0
      ? Number((((activePtwCount + closedPtwCount) / nonArchivedPermits.length) * 100).toFixed(1))
      : 100;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Digital Permit to Work (23 Permit Types · 3-Stage Approval)
          </h1>
          <p className="text-sm text-slate-500">
            Strict sequential governance: Stage 1 Requester (Locked on Submit) → Stage 2 Department Head → Stage 3 Safety Final Approval.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canSoftArchive && (
            <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 border border-slate-300 bg-white px-2.5 py-2 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
              />
              <span>Show Archived</span>
            </label>
          )}
          {canCreatePermit && (
            <button
              type="button"
              onClick={() => setShowForm((s) => !s)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{showForm ? 'Close Form' : 'Request New Work Permit'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Role Authority Banner */}
      <div className="bg-slate-900 text-white rounded-md px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Your PTW Role: {user?.primaryRoleName || 'Employee / Worker'}</span>
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-300">
            Stage 2 Dept Head Authority:{' '}
            <strong className={user?.canDeptHeadApprove ? 'text-emerald-300' : 'text-slate-400'}>
              {user?.canDeptHeadApprove ? 'Authorized' : 'No'}
            </strong>
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-300">
            Stage 3 Safety Final Authority:{' '}
            <strong className={user?.canSafetyApprove ? 'text-emerald-300' : 'text-slate-400'}>
              {user?.canSafetyApprove ? 'Authorized' : 'No'}
            </strong>
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] text-amber-300">
          <Lock className="w-3 h-3" /> Self-approval &amp; hard-delete strictly blocked
        </span>
      </div>

      {statusNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded px-4 py-2.5 flex items-center justify-between">
          <span>{statusNotice}</span>
          <button type="button" onClick={() => setStatusNotice(null)} className="text-emerald-700 hover:text-emerald-950">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorNotice && (
        <div className="bg-red-50 border border-red-200 text-red-900 text-xs rounded px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorNotice}</span>
          </div>
          <button type="button" onClick={() => setErrorNotice(null)} className="text-red-700 hover:text-red-950">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <ModuleKpiStrip
        title="Permit to Work Live Pipeline KPIs"
        onOpenMasterKpi={onOpenMasterKpi}
        items={[
          {
            label: 'PTW Compliance %',
            value: `${ptwCompliancePct}%`,
            hint: `${activePtwCount} active · ${closedPtwCount} closed of ${nonArchivedPermits.length}`,
            alert: ptwCompliancePct < 80,
          },
          {
            label: 'Stage 2: Pending Dept Head',
            value: pendingDeptCount,
            hint: 'Locked requests awaiting HOD',
            alert: pendingDeptCount > 0,
          },
          {
            label: 'Stage 3: Pending Safety',
            value: pendingSafetyCount,
            hint: 'Dept approved · awaiting Safety',
            alert: pendingSafetyCount > 0,
          },
          {
            label: 'High-Risk / Expired',
            value: `${highRiskPtwCount} / ${expiredPtwCount}`,
            hint: `${expiredPtwCount} expired-not-closed`,
            alert: expiredPtwCount > 0,
          },
        ]}
      />

      {/* QR Token Verifier Bar */}
      <form
        onSubmit={handleVerifyQr}
        className="bg-white border border-slate-200 rounded-md p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 shrink-0">
          <QrCode className="w-4 h-4 text-emerald-700" />
          <span>Verify Permit QR Token:</span>
        </div>
        <input
          value={qrVerifyInput}
          onChange={(e) => setQrVerifyInput(e.target.value)}
          placeholder="Enter or scan QR token (e.g. ARSHIEL-PTW-2026-...)"
          className="flex-1 border border-slate-300 rounded px-3 py-1.5 text-xs font-mono"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Verify</span>
        </button>
        {qrVerifyResult && (
          <div className="text-xs font-semibold px-2">
            {qrVerifyResult.valid ? (
              <span className="text-emerald-700">
                VALID ACTIVE PERMIT: {qrVerifyResult.permit.permitNumber} ({qrVerifyResult.permit.workLocation})
              </span>
            ) : (
              <span className="text-red-700">{qrVerifyResult.error || 'Permit Not Active / Expired / Pending Approval'}</span>
            )}
          </div>
        )}
      </form>

      {/* New Permit Creation Form (All 23 Permit Types + Draft or Submit) */}
      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitNewPermit(false);
          }}
          className="bg-white border border-slate-200 rounded-md p-5 space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h2 className="font-display font-bold text-lg text-slate-900">
                Stage 1: New Digital Permit Request (23 Permit Types · 20-Aspect Compliance)
              </h2>
              <p className="text-xs text-slate-500">
                Save as Draft to edit later, or Submit to lock request fields and route to Stage 2 Department Head Approval.
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-red-700">
              <input
                type="checkbox"
                checked={form.isHighRisk}
                onChange={(e) => setForm({ ...form, isHighRisk: e.target.checked })}
              />
              <span>High-Risk Activity</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Permit Type (23 Enterprise Types) *
              </label>
              <select
                value={form.permitType}
                onChange={(e) => setForm({ ...form, permitType: e.target.value })}
                className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs"
              >
                {allPermitTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <div className="mt-1.5 flex gap-1">
                <input
                  value={newCustomPermitType}
                  onChange={(e) => setNewCustomPermitType(e.target.value)}
                  placeholder="Add custom permit type..."
                  className="flex-1 border border-slate-300 rounded px-2 py-1 text-[11px]"
                />
                <button
                  type="button"
                  onClick={handleAddCustomPermitType}
                  className="px-2 py-1 text-[11px] font-semibold bg-slate-900 text-white rounded cursor-pointer"
                >
                  + Add
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Plant / Site</label>
              <select
                value={form.plantId}
                onChange={(e) => setForm({ ...form, plantId: e.target.value })}
                className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs"
              >
                <option value="">Select Plant...</option>
                {hierarchy.plants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <select
                value={form.departmentId}
                onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs"
              >
                <option value="">Select Department...</option>
                {hierarchy.departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Exact Work Location *</label>
              <input
                required
                value={form.workLocation}
                onChange={(e) => setForm({ ...form, workLocation: e.target.value })}
                placeholder="e.g. Boiler Bay Rack B2"
                className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contractor / Vendor</label>
              <input
                value={form.contractorName}
                onChange={(e) => setForm({ ...form, contractorName: e.target.value })}
                placeholder="In-house or Contractor Co."
                className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Applicant / Receiver *</label>
              <input
                required
                value={form.applicantName}
                onChange={(e) => setForm({ ...form, applicantName: e.target.value })}
                placeholder="Performing Authority Name"
                className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date &amp; Time *</label>
              <input
                type="datetime-local"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Date &amp; Time *</label>
              <input
                type="datetime-local"
                required
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Linked LOTO Tag #</label>
              <input
                value={form.lotoNumber}
                onChange={(e) => setForm({ ...form, lotoNumber: e.target.value })}
                placeholder="e.g. LOTO-2026-0001"
                className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Scope of Work *</label>
              <textarea
                required
                rows={2}
                value={form.scopeOfWork}
                onChange={(e) => setForm({ ...form, scopeOfWork: e.target.value })}
                placeholder="Detailed description of job task, tools, and equipment..."
                className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Method Statement &amp; SIMOPS</label>
              <textarea
                rows={2}
                value={form.methodStatement}
                onChange={(e) => setForm({ ...form, methodStatement: e.target.value })}
                placeholder="Step-by-step safe work sequence and adjacent work coordination..."
                className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded p-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Gas Test O2 (%)</label>
              <input
                value={form.gasO2}
                onChange={(e) => setForm({ ...form, gasO2: e.target.value })}
                className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Flammable (% LEL)</label>
              <input
                value={form.gasLel}
                onChange={(e) => setForm({ ...form, gasLel: e.target.value })}
                className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">H2S / Toxic (ppm)</label>
              <input
                value={form.gasH2s}
                onChange={(e) => setForm({ ...form, gasH2s: e.target.value })}
                className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white"
              />
            </div>
          </div>

          {/* 20 PTW Aspects Verification */}
          <div className="border border-slate-200 rounded p-3 space-y-2">
            <div className="text-xs font-bold text-slate-900">20 Key PTW Aspects Pre-Issue Verification</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
              {PTW_20_ASPECTS.map((asp) => (
                <label key={asp} className="flex items-start gap-1.5 text-[11px] text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(form.checkedAspects[asp])}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        checkedAspects: { ...form.checkedAspects, [asp]: e.target.checked },
                      })
                    }
                    className="mt-0.5"
                  />
                  <span>{asp}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Mandatory Checkpoints */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded p-3 space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-emerald-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.tbtConducted}
                  onChange={(e) => setForm({ ...form, tbtConducted: e.target.checked })}
                />
                <span>Mandatory Checkpoint: Toolbox Talk &amp; Pre-Work Briefing Conducted</span>
              </label>
              <input
                value={form.tbtTopic}
                onChange={(e) => setForm({ ...form, tbtTopic: e.target.value })}
                placeholder="Toolbox Talk Topic"
                className="w-full border border-emerald-300 rounded px-2 py-1 text-xs bg-white"
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded p-3 space-y-1.5">
              <label className="flex items-start gap-2 text-xs font-bold text-amber-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.goldenRulesAcknowledged}
                  onChange={(e) => setForm({ ...form, goldenRulesAcknowledged: e.target.checked })}
                  className="mt-0.5"
                />
                <span>
                  Three Golden Rules Acknowledged: (1) Right Permit &amp; Controls, (2) Verify Zero Energy / Gas Test, (3) Stop Work Authority if Conditions Change.
                </span>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs border border-slate-300 rounded cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => submitNewPermit(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 rounded cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Save as Draft</span>
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit to Dept Head (Stage 2)</span>
            </button>
          </div>
        </form>
      )}

      {/* Filter Bar (All 3-Stage Statuses + Permit Type Selector) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {[
            'All',
            'Draft',
            'Pending Dept Head',
            'Pending Safety',
            'Active',
            'Returned for Clarification',
            'Suspended',
            'Expired',
            'Closed',
            'Rejected',
            'Cancelled',
          ].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 text-xs font-semibold rounded border cursor-pointer ${
                filterStatus === st
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white max-w-xs"
        >
          <option value="All">All 23 Permit Types</option>
          {allPermitTypes.map((pt) => (
            <option key={pt} value={pt}>
              {pt}
            </option>
          ))}
        </select>
      </div>

      {/* Permits Table with Strict Role-Based Controls */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
              <tr>
                <th className="px-4 py-2.5">Permit #</th>
                <th className="px-3 py-2.5">Type &amp; Scope</th>
                <th className="px-3 py-2.5">Location &amp; Requester</th>
                <th className="px-3 py-2.5">Validity Window</th>
                <th className="px-3 py-2.5">3-Stage Workflow</th>
                <th className="px-3 py-2.5 text-right">Authorized Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {visiblePermits.map((p) => {
                const nowIso = new Date().toISOString().slice(0, 16);
                const isExpired = p.status === 'Expired' || (p.status === 'Active' && p.endDate && p.endDate < nowIso);
                const isRequester =
                  Boolean(p.requesterUserId && user?.id && p.requesterUserId === user.id) ||
                  (!p.requesterUserId &&
                    Boolean(user?.fullName) &&
                    p.applicantName?.trim().toLowerCase() === user?.fullName?.trim().toLowerCase());

                const isDraftOrReturned = ['Draft', 'Returned for Clarification'].includes(p.status);
                const isPendingDept = ['Pending Department Head Approval', 'Submitted'].includes(p.status);
                const isPendingSafety = p.status === 'Pending Safety Approval';
                const isActive = p.status === 'Active' && !isExpired;

                return (
                  <tr key={p.id} className={p.isArchived ? 'bg-slate-50/80 opacity-65' : 'hover:bg-slate-50'}>
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{p.permitNumber}</span>
                        {(p.revisionNumber || 1) > 1 && (
                          <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            Rev {p.revisionNumber}
                          </span>
                        )}
                      </div>
                      {p.isHighRisk && (
                        <span className="text-[10px] text-red-700 font-bold uppercase block">HIGH RISK</span>
                      )}
                      {p.isArchived && (
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">ARCHIVED</span>
                      )}
                    </td>
                    <td className="px-3 py-3 max-w-xs">
                      <div className="font-semibold text-slate-800">{p.permitType}</div>
                      <div className="text-slate-500 truncate">{p.scopeOfWork}</div>
                      {p.returnedReason && p.status === 'Returned for Clarification' && (
                        <div className="mt-1 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                          Returned: {p.returnedReason}
                        </div>
                      )}
                      {p.rejectedReason && p.status === 'Rejected' && (
                        <div className="mt-1 text-[11px] text-red-800 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                          Rejected: {p.rejectedReason}
                        </div>
                      )}
                      {p.extensionRequestedUntil && isActive && (
                        <div className="mt-1 text-[11px] text-blue-800 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                          Extension Requested → {p.extensionRequestedUntil.replace('T', ' ')}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-800">{p.workLocation}</div>
                      <div className="text-[11px] text-slate-500">
                        {p.applicantName} {isRequester ? '(You)' : ''}
                      </div>
                      {p.departmentName && (
                        <div className="text-[10px] text-slate-400">{p.departmentName}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                      <div>{p.startDate?.replace('T', ' ')}</div>
                      <div className="text-[11px]">to {p.endDate?.replace('T', ' ')}</div>
                      {isExpired && (
                        <div className="text-[10px] font-bold text-red-700 uppercase mt-0.5">
                          EXPIRED — SAFETY REVALIDATE OR CLOSE
                        </div>
                      )}
                      {p.overduePendingEscalation && (
                        <div className="text-[10px] font-bold text-amber-700 uppercase mt-0.5 inline-flex items-center gap-0.5">
                          <Clock className="w-3 h-3" /> Pending &gt;24h Escalation
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 space-y-1.5">
                      <StatusTag status={isExpired ? 'Expired' : p.status} />
                      <ThreeStageStepper permit={p} />
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        {/* STAGE 1: DRAFT / RETURNED FOR CLARIFICATION */}
                        {!p.isArchived && isDraftOrReturned && (isRequester || user?.isSuperAdmin || user?.canSafetyApprove) && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(p)}
                              className="inline-flex items-center gap-1 px-2 py-1 border border-slate-300 rounded text-[11px] hover:bg-slate-100 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit Draft</span>
                            </button>
                            <button
                              type="button"
                              disabled={submittingAction}
                              onClick={() => executeTransition(p, 'submit')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-semibold cursor-pointer"
                            >
                              <Send className="w-3 h-3" />
                              <span>Submit to Dept Head</span>
                            </button>
                            <button
                              type="button"
                              disabled={submittingAction}
                              onClick={() => executeTransition(p, 'cancel', { comments: 'Cancelled by requester before issuance' })}
                              className="px-2 py-1 border border-slate-300 text-slate-600 rounded text-[11px] hover:bg-slate-50 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {/* STAGE 2: PENDING DEPARTMENT HEAD APPROVAL */}
                        {!p.isArchived && isPendingDept && (
                          isRequester ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-medium"
                              title="Submitted permits are locked to the requester and cannot be self-approved."
                            >
                              <Lock className="w-3 h-3 text-slate-500" />
                              <span>Locked · Awaiting Dept Head</span>
                            </span>
                          ) : user?.canDeptHeadApprove ? (
                            <>
                              <button
                                type="button"
                                disabled={submittingAction}
                                onClick={() =>
                                  executeTransition(p, 'dept_approve', {
                                    comments: 'Department operational review passed; routed to Safety Department.',
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded text-[11px] font-semibold cursor-pointer"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Dept Approve → Safety</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  openActionModal(
                                    p,
                                    'dept_return',
                                    'Return Permit for Clarification (Stage 2)',
                                    'Specify what the requester must correct before resubmitting to Department Head.',
                                    true
                                  )
                                }
                                className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-300 text-amber-900 rounded text-[11px] font-semibold cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Return</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  openActionModal(
                                    p,
                                    'dept_reject',
                                    'Reject Permit Request (Stage 2)',
                                    'Provide mandatory reason for rejecting this work permit at Department Head stage.',
                                    true
                                  )
                                }
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-semibold cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-500 text-[11px]">
                              <Lock className="w-3 h-3" /> Awaiting Dept Head
                            </span>
                          )
                        )}

                        {/* STAGE 3: PENDING SAFETY APPROVAL */}
                        {!p.isArchived && isPendingSafety && (
                          !isRequester && user?.canSafetyApprove ? (
                            <>
                              <button
                                type="button"
                                disabled={submittingAction}
                                onClick={() =>
                                  executeTransition(p, 'safety_approve', {
                                    comments: 'Safety compliance, gas testing, LOTO, and controls verified. Permit Activated.',
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-semibold cursor-pointer"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Safety Final Approve → Active</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  openActionModal(
                                    p,
                                    'safety_return',
                                    'Return Permit for Safety Correction (Stage 3)',
                                    'Provide safety compliance items to be corrected by the requester.',
                                    true
                                  )
                                }
                                className="px-2 py-1 bg-amber-50 border border-amber-300 text-amber-900 rounded text-[11px] font-semibold cursor-pointer"
                              >
                                Return
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  openActionModal(
                                    p,
                                    'safety_reject',
                                    'Reject Permit (Stage 3 Safety Department)',
                                    'Mandatory safety non-compliance reason for rejecting this permit.',
                                    true
                                  )
                                }
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-semibold cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-medium">
                              <Lock className="w-3 h-3" />
                              <span>{isRequester ? 'Locked · Routed to Safety' : 'Awaiting Safety Dept'}</span>
                            </span>
                          )
                        )}

                        {/* ACTIVE PERMIT CONTROLS */}
                        {!p.isArchived && isActive && (
                          <>
                            {isRequester && !user?.canSafetyApprove && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    openActionModal(
                                      p,
                                      'request_extension',
                                      'Request Permit Validity Extension',
                                      'Specify requested new end time and operational justification for Safety approval.',
                                      true,
                                      true
                                    )
                                  }
                                  className="px-2 py-1 bg-blue-50 border border-blue-300 text-blue-800 rounded text-[11px] font-semibold cursor-pointer"
                                >
                                  Request Extension
                                </button>
                                <button
                                  type="button"
                                  disabled={submittingAction}
                                  onClick={() =>
                                    executeTransition(p, 'request_closure', {
                                      comments: 'Work completed; requesting Safety closure verification.',
                                    })
                                  }
                                  className="px-2 py-1 bg-slate-100 border border-slate-300 text-slate-800 rounded text-[11px] font-semibold cursor-pointer"
                                >
                                  Request Closure
                                </button>
                              </>
                            )}
                            {user?.canSafetyApprove && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    openActionModal(
                                      p,
                                      p.extensionRequestedUntil ? 'approve_extension' : 'extend',
                                      p.extensionRequestedUntil ? 'Approve Pending Extension' : 'Extend Permit Validity',
                                      'Confirm updated validity end timestamp and gas/site re-verification remarks.',
                                      true,
                                      true
                                    )
                                  }
                                  className="px-2 py-1 bg-slate-100 border border-slate-300 text-slate-800 rounded text-[11px] font-semibold cursor-pointer"
                                >
                                  {p.extensionRequestedUntil ? 'Approve Ext.' : 'Extend'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    openActionModal(
                                      p,
                                      'suspend',
                                      'Suspend Active Work Permit',
                                      'Mandatory unsafe condition / stop-work reason required.',
                                      true
                                    )
                                  }
                                  className="px-2 py-1 bg-amber-50 border border-amber-300 text-amber-900 rounded text-[11px] font-semibold cursor-pointer"
                                >
                                  Suspend
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    openActionModal(
                                      p,
                                      'close',
                                      'Close & Verify Work Permit',
                                      'Confirm housekeeping cleared, LOTO removed, and area safely restored.',
                                      false
                                    )
                                  }
                                  className="px-2 py-1 bg-slate-900 text-white rounded text-[11px] font-semibold cursor-pointer"
                                >
                                  Close
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(p)}
                                  className="inline-flex items-center gap-1 px-2 py-1 border border-blue-300 bg-blue-50 text-blue-800 rounded text-[11px] font-semibold cursor-pointer"
                                  title="Creates Controlled Revision & routes back to Safety Approval"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Revise</span>
                                </button>
                              </>
                            )}
                          </>
                        )}

                        {/* SUSPENDED / EXPIRED SAFETY CONTROLS */}
                        {!p.isArchived && (p.status === 'Suspended' || isExpired) && user?.canSafetyApprove && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                openActionModal(
                                  p,
                                  'revalidate',
                                  'Revalidate & Reactivate Permit',
                                  'Set updated validity end time and record Safety re-inspection verification.',
                                  true,
                                  true
                                )
                              }
                              className="px-2 py-1 bg-emerald-700 text-white rounded text-[11px] font-semibold cursor-pointer"
                            >
                              Revalidate
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                openActionModal(
                                  p,
                                  'close',
                                  'Close Permit',
                                  'Verify site restoration and formally close permit.',
                                  false
                                )
                              }
                              className="px-2 py-1 bg-slate-900 text-white rounded text-[11px] font-semibold cursor-pointer"
                            >
                              Close
                            </button>
                          </>
                        )}

                        {/* SOFT-ARCHIVE (SUPER ADMIN / AUTHORIZED SAFETY ADMIN ONLY — NEVER HARD DELETED!) */}
                        {!p.isArchived && canSoftArchive && (
                          <button
                            type="button"
                            onClick={() =>
                              openActionModal(
                                p,
                                'archive',
                                `Soft-Archive Permit ${p.permitNumber}`,
                                'Issued permit history is NEVER permanently deleted. Archiving hides it from active operations while preserving full audit & approval trail.',
                                true
                              )
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 border border-red-200 text-red-700 rounded text-[11px] hover:bg-red-50 cursor-pointer"
                            title="Soft-Archive Permit (Mandatory Reason · Super Admin / Safety Admin Only)"
                          >
                            <Archive className="w-3 h-3" />
                            <span>Archive</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => openQrModal(p)}
                          className="px-2 py-1 border border-slate-300 rounded text-[11px] hover:bg-slate-100 cursor-pointer"
                        >
                          QR / Trail
                        </button>
                        <button
                          type="button"
                          onClick={() => exportPermitPdf(p, organization)}
                          className="px-2 py-1 border border-slate-300 rounded text-[11px] hover:bg-slate-100 cursor-pointer"
                        >
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visiblePermits.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No permits matching the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mandatory Reason / Workflow Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmActionModal}
            className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <div className="text-xs font-bold text-emerald-700">{actionModal.permit.permitNumber}</div>
                <h3 className="font-display font-bold text-base text-slate-900">{actionModal.title}</h3>
              </div>
              <button type="button" onClick={() => setActionModal(null)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <p className="text-xs text-slate-600">{actionModal.description}</p>

            {actionModal.showDatePicker && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Updated Validity End Date &amp; Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={modalEndDate}
                  onChange={(e) => setModalEndDate(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {actionModal.requireReason ? 'Mandatory Remarks / Reason *' : 'Verification Remarks (Optional)'}
              </label>
              <textarea
                rows={3}
                required={actionModal.requireReason}
                value={modalComments}
                onChange={(e) => setModalComments(e.target.value)}
                placeholder="Record exact justification for tamper-evident audit trail..."
                className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="px-3.5 py-1.5 text-xs border border-slate-300 rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAction}
                className={`px-4 py-1.5 text-xs font-semibold text-white rounded cursor-pointer ${
                  actionModal.action.includes('reject') || actionModal.action === 'archive'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                {submittingAction ? 'Processing...' : 'Confirm & Record'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Draft / Controlled Revision Modal */}
      {editingPermit && editForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={(e) => handleSaveEdit(e, false)}
            className="bg-white border border-slate-200 rounded-lg max-w-2xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="text-xs font-bold text-emerald-700">
                  {editingPermit.permitNumber} · Rev {editingPermit.revisionNumber || 1}
                </div>
                <h3 className="font-display font-bold text-lg text-slate-900">
                  {editingPermit.status === 'Active'
                    ? 'Controlled Revision of Active Permit'
                    : 'Edit Draft / Returned Work Permit'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingPermit(null);
                  setEditForm(null);
                }}
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {editingPermit.status === 'Active' && (
              <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 text-xs text-amber-950 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Modifying an approved Active permit creates Revision #{(editingPermit.revisionNumber || 1) + 1} and automatically routes it back to{' '}
                  <strong>Pending Safety Approval</strong> before work can resume under the revised terms.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Permit Type</label>
                <select
                  value={editForm.permitType}
                  onChange={(e) => setEditForm({ ...editForm, permitType: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                >
                  {allPermitTypes.map((pt) => (
                    <option key={pt} value={pt}>
                      {pt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Plant / Site</label>
                <select
                  value={editForm.plantId}
                  onChange={(e) => setEditForm({ ...editForm, plantId: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                >
                  <option value="">-- Select Plant --</option>
                  {hierarchy.plants.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Work Location</label>
                <input
                  required
                  value={editForm.workLocation}
                  onChange={(e) => setEditForm({ ...editForm, workLocation: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contractor Name</label>
                <input
                  value={editForm.contractorName}
                  onChange={(e) => setEditForm({ ...editForm, contractorName: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Valid From</label>
                <input
                  type="datetime-local"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Valid Until</label>
                <input
                  type="datetime-local"
                  value={editForm.endDate}
                  onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Scope of Work</label>
                <textarea
                  rows={2}
                  required
                  value={editForm.scopeOfWork}
                  onChange={(e) => setEditForm({ ...editForm, scopeOfWork: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hazards (comma separated)</label>
                <input
                  value={editForm.hazardsText}
                  onChange={(e) => setEditForm({ ...editForm, hazardsText: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Controls (comma separated)</label>
                <input
                  value={editForm.controlsText}
                  onChange={(e) => setEditForm({ ...editForm, controlsText: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  {editingPermit.status === 'Active' ? 'Mandatory Revision Reason *' : 'Change Notes'}
                </label>
                <input
                  required={editingPermit.status === 'Active'}
                  value={editForm.editComments}
                  onChange={(e) => setEditForm({ ...editForm, editComments: e.target.value })}
                  placeholder="Describe what changed and why..."
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setEditingPermit(null);
                  setEditForm(null);
                }}
                className="px-3.5 py-1.5 text-xs border border-slate-300 rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded cursor-pointer"
              >
                {editingPermit.status === 'Active' ? 'Save Revision & Route to Safety' : 'Save Draft Changes'}
              </button>
              {['Draft', 'Returned for Clarification'].includes(editingPermit.status) && (
                <button
                  type="button"
                  onClick={(e) => handleSaveEdit(e as any, true)}
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded cursor-pointer"
                >
                  Save &amp; Submit to Dept Head
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* QR Code & Complete 3-Stage Audit Trail Modal */}
      {selectedPermit && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-2xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <div className="text-xs font-bold text-emerald-700">
                  {selectedPermit.permitNumber} · Rev {selectedPermit.revisionNumber || 1}
                </div>
                <h3 className="font-display font-bold text-lg text-slate-900">{selectedPermit.permitType}</h3>
                <div className="mt-1">
                  <ThreeStageStepper permit={selectedPermit} />
                </div>
              </div>
              <button type="button" onClick={() => setSelectedPermit(null)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div className="flex flex-col items-center border border-slate-200 rounded p-3 bg-slate-50">
                {qrImageUrl && <img src={qrImageUrl} alt="Permit QR" className="w-36 h-36" />}
                <div className="mt-1 text-[10px] font-mono text-slate-600 break-all text-center">
                  {selectedPermit.qrToken}
                </div>
              </div>
              <div className="sm:col-span-2 text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <strong>Status:</strong> <StatusTag status={selectedPermit.status} />
                </div>
                <div><strong>Location:</strong> {selectedPermit.workLocation}</div>
                <div><strong>Requester (Stage 1):</strong> {selectedPermit.applicantName}</div>
                <div>
                  <strong>Dept Head Sign-Off (Stage 2):</strong>{' '}
                  {selectedPermit.departmentHeadApprovedBy
                    ? `${selectedPermit.departmentHeadApprovedBy} (${new Date(selectedPermit.departmentHeadApprovedAt).toLocaleString()})`
                    : 'Pending'}
                </div>
                <div>
                  <strong>Safety Final Sign-Off (Stage 3):</strong>{' '}
                  {selectedPermit.safetyApprovedBy
                    ? `${selectedPermit.safetyApprovedBy} (${new Date(selectedPermit.safetyApprovedAt).toLocaleString()})`
                    : 'Pending'}
                </div>
                <div><strong>Scope:</strong> {selectedPermit.scopeOfWork}</div>
                <div><strong>Gas Test:</strong> O2 {selectedPermit.gasTesting?.o2 || '—'} · LEL {selectedPermit.gasTesting?.lel || '—'} · H2S {selectedPermit.gasTesting?.h2s || '—'}</div>
              </div>
            </div>

            {/* Relational Approval Trail */}
            <div className="border-t border-slate-200 pt-3 space-y-2">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Tamper-Evident 3-Stage Approval &amp; Lifecycle Trail
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {(selectedPermit.approvals?.length ? selectedPermit.approvals : selectedPermit.approvalHistory || []).map(
                  (entry: any, idx: number) => (
                    <div
                      key={entry.id || idx}
                      className="text-xs bg-slate-50 border border-slate-200 rounded px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                    >
                      <div>
                        <span className="font-bold text-slate-900">
                          {entry.action || entry.step}
                        </span>
                        <span className="text-slate-600 ml-1.5">
                          by {entry.userName || entry.actor} ({entry.userRole || entry.role || 'User'})
                        </span>
                        {entry.comments && <div className="text-[11px] text-slate-600 mt-0.5">{entry.comments}</div>}
                      </div>
                      <div className="text-[11px] text-slate-500 whitespace-nowrap tabular-nums">
                        {entry.previousStatus && entry.newStatus ? `${entry.previousStatus} → ${entry.newStatus} · ` : ''}
                        {new Date(entry.createdAt || entry.at).toLocaleString()}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Controlled Revisions & Extensions */}
            {((selectedPermit.revisions?.length || 0) > 0 || (selectedPermit.extensions?.length || 0) > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-200 pt-3 text-xs">
                {(selectedPermit.revisions?.length || 0) > 0 && (
                  <div className="space-y-1">
                    <div className="font-bold text-slate-800">Controlled Revisions</div>
                    {selectedPermit.revisions.map((rev: any) => (
                      <div key={rev.id} className="bg-blue-50 border border-blue-200 rounded p-2 text-[11px]">
                        <div className="font-semibold text-blue-950">Rev #{rev.revisionNumber} by {rev.changedByName}</div>
                        <div className="text-blue-800">{rev.reasonForChange}</div>
                      </div>
                    ))}
                  </div>
                )}
                {(selectedPermit.extensions?.length || 0) > 0 && (
                  <div className="space-y-1">
                    <div className="font-bold text-slate-800">Extension Requests</div>
                    {selectedPermit.extensions.map((ext: any) => (
                      <div key={ext.id} className="bg-slate-50 border border-slate-200 rounded p-2 text-[11px]">
                        <div className="font-semibold text-slate-900">
                          → {ext.requestedEndDate?.replace('T', ' ')} ({ext.status})
                        </div>
                        <div className="text-slate-600">{ext.reason}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={() => exportPermitPdf(selectedPermit, organization)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Audit PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPermit(null)}
                className="px-3.5 py-1.5 text-xs border border-slate-300 rounded cursor-pointer"
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
