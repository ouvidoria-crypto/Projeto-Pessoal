document.documentElement.classList.add('reveal-ready');

const CHAVE_ENTRADA_DIRETA = 'crepusculo-entrada-direta';
let entradaDireta = false;
try {
  entradaDireta = sessionStorage.getItem(CHAVE_ENTRADA_DIRETA) === 'true';
  if (entradaDireta) sessionStorage.removeItem(CHAVE_ENTRADA_DIRETA);
} catch {
  entradaDireta = false;
}

history.scrollRestoration = 'manual';

function ativarEntradaDiretaImediata() {
  entradaDireta = true;
  document.documentElement.classList.add('entrada-direta', 'pagina-inicial-liberada');
  document.body.classList.add('entrada-direta', 'pagina-inicial-liberada');
  document.body.classList.remove('prefacio-em-foco', 'prefacio-em-saida', 'prefacio-fase-2');
  document.documentElement.classList.remove('prefacio-em-foco', 'prefacio-em-saida');

  const splashInicial = document.querySelector('.intro-splash');
  splashInicial?.remove();

  if (prefacio) {
    prefacio.classList.remove('prefacio-ativo', 'prefacio-abertura-encerrada');
    prefacio.style.animation = 'none';
    prefacio.style.opacity = '1';
    prefacio.style.transform = 'none';
    prefacio.style.visibility = 'visible';
    prefacio.style.display = '';
    prefacio.style.position = '';
    prefacio.style.inset = '';
  }

  document.body.style.opacity = '1';
  document.body.style.visibility = 'visible';
  window.clearTimeout(temporizadorPrefacio);
  window.clearTimeout(temporizadorLiberacao);

  try {
    sessionStorage.setItem(CHAVE_ENTRADA_DIRETA, 'true');
  } catch {
    // Ignora falhas de armazenamento em navegadores restritivos.
  }
}

if (entradaDireta) {
  ativarEntradaDiretaImediata();
}

const topo = document.querySelector('.topo');
const logoWrap = document.querySelector('.logo-wrap');
const homeLoadingBar = document.querySelector('.home-loading-bar span');
const barraLeitura = document.querySelector('.reading-progress');
const barraPrefacio = document.querySelector('.prefacio-progress');
const menuToggle = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.sidebar');
const sidebarBackdrop = document.querySelector('.sidebar-backdrop');
const sidebarFechar = document.querySelector('.sidebar-fechar');
const sidebarModos = document.querySelectorAll('.sidebar-modo');
const contaStatus = document.querySelector('.sidebar-status');
const sidebarConta = document.querySelector('.sidebar-conta');
const contaForm = document.querySelector('.conta-form');
const contaFormTitulo = document.querySelector('.conta-form-titulo');
const contaNomeCampo = document.querySelector('.conta-nome-campo');
const contaFormSubmit = document.querySelector('.conta-form-submit');
const metaCorTema = document.querySelector('meta[name="theme-color"]');
const prefacio = document.querySelector('.manifesto-box');
const elementosRevelar = document.querySelectorAll('.reveal');
const elementosInterativos = document.querySelectorAll('.manifesto-box, .box-int, .bloco, .bloco-1v, .bloco-2v');
const audioTema = document.getElementById('tema-audio');
let ticking = false;
let ultimoScrollY = -1;
let temporizadorPrefacio;
let temporizadorLiberacao;
let aberturaEncerrada = false;
let isRefreshing = false;
let quadroCarregamentoInicio;
let homeCarregamentoAtivo = false;
const DISTANCIA_TRANSICAO = 120;

function atualizarCorTema(cor) {
  if (metaCorTema) metaCorTema.setAttribute('content', cor);
}

function iniciarAudioTema() {
  if (!audioTema || audioTema.dataset.iniciado === 'true') return;
  audioTema.dataset.iniciado = 'true';
  audioTema.volume = 0.5;
  audioTema.play().catch(() => {});
}

