import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  doublePrecision,
  uniqueIndex,
  index,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

// ============================================================================
// 1-6. ORGANIZATION & FACILITY HIERARCHY
// Platform -> Organization -> Business Unit -> Plant -> Department -> Area -> Location
// ============================================================================

export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  industry: text('industry').default('Manufacturing').notNull(),
  branding: jsonb('branding')
    .$type<{
      companyName?: string;
      logoUrl?: string;
      primaryColor?: string;
      accentColor?: string;
      reportHeader?: string;
      reportFooter?: string;
      tagline?: string;
    }>()
    .default({})
    .notNull(),
  profile: jsonb('profile').$type<Record<string, unknown>>().default({}).notNull(),
  settings: jsonb('settings').$type<Record<string, unknown>>().default({}).notNull(),
  isDemo: boolean('is_demo').default(false).notNull(),
  createdByUid: text('created_by_uid'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const businessUnits = pgTable('business_units', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  headName: text('head_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const plants = pgTable('plants', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  businessUnitId: uuid('business_unit_id').references(() => businessUnits.id, {
    onDelete: 'set null',
  }),
  name: text('name').notNull(),
  code: text('code').notNull(),
  location: text('location'),
  state: text('state'),
  address: text('address'),
  headName: text('head_name'),
  totalEmployees: integer('total_employees').default(0).notNull(),
  totalContractors: integer('total_contractors').default(0).notNull(),
  monthlyManhours: integer('monthly_manhours').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const departments = pgTable('departments', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  plantId: uuid('plant_id')
    .references(() => plants.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  hodName: text('hod_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const areas = pgTable('areas', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  plantId: uuid('plant_id')
    .references(() => plants.id, { onDelete: 'cascade' })
    .notNull(),
  departmentId: uuid('department_id').references(() => departments.id, {
    onDelete: 'set null',
  }),
  name: text('name').notNull(),
  code: text('code').notNull(),
  riskLevel: text('risk_level').default('Medium').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const locations = pgTable('locations', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  plantId: uuid('plant_id')
    .references(() => plants.id, { onDelete: 'cascade' })
    .notNull(),
  departmentId: uuid('department_id').references(() => departments.id, {
    onDelete: 'set null',
  }),
  areaId: uuid('area_id').references(() => areas.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  code: text('code').notNull(),
  coordinates: text('coordinates'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 7-10. USERS, ROLES & RBAC PERMISSIONS
// ============================================================================

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  organizationId: uuid('organization_id').references(() => organizations.id, {
    onDelete: 'set null',
  }),
  plantId: uuid('plant_id').references(() => plants.id, { onDelete: 'set null' }),
  departmentId: uuid('department_id').references(() => departments.id, {
    onDelete: 'set null',
  }),
  email: text('email').notNull(),
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  designation: text('designation').default('EHS Professional'),
  employeeCode: text('employee_code'),
  avatarUrl: text('avatar_url'),
  isActive: boolean('is_active').default(true).notNull(),
  mfaEnabled: boolean('mfa_enabled').default(false).notNull(),
  lastLoginAt: timestamp('last_login_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  isSystem: boolean('is_system').default(false).notNull(),
  level: integer('level').default(10).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const permissions = pgTable('permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  action: text('action').notNull().unique(), // view, create, edit, delete, submit, approve, reject, export, download, configure, manage
  description: text('description'),
});

export const userRoles = pgTable('user_roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  roleId: uuid('role_id')
    .references(() => roles.id, { onDelete: 'cascade' })
    .notNull(),
  plantId: uuid('plant_id').references(() => plants.id, { onDelete: 'set null' }),
  departmentId: uuid('department_id').references(() => departments.id, {
    onDelete: 'set null',
  }),
  assignedBy: uuid('assigned_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 11-15. DYNAMIC UNLIMITED PARENT-CHILD-SUBCHILD MODULE BUILDER
// ============================================================================

export const modules = pgTable(
  'modules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    parentId: uuid('parent_id').references((): AnyPgColumn => modules.id, {
      onDelete: 'restrict',
    }),
    moduleCode: text('module_code').notNull(),
    moduleName: text('module_name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    moduleType: text('module_type').default('custom').notNull(), // system | custom | category | workspace
    builtInKey: text('built_in_key'), // maps built-in EHS routes or null for custom dynamic modules
    icon: text('icon').default('Layers').notNull(),
    colour: text('colour').default('#15803d').notNull(),
    displayOrder: integer('display_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    isVisible: boolean('is_visible').default(true).notNull(),
    isPublished: boolean('is_published').default(true).notNull(),
    isArchived: boolean('is_archived').default(false).notNull(),
    isSystem: boolean('is_system').default(false).notNull(),
    configuration: jsonb('configuration')
      .$type<{
        enableForms?: boolean;
        enableChecklists?: boolean;
        enableWorkflow?: boolean;
        enableReports?: boolean;
        enableNotifications?: boolean;
        assignedPlantIds?: string[];
        assignedDepartmentIds?: string[];
        notificationEvents?: string[];
      }>()
      .default({})
      .notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('modules_org_code_idx').on(table.organizationId, table.moduleCode),
    index('modules_org_parent_idx').on(table.organizationId, table.parentId),
  ]
);

export const modulePermissions = pgTable('module_permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  moduleId: uuid('module_id')
    .references(() => modules.id, { onDelete: 'cascade' })
    .notNull(),
  roleId: uuid('role_id')
    .references(() => roles.id, { onDelete: 'cascade' })
    .notNull(),
  plantId: uuid('plant_id').references(() => plants.id, { onDelete: 'set null' }),
  departmentId: uuid('department_id').references(() => departments.id, {
    onDelete: 'set null',
  }),
  allowedActions: jsonb('allowed_actions').$type<string[]>().default(['view']).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const moduleAssignments = pgTable('module_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  moduleId: uuid('module_id')
    .references(() => modules.id, { onDelete: 'cascade' })
    .notNull(),
  plantId: uuid('plant_id').references(() => plants.id, { onDelete: 'cascade' }),
  departmentId: uuid('department_id').references(() => departments.id, {
    onDelete: 'cascade',
  }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const moduleVersions = pgTable('module_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  moduleId: uuid('module_id')
    .references(() => modules.id, { onDelete: 'cascade' })
    .notNull(),
  versionNumber: integer('version_number').notNull(),
  snapshot: jsonb('snapshot').$type<Record<string, unknown>>().notNull(),
  changedBy: uuid('changed_by'),
  changeSummary: text('change_summary'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const moduleTemplates = pgTable('module_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  industry: text('industry').notNull(),
  description: text('description'),
  treeDefinition: jsonb('tree_definition').$type<Record<string, unknown>[]>().default([]).notNull(),
  isSystem: boolean('is_system').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 16-18. CUSTOM FORM ENGINE
// ============================================================================

export const moduleForms = pgTable('module_forms', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  moduleId: uuid('module_id')
    .references(() => modules.id, { onDelete: 'cascade' })
    .notNull(),
  formName: text('form_name').notNull(),
  formCode: text('form_code').notNull(),
  description: text('description'),
  version: integer('version').default(1).notNull(),
  isPublished: boolean('is_published').default(true).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  settings: jsonb('settings').$type<Record<string, unknown>>().default({}).notNull(),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const formFields = pgTable('form_fields', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  formId: uuid('form_id')
    .references(() => moduleForms.id, { onDelete: 'cascade' })
    .notNull(),
  fieldKey: text('field_key').notNull(),
  label: text('label').notNull(),
  fieldType: text('field_type').notNull(), // text, textarea, number, date, time, datetime, dropdown, multiselect, radio, checkbox, file, image, video, signature, qrcode, location, user_select, department_select, plant_select
  placeholder: text('placeholder'),
  helpText: text('help_text'),
  isRequired: boolean('is_required').default(false).notNull(),
  defaultValue: text('default_value'),
  options: jsonb('options').$type<string[]>().default([]).notNull(),
  validationRules: jsonb('validation_rules').$type<Record<string, unknown>>().default({}).notNull(),
  conditionalLogic: jsonb('conditional_logic').$type<Record<string, unknown>>().default({}).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  sectionName: text('section_name').default('General Details').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const formSubmissions = pgTable(
  'form_submissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    moduleId: uuid('module_id')
      .references(() => modules.id, { onDelete: 'cascade' })
      .notNull(),
    formId: uuid('form_id')
      .references(() => moduleForms.id, { onDelete: 'cascade' })
      .notNull(),
    plantId: uuid('plant_id').references(() => plants.id, { onDelete: 'set null' }),
    departmentId: uuid('department_id').references(() => departments.id, {
      onDelete: 'set null',
    }),
    submittedBy: uuid('submitted_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    submittedByName: text('submitted_by_name'),
    submissionNumber: text('submission_number').notNull(),
    status: text('status').default('Submitted').notNull(),
    data: jsonb('data').$type<Record<string, unknown>>().default({}).notNull(),
    searchableSummary: text('searchable_summary'),
    isDemo: boolean('is_demo').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('form_submissions_org_mod_idx').on(table.organizationId, table.moduleId)]
);

// ============================================================================
// 19-20. CHECKLIST ENGINE
// ============================================================================

export const moduleChecklists = pgTable('module_checklists', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  moduleId: uuid('module_id').references(() => modules.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  standardCode: text('standard_code').default('ISO 45001').notNull(),
  category: text('category').default('Safety Audit').notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const checklistItems = pgTable('checklist_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  checklistId: uuid('checklist_id')
    .references(() => moduleChecklists.id, { onDelete: 'cascade' })
    .notNull(),
  questionText: text('question_text').notNull(),
  section: text('section').default('General').notNull(),
  responseType: text('response_type').default('yes_no_na').notNull(),
  riskWeight: integer('risk_weight').default(1).notNull(),
  guidance: text('guidance'),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 21-24. CONFIGURABLE APPROVAL ENGINE
// ============================================================================

export const approvalWorkflows = pgTable('approval_workflows', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  moduleId: uuid('module_id').references(() => modules.id, { onDelete: 'cascade' }),
  workflowName: text('workflow_name').notNull(),
  description: text('description'),
  mode: text('mode').default('sequential').notNull(), // sequential | parallel | conditional
  isActive: boolean('is_active').default(true).notNull(),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const approvalSteps = pgTable('approval_steps', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  workflowId: uuid('workflow_id')
    .references(() => approvalWorkflows.id, { onDelete: 'cascade' })
    .notNull(),
  stepOrder: integer('step_order').notNull(),
  stepName: text('step_name').notNull(),
  approverRoleId: uuid('approver_role_id').references(() => roles.id, {
    onDelete: 'set null',
  }),
  approverRoleName: text('approver_role_name'),
  approverUserId: uuid('approver_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  conditionRules: jsonb('condition_rules').$type<Record<string, unknown>>().default({}).notNull(),
  slaHours: integer('sla_hours').default(24).notNull(),
  escalationRoleId: uuid('escalation_role_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const approvalInstances = pgTable('approval_instances', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  workflowId: uuid('workflow_id').references(() => approvalWorkflows.id, {
    onDelete: 'set null',
  }),
  moduleId: uuid('module_id').references(() => modules.id, { onDelete: 'set null' }),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  entityNumber: text('entity_number'),
  currentStepOrder: integer('current_step_order').default(1).notNull(),
  status: text('status').default('Pending').notNull(), // Pending | Approved | Rejected | Suspended | Cancelled | Closed
  submittedBy: uuid('submitted_by'),
  submittedByName: text('submitted_by_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const approvalHistory = pgTable('approval_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  instanceId: uuid('instance_id')
    .references(() => approvalInstances.id, { onDelete: 'cascade' })
    .notNull(),
  stepOrder: integer('step_order').default(1).notNull(),
  action: text('action').notNull(), // submit | approve | reject | resubmit | delegate | escalate | suspend | cancel | close
  actorId: uuid('actor_id'),
  actorName: text('actor_name').notNull(),
  comments: text('comments'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 25-28. MODULE REPORTS, DOCUMENTS (23 SECTIONS), NOTIFICATIONS, AUDIT LOGS
// ============================================================================

export const moduleReports = pgTable('module_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  moduleId: uuid('module_id').references(() => modules.id, { onDelete: 'cascade' }),
  reportName: text('report_name').notNull(),
  reportType: text('report_type').default('Summary').notNull(),
  config: jsonb('config').$type<Record<string, unknown>>().default({}).notNull(),
  scheduleCron: text('schedule_cron'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  plantId: uuid('plant_id').references(() => plants.id, { onDelete: 'set null' }),
  departmentId: uuid('department_id').references(() => departments.id, {
    onDelete: 'set null',
  }),
  parentDocumentId: uuid('parent_document_id').references((): AnyPgColumn => documents.id, {
    onDelete: 'cascade',
  }),
  sectionNumber: integer('section_number').notNull(), // 1 to 23
  sectionName: text('section_name').notNull(),
  documentCode: text('document_code').notNull(),
  title: text('title').notNull(),
  contentText: text('content_text'),
  fileName: text('file_name').notNull(),
  fileType: text('file_type').default('PDF').notNull(),
  fileSize: integer('file_size').default(0).notNull(),
  fileDataUrl: text('file_data_url'),
  version: text('version').default('1.0').notNull(),
  status: text('status').default('In Progress').notNull(), // Completed | Not Updated | Not Started | In Progress | Under Review
  ownerName: text('owner_name'),
  authorAttribution: text('author_attribution').default('Jonathan Thadanki'),
  isoReferences: jsonb('iso_references').$type<string[]>().default([]).notNull(),
  factoryRulesReferences: jsonb('factory_rules_references').$type<string[]>().default([]).notNull(),
  oshaReferences: jsonb('osha_references').$type<string[]>().default([]).notNull(),
  aiSuggestions: text('ai_suggestions'),
  reviewDate: text('review_date'),
  expiryDate: text('expiry_date'),
  isArchived: boolean('is_archived').default(false).notNull(),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  isDemo: boolean('is_demo').default(false).notNull(),
  uploadedBy: uuid('uploaded_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  targetRole: text('target_role'),
  type: text('type').default('system').notNull(),
  severity: text('severity').default('info').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  isRead: boolean('is_read').default(false).notNull(),
  channel: text('channel').default('in_app').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    userId: uuid('user_id'),
    userEmail: text('user_email'),
    userName: text('user_name'),
    userRole: text('user_role'),
    departmentName: text('department_name'),
    moduleName: text('module_name'),
    recordNumber: text('record_number'),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    previousValue: jsonb('previous_value').$type<Record<string, unknown> | null>(),
    updatedValue: jsonb('updated_value').$type<Record<string, unknown> | null>(),
    reasonForChange: text('reason_for_change'),
    approvalStatus: text('approval_status'),
    details: jsonb('details').$type<Record<string, unknown>>().default({}).notNull(),
    ipAddress: text('ip_address'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('audit_logs_org_created_idx').on(table.organizationId, table.createdAt)]
);

// ============================================================================
// 29-48. ENTERPRISE EHS OPERATIONAL MODULES
// ============================================================================

export const incidents = pgTable('incidents', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  plantId: uuid('plant_id').references(() => plants.id, { onDelete: 'set null' }),
  departmentId: uuid('department_id').references(() => departments.id, {
    onDelete: 'set null',
  }),
  plantName: text('plant_name'),
  departmentName: text('department_name'),
  incidentNumber: text('incident_number').notNull(),
  incidentType: text('incident_type').notNull(),
  severity: text('severity').default('Medium').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  incidentDate: text('incident_date').notNull(),
  incidentTime: text('incident_time').notNull(),
  specificLocation: text('specific_location'),
  personType: text('person_type').default('Employee').notNull(),
  injuredPersonDetails: jsonb('injured_person_details').$type<Record<string, unknown>>().default({}).notNull(),
  witnessDetails: jsonb('witness_details').$type<Record<string, unknown>[]>().default([]).notNull(),
  immediateActions: text('immediate_actions'),
  evidenceFiles: jsonb('evidence_files').$type<{ name: string; type: string; dataUrl: string }[]>().default([]).notNull(),
  investigationTeam: jsonb('investigation_team').$type<string[]>().default([]).notNull(),
  timelineEvents: jsonb('timeline_events').$type<{ time: string; event: string }[]>().default([]).notNull(),
  rcaMethod: text('rca_method').default('5 Why'),
  rcaData: jsonb('rca_data').$type<Record<string, unknown>>().default({}).notNull(),
  directCauses: text('direct_causes'),
  rootCauses: text('root_causes'),
  contributingFactors: text('contributing_factors'),
  status: text('status').default('Reported').notNull(),
  daysLost: integer('days_lost').default(0).notNull(),
  isRecordable: boolean('is_recordable').default(false).notNull(),
  isDemo: boolean('is_demo').default(false).notNull(),
  reportedByName: text('reported_by_name'),
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const capas = pgTable('capas', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  plantId: uuid('plant_id').references(() => plants.id, { onDelete: 'set null' }),
  departmentId: uuid('department_id').references(() => departments.id, {
    onDelete: 'set null',
  }),
  departmentName: text('department_name'),
  actionNumber: text('action_number').notNull(),
  sourceType: text('source_type').notNull(), // incident | observation | audit | risk | equipment | legal | committee
  sourceId: text('source_id'),
  sourceNumber: text('source_number'),
  title: text('title').notNull(),
  description: text('description').notNull(),
  actionType: text('action_type').default('Corrective').notNull(),
  priority: text('priority').default('Medium').notNull(),
  responsiblePerson: text('responsible_person').notNull(),
  targetDate: text('target_date').notNull(),
  completionDate: text('completion_date'),
  status: text('status').default('Open').notNull(), // Open | Assigned | In Progress | Pending Verification | Closed | Rejected | Reopened | Overdue
  implementationNotes: text('implementation_notes'),
  evidenceFiles: jsonb('evidence_files').$type<{ name: string; dataUrl: string }[]>().default([]).notNull(),
  effectivenessReview: text('effectiveness_review'),
  verifiedBy: text('verified_by'),
  approvalHistory: jsonb('approval_history').$type<Record<string, unknown>[]>().default([]).notNull(),
  reopenCount: integer('reopen_count').default(0).notNull(),
  escalatedAt: timestamp('escalated_at'),
  isDemo: boolean('is_demo').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const workPermits = pgTable('work_permits', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  plantId: uuid('plant_id').references(() => plants.id, { onDelete: 'set null' }),
  departmentId: uuid('department_id').references(() => departments.id, {
    onDelete: 'set null',
  }),
  requesterUserId: uuid('requester_user_id'),
  plantName: text('plant_name'),
  departmentName: text('department_name'),
  permitNumber: text('permit_number').notNull(),
  permitType: text('permit_type').notNull(),
  isHighRisk: boolean('is_high_risk').default(false).notNull(),
  contractorName: text('contractor_name'),
  applicantName: text('applicant_name').notNull(),
  issuingAuthority: text('issuing_authority'),
  performingAuthority: text('performing_authority'),
  workSupervisor: text('work_supervisor'),
  scopeOfWork: text('scope_of_work').notNull(),
  workLocation: text('work_location').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  validUntil: text('valid_until'),
  methodStatement: text('method_statement'),
  taskRiskAssessment: jsonb('task_risk_assessment').$type<Record<string, unknown>>().default({}).notNull(),
  hazards: jsonb('hazards').$type<string[]>().default([]).notNull(),
  controls: jsonb('controls').$type<string[]>().default([]).notNull(),
  isolationLoto: jsonb('isolation_loto').$type<Record<string, unknown>>().default({}).notNull(),
  gasTesting: jsonb('gas_testing').$type<Record<string, unknown>>().default({}).notNull(),
  requiredPpe: jsonb('required_ppe').$type<string[]>().default([]).notNull(),
  toolsChecks: jsonb('tools_checks').$type<Record<string, unknown>>().default({}).notNull(),
  authorizedWorkers: jsonb('authorized_workers').$type<string[]>().default([]).notNull(),
  emergencyArrangements: text('emergency_arrangements'),
  simopsNotes: text('simops_notes'),
  worksiteInspection: jsonb('worksite_inspection').$type<Record<string, unknown>>().default({}).notNull(),
  toolboxTalk: jsonb('toolbox_talk').$type<Record<string, unknown>>().default({}).notNull(),
  goldenRulesAcknowledged: boolean('golden_rules_acknowledged').default(false).notNull(),
  closureChecklist: jsonb('closure_checklist').$type<Record<string, unknown>>().default({}).notNull(),
  suspensionReason: text('suspension_reason'),
  rejectedReason: text('rejected_reason'),
  returnedReason: text('returned_reason'),
  departmentHeadApprovedBy: text('department_head_approved_by'),
  departmentHeadApprovedById: uuid('department_head_approved_by_id'),
  departmentHeadApprovedAt: timestamp('department_head_approved_at'),
  safetyApprovedBy: text('safety_approved_by'),
  safetyApprovedById: uuid('safety_approved_by_id'),
  safetyApprovedAt: timestamp('safety_approved_at'),
  isLocked: boolean('is_locked').default(false).notNull(),
  revisionNumber: integer('revision_number').default(1).notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),
  archivedReason: text('archived_reason'),
  archivedBy: text('archived_by'),
  archivedAt: timestamp('archived_at'),
  extensionRequestedUntil: text('extension_requested_until'),
  extensionRequestReason: text('extension_request_reason'),
  closureRequestedAt: timestamp('closure_requested_at'),
  closureRequestedBy: text('closure_requested_by'),
  extensionHistory: jsonb('extension_history').$type<Record<string, unknown>[]>().default([]).notNull(),
  approvalHistory: jsonb('approval_history').$type<Record<string, unknown>[]>().default([]).notNull(),
  qrToken: text('qr_token').notNull(),
  status: text('status').default('Pending Department Head Approval').notNull(),
  isDemo: boolean('is_demo').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const lotoRecords = pgTable('loto_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  plantId: uuid('plant_id').references(() => plants.id, { onDelete: 'set null' }),
  permitId: uuid('permit_id').references(() => workPermits.id, { onDelete: 'set null' }),
  lotoNumber: text('loto_number').notNull(),
  equipmentId: text('equipment_id').notNull(),
  equipmentName: text('equipment_name').notNull(),
  energySources: jsonb('energy_sources').$type<string[]>().default([]).notNull(),
  isolationPoints: jsonb('isolation_points').$type<Record<string, unknown>[]>().default([]).notNull(),
  lockNumber: text('lock_number').notNull(),
  tagNumber: text('tag_number').notNull(),
  authorizedEmployee: text('authorized_employee').notNull(),
  zeroEnergyVerified: boolean('zero_energy_verified').default(false).notNull(),
  zeroEnergyVerifiedBy: text('zero_energy_verified_by'),
  groupLotoLead: text('group_loto_lead'),
  status: text('status').default('Isolated').notNull(),
  approvalHistory: jsonb('approval_history').$type<Record<string, unknown>[]>().default([]).notNull(),
  isDemo: boolean('is_demo').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const safetyObservations = pgTable('safety_observations', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  plantId: uuid('plant_id').references(() => plants.id, { onDelete: 'set null' }),
  departmentId: uuid('department_id').references(() => departments.id, {
    onDelete: 'set null',
  }),
  plantName: text('plant_name'),
  departmentName: text('department_name'),
  observationNumber: text('observation_number').notNull(),
  title: text('title').notNull(),
  observationType: text('observation_type').notNull(), // Unsafe Act | Unsafe Condition | Safe Act | Near Miss | Stop Work
  category: text('category').notNull(),
  severity: text('severity').default('Medium').notNull(),
  likelihood: text('likelihood').default('Possible').notNull(),
  riskLevel: text('risk_level').default('Medium').notNull(),
  description: text('description').notNull(),
  location: text('location'),
  areaName: text('area_name'),
  inputSource: text('input_source').default('Text').notNull(),
  beforePhotoData: text('before_photo_data'),
  afterPhotoData: text('after_photo_data'),
  aiAnalysis: jsonb('ai_analysis').$type<Record<string, unknown>>().default({}).notNull(),
  humanVerified: boolean('human_verified').default(false).notNull(),
  verifiedBy: text('verified_by'),
  immediateAction: text('immediate_action'),
  correctiveAction: text('corrective_action'),
  preventiveAction: text('preventive_action'),
  responsibleDepartment: text('responsible_department'),
  actionOwner: text('action_owner'),
  targetDate: text('target_date'),
  status: text('status').default('Open').notNull(),
  coachingNotes: text('coaching_notes'),
  reportedByName: text('reported_by_name'),
  isDemo: boolean('is_demo').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const riskAssessments = pgTable('risk_assessments', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  plantId: uuid('plant_id').references(() => plants.id, { onDelete: 'set null' }),
  departmentId: uuid('department_id').references(() => departments.id, {
    onDelete: 'set null',
  }),
  assessmentNumber: text('assessment_number').notNull(),
  methodology: text('methodology').default('HIRA').notNull(), // HIRA | HAZOP | JSA | JHA | SWMS | LMRA | Task Risk | Environmental | Ergonomic
  title: text('title').notNull(),
  activityOrNode: text('activity_or_node').notNull(),
  guideword: text('guideword'),
  deviation: text('deviation'),
  jobSteps: text('job_steps'),
  hazardCategory: text('hazard_category').default('Mechanical').notNull(),
  hazard: text('hazard').notNull(),
  potentialConsequences: text('potential_consequences').notNull(),
  existingControls: text('existing_controls'),
  likelihood: integer('likelihood').default(3).notNull(),
  severity: integer('severity').default(3).notNull(),
  initialRiskScore: integer('initial_risk_score').default(9).notNull(),
  additionalControls: text('additional_controls'),
  residualLikelihood: integer('residual_likelihood').default(1).notNull(),
  residualSeverity: integer('residual_severity').default(2).notNull(),
  residualRiskScore: integer('residual_risk_score').default(2).notNull(),
  responsiblePerson: text('responsible_person'),
  reviewDate: text('review_date'),
  status: text('status').default('Draft').notNull(),
  aiSuggested: boolean('ai_suggested').default(false).notNull(),
  approvedBy: text('approved_by'),
  revision: integer('revision').default(1).notNull(),
  isDemo: boolean('is_demo').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const safetyAudits = pgTable('safety_audits', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  plantId: uuid('plant_id').references(() => plants.id, { onDelete: 'set null' }),
  departmentId: uuid('department_id').references(() => departments.id, {
    onDelete: 'set null',
  }),
  auditNumber: text('audit_number').notNull(),
  auditType: text('audit_type').notNull(),
  templateId: uuid('template_id'),
  title: text('title').notNull(),
  scheduledDate: text('scheduled_date').notNull(),
  leadAuditor: text('lead_auditor').notNull(),
  auditTeam: jsonb('audit_team').$type<string[]>().default([]).notNull(),
  checklistResponses: jsonb('checklist_responses').$type<Record<string, unknown>[]>().default([]).notNull(),
  totalItems: integer('total_items').default(0).notNull(),
  compliantItems: integer('compliant_items').default(0).notNull(),
  nonCompliantItems: integer('non_compliant_items').default(0).notNull(),
  complianceScore: doublePrecision('compliance_score').default(100).notNull(),
  findings: jsonb('findings').$type<Record<string, unknown>[]>().default([]).notNull(),
  status: text('status').default('Planned').notNull(),
  isDemo: boolean('is_demo').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const equipmentAssets = pgTable('equipment_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  plantId: uuid('plant_id').references(() => plants.id, { onDelete: 'set null' }),
  equipmentId: text('equipment_id').notNull(),
  assetNumber: text('asset_number').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  location: text('location').notNull(),
  inspectionFrequency: text('inspection_frequency').default('Monthly').notNull(),
  lastInspectionDate: text('last_inspection_date'),
  nextDueDate: text('next_due_date').notNull(),
  certificationNumber: text('certification_number'),
  inspectorName: text('inspector_name'),
  checklistItems: jsonb('checklist_items').$type<Record<string, unknown>[]>().default([]).notNull(),
  defectsFound: text('defects_found'),
  status: text('status').default('Operational').notNull(),
  isDemo: boolean('is_demo').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const contractors = pgTable('contractors', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  plantId: uuid('plant_id').references(() => plants.id, { onDelete: 'set null' }),
  vendorCode: text('vendor_code').notNull(),
  companyName: text('company_name').notNull(),
  gstNumber: text('gst_number'),
  esiNumber: text('esi_number'),
  pfNumber: text('pf_number'),
  licenseNumber: text('license_number'),
  licenseExpiry: text('license_expiry'),
  insuranceExpiry: text('insurance_expiry'),
  supervisorName: text('supervisor_name').notNull(),
  supervisorPhone: text('supervisor_phone'),
  evaluationScore: integer('evaluation_score').default(85).notNull(),
  status: text('status').default('Active').notNull(),
  complianceDocs: jsonb('compliance_docs').$type<Record<string, unknown>[]>().default([]).notNull(),
  isDemo: boolean('is_demo').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const contractorWorkers = pgTable('contractor_workers', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  contractorId: uuid('contractor_id').references(() => contractors.id, {
    onDelete: 'cascade',
  }),
  plantId: uuid('plant_id').references(() => plants.id, { onDelete: 'set null' }),
  workerId: text('worker_id').notNull(),
  fullName: text('full_name').notNull(),
  skillCategory: text('skill_category').notNull(),
  qualification: text('qualification'),
  medicalFitnessDate: text('medical_fitness_date'),
  medicalExpiry: text('medical_expiry'),
  inductionDate: text('induction_date'),
  safetyTrainingExpiry: text('safety_training_expiry'),
  insuranceInfo: text('insurance_info'),
  qrCodeToken: text('qr_code_token').notNull(),
  monthlyManhours: integer('monthly_manhours').default(0).notNull(),
  attendanceStatus: text('attendance_status').default('Off Site').notNull(),
  isDemo: boolean('is_demo').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const trainingRecords = pgTable('training_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  plantId: uuid('plant_id').references(() => plants.id, { onDelete: 'set null' }),
  trainingNumber: text('training_number').notNull(),
  category: text('category').notNull(),
  title: text('title').notNull(),
  trainerName: text('trainer_name').notNull(),
  scheduledDate: text('scheduled_date').notNull(),
  durationHours: doublePrecision('duration_hours').default(2).notNull(),
  attendees: jsonb('attendees').$type<{ name: string; role: string; passed: boolean; score?: number }[]>().default([]).notNull(),
  materialUrl: text('material_url'),
  quizScore: integer('quiz_score').default(0).notNull(),
  passingScore: integer('passing_score').default(80).notNull(),
  certificateNumber: text('certificate_number'),
  renewalDate: text('renewal_date'),
  effectivenessRating: integer('effectiveness_rating').default(4).notNull(),
  status: text('status').default('Scheduled').notNull(),
  isDemo: boolean('is_demo').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const emergencyRecords = pgTable('emergency_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  plantId: uuid('plant_id').references(() => plants.id, { onDelete: 'set null' }),
  recordType: text('record_type').notNull(), // ERP | Mock Drill | Fire Equipment | Assembly Point | Contact
  title: text('title').notNull(),
  scenarioType: text('scenario_type'),
  drillDate: text('drill_date'),
  responseTimeSeconds: integer('response_time_seconds'),
  participantsCount: integer('participants_count').default(0).notNull(),
  assemblyPoint: text('assembly_point'),
  emergencyContacts: jsonb('emergency_contacts').$type<Record<string, unknown>[]>().default([]).notNull(),
  lessonsLearned: text('lessons_learned'),
  status: text('status').default('Active').notNull(),
  isDemo: boolean('is_demo').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const environmentRecords = pgTable('environment_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  plantId: uuid('plant_id').references(() => plants.id, { onDelete: 'set null' }),
  recordType: text('record_type').notNull(),
  framework: text('framework').default('ISO 14001').notNull(),
  metricName: text('metric_name').notNull(),
  quantity: doublePrecision('quantity').notNull(),
  unit: text('unit').notNull(),
  limitValue: doublePrecision('limit_value'),
  monitoringDate: text('monitoring_date').notNull(),
  complianceStatus: text('compliance_status').default('Within Limit').notNull(),
  notes: text('notes'),
  isDemo: boolean('is_demo').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const legalCompliances = pgTable('legal_compliances', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  plantId: uuid('plant_id').references(() => plants.id, { onDelete: 'set null' }),
  country: text('country').default('Global / Configurable').notNull(),
  state: text('state').default('Central / All States').notNull(),
  industry: text('industry').default('General').notNull(),
  category: text('category').default('Legal Compliance').notNull(), // Legal Compliance | ISO Management System | International Standard | ESG & Sustainability
  statuteName: text('statute_name').notNull(),
  sectionRef: text('section_ref').notNull(),
  obligation: text('obligation').notNull(),
  applicability: text('applicability').default('Pending Assessment').notNull(), // Pending Assessment | Applicable | Not Applicable
  effectiveDate: text('effective_date'),
  amendmentRef: text('amendment_ref'),
  sourceReference: text('source_reference'),
  responsiblePerson: text('responsible_person').notNull(),
  frequency: text('frequency').default('Annual').notNull(),
  dueDate: text('due_date').notNull(),
  complianceStatus: text('compliance_status').default('Under Legal Review').notNull(),
  evidenceSummary: text('evidence_summary'),
  verifiedBy: text('verified_by'),
  revisionNotes: text('revision_notes'),
  isDemo: boolean('is_demo').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const weeklySafetyActivities = pgTable('weekly_safety_activities', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  plantId: uuid('plant_id').references(() => plants.id, { onDelete: 'set null' }),
  parentCategory: text('parent_category').notNull(),
  childCategory: text('child_category').notNull(),
  activityName: text('activity_name').notNull(),
  responsiblePerson: text('responsible_person').notNull(),
  departmentName: text('department_name'),
  weekLabel: text('week_label').notNull(),
  targetDate: text('target_date').notNull(),
  completionDate: text('completion_date'),
  status: text('status').default('Not Started').notNull(),
  evidenceNotes: text('evidence_notes'),
  remarks: text('remarks'),
  approvedBy: text('approved_by'),
  isDemo: boolean('is_demo').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const ppeInventory = pgTable('ppe_inventory', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  plantId: uuid('plant_id').references(() => plants.id, { onDelete: 'set null' }),
  itemCode: text('item_code').notNull(),
  itemName: text('item_name').notNull(),
  category: text('category').notNull(),
  currentStock: integer('current_stock').default(0).notNull(),
  minStock: integer('min_stock').default(10).notNull(),
  unit: text('unit').default('Units').notNull(),
  expiryDate: text('expiry_date'),
  lastRestockedAt: text('last_restocked_at'),
  transactions: jsonb('transactions').$type<Record<string, unknown>[]>().default([]).notNull(),
  isDemo: boolean('is_demo').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const gateEntries = pgTable('gate_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  plantId: uuid('plant_id').references(() => plants.id, { onDelete: 'set null' }),
  passNumber: text('pass_number').notNull(),
  entryType: text('entry_type').notNull(),
  personOrDriverName: text('person_or_driver_name').notNull(),
  companyName: text('company_name'),
  vehicleNumber: text('vehicle_number'),
  materialDetails: text('material_details'),
  permitNumber: text('permit_number'),
  inductionVerified: boolean('induction_verified').default(false).notNull(),
  restrictedAreaAccess: boolean('restricted_area_access').default(false).notNull(),
  qrPassToken: text('qr_pass_token').notNull(),
  status: text('status').default('Checked In').notNull(),
  entryTime: timestamp('entry_time').defaultNow().notNull(),
  exitTime: timestamp('exit_time'),
  verifiedBy: text('verified_by'),
  isDemo: boolean('is_demo').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const safetyCommittees = pgTable('safety_committees', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  plantId: uuid('plant_id').references(() => plants.id, { onDelete: 'set null' }),
  recordType: text('record_type').notNull(), // Meeting | Member | Welfare Check | Feedback
  title: text('title').notNull(),
  meetingDate: text('meeting_date').notNull(),
  members: jsonb('members').$type<Record<string, unknown>[]>().default([]).notNull(),
  agenda: text('agenda'),
  minutes: text('minutes'),
  welfareChecklist: jsonb('welfare_checklist').$type<Record<string, unknown>>().default({}).notNull(),
  actionPoints: jsonb('action_points').$type<Record<string, unknown>[]>().default([]).notNull(),
  status: text('status').default('Scheduled').notNull(),
  isDemo: boolean('is_demo').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const aiKnowledgeBase = pgTable('ai_knowledge_base', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  docType: text('doc_type').notNull(),
  title: text('title').notNull(),
  sourceReference: text('source_reference').notNull(),
  contentText: text('content_text').notNull(),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  approvedBy: text('approved_by'),
  isActive: boolean('is_active').default(true).notNull(),
  isDemo: boolean('is_demo').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const industryTemplates = pgTable('industry_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  industryName: text('industry_name').notNull(),
  description: text('description'),
  modules: jsonb('modules').$type<Record<string, unknown>[]>().default([]).notNull(),
  hazards: jsonb('hazards').$type<string[]>().default([]).notNull(),
  permitTypes: jsonb('permit_types').$type<string[]>().default([]).notNull(),
  checklists: jsonb('checklists').$type<Record<string, unknown>[]>().default([]).notNull(),
  legalCategories: jsonb('legal_categories').$type<string[]>().default([]).notNull(),
  isCustom: boolean('is_custom').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// PLATFORM OWNER SUPER ADMIN — USER LOGIN, ACTIVITY & GOVERNANCE TABLES
// ============================================================================
export const userLoginLogs = pgTable('user_login_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  uid: text('uid').notNull(),
  email: text('email').notNull(),
  fullName: text('full_name').notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
  organizationName: text('organization_name'),
  eventType: text('event_type').default('login').notNull(), // login | logout | failed_login
  deviceType: text('device_type').default('Desktop').notNull(),
  browser: text('browser'),
  sessionDurationSeconds: integer('session_duration_seconds'),
  accountStatus: text('account_status').default('Active').notNull(),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  loggedInAt: timestamp('logged_in_at').defaultNow().notNull(),
});

export const activityLogs = pgTable(
  'activity_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    uid: text('uid'),
    userEmail: text('user_email'),
    userName: text('user_name'),
    userRole: text('user_role'),
    departmentName: text('department_name'),
    moduleName: text('module_name').notNull(),
    activityType: text('activity_type').notNull(), // module_access | dashboard_view | record_create | record_edit | record_submit | record_approve | record_reject | record_archive | export_download
    recordId: text('record_id'),
    summary: text('summary'),
    deviceType: text('device_type'),
    ipAddress: text('ip_address'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('activity_logs_org_created_idx').on(table.organizationId, table.createdAt)]
);

// ============================================================================
// 3-STAGE PERMIT-TO-WORK APPROVALS, REVISIONS & EXTENSIONS
// ============================================================================
export const permitApprovals = pgTable(
  'permit_approvals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    permitId: uuid('permit_id')
      .references(() => workPermits.id, { onDelete: 'cascade' })
      .notNull(),
    stage: text('stage').notNull(), // REQUESTER | DEPARTMENT_HEAD | SAFETY_DEPARTMENT | SYSTEM
    userId: uuid('user_id'),
    userName: text('user_name').notNull(),
    userRole: text('user_role').notNull(),
    departmentName: text('department_name'),
    action: text('action').notNull(),
    comments: text('comments'),
    previousStatus: text('previous_status').notNull(),
    newStatus: text('new_status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('permit_approvals_permit_idx').on(table.permitId, table.createdAt)]
);

export const permitRevisions = pgTable('permit_revisions', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  permitId: uuid('permit_id')
    .references(() => workPermits.id, { onDelete: 'cascade' })
    .notNull(),
  revisionNumber: integer('revision_number').notNull(),
  changedBy: uuid('changed_by'),
  changedByName: text('changed_by_name').notNull(),
  reason: text('reason').notNull(),
  previousSnapshot: jsonb('previous_snapshot').$type<Record<string, unknown>>().default({}).notNull(),
  updatedSnapshot: jsonb('updated_snapshot').$type<Record<string, unknown>>().default({}).notNull(),
  requiresReapproval: boolean('requires_reapproval').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const permitExtensions = pgTable('permit_extensions', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  permitId: uuid('permit_id')
    .references(() => workPermits.id, { onDelete: 'cascade' })
    .notNull(),
  requestedBy: uuid('requested_by'),
  requestedByName: text('requested_by_name').notNull(),
  previousEndDate: text('previous_end_date').notNull(),
  requestedEndDate: text('requested_end_date').notNull(),
  reason: text('reason').notNull(),
  status: text('status').default('Pending Safety Approval').notNull(), // Pending Safety Approval | Approved | Rejected
  decidedBy: uuid('decided_by'),
  decidedByName: text('decided_by_name'),
  decisionComments: text('decision_comments'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  decidedAt: timestamp('decided_at'),
});

// ============================================================================
// WORKFORCE & 6-CATEGORY ENTERPRISE KPI ARCHITECTURE
// ============================================================================
export const workforceRecords = pgTable('workforce_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  plantId: uuid('plant_id').references(() => plants.id, { onDelete: 'set null' }),
  departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
  workerCode: text('worker_code').notNull(),
  fullName: text('full_name').notNull(),
  workerCategory: text('worker_category').default('Permanent').notNull(), // Permanent | Contract | Temporary | Visitor | Third-Party
  designation: text('designation'),
  departmentName: text('department_name'),
  shiftName: text('shift_name').default('Day Shift').notNull(),
  projectName: text('project_name'),
  contractorName: text('contractor_name'),
  inductionCompleted: boolean('induction_completed').default(true).notNull(),
  medicalFitnessValid: boolean('medical_fitness_valid').default(true).notNull(),
  ppeIssued: boolean('ppe_issued').default(true).notNull(),
  trainingCoveragePct: integer('training_coverage_pct').default(100).notNull(),
  regularHours: doublePrecision('regular_hours').default(176).notNull(),
  overtimeHours: doublePrecision('overtime_hours').default(0).notNull(),
  tbtParticipations: integer('tbt_participations').default(4).notNull(),
  safetyIdNumber: text('safety_id_number'),
  attendanceStatus: text('attendance_status').default('Active').notNull(),
  isDemo: boolean('is_demo').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const kpiCategories = pgTable('kpi_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  code: text('code').notNull(), // WORKFORCE | LAGGING | LEADING | ACTIONS | PERMITS | COMPLIANCE
  name: text('name').notNull(),
  description: text('description'),
  displayOrder: integer('display_order').default(1).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const kpiDefinitions = pgTable('kpi_definitions', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  categoryCode: text('category_code').notNull(),
  metricKey: text('metric_key').notNull(),
  metricName: text('metric_name').notNull(),
  unit: text('unit').default('Count').notNull(),
  formulaDescription: text('formula_description'),
  targetValue: doublePrecision('target_value'),
  direction: text('direction').default('higher_is_better').notNull(), // higher_is_better | lower_is_better
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const kpiRecords = pgTable('kpi_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  plantId: uuid('plant_id').references(() => plants.id, { onDelete: 'set null' }),
  departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
  categoryCode: text('category_code').notNull(),
  metricKey: text('metric_key').notNull(),
  periodLabel: text('period_label').notNull(), // e.g., 2026-11 or 2026-Q4
  value: doublePrecision('value').notNull(),
  denominator: doublePrecision('denominator'),
  notes: text('notes'),
  recordedBy: uuid('recorded_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// DYNAMIC HOMEPAGE CMS — SERVICES, INDUSTRIES, SITE CONFIG & DEMO REQUESTS
// ============================================================================
export const cmsServices = pgTable('cms_services', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(),
  title: text('title').notNull(),
  shortDescription: text('short_description').notNull(),
  icon: text('icon').default('ShieldCheck').notNull(),
  accentColor: text('accent_color').default('#FFC629').notNull(),
  subcategories: jsonb('subcategories').$type<string[]>().default([]).notNull(),
  complianceNote: text('compliance_note'),
  displayOrder: integer('display_order').default(0).notNull(),
  isVisible: boolean('is_visible').default(true).notNull(),
  isSystem: boolean('is_system').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const cmsIndustries = pgTable('cms_industries', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  shortName: text('short_name').notNull(),
  description: text('description').notNull(),
  imageUrl: text('image_url'),
  icon: text('icon').default('Factory').notNull(),
  accentColor: text('accent_color').default('#00BFFF').notNull(),
  capabilities: jsonb('capabilities').$type<string[]>().default([]).notNull(),
  recommendedModules: jsonb('recommended_modules').$type<string[]>().default([]).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  isVisible: boolean('is_visible').default(true).notNull(),
  isExpandable: boolean('is_expandable').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const cmsSiteSettings = pgTable('cms_site_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull().unique(),
  config: jsonb('config').$type<Record<string, unknown>>().default({}).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const demoRequests = pgTable('demo_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  fullName: text('full_name').notNull(),
  workEmail: text('work_email').notNull(),
  companyName: text('company_name').notNull(),
  industry: text('industry').default('Manufacturing').notNull(),
  phone: text('phone'),
  message: text('message'),
  status: text('status').default('New').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// SCALABLE NOTIFICATION ENGINE, SECURITY TELEMETRY & COST QUOTA GOVERNANCE
// ============================================================================

export const notificationDeliveryLogs = pgTable('notification_delivery_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  notificationId: uuid('notification_id').references(() => notifications.id, { onDelete: 'set null' }),
  eventCategory: text('event_category').notNull(), // emergency | overdue_task | training_expiry | certificate_expiry | incident_escalation | demo_request | quota_alert | security
  channel: text('channel').notNull(), // in_app | email | push | sms | discord
  provider: text('provider').notNull(), // postgres_in_app | resend | fcm | twilio | fast2sms | discord
  recipient: text('recipient').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  status: text('status').default('unconfigured').notNull(), // delivered | failed | retrying | unconfigured
  attemptCount: integer('attempt_count').default(1).notNull(),
  maxRetries: integer('max_retries').default(3).notNull(),
  httpStatus: integer('http_status'),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  lastAttemptAt: timestamp('last_attempt_at').defaultNow().notNull(),
  nextRetryAt: timestamp('next_retry_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notificationEscalationRules = pgTable('notification_escalation_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  ruleName: text('rule_name').notNull(),
  eventCategory: text('event_category').notNull(), // emergency | overdue_task | training_expiry | certificate_expiry | incident_escalation | quota_alert
  channels: jsonb('channels').$type<string[]>().default(['in_app', 'email']).notNull(),
  triggerThresholdHours: integer('trigger_threshold_hours').default(24).notNull(),
  escalateToRole: text('escalate_to_role').default('Super Admin').notNull(),
  escalateToEmail: text('escalate_to_email').default('jonathan.tadanki@gmail.com'),
  escalateToPhone: text('escalate_to_phone').default('+919133661933'),
  maxRetries: integer('max_retries').default(3).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const pushDeviceTokens = pgTable('push_device_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  token: text('token').notNull().unique(),
  platform: text('platform').default('web').notNull(), // web | android | ios
  browser: text('browser'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const securityEvents = pgTable('security_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
  eventType: text('event_type').notNull(), // RATE_LIMIT_EXCEEDED | UNAUTHORIZED_ACCESS | FORBIDDEN_ACCESS | INVALID_FILE_UPLOAD | PRIVILEGE_ESCALATION_BLOCKED
  severity: text('severity').default('warning').notNull(), // info | warning | high | critical
  userEmail: text('user_email'),
  ipAddress: text('ip_address'),
  endpoint: text('endpoint').notNull(),
  method: text('method').default('GET').notNull(),
  details: jsonb('details').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const apiErrorLogs = pgTable('api_error_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
  method: text('method').notNull(),
  path: text('path').notNull(),
  statusCode: integer('status_code').default(500).notNull(),
  errorMessage: text('error_message').notNull(),
  userEmail: text('user_email'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const platformUsageQuotas = pgTable('platform_usage_quotas', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').default('default').notNull().unique(),
  planName: text('plan_name').default('Zero-Cost Starter Tier').notNull(),
  targetUserBand: text('target_user_band').default('50–500 Active Users').notNull(),
  maxCompanies: integer('max_companies').default(25).notNull(),
  maxUsers: integer('max_users').default(500).notNull(),
  maxSites: integer('max_sites').default(100).notNull(),
  maxDatabaseMb: integer('max_database_mb').default(500).notNull(),
  maxStorageMb: integer('max_storage_mb').default(1024).notNull(),
  maxMonthlyEmails: integer('max_monthly_emails').default(3000).notNull(),
  maxMonthlyNotifications: integer('max_monthly_notifications').default(25000).notNull(),
  warningThresholdPct: integer('warning_threshold_pct').default(80).notNull(),
  autoPaidUpgradeEnabled: boolean('auto_paid_upgrade_enabled').default(false).notNull(),
  spendingAlertEmail: text('spending_alert_email').default('jonathan.tadanki@gmail.com').notNull(),
  spendingAlertDiscordEnabled: boolean('spending_alert_discord_enabled').default(true).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});



