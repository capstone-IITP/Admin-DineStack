import React, { useState } from 'react';
import { SectionHeader, Button, StatusBadge, Modal } from '../BrutalUI';

interface Restaurant {
  id: string;
  name: string;
  status: string;
  created: string;
  devices: number;
  licenseType: string;
  activationDate?: string | null;
  trialEndDate?: string | null;
  planStatus: string;
  subscriptionStatus: string;
}

interface RestaurantsViewProps {
  data: Restaurant[];
  userRole: string;
  onSuspend: (id: string) => void;
  onNewRestaurant: (name: string) => void;
  onDelete: (id: string) => void;
}

export const RestaurantsView = ({ data, userRole, onSuspend, onNewRestaurant, onDelete }: RestaurantsViewProps) => {
  const [showModal, setShowModal] = useState(false);
  const [newRestName, setNewRestName] = useState('');

  const handleCreate = () => {
    onNewRestaurant(newRestName);
    setNewRestName('');
    setShowModal(false);
  };

  return (
    <>
      <SectionHeader
        title="Entities"
        subtitle="Global Restaurant Registry"
        action={
          userRole === 'INTERN'
            ? <Button disabled variant="secondary" className="opacity-50 cursor-not-allowed">Locked for Intern</Button>
            : <Button onClick={() => setShowModal(true)}>+ Initialize Entity</Button>
        }
      />
      <div className="border border-[#1F1F1F]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#1F1F1F] text-white">
            <tr>
              <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">ID</th>
              <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">Legal Name</th>
              <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">Plan Status</th>
              <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">Sub Status</th>
              <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">Trial Ends</th>
              <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">Devices</th>
              <th className="px-6 py-4 font-mono font-normal uppercase tracking-widest text-[10px]">State</th>
              <th className="px-6 py-4 text-right font-mono font-normal uppercase tracking-widest text-[10px]">Control</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((r) => (
              <tr key={r.id} className="hover:bg-[#FFFFF0] group transition-colors">
                <td className="px-6 py-4 font-mono text-[#6A6A6A] text-xs border-r border-transparent group-hover:border-[#8D0B41]/20">{r.id}</td>
                <td className="px-6 py-4 font-serif font-bold text-[#1F1F1F] text-lg">{r.name}</td>
                <td className="px-6 py-4 font-mono text-xs text-[#1F1F1F] uppercase">{r.planStatus}</td>
                <td className="px-6 py-4 font-mono text-xs text-[#1F1F1F] uppercase">{r.subscriptionStatus}</td>
                <td className="px-6 py-4 font-mono text-xs text-[#1F1F1F]">{r.trialEndDate ? r.trialEndDate.split('T')[0] : '---'}</td>
                <td className="px-6 py-4 font-mono text-xs text-[#1F1F1F]">{r.devices}</td>
                <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => onSuspend(r.id)}
                    disabled={userRole === 'INTERN'}
                    className={`font-mono text-[10px] font-bold uppercase tracking-widest underline decoration-1 underline-offset-4 mr-4 ${
                      userRole === 'INTERN'
                        ? 'text-gray-300 cursor-not-allowed no-underline'
                        : 'text-[#1F1F1F] hover:text-[#8D0B41]'
                    }`}
                  >
                    {(r.status === 'Suspended' || r.status === 'SUSPENDED') ? 'Resume Service' : 'Suspend Service'}
                  </button>
                  <button
                    onClick={() => onDelete(r.id)}
                    disabled={userRole === 'INTERN'}
                    className={`font-mono text-[10px] font-bold uppercase tracking-widest underline decoration-1 underline-offset-4 ${
                      userRole === 'INTERN'
                        ? 'text-gray-300 cursor-not-allowed no-underline'
                        : 'text-red-500 hover:text-red-700'
                    }`}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Initialize New Restaurant Entity"
        onConfirm={handleCreate}
        confirmText="Initialize"
      >
        <div className="bg-yellow-50 border-l-2 border-yellow-500 p-3 mb-6">
          <p className="text-xs font-mono text-yellow-800 uppercase tracking-tight">
            ⚠ Record Immutability Notice: Created entities cannot be deleted, only archived.
          </p>
        </div>
        <div className="space-y-4">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6A6A6A] mb-1">Legal Entity Name</label>
          <input
            type="text"
            className="w-full bg-white border-b-2 border-[#1F1F1F] px-3 py-3 text-lg font-serif placeholder:text-gray-300 focus:outline-none focus:border-[#8D0B41] transition-colors"
            placeholder="e.g. TableTop Enterprises LLC"
            value={newRestName}
            onChange={(e) => setNewRestName(e.target.value)}
          />
        </div>
      </Modal>
    </>
  );
};
