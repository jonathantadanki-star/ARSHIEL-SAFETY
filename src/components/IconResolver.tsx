import React from 'react';
import {
  AlertTriangle,
  Award,
  BarChart3,
  Boxes,
  Building2,
  CalendarCheck,
  CheckSquare,
  ClipboardCheck,
  Cpu,
  Eye,
  Factory,
  FileCheck2,
  Flame,
  FlaskConical,
  FolderKanban,
  GitBranch,
  Globe,
  GraduationCap,
  Grid3x3,
  Hammer,
  HardHat,
  HeartPulse,
  Layers,
  LayoutDashboard,
  Leaf,
  Lock,
  Package,
  PackageCheck,
  QrCode,
  Scale,
  ScanEye,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
  Zap,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Award,
  Eye,
  HeartPulse,
  Hammer,
  GitBranch,
  FileCheck2,
  ClipboardCheck,
  Lock,
  ScanEye,
  Grid3x3,
  CheckSquare,
  Wrench,
  HardHat,
  GraduationCap,
  Flame,
  FlaskConical,
  Leaf,
  Scale,
  FolderKanban,
  CalendarCheck,
  Package,
  PackageCheck,
  QrCode,
  Users,
  BarChart3,
  Boxes,
  Building2,
  Cpu,
  Globe,
  Server,
  Settings,
  Factory,
  Layers,
  Zap,
};

export function DynamicIcon({ name, className = 'w-4 h-4' }: { name?: string; className?: string }) {
  const IconComp = (name && ICON_MAP[name]) || Layers;
  return <IconComp className={className} />;
}

export function StatusTag({
  status,
  tone,
}: {
  status: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const normalized = (status || '').toLowerCase();
  let resolvedTone = tone;
  if (!resolvedTone) {
    if (
      ['not connected', 'critical', 'overdue', 'expired', 'rejected', 'suspended', 'exceeded', 'fatality', 'lti', 'unsafe act', 'high', 'error'].some((k) =>
        normalized.includes(k)
      )
    ) {
      resolvedTone = 'danger';
    } else if (
      ['active', 'approved', 'closed', 'completed', 'operational', 'compliant', 'within limit', 'safe act', 'verified', 'inspected', 'connected', 'healthy'].some((k) =>
        normalized.includes(k)
      )
    ) {
      resolvedTone = 'success';
    } else if (
      ['configuration required', 'submitted', 'pending', 'in progress', 'under', 'warning', 'medium', 'near miss', 'planned', 'scheduled', 'unsafe condition'].some((k) =>
        normalized.includes(k)
      )
    ) {
      resolvedTone = 'warning';
    } else if (['assigned', 'rca', 'isolated', 'checked in'].some((k) => normalized.includes(k))) {
      resolvedTone = 'info';
    } else {
      resolvedTone = 'neutral';
    }
  }

  const classes =
    resolvedTone === 'success'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : resolvedTone === 'danger'
        ? 'bg-red-50 text-red-800 border-red-200'
        : resolvedTone === 'warning'
          ? 'bg-amber-50 text-amber-800 border-amber-200'
          : resolvedTone === 'info'
            ? 'bg-sky-50 text-sky-800 border-sky-200'
            : 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide border rounded ${classes}`}
    >
      {status}
    </span>
  );
}
