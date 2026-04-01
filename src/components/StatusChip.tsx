import { Chip } from '@mui/material';
import { TenantStatus } from '../types';

type StatusChipProps = {
  status: TenantStatus | string;
};

const statusMap: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  ACTIVE: { label: 'Active', color: 'success' },
  DISABLED: { label: 'Disabled', color: 'error' },
  EXPIRED: { label: 'Expired', color: 'warning' },
  CONFIGURED: { label: 'Configured', color: 'success' },
  PARTIAL: { label: 'Partial', color: 'warning' },
  MISSING: { label: 'Missing', color: 'error' },
  PAID: { label: 'Paid', color: 'success' },
  PPAID: { label: 'Partially paid', color: 'warning' },
  UNPAID: { label: 'Unpaid', color: 'error' },
  CANCELLED: { label: 'Cancelled', color: 'default' },
  COMPLETED: { label: 'Completed', color: 'success' },
  UNKNOWN: { label: 'Unknown', color: 'default' },
};

const StatusChip = ({ status }: StatusChipProps) => {
  const config = statusMap[status] ?? {
    label: status,
    color: 'default' as const,
  };

  return <Chip size="small" label={config.label} color={config.color} variant="filled" />;
};

export default StatusChip;
