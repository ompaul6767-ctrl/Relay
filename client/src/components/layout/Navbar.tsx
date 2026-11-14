import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCase } from '../../context/CaseContext';
import { useTheme } from '../../context/ThemeContext';
import { UserRole } from '../../types';
import { Button } from '../common/Button';
import {
  Shield,
  Code2,
  Palette,
  Sun,
  Moon,
  Database,
  Sparkles,
  ArrowRightLeft,
  ChevronDown,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { user, role, switchRole, isLoading } = useAuth();
  const { currentCase, loadDemoProject, isSeeding } = useCase();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const roleConfigs: Record<
    UserRole,
    { label: string; icon: any; color: string; desc: string }
  > = {
    lead: {
      label: 'Engineering Lead',
      icon: Shield,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400 border-amber-300 dark:border-amber-700',
      desc: 'Full review & publishing authority',
    },
    incoming_dev: {
      label: 'Incoming Developer',
      icon: Code2,
      color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/60 dark:text-teal-400 border-teal-300 dark:border-teal-700',
      desc: 'Tech stack, code, runtime & deploy focus',
    },
    incoming_designer: {
      label: 'Incoming Designer',
      icon: Palette,
      color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700',
      desc: 'Design system, Figma & assets focus',
    },
    departing: {
      label: 'Departing Member',
      icon: ArrowRightLeft,
      color: 'text-slate-600 bg-slate-50 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
      desc: 'Owner of unassigned tasks & historical knowledge',
    },
  };

  const currentRoleCfg = roleConfigs[role] || roleConfigs.lead;
  const RoleIcon = currentRoleCfg.icon;

  const handleRoleChange = async (newRole: UserRole) => {
    await switchRole(newRole);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-navy-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Case Header */}
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-navy-900 via-teal-700 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-teal-900/20 group-hover:scale-105 transition-transform">
                <Sparkles size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-navy-900 dark:text-white flex items-center gap-1.5">
                  Relay
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                    Handover
                  </span>
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline -mt-0.5">
                  Evidence-Linked Knowledge Transfer
                </span>
              </div>
            </Link>

            {currentCase && (
              <div className="hidden md:flex items-center space-x-2 pl-4 border-l border-slate-200 dark:border-slate-800">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {currentCase.title}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    currentCase.status === 'published'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : currentCase.status === 'in_review'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {currentCase.status === 'published'
                    ? `Published v${currentCase.currentVersion || 1}`
                    : currentCase.status === 'in_review'
                    ? 'In Review'
                    : 'Draft'}
                </span>
              </div>
            )}
          </div>

          {/* Right Navigation & Role Switcher */}
          <div className="flex items-center space-x-3">
            {/* Quick Load Demo Button */}
            <Button
              size="sm"
              variant="outline"
              loading={isSeeding}
              onClick={async () => {
                const caseId = await loadDemoProject();
                if (caseId) navigate(`/review`);
              }}
              className="hidden sm:inline-flex text-xs font-semibold border-teal-300 text-teal-800 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-300 dark:hover:bg-teal-950"
              icon={<Database size={13} />}
            >
              Load Demo Project
            </Button>

            {/* Role Switcher */}
            <div className="relative group">
              <button
                disabled={isLoading}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-sm transition-all ${currentRoleCfg.color}`}
              >
                <RoleIcon size={14} className="flex-shrink-0" />
                <span className="hidden sm:inline">{currentRoleCfg.label}</span>
                <span className="sm:hidden">{role.toUpperCase()}</span>
                <ChevronDown size={12} className="opacity-70 group-hover:rotate-180 transition-transform" />
              </button>

              {/* Role Dropdown Menu */}
              <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-navy-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 hidden group-hover:block hover:block z-50">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Switch Active Persona
                </div>
                {(['lead', 'incoming_dev', 'incoming_designer', 'departing'] as UserRole[]).map((r) => {
                  const cfg = roleConfigs[r];
                  const Icon = cfg.icon;
                  const isActive = role === r;
                  return (
                    <button
                      key={r}
                      onClick={() => handleRoleChange(r)}
                      className={`w-full text-left px-3 py-2 flex items-start space-x-2.5 text-xs transition-colors ${
                        isActive
                          ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-900 dark:text-teal-200 font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon size={15} className="mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium">{cfg.label}</div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                          {cfg.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
