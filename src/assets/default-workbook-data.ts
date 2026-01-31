import {
  LocaleType,
  SheetTypes,
} from '@univerjs/core'

/**
 * Default workbook data
 * @type {IWorkbookData} document see https://univer.work/api/core/interfaces/IWorkbookData.html
 */
export const DEFAULT_WORKBOOK_DATA = {
  id: 'ven-wkbook-strt-01',
  locale: LocaleType.EN_US,
  name: 'New Spreadsheet',
  sheetOrder: ['sheet-01'],
  appVersion: '3.0.0-alpha',
  styles: {},
  sheets: {
    'sheet-01': {
      type: SheetTypes.GRID,
      id: 'sheet-01',
      name: 'Sheet1',
      cellData: {},
      rowCount: 1000,
      columnCount: 26,
      defaultColumnWidth: 100,
      defaultRowHeight: 25,
      rowData: [],
      columnData: [],
    },
  },
}

/**
 * Budget template workbook data
 */
export const BUDGET_TEMPLATE_DATA = {
  id: 'budget-template',
  locale: LocaleType.EN_US,
  name: 'Budget Template',
  sheetOrder: ['budget-sheet'],
  appVersion: '3.0.0-alpha',
  styles: {
    'header': {
      bl: 1, // Bold
      bg: { rgb: '#4F46E5' }, // Blue background
      cl: { rgb: '#FFFFFF' }, // White text
    },
    'currency': {
      nf: { pattern: '"$"#,##0.00' }, // Currency format
    },
    'percentage': {
      nf: { pattern: '0.00%' }, // Percentage format
    },
    'total': {
      bl: 1,
      bg: { rgb: '#F3F4F6' },
    }
  },
  sheets: {
    'budget-sheet': {
      id: 'budget-sheet',
      name: 'Budget',
      cellData: {
        0: {
          0: { v: 'Monthly Budget', t: 1, s: 'header' },
          1: { v: '', t: 1 },
          2: { v: '', t: 1 },
        },
        1: { 0: { v: '', t: 1 } },
        2: {
          0: { v: 'Income', t: 1, s: 'header' },
          1: { v: 'Amount', t: 1, s: 'header' },
        },
        3: {
          0: { v: 'Salary', t: 1 },
          1: { v: 5000, t: 2, s: 'currency' },
        },
        4: {
          0: { v: 'Freelance', t: 1 },
          1: { v: 1000, t: 2, s: 'currency' },
        },
        5: {
          0: { v: 'Other Income', t: 1 },
          1: { v: 500, t: 2, s: 'currency' },
        },
        6: {
          0: { v: 'Total Income', t: 1, s: 'total' },
          1: { v: 6500, t: 2, s: 'currency' },
        },
        7: { 0: { v: '', t: 1 } },
        8: {
          0: { v: 'Expenses', t: 1, s: 'header' },
          1: { v: 'Amount', t: 1, s: 'header' },
        },
        9: {
          0: { v: 'Rent/Mortgage', t: 1 },
          1: { v: 1500, t: 2, s: 'currency' },
        },
        10: {
          0: { v: 'Utilities', t: 1 },
          1: { v: 300, t: 2, s: 'currency' },
        },
        11: {
          0: { v: 'Food & Groceries', t: 1 },
          1: { v: 600, t: 2, s: 'currency' },
        },
        12: {
          0: { v: 'Transportation', t: 1 },
          1: { v: 400, t: 2, s: 'currency' },
        },
        13: {
          0: { v: 'Insurance', t: 1 },
          1: { v: 200, t: 2, s: 'currency' },
        },
        14: {
          0: { v: 'Entertainment', t: 1 },
          1: { v: 300, t: 2, s: 'currency' },
        },
        15: {
          0: { v: 'Savings', t: 1 },
          1: { v: 1000, t: 2, s: 'currency' },
        },
        16: {
          0: { v: 'Other Expenses', t: 1 },
          1: { v: 200, t: 2, s: 'currency' },
        },
        17: {
          0: { v: 'Total Expenses', t: 1, s: 'total' },
          1: { v: 4500, t: 2, s: 'currency' },
        },
        18: { 0: { v: '', t: 1 } },
        19: {
          0: { v: 'Net Income', t: 1, s: 'total' },
          1: { v: 2000, t: 2, s: 'currency' },
        },
      },
      rowCount: 100,
      columnCount: 10,
      defaultColumnWidth: 120,
      defaultRowHeight: 25,
      rowData: [],
      columnData: [
        { w: 200, hd: 0 }, // Column A: Description
        { w: 120, hd: 0 }, // Column B: Amount
        { w: 100, hd: 0 }, // Column C
        { w: 100, hd: 0 }, // Column D
        { w: 100, hd: 0 }, // Column E
        { w: 100, hd: 0 }, // Column F
        { w: 100, hd: 0 }, // Column G
        { w: 100, hd: 0 }, // Column H
        { w: 100, hd: 0 }, // Column I
        { w: 100, hd: 0 }, // Column J
      ],
    },
  },
}

/**
 * OKR tracker template workbook data
 */
export const OKR_TEMPLATE_DATA = {
  id: 'okr-template',
  locale: LocaleType.EN_US,
  name: 'OKR Tracker',
  sheetOrder: ['okr-sheet'],
  appVersion: '3.0.0-alpha',
  styles: {
    header: { bl: 1, bg: { rgb: '#1d4ed8' }, cl: { rgb: '#ffffff' } },
    objective: { bl: 1, bg: { rgb: '#e0f2fe' } },
    kr: { bg: { rgb: '#f8fafc' } },
  },
  sheets: {
    'okr-sheet': {
      id: 'okr-sheet',
      name: 'OKRs',
      cellData: {
        0: {
          0: { v: 'Objective', t: 1, s: 'header' },
          1: { v: 'Key Result', t: 1, s: 'header' },
          2: { v: 'Owner', t: 1, s: 'header' },
          3: { v: 'Target', t: 1, s: 'header' },
          4: { v: 'Current', t: 1, s: 'header' },
          5: { v: 'Confidence', t: 1, s: 'header' },
        },
        1: {
          0: { v: 'Increase product adoption', t: 1, s: 'objective' },
          1: { v: 'Weekly active users to 15k', t: 1, s: 'kr' },
          2: { v: 'Growth', t: 1 },
          3: { v: 15000, t: 2 },
          4: { v: 9200, t: 2 },
          5: { v: 'Medium', t: 1 },
        },
        2: {
          0: { v: '', t: 1 },
          1: { v: 'Activation rate to 45%', t: 1, s: 'kr' },
          2: { v: 'Product', t: 1 },
          3: { v: 0.45, t: 2 },
          4: { v: 0.32, t: 2 },
          5: { v: 'Medium', t: 1 },
        },
        3: {
          0: { v: 'Delight customers', t: 1, s: 'objective' },
          1: { v: 'CSAT 4.6+', t: 1, s: 'kr' },
          2: { v: 'Support', t: 1 },
          3: { v: 4.6, t: 2 },
          4: { v: 4.4, t: 2 },
          5: { v: 'High', t: 1 },
        },
      },
      rowCount: 100,
      columnCount: 8,
      defaultColumnWidth: 100,
      defaultRowHeight: 25,
      rowData: [],
      columnData: [
        { w: 250, hd: 0 }, // Column A: Objective
        { w: 200, hd: 0 }, // Column B: Key Result
        { w: 100, hd: 0 }, // Column C: Owner
        { w: 80, hd: 0 },  // Column D: Target
        { w: 80, hd: 0 },  // Column E: Current
        { w: 100, hd: 0 }, // Column F: Confidence
      ],
    },
  },
}

