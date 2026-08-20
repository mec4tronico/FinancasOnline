/**
 * ============================================================================
 * MÓDULO: RENTABILIDADE (aba_rentabilidade.js)
 * ============================================================================
 * Responsável por carregar e exibir a aba "3. 📈 Rentabilidade".
 *
 * Visualizações:
 *
 *   3.1 — Faixa de 52 semanas
 *          - Mínimo 52S
 *          - Valor atual
 *          - Média 52S
 *          - Máximo 52S
 *          - Renda mensal fictícia total
 *          - Renda anual fictícia total
 *
 *   3.2 — Diferença para a Média 52S
 *          - Valor atual da posição
 *          - Valor fictício da posição na Média 52S
 *
 *   3.3 — Renda mensal fictícia na Média 52S
 *
 *   3.4 — Valorização
 *
 *   3.5 — Dividend Yield
 *
 *   3.6 — Heatmap de desempenho
 *
 *   Tabela resumo
 *
 * IMPORTANTE:
 * - Reaproveita processarDadosCSV() de aba_configuracao.js.
 * - Os cálculos da Média 52S são feitos por calculos.js.
 * - Não altera patrimonio_consolidado.csv.
 * - Não utiliza biblioteca externa de gráficos.
 * - Os gráficos são construídos com HTML/CSS.
 * ============================================================================
 */

import { processarDadosCSV } from "./aba_configuracao.js";

import {
    calculo_medio52S
} from "./calculos.js";


const ARQUIVO_CSV = "patrimonio_consolidado.csv";

const ID_CONTAINER_ABA = "tab-rentabilidade";

let ativosRentabilidade = [];


