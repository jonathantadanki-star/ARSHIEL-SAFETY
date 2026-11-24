export interface OrgBranding {
  companyName?: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  reportHeader?: string;
  reportFooter?: string;
  tagline?: string;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  industry: string;
  branding: OrgBranding;
  profile: Record<string, unknown>;
  settings: Record<string, unknown>;
  isDemo: boolean;
}

export interface RoleItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  level: number;
  isSystem: boolean;
}

export interface AuthUser {
  id: string;
  uid: string;
  email: string;
  fullName: string;
  organizationId: string;
  plantId: string | null;
  departmentId: string | null;
  departmentName?: string | null;
  designation: string | null;
  avatarUrl: string | null;
  roles: RoleItem[];
  primaryRoleName?: string;
  isSuperAdmin: boolean;
  isPlatformOwner?: boolean;
  canDeptHeadApprove?: boolean;
  canSafetyApprove?: boolean;
  isAuditorReadOnly?: boolean;
  permissionsByModule?: Record<string, string[]>;
}

export interface ModuleConfig {
  enableForms?: boolean;
  enableChecklists?: boolean;
  enableWorkflow?: boolean;
  enableReports?: boolean;
  enableNotifications?: boolean;
  assignedPlantIds?: string[];
  assignedDepartmentIds?: string[];
}

export interface AppModule {
  id: string;
  organizationId: string;
  parentId: string | null;
  moduleCode: string;
  moduleName: string;
  slug: string;
  description: string;
  moduleType: string;
  builtInKey: string | null;
  icon: string;
  colour: string;
  displayOrder: number;
  isActive: boolean;
  isVisible: boolean;
  isPublished: boolean;
  isArchived: boolean;
  isSystem: boolean;
  configuration: ModuleConfig;
  children?: AppModule[];
}

export interface Plant {
  id: string;
  businessUnitId?: string | null;
  name: string;
  code: string;
  location?: string;
  state?: string;
  address?: string;
  headName?: string;
  totalEmployees: number;
  totalContractors: number;
  monthlyManhours: number;
}

export interface Department {
  id: string;
  plantId: string;
  name: string;
  code: string;
  hodName?: string;
}

export interface Area {
  id: string;
  plantId: string;
  departmentId?: string | null;
  name: string;
  code: string;
  riskLevel: string;
}

export interface LocationItem {
  id: string;
  plantId: string;
  departmentId?: string | null;
  areaId?: string | null;
  name: string;
  code: string;
}

export interface FacilityHierarchy {
  businessUnits: { id: string; name: string; code: string; headName?: string }[];
  plants: Plant[];
  departments: Department[];
  areas: Area[];
  locations: LocationItem[];
}

export interface OfflineDraft {
  id: string;
  endpoint: string;
  method: string;
  label: string;
  payload: Record<string, unknown>;
  createdAt: string;
}
