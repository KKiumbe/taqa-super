import { Chip } from '@mui/material';
import { TenantStatus } from '../types';

type StatusChipProps = {
  status: TenantStatus | string;
};

const statusMap: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  ACTIVE: { label: 'Active', color: 'success' },
  DISABLED: { label: 'Disabled', color: 'error' },
  EXPIRED: { label: 'Expired', color: 'warning' },
};

const StatusChip = ({ status }: StatusChipProps) => {
  const config = statusMap[status] ?? {
    label: status,
    color: 'default' as const,
  };

  return <Chip size="small" label={config.label} color={config.color} variant="filled" />;
};

export default StatusChip;
