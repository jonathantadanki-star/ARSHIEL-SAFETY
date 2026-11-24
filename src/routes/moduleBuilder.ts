import { Router } from 'express';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  approvalHistory,
  approvalInstances,
  approvalSteps,
  approvalWorkflows,
  capas,
  checklistItems,
  formFields,
  formSubmissions,
  moduleAssignments,
  moduleChecklists,
  moduleForms,
  modulePermissions,
  moduleReports,
  modules,
  moduleVersions,
  roles,
  safetyAudits,
} from '../db/schema.ts';
import { type AuthRequest, requireSuperAdmin, writeAuditLog } from '../middleware/auth.ts';

const router = Router();

async function checkModulePermission(
  req: AuthRequest,
  moduleId: string,
  action: string
): Promise<boolean> {
  const auth = req.authUser;
  if (!auth) return false;
  if (auth.isSuperAdmin) return true;

  const perms = await db
    .select()
    .from(modulePermissions)
    .where(
      and(
        eq(modulePermissions.organizationId, req.organizationId!),
        eq(modulePermissions.moduleId, moduleId)
      )
    );

  // If no explicit permission matrix rows are set on this module, allow standard access
  if (perms.length === 0) return true;

  const userRoleIds = new Set(auth.roles.map((r) => r.id));
  return perms.some(
    (p) =>
      userRoleIds.has(p.roleId) &&
      (p.allowedActions.includes(action) || p.allowedActions.includes('manage'))
  );
}

// Helper: Detect circular hierarchy when changing parentId
async function wouldCreateCycle(
  organizationId: string,
  moduleId: string,
  candidateParentId: string | null
): Promise<boolean> {
  if (!candidateParentId) return false;
  if (candidateParentId === moduleId) return true;

  const allMods = await db
    .select({ id: modules.id, parentId: modules.parentId })
    .from(modules)
    .where(and(eq(modules.organizationId, organizationId), isNull(modules.deletedAt)));

  const parentMap = new Map<string, string | null>();
  for (const m of allMods) parentMap.set(m.id, m.parentId);

  let current: string | null = candidateParentId;
  const visited = new Set<string>();
  while (current) {
    if (current === moduleId) return true;
    if (visited.has(current)) return true;
    visited.add(current);
    current = parentMap.get(current) ?? null;
  }
  return false;
}

// GET /api/modules - List all modules (unlimited levels)
router.get('/modules', async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const includeArchived = req.query.includeArchived === 'true';

    const rows = await db
      .select()
      .from(modules)
      .where(and(eq(modules.organizationId, orgId), isNull(modules.deletedAt)))
      .orderBy(asc(modules.displayOrder), asc(modules.createdAt));

    const OWNER_ONLY_KEYS = new Set(['module-builder', 'settings']);
    const OWNER_ONLY_CODES = new Set(['MOD-BLD', 'MOD-SET']);
    const visibleToUser = req.authUser?.isPlatformOwner
      ? rows
      : rows.filter(
          (r) => !OWNER_ONLY_KEYS.has(r.builtInKey || '') && !OWNER_ONLY_CODES.has(r.moduleCode || '')
        );

    const filtered = includeArchived ? visibleToUser : visibleToUser.filter((r) => !r.isArchived);
    res.json(filtered);
  } catch (error) {
    console.error('Failed to fetch modules:', error);
    res.status(500).json({ error: 'Failed to load modules' });
  }
});

