/* =============================================================
 * CUP DANCE COMPETITION 2026 — Formulario de inscripción
 * Sede Gran Asunción · Grow Agencia
 * ============================================================= */

/* 👉 Pegá acá la URL /exec de la aplicación web de Apps Script */
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzyT46Od1IKUY7RYhbDPJDCghj1uiQsZnATwaJGyoGSM2C6X50pn2Y1G5pIlL5Trgih2g/exec';

const MODO_PREVIEW = !/^https:\/\/script\.google\.com\//.test(SCRIPT_URL);
const CHUNK = 1.5 * 1024 * 1024;           // 1.5 MB por parte
const MAX_MUSICA = 25 * 1024 * 1024;
const MAX_IMG = 10 * 1024 * 1024;
const TOTAL_PASOS = 6;
const NOMBRES_PASOS = ['Institución', 'Obra', 'Participantes', 'Música', 'Pago', 'Confirmación'];

/* ---------- Datos del reglamento ---------- */
let CONFIG = {
  abiertas: true,
  mensajeCierre: '',
  sede: 'Gran Asunción',
  fechaEvento: '2026-11-22',
  fechaTexto: '22 de Noviembre 2026',
  lugar: 'Teatro "Pedro Moliniers"',
  costos: { solista: 120000, duo: 100000, trio: 90000, cuarteto: 80000, grupo_a: 70000, grupo_b: 60000, conjunto: 50000, coreografia: 100000 },
  banco: {},
  whatsapp: '595971588475',
  reglamento: 'reglamento.pdf'
};

const CATEGORIAS = [
  { v: 'BABY',         t: 'Baby',         d: 'hasta 5 años', min: 0,  max: 5 },
  { v: 'PRE INFANTIL', t: 'Pre Infantil', d: '6 a 7',        min: 6,  max: 7 },
  { v: 'INFANTIL',     t: 'Infantil',     d: '8 a 11',       min: 8,  max: 11 },
  { v: 'JUVENIL',      t: 'Juvenil',      d: '12 a 18',      min: 12, max: 18 },
  { v: 'MAYORES',      t: 'Mayores',      d: '19 +',         min: 19, max: 200 },
  { v: 'PROFESIONAL',  t: 'Profesional',  d: '',             min: null, max: null },
  { v: 'AFICIONADO',   t: 'Aficionado',   d: '',             min: null, max: null }
];

const TIPOS = [
  { v: 'solista',  t: 'Solista',        d: '1',        min: 1,  max: 1,   seg: 150, label: 'Solista' },
  { v: 'duo',      t: 'Dúo',            d: '2',        min: 2,  max: 2,   seg: 180, label: 'Dúo' },
  { v: 'trio',     t: 'Trío',           d: '3',        min: 3,  max: 3,   seg: 180, label: 'Trío' },
  { v: 'cuarteto', t: 'Cuarteto',       d: '4',        min: 4,  max: 4,   seg: 180, label: 'Cuarteto' },
  { v: 'grupo_a',  t: 'Grupo Serie A',  d: '5 a 10',   min: 5,  max: 10,  seg: 210, label: 'Grupo Serie A (5 a 10 part.)' },
  { v: 'grupo_b',  t: 'Grupo Serie B',  d: '11 a 20',  min: 11, max: 20,  seg: 210, label: 'Grupo Serie B (11 a 20 part.)' },
  { v: 'conjunto', t: 'Conjunto',       d: '21 +',     min: 21, max: 999, seg: 210, label: 'Conjunto (21 o más part.)' }
];

const MODALIDADES = {
  'Danza Paraguaya':            ['Proyección', 'Estilización', 'Fantasía'],
  'Danza Clásica':              ['Libre', 'Repertorio'],
  'Danza Neoclásica':           ['Libre', 'Repertorio'],
  'Danza Española':             ['Regional', 'Bolero', 'Flamenco', 'Estilización'],
  'Danza Argentina':            ['Tradicional', 'Proyección', 'Estilización'],
  'Folclore Mundial':           [],
  'Danzas Árabes y Bellydance': [],
  'Danza Jazz':                 [],
  'Técnica Libre':              [],
  'Show':                       [],
  'Acrodance':                  [],
  'Ritmos Urbanos':             [],
  'Contemporáneo':              [],
  'Otra modalidad':             null
};

/* ---------- Estado ---------- */
let pasoActual = 1;
let participantes = [];          // {nombre, documento, fnac, edad, nuevo}
let editandoIdx = -1;
let enviando = false;
let ultimaInscripcion = null;

/* ---------- Helpers ---------- */
const $ = id => document.getElementById(id);
const val = id => ($(id).value || '').trim();
const radio = name => { const r = document.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ''; };
const gs = n => 'Gs. ' + Math.round(n || 0).toLocaleString('es-PY').replace(/,/g, '.');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const normDoc = v => String(v || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
const tipoSel = () => TIPOS.find(t => t.v === radio('tipo'));
const catSel = () => CATEGORIAS.find(c => c.v === radio('categoria'));
const iniciales = n => String(n).trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

function toast(msg, ms) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), ms || 3500);
}

function edadAlEvento(fnac) {
  if (!fnac || !/^\d{4}-\d{2}-\d{2}$/.test(fnac)) return '';
  const [y, m, d] = fnac.split('-').map(Number);
  const [ey, em, ed] = (CONFIG.fechaEvento || '2026-11-22').split('-').map(Number);
  let e = ey - y;
  if (em < m || (em === m && ed < d)) e--;
  return e >= 0 && e < 110 ? e : '';
}

