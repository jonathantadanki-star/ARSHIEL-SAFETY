import { and, desc, eq, lte, ne } from 'drizzle-orm';
import { getMessaging } from 'firebase-admin/messaging';
import { db } from '../db/index.ts';
import {
  capas,
  equipmentAssets,
  incidents,
  notificationDeliveryLogs,
  notificationEscalationRules,
  notifications,
  pushDeviceTokens,
  trainingRecords,
} from '../db/schema.ts';
import { PLATFORM_OWNER_EMAIL } from '../middleware/auth.ts';

export const KEY_CONTACT_NAME = 'Jonathan Thadanki';
export const KEY_CONTACT_EMAIL = process.env.OWNER_EMAIL?.trim() || PLATFORM_OWNER_EMAIL;
export const KEY_CONTACT_PHONE = process.env.OWNER_SMS_PHONE?.trim() || '+919133661933';

export type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms' | 'discord';

export function getProviderReadiness() {
  const hasResend = Boolean(process.env.RESEND_API_KEY?.trim());
  const hasDiscord = Boolean(process.env.DISCORD_WEBHOOK_URL?.trim());
  const hasTwilio = Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_FROM_NUMBER?.trim()
  );
  const hasFast2Sms = Boolean(process.env.FAST2SMS_API_KEY?.trim());
  const hasSupabaseStorage = Boolean(
    process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
  const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim());

  return {
    database: {
      provider: 'Cloud SQL PostgreSQL (Developer Free Tier / Scale-to-Zero)',
      configured: Boolean(process.env.SQL_HOST),
      tier: 'Free Tier Eligible',
    },
    authentication: {
      provider: 'Firebase Authentication (Single Auth Provider — No Duplication)',
      configured: true,
      tier: 'Free Tier Eligible',
    },
    storage: {
      provider: hasSupabaseStorage
        ? 'Supabase Storage (Signed URLs Active)'
        : 'PostgreSQL Tenant Storage + HMAC Signed URLs (Supabase Storage Optional)',
      configured: true,
      supabaseConfigured: hasSupabaseStorage,
      tier: 'Free Tier Eligible',
    },
    email: {
      provider: 'Resend Transactional Email API',
      configured: hasResend,
      tier: 'Resend Free Tier (3,000/mo)',
      envHint: 'RESEND_API_KEY',
    },
    push: {
      provider: 'Firebase Cloud Messaging (FCM)',
      configured: true,
      tier: 'Firebase Spark Free Tier',
      note: 'Dispatches to registered browser/mobile FCM tokens',
    },
    discord: {
      provider: 'Discord Admin Webhook',
      configured: hasDiscord,
      tier: 'Free Unlimited Webhooks',
      envHint: 'DISCORD_WEBHOOK_URL',
    },
    sms: {
      provider: hasTwilio ? 'Twilio SMS' : hasFast2Sms ? 'Fast2SMS India' : 'Optional SMS Gateway',
      configured: hasTwilio || hasFast2Sms,
      tier: 'Optional (Disabled by default for Zero-Cost)',
      envHint: 'TWILIO_* or FAST2SMS_API_KEY',
    },
    ai: {
      provider: 'Gemini AI Safety Copilot',
      configured: hasGemini,
      tier: 'Backend Key Protected',
    },
  };
}

