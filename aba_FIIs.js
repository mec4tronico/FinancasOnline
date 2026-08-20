// ============================================================
// aba_FIIs.js
// Exibe tabela e gráficos com indicadores exclusivos de FIIs
// ============================================================

import { atualizarFIIs } from "./atualizarfiis.js";

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const ARQUIVO_CSV =
    "https://raw.githubusercontent.com/mec4tronico/FinancasOnline/main/" +
    "patrimonio_consolidado.csv";

// ============================================================
// COLUNAS EXCLUSIVAS DE FIIs (10 indicadores)
// ============================================================

const COLUNAS_FIIS = [
    "Ativo",
    "CapRate",
    "RendimentoMensal",
    "Rendimento12M",
    "VacanciaMedia",
    "VacanciaFisica",
    "VacanciaFinanceira",
    "QtdImoveis",
    "Alavancagem",
    "PrazoContratos",
    "RentabilidadeImobiliaria"
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
// RENDERIZAR GRÁFICOS
// ============================================================

function renderizarGraficos(fiis) {
    renderizarRendimentos(fiis);
    renderizarVacancia(fiis);
    renderizarAlavancagemCapRate(fiis);
    renderizarScorecard(fiis);
}

// ============================================================
// GRÁFICO 1: Rendimentos (Mensal e 12M)
// ============================================================

function renderizarRendimentos(fiis) {
    const container = document.getElementById("grafico-rendimentos");
    if (!container) return;

    if (typeof Chart === "undefined") {
        container.innerHTML = `<p style="color: #999; font-size: 13px;">📊 Chart.js não carregado.</p>`;
        return;
    }

    if (container._chart) {
        container._chart.destroy();
    }

    const labels = fiis.map(f => f.Ativo);
    const dadosMensal = fiis.map(f => parseFloat(String(f.RendimentoMensal || "0").replace(",", ".")));
    const dados12M = fiis.map(f => parseFloat(String(f.Rendimento12M || "0").replace(",", ".")));

    const ctx = document.createElement("canvas");
    container.innerHTML = "";
    container.appendChild(ctx);

    try {
        container._chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Rendimento Mensal (R$)',
                        data: dadosMensal,
                        backgroundColor: 'rgba(33, 150, 243, 0.7)',
                        borderColor: 'rgba(33, 150, 243, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Rendimento 12M (R$)',
                        data: dados12M,
                        backgroundColor: 'rgba(76, 175, 80, 0.7)',
                        borderColor: 'rgba(76, 175, 80, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { font: { size: 11 } } },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: R$ ${context.raw.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: { 
                        beginAtZero: true,
                        title: { display: true, text: 'Rendimento (R$)', font: { size: 11 } }
                    }
                }
            }
        });
    } catch (e) {
        console.warn("Erro no gráfico de rendimentos:", e);
        container.innerHTML = `<p style="color: #999;">⚠️ Erro ao carregar gráfico.</p>`;
    }
}

// ============================================================
// GRÁFICO 2: Vacância (Física, Financeira e Média)
// ============================================================

function renderizarVacancia(fiis) {
    const container = document.getElementById("grafico-vacancia");
    if (!container) return;

    if (typeof Chart === "undefined") {
        container.innerHTML = `<p style="color: #999; font-size: 13px;">📊 Chart.js não carregado.</p>`;
        return;
    }

    if (container._chart) {
        container._chart.destroy();
    }

    const labels = fiis.map(f => f.Ativo);
    const dadosFisica = fiis.map(f => parseFloat(String(f.VacanciaFisica || "0").replace(",", ".")));
    const dadosFinanceira = fiis.map(f => parseFloat(String(f.VacanciaFinanceira || "0").replace(",", ".")));
    const dadosMedia = fiis.map(f => parseFloat(String(f.VacanciaMedia || "0").replace(",", ".")));

    const ctx = document.createElement("canvas");
    container.innerHTML = "";
    container.appendChild(ctx);

    try {
        container._chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Vacância Física (%)',
                        data: dadosFisica,
                        backgroundColor: 'rgba(255, 152, 0, 0.7)',
                        borderColor: 'rgba(255, 152, 0, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Vacância Financeira (%)',
                        data: dadosFinanceira,
                        backgroundColor: 'rgba(244, 67, 54, 0.7)',
                        borderColor: 'rgba(244, 67, 54, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Vacância Média (%)',
                        data: dadosMedia,
                        backgroundColor: 'rgba(156, 39, 176, 0.7)',
                        borderColor: 'rgba(156, 39, 176, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { font: { size: 11 } } },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.raw.toFixed(1)}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: { 
                        beginAtZero: true,
                        title: { display: true, text: 'Vacância (%)', font: { size: 11 } }
                    }
                }
            }
        });
    } catch (e) {
        console.warn("Erro no gráfico de vacância:", e);
        container.innerHTML = `<p style="color: #999;">⚠️ Erro ao carregar gráfico.</p>`;
    }
}

