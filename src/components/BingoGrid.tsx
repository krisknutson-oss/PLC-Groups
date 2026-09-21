import React, { useState } from 'react';
import { BingoTask, TaskStatus, TaskSubmission, MASTER_TASKS } from '../types';
import {
  Lock,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Users,
  RotateCcw,
  RefreshCw,
  Presentation,
} from 'lucide-react';

interface BingoGridProps {
  selectedGroup: string;
  submissions: TaskSubmission[];
  userEmail: string;
  isVerified: boolean;
  isAdmin: boolean;
  tasks?: BingoTask[];
  onOpenTaskModal: (task: BingoTask) => void;
  onNavigateToWorkspace?: () => void;
  onOpenGroupSelector?: () => void;
  onResetGroupTasks?: (groupName: string) => Promise<void>;
  onResetSingleTask?: (submissionId: string) => Promise<void>;
}

export const BingoGrid: React.FC<BingoGridProps> = ({
  selectedGroup,
  submissions,
  userEmail,
  isVerified,
  isAdmin,
  tasks,
  onOpenTaskModal,
  onNavigateToWorkspace,
  onOpenGroupSelector,
  onResetGroupTasks,
  onResetSingleTask,
}) => {
  const [showResetGroupModal, setShowResetGroupModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Map submissions for the active group
  const groupSubmissions = submissions.filter((s) => s.groupName === selectedGroup);
  const completedCount = groupSubmissions.filter((s) => s.status === 'completed').length;
  const inProgressCount = groupSubmissions.filter((s) => s.status === 'in_progress').length;

  const getTaskStatus = (taskId: string): { status: TaskStatus; submission?: TaskSubmission } => {
    const sub = groupSubmissions.find((s) => s.taskId === taskId);
    if (sub) {
      return { status: sub.status, submission: sub };
    }
    return { status: 'open' };
  };

  const handleConfirmResetGroup = async () => {
    if (!onResetGroupTasks) return;
    setIsResetting(true);
    try {
      await onResetGroupTasks(selectedGroup);
      setShowResetGroupModal(false);
    } catch (err: any) {
      alert('Error resetting group tasks: ' + (err.message || 'Unknown error'));
    } finally {
      setIsResetting(false);
    }
  };

  // Group tasks into 4 columns (indices 0, 1, 2, 3)
  const gridTasks = tasks && tasks.length > 0 ? tasks : MASTER_TASKS;
  const columns = [
    { title: 'HOSPITALITY & SPACE', tasks: gridTasks.filter((t) => t.colIndex === 0) },
    { title: 'PACING & SILENCE', tasks: gridTasks.filter((t) => t.colIndex === 1) },
    { title: 'LANGUAGE & METAPHOR', tasks: gridTasks.filter((t) => t.colIndex === 2) },
    { title: 'ATTENTIVENESS', tasks: gridTasks.filter((t) => t.colIndex === 3) },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header matching user's reference image */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <span className="text-[12px] font-extrabold uppercase tracking-widest text-[#28532c] block mb-1">
            SEMESTER LOCKOUT TRACKER
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 tracking-tight">
            16-Task Master Bingo Grid
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Google Workspace integration • Connected to Firebase centralized forms
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#eaf4ec] text-[#28532c] border border-[#c4e1cb]">
            <span className="w-2 h-2 rounded-full bg-[#28532c]"></span>
            <span>16 Flexible Tasks • Single-Submission Lock</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{completedCount}/16 Locked</span>
            {inProgressCount > 0 && (
              <span className="text-blue-600 ml-1">({inProgressCount} in progress)</span>
            )}
          </div>

          {onNavigateToWorkspace && (
            <button
              type="button"
              onClick={onNavigateToWorkspace}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors shadow-xs"
            >
              <Presentation className="w-3.5 h-3.5 text-amber-700" />
              <span>Google Slides &amp; Forms</span>
            </button>
          )}
        </div>
      </div>

      {/* Active PLC Group & Controls Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#28532c]/10 text-[#28532c] flex items-center justify-center font-bold flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Active PLC Cohort
            </span>
            <span className="text-sm sm:text-base font-bold text-slate-900">
              {selectedGroup}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-end">
          {onOpenGroupSelector && (
            <button
              type="button"
              id="btn-switch-group"
              onClick={onOpenGroupSelector}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Switch Cohort</span>
            </button>
          )}

          {isAdmin && onResetGroupTasks && (
            <button
              type="button"
              id="btn-admin-reset-group"
              onClick={() => setShowResetGroupModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Admin: Reset Tasks for This Group</span>
            </button>
          )}
        </div>
      </div>

      {/* Permission & Group Status Alert Banner */}
      {!isVerified && !isAdmin && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <span className="font-bold">Group Access Verification Required: </span>
              Your email <span className="font-mono font-semibold">{userEmail}</span> must be verified by the administrator to access and submit this group&apos;s forms.
            </div>
          </div>
          <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-1 rounded bg-amber-200 text-amber-900">
            Pending Admin Verification
          </span>
        </div>
      )}

      {/* The 4-Column Master Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {columns.map((col, colIdx) => (
          <div key={colIdx} className="flex flex-col space-y-3.5">
            {/* Dark Forest Green Pill Header matching screenshot */}
            <div
              id={`col-header-${colIdx}`}
              className="w-full bg-[#28532c] text-white py-2.5 px-3 rounded-lg text-center font-bold text-xs uppercase tracking-wider shadow-xs"
            >
              {col.title}
            </div>

            {/* Column Tiles */}
            <div className="flex flex-col space-y-3 flex-1">
              {col.tasks.map((task) => {
                const { status, submission } = getTaskStatus(task.id);
                const isComplete = status === 'completed';
                const isInProgress = status === 'in_progress';

                return (
                  <div
                    key={task.id}
                    id={`tile-${task.id}`}
                    className={`rounded-xl border p-4 flex flex-col justify-between transition-all duration-150 relative ${
                      isComplete
                        ? 'bg-[#eaf4ec]/70 border-[#8bc398] shadow-xs'
                        : isInProgress
                        ? 'bg-blue-50/70 border-blue-200 shadow-xs'
                        : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1.5 mb-1.5">
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">
                          {task.title}
                        </h3>
                        {isComplete && (
                          <div className="w-5 h-5 rounded-full bg-[#1b7a37] text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                            <Lock className="w-3 h-3 text-white" />
                          </div>
                        )}
                        {isInProgress && (
                          <Clock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                        )}
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {task.shortSubtitle}
                      </p>
                    </div>

                    <div className="mt-3 pt-2">
                      {isComplete ? (
                        <div className="space-y-1.5">
                          <button
                            type="button"
                            id={`btn-complete-${task.id}`}
                            onClick={() => onOpenTaskModal(task)}
                            className="w-full bg-[#1b7a37] hover:bg-[#16652c] text-white py-1.5 px-3 rounded-md text-xs font-bold tracking-wide flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                          >
                            <Lock className="w-3 h-3 text-white" />
                            <span>TASK COMPLETE</span>
                          </button>

                          {isAdmin && submission && onResetSingleTask && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Reset task "${task.title}" for ${selectedGroup}?`)) {
                                  onResetSingleTask(submission.id);
                                }
                              }}
                              className="w-full text-[11px] text-rose-600 hover:text-rose-800 font-semibold py-0.5 text-center transition-colors"
                            >
                              ↺ Reset Tile
                            </button>
                          )}
                        </div>
                      ) : isInProgress ? (
                        <div className="space-y-1.5">
                          <button
                            type="button"
                            id={`btn-progress-${task.id}`}
                            onClick={() => onOpenTaskModal(task)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded-md text-xs font-bold tracking-wide flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                          >
                            <span>⏳ IN PROGRESS</span>
                          </button>

                          {isAdmin && submission && onResetSingleTask && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Reset task "${task.title}" for ${selectedGroup}?`)) {
                                  onResetSingleTask(submission.id);
                                }
                              }}
                              className="w-full text-[11px] text-rose-600 hover:text-rose-800 font-semibold py-0.5 text-center transition-colors"
                            >
                              ↺ Reset Tile
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          id={`btn-open-${task.id}`}
                          onClick={() => onOpenTaskModal(task)}
                          className="w-full border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-800 py-1.5 px-3 rounded-md text-xs font-semibold tracking-wide transition-colors"
                        >
                          OPEN TILE
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Grid Legend and Pedagogical Notes */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-slate-800">Status Key:</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-slate-400"></span>
            <span>Open Tile (Unclaimed)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <span>In Progress (Form open)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1b7a37]"></span>
            <span>Task Complete (Locked Upon Submission)</span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-500">
          <ShieldCheck className="w-4 h-4 text-[#28532c]" />
          <span>Single-submission Google Forms linked to Google Doc/Sheet</span>
        </div>
      </div>

      {/* CONFIRM MODAL: Reset Group Tasks */}
      {showResetGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <RotateCcw className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">Reset Group Tasks?</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to reset all 16 tasks for <strong>{selectedGroup}</strong>?
              This will unlock all completed tiles and remove submissions for this group from Firebase.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResetGroupModal(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-reset-group"
                disabled={isResetting}
                onClick={handleConfirmResetGroup}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50 shadow-xs"
              >
                {isResetting ? 'Resetting...' : 'Yes, Reset All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
