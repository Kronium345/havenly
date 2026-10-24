import type { AmenityKey } from "./search/vocabulary";

// Labels only (no icons), so API routes can import this without pulling in UI code.
export const amenityLabels: Record<AmenityKey, string> = {
  hotTub: "Hot Tub",
  pool: "Pool",
  wifi: "Fast Wi-Fi",
  fireplace: "Fireplace",
  oceanView: "Ocean View",
  forestViews: "Forest Views",
  mountainViews: "Mountain Views",
  kitchen: "Kitchen",
  parking: "Parking",
  airConditioning: "Air Conditioning",
  washer: "Washer",
  workspace: "Workspace",
  evCharger: "EV Charger",
  beachAccess: "Beach Access",
};
