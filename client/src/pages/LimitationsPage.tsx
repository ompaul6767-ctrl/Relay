import React from 'react';
import { Card } from '../components/common/Card';
import { Info, AlertTriangle, CheckCircle2, Clock, Shield, Sparkles } from 'lucide-react';

export const LimitationsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
          Transparency & System Boundaries
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Info className="text-teal-600" size={24} />
          Honest Known Limitations & Roadmap
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Relay is built with strict engineering integrity. All features, fallbacks, and scope boundaries are documented honestly below.
        </p>
      </div>

      {/* Known Limitations Cards */}
      <div className="space-y-4">
        <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
            <AlertTriangle size={18} />
            <h3>1. AI Extraction Fallback Architecture</h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Relay integrates Google Gemini API for structured JSON schema claim extraction and second-pass support checks. However, in environments where <code>GEMINI_API_KEY</code> is unset, network connectivity is unavailable, or quotas are exhausted, Relay automatically switches to our deterministic rule-based extractor. The UI displays an explicit banner informing the user whenever this fallback is active.
          </p>
        </Card>

        <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 font-bold text-sm">
            <Info size={18} />
            <h3>2. Supported Input File Formats & Ingestion Scope</h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Current ingestion accepts Markdown notes (<code>.md</code>, <code>.txt</code>), task board CSV exports (<code>id,task,owner,status,due</code>), chat JSON exports (<code>[&#123;ts, author, text&#125;]</code>), and repository exports (commit log lines and issue descriptions). Live webhook connectors for Slack, Microsoft Teams, Jira, or Linear are not yet enabled in this Round 2 build and require pre-exported files.
          </p>
        </Card>

        <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
            <Sparkles size={18} />
            <h3>3. Ingestion Scale & Context Boundaries</h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            To prevent excessive model token consumption and latency, Relay partitions documents into atomic spans and sends only non-restricted, pertinent spans to the model. While optimized for hackathon and startup team scale (hundreds of spans per project), enterprise repositories with millions of lines of chat history require chunked batch ingestion.
          </p>
        </Card>
      </div>

      {/* Planned Round 3 Improvements */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Planned Round 3 Improvements (Designed For, Not Faked)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 space-y-2">
            <div className="text-xs font-bold text-teal-600">1. Gap-Driven Leaver Interview</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Automatically turns Missing and Conflicting claims into interactive targeted interview questions for the departing member; answered points convert directly into Attested claims.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 space-y-2">
            <div className="text-xs font-bold text-teal-600">2. Side-by-Side Evidence Diff</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Interactive timeline view with side-by-side evidence comparison and a semantic diff between subsequent published handover snapshots.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 space-y-2">
            <div className="text-xs font-bold text-teal-600">3. Atlas Vector Search Q&A</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Full embeddings-based semantic retrieval using Atlas Vector Search alongside a read-only GitHub OAuth connector for live consented repository ingestion.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
