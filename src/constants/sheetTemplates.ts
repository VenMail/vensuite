import * as defaultIcons from "@iconify-prerendered/vue-file-icons";
import type { IVTableSheetOptions } from "@visactor/vtable-sheet";
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
  workbookData: IVTableSheetOptions;
}

export function cloneSpreadsheetWorkbookData(data: IVTableSheetOptions): IVTableSheetOptions {
  return JSON.parse(JSON.stringify(data));
}

function toTemplateLookupKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
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
    workbookData: cloneSpreadsheetWorkbookData(DEFAULT_WORKBOOK_DATA),
  },
  {
    name: "Monthly Budget",
    slug: "budget",
    subtitle: "Income, expenses, savings",
    badge: "Finance",
    icon: defaultIcons.IconMicrosoftExcel,
    previewStyle: "background: linear-gradient(135deg, #16a34a 0%, #4ade80 100%);",
    workbookTitle: "Monthly Budget",
    workbookData: cloneSpreadsheetWorkbookData(BUDGET_TEMPLATE_DATA),
  },
  {
    name: "Expense Tracker",
    slug: "expenses",
    subtitle: "Receipts & categories",
    badge: "Tracker",
    icon: defaultIcons.IconMicrosoftExcel,
    previewStyle: "background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);",
    workbookTitle: "Expense Tracker",
    workbookData: cloneSpreadsheetWorkbookData(EXPENSE_TRACKER_TEMPLATE_DATA),
  },
  {
    name: "Project Timeline",
    slug: "timeline",
    subtitle: "Milestones & owners",
    badge: "Project",
    icon: defaultIcons.IconMicrosoftExcel,
    previewStyle: "background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);",
    workbookTitle: "Project Timeline",
    workbookData: cloneSpreadsheetWorkbookData(PROJECT_TIMELINE_TEMPLATE_DATA),
  },
  {
    name: "Sales CRM",
    slug: "crm",
    subtitle: "Pipeline & deals",
    badge: "Sales",
    icon: defaultIcons.IconMicrosoftExcel,
    previewStyle: "background: linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%);",
    workbookTitle: "Sales CRM",
    workbookData: cloneSpreadsheetWorkbookData(SALES_CRM_TEMPLATE_DATA),
  },
  {
    name: "Inventory Tracker",
    slug: "inventory",
    subtitle: "Stock, reorder levels",
    badge: "Ops",
    icon: defaultIcons.IconMicrosoftExcel,
    previewStyle: "background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);",
    workbookTitle: "Inventory Tracker",
    workbookData: cloneSpreadsheetWorkbookData(INVENTORY_TRACKER_TEMPLATE_DATA),
  },
  {
    name: "Content Calendar",
    slug: "calendar",
    subtitle: "Campaigns & channels",
    badge: "Marketing",
    icon: defaultIcons.IconMicrosoftExcel,
    previewStyle: "background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);",
    workbookTitle: "Content Calendar",
    workbookData: cloneSpreadsheetWorkbookData(CONTENT_CALENDAR_TEMPLATE_DATA),
  },
  {
    name: "Invoice",
    slug: "invoice",
    subtitle: "Bill clients fast",
    badge: "Billing",
    icon: defaultIcons.IconMicrosoftExcel,
    previewStyle: "background: linear-gradient(135deg, #0f172a 0%, #334155 100%);",
    workbookTitle: "Invoice",
    workbookData: cloneSpreadsheetWorkbookData(INVOICE_TEMPLATE_DATA),
  },
  {
    name: "OKR Tracker",
    slug: "okr",
    subtitle: "Objectives & key results",
    badge: "Strategy",
    icon: defaultIcons.IconMicrosoftExcel,
    previewStyle: "background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);",
    workbookTitle: "OKR Tracker",
    workbookData: cloneSpreadsheetWorkbookData(OKR_TEMPLATE_DATA),
  },
  {
    name: "Task Tracker",
    slug: "tasks",
    subtitle: "To-dos & owners",
    badge: "Productivity",
    icon: defaultIcons.IconMicrosoftExcel,
    previewStyle: "background: linear-gradient(135deg, #0f172a 0%, #475569 100%);",
    workbookTitle: "Task Tracker",
    workbookData: cloneSpreadsheetWorkbookData(TASKS_TEMPLATE_DATA),
  },
];

export const spreadsheetTemplateMap = spreadsheetTemplateDefinitions.reduce(
  (acc, template) => {
    acc[template.slug] = template;
    return acc;
  },
  {} as Record<SpreadsheetTemplateSlug, SpreadsheetTemplateDefinition>,
);

const spreadsheetTemplateAliases = spreadsheetTemplateDefinitions.reduce(
  (acc, template) => {
    acc.set(template.slug, template.slug);
    acc.set(toTemplateLookupKey(template.slug), template.slug);
    acc.set(toTemplateLookupKey(template.name), template.slug);
    acc.set(toTemplateLookupKey(template.workbookTitle), template.slug);
    acc.set(toTemplateLookupKey(template.badge), template.slug);
    return acc;
  },
  new Map<string, SpreadsheetTemplateSlug>(),
);

spreadsheetTemplateAliases.set("budget", "budget");
spreadsheetTemplateAliases.set("monthly-budget", "budget");
spreadsheetTemplateAliases.set("invoice", "invoice");
spreadsheetTemplateAliases.set("blank-spreadsheet", "blank");

export function resolveSpreadsheetTemplateSlug(value?: string | null): SpreadsheetTemplateSlug {
  if (!value) return "blank";
  return spreadsheetTemplateAliases.get(toTemplateLookupKey(value)) ?? "blank";
}

export function resolveSpreadsheetTemplateDefinition(value?: string | null): SpreadsheetTemplateDefinition {
  return spreadsheetTemplateMap[resolveSpreadsheetTemplateSlug(value)];
}
