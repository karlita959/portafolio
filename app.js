const sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LABEL = { project: 'Proyecto', award: 'Reconocimiento' };
const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { year: 'numeric', month: 'long' }) : '';
let items = [], filter = 'all';

function toast(msg, isErr) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show' + (isErr ? ' err' : '');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.className = 'toast', 3200);
}

function renderGrid() {
  const list = items.filter(i => filter === 'all' || i.type === filter);
  $('#empty').hidden = items.length > 0;
  $('#grid').innerHTML = list.map((it, idx) => `
    <article class="card" style="--i:${idx}" data-id="${esc(it.id)}">
      <div class="thumb">${it.image ? `<img src="${esc(it.image)}" alt="" loading="lazy">` : ''}</div>
      <div class="body">
        <span class="badge">${LABEL[it.type] || ''}</span>
        <h3>${esc(it.title)}</h3>
        <p>${esc(it.description)}</p>
        <div class="meta">${fmtDate(it.date)}</div>
      </div>
    </article>`).join('');
}

function renderActions(p) {
  const parts = [];
  if (p.email) parts.push(`<a class="btn" href="mailto:${esc(p.email)}?subject=${encodeURIComponent('Contacto desde tu portafolio')}">Contactar</a>`);
  if (p.cv_url) parts.push(`<a class="btn outline" href="${esc(p.cv_url)}" download="${esc(p.cv_name || 'CV.pdf')}">Descargar CV</a>`);
  $('#actions').innerHTML = parts.join('');
}

function openItem(id) {
  const it = items.find(i => i.id === id);
  if (!it) return;
  $('#modalBody').innerHTML = `
    ${it.image ? `<img src="${esc(it.image)}" alt="">` : ''}
    <div class="dbody">
      <span class="badge">${LABEL[it.type] || ''}</span>
      <h2>${esc(it.title)}</h2>
      <div class="meta">${fmtDate(it.date)}</div>
      <p>${esc(it.description)}</p>
      ${it.link ? `<p><a href="${esc(it.link)}" target="_blank" rel="noopener" style="color:var(--accent);font-weight:600">Ver más →</a></p>` : ''}
    </div>`;
  $('#modal').showModal();
}

async function load() {
  const [profile, rows] = await Promise.all([
    sb.from('profile').select('*').eq('id', 1).single(),
    sb.from('items').select('*').order('created_at', { ascending: false }),
  ]);
  if (rows.error) return toast('No se pudo cargar el portafolio', true);
  items = rows.data;
  renderActions(profile.data || {});
  renderGrid();
}

document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
  document.querySelectorAll('.chip').forEach(x => x.classList.toggle('active', x === c));
  filter = c.dataset.filter;
  renderGrid();
}));
$('#grid').addEventListener('click', e => {
  const card = e.target.closest('.card');
  if (card) openItem(card.dataset.id);
});
$('#closeModal').addEventListener('click', () => $('#modal').close());
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') $('#modal').close(); });

load();
sb.auth.getSession().then(({ data: { session } }) => {
  $('#adminLink').hidden = !session;
});
