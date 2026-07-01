/**
 * The canonical set of icon names the app can actually render. Kept as plain
 * strings (no lucide import) so server code — the AI generation prompt and the
 * section normalizer — can reference it without pulling lucide into the bundle.
 * icon-map.ts must map exactly these names to components.
 */
export const ICON_NAMES = [
  // work / money
  "Briefcase", "Wallet", "DollarSign", "PiggyBank", "TrendingUp", "Coins",
  // fitness / body
  "Dumbbell", "Bike", "Footprints", "Activity", "Trophy", "Flame", "Mountain", "Waves",
  // health / care
  "Heart", "HeartPulse", "Pill", "Stethoscope", "Brain", "Moon", "Bed", "Droplet", "Baby",
  // learning
  "GraduationCap", "BookOpen", "NotebookPen", "Languages", "Brain",
  // home / chores / food
  "Home", "Wrench", "ShoppingCart", "ShoppingBag", "UtensilsCrossed", "Utensils", "Coffee", "Carrot",
  // creative / hobbies
  "Palette", "Paintbrush", "Music", "Guitar", "Mic", "Camera", "Video", "Gamepad2",
  // travel / mobility
  "Car", "Bus", "Train", "Plane", "MapPin", "Globe",
  // people / nature / misc
  "Users", "User", "PawPrint", "Leaf", "Sprout", "Sun", "CloudRain",
  // goals / time / structure
  "Target", "Flag", "Clock", "Timer", "Calendar", "CalendarCheck", "ListChecks", "Repeat",
  "Zap", "Sparkles", "KanbanSquare", "Star",
] as const;

export type IconName = (typeof ICON_NAMES)[number];

export const ICON_NAME_SET: ReadonlySet<string> = new Set(ICON_NAMES);
