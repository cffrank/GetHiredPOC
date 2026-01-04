"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/app/components/Navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/Card";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";

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

export function SavedJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSavedJobs();
  }, []);

  const loadSavedJobs = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/jobs/saved");
      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error("Failed to load saved jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return "Salary not specified";
    if (min && max) return `$${(min / 1000).toFixed(0)}k - $${(max / 1000).toFixed(0)}k`;
    if (min) return `From $${(min / 1000).toFixed(0)}k`;
    return `Up to $${(max! / 1000).toFixed(0)}k`;
  };

  return (
    <>
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Saved Jobs</h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            Jobs you've bookmarked for later review
          </p>
        </div>

        {/* Job Listings */}
        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 animate-pulse bg-[hsl(var(--muted))] rounded-lg" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[hsl(var(--muted-foreground))] mb-4">
              You haven't saved any jobs yet
            </p>
            <a href="/jobs">
              <Button>Browse Jobs</Button>
            </a>
          </div>
        ) : (
          <div className="grid gap-4">
            {jobs.map((job) => (
              <Card key={job.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl mb-2">{job.title}</CardTitle>
                      <CardDescription className="text-base">{job.company}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {job.remote === 1 && <Badge>Remote</Badge>}
                      {job.location && <Badge variant="outline">{job.location}</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4 line-clamp-2">
                    {job.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-medium text-[hsl(var(--primary))]">
                      {formatSalary(job.salary_min, job.salary_max)}
                    </span>
                    <span className="text-[hsl(var(--muted-foreground))]">
                      Posted {new Date(job.posted_at * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
                <CardFooter>
                  <a href={`/jobs/${job.id}`} className="w-full">
                    <Button variant="outline" className="w-full">
                      View Details
                    </Button>
                  </a>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
