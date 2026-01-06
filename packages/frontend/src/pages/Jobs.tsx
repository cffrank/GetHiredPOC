import { useState } from 'react';
import { Link } from 'react-router-dom';
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
    <div className="min-h-full bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold mb-8">Browse Jobs</h1>

          {/* Filters */}
          <Card className="mb-8 shadow-soft">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input
                  placeholder="Search by title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="min-h-touch"
                />
                <Input
                  placeholder="Location..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="min-h-touch"
                />
                <select
                  className="flex min-h-touch w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-soft"
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
                <Card key={job.id} className="shadow-soft hover:shadow-soft-lg transition-shadow">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-xl sm:text-2xl">{job.title}</CardTitle>
                        <CardDescription className="text-base mt-1">{job.company}</CardDescription>
                      </div>
                      <Link to={`/jobs/${job.id}`} className="w-full sm:w-auto">
                        <Button size="sm" className="w-full sm:w-auto">View Details</Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {job.remote === 1 && <Badge className="bg-green-100 text-green-800">Remote</Badge>}
                      {job.remote === 2 && <Badge className="bg-blue-100 text-blue-800">Hybrid</Badge>}
                      {job.remote === 0 && <Badge className="bg-gray-100 text-gray-800">On-Site</Badge>}
                      {job.location && <Badge className="bg-primary-100 text-primary-800">{job.location}</Badge>}
                      {job.salary_min && job.salary_max && (
                        <Badge className="bg-purple-100 text-purple-800">${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}</Badge>
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
  );
}
