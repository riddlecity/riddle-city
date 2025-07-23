// components/Footer.tsx
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-neutral-900 border-t border-neutral-800 py-8 px-4 mt-auto">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div>
            <h3 className="font-bold text-lg mb-3 text-white">RiddleCity</h3>
            <p className="text-neutral-400 text-sm">
              Puzzle-based adventures through your city. Solve riddles, explore locations, and create unforgettable memories with friends.
            </p>
          </div>
          
          {/* Contact Section */}
          <div>
            <h4 className="font-semibold mb-3 text-white">Contact</h4>
            <div className="space-y-2">
              <p className="text-neutral-400 text-sm">
                <a 
                  href="mailto:hello@riddlecity.co.uk" 
                  className="hover:text-purple-400 transition-colors duration-200"
                >
                  hello@riddlecity.co.uk
                </a>
              </p>
              <p className="text-neutral-400 text-sm">
                🕵️‍♀️ Based in Barnsley, South Yorkshire
              </p>
            </div>
          </div>
          
          {/* Legal Section */}
          <div>
            <h4 className="font-semibold mb-3 text-white">Legal</h4>
            <div className="space-y-2">
              <Link 
                href="/privacy" 
                className="block text-neutral-400 hover:text-purple-400 transition-colors duration-200 text-sm"
              >
                Privacy Policy
              </Link>
              <Link 
                href="/terms" 
                className="block text-neutral-400 hover:text-purple-400 transition-colors duration-200 text-sm"
              >
                Terms of Service
              </Link>
              <Link 
                href="/contact" 
                className="block text-neutral-400 hover:text-purple-400 transition-colors duration-200 text-sm"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
        
        {/* Copyright Section */}
        <div className="border-t border-neutral-800 mt-8 pt-6 text-center">
          <p className="text-neutral-500 text-sm">
            &copy; 2025 RiddleCity. All rights reserved. | Made with 🧩 in Barnsley
          </p>
        </div>
      </div>
    </footer>
  );
}