// ============================================================
// UTILITÁRIOS DE NÚMERO
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

    if (texto.includes(",")) {
        texto = texto
            .replace(/\./g, "")
            .replace(",", ".");
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
// CONVERTER LINHA DO CSV EM OBJETO
// ============================================================

function linhaParaAtivo(linha, cabecalhos) {

    const bruto = {};

    cabecalhos.forEach((coluna, indice) => {
        bruto[coluna] = linha[indice];
    });


    const ativo = {
        ativo: bruto.Ativo ?? "",
        tipo: bruto.Tipo ?? "",

        quantidade:
            converterNumero(bruto.Quantidade),

        valorAtual:
            converterNumero(bruto.ValorAtual),

        min52:
            converterNumero(bruto.Min52),

        max52:
            converterNumero(bruto.Max52),

        dy:
            converterNumero(bruto.DY),

        valorizacao:
            converterNumero(bruto.Valorizacao),

        potencialMax52:
            converterNumero(bruto.PotencialFinanceiroMax52),

        riscoMin52:
            converterNumero(bruto.RiscoFinanceiroMin52),

        rentabilidade:
            converterNumero(bruto.Rentabilidade),

        valorAtualPosicao:
            converterNumero(bruto.ValorAtualPosicao)
    };


    // --------------------------------------------------------
    // Cálculos centralizados em calculos.js
    // --------------------------------------------------------

    const calculo = calculo_medio52S({
        quantidade: ativo.quantidade,
        valorAtual: ativo.valorAtual,
        min52: ativo.min52,
        max52: ativo.max52,
        dy: ativo.dy
    });


    return {
        ...ativo,

        media52S:
            calculo.media52S,

        valorFicticio:
            calculo.valorFicticio,

        rendaMensalFicticia:
            calculo.rendaMensalFicticia,

        rendaAnualFicticia:
            calculo.rendaAnualFicticia,

        diferencaValorAtual:
            calculo.diferencaValorAtual
    };
}


// ============================================================
// ESTILOS
// ============================================================

let estilosInjetados = false;


function injetarEstilos() {

    if (estilosInjetados) {
        return;
    }


    const estilo =
        document.createElement("style");


    estilo.id =
        "fo-estilos-aba-rentabilidade";


    estilo.textContent = `

        .far-wrapper {
            display: flex;
            flex-direction: column;
            gap: 48px;
            padding: 8px 4px 32px;
            font-family:
                "Segoe UI",
                Roboto,
                "Helvetica Neue",
                Arial,
                sans-serif;
        }


        .far-cartao {
            background: #ffffff;
            border: 1px solid #e2e2e2;
            border-radius: 12px;
            padding: 24px 24px 28px;
            box-shadow:
                0 1px 3px rgba(0, 0, 0, 0.04);
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


        /* =====================================================
           KPIs
           ===================================================== */

        .far-kpis {
            display: grid;
            grid-template-columns:
                repeat(2, minmax(220px, 1fr));
            gap: 16px;
            margin-bottom: 28px;
        }


        .far-kpi {
            border: 1px solid #e2e2e2;
            border-radius: 10px;
            padding: 18px 20px;
            background: #fafafa;
        }


        .far-kpi-label {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 6px;
        }


        .far-kpi-valor {
            font-size: 24px;
            font-weight: 700;
            color: #1f2933;
        }


        /* =====================================================
           BARRAS
           ===================================================== */

        .far-lista-barras {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }


        .far-linha-barra {
            display: grid;
            grid-template-columns:
                90px 1fr 140px;

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


        .far-cor-positiva {
            background: #34a853;
        }


        .far-cor-negativa {
            background: #d93025;
        }


        .far-cor-neutra-dy {
            background: #2f7ed8;
        }


        .far-cor-ficticia {
            background: #7b61a8;
        }


        .far-valor-barra {
            font-size: 13px;
            font-weight: 600;
            text-align: right;
            white-space: nowrap;
        }


        /* =====================================================
           FAIXA 52 SEMANAS
           ===================================================== */

        .far-lista-faixas {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }


        .far-linha-faixa {
            display: grid;
            grid-template-columns:
                90px 1fr;

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

            box-shadow:
                0 0 0 1px #1f2933;

            transform:
                translate(-50%, -50%);
        }


        .far-marcador-media {
            position: absolute;
            top: 50%;

            width: 10px;
            height: 10px;

            border-radius: 50%;

            background: #ffffff;

            border: 2px solid #7b61a8;

            transform:
                translate(-50%, -50%);
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


        /* =====================================================
           HEATMAP
           ===================================================== */

        .far-grade-heatmap {
            display: grid;

            grid-template-columns:
                repeat(
                    auto-fill,
                    minmax(120px, 1fr)
                );

            gap: 10px;
        }


        .far-celula-heatmap {
            border-radius: 10px;
            padding: 14px 10px;

            text-align: center;

            color: #ffffff;
            font-weight: 700;
        }


        .far-celula-heatmap
        .far-heatmap-ativo {
            font-size: 13.5px;
            margin-bottom: 6px;
        }


        .far-celula-heatmap
        .far-heatmap-valor {
            font-size: 15px;
        }


        /* =====================================================
           TABELA
           ===================================================== */

        .far-tabela-container {
            width: 100%;
            overflow-x: auto;

            -webkit-overflow-scrolling:
                touch;

            border:
                1px solid #e2e2e2;

            border-radius: 8px;
        }


        .far-tabela-container table {
            border-collapse: collapse;

            width: max-content;
            min-width: 100%;

            font-family:
                "Segoe UI",
                Roboto,
                "Helvetica Neue",
                Arial,
                sans-serif;

            font-size: 14px;
        }


        .far-tabela-container
        thead th {

            position: sticky;
            top: 0;

            z-index: 2;

            background-color:
                #1f2933;

            color: #ffffff;

            font-size: 14px;
            font-weight: 700;

            padding:
                10px 14px;

            white-space:
                nowrap;

            text-align:
                left;

            border-bottom:
                2px solid #0f1620;
        }


        .far-tabela-container
        tbody td {

            padding:
                8px 14px;

            white-space:
                nowrap;

            border-bottom:
                1px solid #ececec;

            color:
                #2b2b2b;
        }


        .far-tabela-container
        tbody tr:nth-child(even) {
            background-color:
                #fafafa;
        }


        .far-tabela-container
        tbody tr:hover {
            background-color:
                #f0f4f8;
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


        .far-valor-ficticio {
            color: #7b61a8;
            font-weight: 600;
        }


        @media (max-width: 700px) {

            .far-kpis {
                grid-template-columns: 1fr;
            }

            .far-linha-barra {
                grid-template-columns:
                    70px 1fr 110px;
            }

        }

    `;


    document.head.appendChild(estilo);

    estilosInjetados = true;
}


// ============================================================
// CONTAINER
// ============================================================

function obterContainerAba() {

    return document.getElementById(
        ID_CONTAINER_ABA
    );
}


function garantirEstruturaAba(containerAba) {

    let wrapper =
        containerAba.querySelector(
            ".far-wrapper"
        );


    if (wrapper) {
        return wrapper;
    }


    containerAba.innerHTML = "";


    wrapper =
        document.createElement("div");


    wrapper.className =
        "far-wrapper";


    wrapper.innerHTML = `

        <section
            class="far-cartao"
            id="far-cartao-faixa52"
        >

            <h3 class="far-titulo">
                3.1 — Faixa de 52 semanas
            </h3>

            <p class="far-subtitulo">
                Posição do preço atual entre a mínima,
                média e máxima dos últimos 52 semanas.
            </p>

            <div class="far-conteudo far-status">
                Carregando...
            </div>

        </section>


        <section
            class="far-cartao"
            id="far-cartao-diferenca52"
        >

            <h3 class="far-titulo">
                3.2 — Diferença para a Média 52S
            </h3>

            <p class="far-subtitulo">
                Diferença entre o valor atual da posição
                e o valor fictício caso a cotação estivesse
                na Média 52S.
            </p>

            <div class="far-conteudo far-status">
                Carregando...
            </div>

        </section>


        <section
            class="far-cartao"
            id="far-cartao-renda52"
        >

            <h3 class="far-titulo">
                3.3 — Renda mensal fictícia na Média 52S
            </h3>

            <p class="far-subtitulo">
                Renda mensal estimada caso cada ativo
                estivesse cotado na sua Média 52S.
            </p>

            <div class="far-conteudo far-status">
                Carregando...
            </div>

        </section>


        <section
            class="far-cartao"
            id="far-cartao-valorizacao"
        >

            <h3 class="far-titulo">
                3.4 — Valorização
            </h3>

            <p class="far-subtitulo">
                Variação percentual do preço desde a compra,
                por ativo.
            </p>

            <div class="far-conteudo far-status">
                Carregando...
            </div>

        </section>


        <section
            class="far-cartao"
            id="far-cartao-dy"
        >

            <h3 class="far-titulo">
                3.5 — Dividend Yield
            </h3>

            <p class="far-subtitulo">
                Comparativo do dividend yield entre
                os ativos da carteira.
            </p>

            <div class="far-conteudo far-status">
                Carregando...
            </div>

        </section>


        <section
            class="far-cartao"
            id="far-cartao-heatmap"
        >

            <h3 class="far-titulo">
                3.6 — Heatmap de desempenho
            </h3>

            <p class="far-subtitulo">
                Visualização rápida de ganhos e perdas
                pela rentabilidade da posição.
            </p>

            <div class="far-conteudo far-status">
                Carregando...
            </div>

        </section>


        <section
            class="far-cartao"
            id="far-cartao-tabela"
        >

            <h3 class="far-titulo">
                Resumo de Rentabilidade
            </h3>

            <p class="far-subtitulo">
                Resumo dos principais indicadores
                de rentabilidade e Média 52S.
            </p>

            <div class="far-conteudo far-status">
                Carregando...
            </div>

        </section>

    `;


    containerAba.appendChild(wrapper);

    return wrapper;
}


// ============================================================
// 3.1 — FAIXA DE 52 SEMANAS
// ============================================================

function renderizarFaixa52Semanas(
    wrapper,
    ativos
) {

    const alvo =
        wrapper.querySelector(
            "#far-cartao-faixa52 .far-conteudo"
        );


    // --------------------------------------------------------
    // KPIs
    // --------------------------------------------------------

    const rendaMensalTotal =
        ativos.reduce(
            (total, item) =>
                total +
                (
                    Number.isFinite(
                        item.rendaMensalFicticia
                    )
                        ? item.rendaMensalFicticia
                        : 0
                ),
            0
        );


    const rendaAnualTotal =
        ativos.reduce(
            (total, item) =>
                total +
                (
                    Number.isFinite(
                        item.rendaAnualFicticia
                    )
                        ? item.rendaAnualFicticia
                        : 0
                ),
            0
        );


    const conteudo =
        document.createElement("div");


    conteudo.innerHTML = `

        <div class="far-kpis">

            <div class="far-kpi">

                <div class="far-kpi-label">
                    Renda mensal fictícia total
                </div>

                <div class="far-kpi-valor">
                    ${formatarMoeda(
                        rendaMensalTotal
                    )}
                </div>

            </div>


            <div class="far-kpi">

                <div class="far-kpi-label">
                    Renda anual fictícia total
                </div>

                <div class="far-kpi-valor">
                    ${formatarMoeda(
                        rendaAnualTotal
                    )}
                </div>

            </div>

        </div>

    `;


    const lista =
        document.createElement("div");


    lista.className =
        "far-lista-faixas";


    ativos.forEach(item => {

        const {
            min52,
            max52,
            valorAtual,
            media52S
        } = item;


        let posicaoAtual = 50;
        let posicaoMedia = 50;


        if (
            Number.isFinite(min52) &&
            Number.isFinite(max52) &&
            max52 > min52
        ) {

            posicaoAtual =
                (
                    (valorAtual - min52) /
                    (max52 - min52)
                ) * 100;


            posicaoMedia =
                (
                    (media52S - min52) /
                    (max52 - min52)
                ) * 100;


            posicaoAtual =
                Math.min(
                    100,
                    Math.max(
                        0,
                        posicaoAtual
                    )
                );


            posicaoMedia =
                Math.min(
                    100,
                    Math.max(
                        0,
                        posicaoMedia
                    )
                );
        }


        const linha =
            document.createElement("div");


        linha.className =
            "far-linha-faixa";


        linha.innerHTML = `

            <span class="far-ativo-label">
                ${item.ativo}
            </span>

            <div>

                <div class="far-trilha-faixa">

                    <div
                        class="far-marcador-media"
                        style="
                            left:${posicaoMedia}%;
                        "
                        title="
                            Média 52S:
                            ${formatarMoeda(media52S)}
                        "
                    ></div>


                    <div
                        class="far-marcador-faixa"
                        style="
                            left:${posicaoAtual}%;
                        "
                        title="
                            Atual:
                            ${formatarMoeda(valorAtual)}
                        "
                    ></div>

                </div>


                <div class="far-legenda-faixa">

                    <span>
                        Mín.
                        <strong>
                            ${formatarMoeda(min52)}
                        </strong>
                    </span>


                    <span>
                        Média
                        <strong>
                            ${formatarMoeda(media52S)}
                        </strong>
                    </span>


                    <span>
                        Atual
                        <strong>
                            ${formatarMoeda(valorAtual)}
                        </strong>
                    </span>


                    <span>
                        Máx.
                        <strong>
                            ${formatarMoeda(max52)}
                        </strong>
                    </span>

                </div>

            </div>

        `;


        lista.appendChild(linha);
    });


    conteudo.appendChild(lista);

    alvo.replaceWith(conteudo);
}


// ============================================================
// 3.2 — DIFERENÇA PARA A MÉDIA 52S
// ============================================================

function renderizarDiferencaMedia52S(
    wrapper,
    ativos
) {

    const alvo =
        wrapper.querySelector(
            "#far-cartao-diferenca52 .far-conteudo"
        );


    const ordenados =
        [...ativos].sort(
            (a, b) =>
                Math.abs(
                    b.diferencaValorAtual
                ) -
                Math.abs(
                    a.diferencaValorAtual
                )
        );


    const maiorModulo =
        Math.max(
            1,
            ...ordenados.map(
                item =>
                    Math.abs(
                        item.diferencaValorAtual
                    ) || 0
            )
        );


    const lista =
        document.createElement("div");


    lista.className =
        "far-lista-barras";


    ordenados.forEach(item => {

        const diferenca =
            item.diferencaValorAtual;


        const largura =
            (
                Math.abs(diferenca) /
                maiorModulo
            ) * 100;


        const positiva =
            diferenca >= 0;


        const linha =
            document.createElement("div");


        linha.className =
            "far-linha-barra";


        linha.innerHTML = `

            <span class="far-ativo-label">
                ${item.ativo}
            </span>

            <div class="far-trilha-barra">

                <div
                    class="
                        far-barra-preenchimento
                        ${
                            positiva
                                ? "far-cor-positiva"
                                : "far-cor-negativa"
                        }
                    "
                    style="
                        left:0;
                        width:${largura}%;
                    "
                ></div>

            </div>


            <span
                class="
                    far-valor-barra
                    ${
                        positiva
                            ? "far-valor-positivo"
                            : "far-valor-negativo"
                    }
                "
            >
                ${formatarMoeda(diferenca)}
            </span>

        `;


        lista.appendChild(linha);
    });


    alvo.replaceWith(lista);
}


// ============================================================
// 3.3 — RENDA MENSAL FICTÍCIA
// ============================================================

function renderizarRendaMensalFicticia(
    wrapper,
    ativos
) {

    const alvo =
        wrapper.querySelector(
            "#far-cartao-renda52 .far-conteudo"
        );


    const ordenados =
        [...ativos].sort(
            (a, b) =>
                b.rendaMensalFicticia -
                a.rendaMensalFicticia
        );


    const maiorRenda =
        Math.max(
            1,
            ...ordenados.map(
                item =>
                    item.rendaMensalFicticia || 0
            )
        );


    const lista =
        document.createElement("div");


    lista.className =
        "far-lista-barras";


    ordenados.forEach(item => {

        const renda =
            item.rendaMensalFicticia;


        const largura =
            (
                Math.max(0, renda) /
                maiorRenda
            ) * 100;


        const linha =
            document.createElement("div");


        linha.className =
            "far-linha-barra";


        linha.innerHTML = `

            <span class="far-ativo-label">
                ${item.ativo}
            </span>


            <div class="far-trilha-barra">

                <div
                    class="
                        far-barra-preenchimento
                        far-cor-ficticia
                    "
                    style="
                        left:0;
                        width:${largura}%;
                    "
                ></div>

            </div>


            <span
                class="
                    far-valor-barra
                    far-valor-ficticio
                "
            >
                ${formatarMoeda(renda)}
            </span>

        `;


        lista.appendChild(linha);
    });


    alvo.replaceWith(lista);
}


// ============================================================
// 3.4 — VALORIZAÇÃO
// ============================================================

function renderizarValorizacao(
    wrapper,
    ativos
) {

    const alvo =
        wrapper.querySelector(
            "#far-cartao-valorizacao .far-conteudo"
        );


    const ordenados =
        [...ativos].sort(
            (a, b) =>
                b.valorizacao -
                a.valorizacao
        );


    const maiorModulo =
        Math.max(
            1,
            ...ordenados.map(
                item =>
                    Math.abs(
                        item.valorizacao
                    ) || 0
            )
        );


    const lista =
        document.createElement("div");


    lista.className =
        "far-lista-barras";


    ordenados.forEach(item => {

        const percentualLargura =
            (
                Math.abs(
                    item.valorizacao
                ) /
                maiorModulo
            ) * 100;


        const positiva =
            item.valorizacao >= 0;


        const linha =
            document.createElement("div");


        linha.className =
            "far-linha-barra";


        linha.innerHTML = `

            <span class="far-ativo-label">
                ${item.ativo}
            </span>


            <div class="far-trilha-barra">

                <div
                    class="
                        far-barra-preenchimento
                        ${
                            positiva
                                ? "far-cor-positiva"
                                : "far-cor-negativa"
                        }
                    "
                    style="
                        left:0;
                        width:${percentualLargura}%;
                    "
                ></div>

            </div>


            <span
                class="
                    far-valor-barra
                    ${
                        positiva
                            ? "far-valor-positivo"
                            : "far-valor-negativo"
                    }
                "
            >
                ${formatarPercentual(
                    item.valorizacao
                )}
            </span>

        `;


        lista.appendChild(linha);
    });


    alvo.replaceWith(lista);
}


// ============================================================
// 3.5 — DIVIDEND YIELD
// ============================================================

function renderizarDividendYield(
    wrapper,
    ativos
) {

    const alvo =
        wrapper.querySelector(
            "#far-cartao-dy .far-conteudo"
        );


    const ordenados =
        [...ativos].sort(
            (a, b) =>
                b.dy -
                a.dy
        );


    const maiorDy =
        Math.max(
            1,
            ...ordenados.map(
                item =>
                    item.dy || 0
            )
        );


    const lista =
        document.createElement("div");


    lista.className =
        "far-lista-barras";


    ordenados.forEach(item => {

        const percentualLargura =
            (
                Math.max(0, item.dy) /
                maiorDy
            ) * 100;


        const linha =
            document.createElement("div");


        linha.className =
            "far-linha-barra";


        linha.innerHTML = `

            <span class="far-ativo-label">
                ${item.ativo}
            </span>


            <div class="far-trilha-barra">

                <div
                    class="
                        far-barra-preenchimento
                        far-cor-neutra-dy
                    "
                    style="
                        left:0;
                        width:${percentualLargura}%;
                    "
                ></div>

            </div>


            <span
                class="
                    far-valor-barra
                    far-valor-neutro
                "
            >
                ${formatarPercentual(item.dy)}
            </span>

        `;


        lista.appendChild(linha);
    });


    alvo.replaceWith(lista);
}


// ============================================================
// 3.6 — HEATMAP
// ============================================================

function corHeatmap(
    valor,
    maiorModulo
) {

    if (
        !Number.isFinite(valor) ||
        maiorModulo === 0
    ) {

        return "rgba(107, 114, 128, 0.6)";
    }


    const intensidade =
        Math.min(
            1,
            Math.abs(valor) /
            maiorModulo
        );


    const alfa =
        0.25 +
        intensidade * 0.65;


    return valor >= 0

        ? `rgba(
            27,
            138,
            76,
            ${alfa.toFixed(2)}
          )`

        : `rgba(
            198,
            40,
            40,
            ${alfa.toFixed(2)}
          )`;
}


function renderizarHeatmap(
    wrapper,
    ativos
) {

    const alvo =
        wrapper.querySelector(
            "#far-cartao-heatmap .far-conteudo"
        );


    const maiorModulo =
        Math.max(
            1,
            ...ativos.map(
                item =>
                    Math.abs(
                        item.rentabilidade
                    ) || 0
            )
        );


    const grade =
        document.createElement("div");


    grade.className =
        "far-grade-heatmap";


    ativos.forEach(item => {

        const celula =
            document.createElement("div");


        celula.className =
            "far-celula-heatmap";


        celula.style.backgroundColor =
            corHeatmap(
                item.rentabilidade,
                maiorModulo
            );


        celula.innerHTML = `

            <div
                class="far-heatmap-ativo"
            >
                ${item.ativo}
            </div>


            <div
                class="far-heatmap-valor"
            >
                ${formatarPercentual(
                    item.rentabilidade
                )}
            </div>

        `;


        grade.appendChild(celula);
    });


    alvo.replaceWith(grade);
}


// ============================================================
// CLASSE DE COR
// ============================================================

function classeCor(valor) {

    if (
        !Number.isFinite(valor) ||
        valor === 0
    ) {

        return "far-valor-neutro";
    }


    return valor > 0
        ? "far-valor-positivo"
        : "far-valor-negativo";
}


// ============================================================
// TABELA RESUMO
// ============================================================

function renderizarTabela(
    wrapper,
    ativos
) {

    const alvo =
        wrapper.querySelector(
            "#far-cartao-tabela .far-conteudo"
        );


    const container =
        document.createElement("div");


    container.className =
        "far-tabela-container";


    const tabela =
        document.createElement("table");


    const thead =
        document.createElement("thead");


    thead.innerHTML = `

        <tr>

            <th>Ativo</th>

            <th>Atual</th>

            <th>Média 52S</th>

            <th>Valor Fictício</th>

            <th>Renda Mensal Fictícia</th>

            <th>Valorização</th>

            <th>DY</th>

            <th>Faixa 52S</th>

            <th>Potencial Máx. 52S</th>

            <th>Risco Mín. 52S</th>

            <th>Rentabilidade</th>

        </tr>

    `;


    const tbody =
        document.createElement("tbody");


    ativos.forEach(item => {

        const tr =
            document.createElement("tr");


        tr.innerHTML = `

            <td
                class="
                    far-alinhar-esquerda
                    far-ativo-destaque
                "
            >
                ${item.ativo}
            </td>


            <td
                class="
                    far-alinhar-direita
                    far-valor-neutro
                "
            >
                ${formatarMoeda(
                    item.valorAtual
                )}
            </td>


            <td
                class="
                    far-alinhar-direita
                    far-valor-ficticio
                "
            >
                ${formatarMoeda(
                    item.media52S
                )}
            </td>


            <td
                class="
                    far-alinhar-direita
                    far-valor-ficticio
                "
            >
                ${formatarMoeda(
                    item.valorFicticio
                )}
            </td>


            <td
                class="
                    far-alinhar-direita
                    far-valor-ficticio
                "
            >
                ${formatarMoeda(
                    item.rendaMensalFicticia
                )}
            </td>


            <td
                class="
                    far-alinhar-direita
                    ${classeCor(
                        item.valorizacao
                    )}
                "
            >
                ${formatarPercentual(
                    item.valorizacao
                )}
            </td>


            <td
                class="
                    far-alinhar-direita
                    far-valor-neutro
                "
            >
                ${formatarPercentual(
                    item.dy
                )}
            </td>


            <td
                class="
                    far-alinhar-direita
                    far-valor-neutro
                "
            >
                ${formatarMoeda(
                    item.min52
                )}
                –
                ${formatarMoeda(
                    item.max52
                )}
            </td>


            <td
                class="
                    far-alinhar-direita
                    far-valor-positivo
                "
            >
                ${formatarMoeda(
                    item.potencialMax52
                )}
            </td>


            <td
                class="
                    far-alinhar-direita
                    far-valor-negativo
                "
            >
                ${formatarMoeda(
                    item.riscoMin52
                )}
            </td>


            <td
                class="
                    far-alinhar-direita
                    ${classeCor(
                        item.rentabilidade
                    )}
                "
            >
                ${formatarPercentual(
                    item.rentabilidade
                )}
            </td>

        `;


        tbody.appendChild(tr);
    });


    tabela.appendChild(thead);
    tabela.appendChild(tbody);

    container.appendChild(tabela);


    alvo.replaceWith(container);
}


// ============================================================
// CARREGAR CSV E RENDERIZAR
// ============================================================

async function carregarERenderizar() {

    const containerAba =
        obterContainerAba();


    if (!containerAba) {

        console.error(
            `[Aba Rentabilidade] ` +
            `Elemento #${ID_CONTAINER_ABA} ` +
            `não encontrado.`
        );

        return;
    }


    injetarEstilos();


    const wrapper =
        garantirEstruturaAba(
            containerAba
        );


    try {

        const timestamp =
            Date.now();


        const resposta =
            await fetch(
                `${ARQUIVO_CSV}?t=${timestamp}`,
                {
                    cache: "no-store"
                }
            );


        if (!resposta.ok) {

            throw new Error(
                `Não foi possível carregar ` +
                `${ARQUIVO_CSV} ` +
                `(HTTP ${resposta.status}).`
            );
        }


        const textoCSV =
            await resposta.text();


        const {
            cabecalhosCSV,
            dadosPatrimonio
        } =
            processarDadosCSV(
                textoCSV
            );


        ativosRentabilidade =
            dadosPatrimonio.map(
                linha =>
                    linhaParaAtivo(
                        linha,
                        cabecalhosCSV
                    )
            );


        // ----------------------------------------------------
        // RENDERIZAÇÃO NA NOVA ORDEM
        // ----------------------------------------------------

        renderizarFaixa52Semanas(
            wrapper,
            ativosRentabilidade
        );


        renderizarDiferencaMedia52S(
            wrapper,
            ativosRentabilidade
        );


        renderizarRendaMensalFicticia(
            wrapper,
            ativosRentabilidade
        );


        renderizarValorizacao(
            wrapper,
            ativosRentabilidade
        );


        renderizarDividendYield(
            wrapper,
            ativosRentabilidade
        );


        renderizarHeatmap(
            wrapper,
            ativosRentabilidade
        );


        renderizarTabela(
            wrapper,
            ativosRentabilidade
        );


        console.log(
            `[Aba Rentabilidade] ` +
            `${ativosRentabilidade.length} ` +
            `ativos renderizados.`
        );

    }
    catch (erro) {

        console.error(
            "[Aba Rentabilidade] " +
            "Erro ao carregar dados:",
            erro
        );


        wrapper
            .querySelectorAll(
                ".far-conteudo"
            )
            .forEach(elemento => {

                elemento.textContent =
                    `Erro ao carregar dados: ` +
                    `${erro.message}`;

            });
    }
}


// ============================================================
// PONTO DE ENTRADA
// ============================================================

async function atualizarAbaRentabilidade() {

    await carregarERenderizar();
}


export {
    atualizarAbaRentabilidade
};
