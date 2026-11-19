export function previewCompletion<T>(isPreview: boolean, submit: () => Promise<T>): Promise<T | 'preview'>;
