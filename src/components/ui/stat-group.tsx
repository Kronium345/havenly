import { Fragment } from "react";
import { StyleProp, View, ViewStyle } from "react-native";

import { tw } from "@/theme";

import { AppText } from "./text";

export type Stat = { label: string; value: string };

/** Numbers side by side on one outlined card, with hairlines between them. */
export function StatGroup({ stats, style }: { stats: Stat[]; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[tw`flex-row items-center rounded-xl border border-border py-4`, style]}>
      {stats.map((stat, index) => (
        <Fragment key={stat.label}>
          {index > 0 ? <View style={tw`h-12 w-px bg-border`} /> : null}
          <View accessible accessibilityLabel={`${stat.value} ${stat.label}`} style={tw`flex-1 items-center gap-0.5`}>
            <AppText variant="title">{stat.value}</AppText>
            <AppText variant="body">{stat.label}</AppText>
          </View>
        </Fragment>
      ))}
    </View>
  );
}
