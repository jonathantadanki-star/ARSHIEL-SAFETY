import { Router } from 'express';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  approvalInstances,
  capas,
  contractors,
  contractorWorkers,
  departments,
  documents,
  emergencyRecords,
  environmentRecords,
  equipmentAssets,
  formSubmissions,
  gateEntries,
  incidents,
  industryTemplates,
  legalCompliances,
  lotoRecords,
  modules,
  notifications,
  organizations,
  permitApprovals,
  permitExtensions,
  permitRevisions,
  plants,
  ppeInventory,
  riskAssessments,
  safetyAudits,
  safetyCommittees,
  safetyObservations,
  trainingRecords,
  users,
  weeklySafetyActivities,
  workforceRecords,
  workPermits,
} from '../db/schema.ts';
import {
  type AuthRequest,
  extractClientIp,
  hasModulePermission,
  writeActivityLog,
  writeAuditLog,
} from '../middleware/auth.ts';
import {
  createSignedDocumentToken,
  createSupabaseSignedUrlIfConfigured,
  recordSecurityEvent,
  validateUploadedDocument,
} from '../middleware/security.ts';

export const ALL_23_PERMIT_TYPES = [
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
] as const;

const router = Router();

function makeNumber(prefix: string) {
  const yr = new Date().getFullYear();
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${yr}-${rnd}`;
}

// ============================================================================
// MAIN EHS DASHBOARD KPI ENGINE (22 Real DB-Computed KPIs + Chart Aggregations)
// ============================================================================
router.get('/dashboard/kpis', async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const plantId = typeof req.query.plantId === 'string' && req.query.plantId !== 'all' ? req.query.plantId : null;
    const businessUnitId =
      typeof req.query.businessUnitId === 'string' && req.query.businessUnitId !== 'all'
        ? req.query.businessUnitId
        : null;
    const departmentId =
      typeof req.query.departmentId === 'string' && req.query.departmentId !== 'all'
        ? req.query.departmentId
        : null;
    const contractorName =
      typeof req.query.contractorName === 'string' && req.query.contractorName !== 'all'
        ? req.query.contractorName
        : null;
    const timeframeDays =
      req.query.timeframe === '7d'
        ? 7
        : req.query.timeframe === '30d'
          ? 30
          : req.query.timeframe === '90d'
            ? 90
            : req.query.timeframe === '365d'
              ? 365
              : null;

    const cutoffDate = timeframeDays ? new Date(Date.now() - timeframeDays * 86400000) : null;

    const [
      plantList,
      deptList,
      incList,
      capaList,
      permitList,
      obsList,
      riskList,
      auditList,
      equipList,
      trainingList,
      workerList,
      contractorList,
      lotoList,
      ppeList,
      emergencyList,
      legalList,
      envList,
      workforceList,
      committeeList,
      weeklyList,
      gateList,
    ] = await Promise.all([
      db.select().from(plants).where(eq(plants.organizationId, orgId)),
      db.select().from(departments).where(eq(departments.organizationId, orgId)),
      db.select().from(incidents).where(eq(incidents.organizationId, orgId)).orderBy(desc(incidents.createdAt)),
      db.select().from(capas).where(eq(capas.organizationId, orgId)).orderBy(desc(capas.createdAt)),
      db
        .select()
        .from(workPermits)
        .where(and(eq(workPermits.organizationId, orgId), eq(workPermits.isArchived, false)))
        .orderBy(desc(workPermits.createdAt)),
      db.select().from(safetyObservations).where(eq(safetyObservations.organizationId, orgId)).orderBy(desc(safetyObservations.createdAt)),
      db.select().from(riskAssessments).where(eq(riskAssessments.organizationId, orgId)),
      db.select().from(safetyAudits).where(eq(safetyAudits.organizationId, orgId)),
      db.select().from(equipmentAssets).where(eq(equipmentAssets.organizationId, orgId)),
      db.select().from(trainingRecords).where(eq(trainingRecords.organizationId, orgId)),
      db.select().from(contractorWorkers).where(eq(contractorWorkers.organizationId, orgId)),
      db.select().from(contractors).where(eq(contractors.organizationId, orgId)),
      db.select().from(lotoRecords).where(eq(lotoRecords.organizationId, orgId)),
      db.select().from(ppeInventory).where(eq(ppeInventory.organizationId, orgId)),
      db.select().from(emergencyRecords).where(eq(emergencyRecords.organizationId, orgId)),
      db.select().from(legalCompliances).where(eq(legalCompliances.organizationId, orgId)),
      db.select().from(environmentRecords).where(eq(environmentRecords.organizationId, orgId)),
      db.select().from(workforceRecords).where(eq(workforceRecords.organizationId, orgId)),
      db.select().from(safetyCommittees).where(eq(safetyCommittees.organizationId, orgId)),
      db.select().from(weeklySafetyActivities).where(eq(weeklySafetyActivities.organizationId, orgId)),
      db.select().from(gateEntries).where(eq(gateEntries.organizationId, orgId)),
    ]);

    const allowedPlantIds = new Set(
      plantList
        .filter((p) => (!plantId || p.id === plantId) && (!businessUnitId || p.businessUnitId === businessUnitId))
        .map((p) => p.id)
    );

    const filterRow = (row: { plantId?: string | null; departmentId?: string | null; createdAt?: Date }) => {
      if ((plantId || businessUnitId) && (!row.plantId || !allowedPlantIds.has(row.plantId))) return false;
      if (departmentId && row.departmentId !== departmentId) return false;
      if (cutoffDate && row.createdAt && new Date(row.createdAt) < cutoffDate) return false;
      return true;
    };

    const filterPlantOnly = (row: { plantId?: string | null; createdAt?: Date }) => {
      if ((plantId || businessUnitId) && (!row.plantId || !allowedPlantIds.has(row.plantId))) return false;
      if (cutoffDate && row.createdAt && new Date(row.createdAt) < cutoffDate) return false;
      return true;
    };

    const filteredPlants = plantList.filter((p) => allowedPlantIds.has(p.id));
    const filteredDepts = deptList.filter((d) => !(plantId || businessUnitId) || allowedPlantIds.has(d.plantId));
    const filteredInc = incList.filter(filterRow);
    const filteredCapas = capaList.filter((c) => {
      if ((plantId || businessUnitId) && (!c.plantId || !allowedPlantIds.has(c.plantId))) return false;
      if (departmentId && c.departmentId !== departmentId) return false;
      if (cutoffDate && c.createdAt && new Date(c.createdAt) < cutoffDate) return false;
      return true;
    });
    const filteredPermits = permitList.filter((p) => {
      if (!filterRow(p)) return false;
      if (contractorName && (p.contractorName || '').toLowerCase() !== contractorName.toLowerCase()) return false;
      return true;
    });
    const filteredObs = obsList.filter(filterRow);
    const filteredRisks = riskList.filter((r) => !(plantId || businessUnitId) || (r.plantId && allowedPlantIds.has(r.plantId)));
    const filteredAudits = auditList.filter(filterPlantOnly);
    const filteredEquip = equipList.filter((e) => !(plantId || businessUnitId) || (e.plantId && allowedPlantIds.has(e.plantId)));
    const filteredTrainings = trainingList.filter(filterPlantOnly);
    const filteredWorkers = workerList.filter((w) => !(plantId || businessUnitId) || (w.plantId && allowedPlantIds.has(w.plantId)));
    const filteredLotos = lotoList.filter(filterPlantOnly);
    const filteredPpe = ppeList.filter((p) => !(plantId || businessUnitId) || (p.plantId && allowedPlantIds.has(p.plantId)));
    const filteredEmergencies = emergencyList.filter(filterPlantOnly);
    const filteredLegal = legalList.filter((l) => !(plantId || businessUnitId) || !l.plantId || allowedPlantIds.has(l.plantId));
    const filteredEnv = envList.filter(filterPlantOnly);

    const totalEmployees = filteredPlants.reduce((acc, p) => acc + (p.totalEmployees || 0), 0);
    const totalContractors = Math.max(
      filteredPlants.reduce((acc, p) => acc + (p.totalContractors || 0), 0),
      filteredWorkers.length
    );
    const totalManhours = filteredPlants.reduce((acc, p) => acc + (p.monthlyManhours || 0), 0);

    const ltiIncidents = filteredInc.filter((i) => i.incidentType === 'Lost Time Injury (LTI)');
    const ltiCount = ltiIncidents.length;
    const totalDaysLost = filteredInc.reduce((sum, i) => sum + (Number(i.daysLost) || 0), 0);
    const dartCount = filteredInc.filter(
      (i) => i.incidentType === 'Lost Time Injury (LTI)' || i.incidentType === 'Restricted Work Case'
    ).length;
    const firstAidCount = filteredInc.filter((i) => i.incidentType === 'First Aid Case').length;
    const mtcCount = filteredInc.filter((i) => i.incidentType === 'Medical Treatment Case').length;
    const nearMissIncCount = filteredInc.filter((i) => i.incidentType === 'Near Miss').length;
    const nearMissObsCount = filteredObs.filter((o) => o.observationType === 'Near Miss').length;
    const nearMissCount = nearMissIncCount + nearMissObsCount;
    const fatalitiesCount = filteredInc.filter((i) => i.incidentType === 'Fatality').length;
    const propertyDamageCount = filteredInc.filter((i) => i.incidentType === 'Property Damage').length;
    const recordableCount = filteredInc.filter(
      (i) =>
        i.isRecordable ||
        ['Lost Time Injury (LTI)', 'Restricted Work Case', 'Medical Treatment Case', 'Fatality'].includes(
          i.incidentType
        )
    ).length;

    const trir = totalManhours > 0 ? Number(((recordableCount * 200000) / totalManhours).toFixed(2)) : 0;
    const ltifr = totalManhours > 0 ? Number(((ltiCount * 1000000) / totalManhours).toFixed(2)) : 0;
    const severityRate = totalManhours > 0 ? Number(((totalDaysLost * 1000000) / totalManhours).toFixed(2)) : 0;

    let daysSinceLastLti = 365;
    let lastLtiDate: string | null = null;
    if (ltiIncidents.length > 0) {
      const sortedLti = [...ltiIncidents].sort((a, b) =>
        (b.incidentDate || '').localeCompare(a.incidentDate || '')
      );
      lastLtiDate = sortedLti[0].incidentDate || new Date(sortedLti[0].createdAt).toISOString().slice(0, 10);
      const diffMs = Date.now() - new Date(lastLtiDate).getTime();
      daysSinceLastLti = Math.max(0, Math.floor(diffMs / 86400000));
    }

    const unsafeActs = filteredObs.filter((o) => o.observationType === 'Unsafe Act').length;
    const unsafeConditions = filteredObs.filter((o) => o.observationType === 'Unsafe Condition').length;

    const todayStr = new Date().toISOString().slice(0, 10);
    const totalCapas = filteredCapas.length;
    const closedCapas = filteredCapas.filter((c) => c.status === 'Closed').length;
    const openCapa = filteredCapas.filter((c) => c.status !== 'Closed').length;
    const overdueCapa = filteredCapas.filter(
      (c) => c.status !== 'Closed' && (c.status === 'Overdue' || (c.targetDate && c.targetDate < todayStr))
    ).length;
    const capaClosurePct = totalCapas > 0 ? Number(((closedCapas / totalCapas) * 100).toFixed(1)) : 100;

    // Live PTW Compliance Calculation (automatically recalculates on any permit change!)
    const nowIso = new Date().toISOString().slice(0, 16);
    const totalPermits = filteredPermits.length;
    const expiredPermits = filteredPermits.filter(
      (p) => p.status === 'Expired' || (p.status === 'Active' && p.endDate && p.endDate < nowIso)
    ).length;
    const activePermits = filteredPermits.filter(
      (p) => (p.status === 'Active' || p.status === 'Approved') && !(p.endDate && p.endDate < nowIso)
    ).length;
    const closedPermits = filteredPermits.filter((p) => p.status === 'Closed').length;
    const suspendedPermits = filteredPermits.filter((p) => p.status === 'Suspended').length;
    const pendingApprovals = filteredPermits.filter((p) => p.status === 'Submitted').length;
    const compliantPermits = closedPermits + activePermits;
    const ptwCompliancePct =
      totalPermits > 0 ? Number(((compliantPermits / totalPermits) * 100).toFixed(1)) : 100;

    // Training Compliance
    const completedTrainings = filteredTrainings.filter((t) => t.status === 'Completed').length;
    const expiredTrainings = filteredTrainings.filter((t) => t.status === 'Expired' || t.status === 'Overdue').length;
    const trainingCompliancePct =
      filteredTrainings.length > 0
        ? Number(((completedTrainings / filteredTrainings.length) * 100).toFixed(1))
        : 100;

    // Inspection Compliance
    const okEquip = filteredEquip.filter(
      (e) => e.status === 'Operational' || e.status === 'Inspected'
    ).length;
    const inspectionCompliancePct =
      filteredEquip.length > 0 ? Number(((okEquip / filteredEquip.length) * 100).toFixed(1)) : 100;

    // Audit Compliance & Audit Closure
    const auditCompliancePct =
      filteredAudits.length > 0
        ? Math.round(
            filteredAudits.reduce((sum, a) => sum + (a.complianceScore ?? 100), 0) /
              filteredAudits.length
          )
        : 100;
    const closedAudits = filteredAudits.filter((a) => a.status === 'Closed' || a.status === 'Completed').length;
    const auditClosurePct =
      filteredAudits.length > 0 ? Number(((closedAudits / filteredAudits.length) * 100).toFixed(1)) : 100;

    // LOTO Compliance
    const verifiedLotos = filteredLotos.filter(
      (l) => l.zeroEnergyVerified || l.status === 'Verified' || l.status === 'Released' || l.status === 'Closed'
    ).length;
    const lotoCompliancePct =
      filteredLotos.length > 0 ? Number(((verifiedLotos / filteredLotos.length) * 100).toFixed(1)) : 100;

    // PPE Compliance
    const compliantPpeItems = filteredPpe.filter(
      (p) => (p.currentStock ?? 0) >= (p.minStock ?? 1)
    ).length;
    const ppeCompliancePct =
      filteredPpe.length > 0 ? Number(((compliantPpeItems / filteredPpe.length) * 100).toFixed(1)) : 100;

    // Contractor Compliance
    const compliantContractorsCount = contractorList.filter(
      (c) => (c.evaluationScore ?? 0) >= 75 && c.status !== 'Suspended' && c.status !== 'Blacklisted'
    ).length;
    const contractorCompliancePct =
      contractorList.length > 0
        ? Number(((compliantContractorsCount / contractorList.length) * 100).toFixed(1))
        : 100;

    // Legal Compliance
    const compliantLegalCount = filteredLegal.filter((l) => l.complianceStatus === 'Compliant').length;
    const legalCompliancePct =
      filteredLegal.length > 0 ? Number(((compliantLegalCount / filteredLegal.length) * 100).toFixed(1)) : 100;

    // Emergency Drills
    const emergencyDrillsCount = filteredEmergencies.filter(
      (e) => e.status === 'Completed' || e.recordType?.toLowerCase().includes('drill')
    ).length;

    // Environment & Energy Metrics from real DB records
    const envIncidentsCount = filteredInc.filter((i) =>
      (i.incidentType || '').toLowerCase().includes('environment')
    ).length;
    let wasteGeneratedTonnes = 0;
    let hazardousWasteTonnes = 0;
    let electricityMwh = 0;
    let waterKl = 0;
    let ghgEmissionsTco2e = 0;
    for (const ev of filteredEnv) {
      const cat = `${ev.recordType || ''} ${ev.metricName || ''}`.toLowerCase();
      const qty = Number(ev.quantity || 0);
      const unit = (ev.unit || '').toLowerCase();
      if (cat.includes('waste')) {
        const tonnes = unit.includes('kg') ? qty / 1000 : qty;
        wasteGeneratedTonnes += tonnes;
        if (cat.includes('hazard')) hazardousWasteTonnes += tonnes;
      } else if (cat.includes('electric') || cat.includes('energy') || cat.includes('power')) {
        const mwh = unit.includes('kwh') ? qty / 1000 : qty;
        electricityMwh += mwh;
      } else if (cat.includes('water')) {
        waterKl += qty;
      } else if (cat.includes('ghg') || cat.includes('emission') || cat.includes('co2') || cat.includes('carbon')) {
        ghgEmissionsTco2e += qty;
      }
    }

    // Aggregations for Charts
    const incidentByTypeMap = new Map<string, number>();
    for (const i of filteredInc) {
      incidentByTypeMap.set(i.incidentType, (incidentByTypeMap.get(i.incidentType) || 0) + 1);
    }

    const obsByTypeMap = new Map<string, number>();
    for (const o of filteredObs) {
      obsByTypeMap.set(o.observationType, (obsByTypeMap.get(o.observationType) || 0) + 1);
    }

    const riskDistribution = {
      Critical: filteredRisks.filter((r) => r.initialRiskScore >= 16).length,
      High: filteredRisks.filter((r) => r.initialRiskScore >= 10 && r.initialRiskScore < 16).length,
      Medium: filteredRisks.filter((r) => r.initialRiskScore >= 5 && r.initialRiskScore < 10).length,
      Low: filteredRisks.filter((r) => r.initialRiskScore < 5).length,
    };

    // 5x5 Risk Matrix cells (Open Hazards / Observations + Active Risk Assessments)
    const mapLikelihoodToNum = (val?: string | number | null): number => {
      if (typeof val === 'number' && !Number.isNaN(val)) return Math.max(1, Math.min(5, Math.round(val)));
      const s = String(val || '').toLowerCase();
      if (s.includes('almost') || s.includes('very high') || s === '5') return 5;
      if (s.includes('likely') || s.includes('high') || s === '4') return 4;
      if (s.includes('possible') || s.includes('medium') || s.includes('moderate') || s === '3') return 3;
      if (s.includes('unlikely') || s.includes('low') || s === '2') return 2;
      return 1;
    };
    const mapSeverityToNum = (val?: string | number | null): number => {
      if (typeof val === 'number' && !Number.isNaN(val)) return Math.max(1, Math.min(5, Math.round(val)));
      const s = String(val || '').toLowerCase();
      if (s.includes('critical') || s.includes('catastrophic') || s.includes('fatal') || s === '5') return 5;
      if (s.includes('high') || s.includes('major') || s === '4') return 4;
      if (s.includes('medium') || s.includes('moderate') || s === '3') return 3;
      if (s.includes('low') || s.includes('minor') || s === '2') return 2;
      return 1;
    };

    const openHazardsForMatrix = filteredObs
      .filter((o) => o.status !== 'Closed')
      .map((o) => {
        const l = mapLikelihoodToNum(o.likelihood);
        const s = mapSeverityToNum(o.severity);
        return {
          id: o.id,
          source: 'Open Hazard',
          title: `${o.observationNumber || 'OBS'} · ${o.title}`,
          hazard: o.description || o.category || '',
          likelihood: l,
          severity: s,
          score: l * s,
        };
      });

    const activeRisksForMatrix = filteredRisks
      .filter((r) => r.status !== 'Closed')
      .map((r) => {
        const l = Math.max(1, Math.min(5, Math.round(r.likelihood || 1)));
        const s = Math.max(1, Math.min(5, Math.round(r.severity || 1)));
        return {
          id: r.id,
          source: 'Risk Assessment',
          title: r.title || r.activityOrNode || r.methodology || 'Risk Item',
          hazard: r.hazard || '',
          likelihood: l,
          severity: s,
          score: r.initialRiskScore || l * s,
        };
      });

    const combinedMatrixItems = [...activeRisksForMatrix, ...openHazardsForMatrix];

    const riskMatrix5x5: {
      likelihood: number;
      severity: number;
      score: number;
      count: number;
      items: { id: string; source: string; title: string; hazard: string; score: number }[];
    }[] = [];
    for (let l = 5; l >= 1; l--) {
      for (let s = 1; s <= 5; s++) {
        const matching = combinedMatrixItems.filter((item) => item.likelihood === l && item.severity === s);
        riskMatrix5x5.push({
          likelihood: l,
          severity: s,
          score: l * s,
          count: matching.length,
          items: matching.slice(0, 12).map((r) => ({
            id: r.id,
            source: r.source,
            title: r.title,
            hazard: r.hazard,
            score: r.score,
          })),
        });
      }
    }

    const permitStatusMap = new Map<string, number>();
    for (const p of filteredPermits) {
      const effectiveStatus =
        p.status === 'Active' && p.endDate && p.endDate < nowIso ? 'Expired' : p.status;
      permitStatusMap.set(effectiveStatus, (permitStatusMap.get(effectiveStatus) || 0) + 1);
    }

    const capaStatusMap = new Map<string, number>();
    for (const c of filteredCapas) {
      capaStatusMap.set(c.status, (capaStatusMap.get(c.status) || 0) + 1);
    }

    // CAPA closure performance by priority (Critical, High, Medium, Low)
    const capaPriorities = ['Critical', 'High', 'Medium', 'Low'];
    const capaByPriority = capaPriorities.map((priority) => {
      const items = filteredCapas.filter((c) => (c.priority || 'Medium').toLowerCase() === priority.toLowerCase());
      const closed = items.filter((c) => c.status === 'Closed').length;
      const overdue = items.filter(
        (c) => c.status !== 'Closed' && (c.status === 'Overdue' || (c.targetDate && c.targetDate < todayStr))
      ).length;
      const openOnTrack = Math.max(0, items.length - closed - overdue);
      return { priority, closed, openOnTrack, overdue, total: items.length };
    });

    // 12-Month Incident vs Near Miss Series + Monthly Inspection Score %
    const monthLabelsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const last12Months: string[] = [];
    const nowDate = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1);
      last12Months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const incidentVsNearMiss12m = last12Months.map((ym) => {
      const [yr, mo] = ym.split('-');
      const label = `${monthLabelsShort[Number(mo) - 1]} '${yr.slice(2)}`;
      const incInMonth = filteredInc.filter((i) => {
        const m = (i.incidentDate || new Date(i.createdAt).toISOString()).slice(0, 7);
        return m === ym && i.incidentType !== 'Near Miss';
      }).length;
      const nmInMonth =
        filteredInc.filter((i) => {
          const m = (i.incidentDate || new Date(i.createdAt).toISOString()).slice(0, 7);
          return m === ym && i.incidentType === 'Near Miss';
        }).length +
        filteredObs.filter((o) => {
          const m = new Date(o.createdAt).toISOString().slice(0, 7);
          return m === ym && o.observationType === 'Near Miss';
        }).length;
      return { month: ym, label, incidents: incInMonth, nearMisses: nmInMonth };
    });

    const monthlyInspectionScores = last12Months.map((ym) => {
      const [yr, mo] = ym.split('-');
      const label = `${monthLabelsShort[Number(mo) - 1]} '${yr.slice(2)}`;
      const auditsInMonth = filteredAudits.filter(
        (a) => (a.scheduledDate || new Date(a.createdAt).toISOString()).slice(0, 7) === ym
      );
      const score =
        auditsInMonth.length > 0
          ? Math.round(
              auditsInMonth.reduce((sum, a) => sum + (a.complianceScore ?? 100), 0) / auditsInMonth.length
            )
          : Math.round(inspectionCompliancePct);
      return { month: ym, label, score };
    });

    const monthlyWaste12m = last12Months.map((ym) => {
      const [yr, mo] = ym.split('-');
      const label = `${monthLabelsShort[Number(mo) - 1]} '${yr.slice(2)}`;
      let tonnes = 0;
      for (const ev of filteredEnv) {
        const m = (ev.monitoringDate || new Date(ev.createdAt).toISOString()).slice(0, 7);
        const cat = `${ev.recordType || ''} ${ev.metricName || ''}`.toLowerCase();
        if (m === ym && cat.includes('waste')) {
          const qty = Number(ev.quantity || 0);
          tonnes += (ev.unit || '').toLowerCase().includes('kg') ? qty / 1000 : qty;
        }
      }
      return { month: ym, label, tonnes: Number(tonnes.toFixed(2)) };
    });

    const monthlyEnergy12m = last12Months.map((ym) => {
      const [yr, mo] = ym.split('-');
      const label = `${monthLabelsShort[Number(mo) - 1]} '${yr.slice(2)}`;
      let mwh = 0;
      for (const ev of filteredEnv) {
        const m = (ev.monitoringDate || new Date(ev.createdAt).toISOString()).slice(0, 7);
        const cat = `${ev.recordType || ''} ${ev.metricName || ''}`.toLowerCase();
        if (m === ym && (cat.includes('electric') || cat.includes('energy') || cat.includes('power'))) {
          const qty = Number(ev.quantity || 0);
          mwh += (ev.unit || '').toLowerCase().includes('kwh') ? qty / 1000 : qty;
        }
      }
      return { month: ym, label, mwh: Number(mwh.toFixed(1)) };
    });

    // Department-wise safety events & training compliance
    const deptNameById = new Map<string, string>();
    for (const d of filteredDepts) deptNameById.set(d.id, d.name);

    const deptEventsMap = new Map<string, number>();
    for (const d of filteredDepts) deptEventsMap.set(d.name, 0);
    for (const i of filteredInc) {
      const dName = i.departmentName || (i.departmentId ? deptNameById.get(i.departmentId) : null) || 'General Operations';
      deptEventsMap.set(dName, (deptEventsMap.get(dName) || 0) + 1);
    }
    for (const o of filteredObs) {
      const dName = (o.departmentId ? deptNameById.get(o.departmentId) : null) || 'General Operations';
      deptEventsMap.set(dName, (deptEventsMap.get(dName) || 0) + 1);
    }
    const departmentEvents = Array.from(deptEventsMap.entries())
      .map(([departmentName, events]) => ({ departmentName, events }))
      .sort((a, b) => b.events - a.events)
      .slice(0, 8);

    const trainingByDepartment = filteredDepts.slice(0, 6).map((d) => {
      const deptTrainings = filteredTrainings.filter(
        (t) => (t.title || '').toLowerCase().includes(d.name.toLowerCase()) || t.plantId === d.plantId
      );
      const total = deptTrainings.length;
      const completed = deptTrainings.filter((t) => t.status === 'Completed').length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : Math.round(trainingCompliancePct);
      return { departmentName: d.name, completed, total, pct };
    });

    // Monthly Time-Series Trend (from live DB dates)
    const monthBuckets = new Map<string, { month: string; incidents: number; lti: number; observations: number; permits: number }>();
    const addMonthBucket = (ym: string) => {
      if (!monthBuckets.has(ym)) {
        monthBuckets.set(ym, { month: ym, incidents: 0, lti: 0, observations: 0, permits: 0 });
      }
      return monthBuckets.get(ym)!;
    };
    for (const i of filteredInc) {
      const ym = (i.incidentDate || new Date(i.createdAt).toISOString()).slice(0, 7);
      const b = addMonthBucket(ym);
      b.incidents += 1;
      if (i.incidentType === 'Lost Time Injury (LTI)') b.lti += 1;
    }
    for (const o of filteredObs) {
      const ym = new Date(o.createdAt).toISOString().slice(0, 7);
      addMonthBucket(ym).observations += 1;
    }
    for (const p of filteredPermits) {
      const ym = (p.startDate || new Date(p.createdAt).toISOString()).slice(0, 7);
      addMonthBucket(ym).permits += 1;
    }
    const monthlyTrends = Array.from(monthBuckets.values()).sort((a, b) => a.month.localeCompare(b.month));

    const contractorPerformance = contractorList.map((c) => ({
      id: c.id,
      vendorCode: c.vendorCode,
      companyName: c.companyName,
      evaluationScore: c.evaluationScore,
      permitsIssued: permitList.filter(
        (p) => (p.contractorName || '').toLowerCase() === c.companyName.toLowerCase()
      ).length,
      status: c.status,
    }));

    const plantComparison = plantList.map((p) => ({
      plantId: p.id,
      plantName: p.name,
      incidents: incList.filter((i) => i.plantId === p.id).length,
      observations: obsList.filter((o) => o.plantId === p.id).length,
      activePermits: permitList.filter(
        (w) => w.plantId === p.id && (w.status === 'Active' || w.status === 'Approved') && !(w.endDate && w.endDate < nowIso)
      ).length,
      openCapas: capaList.filter((c) => c.plantId === p.id && c.status !== 'Closed').length,
      manhours: p.monthlyManhours,
    }));

    const hasSampleData =
      filteredInc.some((i) => i.isDemo) ||
      filteredPermits.some((p) => p.isDemo) ||
      filteredObs.some((o) => o.isDemo);

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      hasSampleData,
      contractorsList: Array.from(new Set(contractorList.map((c) => c.companyName).filter(Boolean))),
      kpis: {
        totalEmployees,
        totalContractors,
        totalManhours,
        ltiCount,
        trir,
        ltifr,
        severityRate,
        totalDaysLost,
        daysSinceLastLti,
        lastLtiDate,
        dartCount,
        firstAidCount,
        mtcCount,
        nearMissCount,
        fatalitiesCount,
        propertyDamageCount,
        unsafeActs,
        unsafeConditions,
        totalCapas,
        closedCapas,
        openCapa,
        overdueCapa,
        capaClosurePct,
        totalPermits,
        activePermits,
        closedPermits,
        suspendedPermits,
        expiredPermits,
        pendingApprovals,
        ptwCompliancePct,
        trainingCompliancePct,
        expiredTrainings,
        inspectionCompliancePct,
        auditCompliancePct,
        auditClosurePct,
        totalAudits: filteredAudits.length,
        closedAudits,
        lotoCompliancePct,
        totalLotos: filteredLotos.length,
        verifiedLotos,
        ppeCompliancePct,
        totalPpeItems: filteredPpe.length,
        compliantPpeItems,
        contractorCompliancePct,
        totalContractorsCount: contractorList.length,
        compliantContractorsCount,
        legalCompliancePct,
        totalLegalCount: filteredLegal.length,
        compliantLegalCount,
        emergencyDrillsCount,
        envIncidentsCount,
        wasteGeneratedTonnes: Number(wasteGeneratedTonnes.toFixed(1)),
        hazardousWasteTonnes: Number(hazardousWasteTonnes.toFixed(1)),
        electricityMwh: Number(electricityMwh.toFixed(1)),
        waterKl: Number(waterKl.toFixed(1)),
        ghgEmissionsTco2e: Number(ghgEmissionsTco2e.toFixed(1)),
      },
      charts: {
        incidentsByType: Array.from(incidentByTypeMap.entries()).map(([label, value]) => ({ label, value })),
        observationsByType: Array.from(obsByTypeMap.entries()).map(([label, value]) => ({ label, value })),
        riskDistribution: Object.entries(riskDistribution).map(([label, value]) => ({ label, value })),
        permitStatus: Array.from(permitStatusMap.entries()).map(([label, value]) => ({ label, value })),
        capaStatus: Array.from(capaStatusMap.entries()).map(([label, value]) => ({ label, value })),
        capaByPriority,
        incidentVsNearMiss12m,
        monthlyInspectionScores,
        monthlyWaste12m,
        monthlyEnergy12m,
        riskMatrix5x5,
        departmentEvents,
        trainingByDepartment,
        monthlyTrends,
        contractorPerformance,
        plantComparison,
      },
      recentActivity: {
        incidents: filteredInc.slice(0, 5),
        permits: filteredPermits.slice(0, 5),
        observations: filteredObs.slice(0, 5),
        capas: filteredCapas.slice(0, 5),
      },
      // ======================================================================
      // SIX SEPARATE ENTERPRISE KPI CATEGORIES (Strict Segregation)
      // ======================================================================
      sixCategories: (() => {
        const exposureBase = req.query.exposureBase === '1000000' ? 1_000_000 : 200_000;
        const safeHours = Math.max(1, totalManhours);

        // 1. WORKFORCE
        const permanentCount = workforceList.filter((w) => w.workerCategory === 'Permanent').length || totalEmployees;
        const contractWorkforceCount =
          workforceList.filter((w) => w.workerCategory === 'Contract').length || totalContractors || workerList.length;
        const tempCount = workforceList.filter((w) => w.workerCategory === 'Temporary').length;
        const visitorCount = gateList.filter((g) => (g.entryType || '').toLowerCase().includes('visitor')).length;
        const inductedWorkers =
          workerList.filter((w) => Boolean(w.inductionDate)).length +
          workforceList.filter((w) => w.inductionCompleted).length;
        const totalTrackedWorkers = workerList.length + workforceList.length;
        const inductionCompletionPct =
          totalTrackedWorkers > 0 ? Number(((inductedWorkers / totalTrackedWorkers) * 100).toFixed(1)) : 100;
        const medicallyFitWorkers =
          workerList.filter((w) => Boolean(w.medicalFitnessDate)).length +
          workforceList.filter((w) => w.medicalFitnessValid).length;
        const medicalCompliancePct =
          totalTrackedWorkers > 0 ? Number(((medicallyFitWorkers / totalTrackedWorkers) * 100).toFixed(1)) : 100;
        const manhoursWithoutLti = ltiCount === 0 ? totalManhours : Math.round(totalManhours * (daysSinceLastLti / Math.max(daysSinceLastLti + 30, 30)));
        const overtimeHours = workforceList.reduce((acc, w) => acc + Number(w.overtimeHours || 0), 0);

        // 2. LAGGING INDICATORS
        const countIncMatch = (kw: string[]) =>
          filteredInc.filter((i) => kw.some((k) => `${i.incidentType} ${i.title} ${i.description}`.toLowerCase().includes(k))).length;
        const totalRecordableIncidents = filteredInc.filter((i) => i.isRecordable).length || ltiCount + mtcCount + dartCount;
        const fireIncidents = countIncMatch(['fire', 'flame', 'smoke', 'ignition']);
        const electricalIncidents = countIncMatch(['electrical', 'arc flash', 'shock', 'electrocution']);
        const chemicalSpills = countIncMatch(['chemical', 'spill', 'leak', 'toxic', 'gas']);
        const occupationalIllness = countIncMatch(['illness', 'disease', 'ergonomic', 'heat stress']);
        const vehicleIncidents = countIncMatch(['vehicle', 'forklift', 'traffic', 'fleet', 'collision']);
        const equipmentDamage = countIncMatch(['equipment', 'machine', 'crane', 'breakdown']);
        const contractorIncidents = filteredInc.filter((i) => (i.personType || '').toLowerCase().includes('contractor')).length;
        const processSafetyEvents = countIncMatch(['process safety', 'pressure', 'rupture', 'runaway', 'psm']);
        const highPotentialIncidents = filteredInc.filter((i) => ['Critical', 'High'].includes(i.severity)).length;
        const investigationsCompleted = filteredInc.filter((i) => ['Investigated', 'Closed'].includes(i.status)).length;
        const rcaCompleted = filteredInc.filter((i) => Boolean(i.rootCauses && i.rootCauses.trim())).length;
        const triRateConfigurable = Number(((totalRecordableIncidents * exposureBase) / safeHours).toFixed(2));

        // 3. LEADING INDICATORS
        const completedTrainings = filteredTrainings.filter((t) => t.status === 'Completed').length;
        const tbtCount =
          filteredPermits.filter((p) => (p.toolboxTalk as Record<string, unknown>)?.conducted).length +
          filteredTrainings.filter((t) => `${t.category} ${t.title}`.toLowerCase().includes('toolbox') || `${t.category} ${t.title}`.toLowerCase().includes('tbt')).length;
        const safetyInspectionsCompleted = equipList.filter((e) => Boolean(e.lastInspectionDate)).length + weeklyList.filter((w) => w.status === 'Completed').length;
        const bbsObservationsCount = filteredObs.length;
        const closedObsCount = filteredObs.filter((o) => o.status === 'Closed').length;
        const observationClosurePct = bbsObservationsCount > 0 ? Number(((closedObsCount / bbsObservationsCount) * 100).toFixed(1)) : 100;
        const hiraCompleted = filteredRisks.filter((r) => ['Approved', 'Active', 'Completed'].includes(r.status)).length;
        const safetyCommitteeMeetings = committeeList.filter((c) => c.recordType === 'Meeting').length;
        const legalReviewsCompleted = filteredLegal.filter((l) => Boolean(l.verifiedBy) || l.complianceStatus === 'Compliant').length;

        // 4. ACTIONS (All 8 statuses)
        const actionStatusCounts = {
          Open: filteredCapas.filter((c) => c.status === 'Open').length,
          Assigned: filteredCapas.filter((c) => c.status === 'Assigned').length,
          'In Progress': filteredCapas.filter((c) => c.status === 'In Progress').length,
          'Pending Verification': filteredCapas.filter((c) => c.status === 'Pending Verification').length,
          Closed: filteredCapas.filter((c) => c.status === 'Closed').length,
          Rejected: filteredCapas.filter((c) => c.status === 'Rejected').length,
          Reopened: filteredCapas.filter((c) => c.status === 'Reopened' || (c.reopenCount ?? 0) > 0).length,
          Overdue: overdueCapa,
        };
        const actionsBySourceMap = new Map<string, number>();
        for (const c of filteredCapas) {
          const src = c.sourceType || 'general';
          actionsBySourceMap.set(src, (actionsBySourceMap.get(src) || 0) + 1);
        }

        // 5. PERMITS (All 23 permit types + 3-stage pipeline)
        const permitTypeCountMap = new Map<string, number>();
        for (const pt of ALL_23_PERMIT_TYPES) permitTypeCountMap.set(pt, 0);
        for (const p of filteredPermits) {
          permitTypeCountMap.set(p.permitType, (permitTypeCountMap.get(p.permitType) || 0) + 1);
        }
        const pendingDeptHeadPermits = filteredPermits.filter(
          (p) => p.status === 'Pending Department Head Approval' || p.status === 'Submitted'
        ).length;
        const pendingSafetyPermits = filteredPermits.filter(
          (p) => p.status === 'Pending Safety Approval'
        ).length;
        const draftPermits = filteredPermits.filter((p) => p.status === 'Draft').length;
        const returnedPermits = filteredPermits.filter((p) => p.status === 'Returned for Clarification').length;
        const rejectedPermits = filteredPermits.filter((p) => p.status === 'Rejected').length;
        const cancelledPermits = filteredPermits.filter((p) => p.status === 'Cancelled').length;
        const highRiskPermitsCount = filteredPermits.filter((p) => p.isHighRisk).length;
        const permitViolations = filteredObs.filter((o) => `${o.category} ${o.title}`.toLowerCase().includes('permit') || `${o.category} ${o.title}`.toLowerCase().includes('ptw')).length;

        // 6. COMPLIANCE (Jurisdiction-configurable Legal, ISO, International, ESG)
        const pendingAssessmentCount = filteredLegal.filter(
          (l) => !l.applicability || l.applicability === 'Pending Assessment'
        ).length;
        const applicableLegalList = filteredLegal.filter((l) => l.applicability === 'Applicable');
        const expiringSoonLegal = filteredLegal.filter((l) => {
          if (!l.dueDate) return false;
          const diffDays = (new Date(l.dueDate).getTime() - Date.now()) / 86400000;
          return diffDays >= 0 && diffDays <= 30;
        }).length;
        const overdueLegal = filteredLegal.filter(
          (l) => l.dueDate && l.dueDate < todayStr && l.complianceStatus !== 'Compliant'
        ).length;

        const isoSystems = [
          { code: 'ISO 45001:2018', name: 'Occupational Health & Safety Management', status: auditCompliancePct >= 80 ? 'Active / Audited' : 'Gap Review Needed', score: auditCompliancePct },
          { code: 'ISO 14001:2015', name: 'Environmental Management System', status: filteredEnv.length > 0 ? 'Monitoring Active' : 'Pending Data', score: envIncidentsCount === 0 ? 96 : Math.max(60, 100 - envIncidentsCount * 4) },
          { code: 'ISO 9001:2015', name: 'Quality Management System', status: 'Configurable', score: inspectionCompliancePct },
          { code: 'ISO 50001:2018', name: 'Energy Management System', status: electricityMwh > 0 ? 'Tracking Active' : 'Pending Data', score: electricityMwh > 0 ? 88 : 0 },
          { code: 'ISO 31000:2018', name: 'Enterprise Risk Management', status: filteredRisks.length > 0 ? 'Active Matrix' : 'Pending Assessment', score: filteredRisks.length > 0 ? 90 : 0 },
          { code: 'ISO 22301:2019', name: 'Business Continuity & Emergency Preparedness', status: emergencyDrillsCount > 0 ? 'Drills Conducted' : 'Scheduled', score: emergencyDrillsCount > 0 ? 92 : 50 },
        ];

        return {
          workforce: {
            summary: {
              totalWorkforce: permanentCount + contractWorkforceCount + tempCount,
              permanentEmployees: permanentCount,
              contractWorkforce: contractWorkforceCount,
              temporaryWorkers: tempCount,
              visitorsLogged: visitorCount,
              totalManhours,
              manhoursWithoutLti,
              overtimeHours,
              avgDailyStrength: Math.round((permanentCount + contractWorkforceCount) * 0.92),
              contractorCompliancePct,
              trainingCoveragePct: trainingCompliancePct,
              inductionCompletionPct,
              medicalCompliancePct,
              ppeCompliancePct,
            },
            distribution: [
              { label: 'Permanent Employees', value: permanentCount },
              { label: 'Contract Workforce', value: contractWorkforceCount },
              { label: 'Temporary Workers', value: tempCount },
              { label: 'Site Visitors (Logged)', value: visitorCount },
            ],
            contractorPerformance,
            trainingByDepartment,
            records: workerList.slice(0, 25),
          },
          lagging: {
            formulaConfig: {
              ltifrFormula: '(LTI Count × 1,000,000) / Total Exposure Manhours',
              trirFormula: `(Total Recordable Incidents × ${exposureBase.toLocaleString()}) / Total Exposure Manhours`,
              severityFormula: '(Lost Workdays × 1,000,000) / Total Exposure Manhours',
              exposureBase,
              totalManhours,
            },
            summary: {
              fatalities: fatalitiesCount,
              ltiCount,
              ltifr,
              totalRecordableIncidents,
              trir,
              configurableTriRate: triRateConfigurable,
              mtcCount,
              firstAidCount,
              restrictedWorkCases: dartCount,
              lostWorkdays: totalDaysLost,
              daysSinceLastLti,
              lastLtiDate,
              severityRate,
              nearMissCount,
              unsafeActs,
              unsafeConditions,
              propertyDamageCount,
              fireIncidents,
              electricalIncidents,
              environmentalIncidents: envIncidentsCount,
              chemicalSpills,
              occupationalIllness,
              vehicleIncidents,
              equipmentDamage,
              contractorIncidents,
              processSafetyEvents,
              highPotentialIncidents,
              investigationsCompleted,
              rcaCompleted,
              capaClosedCount: closedCapas,
            },
            incidentsByType: Array.from(incidentByTypeMap.entries()).map(([label, value]) => ({ label, value })),
            incidentVsNearMiss12m,
            departmentEvents,
            records: filteredInc.slice(0, 25),
          },
          leading: {
            summary: {
              trainingsCompleted: completedTrainings,
              totalTrainings: filteredTrainings.length,
              trainingCompliancePct,
              toolboxTalksConducted: tbtCount,
              inspectionsCompleted: safetyInspectionsCompleted,
              inspectionCompliancePct,
              auditsCompleted: closedAudits,
              totalAudits: filteredAudits.length,
              auditCompliancePct,
              auditClosurePct,
              bbsObservations: bbsObservationsCount,
              observationClosurePct,
              hazardsReported: unsafeConditions + unsafeActs,
              hiraJsaCompleted: hiraCompleted,
              totalRiskAssessments: filteredRisks.length,
              mockDrillsConducted: emergencyDrillsCount,
              safetyCommitteeMeetings,
              contractorAudits: contractorList.length,
              lotoCompliancePct,
              ppeCompliancePct,
              legalReviewsCompleted,
              equipmentOperationalPct:
                equipList.length > 0
                  ? Number(((equipList.filter((e) => e.status === 'Operational').length / equipList.length) * 100).toFixed(1))
                  : 100,
            },
            observationsByType: Array.from(obsByTypeMap.entries()).map(([label, value]) => ({ label, value })),
            monthlyInspectionScores,
            riskMatrix5x5,
            records: filteredObs.slice(0, 25),
          },
          actions: {
            summary: {
              totalActions: totalCapas,
              openActions: actionStatusCounts.Open,
              assignedActions: actionStatusCounts.Assigned,
              inProgressActions: actionStatusCounts['In Progress'],
              pendingVerificationActions: actionStatusCounts['Pending Verification'],
              closedActions: actionStatusCounts.Closed,
              rejectedActions: actionStatusCounts.Rejected,
              reopenedActions: actionStatusCounts.Reopened,
              overdueActions: actionStatusCounts.Overdue,
              highPriorityOpen: filteredCapas.filter((c) => ['Critical', 'High'].includes(c.priority) && c.status !== 'Closed').length,
              capaClosurePct,
              onTimeClosurePct:
                closedCapas > 0
                  ? Number(
                      (
                        (filteredCapas.filter(
                          (c) => c.status === 'Closed' && (!c.completionDate || !c.targetDate || c.completionDate <= c.targetDate)
                        ).length /
                          closedCapas) *
                        100
                      ).toFixed(1)
                    )
                  : 100,
            },
            byStatus: Object.entries(actionStatusCounts).map(([label, value]) => ({ label, value })),
            bySource: Array.from(actionsBySourceMap.entries()).map(([label, value]) => ({ label, value })),
            capaByPriority,
            records: filteredCapas.slice(0, 40),
          },
          permits: {
            summary: {
              totalPermits,
              draftPermits,
              pendingDeptHeadPermits,
              pendingSafetyPermits,
              pendingApprovals: pendingDeptHeadPermits + pendingSafetyPermits,
              activePermits,
              suspendedPermits,
              expiredPermits,
              closedPermits,
              rejectedPermits,
              returnedPermits,
              cancelledPermits,
              highRiskPermits: highRiskPermitsCount,
              permitViolations,
              ptwCompliancePct,
            },
            byStatus: Array.from(permitStatusMap.entries()).map(([label, value]) => ({ label, value })),
            byType: Array.from(permitTypeCountMap.entries())
              .map(([label, value]) => ({ label, value }))
              .sort((a, b) => b.value - a.value),
            all23Types: ALL_23_PERMIT_TYPES,
            records: filteredPermits.slice(0, 30),
          },
          compliance: {
            jurisdictionNote:
              'Regulations and standards are jurisdiction-configurable (country, state, and industry). Unassessed entries remain in "Pending Assessment" until formally reviewed by EHS/Legal.',
            summary: {
              totalObligations: filteredLegal.length,
              applicableCount: applicableLegalList.length,
              pendingAssessmentCount,
              compliantCount: compliantLegalCount,
              overdueCount: overdueLegal,
              expiringWithin30Days: expiringSoonLegal,
              legalCompliancePct,
              wasteGeneratedTonnes: Number(wasteGeneratedTonnes.toFixed(1)),
              hazardousWasteTonnes: Number(hazardousWasteTonnes.toFixed(1)),
              electricityMwh: Number(electricityMwh.toFixed(1)),
              waterKl: Number(waterKl.toFixed(1)),
              ghgEmissionsTco2e: Number(ghgEmissionsTco2e.toFixed(1)),
            },
            isoSystems,
            monthlyWaste12m,
            monthlyEnergy12m,
            records: filteredLegal.slice(0, 30),
          },
        };
      })(),
    });
  } catch (error) {
    console.error('KPI computation error:', error);
    res.status(500).json({ error: 'Failed to calculate dashboard KPIs' });
  }
});

