import React, { useState } from 'react';
import { generateCodeGs, generateIndexHtml } from '../workspaceAppsScript';
import { AppSettings, BingoTask, TaskSubmission, MASTER_TASKS } from '../types';
import {
  createAll16GoogleForms,
  createCentralizedGoogleSheet,
  syncSubmissionsToGoogleSheet,
  createLockoutGoogleSlidesDeck,
  CreatedFormResult,
  CreatedPresentationResult,
} from '../services/googleWorkspaceService';
import { getCachedAccessToken, setCachedAccessToken, auth, googleProvider } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import {
  Code,
  Copy,
  Check,
  FileSpreadsheet,
  ExternalLink,
  Layers,
  Sparkles,
  PlayCircle,
  Database,
  ArrowRight,
  ShieldCheck,
  Presentation,
  CheckCircle2,
  RotateCcw,
  HelpCircle,
  Zap,
  FolderOpen,
  FileText,
  AlertCircle,
  Loader2,
  Lock,
  RefreshCw,
} from 'lucide-react';

interface WorkspaceDeployerProps {
  settings: AppSettings;
  submissions: TaskSubmission[];
  tasks: BingoTask[];
  onUpdateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  onUpdateTaskForms?: (forms: CreatedFormResult[]) => void;
  currentUserEmail: string;
}

