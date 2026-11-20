import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/common/Button';
import { PERSONA_CONFIGS, PERSONA_ORDER } from '../constants/personas';
import { UserRole } from '../types';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  LockKeyhole,
  Moon,
  Sparkles,
  Sun,
} from 'lucide-react';

interface DemoAccount {
  role: UserRole;
  title: string;
  name: string;
  email: string;
  password: string;
  description: string;
}

const demoAccounts: DemoAccount[] = [
  {
    role: 'lead',
    title: 'Engineering Lead',
    name: 'Maya',
    email: 'lead@relay.demo',
    password: 'relay2026!',
    description: 'Review claims, verify quotes, resolve conflicts, lead interview approvals, publish versions.',
  },
  {
    role: 'departing',
    title: 'Senior Backend Engineer (Departing)',
    name: 'Aarav',
    email: 'departing@relay.demo',
    password: 'relay2026!',
    description: 'Answer gap-driven leaver interview questions, provide reasoning for conflicts, submit attested claims.',
  },
  {
    role: 'incoming_dev',
    title: 'Incoming Software Engineer',
    name: 'Devon',
    email: 'incoming_dev@relay.demo',
    password: 'relay2026!',
    description: 'Access technical handovers, Day 1-30 milestones, cited Q&A assistant with vector retrieval. Restricted notes masked.',
  },
  {
    role: 'incoming_designer',
    title: 'Incoming Product Designer',
    name: 'Dana',
    email: 'incoming_designer@relay.demo',
    password: 'relay2026!',
    description: 'Access design handovers, Figma tokens, visual system assets, and contact directory with zero confidential leaks.',
  },
];

