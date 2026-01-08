import { Link, Navigate } from 'react-router-dom';
import { Navigation } from '../components/Navigation';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Search, FileText, TrendingUp } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();

  // Redirect logged-in users to chat
  if (user) {
    return <Navigate to="/chat" replace />;
  }

  return (
    <>
      <Navigation />
      <div className="min-h-[calc(100vh-4rem)]">
        <div className="bg-gradient-to-b from-blue-50 to-transparent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Your AI Job Search
                <span className="text-blue-600"> Assistant</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
                Chat with GetHired AI to find jobs, create tailored resumes, write cover letters,
                and manage your entire job search - all through natural conversation.
              </p>
              <div className="flex gap-4 justify-center">
                <Link to="/signup">
                  <Button size="lg" className="gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Start Chatting
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="text-2xl font-bold text-center mb-12">Everything Through Chat</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                  <Search className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>Find Jobs</CardTitle>
                <CardDescription>
                  "Find me software engineer jobs in Milwaukee" - and get instant results
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Create Resumes</CardTitle>
                <CardDescription>
                  "Generate a resume for this job" - get AI-tailored resumes instantly
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>Match Analysis</CardTitle>
                <CardDescription>
                  "How do I match this job?" - see your strengths and gaps
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
                  <MessageSquare className="w-6 h-6 text-orange-600" />
                </div>
                <CardTitle>Manage Everything</CardTitle>
                <CardDescription>
                  Track applications, update your profile, and more - just ask
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
