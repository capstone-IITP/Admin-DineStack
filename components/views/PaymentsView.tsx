import React from 'react';
import { SectionHeader, Card, StatusBadge } from '../BrutalUI';

interface PaymentsViewProps {
  payments: any[];
  userRole: string;
  onRefundClick: (payment: any) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
}

export const PaymentsView = ({ payments, userRole, onRefundClick, statusFilter, setStatusFilter }: PaymentsViewProps) => {
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
            <div className="text-3xl font-serif font-bold text-[#1F1F1F]">
              ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </div>
          </Card>
        </div>
      )}

      <div className="flex justify-between items-center bg-white border border-[#1F1F1F] p-4 shadow-[2px_2px_0px_0px_rgba(31,31,31,0.05)]">
        <div className="flex flex-wrap gap-2">
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