/* Convierte fechas tipo dd/mm/aaaa del catastro a aaaa-mm-dd */
function aISO(f) {
  if (!f) return '';
  f = String(f).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(f)) return f;
  const m = f.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  return m ? m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0') : '';
}
function fechaLinda(iso) { return iso ? iso.split('-').reverse().join('/') : ''; }

async function apiGet(params) {
  if (MODO_PREVIEW) throw new Error('preview');
  const url = SCRIPT_URL + '?' + new URLSearchParams(Object.assign({}, params, { _ts: Date.now() }));
  const r = await fetch(url, { cache: 'no-store' });
  return r.json();
}

async function apiPost(obj, intentos) {
  intentos = intentos || 3;
  let ultimoError;
  for (let i = 0; i < intentos; i++) {
    try {
      const r = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(obj) });
      const j = await r.json();
      return j;
    } catch (e) {
      ultimoError = e;
      await new Promise(res => setTimeout(res, 1200 * (i + 1)));
    }
  }
  throw ultimoError || new Error('Sin conexión');
}

/* ---------- Guardado local de datos de la academia ---------- */
const LS_KEY = 'cdc26_academia';
const CAMPOS_ACAD = ['email', 'academia', 'director', 'telefono', 'ciudad'];
function guardarAcademiaLocal() {
  try { const o = {}; CAMPOS_ACAD.forEach(k => o[k] = val(k)); localStorage.setItem(LS_KEY, JSON.stringify(o)); } catch (e) {}
}
function cargarAcademiaLocal() {
  try { const o = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); CAMPOS_ACAD.forEach(k => { if (o[k]) $(k).value = o[k]; }); } catch (e) {}
}

/* =============================================================
 *  INICIO
 * ============================================================= */
document.addEventListener('DOMContentLoaded', () => {
  armarPills();
  armarModalidades();
  cargarAcademiaLocal();
  armarProgreso();
  bindEventos();
  pintarCostos();
  pintarLista();
  if (MODO_PREVIEW) $('preview-banner').style.display = 'block';
  cargarConfig();
  cargarAcademias();
});

async function cargarConfig() {
  try {
    const j = await apiGet({ accion: 'config' });
    if (j && j.ok) {
      CONFIG = Object.assign(CONFIG, j.config);
      CONFIG.costos = Object.assign({}, CONFIG.costos, j.config.costos);
    }
  } catch (e) { /* usa valores por defecto */ }
  if (CONFIG.sede) $('h-sede').textContent = titulo(CONFIG.sede);
  if (CONFIG.fechaTexto) $('h-fecha').textContent = CONFIG.fechaTexto;
  if (CONFIG.lugar) $('h-lugar').textContent = CONFIG.lugar.split('·')[0].trim();
  if (CONFIG.reglamento) $('link-reglamento').href = CONFIG.reglamento;
  $('lbl-coreo').textContent = '+ ' + gs(CONFIG.costos.coreografia);
  pintarCostos();
  pintarBanco();
  if (!CONFIG.abiertas) {
    const b = $('cerrado-banner');
    b.textContent = '🔒 ' + (CONFIG.mensajeCierre || 'Las inscripciones están cerradas.');
    b.style.display = 'block';
    $('main-form').style.display = 'none';
    $('progress-wrap').style.display = 'none';
  }
}
function titulo(s) { return String(s).toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase()); }

async function cargarAcademias() {
  try {
    const j = await apiGet({ accion: 'academias' });
    if (j && j.ok) $('lista-academias').innerHTML = j.academias.map(a => '<option value="' + esc(a) + '">').join('');
  } catch (e) {}
}

function armarPills() {
  $('pills-categoria').innerHTML = CATEGORIAS.map(c =>
    '<label class="pill"><input type="radio" name="categoria" value="' + c.v + '"/><span>' + c.t + (c.d ? ' <small>' + c.d + '</small>' : '') + '</span></label>').join('');
  $('pills-tipo').innerHTML = TIPOS.map(t =>
    '<label class="pill"><input type="radio" name="tipo" value="' + t.v + '"/><span>' + t.t + ' <small>' + t.d + '</small></span></label>').join('');
}

function armarModalidades() {
  $('modalidad').innerHTML = '<option value="">— Seleccioná —</option>' +
    Object.keys(MODALIDADES).map(m => '<option value="' + m + '">' + m + '</option>').join('');
}

function armarProgreso() {
  $('progress-bar').innerHTML = Array.from({ length: TOTAL_PASOS }, (_, i) => '<div class="p-step" id="ps-' + (i + 1) + '"></div>').join('');
  actualizarProgreso();
}
function actualizarProgreso() {
  for (let i = 1; i <= TOTAL_PASOS; i++) {
    const el = $('ps-' + i);
    el.className = 'p-step' + (i < pasoActual ? ' done' : i === pasoActual ? ' active' : '');
  }
  $('progress-label').textContent = 'Paso ' + pasoActual + ' de ' + TOTAL_PASOS + ' · ' + NOMBRES_PASOS[pasoActual - 1];
}

/* =============================================================
 *  EVENTOS
 * ============================================================= */
