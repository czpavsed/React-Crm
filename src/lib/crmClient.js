import { normalizeCustomer, normalizeJob } from './api';
import { getFirebaseAuth } from './firebase';

function required(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function getBaseUrl() {
  const base = required('REACT_APP_CRM_API_URL');
  return base.endsWith('/') ? base : `${base}/`;
}

function getApiKey() {
  return required('REACT_APP_CRM_API_ACCESS_KEY');
}

function hasJwtShape(value) {
  return typeof value === 'string' && value.split('.').length === 3;
}

async function getAuthorizationHeader() {
  try {
    const auth = getFirebaseAuth();
    const currentUser = auth && auth.currentUser;
    if (currentUser) {
      const idToken = await currentUser.getIdToken();
      if (hasJwtShape(idToken)) {
        return `Bearer ${idToken}`;
      }
    }
  } catch {
    // Fallback to legacy API key mode when Firebase auth is not available.
  }

  return `Bearer ${getApiKey()}`;
}

function getPath(name, fallback) {
  const value = process.env[name];
  if (!value || !String(value).trim()) return fallback;
  return String(value).replace(/^\/+/, '');
}

function buildQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

function unwrapListResponse(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && Array.isArray(raw.items)) return raw.items;
  return [];
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (!ms || ms <= 0) {
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };

    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

function parseRetryAfterMs(res) {
  const value = (res && res.headers && res.headers.get('retry-after')) || '';
  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    return Math.round(asNumber * 1000);
  }
  return null;
}

function unwrapPagedResponse(raw, page, pageSize) {
  const items = unwrapListResponse(raw).map((item) => normalizeJob(item));
  const totalCandidates = [
    raw && raw.total,
    raw && raw.totalCount,
    raw && raw.count,
  ];
  const total = totalCandidates.find((value) => Number.isFinite(Number(value)));
  const numericTotal = total === undefined ? null : Number(total);
  const explicitHasMore = raw && typeof raw === 'object' ? raw.hasMore : undefined;
  const hasMore =
    typeof explicitHasMore === 'boolean'
      ? explicitHasMore
      : numericTotal !== null
        ? page * pageSize < numericTotal
        : items.length >= pageSize;

  return {
    items,
    total: numericTotal,
    hasMore,
  };
}

async function request(path, options) {
  const url = `${getBaseUrl()}${path}`;
  const authorization = await getAuthorizationHeader();
  const maxAttempts = 4;
  const method = (options && options.method ? String(options.method) : 'GET').toUpperCase();
  const isSafeRetry = method === 'GET';
  const signal = options && options.signal;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
        ...(options && options.headers ? options.headers : {}),
      },
    });

    if (res.status === 429 && isSafeRetry && attempt < maxAttempts) {
      const retryAfterMs = parseRetryAfterMs(res);
      const backoffMs = retryAfterMs || 300 * Math.pow(2, attempt - 1);
      await wait(backoffMs, signal);
      continue;
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(text || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    return res.json().catch(() => null);
  }

  const err = new Error('HTTP 429');
  err.status = 429;
  throw err;
}

function isForbidden(error) {
  const status = error && typeof error === 'object' ? error.status : undefined;
  const message = error instanceof Error ? error.message : '';
  return status === 403 || /\b403\b/.test(String(message || ''));
}

function isBadRequest(error) {
  const status = error && typeof error === 'object' ? error.status : undefined;
  const message = error instanceof Error ? error.message : '';
  return status === 400 || /\b400\b/.test(String(message || ''));
}

async function fetchJobsEnhanced({ email, technicianEmail, page, pageSize, sortBy, sortDir, includeTotal, signal } = {}) {
  const path = getPath('REACT_APP_CRM_API_ZAKAZKY_LIST_PATH', 'api/protokoly-zakazky-list');
  const normalizedEmail = String(email || '').trim();
  const normalizedTechnicianEmail = String(technicianEmail || '').trim();
  const query = buildQuery({
    email: normalizedEmail,
    technicianEmail: normalizedTechnicianEmail,
    page,
    pageSize,
    sortBy,
    sortDir,
    includeTotal,
  });
  const raw = await request(`${path}${query}`, { method: 'GET', signal });
  return unwrapListResponse(raw).map((item) => normalizeJob(item));
}

