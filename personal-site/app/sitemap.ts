import type { MetadataRoute } from "next";

import { getVideos } from "@/lib/video-library";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const videos = await getVideos();
  const videoPages = videos.map(({ id }) => ({
    url: `https://ryanhuang.xyz/videos/${id}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [
    {
      url: "https://ryanhuang.xyz",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: "https://ryanhuang.xyz/videos",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...videoPages,
  ];
}
