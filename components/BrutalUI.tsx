import React, { useState } from 'react';
import { Terminal, XCircle, AlertTriangle, LucideIcon } from 'lucide-react';

// --- Badges ---
interface StatusBadgeProps {
  status: string;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
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

// --- Section Header ---
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const SectionHeader = ({ title, subtitle = "", action = null }: SectionHeaderProps) => (
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

// --- Cards ---
interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  noPadding?: boolean;
}

export const Card = ({ children, title = "", className = "", noPadding = false }: CardProps) => (
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

// --- Buttons ---
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export const Button = ({ children, variant = 'primary', onClick, className = "", disabled = false }: ButtonProps) => {
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

// --- Custom Dropdown ---
interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

export const CustomSelect = ({ value, onChange, options, className = "" }: CustomSelectProps) => {
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

// --- Modals ---
interface ModalProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  confirmText?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const Modal = ({ isOpen, title, children, onClose, onConfirm, confirmText = "Confirm", variant = "primary" }: ModalProps) => {
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

// --- Custom Alerts ---
interface CustomAlertProps {
  isOpen: boolean;
  title: string;
  message: string;
  errors?: string[];
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

export const CustomAlert = ({ isOpen, title, message, errors, type, onClose }: CustomAlertProps) => {
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
        <div className={`${style.headerBg} ${style.headerText} px-6 py-3.5 border-b border-[#1F1F1F] flex justify-between items-center`}>
          <h3 className="font-mono font-bold uppercase tracking-widest text-[11px] flex items-center gap-2">
            <Terminal size={14} />
            {title}
          </h3>
          <button onClick={onClose} className="opacity-80 hover:opacity-100 transition-opacity">
            <XCircle size={18} />
          </button>
        </div>

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

        <div className="px-6 py-4 bg-white flex justify-end border-t border-[#1F1F1F]">
          <Button variant={style.btnVariant} className="px-6 py-2.5" onClick={onClose}>
            Acknowledge
          </Button>
        </div>
      </div>
    </div>
  );
};
