// ============================================================
// atualizarfiis.js
// Atualiza APENAS as colunas exclusivas de FIIs (colunas 45-54)
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
// COLUNAS EXCLUSIVAS DE FIIs (colunas 45 a 54)
// ============================================================

const COLUNAS_FIIS = [
    "CapRate",
    "RendimentoMensal",
    "Rendimento12M",
    "VacanciaMedia",
    "VacanciaFisica",
    "VacanciaFinanceira",
    "QtdImoveis",
    "Alavancagem",
    "PrazoContratos",
    "RentabilidadeImobiliaria"
];

// ============================================================
// FUNÇÕES AUXILIARES (reutilizadas do atualizaracoes.js)
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

    // Valida se as colunas de FIIs existem
    for (const coluna of COLUNAS_FIIS) {
        if (!cabecalho.includes(coluna)) {
            console.warn(`ATENÇÃO: Coluna "${coluna}" não encontrada no CSV. Será ignorada.`);
        }
    }

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
    if (!dados) return false;

    // Verifica se o CapRate foi encontrado (indicador principal)
    const capRate = dados.capRate;
    if (
        capRate === undefined ||
        capRate === null ||
        (typeof capRate === "string" && capRate.trim() === "") ||
        (typeof capRate === "string" && capRate.trim().toUpperCase() === "ERRO")
    ) {
        return false;
    }

    return true;
}

// ============================================================
// FUNÇÃO PRINCIPAL: ATUALIZAR FIIs
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
    onProgress("ATUALIZAÇÃO DE FIIs");
    onProgress("========================================");
    onProgress(`Total de FIIs: ${total}`);

    // --------------------------------------------------------
    // 3. PROCESSAR CADA FII
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
                onProgress(`Resultado: ERRO (CapRate não encontrado)`);
                onProgress("Dados anteriores mantidos.");
                continue;
            }

            // ------------------------------------------------
            // ATUALIZAR APENAS AS COLUNAS DE FIIs
            // ------------------------------------------------
            const dataAtualizacao = formatarDataAtualizacao();
            registro.DataAtualizacao = dataAtualizacao;

            // Mapear os campos do scraping para as colunas do CSV
            const mapeamento = {
                capRate: "CapRate",
                rendimentoMensal: "RendimentoMensal",
                rendimento12M: "Rendimento12M",
                vacanciaMedia: "VacanciaMedia",
                vacanciaFisica: "VacanciaFisica",
                vacanciaFinanceira: "VacanciaFinanceira",
                qtdImoveis: "QtdImoveis",
                alavancagem: "Alavancagem",
                prazoContratos: "PrazoContratos",
                rentabilidadeImobiliaria: "RentabilidadeImobiliaria"
            };

            for (const [campoScraping, colunaCSV] of Object.entries(mapeamento)) {
                if (dados[campoScraping] && dados[campoScraping] !== "ERRO") {
                    registro[colunaCSV] = dados[campoScraping];
                }
            }

            atualizados++;
            onProgress(`Resultado: OK (${dados.diagnostico?.encontrados || 0}/10 indicadores)`);

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
