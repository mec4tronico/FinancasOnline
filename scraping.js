// ============================================================
// scraping.js
// Scraping StatusInvest via Cloudflare Worker
// ============================================================

// Seu Cloudflare Worker
const PROXY_CLOUDFLARE =
    "https://financasonline.augusto-gouveia2000.workers.dev/";

// Timeout máximo por consulta
const TIMEOUT_30_SEGUNDOS = 30000;


// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================

async function buscarIndicadoresStatusInvest(ticker, tipo) {

    const resultadoErro = {

        ticker: ticker,

        valorAtual: "ERRO",

        min52: "ERRO",

        max52: "ERRO",

        dy: "ERRO",

        valorizacao: "ERRO"

    };


    console.log("========================================");

    console.log(
        `INICIANDO SCRAPING: ${ticker} / ${tipo}`
    );


    try {

        // ====================================================
        // ETAPA 1 — VALIDAR PARÂMETROS
        // ====================================================

        console.log(
            `[${ticker}] ETAPA 1 - Validando parâmetros...`
        );


        if (!ticker || !tipo) {

            console.error(
                `[${ticker}] ERRO ETAPA 1: ` +
                "Ticker ou tipo não informado."
            );

            return resultadoErro;
        }


        ticker =
            ticker.trim().toUpperCase();


        tipo =
            tipo.trim().toLowerCase();


        if (
            tipo !== "fii" &&
            tipo !== "acoes"
        ) {

            console.error(
                `[${ticker}] ERRO ETAPA 1: ` +
                `Tipo inválido: ${tipo}`
            );

            return resultadoErro;
        }


        console.log(
            `[${ticker}] ETAPA 1 OK`
        );


        // ====================================================
        // ETAPA 2 — DEFINIR CATEGORIA
        // ====================================================

        console.log(
            `[${ticker}] ETAPA 2 - Definindo categoria...`
        );


        const categoria =
            tipo === "fii"
                ? "fundos-imobiliarios"
                : "acoes";


        console.log(
            `[${ticker}] Categoria: ${categoria}`
        );


        console.log(
            `[${ticker}] ETAPA 2 OK`
        );


        // ====================================================
        // ETAPA 3 — MONTAR URL DO STATUSINVEST
        // ====================================================

        console.log(
            `[${ticker}] ETAPA 3 - Montando URL...`
        );


        const urlStatusInvest =
            `https://statusinvest.com.br/` +
            `${categoria}/` +
            `${ticker.toLowerCase()}`;


        console.log(
            `[${ticker}] URL StatusInvest:`,
            urlStatusInvest
        );


        console.log(
            `[${ticker}] ETAPA 3 OK`
        );


        // ====================================================
        // ETAPA 4 — MONTAR URL DO CLOUDFLARE
        // ====================================================

        console.log(
            `[${ticker}] ETAPA 4 - Montando URL do Worker...`
        );


        const urlProxy =
            PROXY_CLOUDFLARE +
            "?url=" +
            encodeURIComponent(
                urlStatusInvest
            );


        console.log(
            `[${ticker}] URL do Worker preparada.`
        );


        console.log(
            `[${ticker}] ETAPA 4 OK`
        );


        // ====================================================
        // ETAPA 5 — ACESSAR WORKER
        // ====================================================

        console.log(
            `[${ticker}] ETAPA 5 - Acessando Worker...`
        );


        const controlador =
            new AbortController();


        const temporizador =
            setTimeout(
                () => {

                    controlador.abort();

                },
                TIMEOUT_30_SEGUNDOS
            );


        let resposta;


        try {

            resposta =
                await fetch(
                    urlProxy,
                    {
                        method: "GET",

                        signal:
                            controlador.signal
                    }
                );

        }
        catch (erroFetch) {

            clearTimeout(
                temporizador
            );


            if (
                erroFetch.name ===
                "AbortError"
            ) {

                console.error(
                    `[${ticker}] ERRO ETAPA 5: ` +
                    "Timeout de 30 segundos."
                );

            }
            else {

                console.error(
                    `[${ticker}] ERRO ETAPA 5: ` +
                    "Falha ao acessar o Worker."
                );

                console.error(
                    erroFetch
                );

            }


            return resultadoErro;
        }


        clearTimeout(
            temporizador
        );


        console.log(
            `[${ticker}] ETAPA 5 OK - ` +
            `Status HTTP: ${resposta.status}`
        );


        // ====================================================
        // ETAPA 6 — LER HTML
        // ====================================================

        console.log(
            `[${ticker}] ETAPA 6 - Lendo HTML...`
        );


        if (!resposta.ok) {

            console.error(
                `[${ticker}] ERRO ETAPA 6: ` +
                `HTTP ${resposta.status}`
            );


            return resultadoErro;
        }


        const html =
            await resposta.text();


        if (
            !html ||
            html.length === 0
        ) {

            console.error(
                `[${ticker}] ERRO ETAPA 6: ` +
                "HTML vazio."
            );


            return resultadoErro;
        }


        console.log(
            `[${ticker}] ETAPA 6 OK - ` +
            `${html.length} caracteres recebidos.`
        );


        // ====================================================
        // ETAPA 7 — CONVERTER HTML PARA DOM
        // ====================================================

        console.log(
            `[${ticker}] ETAPA 7 - Criando DOM...`
        );


        const parser =
            new DOMParser();


        const documento =
            parser.parseFromString(
                html,
                "text/html"
            );


        console.log(
            `[${ticker}] ETAPA 7 OK`
        );


        // ====================================================
        // FUNÇÃO DE EXTRAÇÃO
        // ====================================================

        function obterValorPorTitulo(titulo) {

            const elementos =
                documento.querySelectorAll(
                    "h3, small, span"
                );


            for (
                const elemento
                of elementos
            ) {

                if (
                    elemento.textContent
                        .toUpperCase()
                        .includes(
                            titulo.toUpperCase()
                        )
                ) {

                    const pai =
                        elemento.closest("div");


                    if (pai) {

                        const valor =
                            pai.querySelector(
                                "strong.value"
                            );


                        if (valor) {

                            return valor
                                .textContent
                                .trim();

                        }

                    }

                }

            }


            return null;
        }


        // ====================================================
        // ETAPA 8 — EXTRAIR INDICADORES
        // ====================================================

        console.log(
            `[${ticker}] ETAPA 8 - Extraindo indicadores...`
        );


        const valorAtual =
            obterValorPorTitulo(
                "VALOR ATUAL"
            );


        const min52 =
            obterValorPorTitulo(
                "MIN. 52 SEMANAS"
            );


        const max52 =
            obterValorPorTitulo(
                "MÁX. 52 SEMANAS"
            );


        const dy =
            obterValorPorTitulo(
                "DIVIDEND YIELD"
            );


        const valorizacao =
            obterValorPorTitulo(
                "VALORIZAÇÃO (12M)"
            );


        console.log(
            `[${ticker}] Valor Atual:`,
            valorAtual
        );


        console.log(
            `[${ticker}] Mín. 52 semanas:`,
            min52
        );


        console.log(
            `[${ticker}] Máx. 52 semanas:`,
            max52
        );


        console.log(
            `[${ticker}] DY 12M:`,
            dy
        );


        console.log(
            `[${ticker}] Valorização 12M:`,
            valorizacao
        );


        // ====================================================
        // ETAPA 9 — VALIDAR E RETORNAR
        // ====================================================

        if (!valorAtual) {

            console.error(
                `[${ticker}] ERRO ETAPA 9: ` +
                "Valor Atual não encontrado."
            );


            return resultadoErro;
        }


        const resultado = {

            ticker: ticker,

            valorAtual:
                valorAtual || "ERRO",

            min52:
                min52 || "ERRO",

            max52:
                max52 || "ERRO",

            dy:
                dy || "ERRO",

            valorizacao:
                valorizacao || "ERRO"

        };


        console.log(
            `[${ticker}] ETAPA 9 OK`
        );


        console.log(
            `[${ticker}] SCRAPING CONCLUÍDO`
        );


        console.log(
            resultado
        );


        console.log(
            "========================================"
        );


        return resultado;


    }
    catch (erro) {

        console.error(
            `[${ticker}] ERRO INESPERADO`
        );


        console.error(
            erro
        );


        return resultadoErro;

    }

}
