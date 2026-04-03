import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
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
  useMediaQuery,
} from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import KpiCard from '../../components/KpiCard';
import StatusChip from '../../components/StatusChip';
import { platformDataGridSx } from '../../components/dataGridStyles';
import { api } from '../../services/api';
import {
  InvoiceStatus,
  ModeOfPayment,
  PaginationMeta,
  PlatformInvoice,
  PlatformPayment,
  PlatformReceipt,
  RevenueSummaryPayload,
  TenantSummary,
} from '../../types';
import { currencyFormatter, formatDate, formatDateTime } from '../../lib/format';

const invoiceStatuses: Array<'ALL' | InvoiceStatus> = ['ALL', 'UNPAID', 'PPAID', 'PAID', 'CANCELLED'];
const paymentModes: ModeOfPayment[] = [
  'MPESA',
  'BANK_TRANSFER',
  'CASH',
  'CREDIT_CARD',
  'DEBIT_CARD',
];

const getCurrentMonthInput = () => new Date().toISOString().slice(0, 7);

const getCurrentDateTimeInput = () => {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 16);
};

const toAmountInput = (value: number) =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  });

const canMutateInvoice = (invoice: PlatformInvoice) =>
  invoice.status === 'UNPAID' && invoice.amountPaid <= 0;

const Billing = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const [summary, setSummary] = useState<RevenueSummaryPayload | null>(null);
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [invoices, setInvoices] = useState<PlatformInvoice[]>([]);
  const [payments, setPayments] = useState<PlatformPayment[]>([]);
  const [receipts, setReceipts] = useState<PlatformReceipt[]>([]);
  const [paymentTenantInvoices, setPaymentTenantInvoices] = useState<PlatformInvoice[]>([]);
  const [invoicePagination, setInvoicePagination] = useState<PaginationMeta | null>(null);
  const [paymentPagination, setPaymentPagination] = useState<PaginationMeta | null>(null);
  const [receiptPagination, setReceiptPagination] = useState<PaginationMeta | null>(null);
  const [invoicePaginationModel, setInvoicePaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [paymentPaginationModel, setPaymentPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [receiptPaginationModel, setReceiptPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [invoiceStatus, setInvoiceStatus] = useState<'ALL' | InvoiceStatus>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [tenantOptionsLoading, setTenantOptionsLoading] = useState(false);
  const [paymentInvoicesLoading, setPaymentInvoicesLoading] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [invoiceEditTarget, setInvoiceEditTarget] = useState<PlatformInvoice | null>(null);
  const [invoiceCancelTarget, setInvoiceCancelTarget] = useState<PlatformInvoice | null>(null);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [savingInvoiceEdit, setSavingInvoiceEdit] = useState(false);
  const [cancellingInvoice, setCancellingInvoice] = useState(false);
  const [selectedInvoiceTenantId, setSelectedInvoiceTenantId] = useState('');
  const [selectedPaymentTenantId, setSelectedPaymentTenantId] = useState('');
  const [selectedPaymentInvoiceId, setSelectedPaymentInvoiceId] = useState('');
  const [invoiceAmountDraft, setInvoiceAmountDraft] = useState('');
  const [invoicePeriodDraft, setInvoicePeriodDraft] = useState(getCurrentMonthInput());
  const [editInvoiceAmountDraft, setEditInvoiceAmountDraft] = useState('');
  const [editInvoicePeriodDraft, setEditInvoicePeriodDraft] = useState(getCurrentMonthInput());
  const [paymentAmountDraft, setPaymentAmountDraft] = useState('');
  const [paymentModeDraft, setPaymentModeDraft] = useState<ModeOfPayment>('MPESA');
  const [paymentReferenceDraft, setPaymentReferenceDraft] = useState('');
  const [paidAtDraft, setPaidAtDraft] = useState(getCurrentDateTimeInput());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadBilling = async () => {
      setLoading(true);
      setError(null);

      try {
        const [summaryResponse, invoicesResponse, paymentsResponse, receiptsResponse] = await Promise.all([
          api.get<RevenueSummaryPayload>('/billing/revenue-summary'),
          api.get<{ invoices: PlatformInvoice[]; pagination: PaginationMeta }>('/billing/invoices', {
            params: {
              page: invoicePaginationModel.page + 1,
              limit: invoicePaginationModel.pageSize,
              status: invoiceStatus === 'ALL' ? undefined : invoiceStatus,
              search: search || undefined,
            },
          }),
          api.get<{ payments: PlatformPayment[]; pagination: PaginationMeta }>('/billing/payments', {
            params: {
              page: paymentPaginationModel.page + 1,
              limit: paymentPaginationModel.pageSize,
              search: search || undefined,
            },
          }),
          api.get<{ receipts: PlatformReceipt[]; pagination: PaginationMeta }>('/receipts/tenant', {
            params: {
              page: receiptPaginationModel.page + 1,
              limit: receiptPaginationModel.pageSize,
            },
          }),
        ]);

        if (cancelled) {
          return;
        }

        setSummary(summaryResponse.data);
        setInvoices(invoicesResponse.data.invoices);
        setPayments(paymentsResponse.data.payments);
        setReceipts(receiptsResponse.data.receipts);
        setInvoicePagination(invoicesResponse.data.pagination);
        setPaymentPagination(paymentsResponse.data.pagination);
        setReceiptPagination(receiptsResponse.data.pagination);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message ?? 'Failed to load billing data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadBilling();

    return () => {
      cancelled = true;
    };
  }, [
    invoicePaginationModel.page,
    invoicePaginationModel.pageSize,
    paymentPaginationModel.page,
    paymentPaginationModel.pageSize,
    receiptPaginationModel.page,
    receiptPaginationModel.pageSize,
    invoiceStatus,
    search,
    refreshKey,
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadTenantOptions = async () => {
      setTenantOptionsLoading(true);

      try {
        const response = await api.get<{ tenants: TenantSummary[] }>('/tenants', {
          params: {
            page: 1,
            limit: 250,
          },
        });

        if (cancelled) {
          return;
        }

        const nextTenants = [...response.data.tenants].sort((left, right) =>
          left.name.localeCompare(right.name)
        );

        setTenants(nextTenants);
        setSelectedInvoiceTenantId((current) => current || String(nextTenants[0]?.id ?? ''));
        setSelectedPaymentTenantId((current) => current || String(nextTenants[0]?.id ?? ''));
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message ?? 'Failed to load tenant options');
        }
      } finally {
        if (!cancelled) {
          setTenantOptionsLoading(false);
        }
      }
    };

    loadTenantOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!paymentDialogOpen || !selectedPaymentTenantId) {
      setPaymentTenantInvoices([]);
      setSelectedPaymentInvoiceId('');
      return;
    }

    const loadPaymentInvoices = async () => {
      setPaymentInvoicesLoading(true);

      try {
        const response = await api.get<{ invoices: PlatformInvoice[] }>('/billing/invoices', {
          params: {
            tenantId: selectedPaymentTenantId,
            limit: 100,
          },
        });

        if (cancelled) {
          return;
        }

        const nextInvoices = response.data.invoices.filter(
          (invoice) => invoice.status === 'UNPAID' || invoice.status === 'PPAID'
        );

        setPaymentTenantInvoices(nextInvoices);
        setSelectedPaymentInvoiceId((current) =>
          current && nextInvoices.some((invoice) => invoice.id === current) ? current : ''
        );
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message ?? 'Failed to load tenant invoices');
        }
      } finally {
        if (!cancelled) {
          setPaymentInvoicesLoading(false);
        }
      }
    };

    loadPaymentInvoices();

    return () => {
      cancelled = true;
    };
  }, [paymentDialogOpen, selectedPaymentTenantId]);

  const selectedInvoiceTenant = useMemo(
    () => tenants.find((tenant) => String(tenant.id) === selectedInvoiceTenantId) ?? null,
    [selectedInvoiceTenantId, tenants]
  );

  const selectedPaymentTenant = useMemo(
    () => tenants.find((tenant) => String(tenant.id) === selectedPaymentTenantId) ?? null,
    [selectedPaymentTenantId, tenants]
  );

  const selectedPaymentInvoice = useMemo(
    () => paymentTenantInvoices.find((invoice) => invoice.id === selectedPaymentInvoiceId) ?? null,
    [selectedPaymentInvoiceId, paymentTenantInvoices]
  );

  const resetInvoiceDialog = () => {
    setInvoiceDialogOpen(false);
    setSelectedInvoiceTenantId((current) => current || String(tenants[0]?.id ?? ''));
    setInvoiceAmountDraft('');
    setInvoicePeriodDraft(getCurrentMonthInput());
  };

  const openInvoiceEditDialog = (invoice: PlatformInvoice) => {
    setInvoiceEditTarget(invoice);
    setEditInvoiceAmountDraft(toAmountInput(invoice.invoiceAmount));
    setEditInvoicePeriodDraft(String(invoice.invoicePeriod).slice(0, 7));
  };

  const resetInvoiceEditDialog = () => {
    setInvoiceEditTarget(null);
    setEditInvoiceAmountDraft('');
    setEditInvoicePeriodDraft(getCurrentMonthInput());
  };

  const resetInvoiceCancelDialog = () => {
    setInvoiceCancelTarget(null);
  };

  const resetPaymentDialog = () => {
    setPaymentDialogOpen(false);
    setSelectedPaymentTenantId((current) => current || String(tenants[0]?.id ?? ''));
    setSelectedPaymentInvoiceId('');
    setPaymentAmountDraft('');
    setPaymentModeDraft('MPESA');
    setPaymentReferenceDraft('');
    setPaidAtDraft(getCurrentDateTimeInput());
  };

  const createManualInvoice = async () => {
    const tenantId = Number.parseInt(selectedInvoiceTenantId, 10);
    const invoiceAmount = Number.parseFloat(invoiceAmountDraft);

    if (!Number.isInteger(tenantId) || tenantId <= 0) {
      setError('Choose a tenant before creating an invoice.');
      return;
    }

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
        tenantId,
        invoiceAmount,
        invoicePeriod: invoicePeriodDraft,
      });

      setRefreshKey((current) => current + 1);
      setSuccess(
        `Created invoice ${response.data.invoice.invoiceNumber} for ${response.data.invoice.tenantName}.`
      );
      resetInvoiceDialog();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create tenant invoice');
    } finally {
      setCreatingInvoice(false);
    }
  };

  const recordManualPayment = async () => {
    const tenantId = Number.parseInt(selectedPaymentTenantId, 10);
    const amount = Number.parseFloat(paymentAmountDraft);

    if (!Number.isInteger(tenantId) || tenantId <= 0) {
      setError('Choose a tenant before recording a payment.');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
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
        tenantId,
        amount,
        modeOfPayment: paymentModeDraft,
        transactionId: paymentReferenceDraft.trim() || undefined,
        preferredInvoiceId: selectedPaymentInvoiceId || undefined,
        paidAt: new Date(paidAtDraft).toISOString(),
      });

      setRefreshKey((current) => current + 1);
      if (response.data.meta?.tenantReactivated) {
        setSuccess(`Payment recorded and ${response.data.payment.tenantName} was reactivated.`);
      } else {
        const linkedInvoices = response.data.payment.linkedInvoiceNumbers.join(', ');
        setSuccess(`Payment recorded for ${response.data.payment.tenantName} against ${linkedInvoices}.`);
      }
      resetPaymentDialog();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to record tenant payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  const adjustInvoice = async () => {
    if (!invoiceEditTarget) {
      return;
    }

    const invoiceAmount = Number.parseFloat(editInvoiceAmountDraft);

    if (!Number.isFinite(invoiceAmount) || invoiceAmount <= 0) {
      setError('Enter a valid invoice amount greater than zero.');
      return;
    }

    if (!editInvoicePeriodDraft) {
      setError('Choose the invoice month before adjusting the invoice.');
      return;
    }

    setSavingInvoiceEdit(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.patch<{ invoice: PlatformInvoice }>(
        `/billing/invoices/${invoiceEditTarget.id}`,
        {
          invoiceAmount,
          invoicePeriod: editInvoicePeriodDraft,
        }
      );

      setRefreshKey((current) => current + 1);
      setSuccess(`Adjusted invoice ${response.data.invoice.invoiceNumber} for ${response.data.invoice.tenantName}.`);
      resetInvoiceEditDialog();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to adjust tenant invoice');
    } finally {
      setSavingInvoiceEdit(false);
    }
  };

  const cancelInvoice = async () => {
    if (!invoiceCancelTarget) {
      return;
    }

    setCancellingInvoice(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post<{ invoice: PlatformInvoice; message?: string }>(
        `/billing/invoices/${invoiceCancelTarget.id}/cancel`
      );

      setRefreshKey((current) => current + 1);
      setSuccess(response.data.message || `Cancelled invoice ${invoiceCancelTarget.invoiceNumber}.`);
      resetInvoiceCancelDialog();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to cancel tenant invoice');
    } finally {
      setCancellingInvoice(false);
    }
  };

  const resendReceiptSms = async (receiptId: string) => {
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post<{ message: string }>(`/receipts/${receiptId}/resend-sms`);
      setSuccess(response.data.message || 'Receipt SMS resent successfully.');
      setRefreshKey((current) => current + 1);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to resend receipt SMS');
    }
  };

  const invoiceColumns = useMemo<GridColDef<PlatformInvoice>[]>(
    () => [
      {
        field: 'tenantName',
        headerName: 'Tenant',
        flex: 1.1,
        minWidth: 210,
        renderCell: (params) => (
          <Box sx={{ py: 1 }}>
            <Typography fontWeight={700}>{params.row.tenantName}</Typography>
            <StatusChip status={params.row.tenantStatus} />
          </Box>
        ),
      },
      {
        field: 'invoiceNumber',
        headerName: 'Invoice',
        minWidth: 150,
      },
      {
        field: 'invoicePeriod',
        headerName: 'Period',
        minWidth: 130,
        valueFormatter: (value) => formatDate(value as string),
      },
      {
        field: 'status',
        headerName: 'Status',
        minWidth: 140,
        renderCell: (params) => <StatusChip status={params.value as string} />,
      },
      {
        field: 'invoiceAmount',
        headerName: 'Invoiced',
        minWidth: 140,
        valueFormatter: (value) => currencyFormatter.format(value as number),
      },
      {
        field: 'amountPaid',
        headerName: 'Paid',
        minWidth: 140,
        valueFormatter: (value) => currencyFormatter.format(value as number),
      },
      {
        field: 'balance',
        headerName: 'Balance',
        minWidth: 140,
        valueFormatter: (value) => currencyFormatter.format(value as number),
      },
      {
        field: 'latestPaymentAt',
        headerName: 'Latest Payment',
        minWidth: 170,
        valueFormatter: (value) => formatDate(value as string | null, 'No payment yet'),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        sortable: false,
        filterable: false,
        minWidth: 280,
        renderCell: (params) => {
          const invoice = params.row;
          const mutable = canMutateInvoice(invoice);

          return (
            <Stack direction={isCompact ? 'column' : 'row'} spacing={1} sx={{ py: 1 }}>
              {mutable ? (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={(event) => {
                    event.stopPropagation();
                    openInvoiceEditDialog(invoice);
                  }}
                >
                  Adjust
                </Button>
              ) : null}
              {mutable ? (
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  onClick={(event) => {
                    event.stopPropagation();
                    setInvoiceCancelTarget(invoice);
                  }}
                >
                  Cancel
                </Button>
              ) : null}
              <Button
                size="small"
                variant="outlined"
                onClick={(event) => {
                  event.stopPropagation();
                  navigate(`/tenants/${invoice.tenantId}`);
                }}
              >
                Open
              </Button>
            </Stack>
          );
        },
      },
    ],
    [isCompact, navigate]
  );

  const paymentColumns = useMemo<GridColDef<PlatformPayment>[]>(
    () => [
      {
        field: 'tenantName',
        headerName: 'Tenant',
        flex: 1.1,
        minWidth: 210,
        renderCell: (params) => (
          <Box sx={{ py: 1 }}>
            <Typography fontWeight={700}>{params.row.tenantName}</Typography>
            <Typography variant="body2" color="text.secondary">
              {params.row.invoiceNumber ?? 'No linked invoice'}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'invoiceStatus',
        headerName: 'Invoice Status',
        minWidth: 160,
        renderCell: (params) =>
          params.row.invoiceStatus ? <StatusChip status={params.row.invoiceStatus} /> : <Typography>-</Typography>,
      },
      {
        field: 'linkedInvoiceNumbers',
        headerName: 'Linked Invoices',
        minWidth: 220,
        sortable: false,
        renderCell: (params) => {
          const labels = params.row.linkedInvoiceNumbers ?? [];
          if (!labels.length) {
            return <Typography variant="body2">No invoice link</Typography>;
          }

          const preview = labels.slice(0, 2).join(', ');
          const suffix = labels.length > 2 ? ` +${labels.length - 2} more` : '';

          return (
            <Typography variant="body2">
              {preview}
              {suffix}
            </Typography>
          );
        },
      },
      {
        field: 'amount',
        headerName: 'Amount',
        minWidth: 140,
        valueFormatter: (value) => currencyFormatter.format(value as number),
      },
      {
        field: 'modeOfPayment',
        headerName: 'Mode',
        minWidth: 150,
      },
      {
        field: 'transactionId',
        headerName: 'Transaction ID',
        minWidth: 180,
        valueFormatter: (value) => (value as string | null) || 'Not provided',
      },
      {
        field: 'createdAt',
        headerName: 'Received',
        minWidth: 180,
        valueFormatter: (value) => formatDateTime(value as string),
      },
      {
        field: 'actions',
        headerName: '',
        sortable: false,
        filterable: false,
        minWidth: 120,
        renderCell: (params) => (
          <Button
            size="small"
            variant="outlined"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/tenants/${params.row.tenantId}`);
            }}
          >
            Open
          </Button>
        ),
      },
    ],
    [navigate]
  );

  const receiptColumns = useMemo<GridColDef<PlatformReceipt>[]>(
    () => [
      {
        field: 'receiptNumber',
        headerName: 'Receipt No',
        minWidth: 180,
      },
      {
        field: 'tenantName',
        headerName: 'Tenant',
        flex: 1,
        minWidth: 220,
        valueFormatter: (value) => (value as string | null) || 'Unknown tenant',
      },
      {
        field: 'amount',
        headerName: 'Amount',
        minWidth: 140,
        valueFormatter: (value) => currencyFormatter.format(value as number),
      },
      {
        field: 'modeOfPayment',
        headerName: 'Mode',
        minWidth: 140,
      },
      {
        field: 'transactionId',
        headerName: 'Transaction ID',
        minWidth: 180,
        valueFormatter: (value) => (value as string | null) || 'Not provided',
      },
      {
        field: 'billingPeriod',
        headerName: 'Billing Period',
        minWidth: 170,
        valueFormatter: (value) => formatDate(value as string),
      },
      {
        field: 'smsSentAt',
        headerName: 'SMS Sent',
        minWidth: 180,
        renderCell: (params) =>
          params.row.smsSentAt ? (
            <Chip size="small" color="success" label={formatDateTime(params.row.smsSentAt)} />
          ) : (
            <Button
              size="small"
              variant="outlined"
              onClick={(event) => {
                event.stopPropagation();
                resendReceiptSms(params.row.id);
              }}
            >
              Resend
            </Button>
          ),
      },
      {
        field: 'createdAt',
        headerName: 'Issued',
        minWidth: 180,
        valueFormatter: (value) => formatDateTime(value as string),
      },
      {
        field: 'actions',
        headerName: '',
        sortable: false,
        filterable: false,
        minWidth: 120,
        renderCell: (params) => (
          <Button
            size="small"
            variant="outlined"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/tenants/${params.row.tenantId}`);
            }}
          >
            Open
          </Button>
        ),
      },
    ],
    [navigate]
  );

  const invoiceColumnVisibilityModel = useMemo(
    () => ({
      amountPaid: !isCompact,
      latestPaymentAt: !isCompact,
    }),
    [isCompact]
  );

  const paymentColumnVisibilityModel = useMemo(
    () => ({
      invoiceStatus: !isCompact,
      linkedInvoiceNumbers: !isCompact,
      transactionId: !isCompact,
      actions: !isCompact,
    }),
    [isCompact]
  );

  const receiptColumnVisibilityModel = useMemo(
    () => ({
      transactionId: !isCompact,
      billingPeriod: !isCompact,
      actions: !isCompact,
    }),
    [isCompact]
  );

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Billing"
        subtitle="Revenue summary, tenant invoices, and payment history across the platform."
        action={
          <Stack spacing={1.5}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="flex-end">
              <Button variant="contained" onClick={() => setInvoiceDialogOpen(true)}>
                Manual Invoice
              </Button>
              <Button variant="outlined" onClick={() => setPaymentDialogOpen(true)}>
                Manual Payment
              </Button>
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              label="Search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setInvoicePaginationModel((current) => ({ ...current, page: 0 }));
                setPaymentPaginationModel((current) => ({ ...current, page: 0 }));
                setReceiptPaginationModel((current) => ({ ...current, page: 0 }));
              }}
              placeholder="Tenant, invoice, transaction"
              sx={{ minWidth: { xs: '100%', md: 220 } }}
            />
            <TextField
              select
              label="Invoice status"
              value={invoiceStatus}
              onChange={(event) => {
                setInvoiceStatus(event.target.value as 'ALL' | InvoiceStatus);
                setInvoicePaginationModel((current) => ({ ...current, page: 0 }));
              }}
              sx={{ minWidth: { xs: '100%', md: 180 } }}
            >
              {invoiceStatuses.map((status) => (
                <MenuItem key={status} value={status}>
                  {status === 'ALL' ? 'All invoices' : status}
                </MenuItem>
              ))}
            </TextField>
            </Stack>
          </Stack>
        }
        eyebrow="Revenue Desk"
      />

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} xl={3}>
          <KpiCard
            label="MRR"
            value={summary ? currencyFormatter.format(summary.summary.mrr) : '...'}
            helper="Current-month invoice amount"
            accent="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <KpiCard
            label="Collections This Month"
            value={summary ? currencyFormatter.format(summary.summary.collectionsThisMonth) : '...'}
            helper="Payments received this month"
            accent="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <KpiCard
            label="Unpaid Invoices"
            value={summary ? summary.summary.unpaidInvoiceCount : '...'}
            helper={summary ? currencyFormatter.format(summary.summary.unpaidInvoiceAmount) : 'Outstanding balance'}
            accent="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <KpiCard
            label="Total Payments"
            value={summary ? currencyFormatter.format(summary.summary.totalPaymentsReceived) : '...'}
            helper={summary ? `${summary.summary.totalPayments} payments recorded` : 'Across all tenants'}
            accent="primary"
          />
        </Grid>
      </Grid>

      {summary ? (
        <Grid container spacing={2}>
          <Grid item xs={12} lg={5}>
            <Paper sx={{ p: { xs: 2.25, md: 3 }, minHeight: '100%' }}>
              <Typography variant="overline" color="primary">
                Invoice Trend
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Monthly invoice generation across recent periods.
              </Typography>
              <BarChart
                height={isCompact ? 240 : 280}
                xAxis={[{ scaleType: 'band', data: summary.revenueByMonth.map((item) => item.label) }]}
                series={[
                  {
                    data: summary.revenueByMonth.map((item) => item.invoiceAmount),
                    label: 'Invoices',
                    color: theme.palette.primary.main,
                  },
                ]}
                margin={{ left: isCompact ? 36 : 56, right: 12, top: 24, bottom: 24 }}
              />
            </Paper>
          </Grid>
          <Grid item xs={12} lg={7}>
            <Paper sx={{ p: { xs: 2.25, md: 3 }, minHeight: '100%' }}>
              <Typography variant="overline" color="primary">
                Collections Comparison
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Invoiced amounts compared with payments received by month.
              </Typography>
              <BarChart
                height={isCompact ? 240 : 280}
                xAxis={[{ scaleType: 'band', data: summary.paymentsVsInvoices.map((item) => item.label) }]}
                series={[
                  {
                    data: summary.paymentsVsInvoices.map((item) => item.invoiceAmount),
                    label: 'Invoices',
                    color: theme.palette.primary.main,
                  },
                  {
                    data: summary.paymentsVsInvoices.map((item) => item.paymentAmount),
                    label: 'Payments',
                    color: theme.palette.secondary.main,
                  },
                ]}
                margin={{ left: isCompact ? 36 : 56, right: 12, top: 24, bottom: 24 }}
              />
            </Paper>
          </Grid>
        </Grid>
      ) : null}

      <Paper sx={{ p: 2.5 }}>
        <Typography variant="overline" color="primary">
          Invoices
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Cross-tenant invoice posture with balance visibility.
        </Typography>
        <Box sx={{ height: 430 }}>
          <DataGrid
            rows={invoices}
            columns={invoiceColumns}
            columnVisibilityModel={invoiceColumnVisibilityModel}
            loading={loading}
            rowCount={invoicePagination?.total ?? 0}
            paginationMode="server"
            paginationModel={invoicePaginationModel}
            onPaginationModelChange={setInvoicePaginationModel}
            pageSizeOptions={[10, 20, 50]}
            disableRowSelectionOnClick
            onRowClick={(params) => navigate(`/tenants/${params.row.tenantId}`)}
            getRowHeight={() => 'auto'}
            sx={platformDataGridSx}
          />
        </Box>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Typography variant="overline" color="primary">
          Payments
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Payment history recorded against tenant invoices.
        </Typography>
        <Box sx={{ height: 430 }}>
          <DataGrid
            rows={payments}
            columns={paymentColumns}
            columnVisibilityModel={paymentColumnVisibilityModel}
            loading={loading}
            rowCount={paymentPagination?.total ?? 0}
            paginationMode="server"
            paginationModel={paymentPaginationModel}
            onPaginationModelChange={setPaymentPaginationModel}
            pageSizeOptions={[10, 20, 50]}
            disableRowSelectionOnClick
            onRowClick={(params) => navigate(`/tenants/${params.row.tenantId}`)}
            getRowHeight={() => 'auto'}
            sx={platformDataGridSx}
          />
        </Box>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Typography variant="overline" color="primary">
          Receipts
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Subscription payment receipts issued to tenants.
        </Typography>
        <Box sx={{ height: 430 }}>
          <DataGrid
            rows={receipts}
            columns={receiptColumns}
            columnVisibilityModel={receiptColumnVisibilityModel}
            loading={loading}
            rowCount={receiptPagination?.total ?? 0}
            paginationMode="server"
            paginationModel={receiptPaginationModel}
            onPaginationModelChange={setReceiptPaginationModel}
            pageSizeOptions={[10, 20, 50]}
            disableRowSelectionOnClick
            onRowClick={(params) => navigate(`/tenants/${params.row.tenantId}`)}
            getRowHeight={() => 'auto'}
            sx={platformDataGridSx}
          />
        </Box>
      </Paper>

      <Dialog open={invoiceDialogOpen} onClose={creatingInvoice ? undefined : resetInvoiceDialog} fullWidth maxWidth="sm">
        <DialogTitle>Manual Invoice</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Create a platform invoice directly from the billing workspace.
            </Typography>
            <FormControl fullWidth>
              <InputLabel id="billing-invoice-tenant-label">Tenant</InputLabel>
              <Select
                labelId="billing-invoice-tenant-label"
                label="Tenant"
                value={selectedInvoiceTenantId}
                onChange={(event) => setSelectedInvoiceTenantId(event.target.value)}
                disabled={tenantOptionsLoading}
              >
                {tenants.map((tenant) => (
                  <MenuItem key={tenant.id} value={String(tenant.id)}>
                    {tenant.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedInvoiceTenant ? (
              <Typography variant="body2" color="text.secondary">
                {selectedInvoiceTenant.plan.name} · {currencyFormatter.format(selectedInvoiceTenant.plan.priceMonthly)} monthly
              </Typography>
            ) : null}
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetInvoiceDialog} disabled={creatingInvoice}>
            Cancel
          </Button>
          <Button onClick={createManualInvoice} variant="contained" disabled={creatingInvoice || tenantOptionsLoading}>
            {creatingInvoice ? 'Creating invoice...' : 'Create invoice'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(invoiceEditTarget)}
        onClose={savingInvoiceEdit ? undefined : resetInvoiceEditDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Adjust Invoice</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Adjust the invoice month or amount. Only unpaid invoices with no recorded payments can be changed.
            </Typography>
            {invoiceEditTarget ? (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={0.75}>
                  <Typography fontWeight={700}>{invoiceEditTarget.invoiceNumber}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {invoiceEditTarget.tenantName} · {currencyFormatter.format(invoiceEditTarget.balance)} outstanding
                  </Typography>
                </Stack>
              </Paper>
            ) : null}
            <TextField
              label="Invoice Amount"
              type="number"
              inputProps={{ min: 1, step: '0.01' }}
              value={editInvoiceAmountDraft}
              onChange={(event) => setEditInvoiceAmountDraft(event.target.value)}
              placeholder="0.00"
            />
            <TextField
              label="Invoice Month"
              type="month"
              value={editInvoicePeriodDraft}
              onChange={(event) => setEditInvoicePeriodDraft(event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetInvoiceEditDialog} disabled={savingInvoiceEdit}>
            Close
          </Button>
          <Button onClick={adjustInvoice} variant="contained" disabled={savingInvoiceEdit}>
            {savingInvoiceEdit ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(invoiceCancelTarget)}
        onClose={cancellingInvoice ? undefined : resetInvoiceCancelDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Cancel Invoice</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              This voids the invoice and removes it from outstanding billing totals. The action is only available before
              any payment is recorded.
            </Typography>
            {invoiceCancelTarget ? (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={0.75}>
                  <Typography fontWeight={700}>{invoiceCancelTarget.invoiceNumber}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {invoiceCancelTarget.tenantName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {currencyFormatter.format(invoiceCancelTarget.invoiceAmount)} · {formatDate(invoiceCancelTarget.invoicePeriod)}
                  </Typography>
                </Stack>
              </Paper>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetInvoiceCancelDialog} disabled={cancellingInvoice}>
            Keep invoice
          </Button>
          <Button onClick={cancelInvoice} color="warning" variant="contained" disabled={cancellingInvoice}>
            {cancellingInvoice ? 'Cancelling...' : 'Confirm cancel'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={paymentDialogOpen} onClose={recordingPayment ? undefined : resetPaymentDialog} fullWidth maxWidth="sm">
        <DialogTitle>Manual Payment</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Record a tenant payment without leaving the billing screen.
            </Typography>
            <FormControl fullWidth>
              <InputLabel id="billing-payment-tenant-label">Tenant</InputLabel>
              <Select
                labelId="billing-payment-tenant-label"
                label="Tenant"
                value={selectedPaymentTenantId}
                onChange={(event) => {
                  setSelectedPaymentTenantId(event.target.value);
                  setSelectedPaymentInvoiceId('');
                  setPaymentAmountDraft('');
                }}
                disabled={tenantOptionsLoading}
              >
                {tenants.map((tenant) => (
                  <MenuItem key={tenant.id} value={String(tenant.id)}>
                    {tenant.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedPaymentTenant ? (
              <Typography variant="body2" color="text.secondary">
                {selectedPaymentTenant.status} tenant · {selectedPaymentTenant.plan.name}
              </Typography>
            ) : null}
            <FormControl fullWidth>
              <InputLabel id="billing-payment-invoice-label">Target Invoice</InputLabel>
              <Select
                labelId="billing-payment-invoice-label"
                label="Target Invoice"
                value={selectedPaymentInvoiceId}
                onChange={(event) => {
                  const nextInvoiceId = event.target.value;
                  setSelectedPaymentInvoiceId(nextInvoiceId);

                  if (!paymentAmountDraft) {
                    const nextInvoice = paymentTenantInvoices.find((invoice) => invoice.id === nextInvoiceId);
                    if (nextInvoice) {
                      setPaymentAmountDraft(toAmountInput(nextInvoice.balance));
                    }
                  }
                }}
                disabled={paymentInvoicesLoading || !selectedPaymentTenantId}
              >
                <MenuItem value="">Auto allocate oldest open invoices</MenuItem>
                {paymentTenantInvoices.map((invoice) => (
                  <MenuItem key={invoice.id} value={invoice.id}>
                    {invoice.invoiceNumber} · {currencyFormatter.format(invoice.balance)} due
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedPaymentInvoice ? (
              <Typography variant="body2" color="text.secondary">
                Selected balance: {currencyFormatter.format(selectedPaymentInvoice.balance)}
              </Typography>
            ) : null}
            {!paymentInvoicesLoading && selectedPaymentTenantId && paymentTenantInvoices.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No open invoices were found for this tenant.
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
              <InputLabel id="billing-payment-mode-label">Mode of Payment</InputLabel>
              <Select
                labelId="billing-payment-mode-label"
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetPaymentDialog} disabled={recordingPayment}>
            Cancel
          </Button>
          <Button
            onClick={recordManualPayment}
            variant="contained"
            disabled={recordingPayment || tenantOptionsLoading || paymentInvoicesLoading}
          >
            {recordingPayment ? 'Recording payment...' : 'Record payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default Billing;