export const WorkspaceDeployer: React.FC<WorkspaceDeployerProps> = ({
  settings,
  submissions,
  tasks,
  onUpdateSettings,
  onUpdateTaskForms,
  currentUserEmail,
}) => {
  const [activeTab, setActiveTab] = useState<
    'automated-drive' | 'guide' | 'code-gs' | 'index-html'
  >('automated-drive');

  const [copiedCodeGs, setCopiedCodeGs] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);

  // Editable settings
  const [adminEmailInput, setAdminEmailInput] = useState(settings.adminEmail);
  const [schoolDomainInput, setSchoolDomainInput] = useState(settings.schoolDomain);
  const [docIdInput, setDocIdInput] = useState(settings.targetDocOrSheetId);
  const [isSaving, setIsSaving] = useState(false);

  // Workspace API Token & Execution State
  const [accessToken, setAccessToken] = useState<string | null>(getCachedAccessToken());
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Automated Forms Creation State
  const [isCreatingForms, setIsCreatingForms] = useState(false);
  const [formsProgress, setFormsProgress] = useState<{ completed: number; total: number; current: string }>({
    completed: 0,
    total: 16,
    current: '',
  });
  const [createdForms, setCreatedForms] = useState<CreatedFormResult[]>([]);
  const [formsError, setFormsError] = useState<string | null>(null);

  // Automated Sheet Creation State
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [createdSheetUrl, setCreatedSheetUrl] = useState<string | null>(
    settings.targetDocOrSheetId ? `https://docs.google.com/spreadsheets/d/${settings.targetDocOrSheetId}/edit` : null
  );
  const [sheetError, setSheetError] = useState<string | null>(null);

  // Sync Submissions State
  const [isSyncingSubmissions, setIsSyncingSubmissions] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Automated Google Slides Presentation State
  const [isCreatingSlides, setIsCreatingSlides] = useState(false);
  const [slidesProgress, setSlidesProgress] = useState<string>('');
  const [createdSlidesResult, setCreatedSlidesResult] = useState<CreatedPresentationResult | null>(null);
  const [slidesError, setSlidesError] = useState<string | null>(null);

  // Confirmation Modals (MANDATORY per Workspace Integration Guidelines)
  const [confirmModalType, setConfirmModalType] = useState<
    'create-forms' | 'create-sheet' | 'sync-sheet' | 'create-slides' | null
  >(null);

  const codeGs = generateCodeGs(adminEmailInput, schoolDomainInput);
  const indexHtml = generateIndexHtml();

  const handleCopyCodeGs = () => {
    navigator.clipboard.writeText(codeGs);
    setCopiedCodeGs(true);
    setTimeout(() => setCopiedCodeGs(false), 2500);
  };

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(indexHtml);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2500);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await onUpdateSettings({
        adminEmail: adminEmailInput.trim().toLowerCase(),
        schoolDomain: schoolDomainInput.trim().toLowerCase(),
        targetDocOrSheetId: docIdInput.trim(),
      });
      alert('Workspace settings updated successfully!');
    } catch (err: any) {
      alert('Failed to save settings: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Google Workspace Authorization with Popup
  const handleAuthorizeWorkspace = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setCachedAccessToken(credential.accessToken);
        setAccessToken(credential.accessToken);
      } else {
        throw new Error('Google Sign-In succeeded, but no OAuth access token was returned.');
      }
    } catch (err: any) {
      console.error('Google Workspace Auth Error:', err);
      setAuthError(err.message || 'Authorization failed.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Execute Auto-Creation of 16 Google Forms
  const executeCreateAllForms = async () => {
    if (!accessToken) {
      setAuthError('Please connect your Google Workspace account first.');
      return;
    }

    setConfirmModalType(null);
    setIsCreatingForms(true);
    setFormsError(null);

    try {
      const results = await createAll16GoogleForms(
        tasks.length > 0 ? tasks : MASTER_TASKS,
        accessToken,
        settings.schoolDomain,
        (completed, total, current) => {
          setFormsProgress({ completed, total, current });
        }
      );
      setCreatedForms(results);
      if (onUpdateTaskForms) {
        onUpdateTaskForms(results);
      }
    } catch (err: any) {
      console.error('Error creating Google Forms:', err);
      setFormsError(err.message || 'Failed to create forms in Google Drive.');
    } finally {
      setIsCreatingForms(false);
    }
  };

  // Execute Creation of Centralized Google Sheet
  const executeCreateSheet = async () => {
    if (!accessToken) {
      setAuthError('Please connect your Google Workspace account first.');
      return;
    }

    setConfirmModalType(null);
    setIsCreatingSheet(true);
    setSheetError(null);

    try {
      const result = await createCentralizedGoogleSheet(
        'Semester Lockout Tracker - Master Submissions',
        accessToken
      );
      setCreatedSheetUrl(result.spreadsheetUrl);
      setDocIdInput(result.spreadsheetId);
      await onUpdateSettings({
        targetDocOrSheetId: result.spreadsheetId,
      });
    } catch (err: any) {
      console.error('Error creating Google Sheet:', err);
      setSheetError(err.message || 'Failed to create Google Sheet.');
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // Execute Syncing of Submissions to Google Sheet
  const executeSyncSubmissions = async () => {
    if (!accessToken) {
      setAuthError('Please connect your Google Workspace account first.');
      return;
    }

    const targetId = docIdInput.trim() || settings.targetDocOrSheetId;
    if (!targetId) {
      setSyncError('Please create or enter a Google Spreadsheet ID first.');
      return;
    }

    setConfirmModalType(null);
    setIsSyncingSubmissions(true);
    setSyncError(null);
    setSyncResult(null);

    try {
      const result = await syncSubmissionsToGoogleSheet(targetId, submissions, accessToken);
      setSyncResult(`Successfully synced ${result.rowsSynced} submission row(s) to your Google Sheet!`);
    } catch (err: any) {
      console.error('Error syncing to Google Sheet:', err);
      setSyncError(err.message || 'Failed to sync submissions to Google Sheet.');
    } finally {
      setIsSyncingSubmissions(false);
    }
  };

  // Execute Creation of Google Slides Presentation with Forms Links
  const executeCreateSlidesDeck = async () => {
    if (!accessToken) {
      setAuthError('Please connect your Google Workspace account first.');
      return;
    }

    setConfirmModalType(null);
    setIsCreatingSlides(true);
    setSlidesError(null);
    setSlidesProgress('Initializing Google Slides creation...');

    try {
      // Build forms mapping
      const formsMap: Record<string, string> = {};
      createdForms.forEach((f) => {
        formsMap[f.taskId] = f.responderUri;
      });
      tasks.forEach((t) => {
        if (t.customFormUrl && !formsMap[t.id]) {
          formsMap[t.id] = t.customFormUrl;
        }
      });

      const result = await createLockoutGoogleSlidesDeck(
        'Semester Lockout Tracker - 16-Task Bingo Presentation',
        tasks.length > 0 ? tasks : MASTER_TASKS,
        formsMap,
        schoolDomainInput || settings.schoolDomain,
        accessToken,
        (status) => setSlidesProgress(status)
      );

      setCreatedSlidesResult(result);
    } catch (err: any) {
      console.error('Error creating Google Slides deck:', err);
      setSlidesError(err.message || 'Failed to create Google Slides deck.');
    } finally {
      setIsCreatingSlides(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-[#28532c] text-white rounded-2xl p-5 sm:p-6 shadow-md border border-[#1e3f22]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-white/15 text-emerald-100 border border-white/20">
              <Zap className="w-3.5 h-3.5 text-yellow-300" />
              <span>AUTOMATED GOOGLE WORKSPACE DRIVE &amp; FORMS INTEGRATION</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">
              Direct Google Drive, Forms &amp; Sheets Automation
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-3xl leading-relaxed">
              Now enabled via Google Workspace APIs! You can automatically generate all <strong>16 single-submission Google Forms</strong> and your <strong>centralized master responses spreadsheet</strong> directly inside your Google Drive with one click, without needing to copy code into Apps Script.
            </p>
          </div>

          <div className="flex-shrink-0 flex items-center gap-2">
            {accessToken ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-bold border border-emerald-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Drive &amp; Forms Connected</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleAuthorizeWorkspace}
                disabled={isAuthenticating}
                className="gsi-material-button inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 rounded-lg transition-colors shadow-xs"
              >
                <div className="w-4 h-4">
                  <svg viewBox="0 0 48 48" className="w-full h-full">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                </div>
                <span>{isAuthenticating ? 'Connecting...' : 'Authorize Google Workspace'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {authError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{authError}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('automated-drive')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'automated-drive'
              ? 'bg-[#28532c] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-yellow-300" />
          <span>1-Click Google Drive &amp; Forms Generator</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('guide')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'guide'
              ? 'bg-[#28532c] text-white shadow-xs font-bold'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Presentation className="w-3.5 h-3.5" />
          <span>Google Slides &amp; Sheets Apps Script Guide</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('code-gs')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'code-gs'
              ? 'bg-[#28532c] text-white shadow-xs font-bold'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span>Code.gs Script</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('index-html')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'index-html'
              ? 'bg-[#28532c] text-white shadow-xs font-bold'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Index.html Template</span>
        </button>
      </div>

      {/* Tab 1: Automated Google Drive & Forms Generator */}
      {activeTab === 'automated-drive' && (
        <div className="space-y-6">
          {/* Action Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: 16 Forms Creator */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  1. Auto-Create 16 Single-Submission Google Forms
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Generates all 16 Google Forms in your Drive with the exact reflection prompts, PLC group selector, and single-submission lock for each task.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModalType('create-forms')}
                  disabled={isCreatingForms}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
                >
                  {isCreatingForms ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating ({formsProgress.completed}/16)...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>Generate 16 Forms</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Card 2: Google Slides Presentation Creator */}
            <div className="bg-white border-2 border-amber-300 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4 relative overflow-hidden">
              <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                New
              </div>
              <div className="space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Presentation className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  2. Create Google Slides with Forms Links
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Builds an 18-slide Google Presentation in Drive featuring the 16-Task Bingo Grid, 4 core pillars, and direct single-submission Google Form links for every task.
                </p>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => setConfirmModalType('create-slides')}
                  disabled={isCreatingSlides}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
                >
                  {isCreatingSlides ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Building Slides...</span>
                    </>
                  ) : (
                    <>
                      <Presentation className="w-3.5 h-3.5" />
                      <span>Create Slides Presentation</span>
                    </>
                  )}
                </button>

                {createdSlidesResult && (
                  <a
                    href={createdSlidesResult.presentationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-semibold transition-colors"
                  >
                    <span>Open in Google Slides</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Card 3: Centralized Google Sheet */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  3. Create Centralized Google Sheet
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Creates a master responses spreadsheet in your Drive with 9 frozen header columns, formatted for all incoming reflections.
                </p>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => setConfirmModalType('create-sheet')}
                  disabled={isCreatingSheet}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#28532c] hover:bg-[#1f4022] text-white rounded-lg text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
                >
                  {isCreatingSheet ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Sheet...</span>
                    </>
                  ) : (
                    <>
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Create Master Sheet</span>
                    </>
                  )}
                </button>

                {createdSheetUrl && (
                  <a
                    href={createdSheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-semibold transition-colors"
                  >
                    <span>Open in Google Sheets</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Card 4: Sync Submissions */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  4. Sync Submissions to Sheet
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Appends current PLC group submissions and locked tasks ({submissions.length} total) directly into your centralized responses Google Sheet.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModalType('sync-sheet')}
                  disabled={isSyncingSubmissions}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
                >
                  {isSyncingSubmissions ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Syncing Submissions...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Sync Submissions ({submissions.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Feedback & Progress Banners */}
          {isCreatingForms && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                <span>Creating Google Forms in Google Drive: {formsProgress.current}</span>
                <span>{Math.round((formsProgress.completed / formsProgress.total) * 100)}%</span>
              </div>
              <div className="w-full bg-purple-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-purple-700 h-2 transition-all duration-300 rounded-full"
                  style={{ width: `${(formsProgress.completed / formsProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {isCreatingSlides && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
                <span>{slidesProgress || 'Building Google Slides presentation...'}</span>
              </div>
            </div>
          )}

          {createdSlidesResult && (
            <div className="bg-amber-50 border border-amber-300 text-amber-950 text-xs p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-amber-700 flex-shrink-0" />
                <div>
                  <span className="font-bold text-sm block">Google Slides Deck Generated in Drive!</span>
                  <span className="text-[11px] text-amber-800">
                    Created an interactive presentation with {createdSlidesResult.slidesCount} slides linking all 16 tasks to single-submission Google Forms.
                  </span>
                </div>
              </div>
              <a
                href={createdSlidesResult.presentationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap shadow-xs"
              >
                <span>Open Presentation</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {slidesError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{slidesError}</span>
            </div>
          )}

          {formsError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{formsError}</span>
            </div>
          )}

          {sheetError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{sheetError}</span>
            </div>
          )}

          {syncResult && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3.5 rounded-xl flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{syncResult}</span>
            </div>
          )}

          {syncError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{syncError}</span>
            </div>
          )}

          {/* Generated Forms Table (if available) */}
          {createdForms.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-3 p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Generated 16 Google Forms in Your Drive</span>
                </h4>
                <span className="text-xs text-slate-500 font-medium">
                  {createdForms.length} forms live &amp; linked to Bingo Grid
                </span>
              </div>

              <div className="overflow-x-auto max-h-72 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0">
                    <tr>
                      <th className="p-2.5 font-semibold">Task ID</th>
                      <th className="p-2.5 font-semibold">Task Title</th>
                      <th className="p-2.5 font-semibold">Pillar Category</th>
                      <th className="p-2.5 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {createdForms.map((form) => (
                      <tr key={form.taskId} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono text-[11px] text-slate-500">{form.taskId}</td>
                        <td className="p-2.5 font-semibold">{form.taskTitle}</td>
                        <td className="p-2.5 text-slate-600">{form.category}</td>
                        <td className="p-2.5 text-right space-x-2 whitespace-nowrap">
                          <a
                            href={form.responderUri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#28532c] hover:underline font-semibold"
                          >
                            <span>Open Form</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <a
                            href={form.editUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 font-medium"
                          >
                            <span>Edit in Forms</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quick Settings Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-slate-600 w-full sm:w-auto">
              <div>
                <span className="font-semibold text-slate-800">Target Google Sheet ID:</span>{' '}
                <input
                  type="text"
                  value={docIdInput}
                  onChange={(e) => setDocIdInput(e.target.value)}
                  placeholder="Paste Spreadsheet ID here..."
                  className="font-mono text-xs border border-slate-300 rounded px-2 py-1 ml-1 text-slate-800 focus:ring-1 focus:ring-[#28532c] outline-none"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Check className="w-3 h-3" />
              <span>{isSaving ? 'Saving...' : 'Save Sheet ID'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Google Slides & Sheets Apps Script Guide (Retained for in-slide presentation experience) */}
      {activeTab === 'guide' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1 */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <div className="w-7 h-7 rounded-full bg-[#28532c] text-white flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Open Google Slides or Sheets</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Open your presentation or spreadsheet. In the top menu, click <strong>Extensions &gt; Apps Script</strong>.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <div className="w-7 h-7 rounded-full bg-[#28532c] text-white flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Paste Code.gs &amp; Index.html</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Paste <strong>Code.gs</strong>. Then click <strong>+</strong> next to Files, choose <strong>HTML</strong>, name it <strong>Index</strong>, and paste <strong>Index.html</strong>. Click the <strong>💾 Save</strong> icon.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyCodeGs}
                  className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                >
                  {copiedCodeGs ? 'Copied Code.gs!' : 'Copy Code.gs'}
                </button>
                <button
                  type="button"
                  onClick={handleCopyHtml}
                  className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                >
                  {copiedHtml ? 'Copied Index.html!' : 'Copy Index.html'}
                </button>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <div className="w-7 h-7 rounded-full bg-[#28532c] text-white flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Authorize &amp; Show Menu</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                In the Apps Script toolbar, select <strong>onOpen</strong> from the function dropdown and click <strong>▷ Run</strong>. Click <strong>Review Permissions ➔ Advanced ➔ Allow</strong>.
              </p>
              <div className="bg-emerald-50 p-2.5 rounded border border-emerald-200 text-[11px] text-emerald-800 font-semibold">
                ✓ Menu &quot;🎯 Lockout Tracker&quot; appears immediately in your Slide/Sheet!
              </div>
            </div>
          </div>

          {/* Menu Troubleshooting Callout */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <HelpCircle className="w-5 h-5 text-amber-700 flex-shrink-0" />
              <span>Menu Not Showing Up? Here are the 3 common causes:</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-amber-900/90 leading-relaxed">
              <div className="bg-white/80 p-3 rounded-lg border border-amber-200">
                <span className="font-bold block mb-1">1. Did you click Save?</span>
                In Apps Script, if there is an orange dot next to Code.gs, it is unsaved. Press <strong>Ctrl+S</strong> or click the floppy disk icon.
              </div>
              <div className="bg-white/80 p-3 rounded-lg border border-amber-200">
                <span className="font-bold block mb-1">2. Run onOpen to Authorize</span>
                Google requires 1-time permission. In Apps Script, choose <strong>onOpen</strong> in the dropdown at the top and click <strong>▷ Run</strong>. Accept the permissions popup.
              </div>
              <div className="bg-white/80 p-3 rounded-lg border border-amber-200">
                <span className="font-bold block mb-1">3. Opened from inside the Doc?</span>
                The script must be opened via <strong>Extensions &gt; Apps Script</strong> inside your Google Slide or Sheet (not from script.google.com as a standalone script).
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Code.gs */}
      {activeTab === 'code-gs' && (
        <div className="bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-800">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-yellow-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-green-500/80"></span>
              <span className="text-xs font-mono text-slate-400 ml-2">Code.gs</span>
            </div>

            <button
              type="button"
              onClick={handleCopyCodeGs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white transition-colors"
            >
              {copiedCodeGs ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCodeGs ? 'Copied to Clipboard!' : 'Copy Code.gs'}</span>
            </button>
          </div>

          <div className="p-4 max-h-[500px] overflow-y-auto">
            <pre className="text-xs font-mono text-emerald-400/90 whitespace-pre leading-relaxed">
              {codeGs}
            </pre>
          </div>
        </div>
      )}

      {/* Tab 4: Index.html */}
      {activeTab === 'index-html' && (
        <div className="bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-800">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-yellow-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-green-500/80"></span>
              <span className="text-xs font-mono text-slate-400 ml-2">Index.html</span>
            </div>

            <button
              type="button"
              onClick={handleCopyHtml}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white transition-colors"
            >
              {copiedHtml ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedHtml ? 'Copied to Clipboard!' : 'Copy Index.html'}</span>
            </button>
          </div>

          <div className="p-4 max-h-[500px] overflow-y-auto">
            <pre className="text-xs font-mono text-emerald-400/90 whitespace-pre leading-relaxed">
              {indexHtml}
            </pre>
          </div>
        </div>
      )}

      {/* MANDATORY USER CONFIRMATION MODALS (Workspace Integration Safety Standard) */}
      {confirmModalType === 'create-forms' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Create 16 Single-Submission Google Forms in Google Drive?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  This action will use the <strong>Google Forms API</strong> to create 16 individual Google Forms in your school Google Drive account (<code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">{currentUserEmail}</code>), with permission from your account.
                </p>
              </div>
            </div>

            <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-200 text-xs text-purple-900 space-y-1.5">
              <span className="font-bold block">What will be created:</span>
              <ul className="list-disc list-inside space-y-1 text-purple-800 text-[11px]">
                <li>16 separate forms corresponding to each pedagogical task in the 4 Pillars.</li>
                <li>Each form includes the reflection prompt, PLC group chooser, and single-submission attestation.</li>
                <li>Links will immediately connect to your 16-Task Bingo Grid.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalType(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeCreateAllForms}
                className="px-4 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg transition-colors shadow-xs"
              >
                Confirm &amp; Create 16 Forms
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModalType === 'create-sheet' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Create Master Responses Google Sheet in Google Drive?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  This action will use the <strong>Google Sheets API</strong> to create a new spreadsheet named <em>&quot;Semester Lockout Tracker - Master Submissions&quot;</em> in your Google Drive (<code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">{currentUserEmail}</code>), with permission from your account.
                </p>
              </div>
            </div>

            <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
              <span className="font-bold block">Spreadsheet Structure:</span>
              <ul className="list-disc list-inside space-y-1 text-emerald-800 text-[11px]">
                <li>Frozen header row with 9 columns: Timestamp, Task ID, Title, Category, PLC Group, Educator Email, Status, Reflection Summary, and Form Response ID.</li>
                <li>Saved directly into your app settings to centralize all incoming reflections.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalType(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeCreateSheet}
                className="px-4 py-2 text-xs font-bold text-white bg-[#28532c] hover:bg-[#1f4022] rounded-lg transition-colors shadow-xs"
              >
                Confirm &amp; Create Google Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModalType === 'sync-sheet' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Sync {submissions.length} Submission(s) to Google Sheet?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  This action will write {submissions.length} submission row(s) to the designated spreadsheet (<code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">{docIdInput || settings.targetDocOrSheetId || 'None'}</code>) in your Google Drive, with permission from your account.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalType(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSyncSubmissions}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors shadow-xs"
              >
                Confirm &amp; Sync to Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Create Google Slides Deck */}
      {confirmModalType === 'create-slides' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                <Presentation className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Create Google Slides Presentation with Forms Links?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  This action will use the <strong>Google Slides API</strong> to create a new presentation deck titled <em>&quot;Semester Lockout Tracker - 16-Task Bingo Presentation&quot;</em> in your Google Drive (<code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">{currentUserEmail}</code>), with permission from your account.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
              <span className="font-bold block">Presentation Structure (18 Slides):</span>
              <ul className="list-disc list-inside space-y-1 text-amber-800 text-[11px]">
                <li><strong>Slide 1:</strong> Title slide for Morrison Academy PLCs.</li>
                <li><strong>Slide 2:</strong> Master Bingo Index across all 4 pedagogical pillars.</li>
                <li><strong>Slides 3–18:</strong> Dedicated slide for each task (A1 through D4) containing objectives, lockout policies, and direct single-submission Google Forms links.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalType(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeCreateSlidesDeck}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-xs"
              >
                Confirm &amp; Create Presentation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
