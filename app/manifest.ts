import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FitLabs",
    short_name: "FitLabs",
    description: "Weekly gym workouts generated for you",
    start_url: "/week",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#110e14",
    theme_color: "#110e14",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