function bindEventos() {
  document.querySelectorAll('[data-ir]').forEach(b => b.addEventListener('click', () => irSeccion(Number(b.dataset.ir))));

  CAMPOS_ACAD.forEach(k => $(k).addEventListener('change', guardarAcademiaLocal));

  $('modalidad').addEventListener('change', () => {
    const m = $('modalidad').value;
    const estilos = MODALIDADES[m];
    $('campo-otra').style.display = estilos === null ? 'block' : 'none';
    if (estilos && estilos.length) {
      $('estilo').innerHTML = '<option value="">— Seleccioná —</option>' + estilos.map(e => '<option>' + e + '</option>').join('');
      $('campo-estilo').style.display = 'block';
    } else {
      $('estilo').innerHTML = '';
      $('campo-estilo').style.display = 'none';
    }
  });

  document.addEventListener('change', e => {
    const n = e.target.name;
    if (n === 'tipo') { pintarObjetivo(); pintarCostos(); pintarTiempoMax(); revisarTiempo(); limpiarErr('tipo'); }
    if (n === 'categoria') { pintarLista(); limpiarErr('categoria'); }
    if (n === 'compite') pintarCostos();
    if (n === 'tipo-musica') $('bloque-mp3').style.display = radio('tipo-musica') === 'mp3' ? 'block' : 'none';
    if (n === 'esceno') $('bloque-esceno').style.display = radio('esceno') === 'si' ? 'block' : 'none';
    if (n === 'forma-pago') {
      const fp = radio('forma-pago');
      $('bloque-banco').style.display = fp && fp !== 'Efectivo' ? 'block' : 'none';
      $('bloque-efectivo').style.display = fp === 'Efectivo' ? 'block' : 'none';
      limpiarErr('pago');
    }
  });

  ['tiempo-min', 'tiempo-seg'].forEach(id => $(id).addEventListener('input', revisarTiempo));

  // Catastro
  document.querySelectorAll('.catastro-tab').forEach(t => t.addEventListener('click', () => setTab(t.dataset.tab)));
  $('btn-buscar-ci').addEventListener('click', buscarCI);
  $('btn-buscar-nombre').addEventListener('click', buscarNombre);
  $('ci-buscar').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); buscarCI(); } });
  $('nombre-buscar').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); buscarNombre(); } });
  $('btn-nuevo').addEventListener('click', () => mostrarFormNuevo({}, -1));

  // Archivos
  bindArchivo('file-musica', 'area-musica', 'nombre-musica', 'musica');
  bindArchivo('file-esceno', 'area-esceno', 'nombre-esceno', 'imagen');
  bindArchivo('file-comp', 'area-comp', 'nombre-comp', 'comprobante');

  // Checks
  ['chk-reglamento', 'chk-imagen', 'chk-datos'].forEach(id => {
    const el = $(id);
    const tog = () => { el.classList.toggle('on'); el.setAttribute('aria-checked', el.classList.contains('on')); $('err-checks').style.display = 'none'; };
    el.addEventListener('click', tog);
    el.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tog(); } });
  });

  $('main-form').addEventListener('submit', e => { e.preventDefault(); enviar(); });
  $('btn-otra').addEventListener('click', otraObra);

  // Limpiar error al escribir
  document.querySelectorAll('.campo input, .campo select, .campo textarea').forEach(el => {
    el.addEventListener('input', () => { const c = el.closest('.campo'); if (c) { c.classList.remove('error'); const m = c.querySelector('.err-msg.auto'); if (m) m.remove(); } });
  });
}

/* =============================================================
 *  NAVEGACIÓN + VALIDACIÓN
 * ============================================================= */
function irSeccion(n) {
  if (n < 1 || n > TOTAL_PASOS) return;
  if (n > pasoActual) {
    for (let p = pasoActual; p < n; p++) {
      if (!validar(p)) { mostrar(p); return; }
    }
  }
  mostrar(n);
}

function mostrar(n) {
  document.querySelectorAll('.seccion').forEach(s => s.classList.remove('activa'));
  $('sec-' + n).classList.add('activa');
  pasoActual = n;
  actualizarProgreso();
  $('banner-img').style.display = n === 1 ? 'block' : 'none';
  if (n === 3) pintarObjetivo();
  if (n === 4) pintarTiempoMax();
  if (n === 5) pintarCostos();
  if (n === 6) pintarResumen();
  const top = $('progress-wrap').getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top: n === 1 ? 0 : top, behavior: 'smooth' });
}

function errCampo(id, msg) {
  const c = $(id).closest('.campo');
  c.classList.add('error');
  if (!c.querySelector('.err-msg.auto')) {
    const s = document.createElement('span');
    s.className = 'err-msg auto';
    s.textContent = msg;
    c.appendChild(s);
  }
  return false;
}
function errSpan(key, msg) { const e = $('err-' + key); e.textContent = msg; e.style.display = 'block'; return false; }
function limpiarErr(key) { const e = $('err-' + key); if (e) e.style.display = 'none'; }

