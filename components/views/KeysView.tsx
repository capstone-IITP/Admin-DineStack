import React, { useState } from 'react';
import { Lock, XCircle } from 'lucide-react';
import { SectionHeader, Card, Button, StatusBadge, CustomSelect } from '../BrutalUI';

interface Restaurant {
  id: string;
  name: string;
}

interface LicenseKey {
  id: string;
  code: string;
  restaurant: string;
  entityId?: string | null;
  status: string;
  created: string;
  boundTo: string | null;
}

interface KeysViewProps {
  keys: LicenseKey[];
  restaurants: Restaurant[];
  onGenerate: (restaurantId: string) => void;
  onDelete: (id: string) => void;
}

export const KeysView = ({ keys, restaurants, onGenerate, onDelete }: KeysViewProps) => {
  const [selectedRestId, setSelectedRestId] = useState('');

  const activeRestId = selectedRestId || restaurants[0]?.id || '';

  return (
    <div className="space-y-8">
      <SectionHeader title="License Keys" subtitle="One-time Activation Tokens" />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Generator Panel */}
        <div className="col-span-1 md:col-span-4">
          <Card title="Generator Protocol" className="h-full bg-[#FFFFF0]">
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6A6A6A] mb-2">Target Entity</label>
                <CustomSelect
                  value={activeRestId}
                  onChange={setSelectedRestId}
                  options={restaurants.map(r => ({ value: r.id, label: r.name }))}
                />
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

              <Button onClick={() => onGenerate(activeRestId)} className="w-full py-4 text-sm">Generate Key</Button>
            </div>
          </Card>
        </div>

        {/* List Panel */}
        <div className="col-span-1 md:col-span-8">
          <Card title="Generation Log" noPadding>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
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
                      <td className="px-6 py-4">
                        <div className="font-serif text-[#1F1F1F]">{k.restaurant}</div>
                        {k.entityId && <div className="text-[10px] font-mono text-[#6A6A6A] mt-1 select-all">{k.entityId}</div>}
                      </td>
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
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