// ============================================================================
// INCIDENTS + RCA / INVESTIGATION + CAPAS
// ============================================================================
router.get('/incidents', async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(incidents)
      .where(eq(incidents.organizationId, req.organizationId!))
      .orderBy(desc(incidents.createdAt));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load incidents' });
  }
});

router.post('/incidents', async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const b = req.body;
    const isRecordable = ['Lost Time Injury (LTI)', 'Restricted Work Case', 'Medical Treatment Case', 'Fatality'].includes(
      b.incidentType
    );

    const [created] = await db
      .insert(incidents)
      .values({
        organizationId: orgId,
        plantId: b.plantId || null,
        departmentId: b.departmentId || null,
        plantName: b.plantName || null,
        departmentName: b.departmentName || null,
        incidentNumber: makeNumber('INC'),
        incidentType: b.incidentType || 'Near Miss',
        severity: b.severity || 'Medium',
        title: b.title,
        description: b.description || '',
        incidentDate: b.incidentDate || new Date().toISOString().slice(0, 10),
        incidentTime: b.incidentTime || new Date().toTimeString().slice(0, 5),
        specificLocation: b.specificLocation || '',
        personType: b.personType || 'Employee',
        injuredPersonDetails: b.injuredPersonDetails || {},
        witnessDetails: b.witnessDetails || [],
        immediateActions: b.immediateActions || '',
        evidenceFiles: b.evidenceFiles || [],
        investigationTeam: b.investigationTeam || [],
        timelineEvents: b.timelineEvents || [{ time: new Date().toISOString().slice(11, 16), event: 'Incident reported in ARSHIEL SAFETY' }],
        rcaMethod: b.rcaMethod || '5 Why',
        rcaData: b.rcaData || {},
        directCauses: b.directCauses || '',
        rootCauses: b.rootCauses || '',
        contributingFactors: b.contributingFactors || '',
        status: b.status || 'Reported',
        daysLost: Number(b.daysLost || 0),
        isRecordable,
        reportedByName: req.authUser!.fullName,
        isDemo: false,
      })
      .returning();

    await db.insert(notifications).values({
      organizationId: orgId,
      type: 'incident',
      severity: created.severity === 'Critical' || created.severity === 'High' ? 'critical' : 'warning',
      title: `Incident Reported: ${created.incidentNumber}`,
      message: `${created.incidentType} — ${created.title} (${created.severity})`,
      entityType: 'incident',
      entityId: created.id,
    });

    await writeAuditLog({
      organizationId: orgId,
      userId: req.authUser!.id,
      userName: req.authUser!.fullName,
      action: 'CREATE_INCIDENT',
      entityType: 'incident',
      entityId: created.id,
      details: { incidentNumber: created.incidentNumber, type: created.incidentType },
    });

    res.status(201).json(created);
  } catch (err) {
    console.error('Failed to create incident:', err);
    res.status(500).json({ error: 'Failed to report incident' });
  }
});

