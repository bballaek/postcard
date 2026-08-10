/* Retro film filter */
const RetroFilter = (() => {
let _work;
function workCanvas() {
  if (!_work) _work = document.createElement('canvas');
  return _work;
}

function configureCrossOriginImage(img, src){
  if(src && !src.startsWith('data:') && !src.startsWith('blob:')){
    img.crossOrigin = 'anonymous';
  }
}

function cleanFrameAlpha(ctx, w, h){
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for(let i = 0; i < d.length; i += 4){
    const a = d[i + 3];
    if(a === 0 || a === 255) continue;
    if(a < 24){
      d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0;
    } else {
      const k = 255 / a;
      d[i] = Math.min(255, Math.round(d[i] * k));
      d[i + 1] = Math.min(255, Math.round(d[i + 1] * k));
      d[i + 2] = Math.min(255, Math.round(d[i + 2] * k));
    }
  }
  ctx.putImageData(img, 0, 0);
}

function orthoLum(r,g,b){
  // Справжній ортохром: r*0.05, g*0.68, b*0.27 (червоний майже ігнорується)
  return r*0.05+g*0.68+b*0.27;
}

function sampleWithAberration(data, x, y, w, h, cx, cy, channel){
  const dx=(x-cx)/cx, dy=(y-cy)/cy;
  const dist=Math.sqrt(dx*dx+dy*dy);
  // Сила аберації зростає до країв
  const strength=dist*dist*3.5;
  // R зміщується назовні, B всередину
  let sx=x, sy=y;
  if(channel===0){ sx=x+dx*strength; sy=y+dy*strength; }
  else if(channel===2){ sx=x-dx*strength*0.7; sy=y-dy*strength*0.7; }
  sx=Math.min(w-1,Math.max(0,Math.round(sx)));
  sy=Math.min(h-1,Math.max(0,Math.round(sy)));
  return data[(sy*w+sx)*4+channel];
}

function sepiaMap(lum){
  const t=lum/255;
  let r,g,b;
  if(t<0.35){
    const f=t/0.35;
    r=38+f*(70-38); g=32+f*(58-32); b=28+f*(50-28);
  } else if(t<0.75){
    const f=(t-0.35)/0.4;
    r=70+f*(160-70); g=58+f*(148-58); b=50+f*(125-50);
  } else {
    const f=(t-0.75)/0.25;
    r=160+f*(215-160); g=148+f*(205-148); b=125+f*(190-125);
  }
  return [r,g,b];
}

function toneCurve(x){
  x=52+x*(245-52)/255;
  const t=x/255;
  if(t<0.12) return t*0.65*255;
  if(t>0.88) return (0.88*0.65+0.42+(t-0.88)*0.42)*255;
  if(t<0.5){
    return (2*t*t)*255;
  } else {
    const s=1-Math.pow(-2*t+2,2)/2;
    return (s*0.72+t*0.28)*255;
  }
}

function processRetroFilm(srcCanvas, pc){
  const w=srcCanvas.width, h=srcCanvas.height;
  pc.width=w; pc.height=h;
  const pCtx = pc.getContext("2d");

  // Імітація низької роздільності плівки 30-х
  // Зменшуємо до ~700px по довшій стороні і збільшуємо назад — деталі тонуть
  const filmRes=700;
  const scale=Math.min(1, filmRes/Math.max(w,h));
  const sw=Math.round(w*scale), sh=Math.round(h*scale);

  const tmpC=document.createElement('canvas');
  tmpC.width=sw; tmpC.height=sh;
  const tmpCtx=tmpC.getContext('2d');
  tmpCtx.imageSmoothingEnabled=true;
  tmpCtx.imageSmoothingQuality='high';
  tmpCtx.drawImage(srcCanvas,0,0,sw,sh);

  // Масштабуємо назад на повний розмір — пікселізація плівки
  pCtx.filter='none';
  pCtx.imageSmoothingEnabled=true;
  pCtx.imageSmoothingQuality='high';
  pCtx.drawImage(tmpC,0,0,w,h);
  const rawData=pCtx.getImageData(0,0,w,h).data.slice();

  // Додатковий м'який blur поверх — оптика без різкості
  pCtx.filter='blur(1.2px)';
  pCtx.drawImage(tmpC,0,0,w,h);
  pCtx.filter='none';

  const imgData=pCtx.getImageData(0,0,w,h);
  const d=imgData.data;
  const cx=w/2, cy=h/2;

  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      const i=(y*w+x)*4;

      // Хроматична аберація — читаємо канали з різних позицій
      const r=sampleWithAberration(rawData,x,y,w,h,cx,cy,0);
      const g=rawData[i+1];
      const b=sampleWithAberration(rawData,x,y,w,h,cx,cy,2);

      // Ортохроматична яскравість
      let lum=orthoLum(r,g,b);
      lum=toneCurve(lum);

      const dx=(x-cx)/cx, dy=(y-cy)/cy;
      const dist=Math.sqrt(dx*dx*0.85+dy*dy);

      // Віньєтка — -15% темноти
      const vig=Math.max(0,1-Math.pow(dist,1.9)*0.61);
      lum=Math.min(255,Math.max(0,lum*vig));

      // М'якість по краях — стара оптика не тримала фокус на периферії
      // Додатковий локальний blur-ефект через змішування з сусідніми пікселями
      const edgeSoft=Math.min(1,dist*0.6);
      if(edgeSoft>0.2){
        const ni=(Math.min(h-1,y+1)*w+x)*4;
        const lumN=orthoLum(rawData[ni],rawData[ni+1],rawData[ni+2]);
        lum=lum*(1-edgeSoft*0.35)+toneCurve(lumN)*edgeSoft*0.35;
      }

      // Нерівномірне проявлення
      const unevenX=Math.sin(x*0.018+y*0.007)*4.5;
      const unevenY=Math.cos(y*0.013+x*0.005)*3.5;
      lum=Math.min(255,Math.max(0,lum+unevenX+unevenY));

      // Хімічне зерно — кластеризоване, грубше в тінях
      const grainCluster=Math.sin(x*0.5)*Math.cos(y*0.5)*0.5+0.5;
      const noise=(Math.random()-.5)*36*(1-(lum/255)*0.55)*(0.7+grainCluster*0.6);
      lum=Math.min(255,Math.max(0,lum+noise));

      const [sr,sg,sb]=sepiaMap(lum);
      d[i]=Math.min(255,sr);
      d[i+1]=Math.min(255,sg);
      d[i+2]=Math.min(255,sb);
    }
  }
  pCtx.putImageData(imgData,0,0);

  // Галація — світіння навколо яскравих зон (характерно для плівки 30-х)
  pCtx.save();
  pCtx.globalCompositeOperation='screen';
  pCtx.filter='blur(8px)';
  pCtx.globalAlpha=0.12;
  pCtx.drawImage(pc,0,0);
  pCtx.filter='none';
  pCtx.globalAlpha=1;
  pCtx.restore();

  // Природні подряпини і затертості
  const rng=(seed)=>{let s=seed; return ()=>{s=Math.sin(s)*43758.5453123; return s-Math.floor(s);}};
  const rand=rng(Date.now()%1000);

  // Вертикальні і діагональні подряпини (+10%)
  const scratchCount=6+Math.floor(rand()*8);
  for(let s=0;s<scratchCount;s++){
    const sx=rand()*w;
    const startY=rand()*h*0.35;
    const endY=startY+h*(0.25+rand()*0.65);
    const alpha=0.06+rand()*0.22;
    const angleOffset=(rand()-.5)*w*0.1;
    pCtx.save();
    const cp1x=sx+(rand()-.5)*14, cp1y=startY+(endY-startY)*0.33;
    const cp2x=sx+(rand()-.5)*14, cp2y=startY+(endY-startY)*0.66;
    const endX=sx+angleOffset;
    const grad=pCtx.createLinearGradient(sx,startY,endX,endY);
    grad.addColorStop(0,`rgba(255,240,210,0)`);
    grad.addColorStop(0.08+rand()*0.1,`rgba(255,240,210,${alpha})`);
    grad.addColorStop(0.35+rand()*0.2,`rgba(255,240,210,${alpha*0.35})`);
    grad.addColorStop(0.55+rand()*0.15,`rgba(255,240,210,${alpha*0.8})`);
    grad.addColorStop(0.88,`rgba(255,240,210,${alpha*0.5})`);
    grad.addColorStop(1,`rgba(255,240,210,0)`);
    pCtx.beginPath();
    pCtx.moveTo(sx,startY);
    pCtx.bezierCurveTo(cp1x,cp1y,cp2x,cp2y,endX+(rand()-.5)*6,endY);
    pCtx.strokeStyle=grad;
    pCtx.lineWidth=rand()<0.75 ? 0.3+rand()*0.8 : 1.2+rand()*2.0;
    pCtx.lineCap='round';
    pCtx.stroke();
    pCtx.restore();
  }

  // Горизонтальні затертості +10%
  const hScratchCount=3+Math.floor(rand()*5);
  for(let s=0;s<hScratchCount;s++){
    const hx=rand()*w*0.7+w*0.05;
    const hy=rand()*h;
    const len=w*(0.04+rand()*0.14);
    const alpha=0.05+rand()*0.13;
    pCtx.save();
    const grad=pCtx.createLinearGradient(hx,hy,hx+len,hy);
    grad.addColorStop(0,`rgba(255,240,210,0)`);
    grad.addColorStop(0.2,`rgba(255,240,210,${alpha})`);
    grad.addColorStop(0.8,`rgba(255,240,210,${alpha})`);
    grad.addColorStop(1,`rgba(255,240,210,0)`);
    pCtx.beginPath();
    pCtx.moveTo(hx,hy);
    pCtx.lineTo(hx+len,hy+(rand()-.5)*5);
    pCtx.strokeStyle=grad;
    pCtx.lineWidth=0.4+rand()*0.7;
    pCtx.lineCap='round';
    pCtx.stroke();
    pCtx.restore();
  }

  // Пошкодження емульсії — темні неправильні плями
  const emulsionCount=3+Math.floor(rand()*4);
  for(let i=0;i<emulsionCount;i++){
    const ex=rand()*w, ey=rand()*h;
    const er=3+rand()*12;
    const alpha=0.06+rand()*0.14;
    pCtx.save();
    pCtx.beginPath();
    // Неправильна форма — не коло
    pCtx.ellipse(ex,ey,er,er*(0.3+rand()*0.5),rand()*Math.PI*2,0,Math.PI*2);
    pCtx.fillStyle=`rgba(8,4,0,${alpha})`;
    pCtx.fill();
    pCtx.restore();
  }

  // Пересвіт плівки по краях — легкий, ~10% впливу
  const edgeSide=Math.floor(rand()*4); // 0=top,1=bottom,2=left,3=right
  const leakAlpha=0.07+rand()*0.06;
  pCtx.save();
  pCtx.globalCompositeOperation='screen';
  let leakGrad;
  const leakSize=0.22+rand()*0.12; // глибина пересвіту відносно розміру
  if(edgeSide===0){
    leakGrad=pCtx.createLinearGradient(0,0,0,h*leakSize);
    leakGrad.addColorStop(0,`rgba(230,210,170,${leakAlpha})`);
    leakGrad.addColorStop(1,`rgba(230,210,170,0)`);
    pCtx.fillStyle=leakGrad; pCtx.fillRect(0,0,w,h*leakSize);
  } else if(edgeSide===1){
    leakGrad=pCtx.createLinearGradient(0,h,0,h*(1-leakSize));
    leakGrad.addColorStop(0,`rgba(230,210,170,${leakAlpha})`);
    leakGrad.addColorStop(1,`rgba(230,210,170,0)`);
    pCtx.fillStyle=leakGrad; pCtx.fillRect(0,h*(1-leakSize),w,h*leakSize);
  } else if(edgeSide===2){
    leakGrad=pCtx.createLinearGradient(0,0,w*leakSize,0);
    leakGrad.addColorStop(0,`rgba(230,210,170,${leakAlpha})`);
    leakGrad.addColorStop(1,`rgba(230,210,170,0)`);
    pCtx.fillStyle=leakGrad; pCtx.fillRect(0,0,w*leakSize,h);
  } else {
    leakGrad=pCtx.createLinearGradient(w,0,w*(1-leakSize),0);
    leakGrad.addColorStop(0,`rgba(230,210,170,${leakAlpha})`);
    leakGrad.addColorStop(1,`rgba(230,210,170,0)`);
    pCtx.fillStyle=leakGrad; pCtx.fillRect(w*(1-leakSize),0,w*leakSize,h);
  }
  pCtx.restore();

  // Плями затертості — розмиті світлі ділянки
  const wearCount=2+Math.floor(rand()*4);
  for(let i=0;i<wearCount;i++){
    const wx=rand()*w, wy=rand()*h;
    const rr=20+rand()*60;
    const alpha=0.04+rand()*0.08;
    const grad=pCtx.createRadialGradient(wx,wy,0,wx,wy,rr);
    grad.addColorStop(0,`rgba(220,195,155,${alpha})`);
    grad.addColorStop(1,`rgba(220,195,155,0)`);
    pCtx.save();
    pCtx.globalCompositeOperation='screen';
    pCtx.fillStyle=grad;
    pCtx.beginPath();
    pCtx.ellipse(wx,wy,rr,rr*(0.4+rand()*0.6),rand()*Math.PI,0,Math.PI*2);
    pCtx.fill();
    pCtx.restore();
  }

  // Темні мікроплями — бруд, пошкодження емульсії
  const spotCount=4+Math.floor(rand()*6);
  for(let i=0;i<spotCount;i++){
    const spx=rand()*w, spy=rand()*h;
    const sr=1+rand()*5;
    const alpha=0.08+rand()*0.15;
    const grad=pCtx.createRadialGradient(spx,spy,0,spx,spy,sr);
    grad.addColorStop(0,`rgba(10,5,0,${alpha})`);
    grad.addColorStop(1,`rgba(10,5,0,0)`);
    pCtx.save();
    pCtx.fillStyle=grad;
    pCtx.beginPath();
    pCtx.ellipse(spx,spy,sr,sr*(0.5+rand()*0.5),rand()*Math.PI,0,Math.PI*2);
    pCtx.fill();
    pCtx.restore();
  }


  return pc;
}