function validar(p) {
  document.querySelectorAll('#sec-' + p + ' .campo.error').forEach(c => c.classList.remove('error'));
  document.querySelectorAll('#sec-' + p + ' .err-msg.auto').forEach(m => m.remove());
  let ok = true;
  const req = (id, msg) => { if (!val(id)) ok = errCampo(id, msg || 'Campo obligatorio'); };

  if (p === 1) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val('email'))) ok = errCampo('email', 'Ingresá un email válido');
    req('academia'); req('director'); req('ciudad');
    if (val('telefono').replace(/\D/g, '').length < 6) ok = errCampo('telefono', 'Ingresá un teléfono válido');
    if (ok) guardarAcademiaLocal();
  }
  if (p === 2) {
    req('obra'); req('modalidad', 'Elegí una modalidad'); req('coreografo');
    const m = $('modalidad').value;
    if (m && MODALIDADES[m] && MODALIDADES[m].length) req('estilo', 'Elegí el estilo');
    if (m && MODALIDADES[m] === null) req('modalidad-otra', 'Especificá la modalidad');
    if (!radio('categoria')) ok = errSpan('categoria', 'Elegí una categoría');
    if (!radio('tipo')) ok = errSpan('tipo', 'Elegí el tipo de participación');
  }
  if (p === 3) {
    const t = tipoSel();
    if (editandoIdx !== -1 || $('nuevo-form-wrap').innerHTML) {
      toast('Terminá de guardar (o cancelá) el participante que estás cargando');
      return false;
    }
    if (!t) { toast('Primero elegí el tipo de participación'); return false; }
    const n = participantes.length;
    if (n < t.min || n > t.max) {
      toast(t.t + ' requiere ' + rangoTxt(t) + '. Cargaste ' + n + '.', 4500);
      ok = false;
    }
    const sinFecha = participantes.filter(x => !x.fnac);
    if (ok && sinFecha.length) {
      toast('Falta la fecha de nacimiento de: ' + sinFecha.map(x => x.nombre.split(' ')[0]).join(', ') + ' (tocá ✏️)', 5000);
      ok = false;
    }
  }
  if (p === 4) {
    const m = Number($('tiempo-min').value || 0), s = Number($('tiempo-seg').value || 0);
    if (m * 60 + s <= 0 || s > 59) ok = errCampo('tiempo-min', 'Ingresá la duración (minutos y segundos)');
    if (radio('tipo-musica') === 'mp3' && !$('file-musica').files[0]) ok = errCampo('file-musica', 'Subí el archivo de música o elegí "Pendrive"');
    if (radio('esceno') === 'si') req('esceno-desc', 'Describí los elementos');
  }
  if (p === 5) {
    if (!radio('forma-pago')) ok = errSpan('pago', 'Elegí la forma de pago');
  }
  if (!ok) {
    const first = document.querySelector('#sec-' + p + ' .campo.error, #sec-' + p + ' .err-msg[style*="block"]');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  return ok;
}

function rangoTxt(t) {
  if (t.min === t.max) return t.min + (t.min === 1 ? ' participante' : ' participantes');
  return t.max >= 999 ? t.min + ' o más participantes' : t.min + ' a ' + t.max + ' participantes';
}

/* =============================================================
 *  PARTICIPANTES / CATASTRO
 * ============================================================= */
