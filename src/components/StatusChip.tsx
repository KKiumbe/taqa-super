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
  AVAILABLE: { label: 'Available', color: 'success' },
  PARTIAL: { label: 'Partial', color: 'warning' },
  MISSING: { label: 'Missing', color: 'error' },
  ERROR: { label: 'Error', color: 'error' },
  PAID: { label: 'Paid', color: 'success' },
  PPAID: { label: 'Partially paid', color: 'warning' },
  UNPAID: { label: 'Unpaid', color: 'error' },
  CANCELLED: { label: 'Cancelled', color: 'default' },
  COMPLETED: { label: 'Completed', color: 'success' },
  FAILED: { label: 'Failed', color: 'error' },
  PENDING: { label: 'Pending', color: 'warning' },
  MATCHED: { label: 'Matched', color: 'success' },
  PAID_NOT_CREDITED: { label: 'Paid Not Credited', color: 'warning' },
  AWAITING_PAYMENT: { label: 'Awaiting Payment', color: 'default' },
  PAYMENT_RECEIVED_CREDIT_FAILED: { label: 'Credit Failed', color: 'error' },
  COMPLETED_NO_PAYMENT_LINK: { label: 'Credited', color: 'success' },
  PROCESSED: { label: 'Processed', color: 'success' },
  UNPROCESSED: { label: 'Unprocessed', color: 'warning' },
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
