import React from 'react';
import { SectionHeader, Card, StatusBadge } from '../BrutalUI';
import { Restaurant } from '../../hooks/useDineStackAdmin';

interface SubscriptionMonitoringViewProps {
  restaurants: Restaurant[];
}

export const SubscriptionMonitoringView = ({ restaurants }: SubscriptionMonitoringViewProps) => {
  const subscribedRestaurants = restaurants.filter(
    (r) => r.planStatus !== 'TRIAL' && r.planStatus !== 'TRIAL_EXPIRED'
  );

  return (
    <div className="space-y-8">
      <SectionHeader title="Subscription Monitoring" subtitle="Active Subscriptions" />
      <Card title="Subscription Status" noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-[#1F1F1F]">
              <tr>
                <th className="px-6 py-3 font-mono font-normal text-[#6A6A6A] text-[10px] uppercase tracking-widest">Entity</th>
                <th className="px-6 py-3 font-mono font-normal text-[#6A6A6A] text-[10px] uppercase tracking-widest">Plan</th>
                <th className="px-6 py-3 font-mono font-normal text-[#6A6A6A] text-[10px] uppercase tracking-widest">Sub Status</th>
                <th className="px-6 py-3 font-mono font-normal text-[#6A6A6A] text-[10px] uppercase tracking-widest text-right">Entity State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subscribedRestaurants.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center font-mono text-xs text-[#6A6A6A]">
                    No active subscriptions found.
                  </td>
                </tr>
              ) : (
                subscribedRestaurants.map((r, idx) => (
                  <tr key={idx} className="hover:bg-[#FFFFF0]">
                    <td className="px-6 py-4 font-serif font-bold text-[#1F1F1F] text-sm">{r.name}</td>
                    <td className="px-6 py-4 font-mono text-[#6A6A6A] text-xs uppercase">{r.planStatus}</td>
                    <td className="px-6 py-4 font-mono text-[#6A6A6A] text-xs uppercase">{r.subscriptionStatus}</td>
                    <td className="px-6 py-4 text-right">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
