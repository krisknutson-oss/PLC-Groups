import firebaseConfig from '../firebase-applet-config.json';
import { MASTER_TASKS } from './types';

export const APPS_SCRIPT_PROJECT_ID = firebaseConfig.projectId;
export const APPS_SCRIPT_DATABASE_ID = (firebaseConfig as any).firestoreDatabaseId || '(default)';
export const APPS_SCRIPT_API_KEY = firebaseConfig.apiKey;

export function generateCodeGs(adminEmail: string, schoolDomain: string): string {
  return `/**
 * @license
 * Semester Lockout Tracker - Google Workspace Containerized Apps Script
 * Built for Google Slides / Google Sheets / Google Docs
 * Connected to Firebase Firestore: ${firebaseConfig.projectId}
 */

var FIREBASE_PROJECT_ID = "${firebaseConfig.projectId}";
var FIRESTORE_DB_ID = "${(firebaseConfig as any).firestoreDatabaseId || '(default)'}";
var FIREBASE_API_KEY = "${firebaseConfig.apiKey}";
var ADMIN_EMAIL = "${adminEmail || 'kris.knutson@ma.org.tw'}";
var SCHOOL_DOMAIN = "${schoolDomain || 'ma.org.tw'}";

/**
 * Returns the appropriate UI object whether running inside Google Slides, Sheets, or Docs
 */
function getWorkspaceUi() {
  // Check Google Sheets first
  try {
    if (typeof SpreadsheetApp !== 'undefined' && SpreadsheetApp.getActiveSpreadsheet()) {
      return SpreadsheetApp.getUi();
    }
  } catch (e) {}

  // Check Google Slides
  try {
    if (typeof SlidesApp !== 'undefined' && SlidesApp.getActivePresentation()) {
      return SlidesApp.getUi();
    }
  } catch (e2) {}

  // Check Google Docs
  try {
    if (typeof DocumentApp !== 'undefined' && DocumentApp.getActiveDocument()) {
      return DocumentApp.getUi();
    }
  } catch (e3) {}

  // Direct fallbacks
  try { return SpreadsheetApp.getUi(); } catch (e4) {}
  try { return SlidesApp.getUi(); } catch (e5) {}
  try { return DocumentApp.getUi(); } catch (e6) {}
  return null;
}

/**
 * Robust HTML template loader (supports both 'Index' and 'index')
 */
function createHtmlTemplate() {
  try {
    return HtmlService.createTemplateFromFile('Index');
  } catch (err1) {
    try {
      return HtmlService.createTemplateFromFile('index');
    } catch (err2) {
      return HtmlService.createHtmlOutput('<h3>Error loading Index.html</h3><p>Please ensure you created an HTML file named <b>Index</b> in your Apps Script project.</p>');
    }
  }
}

/**
 * Adds custom menu when Google Slides, Sheets, or Docs opens
 */
function onOpen(e) {
  try {
    var ui = getWorkspaceUi();
    if (!ui) {
      Logger.log("getWorkspaceUi() returned null - no active UI context found.");
      return;
    }
    ui.createMenu('🎯 Lockout Tracker')
      .addItem('📂 Open 16-Task Bingo Grid (Dialog)', 'showBingoGridModal')
      .addItem('📌 Open Grid in Sidebar', 'showBingoGridSidebar')
      .addSeparator()
      .addItem('⚡ Auto-Create 16 Single-Submission Google Forms', 'createAll16Forms')
      .addItem('👥 Verify School Email Permissions', 'showPermissionsDialog')
      .addSeparator()
      .addItem('🔄 Administrator: Reset Group Tasks', 'promptAdminResetGroup')
      .addItem('🔄 Administrator: Reset All Tasks (New Semester)', 'promptAdminResetAll')
      .addItem('📊 Sync Form Submissions to Sheet', 'syncFirestoreToSheet')
      .addToUi();
  } catch (err) {
    Logger.log("Error in onOpen: " + err);
  }
}

/**
 * Runs when add-on / script is installed
 */
function onInstall(e) {
  onOpen(e);
}

/**
 * Web App entry point: Containerized Workspace Web App
 */
function doGet(e) {
  var template = createHtmlTemplate();
  template.userEmail = Session.getActiveUser().getEmail();
  template.adminEmail = ADMIN_EMAIL;
  template.schoolDomain = SCHOOL_DOMAIN;
  
  return template.evaluate()
    .setTitle('Semester Lockout Tracker - 16-Task Master Grid')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Displays the 16-Task Master Grid modal inside Google Slides or Sheets
 */
function showBingoGridModal() {
  var html = createHtmlTemplate();
  html.userEmail = Session.getActiveUser().getEmail();
  html.adminEmail = ADMIN_EMAIL;
  html.schoolDomain = SCHOOL_DOMAIN;
  
  var output = html.evaluate()
    .setWidth(1150)
    .setHeight(750);
  
  var ui = getWorkspaceUi();
  if (ui) {
    ui.showModalDialog(output, '16-Task Master Bingo Grid - Semester Lockout Tracker');
  }
}

/**
 * Displays the 16-Task Master Grid in a docked Workspace Sidebar
 */
function showBingoGridSidebar() {
  var html = createHtmlTemplate();
  html.userEmail = Session.getActiveUser().getEmail();
  html.adminEmail = ADMIN_EMAIL;
  html.schoolDomain = SCHOOL_DOMAIN;
  
  var output = html.evaluate().setTitle('Lockout Tracker');
  var ui = getWorkspaceUi();
  if (ui) {
    ui.showSidebar(output);
  }
}

/**
 * Verifies if the active user's school email is authorized in Firebase
 */
function checkUserAuthorization(email, groupName) {
  var activeEmail = email || Session.getActiveUser().getEmail();
  if (!activeEmail) {
    return { authorized: false, reason: 'No active Google school session found. Please log in.' };
  }
  
  // Administrator override
  if (activeEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return { authorized: true, role: 'admin', email: activeEmail, verified: true };
  }
  
  // Check domain
  if (SCHOOL_DOMAIN && !activeEmail.toLowerCase().endsWith('@' + SCHOOL_DOMAIN.toLowerCase())) {
    return { authorized: false, reason: 'Email must belong to @' + SCHOOL_DOMAIN };
  }
  
  // Query Firestore REST API
  try {
    var url = "https://firestore.googleapis.com/v1/projects/" + FIREBASE_PROJECT_ID +
              "/databases/" + FIRESTORE_DB_ID + "/documents/authorized_users?key=" + FIREBASE_API_KEY;
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var json = JSON.parse(response.getContentText());
    
    if (json.documents) {
      for (var i = 0; i < json.documents.length; i++) {
        var doc = json.documents[i];
        var fields = doc.fields || {};
        var docEmail = fields.email ? fields.email.stringValue : '';
        var docStatus = fields.status ? fields.status.stringValue : '';
        var docGroup = fields.groupName ? fields.groupName.stringValue : '';
        
        if (docEmail.toLowerCase() === activeEmail.toLowerCase()) {
          if (docStatus === 'verified') {
            if (!groupName || !docGroup || docGroup === groupName) {
              return { authorized: true, role: fields.role ? fields.role.stringValue : 'member', groupName: docGroup };
            } else {
              return { authorized: false, reason: 'You are authorized for ' + docGroup + ', not ' + groupName };
            }
          } else {
            return { authorized: false, reason: 'Your school account is pending administrator verification.' };
          }
        }
      }
    }
  } catch (err) {
    Logger.log("Firestore check error: " + err);
  }
  
  return { authorized: false, reason: 'Your email (' + activeEmail + ') is not yet in the administrator verified whitelist.' };
}

/**
 * Administrator Task Reset for a specific PLC Group
 */
function promptAdminResetGroup() {
  var ui = getWorkspaceUi();
  var user = Session.getActiveUser().getEmail();
  if (user.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    ui.alert('Permission Denied', 'Only the administrator (' + ADMIN_EMAIL + ') can reset tasks.', ui.ButtonSet.OK);
    return;
  }
  
  var prompt = ui.prompt('Reset Group Tasks', 'Enter the exact PLC Group Name to reset (e.g., "Group 1: Humanities PLC"):', ui.ButtonSet.OK_CANCEL);
  if (prompt.getSelectedButton() == ui.Button.OK) {
    var groupName = prompt.getResponseText().trim();
    if (!groupName) return;
    
    var confirm = ui.alert('Confirm Reset', 'Are you sure you want to reset and unlock all tasks for ' + groupName + '?', ui.ButtonSet.YES_NO);
    if (confirm == ui.Button.YES) {
      resetFirestoreSubmissionsForGroup(groupName);
      ui.alert('Reset Complete', 'All tasks for ' + groupName + ' have been reset and unlocked.', ui.ButtonSet.OK);
    }
  }
}

/**
 * Administrator Master Reset for all groups (New Semester)
 */
function promptAdminResetAll() {
  var ui = getWorkspaceUi();
  var user = Session.getActiveUser().getEmail();
  if (user.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    ui.alert('Permission Denied', 'Only the administrator (' + ADMIN_EMAIL + ') can perform a master reset.', ui.ButtonSet.OK);
    return;
  }
  
  var confirm = ui.prompt('MASTER RESET: Type RESET to confirm', 'Warning: This will clear all locked tiles across all groups for the new semester. Type RESET to confirm:', ui.ButtonSet.OK_CANCEL);
  if (confirm.getSelectedButton() == ui.Button.OK && confirm.getResponseText().trim() === 'RESET') {
    resetAllFirestoreSubmissions();
    ui.alert('Semester Reset Complete', 'All group submissions have been cleared. All 16 tiles are unlocked for the new semester.', ui.ButtonSet.OK);
  }
}

function resetFirestoreSubmissionsForGroup(groupName) {
  try {
    var url = "https://firestore.googleapis.com/v1/projects/" + FIREBASE_PROJECT_ID +
              "/databases/" + FIRESTORE_DB_ID + "/documents/task_submissions?key=" + FIREBASE_API_KEY;
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var json = JSON.parse(response.getContentText());
    if (json.documents) {
      for (var i = 0; i < json.documents.length; i++) {
        var doc = json.documents[i];
        var fields = doc.fields || {};
        if (fields.groupName && fields.groupName.stringValue === groupName) {
          var deleteUrl = "https://firestore.googleapis.com/v1/" + doc.name + "?key=" + FIREBASE_API_KEY;
          UrlFetchApp.fetch(deleteUrl, { method: "delete", muteHttpExceptions: true });
        }
      }
    }
  } catch (e) {
    Logger.log("Error resetting group: " + e);
  }
}

function resetAllFirestoreSubmissions() {
  try {
    var url = "https://firestore.googleapis.com/v1/projects/" + FIREBASE_PROJECT_ID +
              "/databases/" + FIRESTORE_DB_ID + "/documents/task_submissions?key=" + FIREBASE_API_KEY;
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var json = JSON.parse(response.getContentText());
    if (json.documents) {
      for (var i = 0; i < json.documents.length; i++) {
        var doc = json.documents[i];
        var deleteUrl = "https://firestore.googleapis.com/v1/" + doc.name + "?key=" + FIREBASE_API_KEY;
        UrlFetchApp.fetch(deleteUrl, { method: "delete", muteHttpExceptions: true });
      }
    }
  } catch (e) {
    Logger.log("Error resetting all submissions: " + e);
  }
}

/**
 * Automatically creates all 16 Single-Submission Google Forms,
 * enforces 1-response-per-user, and links them into this spreadsheet/doc!
 */
function createAll16Forms() {
  var ui = getWorkspaceUi();
  var ss;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    ui.alert('Note', 'Form auto-linking works best when run from Google Sheets. Running form creation now...', ui.ButtonSet.OK);
  }
  
  var sheet = ss ? (ss.getSheetByName('Form_Links') || ss.insertSheet('Form_Links')) : null;
  if (sheet) {
    sheet.clear();
    sheet.appendRow(['Task ID', 'Category', 'Task Title', 'Google Form Edit URL', 'Single-Submission Form Published URL']);
  }
  
  var tasks = ${JSON.stringify(MASTER_TASKS.map(t => ({
    id: t.id,
    category: t.category,
    title: t.title,
    subtitle: t.shortSubtitle,
    desc: t.promptDescription,
    question: t.defaultFormQuestion
  })), null, 2)};
  
  for (var i = 0; i < tasks.length; i++) {
    var t = tasks[i];
    var formTitle = t.title + ' - Semester Lockout Reflection';
    var form = FormApp.create(formTitle);
    
    // Set 1-response-per-user (Single Submission)
    form.setLimitOneResponsePerUser(true);
    form.setRequireLogin(true); // Must use school account
    form.setShowLinkToRespondAgain(false);
    form.setDescription(
      "Category: " + t.category + "\\n" +
      "Task: " + t.title + " (" + t.subtitle + ")\\n\\n" +
      "Pedagogical Instruction:\\n" + t.desc + "\\n\\n" +
      "⚠️ NOTE: This is a single-submission task. Once submitted, your group's tile will lock in the master tracker."
    );
    
    // Add School Email / Name field
    form.addTextItem().setTitle('Submitter Name').setRequired(true);
    form.addTextItem().setTitle('Group / PLC Name').setRequired(true);
    
    // Add Reflection question
    form.addParagraphTextItem()
      .setTitle(t.question)
      .setHelpText('Provide a concise, thoughtful reflection on how this pedagogical action was carried out.')
      .setRequired(true);
    
    // Add Key Takeaway
    form.addParagraphTextItem()
      .setTitle('Key Takeaway or Impact on Student Formation')
      .setRequired(false);
      
    // Link form responses directly to this Spreadsheet if available!
    if (ss) {
      form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
    }
    
    var editUrl = form.getEditUrl();
    var pubUrl = form.getPublishedUrl();
    if (sheet) {
      sheet.appendRow([t.id, t.category, t.title, editUrl, pubUrl]);
    }
  }
  
  ui.alert('Success! All 16 single-submission Google Forms have been created' + (sheet ? ' and linked to the "Form_Links" tab in this spreadsheet.' : '.'));
}

/**
 * Synchronizes submissions from Firestore into the Google Sheet
 */
function syncFirestoreToSheet() {
  var ui = getWorkspaceUi();
  var ss;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    ui.alert('Error', 'This action requires running inside Google Sheets.', ui.ButtonSet.OK);
    return;
  }
  
  var sheet = ss.getSheetByName('Centralized_Submissions') || ss.insertSheet('Centralized_Submissions');
  sheet.clear();
  sheet.appendRow(['Timestamp', 'Task ID', 'Task Title', 'Category', 'Group', 'User Email', 'Status', 'Reflection Summary']);
  
  var url = "https://firestore.googleapis.com/v1/projects/" + FIREBASE_PROJECT_ID +
            "/databases/" + FIRESTORE_DB_ID + "/documents/task_submissions?key=" + FIREBASE_API_KEY;
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var json = JSON.parse(response.getContentText());
  
  if (json.documents) {
    for (var i = 0; i < json.documents.length; i++) {
      var f = json.documents[i].fields || {};
      sheet.appendRow([
        f.submittedAt ? f.submittedAt.stringValue : '',
        f.taskId ? f.taskId.stringValue : '',
        f.taskTitle ? f.taskTitle.stringValue : '',
        f.category ? f.category.stringValue : '',
        f.groupName ? f.groupName.stringValue : '',
        f.userEmail ? f.userEmail.stringValue : '',
        f.status ? f.status.stringValue : '',
        f.responseSummary ? f.responseSummary.stringValue : ''
      ]);
    }
  }
  ui.alert('Submissions successfully synced from Firebase into Centralized_Submissions sheet tab.');
}
`;
}

