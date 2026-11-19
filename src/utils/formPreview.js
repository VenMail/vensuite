export async function previewCompletion(isPreview, submit) {
  return isPreview ? 'preview' : submit();
}
