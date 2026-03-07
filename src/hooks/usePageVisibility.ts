"use client";

import { useEffect, useState } from "react";

export function usePageVisibility() {
  const [isPageVisible, setIsPageVisible] = useState(() => {
    if (typeof document === "undefined") {
      return true;
    }

    return document.visibilityState === "visible";
  });

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const updateVisibility = () => {
      setIsPageVisible(document.visibilityState === "visible");
    };

    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    window.addEventListener("focus", updateVisibility);
    window.addEventListener("blur", updateVisibility);

    return () => {
      document.removeEventListener("visibilitychange", updateVisibility);
      window.removeEventListener("focus", updateVisibility);
      window.removeEventListener("blur", updateVisibility);
    };
  }, []);

  return isPageVisible;
}
