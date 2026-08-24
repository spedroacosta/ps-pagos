export function getTenantHeaders(): Record<string, string> {
  const tenantId = sessionStorage.getItem('tenantId') || localStorage.getItem('tenantId') || '';
  const tenantAuth = sessionStorage.getItem('tenantAuth') || localStorage.getItem('tenantAuth') || '';
  const sessionId = sessionStorage.getItem('sessionId') || '';
  return {
    'x-tenant-id': tenantId,
    'x-tenant-auth': tenantAuth,
    'x-session-id': sessionId,
  };
}

export function clearTenantCredentials() {
  sessionStorage.removeItem('tenantId');
  sessionStorage.removeItem('tenantAuth');
  sessionStorage.removeItem('tenantName');
  sessionStorage.removeItem('sessionId');
  sessionStorage.removeItem('tenantLogoUrl');
  
  localStorage.removeItem('tenantId');
  localStorage.removeItem('tenantAuth');
  localStorage.removeItem('tenantName');
  localStorage.removeItem('tenantLogoUrl');
  localStorage.removeItem('superAdminToken');
  localStorage.removeItem('promo_members');
  localStorage.removeItem('promo_months');
  localStorage.removeItem('promo_quotas');
  localStorage.removeItem('promo_payments');
  localStorage.removeItem('promo_dollar_purchases');
}
