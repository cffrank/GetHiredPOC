import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useJobs, useImportJobUrl } from '../hooks/useJobs';
import { useRecommendations } from '../hooks/useRecommendations';
import { useGamification } from '../hooks/useGamification';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { JobCard3D } from '../components/JobCard3D';
import { FloatingShapesBackground } from '../components/effects/FloatingShapesBackground';
import { ProgressGamification } from '../components/gamification/ProgressGamification';
import { CuteRobotLoader } from '../components/loaders/CuteRobotLoader';
import { JobFilterPanel, JobFilters } from '../components/JobFilterPanel';
import { ChevronDown, ChevronUp, Filter, Link2, X, Loader2 } from 'lucide-react';

type TabType = 'all' | 'for-you';

export default function Jobs() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [title, setTitle] = useState('');
  const [remote, setRemote] = useState<boolean | undefined>();
  const [locationFilter, setLocationFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true); // Default to open for AI-first experience
  const [advancedSearchActive, setAdvancedSearchActive] = useState(false);
  const [advancedSearchLoading, setAdvancedSearchLoading] = useState(false);
  const [advancedSearchResults, setAdvancedSearchResults] = useState<any[]>([]);
  const [navigatedFromChat, setNavigatedFromChat] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importError, setImportError] = useState('');

  const { user } = useAuth();
  const isLoggedIn = !!user;
  const navigate = useNavigate();

  const importJob = useImportJobUrl();

  const { data, isLoading } = useJobs({ title, remote, location: locationFilter });
  const { data: recommendationsData, isLoading: recommendationsLoading } = useRecommendations(20);
  const { data: gamificationData } = useGamification();

  // Advanced filter state
  const [filters, setFilters] = useState<JobFilters>({
    keywords: [],
    locations: [],
    salary_min: undefined,
    salary_max: undefined,
    experience_level: [],
    remote: 'any',
    required_skills: [],
    job_type: []
  });

  // Check if navigated from chat with filters
  useEffect(() => {
    if (location.state?.filters) {
      const chatFilters = location.state.filters as JobFilters;
      setFilters(chatFilters);
      setShowAdvancedFilters(true);
      setNavigatedFromChat(true);
      // Auto-run search
      handleAdvancedSearch(chatFilters);
    }
    if (location.state?.message) {
      // Could show a toast or banner with the message
      console.log('Chat message:', location.state.message);
    }
  }, [location.state]);

  const handleAdvancedSearch = async (searchFilters: JobFilters = filters) => {
    setAdvancedSearchLoading(true);
    setAdvancedSearchActive(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/jobs/advanced-search`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(searchFilters)
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAdvancedSearchResults(data.jobs);
      } else {
        console.error('Advanced search failed');
        setAdvancedSearchResults([]);
      }
    } catch (error) {
      console.error('Advanced search error:', error);
      setAdvancedSearchResults([]);
    } finally {
      setAdvancedSearchLoading(false);
    }
  };

  const clearAdvancedSearch = () => {
    setAdvancedSearchActive(false);
    setAdvancedSearchResults([]);
    setNavigatedFromChat(false);
    setFilters({
      keywords: [],
      locations: [],
      salary_min: undefined,
      salary_max: undefined,
      experience_level: [],
      remote: 'any',
      required_skills: [],
      job_type: []
    });
  };

  // Determine which jobs to show
  const getJobsToShow = () => {
    if (activeTab === 'for-you') {
      return {
        jobs: recommendationsData?.jobs || [],
        loading: recommendationsLoading
      };
    }

    if (advancedSearchActive) {
      return {
        jobs: advancedSearchResults,
        loading: advancedSearchLoading
      };
    }

    return {
      jobs: data?.jobs || [],
      loading: isLoading
    };
  };

  const { jobs: displayedJobs, loading: displayLoading } = getJobsToShow();

  return (
    <>
      <FloatingShapesBackground />
      <div className="relative z-10 min-h-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <h1 className="text-5xl sm:text-6xl font-extrabold text-purple-deep mb-4">
              Find Your Dream Job <span className="inline-block animate-bounce-gentle">🚀</span>
            </h1>
            <p className="text-xl text-gray-600">AI-powered matching that makes job hunting fun!</p>
          </div>

          {/* Gamification Progress */}
          {isLoggedIn && gamificationData && (
            <ProgressGamification
              level={gamificationData.level}
              xp={gamificationData.xp}
              xpMax={gamificationData.xpMax}
              achievements={gamificationData.achievements}
            />
          )}

        {/* Chat Navigation Banner */}
        {navigatedFromChat && advancedSearchActive && (
          <Card className="mb-6 bg-gradient-to-r from-violet-50 to-teal-50 border-violet-200 shadow-card-soft">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-violet to-teal rounded-lg flex items-center justify-center shadow-3d-sm">
                    <Filter className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-purple-deep">AI Assistant found {displayedJobs.length} matching jobs</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {location.state?.message || 'Results based on your search criteria'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAdvancedSearch}
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import Job Modal */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="w-5 h-5" />
                    Import Job by URL
                  </CardTitle>
                  <button onClick={() => { setShowImportModal(false); setImportUrl(''); setImportError(''); }}>
                    <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
                  </button>
                </div>
                <CardDescription>
                  Paste a job posting URL to import it into your personal job list.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setImportError('');
                    try {
                      const result = await importJob.mutateAsync(importUrl);
                      setShowImportModal(false);
                      setImportUrl('');
                      if (result.job?.id) {
                        navigate(`/jobs/${result.job.id}`);
                      }
                    } catch (err: any) {
                      setImportError(err.message || 'Failed to import job');
                    }
                  }}
                  className="space-y-4"
                >
                  <Input
                    placeholder="https://example.com/jobs/software-engineer"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    className="min-h-touch"
                    required
                    type="url"
                  />
                  {importError && (
                    <p className="text-sm text-red-600">{importError}</p>
                  )}
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => { setShowImportModal(false); setImportUrl(''); setImportError(''); }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={importJob.isPending || !importUrl.trim()}>
                      {importJob.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        'Import'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs + Import Button */}
        {isLoggedIn && (
          <div className="flex items-center justify-between mb-6 border-b border-gray-200">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setActiveTab('all');
                  clearAdvancedSearch();
                }}
                className={`px-4 py-2 font-bold text-sm transition-colors ${
                  activeTab === 'all'
                    ? 'border-b-2 border-violet text-violet'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Jobs
              </button>
              <button
                onClick={() => {
                  setActiveTab('for-you');
                  clearAdvancedSearch();
                }}
                className={`px-4 py-2 font-bold text-sm transition-colors ${
                  activeTab === 'for-you'
                    ? 'border-b-2 border-violet text-violet'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                For You
                <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-violet-100 text-violet-dark rounded-full">
                  AI
                </span>
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImportModal(true)}
              className="mb-1"
            >
              <Link2 className="w-4 h-4 mr-1" />
              Import Job
            </Button>
          </div>
        )}

        {/* Basic Filters - Only show for "All Jobs" tab when advanced search not active */}
        {activeTab === 'all' && !advancedSearchActive && (
          <Card className="mb-6 shadow-soft">
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
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="min-h-touch"
                />
                <select
                  className="flex min-h-touch w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-soft"
                  value={remote === undefined ? 'all' : remote === true ? 'yes' : remote === false ? 'no' : 'hybrid'}
                  onChange={(e) => {
                    if (e.target.value === 'all') setRemote(undefined);
                    else if (e.target.value === 'yes') setRemote(true);
                    else if (e.target.value === 'no') setRemote(false);
                  }}
                >
                  <option value="all">All Jobs</option>
                  <option value="yes">Remote Only</option>
                  <option value="no">On-site Only</option>
                  <option value="hybrid">Hybrid Only</option>
                </select>
                <Button variant="outline" onClick={() => { setTitle(''); setLocationFilter(''); setRemote(undefined); }}>
                  Clear
                </Button>
              </div>

              {/* Advanced Filters Toggle */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="flex items-center gap-2 text-sm text-violet hover:text-violet-dark font-bold"
                >
                  <Filter className="w-4 h-4" />
                  Advanced Filters
                  {showAdvancedFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Advanced Filters Panel */}
        {activeTab === 'all' && showAdvancedFilters && (
          <JobFilterPanel
            filters={filters}
            onChange={setFilters}
            onSearch={() => handleAdvancedSearch()}
            isSearching={advancedSearchLoading}
          />
        )}

        {/* For You - Personalized Recommendations */}
        {activeTab === 'for-you' && (
          <div className="mb-6">
            <Card className="bg-gradient-to-r from-violet-50 to-teal-50 border-violet-200 shadow-card-soft mb-6">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-violet to-teal rounded-lg flex items-center justify-center shadow-3d-sm">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-purple-deep">AI-Powered Recommendations ✨</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      These jobs are personalized based on your profile, skills, experience, and preferences using semantic matching.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Jobs List */}
        {displayLoading ? (
          <CuteRobotLoader
            message={advancedSearchActive ? 'Searching for perfect matches...' : 'Finding amazing opportunities...'}
          />
        ) : (
          <div className="space-y-6">
            {displayedJobs.map((job: any) => (
              <JobCard3D
                key={job.id}
                job={job}
                showMatchScore={activeTab === 'for-you' || (advancedSearchActive && !!job.relevance_score)}
                isRecommended={activeTab === 'for-you'}
              />
            ))}

            {displayedJobs.length === 0 && activeTab === 'all' && (
              <div className="text-center py-12 text-gray-500">No jobs found matching your criteria</div>
            )}

            {displayedJobs.length === 0 && activeTab === 'for-you' && (
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
        )}
        </div>
      </div>
    </>
  );
}
