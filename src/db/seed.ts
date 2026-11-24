import { and, eq, isNull } from 'drizzle-orm';
import { db } from './index.ts';
import {
  aiKnowledgeBase,
  approvalSteps,
  approvalWorkflows,
  areas,
  businessUnits,
  capas,
  checklistItems,
  contractors,
  contractorWorkers,
  departments,
  documents,
  emergencyRecords,
  environmentRecords,
  equipmentAssets,
  formFields,
  formSubmissions,
  gateEntries,
  incidents,
  industryTemplates,
  kpiCategories,
  legalCompliances,
  locations,
  lotoRecords,
  moduleChecklists,
  moduleForms,
  modulePermissions,
  modules,
  notifications,
  permissions,
  plants,
  ppeInventory,
  riskAssessments,
  roles,
  safetyAudits,
  safetyCommittees,
  safetyObservations,
  trainingRecords,
  userRoles,
  weeklySafetyActivities,
  workforceRecords,
  workPermits,
} from './schema.ts';

export const STANDARD_PERMISSIONS = [
  { action: 'view', description: 'View records and dashboards' },
  { action: 'create', description: 'Create new records and requests' },
  { action: 'edit', description: 'Edit draft or authorized records' },
  { action: 'submit', description: 'Submit records into workflow' },
  { action: 'approve', description: 'Approve workflow stages (role-scoped)' },
  { action: 'reject', description: 'Reject or return records with mandatory reason' },
  { action: 'verify', description: 'Verify corrective actions, safety checks & evidence' },
  { action: 'assign', description: 'Assign actions, inspections & tasks' },
  { action: 'close', description: 'Close verified permits, incidents & actions' },
  { action: 'extend', description: 'Extend active work permits (Safety authorized)' },
  { action: 'suspend', description: 'Suspend active permits or unsafe operations' },
  { action: 'revalidate', description: 'Revalidate suspended or shift-change permits' },
  { action: 'export', description: 'Export structured PDF/Excel/CSV reports' },
  { action: 'delete', description: 'Soft-delete or archive records (restricted)' },
  { action: 'configure', description: 'Configure modules, forms, workflows & rules' },
];

export const STANDARD_ROLES = [
  { name: 'Super Admin', slug: 'super-admin', level: 100, description: 'Sole Platform Owner (Jonathan Thadanki) — Full platform, security & RBAC governance' },
  { name: 'Company Admin', slug: 'company-admin', level: 92, description: 'Tenant company administrator managing plants, departments, users & company configuration' },
  { name: 'Corporate EHS Head', slug: 'corporate-ehs-head', level: 89, description: 'Multi-site corporate EHS director overseeing enterprise KPIs, governance & compliance' },
  { name: 'System Admin', slug: 'system-admin', level: 88, description: 'Technical workspace configuration; cannot become Super Admin or issue final safety approval' },
  { name: 'Plant EHS Manager', slug: 'ehs-manager', level: 80, description: 'Plant EHS/HSE/Safety Manager overseeing site KPIs, investigations, audits & Final Safety Permit Approval' },
  { name: 'Safety Officer', slug: 'safety-officer', level: 70, description: 'Inspections, observations, incidents, risks, TBT, training & verification (no final PTW approval unless assigned)' },
  { name: 'Department Head', slug: 'department-head', level: 65, description: 'Department scope & Departmental Permit Approval stage only (cannot bypass Safety or delete permits)' },
  { name: 'Auditor', slug: 'auditor', level: 60, description: 'Strict read-only access across authorized EHS records, permits, audits & compliance logs' },
  { name: 'Supervisor', slug: 'supervisor', level: 45, description: 'Daily inspections, toolbox talks, observations, permit requests & assigned actions' },
  { name: 'Contractor', slug: 'contractor', level: 30, description: 'Contractor workforce, documents & permit requests (no approval authority)' },
  { name: 'Employee', slug: 'employee', level: 20, description: 'Least-privilege user: own profile, training, report hazards/near misses & submit permit requests' },
];

export const SIX_KPI_CATEGORIES = [
  { code: 'WORKFORCE', name: 'Workforce', description: 'Manhours, strength, induction, training, medical & contractor workforce metrics', displayOrder: 1 },
  { code: 'LAGGING', name: 'Lagging Indicators', description: 'Fatalities, LTI, LTIFR, TRI, TRIR, severity, incidents, RCA & CAPA outcomes', displayOrder: 2 },
  { code: 'LEADING', name: 'Leading Indicators', description: 'Proactive trainings, TBT, inspections, audits, BBS, HIRA, drills & closure rates', displayOrder: 3 },
  { code: 'ACTIONS', name: 'Actions', description: 'Cross-module CAPA, open/overdue/verified/closed actions & SLA governance', displayOrder: 4 },
  { code: 'PERMITS', name: 'Permits', description: '23 permit types, 3-stage approval pipeline, active/suspended/expired/closed PTW metrics', displayOrder: 5 },
  { code: 'COMPLIANCE', name: 'Compliance', description: 'Jurisdiction-configurable Legal, ISO, International Standards & ESG sustainability compliance', displayOrder: 6 },
];

export const DOCUMENT_23_SECTIONS = [
  { num: 1, name: 'Policies' },
  { num: 2, name: 'OHS Manual' },
  { num: 3, name: 'SOPs' },
  { num: 4, name: 'Factory Safety Rules' },
  { num: 5, name: 'HSE Promotions' },
  { num: 6, name: 'Emergency Response' },
  { num: 7, name: 'Welfare' },
  { num: 8, name: 'Safety Committee' },
  { num: 9, name: 'Worker Screening' },
  { num: 10, name: 'Inspector Inspection' },
  { num: 11, name: 'Equipment Checklists' },
  { num: 12, name: 'Risk Management / SWMS' },
  { num: 13, name: 'Permit System' },
  { num: 14, name: 'Store' },
  { num: 15, name: 'Trainings' },
  { num: 16, name: 'Induction' },
  { num: 17, name: 'Risk Assessment' },
  { num: 18, name: 'Statutory Registers' },
  { num: 19, name: 'Safety Audits' },
  { num: 20, name: 'Test Certifications' },
  { num: 21, name: 'Gate Management' },
  { num: 22, name: 'Training PPTs' },
  { num: 23, name: 'Legal Requirements' },
];

export const INDUSTRY_TEMPLATE_SEEDS = [
  {
    industryName: 'Manufacturing',
    description: 'Discrete & process manufacturing safety suite with Machine Guarding, LOTO, PTW, and OSH Code compliance.',
    hazards: ['Machine Entanglement', 'Forklift Traffic', 'Electrical Arc Flash', 'Noise Exposure', 'Manual Handling'],
    permitTypes: ['Hot Work Permit', 'Cold Work Permit', 'Electrical Work Permit', 'LOTO Permit', 'Lifting Permit'],
    legalCategories: ['OSH Code 2020', 'Factories Act 1948 / State Rules', 'Electricity Rules', 'Hazardous Waste Rules'],
  },
  {
    industryName: 'Chemical',
    description: 'Process Safety Management (PSM), HAZOP, Line Breaking, Chemical Handling & Spill Containment.',
    hazards: ['Toxic Gas Release', 'Exothermic Runaway', 'Corrosive Chemical Splash', 'Flammable Vapor Ignition', 'Confined Space'],
    permitTypes: ['Confined Space Entry', 'Line Breaking Permit', 'Chemical Handling Permit', 'Hot Work Permit', 'Pressure System Work'],
    legalCategories: ['Manufacture, Storage and Import of Hazardous Chemical Rules', 'Environment Protection Act', 'OSH Code 2020'],
  },
  {
    industryName: 'Oil & Gas',
    description: 'High-hazard hydrocarbon operations, H2S gas testing, SIMOPS, Radiography & Critical Lifting.',
    hazards: ['Hydrocarbon Leak & Fire', 'H2S Toxicity', 'Dropped Objects', 'High Pressure Jetting', 'SIMOPS Conflicts'],
    permitTypes: ['Hot Work Permit', 'Confined Space Entry', 'Radiography Permit', 'Critical Lifting Permit', 'Fire System Isolation'],
    legalCategories: ['OISD Standards', 'Petroleum Rules', 'Environment Protection Act'],
  },
  {
    industryName: 'Pharma',
    description: 'Cleanroom safety, solvent handling, biohazard containment, HVAC & laboratory ergonomics.',
    hazards: ['Solvent Vapor Inhalation', 'API Dust Exposure', 'Cryogenic Burns', 'Autoclave Pressure'],
    permitTypes: ['Cold Work Permit', 'Chemical Handling Permit', 'Confined Space Entry', 'Electrical Work Permit'],
    legalCategories: ['OSH Code 2020', 'Bio-Medical Waste Rules', 'Hazardous Waste Rules'],
  },
  {
    industryName: 'Construction',
    description: 'Working at height, scaffolding, excavation, crane lifting & contractor workforce mobilization.',
    hazards: ['Fall from Height', 'Trench Collapse', 'Crane Overturning', 'Overhead Power Lines', 'Struck-By Hazard'],
    permitTypes: ['Work at Height', 'Excavation Permit', 'Lifting Permit', 'Critical Lifting Permit', 'Hot Work Permit'],
    legalCategories: ['BOCW Act / OSH Code 2020', 'IS 3696 Scaffolding', 'CEA Electrical Safety'],
  },
  {
    industryName: 'Data Centers',
    description: 'High-voltage UPS/battery rooms, DG sets, FM-200 fire suppression isolation & hot-aisle ergonomics.',
    hazards: ['HV Arc Flash', 'Battery Acid / Thermal Runaway', 'Gas Suppression Discharge', 'Elevated Floor Lifting'],
    permitTypes: ['Electrical Work Permit', 'LOTO Permit', 'Fire System Isolation', 'Cold Work Permit'],
    legalCategories: ['CEA Electrical Regulations', 'NBC 2016 Fire & Life Safety', 'E-Waste Management Rules'],
  },
  {
    industryName: 'Semiconductor',
    description: 'Ultrapure gases, HF acid safety, cleanroom life safety systems & precision tool LOTO.',
    hazards: ['Pyrophoric / Toxic Gases', 'HF Chemical Exposure', 'Laser / RF Radiation', 'Robotic Tool Pinch'],
    permitTypes: ['Chemical Handling Permit', 'Line Breaking Permit', 'LOTO Permit', 'Radiography Permit'],
    legalCategories: ['Hazardous Chemical Rules', 'OSH Code 2020', 'Air & Water Pollution Acts'],
  },
  {
    industryName: 'FMCG',
    description: 'High-speed packaging lines, boiler safety, ammonia refrigeration & warehouse material handling.',
    hazards: ['Conveyor Pinch Points', 'Ammonia Leak', 'Steam / Boiler Burns', 'Pallet Racking Collapse'],
    permitTypes: ['LOTO Permit', 'Hot Work Permit', 'Work at Height', 'Confined Space Entry'],
    legalCategories: ['Indian Boilers Act', 'OSH Code 2020', 'FSSAI Hygiene & Safety'],
  },
  {
    industryName: 'Warehousing',
    description: 'MHE/Forklift pedestrian segregation, high-bay racking integrity, dock levelers & fire load control.',
    hazards: ['Forklift-Pedestrian Collision', 'Falling Pallets', 'Loading Dock Fall', 'Battery Charging Fire'],
    permitTypes: ['Work at Height', 'Cold Work Permit', 'Electrical Work Permit', 'General Work Permit'],
    legalCategories: ['NBC 2016 Fire Safety', 'OSH Code 2020', 'Motor Vehicles Act'],
  },
  {
    industryName: 'Logistics',
    description: 'Fleet defensive driving, hazmat transport, loading/unloading securing & yard traffic control.',
    hazards: ['Vehicle Rollover', 'Unsecured Cargo Shift', 'Fatigue Driving', 'Yard Blind Spots'],
    permitTypes: ['General Work Permit', 'Lifting Permit', 'Chemical Handling Permit'],
    legalCategories: ['Central Motor Vehicles Rules', 'Hazardous Goods Transport Rules'],
  },
  {
    industryName: 'Electrical',
    description: 'Substation switching, HV/LV isolation, earthing verification & live-line clearance.',
    hazards: ['Electrocution', 'Arc Blast', 'Induced Voltage', 'Pole / Tower Fall'],
    permitTypes: ['Electrical Work Permit', 'LOTO Permit', 'Work at Height'],
    legalCategories: ['CEA Measures Relating to Safety and Electric Supply', 'IS 5216'],
  },
  {
    industryName: 'IT Infrastructure',
    description: 'Tower erection, fiber trenching, server rack installation & electrical UPS maintenance.',
    hazards: ['Tower Fall Hazard', 'Underground Cable Strike', 'Rack Tip-Over', 'RF Exposure'],
    permitTypes: ['Work at Height', 'Excavation Permit', 'Electrical Work Permit'],
    legalCategories: ['OSH Code 2020', 'CEA Regulations'],
  },
  {
    industryName: 'Corporate Offices',
    description: 'Ergonomics, fire evacuation drills, indoor air quality, electrical safety & visitor security.',
    hazards: ['Ergonomic Strain', 'Slip/Trip on Floors', 'Fire Exit Obstruction', 'Electrical Overload'],
    permitTypes: ['General Work Permit', 'Cold Work Permit', 'Work at Height'],
    legalCategories: ['NBC 2016 Part IV Fire Safety', 'Shops & Establishments Acts'],
  },
  {
    industryName: 'Healthcare',
    description: 'Biomedical waste, radiation imaging safety, medical gas manifolds & infection control.',
    hazards: ['Needlestick / Biohazard', 'X-Ray / MRI Radiation', 'Oxygen Enrichment Fire', 'Hazardous Drugs'],
    permitTypes: ['Radiography Permit', 'Fire System Isolation', 'Chemical Handling Permit', 'Cold Work Permit'],
    legalCategories: ['Bio-Medical Waste Management Rules', 'AERB Radiation Rules', 'NBC 2016'],
  },
];

