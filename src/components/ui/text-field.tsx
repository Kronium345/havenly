import { Eye, EyeOff, Search, SlidersHorizontal, type LucideIcon } from "lucide-react-native";
import { ComponentRef, Ref, useState } from "react";
import { Pressable, StyleProp, TextInput, TextInputProps, View, ViewStyle } from "react-native";

import { color, control, tw } from "@/theme";

import { Icon } from "./icon";
import { AppText } from "./text";

export function TextField({
  variant = "default",
  icon,
  label,
  onFilterPress,
  secureTextEntry,
  style,
  error,
  ref,
  onFocus,
  onBlur,
  ...inputProps
}: Omit<TextInputProps, "style"> & {
  variant?: "default" | "search";
  icon?: LucideIcon;
  /** Small label above the value, as on the auth forms. */
  label?: string;
  /** Search variant only: trailing filter action. */
  onFilterPress?: () => void;
  /** Validation message: draws the red border and is read as the field's hint. The
   *  message itself is shown by the screen (a toast), not inline. */
  error?: string;
  ref?: Ref<ComponentRef<typeof TextInput>>;
  style?: StyleProp<ViewStyle>;
}) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const leadingIcon = variant === "search" ? Search : icon;

  return (
    <View
      style={[
        tw.style(
          "flex-row items-center rounded-lg px-4 gap-3 border-[1.5px]",
          focused ? "bg-surface border-primary shadow-focus" : "bg-canvas border-transparent",
          error && "border-danger",
        ),
        { minHeight: label ? 60 : control.lg },
        style,
      ]}
    >
      {leadingIcon ? <Icon as={leadingIcon} /> : null}
      <View style={tw`flex-1 py-2`}>
        {label ? (
          <AppText variant="callout" style={tw`font-medium`}>
            {label}
          </AppText>
        ) : null}
        <TextInput
          {...inputProps}
          ref={ref}
          accessibilityLabel={inputProps.accessibilityLabel ?? label ?? inputProps.placeholder}
        accessibilityHint={error ?? inputProps.accessibilityHint}
          secureTextEntry={secureTextEntry && hidden}
          placeholderTextColor={color("placeholder")}
          selectionColor={color("primary")}
          cursorColor={color("primary")}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          // outlineStyle: drop the browser focus ring on web; the field draws its own.
          style={[tw`type-callout p-0`, { outlineStyle: "none" }]}
        />
      </View>
      {secureTextEntry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hidden ? "Show password" : "Hide password"}
          hitSlop={8}
          onPress={() => setHidden((value) => !value)}
        >
          <Icon as={hidden ? EyeOff : Eye} />
        </Pressable>
      ) : null}
      {variant === "search" && onFilterPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filters"
          hitSlop={8}
          onPress={onFilterPress}
        >
          <Icon as={SlidersHorizontal} />
        </Pressable>
      ) : null}
    </View>
  );
}
