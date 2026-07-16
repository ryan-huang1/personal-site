export const VIDEO_ORIGIN =
  "https://pub-059f755fb61d49c49b6393e18992dd9e.r2.dev";

export type VideoRendition = {
  name: string;
  width: number;
  height: number;
};

export type VideoMetadata = {
  id: string;
  title: string;
  type: "video";
  projection: "equirectangular";
  aspectRatio: "2:1";
  durationSeconds: number;
  status: "processing" | "complete";
  posterPath: string;
  hlsPath: string;
  renditions: VideoRendition[];
};

type VideoCatalog = {
  videos: {
    id: string;
    metadataPath: string;
  }[];
};

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${VIDEO_ORIGIN}/videos/${path}`);

  if (!response.ok) {
    throw new Error(`Video library request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function videoAssetUrl(videoId: string, path: string) {
  return `${VIDEO_ORIGIN}/videos/${videoId}/${path}`;
}

export async function getVideoCatalog() {
  return fetchJson<VideoCatalog>("catalog.json");
}

export async function getVideos() {
  const catalog = await getVideoCatalog();
  const requests = catalog.videos.map((video) =>
    fetchJson<VideoMetadata>(video.metadataPath),
  );

  return Promise.all(requests);
}

export async function getVideo(videoId: string) {
  const videos = await getVideos();
  const video = videos.find(({ id }) => id === videoId);

  if (!video) {
    throw new Error(`Unknown video: ${videoId}`);
  }

  return video;
}
