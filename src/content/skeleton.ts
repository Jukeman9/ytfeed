/**
 * Apply skeleton loading overlay to a video card
 */
export function applySkeleton(element: HTMLElement): void {
  if (element.classList.contains('ytfeed-skeleton')) return;
  element.classList.add('ytfeed-skeleton');
}

/**
 * Remove skeleton loading overlay from a video card
 */
export function removeSkeleton(element: HTMLElement): void {
  element.classList.remove('ytfeed-skeleton');
}

/**
 * Apply skeleton to multiple elements
 */
export function applySkeletonBatch(elements: HTMLElement[]): void {
  elements.forEach(applySkeleton);
}

/**
 * Remove skeleton from multiple elements
 */
export function removeSkeletonBatch(elements: HTMLElement[]): void {
  elements.forEach(removeSkeleton);
}
