import { CinemaStateMachine, CinemaState } from './stateMachine.js';

/**
 * CinemaController
 * Orchestrates the continuous cinematic transition between
 * Ganesh Intro and Front Page Invitation, and manages scroll-locking
 * until both video sequences finish.
 */
export class CinemaController {
  constructor() {
    this.fsm = new CinemaStateMachine();

    // DOM Elements
    this.stage = document.getElementById('viewport-stage');
    this.sceneGanesh = document.getElementById('scene-ganesh');
    this.ganeshPoster = document.getElementById('ganesh-poster');
    this.ganeshVideo = document.getElementById('ganesh-video');
    this.ganeshPrompt = document.getElementById('ganesh-prompt');

    this.sceneFront = document.getElementById('scene-front');
    this.frontPoster = document.getElementById('front-poster');
    this.frontVideo = document.getElementById('front-video');
    this.scrollCue = document.getElementById('scroll-cue');

    this.whiteBridge = document.getElementById('white-flash-bridge');

    // Internal timing & scroll lock state
    this._rafId = null;
    this._transitionTriggered = false;
    this._isScrollLocked = true;
    this._scrollPreventer = null;

    // Bind methods
    this.handleInteraction = this.handleInteraction.bind(this);
    this._checkGaneshProgress = this._checkGaneshProgress.bind(this);

    this._init();
  }

  _init() {
    // 1. Strictly lock scrolling until Ganesh and Front Page video finish
    this._lockScroll();

    // Both videos are strictly muted per user preference
    if (this.ganeshVideo) this.ganeshVideo.muted = true;
    if (this.frontVideo) this.frontVideo.muted = true;

    // Subscribe to state changes for DOM synchronization
    this.fsm.subscribe((nextState, prevState) => {
      this._onStateChange(nextState, prevState);
    });

    // Setup stage interaction listener (covers full viewport)
    this.stage.addEventListener('pointerdown', this.handleInteraction, { passive: false });

    // Setup video event listeners
    this._setupVideoListeners();

    // Hide scroll cue once user starts scrolling
    window.addEventListener('scroll', () => {
      if (window.scrollY > 40 && this.scrollCue) {
        this.scrollCue.style.opacity = '0';
      }
    }, { passive: true });

    console.log('[CinemaController] Initialized in state:', this.fsm.state);
  }

  /**
   * Prevents user scrolling on touch/wheel/keyboard while videos are playing
   */
  _lockScroll() {
    this._isScrollLocked = true;
    document.documentElement.classList.add('scroll-locked');
    document.body.classList.add('scroll-locked');

    if (!this._scrollPreventer) {
      this._scrollPreventer = (e) => {
        if (this._isScrollLocked) {
          if (e.cancelable) e.preventDefault();
        }
      };
      this._keyPreventer = (e) => {
        if (this._isScrollLocked) {
          if (['Space', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.code) || e.keyCode === 32 || (e.keyCode >= 33 && e.keyCode <= 40)) {
            e.preventDefault();
          }
        }
      };
      window.addEventListener('wheel', this._scrollPreventer, { passive: false });
      window.addEventListener('touchmove', this._scrollPreventer, { passive: false });
      window.addEventListener('keydown', this._keyPreventer, { passive: false });
    }
  }

  /**
   * Unlocks page scrolling once Front Page video completes
   */
  _unlockScroll() {
    if (!this._isScrollLocked) return;
    this._isScrollLocked = false;
    document.documentElement.classList.remove('scroll-locked');
    document.body.classList.remove('scroll-locked');

    console.log('[CinemaController] Videos finished -> Page scroll unlocked');

    if (this.scrollCue) {
      this.scrollCue.classList.add('visible');
    }
  }

  /**
   * Preload Front Page assets ahead of time
   */
  _preloadFrontPage() {
    // Pre-decode Front Page poster image
    if (this.frontPoster && this.frontPoster.src) {
      const preImg = new Image();
      preImg.src = this.frontPoster.src;
    }

    // Pre-buffer Front Page video
    if (this.frontVideo) {
      this.frontVideo.load();
    }
  }

  _setupVideoListeners() {
    // Hide Ganesh poster as soon as video presents first moving frame
    this.ganeshVideo.addEventListener('timeupdate', () => {
      if (this.ganeshVideo.currentTime > 0.05 && !this.ganeshPoster.classList.contains('hidden')) {
        this.ganeshPoster.classList.add('hidden');
      }
      this._checkGaneshProgress();
    });

    // Fallback: in case timeupdate misses the exact boundary, trigger on ended
    this.ganeshVideo.addEventListener('ended', () => {
      console.log('[CinemaController] Ganesh video ended event fired');
      this._startSmoothTransition();
    });

    // Monitor front video playback
    this.frontVideo.addEventListener('timeupdate', () => {
      if (this.frontVideo.currentTime > 0.05 && !this.frontPoster.classList.contains('hidden')) {
        this.frontPoster.classList.add('hidden');
      }

      // Detect video completion (at ~5.85s of 6.0s duration)
      const dur = this.frontVideo.duration || 6.0;
      if (this.frontVideo.currentTime >= dur - 0.15) {
        this._unlockScroll();
      }
    });

    this.frontVideo.addEventListener('ended', () => {
      console.log('[CinemaController] Front page video ended event fired');
      this._unlockScroll();
    });
  }

