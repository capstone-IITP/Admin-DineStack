import React from 'react';
import { Activity, Server, Key, AlertTriangle, RefreshCw } from 'lucide-react';
import { SectionHeader, Card } from '../BrutalUI';

interface DashboardViewProps {
  stats: any;
  onRefresh: () => void;
}

interface MetricProps {
  label: string;
  value: string;
  subtext: string;
  icon: any;
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

export const DashboardView = ({ stats, onRefresh }: DashboardViewProps) => (
  <div className="space-y-8">
    <SectionHeader title="System Control" subtitle="Real-time Infrastructure Monitoring" />

    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
