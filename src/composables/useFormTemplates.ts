import {
  FileText,
  MessageSquare,
  Calendar,
  FileQuestion,
  MessageCircle,
  UserPlus,
  ShoppingCart,
} from 'lucide-vue-next';

export type FormTemplate = {
  name: string;
  slug: string;
  subtitle: string;
  badge: string;
  icon: any;
  previewStyle: string;
  preset?: string;
};

export const useFormTemplates = () => {
  const TEMPLATE_STORAGE_PREFIX = 'VENX_FORM_TEMPLATE_';

  const formTemplates: FormTemplate[] = [
    {
      name: 'Blank Form',
      slug: 'blank',
      subtitle: 'Start from scratch',
      badge: 'Blank',
      icon: FileText,
      previewStyle: 'background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%);',
    },
    {
      name: 'Contact Form',
      slug: 'contact',
      subtitle: 'Collect contact information',
      badge: 'Contact',
      icon: MessageSquare,
      previewStyle: 'background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);',
      preset: 'Create a contact form with name, email, phone, and message fields',
    },
    {
      name: 'Feedback Form',
      slug: 'feedback',
      subtitle: 'Gather user feedback',
      badge: 'Feedback',
      icon: MessageCircle,
      previewStyle: 'background: linear-gradient(135deg, #10b981 0%, #34d399 100%);',
      preset: 'Create a feedback form with rating, satisfaction, and comment fields',
    },
    {
      name: 'Registration Form',
      slug: 'registration',
      subtitle: 'Event or service signup',
      badge: 'Registration',
      icon: UserPlus,
      previewStyle: 'background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);',
      preset: 'Create a registration form with personal details and preferences',
    },
    {
      name: 'Order Form',
      slug: 'order',
      subtitle: 'Product or service orders',
      badge: 'Order',
      icon: ShoppingCart,
      previewStyle: 'background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);',
      preset: 'Create an order form with product selection and payment details',
    },
    {
      name: 'Survey Form',
      slug: 'survey',
      subtitle: 'Research and opinions',
      badge: 'Survey',
      icon: FileQuestion,
      previewStyle: 'background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);',
      preset: 'Create a survey form with multiple choice and text questions',
    },
    {
      name: 'Event Registration',
      slug: 'event',
      subtitle: 'Conference or meetup signup',
      badge: 'Event',
      icon: Calendar,
      previewStyle: 'background: linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%);',
      preset: 'Create an event registration form with date, time, and attendee details',
    },
    {
      name: 'Application Form',
      slug: 'application',
      subtitle: 'Job or program applications',
      badge: 'Application',
      icon: UserPlus,
      previewStyle: 'background: linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%);',
      preset: 'Create an application form with experience and qualification fields',
    },
  ];

  const storeTemplateData = (formId: string, data: { title: string; description: string; blocks: any[] }) => {
    sessionStorage.setItem(
      `${TEMPLATE_STORAGE_PREFIX}${formId}`,
      JSON.stringify(data)
    );
  };

  const getTemplateData = (formId: string) => {
    const stored = sessionStorage.getItem(`${TEMPLATE_STORAGE_PREFIX}${formId}`);
    return stored ? JSON.parse(stored) : null;
  };

  const clearTemplateData = (formId: string) => {
    sessionStorage.removeItem(`${TEMPLATE_STORAGE_PREFIX}${formId}`);
  };

  return {
    formTemplates,
    storeTemplateData,
    getTemplateData,
    clearTemplateData,
    TEMPLATE_STORAGE_PREFIX,
  };
};
