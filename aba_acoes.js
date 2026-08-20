// ============================================================
// aba_acoes.js
// Exibe tabela e gráficos com indicadores de AÇÕES
// ============================================================

import { atualizarAcoes } from "./atualizaracoes.js";

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const ARQUIVO_CSV =
    "https://raw.githubusercontent.com/mec4tronico/FinancasOnline/main/" +
    "patrimonio_consolidado.csv";

// ============================================================
// COLUNAS DE AÇÕES (NOVAS)
// ============================================================

const COLUNAS_ACOES = [
    "Ativo",
    "ValorAtual",
    "Min52",
    "Max52",
    "DY",
    "Valorizacao",
    "VolumeDia",
    "ValorMercado",
    "ValorFirma",
    "PartIBOV",
    "Ativos",
    "DividaLiquida"
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

function renderizarGraficos(acoes) {
    // Verifica se Chart.js está disponível
    if (typeof Chart === "undefined") {
        console.warn("Chart.js não está carregado.");
        return;
    }

    // =========================================================
    // GRÁFICO 1: Valorização vs DY (Dispersão)
    // =========================================================
    renderizarValorizacaoVsDY(acoes);

    // =========================================================
    // GRÁFICO 2: Tamanho vs Valorização (Bolhas)
    // =========================================================
    renderizarTamanhoVsValorizacao(acoes);

    // =========================================================
    // GRÁFICO 3: Endividamento (Barras)
    // =========================================================
    renderizarEndividamento(acoes);

    // =========================================================
    // GRÁFICO 4: Scorecard de Qualidade
    // =========================================================
    renderizarScorecard(acoes);
}

// ============================================================
// GRÁFICO 1: Valorização vs DY (Dispersão)
// ============================================================

function renderizarValorizacaoVsDY(acoes) {
    const container = document.getElementById("grafico-dispersao-acoes");
    if (!container) {
        console.warn("Container #grafico-dispersao-acoes não encontrado.");
        return;
    }

    if (container._chart) {
        container._chart.destroy();
    }

    // Preparar dados
    const dados = acoes.map(acao => {
        const dy = parseFloat(String(acao.DY || "0").replace(",", "."));
        const valorizacao = parseFloat(String(acao.Valorizacao || "0").replace("%", "").replace(",", "."));
        const volume = parseFloat(String(acao.VolumeDia || "0").replace(",", "."));
        return {
            x: isNaN(dy) ? 0 : dy,
            y: isNaN(valorizacao) ? 0 : valorizacao,
            label: acao.Ativo,
            volume: isNaN(volume) ? 0 : volume
        };
    });

    // Filtrar dados válidos
    const dadosValidos = dados.filter(d => d.x > 0 || d.y > 0);
    if (dadosValidos.length === 0) {
        container.innerHTML = `
            <p style="color: #999; font-size: 13px;">Sem dados suficientes para exibir o gráfico.</p>
            <div style="font-size: 11px; color: #999; margin-top: 5px;">
                📌 Este gráfico mostra a relação entre o Dividend Yield (DY) e a Valorização da ação.
                Pontos mais à direita indicam maior DY, pontos mais acima indicam maior valorização.
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
                    label: 'Valorização vs DY',
                    data: dadosValidos,
                    backgroundColor: 'rgba(33, 150, 243, 0.7)',
                    borderColor: 'rgba(33, 150, 243, 1)',
                    borderWidth: 1,
                    pointRadius: dadosValidos.map(d => Math.sqrt(d.volume / 1000000) * 2 + 3 || 3)
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
                                    `DY: ${d.x.toFixed(2)}%`,
                                    `Valorização: ${d.y.toFixed(2)}%`,
                                    `Volume: ${d.volume.toLocaleString()}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Dividend Yield (%)', font: { size: 11 } },
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        beginAtZero: true
                    },
                    y: {
                        title: { display: true, text: 'Valorização 12M (%)', font: { size: 11 } },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    }
                }
            }
        });
    } catch (e) {
        console.warn("Erro no gráfico de dispersão:", e);
        container.innerHTML = `<p style="color: #999;">⚠️ Erro ao carregar gráfico.</p>`;
    }

    // Legenda explicativa
    container.insertAdjacentHTML('beforeend', `
        <div style="font-size: 11px; color: #666; margin-top: 8px; text-align: center; border-top: 1px solid #eee; padding-top: 8px;">
            📌 <strong>O que mostra:</strong> Relação entre o Dividend Yield (eixo X) e a Valorização da ação (eixo Y). 
            O tamanho da bolha representa o volume negociado.
            <span style="display: block; margin-top: 2px; color: #999;">
                🔍 Quanto mais à direita, maior o DY. Quanto mais acima, maior a valorização.
            </span>
        </div>
    `);
}

