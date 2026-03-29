export function createAppearance() {
  return {
    init() {
      // Theme auto-detection
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', isDark);
    }
  };
}
