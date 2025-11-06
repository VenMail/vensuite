import type { LogicCondition, LogicRule, Option } from "@/types";

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
    description: "Single line text input",
    icon: "Type",
    type: "short",
    category: "text",
    keywords: ["text", "input", "short", "single"],
  },
  {
    id: "long",
    label: "Long Text",
    description: "Multi-line text area",
    icon: "AlignLeft",
    type: "long",
    category: "text",
    keywords: ["text", "textarea", "long", "paragraph", "multi"],
  },
  {
    id: "email",
    label: "Email",
    description: "Email address input",
    icon: "Mail",
    type: "email",
    category: "text",
    keywords: ["email", "mail", "address"],
  },
  {
    id: "phone",
    label: "Phone",
    description: "Phone number input",
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
    description: "Single selection from options",
    icon: "CircleDot",
    type: "radio",
    category: "choice",
    keywords: ["radio", "choice", "select", "single", "option"],
  },
  {
    id: "checkbox",
    label: "Checkboxes",
    description: "Multiple selections allowed",
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
    description: "Star or number rating",
    icon: "Star",
    type: "rating",
    category: "rating",
    keywords: ["rating", "star", "score", "review"],
  },
  {
    id: "slider",
    label: "Slider",
    description: "Numeric slider input",
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
