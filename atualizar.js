// ============================================================
// ATUALIZAR.JS
// ============================================================
//
// Responsabilidade:
//
// 1. Ler PatrimonioConsolidado.csv
// 2. Executar scraping dos ativos
// 3. Validar os dados de mercado
// 4. Atualizar as colunas 6–11
// 5. Manter dados anteriores quando houver erro
// 6. Executar calculos.js para as colunas 12–21
// 7. Gravar PatrimonioConsolidado.csv no GitHub
//
// NÃO é responsabilidade deste arquivo:
// - criar botões
// - manipular HTML
// - montar tabela
// - criar gráficos
// - controlar abas
//
// A interface será controlada por aba_patrimonio.js.
// ============================================================


import {
    buscarIndicadoresStatusInvest
} from "./scraping.js";


import {
    calcularColunasPatrimonio
} from "./calculos.js";


// ============================================================
// CONFIGURAÇÃO
// ============================================================

const ARQUIVO_CSV =
    "https://raw.githubusercontent.com/mec4tronico/FinancasOnline/main/" +
    "patrimonio_consolidado.csv";


const URL_WORKER_CSV =
    "https://financasonline-csv.augusto-gouveia2000.workers.dev/";


// ============================================================
// 21 COLUNAS OFICIAIS
// ============================================================

const COLUNAS = [

    "Ativo",
    "Tipo",
    "Quantidade",
    "TotalInvestido",
    "DataPrimeiraCompra",
    "DataAtualizacao",
    "ValorAtual",
    "Min52",
    "Max52",
    "DY",
    "Valorizacao",
    "ValorAtualPosicao",
    "LucroPrejuizo",
    "Rentabilidade",
    "PesoCarteira",
    "RendaAnualEstimada",
    "RendaMensalEstimada",
    "ValorPosicaoMax52",
    "ValorPosicaoMin52",
    "PotencialFinanceiroMax52",
    "RiscoFinanceiroMin52"

];


// ============================================================
// LER CSV
// ============================================================

async function carregarPatrimonio() {

    const urlCSV =
        `${ARQUIVO_CSV}?atualizadoEm=${Date.now()}`;


    const resposta =
        await fetch(urlCSV, {
            cache: "no-store"
        });


    if (!resposta.ok) {

        throw new Error(
            `Não foi possível carregar ` +
            `PatrimonioConsolidado.csv ` +
            `(HTTP ${resposta.status}).`
        );

    }


    const texto =
        await resposta.text();


    return converterCSVParaPatrimonio(texto);

}


// ============================================================
// CONVERTER CSV → OBJETOS
// ============================================================

function converterCSVParaPatrimonio(texto) {

    const linhas =
        texto
            .trim()
            .split(/\r?\n/);


    if (linhas.length === 0) {

        throw new Error(
            "PatrimonioConsolidado.csv está vazio."
        );

    }


    // --------------------------------------------------------
    // CABEÇALHO
    // --------------------------------------------------------

    const cabecalho =
        separarLinhaCSV(linhas[0])
            .map(valor => valor.trim());


    // --------------------------------------------------------
    // VALIDAR 21 COLUNAS
    // --------------------------------------------------------

    if (cabecalho.length !== 21) {

        throw new Error(
            `CSV possui ${cabecalho.length} colunas. ` +
            `Esperadas: 21.`
        );

    }


    // --------------------------------------------------------
    // VALIDAR NOME E ORDEM
    // --------------------------------------------------------

    for (
        let indice = 0;
        indice < COLUNAS.length;
        indice++
    ) {

        if (
            cabecalho[indice] !==
            COLUNAS[indice]
        ) {

            throw new Error(

                `Coluna ${indice + 1} incorreta.\n` +
                `Esperada: ${COLUNAS[indice]}\n` +
                `Encontrada: ${cabecalho[indice]}`

            );

        }

    }


    // --------------------------------------------------------
    // CONVERTER REGISTROS
    // --------------------------------------------------------

    const dados = [];


    for (
        let indice = 1;
        indice < linhas.length;
        indice++
    ) {

        if (!linhas[indice].trim()) {
            continue;
        }


        const valores =
            separarLinhaCSV(
                linhas[indice]
            );


        if (valores.length !== 21) {

            throw new Error(

                `Linha ${indice + 1} possui ` +
                `${valores.length} colunas. ` +
                `Esperadas: 21.`

            );

        }


        const registro = {};


        for (
            let coluna = 0;
            coluna < COLUNAS.length;
            coluna++
        ) {

            registro[COLUNAS[coluna]] =
                valores[coluna];

        }


        dados.push(registro);

    }


    return dados;

}


// ============================================================
// SEPARAR LINHA CSV
// ============================================================

