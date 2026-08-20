// ============================================================
// atualizaracoes.js
// Atualiza DINAMICAMENTE as colunas de AÇÕES
// ============================================================

import { scrapingAcoes } from "./scrapingacoes.js";

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const ARQUIVO_CSV =
    "https://raw.githubusercontent.com/mec4tronico/FinancasOnline/main/" +
    "patrimonio_consolidado.csv";

const URL_WORKER_CSV =
    "https://financasonline-csv.augusto-gouveia2000.workers.dev/";

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function separarLinhaCSV(linha) {
    const valores = [];
    let valorAtual = "";
    let dentroDeAspas = false;

    for (let indice = 0; indice < linha.length; indice++) {
        const caractere = linha[indice];
        if (caractere === '"') {
            if (dentroDeAspas && linha[indice + 1] === '"') {
                valorAtual += '"';
                indice++;
            } else {
                dentroDeAspas = !dentroDeAspas;
            }
        } else if (caractere === "," && !dentroDeAspas) {
            valores.push(valorAtual);
            valorAtual = "";
        } else {
            valorAtual += caractere;
        }
    }

    valores.push(valorAtual);
    return valores;
}

function escaparValorCSV(valor) {
    if (valor === undefined || valor === null) {
        return "";
    }
    const texto = String(valor);
    if (texto.includes(",") || texto.includes('"') || texto.includes("\n") || texto.includes("\r")) {
        return `"${texto.replace(/"/g, '""')}"`;
    }
    return texto;
}

function formatarDataAtualizacao() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");
    const hora = String(agora.getHours()).padStart(2, "0");
    const minuto = String(agora.getMinutes()).padStart(2, "0");
    const segundo = String(agora.getSeconds()).padStart(2, "0");
    return `${ano}-${mes}-${dia} ${hora}:${minuto}:${segundo}`;
}

// ============================================================
// LER CSV
// ============================================================

async function carregarPatrimonio() {
    const urlCSV = `${ARQUIVO_CSV}?atualizadoEm=${Date.now()}`;
    const resposta = await fetch(urlCSV, { cache: "no-store" });

    if (!resposta.ok) {
        throw new Error(`Não foi possível carregar patrimonio_consolidado.csv (HTTP ${resposta.status}).`);
    }

    const texto = await resposta.text();
    return converterCSVParaPatrimonio(texto);
}

function converterCSVParaPatrimonio(texto) {
    const linhas = texto.trim().split(/\r?\n/);

    if (linhas.length === 0 || !linhas[0].trim()) {
        throw new Error("PatrimonioConsolidado.csv está vazio.");
    }

    const cabecalho = separarLinhaCSV(linhas[0]).map(valor => valor.trim());

    const dados = [];
    for (let indice = 1; indice < linhas.length; indice++) {
        if (!linhas[indice].trim()) continue;

        const valores = separarLinhaCSV(linhas[indice]);
        while (valores.length < cabecalho.length) {
            valores.push("");
        }

        const registro = {};
        for (let coluna = 0; coluna < cabecalho.length; coluna++) {
            registro[cabecalho[coluna]] = valores[coluna] || "";
        }
        dados.push(registro);
    }

    return { cabecalho, dados };
}

// ============================================================
// GRAVAR CSV
// ============================================================

function gerarCSVPatrimonio(patrimonio, cabecalho) {
    const linhas = [cabecalho.map(escaparValorCSV).join(",")];
    for (const registro of patrimonio) {
        const valores = cabecalho.map(coluna => escaparValorCSV(registro[coluna] || ""));
        linhas.push(valores.join(","));
    }
    return linhas.join("\n");
}

async function gravarPatrimonioNoWorker(patrimonio, cabecalho) {
    const resposta = await fetch(URL_WORKER_CSV, {
        method: "POST",
        headers: { "Content-Type": "text/csv; charset=UTF-8" },
        body: gerarCSVPatrimonio(patrimonio, cabecalho)
    });

    let dados;
    try {
        dados = await resposta.json();
    } catch {
        throw new Error(`Worker de CSV retornou uma resposta inválida (HTTP ${resposta.status}).`);
    }

    if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.erro || `Worker de CSV retornou HTTP ${resposta.status}.`);
    }

    return dados;
}

// ============================================================
// VALIDAR RESULTADO DO SCRAPING (Dinâmico)
// ============================================================

function dadosScrapingValidos(dados) {
    if (!dados) return false;
    // Verifica se pelo menos um indicador foi encontrado
    const temAlgumDado = Object.values(dados).some(valor => 
        valor && valor !== "ERRO" && valor !== "VAZIO"
    );
    return temAlgumDado;
}

// ============================================================
// FUNÇÃO PRINCIPAL: ATUALIZAR AÇÕES (DINÂMICA)
// ============================================================

