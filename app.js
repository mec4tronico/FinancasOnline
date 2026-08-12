// ============================================================
// app.js
// TESTE DO SCRAPING
// ============================================================
//
// Este arquivo, nesta etapa, faz somente:
//
// 1. Lê a carteira B3
// 2. Exibe a Tabela 1
// 3. Testa o scraping com:
//      - AXIA3 / acoes
//      - KNCR11 / fii
//
// NÃO:
// - chama escreverCSV.js
// - lê dados_mercado.csv
// - grava CSV
// - executa loop de ativos
//
// ============================================================


// ============================================================
// ARQUIVO DA CARTEIRA
// ============================================================

const ARQUIVO_CARTEIRA =
    "./carteira_b3_consolidada.csv";


// ============================================================
// INICIALIZAÇÃO
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        iniciarAplicacao();

    }
);


// ============================================================
// FLUXO PRINCIPAL
// ============================================================

async function iniciarAplicacao() {

    try {

        // ----------------------------------------------------
        // 1. Ler carteira B3
        // ----------------------------------------------------

        const textoCarteira =
            await lerArquivoCSV(
                ARQUIVO_CARTEIRA
            );


        const linhasCarteira =
            processarCSV(
                textoCarteira
            );


        if (
            linhasCarteira.length <= 1
        ) {

            console.error(
                "Carteira B3 vazia ou sem dados válidos."
            );

            return;

        }


        // ----------------------------------------------------
        // 2. Exibir Tabela 1
        // ----------------------------------------------------

        const cabecalhosCarteira =
            linhasCarteira[0];


        const dadosCarteira =
            linhasCarteira.slice(1);


        preencherTabela1(
            cabecalhosCarteira,
            dadosCarteira
        );


        // ----------------------------------------------------
        // 3. Executar teste do scraping
        // ----------------------------------------------------

        await testarScraping();


    }
    catch (erro) {

        console.error(
            "Erro na aplicação:",
            erro
        );

    }

}


// ============================================================
// LÊ ARQUIVO CSV
// ============================================================

async function lerArquivoCSV(
    caminho
) {

    const resposta =
        await fetch(caminho);


    if (!resposta.ok) {

        throw new Error(
            `Não foi possível carregar ${caminho}.`
        );

    }


    return await resposta.text();

}


// ============================================================
// PROCESSA CSV
// ============================================================

function processarCSV(
    texto
) {

    const linhas =
        texto
            .trim()
            .split(/\r?\n/);


    return linhas.map(
        linha => {

            const delimitador =
                linha.includes(";")
                    ? ";"
                    : ",";


            return linha
                .split(delimitador)
                .map(
                    celula =>
                        celula
                            .replace(
                                /^["']|["']$/g,
                                ""
                            )
                            .trim()
                );

        }
    );

}


// ============================================================
// TABELA 1
// ============================================================

function preencherTabela1(
    cabecalhos,
    dados
) {

    const tbody =
        document.querySelector(
            "#tabela-original tbody"
        );


    if (!tbody) {

        console.error(
            "Tabela original não encontrada."
        );

        return;

    }


    tbody.innerHTML = "";


    dados.forEach(
        linha => {

            const tr =
                document.createElement(
                    "tr"
                );


            linha.forEach(
                celula => {

                    const td =
                        document.createElement(
                            "td"
                        );


                    td.textContent =
                        celula;


                    tr.appendChild(td);

                }
            );


            tbody.appendChild(tr);

        }
    );

}


// ============================================================
// TESTE DO SCRAPING
// ============================================================

async function testarScraping() {

    const area =
        document.querySelector(
            "#resultado-scraping"
        );


    if (!area) {

        console.error(
            "Área #resultado-scraping não encontrada no HTML."
        );

        return;

    }


    area.innerHTML =
        "<p>Testando scraping...</p>";


    // ========================================================
    // TESTE 1 — AÇÃO
    // ========================================================

    const resultadoAcao =
        await buscarIndicadoresStatusInvest(
            "AXIA3",
            "acoes"
        );


    // ========================================================
    // TESTE 2 — FII
    // ========================================================

    const resultadoFII =
        await buscarIndicadoresStatusInvest(
            "KNCR11",
            "fii"
        );


    // ========================================================
    // EXIBE RESULTADOS
    // ========================================================

    area.innerHTML = `

        <h2>Teste do Scraping</h2>

        <h3>AXIA3 — Ação</h3>

        <pre>${JSON.stringify(
            resultadoAcao,
            null,
            2
        )}</pre>


        <h3>KNCR11 — FII</h3>

        <pre>${JSON.stringify(
            resultadoFII,
            null,
            2
        )}</pre>

    `;

}
