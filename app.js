// ============================================================
// app.js
// Ponto de entrada da aplicação
//
// Fluxo:
//
// 1. Carrega scraping.js
// 2. Lê carteira_b3_consolidada.csv (separado por ;)
// 3. Usa:
//      coluna 1 = NOME DO ATIVO
//      coluna 2 = TIPO
// 4. Lê dados_mercados.csv (separado por ,)
// 5. Verifica a data geral de atualização
// 6. Se tiver menos de 24 horas:
//      não faz scraping
// 7. Se tiver 24 horas ou mais:
//      faz scraping de todos os ativos
// 8. Grava dados_mercados.csv através do Worker CSV
// 9. Exibe os dados de mercado
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

iniciarCarteiraConsolidada();


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
    // 3. LER CARTEIRA (UTILIZANDO O PARSER COM SEPARADOR ';')
    // ========================================================

    let carteira;


    try {

        carteira =
            await lerCSVCarteira(
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


    // ========================================================
    // 4. EXTRAIR ATIVOS
    // ========================================================

    const ativos =
        extrairAtivosDaCarteira(
            carteira
        );


    if (
        ativos.length === 0
    ) {

        mostrarErro(

            resultado,

            "Nenhum ativo foi encontrado na carteira."

        );


        return;
    }


    console.log(
        "========================================"
    );

    console.log(
        "ATIVOS ENCONTRADOS NA CARTEIRA:"
    );


    ativos.forEach(

        ativo => {

            console.log(

                ativo.ticker,
                "/",
                ativo.tipo

            );

        }

    );


    // ========================================================
    // 5. LER DADOS DE MERCADO EXISTENTES
    // ========================================================

    let dadosMercadoExistentes =
        null;


    try {

        dadosMercadoExistentes =
            await lerCSV(
                ARQUIVO_MERCADO
            );


        console.log(
            "dados_mercados.csv carregado."
        );

    }

    catch (erro) {

        console.log(
            "dados_mercados.csv não disponível."
        );

        console.log(
            "Será necessário fazer scraping."
        );

    }


    // ========================================================
    // 6. VERIFICAR DATA DE ATUALIZAÇÃO
    // ========================================================

    const atualizacao =
        obterDataAtualizacao(
            dadosMercadoExistentes
        );


    if (atualizacao) {

        console.log(
            "Data de atualização:",
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
                "Scraping não será executado."
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
    // 7. FAZER NOVO SCRAPING
    // ========================================================

    console.log(
        "========================================"
    );

    console.log(
        "INICIANDO NOVO SCRAPING"
    );


    resultado.innerHTML = `

        <h2>
            Dados de Mercado
        </h2>

        <p class="carregando">
            Atualizando dados de mercado...
        </p>

    `;


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

            `Processando ${i + 1}/${ativos.length}`

        );


        console.log(
            "Ticker:",
            ativo.ticker
        );


        console.log(
            "Tipo:",
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
                    dados.valorAtual ||
                    "ERRO",

                min52:
                    dados.min52 ||
                    "ERRO",

                max52:
                    dados.max52 ||
                    "ERRO",

                dy:
                    dados.dy ||
                    "ERRO",

                valorizacao:
                    dados.valorizacao ||
                    "ERRO"

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
        // ESPERAR ANTES DO PRÓXIMO ATIVO
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
    // 8. DATA DE ATUALIZAÇÃO
    // ========================================================

    const dataAtualizacao =
        formatarDataCSV(
            new Date()
        );


    // ========================================================
    // 9. MONTAR CSV
    // ========================================================

    const csvNovo =
        montarCSVMercado(

            dataAtualizacao,

            resultados

        );


    console.log(
        "========================================"
    );

    console.log(
        "CSV DE MERCADO GERADO:"
    );

    console.log(
        csvNovo
    );


    // ========================================================
    // 10. GRAVAR CSV NO WORKER
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


        console.warn(
            "Os dados serão exibidos mesmo assim."
        );

    }


    // ========================================================
    // 11. EXIBIR RESULTADOS
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


// ============================================================
// LER CSV (PARA DADOS_MERCADOS.CSV - SEPARADOR VÍRGULA)
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
// PROCESSAR CSV (SEPARADOR VÍRGULA)
// ============================================================

function processarCSV(
    texto
) {

    const linhas =
        [];


    let linhaAtual =
        [];


    let campoAtual =
        "";


    let dentroDeAspas =
        false;


    for (
        let i = 0;
        i < texto.length;
        i++
    ) {

        const caractere =
            texto[i];


        if (
            caractere === '"'
        ) {

            if (
                dentroDeAspas &&
                texto[i + 1] === '"'
            ) {

                campoAtual += '"';

                i++;

                continue;

            }


            dentroDeAspas =
                !dentroDeAspas;

            continue;

        }


        if (

            caractere === "," &&

            !dentroDeAspas

        ) {

            linhaAtual.push(
                campoAtual.trim()
            );

            campoAtual =
                "";

            continue;

        }


        if (

            (
                caractere === "\n" ||
                caractere === "\r"
            ) &&

            !dentroDeAspas

        ) {

            if (
                caractere === "\r" &&
                texto[i + 1] === "\n"
            ) {

                i++;

            }


            linhaAtual.push(
                campoAtual.trim()
            );


            if (
                linhaAtual.length > 0
            ) {

                linhas.push(
                    linhaAtual
                );

            }


            linhaAtual =
                [];

            campoAtual =
                "";

            continue;

        }


        campoAtual +=
            caractere;

    }


    if (

        campoAtual.length > 0 ||

        linhaAtual.length > 0

    ) {

        linhaAtual.push(
            campoAtual.trim()
        );


        linhas.push(
            linhaAtual
        );

    }


    return linhas;

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

            ticker === "NOME DO ATIVO"

        ) {

            continue;

        }


        const tipoOriginal =
            (linha[1] || "")
                .trim()
                .toLowerCase();


        let tipo;


        if (

            tipoOriginal === "fii"

        ) {

            tipo =
                "fii";

        }

        else if (

            tipoOriginal === "acoes" ||

            tipoOriginal === "ação" ||

            tipoOriginal === "ações"

        ) {

            tipo =
                "acoes";

        }

        else {

            console.warn(

                `Tipo desconhecido para ${ticker}:`,

                tipoOriginal

            );

            continue;

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


    if (!valor) {

        return null;

    }


    return converterDataCSV(
        valor
    );

}


// ============================================================
// CONVERTER DATA
// ============================================================

function converterDataCSV(
    valor
) {

    const padrao =
        /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/;


    const encontrado =
        valor.match(
            padrao
        );


    if (encontrado) {

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
// ESCAPAR CSV
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
// GRAVAR CSV NO WORKER
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
// CONVERTER DADOS DE MERCADO
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
// FORMATAR DATA
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


// ============================================================
// ============================================================
// MÓDULO CARTEIRA CONSOLIDADA
// ============================================================
// ============================================================


// ============================================================
// INICIAR CARTEIRA CONSOLIDADA
// ============================================================

async function iniciarCarteiraConsolidada() {

    const container =
        document.querySelector(
            "#resultado-carteira"
        );


    if (!container) {

        console.error(
            "Elemento #resultado-carteira não encontrado."
        );

        return;
    }


    let linhas;


    try {

        linhas =
            await lerCSVCarteira(
                ARQUIVO_CARTEIRA
            );

    }

    catch (erro) {

        console.error(
            "Erro ao ler carteira_b3_consolidada.csv:",
            erro
        );


        mostrarErroCarteira(

            container,

            "Não foi possível carregar carteira_b3_consolidada.csv."

        );


        return;
    }


    exibirTabelaCarteira(
        container,
        linhas
    );

}


// ============================================================
// LER CSV DA CARTEIRA (SEPARADOR ";")
// ============================================================

async function lerCSVCarteira(
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


    return processarCSVCarteira(
        texto
    );

}


// ============================================================
// PROCESSAR CSV DA CARTEIRA (SEPARADOR ";")
// ============================================================

function processarCSVCarteira(
    texto
) {

    const linhas =
        [];


    let linhaAtual =
        [];


    let campoAtual =
        "";


    let dentroDeAspas =
        false;


    for (
        let i = 0;
        i < texto.length;
        i++
    ) {

        const caractere =
            texto[i];


        if (
            caractere === '"'
        ) {

            if (
                dentroDeAspas &&
                texto[i + 1] === '"'
            ) {

                campoAtual += '"';

                i++;

                continue;

            }


            dentroDeAspas =
                !dentroDeAspas;

            continue;

        }


        if (

            caractere === ";" &&

            !dentroDeAspas

        ) {

            linhaAtual.push(
                campoAtual.trim()
            );

            campoAtual =
                "";

            continue;

        }


        if (

            (
                caractere === "\n" ||
                caractere === "\r"
            ) &&

            !dentroDeAspas

        ) {

            if (
                caractere === "\r" &&
                texto[i + 1] === "\n"
            ) {

                i++;

            }


            linhaAtual.push(
                campoAtual.trim()
            );


            if (
                linhaAtual.length > 0
            ) {

                linhas.push(
                    linhaAtual
                );

            }


            linhaAtual =
                [];

            campoAtual =
                "";

            continue;

        }


        campoAtual +=
            caractere;

    }


    if (

        campoAtual.length > 0 ||

        linhaAtual.length > 0

    ) {

        linhaAtual.push(
            campoAtual.trim()
        );


        linhas.push(
            linhaAtual
        );

    }


    return linhas;

}


// ============================================================
// EXIBIR TABELA DA CARTEIRA
// ============================================================

function exibirTabelaCarteira(

    container,

    linhas

) {

    if (

        !linhas ||

        linhas.length <= 1

    ) {

        mostrarErroCarteira(

            container,

            "Nenhum ativo encontrado na carteira."

        );

        return;

    }


    let html = `

        <div style="overflow-x:auto;">

            <table>

                <thead>

                    <tr>

                        <th>Ativo</th>

                        <th>Tipo</th>

                        <th>Quantidade</th>

                        <th>Total Investido</th>

                        <th>Data 1ª Compra</th>

                    </tr>

                </thead>

                <tbody>

    `;


    linhas
        .slice(1)
        .forEach(

            linha => {

                if (

                    !linha ||

                    linha.length === 0

                ) {

                    return;

                }


                html += `

                    <tr>

                        <td>

                            <strong>

                                ${escaparHTML(
                                    linha[0]
                                )}

                            </strong>

                        </td>

                        <td>

                            ${escaparHTML(
                                linha[1]
                            )}

                        </td>

                        <td>

                            ${escaparHTML(
                                linha[2]
                            )}

                        </td>

                        <td>

                            ${escaparHTML(
                                linha[3]
                            )}

                        </td>

                        <td>

                            ${escaparHTML(
                                linha[4]
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
// MOSTRAR ERRO DA CARTEIRA
// ============================================================

function mostrarErroCarteira(

    container,

    mensagem

) {

    container.innerHTML = `

        <p class="erro">

            ${escaparHTML(
                mensagem
            )}

        </p>

    `;

}