export async function ensureDefaultEscalationRules(organizationId: string) {
  const existing = await db
    .select()
    .from(notificationEscalationRules)
    .where(eq(notificationEscalationRules.organizationId, organizationId));

  if (existing.length > 0) return existing;

  const defaults = [
    {
      organizationId,
      ruleName: 'Emergency Site Alert Broadcast',
      eventCategory: 'emergency',
      channels: ['in_app', 'email', 'push', 'discord', 'sms'],
      triggerThresholdHours: 0,
      escalateToRole: 'Super Admin',
      escalateToEmail: KEY_CONTACT_EMAIL,
      escalateToPhone: KEY_CONTACT_PHONE,
      maxRetries: 5,
      isActive: true,
    },
    {
      organizationId,
      ruleName: 'Critical / High Incident Escalation',
      eventCategory: 'incident_escalation',
      channels: ['in_app', 'email', 'push', 'discord'],
      triggerThresholdHours: 4,
      escalateToRole: 'Corporate EHS Head',
      escalateToEmail: KEY_CONTACT_EMAIL,
      escalateToPhone: KEY_CONTACT_PHONE,
      maxRetries: 3,
      isActive: true,
    },
    {
      organizationId,
      ruleName: 'Overdue CAPA & Corrective Task Reminder',
      eventCategory: 'overdue_task',
      channels: ['in_app', 'email', 'push'],
      triggerThresholdHours: 24,
      escalateToRole: 'Plant EHS Manager',
      escalateToEmail: KEY_CONTACT_EMAIL,
      escalateToPhone: KEY_CONTACT_PHONE,
      maxRetries: 3,
      isActive: true,
    },
    {
      organizationId,
      ruleName: 'Training & Competency Expiry Reminder (30 Days)',
      eventCategory: 'training_expiry',
      channels: ['in_app', 'email'],
      triggerThresholdHours: 720,
      escalateToRole: 'Safety Officer',
      escalateToEmail: KEY_CONTACT_EMAIL,
      escalateToPhone: KEY_CONTACT_PHONE,
      maxRetries: 3,
      isActive: true,
    },
    {
      organizationId,
      ruleName: 'Equipment Certificate & Statutory Renewal Alert (30 Days)',
      eventCategory: 'certificate_expiry',
      channels: ['in_app', 'email', 'discord'],
      triggerThresholdHours: 720,
      escalateToRole: 'Plant EHS Manager',
      escalateToEmail: KEY_CONTACT_EMAIL,
      escalateToPhone: KEY_CONTACT_PHONE,
      maxRetries: 3,
      isActive: true,
    },
  ];

  return db.insert(notificationEscalationRules).values(defaults).returning();
}

async function sendViaResend(params: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<{ status: 'delivered' | 'failed' | 'unconfigured'; httpStatus?: number; errorMessage?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return {
      status: 'unconfigured',
      errorMessage: 'RESEND_API_KEY is not configured in backend environment secrets.',
    };
  }
  try {
    const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || 'ARSHIEL SAFETY <onboarding@resend.dev>';
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [params.to],
        ...(params.replyTo ? { reply_to: params.replyTo } : {}),
        subject: params.subject,
        text: params.text,
      }),
    });
    if (resp.ok) return { status: 'delivered', httpStatus: resp.status };
    const errText = await resp.text().catch(() => '');
    return {
      status: 'failed',
      httpStatus: resp.status,
      errorMessage: `Resend HTTP ${resp.status}: ${errText.slice(0, 220)}`,
    };
  } catch (err: any) {
    return { status: 'failed', errorMessage: err?.message || 'Resend network error' };
  }
}

async function sendViaDiscord(params: {
  subject: string;
  body: string;
  severity: string;
  eventCategory: string;
}): Promise<{ status: 'delivered' | 'failed' | 'unconfigured'; httpStatus?: number; errorMessage?: string }> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return {
      status: 'unconfigured',
      errorMessage: 'DISCORD_WEBHOOK_URL is not configured in backend environment secrets.',
    };
  }
  const color =
    params.severity === 'critical' ? 0xdc2626 : params.severity === 'warning' ? 0xd97706 : 0x15803d;
  try {
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'ARSHIEL SAFETY Alerts',
        embeds: [
          {
            title: params.subject.slice(0, 250),
            description: params.body.slice(0, 1800),
            color,
            fields: [
              { name: 'Category', value: params.eventCategory, inline: true },
              { name: 'Key Contact', value: `${KEY_CONTACT_NAME} (${KEY_CONTACT_EMAIL})`, inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
    if (resp.ok) return { status: 'delivered', httpStatus: resp.status };
    const errText = await resp.text().catch(() => '');
    return {
      status: 'failed',
      httpStatus: resp.status,
      errorMessage: `Discord HTTP ${resp.status}: ${errText.slice(0, 220)}`,
    };
  } catch (err: any) {
    return { status: 'failed', errorMessage: err?.message || 'Discord webhook network error' };
  }
}

async function sendViaSms(params: {
  toPhone: string;
  text: string;
}): Promise<{
  provider: string;
  status: 'delivered' | 'failed' | 'unconfigured';
  httpStatus?: number;
  errorMessage?: string;
}> {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const twilioToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const twilioFrom = process.env.TWILIO_FROM_NUMBER?.trim();
  const fast2SmsKey = process.env.FAST2SMS_API_KEY?.trim();

  if (twilioSid && twilioToken && twilioFrom) {
    try {
      const form = new URLSearchParams({
        To: params.toPhone,
        From: twilioFrom,
        Body: params.text.slice(0, 320),
      });
      const resp = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(twilioSid)}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: form.toString(),
        }
      );
      if (resp.ok) return { provider: 'twilio', status: 'delivered', httpStatus: resp.status };
      const errText = await resp.text().catch(() => '');
      return {
        provider: 'twilio',
        status: 'failed',
        httpStatus: resp.status,
        errorMessage: `Twilio HTTP ${resp.status}: ${errText.slice(0, 220)}`,
      };
    } catch (err: any) {
      return { provider: 'twilio', status: 'failed', errorMessage: err?.message || 'Twilio SMS error' };
    }
  }

  if (fast2SmsKey) {
    try {
      const indianNumber = params.toPhone.replace(/^\+?91/, '').replace(/\D/g, '').slice(-10);
      const resp = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: fast2SmsKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'q',
          message: params.text.slice(0, 320),
          language: 'english',
          flash: 0,
          numbers: indianNumber,
        }),
      });
      if (resp.ok) return { provider: 'fast2sms', status: 'delivered', httpStatus: resp.status };
      const errText = await resp.text().catch(() => '');
      return {
        provider: 'fast2sms',
        status: 'failed',
        httpStatus: resp.status,
        errorMessage: `Fast2SMS HTTP ${resp.status}: ${errText.slice(0, 220)}`,
      };
    } catch (err: any) {
      return { provider: 'fast2sms', status: 'failed', errorMessage: err?.message || 'Fast2SMS error' };
    }
  }

  return {
    provider: 'sms_gateway',
    status: 'unconfigured',
    errorMessage: 'No SMS gateway configured (TWILIO_* or FAST2SMS_API_KEY). Zero-cost starter default.',
  };
}

