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
  UserCheck,
  GitBranch,
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
      description: 'Ingest & mask secrets',
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
      badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200',
    },
    {
      step: 3,
      id: 'interview',
      title: '3. Interview',
      description: 'Gap-driven leaver interview',
      path: '/interview',
      icon: UserCheck,
      countBadge: stats.gapsCount ? `${stats.gapsCount} gaps` : 'Interview',
      badgeColor: stats.gapsCount ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : undefined,
    },
    {
      step: 4,
      id: 'timeline',
      title: '4. Timeline',
      description: 'Conflict & stale information',
      path: '/timeline',
      icon: GitBranch,
      countBadge: stats.conflictsCount ? `${stats.conflictsCount} conflicts` : 'Timeline',
      badgeColor: stats.conflictsCount ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200' : undefined,
    },
    {
      step: 5,
      id: 'review',
      title: '5. Review',
      description: 'Lead approval workspace',
      path: '/review',
      icon: ClipboardCheck,
      countBadge: stats.pendingCount ? `${stats.pendingCount} pending` : 'Reviewed',
      badgeColor: stats.pendingCount ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200',
    },
    {
      step: 6,
      id: 'handover',
      title: '6. Handover',
      description: 'Role continuation plan',
      path: '/handover',
      icon: Send,
      countBadge: currentCase?.status === 'published' ? `v${currentCase.currentVersion || 1}` : 'Draft',
      badgeColor: currentCase?.status === 'published' ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200' : undefined,
    },
  ];

  const navigationBody = (
    <div className="flex min-h-full flex-col">
      <div className="space-y-6 p-4">
        {/* Core Stepper Header */}
        <div>
          <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-2">
            5-Step Transfer Workflow
          </div>

          <nav className="relative space-y-1">
            {steps.map((st) => {
              const Icon = st.icon;
              const isActive = location.pathname === st.path;

              return (
                <Link
                  key={st.id}
                  to={st.path}
                  onClick={() => handleStepClick(st.step)}
                  className={`group flex min-h-[58px] min-w-0 items-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-navy-900 ${
                    isActive
                      ? 'border-teal-300 bg-teal-100/80 font-semibold text-teal-900 shadow-sm dark:border-teal-700 dark:bg-teal-950/70 dark:text-teal-100'
                      : 'border-transparent text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white'
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                        isActive
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-teal-50 group-hover:text-teal-700 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-teal-950/60 dark:group-hover:text-teal-300'
                      }`}
                    >
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0 flex-1 whitespace-normal break-words">
                      <div className="leading-tight">{st.title}</div>
                      <div
                        title={st.description}
                        className="text-[10px] font-normal leading-snug text-slate-600 dark:text-slate-300"
                      >
                        {st.description}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold leading-4 ${
                      st.badgeColor
                        ? st.badgeColor
                        : isActive
                        ? 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
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
        <div className="space-y-1 border-t border-slate-200 pt-5 dark:border-slate-700">
          <div className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Governance & Specs
          </div>

          <Link
            to="/audit"
            onClick={() => { if (onClose) onClose(); }}
            className={`group flex min-h-10 items-center justify-between rounded-lg border border-transparent p-2 text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-navy-900 ${
              location.pathname === '/audit'
                ? 'bg-teal-50 font-medium text-teal-900 dark:bg-teal-950/50 dark:text-teal-100'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <History size={14} className="text-slate-500 dark:text-slate-400" />
              <span>Audit Trail & Diff</span>
            </div>
            <ChevronRight size={12} className="text-slate-500 transition-transform duration-150 group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 dark:text-slate-400" />
          </Link>

          <Link
            to="/limitations"
            onClick={() => { if (onClose) onClose(); }}
            className={`group flex min-h-10 items-center justify-between rounded-lg border border-transparent p-2 text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-navy-900 ${
              location.pathname === '/limitations'
                ? 'bg-teal-50 font-medium text-teal-900 dark:bg-teal-950/50 dark:text-teal-100'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Info size={14} className="text-slate-500 dark:text-slate-400" />
              <span>Honest Limitations</span>
            </div>
            <ChevronRight size={12} className="text-slate-500 transition-transform duration-150 group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 dark:text-slate-400" />
          </Link>

          <Link
            to="/cases"
            onClick={() => { if (onClose) onClose(); }}
            className={`group flex min-h-10 items-center justify-between rounded-lg border border-transparent p-2 text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-navy-900 ${
              location.pathname === '/cases'
                ? 'bg-teal-50 font-medium text-teal-900 dark:bg-teal-950/50 dark:text-teal-100'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Layers size={14} className="text-slate-500 dark:text-slate-400" />
              <span>All Cases Dashboard</span>
            </div>
            <ChevronRight size={12} className="text-slate-500 transition-transform duration-150 group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 dark:text-slate-400" />
          </Link>
        </div>
      </div>

      {/* Footer Role Notice */}
      <div className="mt-auto p-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-navy-950/60">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
            <Shield size={14} className="shrink-0 text-teal-700 dark:text-teal-400" />
            <span>Role-Gated Server ACL</span>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-600 dark:text-slate-300">
            Server filters restricted content before building responses. Zero client leaks.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="glass-strong hidden h-full min-h-0 w-64 min-w-0 flex-shrink-0 flex-col md:flex">
        {navigationBody}
      </aside>

      {/* Mobile Drawer (Visible when isOpen is true) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside className="glass-strong relative z-10 flex h-full w-72 min-w-0 max-w-[85vw] flex-col overflow-hidden animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Workflow Steps
              </span>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1 text-slate-500 transition-colors duration-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 dark:text-slate-400 dark:hover:text-slate-200 dark:focus-visible:ring-offset-navy-900"
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
