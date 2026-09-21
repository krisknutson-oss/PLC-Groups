import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AuthorizedUser, TaskSubmission, AppSettings, GroupInfo, MASTER_TASKS } from '../types';

const USERS_COLLECTION = 'authorized_users';
const SUBMISSIONS_COLLECTION = 'task_submissions';
const GROUPS_COLLECTION = 'groups';
const SETTINGS_COLLECTION = 'settings';

export const INITIAL_AUTHORIZED_USERS: AuthorizedUser[] = [
  {
    id: 'admin-kris',
    email: 'kris.knutson@ma.org.tw',
    name: 'Kris Knutson (Administrator)',
    groupName: 'Administration & PLC Leads',
    role: 'admin',
    status: 'verified',
    addedAt: '2026-09-15T08:00:00.000Z',
    verifiedAt: '2026-09-15T08:00:00.000Z',
  },
  {
    id: 'user-sarah',
    email: 'sarah.chen@ma.org.tw',
    name: 'Sarah Chen',
    groupName: 'Group 1: Humanities PLC',
    role: 'member',
    status: 'verified',
    addedAt: '2026-09-16T09:30:00.000Z',
    verifiedAt: '2026-09-16T10:00:00.000Z',
  },
  {
    id: 'user-marcus',
    email: 'marcus.vance@ma.org.tw',
    name: 'Marcus Vance',
    groupName: 'Group 1: Humanities PLC',
    role: 'member',
    status: 'verified',
    addedAt: '2026-09-16T10:15:00.000Z',
    verifiedAt: '2026-09-16T11:00:00.000Z',
  },
  {
    id: 'user-elena',
    email: 'elena.rostova@ma.org.tw',
    name: 'Elena Rostova',
    groupName: 'Group 2: STEM Cohort',
    role: 'member',
    status: 'verified',
    addedAt: '2026-09-17T08:45:00.000Z',
    verifiedAt: '2026-09-17T09:00:00.000Z',
  },
  {
    id: 'user-david',
    email: 'david.kim@ma.org.tw',
    name: 'David Kim',
    groupName: 'Group 2: STEM Cohort',
    role: 'member',
    status: 'pending',
    addedAt: '2026-09-17T14:20:00.000Z',
  },
  {
    id: 'user-rebecca',
    email: 'rebecca.taylor@ma.org.tw',
    name: 'Rebecca Taylor',
    groupName: 'Group 3: Middle School Team',
    role: 'member',
    status: 'verified',
    addedAt: '2026-09-17T15:00:00.000Z',
    verifiedAt: '2026-09-17T15:10:00.000Z',
  },
];

export const INITIAL_GROUPS: GroupInfo[] = [
  { id: 'group-1', name: 'Group 1: Humanities PLC', description: 'English, History, and Social Sciences educators' },
  { id: 'group-2', name: 'Group 2: STEM Cohort', description: 'Mathematics, Science, and Technology faculty' },
  { id: 'group-3', name: 'Group 3: Middle School Team', description: 'Grades 6-8 interdisciplinary team' },
  { id: 'group-4', name: 'Group 4: Biblical Studies & Arts', description: 'Theology, Visual Arts, and Music department' },
];

export const INITIAL_SUBMISSIONS: TaskSubmission[] = [
  {
    id: 'sub-space-reset',
    taskId: 'space-reset',
    taskTitle: 'Space Reset',
    category: 'Hospitality & Space',
    groupName: 'Group 1: Humanities PLC',
    userEmail: 'sarah.chen@ma.org.tw',
    responseSummary: 'Moved desks from traditional rows into paired collaborative pods facing inward. Students engaged in 30% more active eye contact during the discussion.',
    status: 'completed',
    submittedAt: '2026-09-17T11:20:00.000Z',
    formResponseId: 'FORM-RESP-001',
  },
  {
    id: 'sub-metaphor-audit',
    taskId: 'metaphor-audit',
    taskTitle: 'Metaphor Audit',
    category: 'Language & Metaphor',
    groupName: 'Group 1: Humanities PLC',
    userEmail: 'marcus.vance@ma.org.tw',
    responseSummary: 'Replaced "earning credit points" with "stewardship of your intellect." Students immediately noticed the vocabulary shift in our rubric discussion.',
    status: 'completed',
    submittedAt: '2026-09-17T13:40:00.000Z',
    formResponseId: 'FORM-RESP-002',
  },
  {
    id: 'sub-free-space',
    taskId: 'free-space',
    taskTitle: 'FREE SPACE',
    category: 'Language & Metaphor',
    groupName: 'Group 1: Humanities PLC',
    userEmail: 'sarah.chen@ma.org.tw',
    responseSummary: 'Shared a moment where a lecture rushed through discussion without room for questions, admitting the error to our department meeting.',
    status: 'completed',
    submittedAt: '2026-09-17T16:00:00.000Z',
    formResponseId: 'FORM-RESP-003',
  },
  {
    id: 'sub-grace-grading',
    taskId: 'grace-in-grading',
    taskTitle: 'Grace in Grading',
    category: 'Pacing & Silence',
    groupName: 'Group 1: Humanities PLC',
    userEmail: 'marcus.vance@ma.org.tw',
    responseSummary: 'Drafted personalized marginalia emphasizing perseverance on the essay drafting stage; finalizing return to students.',
    status: 'in_progress',
    submittedAt: '2026-09-17T18:30:00.000Z',
    formResponseId: 'FORM-RESP-004',
  },
];

export const INITIAL_SETTINGS: AppSettings = {
  adminEmail: 'kris.knutson@ma.org.tw',
  schoolDomain: 'ma.org.tw',
  targetDocOrSheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbz_lockout_tracker_prod/exec',
  singleSubmissionEnforced: true,
  activityName: 'Pedagogical Formation Semester Lockout',
};
