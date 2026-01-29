/**
 * Centralized z-index management for slide elements
 */

const zIndexMap = new Map<HTMLElement, number>();
let nextZIndex = 1000;

export function initializeZIndices(container: HTMLElement) {
  const elements = container.querySelectorAll('[data-markdown-line-start]');
  elements.forEach((el, index) => {
    const htmlEl = el as HTMLElement;
    const zIndex = 1000 + index;
    htmlEl.style.zIndex = String(zIndex);
    zIndexMap.set(htmlEl, zIndex);
  });
  nextZIndex = 1000 + elements.length;
}

export function bringToFront(element: HTMLElement) {
  const newZIndex = nextZIndex++;
  element.style.zIndex = String(newZIndex);
  zIndexMap.set(element, newZIndex);
}

export function sendToBack(element: HTMLElement) {
  const minZ = Math.min(...Array.from(zIndexMap.values()));
  const newZIndex = minZ - 1;
  element.style.zIndex = String(newZIndex);
  zIndexMap.set(element, newZIndex);
}

export function bringForward(element: HTMLElement) {
  const currentZ = zIndexMap.get(element) || 0;
  const allZIndices = Array.from(zIndexMap.values()).sort((a, b) => a - b);
  const currentIndex = allZIndices.indexOf(currentZ);
  
  if (currentIndex < allZIndices.length - 1) {
    const nextZ = allZIndices[currentIndex + 1];
    element.style.zIndex = String(nextZ + 1);
    zIndexMap.set(element, nextZ + 1);
  }
}

export function sendBackward(element: HTMLElement) {
  const currentZ = zIndexMap.get(element) || 0;
  const allZIndices = Array.from(zIndexMap.values()).sort((a, b) => a - b);
  const currentIndex = allZIndices.indexOf(currentZ);
  
  if (currentIndex > 0) {
    const prevZ = allZIndices[currentIndex - 1];
    element.style.zIndex = String(prevZ - 1);
    zIndexMap.set(element, prevZ - 1);
  }
}

export function getZIndex(element: HTMLElement): number {
  return zIndexMap.get(element) || 0;
}

export function cleanupZIndices() {
  zIndexMap.clear();
  nextZIndex = 1000;
}
