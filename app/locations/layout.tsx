import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Locations - Find an Adventure Near You",
  description:
    "Discover Riddle City outdoor puzzle adventures available near you. Find a location, gather your team, and start your adventure today.",
  openGraph: {
    title: "Locations | Riddle City",
    description:
      "Find a Riddle City outdoor puzzle adventure near you. New locations added regularly.",
  },
};

export default function LocationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
