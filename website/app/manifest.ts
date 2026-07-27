import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vora — Find Your Five",
    short_name: "Vora",
    description:
      "Discord-first teammate formation for Mobile Legends. Find compatible players, complete your five and queue together.",
    start_url: "/",
    display: "standalone",
    background_color: "#050a13",
    theme_color: "#081220",
    icons: [
      {
        src: "/brand/vora-mark.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
