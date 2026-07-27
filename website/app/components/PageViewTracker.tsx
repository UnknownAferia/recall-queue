"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (navigator.doNotTrack === "1") {
      return;
    }

    void fetch("/api/analytics/event", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ page: pathname }),
      credentials: "same-origin",
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
