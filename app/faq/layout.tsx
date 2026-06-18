import { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ - Frequently Asked Questions",
  description:
    "Got questions about Riddle City? Find answers to the most frequently asked questions about how our outdoor puzzle adventures work.",
  openGraph: {
    title: "FAQ | Riddle City",
    description:
      "Find answers to common questions about Riddle City outdoor puzzle adventures.",
  },
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
