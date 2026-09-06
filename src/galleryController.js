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

    // Touch swipe support on mobile
    const carousel = document.getElementById('gallery-carousel');
    if (carousel) {
      let touchStartX = 0;
      let touchStartY = 0;
      
      carousel.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      }, { passive: true });

      carousel.addEventListener('touchend', (e) => {
        if (e.changedTouches.length === 1) {
          const deltaX = e.changedTouches[0].clientX - touchStartX;
          const deltaY = e.changedTouches[0].clientY - touchStartY;
          
          if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX < 0) {
              this.showNext();
            } else {
              this.showPrev();
            }
          }
        }
      }, { passive: true });
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
