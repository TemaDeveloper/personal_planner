export interface CalloutColor {
  key: string;
  label: string;
  /** small swatch shown in the picker (matches the light-mode tint in globals.css) */
  swatch: string;
}

/** Notion's callout/highlight palette: Default + 9 colors. Backgrounds are applied
 * by CSS via [data-callout-color] (light + dark) — swatch here is the picker dot. */
export const CALLOUT_COLORS: CalloutColor[] = [
  { key: "default", label: "Default", swatch: "var(--surface-raised)" },
  { key: "gray", label: "Gray", swatch: "#F1F1EF" },
  { key: "brown", label: "Brown", swatch: "#F4EEEE" },
  { key: "orange", label: "Orange", swatch: "#FAEBDD" },
  { key: "yellow", label: "Yellow", swatch: "#FBF3DB" },
  { key: "green", label: "Green", swatch: "#EDF3EC" },
  { key: "blue", label: "Blue", swatch: "#E7F3F8" },
  { key: "purple", label: "Purple", swatch: "#F6F3F9" },
  { key: "pink", label: "Pink", swatch: "#FAF1F5" },
  { key: "red", label: "Red", swatch: "#FDEBEC" },
];

export const CALLOUT_COLOR_KEYS = CALLOUT_COLORS.map((c) => c.key);

export function isCalloutColor(key: string): boolean {
  return CALLOUT_COLOR_KEYS.includes(key);
}
