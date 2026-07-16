import type { Metadata } from "next";

import { VideoPlayer } from "@/components/360-video-player";
import {
  getVideo,
  getVideoCatalog,
  videoAssetUrl,
} from "@/lib/video-library";

type VideoPageProps = {
  params: {
    id: string;
  };
};

export const dynamicParams = false;

export async function generateStaticParams() {
  const catalog = await getVideoCatalog();

  return catalog.videos.map(({ id }) => ({ id }));
}

export async function generateMetadata({
  params,
}: VideoPageProps): Promise<Metadata> {
  const video = await getVideo(params.id);

  return {
    title: `${video.title} — 360°`,
    description: `Explore ${video.title} as an interactive 360° film.`,
  };
}

export default async function VideoPage({ params }: VideoPageProps) {
  const video = await getVideo(params.id);
  const hlsUrl = videoAssetUrl(video.id, video.hlsPath);
  const posterUrl = videoAssetUrl(video.id, video.posterPath);

  return <VideoPlayer hlsUrl={hlsUrl} posterUrl={posterUrl} video={video} />;
}
