import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/auth/Login';
import ProtectedRoute from './layout/ProtectedRoute';
import DashboardLayout from './layout/DashboardLayout';
import TenantsList from './pages/tenants/TenantsList';
import TenantDetail from './pages/tenants/TenantDetail';
import PlannedPage from './pages/common/PlannedPage';
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
          <Route index element={<Navigate to="/tenants" replace />} />
          <Route path="/tenants" element={<TenantsList />} />
          <Route path="/tenants/:id" element={<TenantDetail />} />
          <Route
            path="/dashboard"
            element={
              <PlannedPage
                title="Dashboard"
                summary="Phase 3 expands this into KPI cards and charts backed by a dedicated dashboard endpoint."
              />
            }
          />
          <Route
            path="/billing"
            element={
              <PlannedPage
                title="Billing"
                summary="Phase 2 will connect this section to cross-tenant invoices, payments, and revenue summary routes."
              />
            }
          />
          <Route
            path="/usage"
            element={
              <PlannedPage
                title="Usage"
                summary="Phase 4 will add tenant engagement scoring, risk flags, and login activity trends."
              />
            }
          />
          <Route
            path="/operations"
            element={
              <PlannedPage
                title="Operations"
                summary="Phase 5 will add SMS and M-Pesa health visibility across tenants."
              />
            }
          />
          <Route
            path="/support"
            element={
              <PlannedPage
                title="Support"
                summary="Phase 6 will add audit-log tooling, tenant notes creation, and impersonation issuance."
              />
            }
          />
        </Route>
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? '/tenants' : '/login'} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
