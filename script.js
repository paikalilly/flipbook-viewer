(() => {
  const $ = (sel) => document.querySelector(sel);

  let pageFlip;              // stPageFlip instance
  let zoom = flipbookConfig.initialZoom || 1;
  const pages = flipbookConfig.pages || [];
  const pageCount = pages.length;

  const titleEl = $('#book-title');
  const bookEl  = $('#book');
  const zoomEl  = $('#book-zoom');

  const slider  = $('#slider');
  const label   = $('#page-label');

  const btnPrev = $('#btn-prev');
  const btnNext = $('#btn-next');
  const btnZoomIn  = $('#btn-zoom-in');
  const btnZoomOut = $('#btn-zoom-out');
  const btnFs   = $('#btn-fullscreen');
  const btnMute = $('#btn-mute');

  const audio   = $('#flip-audio');

  // --- init title/background
  document.body.style.background = flipbookConfig.backgroundColor || '#111';
  titleEl.textContent = flipbookConfig.title || 'Flipbook';

  // --- mute state persistence
  const MUTE_KEY = 'flipbook-muted';
  const persistedMute = localStorage.getItem(MUTE_KEY);
  if (persistedMute === 'true') { btnMute.dataset.muted = 'true'; audio.muted = true; }

  // --- set slider
  slider.min = 1;
  slider.max = Math.max(1, pageCount);
  slider.value = 1;
  updateLabel(0);

  // --- init PageFlip when lib is ready
  window.addEventListener('DOMContentLoaded', () => {
    const ratio = flipbookConfig.aspectRatio || 1.414; // height / width
    sizeToContainer(ratio);

    pageFlip = new St.PageFlip(bookEl, {
      width: Math.floor(zoomEl.clientWidth  * 0.92),
      height: Math.floor(zoomEl.clientWidth * 0.92 * ratio),
      size: "stretch",
      maxShadowOpacity: flipbookConfig.shadowOpacity ?? 0.3,
      showCover: !!flipbookConfig.showCover,
      usePortrait: false,
      mobileScrollSupport: false
    });

    pageFlip.loadFromImages(pages);

    // flip sound
    pageFlip.on('flip', (e) => {
      slider.value = (e.data + 1).toString();
      updateLabel(e.data);
      if (!audio.muted) {
        try { audio.currentTime = 0; audio.play(); } catch(_) {}
      }
    });

    // click / tap zones
    $('.tap-zone.left').addEventListener('click', () => pageFlip.flipPrev());
    $('.tap-zone.right').addEventListener('click', () => pageFlip.flipNext());

    // buttons
    btnPrev.addEventListener('click', () => pageFlip.flipPrev());
    btnNext.addEventListener('click', () => pageFlip.flipNext());

    // zoom buttons
    btnZoomIn.addEventListener('click', () => setZoom(clamp(zoom + (flipbookConfig.zoomStep || 0.2),
                                                           flipbookConfig.minZoom || 1,
                                                           flipbookConfig.maxZoom || 2)));
    btnZoomOut.addEventListener('click', () => setZoom(clamp(zoom - (flipbookConfig.zoomStep || 0.2),
                                                            flipbookConfig.minZoom || 1,
                                                            flipbookConfig.maxZoom || 2)));
    // dblclick toggles zoom
    zoomEl.addEventListener('dblclick', () => {
      const mid = ((flipbookConfig.minZoom||1)+(flipbookConfig.maxZoom||2))/2;
      setZoom(zoom > mid ? (flipbookConfig.minZoom||1) : (flipbookConfig.maxZoom||2));
    });

    // fullscreen
    btnFs.addEventListener('click', () => {
      if (!document.fullscreenElement) zoomEl.requestFullscreen?.();
      else document.exitFullscreen?.();
    });

    // mute
    btnMute.addEventListener('click', () => {
      const nowMuted = !(btnMute.dataset.muted === 'true');
      btnMute.dataset.muted = String(nowMuted);
      audio.muted = nowMuted;
      localStorage.setItem(MUTE_KEY, String(nowMuted));
    });

    // slider -> jump
    slider.addEventListener('input', (e) => {
      const idx = Number(e.target.value) - 1;
      updateLabel(idx);
    });
    slider.addEventListener('change', (e) => {
      const idx = Number(e.target.value) - 1;
      pageFlip.turnToPage(idx);
    });

    // keys
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') pageFlip.flipNext();
      if (e.key === 'ArrowLeft')  pageFlip.flipPrev();
      if (e.key === '+') setZoom(clamp(zoom + (flipbookConfig.zoomStep||0.2),
                                       flipbookConfig.minZoom||1, flipbookConfig.maxZoom||2));
      if (e.key === '-') setZoom(clamp(zoom - (flipbookConfig.zoomStep||0.2),
                                       flipbookConfig.minZoom||1, flipbookConfig.maxZoom||2));
      if (e.key.toLowerCase() === 'f') btnFs.click();
      if (e.key.toLowerCase() === 'm') btnMute.click();
    });

    // responsive sizing
    window.addEventListener('resize', () => {
      sizeToContainer(ratio);
      pageFlip.update({
        width: Math.floor(zoomEl.clientWidth  * 0.92),
        height: Math.floor(zoomEl.clientWidth * 0.92 * ratio)
      });
    });
  });

  function setZoom(val){
    zoom = val;
    zoomEl.style.transform = `scale(${zoom})`;
  }
  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

  function sizeToContainer(ratio){
    // Keep book inside zoom box respecting aspect ratio
    const W = Math.min(window.innerWidth * 0.96, 1200);
    const H = Math.min(window.innerHeight * 0.86, 800);
    // just set container; PageFlip gets exact px in constructor/update
    zoomEl.style.width  = W + 'px';
    zoomEl.style.height = H + 'px';
  }

  function updateLabel(index){
    // Label like "10–11" for spreads; single numbers for covers
    if (pageCount <= 0) { label.textContent = '—'; return; }
    const last = pageCount - 1;

    if (flipbookConfig.showCover) {
      if (index === 0) { label.textContent = '1'; return; }
      if (index === last) { label.textContent = String(pageCount); return; }
      // middle spreads (approximation matching common viewers)
      label.textContent = (index % 2 === 1)
        ? `${index+1}–${index+2}`
        : `${index}–${index+1}`;
    } else {
      // no cover mode: show even-odd pair around index
      if (index % 2 === 0) label.textContent = `${index+1}–${index+2}`;
      else                  label.textContent = `${index}–${index+1}`;
    }
  }
})();
