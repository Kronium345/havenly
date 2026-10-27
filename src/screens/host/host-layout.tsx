import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ChevronLeft } from "lucide-react-native";
import { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/components/ui/icon-button";
import { AppText } from "@/components/ui/text";
import { tw } from "@/theme";

/** A host screen pushed over the tabs: back button, big title, scrolling content. */
export function HostLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goBack = () => (router.canGoBack() ? router.back() : router.navigate("/host"));
  return (
    <View style={tw`flex-1 bg-surface`}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={[tw`px-screen`, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}>
        <IconButton icon={ChevronLeft} accessibilityLabel="Back" variant="outline" size="md" onPress={goBack} />
        <AppText variant="hero" accessibilityRole="header" style={tw`mt-7`}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="body" style={tw`mt-1`}>
            {subtitle}
          </AppText>
        ) : null}
        <View style={tw`mt-6`}>{children}</View>
      </ScrollView>
    </View>
  );
}
