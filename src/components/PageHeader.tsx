import { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  eyebrow?: string;
};

const PageHeader = ({ title, subtitle, action, eyebrow = 'Workspace' }: PageHeaderProps) => {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2.5}
      alignItems={{ xs: 'flex-start', md: 'center' }}
      justifyContent="space-between"
      sx={(theme) => ({
        mb: 3,
        p: { xs: 2.25, md: 3 },
        borderRadius: 5,
        border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
        background: `linear-gradient(135deg, ${alpha('#ffffff', 0.92)} 0%, ${alpha(
          theme.palette.background.paper,
          0.98
        )} 58%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`,
        boxShadow: '0 24px 70px rgba(24, 48, 51, 0.07)',
      })}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="overline" color="primary">
          {eyebrow}
        </Typography>
        <Typography variant="h4" sx={{ lineHeight: 1.05 }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 760 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {action ? (
        <Box
          sx={{
            width: { xs: '100%', md: 'auto' },
            maxWidth: '100%',
          }}
        >
          {action}
        </Box>
      ) : null}
    </Stack>
  );
};

export default PageHeader;
