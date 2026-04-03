import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, CardContent, Chip, Divider, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import PageHeader from '../../components/PageHeader';
import { useTenantConfigDraft } from './useTenantConfigDraft';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { PlatformSmsConfig } from '../../types';

const interactionDefinitions = [
  {
    badge: 'SMS',
    title: 'SMS Configuration',
    description: 'Manage partner IDs, short codes, and support phones used by the tenant app.',
    action: {
      label: 'Configure SMS',
      to: '/integrations/sms',
    },
  },
  {
    badge: 'M-Pesa',
    title: 'M-Pesa Credentials',
    description: 'Set up or rotate paybill credentials, pass keys, and secret keys in one place.',
    action: {
      label: 'Configure M-Pesa',
      to: '/integrations/mpesa',
    },
  },
];

type PlatformSmsDraft = {
  partnerId: string;
  apiKey: string;
  shortCode: string;
  senderName: string;
};

const Integrations = () => {
  const navigate = useNavigate();
  const {
    tenants,
    tenant,
    selectedTenantId,
    setSelectedTenantId,
    loading,
    error,
  } = useTenantConfigDraft();
  const [platformSmsConfig, setPlatformSmsConfig] = useState<PlatformSmsConfig | null>(null);
  const [platformSmsDraft, setPlatformSmsDraft] = useState<PlatformSmsDraft>({
    partnerId: '',
    apiKey: '',
    shortCode: '',
    senderName: '',
  });
  const [platformSmsLoading, setPlatformSmsLoading] = useState(false);
  const [platformSmsSaving, setPlatformSmsSaving] = useState(false);
  const [platformSmsError, setPlatformSmsError] = useState<string | null>(null);
  const [platformSmsSuccess, setPlatformSmsSuccess] = useState<string | null>(null);

  const tenantOptions = useMemo(
    () => tenants.map((option) => ({ value: String(option.id), label: option.name })),
    [tenants]
  );

  const statusLabel = (value?: string | null) => (value ? 'Configured' : 'Missing');
  const statusColor = (value?: string | null) =>
    value ? 'success' : 'warning';

  useEffect(() => {
    let cancelled = false;

    const loadPlatformSmsConfig = async () => {
      setPlatformSmsLoading(true);
      setPlatformSmsError(null);

      try {
        const response = await api.get<{ config: PlatformSmsConfig | null }>('/sms-config');

        if (cancelled) {
          return;
        }

        setPlatformSmsConfig(response.data.config);
        setPlatformSmsDraft({
          partnerId: response.data.config?.partnerId ?? '',
          apiKey: response.data.config?.apiKey ?? '',
          shortCode: response.data.config?.shortCode ?? '',
          senderName: response.data.config?.senderName ?? '',
        });
      } catch (err: any) {
        if (!cancelled) {
          setPlatformSmsError(err?.response?.data?.message ?? 'Failed to load platform SMS config');
        }
      } finally {
        if (!cancelled) {
          setPlatformSmsLoading(false);
        }
      }
    };

    loadPlatformSmsConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  const savePlatformSmsConfig = async () => {
    setPlatformSmsSaving(true);
    setPlatformSmsError(null);
    setPlatformSmsSuccess(null);

    try {
      const payload = {
        partnerId: platformSmsDraft.partnerId.trim(),
        apiKey: platformSmsDraft.apiKey.trim(),
        shortCode: platformSmsDraft.shortCode.trim(),
        senderName: platformSmsDraft.senderName.trim(),
      };

      const response = platformSmsConfig
        ? await api.put<{ config: PlatformSmsConfig; message: string }>('/sms-config', payload)
        : await api.post<{ config: PlatformSmsConfig; message: string }>('/sms-config', payload);

      setPlatformSmsConfig(response.data.config);
      setPlatformSmsDraft({
        partnerId: response.data.config.partnerId,
        apiKey: response.data.config.apiKey,
        shortCode: response.data.config.shortCode,
        senderName: response.data.config.senderName,
      });
      setPlatformSmsSuccess(response.data.message || 'Platform SMS config saved.');
    } catch (err: any) {
      setPlatformSmsError(err?.response?.data?.message ?? 'Failed to save platform SMS config');
    } finally {
      setPlatformSmsSaving(false);
    }
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Integrations"
        subtitle="Keep tenant SMS and M-Pesa credentials in sync with one structured workflow."
        eyebrow="Credit & Collection"
        action={
          <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/tenants')}>
            Back to tenants
          </Button>
        }
      />

      <Card sx={{ p: { xs: 2, md: 3 } }}>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <TextField
                select
                label="Tenant"
                value={selectedTenantId}
                onChange={(event) => setSelectedTenantId(event.target.value)}
                helperText={loading ? 'Loading tenants…' : 'Select a tenant to configure integrations'}
                fullWidth
              >
                {tenantOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            {error ? (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            ) : null}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={`SMS: ${statusLabel(tenant?.smsConfig?.shortCode)}`}
                color={statusColor(tenant?.smsConfig?.shortCode)}
                variant="outlined"
              />
              <Chip
                label={`M-Pesa: ${statusLabel(tenant?.mpesaConfig?.shortCode)}`}
                color={statusColor(tenant?.mpesaConfig?.shortCode)}
                variant="outlined"
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {interactionDefinitions.map((definition) => (
          <Grid key={definition.badge} item xs={12} md={6}>
            <Card
              sx={{
                borderColor: 'divider',
                borderWidth: 1,
              }}
            >
              <CardContent>
                <Stack spacing={1.5}>
                  <Chip label={definition.badge} size="small" />
                  <Typography variant="h6">{definition.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {definition.description}
                  </Typography>
                  <Button
                    variant="contained"
                    disableElevation
                    onClick={() => {
                      const params = tenant ? `?tenantId=${tenant.id}` : '';
                      navigate(`${definition.action.to}${params}`);
                    }}
                  >
                    {definition.action.label}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ p: { xs: 2, md: 3 } }}>
        <CardContent>
          <Stack spacing={2}>
            <Stack spacing={0.5}>
              <Typography variant="overline" color="text.secondary">
                Platform SMS
              </Typography>
              <Typography variant="h6">Billing Receipt Sender</Typography>
              <Typography variant="body2" color="text.secondary">
                Configure the singleton SMS profile used to send tenant subscription receipt notifications.
              </Typography>
            </Stack>
            {platformSmsError ? <Alert severity="error">{platformSmsError}</Alert> : null}
            {platformSmsSuccess ? <Alert severity="success">{platformSmsSuccess}</Alert> : null}
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Partner ID"
                  value={platformSmsDraft.partnerId}
                  onChange={(event) =>
                    setPlatformSmsDraft((current) => ({ ...current, partnerId: event.target.value }))
                  }
                  fullWidth
                  disabled={platformSmsLoading || platformSmsSaving}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Short Code"
                  value={platformSmsDraft.shortCode}
                  onChange={(event) =>
                    setPlatformSmsDraft((current) => ({ ...current, shortCode: event.target.value }))
                  }
                  fullWidth
                  disabled={platformSmsLoading || platformSmsSaving}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Sender Name"
                  value={platformSmsDraft.senderName}
                  onChange={(event) =>
                    setPlatformSmsDraft((current) => ({ ...current, senderName: event.target.value }))
                  }
                  fullWidth
                  disabled={platformSmsLoading || platformSmsSaving}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="API Key"
                  value={platformSmsDraft.apiKey}
                  onChange={(event) =>
                    setPlatformSmsDraft((current) => ({ ...current, apiKey: event.target.value }))
                  }
                  fullWidth
                  disabled={platformSmsLoading || platformSmsSaving}
                />
              </Grid>
            </Grid>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                {platformSmsConfig ? 'Singleton record is active. Use save to replace it via PUT.' : 'No platform SMS config exists yet. Saving will create the singleton row.'}
              </Typography>
              <Button variant="contained" onClick={savePlatformSmsConfig} disabled={platformSmsLoading || platformSmsSaving}>
                {platformSmsSaving ? 'Saving...' : platformSmsConfig ? 'Update platform SMS' : 'Create platform SMS'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ p: { xs: 2, md: 3 } }}>
        <CardContent>
          <Typography variant="overline" color="text.secondary">
            Workflow
          </Typography>
          <Stack spacing={1}>
            <Typography variant="body2">
              Tenant integrations live in their own control surface. Choose a tenant, update SMS or
              M-Pesa credentials, and new secrets only overwrite when you enter them anew.
            </Typography>
            <Divider flexItem />
            <Typography variant="body2">
              Use the dedicated SMS and M-Pesa screens in the main navigation to configure or rotate credentials for each provider.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default Integrations;
