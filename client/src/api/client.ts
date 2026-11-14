// Support optional VITE_API_URL environment variable, defaulting to relative '/api'
// In production on Vercel, requests to '/api/*' are proxied to Render via vercel.json rewrites
const getApiBase = (): string => {
  const envUrl = ((import.meta as any).env?.VITE_API_URL as string | undefined)?.trim();
  if (!envUrl) {
    return '/api';
  }
  const cleanUrl = envUrl.replace(/\/+$/, '');
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
};

const API_BASE = getApiBase();

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('relay_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Remove Content-Type for FormData uploads so browser sets boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const response = await fetch(`${API_BASE}${normalizedEndpoint}`, {
    ...options,
    headers,
  });

  let data: any = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const errorMsg =
      data.message ||
      data.error ||
      (response.status === 502 || response.status === 503 || response.status === 504
        ? 'Backend service is temporarily unavailable or waking up. Please retry in a few moments.'
        : `HTTP error ${response.status}`);
    const err = new Error(errorMsg);
    (err as any).status = response.status;
    (err as any).details = data.details;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  demoLogin: (role: string) =>
    apiRequest<{ success: boolean; token: string; user: any }>('/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),
  getMe: () => apiRequest('/auth/me'),

  // Cases
  getCases: () => apiRequest<{ cases: any[] }>('/cases'),
  getCase: (id: string) => apiRequest<{ case: any; stats: any }>(`/cases/${id}`),
  createCase: (data: { title: string; departingMemberName: string }) =>
    apiRequest('/cases', { method: 'POST', body: JSON.stringify(data) }),
  reconstructCase: (id: string) =>
    apiRequest(`/cases/${id}/reconstruct`, { method: 'POST' }),
  publishVersion: (id: string) =>
    apiRequest(`/cases/${id}/publish`, { method: 'POST' }),
  getVersions: (id: string) =>
    apiRequest<{ versions: any[] }>(`/cases/${id}/versions`),
  getAuditLogs: (id: string) =>
    apiRequest<{ audit: any[] }>(`/cases/${id}/audit`),
  acknowledgeVersion: (id: string, data: { versionNumber: number; question?: string }) =>
    apiRequest(`/cases/${id}/acknowledge`, { method: 'POST', body: JSON.stringify(data) }),
  askQuestion: (id: string, question: string) =>
    apiRequest(`/cases/${id}/ask`, { method: 'POST', body: JSON.stringify({ question }) }),

  // Sources
  getSources: (caseId: string) =>
    apiRequest<{ sources: any[] }>(`/cases/${caseId}/sources`),
  uploadSource: (caseId: string, formData: FormData) =>
    apiRequest(`/cases/${caseId}/sources`, { method: 'POST', body: formData }),
  createSourceJson: (caseId: string, data: any) =>
    apiRequest(`/cases/${caseId}/sources`, { method: 'POST', body: JSON.stringify(data) }),

  // Claims
  getClaims: (caseId: string, filters?: Record<string, string>) => {
    const query = filters ? new URLSearchParams(filters).toString() : '';
    return apiRequest<{ claims: any[]; meta: any }>(`/cases/${caseId}/claims${query ? `?${query}` : ''}`);
  },
  patchClaim: (claimId: string, data: { action: string; value?: string; text?: string; reviewNotes?: string }) =>
    apiRequest(`/claims/${claimId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  bulkApproveClaims: (caseId: string, claimIds: string[]) =>
    apiRequest('/claims/bulk-approve', { method: 'POST', body: JSON.stringify({ caseId, claimIds }) }),
  testFakeQuote: (data: { caseId: string; spanId: string; fakeQuote: string; claimText?: string }) =>
    apiRequest('/claims/test-fake-quote', { method: 'POST', body: JSON.stringify(data) }),

  // Spans
  getSpan: (spanId: string, caseId?: string) =>
    apiRequest<{ span: any }>(`/spans/${spanId}${caseId ? `?caseId=${caseId}` : ''}`),

  // Handover
  getHandover: (caseId: string, version?: number) =>
    apiRequest(`/cases/${caseId}/handover${version ? `?version=${version}` : ''}`),

  // Demo
  seedDemo: () => apiRequest('/demo/seed', { method: 'POST' }),
};
