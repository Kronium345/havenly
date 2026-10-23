import { ChevronRight, type LucideIcon } from "lucide-react-native";
import { Children, Fragment, ReactNode } from "react";
import { Pressable, StyleProp, View, ViewStyle } from "react-native";

import { tw } from "@/theme";

import { Icon } from "./icon";
import { AppText } from "./text";

export function ProfileRow({
  icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        tw`flex-row items-center gap-4 px-3 py-2.5`,
        pressed && tw`bg-canvas`,
      ]}
    >
      <View style={tw`h-11 w-11 items-center justify-center rounded-md bg-canvas`}>
        <Icon as={icon} />
      </View>
      <AppText variant="callout" style={tw`flex-1`}>
        {label}
      </AppText>
      <Icon as={ChevronRight} size="md" />
    </Pressable>
  );
}

/** Groups rows on one surface with hairlines between them, not a box per row. */
export function ProfileRowGroup({
  title,
  children,
  style,
}: {
  title?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const rows = Children.toArray(children);
  return (
    <View style={[tw`gap-3`, style]}>
      {title ? (
        <AppText variant="title" accessibilityRole="header" style={tw`px-1`}>
          {title}
        </AppText>
      ) : null}
      <View style={tw`rounded-xl bg-surface overflow-hidden`}>
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 ? <View style={tw`ml-[72px] mr-3 h-px bg-border`} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}
