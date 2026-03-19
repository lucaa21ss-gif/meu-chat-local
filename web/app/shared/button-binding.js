/**
 * Button binding utility - consolidates desktop/mobile button pair bindings
 * Reduces duplication by registering paired buttons to the same handler
 */

export function createButtonBindingHelper() {
  /**
   * Binds a desktop button and optional mobile variant to the same handler
   * @param {HTMLElement} desktopBtn - Desktop button element
   * @param {HTMLElement} [mobileBtn] - Optional mobile button element
   * @param {Function} handler - Click handler to attach
   */
  function bindPair(desktopBtn, mobileBtn, handler) {
    if (desktopBtn) {
      desktopBtn.addEventListener("click", handler);
    }
    if (mobileBtn) {
      mobileBtn.addEventListener("click", handler);
    }
  }

  /**
   * Binds a single button (or pair) with error handling
   * @param {HTMLElement} btn - Button element
   * @param {HTMLElement} [btnMobile] - Optional mobile button element
   * @param {Function} asyncFn - Async function to execute on click
   */
  function bindWithErrorHandling(btn, btnMobile, asyncFn) {
    const handler = () => {
      asyncFn().catch((err) => {
        console.error(err);
      });
    };
    bindPair(btn, btnMobile, handler);
  }

  /**
   * Binds a single button (or pair) with sync handler
   * @param {HTMLElement} btn - Button element
   * @param {HTMLElement} [btnMobile] - Optional mobile button element
   * @param {Function} fn - Function to execute on click
   */
  function bindSync(btn, btnMobile, fn) {
    bindPair(btn, btnMobile, fn);
  }

  /**
   * Binds multiple button pairs from an array of descriptors
   * Each descriptor: { btn, btnMobile, handler, isAsync }
   */
  function bindMultiple(pairs) {
    for (const { btn, btnMobile, handler, isAsync } of pairs) {
      if (isAsync) {
        bindWithErrorHandling(btn, btnMobile, handler);
      } else {
        bindSync(btn, btnMobile, handler);
      }
    }
  }

  return {
    bindPair,
    bindWithErrorHandling,
    bindSync,
    bindMultiple,
  };
}

