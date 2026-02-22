/**
 * Mock for expo-modules-core
 *
 * The real module resolves to raw .ts source with advanced TypeScript syntax
 * (e.g., `typeof ExpoGlobal.EventEmitter<T>`) that Vitest can't parse.
 */

import { vi } from 'vitest'

export const EventEmitter = vi.fn()
export const NativeModule = vi.fn()
export const SharedObject = vi.fn()
export const SharedRef = vi.fn()
export const createPermissionHook = vi.fn(() => () => [null, vi.fn(), vi.fn()])
export const Platform = {
  OS: 'ios',
  select: (obj: any) => obj.ios ?? obj.default,
}
export const requireNativeModule = vi.fn(() => ({}))
export const requireOptionalNativeModule = vi.fn(() => null)
export const requireNativeViewManager = vi.fn(() => 'View')
