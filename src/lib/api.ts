import { auth } from './firebase';
import { OfflineDraft } from '../types';

const ORG_STORAGE_KEY = 'arshiel_active_org_id';
const OFFLINE_DRAFTS_KEY = 'arshiel_offline_drafts';

export function getStoredOrgId(): string | null {
  return localStorage.getItem(ORG_STORAGE_KEY);
}

export function setStoredOrgId(orgId: string | null) {
  if (orgId) {
    localStorage.setItem(ORG_STORAGE_KEY, orgId);
  } else {
    localStorage.removeItem(ORG_STORAGE_KEY);
  }
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;
  const orgId = getStoredOrgId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (orgId) headers['X-Organization-Id'] = orgId;

  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function apiDownloadFile(path: string, fallbackFilename: string): Promise<void> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;
  const orgId = getStoredOrgId();

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (orgId) headers['X-Organization-Id'] = orgId;

  const res = await fetch(path, { method: 'GET', headers });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Download failed (${res.status})`);
  }

  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const filename = match?.[1] || fallbackFilename;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function getOfflineDrafts(): OfflineDraft[] {
  try {
    const raw = localStorage.getItem(OFFLINE_DRAFTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineDraft(draft: Omit<OfflineDraft, 'id' | 'createdAt'>): OfflineDraft {
  const drafts = getOfflineDrafts();
  const next: OfflineDraft = {
    ...draft,
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(OFFLINE_DRAFTS_KEY, JSON.stringify([next, ...drafts]));
  return next;
}

export function removeOfflineDraft(id: string) {
  const drafts = getOfflineDrafts().filter((d) => d.id !== id);
  localStorage.setItem(OFFLINE_DRAFTS_KEY, JSON.stringify(drafts));
}
