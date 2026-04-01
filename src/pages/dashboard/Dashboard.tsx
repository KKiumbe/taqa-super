import { useEffect, useState } from 'react';
import { Alert, Button, Grid, Paper, Stack, Typography } from '@mui/material';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
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

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Dashboard"
        subtitle="Platform-wide KPI rollup across tenants, billing posture, and recent login activity."
        action={
          <Button
            variant="contained"
            endIcon={<ChevronRightRoundedIcon />}
            onClick={() => navigate('/tenants')}
          >
            Review tenants
          </Button>
        }
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} xl={2}>
          <KpiCard
            label="Total Tenants"
            value={overview ? compactNumberFormatter.format(overview.totalTenants) : '...'}
            helper="All tenants on the platform"
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={2}>
          <KpiCard
            label="Active Tenants"
            value={overview ? compactNumberFormatter.format(overview.activeTenants) : '...'}
            helper="Tenants currently in service"
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
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={2}>
          <KpiCard
            label="MRR"
            value={overview ? currencyFormatter.format(overview.mrr) : '...'}
            helper="Invoice amount for the current month"
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={2}>
          <KpiCard
            label="Unpaid Invoices"
            value={overview ? overview.unpaidInvoiceCount : '...'}
            helper={overview ? currencyFormatter.format(overview.unpaidInvoiceAmount) : 'Outstanding balance'}
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={2}>
          <KpiCard
            label="Active Users (30d)"
            value={overview ? compactNumberFormatter.format(overview.activeUsersLast30Days) : '...'}
            helper="Distinct users with activity in the last 30 days"
          />
        </Grid>
      </Grid>

      {loading && !data ? <Typography color="text.secondary">Loading dashboard metrics...</Typography> : null}

      {charts ? (
        <Grid container spacing={2}>
          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="overline" color="primary">
                Tenant Growth
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                New tenant acquisition and cumulative footprint over the last six months.
              </Typography>
              <LineChart
                height={300}
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
                margin={{ left: 56, right: 24, top: 24, bottom: 24 }}
              />
            </Paper>
          </Grid>
          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="overline" color="primary">
                Revenue Per Month
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Invoice volume across recent months.
              </Typography>
              <BarChart
                height={300}
                xAxis={[{ scaleType: 'band', data: charts.revenueByMonth.map((item) => item.label) }]}
                series={[
                  {
                    data: charts.revenueByMonth.map((item) => item.invoiceAmount),
                    label: 'Invoices',
                    color: theme.palette.primary.main,
                  },
                ]}
                margin={{ left: 56, right: 24, top: 24, bottom: 24 }}
              />
            </Paper>
          </Grid>
          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="overline" color="primary">
                Payments Vs Invoices
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Collections compared with invoiced value by month.
              </Typography>
              <BarChart
                height={300}
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
                margin={{ left: 56, right: 24, top: 24, bottom: 24 }}
              />
            </Paper>
          </Grid>
          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="overline" color="primary">
                Login Activity
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Daily login volume and active-user participation over the last 30 days.
              </Typography>
              <LineChart
                height={300}
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
                margin={{ left: 56, right: 24, top: 24, bottom: 24 }}
              />
            </Paper>
          </Grid>
        </Grid>
      ) : null}
    </Stack>
  );
};

export default Dashboard;
