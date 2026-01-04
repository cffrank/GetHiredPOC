import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navigation } from '../components/Navigation';
import { useJob, useSaveJob, useUnsaveJob, useAnalyzeJob } from '../hooks/useJobs';
import { useCreateApplication } from '../hooks/useApplications';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useJob(id!);
  const saveJobMutation = useSaveJob();
  const unsaveJobMutation = useUnsaveJob();
  const createApplicationMutation = useCreateApplication();
  const analyzeJobMutation = useAnalyzeJob();
  const [analysis, setAnalysis] = useState<any>(null);

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
    setAnalysis(result.analysis);
  };

  if (isLoading) return <><Navigation /><div className="p-8">Loading...</div></>;
  if (!data?.job) return <><Navigation /><div className="p-8">Job not found</div></>;

  const job = data.job;
  const requirements = job.requirements ? JSON.parse(job.requirements) : [];

  return (
    <>
      <Navigation />
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-3xl mb-2">{job.title}</CardTitle>
                  <CardDescription className="text-lg">{job.company}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} variant="outline">
                    {data.saved ? '★ Saved' : '☆ Save'}
                  </Button>
                  <Button onClick={handleApply}>Apply Now</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2">
                {job.remote === 1 && <Badge>Remote</Badge>}
                {job.location && <Badge>{job.location}</Badge>}
                {job.salary_min && job.salary_max && (
                  <Badge>${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}</Badge>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-gray-700">{job.description}</p>
              </div>

              {requirements.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Requirements</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {requirements.map((req: string, i: number) => (
                      <li key={i} className="text-gray-700">{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <Button onClick={handleAnalyze} variant="outline" className="w-full">
                  {analyzeJobMutation.isPending ? 'Analyzing...' : 'Get AI Match Analysis'}
                </Button>
              </div>

              {analysis && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle>AI Match Analysis</CardTitle>
                    <CardDescription>Match Score: {analysis.match_score}%</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-1">Summary</h4>
                      <p className="text-sm">{analysis.summary}</p>
                    </div>
                    {analysis.matching_skills?.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-1">Your Matching Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {analysis.matching_skills.map((skill: string, i: number) => (
                            <Badge key={i} className="bg-green-100 text-green-800">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {analysis.missing_skills?.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-1">Skills to Develop</h4>
                        <div className="flex flex-wrap gap-2">
                          {analysis.missing_skills.map((skill: string, i: number) => (
                            <Badge key={i} className="bg-orange-100 text-orange-800">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
