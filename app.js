// ============================================================
// app.js
// Ponto de entrada da aplicação
//
// Responsabilidades:
// 1. Ler carteira_b3_consolidada.csv
// 2. Ler dados_mercados.csv
// 3. Verificar atualização dos dados de mercado
// 4. Se necessário, chamar scraping.js
// 5. Gravar o novo dados_mercados.csv através do Worker CSV
// 6. Exibir os dados de mercado
// ============================================================


// ============================================================
// CONFIGURAÇÃO
// ============================================================

const VERSAO_APP = Date.now();

const ARQUIVO_CARTEIRA =
    "./carteira_b3_consolidada.csv";

const ARQUIVO_MERCADO =
    "./dados_mercados.csv";

const WORKER_CSV =
    "https://financasonline-csv.augusto-gouveia2000.workers.dev";

const DELAY_ENTRE_ATIVOS =
    1500;

const LIMITE_ATUALIZACAO_HORAS =
    24;


// ============================================================
// INICIALIZAÇÃO
// ============================================================

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
        "Versão:",
        VERSAO_APP
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
            Dados de Mercado
        </h2>

        <p class="carregando">
            Iniciando aplicação...
        </p>

    `;


    // ========================================================
    // 1. CARREGAR SCRAPING.JS
    // ========================================================

    try {

        await carregarScraping();

    }

    catch (erro) {

        console.error(
            "Erro ao carregar scraping.js:",
            erro
        );


        mostrarErro(

            resultado,

            "Não foi possível carregar scraping.js."

        );


        return;
    }


    console.log(
        "scraping.js carregado."
    );


    // ========================================================
    // 2. VERIFICAR FUNÇÃO DE SCRAPING
    // ========================================================

    if (
        typeof buscarIndicadoresStatusInvest
        !== "function"
    ) {

        console.error(
            "Função buscarIndicadoresStatusInvest não encontrada."
        );


        mostrarErro(

            resultado,

            "Função de scraping não encontrada."

        );


        return;
    }


    // ========================================================
    // 3. LER CARTEIRA
    // ========================================================

    let carteira;


    try {

        carteira =
            await lerCSV(
                ARQUIVO_CARTEIRA
            );

    }

    catch (erro) {

        console.error(
            "Erro ao ler carteira:",
            erro
        );


        mostrarErro(

            resultado,

            "Não foi possível carregar carteira_b3_consolidada.csv."

        );


        return;
    }


    const ativos =
        extrairAtivosDaCarteira(
            carteira
        );


    if (ativos.length === 0) {

        mostrarErro(

            resultado,

            "Nenhum ativo foi encontrado na carteira."

        );


        return;
    }


    console.log(
        "Ativos encontrados:",
        ativos
    );


    // ========================================================
    // 4. TENTAR LER DADOS DE MERCADO EXISTENTES
    // ========================================================

    let dadosMercadoExistentes = null;


    try {

        dadosMercadoExistentes =
            await lerCSV(
                ARQUIVO_MERCADO
            );

    }

    catch (erro) {

        console.log(
            "dados_mercados.csv não pôde ser lido."
        );

        console.log(
            "Será necessário fazer novo scraping."
        );

    }


    // ========================================================
    // 5. VERIFICAR DATA DE ATUALIZAÇÃO
    // ========================================================

    const atualizacao =
        obterDataAtualizacao(
            dadosMercadoExistentes
        );


    if (atualizacao) {

        console.log(
            "Data de atualização encontrada:",
            atualizacao
        );

        const horas =
            calcularHorasDesde(
                atualizacao
            );


        console.log(
            "Horas desde atualização:",
            horas.toFixed(2)
        );


        // ----------------------------------------------------
        // MENOS DE 24 HORAS
        // ----------------------------------------------------

        if (
            horas >= 0 &&
            horas < LIMITE_ATUALIZACAO_HORAS
        ) {

            console.log(
                "Dados ainda estão dentro das 24 horas."
            );

            console.log(
                "Novo scraping NÃO será realizado."
            );


            exibirDadosMercado(

                resultado,

                dadosMercadoExistentes,

                atualizacao

            );


            return;
        }

    }


    // ========================================================
    // 6. DADOS AUSENTES OU VENCIDOS
    // ========================================================

    console.log(
        "Dados inexistentes ou vencidos."
    );

    console.log(
        "Iniciando novo scraping."
    );


    resultado.innerHTML = `

        <h2>
            Dados de Mercado
        </h2>

        <p class="carregando">
            Atualizando dados de mercado...
        </p>

    `;


    // ========================================================
    // 7. FAZER SCRAPING
    // ========================================================

    const resultados =
        [];


    for (
        let i = 0;
        i < ativos.length;
        i++
    ) {

        const ativo =
            ativos[i];


        console.log(
            "========================================"
        );

        console.log(
            `Processando ${i + 1}/${ativos.length}:`,
            ativo.ticker,
            ativo.tipo
        );


        try {

            const dados =
                await buscarIndicadoresStatusInvest(

                    ativo.ticker,

                    ativo.tipo

                );


            resultados.push({

                ticker:
                    ativo.ticker,

                tipo:
                    ativo.tipo,

                valorAtual:
                    dados.valorAtual || "ERRO",

                min52:
                    dados.min52 || "ERRO",

                max52:
                    dados.max52 || "ERRO",

                dy:
                    dados.dy || "ERRO",

                valorizacao:
                    dados.valorizacao || "ERRO"

            });

        }

        catch (erro) {

            console.error(

                `Erro no scraping de ${ativo.ticker}:`,

                erro

            );


            resultados.push({

                ticker:
                    ativo.ticker,

                tipo:
                    ativo.tipo,

                valorAtual:
                    "ERRO",

                min52:
                    "ERRO",

                max52:
                    "ERRO",

                dy:
                    "ERRO",

                valorizacao:
                    "ERRO"

            });

        }


        // ----------------------------------------------------
        // Delay entre ativos
        // ----------------------------------------------------

        if (
            i <
            ativos.length - 1
        ) {

            await esperar(
                DELAY_ENTRE_ATIVOS
            );

        }

    }


    // ========================================================
    // 8. MONTAR CSV
    // ========================================================

    const dataAtualizacao =
        formatarDataCSV(
            new Date()
        );


    const csvNovo =
        montarCSVMercado(

            dataAtualizacao,

            resultados

        );


    console.log(
        "========================================"
    );

    console.log(
        "CSV preparado."
    );


    // ========================================================
    // 9. ENVIAR PARA O WORKER CSV
    // ========================================================

    resultado.innerHTML = `

        <h2>
            Dados de Mercado
        </h2>

        <p class="carregando">
            Salvando dados de mercado...
        </p>

    `;


    try {

        await gravarCSVNoGitHub(
            csvNovo
        );


        console.log(
            "dados_mercados.csv gravado com sucesso."
        );

    }

    catch (erro) {

        console.error(
            "Erro ao gravar dados_mercados.csv:",
            erro
        );


        // ----------------------------------------------------
        // Mesmo que a gravação falhe,
        // podemos mostrar os dados obtidos.
        // ----------------------------------------------------

        console.warn(
            "Exibindo os dados obtidos mesmo sem gravação."
        );

    }


    // ========================================================
    // 10. EXIBIR DADOS OBTIDOS
    // ========================================================

    exibirResultadosScraping(

        resultado,

        resultados,

        dataAtualizacao

    );


    console.log(
        "========================================"
    );

    console.log(
        "APLICAÇÃO FINALIZADA"
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


// ============================================================
// LER CSV
// ============================================================

async function lerCSV(
    caminho
) {

    const resposta =
        await fetch(

            caminho +
            "?v=" +
            Date.now(),

            {

                cache:
                    "no-store"

            }

        );


    if (!resposta.ok) {

        throw new Error(

            `HTTP ${resposta.status} ao ler ${caminho}`

        );

    }


    const texto =
        await resposta.text();


    if (
        !texto ||
        texto.trim().length === 0
    ) {

        throw new Error(
            `Arquivo vazio: ${caminho}`
        );

    }


    return processarCSV(
        texto
    );

}


// ============================================================
// PROCESSAR CSV
// ============================================================

function processarCSV(
    texto
) {

    const linhasBrutas =
        texto
            .trim()
            .split(/\r?\n/);


    if (
        linhasBrutas.length === 0
    ) {

        return [];

    }


    return linhasBrutas.map(

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
// EXTRAIR ATIVOS DA CARTEIRA
// ============================================================

function extrairAtivosDaCarteira(
    linhas
) {

    if (
        !linhas ||
        linhas.length <= 1
    ) {

        return [];

    }


    const ativos =
        [];


    for (
        let i = 1;
        i < linhas.length;
        i++
    ) {

        const linha =
            linhas[i];


        if (
            !linha ||
            linha.length === 0
        ) {

            continue;

        }


        const ticker =
            (linha[0] || "")
                .trim()
                .toUpperCase();


        if (
            !ticker ||
            ticker === "ATIVO" ||
            ticker === "TICKER"
        ) {

            continue;

        }


        // ----------------------------------------------------
        // Segunda coluna contém o tipo quando disponível.
        // ----------------------------------------------------

        let tipo =
            (linha[1] || "")
                .trim()
                .toLowerCase();


        // ----------------------------------------------------
        // Normalizar tipos
        // ----------------------------------------------------

        if (
            tipo.includes("fii") ||
            tipo.includes("fundo")
        ) {

            tipo = "fii";

        }

        else if (
            tipo.includes("ação") ||
            tipo.includes("acao") ||
            tipo.includes("stock")
        ) {

            tipo = "acoes";

        }

        else if (!tipo) {

            // Fallback apenas quando a carteira
            // não informar o tipo.

            tipo =
                ticker.endsWith("11")
                    ? "fii"
                    : "acoes";

        }


        ativos.push({

            ticker:
                ticker,

            tipo:
                tipo

        });

    }


    return ativos;

}


// ============================================================
// OBTER DATA DE ATUALIZAÇÃO
// ============================================================

function obterDataAtualizacao(
    linhas
) {

    if (
        !linhas ||
        linhas.length === 0
    ) {

        return null;

    }


    const cabecalho =
        linhas[0];


    let indiceData =
        -1;


    for (
        let i = 0;
        i < cabecalho.length;
        i++
    ) {

        const nome =
            cabecalho[i]
                .toLowerCase()
                .replace(
                    /[^a-z0-9]/g,
                    ""
                );


        if (

            nome === "dataatualizacao" ||

            nome === "atualizacao" ||

            nome === "data"

        ) {

            indiceData =
                i;

            break;

        }

    }


    if (
        indiceData === -1 ||
        linhas.length < 2
    ) {

        return null;

    }


    const valor =
        linhas[1][indiceData];


    if (
        !valor
    ) {

        return null;

    }


    const data =
        converterDataCSV(
            valor
        );


    return data;

}


// ============================================================
// CONVERTER DATA DO CSV
// ============================================================

function converterDataCSV(
    valor
) {

    // Formato:
    // 2026-08-12 09:54:00

    const padrao =
        /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/;


    const encontrado =
        valor.match(
            padrao
        );


    if (
        encontrado
    ) {

        return new Date(

            Number(
                encontrado[1]
            ),

            Number(
                encontrado[2]
            ) - 1,

            Number(
                encontrado[3]
            ),

            Number(
                encontrado[4]
            ),

            Number(
                encontrado[5]
            ),

            Number(
                encontrado[6]
            )

        );

    }


    const data =
        new Date(
            valor
        );


    if (
        isNaN(
            data.getTime()
        )
    ) {

        return null;

    }


    return data;

}


// ============================================================
// CALCULAR HORAS DESDE ATUALIZAÇÃO
// ============================================================

function calcularHorasDesde(
    data
) {

    const agora =
        new Date();


    const diferenca =
        agora.getTime() -
        data.getTime();


    return (
        diferenca /
        (
            1000 *
            60 *
            60
        )
    );

}


// ============================================================
// MONTAR CSV DE MERCADO
// ============================================================

function montarCSVMercado(

    dataAtualizacao,

    resultados

) {

    const linhas =
        [];


    linhas.push(

        [

            "DataAtualizacao",

            "Ticker",

            "Tipo",

            "ValorAtual",

            "Min52",

            "Max52",

            "DY",

            "Valorizacao"

        ].join(",")

    );


    resultados.forEach(

        ativo => {

            linhas.push(

                [

                    escaparCSV(
                        dataAtualizacao
                    ),

                    escaparCSV(
                        ativo.ticker
                    ),

                    escaparCSV(
                        ativo.tipo
                    ),

                    escaparCSV(
                        ativo.valorAtual
                    ),

                    escaparCSV(
                        ativo.min52
                    ),

                    escaparCSV(
                        ativo.max52
                    ),

                    escaparCSV(
                        ativo.dy
                    ),

                    escaparCSV(
                        ativo.valorizacao
                    )

                ].join(",")

            );

        }

    );


    return linhas.join(
        "\n"
    );

}


// ============================================================
// ESCAPAR CAMPO CSV
// ============================================================

function escaparCSV(
    valor
) {

    const texto =
        String(
            valor ?? ""
        );


    if (

        texto.includes(",") ||

        texto.includes('"') ||

        texto.includes("\n")

    ) {

        return '"' +
            texto.replace(
                /"/g,
                '""'
            ) +
            '"';

    }


    return texto;

}


// ============================================================
// GRAVAR CSV NO GITHUB
// ============================================================

async function gravarCSVNoGitHub(
    csv
) {

    const resposta =
        await fetch(

            WORKER_CSV,

            {

                method:
                    "POST",

                headers: {

                    "Content-Type":
                        "text/csv; charset=utf-8"

                },

                body:
                    csv,

                cache:
                    "no-store"

            }

        );


    const texto =
        await resposta.text();


    let dados;


    try {

        dados =
            JSON.parse(
                texto
            );

    }

    catch {

        throw new Error(
            "Worker CSV retornou resposta inválida: " +
            texto
        );

    }


    if (
        !resposta.ok ||
        !dados.sucesso
    ) {

        throw new Error(

            dados.erro ||

            `Worker CSV respondeu HTTP ${resposta.status}.`

        );

    }


    return dados;

}


// ============================================================
// EXIBIR DADOS EXISTENTES
// ============================================================

function exibirDadosMercado(

    container,

    linhas,

    dataAtualizacao

) {

    const resultados =
        converterLinhasMercado(
            linhas
        );


    exibirResultadosScraping(

        container,

        resultados,

        dataAtualizacao

    );

}


// ============================================================
// CONVERTER LINHAS DO CSV DE MERCADO
// ============================================================

function converterLinhasMercado(
    linhas
) {

    if (
        !linhas ||
        linhas.length <= 1
    ) {

        return [];

    }


    const cabecalho =
        linhas[0];


    const indice =
        {};


    cabecalho.forEach(

        (nome, i) => {

            indice[
                nome
                    .toLowerCase()
                    .replace(
                        /[^a-z0-9]/g,
                        ""
                    )
            ] = i;

        }

    );


    return linhas
        .slice(1)
        .map(

            linha => ({

                ticker:
                    linha[
                        indice.ticker
                    ] || "ERRO",

                tipo:
                    linha[
                        indice.tipo
                    ] || "",

                valorAtual:
                    linha[
                        indice.valoratual
                    ] || "ERRO",

                min52:
                    linha[
                        indice.min52
                    ] || "ERRO",

                max52:
                    linha[
                        indice.max52
                    ] || "ERRO",

                dy:
                    linha[
                        indice.dy
                    ] || "ERRO",

                valorizacao:
                    linha[
                        indice.valorizacao
                    ] || "ERRO"

            })

        );

}


// ============================================================
// EXIBIR RESULTADOS
// ============================================================

function exibirResultadosScraping(

    container,

    resultados,

    dataAtualizacao

) {

    if (
        !resultados ||
        resultados.length === 0
    ) {

        mostrarErro(

            container,

            "Nenhum dado de mercado disponível."

        );

        return;

    }


    const dataTexto =
        dataAtualizacao instanceof Date

            ? dataAtualizacao.toLocaleString(
                "pt-BR"
            )

            : dataAtualizacao;


    let html = `

        <h2>
            Dados de Mercado
        </h2>

        <p>
            <strong>
                Atualização:
            </strong>
            ${dataTexto}
        </p>

        <div style="overflow-x:auto;">

            <table>

                <thead>

                    <tr>

                        <th>Ativo</th>

                        <th>Valor Atual</th>

                        <th>Mín. 52 Semanas</th>

                        <th>Máx. 52 Semanas</th>

                        <th>DY 12M</th>

                        <th>Valorização 12M</th>

                    </tr>

                </thead>

                <tbody>
    `;


    resultados.forEach(

        ativo => {

            html += `

                <tr>

                    <td>
                        <strong>
                            ${escaparHTML(
                                ativo.ticker
                            )}
                        </strong>
                    </td>

                    <td>
                        ${escaparHTML(
                            ativo.valorAtual
                        )}
                    </td>

                    <td>
                        ${escaparHTML(
                            ativo.min52
                        )}
                    </td>

                    <td>
                        ${escaparHTML(
                            ativo.max52
                        )}
                    </td>

                    <td>
                        ${escaparHTML(
                            ativo.dy
                        )}
                    </td>

                    <td>
                        ${escaparHTML(
                            ativo.valorizacao
                        )}
                    </td>

                </tr>

            `;

        }

    );


    html += `

                </tbody>

            </table>

        </div>

    `;


    container.innerHTML =
        html;

}


// ============================================================
// ESCAPAR HTML
// ============================================================

function escaparHTML(
    valor
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        String(
            valor ?? ""
        );


    return div.innerHTML;

}


// ============================================================
// MOSTRAR ERRO
// ============================================================

function mostrarErro(

    container,

    mensagem

) {

    container.innerHTML = `

        <h2>
            Dados de Mercado
        </h2>

        <p class="erro">
            ${escaparHTML(
                mensagem
            )}
        </p>

    `;

}


// ============================================================
// FORMATAR DATA PARA CSV
// ============================================================

function formatarDataCSV(
    data
) {

    const ano =
        data.getFullYear();


    const mes =
        String(
            data.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const dia =
        String(
            data.getDate()
        ).padStart(
            2,
            "0"
        );


    const hora =
        String(
            data.getHours()
        ).padStart(
            2,
            "0"
        );


    const minuto =
        String(
            data.getMinutes()
        ).padStart(
            2,
            "0"
        );


    const segundo =
        String(
            data.getSeconds()
        ).padStart(
            2,
            "0"
        );


    return (

        `${ano}-${mes}-${dia} ` +
        `${hora}:${minuto}:${segundo}`

    );

}


// ============================================================
// ESPERAR
// ============================================================

function esperar(
    milissegundos
) {

    return new Promise(

        resolve =>

            setTimeout(

                resolve,

                milissegundos

            )

    );

}
