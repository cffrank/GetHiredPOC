import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useJob, useSaveJob, useUnsaveJob, useAnalyzeJob, useGenerateResume, useGenerateCoverLetter } from '../hooks/useJobs';
import { useCreateApplication } from '../hooks/useApplications';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { MapPin } from 'lucide-react';

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useJob(id!);
  const saveJobMutation = useSaveJob();
  const unsaveJobMutation = useUnsaveJob();
  const createApplicationMutation = useCreateApplication();
  const analyzeJobMutation = useAnalyzeJob();
  const generateResumeMutation = useGenerateResume();
  const generateCoverLetterMutation = useGenerateCoverLetter();
  const [analysis, setAnalysis] = useState<any>(null);
  const [resume, setResume] = useState<any>(null);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [similarJobs, setSimilarJobs] = useState<any[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  const handleSave = () => {
    if (data?.saved) {
      unsaveJobMutation.mutate(id!);
    } else {
      saveJobMutation.mutate(id!);
    }
  };

  const handleApply = async () => {
    await createApplicationMutation.mutateAsync({ jobId: id!, status: 'applied' });
    navigate('/applications');
  };

  const handleAnalyze = async () => {
    const result = await analyzeJobMutation.mutateAsync(id!);
    setAnalysis(result);
  };

  const handleGenerateResume = async () => {
    const result = await generateResumeMutation.mutateAsync(id!);
    setResume(result);
  };

  const handleGenerateCoverLetter = async () => {
    const result = await generateCoverLetterMutation.mutateAsync(id!);
    setCoverLetter(result.coverLetter);
  };

  useEffect(() => {
    if (data?.job) {
      fetchSimilarJobs();
    }
  }, [data?.job?.id]);

  const fetchSimilarJobs = async () => {
    if (!data?.job) return;

    setLoadingSimilar(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/jobs/${data.job.id}/similar`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        const responseData = await response.json();
        setSimilarJobs(responseData.slice(0, 5)); // Show top 5
      }
    } catch (error) {
      console.error('Error fetching similar jobs:', error);
    } finally {
      setLoadingSimilar(false);
    }
  };

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!data?.job) return <div className="p-8">Job not found</div>;

  const job = data.job;
  const requirements = job.requirements ? JSON.parse(job.requirements) : [];

  return (
    <div className="min-h-full bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="shadow-soft">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div className="flex-1">
                  <CardTitle className="text-2xl sm:text-3xl mb-2">{job.title}</CardTitle>
                  <CardDescription className="text-base sm:text-lg">{job.company}</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button onClick={handleSave} variant="outline" className="w-full sm:w-auto">
                    {data.saved ? '★ Saved' : '☆ Save'}
                  </Button>
                  <Button onClick={handleApply} className="w-full sm:w-auto">Apply Now</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {job.remote === 1 && <Badge className="bg-green-100 text-green-800">Remote</Badge>}
                {job.remote === 2 && <Badge className="bg-blue-100 text-blue-800">Hybrid</Badge>}
                {job.remote === 0 && <Badge className="bg-gray-100 text-gray-800">On-Site</Badge>}
                {job.location && <Badge className="bg-primary-100 text-primary-800">{job.location}</Badge>}
                {job.salary_min && job.salary_max && (
                  <Badge className="bg-purple-100 text-purple-800">${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}</Badge>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-2 text-lg">Description</h3>
                <p className="text-gray-700 leading-relaxed">{job.description}</p>
              </div>

              {requirements.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-lg">Requirements</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {requirements.map((req: string, i: number) => (
                      <li key={i} className="text-gray-700">{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-3">
                <Button onClick={handleAnalyze} variant="outline" className="w-full">
                  {analyzeJobMutation.isPending ? 'Analyzing...' : 'Get AI Match Analysis'}
                </Button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button onClick={handleGenerateResume} variant="outline" disabled={generateResumeMutation.isPending}>
                    {generateResumeMutation.isPending ? 'Generating...' : 'Generate Tailored Resume'}
                  </Button>
                  <Button onClick={handleGenerateCoverLetter} variant="outline" disabled={generateCoverLetterMutation.isPending}>
                    {generateCoverLetterMutation.isPending ? 'Generating...' : 'Generate Cover Letter'}
                  </Button>
                </div>
              </div>

              {analysis && (
                <Card className="bg-blue-50 border-blue-200 shadow-soft">
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">AI Match Analysis</CardTitle>
                    <CardDescription>
                      Match Score: {analysis.score}%
                      <span className="ml-3 text-sm font-semibold">
                        {analysis.recommendation === 'strong' && '🎯 Strong Match'}
                        {analysis.recommendation === 'good' && '✅ Good Match'}
                        {analysis.recommendation === 'fair' && '⚖️ Fair Match'}
                        {analysis.recommendation === 'weak' && '⚠️ Weak Match'}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analysis.tip && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <h4 className="font-semibold mb-1 text-base text-purple-900 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          Key Action
                        </h4>
                        <p className="text-sm text-purple-800 leading-relaxed">{analysis.tip}</p>
                      </div>
                    )}
                    {analysis.strengths?.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2 text-base text-green-900">✨ Your Strengths for This Role</h4>
                        <ul className="space-y-2">
                          {analysis.strengths.map((strength: string, i: number) => (
                            <li key={i} className="text-sm text-gray-700 leading-relaxed flex items-start gap-2">
                              <span className="text-green-600 mt-0.5">✓</span>
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysis.gaps?.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2 text-base text-orange-900">📊 Areas to Develop</h4>
                        <ul className="space-y-2">
                          {analysis.gaps.map((gap: string, i: number) => (
                            <li key={i} className="text-sm text-gray-700 leading-relaxed flex items-start gap-2">
                              <span className="text-orange-600 mt-0.5">•</span>
                              <span>{gap}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {resume && (
                <Card className="bg-green-50 border-green-200 shadow-soft">
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">AI-Generated Tailored Resume</CardTitle>
                    <CardDescription>Customized for this position</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2 text-base">Professional Summary</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">{resume.summary}</p>
                    </div>
                    {resume.experience?.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2 text-base">Relevant Experience</h4>
                        <div className="space-y-3">
                          {resume.experience.map((exp: any, i: number) => (
                            <div key={i} className="border-l-2 border-green-400 pl-3">
                              <p className="font-medium text-sm">{exp.title} at {exp.company}</p>
                              <p className="text-xs text-gray-600 mb-1">{exp.dates}</p>
                              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                {exp.highlights?.map((h: string, j: number) => (
                                  <li key={j}>{h}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {resume.skills?.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2 text-base">Highlighted Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {resume.skills.map((skill: string, i: number) => (
                            <Badge key={i} className="bg-green-100 text-green-800">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {coverLetter && (
                <Card className="bg-purple-50 border-purple-200 shadow-soft">
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">AI-Generated Cover Letter</CardTitle>
                    <CardDescription>Personalized for {job.company}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">{coverLetter}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Similar Jobs Section */}
              {similarJobs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Similar Jobs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingSimilar ? (
                      <div className="text-center py-4">
                        <p className="text-gray-500">Loading similar jobs...</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {similarJobs.map((similarJob: any) => (
                          <div
                            key={similarJob.id}
                            className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => navigate(`/jobs/${similarJob.id}`)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">{similarJob.title}</h4>
                                <p className="text-sm text-gray-600">{similarJob.company}</p>
                                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                  <MapPin className="h-4 w-4" />
                                  <span>{similarJob.location}</span>
                                  {similarJob.remote && (
                                    <Badge className="bg-blue-100 text-blue-800">Remote</Badge>
                                  )}
                                </div>
                              </div>
                              {similarJob.similarity_score && (
                                <Badge className="ml-2 bg-gray-100 text-gray-800">
                                  {similarJob.similarity_score}% match
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
