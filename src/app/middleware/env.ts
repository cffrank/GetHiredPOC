import { RouteMiddleware } from "rwsdk/router";
import type { AppContext } from "@/worker";

// Global env storage using AsyncLocalStorage pattern
let globalEnv: Env | null = null;

export function setGlobalEnv(env: Env) {
  globalEnv = env;
}

export function getEnv(): Env {
  if (!globalEnv) {
    throw new Error("Env not initialized");
  }
  return globalEnv;
}

export const setupEnv = (env: Env): RouteMiddleware<any> => {
  return ({ ctx }) => {
    setGlobalEnv(env);
    (ctx as AppContext).env = env;
  };
};
