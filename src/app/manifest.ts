import type { MetadataRoute } from "next";
import { MARCA } from "@/lib/marca";

/** Dados do app instalado no celular, com o nome do escritório. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: MARCA.nome,
    short_name: MARCA.nome,
    description: MARCA.subtitulo,
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#09090b",
    theme_color: "#0b1220",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