async function sendViaFcmPush(params: {
  organizationId: string | null;
  title: string;
  body: string;
}): Promise<{ status: 'delivered' | 'failed' | 'unconfigured'; errorMessage?: string; sentCount?: number }> {
  if (!params.organizationId) {
    return { status: 'unconfigured', errorMessage: 'No target organization for FCM device lookup.' };
  }
  const tokens = await db
    .select({ token: pushDeviceTokens.token })
    .from(pushDeviceTokens)
    .where(and(eq(pushDeviceTokens.organizationId, params.organizationId), eq(pushDeviceTokens.isActive, true)))
    .limit(100);

  if (tokens.length === 0) {
    return {
      status: 'unconfigured',
      errorMessage: 'No active browser/mobile FCM push device tokens registered for this workspace yet.',
    };
  }

  try {
    const messaging = getMessaging();
    const res = await messaging.sendEachForMulticast({
      tokens: tokens.map((t) => t.token),
      notification: {
        title: params.title.slice(0, 120),
        body: params.body.slice(0, 240),
      },
    });
    if (res.successCount > 0) {
      return { status: 'delivered', sentCount: res.successCount };
    }
    const firstErr = res.responses.find((r) => !r.success)?.error?.message || 'FCM multicast returned 0 delivered';
    return { status: 'failed', errorMessage: firstErr.slice(0, 240) };
  } catch (err: any) {
    return {
      status: 'failed',
      errorMessage: String(err?.message || 'Firebase Cloud Messaging dispatch error').slice(0, 240),
    };
  }
}

