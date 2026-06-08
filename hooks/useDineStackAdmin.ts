import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import * as api from '../services/api';

// --- TYPES ---
export interface Restaurant {
  id: string;
  name: string;
  status: string;
  created: string;
  devices: number;
  licenseType: string;
  activationDate?: string | null;
  trialEndDate?: string | null;
  planStatus: string;
  subscriptionStatus: string;
}

export interface LicenseKey {
  id: string;
  code: string;
  restaurant: string;
  entityId?: string | null;
  status: string;
  created: string;
  activatedAt?: string | null;
  notes?: string | null;
  generatedBy?: string | null;
}

export interface Device {
  hash: string;
  restaurant: string;
  type: string;
  status: string;
  lastSeen: string;
}

export interface Log {
  id: number;
  action: string;
  user: string;
  target: string;
  timestamp: string;
  details: string;
  severity: string;
}

export function useDineStackAdmin() {
  const router = useRouter();
  const apiBase = api.getApiBase();

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [error, setError] = useState<string | null>(null);

  // User details
  const [userRole, setUserRole] = useState<string>('MANAGER');
  const [userEmail, setUserEmail] = useState<string>('');

  // Modals state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);

  const [restaurantDeleteModalOpen, setRestaurantDeleteModalOpen] = useState(false);
  const [restaurantToDelete, setRestaurantToDelete] = useState<string | null>(null);

  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [restaurantToSuspend, setRestaurantToSuspend] = useState<string | null>(null);

  const [notification, setNotification] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
    errors?: string[];
  } | null>(null);

  // Payments State
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [paymentToRefund, setPaymentToRefund] = useState<any>(null);
  const [refundReason, setRefundReason] = useState('');

  // Coupons State
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState('PERCENTAGE');
  const [newCouponValue, setNewCouponValue] = useState('');
  const [newCouponExpiresAt, setNewCouponExpiresAt] = useState('');
  const [newCouponMaxUsage, setNewCouponMaxUsage] = useState('');

  // Team State
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [createTeamModalOpen, setCreateTeamModalOpen] = useState(false);
  const [newTeamEmail, setNewTeamEmail] = useState('');
  const [newTeamPassword, setNewTeamPassword] = useState('');
  const [newTeamRole, setNewTeamRole] = useState('MANAGER');
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [teamMemberToReset, setTeamMemberToReset] = useState<any>(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [deleteTeamModalOpen, setDeleteTeamModalOpen] = useState(false);
  const [teamMemberToDelete, setTeamMemberToDelete] = useState<any>(null);

  // Logs filters
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsFilterSeverity, setLogsFilterSeverity] = useState('');
  const [logsSearch, setLogsSearch] = useState('');
  const [logsStartDate, setLogsStartDate] = useState('');
  const [logsEndDate, setLogsEndDate] = useState('');

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'error', errors?: string[]) => {
    setNotification({
      isOpen: true,
      title,
      message,
      type,
      errors
    });
  };

  const addLog = useCallback((action: string, target: string, details: string, severity = 'INFO') => {
    const newLog: Log = {
      id: Date.now(),
      action,
      user: 'SuperAdmin',
      target,
      details,
      timestamp: new Date().toISOString(),
      severity
    };
    setLogs(prev => [newLog, ...prev]);
  }, []);

  const fetchLogs = useCallback(async (page = 1, severity = '', search = '', start = '', end = '') => {
    try {
      const res = await api.getLogs(page, severity, search, start, end);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setLogsPage(data.pagination?.page || 1);
        setLogsTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    // Parse role and user email from cookie session validation response,
    // which has been parsed and stored in session cookie/verification
    let role = 'INTERN';
    const adminStr = localStorage.getItem('admin'); // Fallback or read dynamically
    if (adminStr) {
      try {
        const admin = JSON.parse(adminStr);
        role = admin.role || 'INTERN';
        setUserRole(role);
        setUserEmail(admin.email || '');
      } catch (e) {
        console.error("Error parsing admin from localStorage", e);
      }
    }

    try {
      setIsLoading(true);
      setError(null);

      // Ping check
      const pingRes = await api.pingBackend();
      if (!pingRes.ok) {
        if (pingRes.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error(`Backend ping failed: ${pingRes.status}`);
      }

      // Stats & Restaurants
      const statsRes = await api.getStats();
      if (statsRes.ok) setStats(await statsRes.json());

      const restRes = await api.getRestaurants();
      if (restRes.ok) setRestaurants(await restRes.json());

      // Keys (OWNER / MANAGER)
      if (role === 'OWNER' || role === 'MANAGER') {
        const keysRes = await api.getKeys();
        if (keysRes.ok) setKeys(await keysRes.json());
      }

      // Devices (OWNER only)
      if (role === 'OWNER') {
        const devicesRes = await api.getDevices();
        if (devicesRes.ok) setDevices(await devicesRes.json());
      }

      // Coupons & Payments
      const couponsRes = await api.getCoupons();
      if (couponsRes.ok) setCoupons(await couponsRes.json());

      const paymentsRes = await api.getPayments();
      if (paymentsRes.ok) setPayments(await paymentsRes.json());

      // Team & Sessions (OWNER only)
      if (role === 'OWNER') {
        const teamRes = await api.getTeam();
        if (teamRes.ok) setTeamMembers(await teamRes.json());

        const sessionsRes = await api.getSessions();
        if (sessionsRes.ok) setActiveSessions(await sessionsRes.json());
      }

      // Logs
      if (role === 'OWNER' || role === 'MANAGER') {
        await fetchLogs(1, logsFilterSeverity, logsSearch, logsStartDate, logsEndDate);
      }
    } catch (err: any) {
      console.warn("Failed to fetch dashboard data:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }, [router, logsFilterSeverity, logsSearch, logsStartDate, logsEndDate, fetchLogs]);

  // Initial mount load
  useEffect(() => {
    fetchData();

    // Listen to unauthorized event
    const handleUnauthorized = () => {
      localStorage.removeItem('admin');
      router.push('/login');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [router, fetchData]);

  // --- ACTIONS HANDLERS ---

  const handleLogout = async () => {
    await api.logout();
    localStorage.removeItem('admin');
    router.push('/login');
  };

  // Payments Handlers
  const handleRefundClick = (payment: any) => {
    setPaymentToRefund(payment);
    setRefundReason('');
    setRefundModalOpen(true);
  };

  const confirmRefundPayment = async () => {
    if (!paymentToRefund || !refundReason.trim()) return;
    try {
      const res = await api.refundPayment(paymentToRefund.id, refundReason);
      if (res.ok) {
        addLog('PAYMENT_REFUND', paymentToRefund.id, `Refunded payment of ${paymentToRefund.amount} USD. Reason: ${refundReason}`);
        fetchData();
      } else {
        const parsed = await api.safeJsonParse(res);
        showAlert("Failed to refund payment", parsed.data?.message || 'Unknown error', 'error');
      }
    } catch (err: any) {
      showAlert("Operation Failed", `Error: ${err.message}`, 'error');
    } finally {
      setRefundModalOpen(false);
      setPaymentToRefund(null);
    }
  };

  // Coupons Handlers
  const confirmCreateCoupon = async () => {
    if (!newCouponCode || !newCouponValue) return;
    try {
      const res = await api.createCoupon({
        code: newCouponCode,
        discountType: newCouponType,
        discountValue: parseFloat(newCouponValue),
        expiresAt: newCouponExpiresAt ? new Date(newCouponExpiresAt).toISOString() : null,
        maxUsage: newCouponMaxUsage ? parseInt(newCouponMaxUsage) : null
      });
      if (res.ok) {
        const created = await res.json();
        addLog('COUPON_CREATE', created.id, `Created coupon ${newCouponCode}`);
        fetchData();
      } else {
        const parsed = await api.safeJsonParse(res);
        showAlert("Failed to create coupon", parsed.data?.message || 'Unknown error', 'error');
      }
    } catch (err: any) {
      showAlert("Operation Failed", `Error: ${err.message}`, 'error');
    } finally {
      setCouponModalOpen(false);
      setNewCouponCode('');
      setNewCouponValue('');
      setNewCouponExpiresAt('');
      setNewCouponMaxUsage('');
    }
  };

  const handleDisableCoupon = async (id: string) => {
    try {
      const res = await api.disableCoupon(id);
      if (res.ok) {
        addLog('COUPON_DISABLE', id, `Disabled coupon`);
        fetchData();
      } else {
        const parsed = await api.safeJsonParse(res);
        showAlert("Failed to disable coupon", parsed.data?.message || 'Unknown error', 'error');
      }
    } catch (err: any) {
      showAlert("Operation Failed", `Error: ${err.message}`, 'error');
    }
  };

  // Team Handlers
  const confirmCreateTeamMember = async () => {
    if (!newTeamEmail || !newTeamPassword || !newTeamRole) return;
    try {
      const res = await api.createTeamMember({
        email: newTeamEmail,
        password: newTeamPassword,
        role: newTeamRole
      });
      if (res.ok) {
        const created = await res.json();
        addLog('TEAM_CREATE', created.id, `Created staff member ${newTeamEmail} with role ${newTeamRole}`);
        fetchData();
      } else {
        const parsed = await api.safeJsonParse(res);
        const errs = parsed.data?.errors || [];
        showAlert("Failed to create staff member", parsed.data?.message || 'Unknown error', 'error', errs);
      }
    } catch (err: any) {
      showAlert("Operation Failed", `Error: ${err.message}`, 'error');
    } finally {
      setCreateTeamModalOpen(false);
      setNewTeamEmail('');
      setNewTeamPassword('');
    }
  };

  const handleTeamStatusChange = async (id: string, currentStatus: boolean) => {
    try {
      const res = await api.updateTeamMember(id, { isActive: !currentStatus });
      if (res.ok) {
        addLog('TEAM_STATUS_CHANGE', id, `Changed team member active status to ${!currentStatus}`);
        fetchData();
      } else {
        const parsed = await api.safeJsonParse(res);
        showAlert("Failed to update status", parsed.data?.message || 'Unknown error', 'error');
      }
    } catch (err: any) {
      showAlert("Operation Failed", `Error: ${err.message}`, 'error');
    }
  };

  const handleResetPasswordClick = (member: any) => {
    setTeamMemberToReset(member);
    setNewResetPassword('');
    setResetPasswordModalOpen(true);
  };

  const confirmResetPassword = async () => {
    if (!teamMemberToReset || !newResetPassword) return;
    try {
      const res = await api.updateTeamMember(teamMemberToReset.id, { password: newResetPassword });
      if (res.ok) {
        addLog('TEAM_PASSWORD_RESET', teamMemberToReset.id, `Reset password for staff member ${teamMemberToReset.email}`);
        fetchData();
      } else {
        const parsed = await api.safeJsonParse(res);
        const errs = parsed.data?.errors || [];
        showAlert("Failed to reset password", parsed.data?.message || 'Unknown error', 'error', errs);
      }
    } catch (err: any) {
      showAlert("Operation Failed", `Error: ${err.message}`, 'error');
    } finally {
      setResetPasswordModalOpen(false);
      setTeamMemberToReset(null);
      setNewResetPassword('');
    }
  };

  const handleDeleteMemberClick = (member: any) => {
    setTeamMemberToDelete(member);
    setDeleteTeamModalOpen(true);
  };

  const confirmDeleteMember = async () => {
    if (!teamMemberToDelete) return;
    try {
      const res = await api.deleteTeamMember(teamMemberToDelete.id);
      if (res.ok) {
        addLog('TEAM_DELETE', teamMemberToDelete.id, `Deleted staff member ${teamMemberToDelete.email}`);
        fetchData();
      } else {
        const parsed = await api.safeJsonParse(res);
        showAlert("Failed to delete member", parsed.data?.message || 'Unknown error', 'error');
      }
    } catch (err: any) {
      showAlert("Operation Failed", `Error: ${err.message}`, 'error');
    } finally {
      setDeleteTeamModalOpen(false);
      setTeamMemberToDelete(null);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const res = await api.revokeSession(sessionId);
      if (res.ok) {
        addLog('SESSION_REVOKE', sessionId, `Revoked login session`);
        fetchData();
      } else {
        const parsed = await api.safeJsonParse(res);
        showAlert("Failed to revoke session", parsed.data?.message || 'Unknown error', 'error');
      }
    } catch (err: any) {
      showAlert("Operation Failed", `Error: ${err.message}`, 'error');
    }
  };

  const handleRevokeAllSessions = async (adminId?: string) => {
    try {
      const res = await api.revokeAllSessions(adminId);
      if (res.ok) {
        addLog('SESSION_REVOKE_ALL', adminId || 'ALL', `Revoked all active sessions`);
        fetchData();
      } else {
        const parsed = await api.safeJsonParse(res);
        showAlert("Failed to revoke all sessions", parsed.data?.message || 'Unknown error', 'error');
      }
    } catch (err: any) {
      showAlert("Operation Failed", `Error: ${err.message}`, 'error');
    }
  };

  // Restaurant Actions
  const handleNewRestaurant = async (name: string) => {
    if (!name) return;
    try {
      const res = await api.createRestaurant(name);
      const parsed = await api.safeJsonParse(res);

      if (!parsed.success) {
        showAlert("Failed to create restaurant", parsed.error || 'Invalid response format', 'error');
        return;
      }

      if (res.status === 409) {
        showAlert("Entity Already Exists", parsed.data?.message || 'A restaurant with this name already exists. Use the existing entity instead.', 'error');
        return;
      }

      if (res.ok) {
        const newRest: Restaurant = parsed.data;
        addLog('ENTITY_CREATE', newRest.id, `Created entity ${name}`);
        fetchData();
      } else {
        showAlert("Failed to create restaurant", parsed.data?.message || 'Unknown error', 'error');
      }
    } catch (err: any) {
      showAlert("Failed to create restaurant", err.message || 'Network error or invalid response.', 'error');
    }
  };

  const handleGenerateKey = async (restaurantName: string, notes: string = "") => {
    try {
      const res = await api.generateKey(restaurantName, notes);
      if (res.ok) {
        addLog('KEY_GENERATE', restaurantName, 'Generated activation key');
        fetchData();
      } else {
        const parsed = await api.safeJsonParse(res);
        if (res.status === 409) {
          const codeMsg = parsed.data?.code ? `\n\nExisting Code: ${parsed.data.code}` : '';
          showAlert("Key Already Exists", (parsed.data?.message || 'A conflict occurred generating the code.') + codeMsg, 'error');
        } else {
          showAlert("Failed to generate key", parsed.data?.message || 'Unknown error', 'error');
        }
      }
    } catch (err: any) {
      showAlert("Failed to generate key", err.message || 'Network error', 'error');
    }
  };

  const handleDeleteClick = (id: string) => {
    setKeyToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDeleteKey = async () => {
    if (!keyToDelete) return;
    try {
      const res = await api.deleteKey(keyToDelete);
      if (res.ok) {
        addLog('KEY_DELETE', keyToDelete, 'Deleted activation key');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteModalOpen(false);
      setKeyToDelete(null);
    }
  };

  const handleDeleteRestaurant = (id: string) => {
    setRestaurantToDelete(id);
    setRestaurantDeleteModalOpen(true);
  };

  const confirmDeleteRestaurant = async () => {
    if (!restaurantToDelete) return;
    try {
      const res = await api.deleteRestaurant(restaurantToDelete);
      if (res.ok) {
        addLog('ENTITY_DELETE', restaurantToDelete, 'Deleted entity and associated devices');
        fetchData();
      } else {
        const parsed = await api.safeJsonParse(res);
        showAlert("Failed to delete entity", parsed.data?.message || parsed.data?.error || 'Unknown error', 'error');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRestaurantDeleteModalOpen(false);
      setRestaurantToDelete(null);
    }
  };

  const handleSuspend = (id: string) => {
    setRestaurantToSuspend(id);
    setSuspendModalOpen(true);
  };

  const confirmSuspendRestaurant = async () => {
    if (!restaurantToSuspend) return;
    const restaurant = restaurants.find(r => r.id === restaurantToSuspend);
    if (!restaurant) return;

    const currentStatus = restaurant.status;
    const newStatus = (currentStatus === 'Suspended' || currentStatus === 'SUSPENDED') ? 'ACTIVE' : 'SUSPENDED';

    try {
      const res = await api.updateRestaurantStatus(
        restaurantToSuspend,
        newStatus,
        newStatus === 'SUSPENDED' ? "Manual suspension by Super Admin" : "Manual reactivation",
        "Super Admin"
      );

      if (res.ok) {
        addLog('STATUS_CHANGE', restaurantToSuspend, `Changed status to ${newStatus}`);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSuspendModalOpen(false);
      setRestaurantToSuspend(null);
    }
  };

  const handleSupportOverride = (type: string) => {
    addLog('SYS_OVERRIDE', 'SYSTEM', `Executed support override: ${type}`);
  };

  return {
    isLoading,
    stats,
    currentView,
    setCurrentView,
    restaurants,
    keys,
    devices,
    logs,
    error,
    userRole,
    userEmail,

    // Modal state
    deleteModalOpen,
    setDeleteModalOpen,
    restaurantDeleteModalOpen,
    setRestaurantDeleteModalOpen,
    suspendModalOpen,
    setSuspendModalOpen,
    restaurantToSuspend,
    notification,
    setNotification,

    // Payments
    payments,
    paymentStatusFilter,
    setPaymentStatusFilter,
    refundModalOpen,
    setRefundModalOpen,
    paymentToRefund,
    refundReason,
    setRefundReason,

    // Coupons
    coupons,
    couponModalOpen,
    setCouponModalOpen,
    newCouponCode,
    setNewCouponCode,
    newCouponType,
    setNewCouponType,
    newCouponValue,
    setNewCouponValue,
    newCouponExpiresAt,
    setNewCouponExpiresAt,
    newCouponMaxUsage,
    setNewCouponMaxUsage,

    // Team
    teamMembers,
    activeSessions,
    createTeamModalOpen,
    setCreateTeamModalOpen,
    newTeamEmail,
    setNewTeamEmail,
    newTeamPassword,
    setNewTeamPassword,
    newTeamRole,
    setNewTeamRole,
    resetPasswordModalOpen,
    setResetPasswordModalOpen,
    teamMemberToReset,
    newResetPassword,
    setNewResetPassword,
    deleteTeamModalOpen,
    setDeleteTeamModalOpen,
    teamMemberToDelete,

    // Logs pagination / filter
    logsPage,
    logsTotalPages,
    logsFilterSeverity,
    logsSearch,
    logsStartDate,
    logsEndDate,
    setLogsPage,
    setLogsFilterSeverity,
    setLogsSearch,
    setLogsStartDate,
    setLogsEndDate,

    // Actions
    fetchData,
    fetchLogs,
    handleLogout,
    handleRefundClick,
    confirmRefundPayment,
    confirmCreateCoupon,
    handleDisableCoupon,
    confirmCreateTeamMember,
    handleTeamStatusChange,
    handleResetPasswordClick,
    confirmResetPassword,
    handleDeleteMemberClick,
    confirmDeleteMember,
    handleRevokeSession,
    handleRevokeAllSessions,
    handleNewRestaurant,
    handleGenerateKey,
    handleDeleteClick,
    confirmDeleteKey,
    handleDeleteRestaurant,
    confirmDeleteRestaurant,
    handleSuspend,
    confirmSuspendRestaurant,
    handleSupportOverride,
    apiBase,
  };
}
