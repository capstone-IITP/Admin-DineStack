import React from 'react';
import { SectionHeader, StatusBadge } from '../BrutalUI';

interface Device {
  hash: string;
  restaurant: string;
  type: string;
  status: string;
  lastSeen: string;
}

interface DeviceViewProps {
  devices: Device[];
}

export const DeviceView = ({ devices }: DeviceViewProps) => (
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
              <td className="px-6 py-4 font-mono text-[10px] text-[#6A6A6A]">{new Date(d.lastSeen).toLocaleString()}</td>
              <td className="px-6 py-4 text-right"><StatusBadge status={d.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