export async function dispatchNotification(params: {
  organizationId: string | null;
  eventCategory: string;
  severity?: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  channels: NotificationChannel[];
  targetRole?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  replyToEmail?: string;
  entityType?: string;
  entityId?: string;
  maxRetries?: number;
}) {
  const severity = params.severity || 'info';
  const maxRetries = params.maxRetries ?? 3;
  const emailTarget = params.recipientEmail || KEY_CONTACT_EMAIL;
  const phoneTarget = params.recipientPhone || KEY_CONTACT_PHONE;
  const createdLogs: any[] = [];
  let inAppNotificationId: string | null = null;

  // 1. In-App Notification (PostgreSQL — always real & immediate when organizationId exists)
  if (params.channels.includes('in_app') && params.organizationId) {
    const [notif] = await db
      .insert(notifications)
      .values({
        organizationId: params.organizationId,
        targetRole: params.targetRole || 'super-admin',
        type: params.eventCategory,
        severity,
        title: params.title,
        message: params.message,
        entityType: params.entityType || params.eventCategory,
        entityId: params.entityId || null,
        isRead: false,
      })
      .returning();
    inAppNotificationId = notif?.id || null;

    const [log] = await db
      .insert(notificationDeliveryLogs)
      .values({
        organizationId: params.organizationId,
        notificationId: inAppNotificationId,
        eventCategory: params.eventCategory,
        channel: 'in_app',
        provider: 'postgres_in_app',
        recipient: params.targetRole || 'super-admin',
        subject: params.title,
        body: params.message,
        status: 'delivered',
        attemptCount: 1,
        maxRetries,
        httpStatus: 200,
      })
      .returning();
    createdLogs.push(log);
  }

  // 2. Email (Resend Free Tier)
  if (params.channels.includes('email')) {
    const r = await sendViaResend({
      to: emailTarget,
      subject: params.title,
      text: params.message,
      replyTo: params.replyToEmail,
    });
    const [log] = await db
      .insert(notificationDeliveryLogs)
      .values({
        organizationId: params.organizationId,
        notificationId: inAppNotificationId,
        eventCategory: params.eventCategory,
        channel: 'email',
        provider: 'resend',
        recipient: emailTarget,
        subject: params.title,
        body: params.message,
        status: r.status,
        attemptCount: 1,
        maxRetries,
        httpStatus: r.httpStatus ?? null,
        errorMessage: r.errorMessage ?? null,
        nextRetryAt: r.status === 'failed' ? new Date(Date.now() + 15 * 60_000) : null,
      })
      .returning();
    createdLogs.push(log);
  }

  // 3. Browser / Mobile Push (Firebase Cloud Messaging)
  if (params.channels.includes('push')) {
    const r = await sendViaFcmPush({
      organizationId: params.organizationId,
      title: params.title,
      body: params.message,
    });
    const [log] = await db
      .insert(notificationDeliveryLogs)
      .values({
        organizationId: params.organizationId,
        notificationId: inAppNotificationId,
        eventCategory: params.eventCategory,
        channel: 'push',
        provider: 'fcm',
        recipient: params.organizationId ? `org:${params.organizationId.slice(0, 8)}` : 'platform',
        subject: params.title,
        body: params.message,
        status: r.status,
        attemptCount: 1,
        maxRetries,
        errorMessage: r.errorMessage ?? null,
        metadata: r.sentCount ? { sentCount: r.sentCount } : {},
        nextRetryAt: r.status === 'failed' ? new Date(Date.now() + 15 * 60_000) : null,
      })
      .returning();
    createdLogs.push(log);
  }

  // 4. Discord Admin Webhook
  if (params.channels.includes('discord')) {
    const r = await sendViaDiscord({
      subject: params.title,
      body: params.message,
      severity,
      eventCategory: params.eventCategory,
    });
    const [log] = await db
      .insert(notificationDeliveryLogs)
      .values({
        organizationId: params.organizationId,
        notificationId: inAppNotificationId,
        eventCategory: params.eventCategory,
        channel: 'discord',
        provider: 'discord',
        recipient: 'discord_admin_webhook',
        subject: params.title,
        body: params.message,
        status: r.status,
        attemptCount: 1,
        maxRetries,
        httpStatus: r.httpStatus ?? null,
        errorMessage: r.errorMessage ?? null,
        nextRetryAt: r.status === 'failed' ? new Date(Date.now() + 15 * 60_000) : null,
      })
      .returning();
    createdLogs.push(log);
  }

  // 5. Optional SMS Gateway (Twilio / Fast2SMS)
  if (params.channels.includes('sms')) {
    const r = await sendViaSms({
      toPhone: phoneTarget,
      text: `${params.title} — ${params.message}`,
    });
    const [log] = await db
      .insert(notificationDeliveryLogs)
      .values({
        organizationId: params.organizationId,
        notificationId: inAppNotificationId,
        eventCategory: params.eventCategory,
        channel: 'sms',
        provider: r.provider,
        recipient: phoneTarget,
        subject: params.title,
        body: params.message,
        status: r.status,
        attemptCount: 1,
        maxRetries,
        httpStatus: r.httpStatus ?? null,
        errorMessage: r.errorMessage ?? null,
        nextRetryAt: r.status === 'failed' ? new Date(Date.now() + 15 * 60_000) : null,
      })
      .returning();
    createdLogs.push(log);
  }

  return { notificationId: inAppNotificationId, deliveryLogs: createdLogs };
}

