const state = {
  token: localStorage.getItem('northstar_token'),
  user: JSON.parse(localStorage.getItem('northstar_user') || 'null'),
  tickets: [],
  selectedId: null,
  assignees: [],
  authMode: 'login',
  loginRole: location.pathname.startsWith('/admin') ? 'admin' : 'user',
};

const $ = (selector) => document.querySelector(selector);
const api = async (path, options = {}) => {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    throw new Error(data?.error || data?.errors?.map((item) => item.msg).join(', ') || 'Something went wrong');
  }
  return data;
};
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
const initials = (name = '') => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
const formatStatus = (status) => status.replace('_', ' ');
const formatDate = (date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const isOperations = () => ['admin', 'agent'].includes(state.user?.role);

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  setTimeout(() => element.classList.remove('show'), 2800);
}
function persistSession(data) {
  state.token = data.token;
  state.user = data.user;
  localStorage.setItem('northstar_token', state.token);
  localStorage.setItem('northstar_user', JSON.stringify(state.user));
}
function logout() {
  localStorage.removeItem('northstar_token');
  localStorage.removeItem('northstar_user');
  location.reload();
}
function setAuthMode(mode) {
  state.authMode = mode;
  document.querySelectorAll('[data-auth-mode]').forEach((tab) => tab.classList.toggle('active', tab.dataset.authMode === mode));
  $('.register-only').classList.toggle('hidden', mode !== 'register');
  $('#auth-submit-label').textContent = mode === 'login' ? 'Enter cockpit' : 'Create account';
  $('#auth-error').textContent = '';
}
function configureAuthPage() {
  const isAdminLogin = state.loginRole === 'admin';
  document.body.classList.toggle('admin-login', isAdminLogin);
  $('.eyebrow').textContent = isAdminLogin ? 'NORTHSTAR OPERATIONS / 02' : 'NORTHSTAR SUPPORT / 01';
  $('.art-copy p').innerHTML = isAdminLogin ? 'Keep every request<br /><strong>in motion.</strong>' : 'Make every customer<br /><strong>feel found.</strong>';
  $('.art-footer').innerHTML = isAdminLogin ? 'INTERNAL CONTROL ROOM<br />FOR TEAMS THAT CARE' : 'TICKET OPERATIONS<br />FOR TEAMS THAT CARE';
  $('#auth-kicker').textContent = isAdminLogin ? 'Admin console' : 'Customer portal';
  $('#auth-title').innerHTML = isAdminLogin ? 'Run the queue<br /><em>with intent.</em>' : 'Bring your issue<br /><em>into focus.</em>';
  $('#auth-copy').textContent = isAdminLogin
    ? 'Review every request, keep customers moving, and close the loop.'
    : 'Raise a ticket, follow its progress, and keep the conversation in one place.';
  document.querySelector('[data-auth-mode="register"]').classList.toggle('hidden', isAdminLogin);
  if (isAdminLogin) setAuthMode('login');
}
function configureWorkspace() {
  const operations = isOperations();
  $('#workspace-nav-label').textContent = operations ? 'Operations queue' : 'My requests';
  $('#new-ticket-nav-label').textContent = operations ? 'Log customer ticket' : 'New ticket';
  $('#workspace-kicker').textContent = operations ? 'OPERATIONS WORKSPACE / LIVE QUEUE' : 'CUSTOMER WORKSPACE / TICKETS';
  $('#workspace-heading').innerHTML = operations ? 'Good morning, <span id="greeting-name">' + escapeHtml(state.user.name.split(' ')[0]) + '</span>.' : 'Good morning, <span id="greeting-name">' + escapeHtml(state.user.name.split(' ')[0]) + '</span>.';
  $('#overview-title').textContent = operations ? 'Queue overview' : 'My ticket overview';
  $('#overview-copy').textContent = operations ? 'Prioritize, assign, and keep every request moving.' : 'Stay close to the conversations that matter.';
  $('#new-ticket-button').innerHTML = operations ? '<span>＋</span> Log ticket' : '<span>＋</span> New ticket';
}
async function bootDashboard() {
  $('#auth-screen').classList.add('hidden');
  $('#dashboard').classList.remove('hidden');
  $('#user-name').textContent = state.user.name;
  $('#user-role').textContent = state.user.role;
  $('#user-avatar').textContent = initials(state.user.name);
  configureWorkspace();
  if (isOperations()) {
    try { state.assignees = (await api('/assignees')).users; } catch (error) { toast(error.message); }
  }
  loadTickets();
}
async function loadTickets() {
  const query = new URLSearchParams();
  const search = $('#search-input').value.trim();
  if (search) query.set('search', search);
  if ($('#status-filter').value) query.set('status', $('#status-filter').value);
  if ($('#priority-filter').value) query.set('priority', $('#priority-filter').value);
  try {
    const data = await api(`/tickets${query.toString() ? `?${query}` : ''}`);
    state.tickets = data.tickets;
    renderTickets();
  } catch (error) {
    if (error.message.toLowerCase().includes('token')) logout(); else toast(error.message);
  }
}
function renderTickets() {
  $('#results-label').textContent = `${state.tickets.length} result${state.tickets.length === 1 ? '' : 's'}`;
  $('#nav-count').textContent = state.tickets.length;
  $('#metric-total').textContent = state.tickets.length;
  $('#metric-open').textContent = state.tickets.filter((ticket) => ['OPEN', 'IN_PROGRESS'].includes(ticket.status)).length;
  $('#metric-resolved').textContent = state.tickets.filter((ticket) => ['RESOLVED', 'CLOSED'].includes(ticket.status)).length;
  $('#empty-state').classList.toggle('hidden', state.tickets.length > 0);
  $('#ticket-list').innerHTML = state.tickets.map((ticket) => `<article class="ticket-row ${ticket.id === state.selectedId ? 'selected' : ''}" data-ticket-id="${ticket.id}"><div class="ticket-id">#${String(ticket.id).padStart(3, '0')}</div><div><h4>${escapeHtml(ticket.title)}</h4><p>${escapeHtml(ticket.description)}</p>${isOperations() && ticket.assignee ? `<small class="assignee-line">Assigned to ${escapeHtml(ticket.assignee.name)}</small>` : ''}</div><div class="row-meta"><span class="status-pill ${ticket.status.toLowerCase().split('_')[0]}">${formatStatus(ticket.status)}</span><span class="priority-dot ${ticket.priority.toLowerCase()}">${ticket.priority}</span><small class="comment-count">${ticket.commentCount || 0} note${ticket.commentCount === 1 ? '' : 's'}</small></div></article>`).join('');
  document.querySelectorAll('[data-ticket-id]').forEach((row) => row.addEventListener('click', () => selectTicket(Number(row.dataset.ticketId))));
}
async function selectTicket(id) {
  state.selectedId = id;
  renderTickets();
  $('#detail-panel').innerHTML = '<div class="detail-placeholder"><span>...</span><p>Loading conversation.</p></div>';
  try { const data = await api(`/tickets/${id}`); renderDetail(data.ticket, data.comments, data.history); } catch (error) { $('#detail-panel').innerHTML = `<div class="detail-placeholder"><p>${escapeHtml(error.message)}</p></div>`; }
}
function renderDetail(ticket, comments, history = []) {
  const assigneeOptions = state.assignees.map((assignee) => `<option value="${assignee.id}">${escapeHtml(assignee.name)} / ${assignee.role}</option>`).join('');
  const assignment = isOperations() ? `<label class="detail-control">ASSIGN TO<select id="assignee-select"><option value="">Unassigned</option>${assigneeOptions}</select></label>` : '';
  const canDelete = state.user.role === 'admin' || ticket.createdBy === state.user.id;
  const adminEditor = state.user.role === 'admin' ? `<form class="ticket-editor" id="ticket-editor"><label>SUBJECT<input name="title" value="${escapeHtml(ticket.title)}" required /></label><label>DETAILS<textarea name="description" rows="3" required>${escapeHtml(ticket.description)}</textarea></label><label>CATEGORY<select name="category">${['Account', 'Billing', 'Technical', 'Access', 'Feature request', 'General'].map((category) => `<option>${category}</option>`).join('')}</select></label><label>PRIORITY<select name="priority"><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option><option value="URGENT">Urgent</option></select></label><button class="secondary-button" type="submit">Save ticket</button></form>` : '';
  const statusControl = isOperations() ? `<label class="detail-control">STATUS<select id="status-select"><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="PENDING">Pending</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option></select></label>` : `<span class="detail-status-note">Status is managed by support</span>`;
  const timeline = history.map((item) => `<div class="history-item"><span class="history-dot"></span><div><b>${item.previousStatus ? `Status changed to ${formatStatus(item.newStatus)}` : 'Ticket created'}</b><small>${escapeHtml(item.changedBy.name)} · ${formatDate(item.changedAt)}</small></div></div>`).join('');
  $('#detail-panel').innerHTML = `<div class="detail-header"><span class="status-pill ${ticket.status.toLowerCase().split('_')[0]}">${formatStatus(ticket.status)}</span><h3>${escapeHtml(ticket.title)}</h3><p class="detail-desc">${escapeHtml(ticket.description)}</p><p class="ticket-meta">${escapeHtml(ticket.category || 'General')} · ${ticket.priority} · Updated ${formatDate(ticket.updatedAt)}</p>${adminEditor}<div class="detail-actions">${statusControl}${assignment}${canDelete ? '<button class="danger-button" id="delete-ticket">Delete</button>' : ''}</div></div><div class="timeline"><h4>Update history</h4>${timeline || '<p class="muted">No updates yet.</p>'}</div><div class="comments"><h4>Conversation / ${comments.length} note${comments.length === 1 ? '' : 's'}</h4>${comments.map((comment) => `<div class="comment"><b>${escapeHtml(comment.author.name)}</b><time>${formatDate(comment.createdAt)}</time><p>${escapeHtml(comment.body)}</p></div>`).join('') || '<p class="muted">No notes yet.</p>'}<form class="comment-form" id="comment-form"><input name="body" placeholder="Add a note..." required /><button type="submit">Send</button></form></div>`;
  if ($('#ticket-editor')) { $('#ticket-editor').elements.category.value = ticket.category || 'General'; $('#ticket-editor').elements.priority.value = ticket.priority; $('#ticket-editor').addEventListener('submit', updateTicket); }
  if ($('#status-select')) { $('#status-select').value = ticket.status; $('#status-select').addEventListener('change', async (event) => { try { await api(`/tickets/${ticket.id}/status`, { method: 'PUT', body: JSON.stringify({ status: event.target.value }) }); toast('Progress updated'); await loadTickets(); await selectTicket(ticket.id); } catch (error) { event.target.value = ticket.status; toast(error.message); } }); }
  if ($('#assignee-select')) { $('#assignee-select').value = ticket.assignedTo || ''; $('#assignee-select').addEventListener('change', async (event) => { if (!event.target.value) return; try { await api(`/tickets/${ticket.id}/assign`, { method: 'PUT', body: JSON.stringify({ assigneeId: event.target.value }) }); toast('Ticket assigned'); await loadTickets(); await selectTicket(ticket.id); } catch (error) { toast(error.message); } }); }
  $('#comment-form').addEventListener('submit', addComment);
  if ($('#delete-ticket')) $('#delete-ticket').addEventListener('click', () => deleteTicket(ticket.id));
}
async function updateTicket(event) { event.preventDefault(); const form = new FormData(event.target); try { await api(`/tickets/${state.selectedId}`, { method: 'PUT', body: JSON.stringify({ title: form.get('title'), description: form.get('description'), category: form.get('category'), priority: form.get('priority') }) }); toast('Ticket updated'); await loadTickets(); await selectTicket(state.selectedId); } catch (error) { toast(error.message); } }
async function addComment(event) { event.preventDefault(); try { await api(`/tickets/${state.selectedId}/comments`, { method: 'POST', body: JSON.stringify({ body: new FormData(event.target).get('body') }) }); event.target.reset(); toast('Note added'); await selectTicket(state.selectedId); } catch (error) { toast(error.message); } }
async function deleteTicket(id) { if (!confirm('Delete this ticket?')) return; try { await api(`/tickets/${id}`, { method: 'DELETE' }); state.selectedId = null; $('#detail-panel').innerHTML = '<div class="detail-placeholder"><span>↗</span><p>Select a ticket<br />to see the full story.</p></div>'; toast('Ticket deleted'); await loadTickets(); } catch (error) { toast(error.message); } }
function openModal() { $('#ticket-modal').classList.remove('hidden'); $('#ticket-form').reset(); $('#ticket-error').textContent = ''; }
function closeModal() { $('#ticket-modal').classList.add('hidden'); }
async function createTicket(event) { event.preventDefault(); const form = new FormData(event.target); try { const data = await api('/tickets', { method: 'POST', body: JSON.stringify({ title: form.get('title'), description: form.get('description'), category: form.get('category'), priority: form.get('priority') }) }); closeModal(); toast('Ticket created'); await loadTickets(); await selectTicket(data.ticket.id); } catch (error) { $('#ticket-error').textContent = error.message; } }
$('#auth-form').addEventListener('submit', async (event) => { event.preventDefault(); const form = new FormData(event.target); const payload = { email: form.get('email'), password: form.get('password') }; if (state.authMode === 'register') payload.name = form.get('name'); else payload.role = state.loginRole; try { const data = await api(state.authMode === 'login' ? '/login' : '/register', { method: 'POST', body: JSON.stringify(payload) }); persistSession(data); bootDashboard(); } catch (error) { $('#auth-error').textContent = error.message; } });
document.querySelectorAll('[data-auth-mode]').forEach((tab) => tab.addEventListener('click', () => setAuthMode(tab.dataset.authMode)));
$('#logout-button').addEventListener('click', logout); $('#new-ticket-button').addEventListener('click', openModal); $('#new-ticket-nav').addEventListener('click', openModal); $('#ticket-form').addEventListener('submit', createTicket); document.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', closeModal)); $('#ticket-modal').addEventListener('click', (event) => { if (event.target.id === 'ticket-modal') closeModal(); }); $('#status-filter').addEventListener('change', loadTickets); $('#priority-filter').addEventListener('change', loadTickets); let searchTimer; $('#search-input').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(loadTickets, 250); });
configureAuthPage();
if (state.token && state.user && state.user.role !== state.loginRole && !(state.loginRole === 'user' && state.user.role === 'agent')) {
  localStorage.removeItem('northstar_token');
  localStorage.removeItem('northstar_user');
  state.token = null;
  state.user = null;
}
if (state.token && state.user) bootDashboard();
