// ============================================================
// scrapingfiis.js
// Extrai indicadores fundamentalistas específicos para FIIs
// VERSÃO GENÉRICA - FUNCIONA PARA QUALQUER FII
// ============================================================

const PROXY_CLOUDFLARE = "https://financasonline.augusto-gouveia2000.workers.dev/";
const TIMEOUT_30_SEGUNDOS = 30000;

// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================

async function scrapingFIIs(ticker) {
  const resultadoErro = {
    ticker: ticker,
    capRate: "ERRO",
    rendimentoMensal: "ERRO",
    rendimento12M: "ERRO",
    vacanciaMedia: "ERRO",
    vacanciaFisica: "ERRO",
    vacanciaFinanceira: "ERRO",
    qtdImoveis: "ERRO",
    alavancagem: "ERRO",
    prazoContratos: "ERRO",
    rentabilidadeImobiliaria: "ERRO",
    erroDiagnostico: "Sem diagnóstico",
    etapaFalha: "desconhecida",
    // Armazena todos os indicadores encontrados (para diagnóstico)
    todosIndicadores: {}
  };

  console.log("========================================");
  console.log(`INICIANDO SCRAPING FIIs: ${ticker}`);
  console.log(`TIMESTAMP: ${new Date().toISOString()}`);

  try {
    // ====================================================
    // 1. VALIDAR PARÂMETROS
    // ====================================================
    ticker = String(ticker).trim().toUpperCase();

    if (!ticker) {
      const erro = `Ticker inválido: "${ticker}"`;
      console.error(`[${ticker}] ERRO: ${erro}`);
      resultadoErro.erroDiagnostico = erro;
      resultadoErro.etapaFalha = "validacao_parametro";
      return resultadoErro;
    }

    // ====================================================
    // 2. DEFINIR URL DO STATUSINVEST
    // ====================================================
    const urlStatusInvest = `https://statusinvest.com.br/fundos-imobiliarios/${ticker.toLowerCase()}`;
    console.log(`[${ticker}] URL StatusInvest: ${urlStatusInvest}`);

    const urlWorker = PROXY_CLOUDFLARE + "?url=" + encodeURIComponent(urlStatusInvest);

    // ====================================================
    // 3. FETCH COM LIMITE DE 30 SEGUNDOS
    // ====================================================
    console.log(`[${ticker}] Iniciando requisição ao Worker...`);

    const controlador = new AbortController();
    const timeout = setTimeout(() => {
      controlador.abort();
    }, TIMEOUT_30_SEGUNDOS);

    let resposta;
    let tempoInicio = Date.now();

    try {
      resposta = await fetch(urlWorker, {
        method: "GET",
        cache: "no-store",
        signal: controlador.signal
      });
    } catch (erro) {
      clearTimeout(timeout);
      const tempoDecorrido = ((Date.now() - tempoInicio) / 1000).toFixed(1);
      let erroMensagem = "";
      if (erro.name === "AbortError") {
        erroMensagem = `Timeout de ${TIMEOUT_30_SEGUNDOS/1000} segundos excedido (${tempoDecorrido}s)`;
      } else {
        erroMensagem = `Erro no fetch: ${erro.message || erro.toString()}`;
      }
      console.error(`[${ticker}] ERRO: ${erroMensagem}`);
      resultadoErro.erroDiagnostico = erroMensagem;
      resultadoErro.etapaFalha = "fetch_worker";
      return resultadoErro;
    }

    clearTimeout(timeout);
    const tempoDecorrido = ((Date.now() - tempoInicio) / 1000).toFixed(1);
    console.log(`[${ticker}] Worker respondeu em ${tempoDecorrido}s`);

    // ====================================================
    // 4. STATUS HTTP
    // ====================================================
    if (!resposta.ok) {
      const erro = `Worker retornou HTTP ${resposta.status} ${resposta.statusText}`;
      console.error(`[${ticker}] ERRO: ${erro}`);
      resultadoErro.erroDiagnostico = erro;
      resultadoErro.etapaFalha = "http_status";
      return resultadoErro;
    }

    // ====================================================
    // 5. LER HTML E CRIAR DOM
    // ====================================================
    const html = await resposta.text();
    console.log(`[${ticker}] HTML recebido: ${html.length} caracteres`);

    if (!html || html.length === 0) {
      const erro = "HTML vazio (0 caracteres)";
      console.error(`[${ticker}] ERRO: ${erro}`);
      resultadoErro.erroDiagnostico = erro;
      resultadoErro.etapaFalha = "html_vazio";
      return resultadoErro;
    }

    let documento;
    try {
      const parser = new DOMParser();
      documento = parser.parseFromString(html, "text/html");
    } catch (erro) {
      const erroMensagem = `Erro ao fazer parse do HTML: ${erro.message || erro.toString()}`;
      console.error(`[${ticker}] ERRO: ${erroMensagem}`);
      resultadoErro.erroDiagnostico = erroMensagem;
      resultadoErro.etapaFalha = "parse_dom";
      return resultadoErro;
    }

    // ====================================================
    // 6. EXTRAIR TODOS OS INDICADORES DA PÁGINA
    // ====================================================
    console.log(`[${ticker}] Extraindo todos os indicadores da página...`);

    const todosIndicadores = {};

    // Busca TODOS os blocos .info em toda a página
    const blocos = documento.querySelectorAll("div.info");
    console.log(`[${ticker}] Encontrados ${blocos.length} blocos .info na página.`);

    for (const bloco of blocos) {
      // Tenta encontrar o título
      const tituloElement = bloco.querySelector(".info-title h3, .info-title, h3");
      if (!tituloElement) continue;

      const titulo = tituloElement.textContent.trim().toUpperCase();
      
      // Tenta encontrar o valor
      const valorElement = bloco.querySelector(".info-value strong.value, .info-value .value, strong.value, .value");
      if (!valorElement) continue;

      const valor = valorElement.textContent.trim();
      if (!valor) continue;

      // Armazena o indicador encontrado
      todosIndicadores[titulo] = valor;
      console.log(`[${ticker}]   ${titulo}: ${valor}`);
    }

    console.log(`[${ticker}] Total de indicadores encontrados: ${Object.keys(todosIndicadores).length}`);
    resultadoErro.todosIndicadores = todosIndicadores;

    // ====================================================
    // 7. MAPEAR INDICADORES ENCONTRADOS PARA AS COLUNAS
    // ====================================================
    // Mapeamento de títulos (em maiúsculo) para nomes das colunas
    const mapeamento = {
      'CAP RATE': 'capRate',
      'CAP. RATE': 'capRate',
      'ÚLTIMO RENDIMENTO': 'rendimentoMensal',
      'ULTIMO RENDIMENTO': 'rendimentoMensal',
      'RENDIMENTO 12M': 'rendimento12M',
      'RENDIMENTO ÚLTIMOS 12 MESES': 'rendimento12M',
      'VACÂNCIA MÉDIA': 'vacanciaMedia',
      'VACÂNCIA FÍSICA': 'vacanciaFisica',
      'VACÂNCIA FINANCEIRA': 'vacanciaFinanceira',
      'QUANTIDADE DE IMÓVEIS': 'qtdImoveis',
      'Nº DE IMÓVEIS': 'qtdImoveis',
      'ALAVANCAGEM': 'alavancagem',
      'ENDIVIDAMENTO': 'alavancagem',
      'PRAZO MÉDIO DOS CONTRATOS': 'prazoContratos',
      'PRAZO MÉDIO': 'prazoContratos',
      'RENTABILIDADE IMOBILIÁRIA': 'rentabilidadeImobiliaria',
      'RENT. IMOBILIÁRIA': 'rentabilidadeImobiliaria',
      'VAL. PATRIMONIAL P/COTA': 'valorPatrimonialPorCota', // Opcional
      'P/VP': 'pvp', // Opcional
      'VALOR EM CAIXA': 'valorEmCaixa', // Opcional
    };

    const resultado = {
      ticker: ticker,
      capRate: "ERRO",
      rendimentoMensal: "ERRO",
      rendimento12M: "ERRO",
      vacanciaMedia: "ERRO",
      vacanciaFisica: "ERRO",
      vacanciaFinanceira: "ERRO",
      qtdImoveis: "ERRO",
      alavancagem: "ERRO",
      prazoContratos: "ERRO",
      rentabilidadeImobiliaria: "ERRO",
      diagnostico: {
        totalEncontrados: Object.keys(todosIndicadores).length,
        mapeados: 0,
        naoMapeados: []
      },
      todosIndicadores: todosIndicadores // Para diagnóstico
    };

    // Mapeia cada indicador encontrado
    for (const [titulo, valor] of Object.entries(todosIndicadores)) {
      const chave = mapeamento[titulo];
      if (chave) {
        resultado[chave] = valor;
        resultado.diagnostico.mapeados++;
        console.log(`[${ticker}] ✅ Mapeado: ${titulo} → ${chave} = ${valor}`);
      } else {
        resultado.diagnostico.naoMapeados.push(titulo);
        console.log(`[${ticker}] ⚠️ Não mapeado: ${titulo} = ${valor}`);
      }
    }

    // ====================================================
    // 8. LOG DOS RESULTADOS
    // ====================================================
    console.log(`[${ticker}] ========== RESULTADOS FIIs ==========`);
    console.log(`[${ticker}] Indicadores mapeados: ${resultado.diagnostico.mapeados}/${Object.keys(todosIndicadores).length}`);

    if (resultado.diagnostico.naoMapeados.length > 0) {
      console.warn(`[${ticker}] ⚠️ Indicadores não mapeados:`, resultado.diagnostico.naoMapeados);
    }

    console.log(`  CapRate: ${resultado.capRate}`);
    console.log(`  RendimentoMensal: ${resultado.rendimentoMensal}`);
    console.log(`  Rendimento12M: ${resultado.rendimento12M}`);
    console.log(`  VacanciaMedia: ${resultado.vacanciaMedia}`);
    console.log(`  VacanciaFisica: ${resultado.vacanciaFisica}`);
    console.log(`  VacanciaFinanceira: ${resultado.vacanciaFinanceira}`);
    console.log(`  QtdImoveis: ${resultado.qtdImoveis}`);
    console.log(`  Alavancagem: ${resultado.alavancagem}`);
    console.log(`  PrazoContratos: ${resultado.prazoContratos}`);
    console.log(`  RentabilidadeImobiliaria: ${resultado.rentabilidadeImobiliaria}`);

    console.log(`[${ticker}] SCRAPING FIIs CONCLUÍDO`);
    console.log("========================================");

    return resultado;

  } catch (erro) {
    const erroMensagem = `Erro inesperado: ${erro.message || erro.toString()}`;
    console.error(`[${ticker}] ERRO INESPERADO: ${erroMensagem}`);
    console.error(erro.stack || "Sem stack trace disponível");
    resultadoErro.erroDiagnostico = erroMensagem;
    resultadoErro.etapaFalha = "erro_inesperado";
    return resultadoErro;
  }
}

export {
    scrapingFIIs
};
