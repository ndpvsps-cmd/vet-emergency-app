(function () {
  "use strict";

  const SPARKLE_CHARS = ["✦", "✧", "★", "✨"];
  const SPARKLE_COLORS = ["#22d3ee", "#a78bfa", "#f97316", "#f4d976", "#06b6d4"];
  const COUNT = 7;

  function spawnSparkles(x, y) {
    for (let i = 0; i < COUNT; i++) {
      const el = document.createElement("span");
      el.className = "sparkle-particle";
      el.textContent = SPARKLE_CHARS[Math.floor(Math.random() * SPARKLE_CHARS.length)];
      el.style.left = x + "px";
      el.style.top = y + "px";
      el.style.color = SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)];

      const angle = (Math.PI * 2 * i) / COUNT + Math.random() * 0.6;
      const dist = 26 + Math.random() * 28;
      el.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      el.style.setProperty("--dy", Math.sin(angle) * dist + "px");
      el.style.animationDelay = Math.random() * 60 + "ms";

      document.body.appendChild(el);
      el.addEventListener("animationend", () => el.remove());
    }
  }

  // Delegated: every <button> in the app (nav tabs, toggles, menu cards, print,
  // next-page, mascot, disclaimer) gets a sparkle burst at the click point.
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    spawnSparkles(e.clientX, e.clientY);
  });
})();
