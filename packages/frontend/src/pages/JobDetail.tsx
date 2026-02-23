import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useJob, useSaveJob, useUnsaveJob, useAnalyzeJob, useGenerateResume, useGenerateCoverLetter } from '../hooks/useJobs';
import { useCreateApplication } from '../hooks/useApplications';
import { Button } from '../components/ui/Button';
import { Button3D } from '../components/ui/Button3D';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { MatchScoreDial } from '../components/ui/MatchScoreDial';
import { FloatingShapesBackground } from '../components/effects/FloatingShapesBackground';
import { CuteRobotLoader } from '../components/loaders/CuteRobotLoader';
import { SuccessCelebration } from '../components/SuccessCelebration';
import { MapPin, BarChart3, FileText, Mail, Briefcase, Loader2 } from 'lucide-react';

interface GeneratedResume {
  id: string;
  version_name: string;
  resume_data: string;
  created_at: number;
}

interface GeneratedCoverLetter {
  id: string;
  version_name: string;
  cover_letter_text: string;
  created_at: number;
}

function safeParseJSON<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

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

  // State for generated content
  const [analysis, setAnalysis] = useState<any>(null);
  const [resumes, setResumes] = useState<GeneratedResume[]>([]);
  const [coverLetters, setCoverLetters] = useState<GeneratedCoverLetter[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [selectedCoverLetterId, setSelectedCoverLetterId] = useState<string>('');
  const [similarJobs, setSimilarJobs] = useState<any[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [loadingGeneratedContent, setLoadingGeneratedContent] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('');
  const [showCelebration, setShowCelebration] = useState(false);

  // Fetch generated content on mount
  useEffect(() => {
    if (id) {
      fetchGeneratedContent();
    }
  }, [id]);

  // Fetch similar jobs when job data loads
  useEffect(() => {
    if (data?.job) {
      fetchSimilarJobs();
    }
  }, [data?.job?.id]);

  // Set default active tab when content loads
  useEffect(() => {
    if (!activeTab) {
      if (analysis) setActiveTab('analysis');
      else if (resumes.length > 0) setActiveTab('resume');
      else if (coverLetters.length > 0) setActiveTab('coverLetter');
      else if (similarJobs.length > 0) setActiveTab('similar');
    }
  }, [analysis, resumes, coverLetters, similarJobs, activeTab]);

  const fetchGeneratedContent = async () => {
    setLoadingGeneratedContent(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/applications/job/${id}/generated-content`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        const contentData = await response.json();
        if (contentData.analysis) {
          setAnalysis(contentData.analysis);
        }
        if (contentData.resumes && contentData.resumes.length > 0) {
          setResumes(contentData.resumes);
          setSelectedResumeId(contentData.resumes[0].id); // Default to newest
        }
        if (contentData.coverLetters && contentData.coverLetters.length > 0) {
          setCoverLetters(contentData.coverLetters);
          setSelectedCoverLetterId(contentData.coverLetters[0].id); // Default to newest
        }
      }
    } catch (error) {
      console.error('Error fetching generated content:', error);
    } finally {
      setLoadingGeneratedContent(false);
    }
  };

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
        setSimilarJobs(responseData.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching similar jobs:', error);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const handleSave = () => {
    if (data?.saved) {
      unsaveJobMutation.mutate(id!);
    } else {
      saveJobMutation.mutate(id!);
    }
  };

  const handleApply = async () => {
    await createApplicationMutation.mutateAsync({ jobId: id!, status: 'applied' });
    setShowCelebration(true);
    // Navigate after celebration
    setTimeout(() => {
      navigate('/applications');
    }, 3000);
  };

  const handleAnalyze = async () => {
    try {
      const result = await analyzeJobMutation.mutateAsync(id!);
      console.log('[JobDetail] Analysis result:', result);
      setAnalysis(result.analysis);
      setActiveTab('analysis'); // Auto-switch to analysis tab
    } catch (error) {
      console.error('[JobDetail] Analysis error:', error);
    }
  };

  const handleGenerateResume = async () => {
    if (!data?.saved) {
      alert('Please save this job before generating a resume');
      return;
    }

    try {
      const result = await generateResumeMutation.mutateAsync(id!);

      // Add new resume to the array
      const newResume: GeneratedResume = {
        id: result.id,
        version_name: result.version_name,
        resume_data: JSON.stringify(result.resume),
        created_at: Date.now() / 1000
      };

      setResumes(prev => [newResume, ...prev]);
      setSelectedResumeId(newResume.id);
      setActiveTab('resume'); // Auto-switch to resume tab
    } catch (error: any) {
      alert(error.message || 'Failed to generate resume');
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!data?.saved) {
      alert('Please save this job before generating a cover letter');
      return;
    }

    try {
      const result = await generateCoverLetterMutation.mutateAsync(id!);

      // Add new cover letter to the array
      const newCoverLetter: GeneratedCoverLetter = {
        id: result.id,
        version_name: result.version_name,
        cover_letter_text: result.coverLetter,
        created_at: Date.now() / 1000
      };

      setCoverLetters(prev => [newCoverLetter, ...prev]);
      setSelectedCoverLetterId(newCoverLetter.id);
      setActiveTab('coverLetter'); // Auto-switch to cover letter tab
    } catch (error: any) {
      alert(error.message || 'Failed to generate cover letter');
    }
  };

  if (isLoading) return (
    <>
      <FloatingShapesBackground />
      <div className="relative z-10">
        <CuteRobotLoader message="Loading job details..." />
      </div>
    </>
  );

  if (!data?.job) return (
    <>
      <FloatingShapesBackground />
      <div className="relative z-10 p-8 text-center">
        <h2 className="text-2xl font-bold text-purple-deep">Job not found</h2>
        <p className="text-gray-600 mt-2">This job posting may have been removed or doesn't exist.</p>
      </div>
    </>
  );

  const job = data.job;
  const requirements = safeParseJSON<string[]>(job.requirements, []);

  // Get selected resume/cover letter
  const selectedResume = resumes.find(r => r.id === selectedResumeId);
  const resumeData = selectedResume?.resume_data ? JSON.parse(selectedResume.resume_data) : null;
  const selectedCoverLetter = coverLetters.find(c => c.id === selectedCoverLetterId);

  // Determine if any tabs should be shown
  const hasTabs = analysis || resumes.length > 0 || coverLetters.length > 0 || similarJobs.length > 0;

  return (
    <>
      <FloatingShapesBackground />
      <div className="relative z-10 min-h-full">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Match Score Dial - Show if analysis exists */}
          {analysis && (
            <div className="flex justify-center mb-8">
              <div className="text-center">
                <MatchScoreDial score={analysis.score} size="lg" />
                <p className="mt-4 text-xl font-bold text-purple-deep">
                  {analysis.recommendation === 'strong' && '🎯 Strong Match!'}
                  {analysis.recommendation === 'good' && '✅ Good Match'}
                  {analysis.recommendation === 'fair' && '⚖️ Fair Match'}
                  {analysis.recommendation === 'weak' && '⚠️ Weak Match'}
                </p>
              </div>
            </div>
          )}

          <div className="relative group transition-transform duration-300 hover:-translate-y-3">
            {/* Floating shadow */}
            <div className="absolute -bottom-3 left-2 right-2 h-6 bg-gradient-radial from-violet/20 to-transparent blur-xl transition-all group-hover:-bottom-5 group-hover:opacity-40" />

            {/* Card content */}
            <Card className="relative z-10 bg-white rounded-3xl shadow-card-soft">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-3xl sm:text-4xl font-extrabold text-purple-deep mb-2">{job.title}</CardTitle>
                    <div className="flex items-center gap-2 text-gray-600 text-lg">
                      <div className="w-8 h-8 bg-gradient-to-br from-violet to-teal rounded-lg flex items-center justify-center text-lg">
                        🏢
                      </div>
                      <CardDescription className="text-base sm:text-lg">{job.company}</CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button onClick={handleSave} variant="outline" className="w-full sm:w-auto">
                      {data.saved ? '★ Saved' : '☆ Save'}
                    </Button>
                    <Button3D onClick={handleApply} icon="🚀" className="w-full sm:w-auto">
                      Apply Now
                    </Button3D>
                  </div>
                </div>
              </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-3">
              {job.remote === 1 && <Badge variant="remote">Remote 🌍</Badge>}
              {job.remote === 2 && <Badge variant="default">Hybrid 🏢</Badge>}
              {job.remote === 0 && <Badge variant="default">On-Site 🏢</Badge>}
              {job.location && <Badge variant="default">{job.location}</Badge>}
              {job.salary_min && job.salary_max && (
                <Badge variant="salary">${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()} 💰</Badge>
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

            <div className="space-y-4">
              {/* AI Analysis Button */}
              {analyzeJobMutation.isPending ? (
                <CuteRobotLoader message="Analyzing your match with this job..." />
              ) : (
                <Button3D onClick={handleAnalyze} icon="🎯" className="w-full">
                  Get AI Match Analysis
                </Button3D>
              )}

              {/* Resume & Cover Letter Generation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {generateResumeMutation.isPending ? (
                  <div className="col-span-2">
                    <CuteRobotLoader message="Crafting your perfect resume..." />
                  </div>
                ) : (
                  <Button3D
                    onClick={handleGenerateResume}
                    icon="📄"
                    variant={data.saved ? 'primary' : 'secondary'}
                    disabled={!data.saved}
                    className="w-full"
                  >
                    Generate Tailored Resume
                  </Button3D>
                )}

                {generateCoverLetterMutation.isPending ? (
                  <div className="col-span-2">
                    <CuteRobotLoader message="Writing your cover letter..." />
                  </div>
                ) : (
                  <Button3D
                    onClick={handleGenerateCoverLetter}
                    icon="✉️"
                    variant={data.saved ? 'primary' : 'secondary'}
                    disabled={!data.saved}
                    className="w-full"
                  >
                    Generate Cover Letter
                  </Button3D>
                )}
              </div>

              {!data.saved && (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4 text-center">
                  <p className="text-sm text-gray-700 font-medium">
                    💡 Save this job to unlock AI-powered resume and cover letter generation
                  </p>
                </div>
              )}
            </div>

            {/* Dynamic Tabs - Only show if there's content */}
            {hasTabs && (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  {analysis && (
                    <TabsTrigger value="analysis">
                      <BarChart3 className="w-4 h-4" />
                      AI Analysis
                    </TabsTrigger>
                  )}
                  {resumes.length > 0 && (
                    <TabsTrigger value="resume">
                      <FileText className="w-4 h-4" />
                      Resume ({resumes.length})
                    </TabsTrigger>
                  )}
                  {coverLetters.length > 0 && (
                    <TabsTrigger value="coverLetter">
                      <Mail className="w-4 h-4" />
                      Cover Letter ({coverLetters.length})
                    </TabsTrigger>
                  )}
                  {similarJobs.length > 0 && (
                    <TabsTrigger value="similar">
                      <Briefcase className="w-4 h-4" />
                      Similar Jobs
                    </TabsTrigger>
                  )}
                </TabsList>

                {/* AI Analysis Tab */}
                {analysis && (
                  <TabsContent value="analysis">
                    <Card className="bg-gradient-to-br from-violet-50 to-teal-50 border-violet-200 shadow-card-soft">
                      <CardHeader>
                        <CardTitle className="text-xl sm:text-2xl font-bold text-purple-deep flex items-center gap-2">
                          🎯 AI Match Analysis
                        </CardTitle>
                        <CardDescription>
                          <span className="text-lg font-semibold text-violet">
                            {analysis.recommendation === 'strong' && '🎯 Strong Match'}
                            {analysis.recommendation === 'good' && '✅ Good Match'}
                            {analysis.recommendation === 'fair' && '⚖️ Fair Match'}
                            {analysis.recommendation === 'weak' && '⚠️ Weak Match'}
                          </span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {analysis.summary && (
                          <div className="bg-white border-2 border-violet-200 rounded-2xl p-4 shadow-3d-sm">
                            <h4 className="font-bold mb-2 text-base text-violet flex items-center gap-2">
                              📋 Summary
                            </h4>
                            <p className="text-sm text-gray-700 leading-relaxed">{analysis.summary}</p>
                          </div>
                        )}

                        {/* Qualification Match Section */}
                        {analysis.qualifications?.length > 0 && (
                          <div className="bg-white border-2 border-violet-200 rounded-2xl p-4 shadow-3d-sm">
                            <h4 className="font-bold mb-3 text-base text-purple-deep flex items-center gap-2">
                              📋 Qualification Match
                              <span className="text-sm font-normal text-gray-500 ml-auto">
                                Matches {analysis.qualifications.filter((q: any) => q.matched).length} of {analysis.qualifications.length} qualifications
                              </span>
                            </h4>
                            <ul className="space-y-3">
                              {analysis.qualifications.map((q: any, i: number) => (
                                <li key={i} className="flex items-start gap-3">
                                  <span className={`mt-0.5 text-lg flex-shrink-0 ${q.matched ? 'text-green-600' : 'text-red-400'}`}>
                                    {q.matched ? '✓' : '✗'}
                                  </span>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-800">{q.requirement}</p>
                                    {q.evidence && (
                                      <p className="text-xs text-gray-500 mt-0.5">{q.evidence}</p>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {analysis.tip && (
                          <div className="bg-white border-2 border-blue-200 rounded-2xl p-4 shadow-3d-sm">
                            <h4 className="font-bold mb-2 text-base text-blue-600 flex items-center gap-2">
                              💡 Key Action
                            </h4>
                            <p className="text-sm text-gray-700 leading-relaxed">{analysis.tip}</p>
                          </div>
                        )}
                        {analysis.strengths?.length > 0 && (
                          <div className="bg-white rounded-2xl p-4 border-2 border-green-200">
                            <h4 className="font-bold mb-3 text-base text-green-900 flex items-center gap-2">
                              ✨ Your Strengths for This Role
                            </h4>
                            <ul className="space-y-2">
                              {analysis.strengths.map((strength: string, i: number) => (
                                <li key={i} className="text-sm text-gray-700 leading-relaxed flex items-start gap-2">
                                  <span className="text-green-600 mt-0.5 text-lg">✓</span>
                                  <span>{strength}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {analysis.gaps?.length > 0 && (
                          <div className="bg-white rounded-2xl p-4 border-2 border-orange-200">
                            <h4 className="font-bold mb-3 text-base text-orange-900 flex items-center gap-2">
                              📊 Areas to Develop
                            </h4>
                            <ul className="space-y-2">
                              {analysis.gaps.map((gap: string, i: number) => (
                                <li key={i} className="text-sm text-gray-700 leading-relaxed flex items-start gap-2">
                                  <span className="text-orange-600 mt-0.5 text-lg">•</span>
                                  <span>{gap}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Resume Suggestions Section */}
                        {analysis.resumeTips?.length > 0 && (
                          <div className="bg-white rounded-2xl p-4 border-2 border-blue-200">
                            <h4 className="font-bold mb-3 text-base text-blue-900 flex items-center gap-2">
                              📝 Resume Suggestions
                            </h4>
                            <ul className="space-y-4">
                              {analysis.resumeTips.map((tip: any, i: number) => (
                                <li key={i}>
                                  <p className="text-sm font-medium text-gray-800">{tip.suggestion}</p>
                                  {tip.example && (
                                    <p className="text-xs text-gray-500 mt-1 pl-3 border-l-2 border-blue-300 italic">
                                      Example: "{tip.example}"
                                    </p>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {/* Resume Tab */}
                {resumes.length > 0 && (
                  <TabsContent value="resume">
                    <Card className="bg-gradient-to-br from-green-50 to-teal-50 border-green-200 shadow-card-soft">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-xl sm:text-2xl font-bold text-purple-deep flex items-center gap-2">
                              📄 AI-Generated Tailored Resume
                            </CardTitle>
                            <CardDescription className="text-base font-medium">Customized for this position</CardDescription>
                          </div>
                          {resumes.length > 1 && (
                            <select
                              value={selectedResumeId}
                              onChange={(e) => setSelectedResumeId(e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                            >
                              {resumes.map((resume) => (
                                <option key={resume.id} value={resume.id}>
                                  {resume.version_name} - {new Date(resume.created_at * 1000).toLocaleDateString()}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {resumeData && (
                          <>
                            <div>
                              <h4 className="font-semibold mb-2 text-base">Professional Summary</h4>
                              <p className="text-sm text-gray-700 leading-relaxed">{resumeData.summary}</p>
                            </div>
                            {resumeData.experience?.length > 0 && (
                              <div>
                                <h4 className="font-semibold mb-2 text-base">Relevant Experience</h4>
                                <div className="space-y-3">
                                  {resumeData.experience.map((exp: any, i: number) => (
                                    <div key={i} className="border-l-2 border-green-400 pl-3">
                                      <p className="font-medium text-sm">{exp.title} at {exp.company}</p>
                                      <p className="text-xs text-gray-600 mb-1">{exp.dates}</p>
                                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                        {(exp.achievements || exp.highlights)?.map((h: string, j: number) => (
                                          <li key={j}>{h}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {resumeData.skills?.length > 0 && (
                              <div>
                                <h4 className="font-bold mb-2 text-base">Highlighted Skills</h4>
                                <div className="flex flex-wrap gap-2">
                                  {resumeData.skills.map((skill: string, i: number) => (
                                    <Badge key={i} className="bg-gradient-to-r from-green-500 to-teal text-white shadow-3d-sm">{skill}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {resumeData.education?.length > 0 && (
                              <div>
                                <h4 className="font-semibold mb-2 text-base">Education</h4>
                                <div className="space-y-2">
                                  {resumeData.education.map((edu: any, i: number) => (
                                    <div key={i} className="border-l-2 border-blue-400 pl-3">
                                      <p className="font-medium text-sm">{edu.degree}</p>
                                      <p className="text-xs text-gray-600">{edu.school} {edu.year && `· ${edu.year}`}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {/* Cover Letter Tab */}
                {coverLetters.length > 0 && (
                  <TabsContent value="coverLetter">
                    <Card className="bg-gradient-to-br from-violet-50 to-purple-100 border-violet-200 shadow-card-soft">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-xl sm:text-2xl font-bold text-purple-deep flex items-center gap-2">
                              ✉️ AI-Generated Cover Letter
                            </CardTitle>
                            <CardDescription className="text-base font-medium">Personalized for {job.company}</CardDescription>
                          </div>
                          {coverLetters.length > 1 && (
                            <select
                              value={selectedCoverLetterId}
                              onChange={(e) => setSelectedCoverLetterId(e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                            >
                              {coverLetters.map((letter) => (
                                <option key={letter.id} value={letter.id}>
                                  {letter.version_name} - {new Date(letter.created_at * 1000).toLocaleDateString()}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-sm max-w-none">
                          <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                            {selectedCoverLetter?.cover_letter_text}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {/* Similar Jobs Tab */}
                {similarJobs.length > 0 && (
                  <TabsContent value="similar">
                    <Card className="shadow-card-soft">
                      <CardHeader>
                        <CardTitle className="text-xl sm:text-2xl font-bold text-purple-deep flex items-center gap-2">
                          💼 Similar Jobs
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {loadingSimilar ? (
                          <CuteRobotLoader message="Finding similar opportunities..." />
                        ) : (
                          <div className="space-y-4">
                            {similarJobs.map((similarJob: any) => (
                              <div
                                key={similarJob.id}
                                className="relative group cursor-pointer"
                                onClick={() => navigate(`/jobs/${similarJob.id}`)}
                              >
                                <div className="absolute -bottom-2 left-1 right-1 h-4 bg-gradient-radial from-violet/10 to-transparent blur-lg transition-all group-hover:-bottom-3 group-hover:opacity-60" />
                                <div className="relative bg-white border-2 border-gray-200 rounded-2xl p-4 hover:border-violet transition-all group-hover:-translate-y-1">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                      <h4 className="font-bold text-purple-deep text-lg">{similarJob.title}</h4>
                                      <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                        <span className="text-base">🏢</span>
                                        {similarJob.company}
                                      </p>
                                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                                        <MapPin className="h-4 w-4" />
                                        <span>{similarJob.location}</span>
                                        {similarJob.remote === 1 && (
                                          <Badge variant="remote" className="text-xs">Remote</Badge>
                                        )}
                                      </div>
                                    </div>
                                    {similarJob.similarity_score && (
                                      <Badge className="bg-violet-100 text-violet-dark font-bold">
                                        {similarJob.similarity_score}% match
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}
              </Tabs>
            )}
          </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Success Celebration */}
      <SuccessCelebration
        show={showCelebration}
        message="Application Submitted!"
        xpGained={50}
        onClose={() => setShowCelebration(false)}
      />
    </>
  );
}
