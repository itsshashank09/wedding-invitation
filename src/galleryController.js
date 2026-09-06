/**
 * GalleryController
 * Manages the image carousel logic on the Gallery page.
 */
export class GalleryController {
  constructor() {
    this.photos = [];
    this.currentIndex = 0;
    this.isTransitioning = false;

    this.currentImg = document.getElementById('gallery-photo-current');
    this.nextImg = document.getElementById('gallery-photo-next');
    this.prevBtn = document.getElementById('gallery-prev');
    this.nextBtn = document.getElementById('gallery-next');
    this.photoContainer = document.querySelector('.gallery-photo-container');

    // Full photo modal elements
    this.lightbox = document.getElementById('gallery-lightbox');
    this.lightboxImg = document.getElementById('gallery-lightbox-img');
    this.lightboxClose = document.getElementById('gallery-lightbox-close');
    this.lightboxPrevBtn = document.getElementById('gallery-lightbox-prev');
    this.lightboxNextBtn = document.getElementById('gallery-lightbox-next');
    this.lightboxCaption = document.getElementById('gallery-lightbox-caption');

    this._loadPhotos();
  }

  _loadPhotos() {
    // Vite specific way to import a directory of assets dynamically
    const modules = import.meta.glob('/assets/gallery photos/*.{jpg,JPG,png,PNG}', { eager: true, query: '?url' });
    
    if (Object.keys(modules).length > 0) {
      this.photos = Object.values(modules).map(mod => mod.default || mod);
    } else {
      // Fallback
      for (let i = 1; i <= 46; i++) {
        let num = i < 10 ? '0' + i : i;
        this.photos.push(`/assets/gallery photos/${num}.JPG`);
      }
    }
    
    if (this.photos.length > 0 && this.currentImg) {
      this.currentImg.src = this.photos[0];
      this._bindEvents();
    }
  }

