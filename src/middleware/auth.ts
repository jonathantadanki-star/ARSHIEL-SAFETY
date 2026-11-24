import type { Request, Response, NextFunction } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { and, eq, isNull } from 'drizzle-orm';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import {
  activityLogs,
  auditLogs,
  departments,
  modulePermissions,
  modules,
  organizations,
  roles,
  userRoles,
  users,
} from '../db/schema.ts';
import { seedOrganizationData } from '../db/seed.ts';

export const PLATFORM_OWNER_EMAIL = 'jonathan.tadanki@gmail.com';

export const ALL_15_PERMISSIONS = [
  'view',
  'create',
  'edit',
  'submit',
  'approve',
  'reject',
  'verify',
  'assign',
  'close',
  'extend',
  'suspend',
  'revalidate',
  'export',
  'delete',
  'configure',
] as const;

export type PermissionAction = (typeof ALL_15_PERMISSIONS)[number];

export function getDefaultPermissionsForRoleSlug(slug: string): string[] {
  const s = (slug || '').toLowerCase();
  if (s === 'super-admin') return [...ALL_15_PERMISSIONS];
  if (s === 'system-admin' || s === 'company-admin') {
    return ['view', 'create', 'edit', 'export', 'configure'];
  }
  if (
    s === 'ehs-manager' ||
    s === 'safety-manager' ||
    s === 'corporate-ehs-head' ||
    s === 'ehs-hse-safety-manager'
  ) {
    return [
      'view',
      'create',
      'edit',
      'submit',
      'approve',
      'reject',
      'verify',
      'assign',
      'close',
      'extend',
      'suspend',
      'revalidate',
      'export',
    ];
  }
  if (s === 'safety-officer') {
    return ['view', 'create', 'edit', 'submit', 'verify', 'assign', 'export'];
  }
  if (s === 'department-head' || s === 'department-head-manager' || s === 'plant-head') {
    return ['view', 'create', 'edit', 'submit', 'approve', 'reject', 'assign', 'export'];
  }
  if (s === 'supervisor' || s === 'engineer') {
    return ['view', 'create', 'edit', 'submit', 'export'];
  }
  if (s === 'auditor' || s === 'management-viewer') {
    return ['view', 'export'];
  }
  if (s === 'contractor' || s === 'contractor-admin' || s === 'contractor-supervisor') {
    return ['view', 'create', 'submit'];
  }
  // Employee / Worker / default least privilege
  return ['view', 'create', 'submit'];
}

export interface AuthContextUser {
  id: string;
  uid: string;
  email: string;
  fullName: string;
  organizationId: string;
  plantId: string | null;
  departmentId: string | null;
  departmentName: string | null;
  designation: string | null;
  avatarUrl: string | null;
  roles: { id: string; name: string; slug: string; level: number }[];
  primaryRoleName: string;
  isSuperAdmin: boolean;
  isPlatformOwner: boolean;
  canDeptHeadApprove: boolean;
  canSafetyApprove: boolean;
  isAuditorReadOnly: boolean;
  permissionsByModule: Record<string, string[]>;
}

export interface AuthRequest extends Request {
  firebaseUser?: DecodedIdToken;
  authUser?: AuthContextUser;
  organizationId?: string;
}

export function extractClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  return (
    (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]?.trim()) ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

