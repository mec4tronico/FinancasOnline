// ============================================================
// aba_acoes.js
// Exibe tabela com indicadores exclusivos de AÇÕES
// ============================================================

import { atualizarAcoes } from "./atualizaracoes.js";

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const ARQUIVO_CSV =
    "https://raw.githubusercontent.com/mec4tronico/FinancasOnline/main/" +
    "patrimonio_consolidado.csv";

// ============================================================
// COLUNAS EXCLUSIVAS DE AÇÕES (18 indicadores)
// ============================================================

const COLUNAS_ACOES = [
    "Ativo",
    "PL",
    "PVP",
    "LiquidezMediaDiaria",
    "EVEBITDA",
    "DividaLiquidaPL",
    "LiquidezCorrente",
    "MargemEBITDA",
    "ValorFirma",
    "ROE",
    "ROIC",
    "ROA",
    "MargemLiquida",
    "MargemBruta",
    "DYPayout",
    "CrescimentoReceita",
    "CrescimentoLucro",
    "DividaBrutaPL",
    "CoberturaJuros"
];

// ============================================================
// FUNÇÕES AUXILIARES (reutilizadas)
// ============================================================

function separarLinhaCSV(linha) {
    const valores = [];
    let valorAtual = "";
    let dentroDeAspas = false;

    for (let indice = 0; indice < linha.length; indice++) {
        const caractere = linha[indice];
        if (caractere === '"') {
            if (dentroDeAspas && linha[indice + 1] === '"') {
                valorAtual += '"';
                indice++;
            } else {
                dentroDeAspas = !dentroDeAspas;
            }
        } else if (caractere === "," && !dentroDeAspas) {
            valores.push(valorAtual);
            valorAtual = "";
        } else {
            valorAtual += caractere;
        }
    }

    valores.push(valorAtual);
    return valores;
}

// ============================================================
// CARREGAR CSV
// ============================================================

async function carregarPatrimonio() {
    const urlCSV = `${ARQUIVO_CSV}?atualizadoEm=${Date.now()}`;
    const resposta = await fetch(urlCSV, { cache: "no-store" });

    if (!resposta.ok) {
        throw new Error(`Não foi possível carregar patrimonio_consolidado.csv (HTTP ${resposta.status}).`);
    }

    const texto = await resposta.text();
    return converterCSVParaObjetos(texto);
}

function converterCSVParaObjetos(texto) {
    const linhas = texto.trim().split(/\r?\n/);

    if (linhas.length === 0 || !linhas[0].trim()) {
        throw new Error("CSV vazio.");
    }

    const cabecalho = separarLinhaCSV(linhas[0]).map(valor => valor.trim());
    const dados = [];

    for (let indice = 1; indice < linhas.length; indice++) {
        if (!linhas[indice].trim()) continue;

        const valores = separarLinhaCSV(linhas[indice]);
        while (valores.length < cabecalho.length) {
            valores.push("");
        }

        const registro = {};
        for (let coluna = 0; coluna < cabecalho.length; coluna++) {
            registro[cabecalho[coluna]] = valores[coluna] || "";
        }
        dados.push(registro);
    }

    return { cabecalho, dados };
}

// ============================================================
// RENDERIZAR TABELA
// ============================================================

function renderizarTabela(acoes) {
    const container = document.getElementById("tabela-acoes-container");
    if (!container) return;

    // Se não houver ações, exibe mensagem
    if (acoes.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <p>Nenhuma ação encontrada no patrimônio.</p>
            </div>
        `;
        return;
    }

    // ============================================================
    // CONSTRUIR TABELA
    // ============================================================

    let html = `
        <div style="overflow-x: auto; margin-top: 20px;">
            <table style="
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
                background: #fff;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            ">
                <thead>
                    <tr style="background: #f5f5f5; border-bottom: 2px solid #e0e0e0;">
    `;

    // Cabeçalho
    for (const coluna of COLUNAS_ACOES) {
        const nomeExibicao = coluna
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .replace("Ativo", "Ativo");
        html += `<th style="
            padding: 12px 10px;
            text-align: left;
            font-weight: 600;
            color: #333;
            white-space: nowrap;
            border-bottom: 2px solid #e0e0e0;
        ">${nomeExibicao}</th>`;
    }

    html += `
                    </tr>
                </thead>
                <tbody>
    `;

    // Linhas
    for (const acao of acoes) {
        html += `<tr style="border-bottom: 1px solid #f0f0f0;">`;
        for (const coluna of COLUNAS_ACOES) {
            const valor = acao[coluna] || "-";
            const isAtivo = coluna === "Ativo";
            html += `<td style="
                padding: 10px 10px;
                text-align: left;
                ${isAtivo ? 'font-weight: 600; color: #00598a;' : ''}
                ${valor === "ERRO" || valor === "VAZIO" ? 'color: #999; font-style: italic;' : ''}
            ">${valor}</td>`;
        }
        html += `</tr>`;
    }

    html += `
                </tbody>
            </table>
        </div>
    `;

    // Estatísticas
    const totalAcoes = acoes.length;
    const totalIndicadores = COLUNAS_ACOES.length - 1; // exclui "Ativo"
    const celulasPreenchidas = acoes.reduce((acc, acao) => {
        let count = 0;
        for (const coluna of COLUNAS_ACOES) {
            if (coluna !== "Ativo" && acao[coluna] && acao[coluna] !== "ERRO" && acao[coluna] !== "VAZIO") {
                count++;
            }
        }
        return acc + count;
    }, 0);
    const totalCelulas = acoes.length * totalIndicadores;
    const percentualPreenchido = totalCelulas > 0 ? ((celulasPreenchidas / totalCelulas) * 100).toFixed(1) : 0;

    html += `
        <div style="
            margin-top: 15px;
            padding: 12px 16px;
            background: #f9f9f9;
            border-radius: 6px;
            font-size: 13px;
            color: #555;
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 10px;
        ">
            <span>📊 <strong>${totalAcoes}</strong> ações na carteira</span>
            <span>📈 Indicadores preenchidos: <strong>${celulasPreenchidas}</strong> / ${totalCelulas} (${percentualPreenchido}%)</span>
            <span>🔄 Última atualização: <strong>${new Date().toLocaleString()}</strong></span>
        </div>
    `;

    container.innerHTML = html;
}

