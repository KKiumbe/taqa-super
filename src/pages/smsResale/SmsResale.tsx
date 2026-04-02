import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import KpiCard from '../../components/KpiCard';
import StatusChip from '../../components/StatusChip';
import { currencyFormatter, formatDateTime } from '../../lib/format';
import { api } from '../../services/api';
import { PaginationMeta, SmsResalePurchase, SmsResaleSummary } from '../../types';

const purchaseStatuses = ['ALL', 'PENDING', 'COMPLETED', 'FAILED'] as const;

const SmsResale = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<SmsResalePurchase[]>([]);
  const [summary, setSummary] = useState<SmsResaleSummary | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 20,
  });
  const [statusFilter, setStatusFilter] = useState<(typeof purchaseStatuses)[number]>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let cancelled = false;

    const loadSmsResale = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get<{
          summary: SmsResaleSummary;
          pagination: PaginationMeta;
          items: SmsResalePurchase[];
        }>('/sms-resale/purchases', {
          params: {
            page: paginationModel.page + 1,
            limit: paginationModel.pageSize,
            status: statusFilter === 'ALL' ? undefined : statusFilter,
            search: deferredSearch || undefined,
          },
        });

        if (cancelled) {
          return;
        }

        setRows(response.data.items);
        setSummary(response.data.summary);
        setPagination(response.data.pagination);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message ?? 'Failed to load SMS resale data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSmsResale();

    return () => {
      cancelled = true;
    };
  }, [deferredSearch, paginationModel.page, paginationModel.pageSize, statusFilter]);

  const columns = useMemo<GridColDef<SmsResalePurchase>[]>(
    () => [
      {
        field: 'tenantName',
        headerName: 'Tenant',
        flex: 1.1,
        minWidth: 220,
        renderCell: (params) => (
          <Box sx={{ py: 1 }}>
            <Typography fontWeight={700}>{params.row.tenantName}</Typography>
            <StatusChip status={params.row.tenantStatus} />
          </Box>
        ),
      },
      {
        field: 'status',
        headerName: 'Purchase',
        minWidth: 130,
        renderCell: (params) => <StatusChip status={params.value as string} />,
      },
      {
        field: 'reconciliationStatus',
        headerName: 'Payment Link',
        minWidth: 190,
        renderCell: (params) => <StatusChip status={params.value as string} />,
      },
      {
        field: 'phoneNumber',
        headerName: 'Phone',
        minWidth: 150,
      },
      {
        field: 'amount',
        headerName: 'Amount',
        minWidth: 130,
        valueFormatter: (value) => currencyFormatter.format(value as number),
      },
      {
        field: 'smsUnits',
        headerName: 'Units',
        minWidth: 110,
      },
      {
        field: 'payment',
        headerName: 'Payment Transaction',
        flex: 1.2,
        minWidth: 260,
        sortable: false,
        renderCell: (params) => {
          const payment = params.row.payment;

          return (
            <Box sx={{ py: 1 }}>
              <Typography fontWeight={700}>
                {payment?.transactionId ?? params.row.receiptNumber ?? 'No payment transaction yet'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {payment?.payerName ? `${payment.payerName} · ` : ''}
                {payment?.billRefNumber ?? 'No account reference'}
              </Typography>
            </Box>
          );
        },
      },
      {
        field: 'gatewayRefs',
        headerName: 'Gateway Refs',
        flex: 1.1,
        minWidth: 250,
        sortable: false,
        renderCell: (params) => (
          <Box sx={{ py: 1 }}>
            <Typography variant="body2" fontWeight={700}>
              {params.row.checkoutRequestId ?? 'No checkout request'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {params.row.merchantRequestId ?? 'No merchant request'}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'timeline',
        headerName: 'Timeline',
        flex: 1.15,
        minWidth: 250,
        sortable: false,
        renderCell: (params) => (
          <Box sx={{ py: 1 }}>
            <Typography variant="body2">Requested: {formatDateTime(params.row.createdAt)}</Typography>
            <Typography variant="body2" color="text.secondary">
              Paid: {formatDateTime(params.row.payment?.createdAt ?? null, 'Not linked')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Credited: {formatDateTime(params.row.creditedAt ?? null, 'Pending credit')}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'actions',
        headerName: '',
        minWidth: 120,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Typography
            component="button"
            type="button"
            onClick={() => navigate(`/tenants/${params.row.tenantId}`)}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#204b4d',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Open tenant
          </Typography>
        ),
      },
    ],
    [navigate]
  );

  return (
    <Stack spacing={3}>
      <PageHeader
        title="SMS Resale"
        subtitle="Track tenant SMS purchases, STK request refs, and the linked M-Pesa payment transaction from one workspace."
        action={
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              label="Search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPaginationModel((current) => ({ ...current, page: 0 }));
              }}
              placeholder="Tenant, phone, receipt, account ref"
              sx={{ minWidth: 240 }}
            />
            <TextField
              select
              label="Status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as (typeof purchaseStatuses)[number]);
                setPaginationModel((current) => ({ ...current, page: 0 }));
              }}
              sx={{ minWidth: 170 }}
            >
              {purchaseStatuses.map((status) => (
                <MenuItem key={status} value={status}>
                  {status === 'ALL' ? 'All purchases' : status}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        }
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} xl={2}>
          <KpiCard label="Purchases" value={summary?.totalPurchases ?? '...'} helper="Filtered resale rows" />
        </Grid>
        <Grid item xs={12} sm={6} xl={2}>
          <KpiCard
            label="Amount"
            value={summary ? currencyFormatter.format(summary.totalAmount) : '...'}
            helper="KES initiated for SMS resale"
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={2}>
          <KpiCard label="Units" value={summary?.totalSmsUnits ?? '...'} helper="SMS units requested" />
        </Grid>
        <Grid item xs={12} sm={6} xl={2}>
          <KpiCard label="Completed" value={summary?.completed ?? '...'} helper="Credited purchases" />
        </Grid>
        <Grid item xs={12} sm={6} xl={2}>
          <KpiCard label="Pending" value={summary?.pending ?? '...'} helper="Waiting on credit or payment" />
        </Grid>
        <Grid item xs={12} sm={6} xl={2}>
          <KpiCard
            label="Paid Not Credited"
            value={summary?.paidNotCredited ?? '...'}
            helper="Payment exists but purchase is still pending"
          />
        </Grid>
      </Grid>

      <Paper sx={{ p: 2.5 }}>
        <Typography variant="overline" color="primary">
          Purchase Log
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Search examples: `UD281BQKRR`, `SMS-8-1775110737017`, tenant name, or the buyer phone number.
        </Typography>
        <Box sx={{ height: 640 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            rowCount={pagination?.total ?? 0}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[20, 50, 100]}
            disableRowSelectionOnClick
          />
        </Box>
      </Paper>
    </Stack>
  );
};

export default SmsResale;
