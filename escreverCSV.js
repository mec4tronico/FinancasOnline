// ============================================================
// escreverCSV.js
// ============================================================
//
// Responsabilidade:
// 1. Receber os dados da carteira enviados pelo app.js
// 2. Extrair o ticker da primeira coluna
// 3. Fazer o loop dos tickers
// 4. Chamar scraping.js com UM ticker por vez
// 5. Aguardar 1,5 segundo entre consultas
// 6. Montar o dados_mercado.csv
// 7. Retornar o conteúdo do CSV para o app.js
//
// Este arquivo NÃO:
// - acessa diretamente o StatusInvest
// - manipula tabelas HTML
// - decide quando os dados estão vencidos
//
// ============================================================


// ============================================================
// CONFIGURAÇÃO
// ============================================================

const DELAY_ENTRE_REQUESTS_MS = 1500;

const NOME_ARQUIVO_DADOS_MERCADO =
    "dados_mercado.csv";


// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================

async function gerarArquivoDadosMercado(
    dadosCarteira
) {

    // --------------------------------------------------------
    // Verifica se o scraping.js foi carregado
    // --------------------------------------------------------

    if (
        typeof buscarIndicadoresStatusInvest !==
        "function"
    ) {

        throw new Error(
            "A função buscarIndicadoresStatusInvest " +
            "do scraping.js não está disponível."
        );

    }


    // --------------------------------------------------------
    // Extrai os tickers da primeira coluna
    // --------------------------------------------------------

    const tickers =
        dadosCarteira
            .map(linha => {

                if (
                    !linha ||
                    linha.length === 0
                ) {
                    return "";
                }

                return linha[0]
                    .trim()
                    .toUpperCase();

            })
            .filter(ticker =>
                ticker.length > 0
            );


    // --------------------------------------------------------
    // Remove possíveis duplicados
    // --------------------------------------------------------

    const tickersUnicos =
        [...new Set(tickers)];


    // --------------------------------------------------------
    // Array que armazenará os resultados
    // --------------------------------------------------------

    const resultados = [];


    // ========================================================
    // LOOP DOS ATIVOS
    // ========================================================

    for (
        let i = 0;
        i < tickersUnicos.length;
        i++
    ) {

        const ticker =
            tickersUnicos[i];


        // ----------------------------------------------------
        // Atualiza informação no console
        // ----------------------------------------------------

        console.log(
            `Consultando ${ticker} ` +
            `(${i + 1}/${tickersUnicos.length})`
        );


        // ----------------------------------------------------
        // Chama o scraping com UM ticker
        // ----------------------------------------------------

        const dadosAtivo =
            await buscarIndicadoresStatusInvest(
                ticker
            );


        // ----------------------------------------------------
        // Guarda resultado
        // ----------------------------------------------------

        resultados.push({

            ticker:
                ticker,

            valorAtual:
                dadosAtivo.valorAtual,

            min52:
                dadosAtivo.min52,

            max52:
                dadosAtivo.max52,

            dy:
                dadosAtivo.dy,

            valorizacao:
                dadosAtivo.valorizacao

        });


        // ----------------------------------------------------
        // Aguarda antes do próximo ativo
        // ----------------------------------------------------

        if (
            i <
            tickersUnicos.length - 1
        ) {

            await esperar(
                DELAY_ENTRE_REQUESTS_MS
            );

        }

    }


    // ========================================================
    // DATA/HORA GERAL DO ARQUIVO
    // ========================================================

    const agora =
        new Date();


    const dataAtualizacao =
        formatarDataHora(
            agora
        );


    // ========================================================
    // MONTA O CSV
    // ========================================================

    let csv = "";


    // --------------------------------------------------------
    // Primeira linha = controle geral do arquivo
    // --------------------------------------------------------

    csv +=
        `Atualizado Em;${dataAtualizacao}\n`;


    // --------------------------------------------------------
    // Cabeçalho
    // --------------------------------------------------------

    csv +=
        "Ativo;" +
        "Valor Atual;" +
        "Mín. 52 Semanas;" +
        "Máx. 52 Semanas;" +
        "DY 12M;" +
        "Valorização 12M\n";


    // --------------------------------------------------------
    // Dados
    // --------------------------------------------------------

    resultados.forEach(dados => {

        csv +=
            escaparCSV(dados.ticker) +
            ";" +

            escaparCSV(dados.valorAtual) +
            ";" +

            escaparCSV(dados.min52) +
            ";" +

            escaparCSV(dados.max52) +
            ";" +

            escaparCSV(dados.dy) +
            ";" +

            escaparCSV(dados.valorizacao) +

            "\n";

    });


    // ========================================================
    // MOSTRA NO CONSOLE
    // ========================================================

    console.log(
        "========================================"
    );

    console.log(
        "DADOS DE MERCADO GERADOS"
    );

    console.log(
        "========================================"
    );

    console.log(
        `Ativos processados: ${resultados.length}`
    );

    console.log(
        `Atualizado em: ${dataAtualizacao}`
    );

    console.log(
        csv
    );


    // ========================================================
    // RETORNA RESULTADO
    // ========================================================

    return {

        nomeArquivo:
            NOME_ARQUIVO_DADOS_MERCADO,

        dataAtualizacao:
            agora,

        textoCSV:
            csv,

        resultados:
            resultados

    };

}


// ============================================================
// AGUARDA
// ============================================================

function esperar(ms) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );

}


// ============================================================
// FORMATA DATA E HORA
// ============================================================

function formatarDataHora(
    data
) {

    const dia =
        String(
            data.getDate()
        ).padStart(2, "0");


    const mes =
        String(
            data.getMonth() + 1
        ).padStart(2, "0");


    const ano =
        data.getFullYear();


    const hora =
        String(
            data.getHours()
        ).padStart(2, "0");


    const minuto =
        String(
            data.getMinutes()
        ).padStart(2, "0");


    const segundo =
        String(
            data.getSeconds()
        ).padStart(2, "0");


    return (
        `${dia}/${mes}/${ano} ` +
        `${hora}:${minuto}:${segundo}`
    );

}


// ============================================================
// ESCAPA VALORES DO CSV
// ============================================================

function escaparCSV(
    valor
) {

    if (
        valor === null ||
        valor === undefined
    ) {

        return "";

    }


    const texto =
        String(valor);


    // Se possuir ;, aspas ou quebra de linha,
    // coloca o valor entre aspas.

    if (
        texto.includes(";") ||
        texto.includes('"') ||
        texto.includes("\n")
    ) {

        return (
            '"' +
            texto.replace(
                /"/g,
                '""'
            ) +
            '"'
        );

    }


    return texto;

}
