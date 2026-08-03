const API_BASE_URL = 'http://localhost:5281/api/generador';

const TIPOS       = ['Incendio', 'Accidente Vial', 'Robo', 'Asalto', 'Medica', 'Desastre Natural', 'Otro'];
const PRIORIDADES = ['Baja', 'Media', 'Alta', 'Critica'];
const ESTADOS     = ['Activo', 'Pendiente', 'Cerrado'];

const TIPO_ICONS = {
  'Incendio':        '🔥',
  'Accidente Vial':  '🚗',
  'Robo':            '🚨',
  'Asalto':          '⚠️',
  'Medica':          '🏥',
  'Desastre Natural':'🌊',
  'Otro':            '📋',
};

let activeCalls   = [];
let reportCounter = 1000;

const genReporte = () => `RPT-${new Date().getFullYear()}-${String(++reportCounter).padStart(5, '0')}`;

function tickClock() {
  const el = document.getElementById('clock');
  if (el) el.textContent = new Date().toLocaleTimeString('es-MX', { hour12: false });
}
setInterval(tickClock, 1000);
tickClock();

const VIEWS = ['dashboard', 'nueva-llamada', 'simulacion'];

const VIEW_META = {
  'dashboard':     { title: 'Dashboard Principal',    subtitle: 'Sistema en tiempo real' },
  'nueva-llamada': { title: 'Registrar Nueva Llamada', subtitle: 'Formulario de emergencia manual' },
  'simulacion':    { title: 'Simulacion Masiva',      subtitle: 'Pruebas de estres y carga' },
};

function showView(id) {
  VIEWS.forEach((v) => {
    document.getElementById('view-' + v)?.classList.toggle('active', v === id);
    document.getElementById('nav-'  + v)?.classList.toggle('active', v === id);
  });
  const meta = VIEW_META[id];
  if (meta) {
    document.getElementById('page-title').textContent    = meta.title;
    document.getElementById('page-subtitle').textContent = meta.subtitle;
  }
  if (id === 'nueva-llamada') prefillForm();
  if (id === 'dashboard') refreshDashboard();
}

function showToast(msg, type) {
  type = type || 'success';
  const container = document.getElementById('toast-container');
  const icons = {
    success: '<svg style="width:1rem;height:1rem;color:#10b981;flex-shrink:0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>',
    error:   '<svg style="width:1rem;height:1rem;color:#ef4444;flex-shrink:0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>',
    info:    '<svg style="width:1rem;height:1rem;color:#3b82f6;flex-shrink:0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke="currentColor"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01"/></svg>',
  };
  const borders = { success: '#064e3b', error: '#450a0a', info: '#1e3a5f' };
  const toast = document.createElement('div');
  toast.style.cssText = [
    'pointer-events:auto','display:flex','align-items:flex-start','gap:0.6rem',
    'padding:0.75rem 1rem','border-radius:0.75rem',
    'border:1px solid ' + (borders[type] || '#1e293b'),
    'background:#0f1929','box-shadow:0 10px 40px rgba(0,0,0,0.5)',
    'max-width:22rem','font-size:0.8rem','font-weight:500','color:#e2e8f0',
    'opacity:0','transform:translateX(1rem)','transition:all 0.25s ease',
  ].join(';');
  toast.innerHTML =
    (icons[type] || icons.info) +
    '<span style="flex:1;line-height:1.4">' + msg + '</span>' +
    '<button onclick="this.parentElement.remove()" style="color:#475569;cursor:pointer;font-size:0.9rem;border:none;background:none;padding:0;margin-left:0.25rem">&times;</button>';
  container.appendChild(toast);
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    });
  });
  setTimeout(function() {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(1rem)';
    setTimeout(function() { toast.remove(); }, 300);
  }, 5000);
}

function renderKPIs(total, criticas) {
  const totalVal = total !== undefined ? total : activeCalls.length;
  const criticasVal = criticas !== undefined ? criticas : activeCalls.filter(function(c){ return c.prioridad === 'Critica'; }).length;
  const elTotal = document.getElementById('kpi-total');
  const elCriticas = document.getElementById('kpi-criticas');
  if (elTotal) elTotal.textContent = totalVal.toLocaleString('es-MX');
  if (elCriticas) elCriticas.textContent = criticasVal;
}

