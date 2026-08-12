// ============================================================
// scraping.js
// Consulta StatusInvest através do Cloudflare Worker
// ============================================================

const PROXY_CLOUDFLARE =
    "https://financasonline.augusto-gouveia2000.workers.dev/";


const TIMEOUT_30_SEGUNDOS = 30000;


// ============================================================
// FUNÇÃO PRINCIPAL
// Recebe:
//   ticker = "AXIA3"
//   tipo   = "acoes"
//
// ou:
//
//   ticker = "KNCR11"
//   tipo   = "fii"
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


    console.log(
        "========================================"
    );


    console.log(
        `INICIANDO SCRAPING: ${ticker} / ${tipo}`
    );


    try {

        // ====================================================
        // 1. VALIDAR
        // ====================================================

        ticker =
            String(ticker)
                .trim()
                .toUpperCase();


        tipo =
            String(tipo)
                .trim()
                .toLowerCase();


        console.log(
            `[${ticker}] Parâmetros OK`
        );


        if (
            !ticker ||
            (
                tipo !== "acoes" &&
                tipo !== "fii"
            )
        ) {

            console.error(
                `[${ticker}] Parâmetros inválidos.`
            );

            return resultadoErro;
        }


        // ====================================================
        // 2. DEFINIR URL DO STATUSINVEST
        // ====================================================

        const categoria =
            tipo === "fii"
                ? "fundos-imobiliarios"
                : "acoes";


        const urlStatusInvest =
            `https://statusinvest.com.br/` +
            `${categoria}/` +
            `${ticker.toLowerCase()}`;


        console.log(
            `[${ticker}] StatusInvest:`,
            urlStatusInvest
        );


        // ====================================================
        // 3. MONTAR URL DO WORKER
        // ====================================================

        const urlWorker =
            PROXY_CLOUDFLARE +
            "?url=" +
            encodeURIComponent(
                urlStatusInvest
            );


        console.log(
            `[${ticker}] Worker:`,
            urlWorker
        );


        // ====================================================
        // 4. FETCH COM LIMITE DE 30 SEGUNDOS
        // ====================================================

        console.log(
            `[${ticker}] Acessando Worker...`
        );


        const controlador =
            new AbortController();


        const timeout =
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
                    urlWorker,
                    {
                        method: "GET",

                        cache: "no-store",

                        signal:
                            controlador.signal
                    }
                );

        }
        catch (erro) {

            clearTimeout(timeout);


            if (
                erro.name ===
                "AbortError"
            ) {

                console.error(
                    `[${ticker}] ` +
                    "ERRO: timeout de 30 segundos."
                );

            }
            else {

                console.error(
                    `[${ticker}] ` +
                    "ERRO ao acessar Worker."
                );

                console.error(erro);

            }


            return resultadoErro;
        }


        clearTimeout(timeout);


        // ====================================================
        // 5. STATUS HTTP
        // ====================================================

        console.log(
            `[${ticker}] HTTP:`,
            resposta.status
        );


        if (!resposta.ok) {

            console.error(
                `[${ticker}] ` +
                `Worker retornou HTTP ${resposta.status}`
            );


            return resultadoErro;
        }


        // ====================================================
        // 6. LER HTML
        // ====================================================

        console.log(
            `[${ticker}] Lendo HTML...`
        );


        const html =
            await resposta.text();


        console.log(
            `[${ticker}] HTML recebido:`,
            html.length,
            "caracteres"
        );


        if (
            !html ||
            html.length === 0
        ) {

            console.error(
                `[${ticker}] HTML vazio.`
            );


            return resultadoErro;
        }


        // ====================================================
        // 7. TRANSFORMAR HTML EM DOM
        // ====================================================

        const parser =
            new DOMParser();


        const documento =
            parser.parseFromString(
                html,
                "text/html"
            );


        console.log(
            `[${ticker}] DOM criado.`
        );


        // ====================================================
        // 8. FUNÇÃO DE EXTRAÇÃO
        // Mesma lógica que funcionou no Python
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

                const texto =
                    elemento.textContent
                        .trim()
                        .toUpperCase();


                if (
                    texto.includes(
                        titulo.toUpperCase()
                    )
                ) {

                    const pai =
                        elemento.closest("div");


                    if (!pai) {
                        continue;
                    }


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


            return null;
        }


        // ====================================================
        // 9. EXTRAIR OS CINCO DADOS
        // ====================================================

        console.log(
            `[${ticker}] Extraindo indicadores...`
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
            `[${ticker}] Mín. 52 Semanas:`,
            min52
        );


        console.log(
            `[${ticker}] Máx. 52 Semanas:`,
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
        // 10. VALIDAR VALOR PRINCIPAL
        // ====================================================

        if (!valorAtual) {

            console.error(
                `[${ticker}] ` +
                "Valor Atual não encontrado."
            );


            return resultadoErro;
        }


        // ====================================================
        // 11. RETORNAR OBJETO
        // ====================================================

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


        console.error(erro);


        return resultadoErro;

    }

}
