/**
 * ============================================================================
 * MÓDULO: RENTABILIDADE (aba_rentabilidade.js)
 * ============================================================================
 * Responsável por carregar, calcular e exibir a aba "3. 📈 Rentabilidade".
 *
 * Visualizações (empilhadas, uma embaixo da outra, bem espaçosas):
 *   3.1 — Valorização (barras)
 *   3.2 — Dividend Yield (barras)
 *   3.3 — Faixa de 52 semanas (posição do preço atual entre mín/máx)
 *   3.4 — Heatmap de desempenho (ganhos/perdas)
 *
 * Abaixo dos 4 gráficos: tabela resumo com 7 colunas
 *   Ativo | Valorização | DY | Faixa 52S | Potencial (Máx. 52s) |
 *   Risco (Mín. 52s) | Rentabilidade
 *
 * IMPORTANTE:
 * - Reaproveita processarDadosCSV() de aba_configuracao.js para não
 *   duplicar o parser de CSV. Este módulo faz seu PRÓPRIO fetch do
 *   arquivo (cada aba carrega seus dados de forma independente).
 * - Não altera patrimonio_consolidado.csv, nem qualquer estado de
 *   outros módulos.
 * - Não usa nenhuma biblioteca externa de gráficos: os 4 gráficos são
 *   desenhados com HTML/CSS/SVG puro, no mesmo espírito do restante
 *   do projeto.
 * ============================================================================
 */

import { processarDadosCSV } from "./aba_configuracao.js";

const ARQUIVO_CSV = "patrimonio_consolidado.csv";

// ID do elemento <div> da aba (definido no index.html / app.js)
const ID_CONTAINER_ABA = "tab-rentabilidade";

let ativosRentabilidade = [];


// ============================================================
// UTILITÁRIOS DE NÚMERO
// ============================================================
//
// O CSV mistura dois formatos:
// - Campos entre aspas, em pt-BR: "13,93" / "-28,82%"
// - Campos sem aspas, já em formato numérico: 4403.60
//
// converterNumero() trata os dois casos sem quebrar nenhum.
// ============================================================

function converterNumero(valor) {

    if (valor === undefined || valor === null) {
        return NaN;
    }

    let texto = String(valor).trim();

    if (texto === "") {
        return NaN;
    }

    texto = texto
        .replace(/^R\$\s?/, "")
        .replace(/%$/, "")
        .trim();

    // Se tem vírgula, é formato pt-BR ("1.234,56" ou "13,93")
    if (texto.includes(",")) {
        texto = texto.replace(/\./g, "").replace(",", ".");
    }

    return parseFloat(texto);
}

function formatarPercentual(numero) {

    if (!Number.isFinite(numero)) {
        return "-";
    }

    const sinal = numero > 0 ? "+" : "";

    return `${sinal}${numero.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}%`;
}

function formatarMoeda(numero) {

    if (!Number.isFinite(numero)) {
        return "-";
    }

    return numero.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}


// ============================================================
// CONVERTER LINHAS (ARRAYS) EM OBJETOS
// ============================================================
//
// processarDadosCSV() devolve { cabecalhosCSV, dadosPatrimonio },
// onde cada linha de dadosPatrimonio é um ARRAY posicional.
// Aqui convertemos cada linha em um objeto { NomeColuna: valor },
// e já calculamos os números que os gráficos precisam.
// ============================================================

function linhaParaAtivo(linha, cabecalhos) {

    const bruto = {};

    cabecalhos.forEach((coluna, indice) => {
        bruto[coluna] = linha[indice];
    });

    return {
        ativo: bruto.Ativo ?? "",
        tipo: bruto.Tipo ?? "",
        valorizacao: converterNumero(bruto.Valorizacao),
        dy: converterNumero(bruto.DY),
        min52: converterNumero(bruto.Min52),
        max52: converterNumero(bruto.Max52),
        valorAtual: converterNumero(bruto.ValorAtual),
        potencialMax52: converterNumero(bruto.PotencialFinanceiroMax52),
        riscoMin52: converterNumero(bruto.RiscoFinanceiroMin52),
        rentabilidade: converterNumero(bruto.Rentabilidade)
    };
}


// ============================================================
// ESTILOS (injetados uma única vez)
// ============================================================

