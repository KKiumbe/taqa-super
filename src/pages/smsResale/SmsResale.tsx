import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
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
import { PaginationMeta, SmsResalePurchase, SmsResaleSummary, TenantSummary } from '../../types';

const purchaseStatuses = ['ALL', 'PENDING', 'COMPLETED', 'FAILED'] as const;

const SmsResale = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
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
  const [tenantOptionsLoading, setTenantOptionsLoading] = useState(false);
  const [topUpDialogOpen, setTopUpDialogOpen] = useState(false);
  const [selectedTopUpTenantId, setSelectedTopUpTenantId] = useState('');
  const [smsTopUpUnitsDraft, setSmsTopUpUnitsDraft] = useState('');
  const [smsTopUpReasonDraft, setSmsTopUpReasonDraft] = useState('Platform SMS top-up');
  const [toppingUpSms, setToppingUpSms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
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
  }, [deferredSearch, paginationModel.page, paginationModel.pageSize, refreshKey, statusFilter]);

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
        setSelectedTopUpTenantId((current) => current || String(nextTenants[0]?.id ?? ''));
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

  const selectedTopUpTenant = useMemo(
    () => tenants.find((tenant) => String(tenant.id) === selectedTopUpTenantId) ?? null,
    [selectedTopUpTenantId, tenants]
  );

  const resetTopUpDialog = () => {
    setTopUpDialogOpen(false);
    setSelectedTopUpTenantId((current) => current || String(tenants[0]?.id ?? ''));
    setSmsTopUpUnitsDraft('');
    setSmsTopUpReasonDraft('Platform SMS top-up');
  };

  const openTopUpDialog = (tenantId?: number) => {
    setSelectedTopUpTenantId(
      tenantId ? String(tenantId) : selectedTopUpTenantId || String(tenants[0]?.id ?? '')
    );
    setTopUpDialogOpen(true);
  };

  const topUpTenantSms = async () => {
    const tenantId = Number.parseInt(selectedTopUpTenantId, 10);
    const smsUnits = Number.parseInt(smsTopUpUnitsDraft, 10);

    if (!Number.isInteger(tenantId) || tenantId <= 0) {
      setError('Choose a tenant before crediting SMS.');
      return;
    }

    if (!Number.isInteger(smsUnits) || smsUnits < 1) {
      setError('SMS top-up units must be a positive whole number.');
      return;
    }

    setToppingUpSms(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post(`/tenants/${tenantId}/sms-topups`, {
        smsUnits,
        reason: smsTopUpReasonDraft.trim() || 'Platform SMS top-up',
      });

      setRefreshKey((current) => current + 1);
      setSuccess(`Credited ${smsUnits} SMS units to ${selectedTopUpTenant?.name ?? `tenant ${tenantId}`}.`);
      resetTopUpDialog();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to top up SMS');
    } finally {
      setToppingUpSms(false);
    }
  };

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
        minWidth: 220,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={1} sx={{ py: 1 }}>
            <Button size="small" variant="text" onClick={() => navigate(`/tenants/${params.row.tenantId}`)}>
              Open tenant
            </Button>
            <Button size="small" variant="outlined" onClick={() => openTopUpDialog(params.row.tenantId)}>
              Top up SMS
            </Button>
          </Stack>
        ),
      },
    ],
    [navigate, tenants]
  );

  return (
    <Stack spacing={3}>
      <PageHeader
        title="SMS Resale"
        subtitle="Track tenant SMS purchases, STK request refs, and the linked M-Pesa payment transaction from one workspace."
        action={
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <Button variant="contained" onClick={() => openTopUpDialog()} disabled={tenantOptionsLoading}>
              Manual SMS Top-up
            </Button>
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
      {success ? <Alert severity="success">{success}</Alert> : null}

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

      <Dialog open={topUpDialogOpen} onClose={toppingUpSms ? undefined : resetTopUpDialog} fullWidth maxWidth="sm">
        <DialogTitle>Manual SMS Top-up</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Credit tenant SMS units directly from the resale workspace.
            </Typography>
            <FormControl fullWidth>
              <InputLabel id="sms-resale-tenant-label">Tenant</InputLabel>
              <Select
                labelId="sms-resale-tenant-label"
                label="Tenant"
                value={selectedTopUpTenantId}
                onChange={(event) => setSelectedTopUpTenantId(event.target.value)}
                disabled={tenantOptionsLoading}
              >
                {tenants.map((tenant) => (
                  <MenuItem key={tenant.id} value={String(tenant.id)}>
                    {tenant.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedTopUpTenant ? (
              <Typography variant="body2" color="text.secondary">
                {selectedTopUpTenant.status} tenant · {selectedTopUpTenant.plan.name}
              </Typography>
            ) : null}
            <TextField
              label="SMS Units"
              type="number"
              inputProps={{ min: 1, step: 1 }}
              value={smsTopUpUnitsDraft}
              onChange={(event) => setSmsTopUpUnitsDraft(event.target.value)}
              placeholder="0"
            />
            <TextField
              label="Reason"
              value={smsTopUpReasonDraft}
              onChange={(event) => setSmsTopUpReasonDraft(event.target.value)}
              placeholder="Platform SMS top-up"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetTopUpDialog} disabled={toppingUpSms}>
            Cancel
          </Button>
          <Button
            onClick={topUpTenantSms}
            variant="contained"
            disabled={toppingUpSms || tenantOptionsLoading}
          >
            {toppingUpSms ? 'Crediting SMS...' : 'Credit SMS'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default SmsResale;
