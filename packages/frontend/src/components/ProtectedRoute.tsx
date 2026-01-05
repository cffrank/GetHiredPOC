import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useJobPreferences } from '../hooks/useJobPreferences';

export function ProtectedRoute() {
  const { user, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const { data: preferences, isLoading: prefsLoading } = useJobPreferences();

  if (authLoading || (user && prefsLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user hasn't completed onboarding and isn't already on the onboarding page, redirect
  if (preferences && !preferences.onboardingCompleted && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
