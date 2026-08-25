import { apiClient } from '../api.js';

export async function listarNotificacoes(limite = 10) {
    try {
        const response = await apiClient.get('/notificacoes', { params: { limite } });
        return response.data;
    } catch (error) {
        console.error('Erro ao listar notificações:', error);
        throw error;
    }
}

export async function enviarNotificacao(dados) {
    try {
        const response = await apiClient.post('/notificacoes', dados);
        return response.data;
    } catch (error) {
        console.error('Erro ao enviar notificação:', error);
        throw error;
    }
}
