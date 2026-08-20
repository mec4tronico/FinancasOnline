// ============================================================
// aba_acoes.js
// Exibe tabela e gráficos com indicadores exclusivos de AÇÕES
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
// RENDERIZAR GRÁFICOS
// ============================================================

function renderizarGraficos(acoes) {
    // =========================================================
    // GRÁFICO 1: Valuation Heatmap
    // =========================================================
    renderizarHeatmap(acoes);

    // =========================================================
    // GRÁFICO 2: Rentabilidade vs Endividamento (Bolhas)
    // =========================================================
    renderizarBolhas(acoes);

    // =========================================================
    // GRÁFICO 3: Crescimento (Radar)
    // =========================================================
    renderizarCrescimento(acoes);

    // =========================================================
    // GRÁFICO 4: Scorecard de Qualidade
    // =========================================================
    renderizarScorecard(acoes);
}

// ============================================================
// GRÁFICO 1: Valuation Heatmap
// ============================================================

function renderizarHeatmap(acoes) {
    const container = document.getElementById("grafico-heatmap");
    if (!container) return;

    const labels = acoes.map(a => a.Ativo);
    const indicadores = ["PL", "PVP", "EVEBITDA", "ValorFirma"];

    // Preparar dados: extrair valores numéricos e calcular cores
    const dados = acoes.map(acao => {
        return indicadores.map(ind => {
            const valor = parseFloat(String(acao[ind] || "0").replace(",", "."));
            return isNaN(valor) ? null : valor;
        });
    });

    // Calcular percentis para cores
    const todosValores = dados.flat().filter(v => v !== null);
    if (todosValores.length === 0) return;

    const min = Math.min(...todosValores);
    const max = Math.max(...todosValores);
    const range = max - min || 1;

    // Criar matriz de cores (verde = barato, vermelho = caro)
    const cores = dados.map(linha => {
        return linha.map(valor => {
            if (valor === null) return "#e0e0e0";
            const percentil = (valor - min) / range;
            // Do verde (baixo) ao vermelho (alto)
            const r = Math.round(percentil * 255);
            const g = Math.round((1 - percentil) * 255);
            const b = 80;
            return `rgb(${r}, ${g}, ${b})`;
        });
    });

    // Construir HTML do heatmap
    let html = `
        <div style="overflow-x: auto; font-size: 12px;">
            <table style="width: 100%; border-collapse: collapse; text-align: center;">
                <thead>
                    <tr>
                        <th style="padding: 6px; background: #f5f5f5; text-align: left;">Ativo</th>
                        ${indicadores.map(ind => `<th style="padding: 6px; background: #f5f5f5;">${ind}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
    `;

    for (let i = 0; i < acoes.length; i++) {
        const acao = acoes[i];
        html += `<tr>`;
        html += `<td style="padding: 6px; font-weight: 600; text-align: left; color: #00598a;">${acao.Ativo}</td>`;
        for (let j = 0; j < indicadores.length; j++) {
            const cor = cores[i]?.[j] || "#e0e0e0";
            const valor = dados[i]?.[j] !== null ? dados[i][j] : "-";
            html += `<td style="padding: 6px; background: ${cor}; color: ${cor === "#e0e0e0" ? "#999" : "#fff"};">${valor}</td>`;
        }
        html += `</tr>`;
    }

    html += `
                </tbody>
            </table>
            <div style="margin-top: 8px; display: flex; justify-content: space-between; font-size: 11px; color: #666;">
                <span>🟢 Barato (${min.toFixed(1)})</span>
                <span>🔴 Caro (${max.toFixed(1)})</span>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// ============================================================
// GRÁFICO 2: Rentabilidade vs Endividamento (Bolhas)
// ============================================================

function renderizarBolhas(acoes) {
    const container = document.getElementById("grafico-bolhas");
    if (!container) return;

    // Verificar se Chart.js está disponível
    if (typeof Chart === "undefined") {
        container.innerHTML = `<p style="color: #999; font-size: 13px;">📊 Chart.js não carregado. Gráfico de bolhas indisponível.</p>`;
        return;
    }

    // Destruir gráfico anterior se existir
    if (container._chart) {
        container._chart.destroy();
    }

    const dados = acoes.map(acao => {
        const roe = parseFloat(String(acao.ROE || "0").replace(",", "."));
        const dividaPL = parseFloat(String(acao.DividaLiquidaPL || "0").replace(",", "."));
        const valorFirma = parseFloat(String(acao.ValorFirma || "0").replace(",", "."));
        return {
            x: isNaN(dividaPL) ? 0 : dividaPL,
            y: isNaN(roe) ? 0 : roe,
            r: Math.sqrt(Math.abs(valorFirma) / 1000000000) * 5 + 3 || 5,
            label: acao.Ativo
        };
    });

    const ctx = document.createElement("canvas");
    container.innerHTML = "";
    container.appendChild(ctx);

    try {
        container._chart = new Chart(ctx, {
            type: 'bubble',
            data: {
                datasets: [{
                    label: 'Rentabilidade vs Endividamento',
                    data: dados,
                    backgroundColor: dados.map(() => `rgba(33, 150, 243, 0.7)`),
                    borderColor: dados.map(() => `rgba(33, 150, 243, 1)`),
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
                                return `${d.label}: ROE=${d.y.toFixed(1)}%, Dívida/PL=${d.x.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Dívida Líquida / PL', font: { size: 11 } },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    y: {
                        title: { display: true, text: 'ROE (%)', font: { size: 11 } },
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        beginAtZero: true
                    }
                }
            }
        });
    } catch (e) {
        console.warn("Erro ao renderizar gráfico de bolhas:", e);
        container.innerHTML = `<p style="color: #999; font-size: 13px;">⚠️ Erro ao carregar gráfico de bolhas.</p>`;
    }
}

