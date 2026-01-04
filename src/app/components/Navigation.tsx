"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/Button";

export function Navigation() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <nav className="border-b border-[hsl(var(--border))]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-8">
            <a href="/" className="text-xl font-bold text-[hsl(var(--primary))]">
              JobMatch AI
            </a>
            {user && (
              <div className="hidden md:flex gap-6">
                <a
                  href="/jobs"
                  className="text-sm font-medium text-[hsl(var(--foreground))]/70 hover:text-[hsl(var(--foreground))] transition-colors"
                >
                  Jobs
                </a>
                <a
                  href="/saved"
                  className="text-sm font-medium text-[hsl(var(--foreground))]/70 hover:text-[hsl(var(--foreground))] transition-colors"
                >
                  Saved
                </a>
                <a
                  href="/applications"
                  className="text-sm font-medium text-[hsl(var(--foreground))]/70 hover:text-[hsl(var(--foreground))] transition-colors"
                >
                  Applications
                </a>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="h-9 w-20 animate-pulse bg-[hsl(var(--muted))] rounded"></div>
            ) : user ? (
              <>
                <a href="/profile">
                  <Button variant="ghost" size="sm">
                    Profile
                  </Button>
                </a>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <a href="/login">
                  <Button variant="ghost" size="sm">
                    Sign in
                  </Button>
                </a>
                <a href="/signup">
                  <Button size="sm">Sign up</Button>
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
