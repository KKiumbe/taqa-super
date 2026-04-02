import { Box, Paper, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

type KpiCardProps = {
  label: string;
  value: string | number;
  helper?: string;
  accent?: 'primary' | 'secondary' | 'success' | 'warning' | 'info';
};

const KpiCard = ({ label, value, helper, accent = 'primary' }: KpiCardProps) => {
  const theme = useTheme();
  const accentColor = theme.palette[accent].main;

  return (
    <Paper
      sx={{
        p: 2.5,
        minHeight: '100%',
        position: 'relative',
        overflow: 'hidden',
        borderColor: alpha(accentColor, 0.24),
        background: `linear-gradient(180deg, ${alpha('#ffffff', 0.96)} 0%, ${alpha(
          theme.palette.background.paper,
          0.94
        )} 100%)`,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 18,
          right: 18,
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: alpha(accentColor, 0.1),
        }}
      />
      <Stack spacing={0.75} sx={{ position: 'relative', zIndex: 1 }}>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4" sx={{ lineHeight: 1.05 }}>
          {value}
        </Typography>
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