/**
 * Task tracker template workbook data
 */
export const TASKS_TEMPLATE_DATA = {
  id: 'tasks-template',
  locale: LocaleType.EN_US,
  name: 'Task Tracker',
  sheetOrder: ['tasks-sheet'],
  appVersion: '3.0.0-alpha',
  styles: {
    header: { bl: 1, bg: { rgb: '#0f172a' }, cl: { rgb: '#ffffff' } },
    todo: { bg: { rgb: '#fff7ed' } },
    doing: { bg: { rgb: '#e0f2fe' } },
    done: { bg: { rgb: '#dcfce7' } },
  },
  sheets: {
    'tasks-sheet': {
      type: SheetTypes.GRID,
      id: 'tasks-sheet',
      name: 'Tasks',
      cellData: {
        0: {
          0: { v: 'Task', t: 1, s: 'header' },
          1: { v: 'Assignee', t: 1, s: 'header' },
          2: { v: 'Status', t: 1, s: 'header' },
          3: { v: 'Due', t: 1, s: 'header' },
          4: { v: 'Notes', t: 1, s: 'header' },
        },
        1: {
          0: { v: 'Scope homepage revamp', t: 1 },
          1: { v: 'Alex', t: 1 },
          2: { v: 'In Progress', t: 1, s: 'doing' },
          3: { v: new Date(Date.now() + 5 * 86400000).toLocaleDateString(), t: 1 },
          4: { v: 'Finalize IA', t: 1 },
        },
        2: {
          0: { v: 'Migrate billing webhooks', t: 1 },
          1: { v: 'Sam', t: 1 },
          2: { v: 'To Do', t: 1, s: 'todo' },
          3: { v: new Date(Date.now() + 10 * 86400000).toLocaleDateString(), t: 1 },
          4: { v: '', t: 1 },
        },
        3: {
          0: { v: 'Publish Q1 roadmap', t: 1 },
          1: { v: 'Taylor', t: 1 },
          2: { v: 'Done', t: 1, s: 'done' },
          3: { v: new Date().toLocaleDateString(), t: 1 },
          4: { v: 'Share with GTM', t: 1 },
        },
      },
    },
  },
}

/**
 * Expense tracker template workbook data
 */
export const EXPENSE_TRACKER_TEMPLATE_DATA = {
  id: 'expense-tracker-template',
  locale: LocaleType.EN_US,
  name: 'Expense Tracker',
  sheetOrder: ['expenses-sheet'],
  appVersion: '3.0.0-alpha',
  styles: {
    'header': {
      bl: 1, // Bold
      bg: { rgb: '#f59e0b' }, // Orange background
      cl: { rgb: '#FFFFFF' }, // White text
    },
    'category': {
      bl: 1,
      bg: { rgb: '#fef3c7' }, // Light orange background
    },
    'currency': {
      nf: { pattern: '"$"#,##0.00' }, // Currency format
    },
    'date': {
      nf: { pattern: 'mm/dd/yyyy' }, // Date format
    },
    'total': {
      bl: 1,
      bg: { rgb: '#f3f4f6' },
    }
  },
  sheets: {
    'expenses-sheet': {
      type: SheetTypes.GRID,
      id: 'expenses-sheet',
      name: 'Expenses',
      cellData: {
        0: {
          0: { v: 'Expense Tracker', t: 1, s: 'header' },
          1: { v: '', t: 1 },
          2: { v: '', t: 1 },
          3: { v: '', t: 1 },
        },
        1: { 0: { v: '', t: 1 } },
        2: {
          0: { v: 'Date', t: 1, s: 'header' },
          1: { v: 'Description', t: 1, s: 'header' },
          2: { v: 'Category', t: 1, s: 'header' },
          3: { v: 'Amount', t: 1, s: 'header' },
        },
        3: {
          0: { v: new Date().toLocaleDateString(), t: 1, s: 'date' },
          1: { v: 'Coffee shop', t: 1 },
          2: { v: 'Food & Dining', t: 1, s: 'category' },
          3: { v: 5.50, t: 2, s: 'currency' },
        },
        4: {
          0: { v: new Date(Date.now() - 86400000).toLocaleDateString(), t: 1, s: 'date' },
          1: { v: 'Gas station', t: 1 },
          2: { v: 'Transportation', t: 1, s: 'category' },
          3: { v: 45.00, t: 2, s: 'currency' },
        },
        5: {
          0: { v: new Date(Date.now() - 86400000).toLocaleDateString(), t: 1, s: 'date' },
          1: { v: 'Grocery store', t: 1 },
          2: { v: 'Food & Dining', t: 1, s: 'category' },
          3: { v: 125.30, t: 2, s: 'currency' },
        },
        6: {
          0: { v: new Date(Date.now() - 2*86400000).toLocaleDateString(), t: 1, s: 'date' },
          1: { v: 'Streaming service', t: 1 },
          2: { v: 'Entertainment', t: 1, s: 'category' },
          3: { v: 14.99, t: 2, s: 'currency' },
        },
        7: {
          0: { v: new Date(Date.now() - 3*86400000).toLocaleDateString(), t: 1, s: 'date' },
          1: { v: 'Pharmacy', t: 1 },
          2: { v: 'Healthcare', t: 1, s: 'category' },
          3: { v: 28.75, t: 2, s: 'currency' },
        },
        8: { 0: { v: '', t: 1 } },
        9: {
          0: { v: 'Total Expenses', t: 1, s: 'total' },
          2: { v: '', t: 1 },
          3: { v: 219.54, t: 2, s: 'currency' },
        },
        10: { 0: { v: '', t: 1 } },
        11: {
          0: { v: 'Summary by Category', t: 1, s: 'header' },
          1: { v: '', t: 1 },
        },
        12: {
          0: { v: 'Food & Dining', t: 1, s: 'category' },
          1: { v: 130.80, t: 2, s: 'currency' },
        },
        13: {
          0: { v: 'Transportation', t: 1, s: 'category' },
          1: { v: 45.00, t: 2, s: 'currency' },
        },
        14: {
          0: { v: 'Entertainment', t: 1, s: 'category' },
          1: { v: 14.99, t: 2, s: 'currency' },
        },
        15: {
          0: { v: 'Healthcare', t: 1, s: 'category' },
          1: { v: 28.75, t: 2, s: 'currency' },
        },
      },
    },
  },
}

