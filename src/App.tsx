import { Suspense, lazy } from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './layout/ProtectedRoute';
import { useAuthStore } from './store/authStore';

const Login = lazy(() => import('./pages/auth/Login'));
const DashboardLayout = lazy(() => import('./layout/DashboardLayout'));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const Billing = lazy(() => import('./pages/billing/Billing'));
const Usage = lazy(() => import('./pages/usage/Usage'));
const Operations = lazy(() => import('./pages/operations/Operations'));
const Support = lazy(() => import('./pages/support/Support'));
const SmsResale = lazy(() => import('./pages/smsResale/SmsResale'));
const TenantsList = lazy(() => import('./pages/tenants/TenantsList'));
const CreateTenant = lazy(() => import('./pages/tenants/CreateTenant'));
const TenantDetail = lazy(() => import('./pages/tenants/TenantDetail'));
const Integrations = lazy(() => import('./pages/tenants/Integrations'));
const SmsConfig = lazy(() => import('./pages/tenants/SmsConfig'));
const MpesaConfig = lazy(() => import('./pages/tenants/MpesaConfig'));

const RouteFallback = () => (
  <Box
    sx={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      px: 3,
    }}
  >
    <Stack spacing={1.5} alignItems="center">
      <CircularProgress color="primary" />
      <Typography variant="body2" color="text.secondary">
        Loading workspace...
      </Typography>
    </Stack>
  </Box>
);

const App = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
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
            <Route path="/tenants/new" element={<CreateTenant />} />
            <Route path="/tenants/:id" element={<TenantDetail />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/usage" element={<Usage />} />
            <Route path="/operations" element={<Operations />} />
            <Route path="/sms-resale" element={<SmsResale />} />
          <Route path="/communication" element={<Support />} />
          <Route path="/support" element={<Support />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/integrations/sms" element={<SmsConfig />} />
            <Route path="/integrations/mpesa" element={<MpesaConfig />} />
        </Route>
          <Route
            path="*"
            element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