  /**
   * Viewport touch/click handler
   */
  handleInteraction(e) {
    // Only accept interaction when strictly in GANESH_IDLE
    if (!this.fsm.is(CinemaState.GANESH_IDLE)) {
      return;
    }

    if (e && e.preventDefault && e.cancelable) {
      e.preventDefault();
    }

    console.log('[CinemaController] User interaction received -> Starting Ganesh playback');
    this.startGaneshAnimation();
  }

  /**
   * Starts the Ganesh opening sequence
   */
  startGaneshAnimation() {
    if (!this.fsm.transitionTo(CinemaState.GANESH_PLAYING)) {
      return;
    }

    this._transitionTriggered = false;

    // Immediately hide prompt on interaction
    if (this.ganeshPrompt) {
      this.ganeshPrompt.classList.add('hidden');
    }

    // Both videos are strictly muted per user request
    this.ganeshVideo.muted = true;
    this.frontVideo.muted = true;

    this.ganeshVideo.play().catch((err) => {
      console.warn('[CinemaController] Ganesh video play error:', err);
    });

    // Start high-precision animation frame monitor
    this._startMonitorLoop();
  }

  _startMonitorLoop() {
    const loop = () => {
      if (this.fsm.is(CinemaState.GANESH_PLAYING)) {
        this._checkGaneshProgress();
        this._rafId = requestAnimationFrame(loop);
      }
    };
    this._rafId = requestAnimationFrame(loop);
  }

  _stopMonitorLoop() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  /**
   * Continuously checks playback position.
   * Ganesh video duration is 4.0s (96 frames @ 24fps).
   * White bloom begins naturally around ~3.65s.
   * We smoothly transition into the white glow so it feels organic and cinematic.
   */
  _checkGaneshProgress() {
    if (this._transitionTriggered || !this.fsm.is(CinemaState.GANESH_PLAYING)) {
      return;
    }

    const curr = this.ganeshVideo.currentTime;
    const dur = this.ganeshVideo.duration || 4.0;

    // Begin gentle white bloom transition at ~3.65s (0.35s before end)
    if (curr >= dur - 0.35 || curr >= 3.65) {
      this._startSmoothTransition();
    }
  }

  /**
   * Smooth, fluid cinematic crossfade:
   * 1. Start Front Page video on top but invisible (opacity 0)
   * 2. Fade it in smoothly over 1.2s while Ganesh holds its last frame
   * 3. Clean up Ganesh scene
   */
  _startSmoothTransition() {
    if (this._transitionTriggered) return;
    this._transitionTriggered = true;
    this._stopMonitorLoop();

    console.log('[CinemaController] Starting smooth cinematic fade-in');
    this.fsm.transitionTo(CinemaState.GANESH_FINAL_FRAME);

    // 1. Prepare Front Page to fade in ON TOP of Ganesh
    if (this.frontPoster) {
      this.frontPoster.classList.add('hidden');
    }
    
    // Set initial state for fade-in (z-index 20, opacity 0)
    this.sceneFront.style.transition = 'none';
    this.sceneFront.style.opacity = '0';
    this.sceneFront.classList.add('active');

    this.frontVideo.currentTime = 0;
    this.frontVideo.muted = true;
    this.frontVideo.play().catch((err) => {
      console.warn('[CinemaController] Front video play error:', err);
    });

    // 2. Trigger the fade-in effect smoothly over 1.2s
    requestAnimationFrame(() => {
      this.sceneFront.style.transition = 'opacity 1200ms ease';
      this.sceneFront.style.opacity = '1';
    });

    // 3. Clean up after the fade completes
    setTimeout(() => {
      this.fsm.transitionTo(CinemaState.FRONT_PAGE_PLAYING);
      
      this.sceneGanesh.classList.remove('active');
      this.ganeshVideo.pause();
      
      // Clean up inline styles
      this.sceneFront.style.transition = '';
      this.sceneFront.style.opacity = '';
      
      // Hide the white bridge completely just in case
      this.whiteBridge.style.opacity = '0';
      this.whiteBridge.style.pointerEvents = 'none';
    }, 1200);
  }

  _onStateChange(nextState, prevState) {
    console.log(`[CinemaController] State changed: ${prevState} -> ${nextState}`);
  }

  /**
   * Reset the experience to beginning (for repeated testing)
   */
  reset() {
    this._stopMonitorLoop();
    this._transitionTriggered = false;
    this._lockScroll();

    if (this.scrollCue) {
      this.scrollCue.classList.remove('visible');
    }

    this.ganeshVideo.pause();
    this.ganeshVideo.currentTime = 0;
    this.ganeshPoster.classList.remove('hidden');
    if (this.ganeshPrompt) {
      this.ganeshPrompt.classList.remove('hidden');
    }

    this.frontVideo.pause();
    this.frontVideo.currentTime = 0;
    this.frontPoster.classList.remove('hidden');

    this.whiteBridge.style.transition = 'none';
    this.whiteBridge.style.opacity = '0';

    this.sceneFront.classList.remove('active');
    this.sceneGanesh.classList.add('active');
    this.sceneGanesh.style.transition = 'none';
    this.sceneGanesh.style.opacity = '1';

    // Force FSM back to IDLE
    this.fsm._state = CinemaState.GANESH_IDLE;
    console.log('[CinemaController] Reset to GANESH_IDLE');
  }
}