export function generateIndexHtml(): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <base target="_top">
    <meta charset="utf-8">
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        margin: 0;
        padding: 20px;
        background-color: #f8fafc;
        color: #0f172a;
      }
      .header-container {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 20px;
        flex-wrap: wrap;
        gap: 12px;
      }
      .header-tracker {
        color: #166534;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        margin-bottom: 2px;
      }
      .header-title {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 28px;
        font-weight: 700;
        color: #1e293b;
        margin: 0;
      }
      .group-bar {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 10px 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 18px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.03);
      }
      .group-select {
        font-weight: 600;
        font-size: 13px;
        padding: 6px 12px;
        border-radius: 8px;
        border: 1px solid #cbd5e1;
        background: #f8fafc;
        color: #0f172a;
        outline: none;
      }
      .grid-container {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 14px;
      }
      .col-header {
        background-color: #28532c;
        color: white;
        text-align: center;
        padding: 8px 6px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      .tile-card {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 14px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        min-height: 115px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.02);
      }
      .tile-card.completed {
        background: #f0fdf4;
        border-color: #86efac;
      }
      .tile-title {
        font-size: 14px;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 4px;
      }
      .tile-desc {
        font-size: 11px;
        color: #64748b;
        margin-bottom: 10px;
      }
      .btn-action {
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        width: 100%;
        text-align: center;
      }
      .btn-open {
        background: #f1f5f9;
        color: #334155;
        border: 1px solid #cbd5e1;
      }
      .btn-locked {
        background: #1b7a37;
        color: white;
      }
      .admin-reset-btn {
        background: #fee2e2;
        color: #991b1b;
        border: 1px solid #fecaca;
        font-size: 11px;
        font-weight: 600;
        padding: 4px 8px;
        border-radius: 6px;
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <div class="header-container">
      <div>
        <div class="header-tracker">GOOGLE WORKSPACE CONTAINER</div>
        <h1 class="header-title">16-Task Master Bingo Grid</h1>
      </div>
      <div style="font-size: 12px; color: #475569;">
        Logged in: <strong><?= userEmail ?></strong>
      </div>
    </div>

    <!-- Active PLC Group Selector Bar -->
    <div class="group-bar">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b;">Active PLC Group:</span>
        <select id="groupSelector" class="group-select" onchange="changeGroup(this.value)">
          <option value="Group 1: Humanities PLC">Group 1: Humanities PLC</option>
          <option value="Group 2: STEM Cohort">Group 2: STEM Cohort</option>
          <option value="Group 3: Middle School Team">Group 3: Middle School Team</option>
          <option value="Group 4: Biblical Studies & Arts">Group 4: Biblical Studies & Arts</option>
        </select>
      </div>

      <div id="adminControls">
        <button class="admin-reset-btn" onclick="resetActiveGroup()">🔄 Admin: Reset Group Tasks</button>
      </div>
    </div>

    <!-- 4-Column Grid -->
    <div class="grid-container" id="bingoGrid">
      <div class="col-header">HOSPITALITY &amp; SPACE</div>
      <div class="col-header">PACING &amp; SILENCE</div>
      <div class="col-header">LANGUAGE &amp; METAPHOR</div>
      <div class="col-header">ATTENTIVENESS</div>
    </div>

    <script>
      var currentGroup = 'Group 1: Humanities PLC';
      function changeGroup(val) {
        currentGroup = val;
      }
      function resetActiveGroup() {
        if (confirm('Are you sure you want to reset all tasks for ' + currentGroup + '?')) {
          google.script.run.withSuccessHandler(function() {
            alert('Tasks reset for ' + currentGroup);
          }).promptAdminResetGroup();
        }
      }
    </script>
  </body>
</html>`;
}