let estilosInjetados = false;

function injetarEstilos() {

    if (estilosInjetados) {
        return;
    }

    const estilo = document.createElement("style");

    estilo.id = "fo-estilos-aba-rentabilidade";

    estilo.textContent = `
        .far-wrapper {
            display: flex;
            flex-direction: column;
            gap: 48px;
            padding: 8px 4px 32px;
            font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        .far-cartao {
            background: #ffffff;
            border: 1px solid #e2e2e2;
            border-radius: 12px;
            padding: 24px 24px 28px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }

        .far-titulo {
            font-size: 18px;
            font-weight: 700;
            color: #1f2933;
            margin: 0 0 4px;
        }

        .far-subtitulo {
            font-size: 13px;
            color: #6b7280;
            margin: 0 0 20px;
        }

        .far-status {
            padding: 40px 0;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
        }

        /* ---------- 3.1 / 3.2 — Barras horizontais ---------- */

        .far-lista-barras {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .far-linha-barra {
            display: grid;
            grid-template-columns: 90px 1fr 90px;
            align-items: center;
            gap: 12px;
        }

        .far-linha-barra .far-ativo-label {
            font-weight: 700;
            font-size: 13.5px;
            color: #1f2933;
        }

        .far-trilha-barra {
            position: relative;
            height: 22px;
            background: #f1f3f5;
            border-radius: 6px;
            overflow: hidden;
        }

        .far-barra-preenchimento {
            position: absolute;
            top: 0;
            bottom: 0;
            border-radius: 6px;
        }

        .far-barra-preenchimento.far-cor-positiva {
            background: #34a853;
        }

        .far-barra-preenchimento.far-cor-negativa {
            background: #d93025;
        }

        .far-barra-preenchimento.far-cor-neutra-dy {
            background: #2f7ed8;
        }

        .far-valor-barra {
            font-size: 13px;
            font-weight: 600;
            text-align: right;
            white-space: nowrap;
        }

        /* ---------- 3.3 — Faixa de 52 semanas ---------- */

        .far-lista-faixas {
            display: flex;
            flex-direction: column;
            gap: 18px;
        }

        .far-linha-faixa {
            display: grid;
            grid-template-columns: 90px 1fr;
            align-items: center;
            gap: 12px;
        }

        .far-trilha-faixa {
            position: relative;
            height: 10px;
            border-radius: 6px;
            background: linear-gradient(
                to right,
                #d93025 0%,
                #f4b400 50%,
                #34a853 100%
            );
        }

        .far-marcador-faixa {
            position: absolute;
            top: 50%;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #1f2933;
            border: 2px solid #ffffff;
            box-shadow: 0 0 0 1px #1f2933;
            transform: translate(-50%, -50%);
        }

        .far-legenda-faixa {
            display: flex;
            justify-content: space-between;
            font-size: 11.5px;
            color: #6b7280;
            margin-top: 6px;
        }

        .far-legenda-faixa strong {
            color: #1f2933;
        }

        /* ---------- 3.4 — Heatmap ---------- */

        .far-grade-heatmap {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 10px;
        }

        .far-celula-heatmap {
            border-radius: 10px;
            padding: 14px 10px;
            text-align: center;
            color: #ffffff;
            font-weight: 700;
        }

        .far-celula-heatmap .far-heatmap-ativo {
            font-size: 13.5px;
            margin-bottom: 6px;
        }

        .far-celula-heatmap .far-heatmap-valor {
            font-size: 15px;
        }

        /* ---------- Tabela resumo ---------- */

        .far-tabela-container {
            width: 100%;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            border: 1px solid #e2e2e2;
            border-radius: 8px;
        }

        .far-tabela-container table {
            border-collapse: collapse;
            width: max-content;
            min-width: 100%;
            font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 14.5px;
        }

        .far-tabela-container thead th {
            position: sticky;
            top: 0;
            z-index: 2;
            background-color: #1f2933;
            color: #ffffff;
            font-size: 15px;
            font-weight: 700;
            padding: 10px 14px;
            white-space: nowrap;
            text-align: left;
            border-bottom: 2px solid #0f1620;
        }

        .far-tabela-container tbody td {
            padding: 8px 14px;
            white-space: nowrap;
            border-bottom: 1px solid #ececec;
            color: #2b2b2b;
        }

        .far-tabela-container tbody tr:nth-child(even) {
            background-color: #fafafa;
        }

        .far-tabela-container tbody tr:hover {
            background-color: #f0f4f8;
        }

        .far-alinhar-esquerda {
            text-align: left;
        }

        .far-alinhar-direita {
            text-align: right;
        }

        .far-ativo-destaque {
            font-weight: 700;
            color: #1f2933;
        }

        .far-valor-positivo {
            color: #1b8a4c;
        }

        .far-valor-negativo {
            color: #c62828;
        }

        .far-valor-neutro {
            color: #2b2b2b;
        }
    `;

    document.head.appendChild(estilo);

    estilosInjetados = true;
}


