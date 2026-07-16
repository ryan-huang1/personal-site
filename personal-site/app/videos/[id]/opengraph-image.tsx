import { ImageResponse } from "next/og";

import {
  getVideo,
  getVideoCatalog,
  videoAssetUrl,
} from "@/lib/video-library";

export const alt = "Interactive 360° film";
export const contentType = "image/png";
export const size = {
  width: 1200,
  height: 630,
};

export async function generateStaticParams() {
  const catalog = await getVideoCatalog();

  return catalog.videos.map(({ id }) => ({ id }));
}

export default async function OpenGraphImage({
  params,
}: {
  params: { id: string };
}) {
  const video = await getVideo(params.id);
  const posterUrl = videoAssetUrl(video.id, video.posterPath);

  return new ImageResponse(
    (
      <div
        style={{
          background: "#111",
          color: "#fff",
          display: "flex",
          height: "100%",
          overflow: "hidden",
          position: "relative",
          width: "100%",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          height={630}
          src={posterUrl}
          style={{
            height: "100%",
            objectFit: "cover",
            position: "absolute",
            width: "100%",
          }}
          width={1200}
        />
        <div
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.08) 15%, rgba(0,0,0,0.86) 100%)",
            display: "flex",
            inset: 0,
            position: "absolute",
          }}
        />
        <div
          style={{
            alignItems: "flex-start",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "64px 72px",
            position: "relative",
            width: "100%",
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: "0.16em",
              marginBottom: 18,
              textTransform: "uppercase",
            }}
          >
            Interactive 360° film
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              maxWidth: 980,
            }}
          >
            {video.title}
          </div>
          <div
            style={{
              fontSize: 24,
              marginTop: 28,
              opacity: 0.82,
            }}
          >
            ryanhuang.xyz
          </div>
        </div>
      </div>
    ),
    size,
  );
}