router.patch('/incidents/:id', async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const b = req.body;
    const [existing] = await db
      .select()
      .from(incidents)
      .where(and(eq(incidents.id, req.params.id), eq(incidents.organizationId, orgId)))
      .limit(1);
    if (!existing) return res.status(404).json({ error: 'Incident not found' });

    const [updated] = await db
      .update(incidents)
      .set({
        severity: b.severity ?? existing.severity,
        status: b.status ?? existing.status,
        investigationTeam: b.investigationTeam ?? existing.investigationTeam,
        timelineEvents: b.timelineEvents ?? existing.timelineEvents,
        rcaMethod: b.rcaMethod ?? existing.rcaMethod,
        rcaData: b.rcaData ?? existing.rcaData,
        directCauses: b.directCauses ?? existing.directCauses,
        rootCauses: b.rootCauses ?? existing.rootCauses,
        contributingFactors: b.contributingFactors ?? existing.contributingFactors,
        immediateActions: b.immediateActions ?? existing.immediateActions,
        daysLost: b.daysLost !== undefined ? Number(b.daysLost) : existing.daysLost,
        closedAt: b.status === 'Closed' ? new Date() : existing.closedAt,
        updatedAt: new Date(),
      })
      .where(and(eq(incidents.id, req.params.id), eq(incidents.organizationId, orgId)))
      .returning();

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update incident' });
  }
});

router.get('/capas', async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(capas)
      .where(eq(capas.organizationId, req.organizationId!))
      .orderBy(desc(capas.createdAt));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch CAPAs' });
  }
});

