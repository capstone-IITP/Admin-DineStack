import React from 'react';
import { SectionHeader, Card, StatusBadge } from '../BrutalUI';
import { Restaurant } from '../../hooks/useDineStackAdmin';

interface TrialMonitoringViewProps {
  restaurants: Restaurant[];
}

export const TrialMonitoringView = ({ restaurants }: TrialMonitoringViewProps) => {
  const trialRestaurants = restaurants.filter(
    (r) => r.planStatus === 'TRIAL' || r.planStatus === 'TRIAL_EXPIRED'
  );

  return (
    <div className="space-y-8">
      <SectionHeader title="Trial Monitoring" subtitle="Active and Expired Trials" />
      <Card title="Trial Status" noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-[#1F1F1F]">
              <tr>
                <th className="px-6 py-3 font-mono font-normal text-[#6A6A6A] text-[10px] uppercase tracking-widest">Entity</th>
                <th className="px-6 py-3 font-mono font-normal text-[#6A6A6A] text-[10px] uppercase tracking-widest">Trial Started</th>
                <th className="px-6 py-3 font-mono font-normal text-[#6A6A6A] text-[10px] uppercase tracking-widest">Trial Ends</th>
                <th className="px-6 py-3 font-mono font-normal text-[#6A6A6A] text-[10px] uppercase tracking-widest">Days Remaining</th>
                <th className="px-6 py-3 font-mono font-normal text-[#6A6A6A] text-[10px] uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {trialRestaurants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center font-mono text-xs text-[#6A6A6A]">
                    No trials found.
                  </td>
                </tr>
              ) : (
                trialRestaurants.map((r, idx) => {
                  const endsAt = r.trialEndDate ? new Date(r.trialEndDate) : null;
                  const now = new Date();
                  const diffTime = endsAt ? endsAt.getTime() - now.getTime() : 0;
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  const isExpired = r.planStatus === 'TRIAL_EXPIRED' || diffDays < 0;

                  return (
                    <tr key={idx} className="hover:bg-[#FFFFF0]">
                      <td className="px-6 py-4 font-serif font-bold text-[#1F1F1F] text-sm">{r.name}</td>
                      <td className="px-6 py-4 font-mono text-[#6A6A6A] text-xs">{r.activationDate?.split('T')[0] || '---'}</td>
                      <td className="px-6 py-4 font-mono text-[#6A6A6A] text-xs">{r.trialEndDate?.split('T')[0] || '---'}</td>
                      <td className={`px-6 py-4 font-mono text-xs font-bold ${isExpired ? 'text-[#8D0B41]' : 'text-green-600'}`}>
                        {isExpired ? 'Expired' : `${diffDays} days`}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <StatusBadge status={r.planStatus} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
