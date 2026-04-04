import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  PlatformInvoice,
  PlatformPayment,
  PlatformReceipt,
  TenantDetail as TenantDetailType,
  TenantCustomerStats,
  TenantStatus,
} from '../../types';
import { currencyFormatter, formatDate, formatDateTime, formatRiskFlag } from '../../lib/format';

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

type TenantEditDraft = {
  name: string;
  subscriptionPlan: string;
  monthlyCharge: string;
  email: string;
  phoneNumber: string;
  alternativePhoneNumber: string;
  county: string;
  town: string;
  address: string;
  building: string;
  street: string;
  website: string;
  paymentDetails: string;
  allowedUsers: string;
  numberOfBags: string;
  smsPartnerId: string;
  smsShortCode: string;
  smsSupportPhone: string;
  smsChildId: string;
  smsApiKey: string;
  mpesaShortCode: string;
  mpesaName: string;
  mpesaApiKey: string;
  mpesaPassKey: string;
  mpesaSecretKey: string;
};

const toNullable = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const buildTenantEditDraft = (tenant: TenantDetailType): TenantEditDraft => ({
  name: tenant.name,
  subscriptionPlan: tenant.subscriptionPlan,
  monthlyCharge: toAmountInput(tenant.monthlyCharge),
  email: tenant.email || '',
  phoneNumber: tenant.phoneNumber || '',
  alternativePhoneNumber: tenant.alternativePhoneNumber || '',
  county: tenant.county || '',
  town: tenant.town || '',
  address: tenant.address || '',
  building: tenant.building || '',
  street: tenant.street || '',
  website: tenant.website || '',
  paymentDetails: tenant.paymentDetails || '',
  allowedUsers: String(tenant.allowedUsers || 1),
  numberOfBags: tenant.numberOfBags ? String(tenant.numberOfBags) : '',
  smsPartnerId: tenant.smsConfig?.partnerId || '',
  smsShortCode: tenant.smsConfig?.shortCode || '',
  smsSupportPhone: tenant.smsConfig?.customerSupportPhoneNumber || '',
  smsChildId: tenant.smsConfig?.childId || '',
  smsApiKey: '',
  mpesaShortCode: tenant.mpesaConfig?.shortCode || '',
  mpesaName: tenant.mpesaConfig?.name || '',
  mpesaApiKey: '',
  mpesaPassKey: '',
  mpesaSecretKey: '',
});

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
  const [editDraft, setEditDraft] = useState<TenantEditDraft | null>(null);
  const [billingInvoices, setBillingInvoices] = useState<PlatformInvoice[]>([]);
  const [tenantPayments, setTenantPayments] = useState<PlatformPayment[]>([]);
  const [tenantReceipts, setTenantReceipts] = useState<PlatformReceipt[]>([]);
  const [tenantStats, setTenantStats] = useState<TenantCustomerStats | null>(null);
  const [statusDraft, setStatusDraft] = useState<TenantStatus>('ACTIVE');
  const [platformSmsSender, setPlatformSmsSender] = useState<PlatformSmsSenderProfile | null>(null);
  const [smsRecipientsDraft, setSmsRecipientsDraft] = useState('');
  const [smsMessageDraft, setSmsMessageDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmationDraft, setDeleteConfirmationDraft] = useState('');
  const [deletingTenant, setDeletingTenant] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeError, setFinanceError] = useState<string | null>(null);
  const [financeRefreshKey, setFinanceRefreshKey] = useState(0);

  // Detail modals
  const [invoiceDetailTarget, setInvoiceDetailTarget] = useState<PlatformInvoice | null>(null);
  const [paymentDetailTarget, setPaymentDetailTarget] = useState<PlatformPayment | null>(null);
  const [receiptDetailTarget, setReceiptDetailTarget] = useState<PlatformReceipt | null>(null);

  // Invoice detail — adjust
  const [adjustAmountDraft, setAdjustAmountDraft] = useState('');
  const [adjustPeriodDraft, setAdjustPeriodDraft] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // Invoice detail — cancel
  const [cancelConfirming, setCancelConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Send Bill modal
  const [sendBillOpen, setSendBillOpen] = useState(false);
  const [sendBillRecipientDraft, setSendBillRecipientDraft] = useState('');
  const [sendBillMessageDraft, setSendBillMessageDraft] = useState('');
  const [sendingBill, setSendingBill] = useState(false);

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
        const [tenantResponse, invoicesResponse, senderResponse, statsResponse] = await Promise.all([
          api.get<{ tenant: TenantDetailType }>(`/tenants/${id}`),
          api.get<{ invoices: PlatformInvoice[] }>(`/billing/invoices`, {
            params: {
              tenantId: id,
              limit: 25,
            },
          }),
          api.get<{ sender: PlatformSmsSenderProfile }>('/support/sms-sender'),
          api.get<{ stats: TenantCustomerStats }>(`/tenants/${id}/stats`),
        ]);

        if (cancelled) {
          return;
        }

        setTenant(tenantResponse.data.tenant);
        setEditDraft(buildTenantEditDraft(tenantResponse.data.tenant));
        setStatusDraft(tenantResponse.data.tenant.status);
        setBillingInvoices(invoicesResponse.data.invoices);
        setPlatformSmsSender(senderResponse.data.sender);
        setTenantStats(statsResponse.data.stats);
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

  useEffect(() => {
    if (!tenant?.id) {
      setTenantPayments([]);
      setTenantReceipts([]);
      return;
    }

    let cancelled = false;

    const loadFinancials = async () => {
      setFinanceLoading(true);
      setFinanceError(null);

      try {
        const [paymentsResponse, receiptsResponse] = await Promise.all([
          api.get<{ payments: PlatformPayment[] }>('/billing/payments', {
            params: {
              page: 1,
              limit: 3,
              tenantId: tenant.id,
            },
          }),
          api.get<{ receipts: PlatformReceipt[] }>('/receipts/tenant', {
            params: {
              tenantId: tenant.id,
              limit: 3,
            },
          }),
        ]);

        if (cancelled) {
          return;
        }

        setTenantPayments(paymentsResponse.data.payments);
        setTenantReceipts(receiptsResponse.data.receipts);
      } catch (err: any) {
        if (!cancelled) {
          setFinanceError(err?.response?.data?.message ?? 'Failed to load financial data');
        }
      } finally {
        if (!cancelled) {
          setFinanceLoading(false);
        }
      }
    };

    loadFinancials();

    return () => {
      cancelled = true;
    };
  }, [tenant?.id, financeRefreshKey]);

  const refreshTenantWorkspace = async (tenantId: number): Promise<void> => {
    const [tenantResponse, invoicesResponse, statsResponse] = await Promise.all([
      api.get<{ tenant: TenantDetailType }>(`/tenants/${tenantId}`),
      api.get<{ invoices: PlatformInvoice[] }>(`/billing/invoices`, {
        params: {
          tenantId,
          limit: 25,
        },
      }),
      api.get<{ stats: TenantCustomerStats }>(`/tenants/${tenantId}/stats`),
    ]);

    setTenant(tenantResponse.data.tenant);
    setEditDraft(buildTenantEditDraft(tenantResponse.data.tenant));
    setStatusDraft(tenantResponse.data.tenant.status);
    setBillingInvoices(invoicesResponse.data.invoices);
    setTenantStats(statsResponse.data.stats);
    setSmsRecipientsDraft((current) =>
      current ||
      tenantResponse.data.tenant.phoneNumber ||
      tenantResponse.data.tenant.alternativePhoneNumber ||
      ''
    );
    setFinanceRefreshKey((key) => key + 1);
  };

  const openInvoiceDetail = (invoice: PlatformInvoice) => {
    setInvoiceDetailTarget(invoice);
    setAdjustAmountDraft(toAmountInput(invoice.invoiceAmount));
    setAdjustPeriodDraft(invoice.invoicePeriod);
    setAdjusting(false);
    setCancelConfirming(false);
    setCancelling(false);
  };

  const adjustInvoice = async () => {
    if (!invoiceDetailTarget) return;

    const invoiceAmount = Number.parseFloat(adjustAmountDraft);
    if (!Number.isFinite(invoiceAmount) || invoiceAmount <= 0) {
      setError('Enter a valid invoice amount greater than zero.');
      return;
    }
    if (!adjustPeriodDraft) {
      setError('Choose the invoice month before adjusting.');
      return;
    }

    setAdjusting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.patch<{ invoice: PlatformInvoice }>(
        `/billing/invoices/${invoiceDetailTarget.id}`,
        { invoiceAmount, invoicePeriod: adjustPeriodDraft }
      );
      await refreshTenantWorkspace(tenant!.id);
      setSuccess(`Adjusted invoice ${response.data.invoice.invoiceNumber}.`);
      setInvoiceDetailTarget(null);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to adjust invoice');
    } finally {
      setAdjusting(false);
    }
  };

  const cancelInvoice = async () => {
    if (!invoiceDetailTarget) return;

    setCancelling(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post<{ invoice: PlatformInvoice; message?: string }>(
        `/billing/invoices/${invoiceDetailTarget.id}/cancel`
      );
      await refreshTenantWorkspace(tenant!.id);
      setSuccess(response.data.message ?? `Cancelled invoice ${invoiceDetailTarget.invoiceNumber}.`);
      setInvoiceDetailTarget(null);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to cancel invoice');
    } finally {
      setCancelling(false);
      setCancelConfirming(false);
    }
  };

  const statusDirty = tenant ? tenant.status !== statusDraft : false;
  const deleteConfirmationMatches = tenant
    ? deleteConfirmationDraft.trim().toLowerCase() === tenant.name.trim().toLowerCase()
    : false;

  const addressLine = useMemo(() => {
    if (!tenant) {
      return '';
    }

    return [tenant.building, tenant.street, tenant.address, tenant.town, tenant.county]
      .filter(Boolean)
      .join(', ');
  }, [tenant]);

  const smsConfigStatus = tenant?.smsConfig?.shortCode ? 'Configured' : 'Missing';
  const mpesaConfigStatus = tenant?.mpesaConfig?.shortCode ? 'Configured' : 'Missing';

  const openInvoices = useMemo(
    () => billingInvoices.filter((invoice) => invoice.status === 'UNPAID' || invoice.status === 'PPAID'),
    [billingInvoices]
  );

  const outstandingBalance = useMemo(
    () => openInvoices.reduce((sum, invoice) => sum + invoice.balance, 0),
    [openInvoices]
  );

  const invoicePreview = useMemo(() => billingInvoices.slice(0, 3), [billingInvoices]);

  const openSendBill = () => {
    if (!tenant || openInvoices.length === 0) return;
    const recipient = tenant.phoneNumber || tenant.alternativePhoneNumber || '';
    const invoice = openInvoices[0];
    const paybill = platformSmsSender?.shortCode ?? '4091081';
    const message = `Dear ${tenant.name}, your platform bill for ${formatDate(invoice.invoicePeriod)} is ${currencyFormatter.format(invoice.balance)} (outstanding). Kindly pay via Paybill ${paybill}, Acc: ${recipient}. Thank you.`;
    setSendBillRecipientDraft(recipient);
    setSendBillMessageDraft(message);
    setSendBillOpen(true);
  };

  const sendBillSms = async () => {
    if (!tenant) return;

    if (!sendBillRecipientDraft.trim()) {
      setError('Enter a recipient phone number before sending.');
      return;
    }

    setSendingBill(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post<{ message: string }>('/support/send-sms', {
        tenantId: tenant.id,
        recipients: sendBillRecipientDraft,
        message: sendBillMessageDraft,
      });
      setSendBillOpen(false);
      setSuccess(`Bill sent to ${tenant.name}.`);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to send bill SMS');
    } finally {
      setSendingBill(false);
    }
  };

  const paymentPreview = useMemo(() => tenantPayments.slice(0, 3), [tenantPayments]);
  const receiptPreview = useMemo(() => tenantReceipts.slice(0, 3), [tenantReceipts]);

  const smsRecipientCount = useMemo(
    () =>
      smsRecipientsDraft
        .split(/[\n,;]+/)
        .map((value) => value.trim())
        .filter(Boolean).length,
    [smsRecipientsDraft]
  );

  const updateEditDraft = (field: keyof TenantEditDraft, value: string) => {
    setEditDraft((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current
    );
  };

  const saveTenantDetails = async () => {
    if (!tenant || !editDraft) {
      return;
    }

    if (!editDraft.name.trim()) {
      setError('Tenant name is required.');
      return;
    }

    if (!editDraft.subscriptionPlan.trim()) {
      setError('Subscription plan label is required.');
      return;
    }

    const monthlyCharge = Number.parseFloat(editDraft.monthlyCharge);
    const allowedUsers = Number.parseInt(editDraft.allowedUsers, 10);
    const numberOfBags =
      editDraft.numberOfBags.trim() === '' ? undefined : Number.parseInt(editDraft.numberOfBags, 10);

    if (!Number.isFinite(monthlyCharge) || monthlyCharge <= 0) {
      setError('Monthly charge must be greater than zero.');
      return;
    }

    if (!Number.isInteger(allowedUsers) || allowedUsers < 1) {
      setError('Allowed users must be at least 1.');
      return;
    }

    if (
      editDraft.numberOfBags.trim() !== '' &&
      (numberOfBags === undefined || !Number.isInteger(numberOfBags) || numberOfBags < 0)
    ) {
      setError('Number of bags must be zero or greater.');
      return;
    }

    setDetailsSaving(true);
    setError(null);
    setSuccess(null);

    const mpesaShortCode = editDraft.mpesaShortCode.trim();
    const mpesaName = editDraft.mpesaName.trim();

    if ((mpesaShortCode && !mpesaName) || (!mpesaShortCode && mpesaName)) {
      setError('M-Pesa short code and display name are both required to create or update the config.');
      setDetailsSaving(false);
      return;
    }

    const mpesaPayload =
      mpesaShortCode && mpesaName
        ? {
            shortCode: mpesaShortCode,
            name: mpesaName,
            apiKey: toNullable(editDraft.mpesaApiKey ?? ''),
            passKey: toNullable(editDraft.mpesaPassKey ?? ''),
            secretKey: toNullable(editDraft.mpesaSecretKey ?? ''),
          }
        : null;

    try {
      await api.patch(`/tenants/${tenant.id}`, {
        name: editDraft.name.trim(),
      subscriptionPlan: editDraft.subscriptionPlan.trim(),
      monthlyCharge,
      email: editDraft.email.trim() || null,
        phoneNumber: editDraft.phoneNumber.trim() || null,
        alternativePhoneNumber: editDraft.alternativePhoneNumber.trim() || null,
        county: editDraft.county.trim() || null,
        town: editDraft.town.trim() || null,
        address: editDraft.address.trim() || null,
        building: editDraft.building.trim() || null,
        street: editDraft.street.trim() || null,
        website: editDraft.website.trim() || null,
        paymentDetails: editDraft.paymentDetails.trim() || null,
        allowedUsers,
        numberOfBags: editDraft.numberOfBags.trim() === '' ? null : numberOfBags ?? null,
        smsConfig: {
          partnerId: editDraft.smsPartnerId,
          shortCode: editDraft.smsShortCode,
          customerSupportPhoneNumber: editDraft.smsSupportPhone,
          childId: editDraft.smsChildId,
          apiKey: editDraft.smsApiKey,
        },
        ...(mpesaPayload ? { mpesaConfig: mpesaPayload } : {}),
      });

      await refreshTenantWorkspace(tenant.id);
      setSuccess(`Updated ${editDraft.name.trim()}.`);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to update tenant');
    } finally {
      setDetailsSaving(false);
    }
  };

  const deleteTenant = async () => {
    if (!tenant || !deleteConfirmationMatches) {
      setError(`Type "${tenant?.name ?? 'the tenant name'}" to confirm deletion.`);
      return;
    }

    setDeletingTenant(true);
    setError(null);
    setSuccess(null);

    try {
      const tenantName = tenant.name;
      await api.delete(`/tenants/${tenant.id}`);
      navigate('/tenants', {
        replace: true,
        state: {
          deletedTenantName: tenantName,
        },
      });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to delete tenant');
    } finally {
      setDeletingTenant(false);
      setDeleteDialogOpen(false);
      setDeleteConfirmationDraft('');
    }
  };

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
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
            <Button
              variant={editMode ? 'outlined' : 'contained'}
              onClick={() => {
                setEditMode((current) => !current);
                setSuccess(null);
                setError(null);
              }}
            >
              {editMode ? 'Close editor' : 'Edit tenant'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<ArrowBackRoundedIcon />}
              onClick={() => navigate('/tenants')}
            >
              Back
            </Button>
            <Button color="error" variant="outlined" onClick={() => setDeleteDialogOpen(true)}>
              Delete Tenant
            </Button>
            <Button variant="contained" onClick={saveStatus} disabled={!statusDirty || saving}>
              {saving ? 'Saving...' : 'Save Status'}
            </Button>
          </Stack>
        }
        eyebrow="Tenant Workspace"
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

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            {editMode ? (
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="overline" color="primary">
                    Tenant Settings
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Update the tenant profile, software billing settings, and the SMS or M-Pesa config
                    used by the tenant app. Secret keys are optional here and only overwrite existing
                    values when you enter new ones.
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Tenant Name"
                      value={editDraft?.name ?? ''}
                      onChange={(event) => updateEditDraft('name', event.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Subscription Plan"
                      value={editDraft?.subscriptionPlan ?? ''}
                      onChange={(event) => updateEditDraft('subscriptionPlan', event.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Monthly Charge"
                      type="number"
                      inputProps={{ min: 1, step: '0.01' }}
                      value={editDraft?.monthlyCharge ?? ''}
                      onChange={(event) => updateEditDraft('monthlyCharge', event.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Email"
                      value={editDraft?.email ?? ''}
                      onChange={(event) => updateEditDraft('email', event.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      value={editDraft?.phoneNumber ?? ''}
                      onChange={(event) => updateEditDraft('phoneNumber', event.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Alternative Phone"
                      value={editDraft?.alternativePhoneNumber ?? ''}
                      onChange={(event) => updateEditDraft('alternativePhoneNumber', event.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="County"
                      value={editDraft?.county ?? ''}
                      onChange={(event) => updateEditDraft('county', event.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Town"
                      value={editDraft?.town ?? ''}
                      onChange={(event) => updateEditDraft('town', event.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Allowed Users"
                      type="number"
                      inputProps={{ min: 1, step: 1 }}
                      value={editDraft?.allowedUsers ?? ''}
                      onChange={(event) => updateEditDraft('allowedUsers', event.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Address"
                      value={editDraft?.address ?? ''}
                      onChange={(event) => updateEditDraft('address', event.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Building"
                      value={editDraft?.building ?? ''}
                      onChange={(event) => updateEditDraft('building', event.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Street"
                      value={editDraft?.street ?? ''}
                      onChange={(event) => updateEditDraft('street', event.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Website"
                      value={editDraft?.website ?? ''}
                      onChange={(event) => updateEditDraft('website', event.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Number Of Bags"
                      type="number"
                      inputProps={{ min: 0, step: 1 }}
                      value={editDraft?.numberOfBags ?? ''}
                      onChange={(event) => updateEditDraft('numberOfBags', event.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Payment Details"
                      value={editDraft?.paymentDetails ?? ''}
                      onChange={(event) => updateEditDraft('paymentDetails', event.target.value)}
                    />
                  </Grid>
                </Grid>

                <Divider />

                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="SMS Partner ID"
                      value={editDraft?.smsPartnerId ?? ''}
                      onChange={(event) => updateEditDraft('smsPartnerId', event.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="SMS Shortcode"
                      value={editDraft?.smsShortCode ?? ''}
                      onChange={(event) => updateEditDraft('smsShortCode', event.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="SMS Support Phone"
                      value={editDraft?.smsSupportPhone ?? ''}
                      onChange={(event) => updateEditDraft('smsSupportPhone', event.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="SMS Child ID"
                      value={editDraft?.smsChildId ?? ''}
                      onChange={(event) => updateEditDraft('smsChildId', event.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="New SMS API Key"
                      type="password"
                      value={editDraft?.smsApiKey ?? ''}
                      onChange={(event) => updateEditDraft('smsApiKey', event.target.value)}
                      helperText="Leave blank to keep the current SMS API key"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="M-Pesa Shortcode"
                      value={editDraft?.mpesaShortCode ?? ''}
                      onChange={(event) => updateEditDraft('mpesaShortCode', event.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="M-Pesa Name"
                      value={editDraft?.mpesaName ?? ''}
                      onChange={(event) => updateEditDraft('mpesaName', event.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="New M-Pesa API Key"
                      type="password"
                      value={editDraft?.mpesaApiKey ?? ''}
                      onChange={(event) => updateEditDraft('mpesaApiKey', event.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="New M-Pesa Pass Key"
                      type="password"
                      value={editDraft?.mpesaPassKey ?? ''}
                      onChange={(event) => updateEditDraft('mpesaPassKey', event.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="New M-Pesa Secret Key"
                      type="password"
                      value={editDraft?.mpesaSecretKey ?? ''}
                      onChange={(event) => updateEditDraft('mpesaSecretKey', event.target.value)}
                    />
                  </Grid>
                </Grid>

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  justifyContent="space-between"
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Tenant software bills are created monthly. Unpaid platform bills trigger daily alerts
                    and the tenant is expired automatically on the 10th until payment clears.
                  </Typography>
                  <Button variant="contained" onClick={saveTenantDetails} disabled={detailsSaving}>
                    {detailsSaving ? 'Saving tenant...' : 'Save tenant details'}
                  </Button>
                </Stack>
              </Stack>
            ) : (
              <Stack spacing={2}>
                <Box>
                  <Typography variant="overline" color="primary">
                    Tenant Settings
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tenant profile, billing posture, and integrations are managed here. Toggle edit mode when
                    you want to change the tenant record or visit the integrations hub for SMS/M-Pesa credentials.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={`SMS: ${smsConfigStatus}`}
                    color={smsConfigStatus === 'Configured' ? 'success' : 'warning'}
                    variant="outlined"
                  />
                  <Chip
                    label={`M-Pesa: ${mpesaConfigStatus}`}
                    color={mpesaConfigStatus === 'Configured' ? 'success' : 'warning'}
                    variant="outlined"
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Monthly charge {currencyFormatter.format(tenant.monthlyCharge)} and unpaid balances expedite
                  expiration after the 10th.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap">
                  <Button variant="contained" onClick={() => setEditMode(true)}>
                    Edit tenant
                  </Button>
                  <Button variant="outlined" onClick={() => navigate('/integrations')}>
                    Open integrations hub
                  </Button>
                </Stack>
              </Stack>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Stack spacing={1.5}>
              <Typography variant="overline" color="primary">
                Recent Invoices
              </Typography>
              {billingLoading && !invoicePreview.length ? (
                <Typography color="text.secondary">Loading invoices...</Typography>
              ) : invoicePreview.length ? (
                <Stack spacing={1}>
                  {invoicePreview.map((invoice) => (
                    <Paper
                      variant="outlined"
                      key={invoice.id}
                      sx={{ p: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                      onClick={() => openInvoiceDetail(invoice)}
                    >
                      <Stack spacing={0.5}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography fontWeight={700}>{invoice.invoiceNumber}</Typography>
                          <StatusChip status={invoice.status} />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {currencyFormatter.format(invoice.invoiceAmount)} · Balance{' '}
                          {currencyFormatter.format(invoice.balance)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Due {formatDate(invoice.invoicePeriod)}
                        </Typography>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography color="text.secondary">No recent platform invoices.</Typography>
              )}
              <Button variant="outlined" size="small" onClick={() => navigate('/billing')}>
                View billing
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Stack spacing={1.5}>
              <Typography variant="overline" color="primary">
                Last Payments
              </Typography>
              {financeError ? (
                <Typography color="error">{financeError}</Typography>
              ) : financeLoading && !paymentPreview.length ? (
                <Typography color="text.secondary">Loading payments...</Typography>
              ) : paymentPreview.length ? (
                <Stack spacing={1}>
                  {paymentPreview.map((payment) => (
                    <Paper
                      variant="outlined"
                      key={payment.id}
                      sx={{ p: 1.25, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                      onClick={() => setPaymentDetailTarget(payment)}
                    >
                      <Stack spacing={0.5}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography fontWeight={700}>
                            {currencyFormatter.format(payment.amount)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {payment.modeOfPayment}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {payment.transactionId || 'Manual payment'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDateTime(payment.createdAt)}
                        </Typography>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography color="text.secondary">No payments recorded yet.</Typography>
              )}
              <Button variant="outlined" size="small" onClick={() => navigate('/billing')}>
                View payments
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Stack spacing={1.5}>
              <Typography variant="overline" color="primary">
                Receipts
              </Typography>
              {financeError ? (
                <Typography color="error">{financeError}</Typography>
              ) : financeLoading && !receiptPreview.length ? (
                <Typography color="text.secondary">Loading receipts...</Typography>
              ) : receiptPreview.length ? (
                <Stack spacing={1}>
                  {receiptPreview.map((receipt) => (
                    <Paper
                      key={receipt.id}
                      variant="outlined"
                      sx={{ p: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                      onClick={() => setReceiptDetailTarget(receipt)}
                    >
                      <Stack spacing={0.5}>
                        <Typography fontWeight={700}>{receipt.receiptNumber}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {currencyFormatter.format(receipt.amount)} · {receipt.modeOfPayment}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(receipt.billingPeriod)} ·{' '}
                          {receipt.smsSentAt ? 'SMS sent' : 'SMS pending'}
                        </Typography>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography color="text.secondary">No receipts available.</Typography>
              )}
              <Button variant="outlined" size="small" onClick={() => navigate('/billing')}>
                View receipts
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Stack spacing={2}>
              <Typography variant="overline" color="primary">
                Customer Stats
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <DetailMetric
                    label="Total Customers"
                    value={tenantStats ? String(tenantStats.customersTotal) : '...'}
                  />
                </Grid>
                <Grid item xs={6}>
                  <DetailMetric
                    label="Active Customers"
                    value={tenantStats ? String(tenantStats.customersActive) : '...'}
                  />
                </Grid>
                <Grid item xs={6}>
                  <DetailMetric
                    label="Total Invoiced"
                    value={tenantStats ? currencyFormatter.format(tenantStats.totalInvoiced) : '...'}
                  />
                </Grid>
                <Grid item xs={6}>
                  <DetailMetric
                    label="Total Collected"
                    value={tenantStats ? currencyFormatter.format(tenantStats.totalCollected) : '...'}
                  />
                </Grid>
              </Grid>
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
                {currencyFormatter.format(tenant.monthlyCharge)} monthly
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
                Send Bill via SMS
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Send the tenant's outstanding bill to their phone number. The message is pre-filled
                from the latest unpaid invoice and can be edited before sending.
              </Typography>
              <Box>
                {openInvoices.length > 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Latest unpaid: <strong>{openInvoices[0].invoiceNumber}</strong> ·{' '}
                    {currencyFormatter.format(openInvoices[0].balance)}
                  </Typography>
                ) : null}
                <Typography variant="body2" color="text.secondary">
                  Recipient: {tenant.phoneNumber || tenant.alternativePhoneNumber || 'No phone on file'}
                </Typography>
              </Box>
              <Box>
                <Button
                  variant="contained"
                  onClick={openSendBill}
                  disabled={openInvoices.length === 0 || (!tenant.phoneNumber && !tenant.alternativePhoneNumber)}
                >
                  Send Bill SMS
                </Button>
                {openInvoices.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    No outstanding invoices
                  </Typography>
                ) : !tenant.phoneNumber && !tenant.alternativePhoneNumber ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    No phone number on file
                  </Typography>
                ) : null}
              </Box>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'center' }}
              >
                <Box>
                  <Typography variant="overline" color="primary">
                    Tenant Communication
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Super-admin SMS uses the platform sender profile linked to tenant{' '}
                    {platformSmsSender?.tenantId ?? 2}
                    {platformSmsSender ? ` (${platformSmsSender.tenantName})` : ''} with partner ID{' '}
                    {platformSmsSender?.partnerId ?? '4680'}.
                  </Typography>
                </Box>
                <Button variant="outlined" onClick={impersonate} disabled={impersonating}>
                  {impersonating ? 'Opening tenant app...' : 'Impersonate tenant'}
                </Button>
              </Stack>
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
      </Grid>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deletingTenant && setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Tenant</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              This permanently deletes the tenant workspace, users, customer records, billing history,
              notifications, receipts, and payments linked to <strong>{tenant.name}</strong>.
            </Typography>
            <TextField
              autoFocus
              fullWidth
              label={`Type "${tenant.name}" to confirm`}
              value={deleteConfirmationDraft}
              onChange={(event) => setDeleteConfirmationDraft(event.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deletingTenant}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={deleteTenant}
            disabled={!deleteConfirmationMatches || deletingTenant}
          >
            {deletingTenant ? 'Deleting tenant...' : 'Delete tenant'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(invoiceDetailTarget)}
        onClose={() => {
          if (!adjusting && !cancelling) {
            setInvoiceDetailTarget(null);
            setCancelConfirming(false);
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Invoice {invoiceDetailTarget?.invoiceNumber}</DialogTitle>
        <DialogContent>
          {invoiceDetailTarget ? (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <DetailMetric label="Invoice Number" value={invoiceDetailTarget.invoiceNumber} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Status
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <StatusChip status={invoiceDetailTarget.status} />
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailMetric
                    label="Billing Period"
                    value={formatDate(invoiceDetailTarget.invoicePeriod)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailMetric
                    label="Invoice Amount"
                    value={currencyFormatter.format(invoiceDetailTarget.invoiceAmount)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailMetric
                    label="Outstanding Balance"
                    value={currencyFormatter.format(invoiceDetailTarget.balance)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailMetric
                    label="Amount Paid"
                    value={currencyFormatter.format(invoiceDetailTarget.amountPaid)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailMetric label="Plan" value={invoiceDetailTarget.plan.name} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailMetric
                    label="Payments Recorded"
                    value={String(invoiceDetailTarget.paymentCount)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailMetric
                    label="Latest Payment"
                    value={
                      invoiceDetailTarget.latestPaymentAt
                        ? formatDateTime(invoiceDetailTarget.latestPaymentAt)
                        : '-'
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailMetric label="Created" value={formatDateTime(invoiceDetailTarget.createdAt)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailMetric
                    label="Last Updated"
                    value={formatDateTime(invoiceDetailTarget.updatedAt)}
                  />
                </Grid>
              </Grid>

              {(invoiceDetailTarget.status === 'UNPAID' || invoiceDetailTarget.status === 'PPAID') ? (
                <>
                  <Divider />
                  <Stack spacing={1.5}>
                    <Typography variant="overline" color="primary">
                      Adjust Invoice
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Invoice Amount"
                          type="number"
                          inputProps={{ min: 1, step: '0.01' }}
                          value={adjustAmountDraft}
                          onChange={(event) => setAdjustAmountDraft(event.target.value)}
                          disabled={adjusting || cancelling}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Invoice Month"
                          type="month"
                          value={adjustPeriodDraft}
                          onChange={(event) => setAdjustPeriodDraft(event.target.value)}
                          InputLabelProps={{ shrink: true }}
                          disabled={adjusting || cancelling}
                        />
                      </Grid>
                    </Grid>
                    <Button
                      variant="contained"
                      onClick={adjustInvoice}
                      disabled={adjusting || cancelling}
                    >
                      {adjusting ? 'Adjusting...' : 'Adjust Invoice'}
                    </Button>
                  </Stack>

                  <Divider />
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    {cancelConfirming ? (
                      <>
                        <Button
                          color="warning"
                          variant="outlined"
                          onClick={cancelInvoice}
                          disabled={adjusting || cancelling}
                        >
                          {cancelling ? 'Cancelling...' : 'Confirm cancel?'}
                        </Button>
                        <Button
                          variant="text"
                          onClick={() => setCancelConfirming(false)}
                          disabled={adjusting || cancelling}
                        >
                          No, go back
                        </Button>
                      </>
                    ) : (
                      <Button
                        color="warning"
                        variant="outlined"
                        onClick={() => setCancelConfirming(true)}
                        disabled={adjusting || cancelling}
                      >
                        Cancel Invoice
                      </Button>
                    )}
                  </Stack>
                </>
              ) : null}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setInvoiceDetailTarget(null);
              setCancelConfirming(false);
            }}
            disabled={adjusting || cancelling}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(paymentDetailTarget)}
        onClose={() => setPaymentDetailTarget(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Payment Detail</DialogTitle>
        <DialogContent>
          {paymentDetailTarget ? (
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid item xs={12} sm={6}>
                <DetailMetric
                  label="Amount"
                  value={currencyFormatter.format(paymentDetailTarget.amount)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailMetric label="Mode" value={paymentDetailTarget.modeOfPayment} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailMetric
                  label="Transaction ID"
                  value={paymentDetailTarget.transactionId ?? 'Manual payment'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailMetric
                  label="Linked Invoices"
                  value={
                    paymentDetailTarget.linkedInvoiceNumbers.length
                      ? paymentDetailTarget.linkedInvoiceNumbers.join(', ')
                      : '-'
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailMetric label="Paid At" value={formatDateTime(paymentDetailTarget.createdAt)} />
              </Grid>
            </Grid>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDetailTarget(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(receiptDetailTarget)}
        onClose={() => setReceiptDetailTarget(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Receipt {receiptDetailTarget?.receiptNumber}</DialogTitle>
        <DialogContent>
          {receiptDetailTarget ? (
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid item xs={12} sm={6}>
                <DetailMetric label="Receipt Number" value={receiptDetailTarget.receiptNumber} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailMetric
                  label="Amount"
                  value={currencyFormatter.format(receiptDetailTarget.amount)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailMetric label="Mode" value={receiptDetailTarget.modeOfPayment} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailMetric
                  label="Transaction ID"
                  value={receiptDetailTarget.transactionId ?? '-'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailMetric
                  label="Billing Period"
                  value={formatDate(receiptDetailTarget.billingPeriod)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailMetric
                  label="SMS Status"
                  value={
                    receiptDetailTarget.smsSentAt
                      ? `Sent ${formatDateTime(receiptDetailTarget.smsSentAt)}`
                      : 'Pending'
                  }
                />
              </Grid>
            </Grid>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReceiptDetailTarget(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={sendBillOpen}
        onClose={() => !sendingBill && setSendBillOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Send Bill via SMS</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Recipient"
              value={sendBillRecipientDraft}
              onChange={(event) => setSendBillRecipientDraft(event.target.value)}
              disabled={sendingBill}
              helperText="Tenant primary contact"
            />
            <TextField
              fullWidth
              multiline
              minRows={4}
              label="Message"
              value={sendBillMessageDraft}
              onChange={(event) => setSendBillMessageDraft(event.target.value)}
              disabled={sendingBill}
              helperText="Pre-filled from the latest unpaid invoice. Edit before sending."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendBillOpen(false)} disabled={sendingBill}>
            Cancel
          </Button>
          <Button variant="contained" onClick={sendBillSms} disabled={sendingBill}>
            {sendingBill ? 'Sending...' : 'Send Bill SMS'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default TenantDetail;