export async function ensureGlobalSeeds() {
  for (const perm of STANDARD_PERMISSIONS) {
    await db
      .insert(permissions)
      .values(perm)
      .onConflictDoNothing({ target: permissions.action });
  }

  const existingTemplates = await db.select().from(industryTemplates).limit(1);
  if (existingTemplates.length === 0) {
    for (const tpl of INDUSTRY_TEMPLATE_SEEDS) {
      await db.insert(industryTemplates).values({
        industryName: tpl.industryName,
        description: tpl.description,
        hazards: tpl.hazards,
        permitTypes: tpl.permitTypes,
        legalCategories: tpl.legalCategories,
        modules: [
          { name: `${tpl.industryName} Compliance Register`, code: `IND-${tpl.industryName.slice(0, 3).toUpperCase()}-REG` },
          { name: `${tpl.industryName} Critical Controls`, code: `IND-${tpl.industryName.slice(0, 3).toUpperCase()}-CTL` },
        ],
        checklists: [
          { title: `${tpl.industryName} Monthly Walkdown`, standardCode: 'ISO 45001' },
        ],
        isCustom: false,
      });
    }
  }
}

export async function ensureComplete24StarterModules(organizationId: string, userId?: string) {
  const existingMods = await db
    .select({ id: modules.id, moduleCode: modules.moduleCode })
    .from(modules)
    .where(and(eq(modules.organizationId, organizationId), isNull(modules.deletedAt)));

  const existingCodes = new Set(existingMods.map((m) => m.moduleCode));
  const safetyParent = existingMods.find((m) => m.moduleCode === 'MOD-SAFETY');
  const riskMod = existingMods.find((m) => m.moduleCode === 'MOD-RISK');
  const docMod = existingMods.find((m) => m.moduleCode === 'MOD-DOC');
  const audMod = existingMods.find((m) => m.moduleCode === 'MOD-AUD');
  const legMod = existingMods.find((m) => m.moduleCode === 'MOD-LEG');
  const envMod = existingMods.find((m) => m.moduleCode === 'MOD-ENV');

  const requiredAdditions: Array<{
    code: string;
    name: string;
    slug: string;
    description: string;
    builtInKey: string;
    parentId: string | null;
    icon: string;
    colour: string;
    order: number;
  }> = [
    {
      code: 'MOD-WORKFORCE',
      name: 'Workforce Management',
      slug: 'workforce-management',
      description: 'Employee & contractor headcount, manhours, induction, medical fitness & shift safety',
      builtInKey: 'contractors',
      parentId: null,
      icon: 'Users',
      colour: '#0284C7',
      order: 4,
    },
    {
      code: 'MOD-LEADING',
      name: 'Leading Indicators',
      slug: 'leading-indicators',
      description: 'Proactive safety walks, trainings, TBT, inspections, hazard closures & BBS metrics',
      builtInKey: 'kpi-executive',
      parentId: safetyParent?.id ?? null,
      icon: 'TrendingUp',
      colour: '#15803D',
      order: 7,
    },
    {
      code: 'MOD-LAGGING',
      name: 'Lagging Indicators',
      slug: 'lagging-indicators',
      description: 'LTI, LTIFR, TRIR, severity rates, recordable injuries & incident trend analytics',
      builtInKey: 'kpi-executive',
      parentId: safetyParent?.id ?? null,
      icon: 'Activity',
      colour: '#DC2626',
      order: 8,
    },
    {
      code: 'MOD-JSA',
      name: 'JSA / JHA',
      slug: 'jsa-jha',
      description: 'Job Safety Analysis & Job Hazard Analysis step-by-step task hazard controls',
      builtInKey: 'risk-assessment',
      parentId: riskMod?.id ?? safetyParent?.id ?? null,
      icon: 'ClipboardList',
      colour: '#D97706',
      order: 1,
    },
    {
      code: 'MOD-SOP',
      name: 'SOP Management',
      slug: 'sop-management',
      description: 'Controlled Standard Operating Procedures, revisions, acknowledgements & periodic reviews',
      builtInKey: 'documents',
      parentId: docMod?.id ?? null,
      icon: 'FileText',
      colour: '#0F172A',
      order: 1,
    },
    {
      code: 'MOD-INSP',
      name: 'Safety Inspections',
      slug: 'safety-inspections',
      description: 'Scheduled workplace walkdowns, checklists, photo evidence & corrective action tracking',
      builtInKey: 'audits',
      parentId: audMod?.id ?? safetyParent?.id ?? null,
      icon: 'SearchCheck',
      colour: '#15803D',
      order: 1,
    },
    {
      code: 'MOD-ISO',
      name: 'ISO Management Systems',
      slug: 'iso-management-systems',
      description: 'ISO 45001, ISO 14001, ISO 50001 & ISO 9001 clause compliance, internal audits & management reviews',
      builtInKey: 'legal',
      parentId: legMod?.id ?? null,
      icon: 'Award',
      colour: '#0284C7',
      order: 1,
    },
    {
      code: 'MOD-ESG',
      name: 'ESG & Sustainability',
      slug: 'esg-sustainability',
      description: 'Scope 1/2/3 GHG emissions, energy, water, waste circularity, GRI, BRSR & CSRD reporting',
      builtInKey: 'environment',
      parentId: envMod?.id ?? null,
      icon: 'Globe',
      colour: '#15803D',
      order: 1,
    },
  ];

  const toInsert = requiredAdditions.filter((m) => !existingCodes.has(m.code));
  if (toInsert.length > 0) {
    await db.insert(modules).values(
      toInsert.map((m) => ({
        organizationId,
        parentId: m.parentId,
        moduleCode: m.code,
        moduleName: m.name,
        slug: m.slug,
        description: m.description,
        moduleType: 'workspace',
        builtInKey: m.builtInKey,
        icon: m.icon,
        colour: m.colour,
        displayOrder: m.order,
        isSystem: true,
        isActive: true,
        isVisible: true,
        isPublished: true,
        configuration: {
          enableForms: true,
          enableChecklists: true,
          enableWorkflow: true,
          enableReports: true,
          enableNotifications: true,
        },
        createdBy: userId ?? null,
      }))
    );
  }
}

