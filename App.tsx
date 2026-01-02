/**
 * Minimal App.tsx for crash debugging
 * This version has no external imports to isolate the crash source
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { StatusBar } from 'expo-status-bar'

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Backtrack</Text>
      <Text style={styles.subtitle}>Minimal Test Build</Text>
      <Text style={styles.info}>If you see this, the app is working!</Text>
      <StatusBar style="auto" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF9',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1C1917',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#FF6B47',
    marginBottom: 20,
  },
  info: {
    fontSize: 14,
    color: '#78716C',
    textAlign: 'center',
  },
})
