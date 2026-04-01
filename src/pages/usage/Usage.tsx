import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { LineChart } from '@mui/x-charts/LineChart';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import KpiCard from '../../components/KpiCard';
import StatusChip from '../../components/StatusChip';
import { api } from '../../services/api';
import { LoginActivityPayload, PaginationMeta, TenantStatus, UsageTenant } from '../../types';
import { formatDateTime, formatRiskFlag } from '../../lib/format';

const Usage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [rows, setRows] = useState<UsageTenant[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [logins, setLogins] = useState<LoginActivityPayload | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | TenantStatus>('ALL');
  const [search, setSearch] = useState('');
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 20,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let cancelled = false;

    const loadUsage = async () => {
      setLoading(true);
      setError(null);

      try {
        const [tenantsResponse, loginsResponse] = await Promise.all([
          api.get<{ tenants: UsageTenant[]; pagination: PaginationMeta }>('/usage/tenants', {
            params: {
              page: paginationModel.page + 1,
              limit: paginationModel.pageSize,
              status: statusFilter === 'ALL' ? undefined : statusFilter,
              search: deferredSearch || undefined,
            },
          }),
          api.get<LoginActivityPayload>('/usage/logins'),
        ]);

        if (cancelled) {
          return;
        }

        setRows(tenantsResponse.data.tenants);
        setRowCount(tenantsResponse.data.pagination.total);
        setLogins(loginsResponse.data);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message ?? 'Failed to load usage data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadUsage();

    return () => {
      cancelled = true;
    };
  }, [paginationModel.page, paginationModel.pageSize, statusFilter, deferredSearch]);

  const riskyTenantCount = useMemo(
    () => rows.filter((tenant) => tenant.riskFlags.length > 0).length,
    [rows]
  );

  const averageEngagement = useMemo(() => {
    if (!rows.length) {
      return 0;
    }

    return Math.round(rows.reduce((sum, tenant) => sum + tenant.engagementScore, 0) / rows.length);
  }, [rows]);

  const columns = useMemo<GridColDef<UsageTenant>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Tenant',
        flex: 1.15,
        minWidth: 220,
        renderCell: (params) => (
          <Box sx={{ py: 1 }}>
            <Typography fontWeight={700}>{params.row.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {params.row.plan.name}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        minWidth: 120,
        renderCell: (params) => <StatusChip status={params.value as string} />,
      },
      {
        field: 'engagementScore',
        headerName: 'Engagement',
        minWidth: 220,
        renderCell: (params) => (
          <Stack spacing={1} sx={{ width: '100%', py: 1 }}>
            <Stack direction="row" justifyContent="space-between">
              <Typography fontWeight={700}>{params.row.engagementScore}</Typography>
              <Typography variant="caption" color="text.secondary">
                /100
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={params.row.engagementScore}
              sx={{ height: 10, borderRadius: 999 }}
            />
          </Stack>
        ),
      },
      {
        field: 'actionsLast30Days',
        headerName: 'Actions (30d)',
        minWidth: 120,
      },
      {
        field: 'activeUsersLast30Days',
        headerName: 'Users (30d)',
        minWidth: 110,
      },
      {
        field: 'lastLoginAt',
        headerName: 'Last Login',
        minWidth: 180,
        valueFormatter: (value) => formatDateTime(value as string | null, 'No login'),
      },
      {
        field: 'lastPaymentAt',
        headerName: 'Last Payment',
        minWidth: 180,
        valueFormatter: (value) => formatDateTime(value as string | null, 'No payment'),
      },
      {
        field: 'riskFlags',
        headerName: 'Risk Flags',
        flex: 1.25,
        minWidth: 280,
        sortable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ py: 1 }}>
            {params.row.riskFlags.length ? (
              params.row.riskFlags.map((flag) => (
                <Chip key={flag} size="small" label={formatRiskFlag(flag)} color="warning" variant="outlined" />
              ))
            ) : (
              <Chip size="small" label="Healthy" color="success" variant="outlined" />
            )}
          </Stack>
        ),
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
        title="Usage"
        subtitle="Engagement scoring, login activity, and risk flags across the tenant base."
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} lg={4} xl={3}>
          <KpiCard label="Total Results" value={rowCount} helper="Tenants matching the current query" />
        </Grid>
        <Grid item xs={12} sm={6} lg={4} xl={3}>
          <KpiCard label="Risky On Page" value={riskyTenantCount} helper="Visible tenants with churn flags" />
        </Grid>
        <Grid item xs={12} sm={6} lg={4} xl={3}>
          <KpiCard label="Average Engagement" value={averageEngagement} helper="Average score on visible rows" />
        </Grid>
        <Grid item xs={12} sm={6} lg={6} xl={3}>
          <KpiCard
            label="Logins (30d)"
            value={logins?.totals.loginCount ?? '...'}
            helper="All LOGIN events in the last 30 days"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={6} xl={3}>
          <KpiCard
            label="Active Users (30d)"
            value={logins?.totals.activeUsers ?? '...'}
            helper="Distinct users across login events"
          />
        </Grid>
      </Grid>

      {logins ? (
        <Grid container spacing={2}>
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="overline" color="primary">
                Login Trend
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Daily login count and active tenants over the last 30 days.
              </Typography>
              <LineChart
                height={300}
                xAxis={[{ scaleType: 'point', data: logins.trend.map((item) => item.label) }]}
                series={[
                  {
                    data: logins.trend.map((item) => item.loginCount),
                    label: 'Logins',
                    color: theme.palette.primary.main,
                  },
                  {
                    data: logins.trend.map((item) => item.activeTenants),
                    label: 'Active tenants',
                    color: theme.palette.secondary.main,
                  },
                ]}
                margin={{ left: 56, right: 24, top: 24, bottom: 24 }}
              />
            </Paper>
          </Grid>
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="overline" color="primary">
                Top Login Tenants
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Highest-volume tenants from login activity in the last 30 days.
              </Typography>
              <Stack spacing={1.25}>
                {logins.topTenants.length ? (
                  logins.topTenants.map((tenant) => (
                    <Paper key={tenant.tenantId} variant="outlined" sx={{ p: 1.5 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                        <Box>
                          <Typography fontWeight={700}>{tenant.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {tenant.loginCount} logins
                          </Typography>
                        </Box>
                        <StatusChip status={tenant.status} />
                      </Stack>
                    </Paper>
                  ))
                ) : (
                  <Typography color="text.secondary">No login activity recorded in the last 30 days.</Typography>
                )}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      ) : null}

      <Paper sx={{ p: 2.5 }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ mb: 2.5 }}>
          <TextField
            fullWidth
            label="Search tenants"
            placeholder="Name, email, county, town"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPaginationModel((current) => ({ ...current, page: 0 }));
            }}
          />
          <TextField
            select
            label="Status"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as 'ALL' | TenantStatus);
              setPaginationModel((current) => ({ ...current, page: 0 }));
            }}
            sx={{ minWidth: { xs: '100%', lg: 180 } }}
          >
            <MenuItem value="ALL">All statuses</MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="DISABLED">Disabled</MenuItem>
            <MenuItem value="EXPIRED">Expired</MenuItem>
          </TextField>
        </Stack>

        <Box sx={{ height: 540 }}>
          <DataGrid
            rows={rows}
            getRowId={(row) => row.tenantId}
            columns={columns}
            loading={loading}
            rowCount={rowCount}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 20, 50]}
            disableRowSelectionOnClick
          />
        </Box>
      </Paper>
    </Stack>
  );
};

export default Usage;
