import { Router } from 'express';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  apiErrorLogs,
  documents,
  notificationDeliveryLogs,
  notificationEscalationRules,
  organizations,
  plants,
  platformUsageQuotas,
  pushDeviceTokens,
  safetyObservations,
  securityEvents,
  userLoginLogs,
  users,
} from '../db/schema.ts';
import {
  type AuthRequest,
  extractClientIp,
  requireSuperAdmin,
  writeAuditLog,
} from '../middleware/auth.ts';
import {
  dispatchNotification,
  ensureDefaultEscalationRules,
  getProviderReadiness,
  KEY_CONTACT_EMAIL,
  KEY_CONTACT_NAME,
  KEY_CONTACT_PHONE,
  type NotificationChannel,
  retryDeliveryLog,
  runAutomatedEhsAlertScan,
} from '../services/notificationEngine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

async function getOrInitQuotas() {
  const [existing] = await db
    .select()
    .from(platformUsageQuotas)
    .where(eq(platformUsageQuotas.key, 'default'))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(platformUsageQuotas)
    .values({
      key: 'default',
      planName: 'Zero-Cost Starter Tier',
      targetUserBand: '50–500 Active Users',
      maxCompanies: 25,
      maxUsers: 500,
      maxSites: 100,
      maxDatabaseMb: 500,
      maxStorageMb: 1024,
      maxMonthlyEmails: 3000,
      maxMonthlyNotifications: 25000,
      warningThresholdPct: 80,
      autoPaidUpgradeEnabled: false,
      spendingAlertEmail: KEY_CONTACT_EMAIL,
      spendingAlertDiscordEnabled: true,
    })
    .returning();
  return created;
}

