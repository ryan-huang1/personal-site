import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import {
  getVideos,
  videoAssetUrl,
  type VideoMetadata,
} from "@/lib/video-library";

export const metadata: Metadata = {
  title: "360° Films — Ryan Huang",
  description: "Interactive 360° films from places around the world.",
};

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);

  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function GalleryFilm({ video }: { video: VideoMetadata }) {
  const posterUrl = videoAssetUrl(video.id, video.posterPath);
  const status = video.status === "complete" ? "Ready" : "Processing";

  return (
    <Link className="film-row" href={`/videos/${video.id}`}>
      <Image
        alt={`Equirectangular preview of ${video.title}`}
        className="film-row__image"
        fill
        priority
        sizes="100vw"
        src={posterUrl}
        unoptimized
      />
      <span aria-hidden="true" className="film-row__veil" />
      <span className="film-row__copy">
        <span className="film-row__eyebrow">
          360° film · {formatDuration(video.durationSeconds)}
        </span>
        <span className="film-row__title">{video.title}</span>
        <span className="film-row__action">
          {status} <span aria-hidden="true">↗</span>
        </span>
      </span>
    </Link>
  );
}

export default async function VideosPage() {
  const videos = await getVideos();

  return (
    <main className="film-library">
      <header className="film-library__header">
        <Link className="film-library__brand" href="/">
          RH / 360
        </Link>
        <p>Drag to look around. Headphones encouraged.</p>
      </header>
      <section aria-label="360 degree videos" className="film-library__list">
        {videos.map((video) => (
          <GalleryFilm key={video.id} video={video} />
        ))}
      </section>
      <footer className="film-library__footer">
        <span>{videos.length.toString().padStart(2, "0")} films</span>
        <span>Shot in every direction</span>
      </footer>
    </main>
  );
}