export async function retryDeliveryLog(logId: string) {
  const [log] = await db
    .select()
    .from(notificationDeliveryLogs)
    .where(eq(notificationDeliveryLogs.id, logId))
    .limit(1);

  if (!log) return null;

  let nextStatus: 'delivered' | 'failed' | 'unconfigured' = 'failed';
  let httpStatus: number | null = null;
  let errorMessage: string | null = null;

  if (log.channel === 'email') {
    const r = await sendViaResend({ to: log.recipient, subject: log.subject, text: log.body });
    nextStatus = r.status;
    httpStatus = r.httpStatus ?? null;
    errorMessage = r.errorMessage ?? null;
  } else if (log.channel === 'discord') {
    const r = await sendViaDiscord({
      subject: log.subject,
      body: log.body,
      severity: 'warning',
      eventCategory: log.eventCategory,
    });
    nextStatus = r.status;
    httpStatus = r.httpStatus ?? null;
    errorMessage = r.errorMessage ?? null;
  } else if (log.channel === 'sms') {
    const r = await sendViaSms({ toPhone: log.recipient, text: `${log.subject} — ${log.body}` });
    nextStatus = r.status;
    httpStatus = r.httpStatus ?? null;
    errorMessage = r.errorMessage ?? null;
  } else if (log.channel === 'push') {
    const r = await sendViaFcmPush({
      organizationId: log.organizationId,
      title: log.subject,
      body: log.body,
    });
    nextStatus = r.status;
    errorMessage = r.errorMessage ?? null;
  } else {
    nextStatus = 'delivered';
    httpStatus = 200;
  }

  const nextAttempts = log.attemptCount + 1;
  const [updated] = await db
    .update(notificationDeliveryLogs)
    .set({
      status: nextStatus,
      attemptCount: nextAttempts,
      httpStatus,
      errorMessage,
      lastAttemptAt: new Date(),
      nextRetryAt:
        nextStatus === 'failed' && nextAttempts < log.maxRetries
          ? new Date(Date.now() + nextAttempts * 15 * 60_000)
          : null,
    })
    .where(eq(notificationDeliveryLogs.id, log.id))
    .returning();

  return updated;
}