router.post('/capas', async (req: AuthRequest, res) => {
  try {
    const b = req.body;
    const [created] = await db
      .insert(capas)
      .values({
        organizationId: req.organizationId!,
        plantId: b.plantId || null,
        departmentId: b.departmentId || null,
        actionNumber: makeNumber('CAPA'),
        sourceType: b.sourceType || 'incident',
        sourceId: b.sourceId || null,
        sourceNumber: b.sourceNumber || null,
        title: b.title,
        description: b.description || '',
        actionType: b.actionType || 'Corrective',
        priority: b.priority || 'Medium',
        responsiblePerson: b.responsiblePerson || req.authUser!.fullName,
        targetDate: b.targetDate || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        status: b.status || 'Open',
        isDemo: false,
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create CAPA' });
  }
});

router.patch('/capas/:id', async (req: AuthRequest, res) => {
  try {
    const b = req.body;
    const [existing] = await db
      .select()
      .from(capas)
      .where(and(eq(capas.id, req.params.id), eq(capas.organizationId, req.organizationId!)))
      .limit(1);
    if (!existing) return res.status(404).json({ error: 'CAPA not found' });

    const [updated] = await db
      .update(capas)
      .set({
        status: b.status ?? existing.status,
        priority: b.priority ?? existing.priority,
        responsiblePerson: b.responsiblePerson ?? existing.responsiblePerson,
        targetDate: b.targetDate ?? existing.targetDate,
        completionDate: b.status === 'Closed' ? new Date().toISOString().slice(0, 10) : b.completionDate ?? existing.completionDate,
        implementationNotes: b.implementationNotes ?? existing.implementationNotes,
        evidenceFiles: b.evidenceFiles ?? existing.evidenceFiles,
        effectivenessReview: b.effectivenessReview ?? existing.effectivenessReview,
        verifiedBy: b.verifiedBy ?? (b.status === 'Closed' ? req.authUser!.fullName : existing.verifiedBy),
        updatedAt: new Date(),
      })
      .where(and(eq(capas.id, req.params.id), eq(capas.organizationId, req.organizationId!)))
      .returning();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update CAPA' });
  }
});

// ============================================================================
// DIGITAL PERMIT TO WORK — STRICT 3-STAGE ROLE-BASED APPROVAL WORKFLOW (23 TYPES)
// Stage 1: Requester (Draft -> Pending Department Head Approval, LOCKED on submit)
// Stage 2: Department Head / Manager (Dept Approve -> Pending Safety Approval | Reject | Return)
// Stage 3: Safety Department (Final Approve -> Active | Reject | Return | Suspend | Revalidate | Extend | Close | Cancel)
// ============================================================================
router.get('/permits', async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const includeArchived =
      req.query.includeArchived === 'true' &&
      (req.authUser!.isSuperAdmin || req.authUser!.canSafetyApprove);

    const rows = await db
      .select()
      .from(workPermits)
      .where(
        includeArchived
          ? eq(workPermits.organizationId, orgId)
          : and(eq(workPermits.organizationId, orgId), eq(workPermits.isArchived, false))
      )
      .orderBy(desc(workPermits.createdAt));

    const nowIso = new Date().toISOString().slice(0, 16);
    const nowMs = Date.now();

    // Automatically detect and transition overdue Active permits to Expired
    const updatedRows = [];
    for (const p of rows) {
      if (p.status === 'Active' && p.endDate && p.endDate < nowIso) {
        const [expiredPermit] = await db
          .update(workPermits)
          .set({
            status: 'Expired',
            updatedAt: new Date(),
            approvalHistory: [
              ...(p.approvalHistory || []),
              {
                step: 'AUTO_EXPIRED',
                actor: 'System Validity Monitor',
                role: 'System',
                decision: 'Expired',
                at: new Date().toISOString(),
                comments: `Validity ended at ${p.endDate}. Safety revalidation or closure required.`,
              },
            ],
          })
          .where(eq(workPermits.id, p.id))
          .returning();
        await db.insert(permitApprovals).values({
          organizationId: orgId,
          permitId: p.id,
          stage: 'SYSTEM',
          userName: 'System Validity Monitor',
          userRole: 'System',
          departmentName: p.departmentName,
          action: 'AUTO_EXPIRE',
          comments: `Permit automatically expired after validity end (${p.endDate}).`,
          previousStatus: 'Active',
          newStatus: 'Expired',
        });
        updatedRows.push(expiredPermit || p);
      } else {
        updatedRows.push(p);
      }
    }

    // Load relational approval logs & extension requests
    const [allApprovals, allExtensions, allRevisions] = await Promise.all([
      db
        .select()
        .from(permitApprovals)
        .where(eq(permitApprovals.organizationId, orgId))
        .orderBy(asc(permitApprovals.createdAt)),
      db
        .select()
        .from(permitExtensions)
        .where(eq(permitExtensions.organizationId, orgId))
        .orderBy(desc(permitExtensions.createdAt)),
      db
        .select()
        .from(permitRevisions)
        .where(eq(permitRevisions.organizationId, orgId))
        .orderBy(desc(permitRevisions.revisionNumber)),
    ]);

    const approvalsByPermit = new Map<string, typeof allApprovals>();
    for (const a of allApprovals) {
      const list = approvalsByPermit.get(a.permitId) || [];
      list.push(a);
      approvalsByPermit.set(a.permitId, list);
    }

    const extensionsByPermit = new Map<string, typeof allExtensions>();
    for (const e of allExtensions) {
      const list = extensionsByPermit.get(e.permitId) || [];
      list.push(e);
      extensionsByPermit.set(e.permitId, list);
    }

    const revisionsByPermit = new Map<string, typeof allRevisions>();
    for (const r of allRevisions) {
      const list = revisionsByPermit.get(r.permitId) || [];
      list.push(r);
      revisionsByPermit.set(r.permitId, list);
    }

    const enriched = updatedRows.map((p) => {
      const isPendingStage =
        p.status === 'Pending Department Head Approval' ||
        p.status === 'Pending Safety Approval' ||
        p.status === 'Submitted';
      const ageHours = (nowMs - new Date(p.updatedAt || p.createdAt).getTime()) / 3600000;
      return {
        ...p,
        approvals: approvalsByPermit.get(p.id) || [],
        extensions: extensionsByPermit.get(p.id) || [],
        revisions: revisionsByPermit.get(p.id) || [],
        overduePendingEscalation: isPendingStage && ageHours > 24,
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error('Failed to fetch permits:', err);
    res.status(500).json({ error: 'Failed to fetch work permits' });
  }
});

router.get('/permits/verify/:qrToken', async (req: AuthRequest, res) => {
  try {
    const [permit] = await db
      .select()
      .from(workPermits)
      .where(
        and(
          eq(workPermits.organizationId, req.organizationId!),
          eq(workPermits.qrToken, req.params.qrToken)
        )
      )
      .limit(1);
    if (!permit) {
      return res.status(404).json({ valid: false, error: 'Permit QR token not found in active workspace' });
    }
    const isExpired = permit.endDate && permit.endDate < new Date().toISOString().slice(0, 16) && permit.status === 'Active';
    const isFullyApproved = Boolean(permit.departmentHeadApprovedAt && permit.safetyApprovedAt);
    res.json({
      valid: !isExpired && !permit.isArchived && permit.status === 'Active',
      isExpired,
      isFullyApproved,
      permit,
    });
  } catch (err) {
    res.status(500).json({ error: 'QR verification failed' });
  }
});

router.post('/permits', async (req: AuthRequest, res) => {
  try {
    const authUser = req.authUser!;
    if (authUser.isAuditorReadOnly || !hasModulePermission(authUser, 'ptw', 'create')) {
      return res.status(403).json({
        error: `Forbidden: Role "${authUser.primaryRoleName}" does not have permission to create work permits.`,
      });
    }

    const orgId = req.organizationId!;
    const b = req.body;
    const permitNumber = makeNumber('PTW');
    const qrToken = `ARSHIEL-${permitNumber}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // Strict Workflow Stage 1: Either save as Draft (editable) OR Submit to Department Head (locked!)
    const saveAsDraft = Boolean(b.saveAsDraft || b.status === 'Draft');
    const initialStatus = saveAsDraft ? 'Draft' : 'Pending Department Head Approval';

    const [created] = await db
      .insert(workPermits)
      .values({
        organizationId: orgId,
        plantId: b.plantId || null,
        departmentId: b.departmentId || null,
        requesterUserId: authUser.id,
        plantName: b.plantName || null,
        departmentName: b.departmentName || authUser.departmentName || null,
        permitNumber,
        permitType: b.permitType || 'Hot Work Permit',
        isHighRisk: Boolean(b.isHighRisk ?? true),
        contractorName: b.contractorName || '',
        applicantName: b.applicantName || authUser.fullName,
        issuingAuthority: 'Pending Dept Head & Safety Approval',
        performingAuthority: b.performingAuthority || authUser.fullName,
        workSupervisor: b.workSupervisor || '',
        scopeOfWork: b.scopeOfWork || '',
        workLocation: b.workLocation || '',
        startDate: b.startDate || new Date().toISOString().slice(0, 16),
        endDate: b.endDate || new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 16),
        validUntil: b.endDate || new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 16),
        methodStatement: b.methodStatement || '',
        taskRiskAssessment: b.taskRiskAssessment || {},
        hazards: b.hazards || [],
        controls: b.controls || [],
        isolationLoto: b.isolationLoto || {},
        gasTesting: b.gasTesting || {},
        requiredPpe: b.requiredPpe || [],
        toolsChecks: b.toolsChecks || {},
        authorizedWorkers: b.authorizedWorkers || [],
        emergencyArrangements: b.emergencyArrangements || '',
        simopsNotes: b.simopsNotes || '',
        worksiteInspection: b.worksiteInspection || {},
        toolboxTalk: b.toolboxTalk || { conducted: false },
        goldenRulesAcknowledged: Boolean(b.goldenRulesAcknowledged),
        isLocked: !saveAsDraft,
        revisionNumber: 1,
        isArchived: false,
        approvalHistory: [
          {
            step: saveAsDraft ? 'Permit Draft Saved' : 'Stage 1: Submitted by Requester',
            actor: authUser.fullName,
            role: authUser.primaryRoleName,
            decision: initialStatus,
            at: new Date().toISOString(),
            comments: saveAsDraft
              ? 'Draft saved by requester — editable until submitted'
              : 'Submitted to Department Head for Stage 2 approval. Request fields locked.',
          },
        ],
        qrToken,
        status: initialStatus,
        isDemo: false,
      })
      .returning();

    await db.insert(permitApprovals).values({
      organizationId: orgId,
      permitId: created.id,
      stage: 'REQUESTER',
      userId: authUser.id,
      userName: authUser.fullName,
      userRole: authUser.primaryRoleName,
      departmentName: created.departmentName,
      action: saveAsDraft ? 'SAVE_DRAFT' : 'SUBMIT_PERMIT',
      comments: saveAsDraft
        ? 'Draft created by requester'
        : 'Submitted to Department Head / Manager for Stage 2 review',
      previousStatus: 'New',
      newStatus: initialStatus,
    });

    if (!saveAsDraft) {
      await db.insert(notifications).values({
        organizationId: orgId,
        targetRole: 'department-head',
        type: 'permit',
        severity: created.isHighRisk ? 'warning' : 'info',
        title: `Stage 2 Dept Head Approval Required: ${created.permitNumber}`,
        message: `${created.permitType} requested by ${authUser.fullName} at ${created.workLocation}`,
        entityType: 'work_permit',
        entityId: created.id,
      });
    }

    await writeAuditLog({
      organizationId: orgId,
      userId: authUser.id,
      userEmail: authUser.email,
      userName: authUser.fullName,
      userRole: authUser.primaryRoleName,
      departmentName: created.departmentName,
      moduleName: 'Permit to Work',
      recordNumber: permitNumber,
      action: saveAsDraft ? 'CREATE_PERMIT_DRAFT' : 'SUBMIT_PERMIT',
      entityType: 'work_permit',
      entityId: created.id,
      updatedValue: {
        permitNumber,
        permitType: created.permitType,
        workLocation: created.workLocation,
        status: created.status,
      },
      approvalStatus: created.status,
      ipAddress: extractClientIp(req),
    });

    await writeActivityLog({
      organizationId: orgId,
      userId: authUser.id,
      uid: authUser.uid,
      userEmail: authUser.email,
      userName: authUser.fullName,
      userRole: authUser.primaryRoleName,
      departmentName: created.departmentName,
      moduleName: 'Permit to Work',
      activityType: saveAsDraft ? 'record_create' : 'record_submit',
      recordId: created.permitNumber,
      summary: `${saveAsDraft ? 'Drafted' : 'Submitted'} ${created.permitType} (${created.permitNumber})`,
      ipAddress: extractClientIp(req),
    });

    res.status(201).json(created);
  } catch (err) {
    console.error('Failed to create permit:', err);
    res.status(500).json({ error: 'Failed to create work permit' });
  }
});

// STRICT 3-STAGE PERMIT TRANSITION ENGINE
router.post('/permits/:id/transition', async (req: AuthRequest, res) => {
  try {
    const authUser = req.authUser!;
    const orgId = req.organizationId!;
    if (authUser.isAuditorReadOnly) {
      return res.status(403).json({ error: 'Forbidden: Auditor role has read-only access.' });
    }

    const { action, comments, extendedUntil, gasTesting, closureChecklist } = req.body || {};
    const act = String(action || '').toLowerCase().trim();

    const [existing] = await db
      .select()
      .from(workPermits)
      .where(and(eq(workPermits.id, req.params.id), eq(workPermits.organizationId, orgId)))
      .limit(1);

    if (!existing) return res.status(404).json({ error: 'Permit not found' });
    if (existing.isArchived) {
      return res.status(400).json({ error: 'Archived permits cannot be transitioned.' });
    }

    const isRequester =
      Boolean(existing.requesterUserId && existing.requesterUserId === authUser.id) ||
      (!existing.requesterUserId &&
        existing.applicantName.trim().toLowerCase() === authUser.fullName.trim().toLowerCase());

    const prevStatus = existing.status;
    let nextStatus = existing.status;
    let nextEndDate = existing.endDate;
    let nextValidUntil = existing.validUntil;
    let stage: 'REQUESTER' | 'DEPARTMENT_HEAD' | 'SAFETY_DEPARTMENT' = 'SAFETY_DEPARTMENT';
    let stepLabel = `Permit ${act.toUpperCase()}`;
    const extHistory = [...(existing.extensionHistory || [])];
    const extraUpdates: Partial<typeof workPermits.$inferInsert> = {};

    // Normalize legacy 'approve' / 'reject' into explicit stage-aware actions
    const normalizedAct =
      act === 'approve'
        ? prevStatus === 'Pending Department Head Approval' || prevStatus === 'Submitted'
          ? 'dept_approve'
          : 'safety_approve'
        : act === 'reject'
          ? prevStatus === 'Pending Department Head Approval' || prevStatus === 'Submitted'
            ? 'dept_reject'
            : 'safety_reject'
          : act;

    // ------------------------------------------------------------------------
    // STAGE 1: REQUESTER SUBMISSION / EXTENSION REQUEST / CLOSURE REQUEST
    // ------------------------------------------------------------------------
    if (normalizedAct === 'submit') {
      if (!['Draft', 'Returned for Clarification'].includes(prevStatus)) {
        return res.status(400).json({ error: 'Only Draft or Returned permits can be submitted.' });
      }
      if (!isRequester && !authUser.isSuperAdmin) {
        return res.status(403).json({ error: 'Only the permit requester can submit this draft.' });
      }
      stage = 'REQUESTER';
      stepLabel = 'Stage 1: Submitted for Dept Head Approval';
      nextStatus = 'Pending Department Head Approval';
      extraUpdates.isLocked = true;
      extraUpdates.returnedReason = null;
    } else if (normalizedAct === 'request_extension') {
      if (prevStatus !== 'Active' && prevStatus !== 'Expired') {
        return res.status(400).json({ error: 'Extension can only be requested on Active or Expired permits.' });
      }
      if (!extendedUntil || !String(comments || '').trim()) {
        return res.status(400).json({ error: 'New validity end time and mandatory reason are required to request extension.' });
      }
      stage = 'REQUESTER';
      stepLabel = 'Extension Requested (Pending Safety Approval)';
      extraUpdates.extensionRequestedUntil = extendedUntil;
      extraUpdates.extensionRequestReason = String(comments).trim();
      await db.insert(permitExtensions).values({
        organizationId: orgId,
        permitId: existing.id,
        requestedBy: authUser.id,
        requestedByName: authUser.fullName,
        previousEndDate: existing.endDate,
        requestedEndDate: extendedUntil,
        reason: String(comments).trim(),
        status: 'Pending Safety Approval',
      });
    } else if (normalizedAct === 'request_closure') {
      if (prevStatus !== 'Active' && prevStatus !== 'Suspended' && prevStatus !== 'Expired') {
        return res.status(400).json({ error: 'Closure can only be requested for Active, Suspended, or Expired permits.' });
      }
      stage = 'REQUESTER';
      stepLabel = 'Closure Requested by Requester (Pending Safety Sign-Off)';
      extraUpdates.closureRequestedAt = new Date();
      extraUpdates.closureRequestedBy = authUser.fullName;
    }
    // ------------------------------------------------------------------------
    // STAGE 2: DEPARTMENT HEAD / MANAGER APPROVAL (CANNOT ISSUE FINAL SAFETY APPROVAL!)
    // ------------------------------------------------------------------------
    else if (normalizedAct === 'dept_approve') {
      if (!['Pending Department Head Approval', 'Submitted'].includes(prevStatus)) {
        return res.status(400).json({
          error: `Stage 2 Department Head Approval is only valid when permit is "Pending Department Head Approval" (current: "${prevStatus}").`,
        });
      }
      if (!authUser.canDeptHeadApprove) {
        return res.status(403).json({
          error: 'Forbidden: Only an authorized Department Head / Manager can complete Stage 2 Departmental Approval.',
        });
      }
      // STRICT SELF-APPROVAL PREVENTION
      if (isRequester) {
        await writeAuditLog({
          organizationId: orgId,
          userId: authUser.id,
          userEmail: authUser.email,
          userName: authUser.fullName,
          userRole: authUser.primaryRoleName,
          moduleName: 'Permit to Work',
          recordNumber: existing.permitNumber,
          action: 'BLOCKED_SELF_APPROVAL',
          entityType: 'work_permit',
          entityId: existing.id,
          reasonForChange: 'Blocked self-approval conflict at Stage 2 Department Head Approval',
          approvalStatus: 'Blocked',
          ipAddress: extractClientIp(req),
        });
        return res.status(403).json({
          error: 'Conflict of Interest Blocked: The permit requester cannot approve their own submitted permit.',
        });
      }
      stage = 'DEPARTMENT_HEAD';
      stepLabel = 'Stage 2: Department Head Approved → Routed to Safety';
      nextStatus = 'Pending Safety Approval';
      extraUpdates.departmentHeadApprovedBy = authUser.fullName;
      extraUpdates.departmentHeadApprovedById = authUser.id;
      extraUpdates.departmentHeadApprovedAt = new Date();
      extraUpdates.isLocked = true;
    } else if (normalizedAct === 'dept_reject' || normalizedAct === 'dept_return') {
      if (!['Pending Department Head Approval', 'Submitted'].includes(prevStatus)) {
        return res.status(400).json({ error: 'Department Head can only reject or return permits pending Departmental Approval.' });
      }
      if (!authUser.canDeptHeadApprove) {
        return res.status(403).json({ error: 'Forbidden: Department Head / Manager role required.' });
      }
      if (isRequester) {
        return res.status(403).json({ error: 'Conflict of Interest Blocked: Requester cannot reject or return their own submitted permit.' });
      }
      if (!String(comments || '').trim()) {
        return res.status(400).json({ error: 'Mandatory rejection / clarification remarks are required.' });
      }
      stage = 'DEPARTMENT_HEAD';
      if (normalizedAct === 'dept_reject') {
        stepLabel = 'Stage 2: Rejected by Department Head';
        nextStatus = 'Rejected';
        extraUpdates.rejectedReason = String(comments).trim();
      } else {
        stepLabel = 'Stage 2: Returned for Clarification by Department Head';
        nextStatus = 'Returned for Clarification';
        extraUpdates.returnedReason = String(comments).trim();
        extraUpdates.isLocked = false;
      }
    }
    // ------------------------------------------------------------------------
    // STAGE 3: SAFETY DEPARTMENT FINAL APPROVAL & LIFECYCLE CONTROL
    // ------------------------------------------------------------------------
    else if (normalizedAct === 'safety_approve') {
      // STRICT SEQUENTIAL ENFORCEMENT: Cannot bypass Department Head Approval!
      if (prevStatus !== 'Pending Safety Approval') {
        return res.status(400).json({
          error: `Strict 3-Stage Enforcement: Permit must first receive Department Head Approval ("Pending Safety Approval") before Safety Final Approval can activate it (current status: "${prevStatus}").`,
        });
      }
      if (!authUser.canSafetyApprove) {
        return res.status(403).json({
          error: 'Forbidden: Only authorized Safety Department Approvers (EHS / HSE / Safety Manager or Super Admin) can issue Final Safety Approval.',
        });
      }
      if (isRequester) {
        await writeAuditLog({
          organizationId: orgId,
          userId: authUser.id,
          userEmail: authUser.email,
          userName: authUser.fullName,
          userRole: authUser.primaryRoleName,
          moduleName: 'Permit to Work',
          recordNumber: existing.permitNumber,
          action: 'BLOCKED_SELF_APPROVAL',
          entityType: 'work_permit',
          entityId: existing.id,
          reasonForChange: 'Blocked self-approval conflict at Stage 3 Final Safety Approval',
          approvalStatus: 'Blocked',
          ipAddress: extractClientIp(req),
        });
        return res.status(403).json({
          error: 'Conflict of Interest Blocked: The permit requester cannot issue final Safety approval on their own permit.',
        });
      }
      stage = 'SAFETY_DEPARTMENT';
      stepLabel = 'Stage 3: Safety Department Final Approval → ACTIVE';
      nextStatus = 'Active';
      extraUpdates.safetyApprovedBy = authUser.fullName;
      extraUpdates.safetyApprovedById = authUser.id;
      extraUpdates.safetyApprovedAt = new Date();
      extraUpdates.issuingAuthority = authUser.fullName;
      extraUpdates.isLocked = true;
    } else if (normalizedAct === 'safety_reject' || normalizedAct === 'safety_return') {
      if (prevStatus !== 'Pending Safety Approval') {
        return res.status(400).json({ error: 'Safety rejection/return applies to permits pending Safety Approval.' });
      }
      if (!authUser.canSafetyApprove) {
        return res.status(403).json({ error: 'Forbidden: Authorized Safety Approver role required.' });
      }
      if (isRequester) {
        return res.status(403).json({ error: 'Conflict of Interest Blocked: Requester cannot reject their own permit.' });
      }
      if (!String(comments || '').trim()) {
        return res.status(400).json({ error: 'Mandatory safety remarks are required when rejecting or returning a permit.' });
      }
      stage = 'SAFETY_DEPARTMENT';
      if (normalizedAct === 'safety_reject') {
        stepLabel = 'Stage 3: Rejected by Safety Department';
        nextStatus = 'Rejected';
        extraUpdates.rejectedReason = String(comments).trim();
      } else {
        stepLabel = 'Stage 3: Returned for Correction by Safety Department';
        nextStatus = 'Returned for Clarification';
        extraUpdates.returnedReason = String(comments).trim();
        extraUpdates.isLocked = false;
      }
    } else if (normalizedAct === 'suspend') {
      if (prevStatus !== 'Active') {
        return res.status(400).json({ error: 'Only Active permits can be suspended.' });
      }
      if (!authUser.canSafetyApprove && !hasModulePermission(authUser, 'ptw', 'suspend')) {
        return res.status(403).json({ error: 'Forbidden: Safety authority required to suspend an active permit.' });
      }
      if (!String(comments || '').trim()) {
        return res.status(400).json({ error: 'Mandatory reason is required to suspend a work permit.' });
      }
      stage = 'SAFETY_DEPARTMENT';
      stepLabel = 'Suspended by Safety Department';
      nextStatus = 'Suspended';
      extraUpdates.suspensionReason = String(comments).trim();
    } else if (normalizedAct === 'revalidate') {
      if (prevStatus !== 'Suspended' && prevStatus !== 'Expired') {
        return res.status(400).json({ error: 'Only Suspended or Expired permits can be revalidated.' });
      }
      if (!authUser.canSafetyApprove && !hasModulePermission(authUser, 'ptw', 'revalidate')) {
        return res.status(403).json({ error: 'Forbidden: Authorized Safety Approver required to revalidate a permit.' });
      }
      stage = 'SAFETY_DEPARTMENT';
      stepLabel = 'Revalidated & Reactivated by Safety Department';
      nextStatus = 'Active';
      if (extendedUntil) {
        nextEndDate = extendedUntil;
        nextValidUntil = extendedUntil;
      }
      extraUpdates.suspensionReason = null;
    } else if (normalizedAct === 'extend' || normalizedAct === 'approve_extension') {
      if (prevStatus !== 'Active' && prevStatus !== 'Expired') {
        return res.status(400).json({ error: 'Only Active or Expired permits can be extended.' });
      }
      if (!authUser.canSafetyApprove && !hasModulePermission(authUser, 'ptw', 'extend')) {
        return res.status(403).json({ error: 'Forbidden: Only Safety Department Approvers can authorize permit extensions.' });
      }
      const targetEnd = extendedUntil || existing.extensionRequestedUntil;
      if (!targetEnd) {
        return res.status(400).json({ error: 'Extended validity date/time is required.' });
      }
      stage = 'SAFETY_DEPARTMENT';
      stepLabel = 'Permit Extended by Safety Department';
      nextEndDate = targetEnd;
      nextValidUntil = targetEnd;
      nextStatus = 'Active';
      extraUpdates.extensionRequestedUntil = null;
      extraUpdates.extensionRequestReason = null;
      extHistory.push({
        extendedBy: authUser.fullName,
        previousEnd: existing.endDate,
        newEnd: targetEnd,
        reason: comments || existing.extensionRequestReason || 'Safety authorized extension',
        at: new Date().toISOString(),
      });
      // Mark any pending extension requests approved
      await db
        .update(permitExtensions)
        .set({
          status: 'Approved',
          decidedBy: authUser.id,
          decidedByName: authUser.fullName,
          decisionComments: comments || 'Approved by Safety Department',
          decidedAt: new Date(),
        })
        .where(and(eq(permitExtensions.permitId, existing.id), eq(permitExtensions.status, 'Pending Safety Approval')));
    } else if (normalizedAct === 'close') {
      if (!['Active', 'Suspended', 'Expired'].includes(prevStatus)) {
        return res.status(400).json({ error: 'Only Active, Suspended, or Expired permits can be closed.' });
      }
      if (!authUser.canSafetyApprove && !hasModulePermission(authUser, 'ptw', 'close')) {
        return res.status(403).json({ error: 'Forbidden: Safety Department sign-off required to close work permits.' });
      }
      stage = 'SAFETY_DEPARTMENT';
      stepLabel = 'Permit Closed & Verified by Safety Department';
      nextStatus = 'Closed';
    } else if (normalizedAct === 'cancel') {
      const canRequesterCancelDraft = isRequester && ['Draft', 'Returned for Clarification'].includes(prevStatus);
      if (!canRequesterCancelDraft && !authUser.canSafetyApprove && !authUser.isSuperAdmin) {
        return res.status(403).json({
          error: 'Forbidden: Submitted permits cannot be cancelled by the requester. Contact Department Head or Safety Department.',
        });
      }
      stage = canRequesterCancelDraft ? 'REQUESTER' : 'SAFETY_DEPARTMENT';
      stepLabel = 'Permit Cancelled';
      nextStatus = 'Cancelled';
    } else {
      return res.status(400).json({ error: `Unsupported permit workflow action "${act}".` });
    }

    const nextHistory = [
      ...(existing.approvalHistory || []),
      {
        step: stepLabel,
        stage,
        actor: authUser.fullName,
        role: authUser.primaryRoleName,
        decision: nextStatus,
        at: new Date().toISOString(),
        comments: comments || '',
      },
    ];

    const [updated] = await db
      .update(workPermits)
      .set({
        status: nextStatus,
        endDate: nextEndDate,
        validUntil: nextValidUntil,
        gasTesting: gasTesting ? { ...existing.gasTesting, ...gasTesting } : existing.gasTesting,
        closureChecklist: closureChecklist ?? existing.closureChecklist,
        extensionHistory: extHistory,
        approvalHistory: nextHistory,
        ...extraUpdates,
        updatedAt: new Date(),
      })
      .where(eq(workPermits.id, existing.id))
      .returning();

    // Relational permit_approvals entry
    await db.insert(permitApprovals).values({
      organizationId: orgId,
      permitId: existing.id,
      stage,
      userId: authUser.id,
      userName: authUser.fullName,
      userRole: authUser.primaryRoleName,
      departmentName: existing.departmentName || authUser.departmentName,
      action: normalizedAct.toUpperCase(),
      comments: comments || null,
      previousStatus: prevStatus,
      newStatus: nextStatus,
    });

    // Stage Notifications
    const targetRoleNotif =
      nextStatus === 'Pending Safety Approval'
        ? 'ehs-manager'
        : nextStatus === 'Pending Department Head Approval'
          ? 'department-head'
          : null;
    await db.insert(notifications).values({
      organizationId: orgId,
      userId: existing.requesterUserId ?? null,
      targetRole: targetRoleNotif,
      type: 'permit',
      severity: ['Rejected', 'Suspended'].includes(nextStatus) ? 'critical' : 'info',
      title: `${existing.permitNumber}: ${stepLabel}`,
      message: `${authUser.fullName} (${authUser.primaryRoleName}) transitioned permit from "${prevStatus}" to "${nextStatus}". ${comments ? `Remarks: ${comments}` : ''}`,
      entityType: 'work_permit',
      entityId: existing.id,
    });

    // Tamper-Evident Audit Log
    await writeAuditLog({
      organizationId: orgId,
      userId: authUser.id,
      userEmail: authUser.email,
      userName: authUser.fullName,
      userRole: authUser.primaryRoleName,
      departmentName: existing.departmentName,
      moduleName: 'Permit to Work',
      recordNumber: existing.permitNumber,
      action: `PERMIT_${normalizedAct.toUpperCase()}`,
      entityType: 'work_permit',
      entityId: existing.id,
      previousValue: { status: prevStatus, endDate: existing.endDate },
      updatedValue: { status: nextStatus, endDate: nextEndDate },
      reasonForChange: comments || stepLabel,
      approvalStatus: nextStatus,
      ipAddress: extractClientIp(req),
    });

    await writeActivityLog({
      organizationId: orgId,
      userId: authUser.id,
      uid: authUser.uid,
      userEmail: authUser.email,
      userName: authUser.fullName,
      userRole: authUser.primaryRoleName,
      departmentName: existing.departmentName,
      moduleName: 'Permit to Work',
      activityType: normalizedAct.includes('approve')
        ? 'record_approve'
        : normalizedAct.includes('reject')
          ? 'record_reject'
          : 'record_edit',
      recordId: existing.permitNumber,
      summary: `${stepLabel} (${existing.permitNumber})`,
      ipAddress: extractClientIp(req),
    });

    res.json(updated);
  } catch (err) {
    console.error('Permit transition error:', err);
    res.status(500).json({ error: 'Failed to update permit lifecycle' });
  }
});

// PATCH /api/permits/:id - Locked after submission; editing Active permits triggers controlled revision + re-approval!
router.patch('/permits/:id', async (req: AuthRequest, res) => {
  try {
    const authUser = req.authUser!;
    const orgId = req.organizationId!;
    if (authUser.isAuditorReadOnly) {
      return res.status(403).json({ error: 'Forbidden: Auditor role is read-only.' });
    }

    const b = req.body || {};
    const [existing] = await db
      .select()
      .from(workPermits)
      .where(and(eq(workPermits.id, req.params.id), eq(workPermits.organizationId, orgId)))
      .limit(1);

    if (!existing) return res.status(404).json({ error: 'Work permit not found' });
    if (existing.isArchived || ['Closed', 'Cancelled', 'Rejected'].includes(existing.status)) {
      return res.status(403).json({
        error: `Locked Record: Permits with status "${existing.status}" cannot be modified.`,
      });
    }

    const isRequester =
      Boolean(existing.requesterUserId && existing.requesterUserId === authUser.id) ||
      (!existing.requesterUserId &&
        existing.applicantName.trim().toLowerCase() === authUser.fullName.trim().toLowerCase());

    const isDraftOrReturned = ['Draft', 'Returned for Clarification'].includes(existing.status);
    const isPending = ['Pending Department Head Approval', 'Pending Safety Approval', 'Submitted'].includes(
      existing.status
    );
    const isActive = existing.status === 'Active';

    // RULE: After submission, requester CANNOT edit submitted permit fields!
    if (isPending && !authUser.canSafetyApprove && !authUser.isSuperAdmin) {
      return res.status(403).json({
        error: 'Submitted Permit Locked: Request fields cannot be edited after submission unless returned for clarification by an approver.',
      });
    }
    if (isDraftOrReturned && !isRequester && !authUser.isSuperAdmin && !authUser.canSafetyApprove) {
      return res.status(403).json({
        error: 'Only the permit requester or authorized Safety Admin can edit this draft.',
      });
    }

    let nextStatus = existing.status;
    let nextRevision = existing.revisionNumber || 1;
    let nextIsLocked = existing.isLocked;
    let changeReason = String(b.editComments || b.reason || '').trim();

    // RULE: Modifying an approved Active permit requires Safety/Super Admin, mandatory reason, creates a revision, and routes back for Safety re-review!
    if (isActive) {
      if (!authUser.canSafetyApprove && !authUser.isSuperAdmin) {
        return res.status(403).json({
          error: 'Forbidden: Only Safety Department or Super Admin can initiate a controlled revision on an Active permit.',
        });
      }
      if (!changeReason) {
        return res.status(400).json({
          error: 'Mandatory revision reason is required when modifying an Active permit.',
        });
      }
      nextRevision += 1;
      nextStatus = 'Pending Safety Approval';
      nextIsLocked = true;
    } else if (isDraftOrReturned && b.submitNow) {
      nextStatus = 'Pending Department Head Approval';
      nextIsLocked = true;
      changeReason = changeReason || 'Resubmitted by requester for Stage 2 Department Head Approval';
    }

    const nextHistory = [
      ...(existing.approvalHistory || []),
      {
        step: isActive
          ? `Controlled Revision #${nextRevision} (Routed for Re-Review)`
          : b.submitNow
            ? 'Submitted by Requester'
            : 'Draft Edited',
        actor: authUser.fullName,
        role: authUser.primaryRoleName,
        decision: nextStatus,
        at: new Date().toISOString(),
        comments: changeReason || 'Permit details updated',
      },
    ];

    const [updated] = await db
      .update(workPermits)
      .set({
        permitType: b.permitType ?? existing.permitType,
        isHighRisk: b.isHighRisk !== undefined ? Boolean(b.isHighRisk) : existing.isHighRisk,
        plantId: b.plantId !== undefined ? b.plantId || null : existing.plantId,
        departmentId: b.departmentId !== undefined ? b.departmentId || null : existing.departmentId,
        plantName: b.plantName !== undefined ? b.plantName : existing.plantName,
        departmentName: b.departmentName !== undefined ? b.departmentName : existing.departmentName,
        contractorName: b.contractorName !== undefined ? b.contractorName : existing.contractorName,
        applicantName: b.applicantName ?? existing.applicantName,
        workSupervisor: b.workSupervisor !== undefined ? b.workSupervisor : existing.workSupervisor,
        workLocation: b.workLocation ?? existing.workLocation,
        scopeOfWork: b.scopeOfWork ?? existing.scopeOfWork,
        startDate: b.startDate ?? existing.startDate,
        endDate: b.endDate ?? existing.endDate,
        validUntil: b.endDate ?? existing.validUntil,
        methodStatement: b.methodStatement !== undefined ? b.methodStatement : existing.methodStatement,
        hazards: Array.isArray(b.hazards) ? b.hazards : existing.hazards,
        controls: Array.isArray(b.controls) ? b.controls : existing.controls,
        requiredPpe: Array.isArray(b.requiredPpe) ? b.requiredPpe : existing.requiredPpe,
        gasTesting: b.gasTesting ? { ...existing.gasTesting, ...b.gasTesting } : existing.gasTesting,
        emergencyArrangements:
          b.emergencyArrangements !== undefined ? b.emergencyArrangements : existing.emergencyArrangements,
        simopsNotes: b.simopsNotes !== undefined ? b.simopsNotes : existing.simopsNotes,
        status: nextStatus,
        isLocked: nextIsLocked,
        revisionNumber: nextRevision,
        approvalHistory: nextHistory,
        updatedAt: new Date(),
      })
      .where(and(eq(workPermits.id, existing.id), eq(workPermits.organizationId, orgId)))
      .returning();

    if (isActive) {
      await db.insert(permitRevisions).values({
        organizationId: orgId,
        permitId: existing.id,
        revisionNumber: nextRevision,
        changedBy: authUser.id,
        changedByName: authUser.fullName,
        reason: changeReason,
        previousSnapshot: {
          permitType: existing.permitType,
          scopeOfWork: existing.scopeOfWork,
          workLocation: existing.workLocation,
          endDate: existing.endDate,
          status: existing.status,
        },
        updatedSnapshot: {
          permitType: updated.permitType,
          scopeOfWork: updated.scopeOfWork,
          workLocation: updated.workLocation,
          endDate: updated.endDate,
          status: updated.status,
        },
        requiresReapproval: true,
      });
    }

    await writeAuditLog({
      organizationId: orgId,
      userId: authUser.id,
      userEmail: authUser.email,
      userName: authUser.fullName,
      userRole: authUser.primaryRoleName,
      departmentName: updated.departmentName,
      moduleName: 'Permit to Work',
      recordNumber: updated.permitNumber,
      action: isActive ? 'PERMIT_CONTROLLED_REVISION' : 'EDIT_PERMIT',
      entityType: 'work_permit',
      entityId: updated.id,
      previousValue: {
        permitType: existing.permitType,
        scopeOfWork: existing.scopeOfWork,
        workLocation: existing.workLocation,
        status: existing.status,
      },
      updatedValue: {
        permitType: updated.permitType,
        scopeOfWork: updated.scopeOfWork,
        workLocation: updated.workLocation,
        status: updated.status,
        revisionNumber: updated.revisionNumber,
      },
      reasonForChange: changeReason || 'Permit updated',
      approvalStatus: updated.status,
      ipAddress: extractClientIp(req),
    });

    res.json(updated);
  } catch (err) {
    console.error('Failed to edit work permit:', err);
    res.status(500).json({ error: 'Failed to update work permit' });
  }
});

// DELETE /api/permits/:id - SOFT-ARCHIVE ONLY (Super Admin / Authorized Safety Admin with mandatory reason; NEVER permanently delete!)
router.delete('/permits/:id', async (req: AuthRequest, res) => {
  try {
    const authUser = req.authUser!;
    const orgId = req.organizationId!;

    // STRICT ROLE CONTROL: Only Super Admin or authorized Safety Manager with explicit 'delete' permission
    if (!authUser.isSuperAdmin && !(authUser.canSafetyApprove && hasModulePermission(authUser, 'ptw', 'delete'))) {
      await writeAuditLog({
        organizationId: orgId,
        userId: authUser.id,
        userEmail: authUser.email,
        userName: authUser.fullName,
        userRole: authUser.primaryRoleName,
        moduleName: 'Permit to Work',
        action: 'BLOCKED_UNAUTHORIZED_PERMIT_DELETE',
        entityType: 'work_permit',
        entityId: req.params.id,
        reasonForChange: 'Blocked unauthorized permit deletion attempt',
        approvalStatus: 'Blocked',
        ipAddress: extractClientIp(req),
      });
      return res.status(403).json({
        error: 'Forbidden: Requesters, Department Heads, and standard users cannot delete work permits. Soft-archiving is restricted to Super Admin / Authorized Safety Admin.',
      });
    }

    const [existing] = await db
      .select()
      .from(workPermits)
      .where(and(eq(workPermits.id, req.params.id), eq(workPermits.organizationId, orgId)))
      .limit(1);

    if (!existing) return res.status(404).json({ error: 'Work permit not found' });

    const reason = String(req.body?.reason || req.query.reason || '').trim();
    if (!reason) {
      return res.status(400).json({
        error: 'Mandatory archival reason is required. Historical permit records are soft-archived and never permanently erased.',
      });
    }

    // SOFT-DELETE / ARCHIVE ONLY (Preserves full compliance & audit history!)
    const [archived] = await db
      .update(workPermits)
      .set({
        isArchived: true,
        archivedReason: reason,
        archivedBy: authUser.fullName,
        archivedAt: new Date(),
        approvalHistory: [
          ...(existing.approvalHistory || []),
          {
            step: 'SOFT-ARCHIVED BY ADMIN',
            actor: authUser.fullName,
            role: authUser.primaryRoleName,
            decision: 'Archived',
            at: new Date().toISOString(),
            comments: reason,
          },
        ],
        updatedAt: new Date(),
      })
      .where(and(eq(workPermits.id, existing.id), eq(workPermits.organizationId, orgId)))
      .returning();

    await db.insert(permitApprovals).values({
      organizationId: orgId,
      permitId: existing.id,
      stage: 'SAFETY_DEPARTMENT',
      userId: authUser.id,
      userName: authUser.fullName,
      userRole: authUser.primaryRoleName,
      departmentName: existing.departmentName,
      action: 'SOFT_ARCHIVE',
      comments: reason,
      previousStatus: existing.status,
      newStatus: 'Archived',
    });

    await writeAuditLog({
      organizationId: orgId,
      userId: authUser.id,
      userEmail: authUser.email,
      userName: authUser.fullName,
      userRole: authUser.primaryRoleName,
      departmentName: existing.departmentName,
      moduleName: 'Permit to Work',
      recordNumber: existing.permitNumber,
      action: 'SOFT_ARCHIVE_PERMIT',
      entityType: 'work_permit',
      entityId: existing.id,
      previousValue: { status: existing.status, isArchived: false },
      updatedValue: { status: existing.status, isArchived: true, archivedReason: reason },
      reasonForChange: reason,
      approvalStatus: 'Archived',
      ipAddress: extractClientIp(req),
    });

    res.json({ success: true, archived: true, permit: archived });
  } catch (err) {
    console.error('Failed to soft-archive work permit:', err);
    res.status(500).json({ error: 'Failed to archive work permit' });
  }
});

// ============================================================================
// LOTO MANAGEMENT
// ============================================================================
router.get('/loto', async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(lotoRecords)
      .where(eq(lotoRecords.organizationId, req.organizationId!))
      .orderBy(desc(lotoRecords.createdAt));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load LOTO records' });
  }
});

