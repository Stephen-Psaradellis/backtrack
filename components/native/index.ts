/**
 * Native Components
 *
 * Platform-specific React Native components with theme integration.
 */

// Text
export { default as Text } from './Text';

// Icon
export { Icon, ICON_MAP } from './Icon';
export type { IconProps, SemanticIconName } from './Icon';

// Button
export { default as Button } from './Button';

// Card
export { Card, CardHeader, CardContent, CardFooter } from './Card';
export type { CardProps, CardSectionProps } from './Card';

// TextInput
export { TextInput } from './TextInput';
export type { TextInputProps } from './TextInput';

// Avatar
export { default as Avatar, AvatarGroup } from './Avatar';

// Toast
export { Toast } from './Toast';
export type { ToastProps } from './Toast';

// BottomSheet & Dialog
export { default as BottomSheet, Dialog } from './BottomSheet';

// SegmentedControl
export { default as SegmentedControl } from './SegmentedControl';
export type { SegmentedControlProps } from './SegmentedControl';

// SafeScreen
export { default as SafeScreen } from './SafeScreen';
export type { SafeScreenProps } from './SafeScreen';

// PressableScale
export { PressableScale } from './PressableScale';
export type { PressableScaleProps } from './PressableScale';
