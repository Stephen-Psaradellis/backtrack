/**
 * Helper for testID queries in jsdom environment
 *
 * When React Native components are mocked as strings in jsdom,
 * testID renders as lowercase 'testid' attribute, not 'data-testid'.
 * This helper queries using the lowercase attribute.
 */

export const getByTestId = (container: any, testId: string) => {
  const element = container.querySelector(`[testid="${testId}"]`)
  if (!element) {
    throw new Error(`Unable to find element with testid="${testId}"`)
  }
  return element
}

export const queryByTestId = (container: any, testId: string) => {
  return container.querySelector(`[testid="${testId}"]`)
}

export const getAllByTestId = (container: any, testId: string) => {
  const elements = container.querySelectorAll(`[testid="${testId}"]`)
  if (elements.length === 0) {
    throw new Error(`Unable to find elements with testid="${testId}"`)
  }
  return Array.from(elements)
}
