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
import { createContext, useContext, Children, isValidElement } from "react";
import { Platform, View, type ViewStyle } from "react-native";

// We use NativeTreeContext to track if we are already inside a SwiftUI/Compose tree.
// If we are, we don't need another Host, and we must wrap RN children in RNHostView.
const NativeTreeContext = createContext(false);

/**
 * Universal RNHostView that bridges React Native components into the native hierarchy.
 * On iOS, this uses RNHostView from @expo/ui/swift-ui.
 */
function UniversalRNHostView({ children }: { children: React.ReactNode }) {
  if (Platform.OS === "ios") {
    let RNHostView: any;
    try {
      // Use dynamic require to avoid bundling issues on other platforms
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const uiSwiftUI = require("@expo/ui/swift-ui");
      RNHostView = uiSwiftUI.RNHostView;
    } catch (e) {
      console.error("Failed to load RNHostView from @expo/ui/swift-ui", e);
      return <>{children}</>;
    }

    if (!RNHostView) return <>{children}</>;

    return (
      <RNHostView matchContents>
        {isValidElement(children) ? children : <View>{children}</View>}
      </RNHostView>
    );
  }

  if (Platform.OS === "android") {
    let RNHostView: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const uiCompose = require("@expo/ui/jetpack-compose");
      RNHostView = uiCompose.RNHostView;
    } catch {
      return <>{children}</>;
    }

    if (!RNHostView) return <>{children}</>;

    return (
      <RNHostView matchContents>
        {isValidElement(children) ? children : <View>{children}</View>}
      </RNHostView>
    );
  }

  return <>{children}</>;
}

/**
 * Use this to wrap standard React Native views when they are children of a native container (like FieldSection).
 */
export function NativeHost({ children }: { children: React.ReactNode }) {
  const isInside = useContext(NativeTreeContext);
  if (!isInside) return <>{children}</>;
  return <UniversalRNHostView>{children}</UniversalRNHostView>;
}

/**
 * Ensures SwiftUI/Compose views have a Host when used outside a native tree,
 * and passes through when already hosted.
 */
function NativeBoundary({ children, matchContents, style }: { children: React.ReactNode; matchContents?: boolean; style?: ViewStyle }) {
  const isInside = useContext(NativeTreeContext);
  if (isInside) {
    return <>{children}</>;
  }
  return (
    <Host matchContents={matchContents} style={style}>
      <NativeTreeContext.Provider value={true}>
        {children}
      </NativeTreeContext.Provider>
    </Host>
  );
}

export function NativeFieldGroup({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <NativeBoundary style={style}>
      <ExpoFieldGroup style={{ backgroundColor: "transparent" }}>
        {children}
      </ExpoFieldGroup>
    </NativeBoundary>
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
  // Every child of a native Section MUST be wrapped in RNHostView if it's a React component.
  // We do this automatically here to restore the "missing" sections.
  const childrenWithHosting = Children.map(children, (child) => {
    if (!child) return null;
    return <NativeHost>{child}</NativeHost>;
  });

  return (
    <ExpoFieldGroup.Section title={title} titleUppercase>
      {childrenWithHosting}
      {footer ? (
        <ExpoFieldGroup.SectionFooter>
          <NativeHost>
            <View>
              <ExpoText style={{ opacity: 0.65 }}>{footer}</ExpoText>
            </View>
          </NativeHost>
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
  const isInside = useContext(NativeTreeContext);

  const content = (
    <ExpoRow alignment="center" onPress={onPress} style={{ paddingVertical: 8 }}>
      <ExpoColumn spacing={3} style={{ paddingRight: 8 }}>
        <ExpoText style={{ opacity: 0.9 }}>
          {title}
        </ExpoText>
        {subtitle ? (
          <ExpoText style={{ opacity: 0.6 }}>
            {subtitle}
          </ExpoText>
        ) : null}
      </ExpoColumn>
      {trailing ? (
        <NativeBoundary matchContents>{trailing}</NativeBoundary>
      ) : null}
    </ExpoRow>
  );

  if (isInside) return content;
  return <NativeBoundary matchContents>{content}</NativeBoundary>;
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
    <NativeBoundary matchContents>
      <ExpoButton label={title} onPress={onPress} variant={variant} disabled={disabled} />
    </NativeBoundary>
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
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <View key={option} style={{ flex: 1 }}>
            <NativeBoundary matchContents>
              <ExpoButton
                label={option}
                variant={selected ? "filled" : "outlined"}
                onPress={() => onChange(option)}
                style={{
                  height: 34,
                  borderRadius: 16,
                }}
              />
            </NativeBoundary>
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
      subtitle={value}
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
    <NativeBoundary>
      <ExpoBottomSheet isPresented={isPresented} onDismiss={onDismiss} showDragIndicator>
        {children}
      </ExpoBottomSheet>
    </NativeBoundary>
  );
}

export const NativeList = NativeFieldGroup;
export const NativeScreen = View;