function composeWithFrame(pc, frameConfig, options){
  return new Promise((resolve) => {
    const frameImg = new Image();
    configureCrossOriginImage(frameImg, frameConfig.src);
    frameImg.onload = async () => {
      const maxOut = (options && options.maxOut) || 900;
      const fwOrig = frameImg.naturalWidth;
      const fhOrig = frameImg.naturalHeight;
      const fScale = Math.min(1, maxOut / fwOrig);
      const fw = Math.round(fwOrig * fScale);
      const fh = Math.round(fhOrig * fScale);
      const fc = document.createElement('canvas');
      fc.width = fw; fc.height = fh;
      const fCtx = fc.getContext('2d', {alpha: true});
      fCtx.clearRect(0, 0, fw, fh);
      fCtx.drawImage(frameImg, 0, 0, fw, fh);
      cleanFrameAlpha(fCtx, fw, fh);

      const z = frameConfig.photo;
      const photoX = Math.round(fw * z.x);
      const photoY = Math.round(fh * z.y);
      const photoW = Math.round(fw * z.w);
      const photoH = Math.round(fh * z.h);
      const bleed = Math.max(2, Math.round(4 * fScale));

      // Вписуємо фото в зону рамки зберігаючи пропорції (cover)
      const srcW = pc.width, srcH = pc.height;
      const dstW = photoW, dstH = photoH;
      const srcRatio = srcW / srcH;
      const dstRatio = dstW / dstH;
      let drawW, drawH, drawX, drawY;
      if(srcRatio > dstRatio){
        // фото ширше — підганяємо по висоті, обрізаємо боки
        drawH = dstH;
        drawW = dstH * srcRatio;
        drawX = photoX - (drawW - dstW) / 2;
        drawY = photoY;
      } else {
        // фото вужче — підганяємо по ширині, обрізаємо знизу (верхній відступ = боковим)
        drawW = dstW;
        drawH = dstW / srcRatio;
        drawX = photoX;
        drawY = photoY;
      }
      fCtx.save();
      fCtx.rect(photoX - bleed, photoY - bleed, photoW + bleed * 2, photoH + bleed * 2);
      fCtx.clip();
      fCtx.imageSmoothingEnabled = true;
      fCtx.imageSmoothingQuality = 'high';
      fCtx.drawImage(pc, drawX, drawY, drawW, drawH);
      fCtx.restore();


      const rc = document.createElement('canvas');
      rc.width = fw; rc.height = fh;
      const rCtx = rc.getContext('2d', {alpha: true});
      rCtx.clearRect(0, 0, fw, fh);
      rCtx.save();
      rCtx.rect(photoX - bleed, photoY - bleed, photoW + bleed * 2, photoH + bleed * 2);
      rCtx.clip();
      rCtx.imageSmoothingEnabled = true;
      rCtx.imageSmoothingQuality = 'high';
      rCtx.drawImage(pc, drawX, drawY, drawW, drawH);
      rCtx.restore();

      resolve({
        full: fc.toDataURL('image/png'),
        reveal: rc.toDataURL('image/png'),
      });
    };
    frameImg.src = frameConfig.src;
  });
}

