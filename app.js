// ============================================================
// app.js
// Ponto de entrada da aplicação
// ============================================================


// ============================================================
// CONFIGURAÇÃO
// ============================================================

const VERSAO_APP = Date.now();


// ============================================================
// INICIALIZAÇÃO
// ============================================================

// O app.js é carregado dinamicamente pelo index.html.
// Por isso NÃO dependemos do DOMContentLoaded.

iniciarAplicacao();


// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================

async function iniciarAplicacao() {

    console.log(
        "========================================"
    );

    console.log(
        "APP.JS INICIADO"
    );

    console.log(
        "Carregando scraping.js..."
    );


    const resultado =
        document.querySelector(
            "#resultado-scraping"
        );


    if (!resultado) {

        console.error(
            "Elemento #resultado-scraping não encontrado."
        );

        return;
    }


    resultado.innerHTML = `

        <h2>
            Teste do Scraping
        </h2>

        <p class="carregando">
            Carregando scraping.js...
        </p>

    `;


    // ========================================================
    // CARREGAR SCRAPING.JS
    // ========================================================

    try {

        await carregarScraping();

    }

    catch (erro) {

        console.error(
            "ERRO ao carregar scraping.js:"
        );

        console.error(erro);


        resultado.innerHTML = `

            <h2>
                Teste do Scraping
            </h2>

            <p class="erro">
                ERRO ao carregar scraping.js.
            </p>

        `;


        return;
    }


    console.log(
        "scraping.js carregado pelo app.js."
    );


    // ========================================================
    // VERIFICAR FUNÇÃO
    // ========================================================

    if (
        typeof buscarIndicadoresStatusInvest
        !== "function"
    ) {

        console.error(
            "Função buscarIndicadoresStatusInvest não encontrada."
        );


        resultado.innerHTML = `

            <h2>
                Teste do Scraping
            </h2>

            <p class="erro">
                ERRO: função de scraping não encontrada.
            </p>

        `;


        return;
    }


    console.log(
        "Função de scraping encontrada."
    );


    // ========================================================
    // PREPARAR RESULTADO
    // ========================================================

    resultado.innerHTML = `

        <h2>
            Teste do Scraping
        </h2>


        <h3>
            AXIA3 — Ação
        </h3>


        <pre id="resultado-axia3">
Aguardando...
        </pre>

    `;


    // ========================================================
    // TESTE AXIA3
    // ========================================================

    console.log(
        "========================================"
    );

    console.log(
        "APP → SCRAPING"
    );

    console.log(
        "Enviando AXIA3 / acoes"
    );


    const resultadoAXIA3 =
        await buscarIndicadoresStatusInvest(
            "AXIA3",
            "acoes"
        );


    const campoAXIA3 =
        document.querySelector(
            "#resultado-axia3"
        );


    if (campoAXIA3) {

        campoAXIA3.textContent =
            JSON.stringify(
                resultadoAXIA3,
                null,
                2
            );

    }


    // ========================================================
    // INTERVALO ENTRE TESTES
    // ========================================================

    await new Promise(
        resolve =>

            setTimeout(
                resolve,
                1500
            )
    );


    // ========================================================
    // ADICIONAR KNCR11
    // ========================================================

    resultado.innerHTML += `

        <h3>
            KNCR11 — FII
        </h3>


        <pre id="resultado-kncr11">
Aguardando...
        </pre>

    `;


    // ========================================================
    // TESTE KNCR11
    // ========================================================

    console.log(
        "========================================"
    );

    console.log(
        "APP → SCRAPING"
    );

    console.log(
        "Enviando KNCR11 / fii"
    );


    const resultadoKNCR11 =
        await buscarIndicadoresStatusInvest(
            "KNCR11",
            "fii"
        );


    const campoKNCR11 =
        document.querySelector(
            "#resultado-kncr11"
        );


    if (campoKNCR11) {

        campoKNCR11.textContent =
            JSON.stringify(
                resultadoKNCR11,
                null,
                2
            );

    }


    // ========================================================
    // FINAL
    // ========================================================

    console.log(
        "========================================"
    );

    console.log(
        "TESTES FINALIZADOS"
    );

}


// ============================================================
// CARREGAR SCRAPING.JS
// ============================================================

function carregarScraping() {

    return new Promise(
        (resolve, reject) => {

            const script =
                document.createElement(
                    "script"
                );


            script.src =
                "scraping.js?v=" +
                VERSAO_APP;


            script.onload =
                function () {

                    console.log(
                        "scraping.js carregado."
                    );

                    resolve();

                };


            script.onerror =
                function () {

                    reject(
                        new Error(
                            "Não foi possível carregar scraping.js."
                        )
                    );

                };


            document.body.appendChild(
                script
            );

        }
    );

}
