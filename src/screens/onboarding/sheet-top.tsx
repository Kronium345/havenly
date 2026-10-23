import Svg, { Path } from "react-native-svg";

import { color } from "@/theme";

const RADIUS = 24; // radius.2xl
const DROP = 36; // how far the edge falls from left to right (est. from the design)
export const SHEET_TOP_HEIGHT = DROP + RADIUS + 6;

/** The sheet's wavy top edge: highest at the top-left corner, falling toward the right. */
export function SheetTop({ width }: { width: number }) {
  const w = width;
  const h = SHEET_TOP_HEIGHT;
  const d = [
    `M0 ${h}`,
    `L0 ${RADIUS}`,
    `Q0 0 ${RADIUS} 0`,
    `C${w * 0.5} 0 ${w * 0.75} ${DROP * 0.3} ${w - RADIUS} ${DROP}`,
    `Q${w} ${DROP + 2} ${w} ${DROP + RADIUS}`,
    `L${w} ${h}`,
    "Z",
  ].join(" ");

  return (
    <Svg width={w} height={h} style={{ marginBottom: -1 }}>
      <Path d={d} fill={color("surface")} />
    </Svg>
  );
}