export async function ensureMasterKpiModules(organizationId: string, userId?: string) {
  await ensureComplete24StarterModules(organizationId, userId);

  const existing = await db
    .select()
    .from(modules)
    .where(
      and(
        eq(modules.organizationId, organizationId),
        eq(modules.moduleCode, 'MOD-MASTER-KPI'),
        isNull(modules.deletedAt)
      )
    )
    .limit(1);

  if (existing.length > 0) return existing[0];

  const [masterParent] = await db
    .insert(modules)
    .values({
      organizationId,
      parentId: null,
      moduleCode: 'MOD-MASTER-KPI',
      moduleName: 'Master KPI Dashboard',
      slug: 'master-kpi-dashboard',
      description: 'Separate parent KPI hub with executive, industry, plant, module & individual KPI scorecards',
      moduleType: 'category',
      builtInKey: 'master-kpi',
      icon: 'BarChart3',
      colour: '#0F172A',
      displayOrder: 2,
      isSystem: true,
      isActive: true,
      isVisible: true,
      isPublished: true,
      configuration: {
        enableForms: false,
        enableChecklists: false,
        enableWorkflow: false,
        enableReports: true,
        enableNotifications: true,
      },
      createdBy: userId ?? null,
    })
    .returning();

  const childDefs = [
    {
      code: 'MOD-KPI-EXEC',
      name: 'Executive Master KPI Overview',
      slug: 'kpi-executive',
      description: 'Enterprise-wide composite compliance index, TRIR, LTIFR, PTW, CAPA, Documents & Legal KPIs',
      builtInKey: 'kpi-executive',
      icon: 'LayoutDashboard',
      colour: '#0F172A',
      order: 1,
    },
    {
      code: 'MOD-KPI-IND',
      name: 'Industry-Wise KPI Dashboards',
      slug: 'kpi-industry',
      description: 'Individual KPI scorecards across Manufacturing, Chemical, Oil & Gas, Pharma, Construction & all 14+ sectors',
      builtInKey: 'kpi-industry',
      icon: 'Factory',
      colour: '#15803D',
      order: 2,
    },
    {
      code: 'MOD-KPI-PLANT',
      name: 'Individual Plant / Site KPIs',
      slug: 'kpi-plant',
      description: 'Facility-by-facility live KPI scorecard for every plant and business unit',
      builtInKey: 'kpi-plant',
      icon: 'Building2',
      colour: '#0284C7',
      order: 3,
    },
    {
      code: 'MOD-KPI-MOD',
      name: 'Individual Module KPIs',
      slug: 'kpi-module',
      description: 'Per-module KPI performance across all 18 EHS modules and every custom dynamic module',
      builtInKey: 'kpi-module',
      icon: 'Boxes',
      colour: '#D97706',
      order: 4,
    },
    {
      code: 'MOD-KPI-USER',
      name: 'Department & Owner KPIs',
      slug: 'kpi-individual',
      description: 'Individual department and responsible owner accountability KPIs & closure rates',
      builtInKey: 'kpi-individual',
      icon: 'Users',
      colour: '#15803D',
      order: 5,
    },
  ];

  await db.insert(modules).values(
    childDefs.map((c) => ({
      organizationId,
      parentId: masterParent.id,
      moduleCode: c.code,
      moduleName: c.name,
      slug: c.slug,
      description: c.description,
      moduleType: 'system',
      builtInKey: c.builtInKey,
      icon: c.icon,
      colour: c.colour,
      displayOrder: c.order,
      isSystem: true,
      isActive: true,
      isVisible: true,
      isPublished: true,
      configuration: {
        enableForms: false,
        enableChecklists: false,
        enableWorkflow: false,
        enableReports: true,
        enableNotifications: true,
      },
      createdBy: userId ?? null,
    }))
  );

  return masterParent;
}

export async function ensureCanonicalRolesAndKpis(organizationId: string) {
  const existingRoles = await db
    .select()
    .from(roles)
    .where(eq(roles.organizationId, organizationId));

  const existingSlugs = new Set(existingRoles.map((r) => r.slug));
  const missingRoles = STANDARD_ROLES.filter((r) => !existingSlugs.has(r.slug));
  if (missingRoles.length > 0) {
    await db.insert(roles).values(
      missingRoles.map((r) => ({
        organizationId,
        name: r.name,
        slug: r.slug,
        description: r.description,
        level: r.level,
        isSystem: true,
      }))
    );
  }

  const existingCats = await db
    .select()
    .from(kpiCategories)
    .where(eq(kpiCategories.organizationId, organizationId));
  if (existingCats.length === 0) {
    await db.insert(kpiCategories).values(
      SIX_KPI_CATEGORIES.map((c) => ({
        organizationId,
        code: c.code,
        name: c.name,
        description: c.description,
        displayOrder: c.displayOrder,
        isActive: true,
      }))
    );
  }
}

