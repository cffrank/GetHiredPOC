import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { MessageSquare, Briefcase, Bookmark, FileText, FolderOpen } from 'lucide-react';

export function Navigation() {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Use subscription_tier (new Polar system) with fallback to membership_tier (old system)
  const subscriptionTier = user?.subscription_tier || user?.membership_tier;
  const isTrial = subscriptionTier === 'pro' && user?.is_trial === 1;
  const isFree = (subscriptionTier === 'free' || subscriptionTier === 'trial' || !subscriptionTier) && !isTrial;
  const isPro = (subscriptionTier === 'pro' || subscriptionTier === 'paid') && !isTrial;

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-6">
            <Link to={user ? "/chat" : "/"} className="text-xl font-bold text-blue-600">
              GetHired AI
            </Link>
            {user && (
              <>
                <Link
                  to="/chat"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                    isActive('/chat')
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Chat
                </Link>
                <Link
                  to="/jobs"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                    isActive('/jobs')
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  Jobs
                </Link>
                <Link
                  to="/saved"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                    isActive('/saved')
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                  Saved
                </Link>
                <Link
                  to="/applications"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                    isActive('/applications')
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <FolderOpen className="w-4 h-4" />
                  Applications
                </Link>
                <Link
                  to="/resume"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                    isActive('/resume')
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Resume
                </Link>
              </>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {user.role === 'admin' && (
                  <Link to="/admin">
                    <Button variant="ghost" className="text-purple-600 hover:text-purple-700">
                      Admin
                    </Button>
                  </Link>
                )}
                {(isFree || isTrial) && (
                  <Link to="/subscription">
                    <Button className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold">
                      {isTrial ? 'Keep PRO Access' : 'Upgrade to PRO'}
                    </Button>
                  </Link>
                )}
                <Link to="/settings">
                  <Button variant="ghost">Settings</Button>
                </Link>
                <Link to="/profile" className="flex items-center space-x-2">
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <span>{user.email}</span>
                    {isTrial && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-600">
                        PRO Trial
                      </span>
                    )}
                    {isPro && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700 border border-green-600">
                        PRO
                      </span>
                    )}
                    {isFree && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-300">
                        FREE
                      </span>
                    )}
                  </Button>
                </Link>
                <Button onClick={() => logout()} variant="outline">
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link to="/signup">
                  <Button>Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