// ============================================================
// CONTAINER PRINCIPAL DA ABA
// ============================================================

function obterContainerAba() {

    return document.getElementById(ID_CONTAINER_ABA);
}

function garantirEstruturaAba(containerAba) {

    let wrapper = containerAba.querySelector(".far-wrapper");

    if (wrapper) {
        return wrapper;
    }

    containerAba.innerHTML = "";

    wrapper = document.createElement("div");
    wrapper.className = "far-wrapper";

    wrapper.innerHTML = `
        <section class="far-cartao" id="far-cartao-valorizacao">
            <h3 class="far-titulo">3.1 — Valorização</h3>
            <p class="far-subtitulo">Variação percentual do preço desde a compra, por ativo.</p>
            <div class="far-conteudo far-status">Carregando...</div>
        </section>

        <section class="far-cartao" id="far-cartao-dy">
            <h3 class="far-titulo">3.2 — Dividend Yield</h3>
            <p class="far-subtitulo">Comparativo do dividend yield (DY) entre os ativos da carteira.</p>
            <div class="far-conteudo far-status">Carregando...</div>
        </section>

        <section class="far-cartao" id="far-cartao-faixa52">
            <h3 class="far-titulo">3.3 — Faixa de 52 semanas</h3>
            <p class="far-subtitulo">Posição do preço atual entre a mínima e a máxima dos últimos 52 semanas.</p>
            <div class="far-conteudo far-status">Carregando...</div>
        </section>

        <section class="far-cartao" id="far-cartao-heatmap">
            <h3 class="far-titulo">3.4 — Heatmap de desempenho</h3>
            <p class="far-subtitulo">Visualização rápida de ganhos e perdas (rentabilidade da posição).</p>
            <div class="far-conteudo far-status">Carregando...</div>
        </section>

        <section class="far-cartao" id="far-cartao-tabela">
            <h3 class="far-titulo">Resumo de Rentabilidade</h3>
            <p class="far-subtitulo">Ativo, valorização, DY, faixa de 52 semanas, potencial, risco e rentabilidade.</p>
            <div class="far-conteudo far-status">Carregando...</div>
        </section>
    `;

    containerAba.appendChild(wrapper);

    return wrapper;
}


// ============================================================
// 3.1 — VALORIZAÇÃO (barras)
// ============================================================

function renderizarValorizacao(wrapper, ativos) {

    const alvo = wrapper.querySelector("#far-cartao-valorizacao .far-conteudo");

    const ordenados = [...ativos].sort(
        (a, b) => b.valorizacao - a.valorizacao
    );

    const maiorModulo = Math.max(
        1,
        ...ordenados.map(item => Math.abs(item.valorizacao) || 0)
    );

    const lista = document.createElement("div");
    lista.className = "far-lista-barras";

    ordenados.forEach(item => {

        const percentualLargura =
            (Math.abs(item.valorizacao) / maiorModulo) * 100;

        const positiva = item.valorizacao >= 0;

        const linha = document.createElement("div");
        linha.className = "far-linha-barra";

        linha.innerHTML = `
            <span class="far-ativo-label">${item.ativo}</span>
            <div class="far-trilha-barra">
                <div
                    class="far-barra-preenchimento ${positiva ? "far-cor-positiva" : "far-cor-negativa"}"
                    style="left:0; width:${percentualLargura}%;"
                ></div>
            </div>
            <span class="far-valor-barra ${positiva ? "far-valor-positivo" : "far-valor-negativo"}">
                ${formatarPercentual(item.valorizacao)}
            </span>
        `;

        lista.appendChild(linha);
    });

    alvo.replaceWith(lista);
}


