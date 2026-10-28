import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { StyleProp, View, ViewStyle } from "react-native";

import { IconButton } from "@/components/ui/icon-button";
import { AppText } from "@/components/ui/text";
import {
  fromIso,
  longDate,
  monthGrid,
  monthTitle,
  today,
  weekdayInitials,
  weekdayNamesMondayFirst,
  type IsoDate,
} from "@/lib/dates";
import { tw } from "@/theme";

type Nights = { checkIn: IsoDate; checkOut: IsoDate }[];

/** True when `day` is one of the nights in `ranges` (check-in up to the day before check-out). */
export const isNightIn = (ranges: Nights, day: IsoDate) => ranges.some((range) => day >= range.checkIn && day < range.checkOut);

/**
 * Read-only month view for hosts: booked nights are filled blue, blocked nights lime.
 * A night belongs to a stay from check-in up to the day before check-out.
 */
export function BookedNightsCalendar({
  booked,
  blocked = [],
  style,
}: {
  booked: Nights;
  blocked?: Nights;
  style?: StyleProp<ViewStyle>;
}) {
  const firstDay = today();
  const now = fromIso(firstDay);
  const [month, setMonth] = useState({ year: now.getFullYear(), index: now.getMonth() });
  const atFirstMonth = month.year === now.getFullYear() && month.index === now.getMonth();

  const step = (delta: number) =>
    setMonth(({ year, index }) => {
      const next = new Date(year, index + delta, 1, 12);
      return { year: next.getFullYear(), index: next.getMonth() };
    });

  return (
    <View style={style}>
      <View style={tw`flex-row items-center justify-between`}>
        <IconButton icon={ChevronLeft} accessibilityLabel="Previous month" size="md" disabled={atFirstMonth} onPress={() => step(-1)} />
        <AppText variant="headline" accessibilityRole="header" accessibilityLiveRegion="polite">
          {monthTitle(month.year, month.index)}
        </AppText>
        <IconButton icon={ChevronRight} accessibilityLabel="Next month" size="md" onPress={() => step(1)} />
      </View>

      <View style={tw`mt-3 flex-row`}>
        {weekdayInitials.map((initial, i) => (
          <View key={weekdayNamesMondayFirst[i]} style={tw`flex-1 items-center`}>
            <AppText variant="label" style={tw`text-muted`} accessibilityLabel={weekdayNamesMondayFirst[i]}>
              {initial}
            </AppText>
          </View>
        ))}
      </View>

      <View style={tw`mt-2 flex-row flex-wrap`}>
        {monthGrid(month.year, month.index).map((day, i) => {
          if (!day) return <View key={`pad-${i}`} style={tw`w-[14.2857%] h-11`} />;
          const taken = isNightIn(booked, day);
          const block = !taken && isNightIn(blocked, day);
          const past = day < firstDay;
          return (
            <View
              key={day}
              accessible
              accessibilityLabel={`${longDate(day)}, ${taken ? "booked" : block ? "blocked" : "free"}`}
              style={tw`w-[14.2857%] h-11 p-0.5`}
            >
              <View style={tw.style("flex-1 items-center justify-center rounded-full", taken && "bg-primary", block && "bg-accent-deep")}>
                <AppText
                  variant="callout"
                  style={tw.style(
                    taken ? "text-on-primary font-bold" : block ? "text-ink font-bold" : past ? "text-placeholder font-medium" : "text-ink font-medium",
                  )}
                >
                  {Number(day.slice(8))}
                </AppText>
              </View>
            </View>
          );
        })}
      </View>

      <View style={tw`mt-3 flex-row gap-5`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <LegendItem label="Booked" swatch="bg-primary" />
        <LegendItem label="Blocked" swatch="bg-accent-deep" />
      </View>
    </View>
  );
}

function LegendItem({ label, swatch }: { label: string; swatch: string }) {
  return (
    <View style={tw`flex-row items-center gap-2`}>
      <View style={tw.style("h-3 w-3 rounded-full", swatch)} />
      <AppText variant="caption">{label}</AppText>
    </View>
  );
}
