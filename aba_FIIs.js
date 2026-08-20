// ============================================================
// aba_FIIs.js
// Exibe tabela e gráficos com indicadores de FIIs
// ============================================================

import { atualizarFIIs } from "./atualizarfiis.js";

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const ARQUIVO_CSV =
    "https://raw.githubusercontent.com/mec4tronico/FinancasOnline/main/" +
    "patrimonio_consolidado.csv";

// ============================================================
// COLUNAS DE FIIs (NOVAS)
// ============================================================

const COLUNAS_FIIS = [
    "Ativo",
    "ValorPatrimonialPorCota",
    "PVP",
    "ValorEmCaixa",
    "DYCAGR3Anos",
    "NumeroCotistas",
    "RendimentoMensalMedio24M",
    "AnoPassado",
    "AnoAtual",
    "VolumeDia",
    "SegmentoANBIMA"
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
// RENDERIZAR GRÁFICOS (NOVA ORDEM: SCORECARD PRIMEIRO)
// ============================================================

function renderizarGraficos(fiis) {
    if (typeof Chart === "undefined") {
        console.warn("Chart.js não está carregado.");
        return;
    }

    // Aplica espaçamento entre os gráficos
    const containers = document.querySelectorAll("#graficos-fiis-container > div");
    containers.forEach((el, index) => {
        if (index < containers.length - 1) {
            el.style.marginBottom = "40px";
        }
    });

    // =========================================================
    // GRÁFICO 1: SCORECARD DE QUALIDADE (TABELA) - AGORA PRIMEIRO
    // =========================================================
    renderizarScorecard(fiis);

    // =========================================================
    // GRÁFICO 2: Rendimento vs. Crescimento (Dispersão)
    // =========================================================
    renderizarRendimentoVsCrescimento(fiis);

    // =========================================================
    // GRÁFICO 3: Valuation vs. Liquidez (Bolhas)
    // =========================================================
    renderizarValuationVsLiquidez(fiis);

    // =========================================================
    // GRÁFICO 4: Evolução dos Rendimentos (Barras)
    // =========================================================
    renderizarEvolucaoRendimentos(fiis);
}

// ============================================================
// GRÁFICO 1: SCORECARD DE QUALIDADE (TABELA)
// ============================================================

function renderizarScorecard(fiis) {
    const container = document.getElementById("grafico-scorecard");
    if (!container) {
        console.warn("Container #grafico-scorecard não encontrado.");
        return;
    }

    if (fiis.length === 0) {
        container.innerHTML = `<p style="color: #999; font-size: 13px;">Sem dados para avaliar.</p>`;
        return;
    }

    let html = `
        <div style="overflow-x: auto; font-size: 12px;">
            <h4 style="margin: 0 0 10px 0; color: #333;">⭐ Scorecard de Qualidade</h4>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f5f5f5; border-bottom: 2px solid #e0e0e0;">
                        <th style="padding: 8px 10px; text-align: left;">Ativo</th>
                        <th style="padding: 8px 10px; text-align: center;">P/VP</th>
                        <th style="padding: 8px 10px; text-align: center;">Rendimento</th>
                        <th style="padding: 8px 10px; text-align: center;">Crescimento</th>
                        <th style="padding: 8px 10px; text-align: center;">Caixa</th>
                        <th style="padding: 8px 10px; text-align: center;">Score</th>
                    </tr>
                </thead>
                <tbody>
    `;

    for (const fii of fiis) {
        const pvp = parseFloat(String(fii.PVP || "0").replace(",", "."));
        const rendimento = parseFloat(String(fii.RendimentoMensalMedio24M || "0").replace(",", "."));
        const crescimento = parseFloat(String(fii.DYCAGR3Anos || "0").replace(",", "."));
        const caixa = parseFloat(String(fii.ValorEmCaixa || "0").replace(",", "."));

        // Critérios
        const valPVP = isNaN(pvp) ? '⚪' : pvp < 0.8 ? '🟢' : pvp < 1.2 ? '🟡' : '🔴';
        const valRendimento = isNaN(rendimento) ? '⚪' : rendimento > 0.5 ? '🟢' : rendimento > 0.2 ? '🟡' : '🔴';
        const valCrescimento = isNaN(crescimento) ? '⚪' : crescimento > 5 ? '🟢' : crescimento > 0 ? '🟡' : '🔴';
        const valCaixa = isNaN(caixa) ? '⚪' : caixa > 2 ? '🟢' : caixa > 1 ? '🟡' : '🔴';

        const verdeCount = [valPVP, valRendimento, valCrescimento, valCaixa].filter(v => v === '🟢').length;
        const estrelas = '⭐'.repeat(verdeCount) + '☆'.repeat(4 - verdeCount);

        html += `
            <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 8px 10px; font-weight: 600; color: #00598a;">${fii.Ativo}</td>
                <td style="padding: 8px 10px; text-align: center;">${valPVP} ${isNaN(pvp) ? '-' : pvp.toFixed(2)}</td>
                <td style="padding: 8px 10px; text-align: center;">${valRendimento} ${isNaN(rendimento) ? '-' : rendimento.toFixed(4)}</td>
                <td style="padding: 8px 10px; text-align: center;">${valCrescimento} ${isNaN(crescimento) ? '-' : crescimento.toFixed(2)}%</td>
                <td style="padding: 8px 10px; text-align: center;">${valCaixa} ${isNaN(caixa) ? '-' : caixa.toFixed(2)}</td>
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
            <div style="font-size: 11px; color: #666; margin-top: 8px; text-align: center; border-top: 1px solid #eee; padding-top: 8px;">
                📌 <strong>O que mostra:</strong> Avaliação resumida da qualidade do FII com base em P/VP (quanto menor, melhor), Rendimento (quanto maior, melhor), Crescimento (quanto maior, melhor) e Caixa (quanto maior, melhor). Quanto mais estrelas ⭐, melhor.
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// ============================================================
// GRÁFICO 2: Rendimento vs. Crescimento (Dispersão)
// ============================================================

function renderizarRendimentoVsCrescimento(fiis) {
    const container = document.getElementById("grafico-dispersao");
    if (!container) {
        console.warn("Container #grafico-dispersao não encontrado.");
        return;
    }

    container.style.height = "450px";

    if (container._chart) {
        container._chart.destroy();
    }

    const dados = fiis.map(fii => {
        const rendimento = parseFloat(String(fii.RendimentoMensalMedio24M || "0").replace(",", "."));
        const crescimento = parseFloat(String(fii.DYCAGR3Anos || "0").replace(",", "."));
        const cotistas = parseFloat(String(fii.NumeroCotistas || "0").replace(",", "."));
        return {
            x: isNaN(rendimento) ? 0 : rendimento,
            y: isNaN(crescimento) ? 0 : crescimento,
            label: fii.Ativo,
            cotistas: isNaN(cotistas) ? 0 : cotistas,
            setor: fii.SegmentoANBIMA || "Outros"
        };
    });

    const dadosValidos = dados.filter(d => d.x > 0 || d.y > 0);
    if (dadosValidos.length === 0) {
        container.innerHTML = `
            <p style="color: #999; font-size: 13px;">Sem dados suficientes para exibir o gráfico.</p>
            <div style="font-size: 11px; color: #999; margin-top: 5px;">
                📌 Este gráfico mostra a relação entre o Rendimento Mensal Médio e o Crescimento dos Dividendos (DYCAGR3Anos).
            </div>
        `;
        return;
    }

    const ctx = document.createElement("canvas");
    container.innerHTML = "";
    container.appendChild(ctx);

    try {
        container._chart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Rendimento vs Crescimento',
                    data: dadosValidos,
                    backgroundColor: dadosValidos.map(d => {
                        if (d.setor.includes("Logística")) return 'rgba(76, 175, 80, 0.7)';
                        if (d.setor.includes("Papel")) return 'rgba(33, 150, 243, 0.7)';
                        if (d.setor.includes("Híbrido")) return 'rgba(255, 152, 0, 0.7)';
                        return 'rgba(156, 39, 176, 0.7)';
                    }),
                    borderColor: dadosValidos.map(d => {
                        if (d.setor.includes("Logística")) return 'rgba(76, 175, 80, 1)';
                        if (d.setor.includes("Papel")) return 'rgba(33, 150, 243, 1)';
                        if (d.setor.includes("Híbrido")) return 'rgba(255, 152, 0, 1)';
                        return 'rgba(156, 39, 176, 1)';
                    }),
                    borderWidth: 1,
                    pointRadius: dadosValidos.map(d => Math.sqrt(d.cotistas / 1000) * 1.5 + 3 || 4)
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
                                    `Rendimento: R$ ${d.x.toFixed(4)}`,
                                    `Crescimento: ${d.y.toFixed(2)}%`,
                                    `Cotistas: ${d.cotistas.toLocaleString()}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Rendimento Mensal Médio (R$)', font: { size: 11 } },
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        beginAtZero: true
                    },
                    y: {
                        title: { display: true, text: 'Crescimento (DYCAGR3Anos %)', font: { size: 11 } },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    }
                }
            }
        });
    } catch (e) {
        console.warn("Erro no gráfico de dispersão:", e);
        container.innerHTML = `<p style="color: #999;">⚠️ Erro ao carregar gráfico.</p>`;
    }

    container.insertAdjacentHTML('beforeend', `
        <div style="font-size: 11px; color: #666; margin-top: 8px; text-align: center; border-top: 1px solid #eee; padding-top: 8px;">
            📌 <strong>O que mostra:</strong> Relação entre o Rendimento Mensal Médio (eixo X) e o Crescimento dos Dividendos (eixo Y). O tamanho da bolha representa o número de cotistas.
            <span style="display: block; margin-top: 2px; color: #999;">
                🔍 FIIs no canto superior direito têm alto rendimento e alto crescimento.
            </span>
        </div>
    `);
}