router.post('/loto', async (req: AuthRequest, res) => {
  try {
    const b = req.body;
    const [created] = await db
      .insert(lotoRecords)
      .values({
        organizationId: req.organizationId!,
        plantId: b.plantId || null,
        permitId: b.permitId || null,
        lotoNumber: makeNumber('LOTO'),
        equipmentId: b.equipmentId || 'EQ-001',
        equipmentName: b.equipmentName,
        energySources: b.energySources || ['Electrical'],
        isolationPoints: b.isolationPoints || [],
        lockNumber: b.lockNumber || `PAD-${Math.floor(100 + Math.random() * 899)}`,
        tagNumber: b.tagNumber || `TAG-${Math.floor(100 + Math.random() * 899)}`,
        authorizedEmployee: b.authorizedEmployee || req.authUser!.fullName,
        zeroEnergyVerified: Boolean(b.zeroEnergyVerified),
        zeroEnergyVerifiedBy: b.zeroEnergyVerified ? req.authUser!.fullName : null,
        groupLotoLead: b.groupLotoLead || req.authUser!.fullName,
        status: b.zeroEnergyVerified ? 'Verified' : 'Isolated',
        isDemo: false,
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create LOTO record' });
  }
});

router.patch('/loto/:id', async (req: AuthRequest, res) => {
  try {
    const b = req.body;
    const [existing] = await db
      .select()
      .from(lotoRecords)
      .where(and(eq(lotoRecords.id, req.params.id), eq(lotoRecords.organizationId, req.organizationId!)))
      .limit(1);
    if (!existing) return res.status(404).json({ error: 'LOTO record not found' });

    const [updated] = await db
      .update(lotoRecords)
      .set({
        zeroEnergyVerified: b.zeroEnergyVerified !== undefined ? Boolean(b.zeroEnergyVerified) : existing.zeroEnergyVerified,
        zeroEnergyVerifiedBy: b.zeroEnergyVerified ? req.authUser!.fullName : existing.zeroEnergyVerifiedBy,
        status: b.status ?? existing.status,
        updatedAt: new Date(),
      })
      .where(eq(lotoRecords.id, existing.id))
      .returning();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update LOTO record' });
  }
});

// ============================================================================
// AI SAFETY OBSERVATIONS & BBS
// ============================================================================
router.get('/observations', async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(safetyObservations)
      .where(eq(safetyObservations.organizationId, req.organizationId!))
      .orderBy(desc(safetyObservations.createdAt));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch safety observations' });
  }
});

router.post('/observations', async (req: AuthRequest, res) => {
  try {
    const b = req.body;
    const [created] = await db
      .insert(safetyObservations)
      .values({
        organizationId: req.organizationId!,
        plantId: b.plantId || null,
        departmentId: b.departmentId || null,
        plantName: b.plantName || null,
        departmentName: b.departmentName || null,
        observationNumber: makeNumber('OBS'),
        title: b.title,
        observationType: b.observationType || 'Unsafe Condition',
        category: b.category || 'General Safety',
        severity: b.severity || 'Medium',
        likelihood: b.likelihood || 'Possible',
        riskLevel: b.riskLevel || b.severity || 'Medium',
        description: b.description || '',
        location: b.location || '',
        areaName: b.areaName || '',
        inputSource: b.inputSource || 'Text',
        beforePhotoData: b.beforePhotoData || null,
        afterPhotoData: b.afterPhotoData || null,
        aiAnalysis: b.aiAnalysis || {},
        humanVerified: Boolean(b.humanVerified),
        verifiedBy: b.humanVerified ? req.authUser!.fullName : null,
        immediateAction: b.immediateAction || '',
        correctiveAction: b.correctiveAction || '',
        preventiveAction: b.preventiveAction || '',
        responsibleDepartment: b.responsibleDepartment || '',
        actionOwner: b.actionOwner || '',
        targetDate: b.targetDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        status: b.status || 'Open',
        coachingNotes: b.coachingNotes || '',
        reportedByName: req.authUser!.fullName,
        isDemo: false,
      })
      .returning();

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to log safety observation' });
  }
});

router.patch('/observations/:id', async (req: AuthRequest, res) => {
  try {
    const b = req.body;
    const [existing] = await db
      .select()
      .from(safetyObservations)
      .where(and(eq(safetyObservations.id, req.params.id), eq(safetyObservations.organizationId, req.organizationId!)))
      .limit(1);
    if (!existing) return res.status(404).json({ error: 'Observation not found' });

    const [updated] = await db
      .update(safetyObservations)
      .set({
        humanVerified: b.humanVerified !== undefined ? Boolean(b.humanVerified) : existing.humanVerified,
        verifiedBy: b.humanVerified ? req.authUser!.fullName : existing.verifiedBy,
        status: b.status ?? existing.status,
        severity: b.severity ?? existing.severity,
        riskLevel: b.riskLevel ?? existing.riskLevel,
        afterPhotoData: b.afterPhotoData ?? existing.afterPhotoData,
        correctiveAction: b.correctiveAction ?? existing.correctiveAction,
        preventiveAction: b.preventiveAction ?? existing.preventiveAction,
        actionOwner: b.actionOwner ?? existing.actionOwner,
        coachingNotes: b.coachingNotes ?? existing.coachingNotes,
        updatedAt: new Date(),
      })
      .where(eq(safetyObservations.id, existing.id))
      .returning();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update observation' });
  }
});

// ============================================================================
// RISK ASSESSMENT (HIRA, HAZOP, JSA, JHA, SWMS, LMRA)
// ============================================================================
router.get('/risk-assessments', async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(riskAssessments)
      .where(eq(riskAssessments.organizationId, req.organizationId!))
      .orderBy(desc(riskAssessments.createdAt));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load risk assessments' });
  }
});

router.post('/risk-assessments', async (req: AuthRequest, res) => {
  try {
    const b = req.body;
    const l = Number(b.likelihood || 3);
    const s = Number(b.severity || 3);
    const rl = Number(b.residualLikelihood || 1);
    const rs = Number(b.residualSeverity || 2);
    const [created] = await db
      .insert(riskAssessments)
      .values({
        organizationId: req.organizationId!,
        plantId: b.plantId || null,
        departmentId: b.departmentId || null,
        assessmentNumber: makeNumber(b.methodology === 'HAZOP' ? 'HAZOP' : b.methodology === 'JSA' ? 'JSA' : 'HIRA'),
        methodology: b.methodology || 'HIRA',
        title: b.title,
        activityOrNode: b.activityOrNode || b.title,
        guideword: b.guideword || '',
        deviation: b.deviation || '',
        jobSteps: b.jobSteps || '',
        hazardCategory: b.hazardCategory || 'Mechanical',
        hazard: b.hazard,
        potentialConsequences: b.potentialConsequences || '',
        existingControls: b.existingControls || '',
        likelihood: l,
        severity: s,
        initialRiskScore: l * s,
        additionalControls: b.additionalControls || '',
        residualLikelihood: rl,
        residualSeverity: rs,
        residualRiskScore: rl * rs,
        responsiblePerson: b.responsiblePerson || req.authUser!.fullName,
        reviewDate: b.reviewDate || new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
        status: b.status || 'Active',
        aiSuggested: Boolean(b.aiSuggested),
        approvedBy: b.status === 'Approved' ? req.authUser!.fullName : null,
        isDemo: false,
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create risk assessment' });
  }
});

router.patch('/risk-assessments/:id', async (req: AuthRequest, res) => {
  try {
    const b = req.body;
    const [existing] = await db
      .select()
      .from(riskAssessments)
      .where(and(eq(riskAssessments.id, req.params.id), eq(riskAssessments.organizationId, req.organizationId!)))
      .limit(1);
    if (!existing) return res.status(404).json({ error: 'Risk assessment not found' });

    const [updated] = await db
      .update(riskAssessments)
      .set({
        status: b.status ?? existing.status,
        approvedBy: b.status === 'Approved' ? req.authUser!.fullName : existing.approvedBy,
        additionalControls: b.additionalControls ?? existing.additionalControls,
        residualLikelihood: b.residualLikelihood ?? existing.residualLikelihood,
        residualSeverity: b.residualSeverity ?? existing.residualSeverity,
        residualRiskScore:
          (b.residualLikelihood ?? existing.residualLikelihood) *
          (b.residualSeverity ?? existing.residualSeverity),
        revision: b.status === 'Approved' ? existing.revision + 1 : existing.revision,
        updatedAt: new Date(),
      })
      .where(eq(riskAssessments.id, existing.id))
      .returning();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update risk assessment' });
  }
});

// ============================================================================
// SAFETY AUDITS & INSPECTIONS (with automatic CAPA generation on NC)
// ============================================================================
router.get('/audits', async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(safetyAudits)
      .where(eq(safetyAudits.organizationId, req.organizationId!))
      .orderBy(desc(safetyAudits.createdAt));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load audits' });
  }
});

router.post('/audits', async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const b = req.body;
    const responses: any[] = Array.isArray(b.checklistResponses) ? b.checklistResponses : [];
    const total = responses.length;
    const compliant = responses.filter((r) => r.status === 'Yes' || r.status === 'Compliant').length;
    const nonCompliant = responses.filter((r) => r.status === 'No' || r.status === 'NC').length;
    const applicable = Math.max(total - responses.filter((r) => r.status === 'NA').length, 1);
    const score = total > 0 ? Number(((compliant / applicable) * 100).toFixed(1)) : 100;
    const auditNumber = makeNumber('AUD');

    const [created] = await db
      .insert(safetyAudits)
      .values({
        organizationId: orgId,
        plantId: b.plantId || null,
        departmentId: b.departmentId || null,
        auditNumber,
        auditType: b.auditType || 'Internal ISO 45001 Audit',
        title: b.title,
        scheduledDate: b.scheduledDate || new Date().toISOString().slice(0, 10),
        leadAuditor: b.leadAuditor || req.authUser!.fullName,
        auditTeam: b.auditTeam || [req.authUser!.fullName],
        checklistResponses: responses,
        totalItems: total,
        compliantItems: compliant,
        nonCompliantItems: nonCompliant,
        complianceScore: score,
        findings: responses.filter((r) => r.status === 'No' || r.status === 'NC'),
        status: b.status || (total > 0 ? 'Completed' : 'Planned'),
        isDemo: false,
      })
      .returning();

    // Auto-generate CAPAs for any Non-Compliant audit items
    for (const nc of responses.filter((r) => r.status === 'No' || r.status === 'NC')) {
      await db.insert(capas).values({
        organizationId: orgId,
        plantId: b.plantId || null,
        actionNumber: makeNumber('CAPA'),
        sourceType: 'audit',
        sourceId: created.id,
        sourceNumber: auditNumber,
        title: `Audit NC: ${nc.questionText || nc.item || 'Non-Conformance'}`,
        description: nc.remarks || `Auto-generated from ${auditNumber} (${created.title})`,
        actionType: 'Corrective',
        priority: 'High',
        responsiblePerson: nc.owner || req.authUser!.fullName,
        targetDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        status: 'Open',
      });
    }

    res.status(201).json(created);
  } catch (err) {
    console.error('Failed to save audit:', err);
    res.status(500).json({ error: 'Failed to create safety audit' });
  }
});

// ============================================================================
// EQUIPMENT, CONTRACTORS, WORKERS, TRAINING, EMERGENCY, ENV, LEGAL, DOCS, WEEKLY, PPE, GATE, COMMITTEE
// ============================================================================
router.get('/equipment', async (req: AuthRequest, res) => {
  const rows = await db.select().from(equipmentAssets).where(eq(equipmentAssets.organizationId, req.organizationId!)).orderBy(desc(equipmentAssets.createdAt));
  res.json(rows);
});
router.post('/equipment', async (req: AuthRequest, res) => {
  const b = req.body;
  const [row] = await db.insert(equipmentAssets).values({
    organizationId: req.organizationId!,
    plantId: b.plantId || null,
    equipmentId: b.equipmentId || makeNumber('EQ'),
    assetNumber: b.assetNumber || makeNumber('AST'),
    name: b.name,
    category: b.category || 'Fire Extinguisher',
    location: b.location || 'Main Plant',
    inspectionFrequency: b.inspectionFrequency || 'Monthly',
    lastInspectionDate: b.lastInspectionDate || new Date().toISOString().slice(0, 10),
    nextDueDate: b.nextDueDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    certificationNumber: b.certificationNumber || '',
    inspectorName: b.inspectorName || req.authUser!.fullName,
    defectsFound: b.defectsFound || 'None',
    status: b.status || 'Operational',
  }).returning();
  res.status(201).json(row);
});
router.patch('/equipment/:id', async (req: AuthRequest, res) => {
  const b = req.body;
  const [row] = await db.update(equipmentAssets).set({
    status: b.status,
    lastInspectionDate: b.lastInspectionDate || new Date().toISOString().slice(0, 10),
    nextDueDate: b.nextDueDate,
    defectsFound: b.defectsFound,
    inspectorName: req.authUser!.fullName,
    updatedAt: new Date(),
  }).where(and(eq(equipmentAssets.id, req.params.id), eq(equipmentAssets.organizationId, req.organizationId!))).returning();
  res.json(row);
});

router.get('/contractors', async (req: AuthRequest, res) => {
  const [vendors, workers] = await Promise.all([
    db.select().from(contractors).where(eq(contractors.organizationId, req.organizationId!)).orderBy(desc(contractors.createdAt)),
    db.select().from(contractorWorkers).where(eq(contractorWorkers.organizationId, req.organizationId!)).orderBy(desc(contractorWorkers.createdAt)),
  ]);
  res.json({ contractors: vendors, workers });
});
router.post('/contractors', async (req: AuthRequest, res) => {
  const b = req.body;
  const [row] = await db.insert(contractors).values({
    organizationId: req.organizationId!,
    plantId: b.plantId || null,
    vendorCode: b.vendorCode || makeNumber('VND'),
    companyName: b.companyName,
    gstNumber: b.gstNumber || '',
    esiNumber: b.esiNumber || '',
    pfNumber: b.pfNumber || '',
    licenseNumber: b.licenseNumber || '',
    licenseExpiry: b.licenseExpiry || '',
    insuranceExpiry: b.insuranceExpiry || '',
    supervisorName: b.supervisorName || 'Site Supervisor',
    supervisorPhone: b.supervisorPhone || '',
    evaluationScore: Number(b.evaluationScore || 85),
    status: b.status || 'Active',
  }).returning();
  res.status(201).json(row);
});
router.post('/workers', async (req: AuthRequest, res) => {
  const b = req.body;
  const workerId = b.workerId || makeNumber('WRK');
  const [row] = await db.insert(contractorWorkers).values({
    organizationId: req.organizationId!,
    contractorId: b.contractorId || null,
    plantId: b.plantId || null,
    workerId,
    fullName: b.fullName,
    skillCategory: b.skillCategory || 'Technician',
    qualification: b.qualification || '',
    medicalFitnessDate: b.medicalFitnessDate || new Date().toISOString().slice(0, 10),
    medicalExpiry: b.medicalExpiry || '',
    inductionDate: b.inductionDate || new Date().toISOString().slice(0, 10),
    safetyTrainingExpiry: b.safetyTrainingExpiry || '',
    insuranceInfo: b.insuranceInfo || 'ESI Active',
    qrCodeToken: `ARSHIEL-WRK-${workerId}`,
    monthlyManhours: Number(b.monthlyManhours || 180),
    attendanceStatus: b.attendanceStatus || 'On Site',
  }).returning();
  res.status(201).json(row);
});

