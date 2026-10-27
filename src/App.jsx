import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import AdminGate from '@/components/layout/AdminGate';
import Login from '@/pages/Login';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Dashboard from '@/pages/Dashboard';
import MapReport from '@/pages/MapReport';
import Retailers from '@/pages/Retailers';
import RetailerProfile from '@/pages/RetailerProfile';
import Visits from '@/pages/Visits';
import BalanceUpload from '@/pages/BalanceUpload';
import Reports from '@/pages/Reports';
import RetailerData from '@/pages/RetailerData';
import Staff from '@/pages/Staff';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}
      >
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/map" element={<MapReport />} />
          <Route path="/retailers" element={<Retailers />} />
          <Route path="/retailers/:id" element={<RetailerProfile />} />
          <Route path="/visits" element={<Visits />} />
          <Route
            path="/reports"
            element={
              <AdminGate>
                <Reports />
              </AdminGate>
            }
          />
          <Route
            path="/retailer-data"
            element={
              <AdminGate>
                <RetailerData />
              </AdminGate>
            }
          />
          <Route
            path="/balance"
            element={
              <AdminGate>
                <BalanceUpload />
              </AdminGate>
            }
          />
          <Route
            path="/staff"
            element={
              <AdminGate>
                <Staff />
              </AdminGate>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App