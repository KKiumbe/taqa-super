import { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, Grid, Paper, Stack, Typography, useMediaQuery } from '@mui/material';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import { useNavigate } from 'react-router-dom';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { useTheme } from '@mui/material/styles';
import PageHeader from '../../components/PageHeader';
import KpiCard from '../../components/KpiCard';
import { api } from '../../services/api';
import { DashboardPayload } from '../../types';
import { compactNumberFormatter, currencyFormatter } from '../../lib/format';

const Dashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get<DashboardPayload>('/dashboard');
        if (!cancelled) {
          setData(response.data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message ?? 'Failed to load dashboard data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const overview = data?.overview;
  const charts = data?.charts;
  const chartHeight = isCompact ? 240 : 300;
  const recoveryCount = overview ? overview.disabledTenants + overview.expiredTenants : 0;

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Dashboard"
        subtitle="Platform-wide KPI rollup across tenants, billing posture, and recent login activity."
        action={
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
            <Button
              variant="contained"
              endIcon={<ChevronRightRoundedIcon />}
              onClick={() => navigate('/tenants')}
            >
              Review tenants
            </Button>
            <Button
              variant="outlined"
              startIcon={<PaymentsRoundedIcon />}
              onClick={() => navigate('/billing')}
            >
              Open billing
            </Button>
          </Stack>
        }
        eyebrow="Executive View"
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      {overview ? (
        <Paper
          sx={{
            p: { xs: 2.5, md: 3.25 },
            overflow: 'hidden',
            background: `linear-gradient(135deg, rgba(24,48,51,0.96) 0%, rgba(32,75,77,0.94) 56%, rgba(201,104,58,0.88) 100%)`,
            color: 'common.white',
          }}
        >
          <Stack spacing={3}>
            <Stack spacing={2.25}>
              <Box>
                <Typography variant="overline" sx={{ opacity: 0.75 }}>
                  Operations Brief
                </Typography>
                <Typography variant="h3" sx={{ color: 'common.white', mt: 0.75, maxWidth: 720 }}>
                  {recoveryCount
                    ? `${recoveryCount} tenant account${recoveryCount === 1 ? '' : 's'} need follow-up.`
                    : 'Platform health is steady across the tenant base.'}
                </Typography>
                <Typography variant="body1" sx={{ mt: 1.25, maxWidth: 760, opacity: 0.82 }}>
                  Monitor subscription performance, quickly spot collection gaps, and jump straight
                  into the tenant queue that needs action today.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Chip
                  label={`${compactNumberFormatter.format(overview.activeTenants)} active tenants`}
                  sx={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'common.white' }}
                />
                <Chip
                  label={`${overview.unpaidInvoiceCount} unpaid invoice${overview.unpaidInvoiceCount === 1 ? '' : 's'}`}
                  sx={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'common.white' }}
                />
                <Chip
                  label={`${compactNumberFormatter.format(overview.activeUsersLast30Days)} active users in 30d`}
                  sx={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'common.white' }}
                />
              </Stack>
            </Stack>

            <Grid container spacing={1.5}>
              <Grid item xs={12} md={4}>
                <Paper
                  sx={{
                    p: 2,
                    minHeight: '100%',
                    backgroundColor: 'rgba(255,255,255,0.12)',
                    color: 'inherit',
                    borderColor: 'rgba(255,255,255,0.12)',
                  }}
                >
                  <Typography variant="overline" sx={{ opacity: 0.72 }}>
                    Monthly Revenue
                  </Typography>
                  <Typography variant="h5" sx={{ color: 'common.white', mt: 0.5 }}>
                    {currencyFormatter.format(overview.mrr)}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Current-month invoice value.
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper
                  sx={{
                    p: 2,
                    minHeight: '100%',
                    backgroundColor: 'rgba(255,255,255,0.12)',
                    color: 'inherit',
                    borderColor: 'rgba(255,255,255,0.12)',
                  }}
                >
                  <Typography variant="overline" sx={{ opacity: 0.72 }}>
                    Outstanding Balance
                  </Typography>
                  <Typography variant="h5" sx={{ color: 'common.white', mt: 0.5 }}>
                    {currencyFormatter.format(overview.unpaidInvoiceAmount)}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Across unpaid platform invoices.
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper
                  sx={{
                    p: 2,
                    minHeight: '100%',
                    backgroundColor: 'rgba(255,255,255,0.12)',
                    color: 'inherit',
                    borderColor: 'rgba(255,255,255,0.12)',
                  }}
                >
                  <Typography variant="overline" sx={{ opacity: 0.72 }}>
                    Recovery Queue
                  </Typography>
                  <Typography variant="h5" sx={{ color: 'common.white', mt: 0.5 }}>
                    {compactNumberFormatter.format(recoveryCount)}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Disabled or expired tenants awaiting intervention.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Stack>
        </Paper>
      ) : null}

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} xl={2}>
          <KpiCard
            label="Total Tenants"
            value={overview ? compactNumberFormatter.format(overview.totalTenants) : '...'}
            helper="All tenants on the platform"
            accent="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={2}>
          <KpiCard
            label="Active Tenants"
            value={overview ? compactNumberFormatter.format(overview.activeTenants) : '...'}
            helper="Tenants currently in service"
            accent="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={2}>
          <KpiCard
            label="Disabled / Expired"
            value={
              overview
                ? compactNumberFormatter.format(overview.disabledTenants + overview.expiredTenants)
                : '...'
            }
            helper="Tenants needing recovery or follow-up"
            accent="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={2}>
          <KpiCard
            label="MRR"
            value={overview ? currencyFormatter.format(overview.mrr) : '...'}
            helper="Invoice amount for the current month"
            accent="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={2}>
          <KpiCard
            label="Unpaid Invoices"
            value={overview ? overview.unpaidInvoiceCount : '...'}
            helper={overview ? currencyFormatter.format(overview.unpaidInvoiceAmount) : 'Outstanding balance'}
            accent="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={2}>
          <KpiCard
            label="Active Users (30d)"
            value={overview ? compactNumberFormatter.format(overview.activeUsersLast30Days) : '...'}
            helper="Distinct users with activity in the last 30 days"
            accent="info"
          />
        </Grid>
      </Grid>

      {loading && !data ? <Typography color="text.secondary">Loading dashboard metrics...</Typography> : null}

      {charts ? (
        <Grid container spacing={2}>
          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: { xs: 2.25, md: 3 }, minHeight: '100%' }}>
              <Typography variant="overline" color="primary">
                Tenant Growth
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                New tenant acquisition and cumulative footprint over the last six months.
              </Typography>
              <LineChart
                height={chartHeight}
                xAxis={[{ scaleType: 'point', data: charts.tenantGrowth.map((item) => item.label) }]}
                series={[
                  {
                    data: charts.tenantGrowth.map((item) => item.totalTenants),
                    label: 'Total tenants',
                    color: theme.palette.primary.main,
                  },
                  {
                    data: charts.tenantGrowth.map((item) => item.newTenants),
                    label: 'New tenants',
                    color: theme.palette.secondary.main,
                  },
                ]}
                margin={{ left: isCompact ? 36 : 56, right: 12, top: 24, bottom: 24 }}
              />
            </Paper>
          </Grid>
          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: { xs: 2.25, md: 3 }, minHeight: '100%' }}>
              <Typography variant="overline" color="primary">
                Revenue Per Month
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Invoice volume across recent months.
              </Typography>
              <BarChart
                height={chartHeight}
                xAxis={[{ scaleType: 'band', data: charts.revenueByMonth.map((item) => item.label) }]}
                series={[
                  {
                    data: charts.revenueByMonth.map((item) => item.invoiceAmount),
                    label: 'Invoices',
                    color: theme.palette.primary.main,
                  },
                ]}
                margin={{ left: isCompact ? 36 : 56, right: 12, top: 24, bottom: 24 }}
              />
            </Paper>
          </Grid>
          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: { xs: 2.25, md: 3 }, minHeight: '100%' }}>
              <Typography variant="overline" color="primary">
                Payments Vs Invoices
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Collections compared with invoiced value by month.
              </Typography>
              <BarChart
                height={chartHeight}
                xAxis={[{ scaleType: 'band', data: charts.paymentsVsInvoices.map((item) => item.label) }]}
                series={[
                  {
                    data: charts.paymentsVsInvoices.map((item) => item.invoiceAmount),
                    label: 'Invoices',
                    color: theme.palette.primary.main,
                  },
                  {
                    data: charts.paymentsVsInvoices.map((item) => item.paymentAmount),
                    label: 'Payments',
                    color: theme.palette.secondary.main,
                  },
                ]}
                margin={{ left: isCompact ? 36 : 56, right: 12, top: 24, bottom: 24 }}
              />
            </Paper>
          </Grid>
          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: { xs: 2.25, md: 3 }, minHeight: '100%' }}>
              <Typography variant="overline" color="primary">
                Login Activity
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Daily login volume and active-user participation over the last 30 days.
              </Typography>
              <LineChart
                height={chartHeight}
                xAxis={[{ scaleType: 'point', data: charts.loginActivity.map((item) => item.label) }]}
                series={[
                  {
                    data: charts.loginActivity.map((item) => item.loginCount),
                    label: 'Logins',
                    color: theme.palette.primary.main,
                  },
                  {
                    data: charts.loginActivity.map((item) => item.activeUsers),
                    label: 'Active users',
                    color: theme.palette.info.main,
                  },
                ]}
                margin={{ left: isCompact ? 36 : 56, right: 12, top: 24, bottom: 24 }}
              />
            </Paper>
          </Grid>
        </Grid>
      ) : null}
    </Stack>
  );
};

export default Dashboard;
