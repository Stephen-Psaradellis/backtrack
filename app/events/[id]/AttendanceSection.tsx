'use client'

/**
 * AttendanceSection Component (Web)
 *
 * Shows attendance buttons for events on the web version.
 */

interface AttendanceSectionProps {
  eventId: string
  status: 'interested' | 'going' | 'went' | 'skipped' | null
  stats: { interested: number; going: number; went: number } | null
  onSetAttendance: (status: 'interested' | 'going' | 'went' | 'skipped' | null) => Promise<boolean>
  isLoading: boolean
}

export function AttendanceSection({
  eventId,
  status,
  stats,
  onSetAttendance,
  isLoading,
}: AttendanceSectionProps) {
  const handleClick = async (newStatus: 'interested' | 'going') => {
    if (status === newStatus) {
      await onSetAttendance(null) // Toggle off
    } else {
      await onSetAttendance(newStatus)
    }
  }

  return (
    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl" data-testid="attendance-section">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        Are you going?
      </h3>
      <div className="flex gap-3">
        <button
          onClick={() => handleClick('interested')}
          disabled={isLoading}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            status === 'interested'
              ? 'bg-amber-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          data-testid="interested-button"
        >
          Interested {stats?.interested ? `(${stats.interested})` : ''}
        </button>
        <button
          onClick={() => handleClick('going')}
          disabled={isLoading}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            status === 'going'
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          data-testid="going-button"
        >
          Going {stats?.going ? `(${stats.going})` : ''}
        </button>
      </div>
    </div>
  )
}

export default AttendanceSection
