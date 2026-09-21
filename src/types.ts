export type PillarCategory =
  | 'Hospitality & Space'
  | 'Pacing & Silence'
  | 'Language & Metaphor'
  | 'Attentiveness';

export type TaskStatus = 'open' | 'in_progress' | 'completed';

export interface BingoTask {
  id: string;
  category: PillarCategory;
  colIndex: number;
  rowIndex: number;
  title: string;
  shortSubtitle: string;
  promptDescription: string;
  defaultFormQuestion: string;
  customFormUrl?: string;
}

export interface AuthorizedUser {
  id: string;
  email: string;
  name: string;
  groupName: string;
  role: 'admin' | 'member';
  status: 'verified' | 'pending' | 'revoked';
  addedAt: string;
  verifiedAt?: string;
}

export interface TaskSubmission {
  id: string;
  taskId: string;
  taskTitle: string;
  category: PillarCategory;
  groupName: string;
  userEmail: string;
  responseSummary: string;
  status: 'in_progress' | 'completed';
  submittedAt: string;
  formResponseId?: string;
}

export interface GroupInfo {
  id: string;
  name: string;
  description: string;
  completedTasksCount?: number;
  memberCount?: number;
}

export interface AppSettings {
  adminEmail: string;
  schoolDomain: string;
  targetDocOrSheetId: string;
  appsScriptUrl: string;
  singleSubmissionEnforced: boolean;
  activityName: string;
}