// ============================================================================
// SUPER ADMIN SYSTEM OVERVIEW — TELEMETRY, QUOTAS, SECURITY & COST GUARDRAILS
// ============================================================================
router.get('/platform-owner/system-overview', requireSuperAdmin, async (_req: AuthRequest, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      quotas,
      companyCountRes,
      userCountRes,
      siteCountRes,
      activeUsers30dRes,
      activeUsers7dRes,
      dbSizeRes,
      docStorageRes,
      obsStorageRes,
      notifLogsMonth,
      recentSecurity,
      recentErrors,
      pushTokensRes,
    ] = await Promise.all([
      getOrInitQuotas(),
      db.select({ count: sql<number>`count(*)::int` }).from(organizations),
      db.select({ count: sql<number>`count(*)::int` }).from(users),
      db.select({ count: sql<number>`count(*)::int` }).from(plants),
      db
        .select({ count: sql<number>`count(distinct ${userLoginLogs.uid})::int` })
        .from(userLoginLogs)
        .where(and(eq(userLoginLogs.eventType, 'login'), gte(userLoginLogs.loggedInAt, thirtyDaysAgo))),
      db
        .select({ count: sql<number>`count(distinct ${userLoginLogs.uid})::int` })
        .from(userLoginLogs)
        .where(and(eq(userLoginLogs.eventType, 'login'), gte(userLoginLogs.loggedInAt, sevenDaysAgo))),
      db.execute(sql`SELECT pg_database_size(current_database())::bigint AS bytes`),
      db
        .select({
          totalBytes: sql<number>`coalesce(sum(greatest(${documents.fileSize}, length(coalesce(${documents.fileDataUrl}, '')))), 0)::bigint`,
          docCount: sql<number>`count(*)::int`,
        })
        .from(documents),
      db
        .select({
          totalBytes: sql<number>`coalesce(sum(length(coalesce(${safetyObservations.beforePhotoData}, '')) + length(coalesce(${safetyObservations.afterPhotoData}, ''))), 0)::bigint`,
        })
        .from(safetyObservations),
      db
        .select()
        .from(notificationDeliveryLogs)
        .where(gte(notificationDeliveryLogs.createdAt, startOfMonth))
        .orderBy(desc(notificationDeliveryLogs.createdAt))
        .limit(500),
      db.select().from(securityEvents).orderBy(desc(securityEvents.createdAt)).limit(50),
      db.select().from(apiErrorLogs).orderBy(desc(apiErrorLogs.createdAt)).limit(50),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(pushDeviceTokens)
        .where(eq(pushDeviceTokens.isActive, true)),
    ]);

    const totalCompanies = companyCountRes[0]?.count ?? 0;
    const totalRegisteredUsers = userCountRes[0]?.count ?? 0;
    const activeSites = siteCountRes[0]?.count ?? 0;
    const activeUsers30d = Math.max(activeUsers30dRes[0]?.count ?? 0, totalRegisteredUsers > 0 ? 1 : 0);
    const activeUsers7d = Math.max(activeUsers7dRes[0]?.count ?? 0, totalRegisteredUsers > 0 ? 1 : 0);

    const dbBytes = Number((dbSizeRes as any)?.rows?.[0]?.bytes ?? 0);
    const databaseUsageMb = Number((dbBytes / (1024 * 1024)).toFixed(2));

    const storageBytes =
      Number(docStorageRes[0]?.totalBytes ?? 0) + Number(obsStorageRes[0]?.totalBytes ?? 0);
    const storageUsageMb = Number((storageBytes / (1024 * 1024)).toFixed(2));
    const totalDocuments = docStorageRes[0]?.docCount ?? 0;

    const notificationsThisMonth = notifLogsMonth.length;
    const emailsDeliveredThisMonth = notifLogsMonth.filter(
      (n) => n.channel === 'email' && n.status === 'delivered'
    ).length;
    const failedNotificationsCount = notifLogsMonth.filter((n) => n.status === 'failed').length;
    const unconfiguredNotificationsCount = notifLogsMonth.filter((n) => n.status === 'unconfigured').length;

    const pct = (used: number, max: number) => (max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0);

    const utilization = {
      companiesPct: pct(totalCompanies, quotas.maxCompanies),
      usersPct: pct(totalRegisteredUsers, quotas.maxUsers),
      sitesPct: pct(activeSites, quotas.maxSites),
      databasePct: pct(databaseUsageMb, quotas.maxDatabaseMb),
      storagePct: pct(storageUsageMb, quotas.maxStorageMb),
      emailsPct: pct(emailsDeliveredThisMonth, quotas.maxMonthlyEmails),
      notificationsPct: pct(notificationsThisMonth, quotas.maxMonthlyNotifications),
    };

    const quotaWarnings: { metric: string; used: string; limit: string; pct: number }[] = [];
    const checkWarn = (metric: string, usedStr: string, limitStr: string, p: number) => {
      if (p >= quotas.warningThresholdPct) {
        quotaWarnings.push({ metric, used: usedStr, limit: limitStr, pct: p });
      }
    };
    checkWarn('Companies', String(totalCompanies), String(quotas.maxCompanies), utilization.companiesPct);
    checkWarn('Registered Users', String(totalRegisteredUsers), String(quotas.maxUsers), utilization.usersPct);
    checkWarn('Active Sites', String(activeSites), String(quotas.maxSites), utilization.sitesPct);
    checkWarn('Database Usage', `${databaseUsageMb} MB`, `${quotas.maxDatabaseMb} MB`, utilization.databasePct);
    checkWarn('Storage Usage', `${storageUsageMb} MB`, `${quotas.maxStorageMb} MB`, utilization.storagePct);
    checkWarn(
      'Monthly Emails',
      String(emailsDeliveredThisMonth),
      String(quotas.maxMonthlyEmails),
      utilization.emailsPct
    );
    checkWarn(
      'Monthly Notifications',
      String(notificationsThisMonth),
      String(quotas.maxMonthlyNotifications),
      utilization.notificationsPct
    );

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      keyContact: {
        name: KEY_CONTACT_NAME,
        email: KEY_CONTACT_EMAIL,
        phone: KEY_CONTACT_PHONE,
      },
      metrics: {
        totalCompanies,
        totalRegisteredUsers,
        activeUsers30d,
        activeUsers7d,
        activeSites,
        databaseUsageMb,
        storageUsageMb,
        totalDocuments,
        notificationsThisMonth,
        emailsDeliveredThisMonth,
        failedNotificationsCount,
        unconfiguredNotificationsCount,
        registeredPushDevices: pushTokensRes[0]?.count ?? 0,
        securityEventsCount: recentSecurity.length,
        apiErrorsCount: recentErrors.length,
      },
      quotas,
      utilization,
      quotaWarnings,
      providers: getProviderReadiness(),
      securityEvents: recentSecurity,
      apiErrors: recentErrors,
    });
  } catch (error) {
    console.error('Failed to load system overview:', error);
    res.status(500).json({ error: 'Failed to load infrastructure & quota overview' });
  }
});