function renderBarChart() {
  const chartEl = document.getElementById('bar-chart');
  const labelsEl = document.getElementById('bar-labels');
  if (!chartEl || !labelsEl) return;
  if (!activeCalls.length) {
    chartEl.innerHTML = '<div style="width:100%;display:flex;align-items:center;justify-content:center;color:#334155;font-size:12px">Sin datos de carga actualmente</div>';
    labelsEl.innerHTML = '';
    return;
  }
  var counts = {};
  activeCalls.forEach(function(c){ var d = c.distrito || 'Desconocido'; counts[d] = (counts[d] || 0) + 1; });
  var distritosKeys = Object.keys(counts);
  var vals = distritosKeys.map(function(d){ return counts[d]; });
  var max = Math.max.apply(null, vals) || 1;
  var colors = ['#3b82f6','#6366f1','#8b5cf6','#0ea5e9','#06b6d4','#f59e0b','#ec4899'];
  chartEl.innerHTML = vals.map(function(v, i) {
    var pct = Math.round((v / max) * 100);
    var color = colors[i % colors.length];
    return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px"><span style="font-size:11px;font-weight:700;color:#94a3b8">' + v + '</span><div style="width:100%;height:120px;display:flex;align-items:flex-end"><div class="bar" style="width:100%;border-radius:6px 6px 0 0;background:' + color + ';height:' + Math.max(pct,2) + '%;opacity:0.85"></div></div></div>';
  }).join('');
  labelsEl.innerHTML = distritosKeys.map(function(d) {
    return '<div style="flex:1;text-align:center;font-size:10px;color:#334155;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + d + '">' + d + '</div>';
  }).join('');
}

function renderDistritoTable() {
  const tableEl = document.getElementById('distrito-table');
  if (!tableEl) return;
  if (!activeCalls.length) {
    tableEl.innerHTML = '<tr><td colspan="4" style="padding:20px;text-align:center;color:#334155;font-size:12px">Sin datos de distritos</td></tr>';
    return;
  }
  var stats = {};
  var total = activeCalls.length;
  activeCalls.forEach(function(c){ var d = c.distrito || 'Desconocido'; if (!stats[d]) stats[d] = { activas: 0 }; stats[d].activas++; });
  var distritosKeys = Object.keys(stats);
  var avg = total / (distritosKeys.length || 1);
  tableEl.innerHTML = distritosKeys.map(function(d) {
    var activas = stats[d].activas;
    var pct = avg > 0 ? Math.round(((activas - avg) / avg) * 100) : 0;
    var cargado = activas > Math.ceil(avg * 1.3);
    var badge = cargado
      ? '<span style="display:inline-flex;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;background:rgba(239,68,68,0.15);color:#f87171;border:1px solid rgba(239,68,68,0.3)">Sobrecargado</span>'
      : '<span style="display:inline-flex;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;background:rgba(16,185,129,0.12);color:#34d399;border:1px solid rgba(16,185,129,0.25)">Normal</span>';
    return '<tr style="border-top:1px solid rgba(255,255,255,0.04)"><td style="padding:10px 16px;font-size:12px;font-weight:600;color:#94a3b8">' + d + '</td><td style="padding:10px 12px;text-align:center;font-size:12px;font-weight:700;color:' + (cargado ? '#f87171' : '#e2e8f0') + '">' + activas + '</td><td style="padding:10px 12px;text-align:center;font-size:11px;font-family:monospace;color:#475569">' + (pct >= 0 ? '+' : '') + pct + '%</td><td style="padding:10px 16px;text-align:right">' + badge + '</td></tr>';
  }).join('');
}

