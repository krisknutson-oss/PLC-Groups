import React, { useState } from 'react';
import { BingoTask, TaskSubmission } from '../types';
import { X, Lock, ExternalLink, Send, ShieldAlert, CheckCircle2, RotateCcw, Info } from 'lucide-react';

interface TaskModalProps {
  task: BingoTask | null;
  submission?: TaskSubmission;
  selectedGroup: string;
  userEmail: string;
  isVerified: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onSubmitTask: (
    taskId: string,
    status: 'in_progress' | 'completed',
    responseSummary: string
  ) => Promise<void>;
  onUnlockTask?: (submissionId: string) => Promise<void>;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  task,
  submission,
  selectedGroup,
  userEmail,
  isVerified,
  isAdmin,
  onClose,
  onSubmitTask,
  onUnlockTask,
}) => {
  if (!task) return null;

  const isCompleted = submission?.status === 'completed';
  const isInProgress = submission?.status === 'in_progress';
  const [reflectionText, setReflectionText] = useState(submission?.responseSummary || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);

  // Simulated Google Form single-submission URL
  const formUrl = task.customFormUrl || `https://docs.google.com/forms/d/e/1FAIpQLSc_FORM_${task.id}/viewform?entry.email=${encodeURIComponent(userEmail)}&entry.group=${encodeURIComponent(selectedGroup)}`;

  const handleSubmit = async (targetStatus: 'in_progress' | 'completed') => {
    if (!reflectionText.trim()) {
      alert('Please enter a brief reflection or evidence note before proceeding.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmitTask(task.id, targetStatus, reflectionText.trim());
      onClose();
    } catch (err: any) {
      alert('Submission error: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlock = async () => {
    if (!submission || !onUnlockTask) return;
    setIsSubmitting(true);
    try {
      await onUnlockTask(submission.id);
      setShowUnlockConfirm(false);
      onClose();
    } catch (err: any) {
      alert('Unlock error: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div
        id="task-modal-container"
        className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-200 bg-slate-50/70 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#eaf4ec] text-[#28532c] border border-[#c4e1cb]">
                {task.category}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Group: <strong className="text-slate-800">{selectedGroup}</strong>
              </span>
            </div>
            <h2 className="text-xl font-serif font-bold text-slate-900">{task.title}</h2>
            <p className="text-xs text-slate-500">{task.shortSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5">
          {/* Pedagogical Prompt Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#28532c]" />
              Pedagogical Instruction
            </h4>
            <p className="text-sm text-slate-800 leading-relaxed">{task.promptDescription}</p>
          </div>

          {/* Locked State Notification */}
          {isCompleted && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-emerald-900 flex items-start gap-3">
              <Lock className="w-5 h-5 text-emerald-700 mt-0.5 flex-shrink-0" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-sm text-emerald-950">
                  🔒 Locked Upon Completion (Single-Submission Enforced)
                </p>
                <p>
                  This task was completed for <strong>{selectedGroup}</strong> by{' '}
                  <span className="font-mono">{submission?.userEmail}</span> on{' '}
                  {new Date(submission?.submittedAt || '').toLocaleString()}.
                </p>
                <p className="text-emerald-800 font-medium mt-1">
                  Responses are downloaded directly into the central Google Doc / Spreadsheet.
                </p>
              </div>
            </div>
          )}

          {/* In Progress State Notification */}
          {isInProgress && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-blue-900 flex items-start gap-2.5 text-xs">
              <span className="text-blue-600 font-bold text-sm">⏳</span>
              <div>
                <p className="font-semibold text-blue-950">Task In Progress</p>
                <p className="text-blue-800">
                  A member of your group has started this task. Complete the Google Form or submit the reflection below to lock it upon completion.
                </p>
              </div>
            </div>
          )}

          {/* Unauthorized Warning */}
          {!isVerified && !isAdmin && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 flex items-start gap-3 text-xs">
              <ShieldAlert className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-sm text-amber-950">Access Restricted to Verified School Accounts</p>
                <p>
                  Only school emails verified by the administrator (<span className="font-mono">kris.knutson@ma.org.tw</span>) can submit or lock tiles for this group.
                </p>
              </div>
            </div>
          )}

          {/* Google Form Link Action */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Single-Submission Google Form
                </h4>
                <p className="text-xs text-slate-500">
                  Direct Google Form linked to central Google Doc / Sheet
                </p>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                1 response limit
              </span>
            </div>

            <a
              href={formUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-between w-full p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
            >
              <span className="truncate pr-2">{task.title} - Single Submission Google Form</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            </a>
          </div>

          {/* Reflection / Evidence Record */}
          <div className="space-y-2">
            <label
              htmlFor="reflection-input"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              Form Question & Reflection Notes:
            </label>
            <p className="text-xs text-slate-600 italic">{task.defaultFormQuestion}</p>
            <textarea
              id="reflection-input"
              rows={4}
              disabled={isCompleted && !isAdmin}
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value)}
              placeholder="Enter summary of classroom practice, pedagogical adjustment, or student response here..."
              className="w-full text-xs sm:text-sm p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#28532c] focus:border-[#28532c] outline-none disabled:bg-slate-100 disabled:text-slate-600"
            />
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-5 border-t border-slate-200 bg-slate-50/50 rounded-b-2xl flex flex-wrap items-center justify-between gap-3">
          <div>
            {isAdmin && submission && (
              <>
                {!showUnlockConfirm ? (
                  <button
                    type="button"
                    id="btn-admin-reset-task"
                    onClick={() => setShowUnlockConfirm(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-rose-700 hover:text-rose-800 font-semibold px-2.5 py-1 rounded hover:bg-rose-50 border border-rose-200 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Admin: Reset / Unlock Task</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-rose-700 font-bold">Reset task submission?</span>
                    <button
                      type="button"
                      id="btn-confirm-admin-reset"
                      onClick={handleUnlock}
                      disabled={isSubmitting}
                      className="text-xs bg-rose-600 text-white px-2.5 py-1 rounded hover:bg-rose-700 font-bold"
                    >
                      Yes, Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowUnlockConfirm(false)}
                      className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              Close
            </button>

            {(!isCompleted || isAdmin) && (
              <>
                {!isCompleted && (
                  <button
                    type="button"
                    id="btn-mark-in-progress"
                    disabled={isSubmitting || (!isVerified && !isAdmin)}
                    onClick={() => handleSubmit('in_progress')}
                    className="px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Mark In Progress
                  </button>
                )}

                <button
                  type="button"
                  id="btn-submit-lock"
                  disabled={isSubmitting || (!isVerified && !isAdmin)}
                  onClick={() => handleSubmit('completed')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#1b7a37] hover:bg-[#16652c] rounded-lg shadow-xs transition-colors disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isCompleted ? 'Save Changes' : 'Submit & Lock Tile'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