function cropToRatio(img, ratio) {
  const tmp = document.createElement('canvas');
  let sw = img.width, sh = img.height;
  if (sw / sh > ratio) sw = Math.round(sh * ratio);
  else sh = Math.round(sw / ratio);
  const sx = Math.round((img.width - sw) / 2);
  const sy = Math.round((img.height - sh) / 2);
  tmp.width = sw; tmp.height = sh;
  const tCtx = tmp.getContext('2d');
  tCtx.imageSmoothingEnabled = true;
  tCtx.imageSmoothingQuality = 'high';
  tCtx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return tmp;
}

function clamp255(v){
  return Math.min(255, Math.max(0, v));
}

function rec709Lum(r,g,b){
  return r*0.299+g*0.587+b*0.114;
}

function processWarmFilm(srcCanvas, pc){
  const w=srcCanvas.width, h=srcCanvas.height;
  pc.width=w; pc.height=h;
  const pCtx=pc.getContext('2d');
  pCtx.imageSmoothingEnabled=true;
  pCtx.imageSmoothingQuality='high';
  pCtx.drawImage(srcCanvas,0,0);

  const imgData=pCtx.getImageData(0,0,w,h);
  const d=imgData.data;

  for(let i=0;i<d.length;i+=4){
    let r=d[i], g=d[i+1], b=d[i+2];

    // Brightness +5%
    r*=1.05; g*=1.05; b*=1.05;

    // Contrast -15%
    r=128+(r-128)*0.85;
    g=128+(g-128)*0.85;
    b=128+(b-128)*0.85;

    // Saturation -15%
    let lum=rec709Lum(r,g,b);
    r=lum+(r-lum)*0.85;
    g=lum+(g-lum)*0.85;
    b=lum+(b-lum)*0.85;

    // Легке нейтральне освітлення без жовтого касту
    r+=1; g+=0; b+=1;

    lum=rec709Lum(r,g,b);

    // Shadows lifted +10 — менше «теплого» у тінях
    if(lum<128){
      const lift=10*((128-lum)/128);
      r+=lift; g+=lift; b+=lift;
    }

    // Highlights -10
    if(lum>128){
      const cut=10*((lum-128)/127);
      r-=cut; g-=cut; b-=cut;
    }

    d[i]=clamp255(r);
    d[i+1]=clamp255(g);
    d[i+2]=clamp255(b);
  }
  pCtx.putImageData(imgData,0,0);

  // Vignette — м'яка, opacity 30%
  const cx=w/2, cy=h/2;
  const maxR=Math.sqrt(cx*cx+cy*cy);
  const vig=pCtx.createRadialGradient(cx,cy,maxR*0.3,cx,cy,maxR*1.02);
  vig.addColorStop(0,'rgba(0,0,0,0)');
  vig.addColorStop(0.55,'rgba(0,0,0,0)');
  vig.addColorStop(1,'rgba(0,0,0,0.3)');
  pCtx.save();
  pCtx.fillStyle=vig;
  pCtx.fillRect(0,0,w,h);
  pCtx.restore();

  // Grain ~15-20px — м'яке зерно без пікселізації
  const grainC=document.createElement('canvas');
  grainC.width=w; grainC.height=h;
  const gCtx=grainC.getContext('2d');
  const gd=gCtx.createImageData(w,h);
  for(let gi=0;gi<gd.data.length;gi+=4){
    const v=128+(Math.random()-0.5)*72;
    gd.data[gi]=gd.data[gi+1]=gd.data[gi+2]=v;
    gd.data[gi+3]=255;
  }
  gCtx.putImageData(gd,0,0);

  const grainSoft=document.createElement('canvas');
  grainSoft.width=w; grainSoft.height=h;
  const gsCtx=grainSoft.getContext('2d');
  gsCtx.filter='blur(8px)';
  gsCtx.drawImage(grainC,0,0);
  gsCtx.filter='none';

  pCtx.save();
  pCtx.globalCompositeOperation='overlay';
  pCtx.globalAlpha=0.22;
  pCtx.imageSmoothingEnabled=true;
  pCtx.imageSmoothingQuality='high';
  pCtx.drawImage(grainSoft,0,0);
  pCtx.restore();

  return pc;
}

