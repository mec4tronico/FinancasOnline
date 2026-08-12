// ============================================================
// proxy.js
// Proxy simples para buscar páginas do StatusInvest
// ============================================================

const STATUSINVEST_DOMINIO = "statusinvest.com.br";

const TIMEOUT_30_SEGUNDOS = 30000;


// ============================================================
// ENTRADA DO CLOUDFLARE WORKER
// ============================================================

export default {

    async fetch(request) {

        // ----------------------------------------------------
        // Permitir requisições OPTIONS (CORS)
        // ----------------------------------------------------

        if (request.method === "OPTIONS") {

            return new Response(null, {

                status: 204,

                headers: {

                    "Access-Control-Allow-Origin": "*",

                    "Access-Control-Allow-Methods":
                        "GET, OPTIONS",

                    "Access-Control-Allow-Headers":
                        "Content-Type"

                }

            });

        }


        // ----------------------------------------------------
        // Aceitar somente GET
        // ----------------------------------------------------

        if (request.method !== "GET") {

            return respostaErro(
                "Método não permitido. Use GET.",
                405
            );

        }


        // ----------------------------------------------------
        // Ler parâmetro ?url=
        // ----------------------------------------------------

        const urlAtual =
            new URL(request.url);


        const endereco =
            urlAtual.searchParams.get("url");


        if (!endereco) {

            return respostaErro(
                "Parâmetro 'url' não informado.",
                400
            );

        }


        // ----------------------------------------------------
        // Validar URL
        // ----------------------------------------------------

        let urlDestino;


        try {

            urlDestino =
                new URL(endereco);

        }
        catch {

            return respostaErro(
                "URL informada é inválida.",
                400
            );

        }


        // ----------------------------------------------------
        // Segurança:
        // permitir somente StatusInvest
        // ----------------------------------------------------

        if (
            urlDestino.hostname !==
                STATUSINVEST_DOMINIO
            &&
            urlDestino.hostname !==
                `www.${STATUSINVEST_DOMINIO}`
        ) {

            return respostaErro(
                "URL não permitida. " +
                "Este proxy aceita somente " +
                "statusinvest.com.br.",
                403
            );

        }


        // ----------------------------------------------------
        // Fazer requisição ao StatusInvest
        // ----------------------------------------------------

        const controlador =
            new AbortController();


        const temporizador =
            setTimeout(
                () => {

                    controlador.abort();

                },
                TIMEOUT_30_SEGUNDOS
            );


        try {

            const resposta =
                await fetch(

                    urlDestino.toString(),

                    {

                        method: "GET",

                        headers: {

                            "User-Agent":
                                "Mozilla/5.0 " +
                                "(Windows NT 10.0; Win64; x64) " +
                                "AppleWebKit/537.36 " +
                                "(KHTML, like Gecko) " +
                                "Chrome/124.0.0.0 " +
                                "Safari/537.36",

                            "Accept":
                                "text/html," +
                                "application/xhtml+xml," +
                                "application/xml;q=0.9," +
                                "image/webp,*/*;q=0.8",

                            "Accept-Language":
                                "pt-BR,pt;q=0.9," +
                                "en-US;q=0.8,en;q=0.7"

                        },

                        signal:
                            controlador.signal

                    }

                );


            clearTimeout(
                temporizador
            );


            // ------------------------------------------------
            // Verificar resposta
            // ------------------------------------------------

            if (!resposta.ok) {

                return respostaErro(

                    `StatusInvest respondeu ` +
                    `HTTP ${resposta.status}.`,

                    502

                );

            }


            // ------------------------------------------------
            // Ler HTML
            // ------------------------------------------------

            const html =
                await resposta.text();


            if (
                !html ||
                html.length === 0
            ) {

                return respostaErro(
                    "StatusInvest retornou HTML vazio.",
                    502
                );

            }


            // ------------------------------------------------
            // Retornar HTML para o navegador
            // ------------------------------------------------

            return new Response(

                html,

                {

                    status: 200,

                    headers: {

                        "Content-Type":
                            "text/html; charset=UTF-8",

                        "Access-Control-Allow-Origin":
                            "*",

                        "Access-Control-Allow-Methods":
                            "GET, OPTIONS",

                        "Cache-Control":
                            "no-store"

                    }

                }

            );

        }
        catch (erro) {

            clearTimeout(
                temporizador
            );


            if (
                erro.name ===
                "AbortError"
            ) {

                return respostaErro(
                    "Timeout: StatusInvest " +
                    "não respondeu em 30 segundos.",
                    504
                );

            }


            return respostaErro(
                "Erro ao acessar StatusInvest.",
                502
            );

        }

    }

};


// ============================================================
// RESPOSTA DE ERRO
// ============================================================

function respostaErro(
    mensagem,
    status
) {

    return new Response(

        JSON.stringify({

            sucesso: false,

            erro: mensagem

        }),

        {

            status: status,

            headers: {

                "Content-Type":
                    "application/json; charset=UTF-8",

                "Access-Control-Allow-Origin":
                    "*",

                "Access-Control-Allow-Methods":
                    "GET, OPTIONS"

            }

        }

    );

}