router.get('/trainings', async (req: AuthRequest, res) => {
  const rows = await db.select().from(trainingRecords).where(eq(trainingRecords.organizationId, req.organizationId!)).orderBy(desc(trainingRecords.createdAt));
  res.json(rows);
});
router.post('/trainings', async (req: AuthRequest, res) => {
  const b = req.body;
  const [row] = await db.insert(trainingRecords).values({
    organizationId: req.organizationId!,
    plantId: b.plantId || null,
    trainingNumber: makeNumber('TRN'),
    category: b.category || 'Fire Safety',
    title: b.title,
    trainerName: b.trainerName || req.authUser!.fullName,
    scheduledDate: b.scheduledDate || new Date().toISOString().slice(0, 10),
    durationHours: Number(b.durationHours || 2),
    attendees: b.attendees || [],
    quizScore: Number(b.quizScore || 90),
    passingScore: Number(b.passingScore || 80),
    certificateNumber: b.certificateNumber || makeNumber('CERT'),
    renewalDate: b.renewalDate || new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    effectivenessRating: Number(b.effectivenessRating || 5),
    status: b.status || 'Completed',
  }).returning();
  res.status(201).json(row);
});

router.get('/emergency', async (req: AuthRequest, res) => {
  const rows = await db.select().from(emergencyRecords).where(eq(emergencyRecords.organizationId, req.organizationId!)).orderBy(desc(emergencyRecords.createdAt));
  res.json(rows);
});
router.post('/emergency', async (req: AuthRequest, res) => {
  const b = req.body;
  const [row] = await db.insert(emergencyRecords).values({
    organizationId: req.organizationId!,
    plantId: b.plantId || null,
    recordType: b.recordType || 'Mock Drill',
    title: b.title,
    scenarioType: b.scenarioType || 'Fire Evacuation',
    drillDate: b.drillDate || new Date().toISOString().slice(0, 10),
    responseTimeSeconds: b.responseTimeSeconds ? Number(b.responseTimeSeconds) : 180,
    participantsCount: Number(b.participantsCount || 0),
    assemblyPoint: b.assemblyPoint || 'Assembly Point A',
    emergencyContacts: b.emergencyContacts || [],
    lessonsLearned: b.lessonsLearned || '',
    status: b.status || 'Completed',
  }).returning();
  res.status(201).json(row);
});

router.get('/environment', async (req: AuthRequest, res) => {
  const rows = await db.select().from(environmentRecords).where(eq(environmentRecords.organizationId, req.organizationId!)).orderBy(desc(environmentRecords.createdAt));
  res.json(rows);
});
router.post('/environment', async (req: AuthRequest, res) => {
  const b = req.body;
  const qty = Number(b.quantity || 0);
  const limit = b.limitValue !== undefined && b.limitValue !== '' ? Number(b.limitValue) : null;
  const status = limit !== null && qty > limit ? 'Exceeded' : 'Within Limit';
  const [row] = await db.insert(environmentRecords).values({
    organizationId: req.organizationId!,
    plantId: b.plantId || null,
    recordType: b.recordType || 'Air Emissions',
    framework: b.framework || 'ISO 14001',
    metricName: b.metricName,
    quantity: qty,
    unit: b.unit || 'kWh',
    limitValue: limit,
    monitoringDate: b.monitoringDate || new Date().toISOString().slice(0, 10),
    complianceStatus: b.complianceStatus || status,
    notes: b.notes || '',
  }).returning();
  res.status(201).json(row);
});

router.get('/legal', async (req: AuthRequest, res) => {
  const rows = await db.select().from(legalCompliances).where(eq(legalCompliances.organizationId, req.organizationId!)).orderBy(desc(legalCompliances.createdAt));
  res.json(rows);
});
router.post('/legal', async (req: AuthRequest, res) => {
  const b = req.body;
  const [row] = await db.insert(legalCompliances).values({
    organizationId: req.organizationId!,
    plantId: b.plantId || null,
    state: b.state || 'Central / All States',
    statuteName: b.statuteName,
    sectionRef: b.sectionRef || 'Section 1',
    obligation: b.obligation,
    applicability: b.applicability || 'Applicable',
    responsiblePerson: b.responsiblePerson || req.authUser!.fullName,
    frequency: b.frequency || 'Annual',
    dueDate: b.dueDate || new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
    complianceStatus: b.complianceStatus || 'Under Legal Review',
    evidenceSummary: b.evidenceSummary || '',
    revisionNotes: b.revisionNotes || '',
  }).returning();
  res.status(201).json(row);
});
router.patch('/legal/:id', async (req: AuthRequest, res) => {
  const b = req.body;
  const [existing] = await db
    .select()
    .from(legalCompliances)
    .where(and(eq(legalCompliances.id, req.params.id), eq(legalCompliances.organizationId, req.organizationId!)))
    .limit(1);
  if (!existing) return res.status(404).json({ error: 'Legal record not found' });

  const [row] = await db
    .update(legalCompliances)
    .set({
      state: b.state ?? existing.state,
      statuteName: b.statuteName ?? existing.statuteName,
      sectionRef: b.sectionRef ?? existing.sectionRef,
      obligation: b.obligation ?? existing.obligation,
      applicability: b.applicability ?? existing.applicability,
      responsiblePerson: b.responsiblePerson ?? existing.responsiblePerson,
      frequency: b.frequency ?? existing.frequency,
      dueDate: b.dueDate ?? existing.dueDate,
      complianceStatus: b.complianceStatus ?? existing.complianceStatus,
      evidenceSummary: b.evidenceSummary ?? existing.evidenceSummary,
      revisionNotes: b.revisionNotes ?? existing.revisionNotes,
      verifiedBy: req.authUser!.fullName,
      updatedAt: new Date(),
    })
    .where(and(eq(legalCompliances.id, req.params.id), eq(legalCompliances.organizationId, req.organizationId!)))
    .returning();
  res.json(row);
});

router.delete('/legal/:id', async (req: AuthRequest, res) => {
  await db
    .delete(legalCompliances)
    .where(and(eq(legalCompliances.id, req.params.id), eq(legalCompliances.organizationId, req.organizationId!)));
  res.json({ success: true });
});

router.get('/documents', async (req: AuthRequest, res) => {
  const rows = await db
    .select()
    .from(documents)
    .where(eq(documents.organizationId, req.organizationId!))
    .orderBy(asc(documents.sectionNumber), desc(documents.createdAt));
  res.json(rows);
});

router.post('/documents', async (req: AuthRequest, res) => {
  const b = req.body;
  if (!b.title || !String(b.title).trim()) {
    return res.status(400).json({ error: 'Document title is required' });
  }
  const safeFileName = b.fileName || `${String(b.title).trim().replace(/[^a-zA-Z0-9_-]+/g, '_')}.pdf`;
  const uploadCheck = validateUploadedDocument({
    fileName: safeFileName,
    fileDataUrl: b.fileDataUrl || null,
    fileSize: b.fileSize ? Number(b.fileSize) : undefined,
  });
  if (!uploadCheck.ok) {
    await recordSecurityEvent({
      organizationId: req.organizationId!,
      userEmail: req.authUser?.email ?? null,
      eventType: 'INVALID_FILE_UPLOAD',
      severity: 'warning',
      ipAddress: extractClientIp(req),
      endpoint: req.originalUrl,
      method: req.method,
      details: { fileName: safeFileName, reason: uploadCheck.reason },
    });
    return res.status(400).json({ error: uploadCheck.reason });
  }

  const [row] = await db
    .insert(documents)
    .values({
      organizationId: req.organizationId!,
      plantId: b.plantId || null,
      departmentId: b.departmentId || null,
      parentDocumentId: b.parentDocumentId || null,
      sectionNumber: Number(b.sectionNumber || 1),
      sectionName: b.sectionName || 'Policies',
      documentCode:
        b.documentCode ||
        `AR-GLB-SITE-DOC-${b.parentDocumentId ? 'CHD' : 'MST'}-${Math.floor(1000 + Math.random() * 9000)}`,
      title: String(b.title).trim(),
      contentText: b.contentText || '',
      fileName: safeFileName,
      fileType: b.fileType || 'PDF',
      fileSize: uploadCheck.estimatedBytes || Number(b.fileSize || 0),
      fileDataUrl: b.fileDataUrl || null,
      version: b.version || '1.0',
      status: b.status || 'Completed',
      ownerName: b.ownerName || req.authUser!.fullName,
      authorAttribution: b.authorAttribution || `Jonathan Thadanki · ${req.authUser!.fullName}`,
      isoReferences: Array.isArray(b.isoReferences) ? b.isoReferences : [],
      factoryRulesReferences: Array.isArray(b.factoryRulesReferences) ? b.factoryRulesReferences : [],
      oshaReferences: Array.isArray(b.oshaReferences) ? b.oshaReferences : [],
      aiSuggestions: b.aiSuggestions || null,
      reviewDate: b.reviewDate || new Date().toISOString().slice(0, 10),
      expiryDate: b.expiryDate || new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      tags: Array.isArray(b.tags) ? b.tags : [],
      uploadedBy: req.authUser!.id,
    })
    .returning();

  await writeAuditLog({
    organizationId: req.organizationId!,
    userId: req.authUser!.id,
    userName: req.authUser!.fullName,
    action: b.parentDocumentId ? 'ADD_CHILD_DOCUMENT' : 'ADD_DOCUMENT',
    entityType: 'documents',
    entityId: row.id,
    details: { title: row.title, documentCode: row.documentCode, parentDocumentId: row.parentDocumentId },
  });

  res.status(201).json(row);
});

router.patch('/documents/:id', async (req: AuthRequest, res) => {
  const b = req.body;
  const [existing] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, req.params.id), eq(documents.organizationId, req.organizationId!)))
    .limit(1);
  if (!existing) return res.status(404).json({ error: 'Document not found' });

  if (b.fileDataUrl !== undefined || b.fileName !== undefined || b.fileSize !== undefined) {
    const uploadCheck = validateUploadedDocument({
      fileName: b.fileName !== undefined ? b.fileName : existing.fileName,
      fileDataUrl: b.fileDataUrl !== undefined ? b.fileDataUrl : existing.fileDataUrl,
      fileSize: b.fileSize !== undefined ? Number(b.fileSize) : existing.fileSize ?? undefined,
    });
    if (!uploadCheck.ok) {
      await recordSecurityEvent({
        organizationId: req.organizationId!,
        userEmail: req.authUser?.email ?? null,
        eventType: 'INVALID_FILE_UPLOAD',
        severity: 'warning',
        ipAddress: extractClientIp(req),
        endpoint: req.originalUrl,
        method: req.method,
        details: { documentId: existing.id, reason: uploadCheck.reason },
      });
      return res.status(400).json({ error: uploadCheck.reason });
    }
  }

  const [row] = await db
    .update(documents)
    .set({
      title: b.title !== undefined ? String(b.title).trim() : existing.title,
      sectionNumber: b.sectionNumber !== undefined ? Number(b.sectionNumber) : existing.sectionNumber,
      sectionName: b.sectionName !== undefined ? b.sectionName : existing.sectionName,
      parentDocumentId: b.parentDocumentId !== undefined ? b.parentDocumentId || null : existing.parentDocumentId,
      contentText: b.contentText !== undefined ? b.contentText : existing.contentText,
      fileName: b.fileName !== undefined ? b.fileName : existing.fileName,
      fileDataUrl: b.fileDataUrl !== undefined ? b.fileDataUrl : existing.fileDataUrl,
      status: b.status !== undefined ? b.status : existing.status,
      version: b.version !== undefined ? b.version : existing.version,
      isArchived: b.isArchived !== undefined ? Boolean(b.isArchived) : existing.isArchived,
      ownerName: b.ownerName !== undefined ? b.ownerName : existing.ownerName,
      authorAttribution: b.authorAttribution !== undefined ? b.authorAttribution : existing.authorAttribution,
      isoReferences: Array.isArray(b.isoReferences) ? b.isoReferences : existing.isoReferences,
      factoryRulesReferences: Array.isArray(b.factoryRulesReferences)
        ? b.factoryRulesReferences
        : existing.factoryRulesReferences,
      oshaReferences: Array.isArray(b.oshaReferences) ? b.oshaReferences : existing.oshaReferences,
      aiSuggestions: b.aiSuggestions !== undefined ? b.aiSuggestions : existing.aiSuggestions,
      reviewDate: b.reviewDate !== undefined ? b.reviewDate : existing.reviewDate,
      expiryDate: b.expiryDate !== undefined ? b.expiryDate : existing.expiryDate,
      updatedAt: new Date(),
    })
    .where(and(eq(documents.id, req.params.id), eq(documents.organizationId, req.organizationId!)))
    .returning();

  await writeAuditLog({
    organizationId: req.organizationId!,
    userId: req.authUser!.id,
    userName: req.authUser!.fullName,
    action: 'EDIT_DOCUMENT',
    entityType: 'documents',
    entityId: row.id,
    details: { title: row.title, version: row.version, status: row.status },
  });

  res.json(row);
});

router.get('/documents/:id/signed-url', async (req: AuthRequest, res) => {
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, req.params.id), eq(documents.organizationId, req.organizationId!)))
    .limit(1);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const ttlSeconds = Math.min(3600, Math.max(60, Number(req.query.ttlSeconds || 900)));
  const signed = createSignedDocumentToken({
    documentId: doc.id,
    organizationId: req.organizationId!,
    expiresInSeconds: ttlSeconds,
  });

  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const host = req.get('host') || 'localhost:3000';
  const signedUrl = `${proto}://${host}/api/public/documents/download?token=${encodeURIComponent(signed.token)}`;

  const supabaseSignedUrl =
    doc.fileName && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? await createSupabaseSignedUrlIfConfigured(`${req.organizationId}/${doc.id}/${doc.fileName}`, ttlSeconds)
      : null;

  await writeAuditLog({
    organizationId: req.organizationId!,
    userId: req.authUser!.id,
    userName: req.authUser!.fullName,
    action: 'GENERATE_SIGNED_DOCUMENT_URL',
    entityType: 'documents',
    entityId: doc.id,
    details: { documentCode: doc.documentCode, expiresAt: signed.expiresAt, ttlSeconds },
  });

  res.json({
    documentId: doc.id,
    fileName: doc.fileName,
    signedUrl,
    expiresAt: signed.expiresAt,
    expiresInSeconds: ttlSeconds,
    supabaseStorageSignedUrl: supabaseSignedUrl,
  });
});

router.delete('/documents/:id', async (req: AuthRequest, res) => {
  const [existing] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, req.params.id), eq(documents.organizationId, req.organizationId!)))
    .limit(1);
  if (!existing) return res.status(404).json({ error: 'Document not found' });

  await db
    .delete(documents)
    .where(and(eq(documents.id, req.params.id), eq(documents.organizationId, req.organizationId!)));

  await writeAuditLog({
    organizationId: req.organizationId!,
    userId: req.authUser!.id,
    userName: req.authUser!.fullName,
    action: 'DELETE_DOCUMENT',
    entityType: 'documents',
    entityId: existing.id,
    details: { title: existing.title, documentCode: existing.documentCode },
  });

  res.json({ success: true });
});

router.get('/weekly-activities', async (req: AuthRequest, res) => {
  const rows = await db.select().from(weeklySafetyActivities).where(eq(weeklySafetyActivities.organizationId, req.organizationId!)).orderBy(desc(weeklySafetyActivities.createdAt));
  res.json(rows);
});
router.post('/weekly-activities', async (req: AuthRequest, res) => {
  const b = req.body;
  const [row] = await db.insert(weeklySafetyActivities).values({
    organizationId: req.organizationId!,
    plantId: b.plantId || null,
    parentCategory: b.parentCategory || 'Fire Safety',
    childCategory: b.childCategory || 'Hydrant & Extinguisher Inspection',
    activityName: b.activityName,
    responsiblePerson: b.responsiblePerson || req.authUser!.fullName,
    departmentName: b.departmentName || 'HSE',
    weekLabel: b.weekLabel || '2026-W47',
    targetDate: b.targetDate || new Date().toISOString().slice(0, 10),
    status: b.status || 'Not Started',
    remarks: b.remarks || '',
  }).returning();
  res.status(201).json(row);
});
router.patch('/weekly-activities/:id', async (req: AuthRequest, res) => {
  const b = req.body;
  const [row] = await db.update(weeklySafetyActivities).set({
    status: b.status,
    completionDate: b.status === 'Completed' ? new Date().toISOString().slice(0, 10) : null,
    evidenceNotes: b.evidenceNotes,
    approvedBy: b.status === 'Completed' ? req.authUser!.fullName : null,
    updatedAt: new Date(),
  }).where(and(eq(weeklySafetyActivities.id, req.params.id), eq(weeklySafetyActivities.organizationId, req.organizationId!))).returning();
  res.json(row);
});

router.get('/ppe', async (req: AuthRequest, res) => {
  const rows = await db.select().from(ppeInventory).where(eq(ppeInventory.organizationId, req.organizationId!)).orderBy(asc(ppeInventory.itemName));
  res.json(rows);
});
router.post('/ppe', async (req: AuthRequest, res) => {
  const b = req.body;
  const [row] = await db.insert(ppeInventory).values({
    organizationId: req.organizationId!,
    plantId: b.plantId || null,
    itemCode: b.itemCode || makeNumber('PPE'),
    itemName: b.itemName,
    category: b.category || 'Head Protection',
    currentStock: Number(b.currentStock || 0),
    minStock: Number(b.minStock || 10),
    unit: b.unit || 'Units',
    expiryDate: b.expiryDate || '',
    lastRestockedAt: new Date().toISOString().slice(0, 10),
    transactions: [{ type: 'Initial Stock', qty: Number(b.currentStock || 0), by: req.authUser!.fullName, at: new Date().toISOString() }],
  }).returning();
  res.status(201).json(row);
});
router.post('/ppe/:id/transaction', async (req: AuthRequest, res) => {
  const { type, qty, recipient } = req.body; // Stock In | Issue | Stock Out
  const [existing] = await db.select().from(ppeInventory).where(and(eq(ppeInventory.id, req.params.id), eq(ppeInventory.organizationId, req.organizationId!))).limit(1);
  if (!existing) return res.status(404).json({ error: 'PPE item not found' });
  const delta = type === 'Stock In' ? Math.abs(Number(qty)) : -Math.abs(Number(qty));
  const nextStock = Math.max(0, existing.currentStock + delta);
  const nextTx = [
    ...(existing.transactions || []),
    { type, qty: Number(qty), recipient: recipient || '', by: req.authUser!.fullName, at: new Date().toISOString() },
  ];
  const [updated] = await db.update(ppeInventory).set({
    currentStock: nextStock,
    lastRestockedAt: type === 'Stock In' ? new Date().toISOString().slice(0, 10) : existing.lastRestockedAt,
    transactions: nextTx,
    updatedAt: new Date(),
  }).where(eq(ppeInventory.id, existing.id)).returning();
  res.json(updated);
});

router.get('/gate', async (req: AuthRequest, res) => {
  const rows = await db.select().from(gateEntries).where(eq(gateEntries.organizationId, req.organizationId!)).orderBy(desc(gateEntries.entryTime));
  res.json(rows);
});
router.post('/gate', async (req: AuthRequest, res) => {
  const b = req.body;
  const passNumber = makeNumber('GATE');
  const [row] = await db.insert(gateEntries).values({
    organizationId: req.organizationId!,
    plantId: b.plantId || null,
    passNumber,
    entryType: b.entryType || 'Visitor',
    personOrDriverName: b.personOrDriverName,
    companyName: b.companyName || '',
    vehicleNumber: b.vehicleNumber || '',
    materialDetails: b.materialDetails || '',
    permitNumber: b.permitNumber || '',
    inductionVerified: Boolean(b.inductionVerified),
    restrictedAreaAccess: Boolean(b.restrictedAreaAccess),
    qrPassToken: `ARSHIEL-${passNumber}`,
    status: 'Checked In',
    verifiedBy: req.authUser!.fullName,
  }).returning();
  res.status(201).json(row);
});
router.post('/gate/:id/checkout', async (req: AuthRequest, res) => {
  const [row] = await db.update(gateEntries).set({
    status: 'Checked Out',
    exitTime: new Date(),
  }).where(and(eq(gateEntries.id, req.params.id), eq(gateEntries.organizationId, req.organizationId!))).returning();
  res.json(row);
});

router.get('/committees', async (req: AuthRequest, res) => {
  const rows = await db.select().from(safetyCommittees).where(eq(safetyCommittees.organizationId, req.organizationId!)).orderBy(desc(safetyCommittees.createdAt));
  res.json(rows);
});
router.post('/committees', async (req: AuthRequest, res) => {
  const b = req.body;
  const [row] = await db.insert(safetyCommittees).values({
    organizationId: req.organizationId!,
    plantId: b.plantId || null,
    recordType: b.recordType || 'Meeting',
    title: b.title,
    meetingDate: b.meetingDate || new Date().toISOString().slice(0, 10),
    members: b.members || [],
    agenda: b.agenda || '',
    minutes: b.minutes || '',
    welfareChecklist: b.welfareChecklist || {},
    actionPoints: b.actionPoints || [],
    status: b.status || 'Scheduled',
  }).returning();
  res.status(201).json(row);
});

