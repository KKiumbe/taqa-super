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
import {
  ModeOfPayment,
  PlatformInvoice,
  PlatformPayment,
  TenantDetail as TenantDetailType,
  TenantStatus,
} from '../../types';
import { currencyFormatter, formatDateTime, formatRiskFlag } from '../../lib/format';

const paymentModes: ModeOfPayment[] = [
  'MPESA',
  'BANK_TRANSFER',
  'CASH',
  'CREDIT_CARD',
  'DEBIT_CARD',
];

const getCurrentMonthInput = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const getCurrentDateTimeInput = (): string => {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 16);
};

const toAmountInput = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '';
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(2);
};

type PlatformSmsSenderProfile = {
  tenantId: number;
  tenantName: string;
  partnerId: string;
  shortCode: string;
  customerSupportPhoneNumber: string;
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
  const [billingInvoices, setBillingInvoices] = useState<PlatformInvoice[]>([]);
  const [statusDraft, setStatusDraft] = useState<TenantStatus>('ACTIVE');
  const [invoiceAmountDraft, setInvoiceAmountDraft] = useState('');
  const [invoicePeriodDraft, setInvoicePeriodDraft] = useState(getCurrentMonthInput());
  const [paymentAmountDraft, setPaymentAmountDraft] = useState('');
  const [paymentModeDraft, setPaymentModeDraft] = useState<ModeOfPayment>('MPESA');
  const [paymentReferenceDraft, setPaymentReferenceDraft] = useState('');
  const [paymentInvoiceIdDraft, setPaymentInvoiceIdDraft] = useState('');
  const [paidAtDraft, setPaidAtDraft] = useState(getCurrentDateTimeInput());
  const [platformSmsSender, setPlatformSmsSender] = useState<PlatformSmsSenderProfile | null>(null);
  const [smsRecipientsDraft, setSmsRecipientsDraft] = useState('');
  const [smsMessageDraft, setSmsMessageDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
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

    const loadWorkspace = async () => {
      setLoading(true);
      setBillingLoading(true);
      setError(null);

      try {
        const [tenantResponse, invoicesResponse, senderResponse] = await Promise.all([
          api.get<{ tenant: TenantDetailType }>(`/tenants/${id}`),
          api.get<{ invoices: PlatformInvoice[] }>(`/billing/invoices`, {
            params: {
              tenantId: id,
              limit: 25,
            },
          }),
          api.get<{ sender: PlatformSmsSenderProfile }>('/support/sms-sender'),
        ]);

        if (cancelled) {
          return;
        }

        setTenant(tenantResponse.data.tenant);
        setStatusDraft(tenantResponse.data.tenant.status);
        setBillingInvoices(invoicesResponse.data.invoices);
        setPlatformSmsSender(senderResponse.data.sender);
        setInvoiceAmountDraft((current) =>
          current || toAmountInput(tenantResponse.data.tenant.subscription.priceMonthly)
        );
        setSmsRecipientsDraft((current) =>
          current ||
          tenantResponse.data.tenant.phoneNumber ||
          tenantResponse.data.tenant.alternativePhoneNumber ||
          ''
        );
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message ?? 'Failed to load tenant detail');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setBillingLoading(false);
        }
      }
    };

    loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const refreshTenantWorkspace = async (tenantId: number): Promise<void> => {
    const [tenantResponse, invoicesResponse] = await Promise.all([
      api.get<{ tenant: TenantDetailType }>(`/tenants/${tenantId}`),
      api.get<{ invoices: PlatformInvoice[] }>(`/billing/invoices`, {
        params: {
          tenantId,
          limit: 25,
        },
      }),
    ]);

    setTenant(tenantResponse.data.tenant);
    setStatusDraft(tenantResponse.data.tenant.status);
    setBillingInvoices(invoicesResponse.data.invoices);
    setSmsRecipientsDraft((current) =>
      current ||
      tenantResponse.data.tenant.phoneNumber ||
      tenantResponse.data.tenant.alternativePhoneNumber ||
      ''
    );
  };

  const statusDirty = tenant ? tenant.status !== statusDraft : false;

  const addressLine = useMemo(() => {
    if (!tenant) {
      return '';
    }

    return [tenant.building, tenant.street, tenant.address, tenant.town, tenant.county]
      .filter(Boolean)
      .join(', ');
  }, [tenant]);

  const openInvoices = useMemo(
    () => billingInvoices.filter((invoice) => invoice.status === 'UNPAID' || invoice.status === 'PPAID'),
    [billingInvoices]
  );

  const outstandingBalance = useMemo(
    () => openInvoices.reduce((sum, invoice) => sum + invoice.balance, 0),
    [openInvoices]
  );

  const recentInvoices = useMemo(() => billingInvoices.slice(0, 6), [billingInvoices]);

  const selectedInvoice = useMemo(
    () => openInvoices.find((invoice) => invoice.id === paymentInvoiceIdDraft) ?? null,
    [openInvoices, paymentInvoiceIdDraft]
  );

  const smsRecipientCount = useMemo(
    () =>
      smsRecipientsDraft
        .split(/[\n,;]+/)
        .map((value) => value.trim())
        .filter(Boolean).length,
    [smsRecipientsDraft]
  );

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

  const createManualInvoice = async () => {
    if (!tenant) {
      return;
    }

    const invoiceAmount = Number.parseFloat(invoiceAmountDraft);
    if (!Number.isFinite(invoiceAmount) || invoiceAmount <= 0) {
      setError('Enter a valid invoice amount greater than zero.');
      return;
    }

    if (!invoicePeriodDraft) {
      setError('Choose the invoice month before creating the invoice.');
      return;
    }

    setCreatingInvoice(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post<{ invoice: PlatformInvoice }>('/billing/invoices', {
        tenantId: tenant.id,
        invoiceAmount,
        invoicePeriod: invoicePeriodDraft,
      });

      await refreshTenantWorkspace(tenant.id);
      setPaymentInvoiceIdDraft(response.data.invoice.id);
      setSuccess(`Created invoice ${response.data.invoice.invoiceNumber}.`);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create tenant invoice');
    } finally {
      setCreatingInvoice(false);
    }
  };

  const recordManualPayment = async () => {
    if (!tenant) {
      return;
    }

    const paymentAmount = Number.parseFloat(paymentAmountDraft);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      setError('Enter a valid payment amount greater than zero.');
      return;
    }

    if (!paidAtDraft) {
      setError('Choose the payment datetime before recording the payment.');
      return;
    }

    setRecordingPayment(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post<{
        payment: PlatformPayment;
        meta?: {
          tenantReactivated?: boolean;
        };
      }>('/billing/payments', {
        tenantId: tenant.id,
        amount: paymentAmount,
        modeOfPayment: paymentModeDraft,
        transactionId: paymentReferenceDraft.trim() || undefined,
        preferredInvoiceId: paymentInvoiceIdDraft || undefined,
        paidAt: new Date(paidAtDraft).toISOString(),
      });

      await refreshTenantWorkspace(tenant.id);
      setPaymentAmountDraft('');
      setPaymentReferenceDraft('');
      setPaymentInvoiceIdDraft('');
      setPaidAtDraft(getCurrentDateTimeInput());

      if (response.data.meta?.tenantReactivated) {
        setSuccess(`Payment recorded and ${tenant.name} was reactivated.`);
      } else {
        const linkedInvoices = response.data.payment.linkedInvoiceNumbers.join(', ');
        setSuccess(`Payment recorded against ${linkedInvoices}.`);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to record tenant payment');
    } finally {
      setRecordingPayment(false);
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

  const sendPlatformSms = async () => {
    if (!tenant) {
      return;
    }

    if (!smsRecipientsDraft.trim()) {
      setError('Enter at least one recipient phone number.');
      return;
    }

    if (!smsMessageDraft.trim()) {
      setError('Enter the SMS message before sending.');
      return;
    }

    setSendingSms(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post<{ message: string }>('/support/send-sms', {
        tenantId: tenant.id,
        recipients: smsRecipientsDraft,
        message: smsMessageDraft.trim(),
      });

      setSmsMessageDraft('');
      setSuccess(`${response.data.message} for ${tenant.name}.`);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to send platform SMS');
    } finally {
      setSendingSms(false);
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
        subtitle="Tenant profile, subscription posture, billing controls, recent engagement, and status control."
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
                  <DetailMetric
                    label="Primary Contact"
                    value={tenant.email || tenant.phoneNumber || 'Not set'}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailMetric
                    label="Alternative Contact"
                    value={tenant.alternativePhoneNumber || 'Not set'}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailMetric
                    label="Location"
                    value={[tenant.town, tenant.county].filter(Boolean).join(', ') || 'Not set'}
                  />
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
                Status updates are written through the separate `/api/platform` namespace and logged
                to the platform audit trail.
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
              <DetailMetric
                label="Max Users On Plan"
                value={tenant.subscription.maxUsers ? String(tenant.subscription.maxUsers) : 'Unspecified'}
              />
              <DetailMetric
                label="Bag Allocation"
                value={tenant.numberOfBags ? String(tenant.numberOfBags) : 'Not set'}
              />
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
                  <DetailMetric
                    label="Actions (30d)"
                    value={String(tenant.engagement.actionsLast30Days)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <DetailMetric
                    label="Active Users (30d)"
                    value={String(tenant.engagement.activeUsersLast30Days)}
                  />
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
                    <Chip
                      key={flag}
                      label={formatRiskFlag(flag)}
                      color="warning"
                      variant="outlined"
                    />
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
              <DetailMetric label="Open Invoices" value={String(openInvoices.length)} />
              <DetailMetric
                label="Outstanding Balance"
                value={currencyFormatter.format(outstandingBalance)}
              />
              <DetailMetric
                label="Latest Tenant Payment"
                value={
                  tenant.latestPayment
                    ? `${currencyFormatter.format(tenant.latestPayment.amount)} on ${formatDateTime(
                        tenant.latestPayment.createdAt
                      )}`
                    : 'No recorded tenant payment'
                }
              />
              <DetailMetric
                label="Latest Tenant Invoice"
                value={
                  tenant.latestInvoice
                    ? `${tenant.latestInvoice.invoiceNumber} · ${currencyFormatter.format(
                        tenant.latestInvoice.invoiceAmount
                      )}`
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
                  <DetailMetric
                    label="Tenant Invoices"
                    value={String(tenant.counters.tenantInvoices)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <DetailMetric
                    label="Tenant Payments"
                    value={String(tenant.counters.tenantPayments)}
                  />
                </Grid>
              </Grid>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Stack spacing={2}>
              <Typography variant="overline" color="primary">
                Billing Queue
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Review current invoice exposure before creating new billings or applying manual
                payments.
              </Typography>
              <Divider />
              {billingLoading && !billingInvoices.length ? (
                <Typography color="text.secondary">Loading billing records...</Typography>
              ) : recentInvoices.length ? (
                <Stack spacing={1.5}>
                  {recentInvoices.map((invoice) => (
                    <Paper key={invoice.id} variant="outlined" sx={{ p: 1.5 }}>
                      <Stack spacing={0.5}>
                        <Stack direction="row" justifyContent="space-between" spacing={1}>
                          <Typography fontWeight={700}>{invoice.invoiceNumber}</Typography>
                          <StatusChip status={invoice.status} />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {currencyFormatter.format(invoice.invoiceAmount)} invoiced
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Balance {currencyFormatter.format(invoice.balance)}
                        </Typography>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography color="text.secondary">No platform billing records yet.</Typography>
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Stack spacing={2}>
              <Typography variant="overline" color="primary">
                Manual Invoice
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create a tenant invoice with an auto-generated invoice number for the selected
                month.
              </Typography>
              <TextField
                label="Invoice Amount"
                type="number"
                inputProps={{ min: 1, step: '0.01' }}
                value={invoiceAmountDraft}
                onChange={(event) => setInvoiceAmountDraft(event.target.value)}
                placeholder="0.00"
              />
              <TextField
                label="Invoice Month"
                type="month"
                value={invoicePeriodDraft}
                onChange={(event) => setInvoicePeriodDraft(event.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <Button variant="contained" onClick={createManualInvoice} disabled={creatingInvoice}>
                {creatingInvoice ? 'Creating invoice...' : 'Create invoice'}
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Stack spacing={2}>
              <Typography variant="overline" color="primary">
                Manual Payment
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Apply a manual payment to this tenant. If you pick an invoice, it is settled first
                before any remaining amount rolls into other open invoices.
              </Typography>
              <FormControl fullWidth>
                <InputLabel id="payment-invoice-label">Target Invoice</InputLabel>
                <Select
                  labelId="payment-invoice-label"
                  label="Target Invoice"
                  value={paymentInvoiceIdDraft}
                  onChange={(event) => {
                    const nextInvoiceId = event.target.value;
                    setPaymentInvoiceIdDraft(nextInvoiceId);

                    if (!paymentAmountDraft) {
                      const nextInvoice = openInvoices.find((invoice) => invoice.id === nextInvoiceId);
                      if (nextInvoice) {
                        setPaymentAmountDraft(toAmountInput(nextInvoice.balance));
                      }
                    }
                  }}
                >
                  <MenuItem value="">Auto allocate oldest open invoices</MenuItem>
                  {openInvoices.map((invoice) => (
                    <MenuItem key={invoice.id} value={invoice.id}>
                      {invoice.invoiceNumber} · {currencyFormatter.format(invoice.balance)} due
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {selectedInvoice ? (
                <Typography variant="body2" color="text.secondary">
                  Selected balance: {currencyFormatter.format(selectedInvoice.balance)}
                </Typography>
              ) : null}
              <TextField
                label="Payment Amount"
                type="number"
                inputProps={{ min: 1, step: '0.01' }}
                value={paymentAmountDraft}
                onChange={(event) => setPaymentAmountDraft(event.target.value)}
                placeholder="0.00"
              />
              <FormControl fullWidth>
                <InputLabel id="payment-mode-label">Mode of Payment</InputLabel>
                <Select
                  labelId="payment-mode-label"
                  label="Mode of Payment"
                  value={paymentModeDraft}
                  onChange={(event: SelectChangeEvent<ModeOfPayment>) =>
                    setPaymentModeDraft(event.target.value as ModeOfPayment)
                  }
                >
                  {paymentModes.map((mode) => (
                    <MenuItem key={mode} value={mode}>
                      {mode.replace('_', ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Reference"
                value={paymentReferenceDraft}
                onChange={(event) => setPaymentReferenceDraft(event.target.value)}
                placeholder="Transaction code, bank ref, or receipt ref"
              />
              <TextField
                label="Paid At"
                type="datetime-local"
                value={paidAtDraft}
                onChange={(event) => setPaidAtDraft(event.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <Button variant="contained" onClick={recordManualPayment} disabled={recordingPayment}>
                {recordingPayment ? 'Recording payment...' : 'Record payment'}
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="overline" color="primary">
                  Tenant Communication
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Super-admin SMS uses the SMS config from tenant {platformSmsSender?.tenantId ?? 2}
                  {platformSmsSender ? ` (${platformSmsSender.tenantName})` : ''} with partner ID{' '}
                  {platformSmsSender?.partnerId ?? '4680'}.
                </Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={5}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label="Recipients"
                    placeholder="0700000000, 0711111111"
                    value={smsRecipientsDraft}
                    onChange={(event) => setSmsRecipientsDraft(event.target.value)}
                    helperText={
                      tenant.alternativePhoneNumber
                        ? `Primary contact: ${tenant.phoneNumber || 'Not set'} • Alternative: ${tenant.alternativePhoneNumber}`
                        : `Primary contact: ${tenant.phoneNumber || 'Not set'}`
                    }
                  />
                </Grid>
                <Grid item xs={12} md={7}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={4}
                    label="SMS Message"
                    placeholder="Write the tenant update, payment follow-up, or support message."
                    value={smsMessageDraft}
                    onChange={(event) => setSmsMessageDraft(event.target.value)}
                  />
                </Grid>
              </Grid>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button
                  variant="outlined"
                  disabled={!tenant.phoneNumber && !tenant.alternativePhoneNumber}
                  onClick={() =>
                    setSmsRecipientsDraft(tenant.phoneNumber || tenant.alternativePhoneNumber || '')
                  }
                >
                  Use tenant contact
                </Button>
                <Button
                  variant="contained"
                  onClick={sendPlatformSms}
                  disabled={sendingSms}
                >
                  {sendingSms ? 'Sending SMS...' : `Send SMS${smsRecipientCount ? ` (${smsRecipientCount})` : ''}`}
                </Button>
              </Stack>
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
                  Record support context here and launch a short-lived tenant impersonation session
                  when needed.
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
                <Button
                  variant="contained"
                  onClick={createNote}
                  disabled={noteSaving || !noteDraft.trim()}
                >
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
                <Typography color="text.secondary">
                  No support notes have been recorded yet.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default TenantDetail;
