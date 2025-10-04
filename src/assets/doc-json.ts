// Tiptap JSON templates for JSON-first initialization

export const DEFAULT_BLANK_DOCUMENT_JSON = JSON.stringify({
  type: 'doc',
  content: [
    { type: 'paragraph', content: [] }
  ]
});

export const RESUME_TEMPLATE_JSON = JSON.stringify({
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Your Full Name' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'your.email@example.com | (555) 123-4567 | linkedin.com/in/yourprofile' }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Professional Summary' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Results-driven professional with [X]+ years of experience in [your field].' }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Professional Experience' }] },
    { type: 'bulletList', content: [
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Led [initiative] resulting in [outcome].' }] }] },
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Managed [scope] to achieve [goal].' }] }] }
    ]},
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Education' }] },
    { type: 'paragraph', content: [{ type: 'text', text: '[Degree] in [Field], [University], [Year]' }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Core Competencies' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Technical Skills • Leadership • Industry Expertise' }] }
  ]
});

export const LETTER_TEMPLATE_JSON = JSON.stringify({
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: '[Month Day, Year]' }] },
    { type: 'paragraph', content: [{ type: 'text', text: '[Recipient Full Name]' }] },
    { type: 'paragraph', content: [{ type: 'text', text: '[Company/Organization Name]' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Dear [Mr./Ms./Dr. Last Name]:' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Opening: State your purpose clearly and directly.' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Body: Provide detailed information supporting your purpose.' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Closing: Summarize and indicate next steps.' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Sincerely,' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Your Full Name' }] }
  ]
});
