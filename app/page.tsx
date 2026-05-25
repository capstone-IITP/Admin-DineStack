"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import TwoFactorSettings from '../components/TwoFactorSettings';
import {
  Shield,
  Server,
  Key,
  HardDrive,
  Activity,
  AlertTriangle,
  Users,
  Lock,
  RefreshCw,
  XCircle,
  Terminal,
  ChevronRight,
  Database,
  LucideIcon,
  LogOut,
  CreditCard,
  Tag
} from 'lucide-react';

/**
 * TAPTABLE INTERNAL ADMIN PANEL - PRECISION GRADE
 * * Design Philosophy: "Digital Brutalism / Swiss Style"
 * - No rounded corners (rounded-none).
 * - High emphasis on borders and separation.
 * - Serif headers for authority, Mono for data.
 * - Palette: White, Ivory (#FFFFF0), Deep Maroon (#8D0B41), Charcoal (#1F1F1F).
 */

// --- TYPES ---

interface Restaurant {
  id: string;
  name: string;
  status: string;
  created: string;
  devices: number;
  licenseType: string;
}

interface LicenseKey {
  id: string;
  code: string;
  restaurant: string;
  entityId?: string | null;
  status: string;
  created: string;
  boundTo: string | null;
}

interface Device {
  hash: string;
  restaurant: string;
  type: string;
  status: string;
  lastSeen: string;
}

interface Log {
  id: number;
  action: string;
  user: string;
  target: string;
  timestamp: string;
  details: string;
  severity: string;
}

// --- MOCK DATA GENERATORS ---

const generateId = () => Math.random().toString(36).substr(2, 9).toUpperCase();
const generateKey = () => `TAP-${Math.random().toString(36).substr(2, 4).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

// Safe JSON parser to handle non-JSON responses (like HTML error pages)
const safeJsonParse = async (res: Response): Promise<{ success: boolean; data?: any; error?: string }> => {
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return { success: true, data: json };
  } catch {
    console.error("Non-JSON response:", text);
    return { success: false, error: "Server returned an invalid response. Check if backend is running." };
  }
};

// --- UI COMPONENTS ---

interface StatusBadgeProps {
  status: string;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  let styleClass = "bg-gray-100 text-gray-500 border-gray-300";

  switch (status) {
    case 'Operational':
    case 'Active':
    case 'ACTIVE':
    case 'Online':
    case 'Used':
      styleClass = "bg-[#1F1F1F] text-white border-[#1F1F1F]";
      break;
    case 'Suspended':
    case 'SUSPENDED':
    case 'REVOKED':
    case 'Revoked':
    case 'Expired':
    case 'Offline':
      styleClass = "bg-red-50 text-[#8D0B41] border-[#8D0B41] border-dashed";
      break;
    case 'Initialized':
    case 'Unused':
      styleClass = "bg-[#FFFFF0] text-[#1F1F1F] border-[#1F1F1F]";
      break;
    default:
      break;
  }

  return (
    <span className={`px-3 py-1 text-[10px] uppercase tracking-widest font-mono border ${styleClass}`}>
      {status}
    </span>
  );
};

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

const SectionHeader = ({ title, subtitle = "", action = null }: SectionHeaderProps) => (
  <div className="flex justify-between items-end mb-8 pb-4 border-b-2 border-[#1F1F1F]">
    <div>
      <h2 className="text-3xl font-serif font-bold text-[#1F1F1F] tracking-tight">{title}</h2>
      {subtitle && <div className="text-[#6A6A6A] font-mono text-xs uppercase tracking-wider mt-2 flex items-center gap-2">
        <span className="w-2 h-2 bg-[#8D0B41]"></span>
        {subtitle}
      </div>}
    </div>
    {action}
  </div>
);

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  noPadding?: boolean;
}

const Card = ({ children, title = "", className = "", noPadding = false }: CardProps) => (
  <div className={`bg-white border border-[#1F1F1F] shadow-[4px_4px_0px_0px_rgba(31,31,31,0.1)] ${className}`}>
    {title && (
      <div className="bg-[#FFFFF0] border-b border-[#1F1F1F] px-4 py-2 flex justify-between items-center">
        <h3 className="text-[10px] font-bold text-[#1F1F1F] uppercase tracking-widest font-mono">{title}</h3>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#1F1F1F] opacity-20"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-[#1F1F1F] opacity-20"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-[#1F1F1F] opacity-20"></div>
        </div>
      </div>
    )}
    <div className={noPadding ? "" : "p-6"}>
      {children}
    </div>
  </div>
);

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

