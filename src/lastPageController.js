/**
 * LastPageController
 * Manages Section 4 (Last Page):
 * - Seamless, glitch-free dual-layer looping for the animated video background.
 * - Alternates between two pre-buffered video elements with smooth crossfading,
 *   completely bypassing browser seek stutters and hardware decoder delays.
 * - Manages performance via IntersectionObserver so videos only play when in view.
 */
export class LastPageController {
  constructor() {
    this.section = document.getElementById('section-last');
    this.videoA = document.getElementById('last-page-video-a');
    this.videoB = document.getElementById('last-page-video-b');
    this.mapContainer = document.querySelector('.last-page-map-container');

    this.activeVideo = this.videoA;
    this.standbyVideo = this.videoB;
    this.isTransitioning = false;
    this.fadeDuration = 0.45; // 450ms crossfade window
    this._observer = null;
    this._userInteracted = false;

    this._onTimeUpdate = this._onTimeUpdate.bind(this);
    this._onEnded = this._onEnded.bind(this);
    this._onUserInteraction = this._onUserInteraction.bind(this);

    this._init();
  }

  _init() {
    if (!this.section || !this.videoA) {
      console.warn('[LastPageController] Elements missing for last page video');
      return;
    }

    // Configure both videos
    [this.videoA, this.videoB].forEach((vid) => {
      if (!vid) return;
      vid.muted = true;
      vid.playsInline = true;
      vid.loop = false; // Handled programmatically for glitchless crossfade
      vid.addEventListener('timeupdate', this._onTimeUpdate);
      vid.addEventListener('ended', this._onEnded);
    });

    // One-time interaction fallback to satisfy strict mobile autoplay policies
    ['pointerdown', 'touchstart', 'scroll', 'keydown'].forEach((evt) => {
      window.addEventListener(evt, this._onUserInteraction, { passive: true, once: true });
    });

    // IntersectionObserver to play only when Section 4 is visible
    if ('IntersectionObserver' in window && this.section) {
      this._observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              this._playActive();
            } else {
              this._pauseAll();
            }
          });
        },
        { threshold: 0.15 }
      );
      this._observer.observe(this.section);
    } else {
      this._playActive();
    }

    console.log('[LastPageController] Glitchless video loop initialized');
  }

  _playActive() {
    if (!this.activeVideo) return;
    const playPromise = this.activeVideo.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        // Autoplay may be restricted before first touch/click
        console.debug('[LastPageController] Autoplay waiting for interaction:', err);
      });
    }
  }

  _pauseAll() {
    if (this.videoA) this.videoA.pause();
    if (this.videoB) this.videoB.pause();
  }

  _onUserInteraction() {
    this._userInteracted = true;
    // If section is currently in view, ensure playback starts
    if (this.section) {
      const rect = this.section.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (inView) {
        this._playActive();
      }
    }
  }

  _onTimeUpdate(e) {
    const v = e.target;
    if (v !== this.activeVideo || this.isTransitioning) return;

    const dur = v.duration;
    if (dur && v.currentTime >= dur - this.fadeDuration) {
      this._switchVideos();
    }
  }

  _onEnded(e) {
    const v = e.target;
    if (v === this.activeVideo) {
      this._switchVideos();
    }
  }

  _switchVideos() {
    if (this.isTransitioning) return;
    if (!this.standbyVideo) {
      // Single video fallback
      this.activeVideo.currentTime = 0;
      this.activeVideo.play().catch(() => {});
      return;
    }

    this.isTransitioning = true;

    // Reset standby video position and start playing immediately
    this.standbyVideo.currentTime = 0;
    const p = this.standbyVideo.play();
    if (p !== undefined) {
      p.catch(() => {});
    }

    // Smooth opacity crossfade via CSS class
    this.standbyVideo.classList.add('active');
    this.activeVideo.classList.remove('active');

    setTimeout(() => {
      // Pause previously active video and rewind
      if (this.activeVideo) {
        this.activeVideo.pause();
        this.activeVideo.currentTime = 0;
      }

      // Swap pointers
      const temp = this.activeVideo;
      this.activeVideo = this.standbyVideo;
      this.standbyVideo = temp;
      this.isTransitioning = false;
    }, Math.round(this.fadeDuration * 1000));
  }

  destroy() {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    [this.videoA, this.videoB].forEach((vid) => {
      if (!vid) return;
      vid.removeEventListener('timeupdate', this._onTimeUpdate);
      vid.removeEventListener('ended', this._onEnded);
      vid.pause();
    });
  }
}