// ============================================================
// 3.2 — DIVIDEND YIELD (barras)
// ============================================================

function renderizarDividendYield(wrapper, ativos) {

    const alvo = wrapper.querySelector("#far-cartao-dy .far-conteudo");

    const ordenados = [...ativos].sort((a, b) => b.dy - a.dy);

    const maiorDy = Math.max(1, ...ordenados.map(item => item.dy || 0));

    const lista = document.createElement("div");
    lista.className = "far-lista-barras";

    ordenados.forEach(item => {

        const percentualLargura =
            (Math.max(0, item.dy) / maiorDy) * 100;

        const linha = document.createElement("div");
        linha.className = "far-linha-barra";

        linha.innerHTML = `
            <span class="far-ativo-label">${item.ativo}</span>
            <div class="far-trilha-barra">
                <div
                    class="far-barra-preenchimento far-cor-neutra-dy"
                    style="left:0; width:${percentualLargura}%;"
                ></div>
            </div>
            <span class="far-valor-barra far-valor-neutro">
                ${formatarPercentual(item.dy)}
            </span>
        `;

        lista.appendChild(linha);
    });

    alvo.replaceWith(lista);
}


// ============================================================
// 3.3 — FAIXA DE 52 SEMANAS
// ============================================================

function renderizarFaixa52Semanas(wrapper, ativos) {

    const alvo = wrapper.querySelector("#far-cartao-faixa52 .far-conteudo");

    const lista = document.createElement("div");
    lista.className = "far-lista-faixas";

    ativos.forEach(item => {

        const { min52, max52, valorAtual } = item;

        let posicaoPercentual = 50;

        if (Number.isFinite(min52) && Number.isFinite(max52) && max52 > min52) {

            posicaoPercentual =
                ((valorAtual - min52) / (max52 - min52)) * 100;

            posicaoPercentual = Math.min(100, Math.max(0, posicaoPercentual));
        }

        const linha = document.createElement("div");
        linha.className = "far-linha-faixa";

        linha.innerHTML = `
            <span class="far-ativo-label">${item.ativo}</span>
            <div>
                <div class="far-trilha-faixa">
                    <div
                        class="far-marcador-faixa"
                        style="left:${posicaoPercentual}%;"
                        title="${formatarMoeda(valorAtual)}"
                    ></div>
                </div>
                <div class="far-legenda-faixa">
                    <span>Mín. <strong>${formatarMoeda(min52)}</strong></span>
                    <span>Atual <strong>${formatarMoeda(valorAtual)}</strong></span>
                    <span>Máx. <strong>${formatarMoeda(max52)}</strong></span>
                </div>
            </div>
        `;

        lista.appendChild(linha);
    });

    alvo.replaceWith(lista);
}


// ============================================================
// 3.4 — HEATMAP DE DESEMPENHO
// ============================================================

function corHeatmap(valor, maiorModulo) {

    if (!Number.isFinite(valor) || maiorModulo === 0) {
        return "rgba(107, 114, 128, 0.6)";
    }

    const intensidade = Math.min(1, Math.abs(valor) / maiorModulo);

    // Intensidade mínima de 0.25 para nenhuma célula ficar "apagada" demais
    const alfa = 0.25 + intensidade * 0.65;

    return valor >= 0
        ? `rgba(27, 138, 76, ${alfa.toFixed(2)})`
        : `rgba(198, 40, 40, ${alfa.toFixed(2)})`;
}

function renderizarHeatmap(wrapper, ativos) {

    const alvo = wrapper.querySelector("#far-cartao-heatmap .far-conteudo");

    const maiorModulo = Math.max(
        1,
        ...ativos.map(item => Math.abs(item.rentabilidade) || 0)
    );

    const grade = document.createElement("div");
    grade.className = "far-grade-heatmap";

    ativos.forEach(item => {

        const celula = document.createElement("div");
        celula.className = "far-celula-heatmap";
        celula.style.backgroundColor = corHeatmap(item.rentabilidade, maiorModulo);

        celula.innerHTML = `
            <div class="far-heatmap-ativo">${item.ativo}</div>
            <div class="far-heatmap-valor">${formatarPercentual(item.rentabilidade)}</div>
        `;

        grade.appendChild(celula);
    });

    alvo.replaceWith(grade);
}


