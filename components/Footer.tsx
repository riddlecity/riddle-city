// components/Footer.tsx
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-neutral-900 border-t border-neutral-800 py-4 px-4 mt-auto">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 gap-4">
          {/* Contact Section */}
          <div>
            <h4 className="font-semibold mb-2 text-white text-sm">Contact</h4>
            <p className="text-neutral-400 text-xs">
              <a 
                href="mailto:hello@riddlecity.co.uk" 
                className="hover:text-purple-400 transition-colors duration-200"
              >
                hello@riddlecity.co.uk
              </a>
            </p>
          </div>
          
          {/* Legal Section */}
          <div>
            <h4 className="font-semibold mb-2 text-white text-sm">Legal</h4>
            <div className="flex flex-wrap gap-2 text-xs">
              <Link 
                href="/privacy" 
                className="text-neutral-400 hover:text-purple-400 transition-colors duration-200"
              >
                Privacy Policy
              </Link>
              <Link 
                href="/terms" 
                className="text-neutral-400 hover:text-purple-400 transition-colors duration-200"
              >
                Terms of Service
              </Link>
              <Link 
                href="/contact" 
                className="text-neutral-400 hover:text-purple-400 transition-colors duration-200"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
        
        {/* Copyright Section */}
        <div className="border-t border-neutral-800 mt-3 pt-2 text-center">
          <p className="text-neutral-500 text-xs">
            &copy; 2025 RiddleCity. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}