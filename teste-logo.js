/**
 * TESTE-LOGO (experimento) — toca TESTE.mp4 sobre a logo do cabeçalho:
 *   1) ao passar o mouse (em loop, com zoom in e o título deslocando para o lado);
 *   2) uma vez, sozinho, logo após a intro (Fase 2 -> Home), até o vídeo acabar.
 * O título também desloca durante a animação automática pós-intro.
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
  const DESLOCA_FOLGA_EXTRA_PX = 4;     // respiro extra (além de manter a mesma distância de repouso) entre a logo ampliada e o título
  // Parte VISÍVEL da imagem OP.png (o resto é margem transparente): usada para alinhar o título à faixa/esfera, não à caixa da imagem. Direita medida em OP.png.
  const LOGO_VISIVEL_DIR = 0.897;
  const DESLOCA_MAX_PX = 160;           // teto de segurança para o deslocamento do título
  const AUTOPLAY_DESLOCA_TITULO = true;  // true = o título também desloca durante o autoplay (pós-intro, sem mouse)
  const DESLOCA_MARGEM_DIREITA_PX = 16; // folga mínima até a borda da tela (o deslocamento se limita a ela)

  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!canHover || reducedMotion) return;

  const init = () => {
    const wrap = document.querySelector('.topo .logo-wrap');
    const logo = wrap?.querySelector('.logo');
    const topo = document.querySelector('.topo');
    const titulo = topo?.querySelector('.titulo-principal');
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

    // Zoom real em uso: o zoom configurado menos a leve diminuída que acompanha a barra fixa ao rolar
    // (o CSS aplica o mesmo fator no .logo-wrap, usando --topo-progresso, que o script.js atualiza no scroll).
    const cssNum = (el, nome, padrao) => {
      const v = parseFloat(getComputedStyle(el).getPropertyValue(nome));
      return Number.isFinite(v) ? v : padrao;
    };
    const zoomEfetivo = () => {
      const zoom = cssNum(document.documentElement, '--teste-logo-zoom', 1);
      const encolhe = cssNum(document.documentElement, '--teste-logo-encolhe', 0);
      const progresso = topo ? cssNum(topo, '--topo-progresso', 0) : 0;
      return zoom * (1 - encolhe * progresso);
    };

    // Trigger do título: desloca para a direita exatamente o quanto a parte VISÍVEL da logo cresce,
    // preservando a mesma distância logo-título de repouso (+ um pequeno respiro), e nunca além da
    // borda da tela. Usa medidas de layout (offset*), que ignoram o transform já aplicado.
    // A ampliação cresce a partir do centro da imagem (ver --teste-logo-origem no CSS).
    const setDesloca = (on) => {
      if (!topo || !titulo) return;
      if (on) {
        const zoom = zoomEfetivo();
        const largura = logo.offsetWidth;
        const cresceDireita = largura * (LOGO_VISIVEL_DIR - 0.5) * (zoom - 1);
        const precisa = cresceDireita + DESLOCA_FOLGA_EXTRA_PX;
        const sobra = topo.clientWidth - (titulo.offsetLeft + titulo.offsetWidth) - DESLOCA_MARGEM_DIREITA_PX;
        const px = Math.max(0, Math.min(DESLOCA_MAX_PX, precisa, sobra));
        topo.style.setProperty('--teste-logo-desloca-px', `${Math.round(px)}px`);
      }
      topo.classList.toggle('teste-logo-desloca', on);
    };

    place(); // já deixa o vídeo (invisível) com o tamanho e a posição da logo

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
      if (!auto || AUTOPLAY_DESLOCA_TITULO) setDesloca(true);
      return true;
    };

    const deactivate = () => {
      if (!active) return;
      active = false;
      autoplaying = false;
      wrap.classList.remove('teste-logo-zoom', 'teste-logo-video-on');
      video.classList.remove('is-on');
      setDesloca(false);
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
        setDesloca(true);
        video.loop = true;
        rewind();
        video.play().catch(() => {});
      } else {
        deactivate();
      }
    });

    // Hover: durante o autoplay, sair com o mouse não interrompe a animação.
    wrap.addEventListener('pointerenter', () => {
      activate();
      if (active) setDesloca(true); // vale também se o mouse entrar durante o autoplay
    });
    wrap.addEventListener('pointerleave', () => {
      if (!autoplaying) {
        deactivate();
      } else if (!AUTOPLAY_DESLOCA_TITULO) {
        setDesloca(false); // o autoplay continua, só o título volta ao lugar
      }
    });
    // Ao rolar (barra fixa encolhendo/voltando), reajusta o deslocamento do título ao novo tamanho da logo.
    let scrollTick = false;
    let scrollTimer = 0;
    const reajustaDesloca = () => {
      if (active && topo?.classList.contains('teste-logo-desloca')) setDesloca(true);
    };
    window.addEventListener('scroll', () => {
      if (!active) return;
      if (!scrollTick) {
        scrollTick = true;
        window.requestAnimationFrame(() => { scrollTick = false; reajustaDesloca(); });
      }
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(reajustaDesloca, 150); // acerto final, depois da transição do título
    }, { passive: true });

    window.addEventListener('resize', () => {
      place();
      if (active && topo?.classList.contains('teste-logo-desloca')) setDesloca(true);
    });

    // Autoplay: começa assim que a Home estiver liberada, com ou sem a intro.
    if (AUTOPLAY_APOS_INTRO) {
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
