import React, { useState } from 'react';
import { TaskSubmission, GroupInfo, PillarCategory } from '../types';
import {
  FileText,
  Lock,
  Clock,
  RotateCcw,
  Search,
  Filter,
  Download,
  ExternalLink,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';

interface SubmissionsDashboardProps {
  submissions: TaskSubmission[];
  groups: GroupInfo[];
  isAdmin: boolean;
  onUnlockSubmission: (submissionId: string) => Promise<void>;
  onResetGroupTasks?: (groupName: string) => Promise<void>;
  onResetAllTasks?: () => Promise<void>;
}

export const SubmissionsDashboard: React.FC<SubmissionsDashboardProps> = ({
  submissions,
  groups,
  isAdmin,
  onUnlockSubmission,
  onResetGroupTasks,
  onResetAllTasks,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'completed' | 'in_progress'>('ALL');
  const [activeSubmissionDetail, setActiveSubmissionDetail] = useState<TaskSubmission | null>(null);
  const [unlockConfirmId, setUnlockConfirmId] = useState<string | null>(null);
  const [showResetGroupConfirm, setShowResetGroupConfirm] = useState(false);
  const [showResetAllConfirm, setShowResetAllConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const filteredSubmissions = submissions.filter((s) => {
    const matchesSearch =
      s.taskTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.responseSummary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = selectedGroup === 'ALL' || s.groupName === selectedGroup;
    const matchesCategory = selectedCategory === 'ALL' || s.category === selectedCategory;
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesGroup && matchesCategory && matchesStatus;
  });

  const completedCount = submissions.filter((s) => s.status === 'completed').length;
  const inProgressCount = submissions.filter((s) => s.status === 'in_progress').length;

  const handleExportCSV = () => {
    const headers = [
      'Submission ID',
      'Timestamp',
      'Task Title',
      'Category',
      'Group / PLC',
      'User Email',
      'Status',
      'Reflection Response',
    ];
    const rows = filteredSubmissions.map((s) => [
      s.id,
      s.submittedAt,
      `"${s.taskTitle}"`,
      `"${s.category}"`,
      `"${s.groupName}"`,
      s.userEmail,
      s.status,
      `"${(s.responseSummary || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `form_submissions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileSpreadsheet className="w-4 h-4 text-[#28532c]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#28532c]">
              CENTRALIZED FORM DATA HUB
            </span>
          </div>
          <h2 className="text-2xl font-serif font-bold text-slate-900">
            Incoming Form Responses & Lockout Records
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time synchronization of all 16 Google Form reflections across all authorized PLC cohorts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && selectedGroup !== 'ALL' && onResetGroupTasks && (
            <button
              type="button"
              id="btn-dashboard-reset-group"
              onClick={() => setShowResetGroupConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Tasks for {selectedGroup}</span>
            </button>
          )}

          {isAdmin && onResetAllTasks && (
            <button
              type="button"
              id="btn-dashboard-reset-all"
              onClick={() => setShowResetAllConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-800 bg-rose-100/70 hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Master Reset (All Groups)</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Submissions (CSV)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total Submissions
          </span>
          <div className="text-2xl font-bold text-slate-900">{submissions.length}</div>
          <span className="text-[11px] text-slate-500">Across all groups</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block mb-1">
            Locked & Completed
          </span>
          <div className="text-2xl font-bold text-emerald-700">{completedCount}</div>
          <span className="text-[11px] text-emerald-600">Single-submission enforced</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block mb-1">
            In Progress
          </span>
          <div className="text-2xl font-bold text-blue-700">{inProgressCount}</div>
          <span className="text-[11px] text-blue-600">Form draft or active task</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#28532c] block mb-1">
            Target Workspace Doc
          </span>
          <div className="text-xs font-semibold text-slate-800 truncate mt-1">
            Central Google Sheet / Doc
          </div>
          <span className="text-[11px] text-[#28532c] font-medium">Automatic sync via Apps Script</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-1 flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search submissions or reflections..."
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#28532c]"
            />
          </div>

          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="text-xs sm:text-sm py-1.5 px-3 border border-slate-300 rounded-lg outline-none bg-white text-slate-700 focus:ring-2 focus:ring-[#28532c]"
          >
            <option value="ALL">All Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.name}>
                {g.name}
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs sm:text-sm py-1.5 px-3 border border-slate-300 rounded-lg outline-none bg-white text-slate-700 focus:ring-2 focus:ring-[#28532c]"
          >
            <option value="ALL">All Categories</option>
            <option value="Hospitality & Space">Hospitality & Space</option>
            <option value="Pacing & Silence">Pacing & Silence</option>
            <option value="Language & Metaphor">Language & Metaphor</option>
            <option value="Attentiveness">Attentiveness</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs sm:text-sm py-1.5 px-3 border border-slate-300 rounded-lg outline-none bg-white text-slate-700 focus:ring-2 focus:ring-[#28532c]"
          >
            <option value="ALL">All Statuses</option>
            <option value="completed">Completed (Locked)</option>
            <option value="in_progress">In Progress</option>
          </select>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Task & Category</th>
                <th className="py-3 px-4">Group / PLC</th>
                <th className="py-3 px-4">Submitted By</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No submissions found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => {
                  const isCompleted = sub.status === 'completed';
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm">{sub.taskTitle}</div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {sub.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-800">{sub.groupName}</td>

                      <td className="py-3 px-4 font-mono text-xs text-slate-600">{sub.userEmail}</td>

                      <td className="py-3 px-4 text-slate-500">
                        {new Date(sub.submittedAt).toLocaleDateString()} at{' '}
                        {new Date(sub.submittedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3 px-4">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <Lock className="w-3 h-3 text-emerald-700" />
                            <span>Locked</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <Clock className="w-3 h-3 text-blue-600" />
                            <span>In Progress</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setActiveSubmissionDetail(sub)}
                            className="px-2.5 py-1 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
                          >
                            View Reflection
                          </button>

                          {isAdmin && (
                            <>
                              {unlockConfirmId !== sub.id ? (
                                <button
                                  type="button"
                                  onClick={() => setUnlockConfirmId(sub.id)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Admin: Unlock or Reset Task"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onUnlockSubmission(sub.id);
                                      setUnlockConfirmId(null);
                                    }}
                                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setUnlockConfirmId(null)}
                                    className="px-1 text-[10px] text-slate-500"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Reflection Modal */}
      {activeSubmissionDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#28532c]">
                  {activeSubmissionDetail.category}
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  {activeSubmissionDetail.taskTitle}
                </h3>
                <p className="text-xs text-slate-500">
                  Group: {activeSubmissionDetail.groupName} • Submitter: {activeSubmissionDetail.userEmail}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubmissionDetail(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Submitted Reflection & Pedagogical Notes:
                </span>
                <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {activeSubmissionDetail.responseSummary || 'No text reflection provided.'}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>
                  Submitted: {new Date(activeSubmissionDetail.submittedAt).toLocaleString()}
                </span>
                <span className="font-semibold text-emerald-700">Single submission locked</span>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveSubmissionDetail(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Group Tasks Confirmation Modal */}
      {showResetGroupConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <RotateCcw className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">Reset Tasks for {selectedGroup}?</h3>
            </div>
            <p className="text-xs text-slate-600">
              This will remove all submissions and unlock all 16 tiles for <strong>{selectedGroup}</strong>.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResetGroupConfirm(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={async () => {
                  if (onResetGroupTasks) {
                    setActionLoading(true);
                    try {
                      await onResetGroupTasks(selectedGroup);
                      setShowResetGroupConfirm(false);
                    } catch (e: any) {
                      alert('Error: ' + e.message);
                    } finally {
                      setActionLoading(false);
                    }
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50 shadow-xs"
              >
                {actionLoading ? 'Resetting...' : 'Yes, Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Master Reset All Groups Confirmation Modal */}
      {showResetAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-rose-700">
              <RotateCcw className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">MASTER RESET: All Groups</h3>
            </div>
            <p className="text-xs text-rose-900 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
              ⚠️ Warning: This will clear all locked tiles and form submissions across all PLC cohorts for the new semester.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResetAllConfirm(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={async () => {
                  if (onResetAllTasks) {
                    setActionLoading(true);
                    try {
                      await onResetAllTasks();
                      setShowResetAllConfirm(false);
                      alert('All group tasks reset for the new semester.');
                    } catch (e: any) {
                      alert('Error: ' + e.message);
                    } finally {
                      setActionLoading(false);
                    }
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-lg disabled:opacity-50 shadow-xs"
              >
                {actionLoading ? 'Resetting All...' : 'Confirm Master Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
