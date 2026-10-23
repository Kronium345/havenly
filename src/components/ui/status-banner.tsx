import { CircleAlert, CircleCheck, Info, X } from "lucide-react-native";
import { Pressable, StyleProp, View, ViewStyle } from "react-native";

import { tw } from "@/theme";

import { Icon } from "./icon";
import { AppText } from "./text";

const variants = {
  success: { background: "bg-success-tint", text: "text-success", tone: "success", icon: CircleCheck },
  error: { background: "bg-danger-tint", text: "text-danger", tone: "danger", icon: CircleAlert },
  info: { background: "bg-info-tint", text: "text-info", tone: "info", icon: Info },
} as const;

export function StatusBanner({
  message,
  variant = "success",
  onDismiss,
  style,
}: {
  message: string;
  variant?: keyof typeof variants;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const v = variants[variant];
  return (
    <View
      accessibilityRole="alert"
      style={[tw.style("flex-row items-center gap-3 rounded-lg px-4 py-3", v.background), style]}
    >
      <Icon as={v.icon} color={v.tone} />
      <AppText variant="callout" style={tw.style("flex-1 font-medium", v.text)}>
        {message}
      </AppText>
      {onDismiss ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          hitSlop={8}
          onPress={onDismiss}
        >
          <Icon as={X} size="md" color={v.tone} />
        </Pressable>
      ) : null}
    </View>
  );
}
