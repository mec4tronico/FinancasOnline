// ============================================================
// ATUALIZAR.JS
// ============================================================
//
// Responsabilidade:
//
// 1. Ler patrimonio_consolidado.csv
// 2. Executar scraping dos ativos
// 3. Validar os dados de FIIs
// 4. Atualizar somente as colunas de FIIs
// 5. Manter dados anteriores quando houver erro
// 6. Executar calculos.js para as colunas calculadas
// 7. Gravar patrimonio_consolidado.csv no GitHub
//
// IMPORTANTE:
// - O CSV pode possuir 40 colunas.
// - A estrutura é obtida diretamente do cabeçalho do CSV.
// - Nenhuma coluna é removida ou recriada.
// - Somente as colunas de FIIs são alteradas pelo scraping.
//
// NÃO é responsabilidade deste arquivo:
// - criar botões
// - manipular HTML
// - montar tabela
// - criar gráficos
// - controlar abas
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
// COLUNAS UTILIZADAS PELO SCRAPING
// ============================================================
//
// IMPORTANTE:
// Estas são apenas as colunas que o atualizar.js modifica.
// As demais colunas existentes no CSV são preservadas.
//

const COLUNAS_FIIs = [

    "DataAtualizacao",
    "ValorAtual",
    "Min52",
    "Max52",
    "DY",
    "Valorizacao"

];


// ============================================================
// LER CSV
// ============================================================

async function carregarPatrimonio() {

    const urlCSV =
        `${ARQUIVO_CSV}?atualizadoEm=${Date.now()}`;


    const resposta =
        await fetch(
            urlCSV,
            {
                cache: "no-store"
            }
        );


    if (!resposta.ok) {

        throw new Error(
            `Não foi possível carregar ` +
            `patrimonio_consolidado.csv ` +
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
//
// O cabeçalho do próprio CSV define as colunas.
//
// Portanto:
// 21 colunas → funciona
// 40 colunas → funciona
// 50 colunas → também funciona
//
// O atualizar.js não precisa conhecer previamente
// os nomes das colunas adicionais.
//

function converterCSVParaPatrimonio(texto) {

    const linhas =
        texto
            .trim()
            .split(/\r?\n/);


    if (
        linhas.length === 0 ||
        !linhas[0].trim()
    ) {

        throw new Error(
            "PatrimonioConsolidado.csv está vazio."
        );

    }


    // --------------------------------------------------------
    // CABEÇALHO
    // --------------------------------------------------------

    const cabecalho =
        separarLinhaCSV(linhas[0])
            .map(
                valor =>
                    valor.trim()
            );


    if (
        cabecalho.length === 0
    ) {

        throw new Error(
            "Cabeçalho do CSV está vazio."
        );

    }


    // --------------------------------------------------------
    // VALIDAR SE AS COLUNAS NECESSÁRIAS EXISTEM
    // --------------------------------------------------------

    const colunasObrigatorias = [

        "Ativo",
        "Tipo",
        ...COLUNAS_FIIs

    ];


    for (
        const colunaObrigatoria
        of colunasObrigatorias
    ) {

        if (
            !cabecalho.includes(
                colunaObrigatoria
            )
        ) {

            throw new Error(
                `Coluna obrigatória não encontrada no CSV: ` +
                `${colunaObrigatoria}`
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

        if (
            !linhas[indice].trim()
        ) {

            continue;

        }


        const valores =
            separarLinhaCSV(
                linhas[indice]
            );


        // ----------------------------------------------------
        // GARANTIR A MESMA QUANTIDADE DO CABEÇALHO
        // ----------------------------------------------------

        while (
            valores.length <
            cabecalho.length
        ) {

            valores.push("");

        }


        if (
            valores.length >
            cabecalho.length
        ) {

            throw new Error(

                `Linha ${indice + 1} possui ` +
                `${valores.length} colunas, ` +
                `mas o cabeçalho possui ` +
                `${cabecalho.length}.`

            );

        }


        const registro = {};


        for (
            let coluna = 0;
            coluna < cabecalho.length;
            coluna++
        ) {

            registro[cabecalho[coluna]] =
                valores[coluna];

        }


        dados.push(
            registro
        );

    }


    return {

        cabecalho,

        dados

    };

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


        if (
            caractere === '"'
        ) {

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

            valores.push(
                valorAtual
            );

            valorAtual = "";

        }

        else {

            valorAtual +=
                caractere;

        }

    }


    if (
        dentroDeAspas
    ) {

        throw new Error(
            "CSV possui aspas não fechadas."
        );

    }


    valores.push(
        valorAtual
    );


    return valores;

}


// ============================================================
// VALIDAR RESULTADO DO SCRAPING
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
        const campo
        of camposObrigatorios
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
//
// Usa exatamente o cabeçalho que foi lido do CSV.
//
// Portanto, se o CSV possui 40 colunas,
// as mesmas 40 colunas serão gravadas.
//
// Nenhuma coluna adicional é perdida.
//

function gerarCSVPatrimonio(
    patrimonio,
    cabecalho
) {

    const linhas = [

        cabecalho
            .map(escaparValorCSV)
            .join(",")

    ];


    for (
        const registro
        of patrimonio
    ) {

        const valores =
            cabecalho.map(
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
    patrimonio,
    cabecalho
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
                        patrimonio,
                        cabecalho
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
// ATUALIZAR FIIs
// ============================================================

async function atualizarFIIs(
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


    const resultadoCSV =
        await carregarPatrimonio();


    let patrimonio =
        resultadoCSV.dados;


    const cabecalho =
        resultadoCSV.cabecalho;


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
        "ATUALIZAÇÃO DE FIIs"
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
            !dadosScrapingValidos(
                dados
            )
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
        // ATUALIZAR AS COLUNAS DE FIIs (já existentes)
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

        // ============================================
        // NOVO: ATUALIZAR OS 5 INDICADORES COMUNS
        // ============================================
        if (dados.setor) {
            registro.Setor = dados.setor;
        }
        if (dados.subsetor) {
            registro.Subsetor = dados.subsetor;
        }
        if (dados.segmento) {
            registro.Segmento = dados.segmento;
        }
        if (dados.participacaoIndices) {
            registro.ParticipacaoIndices = dados.participacaoIndices;
        }
        if (dados.freeFloat) {
            registro.FreeFloat = dados.freeFloat;
        }

        atualizados++;

        onProgress(
            "Resultado: OK"
        );

    }

    catch (erro) {

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
    // 4. CALCULAR COLUNAS CALCULADAS
    // ========================================================

    onProgress("");


    onProgress(
        "Calculando colunas calculadas..."
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
            patrimonio,
            cabecalho
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
        "Atualização de FIIs concluída."
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

    atualizarFIIs

};
