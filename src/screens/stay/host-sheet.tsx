import { Award } from "lucide-react-native";
import { View } from "react-native";

import { Badge } from "@/components/ui/badge";
import { Sheet } from "@/components/ui/sheet";
import { AppText } from "@/components/ui/text";
import type { StayDetails } from "@/lib/search/types";
import { tw } from "@/theme";

export function HostSheet({
  host,
  visible,
  onClose,
}: {
  host: NonNullable<StayDetails["host"]>;
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={`Hosted by ${host.name}`}>
      <View style={tw`gap-4`}>
        <View style={tw`flex-row items-center gap-4`}>
          <View style={tw`h-16 w-16 items-center justify-center rounded-full bg-primary-tint`}>
            <AppText variant="heading">{host.name[0]?.toUpperCase()}</AppText>
          </View>
          <View style={tw`gap-1`}>
            {host.superhost ? <Badge variant="superhost" icon={Award} label="Superhost" /> : null}
            {host.joinedYear ? <AppText variant="caption">Hosting since {host.joinedYear}</AppText> : null}
          </View>
        </View>
        {host.bio ? <AppText variant="body">{host.bio}</AppText> : null}
      </View>
    </Sheet>
  );
}
