import React from 'react';
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
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { switchRole, role, isLoading: authLoading } = useAuth();
  const { loadDemoProject, isSeeding, currentCase } = useCase();
  const navigate = useNavigate();

  const handleRoleSelect = async (selectedRole: UserRole) => {
    await switchRole(selectedRole);
    if (selectedRole === 'lead') {
      navigate('/review');
    } else {
      navigate('/handover');
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
          <span>Hackathon Build • Team Tech Force</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-navy-900 dark:text-white max-w-3xl mx-auto leading-tight">
          Prevent Critical Knowledge From Leaving With People
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Relay ingests authorised project sources, reconstructs project state into small atomic claims, links every fact to verbatim evidence, and delivers role-appropriate handovers with zero unverified assumptions.
        </p>

        {/* Demo Action Bar */}
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
        </div>
      </div>

      {/* Role Picker Section */}
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Choose a Demo Role to Explore
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No signup or password required. Switch personas instantly anytime from the top bar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Engineering Lead Card */}
          <div
            onClick={() => handleRoleSelect('lead')}
            className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between hover:shadow-lg ${
              role === 'lead'
                ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 shadow-md'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 hover:border-amber-400'
            }`}
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                <Shield size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Maya (Engineering Lead)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Full governance authority. Review claims side-by-side with source text, resolve conflicts, edit & attest facts, and publish versioned handover plans.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 mt-4 flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-400">
              <span>Enter Review Workspace</span>
              <ArrowRight size={14} />
            </div>
          </div>

          {/* Incoming Developer Card */}
          <div
            onClick={() => handleRoleSelect('incoming_dev')}
            className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between hover:shadow-lg ${
              role === 'incoming_dev'
                ? 'border-teal-500 bg-teal-50/40 dark:bg-teal-950/20 shadow-md'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 hover:border-teal-400'
            }`}
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                <Code2 size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Devon (Incoming Developer)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Technical view emphasizing code ownership, architecture decisions, deploy scripts, and Day 1 to Day 30 milestones. Restricted notes are masked into stubs.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 mt-4 flex items-center justify-between text-xs font-semibold text-teal-700 dark:text-teal-400">
              <span>View Technical Handover</span>
              <ArrowRight size={14} />
            </div>
          </div>

          {/* Incoming Designer Card */}
          <div
            onClick={() => handleRoleSelect('incoming_designer')}
            className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between hover:shadow-lg ${
              role === 'incoming_designer'
                ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-md'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 hover:border-indigo-400'
            }`}
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
                <Palette size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Dana (Incoming Designer)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Design view emphasizing visual system assets, Figma tokens, typography, and key design contacts. Shares identical strict ACL security guarantees.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 mt-4 flex items-center justify-between text-xs font-semibold text-indigo-700 dark:text-indigo-400">
              <span>View Design Handover</span>
              <ArrowRight size={14} />
            </div>
          </div>
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
              <strong className="text-slate-800 dark:text-slate-200">Zero AI Hallucination:</strong> Every fact must cite exact source quote & span ID.
            </div>
          </div>
          <div className="flex items-start space-x-2.5">
            <Lock size={16} className="text-teal-500 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="text-slate-800 dark:text-slate-200">Server-Side ACLs:</strong> Sensitive leads-only notes never leak to incoming roles.
            </div>
          </div>
          <div className="flex items-start space-x-2.5">
            <Shield size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="text-slate-800 dark:text-slate-200">Human Approval Gate:</strong> Nothing reaches incoming person before lead approval.
            </div>
          </div>
          <div className="flex items-start space-x-2.5">
            <Layers size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="text-slate-800 dark:text-slate-200">Synthetic Demo Data:</strong> 100% fictional project, zero real credentials or PII.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
