import { ImageResponse } from "next/og";
import { logoComoDataUrl } from "@/lib/marca-logo";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** Ícone do app (512 px) a partir do logotipo do escritório. */
export default async function Icon() {
  const logo = await logoComoDataUrl();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0b1220" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} width={size.width} height={size.height} style={{ objectFit: "cover" }} alt="" />
      </div>
    ),
    size,
  );
}
