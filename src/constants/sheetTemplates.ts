import * as defaultIcons from "@iconify-prerendered/vue-file-icons";
import type { IWorkbookData } from "@univerjs/core";
import {
  DEFAULT_WORKBOOK_DATA,
  BUDGET_TEMPLATE_DATA,
  EXPENSE_TRACKER_TEMPLATE_DATA,
  PROJECT_TIMELINE_TEMPLATE_DATA,
  SALES_CRM_TEMPLATE_DATA,
  INVENTORY_TRACKER_TEMPLATE_DATA,
  CONTENT_CALENDAR_TEMPLATE_DATA,
  INVOICE_TEMPLATE_DATA,
  OKR_TEMPLATE_DATA,
  TASKS_TEMPLATE_DATA,
} from "@/assets/default-workbook-data";

export type SpreadsheetTemplateSlug =
  | "blank"
  | "budget"
  | "expenses"
  | "timeline"
  | "crm"
  | "inventory"
  | "calendar"
  | "invoice"
  | "okr"
  | "tasks";

export interface SpreadsheetTemplateDefinition {
  name: string;
  slug: SpreadsheetTemplateSlug;
  subtitle: string;
  badge: string;
  icon: any;
  previewStyle: string;
  workbookTitle: string;
  workbookData: IWorkbookData;
}

function cloneWorkbookData(data: IWorkbookData): IWorkbookData {
  return JSON.parse(JSON.stringify(data));
}

export const spreadsheetTemplateDefinitions: SpreadsheetTemplateDefinition[] = [
  {
    name: "Blank Spreadsheet",
    slug: "blank",
    subtitle: "Start from scratch",
    badge: "Blank",
    icon: defaultIcons.IconMicrosoftExcel,
    previewStyle: "background: linear-gradient(135deg, #2563eb 0%, #60a5fa 100%);",
    workbookTitle: "New Spreadsheet",
    workbookData: cloneWorkbookData(DEFAULT_WORKBOOK_DATA as IWorkbookData),
  },
  {
    name: "Monthly Budget",
    slug: "budget",
    subtitle: "Income, expenses, savings",
    badge: "Finance",
    icon: defaultIcons.IconMicrosoftExcel,
    previewStyle: "background: linear-gradient(135deg, #16a34a 0%, #4ade80 100%);",
    workbookTitle: "Monthly Budget",
    workbookData: cloneWorkbookData(BUDGET_TEMPLATE_DATA as IWorkbookData),
  },
  {
    name: "Expense Tracker",
    slug: "expenses",
    subtitle: "Receipts & categories",
    badge: "Tracker",
    icon: defaultIcons.IconMicrosoftExcel,
    previewStyle: "background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);",
    workbookTitle: "Expense Tracker",
    workbookData: cloneWorkbookData(EXPENSE_TRACKER_TEMPLATE_DATA as IWorkbookData),
  },
  {
    name: "Project Timeline",
    slug: "timeline",
    subtitle: "Milestones & owners",
    badge: "Project",
    icon: defaultIcons.IconMicrosoftExcel,
    previewStyle: "background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);",
    workbookTitle: "Project Timeline",
    workbookData: cloneWorkbookData(PROJECT_TIMELINE_TEMPLATE_DATA as IWorkbookData),
  },
  {
    name: "Sales CRM",
    slug: "crm",
    subtitle: "Pipeline & deals",
    badge: "Sales",
    icon: defaultIcons.IconMicrosoftExcel,
    previewStyle: "background: linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%);",
    workbookTitle: "Sales CRM",
    workbookData: cloneWorkbookData(SALES_CRM_TEMPLATE_DATA as IWorkbookData),
  },
  {
    name: "Inventory Tracker",
    slug: "inventory",
    subtitle: "Stock, reorder levels",
    badge: "Ops",
    icon: defaultIcons.IconMicrosoftExcel,
    previewStyle: "background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);",
    workbookTitle: "Inventory Tracker",
    workbookData: cloneWorkbookData(INVENTORY_TRACKER_TEMPLATE_DATA as IWorkbookData),
  },
  {
    name: "Content Calendar",
    slug: "calendar",
    subtitle: "Campaigns & channels",
    badge: "Marketing",
    icon: defaultIcons.IconMicrosoftExcel,
    previewStyle: "background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);",
    workbookTitle: "Content Calendar",
    workbookData: cloneWorkbookData(CONTENT_CALENDAR_TEMPLATE_DATA as IWorkbookData),
  },
  {
    name: "Invoice",
    slug: "invoice",
    subtitle: "Bill clients fast",
    badge: "Billing",
    icon: defaultIcons.IconMicrosoftExcel,
    previewStyle: "background: linear-gradient(135deg, #0f172a 0%, #334155 100%);",
    workbookTitle: "Invoice",
    workbookData: cloneWorkbookData(INVOICE_TEMPLATE_DATA as IWorkbookData),
  },
  {
    name: "OKR Tracker",
    slug: "okr",
    subtitle: "Objectives & key results",
    badge: "Strategy",
    icon: defaultIcons.IconMicrosoftExcel,
    previewStyle: "background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);",
    workbookTitle: "OKR Tracker",
    workbookData: cloneWorkbookData(OKR_TEMPLATE_DATA as IWorkbookData),
  },
  {
    name: "Task Tracker",
    slug: "tasks",
    subtitle: "To-dos & owners",
    badge: "Productivity",
    icon: defaultIcons.IconMicrosoftExcel,
    previewStyle: "background: linear-gradient(135deg, #0f172a 0%, #475569 100%);",
    workbookTitle: "Task Tracker",
    workbookData: cloneWorkbookData(TASKS_TEMPLATE_DATA as IWorkbookData),
  },
];

export const spreadsheetTemplateMap = spreadsheetTemplateDefinitions.reduce(
  (acc, template) => {
    acc[template.slug] = template;
    return acc;
  },
  {} as Record<SpreadsheetTemplateSlug, SpreadsheetTemplateDefinition>,
);
