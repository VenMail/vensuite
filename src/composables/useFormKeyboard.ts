import { onMounted, onBeforeUnmount, type Ref } from 'vue';

export interface FormKeyboardOptions {
  /** Called when Enter is pressed (advance / submit) */
  onNext: () => void;
  /** Called when Escape is pressed (go back) */
  onBack: () => void;
  /** Called when a letter/number shortcut selects an option */
  onSelectOption?: (index: number) => void;
  /** Called when Y is pressed on a yes/no question */
  onYes?: () => void;
  /** Called when N is pressed on a yes/no question */
  onNo?: () => void;
  /** Current question type — used to determine which shortcuts are active */
  questionType: Ref<string | null>;
  /** Number of options available (for radio/checkbox) */
  optionCount: Ref<number>;
  /** Whether the player is currently submitting */
  isSubmitting: Ref<boolean>;
  /** Whether keyboard navigation is enabled */
  enabled?: Ref<boolean>;
}

/**
 * Composable that provides full keyboard navigation for form players.
 *
 * Key bindings:
 * - Enter: advance to next question / submit
 * - Escape: go back to previous question
 * - 1-9 / A-Z: quick-select radio/checkbox option by index
 * - Y / N: quick-answer yes/no questions
 */
export const useFormKeyboard = (options: FormKeyboardOptions) => {
  const {
    onNext,
    onBack,
    onSelectOption,
    onYes,
    onNo,
    questionType,
    optionCount,
    isSubmitting,
    enabled,
  } = options;

  const isChoiceType = (type: string | null): boolean =>
    type === 'radio' || type === 'select';

  const isMultiChoiceType = (type: string | null): boolean =>
    type === 'checkbox' || type === 'tags';

  const isYesNoType = (type: string | null): boolean =>
    type === 'yesno';

  const isTextInputFocused = (): boolean => {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === 'textarea') return true;
    if (tag === 'input') {
      const inputType = (el as HTMLInputElement).type?.toLowerCase();
      return ['text', 'email', 'tel', 'url', 'number', 'search', 'password', 'date', 'time'].includes(inputType);
    }
    return false;
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (enabled && !enabled.value) return;
    if (isSubmitting.value) return;

    const key = event.key;
    const type = questionType.value;

    // Enter — advance (only if not in a textarea or multi-line input)
    if (key === 'Enter' && !event.shiftKey) {
      const el = document.activeElement;
      const isTextarea = el?.tagName.toLowerCase() === 'textarea';
      if (!isTextarea) {
        event.preventDefault();
        onNext();
        return;
      }
    }

    // Shift+Enter — force submit even from textarea
    if (key === 'Enter' && event.shiftKey) {
      event.preventDefault();
      onNext();
      return;
    }

    // Escape — go back
    if (key === 'Escape') {
      event.preventDefault();
      onBack();
      return;
    }

    // Don't intercept shortcuts when user is typing in a text field
    if (isTextInputFocused()) return;

    // Y / N for yes/no questions
    if (isYesNoType(type)) {
      if (key.toLowerCase() === 'y' && onYes) {
        event.preventDefault();
        onYes();
        return;
      }
      if (key.toLowerCase() === 'n' && onNo) {
        event.preventDefault();
        onNo();
        return;
      }
    }

    // Number keys 1-9 for option selection
    if ((isChoiceType(type) || isMultiChoiceType(type)) && onSelectOption) {
      const num = parseInt(key, 10);
      if (num >= 1 && num <= 9 && num <= optionCount.value) {
        event.preventDefault();
        onSelectOption(num - 1);
        return;
      }
    }

    // Letter keys A-Z for option selection (maps A=0, B=1, etc.)
    if ((isChoiceType(type) || isMultiChoiceType(type)) && onSelectOption) {
      const code = key.toUpperCase().charCodeAt(0);
      const letterIndex = code - 65; // A=0, B=1, ...
      if (letterIndex >= 0 && letterIndex < 26 && letterIndex < optionCount.value) {
        event.preventDefault();
        onSelectOption(letterIndex);
        return;
      }
    }
  };

  onMounted(() => {
    document.addEventListener('keydown', handleKeyDown);
  });

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleKeyDown);
  });

  return {
    handleKeyDown,
  };
};

/**
 * Returns the keyboard shortcut label for an option at the given index.
 * Used to display letter badges (A, B, C...) on radio/checkbox options.
 */
export const getOptionShortcutLabel = (index: number): string => {
  return String.fromCharCode(65 + index); // A, B, C, ...
};
