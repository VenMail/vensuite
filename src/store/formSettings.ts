import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type {
  FormDefinition,
  FormHeader,
  FormTypography,
  FormTheme,
  FormNavigation,
  FormWelcomeScreen,
  FormCompletionScreen,
  FormSharingSettings,
  FormSecuritySettings,
  FormPaymentSettings,
  FormSettings,
  FormPaymentMode,
  FormLayoutMode,
} from "@/types";

interface FormSettingsState {
  layoutMode: FormLayoutMode;
  settings: FormSettings;
  header: FormHeader;
  typography: FormTypography;
  theme: FormTheme;
  navigation: FormNavigation;
  welcomeScreen: FormWelcomeScreen;
  completionScreen: FormCompletionScreen;
  sharing: FormSharingSettings;
  security: FormSecuritySettings;
  payment: FormPaymentSettings;
  dirty: boolean;
}

const DEFAULT_LAYOUT_MODE: FormLayoutMode = "auto";

const createDefaultSettings = (): FormSettings => ({
  auto_focus: true,
  show_question_number: false,
  collect_email: false,
  save_partial_responses: true,
  progress_bar: { show: true, type: "percentage" },
  navigation: {
    allow_back: true,
    allow_skip: false,
    show_progress: true,
    progress_type: "percentage",
  },
});

const createDefaultHeader = (): FormHeader => ({
  enabled: false,
  background: { type: "solid", color: "#0F172A" },
  overlay_color: "rgba(15, 23, 42, 0.55)",
  alignment: "center",
  logo_width: 96,
});

const createDefaultTypography = (): FormTypography => ({
  heading_font_family: "Inter",
  heading_font_weight: "600",
  body_font_family: "Inter",
  body_font_weight: "400",
  line_height: 1.6,
  letter_spacing: 0,
});

const createDefaultTheme = (): FormTheme => ({
  primary_color: "#2563EB",
  secondary_color: "#1E40AF",
  accent_color: "#D946EF",
  button_style: "solid",
  border_radius: "0.75rem",
  background_color: "#FFFFFF",
});

const createDefaultWelcomeScreen = (): FormWelcomeScreen => ({
  enabled: true,
  title: "Welcome",
  subtitle: "Let’s get to know you better",
  button_text: "Start",
});

const createDefaultCompletionScreen = (): FormCompletionScreen => ({
  enabled: true,
  title: "Thank you!",
  message: "We’ve received your response.",
  button_text: "Continue",
  show_summary: false,
});

const createDefaultSharingSettings = (): FormSharingSettings => ({
  is_public: false,
  allow_resubmit: false,
  embed_allowed: true,
  notify_on_submission: false,
  notification_emails: [],
});

const createDefaultSecuritySettings = (): FormSecuritySettings => ({
  captcha_enabled: true,
  password_required: false,
  domain_restrictions: [],
});

const DEFAULT_PAYMENT_MODE: FormPaymentMode = "platform";

const createDefaultPaymentSettings = (): FormPaymentSettings => ({
  enabled: false,
  amount_cents: 0,
  currency: "USD",
  mode: DEFAULT_PAYMENT_MODE,
  application_fee_percent: 5,
  require_billing_details: true,
});

