// ============================================================
// atualizarBasico.js
// ============================================================
//
// Responsabilidade:
//
// 1. Ler patrimonio_consolidado.csv
// 2. Executar scraping dos ativos (via scraping.js)
// 3. Atualizar DINAMICAMENTE as colunas com base no MAPEAMENTO
// 4. Manter dados anteriores quando houver erro
// 5. Executar calculos.js para as colunas calculadas
// 6. Gravar patrimonio_consolidado.csv no GitHub
//
// IMPORTANTE:
// - O CSV pode possuir qualquer número de colunas.
// - A estrutura é obtida diretamente do cabeçalho do CSV.
// - O MAPEAMENTO define quais títulos do scraping vão para quais colunas.
// - Nenhuma coluna é removida ou recriada.
//
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
// MAPEAMENTO DINÂMICO: Títulos do StatusInvest → Colunas do CSV
// ============================================================
// Este mapeamento é a única fonte de verdade para saber
// como os títulos extraídos do HTML se traduzem em colunas do CSV.
//
// Para adicionar um novo indicador, basta adicionar uma nova linha aqui.
// O código vai automaticamente identificar se a coluna existe no CSV.
// ============================================================

const MAPEAMENTO = {
    // ============================================================
    // INDICADORES BÁSICOS (comuns a Ações e FIIs)
    // ============================================================
    "Valor atual": "ValorAtual",
    "Min. 52 semanas": "Min52",
    "Máx. 52 semanas": "Max52",
    "Dividend Yield": "DY",
    "Valorização (12m)": "Valorizacao",

    // ============================================================
    // INDICADORES DE AÇÕES
    // ============================================================
    "Free Float": "FreeFloat",
    "Free-Float": "FreeFloat",
    "PART. IBOV": "PartIBOV",
    "Ativos": "Ativos",
    "Ativo circulante": "AtivoCirculante",
    "Dívida líquida": "DividaLiquida",
    "Dívida bruta": "DividaBruta",
    "Valor de mercado": "ValorMercado",
    "Valor de firma": "ValorFirma",
    "Nº total de papéis": "NumeroPapeis",
    "Tipo": "TipoPapel",
    "Setor": "Setor",
    "Subsetor": "Subsetor",
    "Segmento": "Segmento",
    "Participação em Índices": "ParticipacaoIndices",
    "ParticipacaoIndices": "ParticipacaoIndices",

    // ============================================================
    // INDICADORES DE FIIs
    // ============================================================
    "Valor Patrimonial por Cota": "ValorPatrimonialPorCota",
    "Val. Patrimonial P/Cota": "ValorPatrimonialPorCota",
    "Val. patrimonial p/cota": "ValorPatrimonialPorCota",
    "Valor Patrimonial P/Cota": "ValorPatrimonialPorCota",
    "Valor Patrimonial por cota": "ValorPatrimonialPorCota",
    "P/VP": "PVP",
    "Valor em Caixa": "ValorEmCaixa",
    "Valor em caixa": "ValorEmCaixa",
    "Valor Em Caixa": "ValorEmCaixa",
    "DY CAGR (3 anos)": "DYCAGR3Anos",
    "DYCAGR3Anos": "DYCAGR3Anos",
    "Nº de Cotistas": "NumeroCotistas",
    "N. de Cotistas": "NumeroCotistas",
    "Numero de Cotistas": "NumeroCotistas",
    "Número de Cotistas": "NumeroCotistas",
    "Rendimento Mensal Médio (24M)": "RendimentoMensalMedio24M",
    "Rendimento Mensal Médio": "RendimentoMensalMedio24M",
    "RENDIMENTO MENSAL MÉDIO (24M)": "RendimentoMensalMedio24M",
    "Rendimento mensal médio (24M)": "RendimentoMensalMedio24M",
    "Rendimento Médio (24M)": "RendimentoMensalMedio24M",
    "Ano passado": "AnoPassado",
    "Ano Passado": "AnoPassado",
    "Ano atual": "AnoAtual",
    "Ano Atual": "AnoAtual",
    "Volume (dia)": "VolumeDia",
    "Volume": "VolumeDia",
    "VOLUME (dia)": "VolumeDia",
    "Volume Dia": "VolumeDia",
    "VOLUME DIA": "VolumeDia",
    "Segmento ANBIMA": "SegmentoANBIMA",
    "Segmento": "SegmentoANBIMA",
    "Segmento Anbima": "SegmentoANBIMA",
    "Valor CAGR (3 anos)": "ValorCAGR3Anos",
    "Valor CAGR": "ValorCAGR3Anos",
    "PARTICIPAÇÃO NO IFIX": "ParticipacaoIFIX",
    "Participação no IFIX": "ParticipacaoIFIX",
    "Provisionado": "Provisionado",
    "TOMADOR (média)": "TomadorMedia",
    "Tomador (média)": "TomadorMedia",
    "DOADOR (média)": "DoadorMedia",
    "Doador (média)": "DoadorMedia",
    "Nº DE AÇÕES ALUGADAS (dia)": "NumeroAcoesAlugadasDia",
    "Nº de Ações Alugadas (dia)": "NumeroAcoesAlugadasDia",
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
    if (!dados) return false;

    // Verifica se pelo menos um indicador básico foi encontrado
    const camposBasicos = ["valorAtual", "min52", "max52", "dy", "valorizacao"];
    for (const campo of camposBasicos) {
        const valor = dados[campo];
        if (
            valor !== undefined &&
            valor !== null &&
            !(typeof valor === "string" && (valor.trim() === "" || valor.trim().toUpperCase() === "ERRO"))
        ) {
            return true;
        }
    }

    // Se nenhum campo básico foi encontrado, verifica se há qualquer outro indicador
    return Object.values(dados).some(valor =>
        valor && valor !== "ERRO" && valor !== "VAZIO"
    );
}