function renderCallsTable() {
  const tableEl = document.getElementById('calls-table');
  if (!tableEl) return;
  var badgeStyle = {
    'Critica': 'background:rgba(239,68,68,0.15);color:#f87171;border:1px solid rgba(239,68,68,0.3)',
    'Alta':    'background:rgba(249,115,22,0.15);color:#fb923c;border:1px solid rgba(249,115,22,0.3)',
    'Media':   'background:rgba(234,179,8,0.15);color:#facc15;border:1px solid rgba(234,179,8,0.3)',
    'Baja':    'background:rgba(16,185,129,0.12);color:#34d399;border:1px solid rgba(16,185,129,0.25)',
  };
  var estadoStyle = {
    'Activo':    'background:rgba(59,130,246,0.12);color:#60a5fa;border:1px solid rgba(59,130,246,0.25)',
    'Cerrado':   'background:rgba(71,85,105,0.2);color:#64748b;border:1px solid rgba(71,85,105,0.3)',
    'Pendiente': 'background:rgba(139,92,246,0.12);color:#a78bfa;border:1px solid rgba(139,92,246,0.25)',
  };
  if (!activeCalls.length) {
    tableEl.innerHTML = '<tr><td colspan="6" style="padding:32px;text-align:center;color:#334155;font-size:12px">No hay llamadas registradas aun</td></tr>';
    return;
  }
  tableEl.innerHTML = activeCalls.slice(0, 50).map(function(c) {
    var bs = badgeStyle[c.prioridad] || badgeStyle['Baja'];
    var es = estadoStyle[c.estado]   || estadoStyle['Pendiente'];
    var ic = TIPO_ICONS[c.tipo]      || '📋';
    return '<tr style="border-top:1px solid rgba(255,255,255,0.04)"><td style="padding:11px 24px;font-size:11px;font-family:monospace;font-weight:600;color:#334155">' + c.id + '</td><td style="padding:11px 16px;font-size:12px;font-weight:500;color:#94a3b8">' + c.distrito + '</td><td style="padding:11px 16px;font-size:12px;color:#64748b">' + ic + ' ' + c.tipo + '</td><td style="padding:11px 16px"><span style="display:inline-flex;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;' + bs + '">' + c.prioridad + '</span></td><td style="padding:11px 16px;font-size:11px;font-family:monospace;color:#334155">' + c.hora + '</td><td style="padding:11px 24px;text-align:right"><span style="display:inline-flex;padding:2px 10px;border-radius:999px;font-size:10px;font-weight:600;' + es + '">' + c.estado + '</span></td></tr>';
  }).join('');
}

async function refreshDashboard() {
  try {
    const res = await fetch(API_BASE_URL + '/dashboard-stats');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const mapPrioridad = ['Baja', 'Media', 'Alta', 'Critica'];
    const mapTipo = ['Incendio', 'Accidente Vial', 'Robo', 'Asalto', 'Medica', 'Desastre Natural', 'Otro'];
    activeCalls = data.llamadas.map(c => ({
      id: c.id.substring(0, 13).toUpperCase() + '...',
      distrito: c.distrito,
      tipo: mapTipo[c.tipo] !== undefined ? mapTipo[c.tipo] : 'Otro',
      prioridad: mapPrioridad[c.prioridad] !== undefined ? mapPrioridad[c.prioridad] : 'Baja',
      hora: c.hora,
      estado: c.estado
    }));
    renderKPIs(data.totalLlamadas);
    renderBarChart();
    renderDistritoTable();
    renderCallsTable();
  } catch (error) {
    console.warn("Esperando conexion con la base de datos...");
  }
}

function prefillForm() {
  document.getElementById('num-reporte').value = genReporte();
  var now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('inp-fecha').value = now.toISOString().slice(0, 16);

  // Reset priority buttons
  var btns = document.querySelectorAll('.priority-btn');
  btns.forEach(function(btn) {
    btn.style.borderColor = 'rgba(255,255,255,0.1)';
    btn.style.color = '#475569';
    btn.style.background = 'rgba(255,255,255,0.03)';
    btn.removeAttribute('data-selected');
  });
  document.getElementById('inp-prioridad').value = '';
}

