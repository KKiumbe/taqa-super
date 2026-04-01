import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import KpiCard from '../../components/KpiCard';
import StatusChip from '../../components/StatusChip';
import { api } from '../../services/api';
import {
  BillingRecordSource,
  InvoiceStatus,
  PaginationMeta,
  PlatformInvoice,
  PlatformPayment,
  RevenueSummaryPayload,
} from '../../types';
import { currencyFormatter, formatDate, formatDateTime } from '../../lib/format';

const invoiceStatuses: Array<'ALL' | InvoiceStatus> = ['ALL', 'UNPAID', 'PPAID', 'PAID', 'CANCELLED'];
const billingSources: Array<'ALL' | BillingRecordSource> = ['ALL', 'PLATFORM', 'LEGACY_CUSTOMER'];
const sourceLabel: Record<BillingRecordSource, string> = {
  PLATFORM: 'Platform',
  LEGACY_CUSTOMER: 'Migrated',
};

const Billing = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [summary, setSummary] = useState<RevenueSummaryPayload | null>(null);
  const [invoices, setInvoices] = useState<PlatformInvoice[]>([]);
  const [payments, setPayments] = useState<PlatformPayment[]>([]);
  const [invoicePagination, setInvoicePagination] = useState<PaginationMeta | null>(null);
  const [paymentPagination, setPaymentPagination] = useState<PaginationMeta | null>(null);
  const [invoicePaginationModel, setInvoicePaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [paymentPaginationModel, setPaymentPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [invoiceStatus, setInvoiceStatus] = useState<'ALL' | InvoiceStatus>('ALL');
  const [billingSource, setBillingSource] = useState<'ALL' | BillingRecordSource>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadBilling = async () => {
      setLoading(true);
      setError(null);

      try {
        const [summaryResponse, invoicesResponse, paymentsResponse] = await Promise.all([
          api.get<RevenueSummaryPayload>('/billing/revenue-summary'),
          api.get<{ invoices: PlatformInvoice[]; pagination: PaginationMeta }>('/billing/invoices', {
            params: {
              page: invoicePaginationModel.page + 1,
              limit: invoicePaginationModel.pageSize,
              status: invoiceStatus === 'ALL' ? undefined : invoiceStatus,
              source: billingSource === 'ALL' ? undefined : billingSource,
              search: search || undefined,
            },
          }),
          api.get<{ payments: PlatformPayment[]; pagination: PaginationMeta }>('/billing/payments', {
            params: {
              page: paymentPaginationModel.page + 1,
              limit: paymentPaginationModel.pageSize,
              source: billingSource === 'ALL' ? undefined : billingSource,
              search: search || undefined,
            },
          }),
        ]);

        if (cancelled) {
          return;
        }

        setSummary(summaryResponse.data);
        setInvoices(invoicesResponse.data.invoices);
        setPayments(paymentsResponse.data.payments);
        setInvoicePagination(invoicesResponse.data.pagination);
        setPaymentPagination(paymentsResponse.data.pagination);
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
    invoiceStatus,
    billingSource,
    search,
  ]);

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
        field: 'source',
        headerName: 'Source',
        minWidth: 130,
        renderCell: (params) => (
          <Chip
            size="small"
            color={params.row.source === 'LEGACY_CUSTOMER' ? 'secondary' : 'primary'}
            variant={params.row.source === 'LEGACY_CUSTOMER' ? 'filled' : 'outlined'}
            label={sourceLabel[params.row.source]}
          />
        ),
      },
      {
        field: 'invoiceNumber',
        headerName: 'Invoice',
        minWidth: 150,
      },
      {
        field: 'legacyCustomerName',
        headerName: 'Legacy Customer',
        minWidth: 190,
        valueFormatter: (value) => (value as string | null) || 'Direct platform billing',
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
        headerName: '',
        sortable: false,
        filterable: false,
        minWidth: 120,
        renderCell: (params) => (
          <Button size="small" variant="outlined" onClick={() => navigate(`/tenants/${params.row.tenantId}`)}>
            Open
          </Button>
        ),
      },
    ],
    [navigate]
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
              {params.row.legacyCustomerName
                ? `Legacy: ${params.row.legacyCustomerName}`
                : params.row.invoiceNumber ?? 'No linked invoice'}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'source',
        headerName: 'Source',
        minWidth: 130,
        renderCell: (params) => (
          <Chip
            size="small"
            color={params.row.source === 'LEGACY_CUSTOMER' ? 'secondary' : 'primary'}
            variant={params.row.source === 'LEGACY_CUSTOMER' ? 'filled' : 'outlined'}
            label={sourceLabel[params.row.source]}
          />
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
          <Button size="small" variant="outlined" onClick={() => navigate(`/tenants/${params.row.tenantId}`)}>
            Open
          </Button>
        ),
      },
    ],
    [navigate]
  );

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Billing"
        subtitle="Revenue summary, tenant invoices, and payment history across the platform."
        action={
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              label="Search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setInvoicePaginationModel((current) => ({ ...current, page: 0 }));
                setPaymentPaginationModel((current) => ({ ...current, page: 0 }));
              }}
              placeholder="Tenant, invoice, transaction"
              sx={{ minWidth: 220 }}
            />
            <TextField
              select
              label="Source"
              value={billingSource}
              onChange={(event) => {
                setBillingSource(event.target.value as 'ALL' | BillingRecordSource);
                setInvoicePaginationModel((current) => ({ ...current, page: 0 }));
                setPaymentPaginationModel((current) => ({ ...current, page: 0 }));
              }}
              sx={{ minWidth: 160 }}
            >
              {billingSources.map((status) => (
                <MenuItem key={status} value={status}>
                  {status === 'ALL' ? 'All sources' : sourceLabel[status]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Invoice status"
              value={invoiceStatus}
              onChange={(event) => {
                setInvoiceStatus(event.target.value as 'ALL' | InvoiceStatus);
                setInvoicePaginationModel((current) => ({ ...current, page: 0 }));
              }}
              sx={{ minWidth: 180 }}
            >
              {invoiceStatuses.map((status) => (
                <MenuItem key={status} value={status}>
                  {status === 'ALL' ? 'All invoices' : status}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        }
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} xl={3}>
          <KpiCard
            label="MRR"
            value={summary ? currencyFormatter.format(summary.summary.mrr) : '...'}
            helper="Current-month invoice amount"
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <KpiCard
            label="Collections This Month"
            value={summary ? currencyFormatter.format(summary.summary.collectionsThisMonth) : '...'}
            helper="Payments received this month"
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <KpiCard
            label="Unpaid Invoices"
            value={summary ? summary.summary.unpaidInvoiceCount : '...'}
            helper={summary ? currencyFormatter.format(summary.summary.unpaidInvoiceAmount) : 'Outstanding balance'}
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <KpiCard
            label="Total Payments"
            value={summary ? currencyFormatter.format(summary.summary.totalPaymentsReceived) : '...'}
            helper={summary ? `${summary.summary.totalPayments} payments recorded` : 'Across all tenants'}
          />
        </Grid>
      </Grid>

      {summary ? (
        <Grid container spacing={2}>
          <Grid item xs={12} lg={5}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="overline" color="primary">
                Invoice Trend
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Monthly invoice generation across recent periods.
              </Typography>
              <BarChart
                height={280}
                xAxis={[{ scaleType: 'band', data: summary.revenueByMonth.map((item) => item.label) }]}
                series={[
                  {
                    data: summary.revenueByMonth.map((item) => item.invoiceAmount),
                    label: 'Invoices',
                    color: theme.palette.primary.main,
                  },
                ]}
                margin={{ left: 56, right: 24, top: 24, bottom: 24 }}
              />
            </Paper>
          </Grid>
          <Grid item xs={12} lg={7}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="overline" color="primary">
                Collections Comparison
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Invoiced amounts compared with payments received by month.
              </Typography>
              <BarChart
                height={280}
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
                margin={{ left: 56, right: 24, top: 24, bottom: 24 }}
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
            loading={loading}
            rowCount={invoicePagination?.total ?? 0}
            paginationMode="server"
            paginationModel={invoicePaginationModel}
            onPaginationModelChange={setInvoicePaginationModel}
            pageSizeOptions={[10, 20, 50]}
            disableRowSelectionOnClick
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
            loading={loading}
            rowCount={paymentPagination?.total ?? 0}
            paginationMode="server"
            paginationModel={paymentPaginationModel}
            onPaginationModelChange={setPaymentPaginationModel}
            pageSizeOptions={[10, 20, 50]}
            disableRowSelectionOnClick
          />
        </Box>
      </Paper>
    </Stack>
  );
};

export default Billing;
