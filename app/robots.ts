import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.riddlecity.co.uk";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/locations", "/faq", "/contact", "/privacy", "/terms", "/leaderboard", "/leaderboards"],
        disallow: [
          "/api/",
          "/scan/",
          "/riddle/",
          "/waiting/",
          "/adventure-complete/",
          "/join/",
          "/riddle-unauthorized/",
          "/*/*/start/",   // game session start pages
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
