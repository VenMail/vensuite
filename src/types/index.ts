export * from "./docPersistence";
export * from "./slides";

export interface FileData {
  id?: string;              // Primary ID - either local UUID or server ID
  server_id?: string;       // Server ID (only present for documents that exist on server)
  title: string;
  file_name?: string;
  file_type?: string | null;
  file_size?: number | string;
  file_url?: string;
  thumbnail_url?: string;
  url?: boolean;
  is_template?: boolean;
  employee_id?: string;
  folder_id?: string | null;
  is_folder?: boolean;
  content?: string;
  deleted_at?: Date | string;
  created_at?: Date | string;
  updated_at?: Date | string;
  last_viewed?: Date;
  isNew?: boolean;
  isDirty?: boolean;        // Local flag for unsaved changes
  isDuplicate?: boolean;    // Flag when backend returns an existing document instead of creating a new one
  duplicateMessage?: string;
  mime_type?: string;       // MIME type of the file
  source?: string;          // Source of the file (e.g., "Files", "Forms")
  is_trashed?: boolean;     // Whether the file is in trash
  trashed_at?: Date | string; // When the file was trashed
  // Sharing controls (backend-compliant)
  // privacy_type: 1=everyone_view,2=everyone_edit,3=link_view,4=link_edit,5=org_view,6=org_edit,7=explicit
  privacy_type?: number;
  // sharing_info: 'email1:v,email2:e' where v=view, e=edit, c=comment
  sharing_info?: string | null;
}

export interface AppForm {
  id?: string;
  title: string;
  file_url?: string;
  last_view_date?: Date;
  created_at?: Date;
  form?: FormData;
  content?: string;
}

export interface FormData {
  id: string;
  fields: Question[];
  metadata?: Metadata;
  settings?: Settings;
}

interface Metadata {
  title: string;
  description: string;
  logo?: Logo;
  theme?: Theme;
  welcomeScreen?: WelcomeScreen;
  completion?: Completion;
  footer?: Footer;
}

interface Logo {
  url: string;
  altText?: string;
}

interface Theme {
  primaryColor: string;
  secondaryColor: string;
  fontFamily?: string;
}

interface WelcomeScreen {
  title: string;
  subtitle: string;
  buttonText: string;
}

interface VisibilityCondition {
  id: string;
  value: string;
}

export type Question =
  | RadioQuestion
  | SelectQuestion
  | TextQuestion
  | EmailQuestion
  | MultiChoiceQuestion
  | FileQuestion
  | SliderQuestion
  | RatingQuestion
  | YesNoQuestion;

export type QuestionType =
  | "radio"
  | "select"
  | "checkbox"
  | "tags"
  | "slider"
  | "range"
  | "rating"
  | "fname"
  | "lname"
  | "fullName"
  | "short"
  | "long"
  | "email"
  | "date"
  | "time"
  | "address"
  | "phone"
  | "website"
  | "file"
  | "yesno";

export type FieldCategory =
  | "choice"
  | "text"
  | "choices"
  | "file"
  | "rating"
  | "switch";

export interface BaseQuestion {
  id: string;
  category: string;
  type: QuestionType;
  question: string;
  placeholder?: string;
  required: boolean;
  logic?: Logic; // Flow logic for conditional rendering
  condition?: VisibilityCondition; // Flow logic for conditional rendering
}

export interface RadioQuestion extends BaseQuestion {
  category: "choice";
  type: "radio";
  options: Option[];
}

export interface SelectQuestion extends BaseQuestion {
  type: "select";
  category: "choice";
  options: Option[];
}

export interface MultiChoiceQuestion extends BaseQuestion {
  category: "choices";
  type: "checkbox" | "tags";
  options: Option[];
  supports_new?: boolean;
}

export interface FileQuestion extends BaseQuestion {
  type: "file";
  category: "file";
  allowedTypes?: string[];
  maxSize?: number;
  multiple?: boolean;
}

export interface SliderQuestion extends BaseQuestion {
  type: "slider" | "range";
  category: "choice" | "choices";
  options?: Option[];
  showLabels: boolean;
  min: number;
  max: number;
  step: number;
}

export interface RatingQuestion extends BaseQuestion {
  type: "rating";
  category: "rating";
  iconType: "heart" | "thumb" | "star";
  allowHalf?: boolean;
  min: number;
  max: number;
}

export interface YesNoQuestion extends BaseQuestion {
  type: "yesno";
  category: "switch";
  options: Option[];
}

export interface Option {
  value: string;
  label: string;
}

export interface TextQuestion extends BaseQuestion {
  category: "text";
  type:
    | "fname"
    | "lname"
    | "fullName"
    | "short"
    | "date"
    | "time"
    | "address"
    | "phone"
    | "website"
    | "long"
    | "email";
  suffix?: string;
  validation?: TextValidation;
}

