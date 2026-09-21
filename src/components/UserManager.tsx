import React, { useState } from 'react';
import { AuthorizedUser, GroupInfo, TaskSubmission } from '../types';
import {
  UserCheck,
  UserPlus,
  Shield,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Upload,
  Download,
  Mail,
  Users,
  Layers,
  Edit2,
  RotateCcw,
  Plus,
  AlertTriangle,
  FolderPlus,
} from 'lucide-react';

interface UserManagerProps {
  users: AuthorizedUser[];
  groups: GroupInfo[];
  submissions: TaskSubmission[];
  adminEmail: string;
  schoolDomain: string;
  onAddUser: (user: Omit<AuthorizedUser, 'id' | 'addedAt'>) => Promise<void>;
  onBulkAddUsers: (
    emails: string[],
    groupName: string,
    role: 'admin' | 'member',
    status: 'verified' | 'pending'
  ) => Promise<void>;
  onUpdateStatus: (userId: string, newStatus: 'verified' | 'pending' | 'revoked') => Promise<void>;
  onUpdateGroup: (userId: string, newGroup: string) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onAddGroup: (groupData: { name: string; description: string }) => Promise<void>;
  onUpdateGroupDetails: (groupId: string, newName: string, newDescription: string) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
  onResetGroupTasks: (groupName: string) => Promise<void>;
}

