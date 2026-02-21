"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/app/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/Card";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { ErrorBoundary, ErrorFallback } from "@/app/components/ErrorBoundary";

interface Application {
  id: string;
  job_id: string;
  job_title: string;
  job_company: string;
  status: string;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

function ApplicationsContent() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedApp, setDraggedApp] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    const response = await fetch("/api/applications");
    if (response.ok) {
      const data = await response.json();
      setApplications(data.applications || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/applications/${id}`, { method: "DELETE" });
    if (response.ok) {
      setApplications(applications.filter((app) => app.id !== id));
      setConfirmingDeleteId(null);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const response = await fetch(`/api/applications/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (response.ok) {
      setApplications(
        applications.map((app) =>
          app.id === id ? { ...app, status: newStatus, updated_at: Math.floor(Date.now() / 1000) } : app
        )
      );
    }
  };

  const handleDragStart = (e: React.DragEvent, appId: string) => {
    setDraggedApp(appId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedApp(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (draggedApp) {
      await handleStatusChange(draggedApp, newStatus);
      setDraggedApp(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      applied: "outline",
      screening: "secondary",
      interview: "default",
      offer: "default",
      rejected: "destructive",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const groupByStatus = () => {
    const groups: Record<string, Application[]> = {
      applied: [],
      screening: [],
      interview: [],
      offer: [],
      rejected: [],
    };

    applications.forEach((app) => {
      if (groups[app.status]) {
        groups[app.status].push(app);
      }
    });

    return groups;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-96 animate-pulse bg-[hsl(var(--muted))] rounded-lg" />
      </div>
    );
  }

  const grouped = groupByStatus();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Application Tracker</h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          Track and manage your job applications
        </p>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-[hsl(var(--muted-foreground))] mb-4">
              No applications yet. Start by browsing jobs!
            </p>
            <a href="/jobs">
              <Button>Browse Jobs</Button>
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(grouped).map(([status, apps]) => (
            <div key={status}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold capitalize">{status}</h2>
                <Badge variant="outline">{apps.length}</Badge>
              </div>
              <div
                className="space-y-3 min-h-[200px] p-2 rounded-lg transition-colors"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status)}
                style={{
                  backgroundColor: draggedApp ? 'hsl(var(--muted) / 0.3)' : 'transparent'
                }}
              >
                {apps.length === 0 ? (
                  <div className="text-sm text-[hsl(var(--muted-foreground))] text-center py-8 border-2 border-dashed border-[hsl(var(--border))] rounded-lg">
                    No {status} applications
                  </div>
                ) : (
                  apps.map((app) => (
                    <Card
                      key={app.id}
                      className="hover:shadow-md transition-shadow cursor-move"
                      draggable
                      onDragStart={(e) => handleDragStart(e, app.id)}
                      onDragEnd={handleDragEnd}
                      style={{
                        opacity: draggedApp === app.id ? 0.5 : 1
                      }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-base mb-1">
                              {app.job_title}
                            </CardTitle>
                            <CardDescription className="text-sm">
                              {app.job_company}
                            </CardDescription>
                          </div>
                          {getStatusBadge(app.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {app.notes && (
                          <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3 line-clamp-2">
                            {app.notes}
                          </p>
                        )}
                        <div className="mb-3">
                          <label className="text-xs text-[hsl(var(--muted-foreground))] block mb-1">
                            Update Status
                          </label>
                          <select
                            value={app.status}
                            onChange={(e) => handleStatusChange(app.id, e.target.value)}
                            className="w-full text-xs rounded-md border border-[hsl(var(--input))] bg-transparent px-2 py-1.5"
                          >
                            <option value="applied">Applied</option>
                            <option value="screening">Screening</option>
                            <option value="interview">Interview</option>
                            <option value="offer">Offer</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <a href={`/jobs/${app.job_id}`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full text-xs">
                              View Job
                            </Button>
                          </a>
                          {confirmingDeleteId === app.id ? (
                            <div className="flex gap-1 items-center">
                              <span className="text-xs text-[hsl(var(--muted-foreground))]">Delete?</span>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="text-xs"
                                onClick={() => handleDelete(app.id)}
                              >
                                Yes
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => setConfirmingDeleteId(null)}
                              >
                                No
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="text-xs"
                              onClick={() => setConfirmingDeleteId(app.id)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
                          Updated {new Date(app.updated_at * 1000).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Applications() {
  return (
    <>
      <Navigation />
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <ApplicationsContent />
      </ErrorBoundary>
    </>
  );
}
