"use client";

import React from 'react';
import Image from 'next/image';
import {
  Shield,
  Key,
  HardDrive,
  Activity,
  AlertTriangle,
  Users,
  Terminal,
  LogOut,
  CreditCard,
  Tag,
  RefreshCw,
  LucideIcon,
  Database
} from 'lucide-react';

import { useDineStackAdmin } from '../hooks/useDineStackAdmin';
import { fetchWithAuth } from '../services/api';
import TwoFactorSettings from '../components/TwoFactorSettings';
import {
  Button,
  CustomSelect,
  Modal,
  CustomAlert
} from '../components/BrutalUI';

// Views
import { DashboardView } from '../components/views/DashboardView';
import { RestaurantsView } from '../components/views/RestaurantsView';
import { KeysView } from '../components/views/KeysView';
import { DeviceView } from '../components/views/DeviceView';
import { SupportView } from '../components/views/SupportView';
import { AuditView } from '../components/views/AuditView';
import { PaymentsView } from '../components/views/PaymentsView';
import { CouponsView } from '../components/views/CouponsView';
import { TeamView } from '../components/views/TeamView';
import { TrialMonitoringView } from '../components/views/TrialMonitoringView';
import { SubscriptionMonitoringView } from '../components/views/SubscriptionMonitoringView';

