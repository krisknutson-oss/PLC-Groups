import { BingoTask, TaskSubmission, MASTER_TASKS } from '../types';

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/presentations',
];

export interface CreatedFormResult {
  taskId: string;
  taskTitle: string;
  category: string;
  formId: string;
  responderUri: string;
  editUrl: string;
}

export interface CreatedSheetResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

export interface CreatedPresentationResult {
  presentationId: string;
  presentationUrl: string;
  slidesCount: number;
}

/**
 * Creates a centralized Google Spreadsheet for logging all 16-task reflections and lockouts.
 */
export async function createCentralizedGoogleSheet(
  title: string,
  accessToken: string
): Promise<CreatedSheetResult> {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: title || 'Semester Lockout Tracker - Master Submissions',
      },
      sheets: [
        {
          properties: {
            title: 'Submissions Log',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: [
                    { userEnteredValue: { stringValue: 'Timestamp' } },
                    { userEnteredValue: { stringValue: 'Task ID' } },
                    { userEnteredValue: { stringValue: 'Task Title' } },
                    { userEnteredValue: { stringValue: 'Category / Pillar' } },
                    { userEnteredValue: { stringValue: 'PLC Group' } },
                    { userEnteredValue: { stringValue: 'Educator Email' } },
                    { userEnteredValue: { stringValue: 'Status' } },
                    { userEnteredValue: { stringValue: 'Reflection Summary / Evidence' } },
                    { userEnteredValue: { stringValue: 'Form Response ID' } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to create Google Sheet: ${response.status} ${response.statusText} - ${
        errorData.error?.message || 'Unknown error'
      }`
    );
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
  };
}

/**
 * Creates a single-submission Google Form for a specific Bingo Task using the Google Forms API.
 */
export async function createSingleSubmissionGoogleForm(
  task: BingoTask,
  accessToken: string,
  schoolDomain: string
): Promise<CreatedFormResult> {
  // Step 1: Create the basic Google Form
  const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      info: {
        title: `${task.id}: ${task.title}`,
        documentTitle: `Lockout Form - ${task.id} (${task.category})`,
      },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(
      `Failed to create form for ${task.id}: ${createRes.status} - ${err.error?.message || 'Error'}`
    );
  }

  const formData = await createRes.json();
  const formId = formData.formId;
  const responderUri = formData.responderUri || `https://docs.google.com/forms/d/e/${formId}/viewform`;

  // Step 2: BatchUpdate to configure form description and single-submission reflection items
  const updateRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      includeFormInResponse: true,
      requests: [
        {
          updateFormInfo: {
            info: {
              description: `Pillar Category: ${task.category}\n\nTask Focus: ${task.promptDescription}\n\n⚠️ SINGLE-SUBMISSION POLICY: Only authorized @${schoolDomain} educators may submit. Submitting will complete and lock this tile for your assigned PLC group for the semester.`,
            },
            updateMask: 'description',
          },
        },
        {
          createItem: {
            item: {
              title: 'Assigned PLC Group Cohort',
              description: 'Select your verified PLC group for this semester lockout activity.',
              questionItem: {
                question: {
                  required: true,
                  choiceQuestion: {
                    type: 'RADIO',
                    options: [
                      { value: 'Group 1: Humanities PLC' },
                      { value: 'Group 2: STEM & Math PLC' },
                      { value: 'Group 3: Arts & World Language PLC' },
                      { value: 'Group 4: Counseling & Admin PLC' },
                    ],
                  },
                },
              },
            },
            location: { index: 0 },
          },
        },
        {
          createItem: {
            item: {
              title: task.defaultFormQuestion,
              description: 'Provide your detailed reflection, specific observations, or evidence of pedagogical implementation.',
              questionItem: {
                question: {
                  required: true,
                  textQuestion: {
                    paragraph: true,
                  },
                },
              },
            },
            location: { index: 1 },
          },
        },
        {
          createItem: {
            item: {
              title: 'Single-Submission Attestation',
              description: 'Confirm this reflection represents your group\'s official completion of this task.',
              questionItem: {
                question: {
                  required: true,
                  choiceQuestion: {
                    type: 'CHECKBOX',
                    options: [
                      { value: 'I verify this is our official semester reflection for this task.' },
                    ],
                  },
                },
              },
            },
            location: { index: 2 },
          },
        },
      ],
    }),
  });

  if (!updateRes.ok) {
    const err = await updateRes.json().catch(() => ({}));
    console.warn(`BatchUpdate warning on form ${formId}:`, err);
  }

  return {
    taskId: task.id,
    taskTitle: task.title,
    category: task.category,
    formId,
    responderUri,
    editUrl: `https://docs.google.com/forms/d/${formId}/edit`,
  };
}

/**
 * Generates all 16 single-submission Google Forms in the educator's Google Drive.
 */
