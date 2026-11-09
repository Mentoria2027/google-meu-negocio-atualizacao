const form = document.getElementById('form-business');
const list = document.getElementById('business-list');
const filterStatus = document.getElementById('filter-status');
const filterCidade = document.getElementById('filter-cidade');

const statusLabels = {
  novo: 'Novo',
  contatado: 'Contatado',
  respondeu: 'Respondeu',
  interessado: 'Interessado',
  cliente: 'Cliente',
  nao_quero: 'Não quero'
};

async function fetchBusinesses() {
  const params = new URLSearchParams();

  if (filterStatus.value) params.append('status', filterStatus.value);
  if (filterCidade.value.trim()) params.append('cidade', filterCidade.value.trim());

  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`/api/businesses${query}`);
  const businesses = await response.json();
  renderBusinesses(businesses);
}

async function fetchStats() {
  const response = await fetch('/api/stats');
  const stats = await response.json();
  document.getElementById('stat-total').textContent = stats.total || 0;
  document.getElementById('stat-novo').textContent = stats.novo || 0;
  document.getElementById('stat-interessado').textContent = stats.interessado || 0;
  document.getElementById('stat-cliente').textContent = stats.cliente || 0;
}

function renderBusinesses(businesses) {
  if (!businesses.length) {
    list.innerHTML = '<tr><td colspan="7">Nenhum comércio cadastrado.</td></tr>';
    return;
  }

  list.innerHTML = businesses.map((business) => {
    const whatsapp = business.whatsapp ? `https://wa.me/${business.whatsapp.replace(/\D/g, '')}` : '';
    const website = business.website ? `<a href="${business.website}" target="_blank" rel="noreferrer">Site</a>` : '—';

    return `
      <tr>
        <td>
          <strong>${business.nome}</strong><br />
          ${business.endereco || 'Sem endereço'}
        </td>
        <td>${business.categoria || '—'}</td>
        <td>${business.cidade || '—'}</td>
        <td>
          ${whatsapp ? `<a href="${whatsapp}" target="_blank" rel="noreferrer">WhatsApp</a>` : '—'}
        </td>
        <td><span class="badge">${statusLabels[business.status] || business.status}</span></td>
        <td>${business.valor || '—'}</td>
        <td>
          <div class="action-group">
            <button class="action-button secondary" data-action="edit" data-id="${business.id}">Editar</button>
            <button class="action-button danger" data-action="delete" data-id="${business.id}">Excluir</button>
            ${whatsapp ? `<button class="action-button" data-action="whatsapp" data-id="${business.id}">Enviar</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());

  const response = await fetch('/api/businesses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (response.ok) {
    form.reset();
    fetchBusinesses();
    fetchStats();
  } else {
    const error = await response.json();
    alert(error.error || 'Erro ao salvar comércio.');
  }
});

list.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  const id = Number(button.dataset.id);
  const action = button.dataset.action;

  if (action === 'delete') {
    const confirmed = confirm('Deseja remover esse comércio?');
    if (!confirmed) return;

    await fetch(`/api/businesses/${id}`, { method: 'DELETE' });
    fetchBusinesses();
    fetchStats();
    return;
  }

  if (action === 'whatsapp') {
    const business = await getBusinessById(id);
    if (!business || !business.whatsapp) return;

    const message = encodeURIComponent(
      `Olá! Encontrei o perfil da ${business.nome} e vi que vocês ainda podem melhorar a presença online. Posso ajudar com atualização do perfil no Google e criação de um site simples. Gostaria de saber mais?`
    );

    window.open(`https://wa.me/${business.whatsapp.replace(/\D/g, '')}?text=${message}`, '_blank');
    return;
  }

  if (action === 'edit') {
    const business = await getBusinessById(id);
    if (!business) return;

    const fields = form.elements;
    for (const field of fields) {
      if (!field.name) continue;
      if (business[field.name] !== undefined) {
        field.value = business[field.name] || '';
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

filterStatus.addEventListener('change', fetchBusinesses);
filterCidade.addEventListener('input', fetchBusinesses);

async function getBusinessById(id) {
  const response = await fetch('/api/businesses');
  const businesses = await response.json();
  return businesses.find((item) => item.id === id);
}

fetchBusinesses();
fetchStats();
