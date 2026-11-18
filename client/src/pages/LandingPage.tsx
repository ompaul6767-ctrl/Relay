import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCase } from '../context/CaseContext';
import { Button } from '../components/common/Button';
import { UserRole } from '../types';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Code2,
  Palette,
  Database,
  ArrowRight,
  CheckCircle2,
  Lock,
  GitBranch,
  Layers,
  Sparkles,
  Key,
  UserCheck,
  Compass,
  Copy,
  Check,
  LogIn,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { switchRole, role, loginWithCredentials, isLoading: authLoading } = useAuth();
  const { loadDemoProject, isSeeding, currentCase } = useCase();
  const navigate = useNavigate();

  // Login form state
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const demoAccounts = [
    {
      role: 'lead' as UserRole,
      title: 'Engineering Lead',
      name: 'Maya',
      email: 'lead@relay.demo',
      password: 'relay2026!',
      icon: Shield,
      color: 'amber',
      description: 'Review claims, verify quotes, resolve conflicts, lead interview approvals, publish versions.',
      targetRoute: '/review',
    },
    {
      role: 'departing' as UserRole,
      title: 'Senior Backend Engineer (Departing)',
      name: 'Aarav',
      email: 'departing@relay.demo',
      password: 'relay2026!',
      icon: UserCheck,
      color: 'emerald',
      description: 'Answer gap-driven leaver interview questions, provide reasoning for conflicts, submit attested claims.',
      targetRoute: '/interview',
    },
    {
      role: 'incoming_dev' as UserRole,
      title: 'Incoming Software Engineer',
      name: 'Devon',
      email: 'incoming_dev@relay.demo',
      password: 'relay2026!',
      icon: Code2,
      color: 'teal',
      description: 'Access technical handovers, Day 1-30 milestones, cited Q&A assistant with vector retrieval. Restricted notes masked.',
      targetRoute: '/handover',
    },
    {
      role: 'incoming_designer' as UserRole,
      title: 'Incoming Product Designer',
      name: 'Dana',
      email: 'incoming_designer@relay.demo',
      password: 'relay2026!',
      icon: Palette,
      color: 'indigo',
      description: 'Access design handovers, Figma tokens, visual system assets, and contact directory with zero confidential leaks.',
      targetRoute: '/handover',
    },
  ];

  const handleRoleSelect = async (selectedRole: UserRole, targetRoute: string) => {
    await switchRole(selectedRole);
    navigate(targetRoute);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(id);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleLoadDemo = async () => {
    const caseId = await loadDemoProject();
    if (caseId) {
      navigate('/review');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 py-6">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-semibold">
          <Sparkles size={14} />
          <span>Hackathon Build • Team Tech Force (We Code Coders)</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-navy-900 dark:text-white max-w-3xl mx-auto leading-tight">
          Prevent Critical Knowledge From Leaving With People
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Relay ingests project sources and GitHub repos, extracts atomic claims, links every fact to verbatim evidence, resolves conflicts on dated timelines, conducts gap-driven leaver interviews, and delivers role-appropriate handovers with zero unverified assumptions.
        </p>

        {/* Primary Demo Action Bar */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
          <Button
            size="lg"
            variant="primary"
            loading={isSeeding}
            onClick={handleLoadDemo}
            className="px-6 py-3 text-sm font-semibold shadow-lg shadow-teal-900/10"
            icon={<Database size={18} />}
          >
            Load Demo Project ("Campus Event Portal")
          </Button>

          {currentCase && (
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/review')}
              className="px-6 py-3 text-sm"
              icon={<ArrowRight size={18} />}
            >
              Open Active Workspace
            </Button>
          )}

          <Button
            size="lg"
            variant="secondary"
            onClick={() => setShowLoginForm(!showLoginForm)}
            className="px-5 py-3 text-sm"
            icon={<Key size={16} />}
          >
            {showLoginForm ? 'Hide Password Form' : 'Email & Password Login'}
          </Button>
        </div>
      </div>

      {/* Start Here Guide (Section 9 requirement) */}
      <div className="p-6 rounded-2xl border border-teal-200 dark:border-teal-900/70 bg-teal-50/50 dark:bg-teal-950/20">
        <div className="flex items-center space-x-2 mb-4 text-teal-900 dark:text-teal-200">
          <Compass size={20} className="text-teal-600 dark:text-teal-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider">Start Here Guide (First-Time Walkthrough)</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-white dark:bg-navy-900 p-4 rounded-xl border border-teal-100 dark:border-teal-900 shadow-sm space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[11px]">1</span>
              <span>Sign in with Demo Account</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Click any of the 4 demo roles below or sign in using the provided demo email and password.
            </p>
          </div>
          <div className="bg-white dark:bg-navy-900 p-4 rounded-xl border border-teal-100 dark:border-teal-900 shadow-sm space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[11px]">2</span>
              <span>Load Synthetic Project</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Click <strong>"Load Demo Project"</strong> to seed the "Campus Event Portal" with planted gaps, conflicts, and commits.
            </p>
          </div>
          <div className="bg-white dark:bg-navy-900 p-4 rounded-xl border border-teal-100 dark:border-teal-900 shadow-sm space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[11px]">3</span>
              <span>Follow the Stepper</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Navigate: <strong>Connect</strong> &rarr; <strong>Reconstruct</strong> &rarr; <strong>Interview</strong> &rarr; <strong>Timeline</strong> &rarr; <strong>Review</strong> &rarr; <strong>Handover</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Email & Password Login Form (Conditional) */}
      {showLoginForm && (
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 shadow-md max-w-md mx-auto space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold text-sm">
            <LogIn size={18} className="text-teal-600" />
            <span>Sign In with Email & Password</span>
          </div>
          <form onSubmit={handleEmailPasswordSubmit} className="space-y-3">
            {loginError && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">
                {loginError}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Demo Email
              </label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="lead@relay.demo"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Demo Password
              </label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="relay2026!"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={authLoading}
              className="w-full text-xs font-semibold"
            >
              Sign In
            </Button>
          </form>
        </div>
      )}

      {/* Demo Accounts Card (Section 4.4 Mandated) */}
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
            <Key size={12} className="text-teal-600" />
            <span>Organiser Credentials</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Demo Accounts (One-Click or Password Sign-In)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            These demo credentials carry zero real-world access and are rate-limited. Click "Sign in as" to enter instantly, or copy credentials to test standard authentication.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {demoAccounts.map((acc) => {
            const Icon = acc.icon;
            const isCurrent = role === acc.role;

            return (
              <div
                key={acc.role}
                className={`p-5 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                  isCurrent
                    ? 'border-teal-500 bg-teal-50/40 dark:bg-teal-950/20 shadow-md ring-2 ring-teal-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 hover:border-teal-300'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center">
                      <Icon size={20} className="text-teal-600 dark:text-teal-400" />
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-600 text-white">
                        Active
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {acc.name}
                    </h3>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-tight">
                      {acc.title}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {acc.description}
                  </p>

                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] font-mono space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Email:</span>
                      <div className="flex items-center space-x-1">
                        <span className="text-slate-800 dark:text-slate-200">{acc.email}</span>
                        <button
                          onClick={() => handleCopy(acc.email, acc.role)}
                          className="text-slate-400 hover:text-teal-600 ml-1"
                          title="Copy email"
                        >
                          {copiedEmail === acc.role ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Pass:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-semibold">{acc.password}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    size="sm"
                    variant={isCurrent ? 'primary' : 'outline'}
                    loading={authLoading && isCurrent}
                    onClick={() => handleRoleSelect(acc.role, acc.targetRoute)}
                    className="w-full text-xs font-semibold"
                  >
                    {isCurrent ? 'Current Persona' : `Sign in as ${acc.name}`}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Non-Negotiable Trust Rules Strip */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 text-center">
          Core Architectural Guarantees (Non-Negotiable Trust Rules)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="flex items-start space-x-2.5">
            <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="text-slate-800 dark:text-slate-200">Zero AI Hallucination:</strong> Every fact must cite exact source quote & span ID. Code decides verification.
            </div>
          </div>
          <div className="flex items-start space-x-2.5">
            <Lock size={16} className="text-teal-500 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="text-slate-800 dark:text-slate-200">Server-Side ACLs:</strong> Sensitive leads-only notes never leak to incoming roles in search, Q&A, or timeline.
            </div>
          </div>
          <div className="flex items-start space-x-2.5">
            <Shield size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="text-slate-800 dark:text-slate-200">Human Approval Gate:</strong> Nothing reaches an incoming person before explicit lead approval.
            </div>
          </div>
          <div className="flex items-start space-x-2.5">
            <Layers size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="text-slate-800 dark:text-slate-200">Synthetic Demo Data:</strong> 100% fictional project, zero real credentials, secrets, or company PII.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
