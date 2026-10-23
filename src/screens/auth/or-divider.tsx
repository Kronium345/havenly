import { View } from "react-native";

import { AppText } from "@/components/ui/text";
import { tw } from "@/theme";

export function OrDivider() {
  return (
    <View style={tw`my-5 flex-row items-center gap-4`}>
      <View style={tw`h-px flex-1 bg-border`} />
      <AppText variant="caption" style={tw`font-regular`}>
        or
      </AppText>
      <View style={tw`h-px flex-1 bg-border`} />
    </View>
  );
}