export const useFormSettingsStore = defineStore("form-settings", () => {
  const state = ref<FormSettingsState>({
    layoutMode: DEFAULT_LAYOUT_MODE,
    settings: createDefaultSettings(),
    header: createDefaultHeader(),
    typography: createDefaultTypography(),
    theme: createDefaultTheme(),
    navigation: createDefaultSettings().navigation!,
    welcomeScreen: createDefaultWelcomeScreen(),
    completionScreen: createDefaultCompletionScreen(),
    sharing: createDefaultSharingSettings(),
    security: createDefaultSecuritySettings(),
    payment: createDefaultPaymentSettings(),
    dirty: false,
  });

  const isPaymentEnabled = computed(() => state.value.payment.enabled);

  const setLayoutMode = (mode: FormLayoutMode) => {
    if (state.value.layoutMode === mode) return;
    state.value.layoutMode = mode;
    state.value.dirty = true;
  };

  const updateSettings = (settings: Partial<FormSettings>) => {
    state.value.settings = {
      ...state.value.settings,
      ...settings,
      navigation: {
        ...state.value.settings.navigation,
        ...settings.navigation,
      } as FormNavigation,
    };
    state.value.dirty = true;
  };

  const updateHeader = (header: Partial<FormHeader>) => {
    state.value.header = {
      ...state.value.header,
      ...header,
      background: header.background ?? state.value.header.background,
    };
    state.value.dirty = true;
  };

  const updateTypography = (typography: Partial<FormTypography>) => {
    state.value.typography = {
      ...state.value.typography,
      ...typography,
    };
    state.value.dirty = true;
  };

  const updateTheme = (theme: Partial<FormTheme>) => {
    state.value.theme = {
      ...state.value.theme,
      ...theme,
    };
    state.value.dirty = true;
  };

  const updateNavigation = (navigation: Partial<FormNavigation>) => {
    state.value.navigation = {
      ...state.value.navigation,
      ...navigation,
    } as FormNavigation;
    state.value.dirty = true;
  };

  const updateWelcomeScreen = (screen: Partial<FormWelcomeScreen>) => {
    state.value.welcomeScreen = {
      ...state.value.welcomeScreen,
      ...screen,
    };
    state.value.dirty = true;
  };

  const updateCompletionScreen = (screen: Partial<FormCompletionScreen>) => {
    state.value.completionScreen = {
      ...state.value.completionScreen,
      ...screen,
    };
    state.value.dirty = true;
  };

  const updateSharing = (sharing: Partial<FormSharingSettings>) => {
    state.value.sharing = {
      ...state.value.sharing,
      ...sharing,
    };
    state.value.dirty = true;
  };

  const updateSecurity = (security: Partial<FormSecuritySettings>) => {
    state.value.security = {
      ...state.value.security,
      ...security,
    };
    state.value.dirty = true;
  };

  const setPaymentEnabled = (enabled: boolean) => {
    state.value.payment.enabled = enabled;
    state.value.dirty = true;
  };

  const setPaymentMode = (mode: FormPaymentMode) => {
    state.value.payment.mode = mode;
    state.value.dirty = true;
  };

  const updatePayment = (payment: Partial<FormPaymentSettings>) => {
    state.value.payment = {
      ...state.value.payment,
      ...payment,
    };
    state.value.dirty = true;
  };

  const hydrateFromDefinition = (definition: FormDefinition | null) => {
    if (!definition) return;
    state.value.layoutMode = definition.layout_mode;
    state.value.settings = {
      ...createDefaultSettings(),
      ...definition.settings,
    };
    state.value.header = {
      ...createDefaultHeader(),
      ...definition.header,
    };
    state.value.typography = {
      ...createDefaultTypography(),
      ...definition.typography,
    };
    state.value.theme = {
      ...createDefaultTheme(),
      ...definition.theme,
    };
    state.value.navigation = {
      ...createDefaultSettings().navigation!,
      ...definition.navigation,
    };
    state.value.welcomeScreen = {
      ...createDefaultWelcomeScreen(),
      ...definition.welcome_screen,
    };
    state.value.completionScreen = {
      ...createDefaultCompletionScreen(),
      ...definition.completion_screen,
    };
    state.value.sharing = {
      ...createDefaultSharingSettings(),
      ...definition.sharing,
    };
    state.value.security = {
      ...createDefaultSecuritySettings(),
      ...definition.security,
    };
    state.value.payment = {
      ...createDefaultPaymentSettings(),
      ...definition.payment,
    };
    state.value.dirty = false;
  };

  const reset = () => {
    state.value = {
      layoutMode: DEFAULT_LAYOUT_MODE,
      settings: createDefaultSettings(),
      header: createDefaultHeader(),
      typography: createDefaultTypography(),
      theme: createDefaultTheme(),
      navigation: createDefaultSettings().navigation!,
      welcomeScreen: createDefaultWelcomeScreen(),
      completionScreen: createDefaultCompletionScreen(),
      sharing: createDefaultSharingSettings(),
      security: createDefaultSecuritySettings(),
      payment: createDefaultPaymentSettings(),
      dirty: false,
    };
  };

  return {
    state,
    isPaymentEnabled,
    setLayoutMode,
    updateSettings,
    updateHeader,
    updateTypography,
    updateTheme,
    updateNavigation,
    updateWelcomeScreen,
    updateCompletionScreen,
    updateSharing,
    updateSecurity,
    setPaymentEnabled,
    setPaymentMode,
    updatePayment,
    hydrateFromDefinition,
    reset,
  };
});
