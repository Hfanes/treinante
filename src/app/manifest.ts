import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Treinante",
    short_name: "Treinante",
    description: "Running analytics for every runner.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#0d0d0c",
    theme_color: "#0d0d0c",
    icons: [
      {
        src: "/images/bg-removed-logo.png",
        sizes: "1254x1254",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
