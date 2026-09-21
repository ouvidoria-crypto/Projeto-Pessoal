/**
 * TESTE-LOGO (experimento) — toca TESTE.mp4 sobre a logo do cabeçalho ao passar o mouse
 * e aplica zoom in. Só roda em dispositivos com mouse (hover) e sem "reduzir movimento".
 * COMO REMOVER: apague o bloco "TESTE-LOGO" do index.html e os arquivos
 * teste-logo.css e teste-logo.js.
 */
(() => {
  'use strict';

  const VIDEO_SRC = 'TESTE.mp4';
  const FADE_MS = 350; // deve cobrir a saída definida no CSS (0.3s)
  // Instante do vídeo cujo quadro é praticamente idêntico à logo estática (OP.png):
  // a troca logo -> vídeo fica imperceptível.
  const START_S = 0.29;

  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!canHover || reducedMotion) return;

  const init = () => {
    const wrap = document.querySelector('.topo .logo-wrap');
    const logo = wrap?.querySelector('.logo');
    if (!wrap || !logo) return;

    // Filtro SVG: usa o brilho de cada pixel como opacidade. Fundo preto (0) => transparente;
    // esfera azul/faixa/estrelas => totalmente opacos. As cores do vídeo não são alteradas.
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
    svg.innerHTML =
      '<filter id="teste-logo-key" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%">' +
      '<feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  14.2 14.2 14.2 0 -0.667"/>' +
      '</filter>';
    document.body.appendChild(svg);

    const video = document.createElement('video');
    video.className = 'teste-logo-video';
    video.src = VIDEO_SRC;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.tabIndex = -1;
    video.setAttribute('aria-hidden', 'true');
    wrap.appendChild(video); // dentro do .logo-wrap: mesma camada e mesma posição da logo

    let active = false;
    let resetTimer = 0;

    // Deixa o vídeo parado no quadro que combina com a logo estática.
    const rewind = () => { try { video.currentTime = START_S; } catch (e) { /* ignora */ } };
    video.addEventListener('loadeddata', rewind, { once: true });

    // Cobre exatamente a área da imagem estática (posição relativa ao .logo-wrap).
    const place = () => {
      video.style.left = `${logo.offsetLeft}px`;
      video.style.top = `${logo.offsetTop}px`;
      video.style.width = `${logo.offsetWidth}px`;
      video.style.height = `${logo.offsetHeight}px`;
    };

    const activate = () => {
      // Só troca a logo pelo vídeo quando ele já tem um quadro pronto (sem "piscar").
      if (active || video.readyState < 2 || video.seeking) return;
      active = true;
      window.clearTimeout(resetTimer);
      place();
      video.play().catch(() => {});
      wrap.classList.add('teste-logo-zoom', 'teste-logo-video-on');
      video.classList.add('is-on');
    };

    const deactivate = () => {
      if (!active) return;
      active = false;
      wrap.classList.remove('teste-logo-zoom', 'teste-logo-video-on');
      video.classList.remove('is-on');
      // Depois que o vídeo some: pausa e volta ao quadro que combina com a logo estática.
      resetTimer = window.setTimeout(() => {
        if (active) return;
        video.pause();
        rewind();
      }, FADE_MS);
    };

    wrap.addEventListener('pointerenter', activate);
    wrap.addEventListener('pointerleave', deactivate);
    window.addEventListener('resize', () => { if (active) place(); });
  };

  // Espera a página carregar para não competir com a intro e as imagens.
  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init, { once: true });
  }
})();
