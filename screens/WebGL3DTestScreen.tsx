/**
 * WebGL3DTestScreen - Test screen for 3D WebView proof of concept
 *
 * This screen demonstrates the WebGL3DView component rendering a
 * spinning 3D cube inside a React Native WebView.
 */

import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { WebGL3DView, WebGL3DViewRef } from '../components/avatar3d';

const COLORS = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Cyan', value: '#06b6d4' },
];

export function WebGL3DTestScreen(): React.ReactElement {
  const navigation = useNavigation();
  const webglRef = useRef<WebGL3DViewRef>(null);
  const [isReady, setIsReady] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value);
  const [isRotating, setIsRotating] = useState(true);

  const handleReady = useCallback(() => {
    console.log('[WebGL3DTest] 3D Renderer ready!');
    setIsReady(true);
  }, []);

  const handleSnapshot = useCallback((base64: string) => {
    console.log('[WebGL3DTest] Snapshot captured, length:', base64.length);
    Alert.alert('Snapshot Captured!', `Image size: ${Math.round(base64.length / 1024)} KB`);
  }, []);

  const handleError = useCallback((error: { message: string; code: string }) => {
    console.error('[WebGL3DTest] Error:', error);
    Alert.alert('WebGL Error', `${error.code}: ${error.message}`);
  }, []);

  const changeColor = useCallback((color: string) => {
    setSelectedColor(color);
    webglRef.current?.setConfig({ primaryColor: color } as any);
  }, []);

  const takeSnapshot = useCallback(() => {
    webglRef.current?.takeSnapshot('png');
  }, []);

  const toggleRotation = useCallback(() => {
    const newState = !isRotating;
    setIsRotating(newState);
    webglRef.current?.setRotation(newState);
  }, [isRotating]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>3D WebGL Test</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* 3D View */}
      <View style={styles.webglContainer}>
        <WebGL3DView
          ref={webglRef}
          style={styles.webglView}
          onReady={handleReady}
          onSnapshot={handleSnapshot}
          onError={handleError}
          debug={true}
        />
      </View>

      {/* Status */}
      <View style={styles.statusBar}>
        <View style={[styles.statusDot, isReady ? styles.statusReady : styles.statusLoading]} />
        <Text style={styles.statusText}>
          {isReady ? 'WebGL Ready' : 'Loading...'}
        </Text>
      </View>

      {/* Controls */}
      <ScrollView style={styles.controls} contentContainerStyle={styles.controlsContent}>
        {/* Color Picker */}
        <Text style={styles.sectionTitle}>Cube Color</Text>
        <View style={styles.colorPicker}>
          {COLORS.map((color) => (
            <TouchableOpacity
              key={color.value}
              style={[
                styles.colorButton,
                { backgroundColor: color.value },
                selectedColor === color.value && styles.colorButtonSelected,
              ]}
              onPress={() => changeColor(color.value)}
              disabled={!isReady}
            >
              {selectedColor === color.value && (
                <Text style={styles.colorCheck}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, !isReady && styles.actionButtonDisabled]}
            onPress={toggleRotation}
            disabled={!isReady}
          >
            <Text style={styles.actionButtonText}>
              {isRotating ? 'Stop Rotation' : 'Start Rotation'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary, !isReady && styles.actionButtonDisabled]}
            onPress={takeSnapshot}
            disabled={!isReady}
          >
            <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
              Take Snapshot
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Task 1: WebView 3D POC</Text>
          <Text style={styles.infoText}>
            This demonstrates Three.js rendering inside a React Native WebView.
            The spinning cube proves WebGL works on mobile.
          </Text>
          <Text style={styles.infoText}>
            • postMessage bridge: RN → WebView{'\n'}
            • onMessage bridge: WebView → RN{'\n'}
            • Snapshot capture: Canvas → Base64
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a',
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6366f1',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerSpacer: {
    width: 60,
  },
  webglContainer: {
    height: 300,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
  },
  webglView: {
    flex: 1,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusLoading: {
    backgroundColor: '#f97316',
  },
  statusReady: {
    backgroundColor: '#22c55e',
  },
  statusText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  controls: {
    flex: 1,
  },
  controlsContent: {
    padding: 16,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  colorPicker: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  colorButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorButtonSelected: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  colorCheck: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#2a2a3a',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonPrimary: {
    backgroundColor: '#6366f1',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  actionButtonTextPrimary: {
    color: '#fff',
  },
  infoBox: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
    marginBottom: 8,
  },
});

export default WebGL3DTestScreen;
