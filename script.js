(() => {
  const $ = (sel) => document.querySelector(sel);

  let pageFlip;                    // StPageFlip instance
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

  // ---------- helpers ----------
  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

  function setZoom(val){
    zoom = val;
    zoomEl.style.transform = `scale(${zoom})`;
  }

  // Keep book inside zoom box while preserving ratio (ratio = height/width)
  function fitToBox(boxW, boxH, ratio){
    const w = Math.min(boxW, Math.floor(boxH / ratio));
    return { w, h: Math.floor(w * ratio) };
  }

  function sizeToContainer(){
    const W = Math.min(window.innerWidth  * 0.96, 1200);
    const H = Math.min(window.innerHeight * 0.86,  800);
    zoomEl.style.width  = W + 'px';
    zoomEl.style.height = H + 'px';
  }

  function updateLabel(index){
    if (pageCount <= 0) { label.textContent = '—'; return; }
    const last = pageCount - 1;

    if (flipbookConfig.showCover) {
      if (index === 0)   { label.textContent = '1'; return; }
      if (index === last){ label.textContent = String(pageCount); return; }
      label.textContent = (index % 2 === 1)
        ? `${index+1}–${index+2}`
        : `${index}–${index+1}`;
    } else {
      label.textContent = (index % 2 === 0)
        ? `${index+1}–${index+2}`
        : `${index}–${index+1}`;
    }
  }

  // ---------- main ----------
  window.addEventListener('DOMContentLoaded', () => {
    // title + bg
    document.body.style.background = flipbookConfig.backgroundColor || '#111';
    titleEl.textContent = flipbookConfig.title || 'Flipbook';

    // mute state
    const MUTE_KEY = 'flipbook-muted';
    const persistedMute = localStorage.getItem(MUTE_KEY);
    if (persistedMute === 'true') { btnMute.dataset.muted = 'true'; audio.muted = true; }

    // slider
    slider.min = 1;
    slider.max = Math.max(1, pageCount);
    slider.value = 1;
    updateLabel(0);

    // layout + init
    const ratio = flipbookConfig.aspectRatio || 1; // square by your config
    sizeToContainer();
    const { w, h } = fitToBox(zoomEl.clientWidth, zoomEl.clientHeight, ratio);

    pageFlip = new St.PageFlip(bookEl, {
      width: w,
      height: h,
      size: 'stretch',
      maxShadowOpacity: 0,                  // kill library shadows
      showCover: !!flipbookConfig.showCover,
      usePortrait: false,
      mobileScrollSupport: true
    });

    pageFlip.loadFromImages(pages);

    // ensure wrapper/canvas are transparent (belt-and-braces)
    const makeTransparent = () => {
      const c = bookEl.querySelector('canvas.stf__canvas');
      const w = bookEl.querySelector('.stf__wrapper');
      if (c) c.style.background = 'transparent';
      if (w) w.style.background = 'transparent';
    };
    makeTransparent();

    // events
    pageFlip.on('flip', (e) => {
      slider.value = (e.data + 1).toString();
      updateLabel(e.data);
      if (!audio.muted) { try { audio.currentTime = 0; audio.play(); } catch(_){} }
      makeTransparent();
    });

    // tap zones
    $('.tap-zone.left').addEventListener('click', () => pageFlip.flipPrev());
    $('.tap-zone.right').addEventListener('click', () => pageFlip.flipNext());

    // buttons
    btnPrev.addEventListener('click', () => pageFlip.flipPrev());
    btnNext.addEventListener('click', () => pageFlip.flipNext());

    // zoom
    btnZoomIn.addEventListener('click', () => setZoom(clamp(
      zoom + (flipbookConfig.zoomStep || 0.2),
      flipbookConfig.minZoom || 1,
      flipbookConfig.maxZoom || 2
    )));
    btnZoomOut.addEventListener('click', () => setZoom(clamp(
      zoom - (flipbookConfig.zoomStep || 0.2),
      flipbookConfig.minZoom || 1,
      flipbookConfig.maxZoom || 2
    )));
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
      localStorage.setItem('flipbook-muted', String(nowMuted));
    });

    // slider -> jump
    slider.addEventListener('input', (e) => updateLabel(Number(e.target.value) - 1));
    slider.addEventListener('change', (e) => pageFlip.turnToPage(Number(e.target.value) - 1));

    // keys
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') pageFlip.flipNext();
      if (e.key === 'ArrowLeft')  pageFlip.flipPrev();
      if (e.key === '+') btnZoomIn.click();
      if (e.key === '-') btnZoomOut.click();
      if (e.key.toLowerCase() === 'f') btnFs.click();
      if (e.key.toLowerCase() === 'm') btnMute.click();
    });

    // responsive
    window.addEventListener('resize', () => {
      sizeToContainer();
      const s = fitToBox(zoomEl.clientWidth, zoomEl.clientHeight, ratio);
      pageFlip.update({ width: s.w, height: s.h });
      makeTransparent();
    });
  });
})();