document.addEventListener('pointerdown', iniciarAudioTema, { once: true });
document.addEventListener('touchstart', iniciarAudioTema, { once: true });
document.addEventListener('keydown', iniciarAudioTema, { once: true });
window.addEventListener('scroll', iniciarAudioTema, { once: true, passive: true });

if (prefacio && !entradaDireta) {
  document.body.classList.add('prefacio-em-foco');
  document.documentElement.classList.add('prefacio-em-foco');
  prefacio.setAttribute('data-fase', '1');
} else if (entradaDireta) {
  aberturaEncerrada = true;
  document.body.classList.add('pagina-inicial-liberada');
  document.documentElement.classList.add('pagina-inicial-liberada');
  document.body.classList.remove('prefacio-em-foco', 'prefacio-em-saida', 'prefacio-fase-2');
  document.documentElement.classList.remove('prefacio-em-foco', 'prefacio-em-saida');
  if (prefacio) {
    prefacio.classList.remove('prefacio-ativo', 'prefacio-abertura-encerrada');
    prefacio.style.animation = 'none';
    prefacio.style.opacity = '0';
    prefacio.style.transform = 'none';
    prefacio.style.visibility = 'hidden';
    prefacio.style.display = 'none';
  }
  atualizarCorTema('#0f1f2f');
} else {
  document.body.classList.remove('prefacio-em-foco', 'prefacio-em-saida');
  document.documentElement.classList.remove('prefacio-em-foco', 'prefacio-em-saida');
  atualizarCorTema('#0f1f2f');
}

if (barraPrefacio && !entradaDireta) {
  window.setTimeout(() => {
    window.requestAnimationFrame(() => barraPrefacio.classList.add('is-running'));
  }, 2800);
}

function alternarSidebar(aberta) {
  if (!menuToggle || !sidebar || !sidebarBackdrop) return;
  menuToggle.setAttribute('aria-expanded', String(aberta));
  sidebar.setAttribute('aria-hidden', String(!aberta));
  sidebar.classList.toggle('is-open', aberta);
  sidebarBackdrop.hidden = !aberta;
  document.documentElement.classList.toggle('sidebar-aberta', aberta);
  document.body.classList.toggle('sidebar-aberta', aberta);
}

if (menuToggle && sidebar && sidebarBackdrop) {
  menuToggle.addEventListener('click', () => {
    const aberta = menuToggle.getAttribute('aria-expanded') === 'true';
    alternarSidebar(!aberta);
  });
  sidebarFechar?.addEventListener('click', () => alternarSidebar(false));
  sidebarBackdrop.addEventListener('click', () => alternarSidebar(false));
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') alternarSidebar(false);
  });
}

sidebarModos.forEach((modo) => {
  modo.addEventListener('click', (evento) => {
    const destino = modo.getAttribute('href');
    const manifesto = destino === '#manifesto-titulo';
    sidebarModos.forEach((item) => item.classList.remove('is-active'));
    modo.classList.add('is-active');
    if (!manifesto) {
      evento.preventDefault();
      if (contaStatus) contaStatus.textContent = `${modo.dataset.sidebarMode} estará disponível em breve.`;
    }
    alternarSidebar(false);
  });
});

document.querySelectorAll('[data-conta-acao]').forEach((botao) => {
  botao.addEventListener('click', () => {
    const acao = botao.dataset.contaAcao;
    if (acao === 'google') {
      if (contaStatus) contaStatus.textContent = 'A entrada com Google será conectada ao provedor de autenticação.';
      return;
    }

    if (!contaForm || !contaFormTitulo || !contaFormSubmit || !sidebarConta || !sidebar) return;
    const cadastro = acao === 'cadastrar';
    sidebarConta.classList.add('is-expandida');
    contaForm.hidden = false;
    contaFormTitulo.textContent = cadastro ? 'Criar conta' : 'Entrar';
    contaFormSubmit.textContent = cadastro ? 'Criar conta' : 'Continuar';
    if (contaNomeCampo) contaNomeCampo.hidden = !cadastro;
    const campoSenha = contaForm.querySelector('input[name="senha"]');
    if (campoSenha) campoSenha.autocomplete = cadastro ? 'new-password' : 'current-password';

    window.requestAnimationFrame(() => {
      sidebar.scrollTo({ top: sidebar.scrollHeight, behavior: 'smooth' });
      const alvo = contaForm.querySelector('input:not([type="hidden"]), button, label') || contaForm;
      alvo.focus?.();
    });
  });
});