function setTab(tab) {
  document.querySelectorAll('.catastro-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  $('tab-ci').style.display = tab === 'ci' ? 'flex' : 'none';
  $('tab-nombre').style.display = tab === 'nombre' ? 'flex' : 'none';
  $('resultado-busqueda').innerHTML = '';
  (tab === 'ci' ? $('ci-buscar') : $('nombre-buscar')).focus();
}

function pintarObjetivo() {
  const t = tipoSel();
  const n = participantes.length;
  const box = $('cnt-objetivo');
  if (!t) { box.innerHTML = '<span>Elegí el tipo de participación en el paso 2</span>'; return; }
  const ok = n >= t.min && n <= t.max;
  box.innerHTML = '<span>' + esc(t.label) + ' · necesitás <b>' + rangoTxt(t) + '</b></span>' +
    '<span style="color:' + (ok ? 'var(--ok)' : 'var(--warn)') + ';font-weight:700;white-space:nowrap">' + (ok ? '✓ ' : '') + n + ' cargado' + (n === 1 ? '' : 's') + '</span>';
}

function yaEnLista(doc) { const k = normDoc(doc); return k && participantes.some(p => normDoc(p.documento) === k); }

async function buscarCI() {
  const ci = val('ci-buscar');
  const out = $('resultado-busqueda');
  if (normDoc(ci).length < 4) { toast('Ingresá un número de documento válido'); return; }
  if (yaEnLista(ci)) { out.innerHTML = '<div class="result found">✓ Esa persona ya está en la lista.</div>'; return; }
  $('btn-buscar-ci').disabled = true;
  out.innerHTML = '<div class="vacio"><span class="spinner"></span>Buscando…</div>';
  try {
    const j = await apiGet({ accion: 'buscarCI', ci: ci });
    if (j.ok && j.encontrado) out.innerHTML = '<div class="result found">' + filaPersona(j.persona) + '</div>';
    else noEncontrado(ci, '');
  } catch (e) {
    noEncontrado(ci, '');
  } finally { $('btn-buscar-ci').disabled = false; }
}

async function buscarNombre() {
  const q = val('nombre-buscar');
  const out = $('resultado-busqueda');
  if (q.length < 3) { toast('Escribí al menos 3 letras'); return; }
  $('btn-buscar-nombre').disabled = true;
  out.innerHTML = '<div class="vacio"><span class="spinner"></span>Buscando…</div>';
  try {
    const j = await apiGet({ accion: 'buscarNombre', q: q });
    if (j.ok && j.resultados && j.resultados.length) {
      out.innerHTML = '<div class="result found">' + j.resultados.map(filaPersona).join('') + '</div>';
    } else noEncontrado('', q);
  } catch (e) {
    noEncontrado('', q);
  } finally { $('btn-buscar-nombre').disabled = false; }
}

let RESULTADOS = {};
function filaPersona(p) {
  const key = 'r' + Math.random().toString(36).slice(2, 9);
  RESULTADOS[key] = p;
  const fnac = aISO(p.fnac);
  const edad = edadAlEvento(fnac);
  const dentro = yaEnLista(p.documento);
  return '<div class="p-row"><div class="avatar">' + esc(iniciales(p.nombre)) + '</div>' +
    '<div class="p-info"><div class="p-nombre">' + esc(p.nombre) + '</div>' +
    '<div class="p-detalle">Doc. ' + esc(p.documento) + (edad !== '' ? ' · ' + edad + ' años' : ' · sin fecha de nac.') + (p.academia ? ' · ' + esc(p.academia) : '') + '</div></div>' +
    '<button type="button" class="btn-add" ' + (dentro ? 'disabled' : '') + ' onclick="agregarDeCatastro(\'' + key + '\')">' + (dentro ? '✓ Agregado' : '+ Agregar') + '</button></div>';
}

function noEncontrado(ci, nombre) {
  $('resultado-busqueda').innerHTML = '<div class="result nf">No encontramos a ' + (ci ? 'ese documento' : '"' + esc(nombre) + '"') +
    ' en el registro. <a href="#" style="color:var(--gold-l);font-weight:700" onclick="event.preventDefault();mostrarFormNuevo({documento:\'' + esc(ci) + '\',nombre:\'' + esc(nombre).replace(/'/g, '') + '\'},-1)">Registrarlo/a como nuevo/a →</a></div>';
}

function agregarDeCatastro(key) {
  const p = RESULTADOS[key];
  if (!p) return;
  if (yaEnLista(p.documento)) { toast('Ya está en la lista'); return; }
  if (!hayLugar()) return;
  const fnac = aISO(p.fnac);
  const nuevo = { nombre: p.nombre, documento: p.documento, fnac: fnac, edad: edadAlEvento(fnac), nuevo: false };
  const palabras = p.nombre.trim().split(/\s+/).length;
  $('resultado-busqueda').innerHTML = '';
  $('ci-buscar').value = ''; $('nombre-buscar').value = '';
  if (!fnac || palabras < 3) {
    // Pedir completar datos antes de agregar
    mostrarFormNuevo(nuevo, -2, !fnac ? 'Completá la fecha de nacimiento' : 'Verificá que tenga ambos nombres y apellidos');
    return;
  }
  participantes.push(nuevo);
  pintarLista();
  toast('✓ ' + p.nombre + ' agregado/a');
}

function hayLugar() {
  const t = tipoSel();
  if (t && participantes.length >= t.max) { toast(t.t + ': máximo ' + rangoTxt(t)); return false; }
  return true;
}

/* idx: -1 nuevo · -2 completar uno del catastro · >=0 editar existente */
function mostrarFormNuevo(datos, idx, aviso) {
  if (idx === -1 && !hayLugar()) return;
  editandoIdx = idx;
  datos = datos || {};
  const titulo = idx >= 0 ? 'Editar participante' : idx === -2 ? 'Completar datos' : 'Nuevo participante';
  $('nuevo-form-wrap').innerHTML =
    '<div class="nuevo-form"><h4>' + titulo + '</h4>' +
    (aviso ? '<div class="warn-box" style="margin-bottom:.7rem">' + esc(aviso) + '</div>' : '') +
    '<div class="campo"><label>Nombre completo <span class="req">*</span></label>' +
    '<input type="text" id="np-nombre" value="' + esc(datos.nombre || '') + '" placeholder="Ambos nombres y ambos apellidos"/></div>' +
    '<div class="grid2"><div class="campo"><label>Documento (CI / DNI / Pasaporte) <span class="req">*</span></label>' +
    '<input type="text" id="np-doc" value="' + esc(datos.documento || '') + '" ' + (idx === -2 ? 'readonly' : '') + ' placeholder="Sin puntos"/></div>' +
    '<div class="campo"><label>Fecha de nacimiento <span class="req">*</span></label>' +
    '<input type="date" id="np-fnac" value="' + esc(datos.fnac || '') + '" max="2026-12-31" min="1930-01-01"/></div></div>' +
    '<div class="nuevo-btns"><button type="button" class="btn-prev" onclick="cancelarNuevo()">Cancelar</button>' +
    '<button type="button" class="btn-sm" onclick="guardarNuevo()">' + (idx >= 0 ? 'Guardar cambios' : '+ Agregar a la lista') + '</button></div></div>';
  $('btn-nuevo').style.display = 'none';
  setTimeout(() => { const f = $('np-nombre'); f.focus(); f.closest('.nuevo-form').scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50);
}

function cancelarNuevo() {
  editandoIdx = -1;
  $('nuevo-form-wrap').innerHTML = '';
  $('btn-nuevo').style.display = 'block';
}

function guardarNuevo() {
  const nombre = val('np-nombre').replace(/\s+/g, ' ');
  const doc = val('np-doc');
  const fnac = val('np-fnac');
  if (nombre.split(' ').length < 2) { toast('Ingresá nombre y apellido completos'); $('np-nombre').focus(); return; }
  if (normDoc(doc).length < 4) { toast('Ingresá un documento válido'); $('np-doc').focus(); return; }
  if (!fnac) { toast('Ingresá la fecha de nacimiento'); $('np-fnac').focus(); return; }
  const edad = edadAlEvento(fnac);
  if (edad === '') { toast('Revisá la fecha de nacimiento'); return; }
  const dup = participantes.findIndex((p, i) => normDoc(p.documento) === normDoc(doc) && i !== editandoIdx);
  if (dup > -1) { toast('Ese documento ya está en la lista'); return; }

  const nombreTitulo = nombre.toLowerCase().replace(/(^|\s|-)\S/g, c => c.toUpperCase());
  if (editandoIdx >= 0) {
    Object.assign(participantes[editandoIdx], { nombre: nombreTitulo, documento: doc, fnac: fnac, edad: edad });
  } else {
    participantes.push({ nombre: nombreTitulo, documento: doc, fnac: fnac, edad: edad, nuevo: editandoIdx === -1 });
  }
  cancelarNuevo();
  pintarLista();
  toast('✓ ' + nombreTitulo + ' guardado/a');
}

function quitar(i) {
  participantes.splice(i, 1);
  pintarLista();
}
function editar(i) { mostrarFormNuevo(participantes[i], i); }

function pintarLista() {
  const cat = catSel();
  const fuera = p => cat && cat.min != null && p.edad !== '' && (p.edad < cat.min || p.edad > cat.max);
  $('lista-count').textContent = participantes.length;
  $('lista-items').innerHTML = participantes.length ? participantes.map((p, i) =>
    '<div class="lista-item"><span class="lista-num">' + (i + 1) + '</span>' +
    '<div class="lista-main"><div class="lista-nombre">' + esc(p.nombre) + '</div>' +
    '<div class="lista-sub">Doc. ' + esc(p.documento) + (p.fnac ? ' · ' + fechaLinda(p.fnac) : '') + '</div></div>' +
    (p.edad !== '' ? '<span class="tag ' + (fuera(p) ? 'tag-fuera' : 'tag-edad') + '">' + p.edad + ' años</span>' : '') +
    (p.nuevo ? '<span class="tag tag-nuevo">nuevo</span>' : '') +
    '<button type="button" class="icon-btn" title="Editar" onclick="editar(' + i + ')">✏️</button>' +
    '<button type="button" class="icon-btn del" title="Quitar" onclick="quitar(' + i + ')">✕</button></div>'
  ).join('') : '<div class="vacio">Todavía no agregaste participantes</div>';

  const nFuera = participantes.filter(fuera);
  $('aviso-edades').innerHTML = nFuera.length && cat
    ? '<div class="warn-box" style="margin:.6rem 0 0">⚠️ ' + nFuera.length + ' participante(s) fuera del rango de edad de <b>' + cat.t + ' (' + cat.d + ')</b> al día del evento. Verificá que la categoría sea la correcta.</div>'
    : '';
  pintarObjetivo();
  pintarCostos();
}

/* =============================================================
 *  MÚSICA / TIEMPO
 * ============================================================= */
function fmtSeg(s) { return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function pintarTiempoMax() {
  const t = tipoSel();
  $('tiempo-max').textContent = t ? 'Máx. ' + fmtSeg(t.seg) + ' min' : '';
}
function revisarTiempo() {
  const t = tipoSel();
  const total = Number($('tiempo-min').value || 0) * 60 + Number($('tiempo-seg').value || 0);
  $('aviso-tiempo').innerHTML = t && total > t.seg
    ? '<div class="warn-box" style="margin:.6rem 0 0">⚠️ La duración supera el máximo de ' + fmtSeg(t.seg) + ' para ' + t.t + '. Solo se permite con autorización de la organización (obras que no puedan modificar su estructura o estampas argumentadas).</div>'
    : '';
}
function duracionTxt() {
  const m = Number($('tiempo-min').value || 0), s = Number($('tiempo-seg').value || 0);
  return m + ':' + String(s).padStart(2, '0');
}

function bindArchivo(inputId, areaId, nombreId, tipo) {
  $(inputId).addEventListener('change', () => {
    const f = $(inputId).files[0];
    const area = $(areaId);
    if (!f) { area.classList.remove('has-file'); $(nombreId).textContent = ''; return; }
    const nom = f.name.toLowerCase();
    let error = '';
    if (tipo === 'musica') {
      if (!/\.(mp3|m4a|wav|aac)$/.test(nom) && !/^audio\//.test(f.type)) error = 'El archivo debe ser de audio (MP3)';
      else if (f.size > MAX_MUSICA) error = 'El archivo supera los 25 MB';
    } else if (tipo === 'imagen') {
      if (!/^image\//.test(f.type) && !/\.(jpe?g|png|heic|webp)$/.test(nom)) error = 'Subí una imagen (JPG o PNG)';
      else if (f.size > MAX_IMG) error = 'La imagen supera los 10 MB';
    } else {
      if (!/^image\//.test(f.type) && !/\.(jpe?g|png|heic|webp|pdf)$/.test(nom)) error = 'Subí una imagen o PDF';
      else if (f.size > MAX_IMG) error = 'El archivo supera los 10 MB';
    }
    if (error) { toast('⚠️ ' + error); $(inputId).value = ''; area.classList.remove('has-file'); $(nombreId).textContent = ''; return; }
    area.classList.add('has-file');
    $(nombreId).textContent = '✓ ' + f.name + ' (' + (f.size / 1048576).toFixed(1) + ' MB)';
    const c = area.closest('.campo'); if (c) { c.classList.remove('error'); const m = c.querySelector('.err-msg.auto'); if (m) m.remove(); }
  });
}

/* =============================================================
 *  COSTOS
 * ============================================================= */
function calcularMonto() {
  const t = tipoSel();
  const c = CONFIG.costos;
  if (!t) return { total: 0, detalle: 'Elegí el tipo de participación' };
  const precio = c[t.v] || 0;
  const cant = t.v === 'solista' ? 1 : Math.max(participantes.length, 0);
  const base = t.v === 'solista' ? precio : precio * cant;
  const coreo = radio('compite') === 'si' ? c.coreografia : 0;
  let detalle = t.v === 'solista' ? 'Solista ' + gs(precio) : cant + ' participante' + (cant === 1 ? '' : 's') + ' × ' + gs(precio);
  if (coreo) detalle += ' + Coreografía ' + gs(coreo);
  if (t.v !== 'solista' && cant === 0) detalle = 'Agregá participantes para calcular · ' + gs(precio) + ' por participante';
  return { total: base + coreo, detalle: detalle };
}

function pintarCostos() {
  const c = CONFIG.costos;
  const t = tipoSel();
  const filas = [
    ['solista', 'Solista'], ['duo', 'Dúo (por participante)'], ['trio', 'Trío (por participante)'], ['cuarteto', 'Cuarteto (por participante)'],
    ['grupo_a', 'Grupo Serie A · 5 a 10 (por part.)'], ['grupo_b', 'Grupo Serie B · 11 a 20 (por part.)'], ['conjunto', 'Conjunto · 21 o más (por part.)'],
    ['coreografia', 'Coreografía (Mejor Coreógrafo, por obra)']
  ];
  $('tabla-costos').innerHTML = filas.map(f => {
    const sel = (t && t.v === f[0]) || (f[0] === 'coreografia' && radio('compite') === 'si');
    return '<tr class="' + (sel ? 'sel' : '') + '"><td>' + f[1] + '</td><td>' + gs(c[f[0]]) + '</td></tr>';
  }).join('');
  const m = calcularMonto();
  $('monto-total').textContent = gs(m.total);
  $('monto-detalle').textContent = m.detalle;
}

function pintarBanco() {
  const b = CONFIG.banco || {};
  const wa = CONFIG.whatsapp ? '+' + CONFIG.whatsapp : '';
  if (b.banco || b.cuenta) {
    $('banco-card').innerHTML = '<h4>Datos bancarios</h4>' +
      [['Banco', b.banco], ['Cuenta', b.cuenta], ['Titular', b.titular], ['RUC / CI', b.ruc], ['Alias', b.alias]]
        .filter(r => r[1]).map(r => '<div class="banco-row"><span>' + r[0] + '</span><span class="val">' + esc(r[1]) + '</span></div>').join('');
  } else {
    $('banco-card').innerHTML = '<h4>Datos bancarios</h4><div style="font-size:.84rem;color:var(--txt2)">Solicitá los datos para transferencia o depósito a la organización: <b style="color:var(--txt)">(0971) 588 475</b> · <b style="color:var(--txt)">(0994) 281 511</b></div>';
  }
  $('hint-wa').textContent = wa ? 'También podés enviarlo después por WhatsApp al ' + wa + ' indicando el ID de inscripción.' : '';
}

/* =============================================================
 *  RESUMEN
 * ============================================================= */
function modalidadTxt() {
  const m = $('modalidad').value;
  return MODALIDADES[m] === null ? val('modalidad-otra') : m;
}

function pintarResumen() {
  const t = tipoSel(), c = catSel(), m = calcularMonto();
  const tm = { pendrive: 'Pendrive el día del evento', mp3: 'MP3 subido', vivo: 'En vivo' }[radio('tipo-musica')];
  const filas = [
    ['Academia', val('academia')], ['Obra', val('obra')],
    ['Modalidad', modalidadTxt() + (val('estilo') ? ' — ' + val('estilo') : '')],
    ['Categoría', c ? c.t : ''], ['Tipo', t ? t.label : ''], ['Participantes', participantes.length],
    ['Coreógrafo/a', val('coreografo')], ['Compite por coreografía', radio('compite') === 'si' ? 'Sí' : 'No'],
    ['Música', tm + ' · ' + duracionTxt()], ['Forma de pago', radio('forma-pago')], ['Total', gs(m.total)]
  ];
  $('resumen').innerHTML = '<h4>Resumen de la inscripción</h4>' +
    filas.map(r => '<div class="r"><span>' + r[0] + '</span><span>' + esc(r[1]) + '</span></div>').join('');
}

/* =============================================================
 *  ENVÍO
 * ============================================================= */
function leerChunk(file, inicio, fin) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).split(',')[1] || '');
    fr.onerror = () => rej(fr.error);
    fr.readAsDataURL(file.slice(inicio, fin));
  });
}

async function subirArchivo(file, etiqueta) {
  if (!file) return null;
  const uploadId = 'up' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const total = Math.max(1, Math.ceil(file.size / CHUNK));
  for (let i = 0; i < total; i++) {
    estado('Subiendo ' + etiqueta + '… ' + Math.round((i / total) * 100) + '%');
    const data = await leerChunk(file, i * CHUNK, Math.min(file.size, (i + 1) * CHUNK));
    const r = await apiPost({ accion: 'chunk', uploadId: uploadId, idx: i, total: total, data: data });
    if (!r || !r.ok) throw new Error((r && r.error) || 'No se pudo subir ' + etiqueta);
  }
  estado('Subiendo ' + etiqueta + '… 100%');
  return { uploadId: uploadId, total: total, nombre: file.name, mime: file.type || '' };
}

function estado(t) { $('envio-estado').textContent = t; }

async function enviar() {
  if (enviando) return;
  for (let p = 1; p <= 5; p++) { if (!validar(p)) { mostrar(p); return; } }
  const faltan = ['chk-reglamento', 'chk-imagen', 'chk-datos'].filter(id => !$(id).classList.contains('on'));
  if (faltan.length) { errSpan('checks', 'Tenés que aceptar las tres casillas para enviar'); return; }
  if (MODO_PREVIEW) { toast('Vista previa: conectá la URL del Apps Script para poder enviar', 5000); return; }

  enviando = true;
  const btn = $('btn-enviar');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Enviando…';
  window.onbeforeunload = () => 'Se está enviando la inscripción';

  try {
    const musica = radio('tipo-musica') === 'mp3' ? await subirArchivo($('file-musica').files[0], 'música') : null;
    const esceno = radio('esceno') === 'si' ? await subirArchivo($('file-esceno').files[0], 'foto de escenografía') : null;
    const fp = radio('forma-pago');
    const comprobante = fp !== 'Efectivo' ? await subirArchivo($('file-comp').files[0], 'comprobante') : null;

    estado('Guardando inscripción…');
    const datos = {
      accion: 'inscribir',
      email: val('email'), academia: val('academia'), director: val('director'), telefono: val('telefono'), ciudad: val('ciudad'),
      obra: val('obra'), modalidad: modalidadTxt(), estilo: val('estilo'),
      categoria: catSel().t, tipo: radio('tipo'),
      coreografo: val('coreografo'), preparador: val('preparador'), contactoResp: val('contacto-resp'),
      compiteCoreo: radio('compite'),
      participantes: participantes.map(p => ({ nombre: p.nombre, documento: p.documento, fnac: p.fnac, edad: p.edad })),
      tipoMusica: radio('tipo-musica'), duracion: duracionTxt(), musica: musica,
      tieneEsceno: radio('esceno'), escenoDesc: radio('esceno') === 'si' ? val('esceno-desc') : '', esceno: esceno,
      formaPago: fp, comprobante: comprobante, observaciones: val('observaciones')
    };
    const r = await apiPost(datos, 1);
    if (!r || !r.ok) throw new Error((r && r.error) || 'No se pudo guardar la inscripción');
    exito(r, datos);
  } catch (e) {
    estado('');
    toast('❌ ' + (e.message || 'Error de conexión') + '. Revisá tu conexión e intentá de nuevo.', 7000);
  } finally {
    enviando = false;
    window.onbeforeunload = null;
    btn.disabled = false;
    btn.textContent = 'Enviar inscripción';
  }
}

function exito(r, datos) {
  ultimaInscripcion = { id: r.id, obra: datos.obra };
  $('main-form').style.display = 'none';
  $('progress-wrap').style.display = 'none';
  $('banner-img').style.display = 'none';
  $('ok-obra').textContent = datos.obra;
  $('ok-id').textContent = r.id;
  $('ok-monto').textContent = 'Total: ' + gs(r.monto);
  const wa = CONFIG.whatsapp || '595971588475';
  const msg = 'Hola! Envío el comprobante de la inscripción ' + r.id + ' — Obra: ' + datos.obra + ' — Academia: ' + datos.academia + ' — Total: ' + gs(r.monto);
  $('btn-wa').href = 'https://wa.me/' + wa.replace(/\D/g, '') + '?text=' + encodeURIComponent(msg);
  $('btn-wa').style.display = datos.comprobante ? 'none' : 'block';
  $('ok-wa-txt').style.display = datos.comprobante ? 'none' : 'block';
  $('exito').style.display = 'block';
  estado('');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function otraObra() {
  // Mantiene los datos de la academia (paso 1), limpia el resto
  ['obra', 'modalidad-otra', 'coreografo', 'preparador', 'contacto-resp', 'tiempo-min', 'tiempo-seg', 'esceno-desc', 'observaciones', 'ci-buscar', 'nombre-buscar']
    .forEach(id => { $(id).value = ''; });
  $('modalidad').value = ''; $('modalidad').dispatchEvent(new Event('change'));
  document.querySelectorAll('input[name="categoria"],input[name="tipo"],input[name="forma-pago"]').forEach(r => r.checked = false);
  document.querySelector('input[name="compite"][value="no"]').checked = true;
  document.querySelector('input[name="tipo-musica"][value="pendrive"]').checked = true;
  document.querySelector('input[name="esceno"][value="no"]').checked = true;
  ['file-musica', 'file-esceno', 'file-comp'].forEach(id => { $(id).value = ''; $(id).dispatchEvent(new Event('change')); });
  $('bloque-mp3').style.display = 'none'; $('bloque-esceno').style.display = 'none';
  $('bloque-banco').style.display = 'none'; $('bloque-efectivo').style.display = 'none';
  ['chk-reglamento', 'chk-imagen', 'chk-datos'].forEach(id => { $(id).classList.remove('on'); $(id).setAttribute('aria-checked', 'false'); });
  participantes = [];
  cancelarNuevo();
  $('resultado-busqueda').innerHTML = '';
  $('aviso-tiempo').innerHTML = '';
  pintarLista();
  $('exito').style.display = 'none';
  $('main-form').style.display = 'block';
  $('progress-wrap').style.display = 'block';
  mostrar(2);
  toast('Datos de ' + val('academia') + ' cargados. Completá la nueva obra.');
}
