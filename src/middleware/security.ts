import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { db } from '../db/index.ts';
import { apiErrorLogs, securityEvents } from '../db/schema.ts';
import { type AuthRequest, extractClientIp } from './auth.ts';

const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'csv',
  'xlsx',
  'xls',
  'docx',
  'doc',
  'txt',
]);

const ALLOWED_MIME_PREFIXES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/csv',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB per document

export async function recordSecurityEvent(params: {
  organizationId?: string | null;
  eventType: string;
  severity?: 'info' | 'warning' | 'high' | 'critical';
  userEmail?: string | null;
  ipAddress?: string | null;
  endpoint: string;
  method?: string;
  details?: Record<string, unknown>;
}) {
  try {
    await db.insert(securityEvents).values({
      organizationId: params.organizationId ?? null,
      eventType: params.eventType,
      severity: params.severity || 'warning',
      userEmail: params.userEmail ?? null,
      ipAddress: params.ipAddress ?? null,
      endpoint: params.endpoint.slice(0, 240),
      method: params.method || 'GET',
      details: params.details ?? {},
    });
  } catch (err) {
    console.error('Failed to record security event:', err);
  }
}

export async function recordApiError(params: {
  organizationId?: string | null;
  method: string;
  path: string;
  statusCode: number;
  errorMessage: string;
  userEmail?: string | null;
  ipAddress?: string | null;
}) {
  try {
    await db.insert(apiErrorLogs).values({
      organizationId: params.organizationId ?? null,
      method: params.method.slice(0, 16),
      path: params.path.slice(0, 240),
      statusCode: params.statusCode,
      errorMessage: params.errorMessage.slice(0, 500),
      userEmail: params.userEmail ?? null,
      ipAddress: params.ipAddress ?? null,
    });
  } catch (err) {
    console.error('Failed to record API error log:', err);
  }
}

// Safe HTTP Security Headers (iframe-compatible)
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(self), microphone=(self)');
  next();
}

// Sliding-Window Rate Limiter (Zero external Redis required for Starter 50-5000 users)
interface RateBucket {
  timestamps: number[];
}

export function createRateLimiter(opts: { name: string; windowMs: number; max: number }) {
  const buckets = new Map<string, RateBucket>();

  // Periodic cleanup to keep memory bounded
  const timer = setInterval(() => {
    const cutoff = Date.now() - opts.windowMs;
    for (const [key, bucket] of buckets.entries()) {
      bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
      if (bucket.timestamps.length === 0) buckets.delete(key);
    }
  }, Math.max(opts.windowMs, 60_000));
  timer.unref?.();

  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const now = Date.now();
    const cutoff = now - opts.windowMs;
    const ip = extractClientIp(req);
    const key = `${opts.name}:${req.authUser?.uid || ip}`;
    const bucket = buckets.get(key) || { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

    if (bucket.timestamps.length >= opts.max) {
      const retryAfterSec = Math.max(1, Math.ceil((bucket.timestamps[0] + opts.windowMs - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      void recordSecurityEvent({
        organizationId: req.organizationId ?? null,
        eventType: 'RATE_LIMIT_EXCEEDED',
        severity: 'high',
        userEmail: req.authUser?.email ?? null,
        ipAddress: ip,
        endpoint: req.originalUrl || req.path,
        method: req.method,
        details: { limiter: opts.name, max: opts.max, windowMs: opts.windowMs },
      });
      return res.status(429).json({
        error: 'Rate limit exceeded. Please wait briefly before retrying.',
        retryAfterSeconds: retryAfterSec,
      });
    }

    bucket.timestamps.push(now);
    buckets.set(key, bucket);
    res.setHeader('X-RateLimit-Limit', String(opts.max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, opts.max - bucket.timestamps.length)));
    next();
  };
}

// Response telemetry interceptor: logs genuine 403/5xx API events without exposing secrets
export function apiTelemetryMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);
  let capturedError = '';

  res.json = ((body: any) => {
    if (body && typeof body === 'object' && typeof body.error === 'string') {
      capturedError = body.error;
    }
    return originalJson(body);
  }) as typeof res.json;

  res.on('finish', () => {
    if (!req.originalUrl.startsWith('/api/')) return;
    const status = res.statusCode;
    if (status >= 500) {
      void recordApiError({
        organizationId: req.organizationId ?? null,
        method: req.method,
        path: req.originalUrl,
        statusCode: status,
        errorMessage: capturedError || `HTTP ${status} Internal Server Error`,
        userEmail: req.authUser?.email ?? null,
        ipAddress: extractClientIp(req),
      });
    } else if (status === 403 && !req.originalUrl.includes('/health')) {
      void recordSecurityEvent({
        organizationId: req.organizationId ?? null,
        eventType: 'FORBIDDEN_ACCESS',
        severity: 'warning',
        userEmail: req.authUser?.email ?? null,
        ipAddress: extractClientIp(req),
        endpoint: req.originalUrl,
        method: req.method,
        details: { message: capturedError || 'HTTP 403 Forbidden' },
      });
    }
  });

  next();
}