contaForm?.addEventListener('submit', (evento) => {
  evento.preventDefault();
  if (contaStatus) contaStatus.textContent = 'Formulário pronto para conectar ao sistema de contas.';
});

function iniciarRefreshHome() {
  if (isRefreshing || !homeLoadingBar) return;

  ativarEntradaDiretaImediata();
  isRefreshing = true;
  homeCarregamentoAtivo = true;
  document.body.classList.add('home-carregando');
  barraLeitura?.style.setProperty('width', '0%');
  barraLeitura?.classList.remove('is-visible');
  homeLoadingBar.style.width = '0%';
  window.removeEventListener('scroll', onScroll, { passive: true });

  try {
    sessionStorage.setItem(CHAVE_ENTRADA_DIRETA, 'true');
  } catch {
    // Ignora falhas de armazenamento em navegadores restritivos.
  }

  const inicio = performance.now();
  const duracao = 850;
  const atualizarCarregamento = (agora) => {
    const progresso = Math.min((agora - inicio) / duracao, 1);
    homeLoadingBar.style.width = `${progresso * 100}%`;
    if (progresso < 1) {
      quadroCarregamentoInicio = window.requestAnimationFrame(atualizarCarregamento);
      return;
    }
    window.location.reload();
  };

  quadroCarregamentoInicio = window.requestAnimationFrame(atualizarCarregamento);
}

logoWrap?.addEventListener('click', (evento) => {
  evento.preventDefault();
  iniciarRefreshHome();
});

function obterPosicaoRolagem() {
  const elementoRolagem = document.scrollingElement || document.documentElement;
  return elementoRolagem.scrollTop;
}

function atualizarProgressoLeitura() {
  if (!barraLeitura || isRefreshing) return;

  if (document.body.classList.contains('prefacio-em-foco') || document.body.classList.contains('prefacio-em-saida') || document.body.classList.contains('home-carregando')) {
    barraLeitura.style.width = '0%';
    barraLeitura.classList.remove('is-visible');
    return;
  }

  const elementoRolagem = document.scrollingElement || document.documentElement;
  const alturaRolavel = elementoRolagem.scrollHeight - elementoRolagem.clientHeight;
  const progresso = alturaRolavel > 0 ? Math.min(obterPosicaoRolagem() / alturaRolavel, 1) : 0;
  barraLeitura.style.width = `${(progresso * 100).toFixed(2)}%`;
  barraLeitura.classList.add('is-visible');
}

function atualizarTopo() {
  if (!topo) return;

  if (document.body.classList.contains('prefacio-em-foco') || document.body.classList.contains('prefacio-em-saida') || document.body.classList.contains('home-carregando')) {
    topo.style.setProperty('--topo-progresso', '0');
    topo.classList.remove('is-scrolled');
    return;
  }

  const progresso = Math.min(obterPosicaoRolagem() / DISTANCIA_TRANSICAO, 1);
  topo.style.setProperty('--topo-progresso', progresso.toFixed(3));
  topo.classList.toggle('is-scrolled', progresso > 0.5);
  atualizarProgressoLeitura();
}

function ativarInteracaoToque(elemento) {
  if (!window.matchMedia('(hover: none)').matches) return;

  elementosInterativos.forEach((item) => {
    if (item !== elemento) item.classList.remove('is-touch-active');
  });
  elemento.classList.toggle('is-touch-active');
}

elementosInterativos.forEach((elemento) => {
  elemento.addEventListener('click', () => ativarInteracaoToque(elemento));
});

document.addEventListener('click', (evento) => {
  if (!window.matchMedia('(hover: none)').matches) return;
  if (!evento.target.closest('.manifesto-box, .box-int, .bloco, .bloco-1v, .bloco-2v')) {
    elementosInterativos.forEach((elemento) => elemento.classList.remove('is-touch-active'));
  }
});

