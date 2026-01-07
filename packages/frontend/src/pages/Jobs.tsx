import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useJobs } from '../hooks/useJobs';
import { useRecommendations } from '../hooks/useRecommendations';
import { useProfile } from '../hooks/useProfile';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

type TabType = 'all' | 'for-you';

export default function Jobs() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [title, setTitle] = useState('');
  const [remote, setRemote] = useState<boolean | undefined>();
  const [location, setLocation] = useState('');

  const { data: profileData } = useProfile();
  const isLoggedIn = !!profileData?.user;

  const { data, isLoading } = useJobs({ title, remote, location });
  const { data: recommendationsData, isLoading: recommendationsLoading } = useRecommendations(20);

  return (
    <div className="min-h-full bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold mb-6">Browse Jobs</h1>

          {/* Tabs */}
          {isLoggedIn && (
            <div className="flex gap-2 mb-6 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeTab === 'all'
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Jobs
              </button>
              <button
                onClick={() => setActiveTab('for-you')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeTab === 'for-you'
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                For You
                <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-primary-100 text-primary-700 rounded-full">
                  AI
                </span>
              </button>
            </div>
          )}

          {/* Filters - Only show for "All Jobs" tab */}
          {activeTab === 'all' && (
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
          )}

          {/* For You - Personalized Recommendations */}
          {activeTab === 'for-you' && (
            <div className="mb-6">
              <Card className="bg-gradient-to-r from-primary-50 to-purple-50 border-primary-200 mb-6">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">AI-Powered Recommendations</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        These jobs are personalized based on your profile, skills, experience, and preferences using semantic matching.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Jobs List - All Jobs Tab */}
          {activeTab === 'all' && (isLoading ? (
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
          ))}

          {/* Jobs List - For You Tab */}
          {activeTab === 'for-you' && (recommendationsLoading ? (
            <div className="text-center py-12">Loading personalized recommendations...</div>
          ) : (
            <div className="space-y-4">
              {recommendationsData?.jobs?.map((job: any) => (
                <Card key={job.id} className="shadow-soft hover:shadow-soft-lg transition-shadow border-l-4 border-l-primary-500">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-2">
                          <CardTitle className="text-xl sm:text-2xl flex-1">{job.title}</CardTitle>
                          {job.similarity_score && (
                            <Badge className="bg-primary-600 text-white px-3 py-1">
                              {job.similarity_score}% Match
                            </Badge>
                          )}
                        </div>
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
              {(!recommendationsData?.jobs || recommendationsData.jobs.length === 0) && (
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <svg className="w-16 h-16 text-yellow-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Complete Your Profile for Better Recommendations</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Add your skills, work experience, and education to get AI-powered job recommendations tailored to you.
                      </p>
                      <Link to="/profile">
                        <Button>Update Profile</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
        </div>
    </div>
  );
}
