import { enviarNotificacao } from '../api/notificacoesApi.js';
import { showToast } from '../components/toast.js';
import { showLoading, hideLoading } from '../components/loading.js';

export function initFormNotificacao() {
    const form = document.getElementById('formEnviarNotificacao');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const tipo = document.getElementById('notificacaoTipo').value.trim();
        const instituicao = document.getElementById('notificacaoInstituicao').value.trim();
        const assunto = document.getElementById('notificacaoAssunto').value.trim();
        const descricao = document.getElementById('notificacaoDescricao').value.trim();
        if (!assunto || !descricao) {
            showToast('Preencha assunto e descrição.', 'warning');
            return;
        }
        const btn = form.querySelector('button[type="submit"]');
        showLoading(btn);
        try {
            await enviarNotificacao({ tipo, instituicao, assunto, descricao });
            showToast('Notificação enviada com sucesso!', 'success');
            form.reset();
        } catch (error) {
            showToast('Erro ao enviar notificação.', 'error');
        } finally {
            hideLoading(btn);
        }
    });
}
