// ============================================================
// atualizaracoes.js
// Atualiza as colunas de AÇÕES usando mapeamento dinâmico
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
// MAPEAMENTO: Títulos do StatusInvest → Colunas do CSV
// ============================================================

const MAPEAMENTO = {
    // Indicadores básicos (já existentes)
    "Valor atual": "ValorAtual",
    "Min. 52 semanas": "Min52",
    "Máx. 52 semanas": "Max52",
    "Dividend Yield": "DY",
    "Valorização (12m)": "Valorizacao",
    
    // Novos indicadores (extraídos do scraping)
    "Volume (dia)": "VolumeDia",
    "Volume": "VolumeDia",
    "VOLUME (dia)": "VolumeDia",
    "VOLUME": "VolumeDia",
    "Valor de mercado": "ValorMercado",
    "Valor de firma": "ValorFirma",
    "PART. IBOV": "PartIBOV",
    "Ativos": "Ativos",
    "Dívida líquida": "DividaLiquida",
    "Free Float": "FreeFloat",
    
    // Classificação setorial
    "Setor": "Setor",
    "Subsetor": "Subsetor",
    "Segmento": "Segmento",
    "Participação em Índices": "ParticipacaoIndices",
    
    // Outros (caso apareçam)
    "Nº total de papéis": "NumeroPapeis",
    "Segmento de listagem": "SegmentoListagem",
    "TOMADOR (média)": "TomadorMedia",
    "DOADOR (média)": "DoadorMedia",
    "Nº DE AÇÕES ALUGADAS (dia)": "AcoesAlugadasDia",
    "Nº DE CONTRATOS": "NumeroContratos",
    "Ano passado": "AnoPassado",
    "Ano atual": "AnoAtual",
    "Provisionado": "Provisionado"
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
// VALIDAR RESULTADO DO SCRAPING
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
// FUNÇÃO PRINCIPAL: ATUALIZAR AÇÕES
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
    onProgress("ATUALIZAÇÃO DE AÇÕES");
    onProgress("========================================");
    onProgress(`Total de ações: ${total}`);

    // --------------------------------------------------------
    // 3. PROCESSAR CADA AÇÃO
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
            // ATUALIZAR AS COLUNAS USANDO O MAPEAMENTO
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
    // 4. GRAVAR CSV
    // --------------------------------------------------------
    onProgress("");
    onProgress("Gravando patrimonio_consolidado.csv...");

    const respostaGravacao = await gravarPatrimonioNoWorker(patrimonio, cabecalho);

    // --------------------------------------------------------
    // 5. RESUMO
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
