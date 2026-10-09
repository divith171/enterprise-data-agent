import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import wordmark from "../../assets/datakat-wordmark.png";
import { scrollToHash } from "../../lib/scroll";
import { EASE } from "./Reveal";

const LINKS = [
  { label: "Product", hash: "#product", testid: "nav-link-product" },
  { label: "How It Works", hash: "#how-it-works", testid: "nav-link-how-it-works" },
  { label: "Security", hash: "#security", testid: "nav-link-security" },
];

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      if (window.__lenis) window.__lenis.stop();
    } else {
      document.body.style.overflow = "";
      if (window.__lenis) window.__lenis.start();
    }
    return () => {
      document.body.style.overflow = "";
      if (window.__lenis) window.__lenis.start();
    };
  }, [open]);

  const handleAnchor = (hash) => (e) => {
    e.preventDefault();
    setOpen(false);
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => scrollToHash(hash)(), 300);
    } else {
      scrollToHash(hash)();
    }
  };

  return (
    <>
      <header
        data-testid="navbar"
        className={`fixed inset-x-0 top-0 z-[70] transition-[background-color,border-color,backdrop-filter] duration-500 ${
          scrolled || open
            ? "border-b border-white/5 bg-abyss/80 backdrop-blur-md"
            : "border-b border-transparent bg-transparent"
        }`}
      >
      <nav
        className="relative z-50 flex items-center justify-between px-6 py-5 md:px-12 lg:px-16"
        aria-label="Primary"
      >
        <Link
          to="/"
          data-testid="nav-logo"
          aria-label="DataKat home"
          onClick={() => setOpen(false)}
        >
          <img
            src={wordmark}
            alt="DataKat"
            className="h-7 w-auto [filter:drop-shadow(0_1px_10px_rgba(4,10,20,0.55))] md:h-8"
          />
        </Link>

        <div className="hidden items-center gap-9 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.hash}
              href={l.hash}
              onClick={handleAnchor(l.hash)}
              data-testid={l.testid}
              className="text-sm text-white/70 transition-colors duration-300 hover:text-white"
            >
              {l.label}
            </a>
          ))}
          <Link
            to="/login"
            data-testid="nav-signin"
            className="text-sm text-white/70 transition-colors duration-300 hover:text-white"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            data-testid="nav-get-started"
            className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-abyss transition-colors duration-300 hover:bg-white"
          >
            Get Started
          </Link>
        </div>

        <button
          type="button"
          data-testid="mobile-menu-button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center text-white md:hidden"
        >
          <motion.span
            initial={false}
            animate={{ rotate: open ? 90 : 0, scale: open ? 0.95 : 1 }}
            transition={{ duration: 0.25 }}
            className="flex"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </motion.span>
        </button>
      </nav>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            data-testid="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[60] flex flex-col justify-center bg-abyss px-8 md:hidden"
          >
            <nav aria-label="Mobile" className="flex flex-col">
              {LINKS.map((l, i) => (
                <motion.a
                  key={l.hash}
                  href={l.hash}
                  onClick={handleAnchor(l.hash)}
                  data-testid={`mobile-${l.testid}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.06, duration: 0.5, ease: EASE }}
                  className="border-b border-white/5 py-4 text-3xl font-medium tracking-tight text-white/90"
                >
                  {l.label}
                </motion.a>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5, ease: EASE }}
                className="mt-8 flex flex-col items-start gap-5"
              >
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  data-testid="mobile-nav-signin"
                  className="text-lg text-white/70 transition-colors duration-300 hover:text-white"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setOpen(false)}
                  data-testid="mobile-nav-get-started"
                  className="rounded-full bg-brand px-7 py-3 text-base font-medium text-abyss transition-colors duration-300 hover:bg-white"
                >
                  Get Started
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
