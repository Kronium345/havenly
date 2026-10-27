import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleProp, View, ViewStyle } from "react-native";

import { fromIso, longDate, monthGrid, monthTitle, today, weekdayInitials, weekdayNamesMondayFirst, type IsoDate } from "@/lib/dates";
import { tw } from "@/theme";

import { IconButton } from "./icon-button";
import { AppText } from "./text";

export type DateRange = { checkIn?: IsoDate; checkOut?: IsoDate };

/**
 * Month calendar for picking check-in and check-out. First tap sets check-in, the next
 * later day sets check-out; tapping on or before check-in starts again. Past days are off.
 */
export function DateRangeCalendar({
  value,
  onChange,
  style,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const firstDay = today();
  const start = fromIso(value.checkIn ?? firstDay);
  const [month, setMonth] = useState({ year: start.getFullYear(), index: start.getMonth() });
  const now = fromIso(firstDay);
  const atFirstMonth = month.year === now.getFullYear() && month.index === now.getMonth();

  const step = (delta: number) =>
    setMonth(({ year, index }) => {
      const next = new Date(year, index + delta, 1, 12);
      return { year: next.getFullYear(), index: next.getMonth() };
    });

  const pick = (day: IsoDate) => {
    if (!value.checkIn || value.checkOut || day <= value.checkIn) onChange({ checkIn: day });
    else onChange({ checkIn: value.checkIn, checkOut: day });
  };

  return (
    <View style={style}>
      <View style={tw`flex-row items-center justify-between`}>
        <IconButton
          icon={ChevronLeft}
          accessibilityLabel="Previous month"
          size="md"
          disabled={atFirstMonth}
          onPress={() => step(-1)}
        />
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
          const past = day < firstDay;
          const isEnd = day === value.checkIn || day === value.checkOut;
          const inRange = !!value.checkIn && !!value.checkOut && day > value.checkIn && day < value.checkOut;
          const role = day === value.checkIn ? ", check-in" : day === value.checkOut ? ", check-out" : "";
          return (
            <View key={day} style={tw.style("w-[14.2857%] h-11 py-0.5", inRange && "bg-primary-tint")}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${longDate(day)}${role}`}
                accessibilityState={{ disabled: past, selected: isEnd }}
                disabled={past}
                onPress={() => pick(day)}
                style={({ pressed }) => [
                  tw.style("flex-1 items-center justify-center rounded-full", isEnd && "bg-primary"),
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <AppText
                  variant="callout"
                  style={tw.style(isEnd ? "text-on-primary" : past ? "text-placeholder" : "text-ink", isEnd ? "font-bold" : "font-medium")}
                >
                  {Number(day.slice(8))}
                </AppText>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}
