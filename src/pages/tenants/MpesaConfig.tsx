import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import PageHeader from '../../components/PageHeader';
import { api } from '../../services/api';
import { useTenantConfigDraft } from './useTenantConfigDraft';
import { useLocation, useNavigate } from 'react-router-dom';

const MpesaConfig = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const initialTenantId = new URLSearchParams(search).get('tenantId') ?? undefined;
  const {
    tenant,
    draft,
    setDraft,
    selectedTenantId,
    setSelectedTenantId,
    loading,
    error,
    setError,
    refreshTenant,
    tenants,
  } = useTenantConfigDraft(initialTenantId);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const configStatus = tenant?.mpesaConfig?.shortCode ? 'Configured' : 'Missing';

  const handleSave = async () => {
    if (!tenant) {
      setError('Select a tenant before saving.');
      return;
    }

    const shortCode = draft.mpesaShortCode.trim();
    const name = draft.mpesaName.trim();
    const apiKey = draft.mpesaApiKey.trim();
    const passKey = draft.mpesaPassKey.trim();
    const secretKey = draft.mpesaSecretKey.trim();

    if (!shortCode || !name) {
      setError('Short code and display name are required.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: Record<string, unknown> = {
        mpesaConfig: {
          shortCode,
          name,
          ...(apiKey ? { apiKey } : {}),
          ...(passKey ? { passKey } : {}),
          ...(secretKey ? { secretKey } : {}),
        },
      };

      await api.patch(`/tenants/${tenant.id}`, payload);
      await refreshTenant(tenant.id);
      setSuccess('M-Pesa configuration saved.');
      setDraft((current) => ({
        ...current,
        mpesaApiKey: '',
        mpesaPassKey: '',
        mpesaSecretKey: '',
      }));
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to save M-Pesa configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="M-Pesa Configuration"
        subtitle="Manage paybill credentials and secret keys for tenant billing."
        eyebrow="Integrations"
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/integrations')}>
              Back to integrations
            </Button>
            <Button variant="contained" onClick={() => navigate('/integrations/sms')}>
              Go to SMS
            </Button>
          </Stack>
        }
      />

      <Card>
        <CardContent>
          <Stack spacing={2}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            {success ? <Alert severity="success">{success}</Alert> : null}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label="Tenant"
                value={selectedTenantId}
                onChange={(event) => setSelectedTenantId(event.target.value)}
                helperText={loading ? 'Loading tenants…' : 'Choose the tenant to configure'}
                fullWidth
              >
                {tenants.map((option) => (
                  <MenuItem key={option.id} value={String(option.id)}>
                    {option.name}
                  </MenuItem>
                ))}
              </TextField>
              <Typography variant="body2" color="text.secondary">
                Status: <strong>{configStatus}</strong>
              </Typography>
            </Stack>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Short Code"
                  value={draft.mpesaShortCode}
                  onChange={(event) => setDraft((current) => ({ ...current, mpesaShortCode: event.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Display Name"
                  value={draft.mpesaName}
                  onChange={(event) => setDraft((current) => ({ ...current, mpesaName: event.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="API Key"
                  type="password"
                  value={draft.mpesaApiKey}
                  onChange={(event) => setDraft((current) => ({ ...current, mpesaApiKey: event.target.value }))}
                  helperText="Leave blank to retain the existing key"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Pass Key"
                  type="password"
                  value={draft.mpesaPassKey}
                  onChange={(event) => setDraft((current) => ({ ...current, mpesaPassKey: event.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Secret Key"
                  type="password"
                  value={draft.mpesaSecretKey}
                  onChange={(event) => setDraft((current) => ({ ...current, mpesaSecretKey: event.target.value }))}
                />
              </Grid>
            </Grid>

            <Box>
              <Button variant="contained" onClick={handleSave} disabled={saving || !tenant}>
                {saving ? 'Saving...' : 'Save M-Pesa configuration'}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default MpesaConfig;
