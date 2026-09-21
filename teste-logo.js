/**
 * TESTE-LOGO (experimento) — toca TESTE.mp4 sobre a logo do cabeçalho:
 *   1) ao passar o mouse (em loop, com zoom in);
 *   2) uma vez, sozinho, logo após a intro (Fase 2 -> Home), até o vídeo acabar.
 * Só roda em dispositivos com mouse (hover) e sem "reduzir movimento".
 * COMO REMOVER: apague o bloco "TESTE-LOGO" do index.html e os arquivos
 * teste-logo.css e teste-logo.js.
 */
(() => {
  'use strict';

  const VIDEO_SRC = 'TESTE.mp4';
  const FADE_MS = 350;            // deve cobrir a saída definida no CSS (0.3s)
  const START_S = 0.29;           // quadro do vídeo praticamente idêntico à logo estática (OP.png)
  const AUTOPLAY_APOS_INTRO = true; // toca sozinho ao liberar a Home
  const AUTOPLAY_COM_ZOOM = true;   // false = a animação automática toca sem o zoom in
  const AUTOPLAY_ESPERA_MAX_MS = 1500; // se o vídeo não estiver pronto até aqui, pula o autoplay

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
    let autoplaying = false;
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

    const isReady = () => video.readyState >= 2 && !video.seeking;

    // Troca a logo estática pelo vídeo. auto = true: toca uma vez (sem loop).
    const activate = ({ auto = false, zoom = true } = {}) => {
      // Só troca quando o vídeo já tem um quadro pronto (sem "piscar").
      if (active || !isReady()) return false;
      active = true;
      autoplaying = auto;
      window.clearTimeout(resetTimer);
      place();
      video.loop = !auto;
      video.play().catch(() => {});
      wrap.classList.add('teste-logo-video-on');
      if (zoom) wrap.classList.add('teste-logo-zoom');
      video.classList.add('is-on');
      return true;
    };

    const deactivate = () => {
      if (!active) return;
      active = false;
      autoplaying = false;
      wrap.classList.remove('teste-logo-zoom', 'teste-logo-video-on');
      video.classList.remove('is-on');
      // Depois que o vídeo some: pausa e volta ao quadro que combina com a logo estática.
      resetTimer = window.setTimeout(() => {
        if (active) return;
        video.pause();
        rewind();
        video.loop = true;
      }, FADE_MS);
    };

    // Fim da animação automática: volta à logo estática (ou continua em loop se o mouse estiver em cima).
    video.addEventListener('ended', () => {
      if (!autoplaying) return;
      autoplaying = false;
      if (wrap.matches(':hover')) {
        video.loop = true;
        rewind();
        video.play().catch(() => {});
      } else {
        deactivate();
      }
    });

    // Hover: durante o autoplay, sair com o mouse não interrompe a animação.
    wrap.addEventListener('pointerenter', () => activate());
    wrap.addEventListener('pointerleave', () => { if (!autoplaying) deactivate(); });
    window.addEventListener('resize', () => { if (active) place(); });

    // Autoplay: só quando a página abriu com a intro (Splash -> Fase 1 -> Fase 2 -> Home).
    // Em "entrada direta" (recarregar pela logo) a intro é pulada e o autoplay também.
    if (AUTOPLAY_APOS_INTRO && document.querySelector('.intro-overlay')) {
      const startAutoplay = () => {
        const begin = () => activate({ auto: true, zoom: AUTOPLAY_COM_ZOOM });
        if (begin()) return;
        // Vídeo ainda carregando: espera um pouco; se não ficar pronto, desiste.
        const t0 = performance.now();
        const wait = () => {
          if (begin() || performance.now() - t0 > AUTOPLAY_ESPERA_MAX_MS) return;
          window.requestAnimationFrame(wait);
        };
        window.requestAnimationFrame(wait);
      };

      const isReleased = () => document.body.classList.contains('pagina-inicial-liberada');
      if (isReleased()) {
        startAutoplay();
      } else {
        const observer = new MutationObserver(() => {
          if (!isReleased()) return;
          observer.disconnect();
          startAutoplay();
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      }
    }
  };

  // O vídeo começa a carregar já durante a intro, para estar pronto quando a Home for liberada.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