// PATCH /api/platform-owner/quotas - Admin-controlled tier upgrade & spending alert limits
router.patch('/platform-owner/quotas', requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const current = await getOrInitQuotas();
    const b = req.body || {};

    // Admin-controlled presets (never auto-billed)
    let preset: Partial<typeof platformUsageQuotas.$inferInsert> = {};
    if (b.tierPreset === 'starter') {
      preset = {
        planName: 'Zero-Cost Starter Tier',
        targetUserBand: '50–500 Active Users',
        maxCompanies: 25,
        maxUsers: 500,
        maxSites: 100,
        maxDatabaseMb: 500,
        maxStorageMb: 1024,
        maxMonthlyEmails: 3000,
        maxMonthlyNotifications: 25000,
        autoPaidUpgradeEnabled: false,
      };
    } else if (b.tierPreset === 'growth') {
      preset = {
        planName: 'Growth Multi-Tenant Tier',
        targetUserBand: '500–2,500 Active Users',
        maxCompanies: 150,
        maxUsers: 2500,
        maxSites: 500,
        maxDatabaseMb: 8192,
        maxStorageMb: 51200,
        maxMonthlyEmails: 50000,
        maxMonthlyNotifications: 250000,
      };
    } else if (b.tierPreset === 'enterprise') {
      preset = {
        planName: 'Enterprise Global Scale Tier',
        targetUserBand: '5,000+ Active Users',
        maxCompanies: 1000,
        maxUsers: 25000,
        maxSites: 5000,
        maxDatabaseMb: 65536,
        maxStorageMb: 256000,
        maxMonthlyEmails: 500000,
        maxMonthlyNotifications: 2000000,
      };
    }

    const [updated] = await db
      .update(platformUsageQuotas)
      .set({
        ...preset,
        ...(b.planName !== undefined ? { planName: String(b.planName).slice(0, 120) } : {}),
        ...(b.maxCompanies !== undefined ? { maxCompanies: Math.max(1, Number(b.maxCompanies)) } : {}),
        ...(b.maxUsers !== undefined ? { maxUsers: Math.max(10, Number(b.maxUsers)) } : {}),
        ...(b.maxSites !== undefined ? { maxSites: Math.max(1, Number(b.maxSites)) } : {}),
        ...(b.maxDatabaseMb !== undefined ? { maxDatabaseMb: Math.max(50, Number(b.maxDatabaseMb)) } : {}),
        ...(b.maxStorageMb !== undefined ? { maxStorageMb: Math.max(100, Number(b.maxStorageMb)) } : {}),
        ...(b.maxMonthlyEmails !== undefined ? { maxMonthlyEmails: Math.max(100, Number(b.maxMonthlyEmails)) } : {}),
        ...(b.warningThresholdPct !== undefined
          ? { warningThresholdPct: Math.min(99, Math.max(50, Number(b.warningThresholdPct))) }
          : {}),
        ...(b.autoPaidUpgradeEnabled !== undefined
          ? { autoPaidUpgradeEnabled: Boolean(b.autoPaidUpgradeEnabled) }
          : {}),
        ...(b.spendingAlertEmail !== undefined
          ? { spendingAlertEmail: String(b.spendingAlertEmail).trim() || KEY_CONTACT_EMAIL }
          : {}),
        ...(b.spendingAlertDiscordEnabled !== undefined
          ? { spendingAlertDiscordEnabled: Boolean(b.spendingAlertDiscordEnabled) }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(platformUsageQuotas.id, current.id))
      .returning();

    await writeAuditLog({
      organizationId: req.organizationId ?? null,
      userId: req.authUser!.id,
      userEmail: req.authUser!.email,
      userName: req.authUser!.fullName,
      userRole: 'Super Admin',
      moduleName: 'Cost & Quota Governance',
      action: 'UPDATE_PLATFORM_QUOTAS',
      entityType: 'platform_usage_quotas',
      entityId: updated.id,
      previousValue: { planName: current.planName, maxUsers: current.maxUsers },
      updatedValue: { planName: updated.planName, maxUsers: updated.maxUsers, autoPaidUpgradeEnabled: updated.autoPaidUpgradeEnabled },
      ipAddress: extractClientIp(req),
    });

    res.json({ ok: true, quotas: updated });
  } catch (error) {
    console.error('Failed to update quotas:', error);
    res.status(500).json({ error: 'Failed to update platform usage quotas' });
  }
});

