/**
 * Demo Mode Section
 *
 * Demo-only section for resetting demo data to initial state.
 */

import { RotateCcw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../context/ToastContext';
import * as demoApi from '../../api/demoClient';

export function DemoModeSection() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const handleReset = () => {
    demoApi.resetDemoData();
    queryClient.invalidateQueries();
    toast.success('Demo data has been reset');
  };

  return (
    <section className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5" style={{ color: 'var(--monarch-orange)' }}>
        <RotateCcw size={12} />
        Demo Mode
      </h2>
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-orange)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="p-2.5 rounded-lg"
                style={{ backgroundColor: 'var(--monarch-orange-light)' }}
              >
                <RotateCcw size={20} style={{ color: 'var(--monarch-orange)' }} />
              </div>
              <div>
                <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                  Reset Demo Data
                </div>
                <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                  Restore demo to its original state
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: 'var(--monarch-orange)',
                color: 'white',
              }}
            >
              Reset
            </button>
          </div>
        </div>
        <div
          className="px-4 py-3 text-xs"
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            color: 'var(--monarch-text-muted)',
            borderTop: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))',
          }}
        >
          You are viewing the demo version. Changes are saved to your browser only.
        </div>
      </div>
    </section>
  );
}
