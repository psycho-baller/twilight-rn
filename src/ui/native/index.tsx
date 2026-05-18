import {
  BottomSheet as ExpoBottomSheet,
  Button as ExpoButton,
  Column as ExpoColumn,
  FieldGroup as ExpoFieldGroup,
  Host,
  Row as ExpoRow,
  Text as ExpoText,
  Switch as ExpoSwitch,
  TextInput as ExpoTextInput,
  useNativeState,
} from "@expo/ui";
import { View, type ViewStyle } from "react-native";

import { useTwilightTheme } from "@/ui/surface";

// We use Host to wrap SwiftUI trees so they can be embedded in React Native.
// Inside a hosted tree (like NativeFieldGroup), we use ExpoRow/ExpoColumn/ExpoText 
// to stay in the native hierarchy and avoid dropping children.

export function NativeFieldGroup({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <Host style={style} matchContents>
      <ExpoFieldGroup style={{ backgroundColor: "transparent" }}>{children}</ExpoFieldGroup>
    </Host>
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
          <ExpoText style={{ color: theme.textSecondary, fontSize: 12 }}>{footer}</ExpoText>
        </ExpoFieldGroup.SectionFooter>
      ) : null}
    </ExpoFieldGroup.Section>
  );
}

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
  // We wrap in Host to ensure it can be used both inside and outside other hosted components.
  // matchContents ensures it doesn't take up more space than its native content needs.
  return (
    <Host matchContents>
      <ExpoRow alignment="center" onPress={onPress} style={{ paddingVertical: 8 }}>
        <ExpoColumn spacing={3} style={{ flex: 1, paddingRight: 8 }}>
          <ExpoText style={{ color: theme.textPrimary, fontSize: 15, fontWeight: "700" }}>
            {title}
          </ExpoText>
          {subtitle ? (
            <ExpoText style={{ color: theme.textSecondary, fontSize: 12 }}>
              {subtitle}
            </ExpoText>
          ) : null}
        </ExpoColumn>
        {trailing ? (
          <Host matchContents>{trailing}</Host>
        ) : null}
      </ExpoRow>
    </Host>
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
  return (
    <Host matchContents>
      <ExpoButton label={title} onPress={onPress} variant={variant} disabled={disabled} />
    </Host>
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
            <Host matchContents>
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
            </Host>
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
    <Host>
      <ExpoBottomSheet isPresented={isPresented} onDismiss={onDismiss} showDragIndicator>
        {children}
      </ExpoBottomSheet>
    </Host>
  );
}

export const NativeList = NativeFieldGroup;
export const NativeScreen = View;