  _bindEvents() {
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showPrev();
      });
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showNext();
      });
    }

    // Tap/click photo container to open full uncropped photo
    if (this.photoContainer) {
      this.photoContainer.addEventListener('click', (e) => {
        e.preventDefault();
        this.openFullPhoto();
      });
    }

    // Lightbox navigation button handlers
    if (this.lightboxPrevBtn) {
      this.lightboxPrevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.lightboxPrev();
      });
    }

    if (this.lightboxNextBtn) {
      this.lightboxNextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.lightboxNext();
      });
    }

    // Close button
    if (this.lightboxClose) {
      this.lightboxClose.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closeFullPhoto();
      });
    }

    // Keyboard navigation while lightbox is open
    window.addEventListener('keydown', (e) => {
      if (!this.lightbox || !this.lightbox.classList.contains('active')) return;
      if (e.key === 'Escape') {
        this.closeFullPhoto();
      } else if (e.key === 'ArrowRight') {
        this.lightboxNext();
      } else if (e.key === 'ArrowLeft') {
        this.lightboxPrev();
      }
    });

    // Touch swipe & tap support inside the Lightbox modal ("iframe")
    if (this.lightbox) {
      let lbTouchStartX = 0;
      let lbTouchStartY = 0;
      let lbTouchStartTime = 0;

      this.lightbox.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          lbTouchStartX = e.touches[0].clientX;
          lbTouchStartY = e.touches[0].clientY;
          lbTouchStartTime = Date.now();
        }
      }, { passive: true });

      this.lightbox.addEventListener('touchend', (e) => {
        if (e.changedTouches.length === 1) {
          const deltaX = e.changedTouches[0].clientX - lbTouchStartX;
          const deltaY = e.changedTouches[0].clientY - lbTouchStartY;
          const deltaTime = Date.now() - lbTouchStartTime;

          // Horizontal swipe inside modal
          if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX < 0) {
              this.lightboxNext();
            } else {
              this.lightboxPrev();
            }
          } else if (Math.abs(deltaX) < 18 && Math.abs(deltaY) < 18 && deltaTime < 450) {
            // Tap outside the photo frame closes the modal
            const target = e.target;
            if (target && !target.closest('.gallery-lightbox-frame') && !target.closest('.gallery-lightbox-nav')) {
              this.closeFullPhoto();
            }
          }
        }
      }, { passive: true });

      // Click outside photo frame on desktop closes the modal
      this.lightbox.addEventListener('click', (e) => {
        const target = e.target;
        if (target && !target.closest('.gallery-lightbox-frame') && !target.closest('.gallery-lightbox-nav')) {
          this.closeFullPhoto();
        }
      });
    }

    // Touch swipe & tap support on the main gallery carousel
    const carousel = document.getElementById('gallery-carousel');
    if (carousel) {
      let touchStartX = 0;
      let touchStartY = 0;
      let touchStartTime = 0;
      
      carousel.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          touchStartTime = Date.now();
        }
      }, { passive: true });

      carousel.addEventListener('touchend', (e) => {
        if (e.changedTouches.length === 1) {
          const deltaX = e.changedTouches[0].clientX - touchStartX;
          const deltaY = e.changedTouches[0].clientY - touchStartY;
          const deltaTime = Date.now() - touchStartTime;
          
          if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe detected -> Navigate photos
            if (deltaX < 0) {
              this.showNext();
            } else {
              this.showPrev();
            }
          } else if (Math.abs(deltaX) < 18 && Math.abs(deltaY) < 18 && deltaTime < 450) {
            // Clean stationary tap -> Open full photo
            const target = e.target;
            // Ensure tap was not on navigation arrow buttons
            if (target && !target.closest('.gallery-btn')) {
              this.openFullPhoto();
            }
          }
        }
      }, { passive: true });
    }
  }

  openFullPhoto() {
    if (!this.lightbox || !this.lightboxImg) return;
    const currentSrc = this.photos[this.currentIndex] || (this.currentImg ? this.currentImg.src : '');
    if (!currentSrc) return;

    this.lightboxImg.src = currentSrc;
    this.lightboxImg.style.opacity = '1';
    this.lightboxImg.style.transform = 'translateX(0)';
    this._updateLightboxCaption();
    this.lightbox.classList.add('active');
    this.lightbox.setAttribute('aria-hidden', 'false');
  }

  closeFullPhoto() {
    if (!this.lightbox) return;
    this.lightbox.classList.remove('active');
    this.lightbox.setAttribute('aria-hidden', 'true');
  }

  lightboxNext() {
    if (this.photos.length <= 1) return;
    this.showNext();
    this._updateLightboxImg(this.photos[this.currentIndex], 'next');
  }

  lightboxPrev() {
    if (this.photos.length <= 1) return;
    this.showPrev();
    this._updateLightboxImg(this.photos[this.currentIndex], 'prev');
  }

  _updateLightboxImg(src, direction = 'next') {
    if (!this.lightboxImg) return;
    
    // Smooth slide & fade transition
    this.lightboxImg.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
    this.lightboxImg.style.opacity = '0.35';
    this.lightboxImg.style.transform = direction === 'next' ? 'translateX(-16px)' : 'translateX(16px)';

    const newImg = new Image();
    newImg.src = src;
    newImg.onload = () => {
      this.lightboxImg.src = src;
      this.lightboxImg.style.transition = 'opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
      this.lightboxImg.style.opacity = '1';
      this.lightboxImg.style.transform = 'translateX(0)';
      this._updateLightboxCaption();
    };
  }

  _updateLightboxCaption() {
    if (this.lightboxCaption) {
      this.lightboxCaption.textContent = `Photo ${this.currentIndex + 1} of ${this.photos.length} • Swipe to browse`;
    }
  }

  showNext() {
    if (this.isTransitioning || this.photos.length <= 1) return;
    this.currentIndex = (this.currentIndex + 1) % this.photos.length;
    this._transitionTo(this.photos[this.currentIndex]);
  }

  showPrev() {
    if (this.isTransitioning || this.photos.length <= 1) return;
    this.currentIndex = (this.currentIndex - 1 + this.photos.length) % this.photos.length;
    this._transitionTo(this.photos[this.currentIndex]);
  }

  _transitionTo(src) {
    this.isTransitioning = true;
    
    this.nextImg.src = src;
    
    this.nextImg.onload = () => {
      this.nextImg.classList.add('active');
      
      setTimeout(() => {
        this.currentImg.src = src;
        this.nextImg.classList.remove('active');
        this.isTransitioning = false;
      }, 800);
    };

    this.nextImg.onerror = () => {
      this.isTransitioning = false;
    };
  }
}
