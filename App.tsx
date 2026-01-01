/**
 * Backtrack - Diagnostic Version
 * This minimal version helps identify what's causing the black screen
 */

// IMPORTANT: gesture-handler must be imported at the very top
import 'react-native-gesture-handler'

import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'

// Diagnostic component that shows environment and loading status
function DiagnosticScreen() {
  const [status, setStatus] = useState<string[]>(['App started...'])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const runDiagnostics = async () => {
      try {
        // Check environment variables
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        const mapsKey = process.env.EXPO_PUBLIC_GCP_MAPS_API_KEY

        setStatus(prev => [...prev, `SUPABASE_URL: ${supabaseUrl ? 'SET' : 'MISSING'}`])
        setStatus(prev => [...prev, `SUPABASE_KEY: ${supabaseKey ? 'SET' : 'MISSING'}`])
        setStatus(prev => [...prev, `MAPS_KEY: ${mapsKey ? 'SET' : 'MISSING'}`])
        setStatus(prev => [...prev, `__DEV__: ${__DEV__}`])

        // Try importing Supabase
        setStatus(prev => [...prev, 'Importing Supabase...'])
        const { supabase } = await import('./lib/supabase')
        setStatus(prev => [...prev, 'Supabase imported successfully'])

        // Try importing AuthContext
        setStatus(prev => [...prev, 'Importing AuthContext...'])
        await import('./contexts/AuthContext')
        setStatus(prev => [...prev, 'AuthContext imported successfully'])

        // Try importing AppNavigator
        setStatus(prev => [...prev, 'Importing AppNavigator...'])
        await import('./navigation/AppNavigator')
        setStatus(prev => [...prev, 'AppNavigator imported successfully'])

        setStatus(prev => [...prev, '✅ All imports successful!'])
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        setError(errorMessage)
        setStatus(prev => [...prev, `❌ ERROR: ${errorMessage}`])
      }
    }

    runDiagnostics()
  }, [])

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Backtrack Diagnostics</Text>
        
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Error Detected:</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>Status Log:</Text>
          {status.map((msg, i) => (
            <Text key={i} style={styles.statusText}>{msg}</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <DiagnosticScreen />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  container: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1C1917',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
  },
  statusBox: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
})
