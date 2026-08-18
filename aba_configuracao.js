/**
 * ============================================================================
 * MÓDULO: CONFIGURAÇÃO (aba_configuracao.js)
 * ============================================================================
 * Responsável por carregar, exibir, gerenciar e salvar os dados da aba Configuração.
 * Este módulo interage EXCLUSIVAMENTE com o arquivo: patrimonio_consolidado.csv
 * 
 * Regras mantidas:
 * - Nenhuma ordenação é aplicada aos dados (preserva a ordem do CSV).
 * - Lógica de cálculos, scraping e gravação mantidas.
 * - Estrutura atual de colunas mantida.
 * ============================================================================
 */

// Nome OFICIAL e ÚNICO do arquivo de dados patrimoniais
const ARQUIVO_CSV = 'patrimonio_consolidado.csv';

// Variável global para armazenar os dados do patrimônio em memória (preservando o nome conceitual)
let dadosPatrimonio = [];
let cabecalhosCSV = [];

/**
 * Função principal para carregar a aba Configuração.
 * Realiza o fetch do patrimonio_consolidado.csv, faz o parsing e renderiza a tabela.
 */
async function carregarAbaConfiguracao() {
    try {
        console.log(`[Módulo Configuração] Carregando dados de ${ARQUIVO_CSV}...`);
        
        // Adiciona um timestamp para evitar cache no navegador
        const timestamp = new Date().getTime();
        const response = await fetch(`${ARQUIVO_CSV}?t=${timestamp}`);
        
        if (!response.ok) {
            throw new Error(`Erro de rede ao tentar acessar ${ARQUIVO_CSV} (Status: ${response.status})`);
        }

        const textoCSV = await response.text();
        processarDadosCSV(textoCSV);
        renderizarTabelaConfiguracao();
        
    } catch (error) {
        console.error("[Módulo Configuração] Erro ao carregar os dados:", error);
        exibirMensagemErro(`Falha ao carregar os dados de configuração. Detalhes: ${error.message}`);
    }
}

/**
 * Processa o texto bruto do CSV e o converte para arrays,
 * preservando EXATAMENTE a ordem original das linhas.
 * 
 * @param {string} textoCSV - Conteúdo do arquivo patrimonio_consolidado.csv
 */
function processarDadosCSV(textoCSV) {
    // Quebra por linhas e remove linhas totalmente vazias
    const linhas = textoCSV.split('\n').filter(linha => linha.trim() !== '');
    
    if (linhas.length === 0) {
        console.warn(`[Módulo Configuração] O arquivo ${ARQUIVO_CSV} está vazio.`);
        dadosPatrimonio = [];
        cabecalhosCSV = [];
        return;
    }

    // Assume separador padrão (ponto e vírgula)
    cabecalhosCSV = linhas[0].split(';').map(cabecalho => cabecalho.trim());
    
    // Extrai os dados, preservando a ordem original. 
    // REGRA CRÍTICA: NÃO APLICAR NENHUM TIPO DE .sort() AQUI OU NA RENDERIZAÇÃO!
    dadosPatrimonio = linhas.slice(1).map(linha => {
        return linha.split(';').map(celula => celula.trim());
    });
}

/**
 * Renderiza a tabela na interface com base nos dados processados.
 * Mantém formatação e lógica de exibição original.
 */
function renderizarTabelaConfiguracao() {
    const container = document.getElementById('container-tabela-configuracao') || document.querySelector('.tabela-container');
    
    if (!container) {
        console.warn("[Módulo Configuração] Container da tabela não encontrado no DOM.");
        return;
    }

    // Constrói a estrutura HTML da tabela
    let html = `
        <div class="cabecalho-aba">
            <h2>Configuração - Patrimônio Consolidado</h2>
            <div class="acoes-aba">
                <button id="btn-atualizar-mercado" class="btn-padrao">Atualizar Mercado</button>
                <button id="btn-salvar-configuracao" class="btn-padrao btn-sucesso">Salvar Alterações</button>
            </div>
        </div>
        <table id="tabela-configuracao" class="tabela-dados">
            <thead>
                <tr>
    `;

    // Renderiza cabeçalhos
    cabecalhosCSV.forEach(cabecalho => {
        html += `<th>${cabecalho}</th>`;
    });
    
    html += `
                </tr>
            </thead>
            <tbody>
    `;

    // Renderiza os dados (preservando a ordem do CSV)
    if (dadosPatrimonio.length > 0) {
        dadosPatrimonio.forEach((linhaDados, indexLinha) => {
            html += `<tr data-index="${indexLinha}">`;
            
            // Loop para as colunas existentes (atualmente 21 colunas)
            linhaDados.forEach((celula, indexColuna) => {
                // Lógica original de formatação condicional (ex: alinhar números à direita)
                const ehNumero = !isNaN(parseFloat(celula.replace(',', '.'))) && celula !== '';
                const classeAlinhamento = ehNumero ? 'text-right' : 'text-left';
                
                // Células editáveis (lógica original preservada na classe CSS)
                html += `<td contenteditable="true" class="celula-editavel ${classeAlinhamento}" data-col="${indexColuna}">${celula}</td>`;
            });
            
            html += `</tr>`;
        });
    } else {
        html += `<tr><td colspan="${cabecalhosCSV.length || 21}" class="text-center">Nenhum dado patrimonial encontrado.</td></tr>`;
    }

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
    configurarEventosInterativos();
}