// GET /api/platform-owner/rls-policy - Download PostgreSQL / Supabase RLS SQL Script
router.get('/platform-owner/rls-policy', requireSuperAdmin, (_req: AuthRequest, res) => {
  try {
    const filePath = path.resolve(__dirname, '../../supabase/rls_and_tenant_isolation.sql');
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'RLS SQL migration file not found' });
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    res.setHeader('Content-Type', 'text/sql; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="arshiel-rls-tenant-isolation.sql"');
    res.send(content);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read RLS SQL file' });
  }
});

// GET /api/platform-owner/source-archive - Download clean ARSHIEL SAFETY source code (.tar.gz, zero secrets)
router.get('/platform-owner/source-archive', requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const rootDir = path.resolve(__dirname, '../..');
    const allowlist = [
      'src',
      'public',
      'supabase',
      'server.ts',
      'package.json',
      'tsconfig.json',
      'vite.config.ts',
      'index.html',
      'metadata.json',
      '.env.example',
    ].filter((entry) => fs.existsSync(path.join(rootDir, entry)));

    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `arshiel-safety-source-${stamp}.tar.gz`;

    await writeAuditLog({
      organizationId: req.organizationId ?? null,
      userId: req.authUser!.id,
      userEmail: req.authUser!.email,
      userName: req.authUser!.fullName,
      userRole: 'Super Admin',
      moduleName: 'Source Code Export',
      action: 'EXPORT_SOURCE_ARCHIVE',
      entityType: 'platform_source',
      details: { filename, entries: allowlist },
      ipAddress: extractClientIp(req),
    });

    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, no-store');

    const tarArgs = [
      '-czf',
      '-',
      '--exclude=.env',
      '--exclude=.env.local',
      '--exclude=.env.production',
      '--exclude=node_modules',
      '--exclude=dist',
      '--exclude=.git',
      '--exclude=*service-account*.json',
      ...allowlist,
    ];

    const tarProc = spawn('tar', tarArgs, { cwd: rootDir });
    tarProc.stdout.pipe(res);

    tarProc.stderr.on('data', (chunk) => {
      console.error('source-archive tar stderr:', chunk.toString());
    });

    tarProc.on('error', (err) => {
      console.error('source-archive spawn error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to package source code archive' });
      }
    });
  } catch (error) {
    console.error('GET /api/platform-owner/source-archive error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to export source archive' });
    }
  }
});

// ============================================================================
// NOTIFICATION ENGINE ROUTES (LOGS, RETRIES, ESCALATION RULES, AUTOMATED SCANS)
// ============================================================================

router.get('/platform-owner/notification-logs', requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const channelFilter = String(req.query.channel || 'all').toLowerCase();
    const statusFilter = String(req.query.status || 'all').toLowerCase();

    const rows = await db
      .select()
      .from(notificationDeliveryLogs)
      .orderBy(desc(notificationDeliveryLogs.createdAt))
      .limit(300);

    const filtered = rows.filter((r) => {
      if (channelFilter !== 'all' && r.channel.toLowerCase() !== channelFilter) return false;
      if (statusFilter !== 'all' && r.status.toLowerCase() !== statusFilter) return false;
      return true;
    });

    res.setHeader('Cache-Control', 'no-store');
    res.json({ total: filtered.length, items: filtered });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load notification delivery logs' });
  }
});

