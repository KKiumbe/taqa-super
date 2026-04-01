import { Paper, Stack, Typography } from '@mui/material';

type KpiCardProps = {
  label: string;
  value: string | number;
  helper?: string;
};

const KpiCard = ({ label, value, helper }: KpiCardProps) => {
  return (
    <Paper sx={{ p: 2.5 }}>
      <Stack spacing={0.5}>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4">{value}</Typography>
        {helper ? (
          <Typography variant="body2" color="text.secondary">
            {helper}
          </Typography>
        ) : null}
      </Stack>
    </Paper>
  );
};

export default KpiCard;
