import { listarNotificacoes } from '../api/notificacoesApi.js';
import { showToast } from '../components/toast.js';
import { showLoading, hideLoading } from '../components/loading.js';

export async function carregarNotificacoesDashboard(limite = 5) {
    const container = document.getElementById('notificacoesContainer');
    if (!container) {
        console.warn('Elemento #notificacoesContainer não encontrado.');
        return;
    }
    showLoading(container);
    try {
        const notificacoes = await listarNotificacoes(limite);
        if (!notificacoes || notificacoes.length === 0) {
            container.innerHTML = `<div class="text-muted text-center py-3"><i class="fas fa-bell-slash"></i> Nenhuma notificação recente.</div>`;
            return;
        }
        container.innerHTML = `<ul class="notificacoes-lista">${notificacoes.map(n => `
            <li class="notificacao-item">
                <div class="titulo"><span class="tipo-badge">${n.tipo || 'Geral'}</span> <strong>${n.assunto}</strong></div>
                <div class="subtitulo"><span>${n.instituicao}</span> <span class="data">${new Date(n.createdAt).toLocaleDateString('pt-BR')}</span></div>
                <div class="descricao">${n.descricao}</div>
            </li>
        `).join('')}</ul>`;
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger">Erro ao carregar notificações.</div>`;
        showToast('Erro ao carregar notificações', 'error');
    } finally {
        hideLoading(container);
    }
}
