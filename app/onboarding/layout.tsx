import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Started - Backtrack",
  description: "Welcome to Backtrack! Let's get you set up to discover missed connections.",
};

/**
 * Layout for the onboarding flow.
 * Provides a minimal, distraction-free environment for the onboarding experience.
 * Mobile-first design with centered content and appropriate max-width constraints.
 */
export default function OnboardingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-primary-50 dark:from-gray-900 dark:to-gray-800">
      <main className="flex min-h-screen flex-col">
        {/* Onboarding content container - mobile-first with max-width for larger screens */}
        <div className="flex flex-1 flex-col w-full max-w-lg mx-auto px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
