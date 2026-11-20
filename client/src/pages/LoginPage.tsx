import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  Shield,
  KeyRound,
  Copy,
  Check,
  ArrowRight,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  Code2,
  Palette,
  ArrowRightLeft,
  Zap,
} from 'lucide-react';

interface DemoAccount {
  id: string;
  role: string;
  name: string;
  email: string;
  password: string;
  title: string;
  badge: string;
  badgeColor: string;
  icon: any;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'judge',
    role: 'lead',
    name: 'Hackathon Judge / Reviewer',
    email: 'demo@techforce.dev',
    password: 'Demo@1234',
    title: 'Full Platform Access & Lead Reviewer',
    badge: 'Recommended',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300',
    icon: Zap,
  },
  {
    id: 'lead',
    role: 'lead',
    name: 'Maya',
    email: 'lead@relay.demo',
    password: 'relay2026!',
    title: 'Engineering Lead',
    badge: 'Lead Authority',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300',
    icon: Shield,
  },
  {
    id: 'incoming_dev',
    role: 'incoming_dev',
    name: 'Devon',
    email: 'incoming_dev@relay.demo',
    password: 'relay2026!',
    title: 'Incoming Developer',
    badge: 'Code & Deploy',
    badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border-teal-300',
    icon: Code2,
  },
  {
    id: 'incoming_designer',
    role: 'incoming_designer',
    name: 'Dana',
    email: 'incoming_designer@relay.demo',
    password: 'relay2026!',
    title: 'Incoming Designer',
    badge: 'Figma & Assets',
    badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300',
    icon: Palette,
  },
  {
    id: 'departing',
    role: 'departing',
    name: 'Aarav',
    email: 'departing@relay.demo',
    password: 'relay2026!',
    title: 'Departing Engineer',
    badge: 'Knowledge Leaver',
    badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300',
    icon: ArrowRightLeft,
  },
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loginWithCredentials, oneClickDemoLogin, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('judge');

  // Destination redirect after successful authentication
  const from = (location.state as any)?.from?.pathname || '/cases';

  // If already authenticated, redirect away from /login
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Copy to clipboard helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Populate input fields without auto-submitting
  const handleFillFields = (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(account.password);
    setActiveTab(account.id);
    setErrorMessage(null);
  };

  // Standard Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent duplicate requests on double-clicks

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setErrorMessage(null);
    const result = await loginWithCredentials(email.trim(), password);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setErrorMessage(result.error || 'Invalid email or password.');
    }
  };

  // Direct One-Click Demo Login Handler
  const handleOneClickLogin = async (account: DemoAccount) => {
    if (isLoading) return;
    setErrorMessage(null);
    setEmail(account.email);
    setPassword(account.password);
    setActiveTab(account.id);

    const result = await oneClickDemoLogin(account.email, account.password);
    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setErrorMessage(result.error || 'Authentication failed. Please try again.');
    }
  };

  const selectedAccount = DEMO_ACCOUNTS.find((a) => a.id === activeTab) || DEMO_ACCOUNTS[0];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-navy-950 transition-colors">
      <div className="max-w-5xl mx-auto w-full">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2.5 group mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-navy-900 via-teal-700 to-teal-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
              <Sparkles size={20} />
            </div>
            <span className="text-2xl font-bold tracking-tight text-navy-900 dark:text-white">
              Relay
            </span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900 dark:text-white tracking-tight">
            Sign In to Your Handover Workspace
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Evidence-linked knowledge transfer platform where code and verbatim quotes decide truth.
          </p>
        </div>

        {/* Responsive Grid: Standard Login Form + Judge Quick-Access Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: Standard Authentication Form (5 cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-navy-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-navy-900 dark:text-white flex items-center gap-2">
                  <KeyRound size={18} className="text-teal-600 dark:text-teal-400" />
                  Account Login
                </h2>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  JWT Secured
                </span>
              </div>

              {/* Inline Error Message Alert */}
              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start space-x-2.5 text-xs text-red-700 dark:text-red-300 animate-in fade-in">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-red-500" />
                  <div className="flex-1 leading-relaxed">{errorMessage}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail size={16} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="e.g. demo@techforce.dev"
                      required
                      autoComplete="username"
                      disabled={isLoading}
                      className="block w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Password
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock size={16} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="••••••••••••"
                      required
                      autoComplete="current-password"
                      disabled={isLoading}
                      className="block w-full pl-9 pr-10 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || !email || !password}
                  className="w-full mt-2 py-2.5 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-sm font-semibold shadow-sm shadow-teal-700/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-navy-900"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Security Guarantee Note */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Shield size={14} className="text-teal-600 flex-shrink-0" />
              <span>Passwords hashed with bcrypt. Sessions signed with JWT.</span>
            </div>
          </div>

          {/* Right Column: Judge-Friendly Quick Demo Access Panel (7 cols) */}
          <div className="lg:col-span-7 bg-gradient-to-br from-white via-teal-50/20 to-slate-50 dark:from-navy-900 dark:via-navy-900/90 dark:to-navy-950 rounded-2xl shadow-sm border-2 border-teal-500/40 dark:border-teal-500/30 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
            {/* Background Glow Accent */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              {/* Header Badge */}
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-teal-600 text-white shadow-sm shadow-teal-600/30">
                  <Sparkles size={12} />
                  Demo Credentials / Quick Judge Access
                </span>
                <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 hidden sm:inline">
                  Zero Typing Required
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-bold text-navy-900 dark:text-white mb-2">
                Evaluate Relay in 1 Click
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
                Choose any pre-configured persona below to test role-filtered handovers, leaver interview attestation, and conflict resolution without manual signup.
              </p>

              {/* Persona Selector Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-slate-100/80 dark:bg-navy-950/70 rounded-xl mb-5 border border-slate-200/60 dark:border-slate-800">
                {DEMO_ACCOUNTS.map((acc) => {
                  const Icon = acc.icon;
                  const isSelected = activeTab === acc.id;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(acc.id);
                        handleFillFields(acc);
                      }}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-[11px] font-medium transition-all ${
                        isSelected
                          ? 'bg-white dark:bg-navy-800 text-teal-700 dark:text-teal-300 font-bold shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon size={14} className="mb-1" />
                      <span className="truncate w-full text-center">{acc.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>

              {/* Active Persona Spotlight Card */}
              <div className="bg-white dark:bg-navy-950 rounded-xl border border-teal-200/70 dark:border-teal-800/40 p-4 mb-5 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-navy-900 dark:text-white">
                        {selectedAccount.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${selectedAccount.badgeColor}`}
                      >
                        {selectedAccount.badge}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {selectedAccount.title}
                    </div>
                  </div>

                  {/* Primary One-Click Action for the active persona */}
                  <button
                    type="button"
                    onClick={() => handleOneClickLogin(selectedAccount)}
                    disabled={isLoading}
                    className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                  >
                    {isLoading && activeTab === selectedAccount.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Zap size={13} />
                    )}
                    <span>1-Click Login</span>
                  </button>
                </div>

                {/* Credential Details with Copy Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* Email Box */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-navy-900 border border-slate-200/80 dark:border-slate-800">
                    <div className="truncate mr-2">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Email</div>
                      <div className="font-mono text-slate-800 dark:text-slate-200 truncate">
                        {selectedAccount.email}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedAccount.email, `${selectedAccount.id}-email`)}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      title="Copy email"
                    >
                      {copiedKey === `${selectedAccount.id}-email` ? (
                        <Check size={14} className="text-emerald-500" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>

                  {/* Password Box */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-navy-900 border border-slate-200/80 dark:border-slate-800">
                    <div className="truncate mr-2">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Password</div>
                      <div className="font-mono text-slate-800 dark:text-slate-200 truncate">
                        {selectedAccount.password}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(selectedAccount.password, `${selectedAccount.id}-password`)
                      }
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      title="Copy password"
                    >
                      {copiedKey === `${selectedAccount.id}-password` ? (
                        <Check size={14} className="text-emerald-500" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-500 dark:text-slate-400 text-center sm:text-left">
                Need to inspect public demo data first?
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleFillFields(selectedAccount)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
                >
                  Fill Form Fields
                </button>
                <Link
                  to="/"
                  className="px-3 py-1.5 rounded-lg text-teal-700 dark:text-teal-400 hover:underline font-semibold"
                >
                  View Landing Page
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Helper Bar */}
        <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
          We Code Coders / CodePuneThinkers Hackathon Round 3 &bull; Built by Team Tech Force
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
