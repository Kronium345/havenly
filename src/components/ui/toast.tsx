import { CircleAlert, CircleCheck, Info, type LucideIcon } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast, { ToastConfig, ToastConfigParams } from "react-native-toast-message";

import { ColorToken, tw } from "@/theme";

import { Icon } from "./icon";
import { AppText } from "./text";

const VISIBILITY_MS = 3500;

const tones: Record<"success" | "error" | "info", { tint: string; color: ColorToken; icon: LucideIcon }> = {
  success: { tint: "bg-success-tint", color: "success", icon: CircleCheck },
  error: { tint: "bg-danger-tint", color: "danger", icon: CircleAlert },
  info: { tint: "bg-info-tint", color: "info", icon: Info },
};

function ToastCard({ type, text1, text2 }: ToastConfigParams<unknown> & { type: keyof typeof tones }) {
  const tone = tones[type];
  return (
    <Pressable
      accessibilityRole="alert"
      accessibilityLabel={[text1, text2].filter(Boolean).join(" ")}
      onPress={() => Toast.hide()}
      style={tw`mx-screen flex-row items-center gap-3 self-stretch rounded-xl border border-border bg-surface px-4 py-3 shadow-raised`}
    >
      <View style={tw.style("h-8 w-8 items-center justify-center rounded-full", tone.tint)}>
        <Icon as={tone.icon} size="md" color={tone.color} />
      </View>
      <View style={tw`flex-1 gap-0.5`}>
        {text1 ? (
          <AppText variant="callout" style={tw`font-semibold`}>
            {text1}
          </AppText>
        ) : null}
        {text2 ? <AppText variant="caption">{text2}</AppText> : null}
      </View>
    </Pressable>
  );
}

const config: ToastConfig = {
  success: (params) => <ToastCard {...params} type="success" />,
  error: (params) => <ToastCard {...params} type="error" />,
  info: (params) => <ToastCard {...params} type="info" />,
};

/** The single app-wide toast host. Mount once, last, in the root layout. */
export function ToastHost() {
  const insets = useSafeAreaInsets();
  return (
    <Toast
      config={config}
      position="top"
      topOffset={insets.top + 8}
      visibilityTime={VISIBILITY_MS}
    />
  );
}

const show = (type: keyof typeof tones) => (title: string, message?: string) =>
  Toast.show({ type, text1: title, text2: message });

/** App feedback. Screens call this, never the toast library directly. */
export const toast = {
  success: show("success"),
  error: show("error"),
  info: show("info"),
  hide: () => Toast.hide(),
};
