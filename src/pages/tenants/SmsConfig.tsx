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

const SmsConfig = () => {
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

  const configStatus = tenant?.smsConfig?.shortCode ? 'Configured' : 'Missing';

  const handleSave = async () => {
    if (!tenant) {
      setError('Select a tenant before saving.');
      return;
    }

    const partnerId = draft.smsPartnerId.trim();
    const shortCode = draft.smsShortCode.trim();
    const supportPhone = draft.smsSupportPhone.trim();
    const apiKey = draft.smsApiKey.trim();
    const childId = draft.smsChildId.trim();
    const requiresApiKey = !tenant.smsConfig;

    if (!partnerId || !shortCode || !supportPhone) {
      setError('Partner ID, short code, and support phone are required.');
      return;
    }

    if (requiresApiKey && !apiKey) {
      setError('API key is required to create a new SMS config.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: Record<string, unknown> = {
        smsConfig: {
          partnerId,
          shortCode,
          customerSupportPhoneNumber: supportPhone,
          ...(apiKey ? { apiKey } : {}),
          ...(childId ? { childId } : {}),
        },
      };

      await api.patch(`/tenants/${tenant.id}`, payload);
      await refreshTenant(tenant.id);
      setSuccess('SMS configuration saved.');
      setDraft((current) => ({
        ...current,
        smsApiKey: '',
      }));
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to save SMS configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="SMS Configuration"
        subtitle="Create or edit SMS credentials independently from tenant profile updates."
        eyebrow="Integrations"
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/integrations')}>
              Back to integrations
            </Button>
            <Button variant="contained" onClick={() => navigate('/integrations/mpesa')}>
              Go to M-Pesa
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
                  label="Partner ID"
                  value={draft.smsPartnerId}
                  onChange={(event) => setDraft((current) => ({ ...current, smsPartnerId: event.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Short Code"
                  value={draft.smsShortCode}
                  onChange={(event) => setDraft((current) => ({ ...current, smsShortCode: event.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Support Phone"
                  value={draft.smsSupportPhone}
                  onChange={(event) => setDraft((current) => ({ ...current, smsSupportPhone: event.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="API Key"
                  type="password"
                  value={draft.smsApiKey}
                  onChange={(event) => setDraft((current) => ({ ...current, smsApiKey: event.target.value }))}
                  helperText="Leave blank to keep the current API key"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Child ID"
                  value={draft.smsChildId}
                  onChange={(event) => setDraft((current) => ({ ...current, smsChildId: event.target.value }))}
                />
              </Grid>
            </Grid>

            <Box>
              <Button variant="contained" onClick={handleSave} disabled={saving || !tenant}>
                {saving ? 'Saving...' : 'Save SMS configuration'}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default SmsConfig;
