let state = {clients: [], tasks: []};
const $ = id => document.getElementById(id);
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path, payload) {
  const response = await fetch(path, payload ? {method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)} : {});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Une erreur est survenue');
  return result;
}
function report(error) { $('message').textContent = error.message; }
function render() {
  const active = state.tasks.filter(t => !t.done);
  $('metrics').innerHTML = [['Contacts',state.clients.length],['Prospects',state.clients.filter(c=>c.status !== 'Client').length],['Tâches ouvertes',active.length]].map(([label,value])=>`<div class="metric"><span>${label}</span><strong>${value}</strong></div>`).join('');
  const query = $('search').value.toLocaleLowerCase();
  const clients = state.clients.filter(c=>[c.name,c.company,c.email,c.notes].some(v=>v.toLocaleLowerCase().includes(query)));
  $('client-list').innerHTML = clients.map(c=>`<tr><td><strong>${escapeHTML(c.name)}</strong><small>${escapeHTML(c.email)}</small></td><td>${escapeHTML(c.company) || '—'}</td><td><span class="badge">${escapeHTML(c.status)}</span></td><td>${escapeHTML(c.notes) || '—'}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">Aucun contact. Ajoutez votre premier prospect.</td></tr>';
  $('task-list').innerHTML = state.tasks.map(t=>`<label class="task"><input type="checkbox" data-id="${t.id}" ${t.done?'checked':''}><span class="${t.done?'done':''}">${escapeHTML(t.title)}<small>${escapeHTML(t.due) || 'Sans échéance'}</small></span></label>`).join('') || '<p class="empty">Vos prochaines actions apparaîtront ici.</p>';
}
async function refresh() { state = await api('/api/state'); render(); }
for (const [form,route] of [['client-form','clients'],['task-form','tasks']]) {
  $(form).addEventListener('submit',async event=>{
    event.preventDefault(); const button = event.target.querySelector('button'); button.disabled = true;
    try { await api('/api/'+route,Object.fromEntries(new FormData(event.target))); event.target.reset(); await refresh(); $('message').textContent = 'Enregistrement effectué.'; $('agent-result').textContent = ''; }
    catch(error) { report(error); } finally { button.disabled = false; }
  });
}
$('search').addEventListener('input',render);
$('task-list').addEventListener('change',async event=>{ if (!event.target.dataset.id) return; try { await api('/api/tasks/toggle',{id:Number(event.target.dataset.id)}); await refresh(); $('agent-result').textContent = ''; } catch(error) { report(error); await refresh().catch(report); } });
$('analyze').addEventListener('click',async()=>{
  $('analyze').disabled = true;
  try { const result = await api('/api/agent',{}); $('agent-result').innerHTML = `<p><strong>${escapeHTML(result.summary)}</strong></p><ul>${result.suggestions.map(s=>`<li>${escapeHTML(s)}</li>`).join('')}</ul>${result.draft?`<h4>Brouillon de relance à revoir</h4><blockquote>${escapeHTML(result.draft)}</blockquote>`:''}`; }
  catch(error) { report(error); } finally { $('analyze').disabled = false; }
});
$('organize').addEventListener('click',async()=>{
  $('organize').disabled = true;
  try { const result = await api('/api/agent/organize',{}); await refresh(); $('agent-result').textContent = result.summary; }
  catch(error) { report(error); } finally { $('organize').disabled = false; }
});
refresh().catch(report);
