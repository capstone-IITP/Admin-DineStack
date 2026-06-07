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
  activatedAt?: string | null;
  notes?: string | null;
  generatedBy?: string | null;
}

interface KeysViewProps {
  keys: LicenseKey[];
  restaurants?: Restaurant[];
  onGenerate: (restaurantName: string, notes?: string) => void;
  onDelete: (id: string) => void;
}

export const KeysView = ({ keys, restaurants, onGenerate, onDelete }: KeysViewProps) => {
  const [restaurantName, setRestaurantName] = useState('');
  const [notes, setNotes] = useState('');
  const [isCustomEntry, setIsCustomEntry] = useState(false);

  const handleGenerate = () => {
    if (!restaurantName.trim()) return;
    onGenerate(restaurantName, notes);
    setRestaurantName('');
    setNotes('');
    setIsCustomEntry(false);
  };

  return (
    <div className="space-y-8">
      <SectionHeader title="License Keys" subtitle="One-time Activation Tokens" />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Generator Panel */}
        <div className="col-span-1 md:col-span-4">
          <Card title="Generator Protocol" className="h-full bg-[#FFFFF0]">
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6A6A6A] mb-2">Target Entity Name</label>
                {restaurants && restaurants.length > 0 && !isCustomEntry ? (
                  <CustomSelect
                    value={restaurantName}
                    onChange={(val) => {
                      if (val === '__OTHER__') {
                        setIsCustomEntry(true);
                        setRestaurantName('');
                      } else {
                        setRestaurantName(val);
                      }
                    }}
                    options={[
                      { value: '', label: 'SELECT AN ENTITY' },
                      ...restaurants.map(r => ({ value: r.name, label: r.name })),
                      { value: '__OTHER__', label: '+ ENTER MANUALLY' }
                    ]}
                  />
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full bg-white border border-[#1F1F1F] px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#8D0B41] pr-24"
                      placeholder="e.g. The Rustic Spoon"
                      value={restaurantName}
                      onChange={(e) => setRestaurantName(e.target.value)}
                    />
                    {restaurants && restaurants.length > 0 && (
                      <button 
                        type="button"
                        onClick={() => { setIsCustomEntry(false); setRestaurantName(''); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-[#6A6A6A] hover:text-[#1F1F1F] uppercase tracking-wider"
                      >
                        Select List
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6A6A6A] mb-2">Notes (Optional)</label>
                <textarea
                  className="w-full bg-white border border-[#1F1F1F] px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#8D0B41]"
                  placeholder="e.g. Issued for Q3 expansion"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="border border-[#1F1F1F] p-4 bg-white">
                <div className="flex items-center gap-2 mb-2">
                  <Lock size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Security Policy</span>
                </div>
                <ul className="text-xs text-[#6A6A6A] space-y-1 font-mono list-disc list-inside">
                  <li>No automatic expiration</li>
                  <li>Single-device binding</li>
                  <li>Logged generation event</li>
                </ul>
              </div>

              <Button onClick={handleGenerate} className="w-full py-4 text-sm" disabled={!restaurantName.trim()}>Generate Key</Button>
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
                    <th className="px-6 py-3 font-mono font-normal text-[#6A6A6A] text-[10px] uppercase tracking-widest">Dates</th>
                    <th className="px-6 py-3 font-mono font-normal text-[#6A6A6A] text-[10px] uppercase tracking-widest text-right">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {keys.map((k, idx) => (
                    <tr key={idx} className="hover:bg-[#FFFFF0]">
                      <td className="px-6 py-4 font-mono text-[#1F1F1F] text-xs font-bold">
                        <span className="select-all">{k.code}</span>
                        {k.generatedBy && <div className="text-[10px] font-mono text-[#6A6A6A] mt-1">by: {k.generatedBy}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-serif text-[#1F1F1F]">{k.restaurant}</div>
                        {k.notes && <div className="text-[10px] font-mono text-[#6A6A6A] mt-1 truncate max-w-[150px]" title={k.notes}>{k.notes}</div>}
                      </td>
                      <td className="px-6 py-4 font-mono text-[10px] text-[#6A6A6A]">
                        <div>Gen: {k.created}</div>
                        {k.activatedAt && <div>Act: {k.activatedAt.split('T')[0]}</div>}
                      </td>
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
