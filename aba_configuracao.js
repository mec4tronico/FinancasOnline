// ============================================================
// IMPORTAÇÕES (ATUALIZADAS)
// ============================================================

import { atualizarFIIs as atualizarBasico } from "./atualizar.js"; // Script antigo (básico)
import { atualizarFIIs } from "./atualizarfiis.js"; // Novo (colunas exclusivas de FIIs)
import { atualizarAcoes } from "./atualizaracoes.js"; // Novo (colunas exclusivas de Ações)

// (O calcularColunasPatrimonio já é chamado dentro do atualizarBasico)

// ============================================================
// FUNÇÃO DO BOTÃO "ATUALIZAR TUDO"
// ============================================================

function configurarEventosInterativos() {

    const btnAtualizarTudo =
        document.getElementById('btn-atualizar-tudo');

    if (!btnAtualizarTudo) {
        return;
    }

    btnAtualizarTudo.addEventListener(
        'click',
        async () => {

            const resultado =
                document.getElementById('resultado');

            if (resultado) {
                resultado.textContent = '';
            }

            const log = (mensagem) => {
                if (resultado) {
                    resultado.textContent += mensagem + '\n';
                    resultado.scrollTop = resultado.scrollHeight;
                }
                console.log(mensagem);
            };

            try {

                // =============================================
                // 1. ATUALIZAR BÁSICO (MERCADO)
                // =============================================
                log('========================================');
                log('1. ATUALIZANDO MERCADO (básico)...');
                log('========================================');

                await atualizarBasico({
                    onProgress: log
                });

                // =============================================
                // 2. ATUALIZAR FIIs (EXCLUSIVOS)
                // =============================================
                log('');
                log('========================================');
                log('2. ATUALIZANDO FIIs (exclusivos)...');
                log('========================================');

                await atualizarFIIs({
                    onProgress: log
                });

                // =============================================
                // 3. ATUALIZAR AÇÕES (EXCLUSIVOS)
                // =============================================
                log('');
                log('========================================');
                log('3. ATUALIZANDO AÇÕES (exclusivos)...');
                log('========================================');

                await atualizarAcoes({
                    onProgress: log
                });

                // =============================================
                // 4. CÁLCULOS (JÁ FEITO NO PASSO 1)
                // =============================================
                log('');
                log('========================================');
                log('4. CÁLCULOS JÁ REALIZADOS NO PASSO 1.');
                log('========================================');

                log('');
                log('========================================');
                log('✅ ATUALIZAÇÃO COMPLETA CONCLUÍDA!');
                log('========================================');

            } catch (erro) {
                log('');
                log(`❌ ERRO: ${erro.message}`);
                console.error('[Módulo Configuração] Erro na atualização:', erro);
            }
        }
    );
}
