// API Abstraction Layer for DineStack Admin Console

export const getApiBase = (): string => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return ''; // Same origin in production
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
};

export const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const mergedOptions: RequestInit = {
    ...options,
    credentials: 'include' as RequestCredentials,
    headers: {
      ...(options.headers || {}),
      'Content-Type': 'application/json',
    },
    cache: 'no-store' as RequestCache,
  };

  let res = await fetch(url, mergedOptions);

  // If token expired or is missing, attempt refresh once via cookies
  if (res.status === 401) {
    const clone = res.clone();
    const body = await clone.json().catch(() => ({}));
    if (body.code === 'TOKEN_EXPIRED' || body.code === 'TOKEN_MISSING') {
      const apiBase = getApiBase();
      const refreshRes = await fetch(`${apiBase}/super-admin/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshRes.ok) {
        // Retry original request with new cookies
        res = await fetch(url, mergedOptions);
      } else {
        // Refresh failed - trigger logout on client
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('auth:unauthorized'));
        }
      }
    }
  }

  return res;
};

// Safe JSON parser to handle non-JSON responses (like HTML error pages)
export const safeJsonParse = async (res: Response): Promise<{ success: boolean; data?: any; error?: string }> => {
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return { success: true, data: json };
  } catch {
    console.error("Non-JSON response:", text);
    return { success: false, error: "Server returned an invalid response." };
  }
};

// --- SERVICE ENDPOINTS ---

export const pingBackend = async () => {
  const apiBase = getApiBase();
  return fetchWithAuth(`${apiBase}/super-admin/dashboard/ping`);
};

export const getStats = async () => {
  const apiBase = getApiBase();
  return fetchWithAuth(`${apiBase}/super-admin/dashboard/stats`);
};

export const getRestaurants = async () => {
  const apiBase = getApiBase();
  return fetchWithAuth(`${apiBase}/super-admin/dashboard/restaurants`);
};

export const createRestaurant = async (name: string) => {
  const apiBase = getApiBase();
  return fetchWithAuth(`${apiBase}/super-admin/dashboard/restaurants`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
};

export const updateRestaurantStatus = async (id: string, status: string, reason: string, revokedBy: string) => {
  const apiBase = getApiBase();
  return fetchWithAuth(`${apiBase}/super-admin/dashboard/restaurants/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason, revokedBy }),
  });
};

export const deleteRestaurant = async (id: string) => {
  const apiBase = getApiBase();
  return fetchWithAuth(`${apiBase}/super-admin/dashboard/restaurants/${id}`, {
    method: 'DELETE',
  });
};

export const getKeys = async () => {
  const apiBase = getApiBase();
  return fetchWithAuth(`${apiBase}/super-admin/dashboard/keys`);
};

export const generateKey = async (restaurantId: string) => {
  const apiBase = getApiBase();
  return fetchWithAuth(`${apiBase}/super-admin/activation-codes`, {
    method: 'POST',
    body: JSON.stringify({
      restaurantId,
      plan: "Standard",
      durationDays: 30,
      maxTables: 10,
    }),
  });
};

export const deleteKey = async (id: string) => {
  const apiBase = getApiBase();
  return fetchWithAuth(`${apiBase}/super-admin/activation-codes/${id}`, {
    method: 'DELETE',
  });
};

export const getDevices = async () => {
  const apiBase = getApiBase();
  return fetchWithAuth(`${apiBase}/super-admin/dashboard/devices`);
};

export const getLogs = async (page = 1, severity = '', search = '', start = '', end = '') => {
  const apiBase = getApiBase();
  let url = `${apiBase}/super-admin/dashboard/logs?page=${page}&limit=20`;
  if (severity) url += `&severity=${severity}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (start) url += `&startDate=${start}`;
  if (end) url += `&endDate=${end}`;
  return fetchWithAuth(url);
};

export const getCoupons = async () => {
  const apiBase = getApiBase();
  return fetchWithAuth(`${apiBase}/super-admin/coupons`);
};

export const createCoupon = async (coupon: { code: string; discountType: string; discountValue: number; expiresAt: string | null; maxUsage: number | null }) => {
  const apiBase = getApiBase();
  return fetchWithAuth(`${apiBase}/super-admin/coupons`, {
    method: 'POST',
    body: JSON.stringify(coupon),
  });
};

export const disableCoupon = async (id: string) => {
  const apiBase = getApiBase();
  return fetchWithAuth(`${apiBase}/super-admin/coupons/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'DISABLED' }),
  });
};

export const getPayments = async () => {
  const apiBase = getApiBase();
  return fetchWithAuth(`${apiBase}/super-admin/payments`);
};

export const refundPayment = async (id: string, reason: string) => {
  const apiBase = getApiBase();
  return fetchWithAuth(`${apiBase}/super-admin/payments/${id}/refund`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
};

export const getTeam = async () => {
  const apiBase = getApiBase();
  return fetchWithAuth(`${apiBase}/super-admin/team`);
};

export const createTeamMember = async (member: any) => {
  const apiBase = getApiBase();
  return fetchWithAuth(`${apiBase}/super-admin/team`, {
    method: 'POST',
    body: JSON.stringify(member),
  });
};

export const updateTeamMember = async (id: string, data: any) => {
  const apiBase = getApiBase();
  return fetchWithAuth(`${apiBase}/super-admin/team/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteTeamMember = async (id: string) => {
  const apiBase = getApiBase();
  return fetchWithAuth(`${apiBase}/super-admin/team/${id}`, {
    method: 'DELETE',
  });
};

export const getSessions = async () => {
  const apiBase = getApiBase();
  return fetchWithAuth(`${apiBase}/super-admin/sessions`);
};

export const revokeSession = async (sessionId: string) => {
  const apiBase = getApiBase();
  return fetchWithAuth(`${apiBase}/super-admin/sessions/revoke`, {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
};

export const revokeAllSessions = async (adminId?: string) => {
  const apiBase = getApiBase();
  return fetchWithAuth(`${apiBase}/super-admin/sessions/revoke-all`, {
    method: 'POST',
    body: JSON.stringify({ adminId }),
  });
};

export const logout = async () => {
  const apiBase = getApiBase();
  return fetch(`${apiBase}/super-admin/logout`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => {});
};
