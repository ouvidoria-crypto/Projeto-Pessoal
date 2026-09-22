/**
 * @file script.js
 * @description Módulo de Ciclo de Vida e Interações - Crepúsculo Esmeralda
 * Padrão: Módulo Auto-Contido (IIFE) com Máquina de Estados Finita e Desacoplamento de DOM
 * COMO PORTAR ESTE SITE: mantenha o overlay e seus elementos .intro-overlay,
 * .intro-overlay__stage, .intro-overlay__logo, .intro-overlay__text-box e
 * .intro-overlay__accordion; preserve .manifesto-box, as classes de estado,
 * as variáveis e regras CSS da intro, este script e os assets referenciados.
 * A nova plataforma também precisa preservar document.body/documentElement,
 * sessionStorage, requestAnimationFrame e o evento DOMContentLoaded.
 * Sequência: Splash/Logo -> Fase 1/Prefácio -> Fase 2/Accordion ->
 * Transição/Fade-out e liberação da Home.
 */
(() => {
  'use strict';

  // =========================================================================
  // 1. CONFIGURAÇÕES E CONSTANTES IMUTÁVEIS
  // =========================================================================
  const CONFIG = Object.freeze({
    STORAGE_KEY: 'crepusculo-entrada-direta',
    STORAGE_TTL_MS: 4000,
    SCROLL_TRANSITION_THRESHOLD: 120,
    INTRO_TIMINGS: Object.freeze({
      SPLASH_MS: 900,
      PREFACE_MS: 1700,
      ACCORDION_MS: 1800,
      RESOLUTION_MS: 700,
      LOGO_REFRESH_DURATION_MS: 600
    }),
    THEME_COLORS: Object.freeze({
      PHASE_1: '#0f1f2f',
      PHASE_2: '#0b0b0d',
      NORMAL: '#0f1f2f'
    })
  });

  // =========================================================================
  // 2. MÁQUINA DE ESTADOS DO PREFÁCIO & SESSÃO (Isolada)
  // =========================================================================
  const LifecycleManager = (() => {
    let state = 'INITIALIZING';

    // Temporização assíncrona que dispara a próxima fase sem alterar o DOM por si só.
    const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));

    const isDirectEntryValid = () => {
      try {
        const raw = sessionStorage.getItem(CONFIG.STORAGE_KEY);
        sessionStorage.removeItem(CONFIG.STORAGE_KEY);
        if (!raw) return false;
        const diff = Date.now() - Number(raw);
        return !Number.isNaN(diff) && diff >= 0 && diff < CONFIG.STORAGE_TTL_MS;
      } catch {
        return false;
      }
    };

    const markDirectEntryForNextReload = () => {
      try {
        sessionStorage.setItem(CONFIG.STORAGE_KEY, String(Date.now()));
      } catch (err) {
        // Ignora storage desabilitado
      }
    };

    return {
      getState: () => state,
      setState: (newState) => { state = newState; },
      wait,
      isDirectEntryValid,
      markDirectEntryForNextReload
    };
  })();

  // =========================================================================
  // 3. CAMADA DE ACESSO AO DOM (Cache seguro de referências)
  // =========================================================================
  const DOM = {
    root: document.documentElement,
    body: document.body,
    metaTheme: document.querySelector('meta[name="theme-color"]'),
    introOverlay: document.querySelector('.intro-overlay'),
    introLoadingBar: null,
    introTextBox: document.querySelector('.intro-overlay__text-box'),
    introAccordion: document.querySelector('.intro-overlay__accordion'),
    topo: document.querySelector('.topo'),
    logoWrap: document.querySelector('.logo-wrap'),
    homeLoadingBar: document.querySelector('.home-loading-bar span'),
    readingProgress: document.querySelector('.reading-progress'),
    prefaceBox: document.querySelector('.manifesto-box'),
    prefaceProgress: document.querySelector('.prefacio-progress'),
    menuToggle: document.querySelector('.menu-toggle'),
    sidebar: document.querySelector('.sidebar'),
    sidebarBackdrop: document.querySelector('.sidebar-backdrop'),
    sidebarClose: document.querySelector('.sidebar-fechar'),
    sidebarModes: document.querySelectorAll('.sidebar-modo'),
    // Regiões da página que ficam inertes (sem foco/clique) enquanto a sidebar modal está aberta.
    pageRegions: document.querySelectorAll('.topo, main'),
    sidebarAccount: document.querySelector('.sidebar-conta'),
    accountStatus: document.querySelector('.sidebar-status'),
    accountForm: document.querySelector('.conta-form'),
    accountFormTitle: document.querySelector('.conta-form-titulo'),
    accountNameField: document.querySelector('.conta-nome-campo'),
    accountSubmit: document.querySelector('.conta-form-submit'),
    audioTheme: document.getElementById('tema-audio'),
    revealElements: document.querySelectorAll('.reveal'),
    // AJUSTE 2: o prefácio não participa das interações de toque; seu tamanho e estado são fixos.
    interactiveElements: document.querySelectorAll('.box-int, .bloco, .bloco-1v, .bloco-2v')
  };

  // =========================================================================
  // 4. CONTROLADOR VISUAL & METATAGS
  // =========================================================================
  const ViewController = {
    // Barra de transição: injeta uma única barra no overlay e reinicia o preenchimento por fase.
    createIntroLoadingBar(duration) {
      if (!DOM.introOverlay) return null;

      DOM.introLoadingBar?.remove();
      const loadingBar = document.createElement('div');
      loadingBar.className = 'intro-loading-bar';
      loadingBar.setAttribute('aria-hidden', 'true');
      loadingBar.style.setProperty('--intro-loading-duration', `${duration}ms`);
      DOM.introOverlay.append(loadingBar);
      DOM.introLoadingBar = loadingBar;
      return loadingBar;
    },

    startIntroLoadingBar(duration) {
      const loadingBar = this.createIntroLoadingBar(duration);
      if (!loadingBar) return;

      // AJUSTE: a leitura separa width: 0 de width: 100% sem depender de requestAnimationFrame.
      void loadingBar.offsetWidth;
      loadingBar.classList.add('is-filling');
    },

    // Alinhamento: copia as coordenadas e a altura finais do manifesto real para o overlay.
    syncIntroToHome() {
      if (!DOM.prefaceBox || !DOM.introTextBox) return;

      const homeRect = DOM.prefaceBox.getBoundingClientRect();

      DOM.introTextBox.style.setProperty('--preface-overlay-top', `${homeRect.top}px`);
      DOM.introTextBox.style.setProperty('--preface-overlay-left', `${homeRect.left}px`);
      DOM.introTextBox.style.setProperty('--preface-width', `${homeRect.width}px`);
      DOM.introTextBox.style.setProperty('--preface-final-height', `${homeRect.height}px`);

      // AJUSTE C: aplica a largura real do manifesto aos boxes-alvo, sem alterar os três blocos de ação.
      document.querySelectorAll('.box-int, .bloco-1v, .bloco-2v').forEach((box) => {
        box.style.setProperty('--home-box-width-px', `${homeRect.width}px`);
      });

      // AJUSTE 3: calcula o deslocamento da Fase 1 a partir da altura natural da accordion.
      const accordionHeight = DOM.prefaceBox.querySelector('.prefacio-cascata')?.getBoundingClientRect().height || 0;
      DOM.introTextBox.style.setProperty('--preface-phase2-shift', `${(accordionHeight / 2).toFixed(3)}px`);

      // AJUSTE 4: alinha a borda visual das barras do hambúrguer à borda do prefácio.
      if (DOM.menuToggle) {
        const visualBarInset = window.innerWidth <= 768 ? 7 : 9;
        DOM.menuToggle.style.left = `${homeRect.left - visualBarInset}px`;

        // AJUSTE 4: mede border/padding reais para alinhar a barra visível, não a caixa do botão.
        const firstBar = DOM.menuToggle.querySelector('span');
        if (firstBar) {
          const menuRect = DOM.menuToggle.getBoundingClientRect();
          const barRect = firstBar.getBoundingClientRect();
          DOM.menuToggle.style.left = `${homeRect.left - (barRect.left - menuRect.left) - 1}px`;
        }
      }
    },

    setThemeColor(color) {
      if (DOM.metaTheme) DOM.metaTheme.setAttribute('content', color);
    },

    executeDirectEntry() {
      // Entrada direta: pula a animação e libera a Home imediatamente.
      LifecycleManager.setState('DIRECT');
      this.finishIntro();
    },

    async startIntroSequence() {
      // ===== ESTADO INICIAL: Splash / Logo =====
      // Adiciona intro-is-active; o CSS correspondente bloqueia o scroll do documento.
      if (!DOM.introOverlay) return;
      const timings = CONFIG.INTRO_TIMINGS;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const duration = (value) => reducedMotion ? 0 : value;

      DOM.body.classList.add('intro-is-active');
      DOM.root.classList.add('intro-is-active');
      this.syncIntroToHome();
      DOM.introOverlay.dataset.introState = 'splash';
      LifecycleManager.setState('SPLASH');
      await LifecycleManager.wait(duration(timings.SPLASH_MS));

      // ===== FASE 1: Prefácio (texto inicial) =====
      // A troca de estado faz a logo desaparecer e revela o texto já alinhado à Home.
      LifecycleManager.setState('PREFACE');
      DOM.introOverlay.dataset.introState = 'preface';
      this.startIntroLoadingBar(duration(timings.PREFACE_MS));
      await LifecycleManager.wait(duration(timings.PREFACE_MS));

      // ===== FASE 2: Prefácio (accordion) =====
      // O CSS muda a grade de 0fr para 1fr e revela a frase complementar abaixo do texto.
      LifecycleManager.setState('ACCORDION');
      DOM.introOverlay.dataset.introState = 'accordion';
      DOM.introLoadingBar?.classList.add('is-complete');
      DOM.body.classList.add('intro-phase-2');
      DOM.root.classList.add('intro-phase-2');
      DOM.introAccordion?.setAttribute('aria-hidden', 'false');
      await LifecycleManager.wait(duration(timings.ACCORDION_MS));

      // ===== TRANSIÇÃO: Fade-out e liberação da Home =====
      // A classe de saída congela o manifesto; a opacity do overlay é então reduzida pelo CSS.
      LifecycleManager.setState('RESOLVING');
      DOM.prefaceBox?.classList.add('prefacio-em-saida');
      DOM.introOverlay.dataset.introState = 'resolving';
      await LifecycleManager.wait(duration(timings.RESOLUTION_MS));
      this.finishIntro();
    },

    finishIntro() {
      // Libera o scroll removendo intro-is-active, fixa o estado final da Home e destrói o overlay.
      LifecycleManager.setState('RELEASED');
      // AJUSTE 4: também sincroniza a entrada direta acionada pelo recarregamento da logo.
      this.syncIntroToHome();
      DOM.body.classList.remove('intro-is-active');
      DOM.root.classList.remove('intro-is-active', 'intro-phase-2', 'prefacio-home-final');
      DOM.body.classList.remove('intro-phase-2', 'prefacio-home-final');
      DOM.body.classList.add('pagina-inicial-liberada');
      DOM.root.classList.add('pagina-inicial-liberada');
      DOM.prefaceBox?.classList.add('prefacio-home-final');
      DOM.readingProgress?.classList.add('is-visible');
      this.setThemeColor(CONFIG.THEME_COLORS.NORMAL);
      DOM.introOverlay?.remove();
      ScrollController.update();
    }
  };

  // =========================================================================
  // 5. CONTROLADOR DE SCROLL & LEITURA (Performático via rAF)
  // =========================================================================
  const ScrollController = (() => {
    let isTicking = false;
    let lastScrollY = -1;

    const getScrollTop = () => (document.scrollingElement || DOM.root).scrollTop;

    const updateMetrics = (currentScroll = getScrollTop(), previousScrollY = lastScrollY) => {
      const isBlocked = DOM.body.classList.contains('prefacio-em-foco') ||
                        DOM.body.classList.contains('prefacio-em-saida') ||
                        DOM.body.classList.contains('home-carregando');

      if (isBlocked) {
        if (DOM.topo) {
          DOM.topo.style.setProperty('--topo-progresso', '0');
          DOM.topo.style.setProperty('--reading-progresso', '0');
          DOM.topo.classList.remove('is-scrolled');
        }
        if (DOM.readingProgress) {
          DOM.readingProgress.style.width = '0%';
          DOM.readingProgress.classList.remove('is-visible');
        }
        DOM.body.classList.remove('page-end-fade-hidden');
        return;
      }

      // Fim da página: oculta o degradê quando o usuário está no rodapé e continua descendo.
      const scrollEl = document.scrollingElement || DOM.root;
      const maxScroll = Math.max(scrollEl.scrollHeight - scrollEl.clientHeight, 0);
      const isNearBottom = maxScroll > 0 && currentScroll >= maxScroll - 32;
      const isScrollingDown = currentScroll > previousScrollY;
      DOM.body.classList.toggle('page-end-fade-hidden', isNearBottom && isScrollingDown);

      // Topo progress
      if (DOM.topo) {
        const topRatio = Math.min(currentScroll / CONFIG.SCROLL_TRANSITION_THRESHOLD, 1);
        DOM.topo.style.setProperty('--topo-progresso', topRatio.toFixed(3));
        DOM.topo.classList.toggle('is-scrolled', topRatio > 0.5);
      }

      // Reading progress bar
      if (DOM.readingProgress) {
        const totalHeight = scrollEl.scrollHeight - scrollEl.clientHeight;
        const readingRatio = totalHeight > 0 ? Math.min(currentScroll / totalHeight, 1) : 0;
        DOM.readingProgress.style.width = `${(readingRatio * 100).toFixed(2)}%`;
        DOM.readingProgress.classList.add('is-visible');
        DOM.topo?.style.setProperty('--reading-progresso', readingRatio.toFixed(3));
      }
    };

    const onScroll = () => {
      const previousScrollY = lastScrollY;
      const scrollY = window.scrollY || DOM.root.scrollTop || 0;
      if (scrollY === lastScrollY) return;
      lastScrollY = scrollY;

      if (!isTicking) {
        window.requestAnimationFrame(() => {
          updateMetrics(scrollY, previousScrollY);
          isTicking = false;
        });
        isTicking = true;
      }
    };

    return {
      init: () => window.addEventListener('scroll', onScroll, { passive: true }),
      update: () => window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => updateMetrics(getScrollTop(), lastScrollY));
      })
    };
  })();

  // =========================================================================
  // 6. CONTROLADOR DA SIDEBAR & ACESSIBILIDADE (Inert & Focus Trap)
  // =========================================================================
  const SidebarController = {
    init() {
      if (!DOM.menuToggle || !DOM.sidebar || !DOM.sidebarBackdrop) return;

      // AJUSTE A: aquece a sidebar fora do clique para reduzir o custo da primeira abertura.
      const warmSidebar = () => {
        DOM.sidebar.classList.add('sidebar-aquecida');
        DOM.sidebar.querySelectorAll('img').forEach((image) => image.decode?.().catch(() => {}));
        document.fonts?.load('400 17px Oswald');
      };

      const scheduleWarmup = () => {
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(warmSidebar, { timeout: 500 });
        } else {
          window.setTimeout(warmSidebar, 0);
        }
      };

      DOM.menuToggle.addEventListener('pointerenter', warmSidebar, { once: true });
      DOM.menuToggle.addEventListener('touchstart', warmSidebar, { once: true, passive: true });
      DOM.menuToggle.addEventListener('focus', warmSidebar, { once: true });
      scheduleWarmup();

      DOM.menuToggle.addEventListener('click', () => {
        const isCurrentlyOpen = DOM.menuToggle.getAttribute('aria-expanded') === 'true';
        this.toggle(!isCurrentlyOpen);
      });

      DOM.sidebarClose?.addEventListener('click', () => this.toggle(false));
      DOM.sidebarBackdrop.addEventListener('click', () => this.toggle(false));

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && DOM.menuToggle.getAttribute('aria-expanded') === 'true') {
          this.toggle(false);
        }
      });

      this.initModes();
      this.initAccountActions();
    },

    toggle(open) {
      // AJUSTE A: will-change fica ativo somente durante a transição da sidebar.
      DOM.sidebar.classList.add('sidebar-animando');
      DOM.menuToggle.setAttribute('aria-expanded', String(open));
      DOM.sidebar.setAttribute('aria-hidden', String(!open));

      // Focus trap: com a sidebar aberta, o resto da página fica inert e o Tab não escapa dela.
      if (open) {
        DOM.sidebar.removeAttribute('inert');
        DOM.pageRegions.forEach((region) => region.setAttribute('inert', ''));
        DOM.sidebarClose?.focus();
      } else {
        DOM.sidebar.setAttribute('inert', '');
        DOM.pageRegions.forEach((region) => region.removeAttribute('inert'));
        DOM.menuToggle.focus();
      }

      DOM.sidebar.classList.toggle('is-open', open);
      DOM.sidebarBackdrop.hidden = !open;
      DOM.root.classList.toggle('sidebar-aberta', open);
      DOM.body.classList.toggle('sidebar-aberta', open);
      window.setTimeout(() => DOM.sidebar.classList.remove('sidebar-animando'), open ? 340 : 280);
    },

    initModes() {
      DOM.sidebarModes.forEach((modeBtn) => {
        modeBtn.addEventListener('click', (e) => {
          const isComingSoon = modeBtn.hasAttribute('data-em-breve');

          if (isComingSoon) {
            // Seção ainda indisponível: não marca como ativa e mantém a sidebar aberta,
            // para o aviso (anunciado por aria-live) não desaparecer junto com o menu.
            e.preventDefault();
            if (DOM.accountStatus) {
              DOM.accountStatus.textContent = `${modeBtn.dataset.sidebarMode} estará disponível em breve.`;
            }
            return;
          }

          DOM.sidebarModes.forEach((btn) => btn.classList.remove('is-active'));
          modeBtn.classList.add('is-active');
          this.toggle(false);
        });
      });
    },

    initAccountActions() {
      document.querySelectorAll('[data-conta-acao]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const action = btn.dataset.contaAcao;
          if (action === 'google') {
            if (DOM.accountStatus) {
              DOM.accountStatus.textContent = 'A entrada com Google será conectada ao provedor de autenticação.';
            }
            return;
          }

          if (!DOM.accountForm || !DOM.accountFormTitle || !DOM.accountSubmit || !DOM.sidebarAccount) return;
          const isRegister = action === 'cadastrar';

          DOM.sidebarAccount.classList.add('is-expandida');
          DOM.accountForm.hidden = false;
          DOM.accountFormTitle.textContent = isRegister ? 'Criar conta' : 'Entrar';
          DOM.accountSubmit.textContent = isRegister ? 'Criar conta' : 'Continuar';
          if (DOM.accountNameField) DOM.accountNameField.hidden = !isRegister;

          const passInput = DOM.accountForm.querySelector('input[name="senha"]');
          if (passInput) passInput.autocomplete = isRegister ? 'new-password' : 'current-password';

          window.requestAnimationFrame(() => {
            DOM.sidebar.scrollTo({ top: DOM.sidebar.scrollHeight, behavior: 'smooth' });
            const firstInteractive = DOM.accountForm.querySelector('input:not([type="hidden"]), button');
            firstInteractive?.focus();
          });
        });
      });

      DOM.accountForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (DOM.accountStatus) {
          DOM.accountStatus.textContent = 'Formulário pronto para conectar ao sistema de autenticação.';
        }
      });
    }
  };

  // =========================================================================
  // 7. CONTROLADOR DE RECARGA PELA LOGO (Zero-Crash & Animação Suave)
  // =========================================================================
  const RefreshController = {
    init() {
      DOM.logoWrap?.addEventListener('click', (e) => {
        e.preventDefault();
        this.execute();
      });
    },

    execute() {
      if (!DOM.homeLoadingBar) return;

      LifecycleManager.markDirectEntryForNextReload();
      ViewController.executeDirectEntry();

      DOM.body.classList.add('home-carregando');
      DOM.readingProgress?.style.setProperty('width', '0%');
      DOM.readingProgress?.classList.remove('is-visible');
      DOM.topo?.style.setProperty('--reading-progresso', '0');
      DOM.homeLoadingBar.style.width = '0%';

      const startTime = performance.now();
      const duration = CONFIG.INTRO_TIMINGS.LOGO_REFRESH_DURATION_MS;

      const step = (now) => {
        const progress = Math.min((now - startTime) / duration, 1);
        DOM.homeLoadingBar.style.width = `${progress * 100}%`;
        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          window.location.reload();
        }
      };

      window.requestAnimationFrame(step);
    }
  };

  // =========================================================================
  // 8. OBSERVER DE ELEMENTOS REVEAL & ÁUDIO
  // =========================================================================
  const InteractionController = {
    init() {
      this.initReveal();
      this.initTouchInteractions();
      this.initAudioTrigger();
    },

    initReveal() {
      if ('IntersectionObserver' in window) {
        DOM.revealElements.forEach((el, index) => {
          const delay = window.innerWidth <= 480 ? 18 : 28;
          el.style.transitionDelay = `${index * delay}ms`;
        });

        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
            }
          });
        }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });

        DOM.revealElements.forEach((el) => observer.observe(el));
      } else {
        DOM.revealElements.forEach((el) => el.classList.add('is-visible'));
      }
    },

    initTouchInteractions() {
      if (!window.matchMedia('(hover: none)').matches) return;

      DOM.interactiveElements.forEach((el) => {
        el.addEventListener('click', () => {
          DOM.interactiveElements.forEach((item) => {
            if (item !== el) item.classList.remove('is-touch-active');
          });
          el.classList.toggle('is-touch-active');
        });
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('.manifesto-box, .box-int, .bloco, .bloco-1v, .bloco-2v')) {
          DOM.interactiveElements.forEach((el) => el.classList.remove('is-touch-active'));
        }
      });
    },

    initAudioTrigger() {
      const playAudioOnce = () => {
        if (!DOM.audioTheme || DOM.audioTheme.dataset.iniciado === 'true') return;
        DOM.audioTheme.dataset.iniciado = 'true';
        DOM.audioTheme.volume = 0.5;
        DOM.audioTheme.play().catch(() => {});
      };

      document.addEventListener('pointerdown', playAudioOnce, { once: true });
      document.addEventListener('keydown', playAudioOnce, { once: true });
    }
  };

  // =========================================================================
  // 9. BOOTSTRAP DETERMINÍSTICO DO SISTEMA
  // =========================================================================
  const initApp = () => {
    DOM.root.classList.add('reveal-ready');
    history.scrollRestoration = 'manual';

    ScrollController.init();
    SidebarController.init();
    RefreshController.init();
    InteractionController.init();

    if (LifecycleManager.isDirectEntryValid()) {
      ViewController.executeDirectEntry();
    } else {
      ViewController.startIntroSequence();
    }

    window.addEventListener('load', () => ScrollController.update());
    window.addEventListener('pageshow', () => ScrollController.update());
    // AJUSTE 4: recalcula somente o alinhamento horizontal quando a viewport muda.
    window.addEventListener('resize', () => ViewController.syncIntroToHome());
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
