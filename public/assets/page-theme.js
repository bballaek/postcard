(function(){
  const THEME_BY_STYLE = {
    modern: 'modern',
    retro: 'retro',
    retro70: 'retro',
    vintage: 'retro',
  };

  function resolveRawStyle(){
    const fromUrl = new URLSearchParams(window.location.search).get('style');
    if(fromUrl) return fromUrl;
    return 'modern';
  }

  function themeKey(rawStyle){
    return THEME_BY_STYLE[rawStyle] || 'modern';
  }

  function applyPageTheme(explicitRawStyle){
    const rawStyle = explicitRawStyle || resolveRawStyle();
    const theme = themeKey(rawStyle);
    document.documentElement.dataset.style = theme;
    document.documentElement.dataset.cardStyle = rawStyle in THEME_BY_STYLE ? rawStyle : 'modern';
    document.querySelectorAll('.create-page, .share-page, .view-page').forEach((page)=>{
      page.dataset.style = theme;
    });
    return { rawStyle, theme };
  }

  applyPageTheme();
  document.addEventListener('DOMContentLoaded', applyPageTheme);
  window.addEventListener('load', applyPageTheme);

  window.PageTheme = {
    applyPageTheme,
    resolveRawStyle,
    themeKey,
    withStyleParam(url, rawStyle){
      const next = new URL(url, window.location.href);
      if(rawStyle && rawStyle !== 'modern'){
        next.searchParams.set('style', rawStyle);
      }
      return next.href;
    },
  };
})();
