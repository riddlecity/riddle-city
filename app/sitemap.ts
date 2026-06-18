import { MetadataRoute } from "next";
import { createClient } from "../lib/supabase/server";

const baseUrl = "https://www.riddlecity.co.uk";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static public pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/locations`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/leaderboard`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Dynamic location pages from database
  let locationPages: MetadataRoute.Sitemap = [];
  try {
    const supabase = await createClient();
    const { data: tracks } = await supabase
      .from("tracks")
      .select("location")
      .not("location", "is", null)
      .order("location");

    if (tracks) {
      const uniqueLocations = [
        ...new Set(
          tracks
            .map((t) => t.location as string)
            .filter((l) => l && l.trim() !== "" && l.toLowerCase() !== "null")
        ),
      ];

      locationPages = uniqueLocations.map((slug) => ({
        url: `${baseUrl}/${slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
    }
  } catch {
    // If DB is unreachable, skip dynamic pages gracefully
  }

  return [...staticPages, ...locationPages];
}