export function detectBrowserAndDevice(ua: string): { deviceType: string; browser: string } {
  const lower = (ua || '').toLowerCase();
  let deviceType = 'Desktop';
  if (/ipad|tablet|playbook|silk/.test(lower)) deviceType = 'Tablet';
  else if (/iphone|ipod|ios/.test(lower)) deviceType = 'iOS';
  else if (/android/.test(lower)) deviceType = 'Android';

  let browser = 'Unknown';
  if (/edg\//.test(lower)) browser = 'Microsoft Edge';
  else if (/opr\/|opera/.test(lower)) browser = 'Opera';
  else if (/chrome|crios/.test(lower) && !/edg\//.test(lower)) browser = 'Google Chrome';
  else if (/firefox|fxios/.test(lower)) browser = 'Mozilla Firefox';
  else if (/safari/.test(lower) && !/chrome/.test(lower)) browser = 'Safari';
  else if (/curl/.test(lower)) browser = 'API Client';

  return { deviceType, browser };
}

export async function writeAuditLog(params: {
  organizationId: string | null;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  userRole?: string | null;
  departmentName?: string | null;
  moduleName?: string | null;
  recordNumber?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  previousValue?: Record<string, unknown> | null;
  updatedValue?: Record<string, unknown> | null;
  reasonForChange?: string | null;
  approvalStatus?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string;
}) {
  try {
    await db.insert(auditLogs).values({
      organizationId: params.organizationId,
      userId: params.userId ?? null,
      userEmail: params.userEmail ?? null,
      userName: params.userName ?? null,
      userRole: params.userRole ?? null,
      departmentName: params.departmentName ?? null,
      moduleName: params.moduleName ?? params.entityType,
      recordNumber: params.recordNumber ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      previousValue: params.previousValue ?? null,
      updatedValue: params.updatedValue ?? null,
      reasonForChange: params.reasonForChange ?? null,
      approvalStatus: params.approvalStatus ?? null,
      details: params.details ?? {},
      ipAddress: params.ipAddress ?? null,
    });
  } catch (err) {
    console.error('Audit log write failed:', err);
  }
}

export async function writeActivityLog(params: {
  organizationId: string | null;
  userId?: string | null;
  uid?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  userRole?: string | null;
  departmentName?: string | null;
  moduleName: string;
  activityType: string;
  recordId?: string | null;
  summary?: string | null;
  deviceType?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    // Never log passwords, secrets, or tokens
    const safeMetadata: Record<string, unknown> = {};
    if (params.metadata) {
      for (const [k, v] of Object.entries(params.metadata)) {
        if (!/password|token|secret|credential|auth/i.test(k)) {
          safeMetadata[k] = v;
        }
      }
    }
    await db.insert(activityLogs).values({
      organizationId: params.organizationId,
      userId: params.userId ?? null,
      uid: params.uid ?? null,
      userEmail: params.userEmail ?? null,
      userName: params.userName ?? null,
      userRole: params.userRole ?? null,
      departmentName: params.departmentName ?? null,
      moduleName: params.moduleName,
      activityType: params.activityType,
      recordId: params.recordId ?? null,
      summary: params.summary ?? null,
      deviceType: params.deviceType ?? null,
      ipAddress: params.ipAddress ?? null,
      metadata: safeMetadata,
    });
  } catch (err) {
    console.error('Activity log write failed:', err);
  }
}

async function provisionUserAndWorkspace(decoded: DecodedIdToken) {
  const email = (decoded.email || `${decoded.uid}@arshiel.local`).trim();
  const isOwner = email.toLowerCase() === PLATFORM_OWNER_EMAIL;
  const fullName = decoded.name || email.split('@')[0] || 'EHS User';
  const avatarUrl = decoded.picture || null;

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.uid, decoded.uid))
    .limit(1);

  if (existing && existing.organizationId) {
    await db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        avatarUrl: avatarUrl ?? existing.avatarUrl,
        ...(isOwner && existing.designation !== 'Platform Creator & Super Admin'
          ? { designation: 'Platform Creator & Super Admin' }
          : {}),
      })
      .where(eq(users.id, existing.id));
    return existing;
  }

  // Check if an invited user record already exists with this email
  const [invitedByEmail] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (invitedByEmail && invitedByEmail.organizationId && invitedByEmail.uid.startsWith('invited-')) {
    const [claimed] = await db
      .update(users)
      .set({
        uid: decoded.uid,
        fullName: decoded.name || invitedByEmail.fullName,
        avatarUrl: avatarUrl ?? invitedByEmail.avatarUrl,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, invitedByEmail.id))
      .returning();
    return claimed;
  }

  // Create an isolated workspace organization for the user so the platform is
  // free to use & share while strictly enforcing multi-tenant isolation.
  const orgCode = `ORG-${decoded.uid.slice(0, 6).toUpperCase()}`;
  const orgName = isOwner
    ? 'ARSHIEL Global EHS Enterprise'
    : `${fullName.split(' ')[0]}'s EHS Workspace`;

  const [newOrg] = await db
    .insert(organizations)
    .values({
      name: orgName,
      code: `${orgCode}-${Math.floor(100 + Math.random() * 900)}`,
      industry: 'Manufacturing',
      isDemo: true,
      createdByUid: decoded.uid,
      branding: {
        companyName: orgName,
        primaryColor: '#0F172A',
        accentColor: '#15803D',
        reportHeader: `${orgName} — EHS Compliance Record`,
        reportFooter: 'Generated via ARSHIEL SAFETY · Owner: Jonathan Thadanki',
        tagline: 'Zero Harm. Proactive Prevention.',
      },
      profile: {
        country: 'India',
        standard: 'ISO 45001:2018 & ISO 14001:2015',
      },
    })
    .returning();

  const [upsertedUser] = await db
    .insert(users)
    .values({
      uid: decoded.uid,
      organizationId: newOrg.id,
      email,
      fullName,
      avatarUrl,
      // STRICT SOLE SUPER ADMIN: Non-owner accounts start as least-privilege Employee / Worker
      designation: isOwner ? 'Platform Creator & Super Admin' : 'Employee / Worker',
      employeeCode: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        email,
        fullName,
        avatarUrl,
        organizationId: newOrg.id,
        lastLoginAt: new Date(),
      },
    })
    .returning();

  await seedOrganizationData(newOrg.id, upsertedUser.id, {
    withSampleData: true,
    assignSuperAdmin: isOwner,
  });

  await writeAuditLog({
    organizationId: newOrg.id,
    userId: upsertedUser.id,
    userEmail: email,
    userName: fullName,
    userRole: isOwner ? 'Super Admin' : 'Employee / Worker',
    moduleName: 'Workspace',
    action: 'WORKSPACE_PROVISIONED',
    entityType: 'organization',
    entityId: newOrg.id,
    details: { orgName, seededSampleData: true, initialRole: isOwner ? 'Super Admin' : 'Employee / Worker' },
  });

  return upsertedUser;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.firebaseUser = decoded;

    const userRow = await provisionUserAndWorkspace(decoded);
    const isPlatformOwner = userRow.email.toLowerCase() === PLATFORM_OWNER_EMAIL;

    // Enforce account activation status (Super Admin cannot lock themselves out)
    if (!userRow.isActive && !isPlatformOwner) {
      return res.status(403).json({
        error: 'Account deactivated by Super Admin. Please contact your ARSHIEL SAFETY administrator.',
      });
    }

    let activeOrgId = userRow.organizationId!;

    // Allow switching between organizations that the user created, belongs to, or (for sole Super Admin) manages
    const requestedOrgId = req.headers['x-organization-id'];
    if (typeof requestedOrgId === 'string' && requestedOrgId.trim()) {
      const [orgCheck] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, requestedOrgId.trim()))
        .limit(1);
      if (
        orgCheck &&
        (isPlatformOwner ||
          orgCheck.createdByUid === decoded.uid ||
          userRow.organizationId === orgCheck.id)
      ) {
        activeOrgId = orgCheck.id;
      }
    }

    // Load department name if assigned
    let departmentName: string | null = null;
    if (userRow.departmentId) {
      const [dept] = await db
        .select({ name: departments.name })
        .from(departments)
        .where(eq(departments.id, userRow.departmentId))
        .limit(1);
      departmentName = dept?.name || null;
    }

    // Load assigned roles for active org
    let assignedRoleRows = await db
      .select({
        id: roles.id,
        name: roles.name,
        slug: roles.slug,
        level: roles.level,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(
        and(
          eq(userRoles.userId, userRow.id),
          eq(userRoles.organizationId, activeOrgId)
        )
      );

    // STRICT SOLE SUPER ADMIN ENFORCEMENT:
    // 1. Only PLATFORM_OWNER_EMAIL (Jonathan Thadanki) may hold Super Admin authority.
    // 2. Strip any legacy super-admin assignment from non-owner accounts and default to Employee / Worker.
    if (isPlatformOwner) {
      if (!assignedRoleRows.some((r) => r.slug === 'super-admin')) {
        const [saRole] = await db
          .select({ id: roles.id, name: roles.name, slug: roles.slug, level: roles.level })
          .from(roles)
          .where(and(eq(roles.organizationId, activeOrgId), eq(roles.slug, 'super-admin')))
          .limit(1);
        if (saRole) {
          assignedRoleRows = [saRole, ...assignedRoleRows];
        } else {
          assignedRoleRows = [
            { id: 'platform-super-admin', name: 'Super Admin', slug: 'super-admin', level: 100 },
            ...assignedRoleRows,
          ];
        }
      }
    } else {
      // Remove any accidental super-admin or company-admin elevation from non-owner accounts
      const nonSuperRoles = assignedRoleRows.filter((r) => r.slug !== 'super-admin');
      if (nonSuperRoles.length !== assignedRoleRows.length) {
        // Also ensure DB reflects least-privilege if they only had legacy super-admin
        const [empRole] = await db
          .select({ id: roles.id, name: roles.name, slug: roles.slug, level: roles.level })
          .from(roles)
          .where(and(eq(roles.organizationId, activeOrgId), eq(roles.slug, 'employee')))
          .limit(1);
        if (nonSuperRoles.length === 0 && empRole) {
          assignedRoleRows = [empRole];
        } else {
          assignedRoleRows = nonSuperRoles;
        }
      }
      if (assignedRoleRows.length === 0) {
        const [empRole] = await db
          .select({ id: roles.id, name: roles.name, slug: roles.slug, level: roles.level })
          .from(roles)
          .where(and(eq(roles.organizationId, activeOrgId), eq(roles.slug, 'employee')))
          .limit(1);
        assignedRoleRows = empRole
          ? [empRole]
          : [{ id: 'default-employee', name: 'Employee / Worker', slug: 'employee', level: 20 }];
      }
    }

    const isSuperAdmin = isPlatformOwner;

    const roleSlugs = assignedRoleRows.map((r) => r.slug.toLowerCase());
    const roleNames = assignedRoleRows.map((r) => r.name.toLowerCase());

    const canDeptHeadApprove =
      isSuperAdmin ||
      roleSlugs.some((s) => ['department-head', 'department-head-manager', 'plant-head'].includes(s)) ||
      roleNames.some((n) => n.includes('department head') || n.includes('hod') || n.includes('plant head'));

    const canSafetyApprove =
      isSuperAdmin ||
      roleSlugs.some((s) =>
        ['ehs-manager', 'safety-manager', 'corporate-ehs-head', 'ehs-hse-safety-manager'].includes(s)
      ) ||
      roleNames.some(
        (n) =>
          n.includes('ehs manager') ||
          n.includes('safety manager') ||
          n.includes('hse manager') ||
          n.includes('corporate ehs')
      );

    const isAuditorReadOnly =
      !isSuperAdmin &&
      assignedRoleRows.length > 0 &&
      assignedRoleRows.every((r) => ['auditor', 'management-viewer'].includes(r.slug.toLowerCase()));

    // Compute effective per-module 15-permission map from DB module_permissions + role defaults
    const permissionsByModule: Record<string, string[]> = {};
    const orgModules = await db
      .select({ id: modules.id, builtInKey: modules.builtInKey, moduleCode: modules.moduleCode })
      .from(modules)
      .where(and(eq(modules.organizationId, activeOrgId), isNull(modules.deletedAt)));

    if (isSuperAdmin) {
      for (const m of orgModules) {
        const key = m.builtInKey || m.moduleCode;
        permissionsByModule[key] = [...ALL_15_PERMISSIONS];
      }
      permissionsByModule['*'] = [...ALL_15_PERMISSIONS];
    } else {
      const roleIds = assignedRoleRows.map((r) => r.id).filter((id) => id.includes('-'));
      const dbPerms = await db
        .select()
        .from(modulePermissions)
        .where(eq(modulePermissions.organizationId, activeOrgId));

      const permsByModId = new Map<string, Set<string>>();
      for (const mp of dbPerms) {
        if (!roleIds.includes(mp.roleId)) continue;
        const existingSet = permsByModId.get(mp.moduleId) || new Set<string>();
        for (const a of mp.allowedActions || []) existingSet.add(a);
        permsByModId.set(mp.moduleId, existingSet);
      }

      // Compute union of default actions for user's roles as fallback when no explicit module_permission row exists
      const defaultActionSet = new Set<string>();
      for (const r of assignedRoleRows) {
        for (const a of getDefaultPermissionsForRoleSlug(r.slug)) {
          defaultActionSet.add(a);
        }
      }
      const defaultActions = Array.from(defaultActionSet);

      for (const m of orgModules) {
        const key = m.builtInKey || m.moduleCode;
        const explicit = permsByModId.get(m.id);
        permissionsByModule[key] = explicit ? Array.from(explicit) : defaultActions;
      }
      permissionsByModule['*'] = defaultActions;
    }

    const sortedRoles = [...assignedRoleRows].sort((a, b) => b.level - a.level);
    const primaryRoleName = isPlatformOwner
      ? 'Super Admin'
      : sortedRoles[0]?.name || 'Employee / Worker';

    req.organizationId = activeOrgId;
    req.authUser = {
      id: userRow.id,
      uid: userRow.uid,
      email: userRow.email,
      fullName: userRow.fullName,
      organizationId: activeOrgId,
      plantId: userRow.plantId,
      departmentId: userRow.departmentId,
      departmentName,
      designation: userRow.designation,
      avatarUrl: userRow.avatarUrl,
      roles: sortedRoles,
      primaryRoleName,
      isSuperAdmin,
      isPlatformOwner,
      canDeptHeadApprove,
      canSafetyApprove,
      isAuditorReadOnly,
      permissionsByModule,
    };

    next();
  } catch (error) {
    console.error('Auth verification error:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
  }
};

export function hasModulePermission(
  authUser: AuthContextUser | undefined,
  moduleKey: string,
  action: PermissionAction
): boolean {
  if (!authUser) return false;
  if (authUser.isPlatformOwner || authUser.isSuperAdmin) return true;
  if (authUser.isAuditorReadOnly && action !== 'view' && action !== 'export') return false;
  const actions = authUser.permissionsByModule[moduleKey] || authUser.permissionsByModule['*'] || [];
  return actions.includes(action);
}

export function requireModulePermission(moduleKey: string, action: PermissionAction) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const authUser = req.authUser;
    if (!authUser) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }
    if (!hasModulePermission(authUser, moduleKey, action)) {
      return res.status(403).json({
        error: `Forbidden: Role "${authUser.primaryRoleName}" does not have "${action}" permission on "${moduleKey}".`,
      });
    }
    return next();
  };
}

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const authUser = req.authUser;
  if (!authUser) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }
  if (!authUser.isPlatformOwner || authUser.email.toLowerCase() !== PLATFORM_OWNER_EMAIL) {
    return res.status(403).json({
      error: 'Forbidden: Sole Super Admin (Platform Owner) privileges required.',
    });
  }
  return next();
}

export function requireRole(allowedSlugs: string[]) {
  const normalized = allowedSlugs.map((s) => s.toLowerCase());
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const authUser = req.authUser;
    if (!authUser) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }
    if (authUser.isPlatformOwner || authUser.isSuperAdmin) {
      return next();
    }
    const userSlugs = (authUser.roles || []).map((r) => r.slug.toLowerCase());
    const userNames = (authUser.roles || []).map((r) => r.name.toLowerCase());
    const permitted = normalized.some(
      (slug) => userSlugs.includes(slug) || userNames.some((n) => n.includes(slug.replace('-', ' ')))
    );
    if (!permitted) {
      return res.status(403).json({
        error: 'Forbidden: Your account role does not have permission for this action.',
      });
    }
    return next();
  };
}
