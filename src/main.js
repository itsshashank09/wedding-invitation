import './style.css';
import { CinemaController } from './cinemaController.js';
import { ScrollController } from './scrollController.js';
import { GalleryController } from './galleryController.js';
// Prevent browser from restoring scroll position in the middle of the page on refresh
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

// Initialize the cinematic invitation controller and scroll controller once DOM is parsed
window.addEventListener('DOMContentLoaded', () => {
  window.scrollTo(0, 0);
  const cinema = new CinemaController();
  const scroller = new ScrollController();
  const gallery = new GalleryController();

  // Expose to window for testing / automated verification
  window.__weddingCinema = cinema;
  window.__weddingScroller = scroller;
  window.__weddingGallery = gallery;

  console.log('[App] Cinematic Wedding Invitation and Scroll Controller initialized and ready');
});
