import { useEffect, useMemo, useState } from 'react';
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
} from '@mui/material';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import KpiCard from '../../components/KpiCard';
import StatusChip from '../../components/StatusChip';
import { api } from '../../services/api';
import { AuditLogRow, PaginationMeta, PlatformActionLogRow, TenantSummary } from '../../types';
import { formatDateTime } from '../../lib/format';

const stringifyDetails = (details: Record<string, unknown> | null) => {
  if (!details || !Object.keys(details).length) {
    return 'No extra details';
  }

  return JSON.stringify(details);
};

const Support = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [platformLogs, setPlatformLogs] = useState<PlatformActionLogRow[]>([]);
  const [auditPagination, setAuditPagination] = useState<PaginationMeta | null>(null);
  const [platformPagination, setPlatformPagination] = useState<PaginationMeta | null>(null);
  const [auditPaginationModel, setAuditPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [platformPaginationModel, setPlatformPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittingNote, setSubmittingNote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadTenants = async () => {
      try {
        const response = await api.get<{ tenants: TenantSummary[] }>('/tenants', {
          params: {
            page: 1,
            limit: 100,
          },
        });

        if (cancelled) {
          return;
        }

        setTenants(response.data.tenants);
        setSelectedTenantId((current) => current || String(response.data.tenants[0]?.id ?? ''));
      } catch (err) {
        console.error('Failed to load tenants for support note composer:', err);
      }
    };

    loadTenants();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSupport = async () => {
      setLoading(true);
      setError(null);

      try {
        const [auditResponse, platformResponse] = await Promise.all([
          api.get<{ logs: AuditLogRow[]; pagination: PaginationMeta }>('/support/audit-logs', {
            params: {
              page: auditPaginationModel.page + 1,
              limit: auditPaginationModel.pageSize,
            },
          }),
          api.get<{ logs: PlatformActionLogRow[]; pagination: PaginationMeta }>('/support/platform-logs', {
            params: {
              page: platformPaginationModel.page + 1,
              limit: platformPaginationModel.pageSize,
            },
          }),
        ]);

        if (cancelled) {
          return;
        }

        setAuditLogs(auditResponse.data.logs);
        setPlatformLogs(platformResponse.data.logs);
        setAuditPagination(auditResponse.data.pagination);
        setPlatformPagination(platformResponse.data.pagination);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message ?? 'Failed to load support activity');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSupport();

    return () => {
      cancelled = true;
    };
  }, [
    auditPaginationModel.page,
    auditPaginationModel.pageSize,
    platformPaginationModel.page,
    platformPaginationModel.pageSize,
    refreshKey,
  ]);

  const selectedTenant = useMemo(
    () => tenants.find((tenant) => String(tenant.id) === selectedTenantId) ?? null,
    [selectedTenantId, tenants]
  );

  const submitNote = async () => {
    if (!selectedTenantId || !noteDraft.trim()) {
      setError('Select a tenant and enter a note.');
      return;
    }

    setSubmittingNote(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post('/support/tenant-notes', {
        tenantId: Number(selectedTenantId),
        note: noteDraft.trim(),
      });

      setNoteDraft('');
      setSuccess(`Note created for ${selectedTenant?.name ?? 'the selected tenant'}.`);
      setRefreshKey((value) => value + 1);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create tenant note');
    } finally {
      setSubmittingNote(false);
    }
  };

  const auditColumns = useMemo<GridColDef<AuditLogRow>[]>(
    () => [
      {
        field: 'createdAt',
        headerName: 'Time',
        minWidth: 180,
        valueFormatter: (value) => formatDateTime(value as string),
      },
      {
        field: 'tenant',
        headerName: 'Tenant',
        flex: 1,
        minWidth: 210,
        renderCell: (params) => (
          <Box sx={{ py: 1 }}>
            <Typography fontWeight={700}>{params.row.tenant.name}</Typography>
            <StatusChip status={params.row.tenant.status} />
          </Box>
        ),
      },
      {
        field: 'user',
        headerName: 'User',
        flex: 1,
        minWidth: 220,
        renderCell: (params) => (
          <Box sx={{ py: 1 }}>
            <Typography fontWeight={700}>{params.row.user.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {params.row.user.email}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'action',
        headerName: 'Action',
        minWidth: 180,
      },
      {
        field: 'resource',
        headerName: 'Resource',
        minWidth: 160,
      },
      {
        field: 'description',
        headerName: 'Description',
        flex: 1.2,
        minWidth: 240,
        valueFormatter: (value) => (value as string | null) || 'No description',
      },
    ],
    []
  );

  const platformColumns = useMemo<GridColDef<PlatformActionLogRow>[]>(
    () => [
      {
        field: 'createdAt',
        headerName: 'Time',
        minWidth: 180,
        valueFormatter: (value) => formatDateTime(value as string),
      },
      {
        field: 'admin',
        headerName: 'Admin',
        flex: 1,
        minWidth: 220,
        renderCell: (params) => (
          <Box sx={{ py: 1 }}>
            <Typography fontWeight={700}>{params.row.admin.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {params.row.admin.email}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'action',
        headerName: 'Action',
        minWidth: 190,
      },
      {
        field: 'resource',
        headerName: 'Resource',
        minWidth: 160,
      },
      {
        field: 'resourceId',
        headerName: 'Resource ID',
        minWidth: 140,
        valueFormatter: (value) => (value as string | null) || '-',
      },
      {
        field: 'details',
        headerName: 'Details',
        flex: 1.2,
        minWidth: 260,
        valueGetter: (_, row) => stringifyDetails(row.details),
      },
    ],
    []
  );

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Support"
        subtitle="Cross-tenant audit visibility plus support notes recorded by platform admins."
      />

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <KpiCard
            label="Tenant Audit Logs"
            value={auditPagination?.total ?? '...'}
            helper="Tenant-scoped activity across the platform"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <KpiCard
            label="Platform Action Logs"
            value={platformPagination?.total ?? '...'}
            helper="Actions taken by platform admins"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <KpiCard label="Tenant Options" value={tenants.length} helper="Available in the note composer" />
        </Grid>
      </Grid>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="overline" color="primary">
              Create Tenant Note
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Notes created here appear on the tenant detail page and are written to the platform audit trail.
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Tenant"
                value={selectedTenantId}
                onChange={(event) => setSelectedTenantId(event.target.value)}
              >
                {tenants.map((tenant) => (
                  <MenuItem key={tenant.id} value={String(tenant.id)}>
                    {tenant.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Note"
                placeholder="Capture what happened, what was checked, and what follow-up is needed."
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
              />
            </Grid>
          </Grid>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button variant="contained" onClick={submitNote} disabled={submittingNote || !selectedTenantId}>
              {submittingNote ? 'Saving note...' : 'Save note'}
            </Button>
            {selectedTenant ? (
              <Button variant="outlined" onClick={() => navigate(`/tenants/${selectedTenant.id}`)}>
                Open tenant
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Typography variant="overline" color="primary">
          Tenant Audit Logs
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Existing tenant-side audit records across all organizations.
        </Typography>
        <Box sx={{ height: 430 }}>
          <DataGrid
            rows={auditLogs}
            columns={auditColumns}
            loading={loading}
            rowCount={auditPagination?.total ?? 0}
            paginationMode="server"
            paginationModel={auditPaginationModel}
            onPaginationModelChange={setAuditPaginationModel}
            pageSizeOptions={[10, 20, 50]}
            disableRowSelectionOnClick
          />
        </Box>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Typography variant="overline" color="primary">
          Platform Admin Logs
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Status changes, note creation, impersonation issuance, and other platform-admin actions.
        </Typography>
        <Box sx={{ height: 430 }}>
          <DataGrid
            rows={platformLogs}
            columns={platformColumns}
            loading={loading}
            rowCount={platformPagination?.total ?? 0}
            paginationMode="server"
            paginationModel={platformPaginationModel}
            onPaginationModelChange={setPlatformPaginationModel}
            pageSizeOptions={[10, 20, 50]}
            disableRowSelectionOnClick
          />
        </Box>
      </Paper>
    </Stack>
  );
};

export default Support;
