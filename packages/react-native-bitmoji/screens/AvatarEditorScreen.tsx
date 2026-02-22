/**
 * AvatarEditorScreen
 *
 * Full-screen avatar editor with category tabs, preview panel,
 * and option/color selection grids.
 */
import React, { useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { captureAndShare, captureAndSaveToGallery } from '../services/export';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  useAvatarEditor,
  EDITOR_CATEGORIES,
  CategoryTabs,
  OptionGrid,
  ColorPicker,
  PreviewPanel,
  ProportionSliderGroup,
  useFavorites,
} from '../avatar';
import { FacialProportions, DEFAULT_FACIAL_PROPORTIONS } from '../avatar/types';
import { colors, darkTheme } from '../constants/theme';
import { saveCurrentAvatar } from '../avatar/storage';
import type { AvatarConfig } from '../avatar';
import type { RootStackParamList } from '../navigation/AppNavigator';
// =============================================================================
// TYPES
// =============================================================================
type AvatarEditorRouteProp = RouteProp<RootStackParamList, 'AvatarEditor'>;
type AvatarEditorNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AvatarEditor'>;

interface AvatarEditorScreenProps {
  initialConfig?: AvatarConfig;
  onSave?: (config: AvatarConfig) => void;
  onCancel?: () => void;
}
// =============================================================================
// COMPONENT
// =============================================================================
export function AvatarEditorScreen({
  initialConfig: propInitialConfig,
  onSave,
  onCancel,
}: AvatarEditorScreenProps) {
  const navigation = useNavigation<AvatarEditorNavigationProp>();
  const route = useRoute<AvatarEditorRouteProp>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Get initial config from route params or props
  const initialConfig = route.params?.initialConfig || propInitialConfig;

  const {
    config,
    activeCategory,
    activeSubcategory,
    isDirty,
    setCategory,
    setSubcategory,
    updateConfig,
    randomize,
    randomizeCategory,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useAvatarEditor({ initialConfig });

  // Favorites hook
  const {
    isFavorited,
    toggleFavorite,
    showOnlyFavorites,
    setShowOnlyFavorites,
    favoritesCount,
  } = useFavorites();
  // Get active category configuration
  const activeCategoryConfig = useMemo(
    () => EDITOR_CATEGORIES.find((c) => c.key === activeCategory),
    [activeCategory]
  );
  // Get active subcategory configuration
  const activeSubcategoryConfig = useMemo(
    () =>
      activeCategoryConfig?.subcategories.find((s) => s.key === activeSubcategory),
    [activeCategoryConfig, activeSubcategory]
  );
  // Category tabs data
  const categoryTabs = useMemo(
    () =>
      EDITOR_CATEGORIES.map((cat) => ({
        key: cat.key,
        label: cat.label,
        icon: cat.icon as any,
      })),
    []
  );
  // Handle option selection
  const handleOptionSelect = useCallback(
    (optionId: string) => {
      if (activeSubcategoryConfig) {
        updateConfig({ [activeSubcategoryConfig.configKey]: optionId });
      }
    },
    [activeSubcategoryConfig, updateConfig]
  );
  // Handle color selection
  const handleColorSelect = useCallback(
    (color: string) => {
      if (activeSubcategoryConfig) {
        updateConfig({ [activeSubcategoryConfig.configKey]: color });
      }
    },
    [activeSubcategoryConfig, updateConfig]
  );
  // Handle proportions change
  const handleProportionsChange = useCallback(
    (proportions: FacialProportions) => {
      updateConfig({ facialProportions: proportions });
    },
    [updateConfig]
  );
  // Handle randomize category
  const handleRandomizeCategory = useCallback(() => {
    randomizeCategory(activeCategory);
  }, [randomizeCategory, activeCategory]);
  // Handle save
  const handleSave = useCallback(async () => {
    try {
      await saveCurrentAvatar(config);
      onSave?.(config);
      Alert.alert('Saved', 'Your avatar has been saved!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save avatar');
    }
  }, [config, onSave]);

  // Navigate to sticker picker
  const handleOpenStickers = useCallback(() => {
    navigation.navigate('StickerPicker', { avatarConfig: config });
  }, [navigation, config]);

  // Navigate to avatar gallery
  const handleOpenGallery = useCallback(() => {
    navigation.navigate('AvatarGallery');
  }, [navigation]);

  // Navigate to QA test screen (dev tool)
  const handleOpenQATest = useCallback(() => {
    navigation.navigate('QATest');
  }, [navigation]);

  // Share avatar
  const avatarRef = useRef<View>(null);
  const handleShare = useCallback(() => {
    Alert.alert(
      'Share Avatar',
      'Choose how you would like to share',
      [
        {
          text: 'Share',
          onPress: async () => {
            if (avatarRef.current) {
              const result = await captureAndShare(avatarRef, {
                title: 'Check out my avatar!',
                size: 'large',
              });
              if (!result.success && result.error) {
                Alert.alert('Error', result.error);
              }
            }
          },
        },
        {
          text: 'Save to Gallery',
          onPress: async () => {
            if (avatarRef.current) {
              const result = await captureAndSaveToGallery(avatarRef, {
                size: 'xlarge',
              });
              if (result.success) {
                Alert.alert('Saved', 'Avatar saved to your photo gallery!');
              } else if (result.error) {
                Alert.alert('Error', result.error);
              }
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, []);
  // Get current value for the active subcategory
  const currentValue = activeSubcategoryConfig
    ? config[activeSubcategoryConfig.configKey as keyof AvatarConfig]
    : undefined;
  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {/* Header */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={onCancel}
          activeOpacity={0.7}
        >
          <Ionicons
            name="close"
            size={24}
            color={isDark ? darkTheme.textPrimary : colors.neutral[700]}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
          Avatar Editor
        </Text>
        <View style={styles.headerRight}>
          {__DEV__ && (
            <TouchableOpacity
              style={styles.stickersButton}
              onPress={handleOpenQATest}
              activeOpacity={0.7}
            >
              <Ionicons
                name="bug-outline"
                size={22}
                color={isDark ? darkTheme.textPrimary : colors.neutral[700]}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.stickersButton}
            onPress={handleOpenGallery}
            activeOpacity={0.7}
          >
            <Ionicons
              name="albums-outline"
              size={22}
              color={isDark ? darkTheme.textPrimary : colors.neutral[700]}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.stickersButton}
            onPress={handleOpenStickers}
            activeOpacity={0.7}
          >
            <Ionicons
              name="happy-outline"
              size={22}
              color={isDark ? darkTheme.textPrimary : colors.neutral[700]}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, !isDirty && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!isDirty}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={isDirty ? [colors.primary[500], colors.accent[500]] : [colors.neutral[300], colors.neutral[400]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.saveButtonGradient}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
      {/* Preview Panel */}
      <View ref={avatarRef} collapsable={false}>
        <PreviewPanel
          config={config}
          activeCategory={activeCategory}
          onRandomize={randomize}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          isDirty={isDirty}
          onExpressionSelect={updateConfig}
          onShare={handleShare}
        />
      </View>
      {/* Category Tabs */}
      <CategoryTabs
        categories={categoryTabs}
        activeCategory={activeCategory}
        onSelectCategory={setCategory}
      />
      {/* Subcategory Tabs */}
      {activeCategoryConfig && activeCategoryConfig.subcategories.length > 0 && (
        <View style={[styles.subcategoryRow, isDark && styles.subcategoryRowDark]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.subcategoryScrollView}
            contentContainerStyle={styles.subcategoryTabsContent}
          >
            {activeCategoryConfig.subcategories.map((subcat) => {
              const isActive = subcat.key === activeSubcategory;
              return (
                <TouchableOpacity
                  key={subcat.key}
                  style={[
                    styles.subcategoryTab,
                    isActive && styles.subcategoryTabActive,
                    isDark && styles.subcategoryTabDark,
                    isActive && isDark && styles.subcategoryTabActiveDark,
                  ]}
                  onPress={() => setSubcategory(subcat.key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.subcategoryTabText,
                      isActive && styles.subcategoryTabTextActive,
                      isDark && styles.subcategoryTabTextDark,
                      isActive && isDark && styles.subcategoryTabTextActiveDark,
                    ]}
                  >
                    {subcat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {/* Favorites toggle button */}
          <TouchableOpacity
            style={[
              styles.favoritesToggleButton,
              isDark && styles.favoritesToggleButtonDark,
              showOnlyFavorites && styles.favoritesToggleButtonActive,
            ]}
            onPress={() => setShowOnlyFavorites(!showOnlyFavorites)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showOnlyFavorites ? 'heart' : 'heart-outline'}
              size={18}
              color={showOnlyFavorites ? colors.red[500] : (isDark ? colors.neutral[400] : colors.neutral[500])}
            />
            {favoritesCount > 0 && (
              <View style={styles.favoritesBadge}>
                <Text style={styles.favoritesBadgeText}>
                  {favoritesCount > 99 ? '99+' : favoritesCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.randomCategoryButton, isDark && styles.randomCategoryButtonDark]}
            onPress={handleRandomizeCategory}
            activeOpacity={0.7}
          >
            <Ionicons
              name="shuffle"
              size={18}
              color={isDark ? colors.primary[400] : colors.primary[500]}
            />
          </TouchableOpacity>
        </View>
      )}
      {/* Content Area */}
      <View style={[styles.content, isDark && styles.contentDark]}>
        {activeSubcategoryConfig?.type === 'colors' && activeSubcategoryConfig.colors && (
          <ColorPicker
            colors={activeSubcategoryConfig.colors}
            selectedColor={currentValue as string}
            onSelect={handleColorSelect}
            columns={5}
            size="medium"
          />
        )}
        {activeSubcategoryConfig?.type === 'options' && activeSubcategoryConfig.options && (
          <OptionGrid
            options={activeSubcategoryConfig.options}
            selectedId={currentValue as string}
            onSelect={handleOptionSelect}
            columns={4}
            showLabels
            categoryKey={activeSubcategoryConfig.key}
            isFavorited={isFavorited}
            onToggleFavorite={toggleFavorite}
            showOnlyFavorites={showOnlyFavorites}
          />
        )}
        {activeSubcategoryConfig?.type === 'sliders' && (
          <ProportionSliderGroup
            proportions={config.facialProportions || DEFAULT_FACIAL_PROPORTIONS}
            onChange={handleProportionsChange}
          />
        )}
        {!activeSubcategoryConfig && activeCategoryConfig && (
          <View style={styles.emptyState}>
            <Ionicons
              name="construct-outline"
              size={48}
              color={isDark ? darkTheme.textMuted : colors.neutral[400]}
            />
            <Text
              style={[
                styles.emptyStateText,
                { color: isDark ? darkTheme.textMuted : colors.neutral[500] },
              ]}
            >
              Select a subcategory to customize
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
// =============================================================================
// STYLES
// =============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  containerDark: {
    backgroundColor: darkTheme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.white,
    ...Platform.select({
      android: {
        paddingTop: StatusBar.currentHeight || 0,
      },
    }),
  },
  headerDark: {
    backgroundColor: darkTheme.surface,
    borderBottomColor: darkTheme.glassBorder,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  headerTitleDark: {
    color: darkTheme.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stickersButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  subcategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.neutral[50],
  },
  subcategoryRowDark: {
    backgroundColor: darkTheme.backgroundAlt,
    borderBottomColor: darkTheme.glassBorder,
  },
  subcategoryScrollView: {
    flex: 1,
    maxHeight: 48,
  },
  subcategoryTabsContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  randomCategoryButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  randomCategoryButtonDark: {
    backgroundColor: 'rgba(94, 108, 216, 0.15)',
    borderColor: colors.primary[500],
  },
  favoritesToggleButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    position: 'relative',
  },
  favoritesToggleButtonDark: {
    backgroundColor: darkTheme.surface,
    borderColor: darkTheme.glassBorder,
  },
  favoritesToggleButtonActive: {
    backgroundColor: colors.red[50],
    borderColor: colors.red[200],
  },
  favoritesBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.red[500],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  favoritesBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  subcategoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: 'transparent',
  },
  subcategoryTabActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[300],
  },
  subcategoryTabDark: {
    backgroundColor: darkTheme.surface,
  },
  subcategoryTabActiveDark: {
    backgroundColor: 'rgba(94, 108, 216, 0.2)',
    borderColor: colors.primary[500],
  },
  subcategoryTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.neutral[600],
  },
  subcategoryTabTextActive: {
    color: colors.primary[600],
    fontWeight: '600',
  },
  subcategoryTabTextDark: {
    color: darkTheme.textSecondary,
  },
  subcategoryTabTextActiveDark: {
    color: colors.primary[400],
  },
  content: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  contentDark: {
    backgroundColor: darkTheme.background,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});
export default AvatarEditorScreen;
