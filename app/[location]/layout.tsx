import { Metadata } from "next";

interface Props {
  params: Promise<{ location: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { location } = await params;
  const name = location.charAt(0).toUpperCase() + location.slice(1);

  return {
    title: `${name} Treasure Hunt & Riddle Trail`,
    description: `Looking for things to do in ${name}? Riddle City is an outdoor puzzle adventure — solve riddles, scan QR codes, and explore ${name}'s best pubs and hidden gems. From £12.99 per person.`,
    keywords: [
      `things to do in ${name}`,
      `${name} treasure hunt`,
      `${name} riddle trail`,
      `${name} outdoor adventure`,
      `${name} pub crawl game`,
      `${name} group activities`,
      `${name} hen party ideas`,
      `${name} date ideas`,
      `${name} team building`,
      `riddle city ${name}`,
    ],
    openGraph: {
      title: `${name} Treasure Hunt & Riddle Trail | Riddle City`,
      description: `Explore ${name} with a fun outdoor riddle adventure. Perfect for groups, hen parties, dates, and team days out. From £12.99 per person.`,
    },
  };
}

export default async function LocationLayout({ children, params }: Props) {
  const { location } = await params;
  const name = location.charAt(0).toUpperCase() + location.slice(1);
  const siteUrl = "https://www.riddlecity.co.uk";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: `Riddle City ${name}`,
    description: `An outdoor puzzle adventure trail in ${name}. Solve riddles, scan QR codes, and discover ${name}'s best pubs, cafes, and hidden gems.`,
    url: `${siteUrl}/${location}`,
    image: `${siteUrl}/og-image.png`,
    touristType: ["Friends", "Couples", "Groups", "Hen Parties", "Team Building"],
    offers: {
      "@type": "Offer",
      price: "12.99",
      priceCurrency: "GBP",
      description: "Per person",
    },
    provider: {
      "@type": "Organization",
      name: "Riddle City",
      url: siteUrl,
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `What is there to do in ${name} with Riddle City?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Riddle City ${name} is an outdoor puzzle adventure that takes you around ${name}'s best pubs, cafes, and hidden gems. Solve riddles to find your next location, scan QR codes, and compete as a team.`,
        },
      },
      {
        "@type": "Question",
        name: "How much does Riddle City cost?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Adventures start from £12.99 per person. There are no hidden fees — pay once and play at your own pace.",
        },
      },
      {
        "@type": "Question",
        name: "How long does a Riddle City adventure take?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Most adventures take 2–4 hours depending on your pace and how long you spend at each location. There is no time limit.",
        },
      },
      {
        "@type": "Question",
        name: "Is Riddle City suitable for hen parties and group activities?",
        acceptedAnswer: {
          "@type": "Answer",
          text: `Yes! Riddle City is perfect for hen parties, birthdays, work team days, and group outings in ${name}. The more the merrier — just pay per person.`,
        },
      },
      {
        "@type": "Question",
        name: "Do I need to book in advance?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No booking needed. Just choose your adventure and start when you're ready.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {children}
    </>
  );
}
