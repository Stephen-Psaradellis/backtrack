/**
 * Test utilities for React Testing Library
 *
 * This module provides custom render functions and helper utilities
 * for testing React components with all necessary providers.
 */

import React, { type ReactElement, type ReactNode } from 'react'
import {
  render,
  type RenderOptions,
  type RenderResult,
} from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { vi, type Mock } from 'vitest'

// Re-export everything from React Testing Library
export * from '@testing-library/react'
export { screen, waitFor, fireEvent, within, act, cleanup } from '@testing-library/react'
export { userEvent }

/**
 * Options for the custom render function
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Additional providers to wrap the component with */
  wrapperProps?: Record<string, unknown>
}

/**
 * Extended render result with userEvent instance
 */
interface CustomRenderResult extends RenderResult {
  user: UserEvent
}

/**
 * All Providers wrapper component
 *
 * Wraps children with all necessary providers for testing.
 * Currently, the app has no global providers (like Redux, Theme, etc.),
 * so this is a simple wrapper that can be extended as needed.
 */
interface AllProvidersProps {
  children: ReactNode
}

function AllProviders({ children }: AllProvidersProps): ReactElement {
  // Add any global providers here as the app grows
  // Example:
  // return (
  //   <ThemeProvider>
  //     <AuthProvider>
  //       {children}
  //     </AuthProvider>
  //   </ThemeProvider>
  // )
  return <>{children}</>
}

/**
 * Custom render function that wraps components with all necessary providers
 * and sets up userEvent for interaction testing.
 *
 * @example
 * ```tsx
 * const { getByRole, user } = renderWithProviders(<Button>Click me</Button>)
 * await user.click(getByRole('button'))
 * ```
 */
export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): CustomRenderResult {
  const { wrapperProps: _wrapperProps, ...renderOptions } = options

  const Wrapper = ({ children }: { children: ReactNode }) => {
    return <AllProviders>{children}</AllProviders>
  }

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  }
}

/**
 * Creates a mock portal container for testing Modal and other portal-based components.
 * Call this in beforeEach to set up the portal container.
 *
 * @example
 * ```tsx
 * beforeEach(() => {
 *   setupPortalContainer()
 * })
 *
 * afterEach(() => {
 *   cleanupPortalContainer()
 * })
 * ```
 */
export function setupPortalContainer(): HTMLDivElement {
  const portalRoot = document.createElement('div')
  portalRoot.setAttribute('id', 'portal-root')
  document.body.appendChild(portalRoot)
  return portalRoot
}

/**
 * Cleans up the portal container after tests
 */
export function cleanupPortalContainer(): void {
  const portalRoot = document.getElementById('portal-root')
  if (portalRoot) {
    document.body.removeChild(portalRoot)
  }
}

/**
 * Helper to wait for async updates in tests
 */
export async function waitForNextTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Helper to create mock event handlers
 */
export function createMockHandler(): Mock {
  return vi.fn()
}

/**
 * Helper to simulate form submission
 */
export async function submitForm(
  user: UserEvent,
  container: HTMLElement
): Promise<void> {
  const form = container.querySelector('form')
  if (form) {
    await user.click(form.querySelector('button[type="submit"]') || form)
  }
}

/**
 * Mock for Next.js router
 */
export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
  route: '/',
  events: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
}

/**
 * Mock for Next.js useRouter hook
 */
export function mockUseRouter(): void {
  vi.mock('next/navigation', () => ({
    useRouter: () => mockRouter,
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
    useParams: () => ({}),
  }))
}

/**
 * Helper to reset all router mocks
 */
export function resetRouterMocks(): void {
  mockRouter.push.mockClear()
  mockRouter.replace.mockClear()
  mockRouter.back.mockClear()
  mockRouter.forward.mockClear()
  mockRouter.refresh.mockClear()
  mockRouter.prefetch.mockClear()
}

/**
 * Helper to find elements by test ID pattern
 */
export function getByTestIdPattern(
  container: HTMLElement,
  pattern: RegExp
): HTMLElement | null {
  const elements = container.querySelectorAll('[data-testid]')
  for (const element of elements) {
    const testId = element.getAttribute('data-testid')
    if (testId && pattern.test(testId)) {
      return element as HTMLElement
    }
  }
  return null
}

/**
 * Helper to assert element visibility
 */
export function expectElementToBeVisible(element: HTMLElement | null): void {
  expect(element).toBeInTheDocument()
  expect(element).toBeVisible()
}

/**
 * Helper to assert element not visible (could be hidden or not in DOM)
 */
export function expectElementNotVisible(element: HTMLElement | null): void {
  if (element) {
    expect(element).not.toBeVisible()
  } else {
    expect(element).not.toBeInTheDocument()
  }
}

/**
 * Creates mock props for a component, merging defaults with overrides
 */
export function createMockProps<T extends Record<string, unknown>>(
  defaults: T,
  overrides: Partial<T> = {}
): T {
  return { ...defaults, ...overrides }
}

/**
 * Helper to simulate keyboard events
 */
export async function pressKey(
  user: UserEvent,
  key: string
): Promise<void> {
  await user.keyboard(`{${key}}`)
}

/**
 * Helper to simulate pressing Escape key
 */
export async function pressEscape(user: UserEvent): Promise<void> {
  await pressKey(user, 'Escape')
}

/**
 * Helper to simulate pressing Enter key
 */
export async function pressEnter(user: UserEvent): Promise<void> {
  await pressKey(user, 'Enter')
}

/**
 * Helper to simulate pressing Tab key
 */
export async function pressTab(user: UserEvent): Promise<void> {
  await user.tab()
}

/**
 * Helper to simulate shift+tab
 */
export async function pressShiftTab(user: UserEvent): Promise<void> {
  await user.tab({ shift: true })
}

// Type exports for consumers
export type { CustomRenderOptions, CustomRenderResult, UserEvent }