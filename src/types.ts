export type TenantStatus = 'ACTIVE' | 'DISABLED' | 'EXPIRED';

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