export async function createAll16GoogleForms(
  tasks: BingoTask[],
  accessToken: string,
  schoolDomain: string,
  onProgress?: (completed: number, total: number, currentTitle: string) => void
): Promise<CreatedFormResult[]> {
  const results: CreatedFormResult[] = [];
  const total = tasks.length;

  for (let i = 0; i < total; i++) {
    const task = tasks[i];
    if (onProgress) {
      onProgress(i, total, `${task.id}: ${task.title}`);
    }

    const formResult = await createSingleSubmissionGoogleForm(task, accessToken, schoolDomain);
    results.push(formResult);

    // Small delay to prevent API rate limits
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  if (onProgress) {
    onProgress(total, total, 'Complete!');
  }

  return results;
}

/**
 * Appends or updates task submissions into the designated Google Sheet.
 */
export async function syncSubmissionsToGoogleSheet(
  spreadsheetId: string,
  submissions: TaskSubmission[],
  accessToken: string
): Promise<{ rowsSynced: number }> {
  if (submissions.length === 0) {
    return { rowsSynced: 0 };
  }

  const rows = submissions.map((s) => [
    new Date(s.submittedAt).toLocaleString(),
    s.taskId,
    s.taskTitle,
    s.category,
    s.groupName,
    s.userEmail,
    s.status === 'completed' ? 'Completed & Locked' : 'In Progress',
    s.responseSummary,
    s.formResponseId || '',
  ]);

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Submissions Log!A2:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!response.ok) {
    // If 'Submissions Log' tab does not exist, try Sheet1
    const fallbackResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A2:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: rows,
        }),
      }
    );

    if (!fallbackResponse.ok) {
      const err = await fallbackResponse.json().catch(() => ({}));
      throw new Error(
        `Failed to sync to Google Sheet: ${fallbackResponse.status} - ${err.error?.message || 'Error'}`
      );
    }
  }

  return { rowsSynced: submissions.length };
}

/**
 * Creates a professional Google Slides presentation deck featuring an interactive
 * 16-task Master Bingo Overview and individual task slides with direct Google Forms links.
 */
