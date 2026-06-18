"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { DatabaseView } from "@/components/notes/database/database-view";

/** An inline database block: references a NotesDatabase by id and renders its
 * view-switcher + active view (table/board/gallery/list). */
export const DatabaseBlock = createReactBlockSpec(
  {
    type: "database",
    propSchema: { databaseId: { default: "" } },
    content: "none",
  },
  {
    render: (props) => {
      const id = props.block.props.databaseId as string;
      if (!id) {
        return <div contentEditable={false} className="my-2 text-[13px]" style={{ color: "var(--text-faint)" }}>Empty database.</div>;
      }
      return <DatabaseView databaseId={id} />;
    },
  }
);
