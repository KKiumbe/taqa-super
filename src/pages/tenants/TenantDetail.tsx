import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import StatusChip from '../../components/StatusChip';
import { api, TENANT_APP_URL } from '../../services/api';
import { TenantDetail as TenantDetailType, TenantStatus } from '../../types';
import { currencyFormatter, formatDateTime, formatRiskFlag } from '../../lib/format';

const DetailMetric = ({ label, value }: { label: string; value: string }) => (
  <Box>
    <Typography variant="overline" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body1" fontWeight={700}>
      {value}
    </Typography>
  </Box>
);

const TenantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<TenantDetailType | null>(null);
  const [statusDraft, setStatusDraft] = useState<TenantStatus>('ACTIVE');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!id) {
      setError('Tenant ID is missing');
      return;
    }

    const loadTenant = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get<{ tenant: TenantDetailType }>(`/tenants/${id}`);
        if (cancelled) {
          return;
        }

        setTenant(response.data.tenant);
        setStatusDraft(response.data.tenant.status);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message ?? 'Failed to load tenant detail');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadTenant();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const statusDirty = tenant ? tenant.status !== statusDraft : false;

  const addressLine = useMemo(() => {
    if (!tenant) {
      return '';
    }

    return [tenant.building, tenant.street, tenant.address, tenant.town, tenant.county]
      .filter(Boolean)
      .join(', ');
  }, [tenant]);

  const saveStatus = async () => {
    if (!tenant || !statusDirty) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await api.patch(`/tenants/${tenant.id}/status`, { status: statusDraft });
      setTenant({ ...tenant, status: statusDraft });
      setSuccess(`Tenant status updated to ${statusDraft}`);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to update tenant status');
    } finally {
      setSaving(false);
    }
  };

  const createNote = async () => {
    if (!tenant || !noteDraft.trim()) {
      setError('Enter a support note before saving.');
      return;
    }

    setNoteSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post<{
        note: TenantDetailType['notes'][number];
      }>('/support/tenant-notes', {
        tenantId: tenant.id,
        note: noteDraft.trim(),
      });

      setTenant((current) =>
        current
          ? {
              ...current,
              notes: [response.data.note, ...current.notes],
            }
          : current
      );
      setNoteDraft('');
      setSuccess('Support note added.');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create support note');
    } finally {
      setNoteSaving(false);
    }
  };

  const impersonate = async () => {
    if (!tenant) {
      return;
    }

    setImpersonating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post<{
        token: string;
      }>(`/support/impersonate/${tenant.id}`);

      const url = `${TENANT_APP_URL.replace(/\/$/, '')}/impersonate?token=${encodeURIComponent(
        response.data.token
      )}`;
      const openedWindow = window.open(url, '_blank', 'noopener,noreferrer');

      if (!openedWindow) {
        setError('The tenant app link was generated, but your browser blocked the new tab.');
        return;
      }

      setSuccess(`Opened tenant impersonation for ${tenant.name}.`);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to issue impersonation token');
    } finally {
      setImpersonating(false);
    }
  };

  if (loading && !tenant) {
    return <Typography color="text.secondary">Loading tenant detail...</Typography>;
  }

  if (!tenant) {
    return (
      <Stack spacing={2}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/tenants')}>
          Back to tenants
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        title={tenant.name}
        subtitle="Tenant profile, subscription posture, recent engagement, and status control."
        action={
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackRoundedIcon />}
              onClick={() => navigate('/tenants')}
            >
              Back
            </Button>
            <Button variant="contained" onClick={saveStatus} disabled={!statusDirty || saving}>
              {saving ? 'Saving...' : 'Save Status'}
            </Button>
          </Stack>
        }
      />

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <Grid container spacing={2}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'center' }}
              >
                <Box>
                  <Typography variant="overline" color="primary">
                    Tenant Profile
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 0.5 }}>
                    {tenant.name}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <StatusChip status={tenant.status} />
                  <Chip label={tenant.subscription.name} variant="outlined" />
                </Stack>
              </Stack>

              <Divider />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <DetailMetric label="Primary Contact" value={tenant.email || tenant.phoneNumber || 'Not set'} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailMetric label="Alternative Contact" value={tenant.alternativePhoneNumber || 'Not set'} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailMetric label="Location" value={[tenant.town, tenant.county].filter(Boolean).join(', ') || 'Not set'} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailMetric label="Address" value={addressLine || 'Not set'} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailMetric label="Website" value={tenant.website || 'Not set'} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailMetric label="Created By" value={tenant.createdBy || 'Unknown'} />
                </Grid>
              </Grid>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3 }}>
            <Stack spacing={2.5}>
              <Typography variant="overline" color="primary">
                Status Control
              </Typography>
              <FormControl fullWidth>
                <InputLabel id="tenant-status-label">Tenant Status</InputLabel>
                <Select
                  labelId="tenant-status-label"
                  label="Tenant Status"
                  value={statusDraft}
                  onChange={(event: SelectChangeEvent<TenantStatus>) =>
                    setStatusDraft(event.target.value as TenantStatus)
                  }
                >
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="DISABLED">Disabled</MenuItem>
                  <MenuItem value="EXPIRED">Expired</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="body2" color="text.secondary">
                Status updates are written through the separate `/api/platform` namespace and logged to the
                platform audit trail.
              </Typography>
              <Divider />
              <DetailMetric label="Joined" value={formatDateTime(tenant.createdAt)} />
              <DetailMetric label="Last Updated" value={formatDateTime(tenant.updatedAt)} />
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Stack spacing={2}>
              <Typography variant="overline" color="primary">
                Subscription
              </Typography>
              <Typography variant="h5">{tenant.subscription.name}</Typography>
              <Typography variant="body1" color="text.secondary">
                {currencyFormatter.format(tenant.subscription.priceMonthly)} monthly
              </Typography>
              <Divider />
              <DetailMetric label="Legacy Plan Label" value={tenant.subscription.legacyName} />
              <DetailMetric label="Allowed Users" value={String(tenant.allowedUsers)} />
              <DetailMetric label="Max Users On Plan" value={tenant.subscription.maxUsers ? String(tenant.subscription.maxUsers) : 'Unspecified'} />
              <DetailMetric label="Bag Allocation" value={tenant.numberOfBags ? String(tenant.numberOfBags) : 'Not set'} />
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Stack spacing={2}>
              <Typography variant="overline" color="primary">
                Engagement Snapshot
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <DetailMetric label="Actions (30d)" value={String(tenant.engagement.actionsLast30Days)} />
                </Grid>
                <Grid item xs={6}>
                  <DetailMetric label="Active Users (30d)" value={String(tenant.engagement.activeUsersLast30Days)} />
                </Grid>
                <Grid item xs={6}>
                  <DetailMetric
                    label="Last Activity"
                    value={
                      tenant.engagement.lastActivityAt
                        ? formatDateTime(tenant.engagement.lastActivityAt)
                        : 'No activity'
                    }
                  />
                </Grid>
                <Grid item xs={6}>
                  <DetailMetric
                    label="Last Login"
                    value={
                      tenant.engagement.lastLoginAt
                        ? formatDateTime(tenant.engagement.lastLoginAt)
                        : 'No login'
                    }
                  />
                </Grid>
              </Grid>
              <Divider />
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {tenant.engagement.riskFlags.length ? (
                  tenant.engagement.riskFlags.map((flag) => (
                    <Chip key={flag} label={formatRiskFlag(flag)} color="warning" variant="outlined" />
                  ))
                ) : (
                  <Chip label="No current risk flags" color="success" variant="outlined" />
                )}
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Stack spacing={2}>
              <Typography variant="overline" color="primary">
                Recent Billing
              </Typography>
              <DetailMetric
                label="Latest Tenant Payment"
                value={
                  tenant.latestPayment
                    ? `${currencyFormatter.format(tenant.latestPayment.amount)} on ${formatDateTime(tenant.latestPayment.createdAt)}`
                    : 'No recorded tenant payment'
                }
              />
              <DetailMetric
                label="Latest Tenant Invoice"
                value={
                  tenant.latestInvoice
                    ? `${tenant.latestInvoice.invoiceNumber} · ${currencyFormatter.format(tenant.latestInvoice.invoiceAmount)}`
                    : 'No recorded tenant invoice'
                }
              />
              {tenant.latestInvoice ? (
                <DetailMetric label="Invoice Status" value={tenant.latestInvoice.status} />
              ) : null}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Stack spacing={2}>
              <Typography variant="overline" color="primary">
                Counters
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <DetailMetric label="Users" value={String(tenant.counters.users)} />
                </Grid>
                <Grid item xs={6}>
                  <DetailMetric label="Customers" value={String(tenant.counters.customers)} />
                </Grid>
                <Grid item xs={6}>
                  <DetailMetric label="Tenant Invoices" value={String(tenant.counters.tenantInvoices)} />
                </Grid>
                <Grid item xs={6}>
                  <DetailMetric label="Tenant Payments" value={String(tenant.counters.tenantPayments)} />
                </Grid>
              </Grid>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
              <Box>
                <Typography variant="overline" color="primary">
                  Support Notes
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Record support context here and launch a short-lived tenant impersonation session when needed.
                </Typography>
              </Box>
              <Button variant="outlined" onClick={impersonate} disabled={impersonating}>
                {impersonating ? 'Opening tenant app...' : 'Impersonate tenant'}
              </Button>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={2} sx={{ mb: 2.5 }}>
              <TextField
                multiline
                minRows={3}
                label="Add support note"
                placeholder="Capture investigation details, next steps, or customer context."
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button variant="contained" onClick={createNote} disabled={noteSaving || !noteDraft.trim()}>
                  {noteSaving ? 'Saving note...' : 'Save note'}
                </Button>
                <Typography variant="body2" color="text.secondary">
                  Notes are stored under the platform namespace and visible only to platform admins.
                </Typography>
              </Stack>
            </Stack>
            <Stack spacing={2}>
              {tenant.notes.length ? (
                tenant.notes.map((note) => (
                  <Paper key={note.id} variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body1">{note.note}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {note.admin.name} · {formatDateTime(note.createdAt)}
                    </Typography>
                  </Paper>
                ))
              ) : (
                <Typography color="text.secondary">No support notes have been recorded yet.</Typography>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default TenantDetail;
