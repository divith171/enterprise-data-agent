export const scrollToHash = (hash) => (e) => {
  if (e && e.preventDefault) e.preventDefault();
  const el = document.querySelector(hash);
  if (!el) return;
  if (window.__lenis) {
    window.__lenis.scrollTo(el, {
      duration: 1.5,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });
  } else {
    el.scrollIntoView({ behavior: "smooth" });
  }
};