// ============================================================
// TABELA RESUMO (7 colunas)
// ============================================================

function classeCor(valor) {

    if (!Number.isFinite(valor) || valor === 0) {
        return "far-valor-neutro";
    }

    return valor > 0 ? "far-valor-positivo" : "far-valor-negativo";
}

function renderizarTabela(wrapper, ativos) {

    const alvo = wrapper.querySelector("#far-cartao-tabela .far-conteudo");

    const container = document.createElement("div");
    container.className = "far-tabela-container";

    const tabela = document.createElement("table");

    const thead = document.createElement("thead");
    thead.innerHTML = `
        <tr>
            <th>Ativo</th>
            <th>Valorização</th>
            <th>DY</th>
            <th>Faixa 52S (Mín. – Máx.)</th>
            <th>Potencial (Máx. 52s)</th>
            <th>Risco (Mín. 52s)</th>
            <th>Rentabilidade</th>
        </tr>
    `;

    const tbody = document.createElement("tbody");

    ativos.forEach(item => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td class="far-alinhar-esquerda far-ativo-destaque">${item.ativo}</td>
            <td class="far-alinhar-direita ${classeCor(item.valorizacao)}">${formatarPercentual(item.valorizacao)}</td>
            <td class="far-alinhar-direita far-valor-neutro">${formatarPercentual(item.dy)}</td>
            <td class="far-alinhar-direita far-valor-neutro">${formatarMoeda(item.min52)} – ${formatarMoeda(item.max52)}</td>
            <td class="far-alinhar-direita far-valor-positivo">${formatarMoeda(item.potencialMax52)}</td>
            <td class="far-alinhar-direita far-valor-negativo">${formatarMoeda(item.riscoMin52)}</td>
            <td class="far-alinhar-direita ${classeCor(item.rentabilidade)}">${formatarPercentual(item.rentabilidade)}</td>
        `;

        tbody.appendChild(tr);
    });

    tabela.appendChild(thead);
    tabela.appendChild(tbody);
    container.appendChild(tabela);

    alvo.replaceWith(container);
}


// ============================================================
// CARREGAR CSV E RENDERIZAR TUDO
// ============================================================

async function carregarERenderizar() {

    const containerAba = obterContainerAba();

    if (!containerAba) {
        console.error(
            `[Aba Rentabilidade] Elemento #${ID_CONTAINER_ABA} não encontrado.`
        );
        return;
    }

    injetarEstilos();

    const wrapper = garantirEstruturaAba(containerAba);

    try {

        const timestamp = Date.now();

        const resposta = await fetch(
            `${ARQUIVO_CSV}?t=${timestamp}`,
            { cache: "no-store" }
        );

        if (!resposta.ok) {
            throw new Error(
                `Não foi possível carregar ${ARQUIVO_CSV} (HTTP ${resposta.status}).`
            );
        }

        const textoCSV = await resposta.text();

        const { cabecalhosCSV, dadosPatrimonio } = processarDadosCSV(textoCSV);

        ativosRentabilidade = dadosPatrimonio.map(
            linha => linhaParaAtivo(linha, cabecalhosCSV)
        );

        renderizarValorizacao(wrapper, ativosRentabilidade);
        renderizarDividendYield(wrapper, ativosRentabilidade);
        renderizarFaixa52Semanas(wrapper, ativosRentabilidade);
        renderizarHeatmap(wrapper, ativosRentabilidade);
        renderizarTabela(wrapper, ativosRentabilidade);

        console.log(
            `[Aba Rentabilidade] ${ativosRentabilidade.length} ativos renderizados.`
        );

    } catch (erro) {

        console.error("[Aba Rentabilidade] Erro ao carregar dados:", erro);

        wrapper.querySelectorAll(".far-conteudo").forEach(elemento => {
            elemento.textContent = `Erro ao carregar dados: ${erro.message}`;
        });
    }
}


// ============================================================
// PONTO DE ENTRADA (chamado por app.js via MODULOS_FUTUROS)
// ============================================================

async function atualizarAbaRentabilidade() {
    await carregarERenderizar();
}

export {
    atualizarAbaRentabilidade
};
