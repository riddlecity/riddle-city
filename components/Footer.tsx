// components/Footer.tsx
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-neutral-900 border-t border-neutral-800 py-2 px-4 mt-auto">
      <div className="max-w-6xl mx-auto">
        {/* Mobile: two lines — links centred, copyright below */}
        <div className="flex flex-col items-center gap-1 md:hidden">
          <div className="flex items-center gap-x-2 text-xs text-neutral-400 whitespace-nowrap">
            <Link href="/faq" className="hover:text-white transition-colors">FAQ</Link>
            <span className="text-neutral-700">·</span>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <span className="text-neutral-700">·</span>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <span className="text-neutral-700">·</span>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            <span className="text-neutral-700">·</span>
            <Link href="/leaderboards" className="hover:text-white transition-colors">Leaderboards</Link>
          </div>
          <p className="text-[10px] text-neutral-600">&copy; 2025 RiddleCity. All rights reserved.</p>
        </div>

        {/* Desktop: 4-column grid */}
        <div className="hidden md:grid md:grid-cols-4 gap-4">
          <div>
            <h4 className="font-semibold mb-2 text-white text-sm">Contact</h4>
            <p className="text-neutral-400 text-xs">
              <a href="mailto:hello@riddlecity.co.uk" className="hover:text-purple-400 transition-colors duration-200">hello@riddlecity.co.uk</a>
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2 text-white text-sm">Compete</h4>
            <Link href="/leaderboards" className="text-neutral-400 hover:text-purple-400 transition-colors duration-200 text-xs">🏆 Leaderboards</Link>
          </div>
          <div>
            <h4 className="font-semibold mb-2 text-white text-sm">Info</h4>
            <Link href="/faq" className="text-neutral-400 hover:text-purple-400 transition-colors duration-200 text-xs">❓ FAQ</Link>
          </div>
          <div>
            <h4 className="font-semibold mb-2 text-white text-sm">Legal</h4>
            <div className="flex flex-wrap gap-2 text-xs">
              <Link href="/privacy" className="text-neutral-400 hover:text-purple-400 transition-colors duration-200">Privacy Policy</Link>
              <Link href="/terms" className="text-neutral-400 hover:text-purple-400 transition-colors duration-200">Terms of Service</Link>
              <Link href="/contact" className="text-neutral-400 hover:text-purple-400 transition-colors duration-200">Contact Us</Link>
            </div>
          </div>
        </div>

        <div className="hidden md:block border-t border-neutral-800 mt-2 pt-2 text-center">
          <p className="text-neutral-600 text-xs">&copy; 2025 RiddleCity. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
