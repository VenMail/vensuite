export function normalizeFormOptions(options) {
  if (!Array.isArray(options)) return undefined;
  return options.map((option, index) => {
    const fallback = `Option ${index + 1}`;
    const value = typeof option === 'string' || typeof option === 'number'
      ? String(option)
      : String(option?.value ?? option?.label ?? fallback);
    const label = typeof option === 'object' && option !== null ? String(option.label ?? '') : value;
    return { value, label: label.trim() ? label : (value.trim() ? value : fallback) };
  });
}
export function questionLogic(question) { return question?.logic ?? question?.config?.logic; }


export function getChoiceLabels(value, options, multiple = false) {
  if (!options?.length || value == null || value === '') return undefined;

  let choices = value;
  if (multiple && typeof value === 'string') {
    try {
      const decoded = JSON.parse(value);
      if (Array.isArray(decoded)) choices = decoded;
    } catch {
      // Older responses can contain a single plain-text option.
    }
  }

  const labelFor = (choice) => options.find((option) => option.value === String(choice))?.label ?? String(choice);
  if (multiple) return Array.isArray(choices) ? choices.map(labelFor) : [labelFor(choices)];
  return labelFor(choices);
}
