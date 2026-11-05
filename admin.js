const sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LABEL = { project: 'Proyecto', award: 'Reconocimiento' };

function toast(msg, isErr) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show' + (isErr ? ' err' : '');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.className = 'toast', 3200);
}

function showPanel(on) {
  $('#login').hidden = on;
  $('#panel').hidden = !on;
  $('#logout').hidden = !on;
}

async function loadAll() {
  const [profile, rows] = await Promise.all([
    sb.from('profile').select('*').eq('id', 1).single(),
    sb.from('items').select('*').order('created_at', { ascending: false }),
  ]);
  if (profile.data) {
    const p = profile.data;
    $('#profileForm [name="name"]').value = p.name || '';
    $('#profileForm [name="email"]').value = p.email || '';
    $('#cvStatus').textContent = p.cv_name ? 'CV actual: ' + p.cv_name : 'Aún no hay CV cargado';
  }
  $('#list').innerHTML = (rows.data || []).map(it => `
    <div class="row" data-id="${esc(it.id)}">
      <div class="info"><b>${esc(it.title)}</b><small>${LABEL[it.type] || ''} · ${it.date || 'Sin fecha'}</small></div>
      <button class="btn danger" data-del="${esc(it.id)}">Eliminar</button>
    </div>`).join('') || '<div class="empty">Aún no hay elementos.</div>';
}

// Sesión
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const { error } = await sb.auth.signInWithPassword({ email: f.get('email'), password: f.get('password') });
  if (error) return toast('Correo o contraseña incorrectos', true);
  init();
});
$('#logout').addEventListener('click', async () => { await sb.auth.signOut(); showPanel(false); });

// Perfil
$('#profileForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.disabled = true;
  try {
    const { data: cur } = await sb.from('profile').select('*').eq('id', 1).single();
    let cv_url = cur?.cv_url || null, cv_name = cur?.cv_name || null;
    const file = $('#cvFile').files[0];
    if (file) {
      const path = `cv/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      const { error } = await sb.storage.from('portfolio').upload(path, file);
      if (error) throw error;
      cv_url = sb.storage.from('portfolio').getPublicUrl(path).data.publicUrl;
      cv_name = file.name;
    }
    const { error } = await sb.from('profile').upsert({
      id: 1,
      name: e.target.querySelector('[name="name"]').value.trim(),
      email: e.target.querySelector('[name="email"]').value.trim(),
      cv_url, cv_name,
    });
    if (error) throw error;
    $('#cvFile').value = '';
    toast('Perfil guardado');
    loadAll();
  } catch (err) {
    toast(err.message || 'Error al guardar', true);
  } finally {
    btn.disabled = false;
  }
});

// Elementos
$('#itemForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const btn = $('#saveBtn');
  btn.disabled = true;
  btn.textContent = 'Publicando…';
  try {
    let image = (f.get('imageUrl') || '').trim();
    const file = $('#imageFile').files[0];
    if (file) {
      const path = `img/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      const { error } = await sb.storage.from('portfolio').upload(path, file);
      if (error) throw error;
      image = sb.storage.from('portfolio').getPublicUrl(path).data.publicUrl;
    }
    const { error } = await sb.from('items').insert({
      type: f.get('type'),
      title: f.get('title').trim(),
      description: (f.get('description') || '').trim(),
      date: f.get('date') || null,
      link: (f.get('link') || '').trim() || null,
      image: image || null,
    });
    if (error) throw error;
    e.target.reset();
    $('#imageFile').value = '';
    toast('Publicado');
    loadAll();
  } catch (err) {
    toast(err.message || 'Error al publicar', true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Publicar';
  }
});

$('#list').addEventListener('click', async e => {
  const btn = e.target.closest('[data-del]');
  if (!btn) return;
  if (btn.dataset.armed !== '1') {
    btn.dataset.armed = '1';
    btn.textContent = '¿Confirmar?';
    setTimeout(() => { btn.dataset.armed = ''; btn.textContent = 'Eliminar'; }, 3000);
    return;
  }
  const { error } = await sb.from('items').delete().eq('id', btn.dataset.del);
  if (error) return toast('No se pudo eliminar', true);
  toast('Eliminado');
  loadAll();
});

async function init() {
  const { data: { session } } = await sb.auth.getSession();
  showPanel(!!session);
  if (session) loadAll();
}
init();