import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UserLayout } from './components/layouts/UserLayout';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import SavedJobs from './pages/SavedJobs';
import Profile from './pages/Profile';
import Applications from './pages/Applications';
import Resume from './pages/Resume';
import Settings from './pages/Settings';
import Recommendations from './pages/Recommendations';
import Onboarding from './pages/Onboarding';
import JobPreferences from './pages/JobPreferences';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

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
          <Route path="/resume" element={<Resume />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
