import {
  ArrowUp,
  ArrowUpRight,
  Bath,
  Bell,
  Bookmark,
  Building2,
  Calendar,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Flame,
  Heart,
  House,
  List,
  Lock,
  Luggage,
  Mail,
  Map,
  MapPin,
  MessageSquareMore,
  Minus,
  Mountain,
  PawPrint,
  Plus,
  ScrollText,
  Search,
  Settings,
  Share,
  SlidersHorizontal,
  Sparkles,
  Star,
  TreePalm,
  TreePine,
  User,
  Waves,
  Wifi,
  X,
  ArrowRight,
  CalendarCheck,
} from "lucide-react-native";
import { ReactNode, useState } from "react";
import { ScrollView, View } from "react-native";

import { AnswerCard } from "@/components/ui/answer-card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DateRangeCalendar, type DateRange } from "@/components/ui/date-range-calendar";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { ListingCard } from "@/components/ui/listing-card";
import { PolicyCard } from "@/components/ui/policy-card";
import { ProfileRow, ProfileRowGroup } from "@/components/ui/profile-row";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Sheet } from "@/components/ui/sheet";
import { StatGroup } from "@/components/ui/stat-group";
import { StatusBanner } from "@/components/ui/status-banner";
import { Stepper } from "@/components/ui/stepper";
import { TabBar } from "@/components/ui/tab-bar";
import { TextField } from "@/components/ui/text-field";
import { toast } from "@/components/ui/toast";
import { AppText } from "@/components/ui/text";
import { Toggle } from "@/components/ui/toggle";
import { Wordmark } from "@/components/ui/wordmark";
import { showBanner } from "@/lib/notifications/banner";
import { ColorToken, tw } from "@/theme";
import { ProfileCard } from "@/screens/profile/profile-card";

const SWATCHES: { token: ColorToken; name: string; use: string }[] = [
  { token: "primary", name: "Primary Blue", use: "Primary actions, active states (white text)" },
  { token: "primary-tint", name: "Primary Tint", use: "Soft highlights, date ranges" },
  { token: "accent", name: "Accent Lime", use: "AI search, filter chips (ink text)" },
  { token: "accent-tint", name: "Accent Tint", use: "Chat bubbles, policy cards" },
  { token: "ink", name: "Text Primary", use: "Headings, primary text" },
  { token: "muted", name: "Text Secondary", use: "Body text, secondary text" },
  { token: "surface", name: "Surface White", use: "Cards, sheets, modals" },
  { token: "canvas", name: "Surface Gray", use: "App background, input fields" },
  { token: "border", name: "Border Gray", use: "Dividers, borders" },
  { token: "glass", name: "Glass Blur", use: "Tab bar, glass surfaces" },
];

const CATEGORIES = [
  { label: "All Stays", icon: House },
  { label: "Cabins", icon: TreePine },
  { label: "Beach", icon: Waves },
  { label: "City", icon: Building2 },
  { label: "Villas", icon: TreePalm },
];

const SAMPLE_AVATAR = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80&auto=format&fit=crop";

const FILTERS = ["Cabins", "Under $300", "Pet Friendly", "Quiet"];

const ICONS = [
  House, Search, Heart, Calendar, User, Settings, MapPin, SlidersHorizontal, Share, Bookmark,
  Lock, Mail, Eye, EyeOff, ChevronLeft, ChevronRight, ArrowRight, ArrowUpRight, Sparkles, Star,
  TreePine, Waves, Building2, TreePalm, Bath, PawPrint, Wifi, Mountain, Flame, MessageSquareMore,
  FileText, CreditCard, Luggage, Bell, CircleHelp, List, Map, Minus, Plus, CircleCheck,
  CircleAlert, X,
];

function Section({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <View style={tw`gap-4 rounded-2xl bg-surface p-4`}>
      <AppText variant="headline" accessibilityRole="header">
        {number}. {title}
      </AppText>
      {children}
    </View>
  );
}

