import React from 'react';
import { useCase } from '../../context/CaseContext';
import { useAuth } from '../../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import {
  Link2,
  Cpu,
  CheckCheck,
  ClipboardCheck,
  Send,
  History,
  Info,
  Layers,
  ChevronRight,
  Shield,
  X,
} from 'lucide-react';

interface SidebarStepperProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const SidebarStepper: React.FC<SidebarStepperProps> = ({
  isOpen = false,
  onClose,
}) => {
  const { currentCase, activeStep, setActiveStep } = useCase();
  const { role } = useAuth();
  const location = useLocation();

  const handleStepClick = (stepNum: number) => {
    setActiveStep(stepNum);
    if (onClose) onClose();
  };

  const stats = currentCase?.stats || {
    sourceCount: 0,
    claimCount: 0,
    approvedCount: 0,
    pendingCount: 0,
    conflictsCount: 0,
    gapsCount: 0,
  };

  const steps = [
    {
      step: 1,
      id: 'connect',
      title: '1. Connect',
      description: 'Ingest & mask sources',
      path: '/connect',
      icon: Link2,
      countBadge: stats.sourceCount ? `${stats.sourceCount} sources` : '0',
    },
    {
      step: 2,
      id: 'reconstruct',
      title: '2. Reconstruct',
      description: 'Extract atomic claims',
      path: '/reconstruct',
      icon: Cpu,
      countBadge: stats.claimCount ? `${stats.claimCount} claims` : 'Ready',
    },
    {
      step: 3,
      id: 'verify',
      title: '3. Verify',
      description: 'Citations, conflicts, gaps',
      path: '/verify',
      icon: CheckCheck,
      countBadge: stats.conflictsCount
        ? `${stats.conflictsCount} conflicts`
        : 'Checked',
      badgeColor: stats.conflictsCount ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : undefined,
    },
    {
      step: 4,
      id: 'review',
      title: '4. Review',
      description: 'Lead approve, edit, resolve',
      path: '/review',
      icon: ClipboardCheck,
      countBadge: stats.pendingCount ? `${stats.pendingCount} pending` : 'Reviewed',
      badgeColor: stats.pendingCount ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : undefined,
    },
    {
      step: 5,
      id: 'handover',
      title: '5. Handover',
      description: 'Role-filtered continuation plan',
      path: '/handover',
      icon: Send,
      countBadge: currentCase?.status === 'published' ? `v${currentCase.currentVersion || 1}` : 'Draft',
      badgeColor: currentCase?.status === 'published' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : undefined,
    },
  ];

  const navigationBody = (
    <div className="flex flex-col justify-between h-full">
      <div className="p-4 space-y-6">
        {/* Core Stepper Header */}
        <div>
          <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-2">
            5-Step Transfer Workflow
          </div>

          <nav className="space-y-1">
            {steps.map((st) => {
              const Icon = st.icon;
              const isActive = location.pathname === st.path;

              return (
                <Link
                  key={st.id}
                  to={st.path}
                  onClick={() => handleStepClick(st.step)}
                  className={`group flex items-center justify-between p-2.5 rounded-xl text-xs transition-all ${
                    isActive
                      ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200 font-semibold shadow-sm border border-teal-200 dark:border-teal-800'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                        isActive
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-teal-600'
                      }`}
                    >
                      <Icon size={14} />
                    </div>
                    <div className="truncate">
                      <div className="leading-tight truncate">{st.title}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal truncate">
                        {st.description}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ml-1 ${
                      st.badgeColor
                        ? st.badgeColor
                        : isActive
                        ? 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {st.countBadge}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Secondary Links: Audit, Limitations, Cases */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-1">
          <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-2">
            Governance & Specs
          </div>

          <Link
            to="/audit"
            onClick={() => { if (onClose) onClose(); }}
            className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
              location.pathname === '/audit'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              <History size={14} className="text-slate-400" />
              <span>Audit Trail & Diff</span>
            </div>
            <ChevronRight size={12} className="text-slate-400" />
          </Link>

          <Link
            to="/limitations"
            onClick={() => { if (onClose) onClose(); }}
            className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
              location.pathname === '/limitations'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Info size={14} className="text-slate-400" />
              <span>Honest Limitations</span>
            </div>
            <ChevronRight size={12} className="text-slate-400" />
          </Link>

          <Link
            to="/cases"
            onClick={() => { if (onClose) onClose(); }}
            className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
              location.pathname === '/cases'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Layers size={14} className="text-slate-400" />
              <span>All Cases Dashboard</span>
            </div>
            <ChevronRight size={12} className="text-slate-400" />
          </Link>
        </div>
      </div>

      {/* Footer Role Notice */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-navy-950/40">
        <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
          <Shield size={12} className="text-teal-600" />
          <span>Role-Gated Server ACL</span>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
          Server filters restricted content before building responses. Zero client leaks.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 flex-shrink-0 bg-white dark:bg-navy-900 border-r border-slate-200 dark:border-slate-800 flex-col justify-between min-h-[calc(100vh-4rem)]">
        {navigationBody}
      </aside>

      {/* Mobile Drawer (Visible when isOpen is true) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] bg-white dark:bg-navy-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Workflow Steps
              </span>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {navigationBody}
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
