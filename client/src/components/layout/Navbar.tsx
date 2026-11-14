import React, { useState, useRef, useEffect } from 'react';
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
  Menu,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface NavbarProps {
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleMobileMenu,
  isMobileMenuOpen = false,
}) => {
  const { user, role, switchRole, isLoading } = useAuth();
  const { currentCase, loadDemoProject, isSeeding } = useCase();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  // Close role dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node)) {
        setRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setRoleDropdownOpen(false);
    await switchRole(newRole);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-navy-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Mobile Menu Button */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {onToggleMobileMenu && (
              <button
                type="button"
                onClick={onToggleMobileMenu}
                className="md:hidden p-2 -ml-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                aria-label="Toggle navigation drawer"
              >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}

            <Link to="/" className="flex items-center space-x-2 sm:space-x-2.5 group">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-navy-900 via-teal-700 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-teal-900/20 group-hover:scale-105 transition-transform flex-shrink-0">
                <Sparkles size={16} />
              </div>
              <div className="flex flex-col">
                <span className="text-base sm:text-lg font-bold tracking-tight text-navy-900 dark:text-white flex items-center gap-1.5">
                  Relay
                  <span className="text-[9px] sm:text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                    Handover
                  </span>
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline -mt-0.5">
                  Evidence-Linked Knowledge Transfer
                </span>
              </div>
            </Link>

            {currentCase && (
              <div className="hidden lg:flex items-center space-x-2 pl-4 border-l border-slate-200 dark:border-slate-800">
                <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                  {currentCase.title}
                </span>
                <span
                  className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium ${
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
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Quick Load Demo Button */}
            <Button
              size="sm"
              variant="outline"
              loading={isSeeding}
              onClick={async () => {
                const caseId = await loadDemoProject();
                if (caseId) navigate(`/review`);
              }}
              className="hidden md:inline-flex text-xs font-semibold border-teal-300 text-teal-800 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-300 dark:hover:bg-teal-950"
              icon={<Database size={13} />}
            >
              Load Demo Project
            </Button>

            {/* Role Switcher */}
            <div className="relative" ref={roleDropdownRef}>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setRoleDropdownOpen((prev) => !prev)}
                className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-sm transition-all ${currentRoleCfg.color}`}
                aria-expanded={roleDropdownOpen}
                aria-label="Switch user role"
              >
                <RoleIcon size={14} className="flex-shrink-0" />
                <span className="hidden sm:inline">{currentRoleCfg.label}</span>
                <span className="sm:hidden text-[11px] font-bold">
                  {role === 'incoming_dev'
                    ? 'DEV'
                    : role === 'incoming_designer'
                    ? 'DESIGN'
                    : role === 'departing'
                    ? 'LEAVER'
                    : 'LEAD'}
                </span>
                <ChevronDown
                  size={12}
                  className={`opacity-70 transition-transform ${roleDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Role Dropdown Menu */}
              {roleDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-64 max-w-[calc(100vw-2rem)] bg-white dark:bg-navy-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Switch Active Persona
                  </div>
                  {(['lead', 'incoming_dev', 'incoming_designer', 'departing'] as UserRole[]).map((r) => {
                    const cfg = roleConfigs[r];
                    const Icon = cfg.icon;
                    const isActive = role === r;
                    return (
                      <button
                        key={r}
                        type="button"
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
                          <div className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                            {cfg.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
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