// ============================================================
// ATUALIZAR ABA AÇÕES
// ============================================================

async function atualizarAbaAcoes() {
    const container = document.getElementById("tabela-acoes-container");
    const botao = document.getElementById("botao-atualizar-acoes");

    if (!container) return;

    // Mostra loading
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
            <div style="
                display: inline-block;
                width: 30px;
                height: 30px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #00598a;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            "></div>
            <p style="margin-top: 15px;">Carregando dados das ações...</p>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        </div>
    `;

    try {
        // 1. Carregar CSV
        const { dados } = await carregarPatrimonio();

        // 2. Filtrar ações
        const acoes = dados.filter(reg => 
            reg.Tipo && reg.Tipo.trim().toLowerCase() === "acoes"
        );

        // 3. Renderizar tabela
        renderizarTabela(acoes);

        // 4. Atualizar status do botão
        if (botao) {
            botao.disabled = false;
            botao.textContent = "🔄 ATUALIZAR AÇÕES";
        }

    } catch (erro) {
        console.error("Erro ao carregar aba Ações:", erro);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #d32f2f;">
                <p>❌ Erro ao carregar dados das ações.</p>
                <p style="font-size: 12px; color: #999;">${erro.message || "Tente novamente mais tarde."}</p>
            </div>
        `;
    }
}

// ============================================================
// FUNÇÃO DO BOTÃO ATUALIZAR
// ============================================================

async function executarAtualizacaoAcoes() {
    const botao = document.getElementById("botao-atualizar-acoes");
    const container = document.getElementById("tabela-acoes-container");

    if (!botao) return;

    botao.disabled = true;
    botao.textContent = "⏳ ATUALIZANDO...";

    // Mostrar progresso (já existe)
    const divProgresso = document.createElement("div");
    divProgresso.id = "progresso-acoes";
    divProgresso.style.cssText = `
        margin: 10px 0;
        padding: 12px 16px;
        background: #e3f2fd;
        border-radius: 6px;
        font-size: 13px;
        color: #0d47a1;
        border-left: 4px solid #00598a;
        max-height: 200px;
        overflow-y: auto;
        font-family: monospace;
        white-space: pre-wrap;
    `;
    divProgresso.textContent = "Iniciando atualização...\n";

    container.parentNode.insertBefore(divProgresso, container);

    try {
        // Chamar a atualização
        const resultado = await atualizarAcoes({
            onProgress: (msg) => {
                divProgresso.textContent += msg + "\n";
                divProgresso.scrollTop = divProgresso.scrollHeight;
            }
        });

        // Mostrar resultado
        divProgresso.textContent += "\n========================================\n";
        divProgresso.textContent += `✅ ATUALIZAÇÃO CONCLUÍDA!\n`;
        divProgresso.textContent += `Total de ações: ${resultado.total}\n`;
        divProgresso.textContent += `Atualizadas com sucesso: ${resultado.atualizados}\n`;
        divProgresso.textContent += `Com erro: ${resultado.erros}\n`;
        if (resultado.commit) {
            divProgresso.textContent += `Commit: ${resultado.commit}\n`;
        }

        // ============================================================
        // 🔄 RECARREGAR A TABELA COM OS NOVOS DADOS DO CSV
        // ============================================================
        await atualizarAbaAcoes();

        // Remover progresso após recarregar
        if (divProgresso.parentNode) {
            divProgresso.remove();
        }

    } catch (erro) {
        console.error("Erro na atualização:", erro);
        divProgresso.textContent += `\n❌ ERRO: ${erro.message || "Falha na atualização"}`;
        divProgresso.style.borderLeftColor = "#d32f2f";
        divProgresso.style.background = "#ffebee";
        divProgresso.style.color = "#b71c1c";

        botao.disabled = false;
        botao.textContent = "🔄 ATUALIZAR AÇÕES";
    }
}

// ============================================================
// INICIALIZAR ABA AÇÕES
// ============================================================

function iniciarAbaAcoes() {
    // Localizar elementos
    const botao = document.getElementById("botao-atualizar-acoes");
    const container = document.getElementById("tabela-acoes-container");

    if (!container) {
        console.warn("Container #tabela-acoes-container não encontrado.");
        return;
    }

    // Registrar evento do botão
    if (botao) {
        botao.addEventListener("click", executarAtualizacaoAcoes);
    }

    // Carregar dados
    atualizarAbaAcoes();
}

// ============================================================
// EXPORTAÇÕES
// ============================================================

export {
    iniciarAbaAcoes,
    atualizarAbaAcoes,
    executarAtualizacaoAcoes
};
