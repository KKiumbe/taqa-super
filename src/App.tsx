import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/auth/Login';
import ProtectedRoute from './layout/ProtectedRoute';
import DashboardLayout from './layout/DashboardLayout';
import Dashboard from './pages/dashboard/Dashboard';
import Billing from './pages/billing/Billing';
import Usage from './pages/usage/Usage';
import Operations from './pages/operations/Operations';
import Support from './pages/support/Support';
import TenantsList from './pages/tenants/TenantsList';
import TenantDetail from './pages/tenants/TenantDetail';
import { setupApiInterceptors } from './services/api';
import { useAuthStore } from './store/authStore';

const App = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    setupApiInterceptors();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tenants" element={<TenantsList />} />
          <Route path="/tenants/:id" element={<TenantDetail />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/usage" element={<Usage />} />
          <Route path="/operations" element={<Operations />} />
          <Route path="/support" element={<Support />} />
        </Route>
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
