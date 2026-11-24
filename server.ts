import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import coreRouter from './src/routes/core.ts';
import moduleBuilderRouter from './src/routes/moduleBuilder.ts';
import ehsRouter from './src/routes/ehs.ts';
import aiRouter from './src/routes/ai.ts';
import platformGovernanceRouter from './src/routes/platformGovernance.ts';
import { publicCmsRouter, adminCmsRouter } from './src/routes/publicCms.ts';
import { requireAuth } from './src/middleware/auth.ts';
import {
  apiTelemetryMiddleware,
  createRateLimiter,
  globalApiErrorHandler,
  securityHeaders,
} from './src/middleware/security.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(securityHeaders);
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(apiTelemetryMiddleware);

const publicLimiter = createRateLimiter({ name: 'public', windowMs: 60_000, max: 45 });
const aiLimiter = createRateLimiter({ name: 'ai', windowMs: 60_000, max: 30 });
const apiLimiter = createRateLimiter({ name: 'api', windowMs: 60_000, max: 240 });

// Health & official ownership verification endpoint (non-DB probe)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    platform: 'ARSHIEL SAFETY',
    brand: 'ARSHIEL EHS AI SOLUTIONS',
    owner: 'Jonathan Thadanki',
    founder: 'Jonathan Thadanki',
    creator: 'Jonathan Thadanki',
    softwareDeveloper: 'Jonathan Thadanki',
    role: 'Founder, Owner, Creator & Software Developer',
    contactEmail: 'jonathan.tadanki@gmail.com',
    contactPhones: '+91 9133 661 933 / +91 81 84 83 40 60 / +91 81 86 80 88 48',
    timestamp: new Date().toISOString(),
  });
});

// Dynamic domain-aware robots.txt and sitemap.xml for Google Search & AI crawlers
app.get('/robots.txt', (req, res) => {
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const host = req.get('host') || 'localhost:3000';
  const origin = `${proto}://${host}`;
  res
    .type('text/plain; charset=utf-8')
    .send(
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /api/',
        '',
        'User-agent: Googlebot',
        'Allow: /',
        '',
        'User-agent: Bingbot',
        'Allow: /',
        '',
        'User-agent: GPTBot',
        'Allow: /',
        '',
        'User-agent: OAI-SearchBot',
        'Allow: /',
        '',
        'User-agent: PerplexityBot',
        'Allow: /',
        '',
        'User-agent: Google-Extended',
        'Allow: /',
        '',
        `Sitemap: ${origin}/sitemap.xml`,
        `# Official AI & Ownership Profile: ${origin}/llms.txt`,
      ].join('\n')
    );
});

app.get('/sitemap.xml', (req, res) => {
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const host = req.get('host') || 'localhost:3000';
  const origin = `${proto}://${host}`;
  const today = new Date().toISOString().slice(0, 10);
  res
    .type('application/xml; charset=utf-8')
    .send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${origin}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${origin}/overview</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${origin}/app</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`);
});

// Public unauthenticated homepage CMS, Demo Request & Signed Document Download API
app.use('/api/public', publicLimiter, publicCmsRouter);

// Rate-limited Authenticated API routes
app.use('/api', apiLimiter);
app.use('/api', requireAuth, coreRouter);
app.use('/api', requireAuth, moduleBuilderRouter);
app.use('/api', requireAuth, ehsRouter);
app.use('/api', requireAuth, platformGovernanceRouter);
app.use('/api/cms', requireAuth, adminCmsRouter);
app.use('/api/ai', aiLimiter, requireAuth, aiRouter);
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});
app.use(globalApiErrorHandler);

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    // Serve a no-WebSocket /@vite/client shim in dev when HMR/WS are disabled so the browser
    // never attempts a wss:// connection that fails with "WebSocket closed without opened."
    app.get('/@vite/client', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      res.type('application/javascript; charset=utf-8').send(`
const sheetsMap = new Map();

export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  } else {
    style.textContent = content;
  }
}

export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    if (style.parentNode) style.parentNode.removeChild(style);
    sheetsMap.delete(id);
  }
}

export function injectQuery(url, queryToInject) {
  if (!url || (!url.startsWith('.') && !url.startsWith('/'))) return url;
  const pathname = url.replace(/[?#].*$/, '');
  const { search, hash } = new URL(url, 'http://vite.local');
  return pathname + '?' + queryToInject + (search ? '&' + search.slice(1) : '') + hash;
}

export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}

const BaseElement = typeof HTMLElement !== 'undefined' ? HTMLElement : class {};
export class ErrorOverlay extends BaseElement {
  constructor() {
    super();
  }
}
if (typeof customElements !== 'undefined' && !customElements.get('vite-error-overlay')) {
  customElements.define('vite-error-overlay', ErrorOverlay);
}
`);
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ARSHIEL SAFETY Enterprise EHS Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
