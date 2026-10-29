import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ChevronLeft } from "lucide-react-native";
import { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/components/ui/icon-button";
import { AppText } from "@/components/ui/text";
import { tw } from "@/theme";

export type LegalSection = { title: string; paragraphs: string[] };

/** A public text page (terms, support): back button, title, intro and sections. */
export function LegalPage({
  title,
  updated,
  intro,
  sections,
  children,
}: {
  title: string;
  updated?: string;
  intro?: string;
  sections: LegalSection[];
  children?: ReactNode;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goBack = () => (router.canGoBack() ? router.back() : router.navigate("/"));

  return (
    <View style={tw`flex-1 bg-surface`}>
      <StatusBar style="dark" />
      {/* Readable line length when the page is opened in a desktop browser. */}
      <ScrollView
        contentContainerStyle={[
          tw`w-full max-w-2xl self-center px-screen`,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
        ]}
      >
        <IconButton icon={ChevronLeft} accessibilityLabel="Back" variant="outline" size="md" onPress={goBack} />
        <AppText variant="hero" accessibilityRole="header" style={tw`mt-7`}>
          {title}
        </AppText>
        {updated ? (
          <AppText variant="caption" style={tw`mt-2`}>
            Last updated {updated}
          </AppText>
        ) : null}
        {intro ? (
          <AppText variant="body" style={tw`mt-4 text-ink`}>
            {intro}
          </AppText>
        ) : null}

        {children}

        <View style={tw`mt-8 gap-7`}>
          {sections.map((section) => (
            <View key={section.title} style={tw`gap-2`}>
              <AppText variant="title" accessibilityRole="header">
                {section.title}
              </AppText>
              {section.paragraphs.map((paragraph) => (
                <AppText key={paragraph} variant="body">
                  {paragraph}
                </AppText>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
