(function(global){
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const DESIGN_W = 1440;
  const DESIGN_H = 1024;
  const DESIGN_SHEET_W = 1440;
  const HOLE_R = 14;
  const HOLE_GAP = 15;
  const HOLE_PITCH = HOLE_R * 2 + HOLE_GAP;
  const MOBILE_MQ = '(max-width:900px)';

  function themeKey(raw){
    if(raw === 'retro' || raw === 'retro70') return 'retro';
    if(raw === 'vintage') return 'vintage';
    return 'modern';
  }

  function applyTheme(pageEl, rawStyle){
    const theme = themeKey(rawStyle);
    document.documentElement.dataset.style = theme;
    if(pageEl) pageEl.dataset.style = theme;
    return theme;
  }

  function create(opts){
    const sheet = opts.sheet;
    const stamp = opts.stamp;
    const stampFill = opts.stampFill;
    const stampMask = opts.stampMask;
    const stampMaskFill = opts.stampMaskFill;
    const stampHoleCircles = opts.stampHoleCircles;
    const insetVar = opts.insetVar || '--frame-inset';

    function getInset(){
      return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(insetVar)) || 30;
    }

    function layoutSheet(){
      if(!sheet) return false;
      const mobile = window.matchMedia(MOBILE_MQ).matches;
      sheet.style.display = mobile ? 'none' : 'block';
      if(mobile) return false;

      const inset = getInset();
      const vv = window.visualViewport;
      const vw = vv ? vv.width : window.innerWidth;
      const vh = vv ? vv.height : window.innerHeight;
      const ox = vv ? vv.offsetLeft : 0;
      const oy = vv ? vv.offsetTop : 0;
      const w = Math.max(0, Math.floor(vw - inset * 2));
      const h = Math.max(0, Math.floor(vh - inset * 2));

      sheet.style.top = `${oy + inset}px`;
      sheet.style.left = `${ox + inset}px`;
      sheet.style.width = `${w}px`;
      sheet.style.height = `${h}px`;
      sheet.style.right = 'auto';
      sheet.style.bottom = 'auto';
      return w > 0 && h > 0;
    }

    function fitStampSheet(){
      if(!sheet || !stamp || !stampFill || !stampHoleCircles) return;
      if(!layoutSheet()) return;

      const w = sheet.offsetWidth;
      const h = sheet.offsetHeight;
      if(!w || !h) return;

      const scale = Math.min(w / DESIGN_SHEET_W, 1);
      const pitch = HOLE_PITCH * scale;
      const radius = HOLE_R * scale;

      stamp.setAttribute('viewBox', `0 0 ${w} ${h}`);
      stamp.setAttribute('width', String(w));
      stamp.setAttribute('height', String(h));

      const maskPad = Math.ceil(radius) + 1;
      stampMask.setAttribute('x', String(-maskPad));
      stampMask.setAttribute('y', String(-maskPad));
      stampMask.setAttribute('width', w + maskPad * 2);
      stampMask.setAttribute('height', h + maskPad * 2);
      stampMaskFill.setAttribute('x', '0');
      stampMaskFill.setAttribute('y', '0');
      stampMaskFill.setAttribute('width', w);
      stampMaskFill.setAttribute('height', h);
      stampFill.setAttribute('x', '0');
      stampFill.setAttribute('y', '0');
      stampFill.setAttribute('width', w);
      stampFill.setAttribute('height', h);

      stampHoleCircles.replaceChildren();
      for(let cx = pitch / 2; cx < w; cx += pitch){
        addStampHole(cx, 0);
        addStampHole(cx, h);
      }
      for(let cy = pitch / 2; cy < h; cy += pitch){
        addStampHole(0, cy);
        addStampHole(w, cy);
      }

      function addStampHole(cx, cy){
        const circle = document.createElementNS(SVG_NS, 'circle');
        circle.setAttribute('cx', String(cx));
        circle.setAttribute('cy', String(cy));
        circle.setAttribute('r', String(radius));
        stampHoleCircles.appendChild(circle);
      }
    }

    return { getInset, layoutSheet, fitStampSheet };
  }

  global.FrameBackground = {
    SVG_NS,
    DESIGN_W,
    DESIGN_H,
    DESIGN_SHEET_W,
    HOLE_R,
    HOLE_GAP,
    HOLE_PITCH,
    MOBILE_MQ,
    themeKey,
    applyTheme,
    create,
  };
})(window);
