export type PresetKey = "blank" | "todo" | "meeting" | "journal" | "project";

/** Lightweight page record for the tree (no content). */
export interface FlatPage {
  id: string;
  parentId: string | null;
  title: string;
  icon: string;
  order: number;
}

export interface TreeNode extends FlatPage {
  children: TreeNode[];
}
