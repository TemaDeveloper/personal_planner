"use client";

import { createContext, useContext, useState } from "react";
import type { SectionId } from "@/lib/constants";
import { DEFAULT_ENABLED_SECTIONS } from "@/lib/constants";

export interface CustomSectionNav {
  templateId: string;
  slug: string;
  name: string;
  icon: string;
  enabled: boolean;
}

interface SectionsContextType {
  enabledSections: SectionId[];
  customSections: CustomSectionNav[];
  updateSections: (sections: SectionId[]) => void;
  updateCustomSections: (sections: CustomSectionNav[]) => void;
}

const SectionsContext = createContext<SectionsContextType>({
  enabledSections: DEFAULT_ENABLED_SECTIONS,
  customSections: [],
  updateSections: () => {},
  updateCustomSections: () => {},
});

export function useSections() {
  return useContext(SectionsContext);
}

export function SectionsProvider({
  children,
  initialSections,
  initialCustomSections,
}: {
  children: React.ReactNode;
  initialSections?: SectionId[];
  initialCustomSections?: CustomSectionNav[];
}) {
  const [enabledSections, setEnabledSections] = useState<SectionId[]>(
    initialSections ?? DEFAULT_ENABLED_SECTIONS
  );
  const [customSections, setCustomSections] = useState<CustomSectionNav[]>(
    initialCustomSections ?? []
  );

  return (
    <SectionsContext.Provider
      value={{
        enabledSections,
        customSections,
        updateSections: setEnabledSections,
        updateCustomSections: setCustomSections,
      }}
    >
      {children}
    </SectionsContext.Provider>
  );
}