function separarLinhaCSV(linha) {

    const valores = [];

    let valorAtual = "";

    let dentroDeAspas = false;


    for (
        let indice = 0;
        indice < linha.length;
        indice++
    ) {

        const caractere =
            linha[indice];


        if (caractere === '"') {

            if (
                dentroDeAspas &&
                linha[indice + 1] === '"'
            ) {

                valorAtual += '"';

                indice++;

            } else {

                dentroDeAspas =
                    !dentroDeAspas;

            }

        }

        else if (
            caractere === "," &&
            !dentroDeAspas
        ) {

            valores.push(valorAtual);

            valorAtual = "";

        }

        else {

            valorAtual += caractere;

        }

    }


    if (dentroDeAspas) {

        throw new Error(
            "CSV possui aspas não fechadas."
        );

    }


    valores.push(valorAtual);


    return valores;

}


// ============================================================
// VALIDAR RESULTADO DO SCRAPING
// ============================================================
//
// O scraping fornece:
//
// valorAtual
// min52
// max52
// dy
// valorizacao
//
// A DataAtualizacao é gerada pelo próprio atualizar.js
// somente depois que esses dados foram validados.
// ============================================================

function dadosScrapingValidos(dados) {

    if (!dados) {
        return false;
    }


    const camposObrigatorios = [

        "valorAtual",
        "min52",
        "max52",
        "dy",
        "valorizacao"

    ];


    for (
        const campo of camposObrigatorios
    ) {

        const valor =
            dados[campo];


        if (

            valor === undefined ||

            valor === null ||

            (
                typeof valor === "string" &&
                valor.trim() === ""
            ) ||

            (
                typeof valor === "string" &&
                valor.trim().toUpperCase() === "ERRO"
            )

        ) {

            return false;

        }

    }


    return true;

}


// ============================================================
// DATA/HORA
// ============================================================

function formatarDataAtualizacao() {

    const agora =
        new Date();


    const ano =
        agora.getFullYear();


    const mes =
        String(
            agora.getMonth() + 1
        ).padStart(2, "0");


    const dia =
        String(
            agora.getDate()
        ).padStart(2, "0");


    const hora =
        String(
            agora.getHours()
        ).padStart(2, "0");


    const minuto =
        String(
            agora.getMinutes()
        ).padStart(2, "0");


    const segundo =
        String(
            agora.getSeconds()
        ).padStart(2, "0");


    return (

        `${ano}-${mes}-${dia} ` +
        `${hora}:${minuto}:${segundo}`

    );

}


// ============================================================
// GERAR CSV
// ============================================================

function gerarCSVPatrimonio(patrimonio) {

    const linhas = [

        COLUNAS.join(",")

    ];


    for (
        const registro of patrimonio
    ) {

        const valores =
            COLUNAS.map(
                coluna =>
                    escaparValorCSV(
                        registro[coluna]
                    )
            );


        linhas.push(
            valores.join(",")
        );

    }


    return linhas.join("\n");

}


// ============================================================
// ESCAPAR VALOR CSV
// ============================================================

function escaparValorCSV(valor) {

    if (
        valor === undefined ||
        valor === null
    ) {

        return "";

    }


    const texto =
        String(valor);


    if (

        texto.includes(",") ||
        texto.includes('"') ||
        texto.includes("\n") ||
        texto.includes("\r")

    ) {

        return (

            `"${texto.replace(
                /"/g,
                '""'
            )}"`

        );

    }


    return texto;

}


// ============================================================
// GRAVAR PATRIMÔNIO NO WORKER
// ============================================================

async function gravarPatrimonioNoWorker(
    patrimonio
) {

    const resposta =
        await fetch(
            URL_WORKER_CSV,
            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "text/csv; charset=UTF-8"

                },

                body:
                    gerarCSVPatrimonio(
                        patrimonio
                    )

            }
        );


    let dados;


    try {

        dados =
            await resposta.json();

    }

    catch {

        throw new Error(

            `Worker de CSV retornou ` +
            `uma resposta inválida ` +
            `(HTTP ${resposta.status}).`

        );

    }


    if (
        !resposta.ok ||
        !dados.sucesso
    ) {

        throw new Error(

            dados.erro ||
            `Worker de CSV retornou ` +
            `HTTP ${resposta.status}.`

        );

    }


    return dados;

}


// ============================================================
// ATUALIZAR MERCADO
// ============================================================
//
// Esta é a função que será chamada pela
// aba_patrimonio.js.
//
// Exemplo:
//
// await atualizarMercado({
//     onProgress: mensagem => {
//         console.log(mensagem);
//     }
// });
//
// ============================================================

