import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Invyte",
    short_name: "Invyte",
    description:
      "Replace chaotic group chats with vibrant event vibes. Create events, RSVP instantly, and share memories.",
    start_url: "/",
    display: "standalone",
    background_color: "#0e0e13",
    theme_color: "#0e0e13",
    icons: [
      {
        src: "/icon-192x192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/icon-512x512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
  };
}
