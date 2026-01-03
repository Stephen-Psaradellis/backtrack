# Component Architecture

This document describes the UI component architecture used in Backtrack, including the component hierarchy, reusable primitives, and design patterns.

## Table of Contents

- [Component Organization](#component-organization)
- [Reusable UI Components](#reusable-ui-components)
  - [Button](#button)
  - [Input](#input)
  - [Modal](#modal)
- [Component Patterns](#component-patterns)
  - [Variant System](#variant-system)
  - [Size System](#size-system)
  - [Forwarded Refs](#forwarded-refs)
  - [Loading States](#loading-states)
  - [Error States](#error-states)
- [Styling Patterns](#styling-patterns)
- [Accessibility](#accessibility)
- [Type Definitions](#type-definitions)
- [Related Documentation](#related-documentation)

---

## Component Organization

Backtrack's React components are organized into two categories:

```
components/
└── ui/                     # Reusable UI primitives
    ├── Button.tsx          # Button component with variants
    ├── Input.tsx           # Form input with validation
    └── Modal.tsx           # Accessible modal dialog

app/                        # Feature-specific components
├── layout.tsx              # Root layout with providers
├── page.tsx                # Landing page
└── [routes]/               # Route-specific components
    ├── page.tsx
    └── components/         # Co-located feature components
```

### Component Categories

| Category | Location | Purpose |
|----------|----------|---------|
| **UI Primitives** | `components/ui/` | Reusable, design-system-level components |
| **Feature Components** | `app/[route]/` | Route-specific, co-located with pages |
| **Layout Components** | `app/layout.tsx` | Shared layouts and providers |

---

## Reusable UI Components

### Button

A versatile button component with multiple visual variants and sizes.

**Location:** `components/ui/Button.tsx`

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | `'primary'` | Visual style variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `isLoading` | `boolean` | `false` | Shows loading spinner |
| `leftIcon` | `ReactNode` | - | Icon before text |
| `rightIcon` | `ReactNode` | - | Icon after text |
| `fullWidth` | `boolean` | `false` | Fills container width |
| `disabled` | `boolean` | `false` | Disables interactions |

#### Variant Styles

```
primary   - Pink background, white text (default action)
secondary - Gray background, dark text (secondary action)
ghost     - Transparent background (subtle action)
danger    - Red background, white text (destructive action)
```

#### Usage Examples

```tsx
import { Button } from '@/components/ui/Button';

// Primary button (default)
<Button onClick={handleSubmit}>Submit</Button>

// Secondary button
<Button variant="secondary" onClick={handleCancel}>Cancel</Button>

// Loading state
<Button isLoading>Saving...</Button>

// With icons
<Button leftIcon={<PlusIcon />}>Add Item</Button>

// Full width
<Button fullWidth>Full Width Button</Button>

// Danger action
<Button variant="danger" onClick={handleDelete}>Delete</Button>
```

---

### Input

A form input component with label, error states, and validation support.

**Location:** `components/ui/Input.tsx`

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | - | Label text above input |
| `error` | `string` | - | Error message (shows red state) |
| `helperText` | `string` | - | Helper text below input |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Input size |
| `fullWidth` | `boolean` | `false` | Fills container width |
| `leftIcon` | `ReactNode` | - | Icon inside input (left) |
| `rightIcon` | `ReactNode` | - | Icon inside input (right) |

#### Usage Examples

```tsx
import { Input } from '@/components/ui/Input';

// Basic input with label
<Input
  label="Email"
  type="email"
  placeholder="Enter your email"
/>

// With error state
<Input
  label="Password"
  type="password"
  error="Password must be at least 8 characters"
/>

// With helper text
<Input
  label="Username"
  helperText="Must be unique"
/>

// With icons
<Input
  label="Search"
  leftIcon={<SearchIcon />}
  placeholder="Search..."
/>

// Full width form input
<Input
  label="Message"
  fullWidth
  placeholder="Enter your message"
/>
```

---

### Modal

An accessible modal dialog with backdrop, focus trap, and customizable content areas.

**Location:** `components/ui/Modal.tsx`

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | - | Controls modal visibility |
| `onClose` | `() => void` | - | Called when modal should close |
| `title` | `ReactNode` | - | Modal header title |
| `description` | `string` | - | Accessible description |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` | `'md'` | Modal width |
| `showCloseButton` | `boolean` | `true` | Shows X button in header |
| `closeOnBackdropClick` | `boolean` | `true` | Close on backdrop click |
| `closeOnEscape` | `boolean` | `true` | Close on Escape key |
| `footer` | `ReactNode` | - | Footer content area |
| `centered` | `boolean` | `true` | Vertically center modal |

#### Usage Examples

```tsx
import { Modal } from '@/components/ui/Modal';

// Basic modal
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
>
  <p>Are you sure you want to continue?</p>
</Modal>

// With footer actions
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Edit Profile"
  size="lg"
  footer={
    <div className="flex gap-2 justify-end">
      <Button variant="secondary" onClick={handleClose}>
        Cancel
      </Button>
      <Button onClick={handleSave}>Save</Button>
    </div>
  }
>
  <form>...</form>
</Modal>

// Confirmation dialog
<Modal
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  title="Delete Post?"
  description="This action cannot be undone."
  size="sm"
  footer={
    <div className="flex gap-2 justify-end">
      <Button variant="secondary" onClick={() => setShowConfirm(false)}>
        Cancel
      </Button>
      <Button variant="danger" onClick={handleDelete}>
        Delete
      </Button>
    </div>
  }
>
  <p>Are you sure you want to delete this post?</p>
</Modal>
```

---

## Component Patterns

### Variant System

Components use a **variant pattern** for visual customization. Variants are defined as TypeScript types and mapped to Tailwind classes:

```tsx
// Type definition
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

// Style mapping
const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-pink-500 text-white hover:bg-pink-600 ...',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 ...',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 ...',
  danger: 'bg-red-500 text-white hover:bg-red-600 ...',
};
```

**Benefits:**
- Type-safe variant selection
- Easy to extend with new variants
- Consistent styling across instances
- Dark mode variants co-located

### Size System

Components implement a **size system** with small, medium, and large options:

```tsx
// Type definition
export type ButtonSize = 'sm' | 'md' | 'lg';

// Style mapping
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-base gap-2',
  lg: 'px-6 py-3 text-lg gap-2.5',
};
```

Size styles typically include:
- Padding adjustments
- Font size changes
- Icon size scaling
- Gap/spacing modifications

### Forwarded Refs

All reusable components use React's `forwardRef` to allow parent components to access the underlying DOM element:

```tsx
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', ...props }, ref) => {
    return (
      <button ref={ref} {...props}>
        {/* content */}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

**Use Cases:**
- Form submission via button refs
- Focus management
- Imperative DOM access
- Integration with third-party libraries

### Loading States

The Button component implements a **loading state pattern**:

```tsx
// Loading spinner component
function LoadingSpinner({ size }: { size: ButtonSize }) {
  const sizeClasses = { sm: 'h-3 w-3', md: 'h-4 w-4', lg: 'h-5 w-5' };
  return (
    <svg className={`animate-spin ${sizeClasses[size]}`}>
      {/* SVG paths */}
    </svg>
  );
}

// Button with loading state
<button disabled={isLoading} aria-busy={isLoading}>
  {isLoading ? <LoadingSpinner size={size} /> : null}
  <span>{children}</span>
</button>
```

**Features:**
- Automatic disabling during load
- Size-appropriate spinner
- `aria-busy` for accessibility
- Text remains visible during loading

### Error States

The Input component implements an **error state pattern**:

```tsx
const hasError = Boolean(error);

<input
  aria-invalid={hasError}
  aria-describedby={hasError ? errorId : undefined}
  className={hasError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}
/>

{hasError && (
  <p id={errorId} className="text-sm text-red-500" role="alert">
    {error}
  </p>
)}
```

**Features:**
- Visual feedback (red border)
- Error message display
- `aria-invalid` attribute
- `aria-describedby` linking
- `role="alert"` for screen readers

---

## Styling Patterns

### Tailwind CSS Integration

Components use a **composable class array pattern** for building styles:

```tsx
const baseStyles = [
  'inline-flex items-center justify-center',  // Layout
  'font-medium rounded-lg',                    // Typography & shape
  'transition-colors duration-200',            // Transitions
  'focus:outline-none focus:ring-2',           // Focus states
  'disabled:cursor-not-allowed',               // Disabled state
  variantStyles[variant],                      // Dynamic variant
  sizeStyles[size],                            // Dynamic size
  fullWidth ? 'w-full' : '',                   // Conditional
  className,                                   // User overrides
]
  .filter(Boolean)
  .join(' ');
```

**Benefits:**
- Readable, organized styles
- Easy to add conditional classes
- Supports custom class injection
- Filters out empty strings

### Dark Mode Support

All components include dark mode variants using Tailwind's `dark:` prefix:

```tsx
const inputStyles = [
  // Light mode
  'bg-white border-gray-300 text-gray-900',
  'placeholder:text-gray-400',

  // Dark mode
  'dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100',
  'dark:placeholder:text-gray-500',
];
```

---

## Accessibility

### ARIA Attributes

| Component | ARIA Features |
|-----------|--------------|
| **Button** | `aria-busy` during loading, `disabled` attribute |
| **Input** | `aria-invalid` for errors, `aria-describedby` for helper/error text |
| **Modal** | `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby` |

### Focus Management

The Modal component implements a **focus trap pattern**:

```tsx
// Get all focusable elements within modal
const getFocusableElements = useCallback(() => {
  const selectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
  ];
  return modalRef.current.querySelectorAll(selectors.join(', '));
}, []);

// Trap Tab key within modal
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Tab') {
    // Cycle focus within modal
  }
  if (event.key === 'Escape') {
    onClose();
  }
};
```

**Modal Focus Features:**
- Focus moves to first focusable element on open
- Tab cycles through modal content only
- Shift+Tab works in reverse
- Focus returns to trigger element on close
- Escape key closes modal

### Screen Reader Support

- **Labels:** Inputs have associated `<label>` elements with `htmlFor`
- **Descriptions:** `aria-describedby` links helper text and error messages
- **Roles:** Modal uses `role="dialog"` and `aria-modal="true"`
- **Hidden Icons:** Decorative icons use `aria-hidden="true"`
- **Announcements:** Error messages use `role="alert"` for immediate announcement

---

## Type Definitions

### Exported Types

Components export their types for use in consuming components:

```tsx
// Button types
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  // ...
}

// Input types
export type InputSize = 'sm' | 'md' | 'lg';
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  size?: InputSize;
  // ...
}

// Modal types
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export interface ModalProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  // ...
}
```

### Importing Types

```tsx
import { Button, type ButtonVariant, type ButtonProps } from '@/components/ui/Button';
import { Input, type InputProps } from '@/components/ui/Input';
import { Modal, type ModalSize } from '@/components/ui/Modal';
```

---

## Avatar Components

Backtrack uses the **Avataaars** library for avatar representation. Avatar configuration is managed through TypeScript types defined in `types/avatar.ts`.

### Avatar Configuration

```tsx
interface AvatarConfig {
  avatarStyle?: 'Circle' | 'Transparent';
  topType?: TopType;           // Hair/head style
  accessoriesType?: AccessoriesType;  // Glasses, etc.
  hairColor?: HairColor;
  facialHairType?: FacialHairType;
  clotheType?: ClotheType;
  clotheColor?: ClotheColor;
  eyeType?: EyeType;
  eyebrowType?: EyebrowType;
  mouthType?: MouthType;
  skinColor?: SkinColor;
}
```

### Avatar Usage

```tsx
import Avatar from 'avataaars';
import { createAvatarConfig, DEFAULT_AVATAR_CONFIG } from '@/types/avatar';

// Using defaults
<Avatar {...DEFAULT_AVATAR_CONFIG} />

// Custom configuration
const config = createAvatarConfig({
  topType: 'LongHairCurly',
  hairColor: 'Brown',
  skinColor: 'Light',
});

<Avatar {...config} />
```

---

## Related Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System overview and tech stack
- **[USER_FLOWS.md](./USER_FLOWS.md)** - Producer and Consumer journeys
- **[SUPABASE.md](./SUPABASE.md)** - Backend integration
- **[DATABASE.md](./DATABASE.md)** - Schema documentation
- **[DATA_FLOW.md](./DATA_FLOW.md)** - Data flow patterns
- **[README.md](./README.md)** - Documentation index

---

*Last updated: December 2024*