interface EmailQuestion extends TextQuestion {
  prefix?: string;
  validation: {
    inputType: "email";
  };
}

export interface TextValidation {
  inputType: "email" | "phone" | "date" | "numeric" | "text";
  regex?: RegExp;
  minLength?: number;
  maxLength?: number;
}

export interface Logic {
  if?: string; // ID of the question that triggers this logic
  value?: string; // Value/answer of the question for condition to match
  matchType?: "equal" | "greater" | "less" | "contains" | "regex"; //Match type
  jump?: string; // ID of the question to jump to
}

interface Settings {
  progressBar?: ProgressBar;
  navigation?: Navigation;
  autoFocus?: boolean;
  showQuestionNumber?: boolean;
}

interface ProgressBar {
  show: boolean;
  type: "percentage" | "steps";
}

interface Navigation {
  allowBack: boolean;
  allowSkip: boolean;
}

interface Completion {
  successMessage: string;
  redirectUrl: string;
  showSummary: boolean;
}

interface Footer {
  text: string;
  links?: Link[];
}

interface Link {
  text: string;
  url: string;
}

export const defaultValidations: Record<string, TextValidation> = {
  email: {
    inputType: "email",
    regex: /^\S+@\S+\.\S+$/,
    minLength: 5,
    maxLength: 255,
  },
  phone: {
    inputType: "phone",
    regex: /^\+?[0-9\s]*$/,
    minLength: 10,
    maxLength: 15,
  },
  date: {
    inputType: "date",
    regex: /^\d{4}-\d{2}-\d{2}$/,
    minLength: 10,
    maxLength: 10,
  },
  numeric: {
    inputType: "numeric",
    regex: /^[0-9]+$/,
    minLength: 1,
    maxLength: 20,
  },
  text: { inputType: "text", minLength: 1, maxLength: 255 },
  fname: {
    inputType: "text",
    regex: /^[a-zA-Z]+$/,
    minLength: 2,
    maxLength: 50,
  },
  lname: {
    inputType: "text",
    regex: /^[a-zA-Z]+$/,
    minLength: 2,
    maxLength: 50,
  },
  fullName: {
    inputType: "text",
    regex: /^[a-zA-Z\s]+$/,
    minLength: 5,
    maxLength: 100,
  },
  short: { inputType: "text", minLength: 1, maxLength: 100 },
  long: { inputType: "text", minLength: 1, maxLength: 1000 },
  address: {
    inputType: "text",
    regex: /^[a-zA-Z0-9\s,.-]+$/,
    minLength: 5,
    maxLength: 255,
  },
  website: {
    inputType: "text",
    regex: /^(https?:\/\/)?([\w\d-]+\.){1,2}[\w\d-]{2,}(\.[a-z]{2,})?(:\d+)?(\/\S*)?$/,
    minLength: 5,
    maxLength: 255,
  },
};

export 
const typeToLabelMap: Record<QuestionType, string> = {
  radio: "Radio",
  select: "Dropdown",
  slider: "Slider",
  range: "Range Slider",
  checkbox: "Checkbox",
  tags: "Option Tags",
  fname: "First Name",
  lname: "Last Name",
  fullName: "Full Name",
  short: "Short Answer",
  long: "Long Answer",
  email: "Email",
  date: "Date",
  time: "Time",
  address: "Address",
  phone: "Phone Number",
  website: "Website",
  file: "File Upload",
  rating: "Rating",
  yesno: "Yes/No",
};

export const typeToCategoryMap: Record<QuestionType, FieldCategory> = {
  radio: "choice",
  select: "choice",
  slider: "choice",
  range: "choice",
  checkbox: "choices",
  tags: "choices",
  fname: "text",
  lname: "text",
  fullName: "text",
  short: "text",
  long: "text",
  email: "text",
  date: "text",
  time: "text",
  address: "text",
  phone: "text",
  website: "text",
  file: "file",
  rating: "rating",
  yesno: "switch",
};

export interface ResponseMeta {
  total_responses: number;
  completed_responses: number;
  incomplete_responses: number;
}

export interface QuestionStatistics {
  total_answers: number;
  category: FieldCategory;
  chart_data: {
    type: string;
    data: {
      labels: string[];
      datasets: {
        label: string;
        data: number[];
      }[];
    };
  };
}

export interface FormResponse {
  id: number;
  completed: boolean;
  question_id: string;
  category: string;
  value: string;
}

export interface FormResponseData {
  responses: FormResponse[];
  meta: ResponseMeta;
  statistics: Record<string, QuestionStatistics>;
}

export type DeletedItem = 
  | (FileData & { source: 'Files'; deletedAt: string })
  | (AppForm & { source: 'Forms'; deletedAt: string; file_type?: string; file_size?: string })