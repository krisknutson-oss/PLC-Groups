import React, { useState, useEffect } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, signOut, User, GoogleAuthProvider } from 'firebase/auth';
import { db, auth, googleProvider, setCachedAccessToken } from './firebase';
import {
  BingoTask,
  AuthorizedUser,
  TaskSubmission,
  GroupInfo,
  AppSettings,
  MASTER_TASKS,
} from './types';
import { CreatedFormResult } from './services/googleWorkspaceService';
import {
  INITIAL_AUTHORIZED_USERS,
  INITIAL_GROUPS,
  INITIAL_SUBMISSIONS,
  INITIAL_SETTINGS,
} from './services/lockoutService';
import { BingoGrid } from './components/BingoGrid';
import { TaskModal } from './components/TaskModal';
import { UserManager } from './components/UserManager';
import { SubmissionsDashboard } from './components/SubmissionsDashboard';
import { WorkspaceDeployer } from './components/WorkspaceDeployer';
import { GroupSelectorModal } from './components/GroupSelectorModal';
import {
  Grid,
  Users,
  FileSpreadsheet,
  FileCode2,
  ShieldCheck,
  LogIn,
  LogOut,
  UserCheck,
  ChevronDown,
  Layers,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'grid' | 'users' | 'submissions' | 'deployer'>('grid');

  // Firestore & Application State
  const [tasks, setTasks] = useState<BingoTask[]>(MASTER_TASKS);
  const [users, setUsers] = useState<AuthorizedUser[]>(INITIAL_AUTHORIZED_USERS);
  const [groups, setGroups] = useState<GroupInfo[]>(INITIAL_GROUPS);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>(INITIAL_SUBMISSIONS);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);

  const handleUpdateTaskForms = (formResults: CreatedFormResult[]) => {
    setTasks((prevTasks) =>
      prevTasks.map((t) => {
        const match = formResults.find((f) => f.taskId === t.id);
        if (match) {
          return { ...t, customFormUrl: match.responderUri };
        }
        return t;
      })
    );
  };

  // Group selection for the Bingo Grid
  const [selectedGroup, setSelectedGroup] = useState<string>('Group 1: Humanities PLC');
  const [hasChosenGroup, setHasChosenGroup] = useState<boolean>(false);
  const [showGroupSelector, setShowGroupSelector] = useState<boolean>(true);

  // Active Task Modal
  const [activeTask, setActiveTask] = useState<BingoTask | null>(null);

  // Real Firebase Auth User
  const [authUser, setAuthUser] = useState<User | null>(null);

  // Active testing persona (allows immediate administrator testing without requiring external credentials)
  const [activePersonaEmail, setActivePersonaEmail] = useState<string>('kris.knutson@ma.org.tw');

  // Determine current active user email & role
  const currentUserEmail = authUser?.email || activePersonaEmail;
  const currentRecord = users.find(
    (u) => u.email.toLowerCase() === currentUserEmail.toLowerCase()
  );

  const isAdmin =
    currentUserEmail.toLowerCase() === settings.adminEmail.toLowerCase() ||
    currentRecord?.role === 'admin';

  const isVerified =
    isAdmin || (currentRecord?.status === 'verified' && currentRecord?.groupName === selectedGroup);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (user?.email) {
        setActivePersonaEmail(user.email);
        setShowGroupSelector(true);
        setHasChosenGroup(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen to Firestore real-time collections (with graceful fallback to initial states)
  useEffect(() => {
    // 1. Authorized Users
    const unsubUsers = onSnapshot(
      collection(db, 'authorized_users'),
      (snap) => {
        if (!snap.empty) {
          const list: AuthorizedUser[] = [];
          snap.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...(docSnap.data() as any) });
          });
          setUsers(list);
        }
      },
      (err) => {
        console.warn('Firestore authorized_users listener: using synced local cache.', err.message);
      }
    );

    // 2. PLC Groups
    const unsubGroups = onSnapshot(
      collection(db, 'groups'),
      (snap) => {
        if (!snap.empty) {
          const list: GroupInfo[] = [];
          snap.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...(docSnap.data() as any) });
          });
          setGroups(list);
        }
      },
      (err) => {
        console.warn('Firestore groups listener: using initial groups.', err.message);
      }
    );

    // 3. Submissions
    const unsubSubs = onSnapshot(
      collection(db, 'task_submissions'),
      (snap) => {
        if (!snap.empty) {
          const list: TaskSubmission[] = [];
          snap.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...(docSnap.data() as any) });
          });
          setSubmissions(list);
        }
      },
      (err) => {
        console.warn('Firestore task_submissions listener: using synced local cache.', err.message);
      }
    );

    // 4. Settings
    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'global'),
      (docSnap) => {
        if (docSnap.exists()) {
          setSettings(docSnap.data() as AppSettings);
        }
      },
      (err) => {
        console.warn('Firestore settings listener: using default settings.', err.message);
      }
    );

    return () => {
      unsubUsers();
      unsubGroups();
      unsubSubs();
      unsubSettings();
    };
  }, []);

  // Handlers for Submissions
  const handleTaskSubmit = async (
    taskId: string,
    status: 'in_progress' | 'completed',
    responseSummary: string
  ) => {
    const task = MASTER_TASKS.find((t) => t.id === taskId);
    if (!task) return;

    const submissionId = `sub-${selectedGroup.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${taskId}`;
    const newSubmission: TaskSubmission = {
      id: submissionId,
      taskId,
      taskTitle: task.title,
      category: task.category,
      groupName: selectedGroup,
      userEmail: currentUserEmail,
      responseSummary,
      status,
      submittedAt: new Date().toISOString(),
      formResponseId: `FORM-RESP-${Date.now().toString().slice(-6)}`,
    };

    // Update local state immediately
    setSubmissions((prev) => {
      const idx = prev.findIndex((s) => s.id === submissionId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newSubmission;
        return copy;
      }
      return [newSubmission, ...prev];
    });

    // Sync to Firestore
    try {
      await setDoc(doc(db, 'task_submissions', submissionId), newSubmission);
    } catch (err) {
      console.warn('Syncing to Firestore task_submissions:', err);
    }
  };

  const handleUnlockSubmission = async (submissionId: string) => {
    setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
    try {
      await deleteDoc(doc(db, 'task_submissions', submissionId));
    } catch (err) {
      console.warn('Removing from Firestore task_submissions:', err);
    }
  };

  // Group Management Handlers (Editable PLC Groups)
  const handleAddGroup = async (groupData: { name: string; description: string }) => {
    const newId = `grp-${Date.now()}`;
    const newGroup: GroupInfo = {
      id: newId,
      name: groupData.name.trim(),
      description: groupData.description.trim(),
      memberCount: 0,
      completedTasksCount: 0,
    };
    setGroups((prev) => [...prev, newGroup]);
    try {
      await setDoc(doc(db, 'groups', newId), newGroup);
    } catch (e) {
      console.warn('Error saving group to Firestore:', e);
    }
  };

  const handleUpdateGroupDetails = async (
    groupId: string,
    newName: string,
    newDescription: string
  ) => {
    const trimmedName = newName.trim();
    const existing = groups.find((g) => g.id === groupId);
    const oldName = existing?.name;

    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, name: trimmedName, description: newDescription.trim() }
          : g
      )
    );

    if (oldName && oldName !== trimmedName) {
      if (selectedGroup === oldName) {
        setSelectedGroup(trimmedName);
      }
      // cascade update to users
      setUsers((prev) =>
        prev.map((u) => (u.groupName === oldName ? { ...u, groupName: trimmedName } : u))
      );
      // cascade update to submissions
      setSubmissions((prev) =>
        prev.map((s) => (s.groupName === oldName ? { ...s, groupName: trimmedName } : s))
      );
    }

    try {
      await updateDoc(doc(db, 'groups', groupId), {
        name: trimmedName,
        description: newDescription.trim(),
      });
    } catch (e) {
      console.warn('Error updating group in Firestore:', e);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    const groupToDelete = groups.find((g) => g.id === groupId);
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    if (groupToDelete && selectedGroup === groupToDelete.name) {
      const remaining = groups.filter((g) => g.id !== groupId);
      if (remaining.length > 0) {
        setSelectedGroup(remaining[0].name);
      }
    }
    try {
      await deleteDoc(doc(db, 'groups', groupId));
    } catch (e) {
      console.warn('Error deleting group from Firestore:', e);
    }
  };

  // Administrator Task Reset Handlers
  const handleResetGroupTasks = async (groupName: string) => {
    const toDelete = submissions.filter((s) => s.groupName === groupName);
    setSubmissions((prev) => prev.filter((s) => s.groupName !== groupName));

    for (const sub of toDelete) {
      try {
        await deleteDoc(doc(db, 'task_submissions', sub.id));
      } catch (e) {
        console.warn('Error deleting submission from Firestore:', e);
      }
    }
  };

  const handleResetAllTasks = async () => {
    const allSubs = [...submissions];
    setSubmissions([]);
    for (const sub of allSubs) {
      try {
        await deleteDoc(doc(db, 'task_submissions', sub.id));
      } catch (e) {
        console.warn('Error clearing submission from Firestore:', e);
      }
    }
  };

  // Handlers for Authorized Users
  const handleAddUser = async (userData: Omit<AuthorizedUser, 'id' | 'addedAt'>) => {
    const newId = `user-${Date.now()}`;
    const fullUser: AuthorizedUser = {
      ...userData,
      id: newId,
      addedAt: new Date().toISOString(),
    };

    setUsers((prev) => [...prev, fullUser]);
    try {
      await setDoc(doc(db, 'authorized_users', newId), fullUser);
    } catch (err) {
      console.warn('Syncing user to Firestore:', err);
    }
  };

  const handleBulkAddUsers = async (
    emails: string[],
    groupName: string,
    role: 'admin' | 'member',
    status: 'verified' | 'pending'
  ) => {
    const now = new Date().toISOString();
    const newUsers: AuthorizedUser[] = emails.map((email, idx) => ({
      id: `user-${Date.now()}-${idx}`,
      email,
      name: email.split('@')[0].replace('.', ' '),
      groupName,
      role,
      status,
      addedAt: now,
      verifiedAt: status === 'verified' ? now : undefined,
    }));

    setUsers((prev) => [...prev, ...newUsers]);

    // Async sync to Firestore
    for (const u of newUsers) {
      try {
        await setDoc(doc(db, 'authorized_users', u.id), u);
      } catch (e) {
        // continue
      }
    }
  };

  const handleUpdateStatus = async (
    userId: string,
    newStatus: 'verified' | 'pending' | 'revoked'
  ) => {
    const now = new Date().toISOString();
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, status: newStatus, verifiedAt: newStatus === 'verified' ? now : u.verifiedAt }
          : u
      )
    );

    try {
      await updateDoc(doc(db, 'authorized_users', userId), {
        status: newStatus,
        verifiedAt: newStatus === 'verified' ? now : null,
      });
    } catch (e) {
      console.warn('Update user status in Firestore:', e);
    }
  };

  const handleUpdateGroup = async (userId: string, newGroup: string) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, groupName: newGroup } : u)));
    try {
      await updateDoc(doc(db, 'authorized_users', userId), { groupName: newGroup });
    } catch (e) {
      console.warn('Update user group in Firestore:', e);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    try {
      await deleteDoc(doc(db, 'authorized_users', userId));
    } catch (e) {
      console.warn('Delete user in Firestore:', e);
    }
  };

  const handleUpdateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    try {
      await setDoc(doc(db, 'settings', 'global'), updated);
    } catch (e) {
      console.warn('Update settings in Firestore:', e);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setCachedAccessToken(credential.accessToken);
      }
    } catch (err: any) {
      console.error('Google Sign In error:', err);
    }
  };

  const handleGoogleSignOut = async () => {
    await signOut(auth);
    setAuthUser(null);
  };

  // Active submission for modal
  const activeSubmission = activeTask
    ? submissions.find(
        (s) => s.taskId === activeTask.id && s.groupName === selectedGroup
      )
    : undefined;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans antialiased">
      {/* Top Application Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Brand / Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#28532c] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#28532c] block leading-none">
                  Google Workspace &amp; Firebase
                </span>
                <span className="font-serif font-bold text-slate-900 text-lg leading-tight block">
                  Semester Lockout Tracker
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                id="nav-tab-grid"
                onClick={() => setActiveTab('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'grid'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>16-Task Bingo Grid</span>
              </button>

              <button
                type="button"
                id="nav-tab-users"
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'users'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Directory &amp; PLC Groups</span>
              </button>

              <button
                type="button"
                id="nav-tab-submissions"
                onClick={() => setActiveTab('submissions')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'submissions'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Centralized Submissions ({submissions.length})</span>
              </button>

              <button
                type="button"
                id="nav-tab-deployer"
                onClick={() => setActiveTab('deployer')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'deployer'
                    ? 'bg-white text-[#28532c] shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5" />
                <span>Google Workspace (Drive, Slides &amp; Forms)</span>
              </button>
            </nav>

            {/* User Session & Persona Switcher */}
            <div className="flex items-center gap-2.5">
              {/* Persona Simulator Dropdown */}
              <div className="hidden lg:flex flex-col items-end">
                <span className="text-[10px] uppercase font-bold text-slate-400">Current Login</span>
                <select
                  value={activePersonaEmail}
                  onChange={(e) => {
                    setActivePersonaEmail(e.target.value);
                    setShowGroupSelector(true);
                  }}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-mono text-slate-800 outline-none focus:ring-1 focus:ring-[#28532c]"
                >
                  <option value="kris.knutson@ma.org.tw">👑 Kris Knutson (Master Admin)</option>
                  <option value="sarah.chen@ma.org.tw">👩‍🏫 Sarah Chen (Verified Group 1)</option>
                  <option value="elena.rostova@ma.org.tw">👩‍🔬 Elena Rostova (Verified Group 2)</option>
                  <option value="david.kim@ma.org.tw">⏳ David Kim (Pending Review)</option>
                  <option value="external.guest@other.org">🚫 Unverified School Email</option>
                </select>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-1.5">
                {isAdmin ? (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Admin</span>
                  </span>
                ) : isVerified ? (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Verified</span>
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <span>Pending</span>
                  </span>
                )}

                {/* Google Sign-in/out */}
                {authUser ? (
                  <button
                    type="button"
                    onClick={handleGoogleSignOut}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
                    title="Sign In with Google"
                  >
                    <LogIn className="w-3.5 h-3.5 text-blue-600" />
                    <span className="hidden sm:inline">Google Login</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden border-t border-slate-200 px-4 py-2 flex items-center justify-around text-xs font-medium bg-slate-50 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('grid')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
              activeTab === 'grid' ? 'bg-[#28532c] text-white font-bold' : 'text-slate-600'
            }`}
          >
            Bingo Grid
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
              activeTab === 'users' ? 'bg-[#28532c] text-white font-bold' : 'text-slate-600'
            }`}
          >
            PLC Groups
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('submissions')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
              activeTab === 'submissions' ? 'bg-[#28532c] text-white font-bold' : 'text-slate-600'
            }`}
          >
            Submissions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('deployer')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap font-bold ${
              activeTab === 'deployer' ? 'bg-[#28532c] text-white' : 'text-amber-800 bg-amber-50 border border-amber-200'
            }`}
          >
            Slides &amp; Forms
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        {/* View Routing */}
        {activeTab === 'grid' && (
          <BingoGrid
            selectedGroup={selectedGroup}
            submissions={submissions}
            userEmail={currentUserEmail}
            isVerified={isVerified}
            isAdmin={isAdmin}
            tasks={tasks}
            onOpenTaskModal={(task) => setActiveTask(task)}
            onNavigateToWorkspace={() => setActiveTab('deployer')}
            onOpenGroupSelector={() => setShowGroupSelector(true)}
            onResetGroupTasks={handleResetGroupTasks}
            onResetSingleTask={handleUnlockSubmission}
          />
        )}

        {activeTab === 'users' && (
          <UserManager
            users={users}
            groups={groups}
            submissions={submissions}
            adminEmail={settings.adminEmail}
            schoolDomain={settings.schoolDomain}
            onAddUser={handleAddUser}
            onBulkAddUsers={handleBulkAddUsers}
            onUpdateStatus={handleUpdateStatus}
            onUpdateGroup={handleUpdateGroup}
            onDeleteUser={handleDeleteUser}
            onAddGroup={handleAddGroup}
            onUpdateGroupDetails={handleUpdateGroupDetails}
            onDeleteGroup={handleDeleteGroup}
            onResetGroupTasks={handleResetGroupTasks}
          />
        )}

        {activeTab === 'submissions' && (
          <SubmissionsDashboard
            submissions={submissions}
            groups={groups}
            isAdmin={isAdmin}
            onUnlockSubmission={handleUnlockSubmission}
            onResetGroupTasks={handleResetGroupTasks}
            onResetAllTasks={handleResetAllTasks}
          />
        )}

        {activeTab === 'deployer' && (
          <WorkspaceDeployer
            settings={settings}
            submissions={submissions}
            tasks={tasks}
            onUpdateSettings={handleUpdateSettings}
            onUpdateTaskForms={handleUpdateTaskForms}
            currentUserEmail={currentUserEmail}
          />
        )}
      </main>

      {/* Group Selector Modal (Triggered on login or via Switch Cohort button) */}
      {showGroupSelector && (
        <GroupSelectorModal
          groups={groups}
          currentUserEmail={currentUserEmail}
          currentRecord={currentRecord}
          isAdmin={isAdmin}
          selectedGroup={selectedGroup}
          onSelectGroup={(newGroup) => {
            setSelectedGroup(newGroup);
            setHasChosenGroup(true);
            setShowGroupSelector(false);
          }}
          onClose={() => setShowGroupSelector(false)}
          isDismissable={hasChosenGroup}
        />
      )}

      {/* Task Interaction & Lockout Modal */}
      {activeTask && (
        <TaskModal
          task={activeTask}
          submission={activeSubmission}
          selectedGroup={selectedGroup}
          userEmail={currentUserEmail}
          isVerified={isVerified}
          isAdmin={isAdmin}
          onClose={() => setActiveTask(null)}
          onSubmitTask={handleTaskSubmit}
          onUnlockTask={handleUnlockSubmission}
        />
      )}

      {/* Subtle Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Semester Lockout Tracker • Google Workspace Container (Slides / Sheets / Docs) &amp; Firebase</span>
          <span className="font-medium text-slate-600">
            Administrator: {settings.adminEmail} • School Domain: @{settings.schoolDomain}
          </span>
        </div>
      </footer>
    </div>
  );
}
