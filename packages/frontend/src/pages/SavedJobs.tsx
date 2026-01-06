import { Link } from 'react-router-dom';
import { useSavedJobs, useUnsaveJob } from '../hooks/useJobs';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export default function SavedJobs() {
  const { data, isLoading } = useSavedJobs();
  const unsaveJobMutation = useUnsaveJob();

  return (
    <div className="min-h-full bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold mb-8">Saved Jobs</h1>

          {isLoading ? (
            <div className="text-center py-12">Loading...</div>
          ) : (
            <div className="space-y-4">
              {data?.jobs.map((job: any) => (
                <Card key={job.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{job.title}</CardTitle>
                        <CardDescription>{job.company}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/jobs/${job.id}`}>
                          <Button size="sm">View Details</Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unsaveJobMutation.mutate(job.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-2">
                      {job.remote === 1 && <Badge>Remote</Badge>}
                      {job.remote === 2 && <Badge>Hybrid</Badge>}
                      {job.remote === 0 && <Badge>On-Site</Badge>}
                      {job.location && <Badge>{job.location}</Badge>}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{job.description}</p>
                  </CardContent>
                </Card>
              ))}
              {data?.jobs.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-gray-500 mb-4">No saved jobs yet</p>
                    <Link to="/jobs">
                      <Button>Browse Jobs</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
    </div>
  );
}
