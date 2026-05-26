import React from 'react';
import { SectionHeader, Button, StatusBadge } from '../BrutalUI';

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

export const TeamView = ({
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