async function atualizarMercado(
    opcoes = {}
) {

    const {

        onProgress =
            () => {}

    } = opcoes;


    // --------------------------------------------------------
    // 1. LER CSV ATUAL
    // --------------------------------------------------------

    onProgress(
        "Carregando PatrimonioConsolidado.csv..."
    );


    let patrimonio =
        await carregarPatrimonio();


    if (
        patrimonio.length === 0
    ) {

        throw new Error(
            "Patrimônio vazio. Não há ativos para atualizar."
        );

    }


    const total =
        patrimonio.length;


    let atualizados = 0;

    let erros = 0;


    // --------------------------------------------------------
    // CABEÇALHO DO PROCESSAMENTO
    // --------------------------------------------------------

    onProgress(
        "========================================"
    );


    onProgress(
        "ATUALIZAÇÃO DE MERCADO"
    );


    onProgress(
        "========================================"
    );


    // ========================================================
    // 2. PROCESSAR TODOS OS ATIVOS
    // ========================================================

    for (
        let indice = 0;
        indice < total;
        indice++
    ) {

        const registro =
            patrimonio[indice];


        onProgress("");

        onProgress(
            `Processando ${indice + 1}/${total}: ` +
            `${registro.Ativo}`
        );


        onProgress(
            `Tipo: ${registro.Tipo}`
        );


        try {

            // ------------------------------------------------
            // SCRAPING
            // ------------------------------------------------

            const dados =
                await buscarIndicadoresStatusInvest(

                    registro.Ativo,

                    registro.Tipo

                );


            // ------------------------------------------------
            // VALIDAR ANTES DE ALTERAR
            // ------------------------------------------------

            if (
                !dadosScrapingValidos(dados)
            ) {

                erros++;


                onProgress(
                    "Resultado: ERRO"
                );


                onProgress(
                    "Dados anteriores mantidos."
                );


                continue;

            }


            // ------------------------------------------------
            // GERAR DATA SOMENTE APÓS VALIDAÇÃO
            // ------------------------------------------------

            const dataAtualizacao =
                formatarDataAtualizacao();


            // ------------------------------------------------
            // VALIDAR DATA
            // ------------------------------------------------

            if (
                !dataAtualizacao ||
                dataAtualizacao.trim() === ""
            ) {

                erros++;


                onProgress(
                    "Resultado: ERRO"
                );


                onProgress(
                    "Dados anteriores mantidos."
                );


                continue;

            }


            // ------------------------------------------------
            // ATUALIZAR EXCLUSIVAMENTE COLUNAS 6–11
            // ------------------------------------------------

            registro.DataAtualizacao =
                dataAtualizacao;


            registro.ValorAtual =
                dados.valorAtual;


            registro.Min52 =
                dados.min52;


            registro.Max52 =
                dados.max52;


            registro.DY =
                dados.dy;


            registro.Valorizacao =
                dados.valorizacao;


            atualizados++;


            onProgress(
                "Resultado: OK"
            );

        }


        catch (erro) {

            // ------------------------------------------------
            // IMPORTANTE:
            //
            // nenhuma coluna 6–11 foi alterada antes da
            // validação.
            //
            // Portanto, em caso de erro, os dados anteriores
            // permanecem integralmente.
            // ------------------------------------------------

            console.error(

                `Erro no scraping de ` +
                `${registro.Ativo}:`,

                erro

            );


            erros++;


            onProgress(
                "Resultado: ERRO"
            );


            onProgress(
                "Dados anteriores mantidos."
            );

        }

    }


    // ========================================================
    // 3. SCRAPING TERMINADO
    // ========================================================

    onProgress("");

    onProgress(
        "========================================"
    );


    onProgress(
        "SCRAPING CONCLUÍDO"
    );


    onProgress(
        "========================================"
    );


    onProgress(
        `Total de ativos: ${total}`
    );


    onProgress(
        `Atualizados com sucesso: ${atualizados}`
    );


    onProgress(
        `Com erro: ${erros}`
    );


    onProgress(
        `Mantidos sem alteração: ${erros}`
    );


    // ========================================================
    // 4. CALCULAR COLUNAS 12–21
    // ========================================================

    onProgress("");

    onProgress(
        "Calculando colunas 12–21..."
    );


    patrimonio =
        calcularColunasPatrimonio(
            patrimonio
        );


    onProgress(
        "Cálculos concluídos."
    );


    // ========================================================
    // 5. GRAVAR CSV
    // ========================================================

    onProgress("");

    onProgress(
        "Gravando patrimonio_consolidado.csv..."
    );


    const respostaGravacao =
        await gravarPatrimonioNoWorker(
            patrimonio
        );


    onProgress(
        "CSV gravado com sucesso no GitHub."
    );


    if (
        respostaGravacao.commit
    ) {

        onProgress(
            `Commit: ${respostaGravacao.commit}`
        );

    }


    // ========================================================
    // 6. RETORNAR RESULTADO
    // ========================================================

    onProgress("");

    onProgress(
        "Atualização de mercado concluída."
    );


    return {

        patrimonio,

        total,

        atualizados,

        erros,

        mantidos: erros,

        commit:
            respostaGravacao.commit || null

    };

}


// ============================================================
// EXPORTAÇÃO
// ============================================================

export {

    atualizarMercado

};
