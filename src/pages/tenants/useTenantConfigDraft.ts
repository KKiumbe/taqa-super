import { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import { TenantDetail, TenantSummary } from '../../types';

export type TenantConfigDraft = {
  smsPartnerId: string;
  smsShortCode: string;
  smsSupportPhone: string;
  smsChildId: string;
  smsApiKey: string;
  mpesaShortCode: string;
  mpesaName: string;
  mpesaApiKey: string;
  mpesaPassKey: string;
  mpesaSecretKey: string;
};

const emptyDraft: TenantConfigDraft = {
  smsPartnerId: '',
  smsShortCode: '',
  smsSupportPhone: '',
  smsChildId: '',
  smsApiKey: '',
  mpesaShortCode: '',
  mpesaName: '',
  mpesaApiKey: '',
  mpesaPassKey: '',
  mpesaSecretKey: '',
};

const toNullable = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const buildTenantConfigDraft = (tenant: TenantDetail): TenantConfigDraft => ({
  smsPartnerId: tenant.smsConfig?.partnerId || '',
  smsShortCode: tenant.smsConfig?.shortCode || '',
  smsSupportPhone: tenant.smsConfig?.customerSupportPhoneNumber || '',
  smsChildId: tenant.smsConfig?.childId || '',
  smsApiKey: '',
  mpesaShortCode: tenant.mpesaConfig?.shortCode || '',
  mpesaName: tenant.mpesaConfig?.name || '',
  mpesaApiKey: '',
  mpesaPassKey: '',
  mpesaSecretKey: '',
});

export const useTenantConfigDraft = (initialTenantId?: string) => {
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>(initialTenantId ?? '');
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [draft, setDraft] = useState<TenantConfigDraft>(emptyDraft);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTenantId) {
      setSelectedTenantId(initialTenantId);
    }
  }, [initialTenantId]);

  useEffect(() => {
    let cancelled = false;

    const loadTenants = async () => {
      try {
        const response = await api.get<{ tenants: TenantSummary[] }>('/tenants', {
          params: { page: 1, limit: 250 },
        });

        if (cancelled) {
          return;
        }

        const sorted = [...response.data.tenants].sort((a, b) => a.name.localeCompare(b.name));
        setTenants(sorted);
        setSelectedTenantId((current) => current || String(sorted[0]?.id ?? ''));
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message ?? 'Failed to load tenants');
        }
      }
    };

    loadTenants();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedTenantId) {
      setTenant(null);
      setDraft(emptyDraft);
      return;
    }

    let cancelled = false;

    const loadTenant = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get<{ tenant: TenantDetail }>(`/tenants/${selectedTenantId}`);
        if (cancelled) {
          return;
        }
        setTenant(response.data.tenant);
        setDraft(buildTenantConfigDraft(response.data.tenant));
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message ?? 'Failed to load tenant');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadTenant();

    return () => {
      cancelled = true;
    };
  }, [selectedTenantId]);

  const refreshTenant = async (tenantId: number): Promise<void> => {
    const response = await api.get<{ tenant: TenantDetail }>(`/tenants/${tenantId}`);
    setTenant(response.data.tenant);
    setDraft(buildTenantConfigDraft(response.data.tenant));
  };

  const tenantOptions = useMemo(() => {
    return tenants.map((option) => ({
      id: option.id,
      name: option.name,
    }));
  }, [tenants]);

  return {
    tenants,
    tenantOptions,
    selectedTenantId,
    setSelectedTenantId,
    tenant,
    draft,
    setDraft,
    loading,
    error,
    setError,
    refreshTenant,
  };
};
