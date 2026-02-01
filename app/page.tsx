"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
  LogOut
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

const DashboardView = ({ stats }: { stats: any }) => (
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
        subtext="Registry Count"
        icon={Server}
        trend="+0"
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
          <RefreshCw className="text-[#6A6A6A] mb-2" />
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
  onSuspend: (id: string) => void;
  onNewRestaurant: (name: string) => void;
  onDelete: (id: string) => void;
}

const RestaurantsView = ({ data, onSuspend, onNewRestaurant, onDelete }: RestaurantsViewProps) => {
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
        action={<Button onClick={() => setShowModal(true)}>+ Initialize Entity</Button>}
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
                  <button onClick={() => onSuspend(r.id)} className="text-[#1F1F1F] hover:text-[#8D0B41] font-mono text-[10px] font-bold uppercase tracking-widest underline decoration-1 underline-offset-4 mr-4">
                    {(r.status === 'Suspended' || r.status === 'SUSPENDED') ? 'Resume Service' : 'Suspend Service'}
                  </button>
                  <button onClick={() => onDelete(r.id)} className="text-red-500 hover:text-red-700 font-mono text-[10px] font-bold uppercase tracking-widest underline decoration-1 underline-offset-4">
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
  onGenerate: (restaurantName: string) => void;
  onDelete: (id: string) => void;
}

const KeysView = ({ keys, restaurants, onGenerate, onDelete }: KeysViewProps) => {
  const [selectedRest, setSelectedRest] = useState(restaurants[0]?.name || '');

  useEffect(() => {
    if (!selectedRest && restaurants.length > 0) {
      setSelectedRest(restaurants[0].name);
    }
  }, [restaurants, selectedRest]);

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
                <div className="relative">
                  <select
                    className="w-full appearance-none bg-white border border-[#1F1F1F] px-4 py-3 text-sm font-serif focus:outline-none focus:ring-1 focus:ring-[#8D0B41]"
                    value={selectedRest}
                    onChange={(e) => setSelectedRest(e.target.value)}
                  >
                    {restaurants.map(r => <option key={r.id} value={r.name}>{r.name} ({r.id})</option>)}
                  </select>
                  <div className="absolute right-3 top-3.5 pointer-events-none text-[#1F1F1F]">
                    <ChevronRight size={14} className="rotate-90" />
                  </div>
                </div>
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

              <Button onClick={() => onGenerate(selectedRest)} className="w-full py-4 text-sm">Generate Key</Button>
            </div>
          </Card>
        </div>

        {/* List Panel */}
        <div className="col-span-8">
          <Card title="Generation Log" noPadding>
            <table className="w-full text-left text-sm">
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
                    <td className="px-6 py-4 font-serif text-[#1F1F1F]">{k.restaurant}</td>
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
}

