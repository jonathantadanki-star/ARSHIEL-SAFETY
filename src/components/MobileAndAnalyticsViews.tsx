import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, Download, FileSpreadsheet, QrCode, RefreshCw, Smartphone, WifiOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getOfflineDrafts, saveOfflineDraft } from '../lib/api';
import { exportKpiSummaryPdf, exportReportTablePdf, exportRowsToCsv, exportRowsToExcel } from '../lib/pdf';

const REPORT_TYPES = [
  { key: 'incident', label: '1. Incident & Injury Register' },
  { key: 'lti_trir', label: '2. LTI / TRIR Recordable Cases' },
  { key: 'near_miss', label: '3. Near Miss Reports' },
  { key: 'observation', label: '4. AI Observations & BBS Register' },
  { key: 'capa', label: '5. Corrective & Preventive Actions (CAPA)' },
  { key: 'ptw', label: '6. Permit to Work (PTW) Register' },
  { key: 'risk', label: '7. HIRA / HAZOP / JSA Risk Register' },
  { key: 'audit', label: '8. Safety Audits & Compliance Scores' },
  { key: 'training', label: '9. Training & Competency Matrix' },
  { key: 'contractor', label: '10. Contractor Compliance & Scores' },
  { key: 'equipment', label: '11. Equipment & Calibration Assets' },
  { key: 'environment', label: '12. Environment & Sustainability (BRSR/ESG)' },
  { key: 'legal', label: '13. Legal & OSH Code 2020 Compliance' },
  { key: 'ppe', label: '14. PPE & Safety Store Stock' },
  { key: 'gate', label: '15. Gate Control & Visitor Muster' },
  { key: 'emergency', label: '16. Emergency Drills & ERP' },
  { key: 'committee', label: '17. Safety Committee & Welfare' },
  { key: 'weekly', label: '18. Weekly Safety Activities' },
  { key: 'plant_performance', label: '19. Plant-Wise Safety Comparison' },
  { key: 'department_performance', label: '20. Department Performance Summary' },
];

