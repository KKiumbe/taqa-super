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
import {
  AuditLogRow,
  PaginationMeta,
  PlatformActionLogRow,
  PlatformBulkSmsSummary,
  TenantSummary,
} from '../../types';
import { formatDateTime } from '../../lib/format';

const stringifyDetails = (details: Record<string, unknown> | null) => {
  if (!details || !Object.keys(details).length) {
    return 'No extra details';
  }

  return JSON.stringify(details);
};

type PlatformSmsSenderProfile = {
  tenantId: number;
  tenantName: string;
  partnerId: string;
  shortCode: string;
  customerSupportPhoneNumber: string;
};

type BulkActionResult = {
  title: string;
  summary: PlatformBulkSmsSummary;
};

const formatCurrencyAmount = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }

  return `KES ${value.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
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
  const [platformSmsSender, setPlatformSmsSender] = useState<PlatformSmsSenderProfile | null>(null);
  const [smsRecipientsDraft, setSmsRecipientsDraft] = useState('');
  const [smsMessageDraft, setSmsMessageDraft] = useState('');
  const [bulkSmsMessageDraft, setBulkSmsMessageDraft] = useState('');
  const [sendingSms, setSendingSms] = useState(false);
  const [sendingBulkSms, setSendingBulkSms] = useState(false);
  const [sendingBillReminders, setSendingBillReminders] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittingNote, setSubmittingNote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bulkActionResult, setBulkActionResult] = useState<BulkActionResult | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadSupportSetup = async () => {
      try {
        const [tenantResponse, senderResponse] = await Promise.all([
          api.get<{ tenants: TenantSummary[] }>('/tenants', {
            params: {
              page: 1,
              limit: 100,
            },
          }),
          api.get<{ sender: PlatformSmsSenderProfile }>('/support/sms-sender'),
        ]);

        if (cancelled) {
          return;
        }

        setTenants(tenantResponse.data.tenants);
        setPlatformSmsSender(senderResponse.data.sender);
        setSelectedTenantId((current) => current || String(tenantResponse.data.tenants[0]?.id ?? ''));
      } catch (err) {
        console.error('Failed to load support setup:', err);
      }
    };

    loadSupportSetup();

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

  const smsRecipientCount = useMemo(
    () =>
      smsRecipientsDraft
        .split(/[\n,;]+/)
        .map((value) => value.trim())
        .filter(Boolean).length,
    [smsRecipientsDraft]
  );

  const handleTenantSelection = (nextTenantId: string) => {
    setSelectedTenantId(nextTenantId);
    const nextTenant = tenants.find((tenant) => String(tenant.id) === nextTenantId) ?? null;
    setSmsRecipientsDraft((current) => (current.trim() ? current : nextTenant?.phoneNumber ?? ''));
  };

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

  const sendPlatformSms = async () => {
    if (!selectedTenantId) {
      setError('Select a tenant before sending an SMS.');
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
        tenantId: Number(selectedTenantId),
        recipients: smsRecipientsDraft,
        message: smsMessageDraft.trim(),
      });

      setSmsMessageDraft('');
      setSuccess(`${response.data.message} for ${selectedTenant?.name ?? 'the selected tenant'}.`);
      setRefreshKey((value) => value + 1);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to send platform SMS');
    } finally {
      setSendingSms(false);
    }
  };

  const sendBulkTenantAdminSms = async () => {
    if (!bulkSmsMessageDraft.trim()) {
      setError('Enter the bulk SMS message before sending.');
      return;
    }

    setSendingBulkSms(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post<{ message: string; summary: PlatformBulkSmsSummary }>(
        '/support/send-bulk-sms',
        {
          message: bulkSmsMessageDraft.trim(),
        }
      );

      setBulkSmsMessageDraft('');
      setBulkActionResult({
        title: 'Bulk Tenant Admin SMS',
        summary: response.data.summary,
      });
      setSuccess(response.data.message);
      setRefreshKey((value) => value + 1);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to send bulk tenant-admin SMS');
    } finally {
      setSendingBulkSms(false);
    }
  };

  const sendBillRemindersToAllTenantAdmins = async () => {
    setSendingBillReminders(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post<{ message: string; summary: PlatformBulkSmsSummary }>(
        '/support/send-bill-reminders',
        {}
      );

      setBulkActionResult({
        title: 'Tenant Billing Reminders',
        summary: response.data.summary,
      });
      setSuccess(response.data.message);
      setRefreshKey((value) => value + 1);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to send tenant billing reminders');
    } finally {
      setSendingBillReminders(false);
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
        title="Communication"
        subtitle="Bulk tenant-admin SMS, billing reminders, tenant outreach, and platform support activity."
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
              Tenant Communication
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Super-admin SMS uses the SMS config from tenant {platformSmsSender?.tenantId ?? 2}
              {platformSmsSender ? ` (${platformSmsSender.tenantName})` : ''} with partner ID{' '}
              {platformSmsSender?.partnerId ?? '4680'}.
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Tenant"
                value={selectedTenantId}
                onChange={(event) => handleTenantSelection(event.target.value)}
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
                minRows={2}
                label="Recipients"
                placeholder="0700000000, 0711111111"
                value={smsRecipientsDraft}
                onChange={(event) => setSmsRecipientsDraft(event.target.value)}
                helperText={
                  selectedTenant?.phoneNumber
                    ? `Selected tenant primary contact: ${selectedTenant.phoneNumber}. Use commas or new lines for multiple recipients.`
                    : 'Use commas or new lines to separate multiple recipients.'
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={4}
                label="SMS Message"
                placeholder="Write the tenant update, reminder, or follow-up."
                value={smsMessageDraft}
                onChange={(event) => setSmsMessageDraft(event.target.value)}
              />
            </Grid>
          </Grid>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button
              variant="outlined"
              disabled={!selectedTenant?.phoneNumber}
              onClick={() => setSmsRecipientsDraft(selectedTenant?.phoneNumber ?? '')}
            >
              Use tenant contact
            </Button>
            <Button
              variant="contained"
              onClick={sendPlatformSms}
              disabled={sendingSms || !selectedTenantId}
            >
              {sendingSms ? 'Sending SMS...' : `Send SMS${smsRecipientCount ? ` (${smsRecipientCount})` : ''}`}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="overline" color="primary">
              Bulk Tenant Admin Communication
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Broadcast to all tenant admins from the same sender profile, or send bill reminders to
              every tenant with open platform invoices.
            </Typography>
          </Box>
          <TextField
            fullWidth
            multiline
            minRows={4}
            label="Bulk SMS Message"
            placeholder="Write the cross-tenant update, announcement, or operational notice."
            value={bulkSmsMessageDraft}
            onChange={(event) => setBulkSmsMessageDraft(event.target.value)}
            helperText={`Targets active tenant-admin users across ${tenants.length} tenant(s). If a tenant has no admin phone, the tenant contact on file is used as a fallback.`}
          />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <Button variant="contained" onClick={sendBulkTenantAdminSms} disabled={sendingBulkSms}>
              {sendingBulkSms ? 'Sending bulk SMS...' : 'Send SMS To All Tenant Admins'}
            </Button>
            <Button
              variant="outlined"
              color="warning"
              onClick={sendBillRemindersToAllTenantAdmins}
              disabled={sendingBillReminders}
            >
              {sendingBillReminders ? 'Sending bill reminders...' : 'Send Bills To All Tenant Admins'}
            </Button>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Billing reminders use paybill {bulkActionResult?.summary.paybill ?? '4091081'} and the
            tenant admin phone number as the payment account reference.
          </Typography>
          {bulkActionResult ? (
            <Alert severity="info">
              <Stack spacing={1}>
                <Typography variant="subtitle2">{bulkActionResult.title}</Typography>
                <Typography variant="body2">
                  Targeted {bulkActionResult.summary.tenantCount} tenant(s), {bulkActionResult.summary.recipientCount}{' '}
                  recipient(s), {bulkActionResult.summary.sentCount} sent, {bulkActionResult.summary.failedCount}{' '}
                  failed, {bulkActionResult.summary.skippedCount} skipped.
                </Typography>
                {bulkActionResult.summary.skippedTenants.length ? (
                  <Box>
                    <Typography variant="body2" fontWeight={700}>
                      Skipped tenants
                    </Typography>
                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      {bulkActionResult.summary.skippedTenants.slice(0, 6).map((tenant) => (
                        <Typography key={`${bulkActionResult.title}-${tenant.tenantId}`} variant="body2">
                          {tenant.tenantName}: {tenant.reason}
                          {tenant.outstandingAmount ? ` (${formatCurrencyAmount(tenant.outstandingAmount)})` : ''}
                          {tenant.primaryInvoiceNumber ? ` ref ${tenant.primaryInvoiceNumber}` : ''}
                        </Typography>
                      ))}
                      {bulkActionResult.summary.skippedTenants.length > 6 ? (
                        <Typography variant="body2">
                          {bulkActionResult.summary.skippedTenants.length - 6} more tenant(s) skipped.
                        </Typography>
                      ) : null}
                    </Stack>
                  </Box>
                ) : null}
              </Stack>
            </Alert>
          ) : null}
        </Stack>
      </Paper>

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
                onChange={(event) => handleTenantSelection(event.target.value)}
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
