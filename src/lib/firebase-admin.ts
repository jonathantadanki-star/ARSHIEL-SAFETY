import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const firebaseConfig = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../firebase-applet-config.json'), 'utf-8')
) as { projectId: string };

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

export const adminAuth = getAuth();