export async function seedOrganizationData(
  organizationId: string,
  creatorUserId: string,
  options: { withSampleData: boolean; assignSuperAdmin?: boolean }
) {
  await ensureGlobalSeeds();

  // 1. Seed 9 canonical enterprise roles if none exist for org
  const existingRoles = await db
    .select()
    .from(roles)
    .where(eq(roles.organizationId, organizationId));

  let superAdminRoleId = existingRoles.find((r) => r.slug === 'super-admin')?.id;
  let employeeRoleId = existingRoles.find((r) => r.slug === 'employee')?.id;
  let safetyOfficerRoleId = existingRoles.find((r) => r.slug === 'safety-officer')?.id;
  let hodRoleId = existingRoles.find((r) => r.slug === 'department-head')?.id;
  let plantHeadRoleId = existingRoles.find((r) => r.slug === 'ehs-manager')?.id;

  if (existingRoles.length === 0) {
    const insertedRoles = await db
      .insert(roles)
      .values(
        STANDARD_ROLES.map((r) => ({
          organizationId,
          name: r.name,
          slug: r.slug,
          description: r.description,
          level: r.level,
          isSystem: true,
        }))
      )
      .returning();

    superAdminRoleId = insertedRoles.find((r) => r.slug === 'super-admin')?.id;
    employeeRoleId = insertedRoles.find((r) => r.slug === 'employee')?.id;
    safetyOfficerRoleId = insertedRoles.find((r) => r.slug === 'safety-officer')?.id;
    hodRoleId = insertedRoles.find((r) => r.slug === 'department-head')?.id;
    plantHeadRoleId = insertedRoles.find((r) => r.slug === 'ehs-manager')?.id;
  }

  await ensureCanonicalRolesAndKpis(organizationId);

  // STRICT SOLE SUPER ADMIN: Only assign Super Admin if explicitly authorized (Platform Owner);
  // all other accounts default to least-privilege Employee / Worker!
  const targetRoleId = options.assignSuperAdmin ? superAdminRoleId : (employeeRoleId || superAdminRoleId);
  if (targetRoleId && creatorUserId) {
    const existingAssignment = await db
      .select()
      .from(userRoles)
      .where(
        and(
          eq(userRoles.organizationId, organizationId),
          eq(userRoles.userId, creatorUserId)
        )
      );
    if (existingAssignment.length === 0) {
      await db.insert(userRoles).values({
        organizationId,
        userId: creatorUserId,
        roleId: targetRoleId,
        assignedBy: creatorUserId,
      });
    }
  }

  // 2. Seed Dynamic Parent-Child-Subchild Module Hierarchy if empty
  const existingModules = await db
    .select()
    .from(modules)
    .where(eq(modules.organizationId, organizationId))
    .limit(1);

  let ptwModuleId: string | null = null;
  let auditModuleId: string | null = null;

  if (existingModules.length === 0) {
    const insertMod = async (data: {
      parentId?: string | null;
      code: string;
      name: string;
      slug: string;
      description: string;
      moduleType: string;
      builtInKey: string | null;
      icon: string;
      colour: string;
      order: number;
      isSystem?: boolean;
    }) => {
      const [row] = await db
        .insert(modules)
        .values({
          organizationId,
          parentId: data.parentId ?? null,
          moduleCode: data.code,
          moduleName: data.name,
          slug: data.slug,
          description: data.description,
          moduleType: data.moduleType,
          builtInKey: data.builtInKey,
          icon: data.icon,
          colour: data.colour,
          displayOrder: data.order,
          isSystem: data.isSystem ?? true,
          isActive: true,
          isVisible: true,
          isPublished: true,
          configuration: {
            enableForms: true,
            enableChecklists: true,
            enableWorkflow: true,
            enableReports: true,
            enableNotifications: true,
          },
          createdBy: creatorUserId,
        })
        .returning();
      return row;
    };

    await insertMod({
      code: 'MOD-DASH',
      name: 'Main EHS Dashboard',
      slug: 'dashboard',
      description: 'Live leading & lagging safety KPIs across all plants',
      moduleType: 'system',
      builtInKey: 'dashboard',
      icon: 'LayoutDashboard',
      colour: '#0F172A',
      order: 1,
    });

    await insertMod({
      code: 'MOD-AI',
      name: 'AI Safety Assistant',
      slug: 'ai-assistant',
      description: 'ARSHIEL AI copilot with image analysis & knowledge base',
      moduleType: 'system',
      builtInKey: 'ai-assistant',
      icon: 'Sparkles',
      colour: '#15803D',
      order: 2,
    });

    const safetyParent = await insertMod({
      code: 'MOD-SAFETY',
      name: 'Safety Management',
      slug: 'safety-management',
      description: 'Core operational EHS workflows & hazard control',
      moduleType: 'category',
      builtInKey: null,
      icon: 'ShieldCheck',
      colour: '#15803D',
      order: 3,
    });

    const incMod = await insertMod({
      parentId: safetyParent.id,
      code: 'MOD-INC',
      name: 'Incident Management',
      slug: 'incidents',
      description: 'Real-time reporting, investigation, 5-Why/Fishbone RCA & closure',
      moduleType: 'workspace',
      builtInKey: 'incidents',
      icon: 'AlertTriangle',
      colour: '#DC2626',
      order: 1,
    });

    await insertMod({
      parentId: incMod.id,
      code: 'MOD-INC-NM',
      name: 'Near Miss',
      slug: 'near-miss',
      description: 'Near miss hazard capture and preventive action',
      moduleType: 'workspace',
      builtInKey: 'incidents',
      icon: 'Eye',
      colour: '#D97706',
      order: 1,
    });
    await insertMod({
      parentId: incMod.id,
      code: 'MOD-INC-INJ',
      name: 'Injury Report',
      slug: 'injury-report',
      description: 'LTI, Restricted Work, Medical Treatment & First Aid cases',
      moduleType: 'workspace',
      builtInKey: 'incidents',
      icon: 'HeartPulse',
      colour: '#DC2626',
      order: 2,
    });
    await insertMod({
      parentId: incMod.id,
      code: 'MOD-INC-PD',
      name: 'Property Damage',
      slug: 'property-damage',
      description: 'Equipment, asset & structural damage reporting',
      moduleType: 'workspace',
      builtInKey: 'incidents',
      icon: 'Hammer',
      colour: '#D97706',
      order: 3,
    });
    await insertMod({
      parentId: incMod.id,
      code: 'MOD-RCA-CAPA',
      name: 'RCA & CAPA Register',
      slug: 'rca-capa',
      description: '5-Why, Fishbone & Corrective/Preventive Action tracking',
      moduleType: 'workspace',
      builtInKey: 'rca-capa',
      icon: 'GitBranch',
      colour: '#0284C7',
      order: 4,
    });

    const ptwMod = await insertMod({
      parentId: safetyParent.id,
      code: 'MOD-PTW',
      name: 'Permit to Work',
      slug: 'ptw',
      description: '20-Aspect Digital PTW, QR verification & multi-level approvals',
      moduleType: 'workspace',
      builtInKey: 'ptw',
      icon: 'FileCheck2',
      colour: '#0284C7',
      order: 2,
    });
    ptwModuleId = ptwMod.id;

    const ptwChildren = [
      ['MOD-PTW-HOT', 'Hot Work', 'ptw'],
      ['MOD-PTW-COLD', 'Cold Work', 'ptw'],
      ['MOD-PTW-WAH', 'Work at Height', 'ptw'],
      ['MOD-PTW-CS', 'Confined Space', 'ptw'],
      ['MOD-PTW-ELEC', 'Electrical Work', 'ptw'],
      ['MOD-PTW-EXC', 'Excavation', 'ptw'],
      ['MOD-PTW-LIFT', 'Lifting', 'ptw'],
    ];
    for (let i = 0; i < ptwChildren.length; i++) {
      await insertMod({
        parentId: ptwMod.id,
        code: ptwChildren[i][0],
        name: ptwChildren[i][1],
        slug: ptwChildren[i][0].toLowerCase(),
        description: `${ptwChildren[i][1]} digital permit workflow`,
        moduleType: 'workspace',
        builtInKey: ptwChildren[i][2],
        icon: 'ClipboardCheck',
        colour: '#0284C7',
        order: i + 1,
      });
    }
    await insertMod({
      parentId: ptwMod.id,
      code: 'MOD-LOTO',
      name: 'LOTO Management',
      slug: 'loto',
      description: 'Lockout / Tagout & Zero Energy Verification',
      moduleType: 'workspace',
      builtInKey: 'loto',
      icon: 'Lock',
      colour: '#DC2626',
      order: 8,
    });

    await insertMod({
      parentId: safetyParent.id,
      code: 'MOD-OBS',
      name: 'AI Safety Observations',
      slug: 'observations',
      description: 'AI visual observation, BBS coaching & before/after proof',
      moduleType: 'workspace',
      builtInKey: 'observations',
      icon: 'ScanEye',
      colour: '#15803D',
      order: 3,
    });

    await insertMod({
      parentId: safetyParent.id,
      code: 'MOD-RISK',
      name: 'Risk Assessment',
      slug: 'risk-assessment',
      description: 'HIRA, HAZOP, JSA, JHA, SWMS & configurable risk matrix',
      moduleType: 'workspace',
      builtInKey: 'risk-assessment',
      icon: 'Grid3x3',
      colour: '#D97706',
      order: 4,
    });

    const audMod = await insertMod({
      parentId: safetyParent.id,
      code: 'MOD-AUD',
      name: 'Safety Audits & Inspections',
      slug: 'audits',
      description: 'BIS, OSHA, NBC 2016, ISO 45001 checklists & CAPA',
      moduleType: 'workspace',
      builtInKey: 'audits',
      icon: 'CheckSquare',
      colour: '#15803D',
      order: 5,
    });
    auditModuleId = audMod.id;

    await insertMod({
      parentId: safetyParent.id,
      code: 'MOD-EQUIP',
      name: 'Equipment Inspection',
      slug: 'equipment',
      description: 'Asset register, cranes, pressure vessels & reminders',
      moduleType: 'workspace',
      builtInKey: 'equipment',
      icon: 'Wrench',
      colour: '#475569',
      order: 6,
    });

    const otherTopModules: [string, string, string, string, string, string, number][] = [
      ['MOD-CONT', 'Contractor & Workers', 'contractors', 'contractors', 'HardHat', '#0F172A', 4],
      ['MOD-TRN', 'Training & Competency', 'training', 'training', 'GraduationCap', '#0284C7', 5],
      ['MOD-EMG', 'Emergency & Fire Safety', 'emergency', 'emergency', 'Flame', '#DC2626', 6],
      ['MOD-ENV', 'Environment & ESG', 'environment', 'environment', 'Leaf', '#15803D', 7],
      ['MOD-LEG', 'Legal Compliance', 'legal', 'legal', 'Scale', '#475569', 8],
      ['MOD-DOC', 'Document Management', 'documents', 'documents', 'FolderKanban', '#0F172A', 9],
      ['MOD-WKL', 'Weekly Safety Tracking', 'weekly-tracking', 'weekly-tracking', 'CalendarCheck', '#15803D', 10],
      ['MOD-PPE', 'PPE & Safety Store', 'ppe-store', 'ppe-store', 'PackageCheck', '#D97706', 11],
      ['MOD-GATE', 'Gate & Visitor Control', 'gate', 'gate', 'QrCode', '#0284C7', 12],
      ['MOD-COM', 'Safety Committee & Welfare', 'committee', 'committee', 'Users', '#15803D', 13],
      ['MOD-RPT', 'Analytics & Reports', 'analytics', 'analytics', 'BarChart3', '#0F172A', 14],
      ['MOD-BLD', 'Dynamic Module Builder', 'module-builder', 'module-builder', 'Boxes', '#15803D', 15],
      ['MOD-SET', 'Admin & Settings', 'settings', 'settings', 'Settings', '#475569', 16],
    ];

    for (const [code, name, slug, builtInKey, icon, colour, order] of otherTopModules) {
      await insertMod({
        code,
        name,
        slug,
        description: `${name} enterprise workspace`,
        moduleType: 'system',
        builtInKey,
        icon,
        colour,
        order,
      });
    }

    // Seed default Fire Safety Audit Checklist
    if (auditModuleId) {
      const [fireChecklist] = await db
        .insert(moduleChecklists)
        .values({
          organizationId,
          moduleId: auditModuleId,
          title: 'Fire Safety & NBC 2016 Compliance Checklist',
          standardCode: 'NBC 2016 / BIS',
          category: 'Fire Safety Audit',
          description: 'Standard fire prevention, detection, hydrant & egress audit checklist',
          createdBy: creatorUserId,
        })
        .returning();

      await db.insert(checklistItems).values([
        {
          organizationId,
          checklistId: fireChecklist.id,
          section: 'Fire Suppression',
          questionText: 'Are all portable fire extinguishers unobstructed, pressurized in the green zone, and inspected within the last 30 days?',
          responseType: 'yes_no_na',
          riskWeight: 3,
          displayOrder: 1,
        },
        {
          organizationId,
          checklistId: fireChecklist.id,
          section: 'Egress & Exits',
          questionText: 'Are all emergency exits, escape routes, and assembly signage clearly illuminated and free of storage?',
          responseType: 'yes_no_na',
          riskWeight: 5,
          displayOrder: 2,
        },
        {
          organizationId,
          checklistId: fireChecklist.id,
          section: 'Hydrant & Sprinklers',
          questionText: 'Is the main fire hydrant jockey pump pressure maintained and weekly pump run-test logged?',
          responseType: 'yes_no_na',
          riskWeight: 4,
          displayOrder: 3,
        },
      ]);
    }

    // Seed default PTW 4-Level Approval Workflow & Custom Form
    if (ptwModuleId) {
      const [wf] = await db
        .insert(approvalWorkflows)
        .values({
          organizationId,
          moduleId: ptwModuleId,
          workflowName: 'Standard High-Risk PTW 4-Level Workflow',
          description: 'Supervisor -> Department Head -> Safety Officer -> Plant Head sequential sign-off',
          mode: 'sequential',
          createdBy: creatorUserId,
        })
        .returning();

      await db.insert(approvalSteps).values([
        {
          organizationId,
          workflowId: wf.id,
          stepOrder: 1,
          stepName: 'Department Head Review',
          approverRoleId: hodRoleId ?? null,
          approverRoleName: 'Department Head',
          slaHours: 4,
        },
        {
          organizationId,
          workflowId: wf.id,
          stepOrder: 2,
          stepName: 'Safety Officer Verification',
          approverRoleId: safetyOfficerRoleId ?? null,
          approverRoleName: 'Safety Officer',
          slaHours: 4,
        },
        {
          organizationId,
          workflowId: wf.id,
          stepOrder: 3,
          stepName: 'Plant Head Authorization',
          approverRoleId: plantHeadRoleId ?? null,
          approverRoleName: 'Plant Head',
          slaHours: 8,
        },
      ]);

      const [customForm] = await db
        .insert(moduleForms)
        .values({
          organizationId,
          moduleId: ptwModuleId,
          formName: 'Pre-Work Toolbox Talk & Gas Test Log',
          formCode: 'FRM-PTW-TBT',
          description: 'Configurable field checklist attached to digital permits',
          createdBy: creatorUserId,
        })
        .returning();

      await db.insert(formFields).values([
        {
          organizationId,
          formId: customForm.id,
          fieldKey: 'oxygen_percent',
          label: 'Oxygen Level (%)',
          fieldType: 'number',
          placeholder: '20.9',
          isRequired: true,
          defaultValue: '20.9',
          displayOrder: 1,
          sectionName: 'Atmospheric Gas Testing',
        },
        {
          organizationId,
          formId: customForm.id,
          fieldKey: 'lel_percent',
          label: 'Flammable Gas (% LEL)',
          fieldType: 'number',
          placeholder: '0',
          isRequired: true,
          defaultValue: '0',
          displayOrder: 2,
          sectionName: 'Atmospheric Gas Testing',
        },
        {
          organizationId,
          formId: customForm.id,
          fieldKey: 'tbt_conducted_by',
          label: 'Toolbox Talk Conducted By',
          fieldType: 'text',
          placeholder: 'Supervisor Name',
          isRequired: true,
          displayOrder: 3,
          sectionName: 'Pre-Work Briefing',
        },
      ]);
    }

    // Grant default least-privilege 15-permission matrix for all roles on PTW module
    if (ptwModuleId) {
      const orgRoleList = await db.select().from(roles).where(eq(roles.organizationId, organizationId));
      const allActions = STANDARD_PERMISSIONS.map((p) => p.action);
      for (const r of orgRoleList) {
        let acts: string[] = ['view', 'create', 'submit'];
        if (r.slug === 'super-admin') acts = allActions;
        else if (r.slug === 'system-admin') acts = ['view', 'export', 'configure'];
        else if (r.slug === 'ehs-manager' || r.slug === 'safety-manager')
          acts = ['view', 'create', 'edit', 'submit', 'approve', 'reject', 'verify', 'assign', 'close', 'extend', 'suspend', 'revalidate', 'export'];
        else if (r.slug === 'safety-officer') acts = ['view', 'create', 'edit', 'submit', 'verify', 'assign', 'export'];
        else if (r.slug === 'department-head' || r.slug === 'plant-head') acts = ['view', 'create', 'edit', 'submit', 'approve', 'reject', 'assign', 'export'];
        else if (r.slug === 'supervisor') acts = ['view', 'create', 'edit', 'submit', 'export'];
        else if (r.slug === 'auditor') acts = ['view', 'export'];
        await db.insert(modulePermissions).values({
          organizationId,
          moduleId: ptwModuleId,
          roleId: r.id,
          allowedActions: acts,
        });
      }
    }
  }

  // Ensure separate top-level Master KPI Dashboard parent line & child KPI dashboards exist
  await ensureMasterKpiModules(organizationId, creatorUserId);

  // 3. Seed Facilities (Business Unit, 2 Sample Plants, Departments, Areas, Locations)
  let plant1Id: string | undefined;
  let plant2Id: string | undefined;
  let deptHseId: string | undefined;
  let deptMaintId: string | undefined;

  const existingPlants = await db
    .select()
    .from(plants)
    .where(eq(plants.organizationId, organizationId));

  if (existingPlants.length === 0) {
    const [bu] = await db
      .insert(businessUnits)
      .values({
        organizationId,
        name: 'Industrial Operations Division',
        code: 'BU-IND-01',
        headName: 'Jonathan Thadanki',
      })
      .returning();

    const [p1, p2] = await db
      .insert(plants)
      .values([
        {
          organizationId,
          businessUnitId: bu.id,
          name: 'Chennai Precision Manufacturing Plant (SAMPLE)',
          code: 'PLT-CHN-01',
          location: 'Sriperumbudur, Chennai',
          state: 'Tamil Nadu',
          address: 'Plot A-14, SIPCOT Industrial Park, Chennai 602105',
          headName: 'Rajeshwar Rao',
          totalEmployees: 340,
          totalContractors: 85,
          monthlyManhours: 76500,
        },
        {
          organizationId,
          businessUnitId: bu.id,
          name: 'Pune Process & Chemical Hub (SAMPLE)',
          code: 'PLT-PUN-02',
          location: 'Chakan MIDC, Pune',
          state: 'Maharashtra',
          address: 'Sector 7, Chakan Industrial Area Phase II, Pune 410501',
          headName: 'Ananya Deshmukh',
          totalEmployees: 210,
          totalContractors: 64,
          monthlyManhours: 49320,
        },
      ])
      .returning();

    plant1Id = p1.id;
    plant2Id = p2.id;

    const [d1, d2, d3] = await db
      .insert(departments)
      .values([
        { organizationId, plantId: p1.id, name: 'HSE & Fire Safety', code: 'DEPT-HSE', hodName: 'Vikram Menon' },
        { organizationId, plantId: p1.id, name: 'Maintenance & Utilities', code: 'DEPT-MNT', hodName: 'Suresh Iyer' },
        { organizationId, plantId: p2.id, name: 'Process Production', code: 'DEPT-PRD', hodName: 'Meera Kulkarni' },
      ])
      .returning();

    deptHseId = d1.id;
    deptMaintId = d2.id;

    const [a1] = await db
      .insert(areas)
      .values([
        { organizationId, plantId: p1.id, departmentId: d2.id, name: 'Boiler & Utility Bay', code: 'AREA-BLR', riskLevel: 'High' },
        { organizationId, plantId: p1.id, departmentId: d1.id, name: 'Loading Bay & Dispatch', code: 'AREA-LDG', riskLevel: 'Medium' },
        { organizationId, plantId: p2.id, departmentId: d3.id, name: 'Solvent Reactor Block B', code: 'AREA-RXB', riskLevel: 'Critical' },
      ])
      .returning();

    await db.insert(locations).values([
      { organizationId, plantId: p1.id, departmentId: d2.id, areaId: a1.id, name: 'Steam Header Line 02', code: 'LOC-STM-02' },
      { organizationId, plantId: p1.id, departmentId: d1.id, areaId: a1.id, name: 'Dock Gate 3 Ramp', code: 'LOC-DCK-03' },
    ]);
  } else {
    plant1Id = existingPlants[0].id;
    plant2Id = existingPlants[1]?.id ?? existingPlants[0].id;
  }

  // 4. Seed Sample EHS Records if requested and none exist yet
  if (!options.withSampleData) return;

  const existingInc = await db
    .select()
    .from(incidents)
    .where(eq(incidents.organizationId, organizationId))
    .limit(1);
  if (existingInc.length > 0) return;

  const today = new Date().toISOString().slice(0, 10);
  const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  // Sample Incidents
  await db.insert(incidents).values([
    {
      organizationId,
      plantId: plant1Id,
      departmentId: deptMaintId,
      plantName: 'Chennai Precision Manufacturing Plant (SAMPLE)',
      departmentName: 'Maintenance & Utilities',
      incidentNumber: 'INC-2026-0001',
      incidentType: 'Near Miss',
      severity: 'Medium',
      title: '[SAMPLE DATA] Hydraulic Hose Weep Near Loading Bay Ramp',
      description: 'Operator noticed oil mist from high-pressure hose on Forklift FL-04 near Dock 3 before shift handover.',
      incidentDate: today,
      incidentTime: '09:15',
      specificLocation: 'Loading Bay Dock 3',
      personType: 'Employee',
      immediateActions: 'Forklift tagged out of service, absorbent pads deployed, area cordoned off.',
      investigationTeam: ['Vikram Menon (Safety Lead)', 'Suresh Iyer (Maintenance HOD)'],
      rcaMethod: '5 Why',
      rcaData: {
        whys: [
          'Hydraulic hose developed pinhole leak at crimp fitting',
          'Hose rubbed against chassis bracket during mast tilt',
          'Protective abrasion sleeve was missing after last service',
          'Pre-use checklist did not inspect hose routing clearance',
        ],
      },
      directCauses: 'Hose abrasion against sharp chassis edge',
      rootCauses: 'Missing abrasion sleeve specification in PM checklist',
      contributingFactors: 'High duty cycle during peak dispatch',
      status: 'RCA Complete',
      daysLost: 0,
      isRecordable: false,
      isDemo: true,
      reportedByName: 'Arjun Nair',
    },
    {
      organizationId,
      plantId: plant2Id,
      plantName: 'Pune Process & Chemical Hub (SAMPLE)',
      departmentName: 'Process Production',
      incidentNumber: 'INC-2026-0002',
      incidentType: 'First Aid Case',
      severity: 'Low',
      title: '[SAMPLE DATA] Minor Abrasion During Drum Bung Tightening',
      description: 'Contractor technician sustained minor knuckle abrasion while tightening bung wrench; First Aid administered.',
      incidentDate: today,
      incidentTime: '14:30',
      specificLocation: 'Solvent Reactor Block B',
      personType: 'Contractor',
      immediateActions: 'First aid dressing applied; tool inspected and replaced with calibrated torque wrench.',
      status: 'Closed',
      daysLost: 0,
      isRecordable: false,
      isDemo: true,
      reportedByName: 'Meera Kulkarni',
      closedAt: new Date(),
    },
  ]);

  // Sample CAPAs
  await db.insert(capas).values([
    {
      organizationId,
      plantId: plant1Id,
      actionNumber: 'CAPA-2026-0001',
      sourceType: 'incident',
      sourceNumber: 'INC-2026-0001',
      title: '[SAMPLE DATA] Install Spiral Abrasion Sleeves & Update Forklift PM Checklist',
      description: 'Retrofit all 6 plant forklifts with spiral hose guards and add hose clearance check to daily operator log.',
      actionType: 'Preventive',
      priority: 'High',
      responsiblePerson: 'Suresh Iyer',
      targetDate: nextMonth,
      status: 'In Progress',
      isDemo: true,
    },
    {
      organizationId,
      plantId: plant2Id,
      actionNumber: 'CAPA-2026-0002',
      sourceType: 'audit',
      sourceNumber: 'AUD-2026-0001',
      title: '[SAMPLE DATA] Relocate Pallets Blocking North Emergency Exit #2',
      description: 'Clear staging pallets, repaint floor hatch-lines, and install optical obstruction signage.',
      actionType: 'Corrective',
      priority: 'Critical',
      responsiblePerson: 'Meera Kulkarni',
      targetDate: today,
      status: 'Overdue',
      isDemo: true,
    },
  ]);

  // Sample Work Permits (covering all 20 PTW aspects + Toolbox Talk + Golden Rules)
  const [samplePermit] = await db
    .insert(workPermits)
    .values([
      {
        organizationId,
        plantId: plant1Id,
        departmentId: deptMaintId,
        plantName: 'Chennai Precision Manufacturing Plant (SAMPLE)',
        departmentName: 'Maintenance & Utilities',
        permitNumber: 'PTW-CHN-2026-0001',
        permitType: 'Hot Work Permit',
        isHighRisk: true,
        contractorName: 'Apex Mechanical Services Pvt Ltd',
        applicantName: 'Ramesh Verma',
        issuingAuthority: 'Vikram Menon (Safety Officer)',
        performingAuthority: 'Suresh Iyer (Maintenance HOD)',
        workSupervisor: 'Karthik Rajan',
        scopeOfWork: '[SAMPLE DATA] TIG welding reinforcement bracket on Steam Header Line 02 support structure.',
        workLocation: 'Boiler & Utility Bay - Rack B2',
        startDate: `${today}T08:00`,
        endDate: `${today}T18:00`,
        validUntil: `${today}T18:00`,
        methodStatement: 'Isolate steam header, purge line, verify 0% LEL gas test, deploy fire blanket & 2x ABC extinguishers.',
        taskRiskAssessment: { jsaNumber: 'JSA-2026-011', riskLevel: 'High (Controlled to Low)' },
        hazards: ['Welding Sparks / Fire', 'Hot Surfaces', 'Fume Inhalation', 'Energized Steam Line'],
        controls: ['Fire Watch stationed for 60 min post-work', 'Fire-retardant blankets', 'LOTO applied on Valve V-104'],
        isolationLoto: { lotoNumber: 'LOTO-2026-0001', pointsIsolated: 2, zeroEnergyVerified: true },
        gasTesting: { o2: '20.9%', lel: '0%', h2s: '0 ppm', co: '0 ppm', testedAt: '07:45' },
        requiredPpe: ['Welding Helmet', 'Leather Apron & Gloves', 'Safety Shoes', 'FR Coverall', 'Safety Goggles'],
        toolsChecks: { weldingMachineInspected: true, flashbackArrestorOk: true, earthingClampOk: true },
        authorizedWorkers: ['Ramesh Verma (Certified Welder #W-204)', 'Deepak Kumar (Fire Watch)'],
        emergencyArrangements: 'Nearest Fire Alarm Call Point: Bay Pillar 4. Emergency Ext: 101. Muster Point A.',
        simopsNotes: 'No solvent transfer operations permitted within 15m radius during hot work window.',
        worksiteInspection: { inspectedBy: 'Vikram Menon', combustiblesCleared: true, drainsCovered: true },
        toolboxTalk: { conducted: true, topic: 'Hot Work Fire Prevention & Three Golden Rules', attendeesCount: 4 },
        goldenRulesAcknowledged: true,
        approvalHistory: [
          { step: 'Department Head Review', actor: 'Suresh Iyer', decision: 'Approved', at: new Date().toISOString(), comments: 'Isolation verified.' },
          { step: 'Safety Officer Verification', actor: 'Vikram Menon', decision: 'Approved', at: new Date().toISOString(), comments: 'Gas test & fire watch verified.' },
        ],
        qrToken: 'ARSHIEL-PTW-CHN-2026-0001',
        status: 'Active',
        isDemo: true,
      },
      {
        organizationId,
        plantId: plant2Id,
        plantName: 'Pune Process & Chemical Hub (SAMPLE)',
        departmentName: 'Process Production',
        permitNumber: 'PTW-PUN-2026-0002',
        permitType: 'Confined Space Entry',
        isHighRisk: true,
        contractorName: 'SafeTank Industrial Cleaners',
        applicantName: 'Manoj Patil',
        issuingAuthority: 'Pending Safety Verification',
        performingAuthority: 'Meera Kulkarni',
        workSupervisor: 'Sanjay Shinde',
        scopeOfWork: '[SAMPLE DATA] Internal visual inspection & sludge cleaning inside Reactor Vessel R-201.',
        workLocation: 'Solvent Reactor Block B',
        startDate: `${today}T09:00`,
        endDate: `${today}T17:00`,
        validUntil: `${today}T17:00`,
        hazards: ['Oxygen Deficiency', 'Toxic Solvent Vapor', 'Entrapment'],
        controls: ['Continuous forced air ventilation', 'Tripod & rescue harness', 'Standby attendant'],
        requiredPpe: ['SCBA / Supplied Air', 'Full Body Harness', 'Chemical Suit', 'Safety Boots'],
        toolboxTalk: { conducted: true, topic: 'Confined Space Rescue & Gas Monitoring', attendeesCount: 3 },
        goldenRulesAcknowledged: true,
        qrToken: 'ARSHIEL-PTW-PUN-2026-0002',
        status: 'Submitted',
        isDemo: true,
      },
    ])
    .returning();

  // Sample LOTO
  await db.insert(lotoRecords).values({
    organizationId,
    plantId: plant1Id,
    permitId: samplePermit.id,
    lotoNumber: 'LOTO-2026-0001',
    equipmentId: 'EQ-STM-104',
    equipmentName: '[SAMPLE DATA] Steam Header Isolation Valve V-104 & Pump P-12',
    energySources: ['Thermal / Steam', 'Electrical 415V'],
    isolationPoints: [
      { point: 'Main Breaker MCC-04', method: 'Lockout Hasp + Padlock', verified: true },
      { point: 'Inlet Steam Valve V-104', method: 'Chain Lock + Tag', verified: true },
    ],
    lockNumber: 'PAD-409',
    tagNumber: 'TAG-RED-409',
    authorizedEmployee: 'Suresh Iyer',
    zeroEnergyVerified: true,
    zeroEnergyVerifiedBy: 'Vikram Menon',
    groupLotoLead: 'Suresh Iyer',
    status: 'Verified',
    isDemo: true,
  });

  // Sample AI Safety Observations
  await db.insert(safetyObservations).values([
    {
      organizationId,
      plantId: plant1Id,
      departmentId: deptHseId,
      plantName: 'Chennai Precision Manufacturing Plant (SAMPLE)',
      departmentName: 'HSE & Fire Safety',
      observationNumber: 'OBS-2026-0001',
      title: '[SAMPLE DATA] Blocked Emergency Exit Corridor in Dispatch Bay',
      observationType: 'Unsafe Condition',
      category: 'Fire & Egress',
      severity: 'High',
      likelihood: 'Likely',
      riskLevel: 'High',
      description: 'Two shrink-wrapped pallets staged inside yellow hatched emergency exit path at North Exit #2.',
      location: 'Dispatch Warehouse North Exit',
      areaName: 'Loading Bay & Dispatch',
      inputSource: 'Photo',
      aiAnalysis: {
        confidence: 0.91,
        uncertaintyNotes: 'Image clarity is high; human verification confirmed exit sign visibility.',
        requiresHumanVerification: true,
        suggestedHazards: ['Blocked Emergency Egress', 'Delayed Evacuation During Fire'],
      },
      humanVerified: true,
      verifiedBy: 'Vikram Menon',
      immediateAction: 'Requested forklift operator to relocate pallets to designated Zone C racking.',
      correctiveAction: 'Repaint high-visibility floor markings and add bollard barriers.',
      preventiveAction: 'Include exit clearance check in shift-start supervisor walkdown.',
      responsibleDepartment: 'Logistics',
      actionOwner: 'Raghavendra Rao',
      targetDate: nextMonth,
      status: 'Assigned',
      coachingNotes: 'Coached warehouse shift team on NBC 2016 egress clearance rules.',
      reportedByName: 'Vikram Menon',
      isDemo: true,
    },
    {
      organizationId,
      plantId: plant2Id,
      plantName: 'Pune Process & Chemical Hub (SAMPLE)',
      departmentName: 'Process Production',
      observationNumber: 'OBS-2026-0002',
      title: '[SAMPLE DATA] Exemplary LOTO Tagging & PPE Discipline by Maintenance Crew',
      observationType: 'Safe Act',
      category: 'LOTO & PPE',
      severity: 'Low',
      likelihood: 'Rare',
      riskLevel: 'Low',
      description: 'Crew verified zero energy state with calibrated multimeter before opening junction box.',
      location: 'MCC Room 2',
      inputSource: 'Text',
      humanVerified: true,
      verifiedBy: 'Meera Kulkarni',
      status: 'Closed',
      reportedByName: 'Ananya Deshmukh',
      isDemo: true,
    },
  ]);

  // Sample Risk Assessments (HIRA / HAZOP / JSA)
  await db.insert(riskAssessments).values([
    {
      organizationId,
      plantId: plant1Id,
      assessmentNumber: 'HIRA-2026-0001',
      methodology: 'HIRA',
      title: '[SAMPLE DATA] Boiler & Steam Distribution Maintenance',
      activityOrNode: 'High Pressure Steam Line Inspection',
      jobSteps: '1. Depressurize line 2. Apply LOTO 3. Inspect flange gaskets',
      hazardCategory: 'Thermal & Pressure',
      hazard: 'Superheated steam release causing severe burns',
      potentialConsequences: '2nd/3rd degree thermal burns, scalding, fatality',
      existingControls: 'SOP-MNT-04, Insulated piping, Pressure gauge',
      likelihood: 3,
      severity: 5,
      initialRiskScore: 15,
      additionalControls: 'Double block & bleed isolation, thermal PPE face shield, verify 0 bar gauge',
      residualLikelihood: 1,
      residualSeverity: 4,
      residualRiskScore: 4,
      responsiblePerson: 'Suresh Iyer',
      reviewDate: nextMonth,
      status: 'Approved',
      approvedBy: 'Rajeshwar Rao',
      isDemo: true,
    },
    {
      organizationId,
      plantId: plant2Id,
      assessmentNumber: 'HAZOP-2026-0001',
      methodology: 'HAZOP',
      title: '[SAMPLE DATA] Solvent Reactor R-201 Cooling Loop',
      activityOrNode: 'Node 1: Jacketed Chilled Water Supply',
      guideword: 'NO / LESS',
      deviation: 'No or low cooling water flow to reactor jacket',
      hazardCategory: 'Chemical / Process',
      hazard: 'Exothermic temperature rise leading to overpressurization',
      potentialConsequences: 'Relief valve lift, toxic vapor release, vessel rupture',
      existingControls: 'TT-201 High Temp Alarm, Rupture Disc RD-201',
      likelihood: 2,
      severity: 5,
      initialRiskScore: 10,
      additionalControls: 'Install SIL-2 automated quench interlock on High-High Temp',
      residualLikelihood: 1,
      residualSeverity: 5,
      residualRiskScore: 5,
      responsiblePerson: 'Meera Kulkarni',
      reviewDate: nextMonth,
      status: 'HOD Review',
      isDemo: true,
    },
  ]);

  // Sample Safety Audit
  await db.insert(safetyAudits).values({
    organizationId,
    plantId: plant1Id,
    auditNumber: 'AUD-2026-0001',
    auditType: 'Fire Safety Audit',
    title: '[SAMPLE DATA] Q4 NBC 2016 Fire & Life Safety Compliance Audit',
    scheduledDate: today,
    leadAuditor: 'Vikram Menon',
    auditTeam: ['Vikram Menon', 'Karthik Subramanian'],
    totalItems: 10,
    compliantItems: 9,
    nonCompliantItems: 1,
    complianceScore: 90,
    findings: [
      { item: 'North Exit #2', status: 'Non-Compliant', note: '2 pallets obstructing escape corridor' },
    ],
    status: 'Under Review',
    isDemo: true,
  });

  // Sample Equipment
  await db.insert(equipmentAssets).values([
    {
      organizationId,
      plantId: plant1Id,
      equipmentId: 'EQ-CRN-001',
      assetNumber: 'AST-1042',
      name: '[SAMPLE DATA] 10T EOT Overhead Crane Bay-A',
      category: 'Cranes',
      location: 'Heavy Machining Bay A',
      inspectionFrequency: 'Monthly',
      lastInspectionDate: today,
      nextDueDate: nextMonth,
      certificationNumber: 'FORM-11-TN-8821',
      inspectorName: 'Competent Person (TUV)',
      status: 'Operational',
      isDemo: true,
    },
    {
      organizationId,
      plantId: plant2Id,
      equipmentId: 'EQ-PV-009',
      assetNumber: 'AST-2088',
      name: '[SAMPLE DATA] Nitrogen Buffer Pressure Vessel V-202',
      category: 'Pressure Vessels',
      location: 'Utility Tank Farm',
      inspectionFrequency: 'Quarterly',
      lastInspectionDate: '2026-07-01',
      nextDueDate: today,
      certificationNumber: 'SMPV-MH-4410',
      inspectorName: 'PESO Approved Inspector',
      status: 'Due Soon',
      isDemo: true,
    },
  ]);

  // Sample Contractors & Workers
  const [c1] = await db
    .insert(contractors)
    .values({
      organizationId,
      plantId: plant1Id,
      vendorCode: 'VND-001',
      companyName: '[SAMPLE DATA] Apex Mechanical Services Pvt Ltd',
      gstNumber: '33AABCA1234F1Z5',
      esiNumber: 'ESI-5100028391',
      pfNumber: 'TN/MAS/0048291',
      licenseNumber: 'CLRA-TN-2026-991',
      licenseExpiry: nextMonth,
      insuranceExpiry: nextMonth,
      supervisorName: 'Karthik Rajan',
      supervisorPhone: '+91 98400 11223',
      evaluationScore: 92,
      status: 'Active',
      isDemo: true,
    })
    .returning();

  await db.insert(contractorWorkers).values([
    {
      organizationId,
      contractorId: c1.id,
      plantId: plant1Id,
      workerId: 'WRK-101',
      fullName: '[SAMPLE DATA] Ramesh Verma',
      skillCategory: 'TIG Welder (High Risk)',
      qualification: 'IBR Certified Welder',
      medicalFitnessDate: today,
      medicalExpiry: nextMonth,
      inductionDate: today,
      safetyTrainingExpiry: nextMonth,
      qrCodeToken: 'ARSHIEL-WRK-101',
      monthlyManhours: 192,
      attendanceStatus: 'On Site',
      isDemo: true,
    },
  ]);

  // Sample Training, Emergency, Environment, Legal, Weekly, PPE, Gate, Committee, Documents, AI KB
  await db.insert(trainingRecords).values({
    organizationId,
    plantId: plant1Id,
    trainingNumber: 'TRN-2026-0001',
    category: 'LOTO',
    title: '[SAMPLE DATA] Authorized LOTO & Zero Energy Verification Workshop',
    trainerName: 'Vikram Menon',
    scheduledDate: today,
    durationHours: 4,
    attendees: [
      { name: 'Suresh Iyer', role: 'HOD', passed: true, score: 95 },
      { name: 'Ramesh Verma', role: 'Contractor', passed: true, score: 88 },
    ],
    quizScore: 92,
    passingScore: 80,
    certificateNumber: 'CERT-LOTO-2026-01',
    renewalDate: nextMonth,
    status: 'Completed',
    isDemo: true,
  });

  await db.insert(emergencyRecords).values({
    organizationId,
    plantId: plant1Id,
    recordType: 'Mock Drill',
    title: '[SAMPLE DATA] Q4 Boiler House Fire & Evacuation Mock Drill',
    scenarioType: 'Fire Emergency',
    drillDate: today,
    responseTimeSeconds: 185,
    participantsCount: 312,
    assemblyPoint: 'Main Gate Assembly Point Alpha',
    lessonsLearned: 'All 312 personnel mustered in 3m 05s; PA speaker in Bay 3 requires volume boost.',
    status: 'Completed',
    isDemo: true,
  });

  await db.insert(environmentRecords).values([
    {
      organizationId,
      plantId: plant2Id,
      recordType: 'Carbon GHG',
      framework: 'BRSR',
      metricName: '[SAMPLE DATA] Scope 1 + Scope 2 Monthly GHG Emissions',
      quantity: 42.6,
      unit: 'tCO2e',
      limitValue: 55.0,
      monitoringDate: today,
      complianceStatus: 'Within Limit',
      isDemo: true,
    },
    {
      organizationId,
      plantId: plant2Id,
      recordType: 'Wastewater',
      framework: 'ISO 14001',
      metricName: '[SAMPLE DATA] ETP Treated Outlet COD',
      quantity: 145,
      unit: 'mg/L',
      limitValue: 250,
      monitoringDate: today,
      complianceStatus: 'Within Limit',
      isDemo: true,
    },
  ]);

  await db.insert(legalCompliances).values([
    {
      organizationId,
      plantId: plant1Id,
      state: 'Tamil Nadu / Central India',
      statuteName: 'OSHWC Code, 2020 (Commencement Ref: 21-Nov-2025)',
      sectionRef: 'Section 18 & Chapter IV',
      obligation: '[SAMPLE DATA] Maintain bi-partite Safety Committee (50+ workers), medical checks & quarterly safety reviews (Verify State Rules)',
      responsiblePerson: 'Vikram Menon',
      frequency: 'Quarterly',
      dueDate: nextMonth,
      complianceStatus: 'Compliant',
      evidenceSummary: 'Committee minutes Q3 & Q4 archived in Section 8. Official Ref: Ministry of Labour & Employment.',
      verifiedBy: 'Jonathan Thadanki · Corporate Legal Compliance',
      isDemo: true,
    },
    {
      organizationId,
      plantId: plant1Id,
      state: 'Tamil Nadu (Factories Act 1948 Transition)',
      statuteName: 'Factories Act, 1948 / State Factory Rules (Legacy & Transition)',
      sectionRef: 'Sec 29 / Rule 61 / Form 11',
      obligation: '[SAMPLE DATA] Annual Competent Person testing of lifting machines, hoists, pressure vessels & chains',
      responsiblePerson: 'Suresh Iyer',
      frequency: 'Annual',
      dueDate: nextMonth,
      complianceStatus: 'Compliant',
      evidenceSummary: 'Form 11 certificates valid for EOT Cranes. Pending state OSHWC migration check.',
      verifiedBy: 'Jonathan Thadanki · Corporate Legal Compliance',
      isDemo: true,
    },
    {
      organizationId,
      plantId: plant1Id,
      state: 'International / US Benchmark',
      statuteName: 'OSHA 29 CFR 1910.147 & 1926 (LOTO & Construction)',
      sectionRef: '29 CFR 1910.147 / 1910.132 / 1926.501',
      obligation: '[SAMPLE DATA] Control of Hazardous Energy (LOTO), PPE hazard assessment & Fall Protection compliance',
      responsiblePerson: 'Vikram Menon',
      frequency: 'Annual',
      dueDate: nextMonth,
      complianceStatus: 'Compliant',
      evidenceSummary: 'Annual LOTO audit & PPE matrix verified. Ref: osha.gov/laws-regs.',
      verifiedBy: 'Jonathan Thadanki · Global EHS Benchmark',
      isDemo: true,
    },
    {
      organizationId,
      plantId: plant1Id,
      state: 'Global ISO Standards Catalogue',
      statuteName: 'ISO 45001:2018 · ISO 14001:2015 · ISO 50001:2018',
      sectionRef: 'Clauses 6.1, 8.1, 9.1 (Verification Required per Licensed Edition)',
      obligation: '[SAMPLE DATA] OH&S hazard identification, environmental aspect/impact & energy performance monitoring',
      responsiblePerson: 'Vikram Menon',
      frequency: 'Semi-Annual',
      dueDate: nextMonth,
      complianceStatus: 'Compliant',
      evidenceSummary: 'Internal audit checklist & management review archived. Ref: iso.org.',
      verifiedBy: 'Jonathan Thadanki · ISO Management System',
      isDemo: true,
    },
  ]);

  const insertedParentDocs = await db
    .insert(documents)
    .values(
      DOCUMENT_23_SECTIONS.slice(0, 8).map((sec, idx) => ({
        organizationId,
        plantId: plant1Id,
        sectionNumber: sec.num,
        sectionName: sec.name,
        documentCode: `AR-IN-PLT1-DOC-MST-${String(idx + 1).padStart(4, '0')}`,
        title: `[SAMPLE DATA] ${sec.name} Master Controlled Document`,
        contentText: `Controlled ${sec.name} master document maintained in ARSHIEL SAFETY. Includes scope, statutory applicability, competent-person review workflow, and linked child records.`,
        fileName: `ARSHIEL_${sec.name.replace(/[^a-zA-Z0-9]/g, '_')}_v1.pdf`,
        fileType: 'PDF',
        fileSize: 245000 + idx * 12000,
        version: '1.0',
        status: idx < 4 ? 'Completed' : idx < 6 ? 'Under Review' : 'In Progress',
        ownerName: 'Vikram Menon',
        authorAttribution: 'Jonathan Thadanki',
        isoReferences: ['ISO 45001:2018', idx % 2 === 0 ? 'ISO 14001:2015' : 'ISO 9001:2015'],
        factoryRulesReferences: ['OSHWC Code, 2020', 'Factories Act, 1948 (Transition Reference)', 'State Factory Rules'],
        oshaReferences: ['OSHA 29 CFR 1910', 'NFPA Life Safety / Fire Reference'],
        aiSuggestions: 'AI Advisory: Verify state-specific OSHWC commencement notification and attach site-specific emergency contacts.',
        reviewDate: today,
        expiryDate: nextMonth,
        isDemo: true,
      }))
    )
    .returning();

  if (insertedParentDocs[0] && insertedParentDocs[2]) {
    await db.insert(documents).values([
      {
        organizationId,
        plantId: plant1Id,
        parentDocumentId: insertedParentDocs[0].id,
        sectionNumber: insertedParentDocs[0].sectionNumber,
        sectionName: insertedParentDocs[0].sectionName,
        documentCode: 'AR-IN-PLT1-DOC-CHD-0001',
        title: '[SAMPLE DATA] Site EHS Policy Sign-Off & Annual Objectives Register',
        contentText: 'Child document linked to EHS Policies Master Document capturing annual zero-harm KPI targets and signed commitment.',
        fileName: 'ARSHIEL_EHS_Policy_Objectives_Child.pdf',
        fileType: 'PDF',
        fileSize: 128000,
        version: '1.0',
        status: 'Completed',
        ownerName: 'Vikram Menon',
        authorAttribution: 'Jonathan Thadanki',
        isoReferences: ['ISO 45001:2018', 'ISO 14001:2015'],
        factoryRulesReferences: ['OSHWC Code, 2020'],
        oshaReferences: ['OSHA 29 CFR 1910.1200'],
        isDemo: true,
      },
      {
        organizationId,
        plantId: plant1Id,
        parentDocumentId: insertedParentDocs[2].id,
        sectionNumber: insertedParentDocs[2].sectionNumber,
        sectionName: insertedParentDocs[2].sectionName,
        documentCode: 'AR-IN-PLT1-DOC-CHD-0002',
        title: '[SAMPLE DATA] LOTO & Electrical Isolation Field Checklist (Child SOP)',
        contentText: 'Step-by-step zero-energy verification procedure for HT/LT panels, lockbox verification, and multi-craft tagging.',
        fileName: 'ARSHIEL_LOTO_Child_SOP.pdf',
        fileType: 'PDF',
        fileSize: 164000,
        version: '1.2',
        status: 'Completed',
        ownerName: 'Suresh Iyer',
        authorAttribution: 'Jonathan Thadanki',
        isoReferences: ['ISO 45001:2018'],
        factoryRulesReferences: ['Factories Act, 1948 / State Rules', 'CEA Electrical Safety Regulations'],
        oshaReferences: ['OSHA 29 CFR 1910.147 (LOTO)', 'NFPA 70E'],
        isDemo: true,
      },
    ]);
  }

  await db.insert(weeklySafetyActivities).values([
    {
      organizationId,
      plantId: plant1Id,
      parentCategory: 'Workplace Safety',
      childCategory: 'Fire & Egress',
      activityName: '[SAMPLE DATA] Weekly Fire Hydrant Jockey Pump & Hose Reel Pressure Check',
      responsiblePerson: 'Vikram Menon',
      departmentName: 'HSE & Fire Safety',
      weekLabel: 'Week 47 - Nov 2026',
      targetDate: today,
      completionDate: today,
      status: 'Completed',
      evidenceNotes: 'Pressure steady at 7.2 kg/cm2.',
      isDemo: true,
    },
    {
      organizationId,
      plantId: plant1Id,
      parentCategory: 'Machinery Safety',
      childCategory: 'Interlocks',
      activityName: '[SAMPLE DATA] Press Line Light Curtain & E-Stop Functional Verification',
      responsiblePerson: 'Suresh Iyer',
      departmentName: 'Maintenance & Utilities',
      weekLabel: 'Week 47 - Nov 2026',
      targetDate: nextMonth,
      status: 'In Progress',
      isDemo: true,
    },
  ]);

  await db.insert(ppeInventory).values([
    {
      organizationId,
      plantId: plant1Id,
      itemCode: 'PPE-HLM-01',
      itemName: '[SAMPLE DATA] Ratchet Safety Helmet (IS 2925 / EN 397)',
      category: 'Safety Helmets',
      currentStock: 84,
      minStock: 25,
      unit: 'Units',
      expiryDate: nextMonth,
      isDemo: true,
    },
    {
      organizationId,
      plantId: plant1Id,
      itemCode: 'PPE-HRN-02',
      itemName: '[SAMPLE DATA] Full Body Harness Double Lanyard w/ Shock Absorber',
      category: 'Safety Harnesses',
      currentStock: 7,
      minStock: 12,
      unit: 'Sets',
      expiryDate: nextMonth,
      isDemo: true,
    },
  ]);

  await db.insert(gateEntries).values([
    {
      organizationId,
      plantId: plant1Id,
      passNumber: 'GATE-2026-0001',
      entryType: 'Contractor',
      personOrDriverName: '[SAMPLE DATA] Ramesh Verma',
      companyName: 'Apex Mechanical Services Pvt Ltd',
      permitNumber: 'PTW-CHN-2026-0001',
      inductionVerified: true,
      restrictedAreaAccess: true,
      qrPassToken: 'ARSHIEL-GATE-2026-0001',
      status: 'Checked In',
      verifiedBy: 'Security Desk Gate 1',
      isDemo: true,
    },
  ]);

  await db.insert(safetyCommittees).values({
    organizationId,
    plantId: plant1Id,
    recordType: 'Meeting',
    title: '[SAMPLE DATA] Q4 Joint Plant Safety & Welfare Committee Meeting',
    meetingDate: today,
    members: [
      { name: 'Rajeshwar Rao', role: 'Plant Head (Chair)' },
      { name: 'Vikram Menon', role: 'Safety Officer (Secretary)' },
      { name: 'Arjun Nair', role: 'Worker Representative' },
    ],
    agenda: 'Review Q4 Near Miss trends, Fire Exit clearance, and drinking water cooler sanitization.',
    minutes: 'Approved budget for automated forklift pedestrian proximity alarms.',
    welfareChecklist: { drinkingWaterOk: true, sanitationOk: true, canteenHygieneOk: true, firstAidStockOk: true },
    status: 'Completed',
    isDemo: true,
  });

  await db.insert(aiKnowledgeBase).values([
    {
      organizationId,
      docType: 'SOP',
      title: 'SOP-PTW-001: Enterprise Permit to Work & LOTO Procedure',
      sourceReference: 'ARSHIEL-SOP-PTW-001 Rev 3.0',
      contentText:
        'Three Golden Rules: (1) No Permit, No Work. (2) Check Permit Before Start. (3) Stop Work If Conditions Change. All Hot Work requires 0% LEL gas test, fire-retardant blanket, and 60-minute post-work fire watch. Confined space entry requires continuous O2 (19.5%-23.5%), H2S < 10 ppm, and dedicated standby attendant.',
      tags: ['PTW', 'LOTO', 'Hot Work', 'Confined Space'],
      approvedBy: 'Corporate EHS Head',
      isDemo: true,
    },
    {
      organizationId,
      docType: 'Policy',
      title: 'POL-EHS-001: Zero Harm & Stop Work Authority Policy',
      sourceReference: 'ARSHIEL-POL-001 Rev 2.0',
      contentText:
        'Every employee and contractor has unconditional Stop Work Authority when unsafe conditions or unverified hazards arise. AI-assisted safety observations must always be reviewed and verified by a qualified EHS professional before disciplinary or formal compliance closure.',
      tags: ['Policy', 'Stop Work', 'AI Governance'],
      approvedBy: 'Jonathan Thadanki',
      isDemo: true,
    },
  ]);

  await db.insert(notifications).values([
    {
      organizationId,
      targetRole: 'Super Admin',
      type: 'overdue',
      severity: 'critical',
      title: '[SAMPLE] Overdue CAPA-2026-0002 Requires Escalation',
      message: 'Corrective action for North Emergency Exit #2 obstruction has reached its target date.',
      entityType: 'capa',
      isRead: false,
    },
    {
      organizationId,
      targetRole: 'Safety Officer',
      type: 'approval',
      severity: 'warning',
      title: '[SAMPLE] Confined Space Permit PTW-PUN-2026-0002 Awaiting Safety Review',
      message: 'Contractor SafeTank submitted a Confined Space Entry request for Reactor Vessel R-201.',
      entityType: 'permit',
      isRead: false,
    },
  ]);
}

