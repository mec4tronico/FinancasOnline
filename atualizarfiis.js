// ============================================================
// atualizarfiis.js
// Atualiza DINAMICAMENTE as colunas de FIIs
// ============================================================

import { scrapingFIIs } from "./scrapingfiis.js";

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const ARQUIVO_CSV =
    "https://raw.githubusercontent.com/mec4tronico/FinancasOnline/main/" +
    "patrimonio_consolidado.csv";

const URL_WORKER_CSV =
    "https://financasonline-csv.augusto-gouveia2000.workers.dev/";

// ============================================================
// MAPEAMENTO EXPANDIDO: Títulos do StatusInvest → Colunas do CSV
// ============================================================

const MAPEAMENTO = {
    // ============================================================
    // VALOR PATRIMONIAL POR COTA
    // ============================================================
    "Valor Patrimonial por Cota": "ValorPatrimonialPorCota",
    "Val. Patrimonial P/Cota": "ValorPatrimonialPorCota",
    "Val. patrimonial p/cota": "ValorPatrimonialPorCota",
    "Valor Patrimonial P/Cota": "ValorPatrimonialPorCota",
    "Valor Patrimonial por cota": "ValorPatrimonialPorCota",

    // ============================================================
    // P/VP
    // ============================================================
    "P/VP": "PVP",

    // ============================================================
    // VALOR EM CAIXA
    // ============================================================
    "Valor em Caixa": "ValorEmCaixa",
    "Valor em caixa": "ValorEmCaixa",
    "Valor Em Caixa": "ValorEmCaixa",

    // ============================================================
    // DY CAGR (3 ANOS)
    // ============================================================
    "DY CAGR (3 anos)": "DYCAGR3Anos",
    "DYCAGR3Anos": "DYCAGR3Anos", // fallback direto

    // ============================================================
    // Nº DE COTISTAS
    // ============================================================
    "Nº de Cotistas": "NumeroCotistas",
    "N. de Cotistas": "NumeroCotistas",
    "Numero de Cotistas": "NumeroCotistas",
    "Número de Cotistas": "NumeroCotistas",

    // ============================================================
    // RENDIMENTO MENSAL MÉDIO (24M)
    // ============================================================
    "Rendimento Mensal Médio (24M)": "RendimentoMensalMedio24M",
    "Rendimento Mensal Médio": "RendimentoMensalMedio24M",
    "RENDIMENTO MENSAL MÉDIO (24M)": "RendimentoMensalMedio24M",
    "Rendimento mensal médio (24M)": "RendimentoMensalMedio24M",
    "Rendimento Médio (24M)": "RendimentoMensalMedio24M",

    // ============================================================
    // ANO PASSADO
    // ============================================================
    "Ano passado": "AnoPassado",
    "Ano Passado": "AnoPassado",

    // ============================================================
    // ANO ATUAL
    // ============================================================
    "Ano atual": "AnoAtual",
    "Ano Atual": "AnoAtual",

    // ============================================================
    // VOLUME (DIA)
    // ============================================================
    "Volume (dia)": "VolumeDia",
    "Volume": "VolumeDia",
    "VOLUME (dia)": "VolumeDia",
    "Volume Dia": "VolumeDia",
    "VOLUME DIA": "VolumeDia",

    // ============================================================
    // SEGMENTO ANBIMA
    // ============================================================
    "Segmento ANBIMA": "SegmentoANBIMA",
    "Segmento": "SegmentoANBIMA",
    "Segmento Anbima": "SegmentoANBIMA",

    // ============================================================
    // VALOR CAGR (3 ANOS) - se quiser adicionar
    // ============================================================
    "Valor CAGR (3 anos)": "ValorCAGR3Anos",
    "Valor CAGR": "ValorCAGR3Anos",

    // ============================================================
    // PARTICIPAÇÃO NO IFIX - se quiser adicionar
    // ============================================================
    "PARTICIPAÇÃO NO IFIX": "ParticipacaoIFIX",
    "Participação no IFIX": "ParticipacaoIFIX",

    // ============================================================
    // PROVISIONADO - se quiser adicionar
    // ============================================================
    "Provisionado": "Provisionado",

    // ============================================================
    // TOMADOR (MÉDIA) - se quiser adicionar
    // ============================================================
    "TOMADOR (média)": "TomadorMedia",
    "Tomador (média)": "TomadorMedia",

    // ============================================================
    // DOADOR (MÉDIA) - se quiser adicionar
    // ============================================================
    "DOADOR (média)": "DoadorMedia",
    "Doador (média)": "DoadorMedia",

    // ============================================================
    // Nº DE AÇÕES ALUGADAS (DIA) - se quiser adicionar
    // ============================================================
    "Nº DE AÇÕES ALUGADAS (dia)": "NumeroAcoesAlugadasDia",
    "Nº de Ações Alugadas (dia)": "NumeroAcoesAlugadasDia",

    // ============================================================
    // Nº DE CONTRATOS - se quiser adicionar
    // ============================================================
    "Nº DE CONTRATOS": "NumeroContratos",
    "Nº de Contratos": "NumeroContratos"
};

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
// VALIDAR RESULTADO DO SCRAPING (Dinâmica)
// ============================================================

