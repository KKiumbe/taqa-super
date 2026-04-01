import { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

const PageHeader = ({ title, subtitle, action }: PageHeaderProps) => {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      alignItems={{ xs: 'flex-start', md: 'center' }}
      justifyContent="space-between"
      sx={{ mb: 3 }}
    >
      <Box>
        <Typography variant="h4" sx={{ lineHeight: 1.05 }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 760 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {action}
    </Stack>
  );
};

export default PageHeader;
