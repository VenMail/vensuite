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
      type: SheetTypes.GRID,
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
