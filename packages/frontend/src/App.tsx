import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UserLayout } from './components/layouts/UserLayout';
import { AdminLayout } from './components/layouts/AdminLayout';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import SavedJobs from './pages/SavedJobs';
import Profile from './pages/Profile';
import Applications from './pages/Applications';
// Removed: Resume and Settings are now integrated into Profile tabs
// import Resume from './pages/Resume';
// import Settings from './pages/Settings';
import Recommendations from './pages/Recommendations';
import Onboarding from './pages/Onboarding';
import JobPreferences from './pages/JobPreferences';
import Subscription from './pages/Subscription';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSubscriptions from './pages/admin/AdminSubscriptions';
import AdminJobs from './pages/admin/AdminJobs';
import AdminPrompts from './pages/admin/AdminPrompts';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<UserLayout />}>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/preferences" element={<JobPreferences />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/saved" element={<SavedJobs />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/applications" element={<Applications />} />
          {/* Removed: Resume and Settings now integrated into Profile page tabs */}
          <Route path="/subscription" element={<Subscription />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute requireAdmin />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
          <Route path="/admin/jobs" element={<AdminJobs />} />
          <Route path="/admin/prompts" element={<AdminPrompts />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
