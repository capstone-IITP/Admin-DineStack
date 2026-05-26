import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { SectionHeader, Card, Button, Modal } from '../BrutalUI';

interface SupportViewProps {
  onOverride: (type: string) => void;
}

export const SupportView = ({ onOverride }: SupportViewProps) => {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="space-y-8">
      <SectionHeader title="Override Controls" subtitle="Restricted Access Area" />

      <div className="bg-[#8D0B41] text-white p-6 flex items-start gap-6 border-l-8 border-black">
        <AlertTriangle className="text-white shrink-0" size={32} />
        <div>
          <h4 className="font-mono font-bold uppercase tracking-widest text-sm mb-1">Restricted Module</h4>
          <p className="font-serif opacity-90 leading-relaxed max-w-2xl">
            You are operating in a privileged capability zone. All actions performed here bypass standard validation checks and are written directly to the immutable security ledger.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card title="Tier 1: Hardware Reset" className="border-t-[6px] border-t-[#8D0B41]">
          <p className="text-sm font-serif text-[#6A6A6A] mb-8 min-h-[4rem]">
            Forcefully unbinds all devices from a specific entity. Immediate outage for the client.
          </p>
          <Button variant="danger" className="w-full" onClick={() => setConfirmOpen(true)}>Execute Unbind</Button>
        </Card>

        <Card title="Tier 2: Bypass" className="border-t-[6px] border-t-[#1F1F1F]">
          <p className="text-sm font-serif text-[#6A6A6A] mb-8 min-h-[4rem]">
            Generates a permanent offline license key for air-gapped deployments.
          </p>
          <Button variant="secondary" className="w-full" onClick={() => onOverride("Activation Bypass")}>Generate Token</Button>
        </Card>

        <Card title="Tier 3: Cache Maintenance" className="border-t-[6px] border-t-[#1F1F1F]">
          <p className="text-sm font-serif text-[#6A6A6A] mb-8 min-h-[4rem]">
            Clears server-side licensing cache. Low risk maintenance action.
          </p>
          <Button variant="secondary" className="w-full" onClick={() => onOverride("Cache Flush")}>Flush Regional</Button>
        </Card>
      </div>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Override Confirmation"
        variant="danger"
        confirmText="CONFIRM EXECUTION"
        onConfirm={() => {
          onOverride("Force Unbind All");
          setConfirmOpen(false);
        }}
      >
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-[#8D0B41] text-white mx-auto flex items-center justify-center">
            <AlertTriangle size={32} />
          </div>
          <div>
            <p className="font-serif text-xl font-bold text-[#1F1F1F] mb-2">Confirm Hardware Unbind</p>
            <p className="font-mono text-xs text-[#6A6A6A] max-w-xs mx-auto">
              ACTION: FORCE_UNBIND_ALL<br />
              TARGET: ALL_NODES<br />
              UNDO: IMPOSSIBLE
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
