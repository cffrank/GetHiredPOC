import { render, route } from "rwsdk/router";
import { defineApp } from "rwsdk/worker";

import { Document } from "@/app/Document";
import { setCommonHeaders } from "@/app/headers";
import { Home } from "@/app/pages/Home";
import { Login } from "@/app/pages/Login";
import { Signup } from "@/app/pages/Signup";
import { Jobs } from "@/app/pages/Jobs";
import { JobDetail } from "@/app/pages/JobDetail";
import { SavedJobs } from "@/app/pages/SavedJobs";
import { Profile } from "@/app/pages/Profile";
import { Applications } from "@/app/pages/Applications";
import { initEnv } from "@/app/lib/env";

// API handlers
import { handleSignup, handleLogin, handleLogout, handleMe } from "@/app/api/auth";
import { handleGetJobs, handleGetJob, handleSaveJob, handleUnsaveJob, handleGetSavedJobs, handleAnalyzeJob } from "@/app/api/jobs";
import { handleGetApplications, handleCreateApplication, handleUpdateApplication, handleDeleteApplication } from "@/app/api/applications";
import { handleGetProfile, handleUpdateProfile } from "@/app/api/profile";

export interface AppContext {
  env: Env;
}

const app = defineApp([
  setCommonHeaders(),

  // Auth API routes
  route("/api/auth/signup", ({ request }) => handleSignup({ request })),
  route("/api/auth/login", ({ request }) => handleLogin({ request })),
  route("/api/auth/logout", ({ request }) => handleLogout({ request })),
  route("/api/auth/me", ({ request }) => handleMe({ request })),

  // Profile API routes
  route("/api/profile", {
    get: ({ request }) => handleGetProfile({ request }),
    put: ({ request }) => handleUpdateProfile({ request }),
  }),

  // Jobs API routes
  route("/api/jobs", ({ request }) => handleGetJobs({ request })),
  route("/api/jobs/saved", ({ request }) => handleGetSavedJobs({ request })),
  route("/api/jobs/:id", ({ request, params }) => handleGetJob({ request, params })),
  route("/api/jobs/:id/save", ({ request, params }) => handleSaveJob({ request, params })),
  route("/api/jobs/:id/unsave", ({ request, params }) => handleUnsaveJob({ request, params })),
  route("/api/jobs/:id/analyze", ({ request, params }) => handleAnalyzeJob({ request, params })),

  // Applications API routes
  route("/api/applications", {
    get: ({ request }) => handleGetApplications({ request }),
    post: ({ request }) => handleCreateApplication({ request }),
  }),
  route("/api/applications/:id", {
    put: ({ request, params }) => handleUpdateApplication({ request, params }),
    delete: ({ request, params }) => handleDeleteApplication({ request, params }),
  }),

  // Page routes
  render(Document, [
    route("/", Home),
    route("/login", Login),
    route("/signup", Signup),
    route("/jobs", Jobs),
    route("/jobs/:id", JobDetail),
    route("/saved", SavedJobs),
    route("/profile", Profile),
    route("/applications", Applications),
  ]),
]);

// Wrap the fetch handler to initialize env globally before each request
const originalFetch = app.fetch;
app.fetch = (request: Request, env: Env, cf: ExecutionContext) => {
  initEnv(env);
  return originalFetch.call(app, request, env, cf);
};

export default app;