const ativarPrefacioFase2 = () => {
  if (!prefacio || prefacio.classList.contains('prefacio-ativo')) return;
  prefacio.classList.add('prefacio-ativo');
  document.body.classList.add('prefacio-fase-2');
  prefacio.setAttribute('data-fase', '2');
  prefacio.dataset.locked = 'true';
  atualizarCorTema('#0b0b0d');
  barraPrefacio?.classList.add('is-complete');
};

const encerrarAberturaPrefacio = () => {
  if (!prefacio || aberturaEncerrada) return;
  aberturaEncerrada = true;
  window.clearTimeout(temporizadorPrefacio);
  window.clearTimeout(temporizadorLiberacao);
  prefacio.classList.add('prefacio-abertura-encerrada');
  document.body.classList.add('prefacio-em-saida');
  document.documentElement.classList.add('prefacio-em-saida');

  window.setTimeout(() => {
    document.body.classList.remove('prefacio-em-foco', 'prefacio-em-saida');
    document.documentElement.classList.remove('prefacio-em-foco', 'prefacio-em-saida');
    document.body.classList.add('pagina-inicial-liberada');
    document.documentElement.classList.add('pagina-inicial-liberada');
    barraLeitura?.classList.add('is-visible');
    atualizarProgressoLeitura();
  }, 850);
};

if (entradaDireta && prefacio) {
  aberturaEncerrada = true;
  document.body.classList.add('pagina-inicial-liberada');
  document.documentElement.classList.add('pagina-inicial-liberada');
  prefacio.classList.remove('prefacio-ativo', 'prefacio-abertura-encerrada');
  prefacio.style.display = 'none';
  prefacio.style.opacity = '0';
  barraLeitura?.classList.add('is-visible');
  atualizarProgressoLeitura();
}

if (prefacio && !entradaDireta) {
  temporizadorPrefacio = window.setTimeout(() => {
    ativarPrefacioFase2();
    temporizadorLiberacao = window.setTimeout(encerrarAberturaPrefacio, 2000);
  }, 4800);
}

function ativarRevelar() {
  const elementos = document.querySelectorAll('.reveal');
  const limiteVisivel = window.innerHeight * 0.82;

  elementos.forEach((elemento, index) => {
    const atraso = window.innerWidth <= 480 ? 60 : 100;
    elemento.style.transitionDelay = `${index * atraso}ms`;

    const topoElemento = elemento.getBoundingClientRect().top;
    if (topoElemento < limiteVisivel) {
      elemento.classList.add('is-visible');
      return;
    }

    elemento.classList.remove('is-visible');
  });
}

function onScroll() {
  if (isRefreshing || document.body.classList.contains('prefacio-em-foco') || document.body.classList.contains('prefacio-em-saida') || document.body.classList.contains('home-carregando')) {
    barraLeitura?.style.setProperty('width', '0%');
    barraLeitura?.classList.remove('is-visible');
    return;
  }

  const scrollAtual = window.scrollY || document.documentElement.scrollTop || 0;
  if (scrollAtual === ultimoScrollY) return;

  ultimoScrollY = scrollAtual;

  if (!ticking) {
    window.requestAnimationFrame(() => {
      atualizarTopo();
      atualizarProgressoLeitura();
      ticking = false;
    });
    ticking = true;
  }
}

if ('IntersectionObserver' in window) {
  elementosRevelar.forEach((elemento, index) => {
    const atraso = window.innerWidth <= 480 ? 18 : 28;
    elemento.style.transitionDelay = `${index * atraso}ms`;
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    });
  }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });

  elementosRevelar.forEach((elemento) => observer.observe(elemento));
} else {
  ativarRevelar();
}

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('load', () => {
  requestAnimationFrame(() => {
    atualizarTopo();
    atualizarProgressoLeitura();
  });

  if (!('IntersectionObserver' in window)) ativarRevelar();
});

requestAnimationFrame(() => {
  atualizarTopo();
  atualizarProgressoLeitura();
});

