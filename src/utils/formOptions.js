export function normalizeFormOptions(options) {
  if (!Array.isArray(options)) return undefined;
  return options.map((option, index) => {
    if (typeof option === 'string') return { value: option, label: option };
    const fallback = `Option ${index + 1}`;
    return { value: String(option?.value ?? option?.label ?? fallback), label: String(option?.label ?? option?.value ?? fallback) };
  });
}
export function questionLogic(question) { return question?.logic ?? question?.config?.logic; }