export async function fetchJobsPage({
  email,
  technicianEmail,
  search,
  page = 1,
  pageSize = 100,
  sortBy = 'datum',
  sortDir = 'desc',
  signal,
} = {}) {
  const normalizedEmail = String(email || '').trim();
  if (!normalizedEmail) {
    return { items: [], total: 0, hasMore: false };
  }

  try {
    const path = getPath('REACT_APP_CRM_API_ZAKAZKY_LIST_PATH', 'api/protokoly-zakazky-list');
    const query = buildQuery({
      email: normalizedEmail,
      technicianEmail: String(technicianEmail || '').trim(),
      search: String(search || '').trim(),
      page,
      pageSize,
      sortBy,
      sortDir,
      includeTotal: true,
    });
    const raw = await request(`${path}${query}`, { method: 'GET', signal });
    return unwrapPagedResponse(raw, page, pageSize);
  } catch (error) {
    if (isBadRequest(error)) {
      const items = await fetchJobsEnhanced({
        email: normalizedEmail,
        technicianEmail,
        page,
        pageSize,
        sortBy,
        sortDir,
        signal,
      });
      return { items, total: null, hasMore: items.length >= pageSize };
    }
    throw error;
  }
}

async function fetchLegacyJobsByEmail(email) {
  const normalizedEmail = String(email || '').trim();
  if (!normalizedEmail) return [];

  const path = getPath('REACT_APP_CRM_API_ZAKAZKY_LIST_PATH', 'api/protokoly-zakazky-list');
  const query = buildQuery({ email: normalizedEmail });
  const raw = await request(`${path}${query}`, { method: 'GET' });
  return unwrapListResponse(raw).map((item) => normalizeJob(item));
}

function parseEmailList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export async function fetchJobsByEmail(email) {
  const normalizedEmail = String(email || '').trim();
  if (!normalizedEmail) return [];

  try {
    return await fetchJobsEnhanced({
      email: normalizedEmail,
      technicianEmail: normalizedEmail,
      page: 1,
      pageSize: 200,
      sortBy: 'datum',
      sortDir: 'desc',
    });
  } catch (error) {
    if (isBadRequest(error)) {
      return fetchLegacyJobsByEmail(normalizedEmail);
    }
    throw error;
  }
}

export async function fetchAllJobs(currentUserEmail) {
  const normalizedEmail = String(currentUserEmail || '').trim();

  try {
    return await fetchJobsEnhanced({
      email: normalizedEmail,
      page: 1,
      pageSize: 200,
      sortBy: 'datum',
      sortDir: 'desc',
    });
  } catch (error) {
    if (isForbidden(error)) {
      return fetchJobsByEmail(normalizedEmail);
    }
    if (isBadRequest(error)) {
      return fetchJobsByEmail(normalizedEmail);
    }
    throw error;
  }
}

export async function fetchJobsByEmails(emails) {
  // Deprecated strategy kept for compatibility with existing callers.
  // Enhanced API no longer needs client-side multi-email fan-out.
  if (emails && emails.length) {
    return fetchAllJobs(emails[0]);
  }
  return [];
}

export async function fetchAllJobsForScope(options = {}) {
  const configuredEmails = parseEmailList(process.env.REACT_APP_CRM_ALL_TECH_EMAILS);
  const optionEmails = parseEmailList(options.emails);
  const hasAllHint = configuredEmails.length > 0 || optionEmails.length > 0;

  if (hasAllHint || options.forceAll) {
    try {
      return await fetchAllJobs(options.currentUserEmail);
    } catch (error) {
      if (isForbidden(error)) {
        return fetchJobsByEmail(options.currentUserEmail);
      }
      throw error;
    }
  }

  // Fallback to current user scope if caller did not request all-scope explicitly.
  return fetchJobsByEmail(options.currentUserEmail);
}

export async function fetchCustomers() {
  const path = getPath('REACT_APP_CRM_API_ZAKAZNICI_LIST_PATH', 'protokoly-customers');
  const raw = await request(path, { method: 'GET' });
  const list = Array.isArray(raw) ? raw : [];
  return list.map((item) => normalizeCustomer(item)).filter((c) => c.ZakaznikId > 0);
}

export async function saveJob(payload) {
  const path = getPath('REACT_APP_CRM_API_ZAKAZKY_PATH', 'protokoly-zakazka');
  const method = payload && payload.ZakazkaId ? 'PUT' : 'POST';
  await request(path, {
    method,
    body: JSON.stringify(payload),
  });
}

export async function deleteJobById(zakazkaId) {
  const path = getPath('REACT_APP_CRM_API_ZAKAZKY_PATH', 'protokoly-zakazka');
  await request(`${path}?ZakazkaId=${encodeURIComponent(String(zakazkaId))}`, {
    method: 'DELETE',
    body: JSON.stringify({ ZakazkaId: zakazkaId }),
  });
}

export async function createCustomer(payload) {
  const path = getPath('REACT_APP_CRM_API_ZAKAZNICI_PATH', 'protokoly-zakaznik');
  const raw = await request(path, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return normalizeCustomer(raw);
}

export async function updateCustomer(payload) {
  const path = getPath('REACT_APP_CRM_API_ZAKAZNICI_PATH', 'protokoly-zakaznik');
  const raw = await request(path, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return normalizeCustomer(raw);
}
