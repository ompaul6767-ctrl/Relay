import React, { useState } from 'react';
import { Navbar } from './Navbar';
import { SidebarStepper } from './SidebarStepper';
import { useCase } from '../../context/CaseContext';
import { AlertCircle, X, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const MOBILE_STEPS = [
  { step: 1, label: '1. Connect', path: '/connect' },
  { step: 2, label: '2. Reconstruct', path: '/reconstruct' },
  { step: 3, label: '3. Verify', path: '/verify' },
  { step: 4, label: '4. Review', path: '/review' },
  { step: 5, label: '5. Handover', path: '/handover' },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { bannerMessage, setBannerMessage, setActiveStep } = useCase();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isWorkflowStep = MOBILE_STEPS.some((s) => s.path === location.pathname);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <Navbar
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        isMobileMenuOpen={mobileMenuOpen}
      />

      {/* Mandatory Fallback Banner */}
      {bannerMessage && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 sm:px-4 py-2 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between">
          <div className="flex items-center space-x-2 max-w-7xl mx-auto w-full">
            <AlertCircle size={15} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span className="font-medium">{bannerMessage}</span>
          </div>
          <button
            onClick={() => setBannerMessage(null)}
            className="text-amber-600 hover:text-amber-800 dark:hover:text-amber-100 p-0.5 ml-2"
            aria-label="Dismiss banner"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Mobile Workflow Stepper Strip (Visible only on mobile when on a workflow step) */}
      {isWorkflowStep && (
        <div className="md:hidden bg-white dark:bg-navy-900 border-b border-slate-200 dark:border-slate-800 px-3 py-2 overflow-x-auto scrollbar-none flex items-center space-x-2 text-xs">
          {MOBILE_STEPS.map((st, idx) => {
            const isActive = location.pathname === st.path;
            return (
              <React.Fragment key={st.step}>
                <Link
                  to={st.path}
                  onClick={() => setActiveStep(st.step)}
                  className={`px-2.5 py-1 rounded-full whitespace-nowrap text-[11px] font-semibold transition-colors flex-shrink-0 ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {st.label}
                </Link>
                {idx < MOBILE_STEPS.length - 1 && (
                  <ChevronRight size={10} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <SidebarStepper
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />
        <main className="flex-1 min-w-0 p-3 sm:p-5 md:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};
