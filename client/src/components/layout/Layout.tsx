import React from 'react';
import { Navbar } from './Navbar';
import { SidebarStepper } from './SidebarStepper';
import { useCase } from '../../context/CaseContext';
import { AlertCircle, X } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { bannerMessage, setBannerMessage } = useCase();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <Navbar />

      {/* Mandatory Fallback Banner */}
      {bannerMessage && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between">
          <div className="flex items-center space-x-2 max-w-7xl mx-auto w-full">
            <AlertCircle size={15} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span className="font-medium">{bannerMessage}</span>
          </div>
          <button
            onClick={() => setBannerMessage(null)}
            className="text-amber-600 hover:text-amber-800 dark:hover:text-amber-100 p-0.5"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <SidebarStepper />
        <main className="flex-1 min-w-0 p-6 md:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};
