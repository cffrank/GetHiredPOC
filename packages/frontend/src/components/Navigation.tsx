import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';

export function Navigation() {
  const { user, logout } = useAuth();

  const isFree = user?.membership_tier === 'trial' || !user?.membership_tier;
  const isPro = user?.membership_tier === 'paid';

  return (
    <nav className="border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-blue-600">
              JobMatch AI
            </Link>
            {user && (
              <>
                <Link to="/jobs" className="text-gray-700 hover:text-gray-900">
                  Jobs
                </Link>
                <Link to="/saved" className="text-gray-700 hover:text-gray-900">
                  Saved
                </Link>
                <Link to="/applications" className="text-gray-700 hover:text-gray-900">
                  Applications
                </Link>
                <Link to="/resume" className="text-gray-700 hover:text-gray-900">
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
                {isFree && (
                  <Link to="/subscription">
                    <Button className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold">
                      Upgrade to PRO
                    </Button>
                  </Link>
                )}
                <Link to="/settings">
                  <Button variant="ghost">Settings</Button>
                </Link>
                <Link to="/profile" className="flex items-center space-x-2">
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <span>{user.email}</span>
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
