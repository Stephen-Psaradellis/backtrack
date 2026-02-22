/**
 * AvatarGalleryScreen - Browse, manage, and select saved avatars
 *
 * Features:
 * - Grid view of all saved avatars
 * - Create new avatar
 * - Load avatar into editor
 * - Delete avatars
 * - Rename avatars
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  useColorScheme,
  ActivityIndicator,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar } from '../avatar/Avatar';
import {
  StoredAvatar,
  DEFAULT_MALE_CONFIG,
  DEFAULT_FEMALE_CONFIG,
} from '../avatar/types';
import {
  loadAllAvatars,
  saveAvatar,
  deleteAvatar,
  updateAvatar,
  saveCurrentAvatar,
} from '../avatar/storage';
import { colors, darkTheme } from '../constants/theme';
import type { RootStackParamList } from '../navigation/AppNavigator';

type GalleryNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AvatarEditor'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_SIZE = (SCREEN_WIDTH - 48) / 2;

interface AvatarCardProps {
  avatar: StoredAvatar;
  isDark: boolean;
  onPress: () => void;
  onLongPress: () => void;
  isSelected?: boolean;
}

function AvatarCard({ avatar, isDark, onPress, onLongPress, isSelected }: AvatarCardProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isDark && styles.cardDark,
        isSelected && styles.cardSelected,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      <View style={[styles.avatarPreview, { backgroundColor: avatar.config.backgroundColor || (isDark ? darkTheme.surface : '#f5f5f5') }]}>
        <Avatar
          config={avatar.config}
          customSize={CARD_SIZE - 32}
          backgroundColor={avatar.config.backgroundColor}
        />
      </View>
      <View style={styles.cardInfo}>
        <Text
          style={[styles.avatarName, isDark && styles.avatarNameDark]}
          numberOfLines={1}
        >
          {avatar.name || 'Unnamed Avatar'}
        </Text>
        <Text style={[styles.avatarDate, isDark && styles.avatarDateDark]}>
          {formatDate(avatar.updatedAt)}
        </Text>
      </View>
      {isSelected && (
        <View style={styles.selectedBadge}>
          <Ionicons name="checkmark" size={16} color={colors.white} />
        </View>
      )}
    </TouchableOpacity>
  );
}

export function AvatarGalleryScreen() {
  const navigation = useNavigation<GalleryNavigationProp>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [avatars, setAvatars] = useState<StoredAvatar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAvatar, setSelectedAvatar] = useState<StoredAvatar | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameText, setRenameText] = useState('');

  // Load avatars on mount
  useEffect(() => {
    loadAvatars();
  }, []);

  const loadAvatars = async () => {
    setIsLoading(true);
    try {
      const loaded = await loadAllAvatars();
      setAvatars(loaded);
    } catch (error) {
      console.error('Failed to load avatars:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Create new avatar
  const handleCreateNew = useCallback((gender: 'male' | 'female') => {
    const defaultConfig = gender === 'male' ? DEFAULT_MALE_CONFIG : DEFAULT_FEMALE_CONFIG;
    navigation.navigate('AvatarEditor', { initialConfig: defaultConfig, isNewUser: true });
  }, [navigation]);

  const showGenderPicker = useCallback(() => {
    Alert.alert(
      'Create New Avatar',
      'Choose a starting point',
      [
        { text: 'Male', onPress: () => handleCreateNew('male') },
        { text: 'Female', onPress: () => handleCreateNew('female') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [handleCreateNew]);

  // Load avatar into editor
  const handleLoadAvatar = useCallback(async (avatar: StoredAvatar) => {
    try {
      await saveCurrentAvatar(avatar.config);
      navigation.navigate('AvatarEditor', { initialConfig: avatar.config });
    } catch (error) {
      Alert.alert('Error', 'Failed to load avatar');
    }
  }, [navigation]);

  // Show actions menu
  const handleAvatarLongPress = useCallback((avatar: StoredAvatar) => {
    setSelectedAvatar(avatar);
    Alert.alert(
      avatar.name || 'Unnamed Avatar',
      'What would you like to do?',
      [
        { text: 'Edit', onPress: () => handleLoadAvatar(avatar) },
        {
          text: 'Rename',
          onPress: () => {
            setRenameText(avatar.name || '');
            setShowRenameModal(true);
          },
        },
        {
          text: 'Duplicate',
          onPress: () => handleDuplicate(avatar),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDelete(avatar),
        },
        { text: 'Cancel', style: 'cancel', onPress: () => setSelectedAvatar(null) },
      ]
    );
  }, [handleLoadAvatar]);

  // Duplicate avatar
  const handleDuplicate = async (avatar: StoredAvatar) => {
    try {
      await saveAvatar(avatar.config, `${avatar.name || 'Avatar'} (Copy)`);
      await loadAvatars();
      Alert.alert('Success', 'Avatar duplicated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to duplicate avatar');
    }
    setSelectedAvatar(null);
  };

  // Delete avatar
  const handleDelete = (avatar: StoredAvatar) => {
    Alert.alert(
      'Delete Avatar',
      `Are you sure you want to delete "${avatar.name || 'this avatar'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAvatar(avatar.id);
              await loadAvatars();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete avatar');
            }
          },
        },
      ]
    );
    setSelectedAvatar(null);
  };

  // Rename avatar
  const handleRename = async () => {
    if (!selectedAvatar) return;
    try {
      await updateAvatar(selectedAvatar.id, {}, renameText);
      await loadAvatars();
      setShowRenameModal(false);
      setSelectedAvatar(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to rename avatar');
    }
  };

  // Close screen
  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const renderAvatar = ({ item }: { item: StoredAvatar }) => (
    <AvatarCard
      avatar={item}
      isDark={isDark}
      onPress={() => handleLoadAvatar(item)}
      onLongPress={() => handleAvatarLongPress(item)}
      isSelected={selectedAvatar?.id === item.id}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="people-outline"
        size={64}
        color={isDark ? darkTheme.textMuted : colors.neutral[300]}
      />
      <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
        No saved avatars yet
      </Text>
      <Text style={[styles.emptySubtext, isDark && styles.emptySubtextDark]}>
        Create your first avatar to get started
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      {/* Header */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons
            name="close"
            size={24}
            color={isDark ? darkTheme.textPrimary : colors.neutral[700]}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
          Avatar Gallery
        </Text>
        <TouchableOpacity style={styles.addButton} onPress={showGenderPicker}>
          <Ionicons name="add" size={24} color={colors.primary[500]} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : (
        <FlatList
          data={avatars}
          renderItem={renderAvatar}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.row}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create New Button */}
      <TouchableOpacity style={styles.fabButton} onPress={showGenderPicker}>
        <LinearGradient
          colors={[colors.primary[500], colors.accent[500]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color={colors.white} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Rename Modal */}
      <Modal
        visible={showRenameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRenameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
            <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>
              Rename Avatar
            </Text>
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Enter avatar name"
              placeholderTextColor={isDark ? darkTheme.textMuted : colors.neutral[400]}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setShowRenameModal(false);
                  setSelectedAvatar(null);
                }}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleRename}
              >
                <Text style={styles.modalButtonTextPrimary}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

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
  },
  headerDark: {
    borderBottomColor: darkTheme.glassBorder,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  headerTitleDark: {
    color: darkTheme.textPrimary,
  },
  closeButton: {
    padding: 8,
  },
  addButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
  },
  card: {
    width: CARD_SIZE,
    backgroundColor: colors.white,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: darkTheme.surface,
    borderColor: darkTheme.glassBorder,
  },
  cardSelected: {
    borderColor: colors.primary[500],
    borderWidth: 2,
  },
  avatarPreview: {
    width: '100%',
    height: CARD_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    overflow: 'hidden',
  },
  cardInfo: {
    padding: 12,
  },
  avatarName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  avatarNameDark: {
    color: darkTheme.textPrimary,
  },
  avatarDate: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 2,
  },
  avatarDateDark: {
    color: darkTheme.textMuted,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[600],
    marginTop: 16,
  },
  emptyTextDark: {
    color: darkTheme.textPrimary,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 8,
  },
  emptySubtextDark: {
    color: darkTheme.textMuted,
  },
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
  },
  modalContentDark: {
    backgroundColor: darkTheme.surface,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 16,
  },
  modalTitleDark: {
    color: darkTheme.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.neutral[900],
    marginBottom: 20,
  },
  inputDark: {
    borderColor: darkTheme.glassBorder,
    backgroundColor: darkTheme.background,
    color: darkTheme.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: colors.primary[500],
  },
  modalButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },
  modalButtonTextPrimary: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextSecondary: {
    color: colors.neutral[600],
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AvatarGalleryScreen;
