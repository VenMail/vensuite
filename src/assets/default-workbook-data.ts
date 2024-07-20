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
  name: 'starter',
  sheetOrder: ['sheet-01'],
  appVersion: '3.0.0-alpha',
  sheets: {
    'sheet-01': {
      type: SheetTypes.GRID,
      id: 'sheet-01',
      name: 'sheet1',
      cellData: {},
    },
  },
}