export const UserManager: React.FC<UserManagerProps> = ({
  users,
  groups,
  submissions,
  adminEmail,
  schoolDomain,
  onAddUser,
  onBulkAddUsers,
  onUpdateStatus,
  onUpdateGroup,
  onDeleteUser,
  onAddGroup,
  onUpdateGroupDetails,
  onDeleteGroup,
  onResetGroupTasks,
}) => {
  // Navigation between Users and Groups
  const [subTab, setSubTab] = useState<'users' | 'groups'>('users');

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'verified' | 'pending' | 'revoked'>('ALL');

  // Add User State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState(groups[0]?.name || 'Group 1: Humanities PLC');
  const [newRole, setNewRole] = useState<'admin' | 'member'>('member');
  const [newStatus, setNewStatus] = useState<'verified' | 'pending'>('verified');

  // Bulk Import State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkGroup, setBulkGroup] = useState(groups[0]?.name || 'Group 1: Humanities PLC');

  // Group Management State
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');

  const [editingGroup, setEditingGroup] = useState<GroupInfo | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');

  const [groupToDelete, setGroupToDelete] = useState<GroupInfo | null>(null);
  const [groupToReset, setGroupToReset] = useState<GroupInfo | null>(null);

  const [loading, setLoading] = useState(false);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = selectedGroupFilter === 'ALL' || u.groupName === selectedGroupFilter;
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
    return matchesSearch && matchesGroup && matchesStatus;
  });

  const verifiedCount = users.filter((u) => u.status === 'verified').length;
  const pendingCount = users.filter((u) => u.status === 'pending').length;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    if (schoolDomain && !newEmail.toLowerCase().endsWith(`@${schoolDomain.toLowerCase()}`)) {
      const confirmDomain = window.confirm(
        `Note: "${newEmail}" does not end with your school domain (@${schoolDomain}). Add anyway?`
      );
      if (!confirmDomain) return;
    }

    setLoading(true);
    try {
      await onAddUser({
        email: newEmail.trim().toLowerCase(),
        name: newName.trim() || newEmail.split('@')[0],
        groupName: newGroup,
        role: newRole,
        status: newStatus,
        verifiedAt: newStatus === 'verified' ? new Date().toISOString() : undefined,
      });
      setNewEmail('');
      setNewName('');
      setShowAddModal(false);
    } catch (err: any) {
      alert('Error adding user: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawEmails = bulkText
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e && e.includes('@'));

    if (rawEmails.length === 0) {
      alert('Please enter at least one valid school email address.');
      return;
    }

    setLoading(true);
    try {
      await onBulkAddUsers(rawEmails, bulkGroup, 'member', 'verified');
      setBulkText('');
      setShowBulkModal(false);
    } catch (err: any) {
      alert('Error bulk adding users: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setLoading(true);
    try {
      await onAddGroup({
        name: newGroupName.trim(),
        description: newGroupDescription.trim(),
      });
      setNewGroupName('');
      setNewGroupDescription('');
      setShowAddGroupModal(false);
    } catch (err: any) {
      alert('Error creating PLC Group: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup || !editGroupName.trim()) return;

    setLoading(true);
    try {
      await onUpdateGroupDetails(
        editingGroup.id,
        editGroupName.trim(),
        editGroupDescription.trim()
      );
      setEditingGroup(null);
    } catch (err: any) {
      alert('Error updating group: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroupConfirm = async () => {
    if (!groupToDelete) return;
    setLoading(true);
    try {
      await onDeleteGroup(groupToDelete.id);
      setGroupToDelete(null);
    } catch (err: any) {
      alert('Error deleting group: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetGroupConfirm = async () => {
    if (!groupToReset) return;
    setLoading(true);
    try {
      await onResetGroupTasks(groupToReset.name);
      setGroupToReset(null);
      alert(`All tasks reset and unlocked for ${groupToReset.name}.`);
    } catch (err: any) {
      alert('Error resetting group tasks: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Email', 'Name', 'Group / PLC', 'Role', 'Status', 'Added At', 'Verified At'];
    const rows = filteredUsers.map((u) => [
      u.email,
      `"${u.name}"`,
      `"${u.groupName}"`,
      u.role,
      u.status,
      u.addedAt,
      u.verifiedAt || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `lockout_authorized_users_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-[#28532c]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#28532c]">
              ADMINISTRATOR MANAGEMENT HUB
            </span>
          </div>
          <h2 className="text-2xl font-serif font-bold text-slate-900">
            {subTab === 'users'
              ? 'Authorized Users & School Email Whitelist'
              : 'PLC Cohorts & Editable Groups'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {subTab === 'users'
              ? 'Manage who can log into each group’s 16-task lockout form and centralize permissions in Firebase.'
              : 'Add, rename, customize, or reset PLC groups participating in the 16-task lockout.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {subTab === 'users' ? (
            <>
              <button
                type="button"
                onClick={() => setShowBulkModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Bulk Import Emails</span>
              </button>

              <button
                type="button"
                id="btn-add-school-user"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#28532c] hover:bg-[#1e3f22] rounded-lg transition-colors shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add School User</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              id="btn-add-plc-group"
              onClick={() => setShowAddGroupModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#28532c] hover:bg-[#1e3f22] rounded-lg transition-colors shadow-xs"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ Create New PLC Group</span>
            </button>
          )}
        </div>
      </div>

      {/* Internal Sub-navigation: Users vs Groups */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setSubTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all ${
            subTab === 'users'
              ? 'border-[#28532c] text-[#28532c]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>School Users &amp; Permissions ({users.length})</span>
        </button>

        <button
          type="button"
          id="tab-plc-groups"
          onClick={() => setSubTab('groups')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all ${
            subTab === 'groups'
              ? 'border-[#28532c] text-[#28532c]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Editable PLC Groups ({groups.length})</span>
        </button>
      </div>

      {/* TAB 1: USERS & PERMISSIONS */}
      {subTab === 'users' && (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Total Whitelisted
              </span>
              <div className="text-2xl font-bold text-slate-900">{users.length}</div>
              <span className="text-[11px] text-slate-500">School accounts</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block mb-1">
                Verified &amp; Active
              </span>
              <div className="text-2xl font-bold text-emerald-700">{verifiedCount}</div>
              <span className="text-[11px] text-emerald-600">Access approved</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 block mb-1">
                Pending Review
              </span>
              <div className="text-2xl font-bold text-amber-700">{pendingCount}</div>
              <span className="text-[11px] text-amber-600">Awaiting admin check</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block mb-1">
                Target School Domain
              </span>
              <div className="text-base font-bold text-blue-950 truncate mt-1">
                @{schoolDomain || 'ma.org.tw'}
              </div>
              <span className="text-[11px] text-blue-600 font-medium">Domain restriction</span>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex flex-1 items-center gap-2.5 w-full md:w-auto">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by school email or name..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#28532c] focus:border-[#28532c]"
                />
              </div>

              <select
                value={selectedGroupFilter}
                onChange={(e) => setSelectedGroupFilter(e.target.value)}
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
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs sm:text-sm py-1.5 px-3 border border-slate-300 rounded-lg outline-none bg-white text-slate-700 focus:ring-2 focus:ring-[#28532c]"
              >
                <option value="ALL">All Statuses</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="revoked">Revoked</option>
              </select>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">User &amp; School Email</th>
                    <th className="py-3 px-4">Group / PLC</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Verification Status</th>
                    <th className="py-3 px-4 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">
                        No authorized school users found matching the filter.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const isPrimaryAdmin =
                        user.email.toLowerCase() === adminEmail.toLowerCase();

                      return (
                        <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{user.name}</div>
                            <div className="font-mono text-slate-500 text-[11px]">{user.email}</div>
                          </td>

                          <td className="py-3 px-4">
                            <select
                              disabled={isPrimaryAdmin}
                              value={user.groupName}
                              onChange={(e) => onUpdateGroup(user.id, e.target.value)}
                              className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-[#28532c] disabled:opacity-60"
                            >
                              {groups.map((g) => (
                                <option key={g.id} value={g.name}>
                                  {g.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="py-3 px-4">
                            {user.role === 'admin' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                <Shield className="w-3 h-3" />
                                <span>Admin</span>
                              </span>
                            ) : (
                              <span className="text-slate-600 font-medium">Member</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {user.status === 'verified' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Verified</span>
                              </span>
                            )}
                            {user.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Pending Approval</span>
                              </span>
                            )}
                            {user.status === 'revoked' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                <span>Revoked</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            {!isPrimaryAdmin ? (
                              <div className="inline-flex items-center gap-1.5 justify-end">
                                {user.status !== 'verified' && (
                                  <button
                                    type="button"
                                    onClick={() => onUpdateStatus(user.id, 'verified')}
                                    className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
                                  >
                                    Approve
                                  </button>
                                )}

                                {user.status === 'verified' && (
                                  <button
                                    type="button"
                                    onClick={() => onUpdateStatus(user.id, 'revoked')}
                                    className="px-2 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 transition-colors"
                                  >
                                    Revoke
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Remove ${user.email} from authorization list?`)) {
                                      onDeleteUser(user.id);
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Master Owner</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EDITABLE PLC GROUPS */}
      {subTab === 'groups' && (
        <div className="space-y-6">
          {/* Informational Guidance */}
          <div className="bg-[#eaf4ec] border border-[#c4e1cb] rounded-xl p-4 text-xs text-[#28532c] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Editable PLC Groups:</strong> All groups below are fully editable. When users log in, they select one of these groups to view their cohort&apos;s 16-task progress. You can also reset tasks for any specific group.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddGroupModal(true)}
              className="px-3 py-1.5 bg-[#28532c] text-white rounded-lg font-bold text-xs hover:bg-[#1e3f22] flex-shrink-0 ml-3"
            >
              + Add Group
            </button>
          </div>

          {/* Groups Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((group) => {
              const assignedMembers = users.filter((u) => u.groupName === group.name);
              const completedTasks = submissions.filter(
                (s) => s.groupName === group.name && s.status === 'completed'
              );

              return (
                <div
                  key={group.id}
                  id={`group-card-${group.id}`}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 leading-snug">
                          {group.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {group.description || 'No description provided.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGroup(group);
                            setEditGroupName(group.name);
                            setEditGroupDescription(group.description || '');
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Group Details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setGroupToDelete(group)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Group"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Stats Pill Badges */}
                    <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
                        <Users className="w-3 h-3 text-slate-500" />
                        <span>{assignedMembers.length} Members</span>
                      </span>

                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-medium border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{completedTasks.length} / 16 Tasks Locked</span>
                      </span>
                    </div>
                  </div>

                  {/* Group Action Buttons */}
                  <div className="pt-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setGroupToReset(group)}
                      className="inline-flex items-center gap-1 text-xs text-rose-700 hover:text-rose-800 font-semibold px-2.5 py-1 rounded hover:bg-rose-50 border border-rose-200 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Group Tasks</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGroupFilter(group.name);
                        setSubTab('users');
                      }}
                      className="text-xs text-slate-600 hover:text-slate-900 font-semibold underline"
                    >
                      View Members →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: Add User */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Authorize New School Member</h3>
            <p className="text-xs text-slate-500">
              Add a teacher or PLC member to the verified whitelist so they can log into their group&apos;s forms.
            </p>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">School Email</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={`educator@${schoolDomain || 'ma.org.tw'}`}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none font-mono focus:ring-2 focus:ring-[#28532c]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Sarah Chen"
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#28532c]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned PLC Group</label>
                <select
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-[#28532c]"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.name}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-[#28532c]"
                  >
                    <option value="member">PLC Member</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-[#28532c]"
                  >
                    <option value="verified">Verified (Active)</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#28532c] hover:bg-[#1e3f22] rounded-lg disabled:opacity-50 shadow-xs"
                >
                  {loading ? 'Adding...' : 'Save & Authorize'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Bulk Import */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Bulk Import School Emails</h3>
            <p className="text-xs text-slate-500">
              Paste school emails (separated by commas or newlines). They will automatically be authorized and assigned to the selected group.
            </p>

            <form onSubmit={handleBulkSubmit} className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assign to Group / PLC</label>
                <select
                  value={bulkGroup}
                  onChange={(e) => setBulkGroup(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-[#28532c]"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.name}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">School Emails</label>
                <textarea
                  rows={5}
                  required
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`teacher1@${schoolDomain || 'ma.org.tw'}\nteacher2@${schoolDomain || 'ma.org.tw'}\nteacher3@${schoolDomain || 'ma.org.tw'}`}
                  className="w-full p-2.5 font-mono text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#28532c]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#28532c] hover:bg-[#1e3f22] rounded-lg disabled:opacity-50 shadow-xs"
                >
                  {loading ? 'Importing...' : 'Authorize All Emails'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create New PLC Group */}
      {showAddGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Create New PLC Cohort</h3>
            <p className="text-xs text-slate-500">
              Create a new PLC group. Teachers can select this group upon logging in.
            </p>

            <form onSubmit={handleCreateGroup} className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Group Name</label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Group 5: World Languages PLC"
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#28532c]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="e.g. Spanish, French, and Mandarin language educators"
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#28532c]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddGroupModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#28532c] hover:bg-[#1e3f22] rounded-lg disabled:opacity-50 shadow-xs"
                >
                  {loading ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit PLC Group */}
      {editingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Edit PLC Group</h3>
            <p className="text-xs text-slate-500">
              Update the name or description of this PLC cohort.
            </p>

            <form onSubmit={handleEditGroupSubmit} className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Group Name</label>
                <input
                  type="text"
                  required
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#28532c]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editGroupDescription}
                  onChange={(e) => setEditGroupDescription(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#28532c]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingGroup(null)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#28532c] hover:bg-[#1e3f22] rounded-lg disabled:opacity-50 shadow-xs"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL: Delete Group */}
      {groupToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">Delete PLC Group?</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete <strong>{groupToDelete.name}</strong>?
            </p>
            {users.filter((u) => u.groupName === groupToDelete.name).length > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                ⚠️ There are members currently assigned to this group. You may want to reassign them first.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setGroupToDelete(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleDeleteGroupConfirm}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50 shadow-xs"
              >
                {loading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL: Reset Group Tasks */}
      {groupToReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
              <RotateCcw className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">Reset Group Tasks?</h3>
            </div>
            <p className="text-xs text-slate-600">
              This will clear and unlock all completed tasks for{' '}
              <strong>{groupToReset.name}</strong> so the cohort can re-attempt them.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setGroupToReset(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleResetGroupConfirm}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50 shadow-xs"
              >
                {loading ? 'Resetting...' : 'Yes, Reset All Tasks'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