// POST /api/modules - Create Parent, Child, Sub-Child, or N-level Nested module (Sole Super Admin Only)
router.post('/modules', requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const {
      parentId,
      moduleName,
      moduleCode,
      description,
      moduleType,
      builtInKey,
      icon,
      colour,
      isActive,
      isVisible,
      isPublished,
      configuration,
    } = req.body;

    if (!moduleName || !moduleName.trim()) {
      return res.status(400).json({ error: 'Module name is required' });
    }

    const code =
      (moduleCode && moduleCode.trim()) ||
      `MOD-${moduleName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const slug = `${moduleName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}-${Date.now().toString().slice(-4)}`;

    // Verify parent belongs to same tenant if provided
    if (parentId) {
      const [parent] = await db
        .select()
        .from(modules)
        .where(and(eq(modules.id, parentId), eq(modules.organizationId, orgId)))
        .limit(1);
      if (!parent) {
        return res.status(400).json({ error: 'Invalid parent module' });
      }
    }

    const siblings = await db
      .select()
      .from(modules)
      .where(and(eq(modules.organizationId, orgId), isNull(modules.deletedAt)));

    const maxOrder = siblings
      .filter((s) => (s.parentId ?? null) === (parentId ?? null))
      .reduce((acc, s) => Math.max(acc, s.displayOrder), 0);

    const [created] = await db
      .insert(modules)
      .values({
        organizationId: orgId,
        parentId: parentId || null,
        moduleCode: code,
        moduleName: moduleName.trim(),
        slug,
        description: description || '',
        moduleType: moduleType || 'custom',
        builtInKey: builtInKey ?? null,
        icon: icon || 'Layers',
        colour: colour || '#15803D',
        displayOrder: maxOrder + 1,
        isActive: isActive ?? true,
        isVisible: isVisible ?? true,
        isPublished: isPublished ?? true,
        isArchived: false,
        isSystem: false,
        configuration: configuration || {
          enableForms: true,
          enableChecklists: true,
          enableWorkflow: true,
          enableReports: true,
          enableNotifications: true,
        },
        createdBy: req.authUser!.id,
        updatedBy: req.authUser!.id,
      })
      .returning();

    // Save initial version snapshot
    await db.insert(moduleVersions).values({
      organizationId: orgId,
      moduleId: created.id,
      versionNumber: 1,
      snapshot: created as unknown as Record<string, unknown>,
      changedBy: req.authUser!.id,
      changeSummary: 'Created module',
    });

    await writeAuditLog({
      organizationId: orgId,
      userId: req.authUser!.id,
      userName: req.authUser!.fullName,
      action: 'CREATE_MODULE',
      entityType: 'module',
      entityId: created.id,
      details: { moduleName: created.moduleName, moduleCode: created.moduleCode, parentId: created.parentId },
    });

    res.status(201).json(created);
  } catch (error: any) {
    console.error('Failed to create module:', error);
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'Module code already exists in this organization' });
    }
    res.status(500).json({ error: 'Failed to create module' });
  }
});

// PATCH /api/modules/:id - Edit, rename, move parent, toggle status/visibility/archive (Sole Super Admin Only)
router.patch('/modules/:id', requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const moduleId = req.params.id;

    const [existing] = await db
      .select()
      .from(modules)
      .where(and(eq(modules.id, moduleId), eq(modules.organizationId, orgId), isNull(modules.deletedAt)))
      .limit(1);

    if (!existing) return res.status(404).json({ error: 'Module not found' });

    const nextParentId =
      req.body.parentId !== undefined ? req.body.parentId || null : existing.parentId;

    if (nextParentId !== existing.parentId) {
      const hasCycle = await wouldCreateCycle(orgId, moduleId, nextParentId);
      if (hasCycle) {
        return res.status(400).json({
          error: 'Circular hierarchy prevented: a module cannot be moved inside itself or its descendants.',
        });
      }
    }

    const [updated] = await db
      .update(modules)
      .set({
        parentId: nextParentId,
        moduleName: req.body.moduleName !== undefined ? req.body.moduleName.trim() : existing.moduleName,
        moduleCode: req.body.moduleCode !== undefined ? req.body.moduleCode.trim() : existing.moduleCode,
        description: req.body.description !== undefined ? req.body.description : existing.description,
        icon: req.body.icon !== undefined ? req.body.icon : existing.icon,
        colour: req.body.colour !== undefined ? req.body.colour : existing.colour,
        displayOrder: req.body.displayOrder !== undefined ? Number(req.body.displayOrder) : existing.displayOrder,
        isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : existing.isActive,
        isVisible: req.body.isVisible !== undefined ? Boolean(req.body.isVisible) : existing.isVisible,
        isPublished: req.body.isPublished !== undefined ? Boolean(req.body.isPublished) : existing.isPublished,
        isArchived: req.body.isArchived !== undefined ? Boolean(req.body.isArchived) : existing.isArchived,
        configuration:
          req.body.configuration !== undefined
            ? { ...existing.configuration, ...req.body.configuration }
            : existing.configuration,
        updatedBy: req.authUser!.id,
        updatedAt: new Date(),
      })
      .where(and(eq(modules.id, moduleId), eq(modules.organizationId, orgId)))
      .returning();

    const versions = await db
      .select()
      .from(moduleVersions)
      .where(eq(moduleVersions.moduleId, moduleId));

    await db.insert(moduleVersions).values({
      organizationId: orgId,
      moduleId,
      versionNumber: versions.length + 1,
      snapshot: updated as unknown as Record<string, unknown>,
      changedBy: req.authUser!.id,
      changeSummary: req.body.changeSummary || 'Updated module configuration',
    });

    await writeAuditLog({
      organizationId: orgId,
      userId: req.authUser!.id,
      userName: req.authUser!.fullName,
      action: 'UPDATE_MODULE',
      entityType: 'module',
      entityId: moduleId,
      details: { moduleName: updated.moduleName, isArchived: updated.isArchived, isActive: updated.isActive },
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to update module:', error);
    res.status(500).json({ error: 'Failed to update module' });
  }
});

// POST /api/modules/:id/duplicate - Duplicate a module (Sole Super Admin Only)
router.post('/modules/:id/duplicate', requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const [source] = await db
      .select()
      .from(modules)
      .where(and(eq(modules.id, req.params.id), eq(modules.organizationId, orgId)))
      .limit(1);

    if (!source) return res.status(404).json({ error: 'Module not found' });

    const suffix = Math.floor(100 + Math.random() * 900);
    const [dup] = await db
      .insert(modules)
      .values({
        organizationId: orgId,
        parentId: source.parentId,
        moduleCode: `${source.moduleCode}-COPY-${suffix}`,
        moduleName: `${source.moduleName} (Copy)`,
        slug: `${source.slug}-copy-${suffix}`,
        description: source.description,
        moduleType: 'custom',
        builtInKey: source.builtInKey,
        icon: source.icon,
        colour: source.colour,
        displayOrder: source.displayOrder + 1,
        isActive: source.isActive,
        isVisible: source.isVisible,
        isPublished: false,
        isSystem: false,
        configuration: source.configuration,
        createdBy: req.authUser!.id,
      })
      .returning();

    res.status(201).json(dup);
  } catch (error) {
    console.error('Failed to duplicate module:', error);
    res.status(500).json({ error: 'Failed to duplicate module' });
  }
});

// POST /api/modules/reorder - Drag-and-drop reordering & reparenting (Sole Super Admin Only)
router.post('/modules/reorder', requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const { items } = req.body as { items: { id: string; parentId: string | null; displayOrder: number }[] };
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array required' });
    }

    for (const item of items) {
      if (item.parentId) {
        const cycle = await wouldCreateCycle(orgId, item.id, item.parentId);
        if (cycle) {
          return res.status(400).json({ error: 'Reorder would create circular parent relationship' });
        }
      }
      await db
        .update(modules)
        .set({
          parentId: item.parentId ?? null,
          displayOrder: item.displayOrder,
          updatedAt: new Date(),
        })
        .where(and(eq(modules.id, item.id), eq(modules.organizationId, orgId)));
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reorder modules' });
  }
});

// DELETE /api/modules/:id - Dependency-checked soft deletion (Sole Super Admin Only)
router.delete('/modules/:id', requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const moduleId = req.params.id;
    const force = req.query.force === 'true';

    const [existing] = await db
      .select()
      .from(modules)
      .where(and(eq(modules.id, moduleId), eq(modules.organizationId, orgId), isNull(modules.deletedAt)))
      .limit(1);

    if (!existing) return res.status(404).json({ error: 'Module not found' });

    const childModules = await db
      .select()
      .from(modules)
      .where(and(eq(modules.organizationId, orgId), eq(modules.parentId, moduleId), isNull(modules.deletedAt)));

    if (childModules.length > 0) {
      return res.status(409).json({
        error: `Dependency check failed: module has ${childModules.length} active child module(s). Move, archive, or delete child modules first.`,
      });
    }

    const submissions = await db
      .select()
      .from(formSubmissions)
      .where(and(eq(formSubmissions.organizationId, orgId), eq(formSubmissions.moduleId, moduleId)));

    if (submissions.length > 0 && !force) {
      return res.status(409).json({
        error: `Dependency check: ${submissions.length} historical submission(s) exist. Archive the module instead to preserve compliance records.`,
        canArchive: true,
      });
    }

    await db
      .update(modules)
      .set({ deletedAt: new Date(), isActive: false, isVisible: false })
      .where(and(eq(modules.id, moduleId), eq(modules.organizationId, orgId)));

    await writeAuditLog({
      organizationId: orgId,
      userId: req.authUser!.id,
      userName: req.authUser!.fullName,
      action: 'DELETE_MODULE',
      entityType: 'module',
      entityId: moduleId,
      details: { moduleName: existing.moduleName },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete module' });
  }
});

// Module Permissions (15 Granular Actions — Super Admin ALWAYS locked to full 15 actions)
router.get('/modules/:id/permissions', async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const moduleId = req.params.id;
    const [perms, orgRoles] = await Promise.all([
      db
        .select()
        .from(modulePermissions)
        .where(
          and(
            eq(modulePermissions.organizationId, orgId),
            eq(modulePermissions.moduleId, moduleId)
          )
        ),
      db.select().from(roles).where(eq(roles.organizationId, orgId)),
    ]);

    const permByRole = new Map(perms.map((p) => [p.roleId, p]));
    const { ALL_15_PERMISSIONS, getDefaultPermissionsForRoleSlug } = await import('../middleware/auth.ts');

    const normalized = orgRoles.map((r) => {
      if (r.slug === 'super-admin') {
        return {
          id: permByRole.get(r.id)?.id || `sa-${r.id}`,
          organizationId: orgId,
          moduleId,
          roleId: r.id,
          allowedActions: [...ALL_15_PERMISSIONS],
          locked: true,
        };
      }
      const existing = permByRole.get(r.id);
      if (existing) return existing;
      return {
        id: `default-${r.id}`,
        organizationId: orgId,
        moduleId,
        roleId: r.id,
        allowedActions: getDefaultPermissionsForRoleSlug(r.slug),
      };
    });

    res.json(normalized);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load module permissions' });
  }
});

router.put('/modules/:id/permissions', async (req: AuthRequest, res) => {
  try {
    const authUser = req.authUser!;
    if (!authUser.isSuperAdmin) {
      return res.status(403).json({
        error: 'Forbidden: Only Sole Super Admin can modify role permission matrices.',
      });
    }

    const orgId = req.organizationId!;
    const moduleId = req.params.id;
    const { roleId, allowedActions, plantId, departmentId } = req.body;

    const [targetRole] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.id, roleId), eq(roles.organizationId, orgId)))
      .limit(1);

    if (!targetRole) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const { ALL_15_PERMISSIONS } = await import('../middleware/auth.ts');
    if (targetRole.slug === 'super-admin') {
      return res.status(403).json({
        error: 'Super Admin automatically retains all 15 permissions and cannot be restricted.',
      });
    }

    const validSet = new Set<string>(ALL_15_PERMISSIONS);
    const cleanedActions = Array.isArray(allowedActions)
      ? Array.from(new Set(allowedActions.filter((a: unknown) => typeof a === 'string' && validSet.has(a))))
      : ['view'];

    const [prevPerm] = await db
      .select()
      .from(modulePermissions)
      .where(
        and(
          eq(modulePermissions.organizationId, orgId),
          eq(modulePermissions.moduleId, moduleId),
          eq(modulePermissions.roleId, roleId)
        )
      )
      .limit(1);

    await db
      .delete(modulePermissions)
      .where(
        and(
          eq(modulePermissions.organizationId, orgId),
          eq(modulePermissions.moduleId, moduleId),
          eq(modulePermissions.roleId, roleId)
        )
      );

    const [created] = await db
      .insert(modulePermissions)
      .values({
        organizationId: orgId,
        moduleId,
        roleId,
        plantId: plantId || null,
        departmentId: departmentId || null,
        allowedActions: cleanedActions,
      })
      .returning();

    await writeAuditLog({
      organizationId: orgId,
      userId: authUser.id,
      userEmail: authUser.email,
      userName: authUser.fullName,
      userRole: 'Super Admin',
      moduleName: 'RBAC Permission Matrix',
      action: 'UPDATE_ROLE_PERMISSIONS',
      entityType: 'module_permission',
      entityId: moduleId,
      recordNumber: targetRole.name,
      previousValue: { role: targetRole.name, allowedActions: prevPerm?.allowedActions || [] },
      updatedValue: { role: targetRole.name, allowedActions: cleanedActions },
      reasonForChange: 'Permission matrix updated by Super Admin',
      approvalStatus: 'Applied',
    });

    res.json(created);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save module permissions' });
  }
});

// Module Version History & Rollback
router.get('/modules/:id/versions', async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(moduleVersions)
      .where(
        and(
          eq(moduleVersions.organizationId, req.organizationId!),
          eq(moduleVersions.moduleId, req.params.id)
        )
      )
      .orderBy(desc(moduleVersions.versionNumber));
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load module version history' });
  }
});

router.post('/modules/:id/versions/:versionId/restore', requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const [ver] = await db
      .select()
      .from(moduleVersions)
      .where(
        and(
          eq(moduleVersions.id, req.params.versionId),
          eq(moduleVersions.moduleId, req.params.id),
          eq(moduleVersions.organizationId, orgId)
        )
      )
      .limit(1);

    if (!ver) return res.status(404).json({ error: 'Version snapshot not found' });

    const snap = ver.snapshot as Record<string, any>;
    const [restored] = await db
      .update(modules)
      .set({
        moduleName: snap.moduleName,
        description: snap.description ?? '',
        icon: snap.icon ?? 'Layers',
        colour: snap.colour ?? '#15803D',
        isActive: snap.isActive ?? true,
        isVisible: snap.isVisible ?? true,
        isPublished: snap.isPublished ?? true,
        isArchived: snap.isArchived ?? false,
        configuration: snap.configuration ?? {},
        updatedBy: req.authUser!.id,
        updatedAt: new Date(),
      })
      .where(and(eq(modules.id, req.params.id), eq(modules.organizationId, orgId)))
      .returning();

    const versions = await db
      .select()
      .from(moduleVersions)
      .where(eq(moduleVersions.moduleId, req.params.id));

    await db.insert(moduleVersions).values({
      organizationId: orgId,
      moduleId: req.params.id,
      versionNumber: versions.length + 1,
      snapshot: restored as unknown as Record<string, unknown>,
      changedBy: req.authUser!.id,
      changeSummary: `Restored from v${ver.versionNumber}`,
    });

    await writeAuditLog({
      organizationId: orgId,
      userId: req.authUser!.id,
      userName: req.authUser!.fullName,
      action: 'RESTORE_MODULE_VERSION',
      entityType: 'module',
      entityId: req.params.id,
      details: { restoredFromVersion: ver.versionNumber },
    });

    res.json(restored);
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore module version' });
  }
});

// Module Plant / Department / User Assignments
router.get('/modules/:id/assignments', async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(moduleAssignments)
      .where(
        and(
          eq(moduleAssignments.organizationId, req.organizationId!),
          eq(moduleAssignments.moduleId, req.params.id)
        )
      );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load module assignments' });
  }
});

router.put('/modules/:id/assignments', requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const moduleId = req.params.id;
    const { plantIds = [], departmentIds = [] } = req.body as {
      plantIds?: string[];
      departmentIds?: string[];
    };

    await db
      .delete(moduleAssignments)
      .where(
        and(
          eq(moduleAssignments.organizationId, orgId),
          eq(moduleAssignments.moduleId, moduleId)
        )
      );

    const inserts: any[] = [];
    for (const pid of plantIds) {
      inserts.push({ organizationId: orgId, moduleId, plantId: pid, departmentId: null });
    }
    for (const did of departmentIds) {
      inserts.push({ organizationId: orgId, moduleId, plantId: null, departmentId: did });
    }
    if (inserts.length > 0) {
      await db.insert(moduleAssignments).values(inserts);
    }

    const [existingMod] = await db
      .select()
      .from(modules)
      .where(and(eq(modules.id, moduleId), eq(modules.organizationId, orgId)))
      .limit(1);

    if (existingMod) {
      await db
        .update(modules)
        .set({
          configuration: {
            ...existingMod.configuration,
            assignedPlantIds: plantIds,
            assignedDepartmentIds: departmentIds,
          },
          updatedAt: new Date(),
        })
        .where(eq(modules.id, moduleId));
    }

    res.json({ success: true, plantIds, departmentIds });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save module assignments' });
  }
});

// ============================================================================
// CUSTOM FORM ENGINE (Unlimited fields, 19 field types, JSONB submissions)
// ============================================================================

router.get('/modules/:moduleId/forms', async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const forms = await db
      .select()
      .from(moduleForms)
      .where(and(eq(moduleForms.organizationId, orgId), eq(moduleForms.moduleId, req.params.moduleId)))
      .orderBy(asc(moduleForms.createdAt));

    const result = await Promise.all(
      forms.map(async (f) => {
        const fields = await db
          .select()
          .from(formFields)
          .where(eq(formFields.formId, f.id))
          .orderBy(asc(formFields.displayOrder));
        return { ...f, fields };
      })
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load module forms' });
  }
});

router.post('/modules/:moduleId/forms', requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const { formName, description, fields } = req.body;
    const formCode = `FRM-${Date.now().toString().slice(-6)}`;

    const [form] = await db
      .insert(moduleForms)
      .values({
        organizationId: orgId,
        moduleId: req.params.moduleId,
        formName: formName || 'Custom EHS Form',
        formCode,
        description: description || '',
        createdBy: req.authUser!.id,
      })
      .returning();

    if (Array.isArray(fields) && fields.length > 0) {
      await db.insert(formFields).values(
        fields.map((f: any, idx: number) => ({
          organizationId: orgId,
          formId: form.id,
          fieldKey: f.fieldKey || `field_${idx + 1}`,
          label: f.label,
          fieldType: f.fieldType || 'text',
          placeholder: f.placeholder || '',
          helpText: f.helpText || '',
          isRequired: Boolean(f.isRequired),
          defaultValue: f.defaultValue || '',
          options: f.options || [],
          validationRules: f.validationRules || {},
          conditionalLogic: f.conditionalLogic || {},
          displayOrder: idx + 1,
          sectionName: f.sectionName || 'General Details',
        }))
      );
    }

    const savedFields = await db
      .select()
      .from(formFields)
      .where(eq(formFields.formId, form.id))
      .orderBy(asc(formFields.displayOrder));

    res.status(201).json({ ...form, fields: savedFields });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create form' });
  }
});

router.post('/forms/:formId/fields', requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const existingFields = await db
      .select()
      .from(formFields)
      .where(eq(formFields.formId, req.params.formId));

    const [field] = await db
      .insert(formFields)
      .values({
        organizationId: orgId,
        formId: req.params.formId,
        fieldKey: req.body.fieldKey || `fld_${Date.now().toString().slice(-5)}`,
        label: req.body.label,
        fieldType: req.body.fieldType || 'text',
        placeholder: req.body.placeholder || '',
        helpText: req.body.helpText || '',
        isRequired: Boolean(req.body.isRequired),
        defaultValue: req.body.defaultValue || '',
        options: req.body.options || [],
        validationRules: req.body.validationRules || {},
        conditionalLogic: req.body.conditionalLogic || {},
        displayOrder: existingFields.length + 1,
        sectionName: req.body.sectionName || 'General Details',
      })
      .returning();

    res.status(201).json(field);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add form field' });
  }
});

router.delete('/form-fields/:fieldId', requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    await db
      .delete(formFields)
      .where(
        and(eq(formFields.id, req.params.fieldId), eq(formFields.organizationId, req.organizationId!))
      );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete form field' });
  }
});

router.get('/modules/:moduleId/submissions', async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(formSubmissions)
      .where(
        and(
          eq(formSubmissions.organizationId, req.organizationId!),
          eq(formSubmissions.moduleId, req.params.moduleId)
        )
      )
      .orderBy(desc(formSubmissions.createdAt));
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch form submissions' });
  }
});

router.post('/forms/:formId/submissions', async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const [form] = await db
      .select()
      .from(moduleForms)
      .where(and(eq(moduleForms.id, req.params.formId), eq(moduleForms.organizationId, orgId)))
      .limit(1);

    if (!form) return res.status(404).json({ error: 'Form not found' });

    const allowed = await checkModulePermission(req, form.moduleId, 'submit');
    if (!allowed) {
      return res.status(403).json({ error: 'Forbidden: Your role lacks submit permission on this module.' });
    }

    const fields = await db
      .select()
      .from(formFields)
      .where(eq(formFields.formId, form.id));

    const data = req.body.data || {};
    for (const f of fields) {
      const val = data[f.fieldKey];
      const empty = val === undefined || val === '' || val === null || (Array.isArray(val) && val.length === 0);
      if (f.isRequired && empty) {
        return res.status(400).json({ error: `Mandatory field "${f.label}" is required.` });
      }
      const rules = (f.validationRules || {}) as Record<string, any>;
      if (!empty && typeof val === 'string') {
        if (rules.minLength && val.length < Number(rules.minLength)) {
          return res.status(400).json({ error: `"${f.label}" must be at least ${rules.minLength} characters.` });
        }
        if (rules.maxLength && val.length > Number(rules.maxLength)) {
          return res.status(400).json({ error: `"${f.label}" must be at most ${rules.maxLength} characters.` });
        }
      }
      if (!empty && f.fieldType === 'number') {
        const numVal = Number(val);
        if (rules.min !== undefined && rules.min !== '' && numVal < Number(rules.min)) {
          return res.status(400).json({ error: `"${f.label}" must be >= ${rules.min}.` });
        }
        if (rules.max !== undefined && rules.max !== '' && numVal > Number(rules.max)) {
          return res.status(400).json({ error: `"${f.label}" must be <= ${rules.max}.` });
        }
      }
    }

    const activeWorkflows = await db
      .select()
      .from(approvalWorkflows)
      .where(
        and(
          eq(approvalWorkflows.organizationId, orgId),
          eq(approvalWorkflows.moduleId, form.moduleId),
          eq(approvalWorkflows.isActive, true)
        )
      )
      .limit(1);

    const hasWorkflow = activeWorkflows.length > 0;
    const summary = Object.values(data)
      .filter((v) => typeof v === 'string' || typeof v === 'number')
      .slice(0, 4)
      .join(' · ');

    const submissionNumber = `SUB-${Date.now().toString().slice(-6)}`;
    const [submission] = await db
      .insert(formSubmissions)
      .values({
        organizationId: orgId,
        moduleId: form.moduleId,
        formId: form.id,
        plantId: req.body.plantId || null,
        departmentId: req.body.departmentId || null,
        submittedBy: req.authUser!.id,
        submittedByName: req.authUser!.fullName,
        submissionNumber,
        status: req.body.status || (hasWorkflow ? 'Pending Approval' : 'Submitted'),
        data,
        searchableSummary: summary,
      })
      .returning();

    let approvalInstance = null;
    if (hasWorkflow) {
      const wf = activeWorkflows[0];
      const [inst] = await db
        .insert(approvalInstances)
        .values({
          organizationId: orgId,
          workflowId: wf.id,
          moduleId: form.moduleId,
          entityType: 'form_submission',
          entityId: submission.id,
          entityNumber: submissionNumber,
          currentStepOrder: 1,
          status: 'Pending',
          submittedBy: req.authUser!.id,
          submittedByName: req.authUser!.fullName,
        })
        .returning();

      await db.insert(approvalHistory).values({
        organizationId: orgId,
        instanceId: inst.id,
        stepOrder: 1,
        action: 'submit',
        actorId: req.authUser!.id,
        actorName: req.authUser!.fullName,
        comments: `Submitted ${form.formName} into workflow "${wf.workflowName}"`,
      });
      approvalInstance = inst;
    }

    res.status(201).json({ ...submission, approvalInstance });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit form' });
  }
});

router.patch('/form-submissions/:id', async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const [existing] = await db
      .select()
      .from(formSubmissions)
      .where(and(eq(formSubmissions.id, req.params.id), eq(formSubmissions.organizationId, orgId)))
      .limit(1);

    if (!existing) return res.status(404).json({ error: 'Submission not found' });

    const allowed = await checkModulePermission(req, existing.moduleId, 'edit');
    if (!allowed) {
      return res.status(403).json({ error: 'Forbidden: Your role lacks edit permission on this module.' });
    }

    const nextData = req.body.data ?? existing.data;
    const summary = Object.values(nextData)
      .filter((v) => typeof v === 'string' || typeof v === 'number')
      .slice(0, 4)
      .join(' · ');

    const [updated] = await db
      .update(formSubmissions)
      .set({
        data: nextData,
        status: req.body.status ?? existing.status,
        searchableSummary: summary || existing.searchableSummary,
        updatedAt: new Date(),
      })
      .where(eq(formSubmissions.id, existing.id))
      .returning();

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update submission' });
  }
});

router.delete('/form-submissions/:id', async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const [existing] = await db
      .select()
      .from(formSubmissions)
      .where(and(eq(formSubmissions.id, req.params.id), eq(formSubmissions.organizationId, orgId)))
      .limit(1);

    if (!existing) return res.status(404).json({ error: 'Submission not found' });

    const allowed = await checkModulePermission(req, existing.moduleId, 'delete');
    if (!allowed) {
      return res.status(403).json({ error: 'Forbidden: Your role lacks delete permission on this module.' });
    }

    await db
      .delete(formSubmissions)
      .where(and(eq(formSubmissions.id, existing.id), eq(formSubmissions.organizationId, orgId)));

    await writeAuditLog({
      organizationId: orgId,
      userId: req.authUser!.id,
      userName: req.authUser!.fullName,
      action: 'DELETE_SUBMISSION',
      entityType: 'form_submissions',
      entityId: existing.id,
      details: { submissionNumber: existing.submissionNumber, moduleId: existing.moduleId },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete submission' });
  }
});

// ============================================================================
// CHECKLIST BUILDER & WORKFLOW BUILDER
// ============================================================================

router.get('/modules/:moduleId/checklists', async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const lists = await db
      .select()
      .from(moduleChecklists)
      .where(and(eq(moduleChecklists.organizationId, orgId), eq(moduleChecklists.moduleId, req.params.moduleId)));

    const result = await Promise.all(
      lists.map(async (c) => {
        const items = await db
          .select()
          .from(checklistItems)
          .where(eq(checklistItems.checklistId, c.id))
          .orderBy(asc(checklistItems.displayOrder));
        return { ...c, items };
      })
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load checklists' });
  }
});

router.post('/modules/:moduleId/checklists', requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const [created] = await db
      .insert(moduleChecklists)
      .values({
        organizationId: orgId,
        moduleId: req.params.moduleId,
        title: req.body.title,
        standardCode: req.body.standardCode || 'ISO 45001',
        category: req.body.category || 'Inspection',
        description: req.body.description || '',
        createdBy: req.authUser!.id,
      })
      .returning();

    if (Array.isArray(req.body.items) && req.body.items.length > 0) {
      await db.insert(checklistItems).values(
        req.body.items.map((item: any, i: number) => ({
          organizationId: orgId,
          checklistId: created.id,
          questionText: item.questionText,
          section: item.section || 'General',
          responseType: item.responseType || 'yes_no_na',
          riskWeight: Number(item.riskWeight || 1),
          displayOrder: i + 1,
        }))
      );
    }

    const items = await db
      .select()
      .from(checklistItems)
      .where(eq(checklistItems.checklistId, created.id))
      .orderBy(asc(checklistItems.displayOrder));
    res.status(201).json({ ...created, items });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create checklist' });
  }
});

router.post('/checklists/:checklistId/items', requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const existing = await db
      .select()
      .from(checklistItems)
      .where(eq(checklistItems.checklistId, req.params.checklistId));

    const [created] = await db
      .insert(checklistItems)
      .values({
        organizationId: req.organizationId!,
        checklistId: req.params.checklistId,
        questionText: req.body.questionText,
        section: req.body.section || 'General',
        responseType: req.body.responseType || 'yes_no_na',
        riskWeight: Number(req.body.riskWeight || 1),
        displayOrder: existing.length + 1,
      })
      .returning();
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add checklist question' });
  }
});

// Execute a Custom Module Checklist -> saves Audit score + auto-CAPA for NC items
router.post('/modules/:moduleId/checklists/:checklistId/execute', async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const { responses = [], plantId } = req.body as {
      responses: { questionText: string; status: string; remarks?: string }[];
      plantId?: string;
    };

    const [checklist] = await db
      .select()
      .from(moduleChecklists)
      .where(and(eq(moduleChecklists.id, req.params.checklistId), eq(moduleChecklists.organizationId, orgId)))
      .limit(1);

    if (!checklist) return res.status(404).json({ error: 'Checklist not found' });

    const total = responses.length;
    const compliant = responses.filter((r) => r.status === 'Yes' || r.status === 'Compliant').length;
    const nonCompliant = responses.filter((r) => r.status === 'No' || r.status === 'NC').length;
    const applicable = Math.max(total - responses.filter((r) => r.status === 'NA').length, 1);
    const score = total > 0 ? Number(((compliant / applicable) * 100).toFixed(1)) : 100;
    const auditNumber = `CHK-${Date.now().toString().slice(-6)}`;

    const [audit] = await db
      .insert(safetyAudits)
      .values({
        organizationId: orgId,
        plantId: plantId || null,
        auditNumber,
        auditType: `${checklist.standardCode} Checklist`,
        templateId: checklist.id,
        title: checklist.title,
        scheduledDate: new Date().toISOString().slice(0, 10),
        leadAuditor: req.authUser!.fullName,
        auditTeam: [req.authUser!.fullName],
        checklistResponses: responses,
        totalItems: total,
        compliantItems: compliant,
        nonCompliantItems: nonCompliant,
        complianceScore: score,
        findings: responses.filter((r) => r.status === 'No' || r.status === 'NC'),
        status: 'Completed',
        isDemo: false,
      })
      .returning();

    let generatedCapas = 0;
    for (const nc of responses.filter((r) => r.status === 'No' || r.status === 'NC')) {
      await db.insert(capas).values({
        organizationId: orgId,
        plantId: plantId || null,
        actionNumber: `CAPA-${Date.now().toString().slice(-5)}-${generatedCapas + 1}`,
        sourceType: 'audit',
        sourceId: audit.id,
        sourceNumber: auditNumber,
        title: `Checklist NC: ${nc.questionText}`,
        description: nc.remarks || `Auto-generated from ${checklist.title}`,
        actionType: 'Corrective',
        priority: 'High',
        responsiblePerson: req.authUser!.fullName,
        targetDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        status: 'Open',
      });
      generatedCapas++;
    }

    res.status(201).json({ audit, generatedCapas });
  } catch (error) {
    res.status(500).json({ error: 'Failed to execute checklist' });
  }
});

// Approval Workflows & Instances
router.get('/modules/:moduleId/workflows', async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const wfs = await db
      .select()
      .from(approvalWorkflows)
      .where(and(eq(approvalWorkflows.organizationId, orgId), eq(approvalWorkflows.moduleId, req.params.moduleId)));

    const result = await Promise.all(
      wfs.map(async (w) => {
        const steps = await db
          .select()
          .from(approvalSteps)
          .where(eq(approvalSteps.workflowId, w.id))
          .orderBy(asc(approvalSteps.stepOrder));
        return { ...w, steps };
      })
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load workflows' });
  }
});

router.post('/modules/:moduleId/workflows', requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const [wf] = await db
      .insert(approvalWorkflows)
      .values({
        organizationId: orgId,
        moduleId: req.params.moduleId,
        workflowName: req.body.workflowName,
        description: req.body.description || '',
        mode: req.body.mode || 'sequential',
        createdBy: req.authUser!.id,
      })
      .returning();

    if (Array.isArray(req.body.steps) && req.body.steps.length > 0) {
      await db.insert(approvalSteps).values(
        req.body.steps.map((s: any, idx: number) => ({
          organizationId: orgId,
          workflowId: wf.id,
          stepOrder: idx + 1,
          stepName: s.stepName,
          approverRoleId: s.approverRoleId || null,
          approverRoleName: s.approverRoleName || 'Safety Officer',
          slaHours: Number(s.slaHours || 24),
        }))
      );
    }

    const steps = await db
      .select()
      .from(approvalSteps)
      .where(eq(approvalSteps.workflowId, wf.id))
      .orderBy(asc(approvalSteps.stepOrder));

    res.status(201).json({ ...wf, steps });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create approval workflow' });
  }
});

router.get('/approvals/instances', async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const moduleId = typeof req.query.moduleId === 'string' ? req.query.moduleId : null;
    const whereClause = moduleId
      ? and(eq(approvalInstances.organizationId, orgId), eq(approvalInstances.moduleId, moduleId))
      : eq(approvalInstances.organizationId, orgId);

    const instances = await db
      .select()
      .from(approvalInstances)
      .where(whereClause)
      .orderBy(desc(approvalInstances.createdAt));

    const withHistory = await Promise.all(
      instances.map(async (inst) => {
        const history = await db
          .select()
          .from(approvalHistory)
          .where(eq(approvalHistory.instanceId, inst.id))
          .orderBy(asc(approvalHistory.createdAt));
        const steps = inst.workflowId
          ? await db
              .select()
              .from(approvalSteps)
              .where(eq(approvalSteps.workflowId, inst.workflowId))
              .orderBy(asc(approvalSteps.stepOrder))
          : [];
        return { ...inst, history, steps };
      })
    );
    res.json(withHistory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load approval instances' });
  }
});

router.post('/approvals/instances/:id/action', async (req: AuthRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const { action, comments, delegateTo } = req.body; // approve | reject | resubmit | delegate | escalate | suspend | cancel | close
    const [inst] = await db
      .select()
      .from(approvalInstances)
      .where(and(eq(approvalInstances.id, req.params.id), eq(approvalInstances.organizationId, orgId)))
      .limit(1);

    if (!inst) return res.status(404).json({ error: 'Approval instance not found' });

    if (inst.moduleId && ['approve', 'reject'].includes(action)) {
      const allowed = await checkModulePermission(req, inst.moduleId, action);
      if (!allowed) {
        return res.status(403).json({ error: `Forbidden: Your role cannot perform "${action}" on this module.` });
      }
    }

    let nextStatus = inst.status;
    let nextStep = inst.currentStepOrder;
    const steps = inst.workflowId
      ? await db
          .select()
          .from(approvalSteps)
          .where(eq(approvalSteps.workflowId, inst.workflowId))
          .orderBy(asc(approvalSteps.stepOrder))
      : [];

    if (action === 'approve') {
      if (inst.currentStepOrder >= Math.max(steps.length, 1)) {
        nextStatus = 'Approved';
      } else {
        nextStep = inst.currentStepOrder + 1;
        nextStatus = 'Pending';
      }
    } else if (action === 'reject') {
      nextStatus = 'Rejected';
    } else if (action === 'resubmit') {
      nextStatus = 'Pending';
      nextStep = 1;
    } else if (action === 'escalate') {
      nextStatus = 'Pending';
      nextStep = Math.min(inst.currentStepOrder + 1, Math.max(steps.length, 1));
    } else if (action === 'delegate') {
      nextStatus = 'Pending';
    } else if (action === 'suspend') {
      nextStatus = 'Suspended';
    } else if (action === 'cancel') {
      nextStatus = 'Cancelled';
    } else if (action === 'close') {
      nextStatus = 'Closed';
    }

    const [updated] = await db
      .update(approvalInstances)
      .set({ status: nextStatus, currentStepOrder: nextStep, updatedAt: new Date() })
      .where(eq(approvalInstances.id, inst.id))
      .returning();

    await db.insert(approvalHistory).values({
      organizationId: orgId,
      instanceId: inst.id,
      stepOrder: inst.currentStepOrder,
      action,
      actorId: req.authUser!.id,
      actorName: req.authUser!.fullName,
      comments: comments || (delegateTo ? `Delegated to ${delegateTo}` : ''),
      metadata: delegateTo ? { delegateTo } : {},
    });

    if (inst.entityType === 'form_submission') {
      const subStatus =
        nextStatus === 'Pending' ? `Pending Step ${nextStep}` : nextStatus;
      await db
        .update(formSubmissions)
        .set({ status: subStatus, updatedAt: new Date() })
        .where(eq(formSubmissions.id, inst.entityId));
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process approval action' });
  }
});

// Module Reports Config
router.get('/modules/:moduleId/reports', async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(moduleReports)
      .where(
        and(
          eq(moduleReports.organizationId, req.organizationId!),
          eq(moduleReports.moduleId, req.params.moduleId)
        )
      );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load module reports' });
  }
});

router.post('/modules/:moduleId/reports', requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const [row] = await db
      .insert(moduleReports)
      .values({
        organizationId: req.organizationId!,
        moduleId: req.params.moduleId,
        reportName: req.body.reportName,
        reportType: req.body.reportType || 'Summary',
        config: req.body.config || {},
        scheduleCron: req.body.scheduleCron || null,
        createdBy: req.authUser!.id,
      })
      .returning();
    res.status(201).json(row);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create module report' });
  }
});

export default router;
