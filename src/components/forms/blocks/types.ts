import type { LogicCondition, LogicRule, Option } from "@/types";
import { t } from '@/i18n';

export type BlockType =
  | "short"
  | "long"
  | "email"
  | "phone"
  | "date"
  | "time"
  | "radio"
  | "checkbox"
  | "select"
  | "rating"
  | "slider"
  | "file"
  | "yesno";

export type BlockCategory = "text" | "choice" | "choices" | "rating" | "file" | "switch";

export interface FormBlock {
  id: string;
  type: BlockType;
  category: BlockCategory;
  question: string;
  description?: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  optionValues?: Option[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  // Rating specific
  iconType?: "star" | "heart" | "number";
  allowHalf?: boolean;
  min?: number;
  max?: number;
  step?: number;
  showLabels?: boolean;
  // File specific
  allowedTypes?: string[];
  maxSize?: number;
  multiple?: boolean;
  // Metadata
  helpText?: string;
  logic?: LogicRule;
  visibilityCondition?: LogicCondition;
  metadata?: Record<string, unknown>;
  pageId?: string;
}

export interface SlashMenuItem {
  id: string;
  label: string;
  description: string;
  icon: string;
  type: BlockType;
  category: BlockCategory;
  keywords: string[];
}

export const slashMenuItems: SlashMenuItem[] = [
  {
    id: "short",
    label: "Short Text",
    description: t('Forms.Blocks.Types.text.single_line_text_input'),
    icon: "Type",
    type: "short",
    category: "text",
    keywords: ["text", "input", "short", "single"],
  },
  {
    id: "long",
    label: "Long Text",
    description: t('Forms.Blocks.Types.text.multi_line_text_area'),
    icon: "AlignLeft",
    type: "long",
    category: "text",
    keywords: ["text", "textarea", "long", "paragraph", "multi"],
  },
  {
    id: "email",
    label: "Email",
    description: t('Forms.Blocks.Types.text.email_address_input'),
    icon: "Mail",
    type: "email",
    category: "text",
    keywords: ["email", "mail", "address"],
  },
  {
    id: "phone",
    label: "Phone",
    description: t('Forms.Blocks.Types.text.phone_number_input'),
    icon: "Phone",
    type: "phone",
    category: "text",
    keywords: ["phone", "telephone", "number", "mobile"],
  },
  {
    id: "date",
    label: "Date",
    description: "Date picker",
    icon: "Calendar",
    type: "date",
    category: "text",
    keywords: ["date", "calendar", "day"],
  },
  {
    id: "time",
    label: "Time",
    description: "Time picker",
    icon: "Clock",
    type: "time",
    category: "text",
    keywords: ["time", "clock", "hour"],
  },
  {
    id: "radio",
    label: "Multiple Choice",
    description: t('Forms.Blocks.Types.text.single_selection_from_options'),
    icon: "CircleDot",
    type: "radio",
    category: "choice",
    keywords: ["radio", "choice", "select", "single", "option"],
  },
  {
    id: "checkbox",
    label: "Checkboxes",
    description: t('Forms.Blocks.Types.text.multiple_selections_allowed'),
    icon: "CheckSquare",
    type: "checkbox",
    category: "choices",
    keywords: ["checkbox", "multi", "multiple", "select"],
  },
  {
    id: "select",
    label: "Dropdown",
    description: "Dropdown selection",
    icon: "ChevronDown",
    type: "select",
    category: "choice",
    keywords: ["dropdown", "select", "menu"],
  },
  {
    id: "rating",
    label: "Rating",
    description: t('Forms.Blocks.Types.text.star_or_number_rating'),
    icon: "Star",
    type: "rating",
    category: "rating",
    keywords: ["rating", "star", "score", "review"],
  },
  {
    id: "slider",
    label: "Slider",
    description: t('Forms.Blocks.Types.text.numeric_slider_input'),
    icon: "SlidersHorizontal",
    type: "slider",
    category: "rating",
    keywords: ["slider", "range", "scale"],
  },
  {
    id: "file",
    label: "File Upload",
    description: "File attachment",
    icon: "Upload",
    type: "file",
    category: "file",
    keywords: ["file", "upload", "attachment", "document"],
  },
  {
    id: "yesno",
    label: "Yes/No",
    description: "Binary choice",
    icon: "ToggleLeft",
    type: "yesno",
    category: "switch",
    keywords: ["yes", "no", "boolean", "toggle", "switch"],
  },
];