// ============================================================================
// PART 26: COMPREHENSIVE 20-TYPE ANALYTICS & REGULATORY REPORT DATASET ENGINE
// ============================================================================
router.get('/analytics/report', async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const reportType = String(req.query.type || 'incident');
    const plantId = typeof req.query.plantId === 'string' && req.query.plantId !== 'all' ? req.query.plantId : null;

    const filterPlant = <T extends { plantId?: string | null }>(rows: T[]) =>
      plantId ? rows.filter((r) => r.plantId === plantId) : rows;

    let rows: Record<string, unknown>[] = [];
    if (reportType === 'incident' || reportType === 'lti_trir' || reportType === 'near_miss') {
      const list = filterPlant(await db.select().from(incidents).where(eq(incidents.organizationId, orgId)));
      const filtered =
        reportType === 'near_miss'
          ? list.filter((i) => i.incidentType === 'Near Miss')
          : reportType === 'lti_trir'
            ? list.filter((i) => i.isRecordable || i.incidentType === 'Lost Time Injury (LTI)')
            : list;
      rows = filtered.map((i) => ({
        Number: i.incidentNumber,
        Type: i.incidentType,
        Severity: i.severity,
        Title: i.title,
        Date: i.incidentDate,
        Location: i.specificLocation || i.plantName || '-',
        DaysLost: i.daysLost,
        Status: i.status,
      }));
    } else if (reportType === 'observation') {
      const list = filterPlant(await db.select().from(safetyObservations).where(eq(safetyObservations.organizationId, orgId)));
      rows = list.map((o) => ({
        Number: o.observationNumber,
        Type: o.observationType,
        Category: o.category,
        RiskLevel: o.riskLevel,
        Title: o.title,
        HumanVerified: o.humanVerified ? 'Yes' : 'Pending',
        Status: o.status,
      }));
    } else if (reportType === 'capa') {
      const list = filterPlant(await db.select().from(capas).where(eq(capas.organizationId, orgId)));
      rows = list.map((c) => ({
        ActionNo: c.actionNumber,
        Source: `${c.sourceType} ${c.sourceNumber || ''}`,
        Title: c.title,
        Priority: c.priority,
        Owner: c.responsiblePerson,
        TargetDate: c.targetDate,
        Status: c.status,
      }));
    } else if (reportType === 'ptw') {
      const list = filterPlant(await db.select().from(workPermits).where(eq(workPermits.organizationId, orgId)));
      rows = list.map((p) => ({
        PermitNo: p.permitNumber,
        Type: p.permitType,
        Location: p.workLocation,
        Applicant: p.applicantName,
        Contractor: p.contractorName || 'In-house',
        ValidWindow: `${p.startDate} to ${p.endDate}`,
        Status: p.status,
      }));
    } else if (reportType === 'risk') {
      const list = filterPlant(await db.select().from(riskAssessments).where(eq(riskAssessments.organizationId, orgId)));
      rows = list.map((r) => ({
        Ref: r.assessmentNumber,
        Methodology: r.methodology,
        Title: r.title,
        Hazard: r.hazard,
        InitialScore: r.initialRiskScore,
        ResidualScore: r.residualRiskScore,
        Status: r.status,
      }));
    } else if (reportType === 'audit') {
      const list = filterPlant(await db.select().from(safetyAudits).where(eq(safetyAudits.organizationId, orgId)));
      rows = list.map((a) => ({
        AuditNo: a.auditNumber,
        Title: a.title,
        Type: a.auditType,
        Auditor: a.leadAuditor,
        CompliancePct: `${a.complianceScore}%`,
        NCItems: a.nonCompliantItems,
        Status: a.status,
      }));
    } else if (reportType === 'training') {
      const list = filterPlant(await db.select().from(trainingRecords).where(eq(trainingRecords.organizationId, orgId)));
      rows = list.map((t) => ({
        TrainingNo: t.trainingNumber,
        Title: t.title,
        Category: t.category,
        Trainer: t.trainerName,
        Date: t.scheduledDate,
        QuizScore: `${t.quizScore}%`,
        Status: t.status,
      }));
    } else if (reportType === 'contractor') {
      const list = filterPlant(await db.select().from(contractors).where(eq(contractors.organizationId, orgId)));
      rows = list.map((c) => ({
        VendorCode: c.vendorCode,
        Company: c.companyName,
        Supervisor: c.supervisorName,
        LicenseNo: c.licenseNumber || '-',
        Score: c.evaluationScore,
        Status: c.status,
      }));
    } else if (reportType === 'equipment') {
      const list = filterPlant(await db.select().from(equipmentAssets).where(eq(equipmentAssets.organizationId, orgId)));
      rows = list.map((e) => ({
        AssetNo: e.equipmentId,
        Name: e.name,
        Category: e.category,
        Location: e.location,
        NextDue: e.nextDueDate,
        Status: e.status,
      }));
    } else if (reportType === 'environment') {
      const list = filterPlant(await db.select().from(environmentRecords).where(eq(environmentRecords.organizationId, orgId)));
      rows = list.map((e) => ({
        Framework: e.framework,
        Type: e.recordType,
        Metric: e.metricName,
        Quantity: `${e.quantity} ${e.unit}`,
        Date: e.monitoringDate,
        Status: e.complianceStatus,
      }));
    } else if (reportType === 'legal') {
      const list = filterPlant(await db.select().from(legalCompliances).where(eq(legalCompliances.organizationId, orgId)));
      rows = list.map((l) => ({
        Statute: l.statuteName,
        Section: l.sectionRef,
        State: l.state,
        Obligation: l.obligation,
        DueDate: l.dueDate,
        Status: l.complianceStatus,
      }));
    } else if (reportType === 'ppe') {
      const list = filterPlant(await db.select().from(ppeInventory).where(eq(ppeInventory.organizationId, orgId)));
      rows = list.map((p) => ({
        Code: p.itemCode,
        Item: p.itemName,
        Category: p.category,
        Stock: p.currentStock,
        MinStock: p.minStock,
        Alert: p.currentStock <= p.minStock ? 'Critical Low' : 'Healthy',
      }));
    } else if (reportType === 'gate') {
      const list = filterPlant(await db.select().from(gateEntries).where(eq(gateEntries.organizationId, orgId)));
      rows = list.map((g) => ({
        PassNo: g.passNumber,
        Name: g.personOrDriverName,
        Type: g.entryType,
        Company: g.companyName || '-',
        Status: g.status,
      }));
    } else if (reportType === 'emergency') {
      const list = filterPlant(await db.select().from(emergencyRecords).where(eq(emergencyRecords.organizationId, orgId)));
      rows = list.map((e) => ({
        Type: e.recordType,
        Title: e.title,
        Scenario: e.scenarioType || '-',
        ResponseSec: e.responseTimeSeconds || 0,
        Participants: e.participantsCount,
        Status: e.status,
      }));
    } else if (reportType === 'committee') {
      const list = filterPlant(await db.select().from(safetyCommittees).where(eq(safetyCommittees.organizationId, orgId)));
      rows = list.map((c) => ({
        Type: c.recordType,
        Title: c.title,
        Date: c.meetingDate,
        Status: c.status,
      }));
    } else if (reportType === 'weekly') {
      const list = filterPlant(await db.select().from(weeklySafetyActivities).where(eq(weeklySafetyActivities.organizationId, orgId)));
      rows = list.map((w) => ({
        Week: w.weekLabel,
        Category: `${w.parentCategory} > ${w.childCategory}`,
        Activity: w.activityName,
        Responsible: w.responsiblePerson,
        Status: w.status,
      }));
    } else {
      // plant_performance / department_performance
      const plantList = await db.select().from(plants).where(eq(plants.organizationId, orgId));
      const [incList, ptwList, capaList] = await Promise.all([
        db.select().from(incidents).where(eq(incidents.organizationId, orgId)),
        db.select().from(workPermits).where(eq(workPermits.organizationId, orgId)),
        db.select().from(capas).where(eq(capas.organizationId, orgId)),
      ]);
      rows = plantList.map((p) => ({
        Plant: p.name,
        Code: p.code,
        Employees: p.totalEmployees,
        Manhours: p.monthlyManhours,
        Incidents: incList.filter((i) => i.plantId === p.id).length,
        Permits: ptwList.filter((w) => w.plantId === p.id).length,
        OpenCAPAs: capaList.filter((c) => c.plantId === p.id && c.status !== 'Closed').length,
      }));
    }

    res.json({ reportType, count: rows.length, rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate analytics report dataset' });
  }
});