router.post('/platform-owner/notifications/retry/:id', requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const updated = await retryDeliveryLog(req.params.id);
    if (!updated) return res.status(404).json({ error: 'Delivery log not found' });
    res.json({ ok: true, log: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retry notification delivery' });
  }
});

router.post('/platform-owner/notifications/retry-all-failed', requireSuperAdmin, async (_req: AuthRequest, res) => {
  try {
    const failedLogs = await db
      .select()
      .from(notificationDeliveryLogs)
      .where(eq(notificationDeliveryLogs.status, 'failed'))
      .orderBy(desc(notificationDeliveryLogs.createdAt))
      .limit(25);

    const results = [];
    for (const log of failedLogs) {
      if (log.attemptCount < log.maxRetries) {
        const updated = await retryDeliveryLog(log.id);
        if (updated) results.push(updated);
      }
    }
    res.json({ ok: true, retriedCount: results.length, results });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retry failed deliveries' });
  }
});

router.post('/platform-owner/notifications/run-checks', requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const result = await runAutomatedEhsAlertScan(req.organizationId!);
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error('Automated EHS alert scan failed:', error);
    res.status(500).json({ error: 'Failed to run automated EHS alert scan' });
  }
});

router.post('/platform-owner/notifications/dispatch', requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const {
      eventCategory = 'emergency',
      severity = 'critical',
      title,
      message,
      channels = ['in_app', 'email', 'discord'],
      recipientEmail,
      recipientPhone,
    } = req.body || {};

    if (!title || !String(title).trim() || !message || !String(message).trim()) {
      return res.status(400).json({ error: 'Title and message are required.' });
    }

    const validChannels = (Array.isArray(channels) ? channels : ['in_app']).filter((c: string) =>
      ['in_app', 'email', 'push', 'sms', 'discord'].includes(c)
    ) as NotificationChannel[];

    const result = await dispatchNotification({
      organizationId: req.organizationId!,
      eventCategory: String(eventCategory),
      severity: severity === 'critical' || severity === 'warning' ? severity : 'info',
      title: String(title).trim().slice(0, 180),
      message: String(message).trim().slice(0, 1500),
      channels: validChannels.length > 0 ? validChannels : ['in_app'],
      recipientEmail: recipientEmail ? String(recipientEmail).trim() : KEY_CONTACT_EMAIL,
      recipientPhone: recipientPhone ? String(recipientPhone).trim() : KEY_CONTACT_PHONE,
    });

    await writeAuditLog({
      organizationId: req.organizationId!,
      userId: req.authUser!.id,
      userEmail: req.authUser!.email,
      userName: req.authUser!.fullName,
      userRole: 'Super Admin',
      moduleName: 'Notification Engine',
      action: 'DISPATCH_ALERT',
      entityType: 'notification',
      entityId: result.notificationId,
      details: { eventCategory, channels: validChannels, title },
      ipAddress: extractClientIp(req),
    });

    res.status(201).json({ ok: true, ...result });
  } catch (error) {
    console.error('Manual notification dispatch failed:', error);
    res.status(500).json({ error: 'Failed to dispatch notification' });
  }
});

// Escalation Rules CRUD (Sole Super Admin Only)
router.get('/platform-owner/escalation-rules', requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const rules = await ensureDefaultEscalationRules(req.organizationId!);
    res.json({ items: rules });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load escalation rules' });
  }
});

