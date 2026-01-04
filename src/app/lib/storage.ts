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

  // Return a URL path that can be used to retrieve the file
  return `/api/files/${key}`;
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
