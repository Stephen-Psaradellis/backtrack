'use client'

import { useState, useCallback } from 'react'
import { AvatarBuilder } from '@/components/character-builder/AvatarBuilder'
import { AvatarConfig, DEFAULT_AVATAR_CONFIG } from '@/types/avatar'

// ============================================================================
// Types
// ============================================================================

interface PerformanceMetrics {
  renderCount: number
  lastConfigChangeTime: number | null
}

// ============================================================================
// Demo Page Component
// ============================================================================

/**
 * Demo page for testing the AvatarBuilder component.
 *
 * This page allows verification of:
 * - Avatar preview rendering
 * - Category tab switching
 * - Smooth scrolling through options (virtualization)
 * - Real-time avatar updates on selection
 * - Memory stability during scrolling
 */
export default function AvatarBuilderDemo() {
  // Track current avatar configuration
  const [config, setConfig] = useState<AvatarConfig>(DEFAULT_AVATAR_CONFIG)

  // Simple performance tracking
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    lastConfigChangeTime: null,
  })

  // Handle configuration changes from the builder
  const handleConfigChange = useCallback((newConfig: AvatarConfig) => {
    setConfig(newConfig)
    setMetrics((prev) => ({
      renderCount: prev.renderCount + 1,
      lastConfigChangeTime: Date.now(),
    }))
  }, [])

  // Reset to default configuration
  const handleReset = useCallback(() => {
    setConfig(DEFAULT_AVATAR_CONFIG)
    setMetrics({
      renderCount: 0,
      lastConfigChangeTime: null,
    })
  }, [])

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            AvatarBuilder Demo
          </h1>
          <p className="text-muted-foreground">
            Test virtualization performance and functionality
          </p>
        </header>

        {/* Main Content */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Avatar Builder Section */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              Avatar Builder
            </h2>
            <AvatarBuilder
              initialConfig={config}
              onChange={handleConfigChange}
              showOptionLabels={true}
              optionListHeight={300}
              className="shadow-md"
            />
          </section>

          {/* Debug Info Section */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              Debug Information
            </h2>

            {/* Performance Metrics Card */}
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <h3 className="font-medium text-foreground">
                Performance Metrics
              </h3>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-muted-foreground">Config Changes:</dt>
                <dd className="font-mono text-foreground">
                  {metrics.renderCount}
                </dd>
                <dt className="text-muted-foreground">Last Change:</dt>
                <dd className="font-mono text-foreground">
                  {metrics.lastConfigChangeTime
                    ? new Date(metrics.lastConfigChangeTime).toLocaleTimeString()
                    : 'N/A'}
                </dd>
              </dl>
            </div>

            {/* Current Configuration Card */}
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <h3 className="font-medium text-foreground">
                Current Configuration
              </h3>
              <pre className="text-xs font-mono bg-muted/50 rounded p-3 overflow-auto max-h-64">
                {JSON.stringify(config, null, 2)}
              </pre>
            </div>

            {/* Actions Card */}
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <h3 className="font-medium text-foreground">Actions</h3>
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Reset to Default
              </button>
            </div>

            {/* Verification Checklist */}
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <h3 className="font-medium text-foreground">
                Verification Checklist
              </h3>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                  Avatar preview renders correctly
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                  Category tabs switch correctly
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                  Options scroll smoothly without lag
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                  Selection updates avatar in real-time
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                  Memory usage stays stable when scrolling
                </li>
              </ul>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="text-center text-sm text-muted-foreground pt-8 border-t border-border">
          <p>
            Open browser DevTools to monitor memory usage and performance.
          </p>
        </footer>
      </div>
    </div>
  )
}