// ============================================================
// GRÁFICO 3: Valuation vs. Liquidez (Bolhas)
// ============================================================

function renderizarValuationVsLiquidez(fiis) {
    const container = document.getElementById("grafico-bolhas");
    if (!container) {
        console.warn("Container #grafico-bolhas não encontrado.");
        return;
    }

    container.style.height = "450px";

    if (container._chart) {
        container._chart.destroy();
    }

    const dados = fiis.map(fii => {
        const pvp = parseFloat(String(fii.PVP || "0").replace(",", "."));
        const valorPatrimonial = parseFloat(String(fii.ValorPatrimonialPorCota || "0").replace(",", "."));
        const caixa = parseFloat(String(fii.ValorEmCaixa || "0").replace(",", "."));
        return {
            x: isNaN(pvp) ? 0 : pvp,
            y: isNaN(valorPatrimonial) ? 0 : valorPatrimonial,
            r: Math.sqrt(Math.abs(caixa)) * 4 + 3 || 5,
            label: fii.Ativo,
            setor: fii.SegmentoANBIMA || "Outros"
        };
    });

    const dadosValidos = dados.filter(d => d.x > 0 && d.y > 0);
    if (dadosValidos.length === 0) {
        container.innerHTML = `
            <p style="color: #999; font-size: 13px;">Sem dados suficientes para exibir o gráfico.</p>
            <div style="font-size: 11px; color: #999; margin-top: 5px;">
                📌 Este gráfico mostra a relação entre o P/VP e o Valor Patrimonial por Cota.
            </div>
        `;
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
                    label: 'Valuation vs Liquidez',
                    data: dadosValidos,
                    backgroundColor: dadosValidos.map(d => {
                        if (d.setor.includes("Logística")) return 'rgba(76, 175, 80, 0.7)';
                        if (d.setor.includes("Papel")) return 'rgba(33, 150, 243, 0.7)';
                        if (d.setor.includes("Híbrido")) return 'rgba(255, 152, 0, 0.7)';
                        return 'rgba(156, 39, 176, 0.7)';
                    }),
                    borderColor: dadosValidos.map(d => {
                        if (d.setor.includes("Logística")) return 'rgba(76, 175, 80, 1)';
                        if (d.setor.includes("Papel")) return 'rgba(33, 150, 243, 1)';
                        if (d.setor.includes("Híbrido")) return 'rgba(255, 152, 0, 1)';
                        return 'rgba(156, 39, 176, 1)';
                    }),
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
                                    `P/VP: ${d.x.toFixed(2)}`,
                                    `Valor Patrimonial: R$ ${d.y.toFixed(2)}`,
                                    `Caixa: R$ ${(d.r / 4 * 2).toFixed(2)}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'P/VP', font: { size: 11 } },
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        beginAtZero: true
                    },
                    y: {
                        title: { display: true, text: 'Valor Patrimonial por Cota (R$)', font: { size: 11 } },
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        beginAtZero: true
                    }
                }
            }
        });
    } catch (e) {
        console.warn("Erro no gráfico de bolhas:", e);
        container.innerHTML = `<p style="color: #999;">⚠️ Erro ao carregar gráfico.</p>`;
    }

    container.insertAdjacentHTML('beforeend', `
        <div style="font-size: 11px; color: #666; margin-top: 8px; text-align: center; border-top: 1px solid #eee; padding-top: 8px;">
            📌 <strong>O que mostra:</strong> Relação entre o P/VP (eixo X) e o Valor Patrimonial por Cota (eixo Y). O tamanho da bolha representa o Valor em Caixa por Cota.
            <span style="display: block; margin-top: 2px; color: #999;">
                🔍 FIIs com P/VP baixo e Valor Patrimonial alto podem estar subvalorizados.
            </span>
        </div>
    `);
}

// ============================================================
// GRÁFICO 4: Evolução dos Rendimentos (Barras Agrupadas)
// ============================================================

function renderizarEvolucaoRendimentos(fiis) {
    const container = document.getElementById("grafico-rendimento");
    if (!container) {
        console.warn("Container #grafico-rendimento não encontrado.");
        return;
    }

    container.style.height = "400px";

    if (container._chart) {
        container._chart.destroy();
    }

    // Ordenar por AnoAtual (decrescente)
    const sorted = [...fiis].sort((a, b) => {
        const anoA = parseFloat(String(a.AnoAtual || "0").replace(",", "."));
        const anoB = parseFloat(String(b.AnoAtual || "0").replace(",", "."));
        return anoB - anoA;
    });

    const labels = sorted.map(f => f.Ativo);
    const dadosAnoPassado = sorted.map(f => {
        const valor = parseFloat(String(f.AnoPassado || "0").replace(",", "."));
        return isNaN(valor) ? 0 : valor;
    });
    const dadosAnoAtual = sorted.map(f => {
        const valor = parseFloat(String(f.AnoAtual || "0").replace(",", "."));
        return isNaN(valor) ? 0 : valor;
    });

    if (dadosAnoPassado.every(v => v === 0) && dadosAnoAtual.every(v => v === 0)) {
        container.innerHTML = `
            <p style="color: #999; font-size: 13px;">Sem dados de rendimentos para exibir.</p>
            <div style="font-size: 11px; color: #999; margin-top: 5px;">
                📌 Este gráfico mostra a evolução dos rendimentos anuais de cada FII.
            </div>
        `;
        return;
    }

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
                        label: 'Ano Passado',
                        data: dadosAnoPassado,
                        backgroundColor: 'rgba(33, 150, 243, 0.7)',
                        borderColor: 'rgba(33, 150, 243, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Ano Atual',
                        data: dadosAnoAtual,
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
                                return `${context.dataset.label}: R$ ${context.raw.toFixed(4)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Rendimento (R$)', font: { size: 11 } },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    }
                }
            }
        });
    } catch (e) {
        console.warn("Erro no gráfico de barras:", e);
        container.innerHTML = `<p style="color: #999;">⚠️ Erro ao carregar gráfico.</p>`;
    }

    container.insertAdjacentHTML('beforeend', `
        <div style="font-size: 11px; color: #666; margin-top: 8px; text-align: center; border-top: 1px solid #eee; padding-top: 8px;">
            📌 <strong>O que mostra:</strong> Comparação direta entre o rendimento do ano passado e o ano atual para cada FII.
            <span style="display: block; margin-top: 2px; color: #999;">
                🔍 Barras azuis são do ano passado, barras verdes são do ano atual.
            </span>
        </div>
    `);
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
    atualizarAbaFIIs,
    executarAtualizacaoFIIs
};
