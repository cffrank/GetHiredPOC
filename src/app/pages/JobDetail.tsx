"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/app/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/Card";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { ErrorBoundary, ErrorFallback } from "@/app/components/ErrorBoundary";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string | null;
  remote: number;
  salary_min: number | null;
  salary_max: number | null;
  description: string;
  requirements: string;
  posted_at: number;
}

interface AIAnalysis {
  matchScore: number;
  strengths: string[];
  concerns: string[];
  recommendation: string;
}

function JobDetailContent({ params }: { params: { id: string } }) {
  const [job, setJob] = useState<Job | null>(null);
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJob();
  }, [params.id]);

  const loadJob = async () => {
    const response = await fetch(`/api/jobs/${params.id}`);
    const data = await response.json();
    setJob(data.job);
    setSaved(data.saved || false);
    setLoading(false);
  };

  const handleSave = async () => {
    if (saved) {
      await fetch(`/api/jobs/${params.id}/unsave`, { method: "DELETE" });
      setSaved(false);
    } else {
      await fetch(`/api/jobs/${params.id}/save`, { method: "POST" });
      setSaved(true);
    }
  };

  const handleAnalyze = async () => {
    setLoadingAnalysis(true);
    const response = await fetch(`/api/jobs/${params.id}/analyze`, { method: "POST" });
    const data = await response.json();
    setAnalysis(data.analysis);
    setLoadingAnalysis(false);
  };

  const handleApply = async () => {
    const response = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: params.id, status: "applied" }),
    });
    if (response.ok) {
      setApplied(true);
    }
  };

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return "Salary not specified";
    if (min && max) return `$${(min / 1000).toFixed(0)}k - $${(max / 1000).toFixed(0)}k`;
    if (min) return `From $${(min / 1000).toFixed(0)}k`;
    return `Up to $${(max! / 1000).toFixed(0)}k`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-96 animate-pulse bg-[hsl(var(--muted))] rounded-lg" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <p className="text-[hsl(var(--muted-foreground))]">Job not found</p>
      </div>
    );
  }

  const requirements = job.requirements ? JSON.parse(job.requirements) : [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <a href="/jobs" className="text-sm text-[hsl(var(--primary))] hover:underline mb-4 inline-block">
          Back to jobs
        </a>
      </div>

      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start mb-4">
              <div>
                <CardTitle className="text-3xl mb-2">{job.title}</CardTitle>
                <CardDescription className="text-lg">{job.company}</CardDescription>
              </div>
              <Button variant={saved ? "default" : "outline"} onClick={handleSave}>
                {saved ? "Saved" : "Save"}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {job.remote === 1 && <Badge>Remote</Badge>}
              {job.location && <Badge variant="outline">{job.location}</Badge>}
              <Badge variant="secondary">{formatSalary(job.salary_min, job.salary_max)}</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-[hsl(var(--muted-foreground))]">{job.description}</p>
            </div>

            {requirements.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Requirements</h3>
                <ul className="list-disc list-inside space-y-1 text-[hsl(var(--muted-foreground))]">
                  {requirements.map((req: string, i: number) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-4 border-t border-[hsl(var(--border))] space-y-3">
              <Button onClick={handleApply} disabled={applied} className="w-full" size="lg">
                {applied ? "Applied" : "Apply for this Job"}
              </Button>
              <Button onClick={handleAnalyze} disabled={loadingAnalysis} className="w-full" variant="outline">
                {loadingAnalysis ? "Analyzing..." : "Get AI Match Analysis"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </ErrorBoundary>

      {analysis && (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <div className="mt-6 pt-4 border-t border-[hsl(var(--border))] space-y-4">
            <div>
              <h3 className="font-semibold mb-2">AI Match Analysis</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className={`text-5xl font-bold ${getScoreColor(analysis.matchScore)}`}>
                  {analysis.matchScore}%
                </div>
                <div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">Match Score</p>
                </div>
              </div>
            </div>

            {analysis.strengths.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 text-green-600">Your Strengths</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {analysis.strengths.map((strength, i) => (
                    <li key={i}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.concerns.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 text-yellow-600">Areas to Address</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {analysis.concerns.map((concern, i) => (
                    <li key={i}>{concern}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-[hsl(var(--muted))] p-4 rounded-md">
              <h4 className="font-medium mb-2">Recommendation</h4>
              <p className="text-sm">{analysis.recommendation}</p>
            </div>
          </div>
        </ErrorBoundary>
      )}
    </div>
  );
}

export function JobDetail({ params }: { params: { id: string } }) {
  return (
    <>
      <Navigation />
      <JobDetailContent params={params} />
    </>
  );
}
