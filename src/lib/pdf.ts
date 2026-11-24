import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Organization } from '../types';

function addPdfHeaderFooter(doc: jsPDF, org: Organization | null, title: string, docNumber: string) {
  const company = org?.branding?.companyName || org?.name || 'ARSHIEL SAFETY';
  const headerText = org?.branding?.reportHeader || `${company} — Official EHS Compliance Document`;
  const footerText = org?.branding?.reportFooter || 'ARSHIEL SAFETY · Owner: Jonathan Thadanki';

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('ARSHIEL SAFETY', 14, 10);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(headerText, 14, 17);
  doc.text(docNumber, 196, 13, { align: 'right' });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 34);

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${footerText}  |  Generated ${new Date().toLocaleString()}`, 14, 289);
    doc.text(`Page ${i} of ${pageCount}`, 196, 289, { align: 'right' });
  }
}

export function exportPermitPdf(permit: any, org: Organization | null) {
  const doc = new jsPDF();
  addPdfHeaderFooter(doc, org, `Digital Permit to Work — ${permit.permitType}`, permit.permitNumber);

  autoTable(doc, {
    startY: 40,
    head: [['Permit Metadata', 'Details']],
    body: [
      ['Permit Number', permit.permitNumber],
      ['Permit Type', `${permit.permitType} ${permit.isHighRisk ? '(HIGH RISK)' : ''}`],
      ['Status', permit.status],
      ['Plant / Department', `${permit.plantName || '-'} / ${permit.departmentName || '-'}`],
      ['Work Location', permit.workLocation],
      ['Validity Window', `${permit.startDate} to ${permit.endDate}`],
      ['Contractor / Applicant', `${permit.contractorName || 'In-house'} / ${permit.applicantName}`],
      ['Issuing / Performing Authority', `${permit.issuingAuthority || '-'} / ${permit.performingAuthority || '-'}`],
      ['Scope of Work', permit.scopeOfWork],
      ['Method Statement', permit.methodStatement || 'Standard Safe Operating Procedure'],
      ['Hazards Identified', (permit.hazards || []).join(', ') || 'None specified'],
      ['Control Measures', (permit.controls || []).join(', ') || 'Standard Controls'],
      ['LOTO & Isolation', JSON.stringify(permit.isolationLoto || {})],
      ['Gas Testing Readings', JSON.stringify(permit.gasTesting || {})],
      ['Required PPE', (permit.requiredPpe || []).join(', ') || 'Standard Site PPE'],
      ['Authorized Workers', (permit.authorizedWorkers || []).join(', ') || 'Listed on Roster'],
      ['Emergency Arrangements', permit.emergencyArrangements || 'Site ERP & Assembly Point'],
      ['SIMOPS Notes', permit.simopsNotes || 'No simultaneous operations conflict'],
      ['Toolbox Talk & Pre-Work Briefing', JSON.stringify(permit.toolboxTalk || {})],
      ['Three Golden Rules Acknowledged', permit.goldenRulesAcknowledged ? 'YES — Verified' : 'Pending'],
      ['QR Verification Token', permit.qrToken],
    ],
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [21, 128, 61] },
  });

  if (Array.isArray(permit.approvalHistory) && permit.approvalHistory.length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY || 180;
    autoTable(doc, {
      startY: finalY + 8,
      head: [['Approval Step', 'Actor', 'Decision', 'Timestamp', 'Comments']],
      body: permit.approvalHistory.map((h: any) => [
        h.step || '-',
        h.actor || '-',
        h.decision || '-',
        h.at ? new Date(h.at).toLocaleString() : '-',
        h.comments || '-',
      ]),
      theme: 'striped',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] },
    });
  }

  addPdfHeaderFooter(doc, org, `Digital Permit to Work — ${permit.permitType}`, permit.permitNumber);
  doc.save(`${permit.permitNumber}.pdf`);
}

export function exportIncidentPdf(inc: any, org: Organization | null) {
  const doc = new jsPDF();
  addPdfHeaderFooter(doc, org, `Incident Investigation Report — ${inc.incidentType}`, inc.incidentNumber);

  autoTable(doc, {
    startY: 40,
    head: [['Field', 'Record']],
    body: [
      ['Incident Number', inc.incidentNumber],
      ['Type / Severity', `${inc.incidentType} · ${inc.severity}`],
      ['Date & Time', `${inc.incidentDate} ${inc.incidentTime}`],
      ['Plant / Location', `${inc.plantName || '-'} · ${inc.specificLocation || '-'}`],
      ['Title', inc.title],
      ['Description', inc.description],
      ['Immediate Actions', inc.immediateActions || '-'],
      ['Investigation Team', (inc.investigationTeam || []).join(', ') || '-'],
      ['RCA Method', inc.rcaMethod || '5 Why'],
      ['Direct Causes', inc.directCauses || '-'],
      ['Root Causes', inc.rootCauses || '-'],
      ['Contributing Factors', inc.contributingFactors || '-'],
      ['Days Lost / Recordable', `${inc.daysLost || 0} days · ${inc.isRecordable ? 'Recordable' : 'Non-Recordable'}`],
      ['Status', inc.status],
    ],
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [220, 38, 38] },
  });

  addPdfHeaderFooter(doc, org, `Incident Investigation Report — ${inc.incidentType}`, inc.incidentNumber);
  doc.save(`${inc.incidentNumber}.pdf`);
}

export function exportAuditPdf(audit: any, org: Organization | null) {
  const doc = new jsPDF();
  addPdfHeaderFooter(doc, org, `Safety Audit Report — ${audit.title}`, audit.auditNumber);

  autoTable(doc, {
    startY: 40,
    head: [['Audit Summary', 'Value']],
    body: [
      ['Audit Number', audit.auditNumber],
      ['Audit Type', audit.auditType],
      ['Lead Auditor', audit.leadAuditor],
      ['Date', audit.scheduledDate],
      ['Compliance Score', `${audit.complianceScore}% (${audit.compliantItems}/${audit.totalItems} compliant, ${audit.nonCompliantItems} NC)`],
      ['Status', audit.status],
    ],
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [21, 128, 61] },
  });

  if (Array.isArray(audit.checklistResponses) && audit.checklistResponses.length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY || 110;
    autoTable(doc, {
      startY: finalY + 8,
      head: [['Checklist Item', 'Result', 'Remarks']],
      body: audit.checklistResponses.map((r: any) => [
        r.questionText || r.item || '-',
        r.status || '-',
        r.remarks || '-',
      ]),
      theme: 'striped',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] },
    });
  }

  addPdfHeaderFooter(doc, org, `Safety Audit Report — ${audit.title}`, audit.auditNumber);
  doc.save(`${audit.auditNumber}.pdf`);
}

export function exportKpiSummaryPdf(kpis: Record<string, any>, org: Organization | null) {
  const doc = new jsPDF();
  addPdfHeaderFooter(doc, org, 'Executive EHS KPI Summary Report', `KPI-${new Date().toISOString().slice(0, 10)}`);

  autoTable(doc, {
    startY: 40,
    head: [['KPI Indicator', 'Computed Value']],
    body: Object.entries(kpis).map(([k, v]) => [k, String(v)]),
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  addPdfHeaderFooter(doc, org, 'Executive EHS KPI Summary Report', `KPI-${new Date().toISOString().slice(0, 10)}`);
  doc.save(`ARSHIEL-KPI-Report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportRowsToExcel(rows: Record<string, unknown>[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'ARSHIEL_EHS');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportRowsToCsv(rows: Record<string, unknown>[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportReportTablePdf(
  title: string,
  rows: Record<string, unknown>[],
  org: Organization | null,
  filename: string
) {
  const doc = new jsPDF({ orientation: rows[0] && Object.keys(rows[0]).length > 6 ? 'landscape' : 'portrait' });
  const docCode = `RPT-${new Date().toISOString().slice(0, 10)}`;
  addPdfHeaderFooter(doc, org, title, docCode);

  if (rows.length === 0) {
    doc.setFontSize(10);
    doc.text('No records match the selected report criteria.', 14, 48);
  } else {
    const columns = Object.keys(rows[0]);
    const body = rows.map((r) => columns.map((c) => String(r[c] ?? '-')));
    autoTable(doc, {
      startY: 40,
      head: [columns],
      body,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42] },
    });
  }

  addPdfHeaderFooter(doc, org, title, docCode);
  doc.save(`${filename}.pdf`);
}

