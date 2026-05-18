import React from "react";
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type ViewStyle,
  Platform,
} from "react-native";

import { useTwilightTheme } from "@/ui/surface";

/**
 * A standard React Native replacement for the previous native-only FieldGroup.
 */
export function NativeFieldGroup({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.fieldGroup, style]}>{children}</View>;
}

/**
 * A standard React Native replacement for the previous native-only FieldSection.
 */
export function NativeFieldSection({
  title,
  footer,
  children,
}: {
  title?: string;
  footer?: string;
  children: React.ReactNode;
}) {
  const { theme } = useTwilightTheme();
  return (
    <View style={styles.fieldSection}>
      {title ? (
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {title.toUpperCase()}
        </Text>
      ) : null}
      <View style={[styles.sectionContent, { backgroundColor: theme.glass, borderColor: theme.outline }]}>
        {children}
      </View>
      {footer ? (
        <Text style={[styles.sectionFooter, { color: theme.textSecondary }]}>{footer}</Text>
      ) : null}
    </View>
  );
}

/**
 * A standard React Native row component.
 */
export function NativeRow({
  title,
  subtitle,
  trailing,
  onPress,
}: {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
}) {
  const { theme } = useTwilightTheme();
  const Container = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      style={({ pressed }: any) => [
        styles.row,
        pressed && styles.rowPressed,
        { borderBottomColor: theme.outline },
      ]}
    >
      <View style={styles.rowLabel}>
        <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      {trailing ? <View style={styles.rowTrailing}>{trailing}</View> : null}
    </Container>
  );
}

export function NativeSwitchRow({
  title,
  subtitle,
  value,
  onValueChange,
  disabled,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const { theme } = useTwilightTheme();
  return (
    <NativeRow
      title={title}
      subtitle={subtitle}
      trailing={
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ false: theme.outline, true: theme.accent }}
          thumbColor={Platform.OS === "ios" ? undefined : value ? theme.accent : "#f4f3f4"}
        />
      }
    />
  );
}

export function NativeActionButton({
  title,
  onPress,
  variant = "text",
  disabled,
}: {
  title: string;
  onPress?: () => void;
  variant?: "filled" | "outlined" | "text";
  disabled?: boolean;
}) {
  const { theme } = useTwilightTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionButton,
        variant === "filled" && { backgroundColor: theme.accent },
        variant === "outlined" && { borderWidth: 1, borderColor: theme.accent },
        pressed && { opacity: 0.7 },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text
        style={[
          styles.actionButtonText,
          { color: variant === "filled" ? "#000" : theme.accent },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function NativeTextField({
  title,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  title: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const { theme } = useTwilightTheme();
  return (
    <NativeRow
      title={title}
      trailing={
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          multiline={multiline}
          style={[
            styles.textField,
            { color: theme.textPrimary },
            multiline && { height: 80, textAlignVertical: "top" },
          ]}
        />
      }
    />
  );
}

export function NativeSegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { theme } = useTwilightTheme();
  return (
    <View style={styles.segmentedControl}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={[
              styles.segment,
              selected && { backgroundColor: theme.accent },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                { color: selected ? "#000" : theme.textPrimary },
              ]}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function NativePickerRow<T extends string>({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.pickerRow}>
      <Text style={styles.pickerTitle}>{title}</Text>
      <NativeSegmentedControl options={options} value={value} onChange={onChange} />
    </View>
  );
}

export function NativeDateTimeRow({
  title,
  value,
  onPress,
}: {
  title: string;
  value: string;
  onPress?: () => void;
}) {
  const { theme } = useTwilightTheme();
  return (
    <NativeRow
      title={title}
      trailing={
        <Pressable
          onPress={onPress}
          style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.glass }}
        >
          <Text style={{ color: theme.accent, fontWeight: "600" }}>{value}</Text>
        </Pressable>
      }
    />
  );
}

// Dummy implementation for now to keep things running
export function NativeHost({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export const NativeList = NativeFieldGroup;
export const NativeScreen = View;

const styles = StyleSheet.create({
  fieldGroup: {
    gap: 20,
  },
  fieldSection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 16,
    letterSpacing: 0.5,
  },
  sectionContent: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionFooter: {
    fontSize: 12,
    marginLeft: 16,
    marginRight: 16,
    lineHeight: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowLabel: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  rowSubtitle: {
    fontSize: 13,
  },
  rowTrailing: {
    marginLeft: 12,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  textField: {
    fontSize: 16,
    textAlign: "right",
    minWidth: 100,
    padding: 0,
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 2,
    gap: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
  },
  pickerRow: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    opacity: 0.6,
  },
});