router.post('/platform-owner/escalation-rules', requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const b = req.body || {};
    if (!b.ruleName || !b.eventCategory) {
      return res.status(400).json({ error: 'ruleName and eventCategory are required' });
    }
    const [created] = await db
      .insert(notificationEscalationRules)
      .values({
        organizationId: req.organizationId!,
        ruleName: String(b.ruleName).trim().slice(0, 140),
        eventCategory: String(b.eventCategory).trim(),
        channels: Array.isArray(b.channels) && b.channels.length > 0 ? b.channels : ['in_app', 'email'],
        triggerThresholdHours: Math.max(0, Number(b.triggerThresholdHours ?? 24)),
        escalateToRole: String(b.escalateToRole || 'Super Admin'),
        escalateToEmail: b.escalateToEmail ? String(b.escalateToEmail).trim() : KEY_CONTACT_EMAIL,
        escalateToPhone: b.escalateToPhone ? String(b.escalateToPhone).trim() : KEY_CONTACT_PHONE,
        maxRetries: Math.min(10, Math.max(1, Number(b.maxRetries ?? 3))),
        isActive: b.isActive !== undefined ? Boolean(b.isActive) : true,
      })
      .returning();

    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create escalation rule' });
  }
});

router.patch('/platform-owner/escalation-rules/:id', requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const b = req.body || {};
    const [existing] = await db
      .select()
      .from(notificationEscalationRules)
      .where(
        and(
          eq(notificationEscalationRules.id, req.params.id),
          eq(notificationEscalationRules.organizationId, req.organizationId!)
        )
      )
      .limit(1);
    if (!existing) return res.status(404).json({ error: 'Escalation rule not found' });

    const [updated] = await db
      .update(notificationEscalationRules)
      .set({
        isActive: b.isActive !== undefined ? Boolean(b.isActive) : existing.isActive,
        channels: Array.isArray(b.channels) ? b.channels : existing.channels,
        triggerThresholdHours:
          b.triggerThresholdHours !== undefined
            ? Math.max(0, Number(b.triggerThresholdHours))
            : existing.triggerThresholdHours,
        escalateToEmail: b.escalateToEmail !== undefined ? b.escalateToEmail : existing.escalateToEmail,
        escalateToPhone: b.escalateToPhone !== undefined ? b.escalateToPhone : existing.escalateToPhone,
        updatedAt: new Date(),
      })
      .where(eq(notificationEscalationRules.id, existing.id))
      .returning();

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update escalation rule' });
  }
});

router.delete('/platform-owner/escalation-rules/:id', requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    await db
      .delete(notificationEscalationRules)
      .where(
        and(
          eq(notificationEscalationRules.id, req.params.id),
          eq(notificationEscalationRules.organizationId, req.organizationId!)
        )
      );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete escalation rule' });
  }
});

// ============================================================================
// TENANT-SCOPED PUSH TOKEN REGISTRATION & EMERGENCY BROADCAST
// ============================================================================
router.post('/notifications/push-token', async (req: AuthRequest, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    if (!token || token.length < 20) {
      return res.status(400).json({ error: 'Valid FCM device token is required.' });
    }
    const [row] = await db
      .insert(pushDeviceTokens)
      .values({
        organizationId: req.organizationId!,
        userId: req.authUser!.id,
        token,
        platform: String(req.body?.platform || 'web').slice(0, 20),
        browser: String(req.body?.browser || '').slice(0, 60) || null,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: pushDeviceTokens.token,
        set: {
          organizationId: req.organizationId!,
          userId: req.authUser!.id,
          isActive: true,
          updatedAt: new Date(),
        },
      })
      .returning();
    res.status(201).json({ ok: true, device: row });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register push notification device token' });
  }
});

router.post('/notifications/emergency', async (req: AuthRequest, res) => {
  try {
    if (!req.authUser?.isSuperAdmin && !req.authUser?.canSafetyApprove) {
      return res.status(403).json({
        error: 'Forbidden: Only Super Admin or EHS Safety Managers can trigger emergency broadcasts.',
      });
    }
    const { title, message } = req.body || {};
    if (!title || !message) {
      return res.status(400).json({ error: 'Emergency title and message are required.' });
    }
    const result = await dispatchNotification({
      organizationId: req.organizationId!,
      eventCategory: 'emergency',
      severity: 'critical',
      title: `EMERGENCY ALERT: ${String(title).trim()}`,
      message: String(message).trim(),
      channels: ['in_app', 'email', 'push', 'discord', 'sms'],
      targetRole: 'all',
    });
    res.status(201).json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to broadcast emergency alert' });
  }
});

export default router;
