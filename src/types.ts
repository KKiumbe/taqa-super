export type TenantStatus = 'ACTIVE' | 'DISABLED' | 'EXPIRED';
export type InvoiceStatus = 'UNPAID' | 'PAID' | 'PPAID' | 'CANCELLED';
export type ConfigStatus = 'CONFIGURED' | 'PARTIAL' | 'MISSING';
export type BillingRecordSource = 'PLATFORM' | 'LEGACY_CUSTOMER';

export interface PlatformAdminProfile {
  adminId: number;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  status?: string;
}

export interface PlanSummary {
  id: number | null;
  name: string;
  code: string | null;
  priceMonthly: number;
  maxUsers: number | null;
  active: boolean;
  legacyName: string;
}

export interface TenantSummary {
  id: number;
  name: string;
  status: TenantStatus;
  email: string | null;
  phoneNumber: string | null;
  county: string | null;
  town: string | null;
  allowedUsers: number;
  createdAt: string;
  updatedAt: string;
  plan: PlanSummary;
  userCount: number;
  customerCount: number;
  invoiceCount: number;
  paymentCount: number;
}

export interface TenantNote {
  id: string;
  note: string;
  createdAt: string;
  admin: {
    id: number;
    name: string;
    email: string;
  };
}

export interface TenantDetail {
  id: number;
  name: string;
  createdBy: string;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
  email: string | null;
  phoneNumber: string | null;
  alternativePhoneNumber: string | null;
  county: string | null;
  town: string | null;
  address: string | null;
  building: string | null;
  street: string | null;
  website: string | null;
  logoUrl: string | null;
  allowedUsers: number;
  paymentDetails: string | null;
  numberOfBags: number | null;
  subscription: PlanSummary;
  counters: {
    users: number;
    customers: number;
    tenantInvoices: number;
    tenantPayments: number;
  };
  engagement: {
    lastActivityAt: string | null;
    lastLoginAt: string | null;
    actionsLast30Days: number;
    activeUsersLast30Days: number;
    riskFlags: string[];
  };
  latestPayment: {
    id: string;
    amount: number;
    createdAt: string;
    modeOfPayment: string;
    transactionId: string | null;
  } | null;
  latestInvoice: {
    id: string;
    invoiceAmount: number;
    amountPaid: number;
    createdAt: string;
    invoiceNumber: string;
    invoicePeriod: string;
    status: string;
  } | null;
  notes: TenantNote[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BillingTrendPoint {
  key: string;
  label: string;
  invoiceAmount: number;
  paymentAmount: number;
}

export interface LoginTrendPoint {
  key: string;
  label: string;
  loginCount: number;
  activeUsers: number;
  activeTenants: number;
}

export interface DashboardOverview {
  totalTenants: number;
  activeTenants: number;
  disabledTenants: number;
  expiredTenants: number;
  mrr: number;
  unpaidInvoiceCount: number;
  unpaidInvoiceAmount: number;
  activeUsersLast30Days: number;
}

export interface DashboardCharts {
  tenantGrowth: Array<{
    key: string;
    label: string;
    newTenants: number;
    totalTenants: number;
  }>;
  revenueByMonth: BillingTrendPoint[];
  paymentsVsInvoices: BillingTrendPoint[];
  loginActivity: LoginTrendPoint[];
}

export interface DashboardPayload {
  overview: DashboardOverview;
  charts: DashboardCharts;
}

export interface RevenueSummary {
  mrr: number;
  collectionsThisMonth: number;
  totalInvoiceAmount: number;
  totalAmountPaidOnInvoices: number;
  totalPaymentsReceived: number;
  totalInvoices: number;
  totalPayments: number;
  unpaidInvoiceCount: number;
  unpaidInvoiceAmount: number;
  activeTenants: number;
}

export interface RevenueSummaryPayload {
  summary: RevenueSummary;
  revenueByMonth: BillingTrendPoint[];
  paymentsVsInvoices: BillingTrendPoint[];
}

export interface PlatformInvoice {
  id: string;
  tenantId: number;
  tenantName: string;
  tenantStatus: TenantStatus;
  invoiceNumber: string;
  invoicePeriod: string;
  invoiceAmount: number;
  amountPaid: number;
  balance: number;
  status: InvoiceStatus;
  source: BillingRecordSource;
  legacyCustomerId: string | null;
  legacyCustomerName: string | null;
  legacyInvoiceId: string | null;
  createdAt: string;
  updatedAt: string;
  plan: PlanSummary;
  paymentCount: number;
  latestPaymentAt: string | null;
}

export interface PlatformPayment {
  id: string;
  tenantId: number;
  tenantName: string;
  tenantStatus: TenantStatus;
  tenantInvoiceId: string;
  invoiceNumber: string | null;
  invoiceStatus: InvoiceStatus | null;
  amount: number;
  modeOfPayment: string;
  transactionId: string | null;
  source: BillingRecordSource;
  legacyCustomerId: string | null;
  legacyCustomerName: string | null;
  legacyPaymentId: string | null;
  legacyReceiptId: string | null;
  linkedInvoiceNumbers: string[];
  linkedInvoiceCount: number;
  createdAt: string;
}

export interface UsageTenant {
  tenantId: number;
  name: string;
  status: TenantStatus;
  plan: PlanSummary;
  userCount: number;
  customerCount: number;
  allowedUsers: number;
  createdAt: string;
  lastActivityAt: string | null;
  lastLoginAt: string | null;
  lastPaymentAt: string | null;
  actionsLast30Days: number;
  activeUsersLast30Days: number;
  engagementScore: number;
  riskFlags: string[];
}

export interface LoginActivityPayload {
  trend: LoginTrendPoint[];
  totals: {
    loginCount: number;
    activeUsers: number;
  };
  topTenants: Array<{
    tenantId: number;
    name: string;
    status: string;
    loginCount: number;
  }>;
}

export interface SmsConfigItem {
  tenantId: number;
  tenantName: string;
  tenantStatus: TenantStatus;
  configStatus: ConfigStatus;
  config: {
    id: number | string;
    partnerId?: string | null;
    shortCode?: string | null;
    customerSupportPhoneNumber?: string | null;
    childId?: string | null;
    updatedAt: string;
  } | null;
}

export interface MpesaConfigItem {
  tenantId: number;
  tenantName: string;
  tenantStatus: TenantStatus;
  configStatus: ConfigStatus;
  config: {
    id: number | string;
    shortCode?: string | null;
    name?: string | null;
    updatedAt: string;
  } | null;
}

export interface SmsUsageItem {
  tenantId: number;
  tenantName: string;
  tenantStatus: TenantStatus;
  purchasedUnits: number;
  purchaseAmount: number;
  consumedMessages: number;
  failedMessages: number;
  lastPurchaseAt: string | null;
  lastMessageAt: string | null;
}

export interface MpesaTransactionItem {
  tenantId: number;
  tenantName: string;
  tenantStatus: TenantStatus;
  totalTransactions: number;
  processedTransactions: number;
  unprocessedTransactions: number;
  totalAmount: number;
  lastTransactionAt: string | null;
  successRate: number;
}

export interface AuditLogRow {
  id: string;
  action: string;
  resource: string;
  description: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  tenant: {
    id: number;
    name: string;
    status: TenantStatus;
  };
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export interface PlatformActionLogRow {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  admin: {
    id: number;
    name: string;
    email: string;
  };
}
