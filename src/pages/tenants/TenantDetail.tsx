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
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import StatusChip from '../../components/StatusChip';
import { api } from '../../services/api';
import { TenantDetail as TenantDetailType, TenantStatus } from '../../types';

const currency = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  maximumFractionDigits: 0,
});

const datetime = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const riskLabel: Record<string, string> = {
  NO_ACTIVITY_30_DAYS: 'No activity in 30 days',
  NO_LOGIN_30_DAYS: 'No login in 30 days',
  NO_PAYMENT_60_DAYS: 'No payment in 60 days',
};

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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadTenant = async () => {
      if (!id) {
        setError('Tenant ID is missing');
        return;
      }

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
              <DetailMetric label="Joined" value={datetime.format(new Date(tenant.createdAt))} />
              <DetailMetric label="Last Updated" value={datetime.format(new Date(tenant.updatedAt))} />
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
                {currency.format(tenant.subscription.priceMonthly)} monthly
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
                        ? datetime.format(new Date(tenant.engagement.lastActivityAt))
                        : 'No activity'
                    }
                  />
                </Grid>
                <Grid item xs={6}>
                  <DetailMetric
                    label="Last Login"
                    value={
                      tenant.engagement.lastLoginAt
                        ? datetime.format(new Date(tenant.engagement.lastLoginAt))
                        : 'No login'
                    }
                  />
                </Grid>
              </Grid>
              <Divider />
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {tenant.engagement.riskFlags.length ? (
                  tenant.engagement.riskFlags.map((flag) => (
                    <Chip key={flag} label={riskLabel[flag] ?? flag} color="warning" variant="outlined" />
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
                    ? `${currency.format(tenant.latestPayment.amount)} on ${datetime.format(new Date(tenant.latestPayment.createdAt))}`
                    : 'No recorded tenant payment'
                }
              />
              <DetailMetric
                label="Latest Tenant Invoice"
                value={
                  tenant.latestInvoice
                    ? `${tenant.latestInvoice.invoiceNumber} · ${currency.format(tenant.latestInvoice.invoiceAmount)}`
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
                  Notes creation and impersonation are reserved for later phases, but the detail surface is ready.
                </Typography>
              </Box>
              <Button disabled variant="outlined">
                Impersonation arrives in Phase 6
              </Button>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={2}>
              {tenant.notes.length ? (
                tenant.notes.map((note) => (
                  <Paper key={note.id} variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body1">{note.note}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {note.admin.name} · {datetime.format(new Date(note.createdAt))}
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
