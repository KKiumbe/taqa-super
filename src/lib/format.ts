export const currencyFormatter = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  maximumFractionDigits: 0,
});

export const compactNumberFormatter = new Intl.NumberFormat('en-KE', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export const shortDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export const riskLabelMap: Record<string, string> = {
  NO_ACTIVITY_30_DAYS: 'No activity in 30 days',
  NO_LOGIN_30_DAYS: 'No login in 30 days',
  NO_PAYMENT_60_DAYS: 'No payment in 60 days',
};

export const formatRiskFlag = (flag: string): string => {
  if (riskLabelMap[flag]) {
    return riskLabelMap[flag];
  }

  return flag
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export const formatDate = (value: string | null | undefined, fallback = 'Not available'): string => {
  if (!value) {
    return fallback;
  }

  return shortDateFormatter.format(new Date(value));
};

export const formatDateTime = (
  value: string | null | undefined,
  fallback = 'Not available'
): string => {
  if (!value) {
    return fallback;
  }

  return dateTimeFormatter.format(new Date(value));
};