export async function clearSampleData(organizationId: string) {
  await db.delete(incidents).where(and(eq(incidents.organizationId, organizationId), eq(incidents.isDemo, true)));
  await db.delete(capas).where(and(eq(capas.organizationId, organizationId), eq(capas.isDemo, true)));
  await db.delete(lotoRecords).where(and(eq(lotoRecords.organizationId, organizationId), eq(lotoRecords.isDemo, true)));
  await db.delete(workPermits).where(and(eq(workPermits.organizationId, organizationId), eq(workPermits.isDemo, true)));
  await db.delete(safetyObservations).where(and(eq(safetyObservations.organizationId, organizationId), eq(safetyObservations.isDemo, true)));
  await db.delete(riskAssessments).where(and(eq(riskAssessments.organizationId, organizationId), eq(riskAssessments.isDemo, true)));
  await db.delete(safetyAudits).where(and(eq(safetyAudits.organizationId, organizationId), eq(safetyAudits.isDemo, true)));
  await db.delete(equipmentAssets).where(and(eq(equipmentAssets.organizationId, organizationId), eq(equipmentAssets.isDemo, true)));
  await db.delete(contractorWorkers).where(and(eq(contractorWorkers.organizationId, organizationId), eq(contractorWorkers.isDemo, true)));
  await db.delete(contractors).where(and(eq(contractors.organizationId, organizationId), eq(contractors.isDemo, true)));
  await db.delete(trainingRecords).where(and(eq(trainingRecords.organizationId, organizationId), eq(trainingRecords.isDemo, true)));
  await db.delete(emergencyRecords).where(and(eq(emergencyRecords.organizationId, organizationId), eq(emergencyRecords.isDemo, true)));
  await db.delete(environmentRecords).where(and(eq(environmentRecords.organizationId, organizationId), eq(environmentRecords.isDemo, true)));
  await db.delete(legalCompliances).where(and(eq(legalCompliances.organizationId, organizationId), eq(legalCompliances.isDemo, true)));
  await db.delete(documents).where(and(eq(documents.organizationId, organizationId), eq(documents.isDemo, true)));
  await db.delete(weeklySafetyActivities).where(and(eq(weeklySafetyActivities.organizationId, organizationId), eq(weeklySafetyActivities.isDemo, true)));
  await db.delete(ppeInventory).where(and(eq(ppeInventory.organizationId, organizationId), eq(ppeInventory.isDemo, true)));
  await db.delete(gateEntries).where(and(eq(gateEntries.organizationId, organizationId), eq(gateEntries.isDemo, true)));
  await db.delete(safetyCommittees).where(and(eq(safetyCommittees.organizationId, organizationId), eq(safetyCommittees.isDemo, true)));
  await db.delete(aiKnowledgeBase).where(and(eq(aiKnowledgeBase.organizationId, organizationId), eq(aiKnowledgeBase.isDemo, true)));
  await db.delete(formSubmissions).where(and(eq(formSubmissions.organizationId, organizationId), eq(formSubmissions.isDemo, true)));
}