export function AnalyticsReportsView() {
  const { organization, hierarchy } = useAuth();
  const [selectedType, setSelectedType] = useState('incident');
  const [plantId, setPlantId] = useState('all');
  const [reportRows, setReportRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingKpi, setDownloadingKpi] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ rows: Record<string, unknown>[] }>(
        `/api/analytics/report?type=${encodeURIComponent(selectedType)}&plantId=${encodeURIComponent(plantId)}`
      );
      setReportRows(res.rows || []);
    } finally {
      setLoading(false);
    }
  }, [selectedType, plantId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const exportAllModuleSummary = async (format: 'pdf' | 'excel' | 'csv') => {
    setDownloadingKpi(true);
    try {
      const kpiData = await apiFetch('/api/dashboard/kpis');
      const rows = Object.entries(kpiData.kpis || {}).map(([Metric, Value]) => ({ Metric, Value }));
      if (format === 'pdf') {
        exportKpiSummaryPdf(kpiData.kpis || {}, organization);
      } else if (format === 'csv') {
        exportRowsToCsv(rows, 'ARSHIEL-Executive-EHS-KPIs');
      } else {
        exportRowsToExcel(rows, 'ARSHIEL-Executive-EHS-KPIs');
      }
    } finally {
      setDownloadingKpi(false);
    }
  };

  const activeDef = REPORT_TYPES.find((r) => r.key === selectedType) || REPORT_TYPES[0];
  const columns = reportRows[0] ? Object.keys(reportRows[0]) : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Enterprise EHS Analytics &amp; Regulatory Reports (20 Types)
          </h1>
          <p className="text-sm text-slate-500">
            Live PostgreSQL dataset previews with branded PDF, Excel &amp; CSV compliance exports across all facilities.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={downloadingKpi}
            onClick={() => exportAllModuleSummary('pdf')}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> 22-KPI PDF
          </button>
          <button
            type="button"
            disabled={downloadingKpi}
            onClick={() => exportAllModuleSummary('excel')}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white rounded cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> 22-KPI Excel
          </button>
        </div>
      </div>

      {/* Report Selector & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <BarChart3 className="w-4 h-4 text-emerald-700 shrink-0" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 text-xs font-semibold bg-white min-w-[260px]"
          >
            {REPORT_TYPES.map((rt) => (
              <option key={rt.key} value={rt.key}>
                {rt.label}
              </option>
            ))}
          </select>

          <select
            value={plantId}
            onChange={(e) => setPlantId(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 text-xs bg-white"
          >
            <option value="all">All Plants ({hierarchy.plants.length})</option>
            {hierarchy.plants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              exportReportTablePdf(
                activeDef.label,
                reportRows,
                organization,
                `ARSHIEL-${selectedType}-Report`
              )
            }
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export PDF
          </button>
          <button
            type="button"
            onClick={() => exportRowsToExcel(reportRows, `ARSHIEL-${selectedType}-Report`)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white rounded cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
          <button
            type="button"
            onClick={() => exportRowsToCsv(reportRows, `ARSHIEL-${selectedType}-Report`)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white rounded cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      {/* Live Preview Table */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="font-bold text-sm text-slate-900">{activeDef.label}</div>
          <div className="text-xs text-slate-500 tabular-nums">
            {loading ? 'Loading dataset...' : `${reportRows.length} record(s)`}
          </div>
        </div>
        <div className="overflow-x-auto">
          {reportRows.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No records found for this report &amp; facility filter.
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="px-3 py-2.5 font-semibold whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {reportRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {columns.map((col) => (
                      <td key={col} className="px-3 py-2 text-slate-700 max-w-xs truncate">
                        {String(row[col] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export function MobileFieldView({ onNavigate }: { onNavigate: (r: string) => void }) {
  const { syncOfflineDrafts } = useAuth();
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [drafts, setDrafts] = useState(getOfflineDrafts());
  const [statusMsg, setStatusMsg] = useState('');

  const handleSaveOffline = (e: React.FormEvent) => {
    e.preventDefault();
    saveOfflineDraft({
      endpoint: '/api/observations',
      method: 'POST',
      label: `Offline Observation: ${draftTitle}`,
      payload: {
        title: draftTitle,
        description: draftDesc,
        observationType: 'Unsafe Condition',
        severity: 'Medium',
        humanVerified: false,
      },
    });
    setDraftTitle('');
    setDraftDesc('');
    setDrafts(getOfflineDrafts());
    setStatusMsg('Saved locally to offline draft queue.');
  };

  const handleSync = async () => {
    const count = await syncOfflineDrafts();
    setDrafts(getOfflineDrafts());
    setStatusMsg(`Synced ${count} offline draft(s) to Cloud SQL.`);
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <Smartphone className="w-6 h-6 text-emerald-700" />
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Mobile Field Quick Capture</h1>
          <p className="text-sm text-slate-500">One-tap field reporting, QR permit checks &amp; offline draft sync queue.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => onNavigate('observations')} className="bg-emerald-700 text-white rounded-md p-4 text-left font-semibold text-sm cursor-pointer">
          + AI Camera Observation
        </button>
        <button type="button" onClick={() => onNavigate('incidents')} className="bg-red-600 text-white rounded-md p-4 text-left font-semibold text-sm cursor-pointer">
          + Report Field Incident
        </button>
        <button type="button" onClick={() => onNavigate('ptw')} className="bg-slate-900 text-white rounded-md p-4 text-left font-semibold text-sm flex items-center gap-2 cursor-pointer">
          <QrCode className="w-4 h-4" /> Verify Permit QR
        </button>
        <button type="button" onClick={() => onNavigate('audits')} className="bg-white border border-slate-300 text-slate-900 rounded-md p-4 text-left font-semibold text-sm cursor-pointer">
          Execute Audit Checklist
        </button>
      </div>

      <form onSubmit={handleSaveOffline} className="bg-white border border-slate-200 rounded-md p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <WifiOff className="w-4 h-4 text-amber-600" />
          <span>Offline Draft Queue ({drafts.length} pending)</span>
        </div>
        {statusMsg && <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-1.5">{statusMsg}</div>}
        <input required value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder="Quick Hazard / Observation Title *" className="w-full border border-slate-300 rounded px-3 py-2 text-xs" />
        <textarea required value={draftDesc} onChange={(e) => setDraftDesc(e.target.value)} placeholder="Field notes..." rows={2} className="w-full border border-slate-300 rounded px-3 py-2 text-xs" />
        <div className="flex gap-2">
          <button type="submit" className="flex-1 py-2 text-xs font-semibold bg-amber-600 text-white rounded cursor-pointer">
            Save Offline Draft
          </button>
          <button type="button" onClick={handleSync} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /> Sync All ({drafts.length})
          </button>
        </div>
      </form>
    </div>
  );
}
