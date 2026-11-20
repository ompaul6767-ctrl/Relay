import React, { useState } from 'react';
import { Navbar } from './Navbar';
import { SidebarStepper } from './SidebarStepper';
import { useCase } from '../../context/CaseContext';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle, X, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const MOBILE_STEPS = [
  { step: 1, label: '1. Connect', path: '/connect' },
  { step: 2, label: '2. Reconstruct', path: '/reconstruct' },
  { step: 3, label: '3. Interview', path: '/interview' },
  { step: 4, label: '4. Timeline', path: '/timeline' },
  { step: 5, label: '5. Review', path: '/review' },
  { step: 6, label: '6. Handover', path: '/handover' },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { bannerMessage, setBannerMessage, setActiveStep } = useCase();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [serverWaking, setServerWaking] = useState(false);
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  React.useEffect(() => {
    const handleWaking = (e: any) => {
      setServerWaking(Boolean(e.detail?.waking));
    };
    window.addEventListener('relay:server-waking', handleWaking);
    return () => window.removeEventListener('relay:server-waking', handleWaking);
  }, []);

  const isWorkflowStep = MOBILE_STEPS.some((s) => s.path === location.pathname);

  return (
    <div className="app-shell relative isolate flex h-dvh flex-col overflow-hidden bg-transparent font-sans text-slate-900 transition-colors dark:text-slate-100">
      <div className="app-background" aria-hidden="true" />
      {!isLandingPage && user && (
        <Navbar
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
          isMobileMenuOpen={mobileMenuOpen}
        />
      )}

      {/* Render Free-Tier Cold Start Banner */}
      {serverWaking && (
        <div className="flex shrink-0 items-center justify-between bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md animate-pulse">
          <div className="flex items-center space-x-2 max-w-7xl mx-auto w-full">
            <span className="text-base">⚡</span>
            <span>
              Waking the server, this can take up to a minute... Relay is automatically reconnecting.
            </span>
          </div>
        </div>
      )}

      {/* Mandatory Fallback Banner */}
      {bannerMessage && (
        <div className="flex shrink-0 items-center justify-between border-b border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200 sm:px-4">
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
        <div className="glass-strong flex shrink-0 items-center space-x-2 overflow-x-auto px-3 py-2 text-xs scrollbar-none md:hidden">
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

      <div
        className={`flex min-w-0 w-full ${
          isLandingPage
            ? 'min-h-0 flex-1 max-w-none justify-center overflow-hidden'
            : 'min-h-0 flex-1 overflow-hidden'
        }`}
      >
        {!isLandingPage && (
          <SidebarStepper
            isOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
          />
        )}
        <main
          className={`min-h-0 min-w-0 overflow-x-hidden overflow-y-auto ${
            isLandingPage
              ? 'flex flex-1 items-start justify-center p-3 sm:p-4 lg:p-1'
              : 'flex-1 p-3 sm:p-5 md:p-8'
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
