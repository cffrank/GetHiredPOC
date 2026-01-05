import type { Env } from './db.service';

export async function uploadFile(
  env: Env,
  file: File,
  path: string
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const key = `${path}/${Date.now()}-${file.name}`;

  await env.STORAGE.put(key, arrayBuffer, {
    httpMetadata: {
      contentType: file.type,
    },
  });

  // Return absolute backend URL for file serving
  const baseUrl = env.BACKEND_URL || 'http://localhost:8787';
  return `${baseUrl}/api/files/${key}`;
}

export async function getFile(
  env: Env,
  key: string
): Promise<R2ObjectBody | null> {
  return env.STORAGE.get(key);
}

export async function deleteFile(env: Env, key: string): Promise<void> {
  await env.STORAGE.delete(key);
}
