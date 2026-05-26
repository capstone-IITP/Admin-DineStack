import React, { useState } from 'react';
import { SectionHeader, Button, CustomSelect } from '../BrutalUI';

interface Log {
  id: number;
  action: string;
  user: string;
  target: string;
  timestamp: string;
  details: string;
  severity: string;
}

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

export const AuditView = ({
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
  ..._rest
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
                    <td className="py-2 px-2 text-gray-500 w-48">{new Date(log.timestamp).toLocaleString()}</td>
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
