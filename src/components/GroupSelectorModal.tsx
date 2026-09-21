import React, { useState } from 'react';
import { GroupInfo, AuthorizedUser } from '../types';
import { Users, CheckCircle, ArrowRight, Shield, ShieldCheck, X } from 'lucide-react';

interface GroupSelectorModalProps {
  groups: GroupInfo[];
  currentUserEmail: string;
  currentRecord?: AuthorizedUser;
  isAdmin: boolean;
  selectedGroup: string;
  onSelectGroup: (groupName: string) => void;
  onClose?: () => void;
  isDismissable?: boolean;
}

export const GroupSelectorModal: React.FC<GroupSelectorModalProps> = ({
  groups,
  currentUserEmail,
  currentRecord,
  isAdmin,
  selectedGroup,
  onSelectGroup,
  onClose,
  isDismissable = false,
}) => {
  const [chosenGroup, setChosenGroup] = useState<string>(
    selectedGroup || currentRecord?.groupName || groups[0]?.name || ''
  );

  const handleConfirm = () => {
    if (!chosenGroup) return;
    onSelectGroup(chosenGroup);
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="group-selector-modal"
        className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/70 rounded-t-2xl flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#28532c]"></span>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#28532c]">
                COHORT LOGIN &amp; VERIFICATION
              </span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-slate-900">
              Choose Your PLC Group
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Select your Professional Learning Community group to load your cohort&apos;s 16-Task Bingo Grid.
            </p>
          </div>

          {isDismissable && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* User Session Info Card */}
        <div className="p-6 space-y-5">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#28532c]/10 text-[#28532c] flex items-center justify-center font-bold text-xs flex-shrink-0">
                {currentUserEmail.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                  Logged in as
                </span>
                <span className="font-mono font-bold text-slate-800 truncate block">
                  {currentUserEmail}
                </span>
              </div>
            </div>

            {isAdmin ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 flex-shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin</span>
              </span>
            ) : currentRecord?.status === 'verified' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
                <span>Verified</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0">
                <span>Pending Approval</span>
              </span>
            )}
          </div>

          {/* Assigned Group Hint (if found in directory) */}
          {currentRecord?.groupName && (
            <div className="text-xs bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-emerald-900 flex items-center justify-between">
              <div>
                <span className="font-bold">Assigned by School Administrator: </span>
                <span>{currentRecord.groupName}</span>
              </div>
              {chosenGroup !== currentRecord.groupName && (
                <button
                  type="button"
                  onClick={() => setChosenGroup(currentRecord.groupName)}
                  className="text-[11px] font-bold underline hover:text-emerald-950 ml-2"
                >
                  Select Assigned
                </button>
              )}
            </div>
          )}

          {/* Group Options Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Available PLC Groups ({groups.length}):
            </label>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {groups.map((group) => {
                const isSelected = chosenGroup === group.name;
                const isUserAssigned = currentRecord?.groupName === group.name;

                return (
                  <div
                    key={group.id}
                    id={`group-choice-${group.id}`}
                    onClick={() => setChosenGroup(group.name)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-[#28532c] bg-[#eaf4ec]/60 ring-2 ring-[#28532c]'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 truncate">
                          {group.name}
                        </span>
                        {isUserAssigned && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Your Group
                          </span>
                        )}
                      </div>
                      {group.description && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {group.description}
                        </p>
                      )}
                    </div>

                    <div className="flex-shrink-0">
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-[#28532c] text-white flex items-center justify-center shadow-xs">
                          <CheckCircle className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border border-slate-300"></div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-200 bg-slate-50/50 rounded-b-2xl flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            Selected: <strong className="text-slate-800">{chosenGroup || 'None'}</strong>
          </span>

          <div className="flex items-center gap-2">
            {isDismissable && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              id="btn-confirm-group-selection"
              disabled={!chosenGroup}
              onClick={handleConfirm}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#28532c] hover:bg-[#1f4022] rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <span>Continue to Bingo Grid</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
