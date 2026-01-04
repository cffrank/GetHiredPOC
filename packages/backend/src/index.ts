import { Hono } from 'hono';
import type { Env } from './services/db.service';
import auth from './routes/auth';
import jobs from './routes/jobs';
import applications from './routes/applications';
import profile from './routes/profile';
import { getFile } from './services/storage.service';

const app = new Hono<{ Bindings: Env }>();

// Manual CORS middleware for development
app.use('*', async (c, next) => {
  const origin = c.req.header('origin') || '*';

  c.header('Access-Control-Allow-Origin', origin);
  c.header('Access-Control-Allow-Credentials', 'true');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  c.header('Access-Control-Max-Age', '86400');

  if (c.req.method === 'OPTIONS') {
    return c.body(null, 204);
  }

  await next();
});

// Routes
app.route('/api/auth', auth);
app.route('/api/jobs', jobs);
app.route('/api/applications', applications);
app.route('/api/profile', profile);

// File serving endpoint
app.get('/api/files/*', async (c) => {
  try {
    const path = c.req.path.replace('/api/files/', '');
    const file = await getFile(c.env, path);

    if (!file) {
      return c.json({ error: 'File not found' }, 404);
    }

    return new Response(file.body, {
      headers: {
        'Content-Type': file.httpMetadata?.contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
