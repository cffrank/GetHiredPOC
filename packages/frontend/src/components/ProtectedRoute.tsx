import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useJobPreferences } from '../hooks/useJobPreferences';

interface ProtectedRouteProps {
  requireAdmin?: boolean;
}

export function ProtectedRoute({ requireAdmin = false }: ProtectedRouteProps) {
  const { user, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const { data: preferences, isLoading: prefsLoading } = useJobPreferences();

  if (authLoading || (user && prefsLoading && !requireAdmin)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check admin access if required
  if (requireAdmin && user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You do not have permission to access this area.</p>
          <a href="/jobs" className="text-blue-600 hover:underline">
            Return to Jobs
          </a>
        </div>
      </div>
    );
  }

  // Skip onboarding check for admin routes
  if (!requireAdmin && preferences && !preferences.onboardingCompleted && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
