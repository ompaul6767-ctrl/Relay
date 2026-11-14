import React, { useState, useEffect } from 'react';
import { useCase } from '../context/CaseContext';
import { api } from '../api/client';
import { AuditLog, Version } from '../types';
import { Card } from '../components/common/Card';
import { History, GitCommit, Shield, Clock, User, Layers, ArrowUpRight } from 'lucide-react';

export const AuditPage: React.FC = () => {
  const { currentCase } = useCase();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!currentCase) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [auditRes, verRes] = await Promise.all([
          api.getAuditLogs(currentCase._id),
          api.getVersions(currentCase._id),
        ]);
        if (auditRes.audit) setAuditLogs(auditRes.audit);
        if (verRes.versions) setVersions(verRes.versions);
      } catch (err) {
        console.error('Failed to load audit/versions:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentCase]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
          Compliance & Immutability
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <History className="text-teal-600" size={24} />
          Audit Trail & Handover Versions
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Full immutable log of source uploads, extraction runs, approvals, conflict resolutions, and version snapshots.
        </p>
      </div>

      {/* Version History with Diff Counts */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-2">
          <GitCommit size={16} className="text-teal-600" />
          <span>Published Handover Versions ({versions.length})</span>
        </h2>

        {versions.length === 0 ? (
          <Card className="p-6 text-center text-xs text-slate-500">
            No versions published yet. Approved claims will be snapshotted here upon publishing.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {versions.map((v) => {
              const diff = v.diffFromPrevious || { added: 0, modified: 0, removed: 0 };
              return (
                <Card key={v._id} className="p-5 border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-extrabold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                      Version {v.number}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(v.publishedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <div>
                      Published by: <strong>{v.publishedBy}</strong>
                    </div>
                    <div>
                      Active Claims Snapshot: <strong>{v.approvedClaimSnapshot?.length || 0} claims</strong>
                    </div>
                  </div>

                  {/* Diff summary */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-emerald-600 font-bold">+{diff.added} added</span>
                    <span className="text-amber-600 font-bold">~{diff.modified} modified</span>
                    <span className="text-rose-600 font-bold">-{diff.removed} removed</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Audit Log Table */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-2">
          <Shield size={16} className="text-teal-600" />
          <span>Audit Trail (Strict Case Isolation)</span>
        </h2>

        <div className="bg-white dark:bg-navy-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-navy-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Target ID</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                      {log.actor}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {log.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-teal-700 dark:text-teal-400">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400 truncate max-w-[120px]">
                      {log.targetId || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px] font-mono truncate max-w-xs">
                      {log.metadata ? JSON.stringify(log.metadata) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
