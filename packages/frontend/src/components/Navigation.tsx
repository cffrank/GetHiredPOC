import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';

export function Navigation() {
  const { user, logout } = useAuth();

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
                <Link to="/recommendations" className="text-gray-700 hover:text-gray-900">
                  Recommendations
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
                <Link to="/settings">
                  <Button variant="ghost">Settings</Button>
                </Link>
                <Link to="/profile">
                  <Button variant="ghost">{user.email}</Button>
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
