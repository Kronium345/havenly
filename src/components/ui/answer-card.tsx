import { ChevronRight, FileText, type LucideIcon } from "lucide-react-native";
import { Pressable, StyleProp, View, ViewStyle } from "react-native";

import { tw } from "@/theme";

import { Icon } from "./icon";
import { AppText } from "./text";

type Footer =
  | { source: string; footer?: never; onSourcePress?: () => void }
  | { footer: string; source?: never; onSourcePress?: never };

/**
 * One quoted answer with its source. Body text is shown exactly as stored, never reworded.
 * Cards that quote nothing (e.g. "No answer found") take a plain `footer` instead of a source.
 */
export function AnswerCard({
  icon,
  title,
  body,
  lines,
  source,
  footer,
  onSourcePress,
  style,
}: Footer & {
  icon: LucideIcon;
  title: string;
  body?: string;
  lines?: string[];
  style?: StyleProp<ViewStyle>;
}) {
  const sourceRow = (
    <>
      {source ? <Icon as={FileText} size="sm" color="muted" /> : null}
      <AppText variant="caption" style={tw`flex-1`}>
        {source ? `Source: ${source}` : footer}
      </AppText>
      {onSourcePress ? <Icon as={ChevronRight} size="sm" color="muted" /> : null}
    </>
  );

  return (
    <View style={[tw`gap-2 rounded-xl bg-canvas p-4`, style]}>
      <View style={tw`flex-row items-center gap-2`}>
        <Icon as={icon} />
        <AppText variant="headline" style={tw`flex-1`}>
          {title}
        </AppText>
      </View>
      {body ? (
        <AppText variant="body" style={tw`text-ink`}>
          {body}
        </AppText>
      ) : null}
      {lines?.map((line, index) => (
        <View key={`${index}-${line}`} style={tw`flex-row gap-2`}>
          <AppText variant="body" style={tw`text-ink`}>
            •
          </AppText>
          <AppText variant="body" style={tw`flex-1 text-ink`}>
            {line}
          </AppText>
        </View>
      ))}
      {onSourcePress ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Source: ${source}. Open`}
          hitSlop={6}
          onPress={onSourcePress}
          style={({ pressed }) => [tw`flex-row items-center gap-2 border-t border-border pt-2`, { opacity: pressed ? 0.6 : 1 }]}
        >
          {sourceRow}
        </Pressable>
      ) : (
        <View style={tw`flex-row items-center gap-2 border-t border-border pt-2`}>{sourceRow}</View>
      )}
    </View>
  );
}
