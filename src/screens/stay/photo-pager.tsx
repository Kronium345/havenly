import { Image } from "expo-image";
import { useState } from "react";
import { FlatList, LayoutChangeEvent, Platform, View } from "react-native";

import { AppText } from "@/components/ui/text";
import { sanityImage } from "@/lib/format";
import { tw } from "@/theme";

/** Swipeable stay photos with a "1 / N" counter. Width comes from layout (web SSR starts at 0). */
export function PhotoPager({ images, height }: { images: { _key: string; url: string; alt: string }[]; height: number }) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View onLayout={onLayout} style={[tw`bg-canvas`, { height }]}>
      {width > 0 ? (
        <FlatList
          data={images}
          keyExtractor={(item) => item._key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
          // Web has no momentum event for mouse scrolling; track the offset instead.
          onScroll={
            Platform.OS === "web"
              ? (event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))
              : undefined
          }
          scrollEventThrottle={64}
          renderItem={({ item }) => (
            <Image
              source={{ uri: sanityImage(item.url, 1200) }}
              accessibilityLabel={item.alt}
              contentFit="cover"
              transition={200}
              style={{ width, height }}
            />
          )}
        />
      ) : null}
      {images.length > 0 ? (
        <View style={tw`absolute bottom-10 right-4 rounded-full bg-scrim px-3 py-1.5`}>
          <AppText variant="callout" style={tw`font-medium text-white`}>
            {Math.min(index + 1, images.length)} / {images.length}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}