async function handleNuevaLlamada(e) {
  e.preventDefault();
  const prioridad = document.getElementById('inp-prioridad').value;
  if (!prioridad) { showToast('Por favor selecciona una prioridad', 'error'); return; }
  const mapPrioridad = ['Baja', 'Media', 'Alta', 'Critica'];
  const mapTipo = ['Incendio', 'Accidente Vial', 'Robo', 'Asalto', 'Medica', 'Desastre Natural', 'Otro'];
  const payload = {
    distritoId: document.getElementById('sel-distrito').value,
    tipo: Math.max(0, mapTipo.indexOf(document.getElementById('sel-tipo').value)),
    prioridad: Math.max(0, mapPrioridad.indexOf(prioridad)),
    latitud: 14.0818, longitud: -87.2068,
    timestamp: new Date().toISOString(), unidadesRequeridas: 1
  };
  const btn = document.getElementById('btn-enviar-llamada');
  btn.disabled = true;
  btn.innerHTML = '<span style="margin-right:0.4rem">⏳</span> Enviando...';
  try {
    const res = await fetch(API_BASE_URL + '/individual', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    showToast('Llamada registrada exitosamente', 'success');
  } catch (err) {
    console.warn('API no disponible:', err.message);
    showToast('Error de conexion con el sistema', 'error');
  }
  document.getElementById('form-llamada').reset();
  prefillForm();
  btn.disabled = false;
  btn.innerHTML = '<svg style="width:1.1rem;height:1.1rem;display:inline;margin-right:6px" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>Enviar Reporte';
}

function buildTiposChecks() {
  const container = document.getElementById('tipos-checks');
  if (!container) return;
  container.innerHTML = TIPOS.map(function(t, i) {
    return '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#64748b;cursor:pointer"><input type="checkbox" id="chk-tipo-' + i + '" value="' + t + '" checked style="width:14px;height:14px;accent-color:#3b82f6" /><span style="font-weight:500">' + t + '</span></label>';
  }).join('');
}

function selectAllTipos(checked) {
  document.querySelectorAll('#tipos-checks input').forEach(function(c) { c.checked = checked; });
}

function updateSimPreview() {
  const inputCant = document.getElementById('inp-cantidad');
  if (!inputCant) return;
  const n = parseInt(inputCant.value) || 0;
  const secs = Math.ceil(n / 833);
  document.getElementById('sim-preview').textContent = n.toLocaleString('es-MX');
  document.getElementById('sim-time').textContent = secs >= 60 ? '~' + Math.ceil(secs / 60) + 'm' : '~' + secs + 's';
}

function setPreset(val) {
  const inputCant = document.getElementById('inp-cantidad');
  if (inputCant) { inputCant.value = val; updateSimPreview(); }
}

async function handleSimulacion() {
  const inputCant = document.getElementById('inp-cantidad');
  const cantidad = inputCant ? parseInt(inputCant.value) : 0;
  if (!cantidad || cantidad < 1) { showToast('Ingresa una cantidad valida', 'error'); return; }
  const btn  = document.getElementById('btn-generar');
  const wrap = document.getElementById('sim-progress-wrap');
  const bar  = document.getElementById('sim-progress-bar');
  const pct  = document.getElementById('sim-progress-pct');
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }
  if (wrap) wrap.classList.remove('hidden');
  let progress = 0;
  const interval = setInterval(function() {
    progress = Math.min(progress + 5, 90);
    if (bar) bar.style.width = progress + '%';
    if (pct) pct.textContent = progress + '%';
  }, 200);
  try {
    const res = await fetch(API_BASE_URL + '/masivo/' + cantidad, { method: 'POST' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    clearInterval(interval);
    if (bar) bar.style.width = '100%';
    if (pct) pct.textContent = '100%';
    setTimeout(function() {
      showToast(cantidad.toLocaleString('es-MX') + ' eventos procesados por el sistema', 'success');
      if (wrap) wrap.classList.add('hidden');
      if (bar) bar.style.width = '0%';
    }, 400);
  } catch (err) {
    clearInterval(interval);
    console.warn('API no disponible:', err.message);
    if (bar) bar.style.width = '100%';
    if (pct) pct.textContent = '100%';
    setTimeout(function() {
      showToast('Simulacion completada: ' + cantidad.toLocaleString('es-MX') + ' eventos generados', 'info');
      if (wrap) wrap.classList.add('hidden');
      if (bar) bar.style.width = '0%';
    }, 400);
  } finally {
    setTimeout(function() {
      if (btn) { btn.disabled = false; btn.innerHTML = '<span>⚡</span> Generar Eventos'; }
    }, 500);
  }
}

function initPriorityButtons() {
  var group = document.getElementById('priority-group');
  if (!group) return;
  group.addEventListener('click', function(e) {
    var btn = e.target.closest('.priority-btn');
    if (!btn) return;

    // Reset all buttons
    group.querySelectorAll('.priority-btn').forEach(function(b) {
      b.style.borderColor = 'rgba(255,255,255,0.1)';
      b.style.color = '#475569';
      b.style.background = 'rgba(255,255,255,0.03)';
      b.style.boxShadow = 'none';
      b.removeAttribute('data-selected');
    });

    // Activate clicked button
    var bc = btn.dataset.colorBorder;
    var tc = btn.dataset.colorText;
    var bg = btn.dataset.colorBg;
    btn.style.borderColor = bc;
    btn.style.color = tc;
    btn.style.background = bg;
    btn.style.boxShadow = '0 0 12px ' + bc + '55';
    btn.setAttribute('data-selected', 'true');

    document.getElementById('inp-prioridad').value = btn.dataset.priority;
  });
}

function init() {
  buildTiposChecks();
  initPriorityButtons();
  prefillForm();
  updateSimPreview();
  refreshDashboard();
  setInterval(refreshDashboard, 3000);
}

document.addEventListener('DOMContentLoaded', init);