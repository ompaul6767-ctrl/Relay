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

/**
 * Robust API request helper with:
 * - JWT Authorization header injection
 * - Automatic retry on 502/503/504 cold-start wakes
 * - Custom DOM event dispatching to alert the user during backend wake-ups
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  maxRetries = 2
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
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${API_BASE}${normalizedEndpoint}`, {
        ...options,
        headers,
      });

      // Cold start / bad gateway status codes on free-tier Render
      if (response.status === 502 || response.status === 503 || response.status === 504) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('relay:server-waking', { detail: { waking: true } }));
        }

        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
      }

      let data: any = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (response.status === 401) {
        localStorage.removeItem('relay_token');
        localStorage.removeItem('relay_user');
        localStorage.removeItem('relay_role');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('relay:unauthorized'));
          if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
            window.location.href = '/login';
          }
        }
      }

      if (!response.ok) {
        const errorMsg =
          data.message ||
          data.error ||
          (response.status === 502 || response.status === 503 || response.status === 504
            ? 'Backend service is waking up. Please retry in a few moments.'
            : `HTTP error ${response.status}`);
        const err = new Error(errorMsg);
        (err as any).status = response.status;
        (err as any).details = data.details;
        throw err;
      }

      // Success: notify UI that server is awake
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('relay:server-waking', { detail: { waking: false } }));
      }

      return data;
    } catch (err: any) {
      lastError = err;

      // Network / fetch errors during server boot
      if (err.name === 'TypeError' || err.message?.includes('fetch') || err.status >= 502) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('relay:server-waking', { detail: { waking: true } }));
        }
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 2500 * (attempt + 1)));
          continue;
        }
      }
      break;
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('relay:server-waking', { detail: { waking: false } }));
  }

  throw lastError;
}

export const api = {
  // Auth
  demoLogin: (role: string) =>
    apiRequest<{ success: boolean; token: string; user: any }>('/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),
  login: (email: string, password: string) =>
    apiRequest<{ success: boolean; token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () =>
    apiRequest<{ success: boolean; message: string }>('/auth/logout', {
      method: 'POST',
    }),
  getDemoAccounts: () =>
    apiRequest<{ enabled: boolean; accounts: any[] }>('/auth/demo-accounts'),
  getMe: () => apiRequest<{ success: boolean; user: any }>('/auth/me'),

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
    apiRequest<{ answer: string; citations: any[]; retrievalMode?: string }>(
      `/cases/${id}/ask`,
      { method: 'POST', body: JSON.stringify({ question }) }
    ),

  // Sources
  getSources: (caseId: string) =>
    apiRequest<{ sources: any[] }>(`/cases/${caseId}/sources`),
  uploadSource: (caseId: string, formData: FormData) =>
    apiRequest(`/cases/${caseId}/sources`, { method: 'POST', body: formData }),
  createSourceJson: (caseId: string, data: any) =>
    apiRequest(`/cases/${caseId}/sources`, { method: 'POST', body: JSON.stringify(data) }),
  importGithubRepo: (caseId: string, data: { repoUrl: string; consent: boolean; acl: string }) =>
    apiRequest<{ success: boolean; source: any; spansCount: number; message: string }>(
      `/cases/${caseId}/sources/github`,
      { method: 'POST', body: JSON.stringify(data) }
    ),

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
  dismissStaleness: (caseId: string, claimId: string, data: { reason: string }) =>
    apiRequest(`/cases/${caseId}/claims/${claimId}/dismiss-staleness`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Spans
  getSpan: (spanId: string, caseId?: string) =>
    apiRequest<{ span: any }>(`/spans/${spanId}${caseId ? `?caseId=${caseId}` : ''}`),

  // Handover
  getHandover: (caseId: string, version?: number) =>
    apiRequest(`/cases/${caseId}/handover${version ? `?version=${version}` : ''}`),

  // Interview (Improvement 1)
  generateInterviewQuestions: (caseId: string) =>
    apiRequest<{ success: boolean; questions: any[]; stats: any }>(
      `/cases/${caseId}/interview/generate`,
      { method: 'POST' }
    ),
  getInterviewQuestions: (caseId: string) =>
    apiRequest<{ questions: any[]; stats: any }>(`/cases/${caseId}/interview`),
  answerInterviewQuestion: (caseId: string, questionId: string, data: { answer: string; chosenValue?: string; acl?: string }) =>
    apiRequest<{ success: boolean; question: any; claim: any; message: string }>(
      `/cases/${caseId}/interview/${questionId}/answer`,
      { method: 'POST', body: JSON.stringify(data) }
    ),
  skipInterviewQuestion: (caseId: string, questionId: string) =>
    apiRequest<{ success: boolean; question: any }>(
      `/cases/${caseId}/interview/${questionId}/skip`,
      { method: 'POST' }
    ),
  reassignInterviewQuestion: (caseId: string, questionId: string, data: { suggestedContact: string }) =>
    apiRequest<{ success: boolean; question: any }>(
      `/cases/${caseId}/interview/${questionId}/reassign`,
      { method: 'POST', body: JSON.stringify(data) }
    ),

  // Timeline (Improvement 3)
  getTimelineEvents: (caseId: string) =>
    apiRequest<{ events: any[]; summary: any }>(`/cases/${caseId}/timeline`),

  // Demo
  seedDemo: () => apiRequest('/demo/seed', { method: 'POST' }),
};
