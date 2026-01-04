import { signup, login, deleteSession, setSessionCookie, clearSessionCookie, getSession, getCookie } from "@/app/lib/auth";
import { getEnv } from "@/app/lib/env";

export async function handleSignup({ request }: { request: Request }) {
  const env = getEnv();

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await request.json() as any;
    const { email, password } = body;

    if (!email || !password) {
      return Response.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const { user, sessionId } = await signup(env, email, password);

    return Response.json(
      { user },
      {
        status: 201,
        headers: {
          "Set-Cookie": setSessionCookie(sessionId),
        },
      }
    );
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}

export async function handleLogin({ request }: { request: Request }) {
  const env = getEnv();

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await request.json() as any;
    const { email, password } = body;

    if (!email || !password) {
      return Response.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const { user, sessionId } = await login(env, email, password);

    return Response.json(
      { user },
      {
        status: 200,
        headers: {
          "Set-Cookie": setSessionCookie(sessionId),
        },
      }
    );
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 401 });
  }
}

export async function handleLogout({ request }: { request: Request }) {
  const env = getEnv();

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const sessionId = getCookie(request, "session");
  if (sessionId) {
    await deleteSession(env, sessionId);
  }

  return Response.json(
    { success: true },
    {
      status: 200,
      headers: {
        "Set-Cookie": clearSessionCookie(),
      },
    }
  );
}

export async function handleMe({ request }: { request: Request }) {
  const env = getEnv();

  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const sessionId = getCookie(request, "session");
  if (!sessionId) {
    return Response.json({ user: null }, { status: 200 });
  }

  const user = await getSession(env, sessionId);
  return Response.json({ user }, { status: 200 });
}
