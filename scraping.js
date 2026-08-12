// ============================================================
// scraping.js
// ============================================================
//
// TESTE DIAGNÓSTICO DO STATUSINVEST
//
// Recebe:
//     buscarIndicadoresStatusInvest("KNCR11", "fii")
//     buscarIndicadoresStatusInvest("AXIA3", "acoes")
//
// Cada consulta possui limite máximo de 30 segundos.
//
// O console do navegador mostrará cada etapa:
//
// 1. Função iniciada
// 2. Tipo validado
// 3. URL criada
// 4. Proxy preparado
// 5. Fetch iniciado
// 6. HTML recebido
// 7. DOM criado
// 8. Indicadores procurados
// 9. Resultado encontrado
//
// ============================================================


// ============================================================
// CONFIGURAÇÕES
// ============================================================

const CORS_PROXY =
    "https://api.allorigins.win/raw?url=";


const TIMEOUT_30_SEGUNDOS =
    30000;


// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================

async function buscarIndicadoresStatusInvest(
    ticker,
    tipo
) {

    const inicio =
        performance.now();


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
        // ETAPA 1
        // ====================================================

        console.log(
            `[${ticker}] ETAPA 1 - ` +
            "Validando parâmetros..."
        );


        if (
            !ticker ||
            !tipo
        ) {

            console.error(
                `[${ticker}] ERRO ETAPA 1: ` +
                "Ticker ou tipo não informado."
            );


            return resultadoErro;

        }


        ticker =
            ticker
                .trim()
                .toUpperCase();


        tipo =
            tipo
                .trim()
                .toLowerCase();


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
        // ETAPA 2
        // ====================================================

        console.log(
            `[${ticker}] ETAPA 2 - ` +
            "Definindo categoria..."
        );


        let categoria;


        if (
            tipo === "fii"
        ) {

            categoria =
                "fundos-imobiliarios";

        }
        else {

            categoria =
                "acoes";

        }


        console.log(
            `[${ticker}] Categoria: ${categoria}`
        );


        console.log(
            `[${ticker}] ETAPA 2 OK`
        );


        // ====================================================
        // ETAPA 3
        // ====================================================

        console.log(
            `[${ticker}] ETAPA 3 - ` +
            "Montando URL do StatusInvest..."
        );


        const url =
            `https://statusinvest.com.br/` +
            `${categoria}/` +
            `${ticker.toLowerCase()}`;


        console.log(
            `[${ticker}] URL: ${url}`
        );


        console.log(
            `[${ticker}] ETAPA 3 OK`
        );


        // ====================================================
        // ETAPA 4
        // ====================================================

        console.log(
            `[${ticker}] ETAPA 4 - ` +
            "Montando URL do proxy..."
        );


        const urlProxy =
            CORS_PROXY +
            encodeURIComponent(url);


        console.log(
            `[${ticker}] Proxy preparado.`
        );


        console.log(
            `[${ticker}] ETAPA 4 OK`
        );


        // ====================================================
        // ETAPA 5
        // ====================================================

        console.log(
            `[${ticker}] ETAPA 5 - ` +
            "Iniciando acesso ao proxy..."
        );


        const controlador =
            new AbortController();


        const temporizador =
            setTimeout(
                () => {

                    console.error(
                        `[${ticker}] ` +
                        "TIMEOUT: 30 segundos " +
                        "atingidos no acesso ao proxy."
                    );


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
                    "O acesso ao proxy demorou " +
                    "mais de 30 segundos."
                );

            }
            else {

                console.error(
                    `[${ticker}] ERRO ETAPA 5: ` +
                    "Falha no fetch."
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
        // ETAPA 6
        // ====================================================

        console.log(
            `[${ticker}] ETAPA 6 - ` +
            "Lendo HTML recebido..."
        );


        if (
            !resposta.ok
        ) {

            console.error(
                `[${ticker}] ERRO ETAPA 6: ` +
                `Status HTTP ${resposta.status}`
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
        // ETAPA 7
        // ====================================================

        console.log(
            `[${ticker}] ETAPA 7 - ` +
            "Convertendo HTML para DOM..."
        );


        const parser =
            new DOMParser();


        const documento =
            parser.parseFromString(
                html,
                "text/html"
            );


        if (
            !documento
        ) {

            console.error(
                `[${ticker}] ERRO ETAPA 7: ` +
                "Não foi possível criar o DOM."
            );


            return resultadoErro;

        }


        console.log(
            `[${ticker}] ETAPA 7 OK`
        );


        // ====================================================
        // ETAPA 8
        // ====================================================

        console.log(
            `[${ticker}] ETAPA 8 - ` +
            "Procurando indicadores..."
        );


        function obterValorPorTitulo(
            titulo
        ) {

            console.log(
                `[${ticker}] Procurando: ${titulo}`
            );


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
                        .toUpperCase();


                if (
                    texto.includes(
                        titulo.toUpperCase()
                    )
                ) {

                    const pai =
                        elemento.closest(
                            "div"
                        );


                    if (
                        pai
                    ) {

                        const valor =
                            pai.querySelector(
                                "strong.value"
                            );


                        if (
                            valor
                        ) {

                            const resultado =
                                valor.textContent
                                    .trim();


                            console.log(
                                `[${ticker}] ` +
                                `${titulo}: ${resultado}`
                            );


                            return resultado;

                        }

                    }

                }

            }


            console.warn(
                `[${ticker}] ` +
                `${titulo}: NÃO ENCONTRADO`
            );


            return null;

        }


        // ====================================================
        // EXTRAÇÃO
        // ====================================================

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
            `[${ticker}] ETAPA 8 OK`
        );


        // ====================================================
        // ETAPA 9
        // ====================================================

        console.log(
            `[${ticker}] ETAPA 9 - ` +
            "Validando resultado..."
        );


        if (
            !valorAtual
        ) {

            console.error(
                `[${ticker}] ERRO ETAPA 9: ` +
                "Valor Atual não encontrado."
            );


            return resultadoErro;

        }


        const resultado = {

            ticker:

                ticker,

            valorAtual:

                valorAtual ||
                "ERRO",

            min52:

                min52 ||
                "ERRO",

            max52:

                max52 ||
                "ERRO",

            dy:

                dy ||
                "ERRO",

            valorizacao:

                valorizacao ||
                "ERRO"

        };


        // ====================================================
        // FINAL
        // ====================================================

        const fim =
            performance.now();


        const tempo =
            (
                fim -
                inicio
            ) / 1000;


        console.log(
            `[${ticker}] ETAPA 9 OK`
        );


        console.log(
            `[${ticker}] SCRAPING CONCLUÍDO`
        );


        console.log(
            `[${ticker}] Tempo: ` +
            `${tempo.toFixed(2)} segundos`
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
