import { enviarNotificacao, listarNotificacoes } from '../api/notificacoesApi.js';
import toast from '../components/toast.js';
import { loading } from '../components/loading.js';

function fecharModalMensagem() {
    const modal = document.getElementById('modalEnviarMensagem');
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('ativo', 'aberto', 'show');
}

function abrirModalMensagem() {
    const modal = document.getElementById('modalEnviarMensagem');
    if (!modal) return;
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('ativo', 'aberto', 'show');
    const assunto = document.getElementById('notificacaoAssunto');
    if (assunto) {
        setTimeout(() => assunto.focus(), 50);
    }
}

export function initFormNotificacao() {
    const form = document.getElementById('formEnviarNotificacao');
    if (!form) return;

    const btnAbrir = document.getElementById('btnNovaMensagemInstituicao');
    const btnFechar = document.getElementById('btnFecharModalMensagem');
    const btnCancelar = document.getElementById('btnCancelarMensagem');

    if (btnAbrir) {
        btnAbrir.addEventListener('click', abrirModalMensagem);
    }

    if (btnFechar) {
        btnFechar.addEventListener('click', fecharModalMensagem);
    }

    if (btnCancelar) {
        btnCancelar.addEventListener('click', fecharModalMensagem);
    }

    const modal = document.getElementById('modalEnviarMensagem');
    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                fecharModalMensagem();
            }
        });
    }

    async function renderThread() {
        const threadEl = document.getElementById('notificacaoThread');
        if (!threadEl) return;
        threadEl.innerHTML = '';

        // identificar usuário/instituição corrente: primeiro por id, depois por email
        const userIdEl = document.getElementById('instituicaoId') || document.querySelector('[data-instituicao-id]') || document.querySelector('.usuario-info [data-id]');
        const userId = userIdEl?.value || userIdEl?.dataset?.instituicaoId || userIdEl?.dataset?.id || null;
        const userEmail = document.getElementById('emailUsuario')?.textContent?.trim() || document.querySelector('.usuario-info small')?.textContent?.trim();
        try {
            const notas = await listarNotificacoes(50) || [];
            const relacionados = notas.filter(n => {
                if (userId && (String(n.instituicaoId) === String(userId) || String(n.remetenteId) === String(userId) || String(n.destinatarioId) === String(userId))) return true;
                return String(n.destinatario) === String(userEmail) || String(n.remetente) === String(userEmail) || String(n.instituicao) === String(userEmail);
            });

            if (!relacionados || relacionados.length === 0) {
                threadEl.innerHTML = `<div class="notificacoes-vazio"><div class="notificacoes-vazio-icone"><i class="fa-solid fa-envelope-open-text"></i></div><strong>Nenhuma conversa</strong><span>Aqui aparecerão as respostas do Administrador.</span></div>`;
                return;
            }

            relacionados.slice(0,10).reverse().forEach(m => {
                const isUsuario = (String(m.remetenteId) === String(userId) || (!m.remetenteId && String(m.remetente).includes(userEmail)));
                const senderName = isUsuario ? (m.remetente || m.instituicao || m.destinatario) : (m.remetente || m.instituicao || m.destinatario);
                const hora = new Date(m.data || m.criadoEm || m.lidaEm || Date.now()).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
                const bubble = document.createElement('div');
                // institution messages should be left/blue, admin right/brown
                bubble.className = 'mensagem-bubble ' + (isUsuario ? 'bubble-left' : 'bubble-right');
                // rely on CSS classes for colors/align; keep minimal spacing
                bubble.style.margin = '8px 10px';
                bubble.style.borderRadius = '8px';
                bubble.style.padding = '8px';
                bubble.innerHTML = `
                    <div class="mensagem-topo" style="font-size:0.9rem;opacity:0.9;"><strong>${escapar(senderName || '')}</strong><span class="mensagem-hora" style="float:right;font-size:0.8rem;opacity:0.7">${hora}</span></div>
                    <div class="mensagem-corpo" style="margin-top:6px;">${escapar(m.descricao || m.mensagem || '')}</div>
                `;
                threadEl.appendChild(bubble);
            });
        } catch (e) {
            threadEl.innerHTML = `<div class="text-muted">Falha ao carregar histórico de mensagens.</div>`;
        }
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const assunto = document.getElementById('notificacaoAssunto')?.value.trim();
        const descricao = document.getElementById('notificacaoDescricao')?.value.trim();

        if (!assunto || !descricao) {
            toast.aviso('Preencha assunto e descrição para continuar.');
            return;
        }

        // tentar incluir identificador da instituição/remetente para threading
        const userIdEl2 = document.getElementById('instituicaoId') || document.querySelector('[data-instituicao-id]') || document.querySelector('.usuario-info [data-id]');
        const userId2 = userIdEl2?.value || userIdEl2?.dataset?.instituicaoId || userIdEl2?.dataset?.id || null;

        const payload = {
            tipo: 'MENSAGEM',
            destinatario: 'Administrador Geral',
            destinatarioId: null,
            instituicao: document.querySelector('.usuario-info strong')?.textContent?.trim() || null,
            instituicaoId: userId2,
            remetente: document.querySelector('.usuario-info strong')?.textContent?.trim() || null,
            remetenteId: userId2,
            assunto,
            descricao,
            mensagem: descricao
        };

        loading.mostrar({
            titulo: 'Enviando mensagem',
            mensagem: 'Aguarde enquanto a comunicação é registrada.'
        });

        try {
            const resposta = await enviarNotificacao(payload);

            const notificacao = {
                instituicao: payload.instituicao || 'Administrador Geral',
                assunto: payload.assunto,
                descricao: payload.descricao,
                data: new Date().toISOString(),
                lida: false
            };

            window.dispatchEvent(new CustomEvent('solidare:notificacao', {
                detail: notificacao
            }));

            toast.sucesso(
                resposta?.mock
                    ? 'Mensagem registrada com sucesso no painel do sistema.'
                    : 'Mensagem enviada com sucesso!'
            );
            form.reset();
            fecharModalMensagem();
            // atualizar thread para mostrar mensagem enviada
            try { await renderThread(); } catch(e) {}
        } catch (error) {
            toast.erro(error.message || 'Erro ao enviar a mensagem.');
        } finally {
            loading.ocultar({ forcar: true });
        }
    });

    // when opening modal, load thread using existing `btnAbrir` listener
    if (btnAbrir) {
        btnAbrir.addEventListener('click', () => {
            setTimeout(() => { renderThread().catch(()=>{}); }, 120);
        });
    }
}
