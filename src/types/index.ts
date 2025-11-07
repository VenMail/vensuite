export * from "./docPersistence";
export * from "./slides";

export interface DocumentMetadata {
  pagination?: {
    orientation?: 'portrait' | 'landscape';
    pageSize?: string;
    showPageNumbers?: boolean;
    pageNumberPosition?: string;
    printPageNumbers?: boolean;
    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
    pageBorder?: boolean;
    pageShadow?: boolean;
  };
}

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
  metadata?: DocumentMetadata;
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
  organization_id?: string;
  owner_id?: string;
  slug?: string;
  sharing?: FormSharingSettings;
  title: string;
  status?: FormStatus;
  layout_mode?: FormLayoutMode;
  file_url?: string;
  last_view_date?: Date | string;
  created_at?: Date | string;
  updated_at?: Date | string;
  form?: FormDefinition | FormData;
  content?: string;
  responses_count?: number;
  response_count?: number;
  questions_count?: number;
  question_count?: number;
  metrics?: {
    responses?: number;
    questions?: number;
    fields?: number;
  };
}

export type FormStatus = "draft" | "published" | "archived";

export type FormLayoutMode = "focus" | "classic" | "auto";

export interface FormDefinition {
  id: string;
  title?: string;
  description?: string;
  slug?: string;
  status?: FormStatus;
  owner_id?: string;
  organization_id?: string;
  layout_mode: FormLayoutMode;
  settings: FormSettings;
  payment?: FormPaymentSettings;
  header?: FormHeader;
  typography?: FormTypography;
  theme?: FormTheme;
  navigation?: FormNavigation;
  welcome_screen?: FormWelcomeScreen;
  completion_screen?: FormCompletionScreen;
  pages: FormPage[];
  questions?: FormQuestion[];
  logic_rules: LogicRule[];
  sharing?: FormSharingSettings;
  security?: FormSecuritySettings;
  metadata?: Record<string, unknown>;
  version?: number;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export type FormLabelPlacement = "stacked" | "inline";

export type FormDensity = "comfortable" | "compact";

export interface FormSettings {
  progress_bar?: ProgressBar;
  navigation?: FormNavigation;
  auto_focus?: boolean;
  show_question_number?: boolean;
  collect_email?: boolean;
  save_partial_responses?: boolean;
  locale?: string;
  timezone?: string;
  label_placement?: FormLabelPlacement;
  form_density?: FormDensity;
}

export type FormPaymentMode = "custom" | "platform";

export interface FormPaymentSettings {
  enabled: boolean;
  amount_cents: number;
  currency: string;
  mode: FormPaymentMode;
  stripe_publishable_key?: string;
  stripe_account_id?: string;
  application_fee_percent?: number;
  product_description?: string;
  require_billing_details?: boolean;
  thank_you_message?: string;
}

export interface FormHeader {
  enabled: boolean;
  background: FormHeaderBackground;
  overlay_color?: string;
  title?: string;
  subtitle?: string;
  call_to_action_text?: string;
  call_to_action_url?: string;
  alignment?: "left" | "center" | "right";
  logo_url?: string;
  logo_width?: number;
  footer_image_url?: string;
}

export type FormHeaderBackground =
  | { type: "image"; url: string; position?: string; fit?: "cover" | "contain" }
  | { type: "gradient"; angle: number; colors: string[] }
  | { type: "solid"; color: string };

export interface FormTypography {
  heading_font_family: string;
  heading_font_weight?: string;
  body_font_family: string;
  body_font_weight?: string;
  line_height?: number;
  letter_spacing?: number;
}

export interface FormTheme {
  primary_color: string;
  secondary_color?: string;
  accent_color?: string;
  button_style?: "solid" | "outline" | "ghost";
  border_radius?: string;
  background_color?: string;
  text_color?: string;
  surface_color?: string;
}

export interface FormNavigation {
  allow_back: boolean;
  allow_skip: boolean;
  show_progress?: boolean;
  progress_type?: "percentage" | "steps";
  redirect_on_submit?: string;
}

export interface FormWelcomeScreen {
  enabled: boolean;
  title?: string;
  subtitle?: string;
  button_text?: string;
  background_url?: string;
}

export interface FormCompletionScreen {
  enabled: boolean;
  title?: string;
  message?: string;
  button_text?: string;
  button_url?: string;
  show_summary?: boolean;
}

export interface FormSharingSettings {
  share_slug?: string;
  is_public?: boolean;
  allow_resubmit?: boolean;
  embed_allowed?: boolean;
  notify_on_submission?: boolean;
  notification_emails?: string[];
}

export interface FormSecuritySettings {
  captcha_enabled?: boolean;
  password_required?: boolean;
  password?: string;
  domain_restrictions?: string[];
  max_submissions?: number;
  submission_window_start?: string;
  submission_window_end?: string;
}

export interface FormPage {
  id: string;
  form_id?: string;
  title?: string;
  description?: string;
  position: number;
  question_order?: string[];
  metadata?: Record<string, unknown>;
  clone_of?: string;
  questions?: FormQuestion[];
}

export type FormQuestion =
  | FormRadioQuestion
  | FormSelectQuestion
  | FormTextQuestion
  | FormEmailQuestion
  | FormMultiChoiceQuestion
  | FormFileQuestion
  | FormSliderQuestion
  | FormRatingQuestion
  | FormYesNoQuestion
  | FormDateQuestion
  | FormTimeQuestion
  | FormAddressQuestion
  | FormPhoneQuestion
  | FormWebsiteQuestion
  | FormNumberQuestion
  | FormStatementBlock;

export type FormQuestionType =
  | "radio"
  | "select"
  | "checkbox"
  | "tags"
  | "slider"
  | "range"
  | "rating"
  | "short"
  | "long"
  | "fname"
  | "lname"
  | "fullName"
  | "email"
  | "date"
  | "time"
  | "address"
  | "phone"
  | "website"
  | "number"
  | "statement"
  | "file"
  | "yesno";

export type FormFieldCategory =
  | "choice"
  | "choices"
  | "text"
  | "file"
  | "rating"
  | "switch"
  | "info";

export interface FormBaseQuestion {
  id: string;
  page_id?: string;
  category: FormFieldCategory;
  type: FormQuestionType;
  question: string;
  description?: string;
  placeholder?: string;
  required: boolean;
  help_text?: string;
  logic?: LogicRule;
  visibility_condition?: LogicCondition;
  metadata?: Record<string, unknown>;
}

export interface FormRadioQuestion extends FormBaseQuestion {
  category: "choice";
  type: "radio";
  options: Option[];
  randomize_options?: boolean;
}

export interface FormSelectQuestion extends FormBaseQuestion {
  category: "choice";
  type: "select";
  options: Option[];
  allow_search?: boolean;
}

export interface FormMultiChoiceQuestion extends FormBaseQuestion {
  category: "choices";
  type: "checkbox" | "tags";
  options: Option[];
  max_selections?: number;
  min_selections?: number;
  supports_new?: boolean;
}

export interface FormFileQuestion extends FormBaseQuestion {
  category: "file";
  type: "file";
  allowed_types?: string[];
  max_size_mb?: number;
  multiple?: boolean;
  capture_mode?: "camera" | "upload" | "both";
}

export interface FormSliderQuestion extends FormBaseQuestion {
  category: "choice";
  type: "slider" | "range";
  min: number;
  max: number;
  step: number;
  show_labels?: boolean;
  left_label?: string;
  right_label?: string;
}

export interface FormRatingQuestion extends FormBaseQuestion {
  category: "rating";
  type: "rating";
  icon_type: "star" | "heart" | "thumb";
  min: number;
  max: number;
  allow_half?: boolean;
  orientation?: "horizontal" | "vertical";
}

export interface FormYesNoQuestion extends FormBaseQuestion {
  category: "switch";
  type: "yesno";
  options: Option[];
}

export interface FormTextQuestion extends FormBaseQuestion {
  category: "text";
  type: "short" | "long";
  validation?: TextValidation;
  suffix?: string;
  prefix?: string;
}

export interface FormEmailQuestion extends FormBaseQuestion {
  category: "text";
  type: "email";
  validation?: TextValidation;
}

export interface FormDateQuestion extends FormBaseQuestion {
  category: "text";
  type: "date";
  min_date?: string;
  max_date?: string;
}

export interface FormTimeQuestion extends FormBaseQuestion {
  category: "text";
  type: "time";
  time_format?: "12h" | "24h";
}

export interface FormAddressQuestion extends FormBaseQuestion {
  category: "text";
  type: "address";
  fields?: ("line1" | "line2" | "city" | "state" | "postal_code" | "country")[];
}

export interface FormPhoneQuestion extends FormBaseQuestion {
  category: "text";
  type: "phone";
  validation?: TextValidation;
  allow_international?: boolean;
}

export interface FormWebsiteQuestion extends FormBaseQuestion {
  category: "text";
  type: "website";
  validation?: TextValidation;
}

export interface FormNumberQuestion extends FormBaseQuestion {
  category: "text";
  type: "number";
  min?: number;
  max?: number;
  step?: number;
  validation?: TextValidation;
}

export interface FormStatementBlock extends FormBaseQuestion {
  category: "info";
  type: "statement";
  rich_text?: string;
}

export interface LogicRule {
  id: string;
  scope: "form" | "page" | "question";
  owner_id?: string;
  conditions: LogicCondition[];
  logic_type: "AND" | "OR";
  actions: LogicAction[];
  order?: number;
  metadata?: Record<string, unknown>;
}

export type LogicOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "greater_than"
  | "less_than"
  | "greater_or_equal"
  | "less_or_equal"
  | "matches_regex";

export interface LogicCondition {
  question_id: string;
  operator: LogicOperator;
  value?: string | number | boolean;
}

export type LogicActionType =
  | "jump_to_question"
  | "jump_to_page"
  | "end_form"
  | "show_message";

export interface LogicAction {
  type: LogicActionType;
  target_id?: string;
  message?: string;
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

export type Question = FormQuestion;
export type QuestionType = FormQuestionType;
export type FieldCategory = FormFieldCategory;
export type BaseQuestion = FormBaseQuestion;
export type RadioQuestion = FormRadioQuestion;
export type SelectQuestion = FormSelectQuestion;
export type MultiChoiceQuestion = FormMultiChoiceQuestion;
export type FileQuestion = FormFileQuestion;
export type SliderQuestion = FormSliderQuestion;
export type RatingQuestion = FormRatingQuestion;
export type YesNoQuestion = FormYesNoQuestion;
export type TextQuestion = FormTextQuestion;
export type EmailQuestion = FormEmailQuestion;
export type DateQuestion = FormDateQuestion;
export type TimeQuestion = FormTimeQuestion;
export type AddressQuestion = FormAddressQuestion;
export type PhoneQuestion = FormPhoneQuestion;
export type WebsiteQuestion = FormWebsiteQuestion;
export type NumberQuestion = FormNumberQuestion;
export type StatementBlock = FormStatementBlock;

export interface Option {
  value: string;
  label: string;
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

export interface VisibilityCondition {
  id: string;
  value: string;
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
  number: "Number",
  statement: "Statement",
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
  number: "text",
  statement: "info",
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

export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
}

export interface FormResponseSummary {
  id: number;
  status?: string | null;
  submitted_at?: string | null;
  payment_status?: string | null;
  [key: string]: unknown;
}

export interface FormResponsesPage {
  data: FormResponseSummary[];
  meta: PaginationMeta;
}

export interface AppFormResponseAnswer {
  id: number;
  question_id: number;
  value: unknown;
  question?: FormQuestion;
  meta?: Record<string, unknown> | null;
  file_url?: string | null;
  file_path?: string | null;
}

export interface AppFormResponseDetail {
  id: number;
  status: string;
  created_at?: string | null;
  submitted_at?: string | null;
  payment_status?: string | null;
  payment_intent_id?: string | null;
  answers: AppFormResponseAnswer[];
  respondent?: Record<string, unknown> | null;
  meta?: Record<string, unknown> | null;
}

export interface FormWebhook {
  id: number;
  url: string;
  events?: string[] | null;
  status?: 'active' | 'disabled';
  created_at?: string;
  updated_at?: string;
}

export type DeletedItem = 
  | (FileData & { source: 'Files'; deletedAt: string })
  | (AppForm & { source: 'Forms'; deletedAt: string; file_type?: string; file_size?: string })