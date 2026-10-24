import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ChevronLeft } from "lucide-react-native";
import { ComponentRef, ReactNode, useEffect, useRef, useState } from "react";
import { LayoutChangeEvent, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StayListMessage } from "@/components/stay-list-states";
import { IconButton } from "@/components/ui/icon-button";
import { AppText } from "@/components/ui/text";
import { useApiQuery } from "@/lib/api";
import type { StayDetails } from "@/lib/search/types";
import { tw } from "@/theme";

// Policy text is shown exactly as stored in Sanity, with its source. Nothing is
// generated or reworded. Questions come with the Context + Jev plan.
export function PoliciesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { slug, section } = useLocalSearchParams<{ slug: string; section?: string }>();
  const stay = useApiQuery<StayDetails>(slug ? `/api/stays/${encodeURIComponent(slug)}` : null);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [sectionY, setSectionY] = useState<number | null>(null);

  const goBack = () => (router.canGoBack() ? router.back() : router.navigate("/home"));
  // Open at the cancellation policy when the guest came from its card.
  useEffect(() => {
    if (sectionY !== null) scrollRef.current?.scrollTo({ y: Math.max(sectionY - 8, 0), animated: false });
  }, [sectionY]);
  const onSectionLayout = (key: string) =>
    key === section
      ? (event: LayoutChangeEvent) => {
          const y = event.nativeEvent.layout.y;
          setSectionY((current) => current ?? y);
        }
      : undefined;

  return (
    <View style={tw`flex-1 bg-surface`}>
      <StatusBar style="dark" />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[tw`px-screen`, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
      >
        <IconButton icon={ChevronLeft} accessibilityLabel="Back" variant="outline" size="md" onPress={goBack} />
        <AppText variant="hero" accessibilityRole="header" style={tw`mt-7`}>
          Policies
        </AppText>

        {stay.status === "loading" ? (
          <View accessibilityRole="progressbar" accessibilityLabel="Loading policies" style={tw`mt-6 gap-3`}>
            {[0, 1, 2].map((key) => (
              <View key={key} style={tw`h-24 rounded-xl bg-canvas`} />
            ))}
          </View>
        ) : stay.status === "error" ? (
          <StayListMessage title="Couldn't load the policies." message={stay.error.message} actionLabel="Try again" onAction={stay.retry} />
        ) : (
          <>
            <AppText variant="body" style={tw`mt-3`}>
              For {stay.data.title}. Shown exactly as written by the host and Havenly.
            </AppText>
            <View style={tw`mt-6 gap-6`}>
              {stay.data.cancellationPolicy ? (
                <PolicySection
                  title={stay.data.cancellationPolicy.title}
                  source="This stay"
                  onLayout={onSectionLayout("cancellation")}
                >
                  <AppText variant="body" style={tw`text-ink`}>
                    {stay.data.cancellationPolicy.body}
                  </AppText>
                </PolicySection>
              ) : null}
              {stay.data.checkInTime || stay.data.checkOutTime ? (
                <PolicySection title="Check-in and check-out" source="This stay">
                  {stay.data.checkInTime ? (
                    <AppText variant="body" style={tw`text-ink`}>
                      Check-in: {stay.data.checkInTime}
                    </AppText>
                  ) : null}
                  {stay.data.checkOutTime ? (
                    <AppText variant="body" style={tw`text-ink`}>
                      Check-out: {stay.data.checkOutTime}
                    </AppText>
                  ) : null}
                </PolicySection>
              ) : null}
              {stay.data.houseRules.length > 0 ? (
                <PolicySection title="House rules" source="This stay">
                  {stay.data.houseRules.map((rule) => (
                    <AppText key={rule} variant="body" style={tw`text-ink`}>
                      • {rule}
                    </AppText>
                  ))}
                </PolicySection>
              ) : null}
              {stay.data.havenlyPolicies.map((policy) => (
                <PolicySection key={policy._id} title={policy.title} source="Havenly policy">
                  <AppText variant="body" style={tw`text-ink`}>
                    {policy.body}
                  </AppText>
                </PolicySection>
              ))}
              <AppText variant="caption">
                Can&apos;t find what you need? Contact Havenly support in the app, 24 hours a day.
              </AppText>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function PolicySection({
  title,
  source,
  children,
  onLayout,
}: {
  title: string;
  source: string;
  children: ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  return (
    <View onLayout={onLayout} style={tw`gap-2 rounded-xl bg-canvas p-4`}>
      <View style={tw`flex-row items-center justify-between gap-2`}>
        <AppText variant="headline" accessibilityRole="header" style={tw`flex-1`}>
          {title}
        </AppText>
        <AppText variant="label" style={tw`text-muted`}>
          {source}
        </AppText>
      </View>
      {children}
    </View>
  );
}
