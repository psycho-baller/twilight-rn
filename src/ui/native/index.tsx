import {
  BottomSheet as ExpoBottomSheet,
  Button as ExpoButton,
  FieldGroup as ExpoFieldGroup,
  Switch as ExpoSwitch,
  TextInput as ExpoTextInput,
  useNativeState,
} from "@expo/ui";
import { Text, View, type ViewStyle } from "react-native";

import { useTwilightTheme } from "@/ui/surface";

export function NativeFieldGroup({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={style}>
      <ExpoFieldGroup style={{ backgroundColor: "transparent" }}>{children}</ExpoFieldGroup>
    </View>
  );
}

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
    <ExpoFieldGroup.Section title={title} titleUppercase>
      {children}
      {footer ? (
        <ExpoFieldGroup.SectionFooter>
          <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 17 }}>{footer}</Text>
        </ExpoFieldGroup.SectionFooter>
      ) : null}
    </ExpoFieldGroup.Section>
  );
}

export function NativeRow({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
}) {
  const { theme } = useTwilightTheme();
  return (
    <View style={{ minHeight: 54, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}>
      <View style={{ flex: 1, gap: 3 }}>
        <Text selectable style={{ color: theme.textPrimary, fontSize: 15, fontWeight: "700" }}>
          {title}
        </Text>
        {subtitle ? (
          <Text selectable style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 17 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
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
  return (
    <NativeRow
      title={title}
      subtitle={subtitle}
      trailing={<ExpoSwitch value={value} onValueChange={onValueChange} disabled={disabled} />}
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
  return <ExpoButton label={title} onPress={onPress} variant={variant} disabled={disabled} />;
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
  const textState = useNativeState(value);
  return (
    <NativeRow
      title={title}
      trailing={
        <ExpoTextInput
          value={textState}
          onChangeText={onChangeText}
          placeholder={placeholder}
          multiline={multiline}
          textAlign="right"
          style={{ width: multiline ? 220 : 120, height: multiline ? 96 : 40 }}
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
    <View style={{ flexDirection: "row", gap: 6 }}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <View key={option} style={{ flex: 1 }}>
            <ExpoButton
              label={option}
              variant={selected ? "filled" : "outlined"}
              onPress={() => onChange(option)}
              style={{
                height: 34,
                borderRadius: 16,
                backgroundColor: selected ? theme.accent : "transparent",
              }}
            />
          </View>
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
    <NativeRow
      title={title}
      trailing={
        <NativeSegmentedControl
          options={options}
          value={value}
          onChange={onChange}
        />
      }
    />
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
  return (
    <NativeRow
      title={title}
      trailing={<ExpoButton label={value} variant="outlined" onPress={onPress} style={{ borderRadius: 14 }} />}
    />
  );
}

export function NativeBottomSheet({
  children,
  isPresented,
  onDismiss,
}: {
  children: React.ReactNode;
  isPresented: boolean;
  onDismiss: () => void;
}) {
  return (
    <ExpoBottomSheet isPresented={isPresented} onDismiss={onDismiss} showDragIndicator>
      {children}
    </ExpoBottomSheet>
  );
}

export const NativeList = NativeFieldGroup;
export const NativeScreen = View;
