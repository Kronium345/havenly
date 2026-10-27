import { View } from "react-native";

import { tw } from "@/theme";

export function ProgressDashes({ count, active }: { count: number; active: number }) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${active + 1} of ${count}`}
      style={tw`flex-row gap-2`}
    >
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={tw.style("h-1 w-8 rounded-full", i === active ? "bg-accent-deep" : "bg-border")}
        />
      ))}
    </View>
  );
}