export async function createLockoutGoogleSlidesDeck(
  title: string,
  tasks: BingoTask[],
  formsMap: Record<string, string>, // taskId -> responderUri
  schoolDomain: string,
  accessToken: string,
  onProgress?: (step: string) => void
): Promise<CreatedPresentationResult> {
  if (onProgress) onProgress('Creating Google Slides presentation...');

  // Step 1: Create the presentation
  const createRes = await fetch('https://slides.googleapis.com/v1/presentations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: title || 'Semester Lockout Tracker - 16-Task Bingo Grid Presentation',
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(
      `Failed to create presentation: ${createRes.status} - ${err.error?.message || 'Error'}`
    );
  }

  const presentation = await createRes.json();
  const presentationId = presentation.presentationId;
  const initialSlideId = presentation.slides?.[0]?.objectId;

  if (onProgress) onProgress('Styling Title & Overview slides...');

  // Step 2: BatchUpdate: Format Title Slide + Add Overview + 16 Task Slides
  const requests: any[] = [];

  // Customize Title Slide if present
  if (initialSlideId) {
    const titleBoxId = `title_box_${Date.now()}`;
    const subtitleBoxId = `sub_box_${Date.now()}`;

    // Add title box
    requests.push({
      createShape: {
        objectId: titleBoxId,
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: initialSlideId,
          size: { width: { magnitude: 600, unit: 'PT' }, height: { magnitude: 90, unit: 'PT' } },
          transform: { scaleX: 1, scaleY: 1, translateX: 60, translateY: 110, unit: 'PT' },
        },
      },
    });
    requests.push({
      insertText: {
        objectId: titleBoxId,
        text: '🎯 Semester Lockout Tracker\n16-Task Master Bingo Grid',
      },
    });

    // Add subtitle box
    requests.push({
      createShape: {
        objectId: subtitleBoxId,
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: initialSlideId,
          size: { width: { magnitude: 600, unit: 'PT' }, height: { magnitude: 120, unit: 'PT' } },
          transform: { scaleX: 1, scaleY: 1, translateX: 60, translateY: 210, unit: 'PT' },
        },
      },
    });
    requests.push({
      insertText: {
        objectId: subtitleBoxId,
        text: `Morrison Academy Professional Learning Communities (@${schoolDomain})\n\nCollaborative pedagogical practice across 4 core pillars:\n1. Hospitality & Space  |  2. Pacing & Silence  |  3. Language & Metaphor  |  4. Attentiveness\n\nEach task features a single-submission reflection Google Form.`,
      },
    });
  }

  // Slide 2: Master Bingo 16-Task Grid Index Slide
  const indexSlideId = `slide_index_${Date.now()}`;
  requests.push({
    createSlide: {
      objectId: indexSlideId,
      insertionIndex: 1,
    },
  });

  const indexTitleId = `index_title_${Date.now()}`;
  requests.push({
    createShape: {
      objectId: indexTitleId,
      shapeType: 'TEXT_BOX',
      elementProperties: {
        pageObjectId: indexSlideId,
        size: { width: { magnitude: 620, unit: 'PT' }, height: { magnitude: 50, unit: 'PT' } },
        transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 30, unit: 'PT' },
      },
    },
  });
  requests.push({
    insertText: {
      objectId: indexTitleId,
      text: '📋 16-Task Master Bingo Index (4 Pillars)',
    },
  });

  // Pillars summary in index slide
  const pillarsSummaryId = `pillars_sum_${Date.now()}`;
  requests.push({
    createShape: {
      objectId: pillarsSummaryId,
      shapeType: 'TEXT_BOX',
      elementProperties: {
        pageObjectId: indexSlideId,
        size: { width: { magnitude: 620, unit: 'PT' }, height: { magnitude: 300, unit: 'PT' } },
        transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 85, unit: 'PT' },
      },
    },
  });

  const pillar1Tasks = tasks.filter((t) => t.colIndex === 0).map((t) => `• ${t.id}: ${t.title}`).join('\n');
  const pillar2Tasks = tasks.filter((t) => t.colIndex === 1).map((t) => `• ${t.id}: ${t.title}`).join('\n');
  const pillar3Tasks = tasks.filter((t) => t.colIndex === 2).map((t) => `• ${t.id}: ${t.title}`).join('\n');
  const pillar4Tasks = tasks.filter((t) => t.colIndex === 3).map((t) => `• ${t.id}: ${t.title}`).join('\n');

  const indexBodyText = `[Pillar 1: Hospitality & Space]\n${pillar1Tasks}\n\n[Pillar 2: Pacing & Silence]\n${pillar2Tasks}\n\n[Pillar 3: Language & Metaphor]\n${pillar3Tasks}\n\n[Pillar 4: Attentiveness]\n${pillar4Tasks}\n\n👉 Proceed through each slide to open the single-submission Google Form for each task.`;

  requests.push({
    insertText: {
      objectId: pillarsSummaryId,
      text: indexBodyText,
    },
  });

  // Execute initial slides batch
  await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  // Step 3: Create dedicated slide for each of the 16 tasks with direct Google Form link
  const sortedTasks = [...tasks].sort((a, b) => a.rowIndex * 4 + a.colIndex - (b.rowIndex * 4 + b.colIndex));

  for (let i = 0; i < sortedTasks.length; i++) {
    const task = sortedTasks[i];
    const taskSlideId = `task_slide_${task.id.toLowerCase()}_${Date.now()}_${i}`;
    const formUrl = formsMap[task.id] || task.customFormUrl || '';

    if (onProgress) {
      onProgress(`Adding Slide for ${task.id}: ${task.title}...`);
    }

    const taskRequests: any[] = [];

    // Create Slide
    taskRequests.push({
      createSlide: {
        objectId: taskSlideId,
      },
    });

    // Header shape (Title + Pillar Tag)
    const taskHeaderId = `th_${task.id}_${i}`;
    taskRequests.push({
      createShape: {
        objectId: taskHeaderId,
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: taskSlideId,
          size: { width: { magnitude: 620, unit: 'PT' }, height: { magnitude: 70, unit: 'PT' } },
          transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 30, unit: 'PT' },
        },
      },
    });
    taskRequests.push({
      insertText: {
        objectId: taskHeaderId,
        text: `🎯 Task ${task.id}: ${task.title}\nCategory Pillar: ${task.category.toUpperCase()}`,
      },
    });

    // Prompt & Pedagogy Card
    const taskBodyId = `tb_${task.id}_${i}`;
    taskRequests.push({
      createShape: {
        objectId: taskBodyId,
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: taskSlideId,
          size: { width: { magnitude: 620, unit: 'PT' }, height: { magnitude: 160, unit: 'PT' } },
          transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 110, unit: 'PT' },
        },
      },
    });
    taskRequests.push({
      insertText: {
        objectId: taskBodyId,
        text: `📌 Pedagogical Objective:\n${task.promptDescription}\n\n💬 Official Form Reflection Prompt:\n"${task.defaultFormQuestion}"\n\n🔒 Lockout Policy: Single official submission per assigned PLC group cohort.`,
      },
    });

    // Google Form Action Link Box
    const formBoxId = `fb_${task.id}_${i}`;
    taskRequests.push({
      createShape: {
        objectId: formBoxId,
        shapeType: 'ROUNDED_RECTANGLE',
        elementProperties: {
          pageObjectId: taskSlideId,
          size: { width: { magnitude: 620, unit: 'PT' }, height: { magnitude: 60, unit: 'PT' } },
          transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 285, unit: 'PT' },
        },
      },
    });

    const formButtonText = formUrl
      ? `📝 CLICK HERE TO SUBMIT GOOGLE FORM FOR ${task.id}\n${formUrl}`
      : `📝 Google Form for Task ${task.id} (Generate Forms via Lockout Tracker to auto-link)`;

    taskRequests.push({
      insertText: {
        objectId: formBoxId,
        text: formButtonText,
      },
    });

    // Send slide batch update
    await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests: taskRequests }),
    });

    // Small delay to prevent API rate limits
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  if (onProgress) onProgress('Google Slides Presentation Complete!');

  return {
    presentationId,
    presentationUrl: `https://docs.google.com/presentation/d/${presentationId}/edit`,
    slidesCount: sortedTasks.length + 2,
  };
}
