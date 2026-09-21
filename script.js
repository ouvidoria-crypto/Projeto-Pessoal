/**
 * @file script.js
 * @description Módulo de Ciclo de Vida e Interações - Crepúsculo Esmeralda
 * Padrão: Módulo Auto-Contido (IIFE) com Máquina de Estados Finita e Desacoplamento de DOM
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
    ANIMATION_DELAYS: Object.freeze({
      PREFACE_PROGRESS_START_MS: 2800,
      PREFACE_PHASE_2_MS: 4800,
      PREFACE_RELEASE_MS: 2000,
      PREFACE_TRANSITION_END_MS: 850,
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
    let state = 'INITIALIZING'; // 'SPLASH' | 'PHASE_1' | 'PHASE_2' | 'RELEASED' | 'DIRECT'
    let timers = [];

    const clearActiveTimers = () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers = [];
    };

    const addTimer = (fn, delay) => {
      const id = window.setTimeout(fn, delay);
      timers.push(id);
      return id;
    };

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
      addTimer,
      clearActiveTimers,
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
    splash: document.querySelector('.intro-splash'),
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
    sidebarAccount: document.querySelector('.sidebar-conta'),
    accountStatus: document.querySelector('.sidebar-status'),
    accountForm: document.querySelector('.conta-form'),
    accountFormTitle: document.querySelector('.conta-form-titulo'),
    accountNameField: document.querySelector('.conta-nome-campo'),
    accountSubmit: document.querySelector('.conta-form-submit'),
    audioTheme: document.getElementById('tema-audio'),
    revealElements: document.querySelectorAll('.reveal'),
    interactiveElements: document.querySelectorAll('.manifesto-box, .box-int, .bloco, .bloco-1v, .bloco-2v')
  };

  // =========================================================================
  // 4. CONTROLADOR VISUAL & METATAGS
  // =========================================================================
  const ViewController = {
    setThemeColor(color) {
      if (DOM.metaTheme) DOM.metaTheme.setAttribute('content', color);
    },

    executeDirectEntry() {
      LifecycleManager.setState('DIRECT');
      LifecycleManager.clearActiveTimers();

      DOM.root.classList.add('entrada-direta', 'pagina-inicial-liberada');
      DOM.body.classList.add('entrada-direta', 'pagina-inicial-liberada');
      DOM.body.classList.remove('prefacio-em-foco', 'prefacio-em-saida', 'prefacio-fase-2');
      DOM.root.classList.remove('prefacio-em-foco', 'prefacio-em-saida');

      DOM.splash?.remove();

      if (DOM.prefaceBox) {
        DOM.prefaceBox.classList.add('prefacio-ativo', 'prefacio-abertura-encerrada');
        DOM.prefaceBox.setAttribute('data-fase', '2');
        DOM.prefaceBox.dataset.locked = 'true';
        DOM.prefaceBox.style.animation = 'none';
        DOM.prefaceBox.style.opacity = '1';
        DOM.prefaceBox.style.transform = 'none';
        DOM.prefaceBox.style.visibility = 'visible';
        DOM.prefaceBox.style.display = '';
        DOM.prefaceBox.style.position = '';
        DOM.prefaceBox.style.inset = '';
      }

      DOM.readingProgress?.classList.add('is-visible');
      this.setThemeColor(CONFIG.THEME_COLORS.NORMAL);
      ScrollController.update();
    },

    startPrefaceSequence() {
      if (!DOM.prefaceBox) return;

      LifecycleManager.setState('PHASE_1');
      DOM.body.classList.add('prefacio-em-foco');
      DOM.root.classList.add('prefacio-em-foco');
      DOM.prefaceBox.setAttribute('data-fase', '1');

      if (DOM.prefaceProgress) {
        LifecycleManager.addTimer(() => {
          window.requestAnimationFrame(() => DOM.prefaceProgress.classList.add('is-running'));
        }, CONFIG.ANIMATION_DELAYS.PREFACE_PROGRESS_START_MS);
      }

      LifecycleManager.addTimer(() => {
        // Transição para Fase 2 (A REVOLTA)
        LifecycleManager.setState('PHASE_2');
        DOM.prefaceBox.classList.add('prefacio-ativo');
        DOM.body.classList.add('prefacio-fase-2');
        DOM.prefaceBox.setAttribute('data-fase', '2');
        DOM.prefaceBox.dataset.locked = 'true';
        this.setThemeColor(CONFIG.THEME_COLORS.PHASE_2);
        DOM.prefaceProgress?.classList.add('is-complete');

        // Transição para Liberação da Página
        LifecycleManager.addTimer(() => {
          this.releasePage();
        }, CONFIG.ANIMATION_DELAYS.PREFACE_RELEASE_MS);
      }, CONFIG.ANIMATION_DELAYS.PREFACE_PHASE_2_MS);
    },

    releasePage() {
      LifecycleManager.setState('RELEASED');
      DOM.prefaceBox?.classList.add('prefacio-abertura-encerrada');
      DOM.body.classList.add('prefacio-em-saida');
      DOM.root.classList.add('prefacio-em-saida');

      window.setTimeout(() => {
        DOM.body.classList.remove('prefacio-em-foco', 'prefacio-em-saida');
        DOM.root.classList.remove('prefacio-em-foco', 'prefacio-em-saida');
        DOM.body.classList.add('pagina-inicial-liberada');
        DOM.root.classList.add('pagina-inicial-liberada');

        if (DOM.prefaceBox) {
          DOM.prefaceBox.style.visibility = 'visible';
          DOM.prefaceBox.style.opacity = '1';
        }

        DOM.readingProgress?.classList.add('is-visible');
        ScrollController.update();
      }, CONFIG.ANIMATION_DELAYS.PREFACE_TRANSITION_END_MS);
    }
  };

  // =========================================================================
  // 5. CONTROLADOR DE SCROLL & LEITURA (Performático via rAF)
  // =========================================================================
  const ScrollController = (() => {
    let isTicking = false;
    let lastScrollY = -1;

    const getScrollTop = () => (document.scrollingElement || DOM.root).scrollTop;

    const updateMetrics = () => {
      const isBlocked = DOM.body.classList.contains('prefacio-em-foco') ||
                        DOM.body.classList.contains('prefacio-em-saida') ||
                        DOM.body.classList.contains('home-carregando');

      if (isBlocked) {
        if (DOM.topo) {
          DOM.topo.style.setProperty('--topo-progresso', '0');
          DOM.topo.classList.remove('is-scrolled');
        }
        if (DOM.readingProgress) {
          DOM.readingProgress.style.width = '0%';
          DOM.readingProgress.classList.remove('is-visible');
        }
        return;
      }

      const currentScroll = getScrollTop();

      // Topo progress
      if (DOM.topo) {
        const topRatio = Math.min(currentScroll / CONFIG.SCROLL_TRANSITION_THRESHOLD, 1);
        DOM.topo.style.setProperty('--topo-progresso', topRatio.toFixed(3));
        DOM.topo.classList.toggle('is-scrolled', topRatio > 0.5);
      }

      // Reading progress bar
      if (DOM.readingProgress) {
        const scrollEl = document.scrollingElement || DOM.root;
        const totalHeight = scrollEl.scrollHeight - scrollEl.clientHeight;
        const readingRatio = totalHeight > 0 ? Math.min(currentScroll / totalHeight, 1) : 0;
        DOM.readingProgress.style.width = `${(readingRatio * 100).toFixed(2)}%`;
        DOM.readingProgress.classList.add('is-visible');
      }
    };

    const onScroll = () => {
      const scrollY = window.scrollY || DOM.root.scrollTop || 0;
      if (scrollY === lastScrollY) return;
      lastScrollY = scrollY;

      if (!isTicking) {
        window.requestAnimationFrame(() => {
          updateMetrics();
          isTicking = false;
        });
        isTicking = true;
      }
    };

    return {
      init: () => window.addEventListener('scroll', onScroll, { passive: true }),
      update: () => window.requestAnimationFrame(updateMetrics)
    };
  })();

  // =========================================================================
  // 6. CONTROLADOR DA SIDEBAR & ACESSIBILIDADE (Inert & Focus Trap)
  // =========================================================================
  const SidebarController = {
    init() {
      if (!DOM.menuToggle || !DOM.sidebar || !DOM.sidebarBackdrop) return;

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
      DOM.menuToggle.setAttribute('aria-expanded', String(open));
      DOM.sidebar.setAttribute('aria-hidden', String(!open));

      if (open) {
        DOM.sidebar.removeAttribute('inert');
        DOM.sidebarClose?.focus();
      } else {
        DOM.sidebar.setAttribute('inert', '');
        DOM.menuToggle.focus();
      }

      DOM.sidebar.classList.toggle('is-open', open);
      DOM.sidebarBackdrop.hidden = !open;
      DOM.root.classList.toggle('sidebar-aberta', open);
      DOM.body.classList.toggle('sidebar-aberta', open);
    },

    initModes() {
      DOM.sidebarModes.forEach((modeBtn) => {
        modeBtn.addEventListener('click', (e) => {
          const targetHref = modeBtn.getAttribute('href');
          const isManifesto = targetHref === '#manifesto-titulo';

          DOM.sidebarModes.forEach((btn) => btn.classList.remove('is-active'));
          modeBtn.classList.add('is-active');

          if (!isManifesto) {
            e.preventDefault();
            if (DOM.accountStatus) {
              DOM.accountStatus.textContent = `${modeBtn.dataset.sidebarMode} estará disponível em breve.`;
            }
          }
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
      DOM.homeLoadingBar.style.width = '0%';

      const startTime = performance.now();
      const duration = CONFIG.ANIMATION_DELAYS.LOGO_REFRESH_DURATION_MS;

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
      ViewController.startPrefaceSequence();
    }

    window.addEventListener('load', () => ScrollController.update());
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
