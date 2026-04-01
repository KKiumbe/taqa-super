import { FormEvent, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { PlatformAdminProfile } from '../../types';

const Login = () => {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [token, navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await api.post<{
        token: string;
        admin: PlatformAdminProfile;
      }>('/auth/login', { email, password });

      setSession(response.data.token, response.data.admin);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Platform login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: '1.1fr 0.9fr' },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, md: 5 },
        }}
      >
        <Paper sx={{ width: '100%', maxWidth: 520, p: { xs: 3, md: 4 } }}>
          <Typography variant="overline" color="primary">
            Platform Authentication
          </Typography>
          <Typography variant="h3" sx={{ mt: 1, mb: 1 }}>
            Sign in to the control plane
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            This app is isolated from tenant operations and only accepts platform-admin bearer sessions.
          </Typography>

          {error ? <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert> : null}

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                fullWidth
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                fullWidth
              />
              <Button type="submit" variant="contained" size="large" disabled={submitting}>
                {submitting ? 'Signing in...' : 'Enter platform console'}
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'stretch',
          p: { xs: 3, md: 5 },
        }}
      >
        <Paper
          sx={{
            width: '100%',
            minHeight: 420,
            p: { xs: 3, md: 4 },
            color: 'common.white',
            background:
              'linear-gradient(160deg, rgba(24,48,51,0.98) 0%, rgba(32,75,77,0.94) 50%, rgba(201,104,58,0.9) 100%)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 'auto -2rem -2rem auto',
              width: 220,
              height: 220,
              borderRadius: '50%',
              background: 'rgba(224,164,88,0.16)',
              filter: 'blur(2px)',
            }}
          />
          <Stack spacing={3} sx={{ position: 'relative', zIndex: 1 }}>
            <Typography variant="overline" sx={{ opacity: 0.7 }}>
              Platform Console
            </Typography>
            <Typography variant="h3" sx={{ color: 'common.white', maxWidth: 420 }}>
              One place to see the whole platform clearly.
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.82, maxWidth: 480 }}>
              Tenant growth, subscription posture, churn signals, and operational anomalies belong in a
              separate operator surface. This console is that surface.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Paper sx={{ p: 2.5, backgroundColor: 'rgba(255,255,255,0.12)', color: 'inherit' }}>
                <Typography variant="h5">Cross-tenant</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Inspect every tenant from one authenticated session.
                </Typography>
              </Paper>
              <Paper sx={{ p: 2.5, backgroundColor: 'rgba(255,255,255,0.12)', color: 'inherit' }}>
                <Typography variant="h5">Separate auth</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Bearer-token transport keeps platform admin auth distinct from tenant cookies.
                </Typography>
              </Paper>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
};

export default Login;