// Live Automated EHS Alert Scanner (Overdue CAPAs, Training Expiry, Equipment Certificates, Critical Incidents)
export async function runAutomatedEhsAlertScan(organizationId: string) {
  const rules = await ensureDefaultEscalationRules(organizationId);
  const activeRuleByCategory = new Map<string, typeof rules[number]>();
  for (const r of rules) {
    if (r.isActive) activeRuleByCategory.set(r.eventCategory, r);
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const in30DaysStr = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const [overdueCapas, allTrainings, allEquipment, openIncidents] = await Promise.all([
    db
      .select()
      .from(capas)
      .where(and(eq(capas.organizationId, organizationId), ne(capas.status, 'Closed')))
      .orderBy(desc(capas.createdAt))
      .limit(100),
    db
      .select()
      .from(trainingRecords)
      .where(eq(trainingRecords.organizationId, organizationId))
      .limit(150),
    db
      .select()
      .from(equipmentAssets)
      .where(eq(equipmentAssets.organizationId, organizationId))
      .limit(150),
    db
      .select()
      .from(incidents)
      .where(and(eq(incidents.organizationId, organizationId), ne(incidents.status, 'Closed')))
      .orderBy(desc(incidents.createdAt))
      .limit(100),
  ]);

  const overdueList = overdueCapas.filter((c) => c.targetDate && c.targetDate < todayStr);
  const expiringTrainings = allTrainings.filter(
    (t) => t.renewalDate && t.renewalDate <= in30DaysStr
  );
  const expiringCerts = allEquipment.filter(
    (e) => e.nextDueDate && e.nextDueDate <= in30DaysStr
  );
  const highIncidents = openIncidents.filter((i) =>
    ['Critical', 'High', 'Fatal'].includes(i.severity || '')
  );

  const triggered: { category: string; count: number; logsCount: number }[] = [];

  if (overdueList.length > 0 && activeRuleByCategory.has('overdue_task')) {
    const rule = activeRuleByCategory.get('overdue_task')!;
    const res = await dispatchNotification({
      organizationId,
      eventCategory: 'overdue_task',
      severity: 'warning',
      title: `Overdue CAPA Reminder: ${overdueList.length} Action(s) Past Target Date`,
      message: `ARSHIEL SAFETY automated scan detected ${overdueList.length} overdue CAPA(s): ${overdueList
        .slice(0, 3)
        .map((c) => `${c.actionNumber} (${c.title})`)
        .join('; ')}.`,
      channels: (rule.channels as NotificationChannel[]) || ['in_app', 'email'],
      targetRole: rule.escalateToRole,
      recipientEmail: rule.escalateToEmail || KEY_CONTACT_EMAIL,
      recipientPhone: rule.escalateToPhone || KEY_CONTACT_PHONE,
      maxRetries: rule.maxRetries,
    });
    triggered.push({ category: 'overdue_task', count: overdueList.length, logsCount: res.deliveryLogs.length });
  }

  if (expiringTrainings.length > 0 && activeRuleByCategory.has('training_expiry')) {
    const rule = activeRuleByCategory.get('training_expiry')!;
    const res = await dispatchNotification({
      organizationId,
      eventCategory: 'training_expiry',
      severity: 'warning',
      title: `Training Expiry Alert: ${expiringTrainings.length} Record(s) Expiring Within 30 Days`,
      message: `${expiringTrainings.length} safety training certification(s) require renewal: ${expiringTrainings
        .slice(0, 3)
        .map((t) => `${t.title} (renewal ${t.renewalDate})`)
        .join('; ')}.`,
      channels: (rule.channels as NotificationChannel[]) || ['in_app', 'email'],
      targetRole: rule.escalateToRole,
      recipientEmail: rule.escalateToEmail || KEY_CONTACT_EMAIL,
      recipientPhone: rule.escalateToPhone || KEY_CONTACT_PHONE,
      maxRetries: rule.maxRetries,
    });
    triggered.push({
      category: 'training_expiry',
      count: expiringTrainings.length,
      logsCount: res.deliveryLogs.length,
    });
  }

  if (expiringCerts.length > 0 && activeRuleByCategory.has('certificate_expiry')) {
    const rule = activeRuleByCategory.get('certificate_expiry')!;
    const res = await dispatchNotification({
      organizationId,
      eventCategory: 'certificate_expiry',
      severity: 'warning',
      title: `Equipment Certificate Expiry: ${expiringCerts.length} Asset(s) Due Within 30 Days`,
      message: `${expiringCerts.length} equipment inspection/statutory certificate(s) due: ${expiringCerts
        .slice(0, 3)
        .map((e) => `${e.assetNumber} ${e.name} (due ${e.nextDueDate})`)
        .join('; ')}.`,
      channels: (rule.channels as NotificationChannel[]) || ['in_app', 'email'],
      targetRole: rule.escalateToRole,
      recipientEmail: rule.escalateToEmail || KEY_CONTACT_EMAIL,
      recipientPhone: rule.escalateToPhone || KEY_CONTACT_PHONE,
      maxRetries: rule.maxRetries,
    });
    triggered.push({
      category: 'certificate_expiry',
      count: expiringCerts.length,
      logsCount: res.deliveryLogs.length,
    });
  }

  if (highIncidents.length > 0 && activeRuleByCategory.has('incident_escalation')) {
    const rule = activeRuleByCategory.get('incident_escalation')!;
    const res = await dispatchNotification({
      organizationId,
      eventCategory: 'incident_escalation',
      severity: 'critical',
      title: `Incident Escalation: ${highIncidents.length} Open High/Critical Incident(s)`,
      message: `Escalation triggered for ${highIncidents.length} unresolved critical/high incident(s): ${highIncidents
        .slice(0, 3)
        .map((i) => `${i.incidentNumber} [${i.severity}] ${i.title}`)
        .join('; ')}.`,
      channels: (rule.channels as NotificationChannel[]) || ['in_app', 'email', 'push'],
      targetRole: rule.escalateToRole,
      recipientEmail: rule.escalateToEmail || KEY_CONTACT_EMAIL,
      recipientPhone: rule.escalateToPhone || KEY_CONTACT_PHONE,
      maxRetries: rule.maxRetries,
    });
    triggered.push({
      category: 'incident_escalation',
      count: highIncidents.length,
      logsCount: res.deliveryLogs.length,
    });
  }

  return {
    scannedAt: new Date().toISOString(),
    findings: {
      overdueCapas: overdueList.length,
      expiringTrainings: expiringTrainings.length,
      expiringCertificates: expiringCerts.length,
      openCriticalIncidents: highIncidents.length,
    },
    triggered,
  };
}
