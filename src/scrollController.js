/**
 * ScrollController
 * Automatically triggers the smooth slide-in of the dual decorative panels
 * on Page 2 as soon as the user scrolls into the section.
 * Re-arms smoothly only when user scrolls back to the top of the Front Page.
 */

export class ScrollController {
  constructor() {
    this.section = document.getElementById('section-invitation');
    this.panelLeft = document.getElementById('panel-left');
    this.panelRight = document.getElementById('panel-right');

    this.lastSection = document.getElementById('section-last');
    this.footer = document.getElementById('last-page-footer');

    this._observer = null;
    this._footerObserver = null;
    this._isRevealed = false;
    this._isFooterRevealed = false;
    this._checkPosition = this._checkPosition.bind(this);

    this._init();
  }

  _init() {
    if (!this.section) {
      console.warn('[ScrollController] section-invitation element not found');
    }

    // 1. IntersectionObserver to trigger when Page 2 enters view
    if ('IntersectionObserver' in window) {
      if (this.section) {
        this._observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                this._reveal();
              }
            });
          },
          { threshold: 0.1 }
        );
        this._observer.observe(this.section);
      }
    }

    // 2. Scroll listener for smooth thresholding & re-arming at the top
    window.addEventListener('scroll', this._checkPosition, { passive: true });
    window.addEventListener('resize', this._checkPosition, { passive: true });

    // Initial check
    this._checkPosition();

    console.log('[ScrollController] Automatic panel & footer reveal initialized');
  }

  _reveal() {
    if (this._isRevealed) return;
    this._isRevealed = true;
    if (this.section) {
      this.section.classList.add('revealed');
    }
  }

  _reset() {
    if (!this._isRevealed) return;
    this._isRevealed = false;
    if (this.section) {
      this.section.classList.remove('revealed');
    }
  }

  _revealFooter() {
    if (this._isFooterRevealed) return;
    this._isFooterRevealed = true;
    if (this.footer) {
      this.footer.classList.add('visible');
    }
  }

  _resetFooter() {
    if (!this._isFooterRevealed) return;
    this._isFooterRevealed = false;
    if (this.footer) {
      this.footer.classList.remove('visible');
    }
  }

  _checkPosition() {
    const winH = window.innerHeight || document.documentElement.clientHeight;
    const scrollY = window.scrollY || window.pageYOffset;
    const docH = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight
    );

    // Section 2 check
    if (this.section) {
      const rect = this.section.getBoundingClientRect();
      if (rect.top <= winH * 0.75 && rect.bottom >= winH * 0.1) {
        this._reveal();
      }
      if (scrollY < 80 || rect.top >= winH * 0.98) {
        this._reset();
      }
    }

    // Section 4 (Footer): Trigger smoothly every time user reaches the end, and reset on scroll up
    if (this.footer && this.lastSection) {
      const lastRect = this.lastSection.getBoundingClientRect();
      const scrollBottom = scrollY + winH;

      // When user fully reaches the end of the site
      const reachedEnd = (scrollBottom >= docH - 60) || (lastRect.bottom <= winH + 40);
      // When user scrolls back up away from the end
      const scrolledAway = (scrollBottom < docH - 110) && (lastRect.bottom > winH + 80);

      if (reachedEnd) {
        this._revealFooter();
      } else if (scrolledAway) {
        this._resetFooter();
      }
    }
  }

  destroy() {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    window.removeEventListener('scroll', this._checkPosition);
    window.removeEventListener('resize', this._checkPosition);
  }
}


