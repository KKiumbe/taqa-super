import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import KpiCard from '../../components/KpiCard';
import StatusChip from '../../components/StatusChip';
import { api } from '../../services/api';
import { MpesaConfigItem, MpesaTransactionItem, SmsConfigItem, SmsUsageItem } from '../../types';
import { compactNumberFormatter, currencyFormatter, formatDateTime } from '../../lib/format';

type ConfigSummary = {
  configured: number;
  partial: number;
  missing: number;
};

type SmsUsageSummary = {
  purchasedUnits: number;
  consumedMessages: number;
  failedMessages: number;
  purchaseAmount: number;
};

type MpesaTransactionSummary = {
  totalTransactions: number;
  processedTransactions: number;
  unprocessedTransactions: number;
  totalAmount: number;
};

type CoverageRow = {
  id: number;
  tenantId: number;
  tenantName: string;
  tenantStatus: string;
  smsStatus: string;
  mpesaStatus: string;
  smsUpdatedAt: string | null;
  mpesaUpdatedAt: string | null;
};

type ActivityRow = {
  id: number;
  tenantId: number;
  tenantName: string;
  tenantStatus: string;
  purchasedUnits: number;
  consumedMessages: number;
  failedMessages: number;
  totalTransactions: number;
  unprocessedTransactions: number;
  successRate: number;
  totalAmount: number;
  lastMessageAt: string | null;
  lastTransactionAt: string | null;
};