// Express terminal error handler (never leaks stack traces or env vars)
export function globalApiErrorHandler(
  err: any,
  req: AuthRequest,
  res: Response,
  _next: NextFunction
) {
  const statusCode = Number(err?.status || err?.statusCode || 500);
  const safeMessage =
    statusCode >= 500
      ? 'Internal server error. Event logged for Super Admin review.'
      : String(err?.message || 'Request failed');

  void recordApiError({
    organizationId: req.organizationId ?? null,
    method: req.method,
    path: req.originalUrl || req.path,
    statusCode,
    errorMessage: String(err?.message || 'Unhandled server exception'),
    userEmail: req.authUser?.email ?? null,
    ipAddress: extractClientIp(req),
  });

  if (!res.headersSent) {
    res.status(statusCode).json({ error: safeMessage });
  }
}

// Strict File Upload Validation (MIME, Extension & Size)
export function validateUploadedDocument(params: {
  fileName?: string | null;
  fileDataUrl?: string | null;
  fileSize?: number | null;
}): { ok: true; estimatedBytes: number; mimeType: string } | { ok: false; reason: string } {
  const name = String(params.fileName || '').trim();
  if (name) {
    const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
    if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
      return {
        ok: false,
        reason: `File extension ".${ext}" is blocked by security policy. Allowed: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}.`,
      };
    }
  }

  let mimeType = 'application/pdf';
  let estimatedBytes = Number(params.fileSize || 0);

  if (params.fileDataUrl && typeof params.fileDataUrl === 'string') {
    const match = params.fileDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return { ok: false, reason: 'Invalid file encoding. Expected base64 data URI.' };
    }
    mimeType = match[1].toLowerCase();
    const base64Payload = match[2];
    if (!ALLOWED_MIME_PREFIXES.some((allowed) => mimeType.startsWith(allowed))) {
      return {
        ok: false,
        reason: `MIME type "${mimeType}" is not permitted for EHS document uploads.`,
      };
    }
    estimatedBytes = Math.floor((base64Payload.length * 3) / 4);
  }

  if (estimatedBytes > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      reason: `File exceeds maximum allowed size of ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`,
    };
  }

  return { ok: true, estimatedBytes, mimeType };
}

// Time-Limited HMAC-SHA256 Signed Document URLs (Backend-only signing key)
function getDocumentSigningSecret(): string {
  return (
    process.env.DOCUMENT_SIGNING_SECRET?.trim() ||
    crypto
      .createHash('sha256')
      .update(`${process.env.SQL_PASSWORD || 'arshiel-local'}:arshiel-doc-signing-v1`)
      .digest('hex')
  );
}

export function createSignedDocumentToken(params: {
  documentId: string;
  organizationId: string;
  expiresInSeconds?: number;
}): { token: string; expiresAt: string } {
  const ttl = Math.min(3600, Math.max(60, params.expiresInSeconds ?? 900)); // default 15 mins
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const payload = `${params.documentId}.${params.organizationId}.${exp}`;
  const sig = crypto
    .createHmac('sha256', getDocumentSigningSecret())
    .update(payload)
    .digest('base64url');
  return {
    token: `${payload}.${sig}`,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}

export function verifySignedDocumentToken(
  token: string
): { valid: true; documentId: string; organizationId: string } | { valid: false; reason: string } {
  const parts = String(token || '').split('.');
  if (parts.length !== 4) return { valid: false, reason: 'Malformed signature token' };
  const [documentId, organizationId, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return { valid: false, reason: 'Signed document URL has expired' };
  }
  const expectedSig = crypto
    .createHmac('sha256', getDocumentSigningSecret())
    .update(`${documentId}.${organizationId}.${expStr}`)
    .digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false, reason: 'Invalid document signature' };
  }
  return { valid: true, documentId, organizationId };
}

// Optional Real Supabase Storage Signed URL Helper (ONLY runs when backend secrets exist)
export async function createSupabaseSignedUrlIfConfigured(storagePath: string, expiresInSeconds = 900) {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || 'arshiel-ehs-documents';
  if (!url || !serviceKey) {
    return { configured: false as const, signedUrl: null };
  }
  try {
    const cleanBase = url.replace(/\/+$/, '');
    const resp = await fetch(`${cleanBase}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${storagePath}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: expiresInSeconds }),
    });
    if (!resp.ok) {
      return { configured: true as const, signedUrl: null, error: `Supabase Storage HTTP ${resp.status}` };
    }
    const data = (await resp.json()) as { signedURL?: string };
    return {
      configured: true as const,
      signedUrl: data.signedURL ? `${cleanBase}/storage/v1${data.signedURL}` : null,
    };
  } catch (err: any) {
    return { configured: true as const, signedUrl: null, error: err?.message || 'Supabase Storage error' };
  }
}