/**
 * Project timeline template workbook data
 */
export const PROJECT_TIMELINE_TEMPLATE_DATA = {
  id: 'project-timeline-template',
  locale: LocaleType.EN_US,
  name: 'Project Timeline',
  sheetOrder: ['timeline-sheet'],
  appVersion: '3.0.0-alpha',
  styles: {
    'header': {
      bl: 1, // Bold
      bg: { rgb: '#8b5cf6' }, // Purple background
      cl: { rgb: '#FFFFFF' }, // White text
    },
    'milestone': {
      bl: 1,
      bg: { rgb: '#ede9fe' }, // Light purple background
    },
    'phase': {
      bg: { rgb: '#f3f4f6' }, // Gray background
    },
    'date': {
      nf: { pattern: 'mm/dd/yyyy' }, // Date format
    },
    'status': {
      bl: 1,
    },
    'completed': {
      bg: { rgb: '#dcfce7' }, // Green background
      cl: { rgb: '#166534' }, // Dark green text
    },
    'in-progress': {
      bg: { rgb: '#fef3c7' }, // Yellow background
      cl: { rgb: '#92400e' }, // Dark yellow text
    },
    'not-started': {
      bg: { rgb: '#f3f4f6' }, // Gray background
      cl: { rgb: '#6b7280' }, // Gray text
    }
  },
  sheets: {
    'timeline-sheet': {
      type: SheetTypes.GRID,
      id: 'timeline-sheet',
      name: 'Timeline',
      cellData: {
        0: {
          0: { v: 'Project Timeline', t: 1, s: 'header' },
          1: { v: '', t: 1 },
          2: { v: '', t: 1 },
          3: { v: '', t: 1 },
          4: { v: '', t: 1 },
          5: { v: '', t: 1 },
        },
        1: { 0: { v: '', t: 1 } },
        2: {
          0: { v: 'Phase', t: 1, s: 'header' },
          1: { v: 'Task/Milestone', t: 1, s: 'header' },
          2: { v: 'Owner', t: 1, s: 'header' },
          3: { v: 'Start Date', t: 1, s: 'header' },
          4: { v: 'End Date', t: 1, s: 'header' },
          5: { v: 'Status', t: 1, s: 'header' },
        },
        3: {
          0: { v: 'Phase 1: Planning', t: 1, s: 'phase' },
          1: { v: 'Project kickoff', t: 1, s: 'milestone' },
          2: { v: 'Project Manager', t: 1 },
          3: { v: new Date().toLocaleDateString(), t: 1, s: 'date' },
          4: { v: new Date().toLocaleDateString(), t: 1, s: 'date' },
          5: { v: 'Completed', t: 1, s: 'completed' },
        },
        4: {
          0: { v: '', t: 1 },
          1: { v: 'Requirements gathering', t: 1 },
          2: { v: 'Business Analyst', t: 1 },
          3: { v: new Date(Date.now() + 86400000).toLocaleDateString(), t: 1, s: 'date' },
          4: { v: new Date(Date.now() + 5*86400000).toLocaleDateString(), t: 1, s: 'date' },
          5: { v: 'In Progress', t: 1, s: 'in-progress' },
        },
        5: {
          0: { v: '', t: 1 },
          1: { v: 'Technical design', t: 1 },
          2: { v: 'Lead Developer', t: 1 },
          3: { v: new Date(Date.now() + 3*86400000).toLocaleDateString(), t: 1, s: 'date' },
          4: { v: new Date(Date.now() + 7*86400000).toLocaleDateString(), t: 1, s: 'date' },
          5: { v: 'Not Started', t: 1, s: 'not-started' },
        },
        6: {
          0: { v: 'Phase 2: Development', t: 1, s: 'phase' },
          1: { v: 'Sprint planning', t: 1, s: 'milestone' },
          2: { v: 'Scrum Master', t: 1 },
          3: { v: new Date(Date.now() + 8*86400000).toLocaleDateString(), t: 1, s: 'date' },
          4: { v: new Date(Date.now() + 8*86400000).toLocaleDateString(), t: 1, s: 'date' },
          5: { v: 'Not Started', t: 1, s: 'not-started' },
        },
        7: {
          0: { v: '', t: 1 },
          1: { v: 'Core features development', t: 1 },
          2: { v: 'Development Team', t: 1 },
          3: { v: new Date(Date.now() + 9*86400000).toLocaleDateString(), t: 1, s: 'date' },
          4: { v: new Date(Date.now() + 23*86400000).toLocaleDateString(), t: 1, s: 'date' },
          5: { v: 'Not Started', t: 1, s: 'not-started' },
        },
        8: {
          0: { v: '', t: 1 },
          1: { v: 'Code review', t: 1 },
          2: { v: 'Senior Developer', t: 1 },
          3: { v: new Date(Date.now() + 20*86400000).toLocaleDateString(), t: 1, s: 'date' },
          4: { v: new Date(Date.now() + 25*86400000).toLocaleDateString(), t: 1, s: 'date' },
          5: { v: 'Not Started', t: 1, s: 'not-started' },
        },
        9: {
          0: { v: 'Phase 3: Testing', t: 1, s: 'phase' },
          1: { v: 'Testing kickoff', t: 1, s: 'milestone' },
          2: { v: 'QA Lead', t: 1 },
          3: { v: new Date(Date.now() + 24*86400000).toLocaleDateString(), t: 1, s: 'date' },
          4: { v: new Date(Date.now() + 24*86400000).toLocaleDateString(), t: 1, s: 'date' },
          5: { v: 'Not Started', t: 1, s: 'not-started' },
        },
        10: {
          0: { v: '', t: 1 },
          1: { v: 'Integration testing', t: 1 },
          2: { v: 'QA Team', t: 1 },
          3: { v: new Date(Date.now() + 25*86400000).toLocaleDateString(), t: 1, s: 'date' },
          4: { v: new Date(Date.now() + 30*86400000).toLocaleDateString(), t: 1, s: 'date' },
          5: { v: 'Not Started', t: 1, s: 'not-started' },
        },
        11: {
          0: { v: 'Phase 4: Deployment', t: 1, s: 'phase' },
          1: { v: 'Production release', t: 1, s: 'milestone' },
          2: { v: 'DevOps Team', t: 1 },
          3: { v: new Date(Date.now() + 31*86400000).toLocaleDateString(), t: 1, s: 'date' },
          4: { v: new Date(Date.now() + 31*86400000).toLocaleDateString(), t: 1, s: 'date' },
          5: { v: 'Not Started', t: 1, s: 'not-started' },
        },
        12: { 0: { v: '', t: 1 } },
        13: {
          0: { v: 'Summary', t: 1, s: 'header' },
          1: { v: '', t: 1 },
          2: { v: '', t: 1 },
          3: { v: '', t: 1 },
          4: { v: '', t: 1 },
          5: { v: '', t: 1 },
        },
        14: {
          0: { v: 'Total Duration', t: 1, s: 'status' },
          1: { v: '31 days', t: 1 },
          2: { v: '', t: 1 },
          3: { v: '', t: 1 },
          4: { v: '', t: 1 },
          5: { v: '', t: 1 },
        },
        15: {
          0: { v: 'Team Size', t: 1, s: 'status' },
          1: { v: '8 people', t: 1 },
          2: { v: '', t: 1 },
          3: { v: '', t: 1 },
          4: { v: '', t: 1 },
          5: { v: '', t: 1 },
        },
      },
    },
  },
}

