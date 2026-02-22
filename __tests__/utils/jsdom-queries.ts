/**
 * Custom query helpers for jsdom environment
 *
 * In jsdom, React Native's `testID` prop becomes lowercase `testid`.
 * These helpers make it easier to query elements in tests.
 */

/**
 * Get element by testid (jsdom uses lowercase testid)
 */
export function getByTestId(container: HTMLElement, testId: string): HTMLElement {
  const element = container.querySelector(`[testid="${testId}"]`);
  if (!element) {
    throw new Error(
      `Unable to find element with testid: ${testId}\n\n${container.innerHTML}`
    );
  }
  return element as HTMLElement;
}

/**
 * Query element by testid (returns null if not found)
 */
export function queryByTestId(container: HTMLElement, testId: string): HTMLElement | null {
  return container.querySelector(`[testid="${testId}"]`) as HTMLElement | null;
}

/**
 * Get all elements by testid
 */
export function getAllByTestId(container: HTMLElement, testId: string): HTMLElement[] {
  const elements = Array.from(container.querySelectorAll(`[testid="${testId}"]`));
  if (elements.length === 0) {
    throw new Error(
      `Unable to find any elements with testid: ${testId}\n\n${container.innerHTML}`
    );
  }
  return elements as HTMLElement[];
}

/**
 * Query all elements by testid (returns empty array if none found)
 */
export function queryAllByTestId(container: HTMLElement, testId: string): HTMLElement[] {
  return Array.from(container.querySelectorAll(`[testid="${testId}"]`)) as HTMLElement[];
}