const AuditView = ({ logs }: AuditViewProps) => (
  <div className="space-y-8">
    <SectionHeader title="Security Ledger" subtitle="Immutable Audit Trail" />
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
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-white/5 transition-colors">
                <td className="py-2 px-2 text-gray-500 w-40">{log.timestamp}</td>
                <td className="py-2 px-2 text-[#8D0B41] font-bold w-32">[{log.user}]</td>
                <td className="py-2 px-2 text-white w-40">{log.action}</td>
                <td className="py-2 px-2 text-gray-400">{log.details} <span className="text-gray-600">({log.target})</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

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

  // Fetch data on load
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('SUPER_ADMIN_TOKEN');
      if (!token) {
        router.push('/login');
        return;
      }

      const headers = { "Authorization": `Bearer ${token}` };
      const baseUrl = `${API_BASE}/super-admin/dashboard`;

      try {
        const [statsRes, restRes, keysRes, devicesRes, logsRes] = await Promise.all([
          fetch(`${baseUrl}/stats`, { headers }),
          fetch(`${baseUrl}/restaurants`, { headers }),
          fetch(`${baseUrl}/keys`, { headers }),
          fetch(`${baseUrl}/devices`, { headers }),
          fetch(`${baseUrl}/logs`, { headers })
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (restRes.ok) setRestaurants(await restRes.json());
        if (keysRes.ok) setKeys(await keysRes.json());
        if (devicesRes.ok) setDevices(await devicesRes.json());
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          // Ensure dates are formatted as expected
          setLogs(logsData);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [router]);

  const handleLogout = () => {
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

  // Helper to add logs (optimistic update + potentially backend call if needed)
  const addLog = (action: string, target: string, details: string) => {
    const newLog: Log = {
      id: Date.now(),
      action,
      user: 'SuperAdmin',
      target,
      details,
      timestamp: new Date().toLocaleString()
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // Actions
  const handleNewRestaurant = async (name: string) => {
    if (!name) return;
    try {
      const token = localStorage.getItem('SUPER_ADMIN_TOKEN');
      console.log('[DEBUG] Creating restaurant with token:', token ? `${token.substring(0, 20)}...` : 'MISSING');
      const res = await fetch(`${API_BASE}/super-admin/dashboard/restaurants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name })
      });

      const parsed = await safeJsonParse(res);

      if (!parsed.success) {
        alert(`Failed to create restaurant: ${parsed.error}`);
        return;
      }

      if (res.ok) {
        const newRest: Restaurant = parsed.data;
        setRestaurants([newRest, ...restaurants]);
        addLog('ENTITY_CREATE', newRest.id, `Created entity ${name}`);
      } else {
        alert(`Failed to create restaurant: ${parsed.data?.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error("Failed to create restaurant:", err);
      alert(`Failed to create restaurant: ${err.message || 'Network error or invalid response. Check console for details.'}`);
    }
  };

  const handleGenerateKey = async (restaurantName: string) => {
    try {
      const token = localStorage.getItem('SUPER_ADMIN_TOKEN');
      const res = await fetch(`${API_BASE}/super-admin/activation-codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          entityName: restaurantName,
          plan: "Standard",
          durationDays: 30,
          maxTables: 10
        })
      });

      if (res.ok) {
        addLog('KEY_GENERATE', restaurantName, 'Generated one-time activation key');
        // Refresh keys
        const keysRes = await fetch(`${API_BASE}/super-admin/dashboard/keys`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (keysRes.ok) setKeys(await keysRes.json());
      }
    } catch (err) {
      console.error(err);
    }
  };



  const handleDeleteClick = (id: string) => {
    setKeyToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDeleteKey = async () => {
    if (!keyToDelete) return;

    try {
      const token = localStorage.getItem('SUPER_ADMIN_TOKEN');
      const res = await fetch(`${API_BASE}/super-admin/activation-codes/${keyToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        addLog('KEY_DELETE', keyToDelete, 'Deleted activation key');
        setKeys(keys.filter(k => k.id !== keyToDelete));
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
      const token = localStorage.getItem('SUPER_ADMIN_TOKEN');
      const res = await fetch(`${API_BASE}/super-admin/dashboard/restaurants/${restaurantToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        addLog('ENTITY_DELETE', restaurantToDelete, 'Deleted entity and associated devices');
        setRestaurants(restaurants.filter(r => r.id !== restaurantToDelete));
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
      const token = localStorage.getItem('SUPER_ADMIN_TOKEN');
      const res = await fetch(`${API_BASE}/super-admin/dashboard/restaurants/${restaurantToSuspend}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          reason: newStatus === 'SUSPENDED' ? "Manual suspension by Super Admin" : "Manual reactivation",
          revokedBy: "Super Admin"
        })
      });

      if (res.ok) {
        addLog('STATUS_CHANGE', restaurantToSuspend, `Changed status to ${newStatus}`);
        setRestaurants(restaurants.map(r => r.id === restaurantToSuspend ? { ...r, status: newStatus } : r));
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
          <NavItem id="keys" label="Licensing" icon={Key} />
          <NavItem id="devices" label="Hardware" icon={HardDrive} />

          <div className="px-6 mb-3 mt-8 text-[10px] font-mono font-bold text-[#6A6A6A] uppercase tracking-widest flex items-center gap-2">
            <div className="w-1 h-1 bg-[#8D0B41]"></div>
            System Security
          </div>
          <NavItem id="audit" label="Audit Ledger" icon={Terminal} />
          <NavItem id="users" label="Staff Access" icon={Users} />
          <NavItem id="support" label="Overrides" icon={AlertTriangle} />
        </nav>

        <div className="p-6 border-t border-[#1F1F1F] bg-gray-50 flex justify-between items-center group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#1F1F1F] text-white flex items-center justify-center font-bold font-mono text-sm border border-[#1F1F1F]">SA</div>
            <div>
              <div className="text-sm font-bold font-serif">Super Admin</div>
              <div className="text-[10px] font-mono text-[#6A6A6A] uppercase tracking-wider">Perm Level: 5 (ROOT)</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-[#6A6A6A] hover:text-[#8D0B41] p-2 transition-colors opacity-0 group-hover:opacity-100"
            title="Terminate Session"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 ml-72 p-12 bg-[#FFFFF0] min-h-screen">
        <div className="max-w-6xl mx-auto">
          {currentView === 'dashboard' && <DashboardView stats={stats} />}
          {currentView === 'restaurants' && <RestaurantsView data={restaurants} onSuspend={handleSuspend} onNewRestaurant={handleNewRestaurant} onDelete={handleDeleteRestaurant} />}
          {currentView === 'keys' && <KeysView keys={keys} restaurants={restaurants} onGenerate={handleGenerateKey} onDelete={handleDeleteClick} />}
          {currentView === 'devices' && <DeviceView devices={devices} />}
          {currentView === 'support' && <SupportView onOverride={handleSupportOverride} />}
          {currentView === 'audit' && <AuditView logs={logs} />}

          {/* Placeholder for Users View */}
          {currentView === 'users' && (
            <div className="space-y-8">
              <SectionHeader title="Access Control" subtitle="Internal Staff Permissions" />
              <div className="p-24 text-center border-2 border-dashed border-[#6A6A6A] opacity-50">
                <Users size={48} className="mx-auto mb-4" />
                <h3 className="font-serif text-xl font-bold mb-2">Restricted Module</h3>
                <p className="font-mono text-xs uppercase tracking-widest">Requires Directory Admin Token</p>
              </div>
            </div>
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
    </div>
  );
}
