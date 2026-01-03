;

/**
 * OnboardingGuard Component
 *
 * Client-side component that handles redirecting new users to onboarding.
 * Wraps the main app content and ensures new users are directed to the
 * onboarding flow before accessing the main app.
 *
 * Features:
 * - Checks onboarding completion status from localStorage
 * - Redirects new users to /onboarding
 * - Allows returning users to bypass onboarding
 * - Shows loading state during hydration to prevent flash
 * - Excludes onboarding page from redirect logic
 *
 * @example
 * ```tsx
 * // In app/layout.tsx
 * <body>
 *   <OnboardingGuard>
 *     {children}
 *   </OnboardingGuard>
 * </body>
 * ```
 */

import { useEffect, useState, memo, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isOnboardingComplete } from '../utils/storage';

// ============================================================================
// TYPES
// ============================================================================

interface OnboardingGuardProps {
  /**
   * Children to render (the main app content)
   */
  children: ReactNode;
  /**
   * Optional loading component to show during hydration
   */
  fallback?: ReactNode;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Paths that should be excluded from onboarding redirect
 */
const EXCLUDED_PATHS = ['/onboarding'];

/**
 * Check if a path should be excluded from onboarding redirect
 */
function isExcludedPath(pathname: string): boolean {
  return EXCLUDED_PATHS.some(
    (excluded) => pathname === excluded || pathname.startsWith(`${excluded}/`)
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * OnboardingGuard - Redirects new users to onboarding
 *
 * This component must be rendered client-side because it accesses localStorage.
 * It shows the children immediately on excluded paths (like /onboarding) to
 * avoid unnecessary loading states.
 */
export const OnboardingGuard = memo(function OnboardingGuard({
  children,
  fallback,
}: OnboardingGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    // Skip check on excluded paths (like /onboarding itself)
    if (isExcludedPath(pathname)) {
      setIsChecking(false);
      return;
    }

    // Check if onboarding is complete
    const complete = isOnboardingComplete();

    if (!complete) {
      // New user - redirect to onboarding
      setShouldRedirect(true);
      router.replace('/onboarding');
    } else {
      // Returning user - allow access
      setIsChecking(false);
    }
  }, [pathname, router]);

  // On excluded paths, render children immediately
  if (isExcludedPath(pathname)) {
    return <>{children}</>;
  }

  // Show loading state while checking or redirecting
  // This prevents flash of main app before redirect
  if (isChecking || shouldRedirect) {
    if (fallback) {
      return <>{fallback}</>;
    }

    // Default minimal loading state
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
        <div className="text-center animate-pulse">
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Backtrack
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  // User has completed onboarding, show main app
  return <>{children}</>;
});

// ============================================================================
// EXPORTS
// ============================================================================

export default OnboardingGuard;
