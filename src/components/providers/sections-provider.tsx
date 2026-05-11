"use client";

import { createContext, useContext, useState } from "react";
import type { SectionId } from "@/lib/constants";
import { DEFAULT_ENABLED_SECTIONS } from "@/lib/constants";

interface SectionsContextType {
  enabledSections: SectionId[];
  updateSections: (sections: SectionId[]) => void;
}

const SectionsContext = createContext<SectionsContextType>({
  enabledSections: DEFAULT_ENABLED_SECTIONS,
  updateSections: () => {},
});

export function useSections() {
  return useContext(SectionsContext);
}

export function SectionsProvider({
  children,
  initialSections,
}: {
  children: React.ReactNode;
  initialSections?: SectionId[];
}) {
  const [enabledSections, setEnabledSections] = useState<SectionId[]>(
    initialSections ?? DEFAULT_ENABLED_SECTIONS
  );

  return (
    <SectionsContext.Provider
      value={{ enabledSections, updateSections: setEnabledSections }}
    >
      {children}
    </SectionsContext.Provider>
  );
}
