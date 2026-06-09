import React from "react";
import {
  isMetadataColumnVisible,
  writeMetadataColumnPreference,
} from "./columnVisibility";

export function useMetadataColumnVisible(): [boolean, (visible: boolean) => void] {
  const [visible, setVisible] = React.useState(() => isMetadataColumnVisible());

  const setMetadataVisible = React.useCallback((next: boolean) => {
    writeMetadataColumnPreference(next ? "show" : "hide");
    setVisible(next);
  }, []);

  return [visible, setMetadataVisible];
}
