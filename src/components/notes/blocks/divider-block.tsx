"use client";

import { createReactBlockSpec } from "@blocknote/react";

/** A horizontal rule / visual separator. */
export const DividerBlock = createReactBlockSpec(
  {
    type: "divider",
    propSchema: {},
    content: "none",
  },
  {
    render: () => (
      <div contentEditable={false} className="py-2">
        <hr style={{ border: "none", borderTop: "1px solid var(--border-default)" }} />
      </div>
    ),
  }
);