// ============================================================
// FUNÇÃO PRINCIPAL: ATUALIZAR (DINÂMICA)
// ============================================================

async function atualizarBasico(opcoes = {}) {
    const { onProgress = () => {} } = opcoes;

    // --------------------------------------------------------
    // 1. LER CSV
    // --------------------------------------------------------
    onProgress("Carregando PatrimonioConsolidado.csv...");
    const resultadoCSV = await carregarPatrimonio();
    let patrimonio = resultadoCSV.dados;
    const cabecalho = resultadoCSV.cabecalho;

    if (patrimonio.length === 0) {
        throw new Error("Patrimônio vazio. Não há ativos para atualizar.");
    }

    const total = patrimonio.length;
    let atualizados = 0;
    let erros = 0;

    onProgress("========================================");
    onProgress("ATUALIZAÇÃO DINÂMICA");
    onProgress("========================================");
    onProgress(`Total de ativos: ${total}`);

    // --------------------------------------------------------
    // 2. IDENTIFICAR QUAIS COLUNAS DO CSV PODEM SER ATUALIZADAS
    // --------------------------------------------------------
    // Para cada chave no MAPEAMENTO, verifica se a coluna correspondente existe no CSV
    const colunasViaveis = {};
    for (const [tituloSite, nomeColuna] of Object.entries(MAPEAMENTO)) {
        if (cabecalho.includes(nomeColuna)) {
            if (!colunasViaveis[nomeColuna]) {
                colunasViaveis[nomeColuna] = [];
            }
            colunasViaveis[nomeColuna].push(tituloSite);
        }
    }

    onProgress(`Colunas identificadas para atualização: ${Object.keys(colunasViaveis).length}`);
    if (Object.keys(colunasViaveis).length > 0) {
        onProgress(`  ${Object.keys(colunasViaveis).join(', ')}`);
    }

    // --------------------------------------------------------
    // 3. PROCESSAR CADA ATIVO
    // --------------------------------------------------------
    for (let indice = 0; indice < total; indice++) {
        const registro = patrimonio[indice];
        const ticker = registro.Ativo;

        onProgress("");
        onProgress(`Processando ${indice + 1}/${total}: ${ticker}`);
        onProgress(`Tipo: ${registro.Tipo}`);

        try {
            // ------------------------------------------------
            // SCRAPING
            // ------------------------------------------------
            const dados = await buscarIndicadoresStatusInvest(
                registro.Ativo,
                registro.Tipo
            );

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
            // ATUALIZAR DINAMICAMENTE
            // ------------------------------------------------
            const dataAtualizacao = formatarDataAtualizacao();
            registro.DataAtualizacao = dataAtualizacao;

            let indicadoresEncontrados = 0;

            // Percorre todos os indicadores retornados pelo scraping
            for (const [tituloSite, valor] of Object.entries(dados)) {
                // Pula campos de diagnóstico
                if (tituloSite === "ticker" || tituloSite === "diagnostico" || tituloSite === "erroDiagnostico" || tituloSite === "etapaFalha") {
                    continue;
                }

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
    // 4. SCRAPING TERMINADO
    // --------------------------------------------------------
    onProgress("");
    onProgress("========================================");
    onProgress("SCRAPING CONCLUÍDO");
    onProgress("========================================");
    onProgress(`Total de ativos: ${total}`);
    onProgress(`Atualizados com sucesso: ${atualizados}`);
    onProgress(`Com erro: ${erros}`);

    // --------------------------------------------------------
    // 5. CALCULAR COLUNAS CALCULADAS
    // --------------------------------------------------------
    onProgress("");
    onProgress("Calculando colunas calculadas...");
    patrimonio = calcularColunasPatrimonio(patrimonio);
    onProgress("Cálculos concluídos.");

    // --------------------------------------------------------
    // 6. GRAVAR CSV
    // --------------------------------------------------------
    onProgress("");
    onProgress("Gravando patrimonio_consolidado.csv...");
    const respostaGravacao = await gravarPatrimonioNoWorker(patrimonio, cabecalho);
    onProgress("CSV gravado com sucesso no GitHub.");
    if (respostaGravacao.commit) {
        onProgress(`Commit: ${respostaGravacao.commit}`);
    }

    // --------------------------------------------------------
    // 7. RETORNAR RESULTADO
    // --------------------------------------------------------
    onProgress("");
    onProgress("Atualização concluída.");

    return {
        patrimonio,
        total,
        atualizados,
        erros,
        commit: respostaGravacao.commit || null
    };
}

// ============================================================
// EXPORTAÇÃO
// ============================================================

export {
    atualizarBasico
};