export const LandingPage: React.FC = () => {
  const { loginWithCredentials, isLoading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('lead');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isPersonaOpen, setIsPersonaOpen] = useState(false);
  const personaDropdownRef = useRef<HTMLDivElement>(null);
  const personaTriggerRef = useRef<HTMLButtonElement>(null);
  const personaOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        personaDropdownRef.current &&
        !personaDropdownRef.current.contains(event.target as Node)
      ) {
        setIsPersonaOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isPersonaOpen) {
        setIsPersonaOpen(false);
        personaTriggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPersonaOpen]);

  const selectPersona = (newRole: UserRole) => {
    const account = demoAccounts.find((demoAccount) => demoAccount.role === newRole);
    if (!account) return;

    setSelectedRole(newRole);
    setEmailInput(account.email);
    setPasswordInput(account.password);
    setLoginError(null);
    setIsPersonaOpen(false);
    window.requestAnimationFrame(() => personaTriggerRef.current?.focus());
  };

  const handlePersonaTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    event.preventDefault();
    setIsPersonaOpen(true);
    const optionIndex = event.key === 'ArrowDown' ? 0 : PERSONA_ORDER.length - 1;
    window.requestAnimationFrame(() => personaOptionRefs.current[optionIndex]?.focus());
  };

  const handlePersonaOptionKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = (index + direction + PERSONA_ORDER.length) % PERSONA_ORDER.length;
      personaOptionRefs.current[nextIndex]?.focus();
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const nextIndex = event.key === 'Home' ? 0 : PERSONA_ORDER.length - 1;
      personaOptionRefs.current[nextIndex]?.focus();
    }
  };

  const handleEmailPasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError(null);
    try {
      const ok = await loginWithCredentials(emailInput, passwordInput);
      if (ok) {
        navigate('/review');
      } else {
        setLoginError('Invalid credentials. Please use one of the demo accounts listed below.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    }
  };

  return (
    <div className="relative mx-auto flex min-h-full w-full max-w-7xl flex-col py-3 sm:py-4 lg:py-1">
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute right-0 top-1 inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition-colors duration-200 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:text-slate-300 dark:hover:bg-slate-800"
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title="Toggle theme"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="grid flex-1 grid-cols-1 overflow-visible rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-navy-900/10 dark:border-slate-800 dark:bg-navy-900 lg:grid-cols-2 lg:overflow-hidden">
        <section className="min-w-0 bg-gradient-to-br from-teal-50 via-white to-teal-100/80 p-4 dark:from-navy-900 dark:via-navy-900 dark:to-teal-950/60 sm:p-5 lg:p-2 xl:p-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-navy-900 via-teal-700 to-teal-500 text-white shadow-sm shadow-teal-900/20 lg:h-8 lg:w-8">
              <Sparkles size={19} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-navy-900 dark:text-white lg:text-lg">Relay</span>
                <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                  Handover
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Evidence-Linked Knowledge Transfer
              </p>
            </div>
          </div>

          <div className="mt-4 lg:mt-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-teal-800 dark:border-teal-800 dark:bg-teal-950/60 dark:text-teal-300 lg:px-2 lg:py-0.5 lg:text-[9px]">
              <Sparkles size={12} />
              Evidence-Linked Knowledge Transfer
            </div>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-navy-900 dark:text-white sm:text-4xl lg:mt-1 lg:text-[21px] xl:text-[21px]">
              Prevent Critical Knowledge
              <span className="block text-teal-700 dark:text-teal-400">From Leaving With People</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-700 dark:text-slate-300 lg:mt-1 lg:text-[11px] lg:leading-snug">
              Relay ingests project sources and GitHub repos, extracts atomic claims, links every fact to verbatim evidence, resolves conflicts on dated timelines, conducts gap-driven leaver interviews, and delivers role-appropriate handovers with zero unverified assumptions.
            </p>
            <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400 lg:mt-1 lg:text-[10px]">
              <LockKeyhole size={15} className="mt-0.5 shrink-0 text-teal-700 dark:text-teal-400" />
              <span>
                Sensitive leads-only notes never leak to incoming roles in search, Q&amp;A, or timeline.
              </span>
            </p>
          </div>

          <div className="mt-3 rounded-2xl border border-white/80 bg-white/80 p-3 shadow-sm backdrop-blur dark:border-slate-700/80 dark:bg-navy-950/70 sm:p-4 lg:mt-0 lg:p-1.5">
            <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
              <span className="font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300">
                For judges
              </span>
              <span className="text-slate-500 dark:text-slate-400">· Hackathon demo access</span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:gap-1.5">
              {demoAccounts.map((account) => {
                const Icon = PERSONA_CONFIGS[account.role].icon;
                const isSelected = selectedRole === account.role;

                return (
                  <article
                    key={account.role}
                    className={`flex min-w-0 flex-col rounded-xl border p-3 transition-all duration-200 lg:p-2 ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50/80 shadow-sm ring-2 ring-teal-500/20 dark:bg-teal-950/40'
                        : 'border-slate-200 bg-white/90 hover:border-teal-300 hover:shadow-sm dark:border-slate-700 dark:bg-navy-900/90 dark:hover:border-teal-700'
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-2 lg:gap-1.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 lg:h-6 lg:w-6">
                        <Icon size={16} className="lg:h-3.5 lg:w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white lg:text-xs">
                            {account.name}
                          </h3>
                          {isSelected && (
                            <span className="rounded-full bg-teal-700 px-2 py-0.5 text-[9px] font-bold text-white dark:bg-teal-600">
                              Selected
                            </span>
                          )}
                        </div>
                        <span className="mt-1 inline-flex max-w-full rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold leading-tight text-slate-700 dark:bg-slate-800 dark:text-slate-200 lg:mt-0.5">
                          {PERSONA_CONFIGS[account.role].label}
                        </span>
                        <p className="mt-1 break-words text-[10px] leading-snug text-slate-500 dark:text-slate-400 lg:mt-0.5 lg:text-[9px]">
                          {account.title}
                        </p>
                      </div>
                    </div>

                    <p className="mt-1.5 break-words text-[11px] leading-snug text-slate-700 dark:text-slate-300 lg:mt-0.5 lg:text-[10px] lg:leading-tight">
                      {account.description}
                    </p>

                    <button
                      type="button"
                      onClick={() => selectPersona(account.role)}
                      aria-pressed={isSelected}
                      className={`mt-2 min-h-8 w-full rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-navy-900 lg:mt-1.5 lg:min-h-6 lg:py-0.5 lg:text-[10px] ${
                        isSelected
                          ? 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800 dark:border-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-teal-400 hover:bg-teal-50 dark:border-slate-600 dark:bg-navy-900 dark:text-slate-200 dark:hover:border-teal-700 dark:hover:bg-teal-950/40'
                      }`}
                    >
                      Use these credentials
                    </button>
                  </article>
                );
              })}
            </div>

            <p className="mt-2 text-center text-[10px] text-slate-600 dark:text-slate-400 lg:mt-1">
              These are demo accounts for judges. No real data.
            </p>
          </div>
        </section>

        <section className="flex min-w-0 flex-col justify-center bg-white p-4 dark:bg-navy-900 sm:p-6 lg:p-4 xl:p-6">
          <div className="mx-auto w-full max-w-md">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal-800 dark:text-teal-300">
              Secure workspace access
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-navy-900 dark:text-white">
              Welcome back
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Sign in with Email &amp; Password
            </p>

            <form onSubmit={handleEmailPasswordSubmit} className="mt-5 space-y-3 lg:mt-4">
              {loginError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                >
                  {loginError}
                </div>
              )}

              <div ref={personaDropdownRef} className="relative">
                <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Role
                </label>
                <button
                  ref={personaTriggerRef}
                  type="button"
                  onClick={() => setIsPersonaOpen((open) => !open)}
                  onKeyDown={handlePersonaTriggerKeyDown}
                  aria-haspopup="listbox"
                  aria-expanded={isPersonaOpen}
                  aria-controls="login-persona-listbox"
                  className="flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-3.5 text-left text-sm font-semibold text-slate-800 shadow-sm transition-colors duration-200 hover:border-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-teal-700 dark:focus-visible:ring-offset-navy-900"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    {React.createElement(PERSONA_CONFIGS[selectedRole].icon, {
                      size: 17,
                      className: 'shrink-0 text-teal-700 dark:text-teal-400',
                    })}
                    <span className="truncate">{PERSONA_CONFIGS[selectedRole].label}</span>
                  </span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-400 ${
                      isPersonaOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isPersonaOpen && (
                  <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-navy-900">
                    <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Switch Active Persona
                    </div>
                    <div
                      id="login-persona-listbox"
                      role="listbox"
                      aria-label="Select a persona"
                      className="pb-1"
                    >
                      {PERSONA_ORDER.map((persona, index) => {
                        const config = PERSONA_CONFIGS[persona];
                        const Icon = config.icon;
                        const isActive = selectedRole === persona;

                        return (
                          <button
                            key={persona}
                            ref={(element) => {
                              personaOptionRefs.current[index] = element;
                            }}
                            type="button"
                            role="option"
                            aria-selected={isActive}
                            onClick={() => selectPersona(persona)}
                            onKeyDown={(event) => handlePersonaOptionKeyDown(event, index)}
                            className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600 ${
                              isActive
                                ? 'bg-teal-50 text-teal-950 dark:bg-teal-950/60 dark:text-teal-100'
                                : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
                            }`}
                          >
                            <Icon size={17} className="mt-0.5 shrink-0 text-teal-700 dark:text-teal-400" />
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold">{config.label}</span>
                              <span className="mt-0.5 block break-words text-xs leading-snug text-slate-500 dark:text-slate-400">
                                {config.desc}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="login-email"
                  className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  Work email
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={emailInput}
                  onChange={(event) => setEmailInput(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 transition-colors duration-200 placeholder:text-slate-400 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus-visible:ring-offset-navy-900"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={isPasswordVisible ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={passwordInput}
                    onChange={(event) => setPasswordInput(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 pr-12 text-sm text-slate-900 transition-colors duration-200 placeholder:text-slate-400 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus-visible:ring-offset-navy-900"
                  />
                  <button
                    type="button"
                    onClick={() => setIsPasswordVisible((visible) => !visible)}
                    aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-xl text-slate-500 transition-colors duration-200 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600 dark:text-slate-400 dark:hover:text-teal-300"
                  >
                    {isPasswordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={authLoading}
                icon={<ArrowRight size={17} />}
                className="h-11 w-full !rounded-xl !bg-teal-700 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 hover:!bg-teal-800 active:!bg-teal-900 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-navy-900"
              >
                Sign in
              </Button>
            </form>

            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-teal-100 bg-teal-50/70 p-3 text-xs leading-relaxed text-slate-700 dark:border-teal-900/70 dark:bg-teal-950/30 dark:text-slate-300 lg:mt-4">
              <Check size={16} className="mt-0.5 shrink-0 text-teal-700 dark:text-teal-400" />
              <span>These demo credentials carry zero real-world access and are rate-limited.</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
