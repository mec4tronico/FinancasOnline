// ============================================================
// scraping.js
// ============================================================
//
// Recebe:
//     ticker -> exemplo: "KNCR11"
//     tipo   -> "fii" ou "acoes"
//
// Exemplo:
//     buscarIndicadoresStatusInvest("KNCR11", "fii")
//
// Retorna:
// {
//     ticker: "KNCR11",
//     valorAtual: "105,60",
//     min52: "92,77",
//     max52: "108,56",
//     dy: "13,58",
//     valorizacao: "13,51%"
// }
//
// Em caso de erro:
// {
//     ticker: "KNCR11",
//     valorAtual: "ERRO",
//     min52: "ERRO",
//     max52: "ERRO",
//     dy: "ERRO",
//     valorizacao: "ERRO"
// }
//
// ============================================================


// ============================================================
// CONFIGURAÇÃO
// ============================================================

const CORS_PROXY =
    "https://api.allorigins.win/raw?url=";


// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================

async function buscarIndicadoresStatusInvest(
    ticker,
    tipo
) {

    const resultadoErro = {

        ticker: ticker,

        valorAtual: "ERRO",

        min52: "ERRO",

        max52: "ERRO",

        dy: "ERRO",

        valorizacao: "ERRO"

    };


    try {

        // ----------------------------------------------------
        // Normalização
        // ----------------------------------------------------

        ticker =
            ticker
                .trim()
                .toUpperCase();


        tipo =
            tipo
                .trim()
                .toLowerCase();


        // ----------------------------------------------------
        // Define a categoria do StatusInvest
        // ----------------------------------------------------

        let categoria;


        if (tipo === "fii") {

            categoria =
                "fundos-imobiliarios";

        }
        else if (tipo === "acoes") {

            categoria =
                "acoes";

        }
        else {

            return resultadoErro;

        }


        // ----------------------------------------------------
        // Monta URL
        // ----------------------------------------------------

        const url =
            `https://statusinvest.com.br/` +
            `${categoria}/` +
            `${ticker.toLowerCase()}`;


        // ----------------------------------------------------
        // Busca HTML
        // ----------------------------------------------------

        const urlProxy =
            `${CORS_PROXY}` +
            `${encodeURIComponent(url)}`;


        const resposta =
            await fetch(urlProxy);


        if (!resposta.ok) {

            return resultadoErro;

        }


        const html =
            await resposta.text();


        if (!html) {

            return resultadoErro;

        }


        // ----------------------------------------------------
        // Converte HTML em DOM
        // ----------------------------------------------------

        const parser =
            new DOMParser();


        const documento =
            parser.parseFromString(
                html,
                "text/html"
            );


        // ----------------------------------------------------
        // Função de extração
        // ----------------------------------------------------

        function obterValorPorTitulo(
            titulo
        ) {

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


        // ----------------------------------------------------
        // Extrai os 5 indicadores
        // ----------------------------------------------------

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


        // ----------------------------------------------------
        // Se o principal não foi encontrado,
        // considera a consulta como erro
        // ----------------------------------------------------

        if (
            !valorAtual
        ) {

            return resultadoErro;

        }


        // ----------------------------------------------------
        // Retorno
        // ----------------------------------------------------

        return {

            ticker:

                ticker,

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


    }
    catch (erro) {

        return resultadoErro;

    }

}
