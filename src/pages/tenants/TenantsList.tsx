import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import StatusChip from '../../components/StatusChip';
import KpiCard from '../../components/KpiCard';
import { platformDataGridSx } from '../../components/dataGridStyles';
import { api } from '../../services/api';
import { TenantStatus, TenantSummary } from '../../types';

const currency = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const TenantsList = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const [rows, setRows] = useState<TenantSummary[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | TenantStatus>('ALL');
  const [search, setSearch] = useState('');
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 20,
  });
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let cancelled = false;

    const loadTenants = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get<{
          tenants: TenantSummary[];
          pagination: { total: number };
        }>('/tenants', {
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

        setRows(response.data.tenants);
        setRowCount(response.data.pagination.total);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message ?? 'Failed to load tenants');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadTenants();

    return () => {
      cancelled = true;
    };
  }, [paginationModel.page, paginationModel.pageSize, statusFilter, deferredSearch]);

  const visibleStatusCounts = useMemo(() => {
    return rows.reduce(
      (acc, tenant) => {
        acc[tenant.status] += 1;
        return acc;
      },
      { ACTIVE: 0, DISABLED: 0, EXPIRED: 0 }
    );
  }, [rows]);

  const columns = useMemo<GridColDef<TenantSummary>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Tenant',
        flex: 1.3,
        minWidth: 240,
        renderCell: (params) => (
          <Box sx={{ py: 1 }}>
            <Typography fontWeight={700}>{params.row.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {params.row.email || params.row.phoneNumber || 'No primary contact'}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        minWidth: 130,
        renderCell: (params) => <StatusChip status={params.value as string} />,
      },
      {
        field: 'plan',
        headerName: 'Plan',
        flex: 1,
        minWidth: 190,
        valueGetter: (_, row) => row.plan.name,
        renderCell: (params) => (
          <Box sx={{ py: 1 }}>
            <Typography fontWeight={700}>{params.row.plan.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {currency.format(params.row.plan.priceMonthly)} / month
            </Typography>
          </Box>
        ),
      },
      {
        field: 'location',
        headerName: 'Location',
        flex: 0.9,
        minWidth: 170,
        valueGetter: (_, row) => [row.town, row.county].filter(Boolean).join(', ') || 'Unspecified',
      },
      {
        field: 'balance',
        headerName: 'Balance',
        minWidth: 150,
        align: 'right',
        headerAlign: 'right',
        valueFormatter: (value) =>
          typeof value === 'number' ? currency.format(value) : 'Not available',
      },
      {
        field: 'userCount',
        headerName: 'Users',
        minWidth: 110,
      },
      {
        field: 'customerCount',
        headerName: 'Customers',
        minWidth: 120,
      },
      {
        field: 'createdAt',
        headerName: 'Joined',
        minWidth: 130,
        valueFormatter: (value) => dateFormatter.format(new Date(value as string)),
      },
      {
        field: 'actions',
        headerName: '',
        sortable: false,
        filterable: false,
        minWidth: 130,
        renderCell: (params) => (
          <Button
            size="small"
            variant="outlined"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/tenants/${params.row.id}`);
            }}
          >
            Open
          </Button>
        ),
      },
    ],
    [navigate]
  );

  const columnVisibilityModel = useMemo(
    () => ({
      location: !isCompact,
      userCount: !isCompact,
      customerCount: !isCompact,
      createdAt: !isCompact,
      actions: !isCompact,
    }),
    [isCompact]
  );

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Tenants"
        subtitle="Cross-tenant list with plan, status, and utilization signals. Use this view to move from platform-wide health into a single tenant quickly."
        action={
          <Button variant="contained" onClick={() => navigate('/tenants/new')}>
            Add Tenant
          </Button>
        }
        eyebrow="Tenant Directory"
      />

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} xl={3}>
          <KpiCard label="Total Results" value={rowCount} helper="Across the active query" accent="primary" />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <KpiCard
            label="Active On Page"
            value={visibleStatusCounts.ACTIVE}
            helper="Visible rows only"
            accent="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <KpiCard
            label="Disabled On Page"
            value={visibleStatusCounts.DISABLED}
            helper="Visible rows only"
            accent="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <KpiCard
            label="Expired On Page"
            value={visibleStatusCounts.EXPIRED}
            helper="Visible rows only"
            accent="secondary"
          />
        </Grid>
      </Grid>

      <Paper sx={{ p: 2.5 }}>
        <Typography variant="overline" color="primary">
          Tenant Queue
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.5 }}>
          Search by tenant, contact, or location. On smaller screens, tap a row to open the tenant
          workspace directly.
        </Typography>
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

        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

        <DataGrid
          autoHeight
          rows={rows}
          columns={columns}
          columnVisibilityModel={columnVisibilityModel}
          rowCount={rowCount}
          loading={loading}
          paginationMode="server"
          disableRowSelectionOnClick
          pageSizeOptions={[10, 20, 50]}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          onRowClick={(params) => navigate(`/tenants/${params.row.id}`)}
          getRowHeight={() => 'auto'}
          sx={platformDataGridSx}
        />
      </Paper>
    </Stack>
  );
};

export default TenantsList;