export default function DineStackAdmin() {
  const {
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
  } = useDineStackAdmin();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFFFF0] flex items-center justify-center">
        <div className="font-mono text-xs uppercase tracking-widest text-[#8D0B41] animate-pulse">
          Authenticating Secure Link...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FFFFF0] flex items-center justify-center p-6">
        <div className="bg-white border-2 border-[#1F1F1F] p-8 max-w-md w-full shadow-[8px_8px_0px_0px_#8D0B41]">
          <div className="flex items-center gap-4 text-[#8D0B41] mb-4">
            <AlertTriangle size={32} />
            <h2 className="font-serif text-xl font-bold text-[#1F1F1F]">Connection Failure</h2>
          </div>
          <p className="font-mono text-xs text-[#6A6A6A] mb-6">
            {error}
          </p>
          <div className="p-4 bg-gray-50 border border-gray-200 mb-6 font-mono text-[10px] text-gray-500 break-all">
            ENDPOINT: {`${apiBase}/super-admin/dashboard/ping`}
          </div>
          <Button onClick={fetchData} className="w-full">Retry Connection</Button>
        </div>
      </div>
    );
  }

  const renderNavItem = (id: string, label: string, Icon: LucideIcon) => (
    <button
      onClick={() => setCurrentView(id)}
      className={`w-full flex items-center gap-4 px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all ${currentView === id
        ? 'bg-[#1F1F1F] text-white border-r-4 border-[#8D0B41]'
        : 'text-[#6A6A6A] hover:bg-[#FFFFF0] hover:text-[#1F1F1F]'
        }`}
    >
      <Icon size={16} className={currentView === id ? "text-[#8D0B41]" : ""} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex min-h-screen bg-[#FFFFF0] font-sans text-[#1F1F1F]">
      {/* Sidebar */}
      <div className="w-72 bg-white border-r border-[#1F1F1F] flex flex-col fixed h-full z-20 shadow-[4px_0px_0px_0px_rgba(31,31,31,0.05)]">
        <div className="p-8 border-b border-[#1F1F1F] bg-[#1F1F1F] text-white">
          <div className="flex flex-col items-center text-white">
            <div className="mb-2 bg-white p-2 rounded-full">
              <Image
                src="/assets/DineStack Bg Remove.png"
                alt="DineStack Logo"
                width={60}
                height={60}
                className="object-contain"
              />
            </div>
            <div className="text-center">
              <h1 className="font-bold tracking-tight text-xl leading-none">DINESTACK</h1>
              <span className="font-mono text-[10px] text-[#8D0B41] uppercase tracking-[0.2em]">Internal Console</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-8 space-y-2 overflow-y-auto">
          <div className="px-6 mb-3 text-[10px] font-mono font-bold text-[#6A6A6A] uppercase tracking-widest flex items-center gap-2">
            <div className="w-1 h-1 bg-[#8D0B41]"></div>
            Monitoring
          </div>
          {renderNavItem("dashboard", "Overview", Activity)}
          {renderNavItem("trials", "Trial Monitoring", Activity)}
          {renderNavItem("subscriptions", "Subscriptions", CreditCard)}

          <div className="px-6 mb-3 mt-8 text-[10px] font-mono font-bold text-[#6A6A6A] uppercase tracking-widest flex items-center gap-2">
            <div className="w-1 h-1 bg-[#8D0B41]"></div>
            Administration
          </div>
          {renderNavItem("restaurants", "Entities", Database)}
          {renderNavItem("payments", "Payments", CreditCard)}
          {renderNavItem("coupons", "Coupons", Tag)}
          {(userRole === 'OWNER' || userRole === 'MANAGER') && (
            renderNavItem("keys", "Licensing", Key)
          )}
          {userRole === 'OWNER' && (
            renderNavItem("devices", "Hardware", HardDrive)
          )}

          <div className="px-6 mb-3 mt-8 text-[10px] font-mono font-bold text-[#6A6A6A] uppercase tracking-widest flex items-center gap-2">
            <div className="w-1 h-1 bg-[#8D0B41]"></div>
            System Security
          </div>
          {(userRole === 'OWNER' || userRole === 'MANAGER') && (
            renderNavItem("audit", "Audit Ledger", Terminal)
          )}
          {renderNavItem("2fa", "Two-Factor Auth", Shield)}
          {userRole === 'OWNER' && (
            renderNavItem("users", "Staff Access", Users)
          )}
          {userRole === 'OWNER' && (
            renderNavItem("support", "Overrides", AlertTriangle)
          )}
        </nav>

        <div className="p-6 border-t border-[#1F1F1F] bg-gray-50 flex justify-between items-center group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#1F1F1F] text-white flex items-center justify-center font-bold font-mono text-sm border border-[#1F1F1F]">
              {userRole === 'OWNER' ? 'OW' : userRole === 'MANAGER' ? 'MG' : 'IN'}
            </div>
            <div className="max-w-[140px] overflow-hidden">
              <div className="text-sm font-bold font-serif truncate" title={userEmail}>{userEmail.split('@')[0]}</div>
              <div className="text-[10px] font-mono text-[#6A6A6A] uppercase tracking-wider">ROLE: {userRole}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-[#6A6A6A] hover:text-[#8D0B41] p-2 transition-colors"
            title="Terminate Session"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 ml-72 p-12 bg-[#FFFFF0] min-h-screen">
        <div className="max-w-6xl mx-auto">
          {currentView === 'dashboard' && <DashboardView stats={stats} onRefresh={fetchData} />}
          {currentView === 'restaurants' && <RestaurantsView data={restaurants} userRole={userRole} onSuspend={handleSuspend} onNewRestaurant={handleNewRestaurant} onDelete={handleDeleteRestaurant} />}
          {currentView === 'keys' && <KeysView keys={keys} restaurants={restaurants} onGenerate={handleGenerateKey} onDelete={handleDeleteClick} />}
          {currentView === 'trials' && <TrialMonitoringView restaurants={restaurants} />}
          {currentView === 'subscriptions' && <SubscriptionMonitoringView restaurants={restaurants} />}
          {currentView === 'devices' && <DeviceView devices={devices} />}
          {currentView === 'support' && <SupportView onOverride={handleSupportOverride} />}
          {currentView === 'audit' && (
            <AuditView
              logs={logs}
              page={logsPage}
              totalPages={logsTotalPages}
              severity={logsFilterSeverity}
              search={logsSearch}
              startDate={logsStartDate}
              endDate={logsEndDate}
              userRole={userRole}
              onPageChange={(page) => {
                setLogsPage(page);
                fetchLogs(page, logsFilterSeverity, logsSearch, logsStartDate, logsEndDate);
              }}
              onSeverityChange={(sev) => {
                setLogsFilterSeverity(sev);
                setLogsPage(1);
                fetchLogs(1, sev, logsSearch, logsStartDate, logsEndDate);
              }}
              onSearchChange={(searchVal) => {
                setLogsSearch(searchVal);
                setLogsPage(1);
                fetchLogs(1, logsFilterSeverity, searchVal, logsStartDate, logsEndDate);
              }}
              onDateChange={(start, end) => {
                setLogsStartDate(start);
                setLogsEndDate(end);
                setLogsPage(1);
                fetchLogs(1, logsFilterSeverity, logsSearch, start, end);
              }}
              onRefresh={() => fetchLogs(logsPage, logsFilterSeverity, logsSearch, logsStartDate, logsEndDate)}
            />
          )}
          {currentView === '2fa' && <TwoFactorSettings apiBase={apiBase} fetchWithAuth={fetchWithAuth} />}
          {currentView === 'payments' && (
            <PaymentsView
              payments={payments}
              userRole={userRole}
              onRefundClick={handleRefundClick}
              statusFilter={paymentStatusFilter}
              setStatusFilter={setPaymentStatusFilter}
            />
          )}
          {currentView === 'coupons' && (
            <CouponsView
              coupons={coupons}
              userRole={userRole}
              onCreateClick={() => setCouponModalOpen(true)}
              onDisableClick={handleDisableCoupon}
            />
          )}
          {currentView === 'users' && userRole === 'OWNER' && (
            <TeamView
              members={teamMembers}
              sessions={activeSessions}
              onCreateClick={() => setCreateTeamModalOpen(true)}
              onStatusChange={handleTeamStatusChange}
              onResetPasswordClick={handleResetPasswordClick}
              onDeleteMember={handleDeleteMemberClick}
              onRevokeSession={handleRevokeSession}
              onRevokeAllSessions={handleRevokeAllSessions}
            />
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Deletion"
        variant="danger"
        confirmText="Delete Key"
        onConfirm={confirmDeleteKey}
      >
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-red-100 text-[#8D0B41] rounded-full mx-auto flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-[#1F1F1F]">Revoke License Key?</h3>
            <p className="font-mono text-xs text-[#6A6A6A] mt-2">
              This action cannot be undone. The key will be permanently invalid.
            </p>
          </div>
        </div>
      </Modal>

      {/* Restaurant Delete Confirmation Modal */}
      <Modal
        isOpen={restaurantDeleteModalOpen}
        onClose={() => setRestaurantDeleteModalOpen(false)}
        title="Confirm Entity Deletion"
        variant="danger"
        confirmText="Delete Entity"
        onConfirm={confirmDeleteRestaurant}
      >
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-red-100 text-[#8D0B41] rounded-full mx-auto flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-[#1F1F1F]">Delete Restaurant Entity?</h3>
            <p className="font-mono text-xs text-[#6A6A6A] mt-2 max-w-xs mx-auto">
              Are you sure you want to delete this entity? This action is irreversible and will shut down all associated devices.
            </p>
          </div>
        </div>
      </Modal>

      {/* Suspend/Resume Confirmation Modal */}
      <Modal
        isOpen={suspendModalOpen}
        onClose={() => setSuspendModalOpen(false)}
        title={
          (() => {
            const r = restaurants.find(r => r.id === restaurantToSuspend);
            if (!r) return "Confirm Status Change";
            const isSuspended = r.status === 'Suspended' || r.status === 'SUSPENDED';
            return isSuspended ? "Confirm Reactivation" : "Confirm Suspension";
          })()
        }
        variant={
          (() => {
            const r = restaurants.find(r => r.id === restaurantToSuspend);
            if (!r) return "primary";
            const isSuspended = r.status === 'Suspended' || r.status === 'SUSPENDED';
            return isSuspended ? "primary" : "danger";
          })()
        }
        confirmText={
          (() => {
            const r = restaurants.find(r => r.id === restaurantToSuspend);
            if (!r) return "Confirm";
            const isSuspended = r.status === 'Suspended' || r.status === 'SUSPENDED';
            return isSuspended ? "Resume Service" : "Suspend Service";
          })()
        }
        onConfirm={confirmSuspendRestaurant}
      >
        <div className="text-center space-y-4">
          <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center ${(() => {
            const r = restaurants.find(r => r.id === restaurantToSuspend);
            const isSuspended = r?.status === 'Suspended' || r?.status === 'SUSPENDED';
            return isSuspended ? "bg-green-100 text-green-700" : "bg-red-100 text-[#8D0B41]";
          })()}`}>
            {(() => {
              const r = restaurants.find(r => r.id === restaurantToSuspend);
              const isSuspended = r?.status === 'Suspended' || r?.status === 'SUSPENDED';
              return isSuspended ? <RefreshCw size={24} /> : <AlertTriangle size={24} />;
            })()}
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-[#1F1F1F]">
              {(() => {
                const r = restaurants.find(r => r.id === restaurantToSuspend);
                if (!r) return "Change Status?";
                const isSuspended = r.status === 'Suspended' || r.status === 'SUSPENDED';
                return isSuspended ? `Reactivate ${r.name}?` : `Suspend ${r.name}?`;
              })()}
            </h3>
            <p className="font-mono text-xs text-[#6A6A6A] mt-2 max-w-xs mx-auto">
              {(() => {
                const r = restaurants.find(r => r.id === restaurantToSuspend);
                if (!r) return "";
                const isSuspended = r.status === 'Suspended' || r.status === 'SUSPENDED';
                return isSuspended
                  ? "This will restore service access immediately. All devices will be able to connect."
                  : "This will immediately block all access for this entity. Active sessions may be terminated.";
              })()}
            </p>
          </div>
        </div>
      </Modal>

      {/* Refund Confirmation Modal */}
      <Modal
        isOpen={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        title="Confirm Payment Refund"
        variant="danger"
        confirmText="EXECUTE REFUND"
        onConfirm={confirmRefundPayment}
      >
        <div className="space-y-6">
          <div className="bg-red-50 border-l-2 border-[#8D0B41] p-3 text-xs font-mono text-[#8D0B41] uppercase tracking-tight">
            ⚠ Financial Action Notice: Refund actions are final and write to the CRITICAL system ledger.
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#6A6A6A] block mb-1">Target Transaction</span>
            <div className="font-mono text-xs text-[#1F1F1F] bg-white border border-gray-200 p-2 select-all">
              ID: {paymentToRefund?.id}<br />
              Amount: ${paymentToRefund?.amount} {paymentToRefund?.currency}<br />
              Ref: {paymentToRefund?.invoiceRef}
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6A6A6A]">Reason for Refund</label>
            <textarea
              className="w-full bg-white border border-[#1F1F1F] p-3 font-mono text-xs focus:outline-none focus:border-[#8D0B41] min-h-[80px]"
              placeholder="e.g. Overcharged, customer cancellation, service outage"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* Coupon Creation Modal */}
      <Modal
        isOpen={couponModalOpen}
        onClose={() => setCouponModalOpen(false)}
        title="Generate Discount Protocol"
        confirmText="CREATE PROTOCOL"
        onConfirm={confirmCreateCoupon}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6A6A6A] mb-1">Coupon Code</label>
            <input
              type="text"
              className="w-full bg-white border border-[#1F1F1F] px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#8D0B41] uppercase"
              placeholder="e.g. SPRING50"
              value={newCouponCode}
              onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6A6A6A] mb-1">Type</label>
              <CustomSelect
                value={newCouponType}
                onChange={setNewCouponType}
                options={[
                  { value: "PERCENTAGE", label: "PERCENTAGE (%)" },
                  { value: "FLAT", label: "FLAT AMOUNT ($)" }
                ]}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6A6A6A] mb-1">Value</label>
              <input
                type="number"
                className="w-full bg-white border border-[#1F1F1F] px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#8D0B41]"
                placeholder="e.g. 10 or 15.50"
                value={newCouponValue}
                onChange={(e) => setNewCouponValue(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6A6A6A] mb-1">Expiration Date (Optional)</label>
              <input
                type="date"
                className="w-full bg-white border border-[#1F1F1F] px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#8D0B41]"
                value={newCouponExpiresAt}
                onChange={(e) => setNewCouponExpiresAt(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6A6A6A] mb-1">Max Usage Limit (Optional)</label>
              <input
                type="number"
                className="w-full bg-white border border-[#1F1F1F] px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#8D0B41]"
                placeholder="e.g. 100"
                value={newCouponMaxUsage}
                onChange={(e) => setNewCouponMaxUsage(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Staff Creation Modal */}
      <Modal
        isOpen={createTeamModalOpen}
        onClose={() => setCreateTeamModalOpen(false)}
        title="Provision Staff Access"
        confirmText="PROVISION ACCOUNT"
        onConfirm={confirmCreateTeamMember}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6A6A6A] mb-1">Email Address</label>
            <input
              type="email"
              className="w-full bg-white border border-[#1F1F1F] px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#8D0B41]"
              placeholder="staff@dinestack.in"
              value={newTeamEmail}
              onChange={(e) => setNewTeamEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6A6A6A] mb-1">Password</label>
            <input
              type="password"
              className="w-full bg-white border border-[#1F1F1F] px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#8D0B41]"
              placeholder="••••••••••••"
              value={newTeamPassword}
              onChange={(e) => setNewTeamPassword(e.target.value)}
              autoComplete="off"
            />
            <span className="text-[9px] font-mono text-gray-400 mt-1 block">
              Min 12 chars, uppercase, lowercase, number, and special char.
            </span>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6A6A6A] mb-1">Role Type</label>
            <CustomSelect
              value={newTeamRole}
              onChange={setNewTeamRole}
              options={[
                { value: "MANAGER", label: "MANAGER" },
                { value: "INTERN", label: "INTERN" }
              ]}
            />
          </div>
        </div>
      </Modal>

      {/* Password Reset Modal */}
      <Modal
        isOpen={resetPasswordModalOpen}
        onClose={() => setResetPasswordModalOpen(false)}
        title="Reset Staff Password"
        variant="danger"
        confirmText="RESET PASSWORD"
        onConfirm={confirmResetPassword}
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border-l-2 border-yellow-500 p-3 text-xs font-mono text-yellow-800 uppercase tracking-tight">
            ⚠ Staff Access warning: Setting a new password will revoke all active login sessions for {teamMemberToReset?.email}.
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6A6A6A] mb-1">New Password</label>
            <input
              type="password"
              className="w-full bg-white border border-[#1F1F1F] px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#8D0B41]"
              placeholder="••••••••••••"
              value={newResetPassword}
              onChange={(e) => setNewResetPassword(e.target.value)}
              autoComplete="off"
            />
            <span className="text-[9px] font-mono text-gray-400 mt-1 block">
              Min 12 chars, uppercase, lowercase, number, and special char.
            </span>
          </div>
        </div>
      </Modal>

      {/* Delete Team Member Confirmation Modal */}
      <Modal
        isOpen={deleteTeamModalOpen}
        onClose={() => setDeleteTeamModalOpen(false)}
        title="Delete Staff Member"
        variant="danger"
        confirmText="DELETE PERMANENTLY"
        onConfirm={confirmDeleteMember}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-[#8D0B41] shrink-0 mt-0.5" size={20} />
            <p className="font-serif text-sm text-[#1F1F1F] leading-relaxed">
              Are you sure you want to permanently delete <strong className="font-mono">{teamMemberToDelete?.email}</strong>?
            </p>
          </div>
          <div className="bg-red-50 border border-[#8D0B41] p-3">
            <p className="font-mono text-[10px] text-[#8D0B41] uppercase tracking-wide">
              ⚠ This action is irreversible. All data associated with this account will be permanently removed.
            </p>
          </div>
        </div>
      </Modal>

      {notification && (
        <CustomAlert
          isOpen={notification.isOpen}
          title={notification.title}
          message={notification.message}
          type={notification.type}
          errors={notification.errors}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}