/**
 * Sales CRM template workbook data
 */
export const SALES_CRM_TEMPLATE_DATA = {
  id: 'sales-crm-template',
  locale: LocaleType.EN_US,
  name: 'Sales CRM',
  sheetOrder: ['crm-sheet'],
  appVersion: '3.0.0-alpha',
  styles: {
    'header': {
      bl: 1, // Bold
      bg: { rgb: '#0ea5e9' }, // Blue background
      cl: { rgb: '#FFFFFF' }, // White text
    },
    'stage': {
      bl: 1,
      bg: { rgb: '#e0f2fe' }, // Light blue background
    },
    'currency': {
      nf: { pattern: '"$"#,##0.00' }, // Currency format
    },
    'date': {
      nf: { pattern: 'mm/dd/yyyy' }, // Date format
    },
    'probability': {
      nf: { pattern: '0%' }, // Percentage format
    },
    'hot': {
      bg: { rgb: '#fef2f2' }, // Light red background
      cl: { rgb: '#991b1b' }, // Dark red text
    },
    'warm': {
      bg: { rgb: '#fef3c7' }, // Light yellow background
      cl: { rgb: '#92400e' }, // Dark yellow text
    },
    'cold': {
      bg: { rgb: '#f0f9ff' }, // Light blue background
      cl: { rgb: '#1e40af' }, // Dark blue text
    }
  },
  sheets: {
    'crm-sheet': {
      type: SheetTypes.GRID,
      id: 'crm-sheet',
      name: 'Sales Pipeline',
      cellData: {
        0: {
          0: { v: 'Sales Pipeline', t: 1, s: 'header' },
          1: { v: '', t: 1 },
          2: { v: '', t: 1 },
          3: { v: '', t: 1 },
          4: { v: '', t: 1 },
          5: { v: '', t: 1 },
          6: { v: '', t: 1 },
          7: { v: '', t: 1 },
        },
        1: { 0: { v: '', t: 1 } },
        2: {
          0: { v: 'Deal Name', t: 1, s: 'header' },
          1: { v: 'Company', t: 1, s: 'header' },
          2: { v: 'Contact', t: 1, s: 'header' },
          3: { v: 'Stage', t: 1, s: 'header' },
          4: { v: 'Amount', t: 1, s: 'header' },
          5: { v: 'Probability', t: 1, s: 'header' },
          6: { v: 'Expected Close', t: 1, s: 'header' },
          7: { v: 'Status', t: 1, s: 'header' },
        },
        3: {
          0: { v: 'Enterprise Software Deal', t: 1 },
          1: { v: 'Tech Corp Inc', t: 1 },
          2: { v: 'John Smith', t: 1 },
          3: { v: 'Proposal', t: 1, s: 'stage' },
          4: { v: 125000, t: 2, s: 'currency' },
          5: { v: 0.75, t: 2, s: 'probability' },
          6: { v: new Date(Date.now() + 14*86400000).toLocaleDateString(), t: 1, s: 'date' },
          7: { v: 'Hot', t: 1, s: 'hot' },
        },
        4: {
          0: { v: 'Marketing Automation', t: 1 },
          1: { v: 'Global Marketing Ltd', t: 1 },
          2: { v: 'Sarah Johnson', t: 1 },
          3: { v: 'Negotiation', t: 1, s: 'stage' },
          4: { v: 45000, t: 2, s: 'currency' },
          5: { v: 0.90, t: 2, s: 'probability' },
          6: { v: new Date(Date.now() + 7*86400000).toLocaleDateString(), t: 1, s: 'date' },
          7: { v: 'Hot', t: 1, s: 'hot' },
        },
        5: {
          0: { v: 'Cloud Migration', t: 1 },
          1: { v: 'Data Systems Co', t: 1 },
          2: { v: 'Mike Chen', t: 1 },
          3: { v: 'Discovery', t: 1, s: 'stage' },
          4: { v: 280000, t: 2, s: 'currency' },
          5: { v: 0.25, t: 2, s: 'probability' },
          6: { v: new Date(Date.now() + 45*86400000).toLocaleDateString(), t: 1, s: 'date' },
          7: { v: 'Warm', t: 1, s: 'warm' },
        },
        6: {
          0: { v: 'Mobile App Development', t: 1 },
          1: { v: 'StartupXYZ', t: 1 },
          2: { v: 'Emily Davis', t: 1 },
          3: { v: 'Qualification', t: 1, s: 'stage' },
          4: { v: 75000, t: 2, s: 'currency' },
          5: { v: 0.15, t: 2, s: 'probability' },
          6: { v: new Date(Date.now() + 60*86400000).toLocaleDateString(), t: 1, s: 'date' },
          7: { v: 'Cold', t: 1, s: 'cold' },
        },
        7: {
          0: { v: 'AI Integration Project', t: 1 },
          1: { v: 'Innovation Labs', t: 1 },
          2: { v: 'Robert Wilson', t: 1 },
          3: { v: 'Demo Scheduled', t: 1, s: 'stage' },
          4: { v: 150000, t: 2, s: 'currency' },
          5: { v: 0.40, t: 2, s: 'probability' },
          6: { v: new Date(Date.now() + 21*86400000).toLocaleDateString(), t: 1, s: 'date' },
          7: { v: 'Warm', t: 1, s: 'warm' },
        },
        8: {
          0: { v: 'Security Audit Service', t: 1 },
          1: { v: 'Finance Corp', t: 1 },
          2: { v: 'Lisa Anderson', t: 1 },
          3: { v: 'Initial Contact', t: 1, s: 'stage' },
          4: { v: 35000, t: 2, s: 'currency' },
          5: { v: 0.10, t: 2, s: 'probability' },
          6: { v: new Date(Date.now() + 90*86400000).toLocaleDateString(), t: 1, s: 'date' },
          7: { v: 'Cold', t: 1, s: 'cold' },
        },
        9: { 0: { v: '', t: 1 } },
        10: {
          0: { v: 'Pipeline Summary', t: 1, s: 'header' },
          1: { v: '', t: 1 },
          2: { v: '', t: 1 },
          3: { v: '', t: 1 },
          4: { v: '', t: 1 },
          5: { v: '', t: 1 },
          6: { v: '', t: 1 },
          7: { v: '', t: 1 },
        },
        11: {
          0: { v: 'Total Pipeline Value', t: 1, s: 'stage' },
          1: { v: '$710,000', t: 1, s: 'currency' },
          2: { v: '', t: 1 },
          3: { v: '', t: 1 },
          4: { v: '', t: 1 },
          5: { v: '', t: 1 },
          6: { v: '', t: 1 },
          7: { v: '', t: 1 },
        },
        12: {
          0: { v: 'Weighted Pipeline', t: 1, s: 'stage' },
          1: { v: '$356,500', t: 1, s: 'currency' },
          2: { v: '', t: 1 },
          3: { v: '', t: 1 },
          4: { v: '', t: 1 },
          5: { v: '', t: 1 },
          6: { v: '', t: 1 },
          7: { v: '', t: 1 },
        },
        13: {
          0: { v: 'Hot Deals (2)', t: 1, s: 'hot' },
          1: { v: '$170,000', t: 1, s: 'currency' },
          2: { v: '', t: 1 },
          3: { v: '', t: 1 },
          4: { v: '', t: 1 },
          5: { v: '', t: 1 },
          6: { v: '', t: 1 },
          7: { v: '', t: 1 },
        },
        14: {
          0: { v: 'Warm Deals (2)', t: 1, s: 'warm' },
          1: { v: '$355,000', t: 1, s: 'currency' },
          2: { v: '', t: 1 },
          3: { v: '', t: 1 },
          4: { v: '', t: 1 },
          5: { v: '', t: 1 },
          6: { v: '', t: 1 },
          7: { v: '', t: 1 },
        },
        15: {
          0: { v: 'Cold Deals (2)', t: 1, s: 'cold' },
          1: { v: '$110,000', t: 1, s: 'currency' },
          2: { v: '', t: 1 },
          3: { v: '', t: 1 },
          4: { v: '', t: 1 },
          5: { v: '', t: 1 },
          6: { v: '', t: 1 },
          7: { v: '', t: 1 },
        },
      },
    },
  },
}

