import { Text, TextProps } from "react-native";

import { tw, TextVariant } from "@/theme";

export function AppText({
  variant = "body",
  style,
  ...props
}: TextProps & { variant?: TextVariant }) {
  return <Text style={[tw.style(`type-${variant}`), style]} {...props} />;
}
