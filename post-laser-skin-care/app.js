'use strict';
(() => {
  // This interaction log stays in this page session. Meta Pixel PageView is configured separately in index.html.
  const events = [];
  const record = (name, detail = {}) => {
    const event = { name, ...detail, time: Date.now() };
    events.push(event);
    window.dispatchEvent(new CustomEvent('ssj:interaction', { detail: event }));
  };
  window.ssjPreview = { events };
  const sticky = document.getElementById('sticky-offer');
  const offer = document.getElementById('formula');
  const hero = document.querySelector('.hero');
  let ticking = false;
  function updateSticky() {
    const bounds = offer.getBoundingClientRect();
    sticky.hidden = !(hero.getBoundingClientRect().bottom < 0 && bounds.top > innerHeight);
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(updateSticky); }
  }, { passive: true });
  window.addEventListener('resize', updateSticky);
  updateSticky();
  document.querySelectorAll('[data-event]').forEach(link => link.addEventListener('click', () => record(link.dataset.event, { location: link.dataset.placement || link.id || link.closest('section')?.id || 'hero' })));
  document.querySelectorAll('details').forEach(detail => detail.addEventListener('toggle', () => {
    if (detail.open) record('detail_open', { section: detail.id || detail.closest('section')?.id || 'article' });
  }));

  const reviewTrack = document.getElementById('review-track');
  if (reviewTrack) {
    const cards = [...reviewTrack.querySelectorAll('.review-card')];
    const dots = [...document.querySelectorAll('[data-review-index]')];
    const previous = document.getElementById('review-prev');
    const next = document.getElementById('review-next');
    const counter = document.getElementById('review-counter');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let activeReview = 0;
    let trackWidth = reviewTrack.clientWidth;
    let settleTimer;
    let scrollFrame;
    const cardPosition = index => cards[index].offsetLeft - cards[0].offsetLeft;
    function showReview(index, behavior = reducedMotion.matches ? 'auto' : 'smooth') {
      const destination = Math.max(0, Math.min(index, cards.length - 1));
      reviewTrack.scrollTo({ left: cardPosition(destination), behavior });
    }
    function syncReview() {
      scrollFrame = null;
      // Preserve the current card until the resize observer realigns the track.
      if (reviewTrack.clientWidth !== trackWidth) return;
      let nearest = 0;
      cards.forEach((card, index) => {
        if (Math.abs(cardPosition(index) - reviewTrack.scrollLeft) < Math.abs(cardPosition(nearest) - reviewTrack.scrollLeft)) nearest = index;
      });
      activeReview = nearest;
      previous.disabled = activeReview === 0;
      next.disabled = activeReview === cards.length - 1;
      const countText = `${activeReview + 1} / ${cards.length}`;
      if (counter.textContent !== countText) counter.textContent = countText;
      dots.forEach((dot, index) => {
        if (index === activeReview) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
    }
    function settledReview() {
      syncReview();
      cards.forEach((card, index) => {
        if (index !== activeReview) card.querySelectorAll('.review-full[open]').forEach(detail => { detail.open = false; });
      });
    }
    previous.addEventListener('click', () => { syncReview(); showReview(activeReview - 1); });
    next.addEventListener('click', () => { syncReview(); showReview(activeReview + 1); });
    dots.forEach(dot => dot.addEventListener('click', () => showReview(Number(dot.dataset.reviewIndex))));
    reviewTrack.addEventListener('keydown', event => {
      if (event.target !== reviewTrack) return;
      syncReview();
      const destinations = { ArrowLeft: activeReview - 1, ArrowRight: activeReview + 1, Home: 0, End: cards.length - 1 };
      if (event.key in destinations) { event.preventDefault(); showReview(destinations[event.key]); }
    });
    reviewTrack.addEventListener('scroll', () => {
      if (!scrollFrame) scrollFrame = requestAnimationFrame(syncReview);
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settledReview, 140);
    }, { passive: true });
    reviewTrack.addEventListener('scrollend', settledReview);
    new ResizeObserver(() => {
      if (reviewTrack.clientWidth !== trackWidth) {
        trackWidth = reviewTrack.clientWidth;
        showReview(activeReview, 'instant');
      }
    }).observe(reviewTrack);
    document.querySelector('.review-arrows').hidden = false;
    document.querySelector('.review-dots').hidden = false;
    document.getElementById('review-help').textContent = 'Swipe or use the arrows';
    syncReview();
  }
})();
