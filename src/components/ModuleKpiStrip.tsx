import React from 'react';
import { BarChart3 } from 'lucide-react';

export interface ModuleKpiItem {
  label: string;
  value: string | number;
  hint?: string;
  alert?: boolean;
}

interface ModuleKpiStripProps {
  title?: string;
  items: ModuleKpiItem[];
  onOpenMasterKpi?: () => void;
}

export function ModuleKpiStrip({ title, items, onOpenMasterKpi }: ModuleKpiStripProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-md p-3 space-y-2.5">
      {(title || onOpenMasterKpi) && (
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-emerald-700" />
            <span>{title || 'Module Individual KPIs'}</span>
          </div>
          {onOpenMasterKpi && (
            <button
              type="button"
              onClick={onOpenMasterKpi}
              className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
            >
              Open Master KPI Parent Line &rarr;
            </button>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {items.map((item, idx) => (
          <div
            key={`${item.label}-${idx}`}
            className={`border rounded px-3 py-2 ${
              item.alert ? 'border-red-300 bg-red-50/40' : 'border-slate-200 bg-slate-50/60'
            }`}
          >
            <div className="text-[11px] font-medium text-slate-500 truncate">{item.label}</div>
            <div
              className={`text-lg font-display font-bold tabular-nums mt-0.5 ${
                item.alert ? 'text-red-700' : 'text-slate-900'
              }`}
            >
              {item.value}
            </div>
            {item.hint && <div className="text-[11px] text-slate-500 truncate">{item.hint}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