async function atualizarAcoes(opcoes = {}) {
    const { onProgress = () => {} } = opcoes;

    // --------------------------------------------------------
    // 1. LER CSV
    // --------------------------------------------------------
    onProgress("Carregando PatrimonioConsolidado.csv...");
    const resultadoCSV = await carregarPatrimonio();
    let patrimonio = resultadoCSV.dados;
    const cabecalho = resultadoCSV.cabecalho;

    // --------------------------------------------------------
    // 2. FILTRAR APENAS AÇÕES
    // --------------------------------------------------------
    const acoes = patrimonio.filter(reg => reg.Tipo && reg.Tipo.trim().toLowerCase() === "acoes");

    if (acoes.length === 0) {
        onProgress("Nenhuma ação encontrada no patrimônio.");
        return { total: 0, atualizados: 0, erros: 0 };
    }

    const total = acoes.length;
    let atualizados = 0;
    let erros = 0;

    onProgress("========================================");
    onProgress("ATUALIZAÇÃO DE AÇÕES (DINÂMICA)");
    onProgress("========================================");
    onProgress(`Total de ações: ${total}`);

    // --------------------------------------------------------
    // 3. IDENTIFICAR QUAIS COLUNAS DO CSV SÃO DE AÇÕES
    // --------------------------------------------------------
    // Definição das colunas que são de Ações (excluindo as originais 1-21)
    const COLUNAS_ORIGINAIS = [
        "Ativo", "Tipo", "Quantidade", "TotalInvestido", "DataPrimeiraCompra",
        "DataAtualizacao", "ValorAtual", "Min52", "Max52", "DY", "Valorizacao",
        "ValorAtualPosicao", "LucroPrejuizo", "Rentabilidade", "PesoCarteira",
        "RendaAnualEstimada", "RendaMensalEstimada", "ValorPosicaoMax52",
        "ValorPosicaoMin52", "PotencialFinanceiroMax52", "RiscoFinanceiroMin52"
    ];

    // Colunas de FIIs (não devem ser alteradas pelo atualizador de Ações)
    const COLUNAS_FIIS = [
        "ValorPatrimonialPorCota", "PVP", "ValorEmCaixa", "DYCAGR3Anos",
        "NumeroCotistas", "RendimentoMensalMedio24M", "AnoPassado", "AnoAtual",
        "VolumeDia", "SegmentoANBIMA"
    ];

    // Colunas de Ações (tudo que não é original nem FII)
    const colunasAcoes = cabecalho.filter(coluna => 
        !COLUNAS_ORIGINAIS.includes(coluna) && 
        !COLUNAS_FIIS.includes(coluna)
    );

    onProgress(`Colunas de Ações identificadas: ${colunasAcoes.length}`);
    onProgress(`  ${colunasAcoes.join(', ')}`);

    // --------------------------------------------------------
    // 4. PROCESSAR CADA AÇÃO
    // --------------------------------------------------------
    for (let indice = 0; indice < total; indice++) {
        const registro = acoes[indice];
        const ticker = registro.Ativo;

        onProgress("");
        onProgress(`Processando ${indice + 1}/${total}: ${ticker}`);

        try {
            // ------------------------------------------------
            // SCRAPING
            // ------------------------------------------------
            const dados = await scrapingAcoes(ticker);

            // ------------------------------------------------
            // VALIDAR
            // ------------------------------------------------
            if (!dadosScrapingValidos(dados)) {
                erros++;
                onProgress("Resultado: ERRO (Nenhum indicador encontrado)");
                onProgress("Dados anteriores mantidos.");
                continue;
            }

            // ------------------------------------------------
            // ATUALIZAR DINAMICAMENTE AS COLUNAS DE AÇÕES
            // ------------------------------------------------
            const dataAtualizacao = formatarDataAtualizacao();
            registro.DataAtualizacao = dataAtualizacao;

            let indicadoresEncontrados = 0;

            // Para cada coluna de ação no CSV, verifica se o scraping retornou um valor
            for (const coluna of colunasAcoes) {
                // Converte o nome da coluna para o formato usado no scraping (camelCase)
                const campoScraping = coluna.charAt(0).toLowerCase() + coluna.slice(1);
                
                if (dados[campoScraping] && dados[campoScraping] !== "ERRO" && dados[campoScraping] !== "VAZIO") {
                    registro[coluna] = dados[campoScraping];
                    indicadoresEncontrados++;
                }
            }

            atualizados++;
            onProgress(`Resultado: OK (${indicadoresEncontrados}/${colunasAcoes.length} indicadores)`);

        } catch (erro) {
            console.error(`Erro no scraping de ${ticker}:`, erro);
            erros++;
            onProgress("Resultado: ERRO");
            onProgress("Dados anteriores mantidos.");
        }
    }

    // --------------------------------------------------------
    // 5. GRAVAR CSV
    // --------------------------------------------------------
    onProgress("");
    onProgress("Gravando patrimonio_consolidado.csv...");

    const respostaGravacao = await gravarPatrimonioNoWorker(patrimonio, cabecalho);

    // --------------------------------------------------------
    // 6. RESUMO
    // --------------------------------------------------------
    onProgress("");
    onProgress("========================================");
    onProgress("ATUALIZAÇÃO DE AÇÕES CONCLUÍDA");
    onProgress("========================================");
    onProgress(`Total de ações: ${total}`);
    onProgress(`Atualizadas com sucesso: ${atualizados}`);
    onProgress(`Com erro: ${erros}`);
    onProgress(`Commit: ${respostaGravacao.commit || "N/A"}`);

    return {
        total,
        atualizados,
        erros,
        commit: respostaGravacao.commit || null
    };
}

export {
    atualizarAcoes
};
