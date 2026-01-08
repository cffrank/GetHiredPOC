import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { Button3D } from './ui/Button3D';

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
    <nav className="sticky top-5 z-50 mx-4 sm:mx-6 lg:mx-8 mb-8">
      <div className="max-w-7xl mx-auto bg-white rounded-3xl shadow-card-soft border border-gray-100">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="text-2xl font-extrabold bg-gradient-to-r from-violet to-teal bg-clip-text text-transparent">
                JobMatch AI ✨
              </Link>
            {user && (
              <>
                <Link
                  to="/jobs"
                  className={`font-semibold transition-colors ${
                    isActive('/jobs')
                      ? 'text-violet border-b-2 border-violet'
                      : 'text-gray-600 hover:text-violet'
                  }`}
                >
                  Jobs
                </Link>
                <Link
                  to="/saved"
                  className={`font-semibold transition-colors ${
                    isActive('/saved')
                      ? 'text-violet border-b-2 border-violet'
                      : 'text-gray-600 hover:text-violet'
                  }`}
                >
                  Saved
                </Link>
                <Link
                  to="/applications"
                  className={`font-semibold transition-colors ${
                    isActive('/applications')
                      ? 'text-violet border-b-2 border-violet'
                      : 'text-gray-600 hover:text-violet'
                  }`}
                >
                  Applications
                </Link>
                <Link
                  to="/resume"
                  className={`font-semibold transition-colors ${
                    isActive('/resume')
                      ? 'text-violet border-b-2 border-violet'
                      : 'text-gray-600 hover:text-violet'
                  }`}
                >
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
                    <Button variant="ghost" className="text-violet hover:text-violet-dark font-semibold">
                      Admin
                    </Button>
                  </Link>
                )}
                {(isFree || isTrial) && (
                  <Link to="/subscription">
                    <Button3D icon="⚡" className="text-sm">
                      {isTrial ? 'Keep PRO Access' : 'Upgrade to PRO'}
                    </Button3D>
                  </Link>
                )}
                <Link to="/settings">
                  <Button variant="ghost" className="font-semibold text-gray-600 hover:text-violet">
                    Settings
                  </Button>
                </Link>
                <Link to="/profile" className="flex items-center space-x-2">
                  <Button variant="ghost" className="flex items-center space-x-2 font-semibold">
                    <span className="text-gray-700">{user.email}</span>
                    {isTrial && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-violet to-teal text-white shadow-3d-sm">
                        PRO Trial ✨
                      </span>
                    )}
                    {isPro && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-teal to-green-500 text-white shadow-3d-sm">
                        PRO 👑
                      </span>
                    )}
                    {isFree && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border-2 border-gray-300">
                        FREE
                      </span>
                    )}
                  </Button>
                </Link>
                <Button onClick={() => logout()} variant="outline" className="font-semibold">
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="font-semibold text-gray-600 hover:text-violet">
                    Login
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button3D icon="🚀">
                    Sign Up
                  </Button3D>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      </div>
    </nav>
  );
}
