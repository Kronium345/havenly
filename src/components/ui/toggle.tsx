import { Switch, SwitchProps } from "react-native";

import { color } from "@/theme";

// react-native-web reads its own prop for the "on" thumb (default teal) and it
// isn't in the RN types, so it's passed untyped. Native ignores it.
const webThumb = { activeThumbColor: color("surface") } as object;

// Native switch with brand colors; the platform control is the design language.
export function Toggle(props: Omit<SwitchProps, "trackColor" | "thumbColor" | "ios_backgroundColor">) {
  return (
    <Switch
      trackColor={{ false: color("border"), true: color("primary") }}
      thumbColor={color("surface")}
      ios_backgroundColor={color("border")}
      {...webThumb}
      {...props}
    />
  );
}
