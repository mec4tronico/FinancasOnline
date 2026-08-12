// ============================================================
// app.js
// Teste do scraping StatusInvest
// ============================================================


// ============================================================
// INICIALIZAÇÃO
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    iniciarAplicacao
);


async function iniciarAplicacao() {

    console.log(
        "========================================"
    );


    console.log(
        "APLICAÇÃO INICIADA"
    );


    console.log(
        "Testando scraping..."
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

        <p>
            Executando testes...
        </p>

    `;


    // ========================================================
    // TESTE 1 — AÇÃO
    // ========================================================

    resultado.innerHTML += `

        <h3>
            AXIA3 — Ação
        </h3>

        <pre id="resultado-axia3">
Aguardando...
        </pre>

    `;


    console.log(
        "Chamando scraping: AXIA3 / acoes"
    );


    const resultadoAXIA3 =
        await buscarIndicadoresStatusInvest(
            "AXIA3",
            "acoes"
        );


    document.querySelector(
        "#resultado-axia3"
    ).textContent =
        JSON.stringify(
            resultadoAXIA3,
            null,
            2
        );


    // ========================================================
    // PEQUENO INTERVALO
    // ========================================================

    await new Promise(
        resolve =>
            setTimeout(
                resolve,
                1500
            )
    );


    // ========================================================
    // TESTE 2 — FII
    // ========================================================

    resultado.innerHTML += `

        <h3>
            KNCR11 — FII
        </h3>

        <pre id="resultado-kncr11">
Aguardando...
        </pre>

    `;


    console.log(
        "Chamando scraping: KNCR11 / fii"
    );


    const resultadoKNCR11 =
        await buscarIndicadoresStatusInvest(
            "KNCR11",
            "fii"
        );


    document.querySelector(
        "#resultado-kncr11"
    ).textContent =
        JSON.stringify(
            resultadoKNCR11,
            null,
            2
        );


    // ========================================================
    // FINAL
    // ========================================================

    console.log(
        "========================================"
    );


    console.log(
        "TESTE DO SCRAPING FINALIZADO"
    );

}
