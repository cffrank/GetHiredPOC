import { Link } from 'react-router-dom';
import { Navigation } from '../components/Navigation';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';

export default function Home() {
  return (
    <>
      <Navigation />
      <div className="min-h-[calc(100vh-4rem)]">
        <div className="bg-gradient-to-b from-blue-50 to-transparent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Find Your Perfect Job
                <span className="text-blue-600"> with AI</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
                JobMatch AI analyzes your skills and experience to match you with the best job opportunities.
                Get personalized insights and recommendations.
              </p>
              <div className="flex gap-4 justify-center">
                <Link to="/jobs">
                  <Button size="lg">Browse Jobs</Button>
                </Link>
                <Link to="/signup">
                  <Button size="lg" variant="outline">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>AI-Powered Matching</CardTitle>
                <CardDescription>
                  Our AI analyzes your profile and matches you with jobs that fit your skills and career goals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl mb-4">🎯</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Track Applications</CardTitle>
                <CardDescription>
                  Manage all your job applications in one place with status tracking and notes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl mb-4">📊</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Save Favorites</CardTitle>
                <CardDescription>
                  Bookmark interesting jobs and review them later with your personalized job board
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl mb-4">⭐</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