// ============================================================
// GRÁFICO 3: Alavancagem vs CapRate (Bolhas)
// ============================================================

function renderizarAlavancagemCapRate(fiis) {
    const container = document.getElementById("grafico-alavancagem-caprate");
    if (!container) return;

    if (typeof Chart === "undefined") {
        container.innerHTML = `<p style="color: #999; font-size: 13px;">📊 Chart.js não carregado.</p>`;
        return;
    }

    if (container._chart) {
        container._chart.destroy();
    }

    const dados = fiis.map(f => {
        const alavancagem = parseFloat(String(f.Alavancagem || "0").replace(",", "."));
        const capRate = parseFloat(String(f.CapRate || "0").replace(",", "."));
        const qtdImoveis = parseFloat(String(f.QtdImoveis || "1").replace(",", "."));
        return {
            x: isNaN(alavancagem) ? 0 : alavancagem,
            y: isNaN(capRate) ? 0 : capRate,
            r: Math.sqrt(Math.abs(qtdImoveis)) * 3 + 3 || 5,
            label: f.Ativo,
            qtdImoveis: qtdImoveis
        };
    });

    // Filtrar dados válidos
    const dadosValidos = dados.filter(d => d.x > 0 || d.y > 0);
    if (dadosValidos.length === 0) {
        container.innerHTML = `<p style="color: #999; font-size: 13px;">Sem dados suficientes.</p>`;
        return;
    }

    const ctx = document.createElement("canvas");
    container.innerHTML = "";
    container.appendChild(ctx);

    try {
        container._chart = new Chart(ctx, {
            type: 'bubble',
            data: {
                datasets: [{
                    label: 'Alavancagem vs CapRate',
                    data: dadosValidos,
                    backgroundColor: 'rgba(33, 150, 243, 0.7)',
                    borderColor: 'rgba(33, 150, 243, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const d = context.raw;
                                return [
                                    `${d.label}`,
                                    `CapRate: ${d.y.toFixed(1)}%`,
                                    `Alavancagem: ${d.x.toFixed(1)}%`,
                                    `Imóveis: ${d.qtdImoveis}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Alavancagem (%)', font: { size: 11 } },
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        beginAtZero: true
                    },
                    y: {
                        title: { display: true, text: 'CapRate (%)', font: { size: 11 } },
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        beginAtZero: true
                    }
                }
            }
        });
    } catch (e) {
        console.warn("Erro no gráfico Alavancagem vs CapRate:", e);
        container.innerHTML = `<p style="color: #999;">⚠️ Erro ao carregar gráfico.</p>`;
    }
}

// ============================================================
// GRÁFICO 4: Scorecard de Qualidade do FII
// ============================================================

function renderizarScorecard(fiis) {
    const container = document.getElementById("grafico-scorecard-fiis");
    if (!container) return;

    if (fiis.length === 0) {
        container.innerHTML = `<p style="color: #999; font-size: 13px;">Sem FIIs para avaliar.</p>`;
        return;
    }

    let html = `
        <div style="overflow-x: auto; font-size: 12px;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f5f5f5; border-bottom: 2px solid #e0e0e0;">
                        <th style="padding: 8px 10px; text-align: left;">Ativo</th>
                        <th style="padding: 8px 10px; text-align: center;">CapRate</th>
                        <th style="padding: 8px 10px; text-align: center;">Vacância Média</th>
                        <th style="padding: 8px 10px; text-align: center;">Alavancagem</th>
                        <th style="padding: 8px 10px; text-align: center;">Prazo Contratos</th>
                        <th style="padding: 8px 10px; text-align: center;">Score</th>
                    </tr>
                </thead>
                <tbody>
    `;

    for (const fii of fiis) {
        const capRate = parseFloat(String(fii.CapRate || "0").replace(",", "."));
        const vacancia = parseFloat(String(fii.VacanciaMedia || "999").replace(",", "."));
        const alavancagem = parseFloat(String(fii.Alavancagem || "999").replace(",", "."));
        const prazo = parseFloat(String(fii.PrazoContratos || "0").replace(",", "."));

        // Avaliação individual
        const valCapRate = isNaN(capRate) ? '⚪' : capRate > 7 ? '🟢' : capRate > 5 ? '🟡' : '🔴';
        const valVacancia = isNaN(vacancia) ? '⚪' : vacancia < 5 ? '🟢' : vacancia < 10 ? '🟡' : '🔴';
        const valAlavancagem = isNaN(alavancagem) ? '⚪' : alavancagem < 30 ? '🟢' : alavancagem < 50 ? '🟡' : '🔴';
        const valPrazo = isNaN(prazo) ? '⚪' : prazo > 5 ? '🟢' : prazo > 3 ? '🟡' : '🔴';

        const verdeCount = [valCapRate, valVacancia, valAlavancagem, valPrazo].filter(v => v === '🟢').length;
        const estrelas = '⭐'.repeat(verdeCount) + '☆'.repeat(4 - verdeCount);

        html += `
            <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 8px 10px; font-weight: 600; color: #00598a;">${fii.Ativo}</td>
                <td style="padding: 8px 10px; text-align: center;">${valCapRate} ${isNaN(capRate) ? '-' : capRate.toFixed(1)}%</td>
                <td style="padding: 8px 10px; text-align: center;">${valVacancia} ${isNaN(vacancia) ? '-' : vacancia.toFixed(1)}%</td>
                <td style="padding: 8px 10px; text-align: center;">${valAlavancagem} ${isNaN(alavancagem) ? '-' : alavancagem.toFixed(1)}%</td>
                <td style="padding: 8px 10px; text-align: center;">${valPrazo} ${isNaN(prazo) ? '-' : prazo.toFixed(1)} anos</td>
                <td style="padding: 8px 10px; text-align: center; font-size: 14px;">${estrelas}</td>
            </tr>
        `;
    }

    html += `
                </tbody>
            </table>
            <div style="margin-top: 8px; font-size: 11px; color: #999; text-align: center;">
                🟢 Bom | 🟡 Médio | 🔴 Ruim | ⚪ Sem dado
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// ============================================================
// RENDERIZAR TABELA
// ============================================================

function renderizarTabela(fiis) {
    const container = document.getElementById("tabela-fiis-container");
    if (!container) return;

    if (fiis.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <p>Nenhum FII encontrado no patrimônio.</p>
            </div>
        `;
        return;
    }

    // Cabeçalho
    let html = `
        <div style="overflow-x: auto; margin-top: 20px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <thead>
                    <tr style="background: #f5f5f5; border-bottom: 2px solid #e0e0e0;">
    `;

    for (const coluna of COLUNAS_FIIS) {
        const nomeExibicao = coluna
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .replace("Ativo", "Ativo");
        html += `<th style="padding: 12px 10px; text-align: left; font-weight: 600; color: #333; white-space: nowrap; border-bottom: 2px solid #e0e0e0;">${nomeExibicao}</th>`;
    }

    html += `</tr></thead><tbody>`;

    // Linhas
    for (const fii of fiis) {
        html += `<tr style="border-bottom: 1px solid #f0f0f0;">`;
        for (const coluna of COLUNAS_FIIS) {
            const valor = fii[coluna] || "-";
            const isAtivo = coluna === "Ativo";
            html += `<td style="padding: 10px 10px; text-align: left; ${isAtivo ? 'font-weight: 600; color: #00598a;' : ''} ${valor === "ERRO" || valor === "VAZIO" ? 'color: #999; font-style: italic;' : ''}">${valor}</td>`;
        }
        html += `</tr>`;
    }

    html += `</tbody></table></div>`;

    // Estatísticas
    const totalFIIs = fiis.length;
    const totalIndicadores = COLUNAS_FIIS.length - 1;
    let celulasPreenchidas = 0;
    for (const fii of fiis) {
        for (const coluna of COLUNAS_FIIS) {
            if (coluna !== "Ativo" && fii[coluna] && fii[coluna] !== "ERRO" && fii[coluna] !== "VAZIO") {
                celulasPreenchidas++;
            }
        }
    }
    const totalCelulas = fiis.length * totalIndicadores;
    const percentualPreenchido = totalCelulas > 0 ? ((celulasPreenchidas / totalCelulas) * 100).toFixed(1) : 0;

    html += `
        <div style="margin-top: 15px; padding: 12px 16px; background: #f9f9f9; border-radius: 6px; font-size: 13px; color: #555; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
            <span>📊 <strong>${totalFIIs}</strong> FIIs na carteira</span>
            <span>📈 Indicadores preenchidos: <strong>${celulasPreenchidas}</strong> / ${totalCelulas} (${percentualPreenchido}%)</span>
            <span>🔄 Última atualização: <strong>${new Date().toLocaleString()}</strong></span>
        </div>
    `;

    container.innerHTML = html;
}

// ============================================================
// ATUALIZAR ABA FIIs
// ============================================================

async function atualizarAbaFIIs() {
    const container = document.getElementById("tabela-fiis-container");
    const botao = document.getElementById("botao-atualizar-fiis");
    const graficosContainer = document.getElementById("graficos-fiis-container");

    if (!container) return;

    // Mostra loading
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
            <div style="display: inline-block; width: 30px; height: 30px; border: 3px solid #f3f3f3; border-top: 3px solid #00598a; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p style="margin-top: 15px;">Carregando dados dos FIIs...</p>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        </div>
    `;

    try {
        const { dados } = await carregarPatrimonio();
        const fiis = dados.filter(reg => reg.Tipo && reg.Tipo.trim().toLowerCase() === "fii");

        if (graficosContainer) {
            renderizarGraficos(fiis);
        }
        renderizarTabela(fiis);

        if (botao) {
            botao.disabled = false;
            botao.textContent = "🔄 ATUALIZAR FIIs";
        }

    } catch (erro) {
        console.error("Erro ao carregar aba FIIs:", erro);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #d32f2f;">
                <p>❌ Erro ao carregar dados dos FIIs.</p>
                <p style="font-size: 12px; color: #999;">${erro.message || "Tente novamente mais tarde."}</p>
            </div>
        `;
    }
}

// ============================================================
// FUNÇÃO DO BOTÃO ATUALIZAR
// ============================================================

async function executarAtualizacaoFIIs() {
    const botao = document.getElementById("botao-atualizar-fiis");
    const container = document.getElementById("tabela-fiis-container");

    if (!botao) return;

    botao.disabled = true;
    botao.textContent = "⏳ ATUALIZANDO...";

    const divProgresso = document.createElement("div");
    divProgresso.id = "progresso-fiis";
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
        const resultado = await atualizarFIIs({
            onProgress: (msg) => {
                divProgresso.textContent += msg + "\n";
                divProgresso.scrollTop = divProgresso.scrollHeight;
            }
        });

        divProgresso.textContent += "\n========================================\n";
        divProgresso.textContent += `✅ ATUALIZAÇÃO CONCLUÍDA!\n`;
        divProgresso.textContent += `Total de FIIs: ${resultado.total}\n`;
        divProgresso.textContent += `Atualizados: ${resultado.atualizados}\n`;
        divProgresso.textContent += `Erros: ${resultado.erros}\n`;
        if (resultado.commit) {
            divProgresso.textContent += `Commit: ${resultado.commit}\n`;
        }

        await atualizarAbaFIIs();

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
        botao.textContent = "🔄 ATUALIZAR FIIs";
    }
}

// ============================================================
// INICIALIZAR ABA FIIs
// ============================================================

function iniciarAbaFIIs() {
    const botao = document.getElementById("botao-atualizar-fiis");
    const container = document.getElementById("tabela-fiis-container");

    if (!container) {
        console.warn("Container #tabela-fiis-container não encontrado.");
        return;
    }

    if (botao) {
        botao.addEventListener("click", executarAtualizacaoFIIs);
    }

    atualizarAbaFIIs();
}

// ============================================================
// EXPORTAÇÕES
// ============================================================

export {
    iniciarAbaFIIs,
    atualizarAbaFIIs: iniciarAbaFIIs, // alias
    executarAtualizacaoFIIs
};