// ============================================================
// GRÁFICO 2: Tamanho vs Valorização (Bolhas)
// ============================================================

function renderizarTamanhoVsValorizacao(acoes) {
    const container = document.getElementById("grafico-bolhas-acoes");
    if (!container) {
        console.warn("Container #grafico-bolhas-acoes não encontrado.");
        return;
    }

    if (container._chart) {
        container._chart.destroy();
    }

    // Preparar dados
    const dados = acoes.map(acao => {
        const valorMercado = parseFloat(String(acao.ValorMercado || "0").replace(",", "."));
        const valorizacao = parseFloat(String(acao.Valorizacao || "0").replace("%", "").replace(",", "."));
        const valorFirma = parseFloat(String(acao.ValorFirma || "0").replace(",", "."));
        return {
            x: isNaN(valorMercado) ? 0 : valorMercado / 1000000000,
            y: isNaN(valorizacao) ? 0 : valorizacao,
            r: Math.sqrt(Math.abs(valorFirma) / 1000000000) * 3 + 3 || 5,
            label: acao.Ativo,
            setor: acao.Setor || "Outros"
        };
    });

    // Filtrar dados válidos
    const dadosValidos = dados.filter(d => d.x > 0 || d.y > 0);
    if (dadosValidos.length === 0) {
        container.innerHTML = `
            <p style="color: #999; font-size: 13px;">Sem dados suficientes para exibir o gráfico.</p>
            <div style="font-size: 11px; color: #999; margin-top: 5px;">
                📌 Este gráfico mostra o tamanho da empresa (Valor de Mercado) em relação à sua valorização.
                Bolhas maiores indicam empresas maiores.
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
                    label: 'Tamanho vs Valorização',
                    data: dadosValidos,
                    backgroundColor: dadosValidos.map(d => {
                        if (d.setor.includes("Financeiro")) return 'rgba(76, 175, 80, 0.7)';
                        if (d.setor.includes("Energia") || d.setor.includes("Utilidade")) return 'rgba(33, 150, 243, 0.7)';
                        if (d.setor.includes("Mineração") || d.setor.includes("Materiais")) return 'rgba(255, 152, 0, 0.7)';
                        return 'rgba(156, 39, 176, 0.7)';
                    }),
                    borderColor: dadosValidos.map(d => {
                        if (d.setor.includes("Financeiro")) return 'rgba(76, 175, 80, 1)';
                        if (d.setor.includes("Energia") || d.setor.includes("Utilidade")) return 'rgba(33, 150, 243, 1)';
                        if (d.setor.includes("Mineração") || d.setor.includes("Materiais")) return 'rgba(255, 152, 0, 1)';
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
                                    `Valor de Mercado: R$ ${d.x.toFixed(1)}B`,
                                    `Valorização: ${d.y.toFixed(2)}%`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Valor de Mercado (R$ Bi)', font: { size: 11 } },
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        beginAtZero: true
                    },
                    y: {
                        title: { display: true, text: 'Valorização 12M (%)', font: { size: 11 } },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    }
                }
            }
        });
    } catch (e) {
        console.warn("Erro no gráfico de bolhas:", e);
        container.innerHTML = `<p style="color: #999;">⚠️ Erro ao carregar gráfico.</p>`;
    }

    // Legenda explicativa
    container.insertAdjacentHTML('beforeend', `
        <div style="font-size: 11px; color: #666; margin-top: 8px; text-align: center; border-top: 1px solid #eee; padding-top: 8px;">
            📌 <strong>O que mostra:</strong> Relação entre o tamanho da empresa (Valor de Mercado) e sua valorização.
            A cor indica o setor da empresa.
            <span style="display: block; margin-top: 2px; color: #999;">
                🔍 Quanto maior a bolha, maior a empresa. Cores diferentes representam setores diferentes.
            </span>
        </div>
    `);
}

// ============================================================
// GRÁFICO 3: Endividamento (Barras) - CORRIGIDO COM EIXO Y DINÂMICO
// ============================================================

function renderizarEndividamento(acoes) {
    const container = document.getElementById("grafico-endividamento-acoes");
    if (!container) {
        console.warn("Container #grafico-endividamento-acoes não encontrado.");
        return;
    }

    if (container._chart) {
        container._chart.destroy();
    }

    // Ordenar por dívida líquida (decrescente)
    const sorted = [...acoes].sort((a, b) => {
        const divA = parseFloat(String(a.DividaLiquida || "0").replace(",", "."));
        const divB = parseFloat(String(b.DividaLiquida || "0").replace(",", "."));
        return divB - divA;
    });

    const labels = sorted.map(a => a.Ativo);
    const dadosDivida = sorted.map(a => {
        const valor = parseFloat(String(a.DividaLiquida || "0").replace(",", "."));
        return isNaN(valor) ? 0 : valor / 1000000000;
    });
    const dadosAtivos = sorted.map(a => {
        const valor = parseFloat(String(a.Ativos || "0").replace(",", "."));
        return isNaN(valor) ? 0 : valor / 1000000000;
    });

    // Verificar se há dados válidos
    if (dadosDivida.every(v => v === 0) && dadosAtivos.every(v => v === 0)) {
        container.innerHTML = `
            <p style="color: #999; font-size: 13px;">Sem dados de endividamento para exibir.</p>
            <div style="font-size: 11px; color: #999; margin-top: 5px;">
                📌 Este gráfico mostra a Dívida Líquida e os Ativos Totais de cada empresa.
                Empresas com dívida negativa têm mais caixa do que dívidas.
            </div>
        `;
        return;
    }

    const ctx = document.createElement("canvas");
    container.innerHTML = "";
    container.appendChild(ctx);

    // Calcular o valor máximo para o eixo Y
    const maxDivida = Math.max(...dadosDivida.map(v => Math.abs(v)));
    const maxAtivos = Math.max(...dadosAtivos);
    const maxY = Math.max(maxDivida, maxAtivos, 1) * 1.1; // 10% de margem

    try {
        container._chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Dívida Líquida (R$ Bi)',
                        data: dadosDivida,
                        backgroundColor: dadosDivida.map(v => v < 0 ? 'rgba(76, 175, 80, 0.7)' : 'rgba(244, 67, 54, 0.7)'),
                        borderColor: dadosDivida.map(v => v < 0 ? 'rgba(76, 175, 80, 1)' : 'rgba(244, 67, 54, 1)'),
                        borderWidth: 1
                    },
                    {
                        label: 'Ativos Totais (R$ Bi)',
                        data: dadosAtivos,
                        backgroundColor: 'rgba(33, 150, 243, 0.7)',
                        borderColor: 'rgba(33, 150, 243, 1)',
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
                                return `${context.dataset.label}: R$ ${context.raw.toFixed(1)} Bi`;
                            }
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        beginAtZero: true,
                        max: maxY,
                        title: { display: true, text: 'R$ Bilhões', font: { size: 11 } },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    }
                }
            }
        });
    } catch (e) {
        console.warn("Erro no gráfico de endividamento:", e);
        container.innerHTML = `<p style="color: #999;">⚠️ Erro ao carregar gráfico.</p>`;
    }

    // Legenda explicativa
    container.insertAdjacentHTML('beforeend', `
        <div style="font-size: 11px; color: #666; margin-top: 8px; text-align: center; border-top: 1px solid #eee; padding-top: 8px;">
            📌 <strong>O que mostra:</strong> Endividamento das empresas (Dívida Líquida) versus seus Ativos Totais.
            <span style="display: block; margin-top: 2px; color: #999;">
                🔍 Barras vermelhas indicam dívida positiva (endividamento). Barras verdes indicam caixa líquido positivo (dívida negativa).
                Quanto maior a barra azul, maior o tamanho da empresa em ativos.
            </span>
        </div>
    `);
}

// ============================================================
// GRÁFICO 4: Scorecard de Qualidade
// ============================================================

function renderizarScorecard(acoes) {
    const container = document.getElementById("grafico-scorecard-acoes");
    if (!container) {
        console.warn("Container #grafico-scorecard-acoes não encontrado.");
        return;
    }

    if (acoes.length === 0) {
        container.innerHTML = `<p style="color: #999; font-size: 13px;">Sem dados para avaliar.</p>`;
        return;
    }

    let html = `
        <div style="overflow-x: auto; font-size: 12px;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f5f5f5; border-bottom: 2px solid #e0e0e0;">
                        <th style="padding: 8px 10px; text-align: left;">Ativo</th>
                        <th style="padding: 8px 10px; text-align: center;">DY</th>
                        <th style="padding: 8px 10px; text-align: center;">Valorização</th>
                        <th style="padding: 8px 10px; text-align: center;">Dívida Líquida</th>
                        <th style="padding: 8px 10px; text-align: center;">Score</th>
                    </tr>
                </thead>
                <tbody>
    `;

    for (const acao of acoes) {
        const dy = parseFloat(String(acao.DY || "0").replace(",", "."));
        const valorizacao = parseFloat(String(acao.Valorizacao || "0").replace("%", "").replace(",", "."));
        const divida = parseFloat(String(acao.DividaLiquida || "0").replace(",", "."));

        const valDY = isNaN(dy) ? '⚪' : dy > 6 ? '🟢' : dy > 4 ? '🟡' : '🔴';
        const valValorizacao = isNaN(valorizacao) ? '⚪' : valorizacao > 20 ? '🟢' : valorizacao > 0 ? '🟡' : '🔴';
        const valDivida = isNaN(divida) ? '⚪' : divida < 0 ? '🟢' : divida < 1000000000 ? '🟡' : '🔴';

        const verdeCount = [valDY, valValorizacao, valDivida].filter(v => v === '🟢').length;
        const estrelas = '⭐'.repeat(verdeCount) + '☆'.repeat(3 - verdeCount);

        html += `
            <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 8px 10px; font-weight: 600; color: #00598a;">${acao.Ativo}</td>
                <td style="padding: 8px 10px; text-align: center;">${valDY} ${isNaN(dy) ? '-' : dy.toFixed(2)}%</td>
                <td style="padding: 8px 10px; text-align: center;">${valValorizacao} ${isNaN(valorizacao) ? '-' : valorizacao.toFixed(2)}%</td>
                <td style="padding: 8px 10px; text-align: center;">${valDivida} ${isNaN(divida) ? '-' : (divida / 1000000000).toFixed(1)}Bi</td>
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
                📌 <strong>Scorecard:</strong> Avaliação simplificada da qualidade da ação com base em DY, Valorização e Endividamento.
                <span style="display: block; margin-top: 2px; color: #999;">
                    🔍 Quanto mais estrelas ⭐, melhor a avaliação geral da ação.
                </span>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// ============================================================
// RENDERIZAR TABELA
// ============================================================

function renderizarTabela(acoes) {
    const container = document.getElementById("tabela-acoes-container");
    if (!container) return;

    if (acoes.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <p>Nenhuma ação encontrada no patrimônio.</p>
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

    for (const coluna of COLUNAS_ACOES) {
        const nomeExibicao = coluna
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .replace("Ativo", "Ativo");
        html += `<th style="padding: 12px 10px; text-align: left; font-weight: 600; color: #333; white-space: nowrap; border-bottom: 2px solid #e0e0e0;">${nomeExibicao}</th>`;
    }

    html += `</tr></thead><tbody>`;

    for (const acao of acoes) {
        html += `<tr style="border-bottom: 1px solid #f0f0f0;">`;
        for (const coluna of COLUNAS_ACOES) {
            const valor = acao[coluna] || "-";
            const isAtivo = coluna === "Ativo";
            html += `<td style="padding: 10px 10px; text-align: left; ${isAtivo ? 'font-weight: 600; color: #00598a;' : ''} ${valor === "ERRO" || valor === "VAZIO" ? 'color: #999; font-style: italic;' : ''}">${valor}</td>`;
        }
        html += `</tr>`;
    }

    html += `</tbody></table></div>`;

    const totalAcoes = acoes.length;
    const totalIndicadores = COLUNAS_ACOES.length - 1;
    let celulasPreenchidas = 0;
    for (const acao of acoes) {
        for (const coluna of COLUNAS_ACOES) {
            if (coluna !== "Ativo" && acao[coluna] && acao[coluna] !== "ERRO" && acao[coluna] !== "VAZIO") {
                celulasPreenchidas++;
            }
        }
    }
    const totalCelulas = acoes.length * totalIndicadores;
    const percentualPreenchido = totalCelulas > 0 ? ((celulasPreenchidas / totalCelulas) * 100).toFixed(1) : 0;

    html += `
        <div style="margin-top: 15px; padding: 12px 16px; background: #f9f9f9; border-radius: 6px; font-size: 13px; color: #555; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
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
    const graficosContainer = document.getElementById("graficos-acoes-container");

    if (!container) return;

    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
            <div style="display: inline-block; width: 30px; height: 30px; border: 3px solid #f3f3f3; border-top: 3px solid #00598a; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p style="margin-top: 15px;">Carregando dados das ações...</p>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        </div>
    `;

    try {
        const { dados } = await carregarPatrimonio();
        const acoes = dados.filter(reg => reg.Tipo && reg.Tipo.trim().toLowerCase() === "acoes");

        if (graficosContainer) {
            renderizarGraficos(acoes);
        }
        renderizarTabela(acoes);

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
        const resultado = await atualizarAcoes({
            onProgress: (msg) => {
                divProgresso.textContent += msg + "\n";
                divProgresso.scrollTop = divProgresso.scrollHeight;
            }
        });

        divProgresso.textContent += "\n========================================\n";
        divProgresso.textContent += `✅ ATUALIZAÇÃO CONCLUÍDA!\n`;
        divProgresso.textContent += `Total de ações: ${resultado.total}\n`;
        divProgresso.textContent += `Atualizadas: ${resultado.atualizados}\n`;
        divProgresso.textContent += `Erros: ${resultado.erros}\n`;
        if (resultado.commit) {
            divProgresso.textContent += `Commit: ${resultado.commit}\n`;
        }

        await atualizarAbaAcoes();

        if (divProgresso.parentNode) {
            divProgresso.remove();
        }

    } catch (erro) {
        console.error("Erro na atualização:", erro);
        divProgresso.textContent += `\n❌ ERRO: ${erro.message || "Falha na atualización"}`;
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
    const botao = document.getElementById("botao-atualizar-acoes");
    const container = document.getElementById("tabela-acoes-container");

    if (!container) {
        console
