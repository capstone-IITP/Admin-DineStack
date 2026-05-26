import React from 'react';
import { SectionHeader, Button, StatusBadge } from '../BrutalUI';

interface CouponsViewProps {
  coupons: any[];
  userRole: string;
  onCreateClick: () => void;
  onDisableClick: (id: string) => void;
}

export const CouponsView = ({ coupons, userRole, onCreateClick, onDisableClick }: CouponsViewProps) => {
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