/**
 * Inventory tracker template workbook data
 */
export const INVENTORY_TRACKER_TEMPLATE_DATA = {
  id: 'inventory-tracker-template',
  locale: LocaleType.EN_US,
  name: 'Inventory Tracker',
  sheetOrder: ['inventory-sheet'],
  appVersion: '3.0.0-alpha',
  styles: {
    'header': {
      bl: 1, // Bold
      bg: { rgb: '#ef4444' }, // Red background
      cl: { rgb: '#FFFFFF' }, // White text
    },
    'low-stock': {
      bg: { rgb: '#fef2f2' }, // Light red background
      cl: { rgb: '#991b1b' }, // Dark red text
    },
    'reorder': {
      bg: { rgb: '#fef3c7' }, // Light yellow background
      cl: { rgb: '#92400e' }, // Dark yellow text
    },
    'good-stock': {
      bg: { rgb: '#f0fdf4' }, // Light green background
      cl: { rgb: '#166534' }, // Dark green text
    },
    'currency': {
      nf: { pattern: '"$"#,##0.00' }, // Currency format
    },
    'number': {
      nf: { pattern: '#,##0' }, // Number format
    }
  },
  sheets: {
    'inventory-sheet': {
      type: SheetTypes.GRID,
      id: 'inventory-sheet',
      name: 'Inventory',
      cellData: {
        0: {
          0: { v: 'Inventory Tracker', t: 1, s: 'header' },
          1: { v: '', t: 1 },
          2: { v: '', t: 1 },
          3: { v: '', t: 1 },
          4: { v: '', t: 1 },
          5: { v: '', t: 1 },
          6: { v: '', t: 1 },
          7: { v: '', t: 1 },
        },
        1: { 0: { v: '', t: 1 } },
        2: {
          0: { v: 'SKU', t: 1, s: 'header' },
          1: { v: 'Product Name', t: 1, s: 'header' },
          2: { v: 'Category', t: 1, s: 'header' },
          3: { v: 'Current Stock', t: 1, s: 'header' },
          4: { v: 'Reorder Level', t: 1, s: 'header' },
          5: { v: 'Unit Price', t: 1, s: 'header' },
          6: { v: 'Total Value', t: 1, s: 'header' },
          7: { v: 'Status', t: 1, s: 'header' },
        },
        3: {
          0: { v: 'LAP-001', t: 1 },
          1: { v: 'Laptop Pro 15"', t: 1 },
          2: { v: 'Electronics', t: 1 },
          3: { v: 8, t: 2, s: 'number' },
          4: { v: 10, t: 2, s: 'number' },
          5: { v: 1299.99, t: 2, s: 'currency' },
          6: { v: 10399.92, t: 2, s: 'currency' },
          7: { v: 'Reorder Soon', t: 1, s: 'reorder' },
        },
        4: {
          0: { v: 'MOU-002', t: 1 },
          1: { v: 'Wireless Mouse', t: 1 },
          2: { v: 'Accessories', t: 1 },
          3: { v: 45, t: 2, s: 'number' },
          4: { v: 20, t: 2, s: 'number' },
          5: { v: 29.99, t: 2, s: 'currency' },
          6: { v: 1349.55, t: 2, s: 'currency' },
          7: { v: 'Good Stock', t: 1, s: 'good-stock' },
        },
        5: {
          0: { v: 'KEY-003', t: 1 },
          1: { v: 'Mechanical Keyboard', t: 1 },
          2: { v: 'Accessories', t: 1 },
          3: { v: 12, t: 2, s: 'number' },
          4: { v: 15, t: 2, s: 'number' },
          5: { v: 89.99, t: 2, s: 'currency' },
          6: { v: 1079.88, t: 2, s: 'currency' },
          7: { v: 'Reorder Soon', t: 1, s: 'reorder' },
        },
        6: {
          0: { v: 'MON-004', t: 1 },
          1: { v: '4K Monitor 27"', t: 1 },
          2: { v: 'Electronics', t: 1 },
          3: { v: 3, t: 2, s: 'number' },
          4: { v: 8, t: 2, s: 'number' },
          5: { v: 399.99, t: 2, s: 'currency' },
          6: { v: 1199.97, t: 2, s: 'currency' },
          7: { v: 'Low Stock', t: 1, s: 'low-stock' },
        },
        7: {
          0: { v: 'CHA-005', t: 1 },
          1: { v: 'USB-C Cable 2m', t: 1 },
          2: { v: 'Accessories', t: 1 },
          3: { v: 120, t: 2, s: 'number' },
          4: { v: 50, t: 2, s: 'number' },
          5: { v: 12.99, t: 2, s: 'currency' },
          6: { v: 1558.80, t: 2, s: 'currency' },
          7: { v: 'Good Stock', t: 1, s: 'good-stock' },
        },
        8: {
          0: { v: 'DES-006', t: 1 },
          1: { v: 'Standing Desk', t: 1 },
          2: { v: 'Furniture', t: 1 },
          3: { v: 6, t: 2, s: 'number' },
          4: { v: 5, t: 2, s: 'number' },
          5: { v: 499.99, t: 2, s: 'currency' },
          6: { v: 2999.94, t: 2, s: 'currency' },
          7: { v: 'Low Stock', t: 1, s: 'low-stock' },
        },
        9: {
          0: { v: 'PRI-007', t: 1 },
          1: { v: 'Inkjet Printer', t: 1 },
          2: { v: 'Office', t: 1 },
          3: { v: 18, t: 2, s: 'number' },
          4: { v: 10, t: 2, s: 'number' },
          5: { v: 149.99, t: 2, s: 'currency' },
          6: { v: 2699.82, t: 2, s: 'currency' },
          7: { v: 'Good Stock', t: 1, s: 'good-stock' },
        },
        10: {
          0: { v: 'PAP-008', t: 1 },
          1: { v: 'A4 Paper (500 sheets)', t: 1 },
          2: { v: 'Office', t: 1 },
          3: { v: 85, t: 2, s: 'number' },
          4: { v: 30, t: 2, s: 'number' },
          5: { v: 8.99, t: 2, s: 'currency' },
          6: { v: 764.15, t: 2, s: 'currency' },
          7: { v: 'Good Stock', t: 1, s: 'good-stock' },
        },
        11: {
          0: { v: 'TAB-009', t: 1 },
          1: { v: 'Tablet 10"', t: 1 },
          2: { v: 'Electronics', t: 1 },
          3: { v: 4, t: 2, s: 'number' },
          4: { v: 6, t: 2, s: 'number' },
          5: { v: 249.99, t: 2, s: 'currency' },
          6: { v: 999.96, t: 2, s: 'currency' },
          7: { v: 'Low Stock', t: 1, s: 'low-stock' },
        },
        12: { 0: { v: '', t: 1 } },
        13: {
          0: { v: 'Inventory Summary', t: 1, s: 'header' },
          1: { v: '', t: 1 },
          2: { v: '', t: 1 },
          3: { v: '', t: 1 },
          4: { v: '', t: 1 },
          5: { v: '', t: 1 },
          6: { v: '', t: 1 },
          7: { v: '', t: 1 },
        },
        14: {
          0: { v: 'Total Products', t: 1, s: 'header' },
          1: { v: 9, t: 2, s: 'number' },
          2: { v: '', t: 1 },
          3: { v: '', t: 1 },
          4: { v: '', t: 1 },
          5: { v: '', t: 1 },
          6: { v: '', t: 1 },
          7: { v: '', t: 1 },
        },
        15: {
          0: { v: 'Total Items in Stock', t: 1, s: 'header' },
          1: { v: 311, t: 2, s: 'number' },
          2: { v: '', t: 1 },
          3: { v: '', t: 1 },
          4: { v: '', t: 1 },
          5: { v: '', t: 1 },
          6: { v: '', t: 1 },
          7: { v: '', t: 1 },
        },
        16: {
          0: { v: 'Total Inventory Value', t: 1, s: 'header' },
          1: { v: 23352.99, t: 2, s: 'currency' },
          2: { v: '', t: 1 },
          3: { v: '', t: 1 },
          4: { v: '', t: 1 },
          5: { v: '', t: 1 },
          6: { v: '', t: 1 },
          7: { v: '', t: 1 },
        },
        17: {
          0: { v: 'Low Stock Items', t: 1, s: 'low-stock' },
          1: { v: 3, t: 2, s: 'number' },
          2: { v: '', t: 1 },
          3: { v: '', t: 1 },
          4: { v: '', t: 1 },
          5: { v: '', t: 1 },
          6: { v: '', t: 1 },
          7: { v: '', t: 1 },
        },
      },
    },
  },
}

