"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "How does Riddle City work?",
    answer: "Riddle City is a self-guided outdoor adventure where you solve riddles to discover locations around your chosen city. At each location, you'll either scan a QR code or submit a manual answer to unlock the next clue. It's part treasure hunt, part city exploration!"
  },
  {
    question: "How long does an adventure take?",
    answer: "Most adventures take 2-4 hours depending on your pace, how long you spend at each location, and whether you stop for food or drinks along the way. You can take as long as you like - there's no time limit!"
  },
  {
    question: "What if we get stuck on a riddle?",
    answer: "No worries! The group leader can skip any riddle at any time to keep the adventure moving. There's also the option to manually enter an answer if you know the location but can't solve the exact riddle."
  },
  {
    question: "How many people can play?",
    answer: "Most adventures require a minimum of 2 players and can accommodate larger groups. The price is per person, so bring your friends, family, or colleagues for a fun group activity!"
  },
  {
    question: "Do I need to print anything?",
    answer: "No! Everything runs on your phone. Just make sure your device is charged and you have mobile data or can connect to WiFi along the route."
  },
  {
    question: "What happens if it rains?",
    answer: "Most locations are indoors anyway, so you'll mainly just be walking between places. Bring an umbrella for the walks between locations and you'll be fine!"
  },
  {
    question: "When can we start the adventure?",
    answer: "Each track has a recommended start time (shown on the adventure page), usually when most locations are open. However, you can start whenever you like - just be aware some locations may be closed outside their normal hours."
  },
  {
    question: "Is the adventure suitable for children?",
    answer: "Not really - many of our adventures take you through bars and pubs, so they're designed more for adults. We recommend leaving the kids at home for this one!"
  },
  {
    question: "Can we take breaks during the adventure?",
    answer: "Absolutely! Buying refreshments and food en route is encouraged. All tracks have places where you can grab food or drinks, and your progress is saved automatically so you can continue at your own pace."
  },
  {
    question: "What should we bring?",
    answer: "Just bring a fully charged phone, comfortable walking shoes, and appropriate clothing for the weather."
  },
  {
    question: "How do we book?",
    answer: "You don't need to book in advance! Just choose your city and adventure type, then start playing when you're ready. Note that outside of recommended start times, some locations might be closed."
  },
  {
    question: "Can we do the adventure more than once?",
    answer: "You can play multiple times, but knowing the answers from a previous playthrough would spoil the fun! We recommend trying different adventure types in the same city or exploring new cities instead."
  },
  {
    question: "What if we can't find a QR code?",
    answer: "Not all locations have a QR code - some require manual answers. But if it is a QR code question and the code is missing or damaged, please let us know so we can replace it."
  },
  {
    question: "Do we need an internet connection?",
    answer: "Yes, you'll need mobile data or WiFi to load riddles and verify your answers. Make sure you have a data plan or can access WiFi at various locations along the route."
  }
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <main className="min-h-screen bg-neutral-900 text-white px-4 py-16 relative">
      {/* Logo in consistent top-left position */}
      <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10">
        <Link href="/">
          <Image
            src="/riddle-city-logo.png"
            alt="Riddle City Logo"
            width={60}
            height={60}
            className="md:w-[80px] md:h-[80px] drop-shadow-lg hover:scale-105 transition-transform duration-200"
            priority
          />
        </Link>
      </div>

      {/* Back link in top-right */}
      <div className="absolute top-6 right-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors duration-200 text-sm font-medium"
        >
          <span className="text-lg">←</span>
          <span className="hidden sm:inline">Back to Home</span>
          <span className="sm:hidden">Back</span>
        </Link>
      </div>

      {/* Main content */}
      <div className="max-w-3xl mx-auto mt-20">
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">❓</div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-white/70 text-lg">
            Everything you need to know about Riddle City adventures
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-neutral-800 rounded-lg overflow-hidden border border-neutral-700"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-neutral-750 transition-colors"
              >
                <span className="font-semibold text-lg pr-4">{faq.question}</span>
                <span className="text-2xl text-red-500 flex-shrink-0">
                  {openIndex === index ? "−" : "+"}
                </span>
              </button>
              {openIndex === index && (
                <div className="px-6 pb-4 text-white/80 leading-relaxed">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Still have questions */}
        <div className="mt-12 text-center bg-neutral-800 rounded-lg p-8 border border-neutral-700">
          <h2 className="text-2xl font-bold mb-3">Still have questions?</h2>
          <p className="text-white/70 mb-6">
            We're here to help! Get in touch with us.
          </p>
          <Link
            href="/contact"
            className="inline-block bg-red-600 hover:bg-red-500 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </main>
  );
}
