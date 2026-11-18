import React, { useState, useEffect } from 'react';
import { useCase } from '../context/CaseContext';
import { api } from '../api/client';
import { Source, ACL } from '../types';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { AclBadge } from '../components/common/AclBadge';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  FileCode,
  MessageSquare,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  ArrowRight,
  ShieldCheck,
  Lock,
  GitBranch,
} from 'lucide-react';

export const ConnectPage: React.FC = () => {
  const { currentCase, refreshCase } = useCase();
  const navigate = useNavigate();

  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);

  // New source form state
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'github'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedName, setPastedName] = useState<string>('');
  const [pastedType, setPastedType] = useState<string>('notes');
  const [pastedText, setPastedText] = useState<string>('');
  const [acl, setAcl] = useState<ACL>('team');
  const [consentConfirmed, setConsentConfirmed] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // GitHub connector state (Improvement 2)
  const [githubRepoUrl, setGithubRepoUrl] = useState<string>('');
  const [githubConsent, setGithubConsent] = useState<boolean>(false);
  const [githubAcl, setGithubAcl] = useState<ACL>('team');
  const [githubImporting, setGithubImporting] = useState<boolean>(false);

  // Preview drawer
  const [previewSource, setPreviewSource] = useState<Source | null>(null);

  const fetchSources = async () => {
    if (!currentCase) return;
    setLoading(true);
    try {
      const res = await api.getSources(currentCase._id);
      if (res.sources) setSources(res.sources);
    } catch (err: any) {
      console.error('Failed to fetch sources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, [currentCase]);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCase) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!consentConfirmed) {
      setErrorMsg('Consent confirmation tick is required: "I am authorised to use this source".');
      return;
    }

    if (activeTab === 'upload') {
      if (!selectedFile) {
        setErrorMsg('Please select a file (.md, .txt, .csv, .json) to upload.');
        return;
      }

      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('acl', acl);
      formData.append('consentConfirmed', 'true');

      try {
        const res = await api.uploadSource(currentCase._id, formData);
        setSuccessMsg(`Source "${res.source.name}" successfully ingested (${res.spansCount} spans generated, ${res.secretsMaskedCount} secrets masked).`);
        setSelectedFile(null);
        setConsentConfirmed(false);
        await fetchSources();
        await refreshCase();
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to upload source file.');
      } finally {
        setUploading(false);
      }
    } else {
      // Paste text
      if (!pastedName.trim() || !pastedText.trim()) {
        setErrorMsg('Please enter both a source name and text content.');
        return;
      }

      setUploading(true);
      try {
        const res = await api.createSourceJson(currentCase._id, {
          name: pastedName.trim(),
          type: pastedType,
          acl,
          consentConfirmed: true,
          rawText: pastedText,
        });
        setSuccessMsg(`Source "${res.source.name}" successfully ingested (${res.spansCount} spans generated, ${res.secretsMaskedCount} secrets masked).`);
        setPastedName('');
        setPastedText('');
        setConsentConfirmed(false);
        await fetchSources();
        await refreshCase();
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to ingest pasted source.');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleGithubImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCase) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!githubConsent) {
      setErrorMsg('Consent required: "This is a public repository and I am authorised to use it".');
      return;
    }

    if (!githubRepoUrl.trim()) {
      setErrorMsg('Please specify a GitHub repository (e.g. owner/repo or https://github.com/owner/repo).');
      return;
    }

    setGithubImporting(true);
    try {
      const res = await api.importGithubRepo(currentCase._id, {
        repoUrl: githubRepoUrl.trim(),
        consent: true,
        acl: githubAcl,
      });
      setSuccessMsg(res.message || `Successfully imported GitHub repository ${githubRepoUrl}.`);
      setGithubRepoUrl('');
      setGithubConsent(false);
      await fetchSources();
      await refreshCase();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to import GitHub repository.');
    } finally {
      setGithubImporting(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'tasks_csv':
        return <FileCode className="text-blue-500" size={18} />;
      case 'chat_json':
        return <MessageSquare className="text-amber-500" size={18} />;
      case 'repo_export':
        return <FileCode className="text-purple-500" size={18} />;
      case 'notes':
      default:
        return <FileText className="text-teal-500" size={18} />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
            Step 1 of 5
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Connect Authorised Sources
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Ingest meeting notes, task board CSVs, team chat exports, and git commit logs. All obvious secrets are masked on ingestion.
          </p>
        </div>

        {sources.length > 0 && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/reconstruct')}
            icon={<ArrowRight size={14} />}
          >
            Proceed to Reconstruct ({sources.length} Sources)
          </Button>
        )}
      </div>

      {/* Upload Form Box */}
      <Card className="p-6 border-slate-300 dark:border-slate-800 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'upload'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              Upload File (.md, .txt, .csv, .json)
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'paste'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              Paste Raw Text
            </button>
            <button
              onClick={() => setActiveTab('github')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                activeTab === 'github'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              <GitBranch size={13} />
              <span>Import from GitHub</span>
            </button>
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-slate-500">
            <ShieldCheck size={14} className="text-teal-600" />
            <span>Automatic Secret Masking Active</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2">
            <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {activeTab === 'github' ? (
          <form onSubmit={handleGithubImport} className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    GitHub Repository (Public):
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setGithubRepoUrl('ompaul6767-ctrl/Relay');
                      setGithubConsent(true);
                    }}
                    className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center space-x-1"
                  >
                    <span>Use Demo: ompaul6767-ctrl/Relay</span>
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <GitBranch size={15} />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ompaul6767-ctrl/Relay or https://github.com/owner/repo"
                    value={githubRepoUrl}
                    onChange={(e) => setGithubRepoUrl(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-950 focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Relay reads up to 100 commits and 50 issues via GitHub REST API. Strict SSRF protection ensures only valid github.com URLs are queried.
                </p>
              </div>

              {/* ACL Label and Consent Tick */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Access Label (ACL):
                  </label>
                  <select
                    value={githubAcl}
                    onChange={(e) => setGithubAcl(e.target.value as ACL)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-900 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="team">team (General team & incoming members)</option>
                    <option value="leads_only">leads_only (Confidential / Lead-only visibility)</option>
                  </select>
                </div>

                <div className="flex flex-col justify-center">
                  <label className="flex items-start space-x-2 cursor-pointer mt-2">
                    <input
                      type="checkbox"
                      required
                      checked={githubConsent}
                      onChange={(e) => setGithubConsent(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                      "This is a public repository and I am authorised to use it."
                    </span>
                  </label>
                  <span className="text-[11px] text-slate-400 ml-5">
                    Strictly required by Section 6 specification.
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={githubImporting}
                  disabled={!githubConsent || !githubRepoUrl.trim()}
                  icon={<GitBranch size={14} />}
                >
                  {githubImporting ? 'Importing from GitHub...' : 'Import Commits & Issues'}
                </Button>
              </div>
            </div>
          </form>
        ) : (
        <form onSubmit={handleFileUpload} className="space-y-4">
          {activeTab === 'upload' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Choose Document File:
              </label>
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                <UploadCloud size={32} className="mx-auto text-slate-400 mb-2" />
                <input
                  type="file"
                  id="sourceFileInput"
                  accept=".md,.txt,.csv,.json"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label
                  htmlFor="sourceFileInput"
                  className="cursor-pointer text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                >
                  {selectedFile ? selectedFile.name : 'Click to browse files or drag and drop here'}
                </label>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supported formats: Meeting notes (.md, .txt), Task board CSV (.csv), Chat export (.json), Git commit log
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Source Identifier Name:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. sprint_3_retro_notes.md"
                    value={pastedName}
                    onChange={(e) => setPastedName(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-950 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Document Type:
                  </label>
                  <select
                    value={pastedType}
                    onChange={(e) => setPastedType(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-950 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="notes">Meeting Notes (Markdown / Text)</option>
                    <option value="tasks_csv">Task Board CSV (id,task,owner,status,due)</option>
                    <option value="chat_json">Chat Export JSON ([{"{ts, author, text}"}])</option>
                    <option value="repo_export">Repository Export (git log & issues)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pasted Content:
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Paste document text here..."
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  className="w-full text-xs font-mono p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-950 focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          )}

          {/* ACL Label and Consent Tick (Mandatory) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Access Label (ACL):
              </label>
              <select
                value={acl}
                onChange={(e) => setAcl(e.target.value as ACL)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-900 focus:ring-2 focus:ring-teal-500"
              >
                <option value="team">team (General team & incoming members)</option>
                <option value="leads_only">leads_only (Confidential billing & lead notes)</option>
                <option value="owner_only">owner_only (Restricted to case owner)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Leads_only sources are strictly filtered server-side into stubs for incoming roles.
              </p>
            </div>

            <div className="flex flex-col justify-center">
              <label className="flex items-start space-x-2 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  required
                  checked={consentConfirmed}
                  onChange={(e) => setConsentConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                  "I am authorised to use this source and confirm it contains only synthetic project data."
                </span>
              </label>
              <span className="text-[11px] text-slate-400 ml-5">
                Ingestion is blocked without this explicit declaration.
              </span>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={uploading}
              disabled={!consentConfirmed || (activeTab === 'upload' && !selectedFile)}
            >
              Ingest & Partition Spans
            </Button>
          </div>
        </form>
        )}
      </Card>

      {/* Connected Sources List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-between">
          <span>Connected Sources ({sources.length})</span>
          <span className="text-xs font-normal text-slate-400">
            Immutable spans partitioned with stable IDs (S1.L1 ... Sn.Lm)
          </span>
        </h2>

        {loading ? (
          <div className="text-xs text-slate-400 p-4">Loading sources...</div>
        ) : sources.length === 0 ? (
          <Card className="p-8 text-center text-xs text-slate-500">
            No sources connected yet. Upload files above or click "Load Demo Project" to populate Campus Event Portal.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sources.map((src) => (
              <Card
                key={src._id}
                className="p-4 flex flex-col justify-between space-y-3 border border-slate-200 dark:border-slate-800"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                      {getTypeIcon(src.type)}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {src.name}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
                        <span className="capitalize">{src.type.replace('_', ' ')}</span>
                        <span>•</span>
                        <span>{src.spanCount ?? 0} spans</span>
                      </div>
                    </div>
                  </div>
                  <AclBadge acl={src.acl} size="sm" />
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                    <CheckCircle2 size={13} />
                    <span>Consent Confirmed</span>
                  </div>
                  <button
                    onClick={() => setPreviewSource(src)}
                    className="flex items-center space-x-1 text-teal-600 hover:text-teal-700 font-semibold"
                  >
                    <Eye size={13} />
                    <span>Inspect Raw</span>
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Raw Preview Drawer Modal */}
      {previewSource && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl bg-white dark:bg-navy-900 h-full p-6 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <FileText size={18} className="text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {previewSource.name}
                </h3>
              </div>
              <button
                onClick={() => setPreviewSource(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-3 flex items-center justify-between text-xs border-b border-slate-100 dark:border-slate-800">
              <AclBadge acl={previewSource.acl} />
              <span className="text-slate-400 font-mono text-[11px]">
                Type: {previewSource.type}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 font-mono text-xs text-slate-700 dark:text-slate-300 p-4 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 whitespace-pre-wrap">
              {previewSource.rawText}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