const _warmCache = new Map();

function applyWarmToDataUrl(dataUrl, ratio){
  const key = 'warm4|' + String(ratio || 0) + '|' + dataUrl.length + '|' + dataUrl.slice(0, 120) + '|' + dataUrl.slice(-80);
  if (_warmCache.has(key)) return Promise.resolve(_warmCache.get(key));

  return new Promise((resolve, reject) => {
    const img = new Image();
    configureCrossOriginImage(img, dataUrl);
    img.onload = () => {
      try {
        const cropped = ratio ? cropToRatio(img, ratio) : img;
        const pc = workCanvas();
        processWarmFilm(cropped, pc);
        const out = pc.toDataURL('image/jpeg', 0.92);
        _warmCache.set(key, out);
        resolve(out);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load photo'));
    img.src = dataUrl;
  });
}

async function applyPostcard(srcCanvas, frameConfig) {
  const processed = processRetroFilm(srcCanvas, workCanvas());
  const result = await composeWithFrame(processed, frameConfig);
  return result.full;
}

async function applyWarmPostcard(srcCanvas, frameConfig) {
  const processed = processWarmFilm(srcCanvas, workCanvas());
  const result = await composeWithFrame(processed, frameConfig, { maxOut: 1652 });
  return result.full;
}

const _vintageCache = new Map();

function applyVintageToDataUrl(dataUrl, ratio){
  const key = 'vintage1|' + String(ratio || 0) + '|' + dataUrl.length + '|' + dataUrl.slice(0, 120) + '|' + dataUrl.slice(-80);
  if (_vintageCache.has(key)) return Promise.resolve(_vintageCache.get(key));

  return new Promise((resolve, reject) => {
    const img = new Image();
    configureCrossOriginImage(img, dataUrl);
    img.onload = () => {
      try {
        const cropped = ratio ? cropToRatio(img, ratio) : img;
        const pc = workCanvas();
        processRetroFilm(cropped, pc);
        const out = pc.toDataURL('image/jpeg', 0.92);
        _vintageCache.set(key, out);
        resolve(out);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load photo'));
    img.src = dataUrl;
  });
}

return { cropToRatio, applyPostcard, applyWarmPostcard, applyWarmToDataUrl, applyVintageToDataUrl, processWarmFilm, processRetroFilm };
})();