export const MASTER_TASKS: BingoTask[] = [
  // Column 0: Hospitality & Space
  {
    id: 'space-reset',
    category: 'Hospitality & Space',
    colIndex: 0,
    rowIndex: 0,
    title: 'Space Reset',
    shortSubtitle: 'Physical seating shift',
    promptDescription: 'Rearrange seating or physical space to foster face-to-face eye contact and mutual listening.',
    defaultFormQuestion: 'Describe how the physical arrangement was changed and how students responded to face-to-face interaction.',
  },
  {
    id: 'neighbor-love',
    category: 'Hospitality & Space',
    colIndex: 0,
    rowIndex: 1,
    title: 'Neighbor Love',
    shortSubtitle: 'Service-focused prompts',
    promptDescription: 'Re-frame a standard lesson prompt to ask students how the topic helps them serve others.',
    defaultFormQuestion: 'What prompt did you use and how did it connect the curriculum topic to loving and serving neighbors?',
  },
  {
    id: 'hospitality-to-views',
    category: 'Hospitality & Space',
    colIndex: 0,
    rowIndex: 2,
    title: 'Hospitality to Views',
    shortSubtitle: 'Restate opposing views',
    promptDescription: 'Design a discussion protocol that requires students to restate opposing viewpoints with grace.',
    defaultFormQuestion: 'What discussion protocol did you implement and what evidence of gracious engagement did you observe?',
  },
  {
    id: 'creation-connection',
    category: 'Hospitality & Space',
    colIndex: 0,
    rowIndex: 3,
    title: 'Creation Link',
    shortSubtitle: 'Care for creation theme',
    promptDescription: 'Highlight how a skill in your discipline helps care for or understand creation/the world.',
    defaultFormQuestion: 'Which discipline skill was connected to understanding or caring for creation, and what was a student takeaway?',
  },

  // Column 1: Pacing & Silence
  {
    id: 'wait-time',
    category: 'Pacing & Silence',
    colIndex: 1,
    rowIndex: 0,
    title: 'Wait Time',
    shortSubtitle: '60-sec silent reflection',
    promptDescription: 'Build in 60 seconds of silent reflection after asking a complex question before taking hands.',
    defaultFormQuestion: 'What question did you pose, and what did you notice about the depth of responses after 60 seconds of silence?',
  },
  {
    id: 'grace-in-grading',
    category: 'Pacing & Silence',
    colIndex: 1,
    rowIndex: 1,
    title: 'Grace in Grading',
    shortSubtitle: 'Encouragement note',
    promptDescription: 'Add one specific note of encouragement focused on effort/character to a graded assignment.',
    defaultFormQuestion: 'Share the general nature of the encouragement note you wrote and how it focused on effort or character rather than just a grade.',
  },
  {
    id: 'curiosity-over-correction',
    category: 'Pacing & Silence',
    colIndex: 1,
    rowIndex: 2,
    title: 'Curiosity Focus',
    shortSubtitle: 'Ask on wrong answer',
    promptDescription: 'Respond to an incorrect answer with an open-ended question instead of immediate correction.',
    defaultFormQuestion: 'What was the incorrect answer and what open-ended question did you ask to guide the student deeper?',
  },
  {
    id: 'restful-pacing',
    category: 'Pacing & Silence',
    colIndex: 1,
    rowIndex: 3,
    title: 'Restful Pacing',
    shortSubtitle: 'Cut non-essential activity',
    promptDescription: 'Cut one non-essential activity from a lesson to allow students to engage without rushing.',
    defaultFormQuestion: 'What activity did you choose to cut, and what impact did the restored breathing room have on the lesson?',
  },

  // Column 2: Language & Metaphor
  {
    id: 'metaphor-audit',
    category: 'Language & Metaphor',
    colIndex: 2,
    rowIndex: 0,
    title: 'Metaphor Audit',
    shortSubtitle: 'Vocabulary shift',
    promptDescription: 'Replace transactional language (e.g., "earning points") with stewardship/growth language.',
    defaultFormQuestion: 'What transactional phrase did you replace, what new language did you introduce, and how was it received?',
  },
  {
    id: 'free-space',
    category: 'Language & Metaphor',
    colIndex: 2,
    rowIndex: 1,
    title: 'FREE SPACE',
    shortSubtitle: 'Shared teaching mistake',
    promptDescription: 'Share a teaching mistake with your PLC and what it taught you about pedagogical humility.',
    defaultFormQuestion: 'What teaching mistake did you share with colleagues, and what did it illuminate about pedagogical humility?',
  },
  {
    id: 'gratitude-audit',
    category: 'Language & Metaphor',
    colIndex: 2,
    rowIndex: 2,
    title: 'Gratitude Audit',
    shortSubtitle: 'Peer thank-you ticket',
    promptDescription: 'Have students write a 1-minute exit ticket thanking a peer for a contribution to class learning.',
    defaultFormQuestion: 'How did students respond to the peer gratitude prompt, and what was the tone of the classroom as they departed?',
  },
  {
    id: 'reflection-pause',
    category: 'Language & Metaphor',
    colIndex: 2,
    rowIndex: 3,
    title: 'Reflection Pause',
    shortSubtitle: 'Character growth reflection',
    promptDescription: 'End a unit by asking students how the learning impacted who they are becoming, not just what they learned.',
    defaultFormQuestion: 'What prompt did you use to invite reflection on who they are becoming, and what was one memorable insight?',
  },

  // Column 3: Attentiveness
  {
    id: 'invisible-student',
    category: 'Attentiveness',
    colIndex: 3,
    rowIndex: 0,
    title: 'Invisible Student',
    shortSubtitle: '3 non-academic touchpoints',
    promptDescription: 'Track positive, non-academic touchpoints with a quiet or disengaged student for a week.',
    defaultFormQuestion: 'Briefly summarize the touchpoints you initiated and what you learned about this student outside of academic output.',
  },
  {
    id: 'opening-liturgy',
    category: 'Attentiveness',
    colIndex: 3,
    rowIndex: 1,
    title: 'Opening Liturgy',
    shortSubtitle: '2-min start routine',
    promptDescription: 'Create a 2-minute daily start-of-class routine centered on gratitude, breath, or shared focus.',
    defaultFormQuestion: 'Describe the 2-minute opening routine you introduced and how it influenced the class atmosphere.',
  },
  {
    id: 'attentive-listening',
    category: 'Attentiveness',
    colIndex: 3,
    rowIndex: 2,
    title: 'Attentive Listening',
    shortSubtitle: 'Summarize student response',
    promptDescription: 'Practice "listening to understand" by summarizing a student\'s answer back to them before responding.',
    defaultFormQuestion: 'Describe an instance where summarizing a student\'s answer back to them shifted the dialogue.',
  },
  {
    id: 'student-agency',
    category: 'Attentiveness',
    colIndex: 3,
    rowIndex: 3,
    title: 'Student Agency',
    shortSubtitle: 'Choice on low-stakes task',
    promptDescription: 'Give students a choice in how they demonstrate understanding on a low-stakes task.',
    defaultFormQuestion: 'What choices did you provide to students and how did this affect their ownership and engagement?',
  },
];
