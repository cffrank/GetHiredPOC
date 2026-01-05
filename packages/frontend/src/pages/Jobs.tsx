import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Navigation } from '../components/Navigation';
import { useJobs } from '../hooks/useJobs';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export default function Jobs() {
  const [title, setTitle] = useState('');
  const [remote, setRemote] = useState<boolean | undefined>();
  const [location, setLocation] = useState('');

  const { data, isLoading } = useJobs({ title, remote, location });

  return (
    <>
      <Navigation />
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold mb-8">Browse Jobs</h1>

          {/* Filters */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-4 gap-4">
                <Input
                  placeholder="Search by title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <Input
                  placeholder="Location..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
                <select
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={remote === undefined ? 'all' : remote === true ? 'yes' : remote === false ? 'no' : 'hybrid'}
                  onChange={(e) => {
                    if (e.target.value === 'all') setRemote(undefined);
                    else if (e.target.value === 'yes') setRemote(true);
                    else if (e.target.value === 'no') setRemote(false);
                    // Note: 'hybrid' filter not yet implemented in backend query params
                  }}
                >
                  <option value="all">All Jobs</option>
                  <option value="yes">Remote Only</option>
                  <option value="no">On-site Only</option>
                  <option value="hybrid">Hybrid Only</option>
                </select>
                <Button variant="outline" onClick={() => { setTitle(''); setLocation(''); setRemote(undefined); }}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Jobs List */}
          {isLoading ? (
            <div className="text-center py-12">Loading jobs...</div>
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
                      <Link to={`/jobs/${job.id}`}>
                        <Button size="sm">View Details</Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-2">
                      {job.remote === 1 && <Badge>Remote</Badge>}
                      {job.remote === 2 && <Badge>Hybrid</Badge>}
                      {job.remote === 0 && <Badge>On-Site</Badge>}
                      {job.location && <Badge>{job.location}</Badge>}
                      {job.salary_min && job.salary_max && (
                        <Badge>${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{job.description}</p>
                  </CardContent>
                </Card>
              ))}
              {data?.jobs.length === 0 && (
                <div className="text-center py-12 text-gray-500">No jobs found matching your criteria</div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