/**
 * Content calendar template workbook data
 */
export const CONTENT_CALENDAR_TEMPLATE_DATA = {
  id: 'content-calendar-template',
  locale: LocaleType.EN_US,
  name: 'Content Calendar',
  sheetOrder: ['calendar-sheet'],
  appVersion: '3.0.0-alpha',
  styles: {
    'header': {
      bl: 1, // Bold
      bg: { rgb: '#6366f1' }, // Indigo background
      cl: { rgb: '#FFFFFF' }, // White text
    },
    'channel': {
      bl: 1,
      bg: { rgb: '#e0e7ff' }, // Light indigo background
    },
    'status': {
      bl: 1,
    },
    'published': {
      bg: { rgb: '#dcfce7' }, // Green background
      cl: { rgb: '#166534' }, // Dark green text
    },
    'scheduled': {
      bg: { rgb: '#dbeafe' }, // Blue background
      cl: { rgb: '#1e40af' }, // Dark blue text
    },
    'in-progress': {
      bg: { rgb: '#fef3c7' }, // Yellow background
      cl: { rgb: '#92400e' }, // Dark yellow text
    },
    'idea': {
      bg: { rgb: '#f3f4f6' }, // Gray background
      cl: { rgb: '#6b7280' }, // Gray text
    },
    'date': {
      nf: { pattern: 'mm/dd/yyyy' }, // Date format
    }
  },
  sheets: {
    'calendar-sheet': {
      type: SheetTypes.GRID,
      id: 'calendar-sheet',
      name: 'Content Calendar',
      cellData: {
        0: {
          0: { v: 'Content Calendar', t: 1, s: 'header' },
          1: { v: '', t: 1 },
          2: { v: '', t: 1 },
          3: { v: '', t: 1 },
          4: { v: '', t: 1 },
          5: { v: '', t: 1 },
          6: { v: '', t: 1 },
          7: { v: '', t: 1 },
        },
        1: { 0: { v: '', t: 1 } },
        2: {
          0: { v: 'Publish Date', t: 1, s: 'header' },
          1: { v: 'Content Title', t: 1, s: 'header' },
          2: { v: 'Channel', t: 1, s: 'header' },
          3: { v: 'Content Type', t: 1, s: 'header' },
          4: { v: 'Author', t: 1, s: 'header' },
          5: { v: 'Status', t: 1, s: 'header' },
          6: { v: 'Target Audience', t: 1, s: 'header' },
          7: { v: 'Notes', t: 1, s: 'header' },
        },
        3: {
          0: { v: new Date().toLocaleDateString(), t: 1, s: 'date' },
          1: { v: '10 Tips for Remote Work Success', t: 1 },
          2: { v: 'Blog', t: 1, s: 'channel' },
          3: { v: 'Article', t: 1 },
          4: { v: 'Sarah Chen', t: 1 },
          5: { v: 'Published', t: 1, s: 'published' },
          6: { v: 'Remote workers', t: 1 },
          7: { v: 'SEO optimized', t: 1 },
        },
        4: {
          0: { v: new Date(Date.now() + 86400000).toLocaleDateString(), t: 1, s: 'date' },
          1: { v: 'Product Demo Video', t: 1 },
          2: { v: 'YouTube', t: 1, s: 'channel' },
          3: { v: 'Video', t: 1 },
          4: { v: 'Mike Johnson', t: 1 },
          5: { v: 'Scheduled', t: 1, s: 'scheduled' },
          6: { v: 'Potential customers', t: 1 },
          7: { v: '3-minute demo', t: 1 },
        },
        5: {
          0: { v: new Date(Date.now() + 2*86400000).toLocaleDateString(), t: 1, s: 'date' },
          1: { v: 'Industry Trends Report', t: 1 },
          2: { v: 'LinkedIn', t: 1, s: 'channel' },
          3: { v: 'Infographic', t: 1 },
          4: { v: 'Emily Davis', t: 1 },
          5: { v: 'In Progress', t: 1, s: 'in-progress' },
          6: { v: 'B2B professionals', t: 1 },
          7: { v: 'Q3 data analysis', t: 1 },
        },
        6: {
          0: { v: new Date(Date.now() + 3*86400000).toLocaleDateString(), t: 1, s: 'date' },
          1: { v: 'Customer Success Story', t: 1 },
          2: { v: 'Blog', t: 1, s: 'channel' },
          3: { v: 'Case Study', t: 1 },
          4: { v: 'Alex Rivera', t: 1 },
          5: { v: 'Idea', t: 1, s: 'idea' },
          6: { v: 'Enterprise prospects', t: 1 },
          7: { v: 'Interview scheduled', t: 1 },
        },
        7: {
          0: { v: new Date(Date.now() + 4*86400000).toLocaleDateString(), t: 1, s: 'date' },
          1: { v: 'Weekly Tech Tips', t: 1 },
          2: { v: 'Twitter', t: 1, s: 'channel' },
          3: { v: 'Thread', t: 1 },
          4: { v: 'Chris Lee', t: 1 },
          5: { v: 'Scheduled', t: 1, s: 'scheduled' },
          6: { v: 'Developers', t: 1 },
          7: { v: 'Part 4 of series', t: 1 },
        },
        8: {
          0: { v: new Date(Date.now() + 5*86400000).toLocaleDateString(), t: 1, s: 'date' },
          1: { v: 'Product Launch Announcement', t: 1 },
          2: { v: 'Email Newsletter', t: 1, s: 'channel' },
          3: { v: 'Newsletter', t: 1 },
          4: { v: 'Marketing Team', t: 1 },
          5: { v: 'In Progress', t: 1, s: 'in-progress' },
          6: { v: 'All subscribers', t: 1 },
          7: { v: 'Major launch', t: 1 },
        },
        9: {
          0: { v: new Date(Date.now() + 7*86400000).toLocaleDateString(), t: 1, s: 'date' },
          1: { v: 'How-to Guide: Getting Started', t: 1 },
          2: { v: 'Blog', t: 1, s: 'channel' },
          3: { v: 'Tutorial', t: 1 },
          4: { v: 'Jamie Wilson', t: 1 },
          5: { v: 'Idea', t: 1, s: 'idea' },
          6: { v: 'New users', t: 1 },
          7: { v: 'Include screenshots', t: 1 },
        },
        10: {
          0: { v: new Date(Date.now() + 10*86400000).toLocaleDateString(), t: 1, s: 'date' },
          1: { v: 'Behind the Scenes: Team Culture', t: 1 },
          2: { v: 'Instagram', t: 1, s: 'channel' },
          3: { v: 'Reels', t: 1 },
          4: { v: 'Social Media Team', t: 1 },
          5: { v: 'Idea', t: 1, s: 'idea' },
          6: { v: 'General audience', t: 1 },
          7: { v: 'Team photos needed', t: 1 },
        },
        11: {
          0: { v: new Date(Date.now() + 14*86400000).toLocaleDateString(), t: 1, s: 'date' },
          1: { v: 'Q3 Results Webinar', t: 1 },
          2: { v: 'Webinar', t: 1, s: 'channel' },
          3: { v: 'Webinar', t: 1 },
          4: { v: 'CEO + Sales Team', t: 1 },
          5: { v: 'Scheduled', t: 1, s: 'scheduled' },
          6: { v: 'Investors & Partners', t: 1 },
          7: { v: 'Registration open', t: 1 },
        },
        12: { 0: { v: '', t: 1 } },
        13: {
          0: { v: 'Content Summary', t: 1, s: 'header' },
          1: { v: '', t: 1 },
          2: { v: '', t: 1 },
          3: { v: '', t: 1 },
          4: { v: '', t: 1 },
          5: { v: '', t: 1 },
          6: { v: '', t: 1 },
          7: { v: '', t: 1 },
        },
        14: {
          0: { v: 'Total Content Pieces', t: 1, s: 'channel' },
          1: { v: 9, t: 2 },
          2: { v: '', t: 1 },
          3: { v: '', t: 1 },
          4: { v: '', t: 1 },
          5: { v: '', t: 1 },
          6: { v: '', t: 1 },
          7: { v: '', t: 1 },
        },
        15: {
          0: { v: 'Published', t: 1, s: 'published' },
          1: { v: 1, t: 2 },
          2: { v: '', t: 1 },
          3: { v: '', t: 1 },
          4: { v: '', t: 1 },
          5: { v: '', t: 1 },
          6: { v: '', t: 1 },
          7: { v: '', t: 1 },
        },
        16: {
          0: { v: 'Scheduled', t: 1, s: 'scheduled' },
          1: { v: 3, t: 2 },
          2: { v: '', t: 1 },
          3: { v: '', t: 1 },
          4: { v: '', t: 1 },
          5: { v: '', t: 1 },
          6: { v: '', t: 1 },
          7: { v: '', t: 1 },
        },
        17: {
          0: { v: 'In Progress', t: 1, s: 'in-progress' },
          1: { v: 2, t: 2 },
          2: { v: '', t: 1 },
          3: { v: '', t: 1 },
          4: { v: '', t: 1 },
          5: { v: '', t: 1 },
          6: { v: '', t: 1 },
          7: { v: '', t: 1 },
        },
        18: {
          0: { v: 'Ideas', t: 1, s: 'idea' },
          1: { v: 3, t: 2 },
          2: { v: '', t: 1 },
          3: { v: '', t: 1 },
          4: { v: '', t: 1 },
          5: { v: '', t: 1 },
          6: { v: '', t: 1 },
          7: { v: '', t: 1 },
        },
      },
    },
  },
}