const Operations = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [smsConfigSummary, setSmsConfigSummary] = useState<ConfigSummary | null>(null);
  const [mpesaConfigSummary, setMpesaConfigSummary] = useState<ConfigSummary | null>(null);
  const [smsUsageSummary, setSmsUsageSummary] = useState<SmsUsageSummary | null>(null);
  const [mpesaTransactionSummary, setMpesaTransactionSummary] = useState<MpesaTransactionSummary | null>(null);
  const [smsConfigs, setSmsConfigs] = useState<SmsConfigItem[]>([]);
  const [mpesaConfigs, setMpesaConfigs] = useState<MpesaConfigItem[]>([]);
  const [smsUsage, setSmsUsage] = useState<SmsUsageItem[]>([]);
  const [mpesaTransactions, setMpesaTransactions] = useState<MpesaTransactionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadOperations = async () => {
      setLoading(true);
      setError(null);

      try {
        const [smsConfigsResponse, mpesaConfigsResponse, smsUsageResponse, mpesaTransactionsResponse] =
          await Promise.all([
            api.get<{ summary: ConfigSummary; items: SmsConfigItem[] }>('/ops/sms-configs', {
              params: { search: deferredSearch || undefined },
            }),
            api.get<{ summary: ConfigSummary; items: MpesaConfigItem[] }>('/ops/mpesa-configs', {
              params: { search: deferredSearch || undefined },
            }),
            api.get<{ summary: SmsUsageSummary; items: SmsUsageItem[] }>('/ops/sms-usage', {
              params: { search: deferredSearch || undefined },
            }),
            api.get<{ summary: MpesaTransactionSummary; items: MpesaTransactionItem[] }>(
              '/ops/mpesa-transactions',
              {
                params: { search: deferredSearch || undefined },
              }
            ),
          ]);

        if (cancelled) {
          return;
        }

        setSmsConfigSummary(smsConfigsResponse.data.summary);
        setMpesaConfigSummary(mpesaConfigsResponse.data.summary);
        setSmsUsageSummary(smsUsageResponse.data.summary);
        setMpesaTransactionSummary(mpesaTransactionsResponse.data.summary);
        setSmsConfigs(smsConfigsResponse.data.items);
        setMpesaConfigs(mpesaConfigsResponse.data.items);
        setSmsUsage(smsUsageResponse.data.items);
        setMpesaTransactions(mpesaTransactionsResponse.data.items);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message ?? 'Failed to load operations data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadOperations();

    return () => {
      cancelled = true;
    };
  }, [deferredSearch]);

  const coverageRows = useMemo<CoverageRow[]>(() => {
    const smsMap = new Map(smsConfigs.map((item) => [item.tenantId, item]));
    const mpesaMap = new Map(mpesaConfigs.map((item) => [item.tenantId, item]));
    const tenantIds = new Set<number>([
      ...smsConfigs.map((item) => item.tenantId),
      ...mpesaConfigs.map((item) => item.tenantId),
    ]);

    return Array.from(tenantIds).map((tenantId) => {
      const sms = smsMap.get(tenantId);
      const mpesa = mpesaMap.get(tenantId);

      return {
        id: tenantId,
        tenantId,
        tenantName: sms?.tenantName ?? mpesa?.tenantName ?? `Tenant ${tenantId}`,
        tenantStatus: sms?.tenantStatus ?? mpesa?.tenantStatus ?? 'UNKNOWN',
        smsStatus: sms?.configStatus ?? 'MISSING',
        mpesaStatus: mpesa?.configStatus ?? 'MISSING',
        smsUpdatedAt: sms?.config?.updatedAt ?? null,
        mpesaUpdatedAt: mpesa?.config?.updatedAt ?? null,
      };
    });
  }, [mpesaConfigs, smsConfigs]);

  const activityRows = useMemo<ActivityRow[]>(() => {
    const smsMap = new Map(smsUsage.map((item) => [item.tenantId, item]));
    const mpesaMap = new Map(mpesaTransactions.map((item) => [item.tenantId, item]));
    const tenantIds = new Set<number>([
      ...smsUsage.map((item) => item.tenantId),
      ...mpesaTransactions.map((item) => item.tenantId),
    ]);

    return Array.from(tenantIds).map((tenantId) => {
      const sms = smsMap.get(tenantId);
      const mpesa = mpesaMap.get(tenantId);

      return {
        id: tenantId,
        tenantId,
        tenantName: sms?.tenantName ?? mpesa?.tenantName ?? `Tenant ${tenantId}`,
        tenantStatus: sms?.tenantStatus ?? mpesa?.tenantStatus ?? 'UNKNOWN',
        purchasedUnits: sms?.purchasedUnits ?? 0,
        consumedMessages: sms?.consumedMessages ?? 0,
        failedMessages: sms?.failedMessages ?? 0,
        totalTransactions: mpesa?.totalTransactions ?? 0,
        unprocessedTransactions: mpesa?.unprocessedTransactions ?? 0,
        successRate: mpesa?.successRate ?? 0,
        totalAmount: mpesa?.totalAmount ?? 0,
        lastMessageAt: sms?.lastMessageAt ?? null,
        lastTransactionAt: mpesa?.lastTransactionAt ?? null,
      };
    });
  }, [mpesaTransactions, smsUsage]);

  const coverageColumns = useMemo<GridColDef<CoverageRow>[]>(
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
        field: 'smsStatus',
        headerName: 'SMS',
        minWidth: 140,
        renderCell: (params) => <StatusChip status={params.value as string} />,
      },
      {
        field: 'mpesaStatus',
        headerName: 'M-Pesa',
        minWidth: 140,
        renderCell: (params) => <StatusChip status={params.value as string} />,
      },
      {
        field: 'smsUpdatedAt',
        headerName: 'SMS Updated',
        minWidth: 180,
        valueFormatter: (value) => formatDateTime(value as string | null, 'Not configured'),
      },
      {
        field: 'mpesaUpdatedAt',
        headerName: 'M-Pesa Updated',
        minWidth: 180,
        valueFormatter: (value) => formatDateTime(value as string | null, 'Not configured'),
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

  const activityColumns = useMemo<GridColDef<ActivityRow>[]>(
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
        field: 'purchasedUnits',
        headerName: 'SMS Units',
        minWidth: 130,
        valueFormatter: (value) => compactNumberFormatter.format(value as number),
      },
      {
        field: 'consumedMessages',
        headerName: 'SMS Sent',
        minWidth: 120,
        valueFormatter: (value) => compactNumberFormatter.format(value as number),
      },
      {
        field: 'failedMessages',
        headerName: 'SMS Failed',
        minWidth: 120,
        valueFormatter: (value) => compactNumberFormatter.format(value as number),
      },
      {
        field: 'totalTransactions',
        headerName: 'M-Pesa Txns',
        minWidth: 130,
        valueFormatter: (value) => compactNumberFormatter.format(value as number),
      },
      {
        field: 'successRate',
        headerName: 'Success Rate',
        minWidth: 200,
        renderCell: (params) => (
          <Stack spacing={1} sx={{ width: '100%', py: 1 }}>
            <Typography fontWeight={700}>{params.row.successRate}%</Typography>
            <LinearProgress
              variant="determinate"
              value={params.row.successRate}
              sx={{ height: 10, borderRadius: 999 }}
            />
          </Stack>
        ),
      },
      {
        field: 'unprocessedTransactions',
        headerName: 'Unprocessed',
        minWidth: 120,
      },
      {
        field: 'totalAmount',
        headerName: 'M-Pesa Amount',
        minWidth: 150,
        valueFormatter: (value) => currencyFormatter.format(value as number),
      },
      {
        field: 'lastTransactionAt',
        headerName: 'Last Txn',
        minWidth: 180,
        valueFormatter: (value) => formatDateTime(value as string | null, 'No transactions'),
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
        title="Operations"
        subtitle="SMS and M-Pesa configuration coverage with platform-wide traffic and processing signals."
        action={
          <TextField
            label="Search tenants"
            placeholder="Name, email, county, town"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ minWidth: { xs: '100%', md: 320 } }}
          />
        }
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} xl={3}>
          <KpiCard
            label="SMS Configured"
            value={smsConfigSummary ? smsConfigSummary.configured : '...'}
            helper={smsConfigSummary ? `${smsConfigSummary.partial} partial, ${smsConfigSummary.missing} missing` : 'Coverage'}
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <KpiCard
            label="M-Pesa Configured"
            value={mpesaConfigSummary ? mpesaConfigSummary.configured : '...'}
            helper={
              mpesaConfigSummary
                ? `${mpesaConfigSummary.partial} partial, ${mpesaConfigSummary.missing} missing`
                : 'Coverage'
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <KpiCard
            label="Failed SMS"
            value={smsUsageSummary ? compactNumberFormatter.format(smsUsageSummary.failedMessages) : '...'}
            helper={smsUsageSummary ? `${compactNumberFormatter.format(smsUsageSummary.consumedMessages)} total SMS sent` : 'Messaging delivery'}
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <KpiCard
            label="Unprocessed M-Pesa"
            value={
              mpesaTransactionSummary
                ? compactNumberFormatter.format(mpesaTransactionSummary.unprocessedTransactions)
                : '...'
            }
            helper={
              mpesaTransactionSummary
                ? currencyFormatter.format(mpesaTransactionSummary.totalAmount)
                : 'Processing backlog'
            }
          />
        </Grid>
      </Grid>

      <Paper sx={{ p: 2.5 }}>
        <Typography variant="overline" color="primary">
          Configuration Coverage
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Compare SMS and M-Pesa setup status across tenants.
        </Typography>
        <Box sx={{ height: 430 }}>
          <DataGrid
            rows={coverageRows}
            columns={coverageColumns}
            loading={loading}
            pageSizeOptions={[10, 20, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            disableRowSelectionOnClick
          />
        </Box>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Typography variant="overline" color="primary">
          Traffic And Transactions
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Message volume, failure counts, and M-Pesa processing performance per tenant.
        </Typography>
        <Box sx={{ height: 430 }}>
          <DataGrid
            rows={activityRows}
            columns={activityColumns}
            loading={loading}
            pageSizeOptions={[10, 20, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            disableRowSelectionOnClick
          />
        </Box>
      </Paper>
    </Stack>
  );
};

export default Operations;