/**
 * Configura os event listeners para a tabela e botões da aba Configuração.
 */
function configurarEventosInterativos() {
    // Botão de Atualizar Mercado (integração com atualizar.js / scraping)
    const btnAtualizarMercado = document.getElementById('btn-atualizar-mercado');
    if (btnAtualizarMercado) {
        btnAtualizarMercado.addEventListener('click', () => {
            console.log("[Módulo Configuração] Iniciando rotina de Atualização de Mercado...");
            // Verifica se a função global de atualização (do atualizar.js) existe
            if (typeof window.atualizarCotacoesMercado === 'function') {
                window.atualizarCotacoesMercado();
            } else {
                console.warn("A função de atualização de mercado não está disponível no contexto global.");
                alert("Módulo de atualização não encontrado.");
            }
        });
    }

    // Botão de Salvar Alterações
    const btnSalvar = document.getElementById('btn-salvar-configuracao');
    if (btnSalvar) {
        btnSalvar.addEventListener('click', salvarAbaConfiguracao);
    }

    // Captura de edições diretas na tabela para atualizar o array dadosPatrimonio
    const tabela = document.getElementById('tabela-configuracao');
    if (tabela) {
        tabela.addEventListener('input', (event) => {
            if (event.target.tagName === 'TD' && event.target.hasAttribute('contenteditable')) {
                const tr = event.target.closest('tr');
                const indexLinha = tr.getAttribute('data-index');
                const indexColuna = event.target.getAttribute('data-col');
                
                // Atualiza o valor em memória no array
                if (dadosPatrimonio[indexLinha]) {
                    dadosPatrimonio[indexLinha][indexColuna] = event.target.innerText.trim();
                }
            }
        });
    }
}

/**
 * Salva as alterações feitas na aba Configuração de volta para o servidor/backend
 * para sobrescrever o arquivo patrimonio_consolidado.csv.
 */
async function salvarAbaConfiguracao() {
    try {
        console.log(`[Módulo Configuração] Preparando para salvar ${ARQUIVO_CSV}...`);
        
        // Reconstroi o CSV a partir dos dados em memória
        let conteudoCSV = cabecalhosCSV.join(';') + '\n';
        
        dadosPatrimonio.forEach(linha => {
            conteudoCSV += linha.join(';') + '\n';
        });

        // Envia para o backend (Endpoint mantido como padrão genérico do projeto)
        // O backend deve estar preparado para receber e salvar como patrimonio_consolidado.csv
        const response = await fetch('salvar_csv.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `arquivo=${encodeURIComponent(ARQUIVO_CSV)}&conteudo=${encodeURIComponent(conteudoCSV)}`
        });

        if (response.ok) {
            alert('Dados da configuração salvos com sucesso!');
            // Recarrega a aba para garantir que a interface reflita o arquivo gravado
            await carregarAbaConfiguracao();
        } else {
            throw new Error('Falha ao salvar no servidor.');
        }

    } catch (error) {
        console.error("[Módulo Configuração] Erro ao salvar dados:", error);
        alert(`Erro ao salvar os dados: ${error.message}`);
    }
}

/**
 * Função utilitária para exibir mensagens de erro na interface
 * @param {string} mensagem 
 */
function exibirMensagemErro(mensagem) {
    const container = document.getElementById('container-tabela-configuracao') || document.querySelector('.tabela-container');
    if (container) {
        container.innerHTML = `<div class="alerta-erro"><strong>Erro:</strong> ${mensagem}</div>`;
    }
}

/**
 * Inicialização da aba Configuração.
 * Esta é a função chamada pelo app.js quando o usuário clica na aba "Configuração".
 */
function iniciarAbaConfiguracao() {
    console.log("[Módulo Configuração] Inicializando a aba...");
    // Aciona o carregamento dos dados patrimoniais do CSV oficial
    carregarAbaConfiguracao();
}

// ============================================================================
// EXPORTS DO MÓDULO (Compatível com chamadas do app.js)
// ============================================================================
export {
    iniciarAbaConfiguracao,
    carregarAbaConfiguracao
};
