import { Alert, Paper, Stack, Typography } from '@mui/material';
import PageHeader from '../../components/PageHeader';

type PlannedPageProps = {
  title: string;
  summary: string;
};

const PlannedPage = ({ title, summary }: PlannedPageProps) => {
  return (
    <Stack spacing={3}>
      <PageHeader title={title} subtitle={summary} />
      <Paper sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          This section is intentionally scaffolded, but its backend slice is still reserved for a later phase.
        </Alert>
        <Typography variant="body1" color="text.secondary">
          The foundation implemented in this pass covers platform authentication, the separate admin layout,
          tenant discovery, tenant detail, and tenant status management.
        </Typography>
      </Paper>
    </Stack>
  );
};

export default PlannedPage;