// ============================================================================
// MASTER KPI & INDIVIDUAL KPI ENGINE (Enterprise Parent Line + All Child KPIs)
// Covers Organization Master, Individual Industries, Individual Plants,
// Individual Built-in & Custom Modules, Individual Departments & Owners
// ============================================================================
router.get('/dashboard/master-kpis', async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const plantFilter = typeof req.query.plantId === 'string' && req.query.plantId !== 'all' ? req.query.plantId : null;
    const timeframeDays =
      req.query.timeframe === '7d'
        ? 7
        : req.query.timeframe === '30d'
          ? 30
          : req.query.timeframe === '90d'
            ? 90
            : req.query.timeframe === '365d'
              ? 365
              : null;
    const cutoffDate = timeframeDays ? new Date(Date.now() - timeframeDays * 86400000) : null;

    const [
      orgRows,
      plantRows,
      deptRows,
      userRows,
      modRows,
      tplRows,
      incRows,
      capaRows,
      ptwRows,
      lotoRows,
      obsRows,
      riskRows,
      auditRows,
      equipRows,
      contractorRows,
      workerRows,
      trainingRows,
      emergencyRows,
      envRows,
      legalRows,
      docRows,
      weeklyRows,
      ppeRows,
      gateRows,
      committeeRows,
      submissionRows,
      approvalRows,
    ] = await Promise.all([
      db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1),
      db.select().from(plants).where(eq(plants.organizationId, orgId)).orderBy(asc(plants.name)),
      db.select().from(departments).where(eq(departments.organizationId, orgId)).orderBy(asc(departments.name)),
      db.select().from(users).where(eq(users.organizationId, orgId)),
      db.select().from(modules).where(and(eq(modules.organizationId, orgId), isNull(modules.deletedAt))).orderBy(asc(modules.displayOrder)),
      db.select().from(industryTemplates).orderBy(asc(industryTemplates.industryName)),
      db.select().from(incidents).where(eq(incidents.organizationId, orgId)),
      db.select().from(capas).where(eq(capas.organizationId, orgId)),
      db.select().from(workPermits).where(eq(workPermits.organizationId, orgId)),
      db.select().from(lotoRecords).where(eq(lotoRecords.organizationId, orgId)),
      db.select().from(safetyObservations).where(eq(safetyObservations.organizationId, orgId)),
      db.select().from(riskAssessments).where(eq(riskAssessments.organizationId, orgId)),
      db.select().from(safetyAudits).where(eq(safetyAudits.organizationId, orgId)),
      db.select().from(equipmentAssets).where(eq(equipmentAssets.organizationId, orgId)),
      db.select().from(contractors).where(eq(contractors.organizationId, orgId)),
      db.select().from(contractorWorkers).where(eq(contractorWorkers.organizationId, orgId)),
      db.select().from(trainingRecords).where(eq(trainingRecords.organizationId, orgId)),
      db.select().from(emergencyRecords).where(eq(emergencyRecords.organizationId, orgId)),
      db.select().from(environmentRecords).where(eq(environmentRecords.organizationId, orgId)),
      db.select().from(legalCompliances).where(eq(legalCompliances.organizationId, orgId)),
      db.select().from(documents).where(eq(documents.organizationId, orgId)),
      db.select().from(weeklySafetyActivities).where(eq(weeklySafetyActivities.organizationId, orgId)),
      db.select().from(ppeInventory).where(eq(ppeInventory.organizationId, orgId)),
      db.select().from(gateEntries).where(eq(gateEntries.organizationId, orgId)),
      db.select().from(safetyCommittees).where(eq(safetyCommittees.organizationId, orgId)),
      db.select().from(formSubmissions).where(eq(formSubmissions.organizationId, orgId)),
      db.select().from(approvalInstances).where(eq(approvalInstances.organizationId, orgId)),
    ]);

    const org = orgRows[0] || null;
    const matchFilter = <T extends { plantId?: string | null; createdAt?: Date | null }>(rows: T[]) =>
      rows.filter((r) => {
        if (plantFilter && r.plantId !== plantFilter) return false;
        if (cutoffDate && r.createdAt && new Date(r.createdAt) < cutoffDate) return false;
        return true;
      });

    const fPlants = plantFilter ? plantRows.filter((p) => p.id === plantFilter) : plantRows;
    const fInc = matchFilter(incRows);
    const fCapa = matchFilter(capaRows);
    const fPtw = matchFilter(ptwRows);
    const fLoto = matchFilter(lotoRows);
    const fObs = matchFilter(obsRows);
    const fRisk = matchFilter(riskRows);
    const fAudit = matchFilter(auditRows);
    const fEquip = matchFilter(equipRows);
    const fContractors = matchFilter(contractorRows);
    const fWorkers = matchFilter(workerRows);
    const fTrain = matchFilter(trainingRows);
    const fEmergency = matchFilter(emergencyRows);
    const fEnv = matchFilter(envRows);
    const fLegal = matchFilter(legalRows);
    const fDocs = matchFilter(docRows).filter((d) => !d.isArchived);
    const fWeekly = matchFilter(weeklyRows);
    const fPpe = matchFilter(ppeRows);
    const fGate = matchFilter(gateRows);
    const fCommittee = matchFilter(committeeRows);
    const fSubs = matchFilter(submissionRows);
    const fApprovals = approvalRows.filter((a) => !cutoffDate || (a.createdAt && new Date(a.createdAt) >= cutoffDate));

    const todayStr = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString().slice(0, 16);

    const totalEmployees = fPlants.reduce((s, p) => s + (p.totalEmployees || 0), 0);
    const totalContractors = Math.max(
      fPlants.reduce((s, p) => s + (p.totalContractors || 0), 0),
      fWorkers.length
    );
    const totalManhours = fPlants.reduce((s, p) => s + (p.monthlyManhours || 0), 0);

    const ltiCount = fInc.filter((i) => i.incidentType === 'Lost Time Injury (LTI)').length;
    const recordableCount = fInc.filter(
      (i) =>
        i.isRecordable ||
        ['Lost Time Injury (LTI)', 'Restricted Work Case', 'Medical Treatment Case', 'Fatality'].includes(i.incidentType)
    ).length;
    const trir = totalManhours > 0 ? Number(((recordableCount * 200000) / totalManhours).toFixed(2)) : 0;
    const ltifr = totalManhours > 0 ? Number(((ltiCount * 1000000) / totalManhours).toFixed(2)) : 0;

    const closedCapa = fCapa.filter((c) => c.status === 'Closed').length;
    const openCapa = fCapa.length - closedCapa;
    const overdueCapa = fCapa.filter(
      (c) => c.status !== 'Closed' && (c.status === 'Overdue' || (c.targetDate && c.targetDate < todayStr))
    ).length;
    const capaClosurePct = fCapa.length > 0 ? Math.round((closedCapa / fCapa.length) * 100) : 100;

    const activePermits = fPtw.filter((p) => p.status === 'Active' || p.status === 'Approved').length;
    const closedPermits = fPtw.filter((p) => p.status === 'Closed').length;
    const expiredPermits = fPtw.filter(
      (p) => p.status === 'Expired' || (p.status === 'Active' && p.endDate && p.endDate < nowIso)
    ).length;
    const ptwCompliancePct =
      fPtw.length > 0 ? Math.round(((fPtw.length - expiredPermits) / fPtw.length) * 100) : 100;

    const verifiedLoto = fLoto.filter((l) => l.zeroEnergyVerified || l.status === 'Cleared' || l.status === 'Verified').length;
    const lotoCompliancePct = fLoto.length > 0 ? Math.round((verifiedLoto / fLoto.length) * 100) : 100;

    const closedObs = fObs.filter((o) => o.status === 'Closed').length;
    const verifiedObs = fObs.filter((o) => o.humanVerified).length;
    const obsClosurePct = fObs.length > 0 ? Math.round((closedObs / fObs.length) * 100) : 100;

    const approvedRisks = fRisk.filter((r) => r.status === 'Approved' || r.status === 'Active').length;
    const highRisks = fRisk.filter((r) => r.initialRiskScore >= 12).length;
    const riskControlPct = fRisk.length > 0 ? Math.round((approvedRisks / fRisk.length) * 100) : 100;

    const avgAuditScore =
      fAudit.length > 0
        ? Math.round(fAudit.reduce((sum, a) => sum + Number(a.complianceScore ?? 100), 0) / fAudit.length)
        : 100;

    const okEquip = fEquip.filter((e) => e.status === 'Operational' || e.status === 'Inspected').length;
    const equipCompliancePct = fEquip.length > 0 ? Math.round((okEquip / fEquip.length) * 100) : 100;

    const completedTrain = fTrain.filter((t) => t.status === 'Completed').length;
    const trainingCompliancePct = fTrain.length > 0 ? Math.round((completedTrain / fTrain.length) * 100) : 100;

    const withinLimitEnv = fEnv.filter((e) => e.complianceStatus === 'Within Limit' || e.complianceStatus === 'Compliant').length;
    const envCompliancePct = fEnv.length > 0 ? Math.round((withinLimitEnv / fEnv.length) * 100) : 100;

    const compliantLegal = fLegal.filter((l) => l.complianceStatus === 'Compliant').length;
    const legalCompliancePct = fLegal.length > 0 ? Math.round((compliantLegal / fLegal.length) * 100) : 100;

    const normalDocs = fDocs.filter((d) => !d.parentDocumentId);
    const childDocs = fDocs.filter((d) => Boolean(d.parentDocumentId));
    const completedDocs = fDocs.filter((d) => d.status === 'Completed').length;
    const docCompliancePct = fDocs.length > 0 ? Math.round((completedDocs / fDocs.length) * 100) : 100;
    const isoTaggedDocs = fDocs.filter((d) => Array.isArray(d.isoReferences) && d.isoReferences.length > 0).length;
    const factoryTaggedDocs = fDocs.filter(
      (d) => Array.isArray(d.factoryRulesReferences) && d.factoryRulesReferences.length > 0
    ).length;
    const oshaTaggedDocs = fDocs.filter((d) => Array.isArray(d.oshaReferences) && d.oshaReferences.length > 0).length;
    const coveredSectionsCount = new Set(fDocs.map((d) => d.sectionNumber)).size;

    const completedWeekly = fWeekly.filter((w) => w.status === 'Completed').length;
    const weeklyCompliancePct = fWeekly.length > 0 ? Math.round((completedWeekly / fWeekly.length) * 100) : 100;

    const healthyPpe = fPpe.filter((p) => p.currentStock > p.minStock).length;
    const lowStockPpe = fPpe.length - healthyPpe;
    const ppeReadinessPct = fPpe.length > 0 ? Math.round((healthyPpe / fPpe.length) * 100) : 100;

    const avgContractorScore =
      fContractors.length > 0
        ? Math.round(fContractors.reduce((s, c) => s + Number(c.evaluationScore ?? 85), 0) / fContractors.length)
        : 100;

    const completedEmergency = fEmergency.filter((e) => e.status === 'Completed' || e.status === 'Active').length;
    const emergencyPct = fEmergency.length > 0 ? Math.round((completedEmergency / fEmergency.length) * 100) : 100;
    const drillResponses = fEmergency.map((e) => Number(e.responseTimeSeconds || 0)).filter((n) => n > 0);
    const avgDrillResponseSec =
      drillResponses.length > 0 ? Math.round(drillResponses.reduce((a, b) => a + b, 0) / drillResponses.length) : 0;

    const compositeComplianceIndex = Math.round(
      (capaClosurePct +
        ptwCompliancePct +
        lotoCompliancePct +
        avgAuditScore +
        equipCompliancePct +
        trainingCompliancePct +
        envCompliancePct +
        legalCompliancePct +
        docCompliancePct +
        ppeReadinessPct) /
        10
    );

    // 1. Individual Module KPIs (Built-in + Custom Dynamic Modules)
    const coreModuleKpis = [
      {
        id: 'core-incidents',
        moduleCode: 'EHS-INC',
        moduleName: 'Incident Management',
        category: 'Core Safety',
        routeKey: 'incidents',
        customModuleId: null as string | null,
        totalRecords: fInc.length,
        openOrPending: fInc.filter((i) => i.status !== 'Closed').length,
        completedOrCompliant: fInc.filter((i) => i.status === 'Closed').length,
        compliancePct: fInc.length > 0 ? Math.round((fInc.filter((i) => i.status === 'Closed').length / fInc.length) * 100) : 100,
        keyMetricLabel: 'TRIR / LTIFR',
        keyMetricValue: `${trir} / ${ltifr}`,
      },
      {
        id: 'core-capa',
        moduleCode: 'EHS-CAPA',
        moduleName: 'RCA & CAPA Register',
        category: 'Core Safety',
        routeKey: 'rca-capa',
        customModuleId: null,
        totalRecords: fCapa.length,
        openOrPending: openCapa,
        completedOrCompliant: closedCapa,
        compliancePct: capaClosurePct,
        keyMetricLabel: 'Overdue CAPAs',
        keyMetricValue: String(overdueCapa),
      },
      {
        id: 'core-ptw',
        moduleCode: 'EHS-PTW',
        moduleName: 'Permit to Work (20-Aspect)',
        category: 'Core Safety',
        routeKey: 'ptw',
        customModuleId: null,
        totalRecords: fPtw.length,
        openOrPending: fPtw.filter((p) => p.status === 'Submitted' || p.status === 'Active').length,
        completedOrCompliant: closedPermits + activePermits,
        compliancePct: ptwCompliancePct,
        keyMetricLabel: 'Active / Expired',
        keyMetricValue: `${activePermits} / ${expiredPermits}`,
      },
      {
        id: 'core-loto',
        moduleCode: 'EHS-LOTO',
        moduleName: 'LOTO Energy Isolation',
        category: 'Core Safety',
        routeKey: 'loto',
        customModuleId: null,
        totalRecords: fLoto.length,
        openOrPending: fLoto.filter((l) => !l.zeroEnergyVerified).length,
        completedOrCompliant: verifiedLoto,
        compliancePct: lotoCompliancePct,
        keyMetricLabel: 'Zero-Energy Verified',
        keyMetricValue: `${verifiedLoto}/${fLoto.length}`,
      },
      {
        id: 'core-obs',
        moduleCode: 'EHS-OBS',
        moduleName: 'AI Observations & BBS',
        category: 'Leading Safety',
        routeKey: 'observations',
        customModuleId: null,
        totalRecords: fObs.length,
        openOrPending: fObs.length - closedObs,
        completedOrCompliant: closedObs,
        compliancePct: obsClosurePct,
        keyMetricLabel: 'Human Verified',
        keyMetricValue: `${verifiedObs}/${fObs.length}`,
      },
      {
        id: 'core-risk',
        moduleCode: 'EHS-RISK',
        moduleName: 'Risk (HIRA / HAZOP / JSA)',
        category: 'Risk Engineering',
        routeKey: 'risk-assessment',
        customModuleId: null,
        totalRecords: fRisk.length,
        openOrPending: highRisks,
        completedOrCompliant: approvedRisks,
        compliancePct: riskControlPct,
        keyMetricLabel: 'High/Critical Score>=12',
        keyMetricValue: String(highRisks),
      },
      {
        id: 'core-audits',
        moduleCode: 'EHS-AUD',
        moduleName: 'Safety Audits & Checklists',
        category: 'Assurance',
        routeKey: 'audits',
        customModuleId: null,
        totalRecords: fAudit.length,
        openOrPending: fAudit.reduce((s, a) => s + Number(a.nonCompliantItems || 0), 0),
        completedOrCompliant: fAudit.filter((a) => a.status === 'Completed').length,
        compliancePct: avgAuditScore,
        keyMetricLabel: 'Avg Audit Score',
        keyMetricValue: `${avgAuditScore}%`,
      },
      {
        id: 'core-equipment',
        moduleCode: 'EHS-EQP',
        moduleName: 'Equipment & Asset Safety',
        category: 'Asset Integrity',
        routeKey: 'equipment',
        customModuleId: null,
        totalRecords: fEquip.length,
        openOrPending: fEquip.length - okEquip,
        completedOrCompliant: okEquip,
        compliancePct: equipCompliancePct,
        keyMetricLabel: 'Operational Assets',
        keyMetricValue: `${okEquip}/${fEquip.length}`,
      },
      {
        id: 'core-contractors',
        moduleCode: 'EHS-CON',
        moduleName: 'Contractors & Workforce',
        category: 'Workforce',
        routeKey: 'contractors',
        customModuleId: null,
        totalRecords: fContractors.length + fWorkers.length,
        openOrPending: fContractors.filter((c) => c.status !== 'Active').length,
        completedOrCompliant: fContractors.filter((c) => c.status === 'Active').length,
        compliancePct: avgContractorScore,
        keyMetricLabel: 'Workers Inducted',
        keyMetricValue: String(fWorkers.length),
      },
      {
        id: 'core-training',
        moduleCode: 'EHS-TRN',
        moduleName: 'Training & Competency',
        category: 'Workforce',
        routeKey: 'training',
        customModuleId: null,
        totalRecords: fTrain.length,
        openOrPending: fTrain.length - completedTrain,
        completedOrCompliant: completedTrain,
        compliancePct: trainingCompliancePct,
        keyMetricLabel: 'Completed Sessions',
        keyMetricValue: `${completedTrain}/${fTrain.length}`,
      },
      {
        id: 'core-emergency',
        moduleCode: 'EHS-ERP',
        moduleName: 'Emergency & Fire Drills',
        category: 'Preparedness',
        routeKey: 'emergency',
        customModuleId: null,
        totalRecords: fEmergency.length,
        openOrPending: fEmergency.length - completedEmergency,
        completedOrCompliant: completedEmergency,
        compliancePct: emergencyPct,
        keyMetricLabel: 'Avg Evacuation Time',
        keyMetricValue: avgDrillResponseSec > 0 ? `${avgDrillResponseSec}s` : 'N/A',
      },
      {
        id: 'core-environment',
        moduleCode: 'EHS-ENV',
        moduleName: 'Environment & ISO 14001',
        category: 'Sustainability',
        routeKey: 'environment',
        customModuleId: null,
        totalRecords: fEnv.length,
        openOrPending: fEnv.length - withinLimitEnv,
        completedOrCompliant: withinLimitEnv,
        compliancePct: envCompliancePct,
        keyMetricLabel: 'Within Limits',
        keyMetricValue: `${withinLimitEnv}/${fEnv.length}`,
      },
      {
        id: 'core-legal',
        moduleCode: 'EHS-LEG',
        moduleName: 'Legal & OSHWC 2020',
        category: 'Governance',
        routeKey: 'legal',
        customModuleId: null,
        totalRecords: fLegal.length,
        openOrPending: fLegal.length - compliantLegal,
        completedOrCompliant: compliantLegal,
        compliancePct: legalCompliancePct,
        keyMetricLabel: 'Compliant Statutes',
        keyMetricValue: `${compliantLegal}/${fLegal.length}`,
      },
      {
        id: 'core-documents',
        moduleCode: 'EHS-DOC',
        moduleName: 'Documents (Normal & Child)',
        category: 'Governance',
        routeKey: 'documents',
        customModuleId: null,
        totalRecords: fDocs.length,
        openOrPending: fDocs.length - completedDocs,
        completedOrCompliant: completedDocs,
        compliancePct: docCompliancePct,
        keyMetricLabel: 'Normal / Child / 23-Sec',
        keyMetricValue: `${normalDocs.length} / ${childDocs.length} / ${coveredSectionsCount}/23`,
      },
      {
        id: 'core-weekly',
        moduleCode: 'EHS-WKL',
        moduleName: 'Weekly Safety Tracking',
        category: 'Operations',
        routeKey: 'weekly-tracking',
        customModuleId: null,
        totalRecords: fWeekly.length,
        openOrPending: fWeekly.length - completedWeekly,
        completedOrCompliant: completedWeekly,
        compliancePct: weeklyCompliancePct,
        keyMetricLabel: 'Completed Checks',
        keyMetricValue: `${completedWeekly}/${fWeekly.length}`,
      },
      {
        id: 'core-ppe',
        moduleCode: 'EHS-PPE',
        moduleName: 'PPE & Safety Store',
        category: 'Operations',
        routeKey: 'ppe-store',
        customModuleId: null,
        totalRecords: fPpe.length,
        openOrPending: lowStockPpe,
        completedOrCompliant: healthyPpe,
        compliancePct: ppeReadinessPct,
        keyMetricLabel: 'Low Stock Alerts',
        keyMetricValue: String(lowStockPpe),
      },
      {
        id: 'core-gate',
        moduleCode: 'EHS-GAT',
        moduleName: 'Gate & Visitor Control',
        category: 'Security',
        routeKey: 'gate',
        customModuleId: null,
        totalRecords: fGate.length,
        openOrPending: fGate.filter((g) => g.status === 'Checked In').length,
        completedOrCompliant: fGate.filter((g) => g.inductionVerified).length,
        compliancePct:
          fGate.length > 0
            ? Math.round((fGate.filter((g) => g.inductionVerified).length / fGate.length) * 100)
            : 100,
        keyMetricLabel: 'Currently On-Site',
        keyMetricValue: String(fGate.filter((g) => g.status === 'Checked In').length),
      },
      {
        id: 'core-committee',
        moduleCode: 'EHS-COM',
        moduleName: 'Safety Committee & Welfare',
        category: 'Governance',
        routeKey: 'committee',
        customModuleId: null,
        totalRecords: fCommittee.length,
        openOrPending: fCommittee.filter((c) => c.status === 'Scheduled').length,
        completedOrCompliant: fCommittee.filter((c) => c.status === 'Completed').length,
        compliancePct:
          fCommittee.length > 0
            ? Math.round((fCommittee.filter((c) => c.status === 'Completed').length / fCommittee.length) * 100)
            : 100,
        keyMetricLabel: 'Meetings & Checks',
        keyMetricValue: String(fCommittee.length),
      },
    ];

    const customModules = modRows.filter(
      (m) => m.isActive && !m.isArchived && m.moduleType !== 'category' && !m.builtInKey
    );
    const customModuleKpis = customModules.map((cm) => {
      const mSubs = fSubs.filter((s) => s.moduleId === cm.id);
      const mApps = fApprovals.filter((a) => a.moduleId === cm.id);
      const completed = mSubs.filter((s) => s.status === 'Approved' || s.status === 'Closed').length;
      const pending = mSubs.length - completed + mApps.filter((a) => a.status === 'Pending').length;
      return {
        id: cm.id,
        moduleCode: cm.moduleCode,
        moduleName: cm.moduleName,
        category: 'Custom Dynamic Module',
        routeKey: 'custom-module',
        customModuleId: cm.id,
        totalRecords: mSubs.length,
        openOrPending: pending,
        completedOrCompliant: completed,
        compliancePct: mSubs.length > 0 ? Math.round((completed / mSubs.length) * 100) : 100,
        keyMetricLabel: 'Workflow Approvals',
        keyMetricValue: String(mApps.length),
      };
    });

    const moduleKpis = [...coreModuleKpis, ...customModuleKpis];

    // 2. Individual Industry KPIs (All seeded Industry Templates + Active Workspace Benchmark)
    const industryKpis = tplRows.map((tpl) => {
      const isCurrentOrgIndustry =
        (org?.industry || '').toLowerCase() === (tpl.industryName || '').toLowerCase();
      const hazardsList = Array.isArray(tpl.hazards) ? tpl.hazards : [];
      const permitTypesList = Array.isArray(tpl.permitTypes) ? tpl.permitTypes : [];
      const checklistsList = Array.isArray(tpl.checklists) ? tpl.checklists : [];
      const legalCatsList = Array.isArray(tpl.legalCategories) ? tpl.legalCategories : [];
      const modsList = Array.isArray(tpl.modules) ? tpl.modules : [];

      const relevantInc = isCurrentOrgIndustry
        ? fInc.length
        : fInc.filter((i) =>
            hazardsList.some((h) => `${i.title} ${i.description} ${i.incidentType}`.toLowerCase().includes(h.toLowerCase()))
          ).length;
      const relevantPtw = isCurrentOrgIndustry
        ? fPtw.length
        : fPtw.filter((p) =>
            permitTypesList.some((pt) => (p.permitType || '').toLowerCase().includes(pt.toLowerCase().split(' ')[0]))
          ).length;
      const relevantRisk = isCurrentOrgIndustry
        ? fRisk.length
        : fRisk.filter((r) =>
            hazardsList.some((h) => `${r.hazard} ${r.hazardCategory} ${r.title}`.toLowerCase().includes(h.toLowerCase()))
          ).length;
      const relevantLegal = isCurrentOrgIndustry
        ? fLegal.length
        : fLegal.filter((l) =>
            legalCatsList.some((lc) => `${l.statuteName} ${l.obligation}`.toLowerCase().includes(lc.toLowerCase().split(' ')[0]))
          ).length;

      const templateCoverageScore = Math.min(
        100,
        Math.round(
          (Math.min(hazardsList.length, 5) / 5) * 25 +
            (Math.min(permitTypesList.length, 4) / 4) * 25 +
            (Math.min(legalCatsList.length, 3) / 3) * 25 +
            (isCurrentOrgIndustry ? compositeComplianceIndex * 0.25 : 22)
        )
      );

      return {
        id: tpl.id,
        industryName: tpl.industryName,
        description: tpl.description || '',
        isActiveWorkspace: isCurrentOrgIndustry,
        hazards: hazardsList,
        permitTypes: permitTypesList,
        legalCategories: legalCatsList,
        recommendedModulesCount: modsList.length,
        checklistTemplatesCount: checklistsList.length,
        relevantIncidents: relevantInc,
        relevantPermits: relevantPtw,
        relevantRisks: relevantRisk,
        relevantLegalItems: relevantLegal,
        compliancePct: isCurrentOrgIndustry ? compositeComplianceIndex : templateCoverageScore,
        trirBenchmark: isCurrentOrgIndustry ? trir : 0,
        ltifrBenchmark: isCurrentOrgIndustry ? ltifr : 0,
        isoStandards: ['ISO 45001:2018', 'ISO 14001:2015', 'OSHWC Code 2020', 'OSHA 29 CFR 1910'],
      };
    });

    // 3. Individual Plant / Site KPIs
    const plantKpis = fPlants.map((p) => {
      const pInc = incRows.filter((r) => r.plantId === p.id);
      const pCapa = capaRows.filter((r) => r.plantId === p.id);
      const pPtw = ptwRows.filter((r) => r.plantId === p.id);
      const pObs = obsRows.filter((r) => r.plantId === p.id);
      const pRisk = riskRows.filter((r) => r.plantId === p.id);
      const pAudit = auditRows.filter((r) => r.plantId === p.id);
      const pEquip = equipRows.filter((r) => r.plantId === p.id);
      const pLegal = legalRows.filter((r) => r.plantId === p.id);
      const pDocs = docRows.filter((r) => r.plantId === p.id && !r.isArchived);

      const pLti = pInc.filter((i) => i.incidentType === 'Lost Time Injury (LTI)').length;
      const pRec = pInc.filter(
        (i) =>
          i.isRecordable ||
          ['Lost Time Injury (LTI)', 'Restricted Work Case', 'Medical Treatment Case', 'Fatality'].includes(i.incidentType)
      ).length;
      const pManhours = p.monthlyManhours || 0;
      const pTrir = pManhours > 0 ? Number(((pRec * 200000) / pManhours).toFixed(2)) : 0;
      const pLtifr = pManhours > 0 ? Number(((pLti * 1000000) / pManhours).toFixed(2)) : 0;

      const pClosedCapa = pCapa.filter((c) => c.status === 'Closed').length;
      const pCapaPct = pCapa.length > 0 ? Math.round((pClosedCapa / pCapa.length) * 100) : 100;
      const pAuditAvg =
        pAudit.length > 0
          ? Math.round(pAudit.reduce((s, a) => s + Number(a.complianceScore ?? 100), 0) / pAudit.length)
          : 100;
      const pEquipOk = pEquip.filter((e) => e.status === 'Operational' || e.status === 'Inspected').length;
      const pEquipPct = pEquip.length > 0 ? Math.round((pEquipOk / pEquip.length) * 100) : 100;
      const pLegalOk = pLegal.filter((l) => l.complianceStatus === 'Compliant').length;
      const pLegalPct = pLegal.length > 0 ? Math.round((pLegalOk / pLegal.length) * 100) : 100;

      return {
        plantId: p.id,
        plantName: p.name,
        code: p.code,
        state: p.state || p.location || 'India',
        headName: p.headName || 'Site Lead',
        employees: p.totalEmployees,
        contractors: p.totalContractors,
        manhours: pManhours,
        trir: pTrir,
        ltifr: pLtifr,
        incidentsCount: pInc.length,
        openCapas: pCapa.length - pClosedCapa,
        capaClosurePct: pCapaPct,
        activePermits: pPtw.filter((w) => w.status === 'Active' || w.status === 'Approved').length,
        totalPermits: pPtw.length,
        observationsCount: pObs.length,
        riskCount: pRisk.length,
        auditScorePct: pAuditAvg,
        equipmentPct: pEquipPct,
        legalCompliancePct: pLegalPct,
        documentsCount: pDocs.length,
        complianceIndex: Math.round((pCapaPct + pAuditAvg + pEquipPct + pLegalPct) / 4),
      };
    });

    // 4. Individual Department KPIs
    const plantNameMap = new Map(plantRows.map((p) => [p.id, p.name]));
    const departmentKpis = deptRows.map((d) => {
      const dInc = fInc.filter((r) => r.departmentId === d.id || r.departmentName === d.name);
      const dCapa = fCapa.filter((r) => r.departmentId === d.id);
      const dObs = fObs.filter((r) => r.departmentId === d.id || r.departmentName === d.name || r.responsibleDepartment === d.name);
      const dPtw = fPtw.filter((r) => r.departmentId === d.id || r.departmentName === d.name);
      const dRisk = fRisk.filter((r) => r.departmentId === d.id);
      const dDocs = fDocs.filter((r) => r.departmentId === d.id);
      const closedC = dCapa.filter((c) => c.status === 'Closed').length;
      const capaPct = dCapa.length > 0 ? Math.round((closedC / dCapa.length) * 100) : 100;
      const closedO = dObs.filter((o) => o.status === 'Closed').length;
      const obsPct = dObs.length > 0 ? Math.round((closedO / dObs.length) * 100) : 100;

      return {
        departmentId: d.id,
        departmentName: d.name,
        code: d.code,
        plantName: plantNameMap.get(d.plantId) || 'Enterprise',
        hodName: d.hodName || 'Department HOD',
        incidents: dInc.length,
        openCapas: dCapa.length - closedC,
        capaClosurePct: capaPct,
        observations: dObs.length,
        permits: dPtw.length,
        riskAssessments: dRisk.length,
        documents: dDocs.length,
        complianceScore: Math.round((capaPct + obsPct) / 2),
      };
    });

    // 5. Individual Owner / Safety Champion KPIs
    const ownerMap = new Map<
      string,
      {
        ownerName: string;
        designation: string;
        assignedCapas: number;
        closedCapas: number;
        overdueCapas: number;
        observationsLogged: number;
        permitsManaged: number;
        auditsLed: number;
        trainingsLed: number;
        documentsOwned: number;
        submissionsCount: number;
      }
    >();
    const ensureOwner = (name?: string | null, designation = 'EHS Team Member') => {
      const clean = String(name || '').trim();
      if (!clean || clean === 'Pending Safety Review') return null;
      const key = clean.toLowerCase();
      if (!ownerMap.has(key)) {
        ownerMap.set(key, {
          ownerName: clean,
          designation,
          assignedCapas: 0,
          closedCapas: 0,
          overdueCapas: 0,
          observationsLogged: 0,
          permitsManaged: 0,
          auditsLed: 0,
          trainingsLed: 0,
          documentsOwned: 0,
          submissionsCount: 0,
        });
      }
      return ownerMap.get(key)!;
    };

    for (const u of userRows) ensureOwner(u.fullName, u.designation || 'EHS User');
    for (const c of fCapa) {
      const o = ensureOwner(c.responsiblePerson, 'CAPA Action Owner');
      if (o) {
        o.assignedCapas += 1;
        if (c.status === 'Closed') o.closedCapas += 1;
        else if (c.status === 'Overdue' || (c.targetDate && c.targetDate < todayStr)) o.overdueCapas += 1;
      }
    }
    for (const ob of fObs) {
      const o1 = ensureOwner(ob.reportedByName, 'Safety Observer');
      if (o1) o1.observationsLogged += 1;
      const o2 = ensureOwner(ob.actionOwner, 'Action Owner');
      if (o2 && ob.actionOwner !== ob.reportedByName) o2.observationsLogged += 1;
    }
    for (const p of fPtw) {
      const o = ensureOwner(p.applicantName, 'Permit Authority');
      if (o) o.permitsManaged += 1;
    }
    for (const a of fAudit) {
      const o = ensureOwner(a.leadAuditor, 'Lead Auditor');
      if (o) o.auditsLed += 1;
    }
    for (const t of fTrain) {
      const o = ensureOwner(t.trainerName, 'Safety Trainer');
      if (o) o.trainingsLed += 1;
    }
    for (const d of fDocs) {
      const o = ensureOwner(d.ownerName || 'Jonathan Thadanki', 'Document Owner');
      if (o) o.documentsOwned += 1;
    }
    for (const s of fSubs) {
      const o = ensureOwner(s.submittedByName, 'Module Contributor');
      if (o) o.submissionsCount += 1;
    }

    const ownerKpis = Array.from(ownerMap.values())
      .map((o) => {
        const capaClosurePct = o.assignedCapas > 0 ? Math.round((o.closedCapas / o.assignedCapas) * 100) : 100;
        const totalContributions =
          o.assignedCapas +
          o.observationsLogged +
          o.permitsManaged +
          o.auditsLed +
          o.trainingsLed +
          o.documentsOwned +
          o.submissionsCount;
        const reliabilityScore = Math.max(0, Math.min(100, capaClosurePct - o.overdueCapas * 10));
        return {
          ...o,
          capaClosurePct,
          totalContributions,
          reliabilityScore,
        };
      })
      .sort((a, b) => b.totalContributions - a.totalContributions);

    res.json({
      organization: org
        ? {
            id: org.id,
            name: org.name,
            industry: org.industry,
            ownerAttribution: 'Jonathan Thadanki',
          }
        : null,
      masterSummary: {
        compositeComplianceIndex,
        totalEmployees,
        totalContractors,
        totalManhours,
        trir,
        ltifr,
        ltiCount,
        recordableCount,
        totalIncidents: fInc.length,
        openIncidents: fInc.filter((i) => i.status !== 'Closed').length,
        totalCapas: fCapa.length,
        openCapas: openCapa,
        overdueCapas: overdueCapa,
        capaClosurePct,
        totalPermits: fPtw.length,
        activePermits,
        expiredPermits,
        ptwCompliancePct,
        totalLoto: fLoto.length,
        lotoCompliancePct,
        totalObservations: fObs.length,
        verifiedObservations: verifiedObs,
        obsClosurePct,
        totalRisks: fRisk.length,
        highRisks,
        riskControlPct,
        totalAudits: fAudit.length,
        avgAuditScore,
        totalEquipment: fEquip.length,
        equipCompliancePct,
        totalTrainings: fTrain.length,
        trainingCompliancePct,
        totalEmergency: fEmergency.length,
        avgDrillResponseSec,
        totalEnvironment: fEnv.length,
        envCompliancePct,
        totalLegal: fLegal.length,
        legalCompliancePct,
        totalDocuments: fDocs.length,
        normalDocuments: normalDocs.length,
        childDocuments: childDocs.length,
        docCompliancePct,
        isoTaggedDocs,
        factoryTaggedDocs,
        oshaTaggedDocs,
        coveredSectionsCount,
        totalPpeItems: fPpe.length,
        lowStockPpe,
        ppeReadinessPct,
        gateOnSite: fGate.filter((g) => g.status === 'Checked In').length,
        customModulesCount: customModules.length,
        customSubmissionsCount: fSubs.length,
        pendingApprovals: fApprovals.filter((a) => a.status === 'Pending').length,
      },
      industryKpis,
      plantKpis,
      moduleKpis,
      departmentKpis,
      ownerKpis,
    });
  } catch (error) {
    console.error('Master KPI computation error:', error);
    res.status(500).json({ error: 'Failed to compute master & individual KPIs' });
  }
});

export default router;