export default function DesignSystemScreen() {
  const [category, setCategory] = useState("All Stays");
  const [filters, setFilters] = useState<string[]>(["Cabins"]);
  const [view, setView] = useState<"list" | "map">("list");
  const [instantBook, setInstantBook] = useState(true);
  const [guests, setGuests] = useState(1);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"home" | "search" | "trips" | "profile">("home");
  const [banners, setBanners] = useState({ success: true, error: true });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dates, setDates] = useState<DateRange>({});

  return (
    <ScrollView contentContainerStyle={tw`gap-4 px-screen py-6`}>
      <Section number="01" title="Brand">
        <Wordmark />
        <AppText variant="title" style={tw`font-medium text-muted`}>
          Find unforgettable stays for every kind of trip.
        </AppText>
      </Section>

      <Section number="02" title="Color palette">
        <View style={tw`flex-row flex-wrap gap-3`}>
          {SWATCHES.map((swatch) => (
            <View key={swatch.token} style={tw`w-[47%] gap-1.5`}>
              <View
                style={tw.style(
                  "h-14 rounded-md border border-border",
                  `bg-${swatch.token}`,
                )}
              />
              <AppText variant="label" style={tw`font-semibold`}>
                {swatch.name}
              </AppText>
              <AppText variant="label" style={tw`text-muted`}>
                {tw.color(swatch.token)} · {swatch.use}
              </AppText>
            </View>
          ))}
        </View>
      </Section>

      <Section number="03" title="Typography">
        <AppText variant="display">Find your{"\n"}next stay</AppText>
        <AppText variant="hero">Find a stay that{"\n"}fits your story</AppText>
        <AppText variant="heading">Modern Cabin{"\n"}with Hot Tub</AppText>
        <AppText variant="title">Modern Cabin with Hot Tub</AppText>
        <AppText variant="headline">Ask about policies</AppText>
        <AppText variant="body">
          From mountain cabins to oceanfront villas, havenly helps you find unforgettable stays
          for every kind of trip.
        </AppText>
        <AppText variant="callout">Personal info</AppText>
        <AppText variant="caption">Lake Arrowhead, CA</AppText>
        <AppText variant="label">Home</AppText>
        <AppText variant="price">$280</AppText>
      </Section>

      <Section number="04" title="Buttons">
        <Button title="Book this stay" showArrow />
        <Button
          title="Continue with Google"
          variant="secondary"
          leading={<BrandLogo name="google" />}
        />
        <Button
          title="Continue with Apple"
          variant="secondary"
          leading={<BrandLogo name="apple" />}
        />
        <Button title="Book this stay" loading />
        <Button title="Book this stay" disabled />
        <View style={tw`flex-row gap-3`}>
          <IconButton icon={Heart} accessibilityLabel="Save" />
          <IconButton icon={Share} accessibilityLabel="Share" />
          <IconButton icon={Search} accessibilityLabel="Search" />
          <IconButton icon={Bookmark} accessibilityLabel="Bookmark" />
          <IconButton icon={ChevronLeft} accessibilityLabel="Back" variant="outline" size="md" />
        </View>
      </Section>

      <Section number="05" title="Input fields">
        <TextField
          variant="search"
          defaultValue="Cabins in California"
          onFilterPress={() => {}}
        />
        <TextField icon={User} placeholder="Enter your name" />
        <TextField icon={User} defaultValue="Joanna Smith" />
        <TextField icon={Lock} defaultValue="password1" secureTextEntry />
        <TextField icon={Mail} label="Email address" placeholder="you@example.com" />
        <TextField
          icon={Mail}
          label="Email address"
          defaultValue="joanna@"
          error="Enter a valid email address."
        />
      </Section>

      <Section number="06" title="Filter chips">
        <View style={tw`flex-row flex-wrap gap-2`}>
          {FILTERS.map((label) => (
            <Chip
              key={label}
              label={label}
              selected={filters.includes(label)}
              onPress={() =>
                setFilters((current) =>
                  current.includes(label)
                    ? current.filter((value) => value !== label)
                    : [...current, label],
                )
              }
            />
          ))}
        </View>
        <View style={tw`flex-row flex-wrap gap-2`}>
          {CATEGORIES.map((item) => (
            <Chip
              key={item.label}
              variant="category"
              label={item.label}
              icon={item.icon}
              selected={category === item.label}
              onPress={() => setCategory(item.label)}
            />
          ))}
        </View>
      </Section>

      <Section number="07" title="Listing card">
        <ListingCard
          title="Modern Cabin with Hot Tub"
          location="Lake Arrowhead, CA"
          imageUrl="https://picsum.photos/seed/havenly-cabin/400/440"
          rating={4.9}
          reviewCount={342}
          pricePerNight="$280"
          amenities={[
            { label: "Hot Tub", icon: Bath },
            { label: "Pet Friendly", icon: PawPrint },
          ]}
          saved={saved}
          onToggleSaved={() => setSaved((value) => !value)}
        />
      </Section>

      <Section number="08" title="Policy card">
        <PolicyCard
          icon={MessageSquareMore}
          title="Ask about policies"
          description="Cancellation, house rules, pets, check-in and more."
        />
        <PolicyCard
          icon={FileText}
          title="Free cancellation"
          description="Full refund up to 7 days before check-in."
        />
      </Section>

      <Section number="09" title="Profile row">
        <View style={tw`rounded-2xl bg-canvas p-2`}>
          <ProfileRowGroup title="Account">
            <ProfileRow icon={User} label="Personal info" />
            <ProfileRow icon={CreditCard} label="Payment methods" />
            <ProfileRow icon={Luggage} label="Trips" />
          </ProfileRowGroup>
        </View>
      </Section>

      <Section number="10" title="Bottom navigation">
        <View style={tw`rounded-2xl bg-accent-tint p-3`}>
          <TabBar
            activeKey={tab}
            onPress={setTab}
            items={[
              { key: "home", label: "Home", icon: House },
              { key: "search", label: "Search", icon: Search },
              { key: "trips", label: "Trips", icon: Calendar },
              { key: "profile", label: "Profile", icon: User },
            ]}
          />
        </View>
      </Section>

      <Section number="11" title="Iconography">
        <View style={tw`flex-row flex-wrap gap-2`}>
          {ICONS.map((glyph) => (
            <View
              key={glyph.displayName}
              style={tw`h-12 w-12 items-center justify-center rounded-full border border-border`}
            >
              <Icon as={glyph} />
            </View>
          ))}
        </View>
      </Section>

      <Section number="12" title="Segmented control">
        <SegmentedControl
          value={view}
          onChange={setView}
          options={[
            { value: "list", label: "List", icon: List },
            { value: "map", label: "Map", icon: Map },
          ]}
        />
      </Section>

      <Section number="13" title="Toggles / Steppers">
        <View style={tw`flex-row items-center gap-6`}>
          <Toggle
            accessibilityLabel="Instant book"
            value={instantBook}
            onValueChange={setInstantBook}
          />
          <Stepper label="Guests" value={guests} onChange={setGuests} min={1} max={16} />
        </View>
      </Section>

      <Section number="14" title="Status / Alerts">
        {banners.success ? (
          <StatusBanner
            message="Account created successfully"
            onDismiss={() => setBanners((b) => ({ ...b, success: false }))}
          />
        ) : null}
        {banners.error ? (
          <StatusBanner
            variant="error"
            message="Something went wrong. Please try again."
            onDismiss={() => setBanners((b) => ({ ...b, error: false }))}
          />
        ) : null}
        <StatusBanner variant="info" message="Accounts are coming soon. Sign-up isn't connected yet." />
        <View style={tw`flex-row flex-wrap gap-2`}>
          <Button title="Success toast" variant="secondary" size="md" onPress={() => toast.success("Welcome to Havenly, Joanna.")} />
          <Button title="Error toast" variant="secondary" size="md" onPress={() => toast.error("3 fields need attention", "Check the highlighted fields.")} />
          <Button title="Info toast" variant="secondary" size="md" onPress={() => toast.info("Search is coming next.")} />
          <Button
            title="Dynamic Island banner"
            variant="secondary"
            size="md"
            onPress={() => showBanner({ title: "Your trip starts tomorrow", message: "Wooden Beach Lodge is ready for you.", icon: CalendarCheck })}
          />
        </View>
      </Section>

      <Section number="15" title="Tags / Badges">
        <View style={tw`flex-row flex-wrap gap-2`}>
          <Badge variant="favorite" icon={Star} label="Guest favorite" />
          <Badge variant="new" label="New" />
          <Badge variant="discount" label="20% off" />
          <Badge variant="superhost" label="Superhost" />
          <Badge variant="explorer" icon={Star} label="Havenly Explorer" />
        </View>
      </Section>

      <Section number="17" title="Date range calendar">
        <DateRangeCalendar value={dates} onChange={setDates} style={tw`rounded-xl bg-surface p-4`} />
      </Section>

      <Section number="16" title="Sheet">
        <Button title="Open sheet" variant="secondary" size="md" onPress={() => setSheetOpen(true)} />
        <Sheet
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Filters"
          footer={<Button title="Apply" onPress={() => setSheetOpen(false)} />}
        >
          <AppText variant="body">Sheets hold filters, sort options and short details.</AppText>
        </Sheet>
      </Section>

      <Section number="18" title="Avatar / Profile header">
        <View style={tw`flex-row items-center gap-3`}>
          <Avatar name="Joanna" size="md" />
          <Avatar name="Joanna" size="lg" />
          <Avatar name="Joanna" imageUrl={SAMPLE_AVATAR} size="lg" />
        </View>
        <ProfileCard name="Joanna Smith" email="joanna@example.com" imageUrl={SAMPLE_AVATAR} />
        <StatGroup
          stats={[
            { label: "Trips", value: "12" },
            { label: "Saved", value: "8" },
            { label: "Nights", value: "34" },
          ]}
        />
      </Section>

      <Section number="19" title="Answer card">
        <AnswerCard
          icon={CalendarX}
          title="Moderate cancellation"
          body="Cancel up to 7 days before check-in and you get a full refund."
          source="Moderate cancellation · Havenly policy"
          onSourcePress={() => undefined}
        />
        <AnswerCard
          icon={ScrollText}
          title="House rules"
          lines={["Quiet hours 10:00 PM to 8:00 AM", "No smoking indoors"]}
          source="This stay's house rules"
        />
        <AnswerCard
          icon={CircleHelp}
          title="No answer found"
          body="I couldn't find that in this stay's details or Havenly's policies."
          footer="Try a topic below, or contact Havenly support."
        />
        <View style={tw`flex-row gap-3`}>
          <IconButton icon={ArrowUp} accessibilityLabel="Send" variant="primary" size="md" />
          <IconButton icon={ArrowUp} accessibilityLabel="Send" variant="primary" size="md" disabled />
        </View>
      </Section>
    </ScrollView>
  );
}
