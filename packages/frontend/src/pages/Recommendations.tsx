import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { apiClient } from '../lib/api-client';

interface JobMatch {
  match: {
    jobId: string;
    score: number;
    strengths: string[];
    concerns: string[];
    recommendation: string;
  };
  job: {
    id: string;
    title: string;
    company: string;
    location: string;
    remote: number;
    salary_min: number;
    salary_max: number;
    description: string;
  };
}

export default function Recommendations() {
  const navigate = useNavigate();
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [hidingJobs, setHidingJobs] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadRecommendations() {
      try {
        setLoading(true);

        // Step 1: Fetch list of recent jobs (fast, no AI)
        const jobsData = await apiClient.getJobs();
        const recentJobs = jobsData.jobs.slice(0, 10); // Get top 10 jobs
        const ids = recentJobs.map((job: any) => job.id);

        setJobIds(ids);
        setLoadingJobs(new Set(ids));
        setLoading(false);

        // Step 2: Load AI matches in parallel (lazy loading)
        const matchPromises = ids.map(async (jobId: string) => {
          try {
            const result = await apiClient.quickMatch(jobId);

            // Add to recommendations as they complete
            setRecommendations(prev => {
              // Remove duplicates and add new result
              const filtered = prev.filter(r => r.job.id !== jobId);
              return [...filtered, result].sort((a, b) => b.match.score - a.match.score);
            });

            // Remove from loading set
            setLoadingJobs(prev => {
              const updated = new Set(prev);
              updated.delete(jobId);
              return updated;
            });
          } catch (err: any) {
            console.error(`Failed to analyze job ${jobId}:`, err);
            // Remove from loading even if failed
            setLoadingJobs(prev => {
              const updated = new Set(prev);
              updated.delete(jobId);
              return updated;
            });
          }
        });

        // Wait for all to complete (but don't block UI updates)
        await Promise.all(matchPromises);

      } catch (err: any) {
        console.error('Failed to load recommendations:', err);
        setError(err.message);
        setLoading(false);
      }
    }

    loadRecommendations();
  }, []);

  const handleHideJob = async (jobId: string) => {
    try {
      setHidingJobs(prev => new Set(prev).add(jobId));
      await apiClient.hideJob(jobId);

      // Remove from recommendations
      setRecommendations(prev => prev.filter(r => r.job.id !== jobId));
      setHidingJobs(prev => {
        const updated = new Set(prev);
        updated.delete(jobId);
        return updated;
      });
    } catch (err: any) {
      console.error(`Failed to hide job ${jobId}:`, err);
      setHidingJobs(prev => {
        const updated = new Set(prev);
        updated.delete(jobId);
        return updated;
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading jobs...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-red-600">Error: {error}</div>
        </div>
      </div>
    );
  }

  const getMatchColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 60) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getRecommendationLabel = (rec: string) => {
    const labels: Record<string, string> = {
      strong: 'Strong Match',
      good: 'Good Match',
      fair: 'Fair Match',
      weak: 'Consider Carefully'
    };
    return labels[rec] || rec;
  };

  return (
    <div className="min-h-full bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Top Job Matches</h1>
            <p className="text-gray-600">
              AI-powered recommendations based on your profile and experience
            </p>
            {loadingJobs.size > 0 && (
              <p className="text-sm text-blue-600 mt-2">
                Analyzing {loadingJobs.size} job{loadingJobs.size !== 1 ? 's' : ''}...
              </p>
            )}
          </div>

          {recommendations.length === 0 && loadingJobs.size === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-600 mb-4">No recommendations available yet.</p>
                <p className="text-sm text-gray-500 mb-6">
                  Complete your profile to get personalized job recommendations!
                </p>
                <Button onClick={() => navigate('/profile')}>
                  Complete Profile
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Show loaded recommendations */}
              {recommendations.map(({ match, job }) => (
                <Card key={job.id} className={`hover:shadow-lg transition-shadow ${getMatchColor(match.score)}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-2xl mb-2">{job.title}</CardTitle>
                        <CardDescription className="text-base">{job.company}</CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold mb-1">
                          {match.score}%
                        </div>
                        <Badge className={match.score >= 80 ? 'bg-green-600' : match.score >= 60 ? 'bg-blue-600' : 'bg-yellow-600'}>
                          {getRecommendationLabel(match.recommendation)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2 flex-wrap">
                      {job.remote === 1 && <Badge>Remote</Badge>}
                      {job.remote === 2 && <Badge>Hybrid</Badge>}
                      {job.remote === 0 && <Badge>On-Site</Badge>}
                      {job.location && <Badge>{job.location}</Badge>}
                      {job.salary_min && job.salary_max && (
                        <Badge>
                          ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}
                        </Badge>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-gray-700 line-clamp-2">{job.description}</p>
                    </div>

                    {match.strengths?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-green-800">
                          Why you're a great fit:
                        </h4>
                        <ul className="space-y-1">
                          {match.strengths.slice(0, 3).map((strength, i) => (
                            <li key={i} className="text-sm text-gray-700 flex items-start">
                              <span className="text-green-600 mr-2">✓</span>
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {match.concerns?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-orange-800">
                          Areas to consider:
                        </h4>
                        <ul className="space-y-1">
                          {match.concerns.slice(0, 2).map((concern, i) => (
                            <li key={i} className="text-sm text-gray-700 flex items-start">
                              <span className="text-orange-600 mr-2">!</span>
                              <span>{concern}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button onClick={() => navigate(`/jobs/${job.id}`)} className="flex-1">
                        View Full Details
                      </Button>
                      <Button onClick={() => navigate(`/jobs/${job.id}`)} variant="outline">
                        Apply Now
                      </Button>
                      <Button
                        onClick={() => handleHideJob(job.id)}
                        variant="outline"
                        disabled={hidingJobs.has(job.id)}
                        className="text-gray-600 hover:text-red-600"
                      >
                        {hidingJobs.has(job.id) ? 'Hiding...' : 'Not Interested'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Show loading skeletons for pending jobs */}
              {Array.from(loadingJobs).map(jobId => (
                <Card key={jobId} className="animate-pulse">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1 space-y-2">
                        <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-5 bg-gray-200 rounded w-1/2"></div>
                      </div>
                      <div className="text-right space-y-2">
                        <div className="h-10 w-16 bg-gray-200 rounded"></div>
                        <div className="h-6 w-24 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
    </div>
  );
}
