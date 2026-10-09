import { Link } from "react-router-dom";
import wordmark from "../../assets/datakat-wordmark.png";
import { scrollToHash } from "../../lib/scroll";

const LINKS = [
  { label: "Product", hash: "#product", testid: "footer-link-product" },
  { label: "How It Works", hash: "#how-it-works", testid: "footer-link-how-it-works" },
  { label: "Security", hash: "#security", testid: "footer-link-security" },
];

export const Footer = () => (
  <footer data-testid="footer" className="border-t border-white/5 bg-abyss">
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 md:flex-row md:items-center md:justify-between md:px-12 lg:px-16">
      <Link to="/" data-testid="footer-logo" aria-label="DataKat home">
        <img src={wordmark} alt="DataKat" className="h-6 w-auto opacity-90" />
      </Link>
      <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-8 gap-y-3">
        {LINKS.map((l) => (
          <a
            key={l.hash}
            href={l.hash}
            onClick={scrollToHash(l.hash)}
            data-testid={l.testid}
            className="text-sm text-white/45 transition-colors duration-300 hover:text-white"
          >
            {l.label}
          </a>
        ))}
      </nav>
      <p className="text-xs text-white/30">© 2026 DataKat</p>
    </div>
  </footer>
);
