// Global env storage for accessing Cloudflare bindings in route handlers
let env: Env;

export function initEnv(e: Env) {
  env = e;
}

export function getEnv(): Env {
  if (!env) {
    throw new Error("Env not initialized. Make sure initEnv is called in middleware.");
  }
  return env;
}
