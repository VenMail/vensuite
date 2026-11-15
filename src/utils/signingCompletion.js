/** @param {Window} current @param {string} referrer @param {object} message */
export function sendSigningCompletion(current, referrer, message) {
  if (current.parent === current || !referrer) return false;
  try {
    const origin = new URL(referrer).origin;
    if (origin === 'null') return false;
    current.parent.postMessage(message, origin);
    return true;
  } catch {
    return false;
  }
}