/**
 * Invoice template workbook data
 */
export const INVOICE_TEMPLATE_DATA = {
  id: 'invoice-template',
  locale: LocaleType.EN_US,
  name: 'Invoice Template',
  sheetOrder: ['invoice-sheet'],
  appVersion: '3.0.0-alpha',
  styles: {
    'header': {
      bl: 1, // Bold
      bg: { rgb: '#1F2937' }, // Dark gray background
      cl: { rgb: '#FFFFFF' }, // White text
    },
    'company': {
      bl: 1,
      fs: 18, // Font size
    },
    'invoice-title': {
      bl: 1,
      fs: 24,
      cl: { rgb: '#1F2937' },
    },
    'table-header': {
      bl: 1,
      bg: { rgb: '#F3F4F6' },
    },
    'currency': {
      nf: { pattern: '"$"#,##0.00' },
    },
    'total': {
      bl: 1,
      bg: { rgb: '#EEF2FF' },
    }
  },
  sheets: {
    'invoice-sheet': {
      type: SheetTypes.GRID,
      id: 'invoice-sheet',
      name: 'Invoice',
      cellData: {
        0: {
          0: { v: 'Your Company Name', t: 1, s: 'company' },
          4: { v: 'INVOICE', t: 1, s: 'invoice-title' },
        },
        1: {
          0: { v: '123 Business Street', t: 1 },
          4: { v: 'Invoice #: INV-001', t: 1 },
        },
        2: {
          0: { v: 'City, State 12345', t: 1 },
          4: { v: 'Date: ' + new Date().toLocaleDateString(), t: 1 },
        },
        3: {
          0: { v: 'Phone: (555) 123-4567', t: 1 },
          4: { v: 'Due Date: ' + new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString(), t: 1 },
        },
        4: { 0: { v: '', t: 1 } },
        5: {
          0: { v: 'Bill To:', t: 1, s: 'header' },
        },
        6: {
          0: { v: 'Client Name', t: 1 },
        },
        7: {
          0: { v: 'Client Address', t: 1 },
        },
        8: {
          0: { v: 'City, State ZIP', t: 1 },
        },
        9: { 0: { v: '', t: 1 } },
        10: {
          0: { v: 'Description', t: 1, s: 'table-header' },
          1: { v: 'Quantity', t: 1, s: 'table-header' },
          2: { v: 'Rate', t: 1, s: 'table-header' },
          3: { v: 'Amount', t: 1, s: 'table-header' },
        },
        11: {
          0: { v: 'Web Development Services', t: 1 },
          1: { v: 40, t: 2 },
          2: { v: 75, t: 2, s: 'currency' },
          3: { v: 3000, t: 2, s: 'currency' },
        },
        12: {
          0: { v: 'Design Consultation', t: 1 },
          1: { v: 10, t: 2 },
          2: { v: 100, t: 2, s: 'currency' },
          3: { v: 1000, t: 2, s: 'currency' },
        },
        13: {
          0: { v: 'Project Management', t: 1 },
          1: { v: 20, t: 2 },
          2: { v: 50, t: 2, s: 'currency' },
          3: { v: 1000, t: 2, s: 'currency' },
        },
        14: { 0: { v: '', t: 1 } },
        15: {
          2: { v: 'Subtotal:', t: 1, s: 'total' },
          3: { v: 5000, t: 2, s: 'currency' },
        },
        16: {
          2: { v: 'Tax (8.5%):', t: 1 },
          3: { v: 425, t: 2, s: 'currency' },
        },
        17: {
          2: { v: 'Total:', t: 1, s: 'total' },
          3: { v: 5425, t: 2, s: 'currency' },
        },
        18: { 0: { v: '', t: 1 } },
        19: {
          0: { v: 'Notes:', t: 1, s: 'header' },
        },
        20: {
          0: { v: 'Payment is due within 30 days of invoice date.', t: 1 },
        },
        21: {
          0: { v: 'Thank you for your business!', t: 1 },
        },
      },
    },
  },
}