const Button = ({ children, variant = 'primary', onClick, className = "", disabled = false }: ButtonProps) => {
  const baseStyle = "px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-0.5 active:shadow-none border border-[#1F1F1F]";

  const variants = {
    primary: "bg-[#1F1F1F] text-white hover:bg-[#333] shadow-[2px_2px_0px_0px_#8D0B41]",
    secondary: "bg-white text-[#1F1F1F] hover:bg-[#FFFFF0] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]",
    danger: "bg-[#8D0B41] text-white border-[#8D0B41] hover:bg-[#700833] shadow-[2px_2px_0px_0px_#1F1F1F]",
    ghost: "border-transparent bg-transparent text-[#6A6A6A] hover:text-[#1F1F1F] hover:bg-gray-50 shadow-none",
  };

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

const CustomSelect = ({ value, onChange, options, className = "" }: CustomSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-[#1F1F1F] px-3 py-2.5 text-xs font-mono flex justify-between items-center text-left focus:outline-none focus:border-[#8D0B41] transition-all hover:bg-gray-50"
      >
        <span>{selectedOption?.label || "SELECT OPTION"}</span>
        <span className="text-[9px] text-[#6A6A6A]">▼</span>
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 mt-1 bg-white border border-[#1F1F1F] z-50 shadow-[4px_4px_0px_0px_#1F1F1F] max-h-60 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2.5 text-xs font-mono text-left block hover:bg-[#8D0B41] hover:text-white transition-colors duration-100 ${
                  opt.value === value ? 'bg-[#FFFFF0] font-bold text-[#8D0B41] border-l-4 border-[#8D0B41]' : 'text-[#1F1F1F]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

interface ModalProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  confirmText?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

const Modal = ({ isOpen, title, children, onClose, onConfirm, confirmText = "Confirm", variant = "primary" }: ModalProps) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F1F1F]/80 backdrop-grayscale">
      <div className="bg-white w-full max-w-lg border-2 border-[#1F1F1F] shadow-[8px_8px_0px_0px_#8D0B41]">
        <div className="bg-[#1F1F1F] text-white px-6 py-3 border-b border-[#1F1F1F] flex justify-between items-center">
          <h3 className="font-mono font-bold uppercase tracking-widest text-xs flex items-center gap-2">
            <Terminal size={14} />
            {title}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><XCircle size={20} /></button>
        </div>
        <div className="p-8 bg-[#FFFFF0]">
          {children}
        </div>
        <div className="px-6 py-4 bg-white flex justify-end gap-4 border-t border-[#1F1F1F]">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={variant} onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </div>
  );
};

interface CustomAlertProps {
  isOpen: boolean;
  title: string;
  message: string;
  errors?: string[];
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const CustomAlert = ({ isOpen, title, message, errors, type, onClose }: CustomAlertProps) => {
  if (!isOpen) return null;

  const typeStyles = {
    error: {
      border: "border-2 border-[#8D0B41]",
      shadow: "shadow-[8px_8px_0px_0px_#8D0B41]",
      bg: "bg-[#FFFFF0]",
      headerBg: "bg-[#8D0B41]",
      headerText: "text-white",
      iconColor: "text-[#8D0B41]",
      btnVariant: "danger" as const
    },
    success: {
      border: "border-2 border-[#1F1F1F]",
      shadow: "shadow-[8px_8px_0px_0px_#1F1F1F]",
      bg: "bg-[#FFFFF0]",
      headerBg: "bg-[#1F1F1F]",
      headerText: "text-white",
      iconColor: "text-green-600",
      btnVariant: "primary" as const
    },
    info: {
      border: "border-2 border-[#1F1F1F]",
      shadow: "shadow-[8px_8px_0px_0px_#6A6A6A]",
      bg: "bg-[#FFFFF0]",
      headerBg: "bg-[#1F1F1F]",
      headerText: "text-white",
      iconColor: "text-[#1F1F1F]",
      btnVariant: "secondary" as const
    }
  };

  const style = typeStyles[type] || typeStyles.info;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1F1F1F]/80 backdrop-grayscale">
      <div className={`bg-white w-full max-w-md ${style.border} ${style.shadow} transition-all`}>
        {/* Header */}
        <div className={`${style.headerBg} ${style.headerText} px-6 py-3.5 border-b border-[#1F1F1F] flex justify-between items-center`}>
          <h3 className="font-mono font-bold uppercase tracking-widest text-[11px] flex items-center gap-2">
            <Terminal size={14} />
            {title}
          </h3>
          <button onClick={onClose} className="opacity-80 hover:opacity-100 transition-opacity">
            <XCircle size={18} />
          </button>
        </div>

        {/* Content */}
        <div className={`p-6 ${style.bg} space-y-4`}>
          <div className="flex gap-4 items-start">
            <div className={`flex-shrink-0 mt-0.5 ${style.iconColor}`}>
              <AlertTriangle size={24} />
            </div>
            <div className="space-y-3 flex-grow">
              <p className="font-serif text-sm font-bold text-[#1F1F1F] leading-snug">
                {message}
              </p>
              {errors && errors.length > 0 && (
                <div className="border-t border-[#1F1F1F]/10 pt-3 mt-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#6A6A6A] block mb-1.5">
                    Required Fixes:
                  </span>
                  <ul className="space-y-1 bg-white border border-[#1F1F1F] p-3">
                    {errors.map((err, i) => (
                      <li key={i} className="font-mono text-[10px] text-[#8D0B41] flex items-start gap-1.5 leading-relaxed">
                        <span className="text-[#8D0B41]">•</span>
                        <span>{err}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white flex justify-end border-t border-[#1F1F1F]">
          <Button variant={style.btnVariant} className="px-6 py-2.5" onClick={onClose}>
            Acknowledge
          </Button>
        </div>
      </div>
    </div>
  );
};

interface MetricProps {
  label: string;
  value: string;
  subtext: string;
  icon: LucideIcon;
  trend?: string;
}

const Metric = ({ label, value, subtext, icon: Icon, trend = "" }: MetricProps) => (
  <Card className="relative overflow-hidden group hover:border-[#8D0B41] transition-colors">
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
      <Icon size={64} className="text-[#1F1F1F]" />
    </div>
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1 h-4 bg-[#8D0B41]"></div>
        <span className="text-[10px] font-mono font-bold uppercase text-[#6A6A6A] tracking-widest">{label}</span>
      </div>
      <div className="text-4xl font-serif font-bold text-[#1F1F1F] mt-1">{value}</div>
      <div className="mt-3 text-xs font-mono text-[#6A6A6A] flex justify-between items-end border-t border-gray-100 pt-3">
        <span>{subtext}</span>
        {trend && <span className="text-[#8D0B41] font-bold">{trend}</span>}
      </div>
    </div>
  </Card>
);

// --- VIEWS ---

const DashboardView = ({ stats, onRefresh }: { stats: any, onRefresh: () => void }) => (
  <div className="space-y-8">
    <SectionHeader title="System Control" subtitle="Real-time Infrastructure Monitoring" />

    <div className="grid grid-cols-4 gap-6">
      <Metric
        label="API Gateway"
        value={stats?.apiGateway || "---"}
        subtext="Latency: 24ms"
        icon={Activity}
        trend="99.99%"
      />
      <Metric
        label="Active Nodes"
        value={stats?.activeNodes?.toString() || "0"}
        subtext={`${stats?.usedLicenses || 0} Used / ${stats?.availableLicenses || 0} Available`}
        icon={Server}
        trend={`+${stats?.registryCount || 0}`}
      />
      <Metric
        label="Licensing"
        value={stats?.licensing || "---"}
        subtext="Service Status"
        icon={Key}
      />
      <Metric
        label="Incidents"
        value={stats?.incidents?.toString() || "0"}
        subtext="Pending Review"
        icon={AlertTriangle}
        trend="LOW"
      />
    </div>

    <div className="grid grid-cols-3 gap-6">
      <Card title="Activation Velocity" className="col-span-2">
        <div className="flex items-end justify-between mb-6">
          <div>
            <span className="text-5xl font-serif font-bold text-[#1F1F1F]">{stats?.licensesIssued24h || 0}</span>
            <span className="ml-3 text-sm font-mono text-[#6A6A6A] uppercase tracking-wide">Licenses Issued (24h)</span>
          </div>
          <button
            onClick={onRefresh}
            className="p-2 hover:bg-gray-100 rounded-full transition-all duration-300 active:rotate-180"
            title="Refresh Stats"
          >
            <RefreshCw className="text-[#6A6A6A]" size={20} />
          </button>
        </div>
        <div className="h-4 bg-gray-100 w-full border border-gray-200 mt-2">
          <div
            className="h-full bg-[#8D0B41] relative transition-all duration-500 ease-out"
            style={{ width: `${Math.min(((stats?.licensesIssued24h || 0) / 20) * 100, 100)}%` }}
          >
            <div className="absolute right-0 top-0 bottom-0 w-px bg-white"></div>
          </div>
        </div>
        <div className="mt-2 flex justify-between text-[10px] font-mono text-[#6A6A6A] uppercase">
          <span>00:00</span>
          <span>12:00</span>
          <span>24:00</span>
        </div>
      </Card>

      <Card title="Component Status">
        <div className="space-y-0">
          {[
            { name: 'SYNC_SERVICE', status: 'IDLE' },
            { name: 'AUTH_MODULE', status: 'OK' },
            { name: 'DB_SHARD_01', status: 'OK' },
            { name: 'DB_SHARD_02', status: 'OK' },
          ].map((item, i) => (
            <div key={i} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
              <span className="font-mono text-xs text-[#6A6A6A]">{item.name}</span>
              <span className="font-mono text-xs font-bold text-[#1F1F1F] bg-gray-100 px-2 py-0.5">{item.status}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  </div>
);

interface RestaurantsViewProps {
  data: Restaurant[];
  userRole: string;
  onSuspend: (id: string) => void;
  onNewRestaurant: (name: string) => void;
  onDelete: (id: string) => void;
}

const RestaurantsView = ({ data, userRole, onSuspend, onNewRestaurant, onDelete }: RestaurantsViewProps) => {
  const [showModal, setShowModal] = useState(false);
  const [newRestName, setNewRestName] = useState('');

  const handleCreate = () => {
    onNewRestaurant(newRestName);
    setNewRestName('');
    setShowModal(false);
  }

  return (
    <>
      <SectionHeader
        title="Entities"
        subtitle="Global Restaurant Registry"
        action={
          userRole === 'INTERN'
            ? <Button disabled variant="secondary" className="opacity-50 cursor-not-allowed">Locked for Intern</Button>
            : <Button onClick={() => setShowModal(true)}>+ Initialize Entity</Button>
        }
      />
      <div className="border border-[#1F1F1F]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#1F1F1F] text-white">
            <tr>
              <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">ID</th>
              <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">Legal Name</th>
              <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">Tier</th>
              <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">Devices</th>
              <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">State</th>
              <th className="px-6 py-4 text-right font-mono font-normal uppercase tracking-widest text-[10px]">Control</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((r) => (
              <tr key={r.id} className="hover:bg-[#FFFFF0] group transition-colors">
                <td className="px-6 py-4 font-mono text-[#6A6A6A] text-xs border-r border-transparent group-hover:border-[#8D0B41]/20">{r.id}</td>
                <td className="px-6 py-4 font-serif font-bold text-[#1F1F1F] text-lg">{r.name}</td>
                <td className="px-6 py-4 font-mono text-xs text-[#1F1F1F] uppercase">{r.licenseType}</td>
                <td className="px-6 py-4 font-mono text-xs text-[#1F1F1F]">{r.devices}</td>
                <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => onSuspend(r.id)}
                    disabled={userRole === 'INTERN'}
                    className={`font-mono text-[10px] font-bold uppercase tracking-widest underline decoration-1 underline-offset-4 mr-4 ${
                      userRole === 'INTERN'
                        ? 'text-gray-300 cursor-not-allowed no-underline'
                        : 'text-[#1F1F1F] hover:text-[#8D0B41]'
                    }`}
                  >
                    {(r.status === 'Suspended' || r.status === 'SUSPENDED') ? 'Resume Service' : 'Suspend Service'}
                  </button>
                  <button
                    onClick={() => onDelete(r.id)}
                    disabled={userRole === 'INTERN'}
                    className={`font-mono text-[10px] font-bold uppercase tracking-widest underline decoration-1 underline-offset-4 ${
                      userRole === 'INTERN'
                        ? 'text-gray-300 cursor-not-allowed no-underline'
                        : 'text-red-500 hover:text-red-700'
                    }`}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Initialize New Restaurant Entity"
        onConfirm={handleCreate}
        confirmText="Initialize"
      >
        <div className="bg-yellow-50 border-l-2 border-yellow-500 p-3 mb-6">
          <p className="text-xs font-mono text-yellow-800 uppercase tracking-tight">
            ⚠ Record Immutability Notice: Created entities cannot be deleted, only archived.
          </p>
        </div>
        <div className="space-y-4">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6A6A6A] mb-1">Legal Entity Name</label>
          <input
            type="text"
            className="w-full bg-white border-b-2 border-[#1F1F1F] px-3 py-3 text-lg font-serif placeholder:text-gray-300 focus:outline-none focus:border-[#8D0B41] transition-colors"
            placeholder="e.g. TableTop Enterprises LLC"
            value={newRestName}
            onChange={(e) => setNewRestName(e.target.value)}
          />
        </div>
      </Modal>
    </>
  );
};

interface KeysViewProps {
  keys: LicenseKey[];
  restaurants: Restaurant[];
  onGenerate: (restaurantId: string) => void;
  onDelete: (id: string) => void;
}

const KeysView = ({ keys, restaurants, onGenerate, onDelete }: KeysViewProps) => {
  const [selectedRestId, setSelectedRestId] = useState(restaurants[0]?.id || '');

  useEffect(() => {
    if (!selectedRestId && restaurants.length > 0) {
      setSelectedRestId(restaurants[0].id);
    }
  }, [restaurants, selectedRestId]);

  return (
    <div className="space-y-8">
      <SectionHeader title="License Keys" subtitle="One-time Activation Tokens" />

      <div className="grid grid-cols-12 gap-8">
        {/* Generator Panel */}
        <div className="col-span-4">
          <Card title="Generator Protocol" className="h-full bg-[#FFFFF0]">
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6A6A6A] mb-2">Target Entity</label>
                <CustomSelect
                  value={selectedRestId}
                  onChange={setSelectedRestId}
                  options={restaurants.map(r => ({ value: r.id, label: r.name }))}
                />
              </div>

              <div className="border border-[#1F1F1F] p-4 bg-white">
                <div className="flex items-center gap-2 mb-2">
                  <Lock size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Security Policy</span>
                </div>
                <ul className="text-xs text-[#6A6A6A] space-y-1 font-mono list-disc list-inside">
                  <li>Key validity: 24 hours</li>
                  <li>Single-device binding</li>
                  <li>Logged generation event</li>
                </ul>
              </div>

              <Button onClick={() => onGenerate(selectedRestId)} className="w-full py-4 text-sm">Generate Key</Button>
            </div>
          </Card>
        </div>

        {/* List Panel */}
        <div className="col-span-8">
          <Card title="Generation Log" noPadding>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-[#1F1F1F]">
                  <tr>
                    <th className="px-6 py-3 font-mono font-normal text-[#6A6A6A] text-[10px] uppercase tracking-widest">Token</th>
                    <th className="px-6 py-3 font-mono font-normal text-[#6A6A6A] text-[10px] uppercase tracking-widest">Entity</th>
                    <th className="px-6 py-3 font-mono font-normal text-[#6A6A6A] text-[10px] uppercase tracking-widest">Bind Hash</th>
                    <th className="px-6 py-3 font-mono font-normal text-[#6A6A6A] text-[10px] uppercase tracking-widest text-right">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {keys.map((k, idx) => (
                    <tr key={idx} className="hover:bg-[#FFFFF0]">
                      <td className="px-6 py-4 font-mono text-[#1F1F1F] text-xs font-bold select-all">{k.code}</td>
                      <td className="px-6 py-4">
                        <div className="font-serif text-[#1F1F1F]">{k.restaurant}</div>
                        {k.entityId && <div className="text-[10px] font-mono text-[#6A6A6A] mt-1 select-all">{k.entityId}</div>}
                      </td>
                      <td className="px-6 py-4 font-mono text-[10px] text-[#6A6A6A]">{k.boundTo || '---'}</td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2 items-center">
                        <StatusBadge status={k.status} />
                        <button onClick={() => onDelete(k.id)} className="text-red-500 hover:text-red-700 ml-2">
                          <XCircle size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

interface DeviceViewProps {
  devices: Device[];
}

const DeviceView = ({ devices }: DeviceViewProps) => (
  <div className="space-y-8">
    <SectionHeader title="Hardware Registry" subtitle="Physical Device Bindings" />
    <div className="border border-[#1F1F1F]">
      <table className="w-full text-left text-sm">
        <thead className="bg-[#1F1F1F] text-white">
          <tr>
            <th className="px-6 py-3 font-mono font-normal text-[10px] uppercase tracking-widest">Hardware ID</th>
            <th className="px-6 py-3 font-mono font-normal text-[10px] uppercase tracking-widest">Entity</th>
            <th className="px-6 py-3 font-mono font-normal text-[10px] uppercase tracking-widest">Class</th>
            <th className="px-6 py-3 font-mono font-normal text-[10px] uppercase tracking-widest">Heartbeat</th>
            <th className="px-6 py-3 font-mono font-normal text-[10px] uppercase tracking-widest text-right">State</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {devices.map((d, idx) => (
            <tr key={idx} className="hover:bg-[#FFFFF0]">
              <td className="px-6 py-4 font-mono text-[#1F1F1F] text-xs font-bold">{d.hash}</td>
              <td className="px-6 py-4 font-serif text-[#1F1F1F]">{d.restaurant}</td>
              <td className="px-6 py-4 font-mono text-xs text-[#6A6A6A] uppercase">{d.type}</td>
              <td className="px-6 py-4 font-mono text-[10px] text-[#6A6A6A]">{d.lastSeen}</td>
              <td className="px-6 py-4 text-right"><StatusBadge status={d.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

interface SupportViewProps {
  onOverride: (type: string) => void;
}

const SupportView = ({ onOverride }: SupportViewProps) => {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="space-y-8">
      <SectionHeader title="Override Controls" subtitle="Restricted Access Area" />

      <div className="bg-[#8D0B41] text-white p-6 flex items-start gap-6 border-l-8 border-black">
        <AlertTriangle className="text-white shrink-0" size={32} />
        <div>
          <h4 className="font-mono font-bold uppercase tracking-widest text-sm mb-1">Restricted Module</h4>
          <p className="font-serif opacity-90 leading-relaxed max-w-2xl">
            You are operating in a privileged capability zone. All actions performed here bypass standard validation checks and are written directly to the immutable security ledger.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card title="Tier 1: Hardware Reset" className="border-t-[6px] border-t-[#8D0B41]">
          <p className="text-sm font-serif text-[#6A6A6A] mb-8 min-h-[4rem]">
            Forcefully unbinds all devices from a specific entity. Immediate outage for the client.
          </p>
          <Button variant="danger" className="w-full" onClick={() => setConfirmOpen(true)}>Execute Unbind</Button>
        </Card>

        <Card title="Tier 2: Bypass" className="border-t-[6px] border-t-[#1F1F1F]">
          <p className="text-sm font-serif text-[#6A6A6A] mb-8 min-h-[4rem]">
            Generates a permanent offline license key for air-gapped deployments.
          </p>
          <Button variant="secondary" className="w-full" onClick={() => onOverride("Activation Bypass")}>Generate Token</Button>
        </Card>

        <Card title="Tier 3: Cache Maintenance" className="border-t-[6px] border-t-[#1F1F1F]">
          <p className="text-sm font-serif text-[#6A6A6A] mb-8 min-h-[4rem]">
            Clears server-side licensing cache. Low risk maintenance action.
          </p>
          <Button variant="secondary" className="w-full" onClick={() => onOverride("Cache Flush")}>Flush Regional</Button>
        </Card>
      </div>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Override Confirmation"
        variant="danger"
        confirmText="CONFIRM EXECUTION"
        onConfirm={() => {
          onOverride("Force Unbind All");
          setConfirmOpen(false);
        }}
      >
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-[#8D0B41] text-white mx-auto flex items-center justify-center">
            <AlertTriangle size={32} />
          </div>
          <div>
            <p className="font-serif text-xl font-bold text-[#1F1F1F] mb-2">Confirm Hardware Unbind</p>
            <p className="font-mono text-xs text-[#6A6A6A] max-w-xs mx-auto">
              ACTION: FORCE_UNBIND_ALL<br />
              TARGET: ALL_NODES<br />
              UNDO: IMPOSSIBLE
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

interface AuditViewProps {
  logs: Log[];
  page: number;
  totalPages: number;
  severity: string;
  search: string;
  startDate: string;
  endDate: string;
  userRole: string;
  onPageChange: (page: number) => void;
  onSeverityChange: (sev: string) => void;
  onSearchChange: (search: string) => void;
  onDateChange: (start: string, end: string) => void;
  onRefresh: () => void;
}

const AuditView = ({
  logs,
  page,
  totalPages,
  severity,
  search,
  startDate,
  endDate,
  userRole,
  onPageChange,
  onSeverityChange,
  onSearchChange,
  onDateChange,
  onRefresh
}: AuditViewProps) => {
  const [localSearch, setLocalSearch] = useState(search);
  const [localStart, setLocalStart] = useState(startDate);
  const [localEnd, setLocalEnd] = useState(endDate);

  const handleApplyFilters = () => {
    onSearchChange(localSearch);
    onDateChange(localStart, localEnd);
  };

  const handleResetFilters = () => {
    setLocalSearch('');
    setLocalStart('');
    setLocalEnd('');
    onSearchChange('');
    onSeverityChange('');
    onDateChange('', '');
  };

  const getSeverityBadgeClass = (sev: string) => {
    switch (sev) {
      case 'SECURITY':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'INFO':
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeader title="Security Ledger" subtitle="Immutable Audit Trail" />

      {/* Filter Toolbar */}
      <div className="bg-white border border-[#1F1F1F] p-6 shadow-[2px_2px_0px_0px_rgba(31,31,31,0.05)] space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-widest text-[#6A6A6A] mb-1">Search Action/User</label>
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-white border border-[#1F1F1F] px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#8D0B41]"
              placeholder="e.g. login_success"
            />
          </div>
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-widest text-[#6A6A6A] mb-1">Severity Level</label>
            <CustomSelect
              value={severity}
              onChange={onSeverityChange}
              options={[
                { value: "", label: "ALL LEVELS" },
                { value: "INFO", label: "INFO" },
                { value: "WARNING", label: "WARNING" },
                { value: "CRITICAL", label: "CRITICAL" },
                ...(userRole === 'OWNER' ? [{ value: 'SECURITY', label: 'SECURITY' }] : [])
              ]}
            />
          </div>
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-widest text-[#6A6A6A] mb-1">Start Date</label>
            <input
              type="date"
              value={localStart}
              onChange={(e) => setLocalStart(e.target.value)}
              className="w-full bg-white border border-[#1F1F1F] px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#8D0B41]"
            />
          </div>
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-widest text-[#6A6A6A] mb-1">End Date</label>
            <input
              type="date"
              value={localEnd}
              onChange={(e) => setLocalEnd(e.target.value)}
              className="w-full bg-white border border-[#1F1F1F] px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#8D0B41]"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleResetFilters} className="py-2 text-[10px]">Reset</Button>
          <Button onClick={handleApplyFilters} className="py-2 text-[10px]">Apply Filters</Button>
        </div>
      </div>

      <div className="bg-[#1F1F1F] text-[#FFFFF0] font-mono text-xs p-1 border-2 border-[#1F1F1F] shadow-lg">
        <div className="border-b border-gray-700 px-4 py-3 flex justify-between items-center bg-[#1F1F1F]">
          <span className="uppercase tracking-widest text-gray-400">/var/log/sys_audit.log</span>
          <div className="flex gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
          </div>
        </div>
        <div className="p-2 max-h-[600px] overflow-y-auto bg-black/20">
          <table className="w-full text-left">
            <tbody className="divide-y divide-gray-800/50">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">No logs matching query criteria</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-2 px-2 text-gray-500 w-48">{log.timestamp}</td>
                    <td className="py-2 px-2 text-[#8D0B41] font-bold w-32">[{log.user}]</td>
                    <td className="py-2 px-2 text-white w-48">
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold border mr-2 uppercase ${getSeverityBadgeClass(log.severity)}`}>
                        {log.severity}
                      </span>
                      {log.action}
                    </td>
                    <td className="py-2 px-2 text-gray-400">{log.details} <span className="text-gray-600">({log.target})</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between items-center bg-white border border-[#1F1F1F] p-4">
        <span className="text-[10px] font-bold font-mono text-[#6A6A6A] uppercase">
          Showing Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="py-1 px-3 text-[10px]"
          >
            ← Prev
          </Button>
          <Button
            variant="secondary"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="py-1 px-3 text-[10px]"
          >
            Next →
          </Button>
        </div>
      </div>
    </div>
  );
};

interface PaymentsViewProps {
  payments: any[];
  userRole: string;
  onRefundClick: (payment: any) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
}

const PaymentsView = ({ payments, userRole, onRefundClick, statusFilter, setStatusFilter }: PaymentsViewProps) => {
  const totalAmount = userRole === 'INTERN'
    ? null
    : payments
        .filter(p => p.status === 'SUCCESS')
        .reduce((sum, p) => sum + p.amount, 0);

  const filteredPayments = statusFilter === 'ALL'
    ? payments
    : payments.filter(p => p.status === statusFilter);

  return (
    <div className="space-y-8">
      <SectionHeader title="Financial Ledger" subtitle="Payment Gateway Registry" />

      {userRole !== 'INTERN' && totalAmount !== null && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card title="Total Settlement" className="bg-[#FFFFF0]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-4 bg-[#8D0B41]"></div>
              <span className="text-[10px] font-mono font-bold uppercase text-[#6A6A6A] tracking-widest">Settled Volume</span>
            </div>
            <div className="text-3xl font-serif font-bold text-[#1F1F1F]">${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</div>
          </Card>
        </div>
      )}

      <div className="flex justify-between items-center bg-white border border-[#1F1F1F] p-4 shadow-[2px_2px_0px_0px_rgba(31,31,31,0.05)]">
        <div className="flex gap-2">
          {['ALL', 'SUCCESS', 'PENDING', 'FAILED', 'REFUNDED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 text-[10px] font-bold font-mono border uppercase tracking-widest transition-all duration-100 ${
                statusFilter === status
                  ? 'bg-[#1F1F1F] text-white border-[#1F1F1F]'
                  : 'bg-white text-[#6A6A6A] border-gray-300 hover:border-[#1F1F1F]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="border border-[#1F1F1F] overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[#1F1F1F] text-white">
            <tr>
              <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">Date</th>
              <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">Restaurant</th>
              <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">Invoice Reference</th>
              <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">Transaction ID</th>
              <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">Amount</th>
              <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">State</th>
              <th className="px-6 py-4 text-right font-mono font-normal uppercase tracking-widest text-[10px]">Control</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-xs font-mono text-[#6A6A6A] uppercase bg-[#FFFFF0]/30">No payments found</td>
              </tr>
            ) : (
              filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-[#FFFFF0] transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-[#6A6A6A]">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-serif font-bold text-[#1F1F1F]">{p.restaurant?.name || 'Unknown'}</td>
                  <td className="px-6 py-4 font-mono text-xs select-all">{p.invoiceRef}</td>
                  <td className="px-6 py-4 font-mono text-xs select-all">{p.transactionId}</td>
                  <td className="px-6 py-4 font-mono text-xs font-bold text-[#1F1F1F]">${p.amount} {p.currency}</td>
                  <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                  <td className="px-6 py-4 text-right">
                    {p.status === 'SUCCESS' ? (
                      <button
                        onClick={() => onRefundClick(p)}
                        disabled={userRole === 'INTERN'}
                        className={`font-mono text-[10px] font-bold uppercase tracking-widest underline decoration-1 underline-offset-4 ${
                          userRole === 'INTERN'
                            ? 'text-gray-300 cursor-not-allowed no-underline'
                            : 'text-[#8D0B41] hover:text-[#700833]'
                        }`}
                      >
                        Refund
                      </button>
                    ) : (
                      <span className="font-mono text-[10px] text-[#6A6A6A] uppercase tracking-widest">N/A</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface CouponsViewProps {
  coupons: any[];
  userRole: string;
  onCreateClick: () => void;
  onDisableClick: (id: string) => void;
}

const CouponsView = ({ coupons, userRole, onCreateClick, onDisableClick }: CouponsViewProps) => {
  return (
    <div className="space-y-8">
      <SectionHeader
        title="Discount Protocols"
        subtitle="Campaign Coupon Registry"
        action={
          userRole !== 'INTERN' ? (
            <Button onClick={onCreateClick}>+ Create Coupon</Button>
          ) : (
            <Button disabled variant="secondary" className="opacity-50 cursor-not-allowed">Locked for Intern</Button>
          )
        }
      />
      <div className="border border-[#1F1F1F]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#1F1F1F] text-white">
            <tr>
              <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">Code</th>
              <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">Type</th>
              <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">Value</th>
              <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">Expiration</th>
              <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">Usage Limit</th>
              <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">State</th>
              <th className="px-6 py-4 text-right font-mono font-normal uppercase tracking-widest text-[10px]">Control</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-xs font-mono text-[#6A6A6A] uppercase bg-[#FFFFF0]/30">No coupons configured</td>
              </tr>
            ) : (
              coupons.map((c) => (
                <tr key={c.id} className="hover:bg-[#FFFFF0] transition-colors">
                  <td className="px-6 py-4 font-mono text-[#1F1F1F] text-sm font-bold uppercase select-all">{c.code}</td>
                  <td className="px-6 py-4 font-mono text-xs text-[#6A6A6A]">{c.discountType}</td>
                  <td className="px-6 py-4 font-mono text-xs font-bold text-[#1F1F1F]">
                    {c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `$${c.discountValue}`}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-[#6A6A6A]">
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'NEVER EXPIRES'}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-[#6A6A6A]">
                    {c.usageCount} / {c.maxUsage !== null ? c.maxUsage : '∞'}
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                  <td className="px-6 py-4 text-right">
                    {c.status === 'ACTIVE' ? (
                      <button
                        onClick={() => onDisableClick(c.id)}
                        disabled={userRole === 'INTERN'}
                        className={`font-mono text-[10px] font-bold uppercase tracking-widest underline decoration-1 underline-offset-4 ${
                          userRole === 'INTERN'
                            ? 'text-gray-300 cursor-not-allowed no-underline'
                            : 'text-[#8D0B41] hover:text-[#700833]'
                        }`}
                      >
                        Disable
                      </button>
                    ) : (
                      <span className="font-mono text-[10px] text-[#6A6A6A] uppercase tracking-widest">N/A</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface TeamViewProps {
  members: any[];
  sessions: any[];
  onCreateClick: () => void;
  onStatusChange: (id: string, currentStatus: boolean) => void;
  onResetPasswordClick: (member: any) => void;
  onDeleteMember: (member: any) => void;
  onRevokeSession: (sessionId: string) => void;
  onRevokeAllSessions: (adminId?: string) => void;
}

const TeamView = ({
  members,
  sessions,
  onCreateClick,
  onStatusChange,
  onResetPasswordClick,
  onDeleteMember,
  onRevokeSession,
  onRevokeAllSessions
}: TeamViewProps) => {
  return (
    <div className="space-y-12">
      <div>
        <SectionHeader
          title="Access Control"
          subtitle="Internal Staff Permissions"
          action={<Button onClick={onCreateClick}>+ Add Staff Member</Button>}
        />
        <div className="border border-[#1F1F1F] overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#1F1F1F] text-white">
              <tr>
                <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">Email</th>
                <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">Role</th>
                <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">Last Login</th>
                <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">Last Active</th>
                <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">2FA Status</th>
                <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">State</th>
                <th className="px-6 py-4 text-right font-mono font-normal uppercase tracking-widest text-[10px]">Control</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-xs font-mono text-[#6A6A6A] uppercase bg-[#FFFFF0]/30">No team members registered</td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="hover:bg-[#FFFFF0] transition-colors">
                    <td className="px-6 py-4 font-mono text-sm font-bold text-[#1F1F1F] select-all">{m.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 font-mono text-[10px] font-bold border ${
                        m.role === 'OWNER'
                          ? 'bg-[#8D0B41] text-white border-[#8D0B41]'
                          : m.role === 'MANAGER'
                          ? 'bg-[#1F1F1F] text-white border-[#1F1F1F]'
                          : 'bg-white text-[#6A6A6A] border-gray-300'
                      }`}>
                        {m.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-[#6A6A6A]">
                      {m.lastLogin ? new Date(m.lastLogin).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-[#6A6A6A]">
                      {m.lastActive ? new Date(m.lastActive).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {m.twoFactorEnabled ? (
                        <span className="text-green-600 font-bold uppercase tracking-wider">Enabled</span>
                      ) : (
                        <span className="text-gray-400 uppercase tracking-wider">Disabled</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={m.isActive ? 'ACTIVE' : 'SUSPENDED'} />
                    </td>
                    <td className="px-6 py-4 text-right space-x-4">
                      <button
                        onClick={() => onStatusChange(m.id, m.isActive)}
                        className="text-[#1F1F1F] hover:text-[#8D0B41] font-mono text-[10px] font-bold uppercase tracking-widest underline decoration-1 underline-offset-4"
                      >
                        {m.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      {m.isActive ? (
                        <button
                          onClick={() => onResetPasswordClick(m)}
                          className="text-[#8D0B41] hover:text-[#700833] font-mono text-[10px] font-bold uppercase tracking-widest underline decoration-1 underline-offset-4"
                        >
                          Reset PW
                        </button>
                      ) : (
                        <button
                          onClick={() => onDeleteMember(m)}
                          className="text-red-600 hover:text-red-800 font-mono text-[10px] font-bold uppercase tracking-widest underline decoration-1 underline-offset-4"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-end mb-8 pb-4 border-b-2 border-[#1F1F1F]">
          <div>
            <h2 className="text-2xl font-serif font-bold text-[#1F1F1F] tracking-tight">Active Sessions & Devices</h2>
            <div className="text-[#6A6A6A] font-mono text-xs uppercase tracking-wider mt-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-[#8D0B41]"></span>
              Current Login Tokens
            </div>
          </div>
          <Button variant="danger" onClick={() => onRevokeAllSessions()}>Logout All Sessions</Button>
        </div>

        <div className="border border-[#1F1F1F] overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#1F1F1F] text-white">
              <tr>
                <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">Email</th>
                <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">Role</th>
                <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">IP Address</th>
                <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">User Agent</th>
                <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">Authenticated At</th>
                <th className="px-6 py-4 text-right font-mono font-normal uppercase tracking-widest text-[10px]">Control</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs font-mono text-[#6A6A6A] uppercase bg-[#FFFFF0]/30">No active login sessions found</td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr key={s.id} className={`hover:bg-[#FFFFF0] transition-colors ${s.isCurrent ? 'bg-yellow-50/50' : ''}`}>
                    <td className="px-6 py-4 font-mono text-xs font-bold text-[#1F1F1F] select-all">
                      {s.email} {s.isCurrent && <span className="text-[#8D0B41] font-mono text-[9px] uppercase font-bold ml-1 tracking-wider">[Current]</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-1.5 py-0.5 font-mono text-[9px] border bg-gray-100 text-[#6A6A6A] uppercase font-semibold">
                        {s.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-[#1F1F1F] select-all">{s.ipAddress}</td>
                    <td className="px-6 py-4 font-mono text-xs text-[#6A6A6A] max-w-[200px] truncate select-all" title={s.userAgent}>{s.userAgent}</td>
                    <td className="px-6 py-4 font-mono text-xs text-[#6A6A6A]">{new Date(s.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onRevokeSession(s.id)}
                        className="text-[#8D0B41] hover:text-[#700833] font-mono text-[10px] font-bold uppercase tracking-widest underline decoration-1 underline-offset-4"
                      >
                        Terminate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- MAIN LAYOUT ---

export default function DineStackAdmin() {
  const router = useRouter();
  // Production: use same-origin (Vercel rewrites handle routing)
  // Development: use localhost
  const API_BASE = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? ''  // Same origin for production
    : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000');
  const [isLoading, setIsLoading] = useState(true); // State for dashboard data
  const [stats, setStats] = useState<any>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);
  const [restaurantDeleteModalOpen, setRestaurantDeleteModalOpen] = useState(false);
  const [restaurantToDelete, setRestaurantToDelete] = useState<string | null>(null);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [restaurantToSuspend, setRestaurantToSuspend] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Custom Alert State
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
    errors?: string[];
  } | null>(null);

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'error', errors?: string[]) => {
    setNotification({
      isOpen: true,
      title,
      message,
      type,
      errors
    });
  };

  // RBAC and State Extensions
  const [userRole, setUserRole] = useState<string>('MANAGER');
  const [userEmail, setUserEmail] = useState<string>('');

  const [payments, setPayments] = useState<any[]>([]);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [paymentToRefund, setPaymentToRefund] = useState<any>(null);
  const [refundReason, setRefundReason] = useState('');

  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState('PERCENTAGE');
  const [newCouponValue, setNewCouponValue] = useState('');
  const [newCouponExpiresAt, setNewCouponExpiresAt] = useState('');
  const [newCouponMaxUsage, setNewCouponMaxUsage] = useState('');

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

  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsFilterSeverity, setLogsFilterSeverity] = useState('');
  const [logsSearch, setLogsSearch] = useState('');
  const [logsStartDate, setLogsStartDate] = useState('');
  const [logsEndDate, setLogsEndDate] = useState('');


  // --- Auth-aware fetch wrapper with automatic token refresh ---
  const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const token = localStorage.getItem('SUPER_ADMIN_TOKEN');
    const mergedOptions: RequestInit = {
      ...options,
      credentials: 'include' as RequestCredentials,
      headers: {
        ...(options.headers || {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      cache: 'no-store' as RequestCache,
    };

    let res = await fetch(url, mergedOptions);

    // If token expired, attempt refresh once
    if (res.status === 401) {
      const body = await res.clone().json().catch(() => ({}));
      if (body.code === 'TOKEN_EXPIRED') {
        // Try to refresh
        const refreshRes = await fetch(`${API_BASE}/super-admin/refresh`, {
          method: 'POST',
          credentials: 'include',
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          // Update stored access token
          if (refreshData.token) {
            localStorage.setItem('SUPER_ADMIN_TOKEN', refreshData.token);
          }
          // Retry original request with new token
          const retryOptions: RequestInit = {
            ...options,
            credentials: 'include' as RequestCredentials,
            headers: {
              ...(options.headers || {}),
              ...(refreshData.token ? { 'Authorization': `Bearer ${refreshData.token}` } : {}),
            },
            cache: 'no-store' as RequestCache,
          };
          res = await fetch(url, retryOptions);
        } else {
          // Refresh failed — redirect to login
          localStorage.removeItem('SUPER_ADMIN_TOKEN');
          localStorage.removeItem('admin');
          router.push('/login');
          return res;
        }
      }
    }

    return res;
  };

  const fetchLogs = async (page = 1, severity = '', search = '', start = '', end = '') => {
    let url = `${API_BASE}/super-admin/dashboard/logs?page=${page}&limit=20`;
    if (severity) url += `&severity=${severity}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (start) url += `&startDate=${start}`;
    if (end) url += `&endDate=${end}`;

    try {
      const res = await fetchWithAuth(url);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setLogsPage(data.pagination?.page || 1);
        setLogsTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    }
  };

  // Fetch data on load
  const fetchData = async () => {
    const token = localStorage.getItem('SUPER_ADMIN_TOKEN');
    if (!token) {
      router.push('/login');
      return;
    }

    // Parse role from local storage first to know what is allowed
    let role = 'INTERN';
    const adminStr = localStorage.getItem('admin');
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

    const baseUrl = `${API_BASE}/super-admin/dashboard`;

    try {
      setIsLoading(true); // Show loading state on refresh
      setError(null);

      // Ping check
      const pingRes = await fetchWithAuth(`${baseUrl}/ping`);
      if (!pingRes.ok) {
        if (pingRes.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error(`Backend ping failed: ${pingRes.status}`);
      }

      // 1. Stats and Restaurants are accessible to all (dashboard stats)
      const statsRes = await fetchWithAuth(`${baseUrl}/stats`);
      if (statsRes.ok) setStats(await statsRes.json());

      const restRes = await fetchWithAuth(`${baseUrl}/restaurants`);
      if (restRes.ok) setRestaurants(await restRes.json());

      // 2. Licensing keys (OWNER / MANAGER)
      if (role === 'OWNER' || role === 'MANAGER') {
        const keysRes = await fetchWithAuth(`${baseUrl}/keys`);
        if (keysRes.ok) setKeys(await keysRes.json());
      }

      // 3. Hardware Devices (OWNER only)
      if (role === 'OWNER') {
        const devicesRes = await fetchWithAuth(`${baseUrl}/devices`);
        if (devicesRes.ok) setDevices(await devicesRes.json());
      }

      // 4. Coupons and Payments (All roles)
      const couponsRes = await fetchWithAuth(`${API_BASE}/super-admin/coupons`);
      if (couponsRes.ok) setCoupons(await couponsRes.json());

      const paymentsRes = await fetchWithAuth(`${API_BASE}/super-admin/payments`);
      if (paymentsRes.ok) setPayments(await paymentsRes.json());

      // 5. Team and Sessions (OWNER only)
      if (role === 'OWNER') {
        const teamRes = await fetchWithAuth(`${API_BASE}/super-admin/team`);
        if (teamRes.ok) setTeamMembers(await teamRes.json());

        const sessionsRes = await fetchWithAuth(`${API_BASE}/super-admin/sessions`);
        if (sessionsRes.ok) setActiveSessions(await sessionsRes.json());
      }

      // 6. Logs (OWNER and MANAGER, loaded dynamically with default params)
      if (role === 'OWNER' || role === 'MANAGER') {
        await fetchLogs(1, logsFilterSeverity, logsSearch, logsStartDate, logsEndDate);
      }
    } catch (error: any) {
      console.warn("Failed to fetch dashboard data:", error);
      setError(error.message || "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/super-admin/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('SUPER_ADMIN_TOKEN') || ''}`
        }
      });
    } catch {
      // Logout should always proceed even if backend call fails
    }
    localStorage.removeItem('SUPER_ADMIN_TOKEN');
    localStorage.removeItem('admin');
    router.push('/login');
  };

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
            ENDPOINT: {`${API_BASE}/super-admin/dashboard/ping`}
          </div>
          <Button onClick={fetchData} className="w-full">Retry Connection</Button>
        </div>
      </div>
    );
  }

  // Payments Handlers
  const handleRefundClick = (payment: any) => {
    setPaymentToRefund(payment);
    setRefundReason('');
    setRefundModalOpen(true);
  };

  const confirmRefundPayment = async () => {
    if (!paymentToRefund || !refundReason.trim()) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/super-admin/payments/${paymentToRefund.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: refundReason })
      });
      if (res.ok) {
        addLog('PAYMENT_REFUND', paymentToRefund.id, `Refunded payment of ${paymentToRefund.amount} USD. Reason: ${refundReason}`);
        fetchData();
      } else {
        const parsed = await safeJsonParse(res);
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
      const res = await fetchWithAuth(`${API_BASE}/super-admin/coupons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCouponCode,
          discountType: newCouponType,
          discountValue: parseFloat(newCouponValue),
          expiresAt: newCouponExpiresAt ? new Date(newCouponExpiresAt).toISOString() : null,
          maxUsage: newCouponMaxUsage ? parseInt(newCouponMaxUsage) : null
        })
      });
      if (res.ok) {
        const created = await res.json();
        addLog('COUPON_CREATE', created.id, `Created coupon ${newCouponCode}`);
        fetchData();
      } else {
        const parsed = await safeJsonParse(res);
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
      const res = await fetchWithAuth(`${API_BASE}/super-admin/coupons/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DISABLED' })
      });
      if (res.ok) {
        addLog('COUPON_DISABLE', id, `Disabled coupon`);
        fetchData();
      } else {
        const parsed = await safeJsonParse(res);
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
      const res = await fetchWithAuth(`${API_BASE}/super-admin/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newTeamEmail,
          password: newTeamPassword,
          role: newTeamRole
        })
      });
      if (res.ok) {
        const created = await res.json();
        addLog('TEAM_CREATE', created.id, `Created staff member ${newTeamEmail} with role ${newTeamRole}`);
        fetchData();
      } else {
        const parsed = await safeJsonParse(res);
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
      const res = await fetchWithAuth(`${API_BASE}/super-admin/team/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) {
        addLog('TEAM_STATUS_CHANGE', id, `Changed team member active status to ${!currentStatus}`);
        fetchData();
      } else {
        const parsed = await safeJsonParse(res);
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
      const res = await fetchWithAuth(`${API_BASE}/super-admin/team/${teamMemberToReset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newResetPassword })
      });
      if (res.ok) {
        addLog('TEAM_PASSWORD_RESET', teamMemberToReset.id, `Reset password for staff member ${teamMemberToReset.email}`);
        fetchData();
      } else {
        const parsed = await safeJsonParse(res);
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
      const res = await fetchWithAuth(`${API_BASE}/super-admin/team/${teamMemberToDelete.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        addLog('TEAM_DELETE', teamMemberToDelete.id, `Deleted staff member ${teamMemberToDelete.email}`);
        fetchData();
      } else {
        const parsed = await safeJsonParse(res);
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
      const res = await fetchWithAuth(`${API_BASE}/super-admin/sessions/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      if (res.ok) {
        addLog('SESSION_REVOKE', sessionId, `Revoked login session`);
        fetchData();
      } else {
        const parsed = await safeJsonParse(res);
        showAlert("Failed to revoke session", parsed.data?.message || 'Unknown error', 'error');
      }
    } catch (err: any) {
      showAlert("Operation Failed", `Error: ${err.message}`, 'error');
    }
  };

  const handleRevokeAllSessions = async (adminId?: string) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/super-admin/sessions/revoke-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId })
      });
      if (res.ok) {
        addLog('SESSION_REVOKE_ALL', adminId || 'ALL', `Revoked all active sessions`);
        fetchData();
      } else {
        const parsed = await safeJsonParse(res);
        showAlert("Failed to revoke all sessions", parsed.data?.message || 'Unknown error', 'error');
      }
    } catch (err: any) {
      showAlert("Operation Failed", `Error: ${err.message}`, 'error');
    }
  };

  // Helper to add logs (optimistic update + potentially backend call if needed)
  const addLog = (action: string, target: string, details: string, severity = 'INFO') => {
    const newLog: Log = {
      id: Date.now(),
      action,
      user: 'SuperAdmin',
      target,
      details,
      timestamp: new Date().toLocaleString(),
      severity
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // Actions
  const handleNewRestaurant = async (name: string) => {
    if (!name) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/super-admin/dashboard/restaurants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      const parsed = await safeJsonParse(res);

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
        fetchData(); // Refresh all data
      } else {
        showAlert("Failed to create restaurant", parsed.data?.message || 'Unknown error', 'error');
      }
    } catch (err: any) {
      console.error("Failed to create restaurant:", err);
      showAlert("Failed to create restaurant", err.message || 'Network error or invalid response.', 'error');
    }
  };

  const handleGenerateKey = async (restaurantId: string) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/super-admin/activation-codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          plan: "Standard",
          durationDays: 30,
          maxTables: 10
        })
      });

      if (res.ok) {
        addLog('KEY_GENERATE', restaurantId, 'Generated activation key');
        fetchData(); // Refresh all data
      } else {
        const parsed = await safeJsonParse(res);
        if (res.status === 409) {
          const codeMsg = parsed.data?.code ? `\n\nExisting Code: ${parsed.data.code}` : '';
          showAlert("Key Already Exists", (parsed.data?.message || 'This restaurant already has an active, unused activation code.') + codeMsg, 'error');
        } else {
          showAlert("Failed to generate key", parsed.data?.message || 'Unknown error', 'error');
        }
      }
    } catch (err: any) {
      console.error("Failed to generate key:", err);
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
      const res = await fetchWithAuth(`${API_BASE}/super-admin/activation-codes/${keyToDelete}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        addLog('KEY_DELETE', keyToDelete, 'Deleted activation key');
        fetchData(); // Refresh all data
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
      const res = await fetchWithAuth(`${API_BASE}/super-admin/dashboard/restaurants/${restaurantToDelete}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        addLog('ENTITY_DELETE', restaurantToDelete, 'Deleted entity and associated devices');
        fetchData(); // Refresh all data
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
      const res = await fetchWithAuth(`${API_BASE}/super-admin/dashboard/restaurants/${restaurantToSuspend}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          reason: newStatus === 'SUSPENDED' ? "Manual suspension by Super Admin" : "Manual reactivation",
          revokedBy: "Super Admin"
        })
      });

      if (res.ok) {
        addLog('STATUS_CHANGE', restaurantToSuspend, `Changed status to ${newStatus}`);
        fetchData(); // Refresh all data
      } else {
        console.error("Failed to update status");
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

  interface NavItemProps {
    id: string;
    label: string;
    icon: LucideIcon;
  }

  const NavItem = ({ id, label, icon: Icon }: NavItemProps) => (
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
          <NavItem id="dashboard" label="Overview" icon={Activity} />

          <div className="px-6 mb-3 mt-8 text-[10px] font-mono font-bold text-[#6A6A6A] uppercase tracking-widest flex items-center gap-2">
            <div className="w-1 h-1 bg-[#8D0B41]"></div>
            Administration
          </div>
          <NavItem id="restaurants" label="Entities" icon={Database} />
          <NavItem id="payments" label="Payments" icon={CreditCard} />
          <NavItem id="coupons" label="Coupons" icon={Tag} />
          {(userRole === 'OWNER' || userRole === 'MANAGER') && (
            <NavItem id="keys" label="Licensing" icon={Key} />
          )}
          {userRole === 'OWNER' && (
            <NavItem id="devices" label="Hardware" icon={HardDrive} />
          )}

          <div className="px-6 mb-3 mt-8 text-[10px] font-mono font-bold text-[#6A6A6A] uppercase tracking-widest flex items-center gap-2">
            <div className="w-1 h-1 bg-[#8D0B41]"></div>
            System Security
          </div>
          {(userRole === 'OWNER' || userRole === 'MANAGER') && (
            <NavItem id="audit" label="Audit Ledger" icon={Terminal} />
          )}
          <NavItem id="2fa" label="Two-Factor Auth" icon={Shield} />
          {userRole === 'OWNER' && (
            <NavItem id="users" label="Staff Access" icon={Users} />
          )}
          {userRole === 'OWNER' && (
            <NavItem id="support" label="Overrides" icon={AlertTriangle} />
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
          {currentView === '2fa' && <TwoFactorSettings apiBase={API_BASE} fetchWithAuth={fetchWithAuth} />}
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