function dadosScrapingValidos(dados) {
    if (!dados || !dados.indicadores) return false;

    // Verifica se pelo menos um indicador foi encontrado
    const temAlgumDado = Object.values(dados.indicadores).some(valor => 
        valor && valor !== "ERRO" && valor !== "VAZIO"
    );
    return temAlgumDado;
}

// ============================================================
// FUNÇÃO PRINCIPAL: ATUALIZAR FIIs (Dinâmica)
// ============================================================

async function atualizarFIIs(opcoes = {}) {
    const { onProgress = () => {} } = opcoes;

    // --------------------------------------------------------
    // 1. LER CSV
    // --------------------------------------------------------
    onProgress("Carregando PatrimonioConsolidado.csv...");
    const resultadoCSV = await carregarPatrimonio();
    let patrimonio = resultadoCSV.dados;
    const cabecalho = resultadoCSV.cabecalho;

    // --------------------------------------------------------
    // 2. FILTRAR APENAS FIIs
    // --------------------------------------------------------
    const fiis = patrimonio.filter(reg => reg.Tipo && reg.Tipo.trim().toLowerCase() === "fii");

    if (fiis.length === 0) {
        onProgress("Nenhum FII encontrado no patrimônio.");
        return { total: 0, atualizados: 0, erros: 0 };
    }

    const total = fiis.length;
    let atualizados = 0;
    let erros = 0;

    onProgress("========================================");
    onProgress("ATUALIZAÇÃO DE FIIs (DINÂMICA)");
    onProgress("========================================");
    onProgress(`Total de FIIs: ${total}`);

    // --------------------------------------------------------
    // 3. IDENTIFICAR QUAIS COLUNAS DO CSV SÃO DE FIIs
    // --------------------------------------------------------
    const COLUNAS_ORIGINAIS = [
        "Ativo", "Tipo", "Quantidade", "TotalInvestido", "DataPrimeiraCompra",
        "DataAtualizacao", "ValorAtual", "Min52", "Max52", "DY", "Valorizacao",
        "ValorAtualPosicao", "LucroPrejuizo", "Rentabilidade", "PesoCarteira",
        "RendaAnualEstimada", "RendaMensalEstimada", "ValorPosicaoMax52",
        "ValorPosicaoMin52", "PotencialFinanceiroMax52", "RiscoFinanceiroMin52"
    ];

    // Colunas de Ações (não devem ser alteradas pelo atualizador de FIIs)
    const COLUNAS_ACOES = [
        "Setor", "Subsetor", "Segmento", "ParticipacaoIndices", "FreeFloat",
        "VolumeDia", "ValorMercado", "ValorFirma", "PartIBOV", "Ativos", "DividaLiquida"
    ];

    // Colunas de FIIs (tudo que não é original nem Ação)
    const colunasFIIs = cabecalho.filter(coluna => 
        !COLUNAS_ORIGINAIS.includes(coluna) && 
        !COLUNAS_ACOES.includes(coluna)
    );

    onProgress(`Colunas de FIIs identificadas: ${colunasFIIs.length}`);
    if (colunasFIIs.length > 0) {
        onProgress(`  ${colunasFIIs.join(', ')}`);
    }

    // --------------------------------------------------------
    // 4. PROCESSAR CADA FII
    // --------------------------------------------------------
    for (let indice = 0; indice < total; indice++) {
        const registro = fiis[indice];
        const ticker = registro.Ativo;

        onProgress("");
        onProgress(`Processando ${indice + 1}/${total}: ${ticker}`);

        try {
            // ------------------------------------------------
            // SCRAPING
            // ------------------------------------------------
            const dados = await scrapingFIIs(ticker);

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
            // ATUALIZAR USANDO O MAPEAMENTO EXPANDIDO
            // ------------------------------------------------
            const dataAtualizacao = formatarDataAtualizacao();
            registro.DataAtualizacao = dataAtualizacao;

            let indicadoresEncontrados = 0;

            // Percorre todos os indicadores retornados pelo scraping
            for (const [tituloSite, valor] of Object.entries(dados.indicadores)) {
                // Verifica se o título está no mapeamento
                const nomeColuna = MAPEAMENTO[tituloSite];
                if (nomeColuna && valor && valor !== "ERRO" && valor !== "VAZIO") {
                    // Verifica se a coluna existe no cabeçalho do CSV
                    if (cabecalho.includes(nomeColuna)) {
                        registro[nomeColuna] = valor;
                        indicadoresEncontrados++;
                    }
                }
            }

            atualizados++;
            onProgress(`Resultado: OK (${indicadoresEncontrados} indicadores atualizados)`);

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
    onProgress("ATUALIZAÇÃO DE FIIs CONCLUÍDA");
    onProgress("========================================");
    onProgress(`Total de FIIs: ${total}`);
    onProgress(`Atualizados com sucesso: ${atualizados}`);
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
    atualizarFIIs
};