// ============================================================
// GRÁFICO 3: Crescimento (Radar)
// ============================================================

function renderizarCrescimento(acoes) {
    const container = document.getElementById("grafico-crescimento");
    if (!container) return;

    if (typeof Chart === "undefined") {
        container.innerHTML = `<p style="color: #999; font-size: 13px;">📊 Chart.js não carregado. Gráfico radar indisponível.</p>`;
        return;
    }

    if (container._chart) {
        container._chart.destroy();
    }

    // Selecionar top 5 por ROE para não poluir
    const top5 = [...acoes]
        .sort((a, b) => parseFloat(String(b.ROE || "0").replace(",", ".")) - parseFloat(String(a.ROE || "0").replace(",", ".")))
        .slice(0, 5);

    const labels = ['Cresc. Receita', 'Cresc. Lucro', 'Margem Líquida', 'Margem Bruta', 'ROE', 'ROIC'];
    const cores = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336'];

    const datasets = top5.map((acao, i) => {
        const data = [
            parseFloat(String(acao.CrescimentoReceita || "0").replace(",", ".")) || 0,
            parseFloat(String(acao.CrescimentoLucro || "0").replace(",", ".")) || 0,
            parseFloat(String(acao.MargemLiquida || "0").replace(",", ".")) || 0,
            parseFloat(String(acao.MargemBruta || "0").replace(",", ".")) || 0,
            parseFloat(String(acao.ROE || "0").replace(",", ".")) || 0,
            parseFloat(String(acao.ROIC || "0").replace(",", ".")) || 0
        ];
        return {
            label: acao.Ativo,
            data: data,
            backgroundColor: cores[i % cores.length] + '33',
            borderColor: cores[i % cores.length],
            borderWidth: 2,
            pointBackgroundColor: cores[i % cores.length]
        };
    });

    const ctx = document.createElement("canvas");
    container.innerHTML = "";
    container.appendChild(ctx);

    try {
        container._chart = new Chart(ctx, {
            type: 'radar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { font: { size: 10 } } }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.1)' },
                        pointLabels: { font: { size: 10 } }
                    }
                }
            }
        });
    } catch (e) {
        console.warn("Erro ao renderizar gráfico radar:", e);
        container.innerHTML = `<p style="color: #999; font-size: 13px;">⚠️ Erro ao carregar gráfico radar.</p>`;
    }
}

// ============================================================
// GRÁFICO 4: Scorecard de Qualidade
// ============================================================

function renderizarScorecard(acoes) {
    const container = document.getElementById("grafico-scorecard");
    if (!container) return;

    let html = `
        <div style="overflow-x: auto; font-size: 12px;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f5f5f5; border-bottom: 2px solid #e0e0e0;">
                        <th style="padding: 8px 10px; text-align: left;">Ativo</th>
                        <th style="padding: 8px 10px; text-align: center;">Valuation (PL)</th>
                        <th style="padding: 8px 10px; text-align: center;">Rentab. (ROE)</th>
                        <th style="padding: 8px 10px; text-align: center;">Endividamento</th>
                        <th style="padding: 8px 10px; text-align: center;">Cresc. (Lucro)</th>
                        <th style="padding: 8px 10px; text-align: center;">Score</th>
                    </tr>
                </thead>
                <tbody>
    `;

    for (const acao of acoes) {
        const pl = parseFloat(String(acao.PL || "999").replace(",", "."));
        const roe = parseFloat(String(acao.ROE || "0").replace(",", "."));
        const dividaPL = parseFloat(String(acao.DividaLiquidaPL || "999").replace(",", "."));
        const crescLucro = parseFloat(String(acao.CrescimentoLucro || "0").replace(",", "."));

        // Avaliação individual
        const valPL = isNaN(pl) ? '⚪' : pl < 10 ? '🟢' : pl < 20 ? '🟡' : '🔴';
        const valROE = isNaN(roe) ? '⚪' : roe > 20 ? '🟢' : roe > 10 ? '🟡' : '🔴';
        const valDivida = isNaN(dividaPL) ? '⚪' : dividaPL < 0.5 ? '🟢' : dividaPL < 1 ? '🟡' : '🔴';
        const valCresc = isNaN(crescLucro) ? '⚪' : crescLucro > 20 ? '🟢' : crescLucro > 5 ? '🟡' : '🔴';

        const verdeCount = [valPL, valROE, valDivida, valCresc].filter(v => v === '🟢').length;
        const estrelas = '⭐'.repeat(verdeCount) + '☆'.repeat(4 - verdeCount);

        html += `
            <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 8px 10px; font-weight: 600; color: #00598a;">${acao.Ativo}</td>
                <td style="padding: 8px 10px; text-align: center;">${valPL} ${isNaN(pl) ? '-' : pl.toFixed(1)}</td>
                <td style="padding: 8px 10px; text-align: center;">${valROE} ${isNaN(roe) ? '-' : roe.toFixed(1)}%</td>
                <td style="padding: 8px 10px; text-align: center;">${valDivida} ${isNaN(dividaPL) ? '-' : dividaPL.toFixed(2)}</td>
                <td style="padding: 8px 10px; text-align: center;">${valCresc} ${isNaN(crescLucro) ? '-' : crescLucro.toFixed(1)}%</td>
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
    const graficosContainer = document.getElementById("graficos-acoes-container");

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

        // 3. Renderizar gráficos (se o container existir)
        if (graficosContainer) {
            renderizarGraficos(acoes);
        }

        // 4. Renderizar tabela
        renderizarTabela(acoes);

        // 5. Atualizar status do botão
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

    // Mostrar progresso
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
