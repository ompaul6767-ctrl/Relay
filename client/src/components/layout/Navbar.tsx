import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCase } from '../../context/CaseContext';
import { useTheme } from '../../context/ThemeContext';
import { UserRole } from '../../types';
import {
  Sun,
  Moon,
  Sparkles,
  Menu,
  X,
  LogOut,
  LogIn,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PERSONA_CONFIGS } from '../../pages/LandingPage';

interface NavbarProps {
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleMobileMenu,
  isMobileMenuOpen = false,
}) => {
  const { user, role, isAuthenticated, logout } = useAuth();
  const { currentCase } = useCase();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const roleBadgeStyles: Record<UserRole, string> = {
    lead:
      'text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400 border-amber-300 dark:border-amber-700',
    incoming_dev:
      'text-teal-600 bg-teal-50 dark:bg-teal-950/60 dark:text-teal-400 border-teal-300 dark:border-teal-700',
    incoming_designer:
      'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700',
    departing:
      'text-slate-600 bg-slate-50 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
  };

  const userRole = user?.role ?? role;
  const userRoleConfig = PERSONA_CONFIGS[userRole];
  const PersonaIcon = userRoleConfig.icon;
  const userName = user?.name?.trim() ?? '';
  const userInitials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-navy-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
      <div className="w-full px-4 sm:px-6">
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

          {/* Right Navigation */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* User Info or Sign In */}
            {isAuthenticated ? (
              <>
                <div
                  role="group"
                  aria-label="Signed-in user"
                  tabIndex={0}
                  className="glass-control flex min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-navy-900"
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-teal-300/70 bg-teal-100/80 text-sm font-semibold text-teal-800 dark:border-teal-700/70 dark:bg-teal-950/60 dark:text-teal-200">
                    {userInitials ? userInitials : <PersonaIcon size={18} />}
                  </div>
                  <div className="hidden min-w-0 max-w-[180px] flex-col md:flex">
                    <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {userName || userRoleConfig.label}
                    </span>
                    <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {user?.email || userRoleConfig.label}
                    </span>
                  </div>
                </div>
                <span
                  className={`hidden items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold lg:inline-flex ${roleBadgeStyles[userRole]}`}
                >
                  {userRoleConfig.label}
                </span>

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    navigate('/', { replace: true });
                  }}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold transition-colors"
                  title="Sign out of Relay"
                  aria-label="Log out"
                >
                  <LogOut size={13} className="flex-shrink-0" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <Link
                to="/"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <LogIn size={13} />
                <span>Sign In</span>
              </Link>
            )}

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
