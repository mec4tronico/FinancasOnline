// ============================================================
// scrapingacoes.js
// Extrai indicadores fundamentalistas específicos para AÇÕES
// ============================================================

const PROXY_CLOUDFLARE = "https://financasonline.augusto-gouveia2000.workers.dev/";
const TIMEOUT_30_SEGUNDOS = 30000;

// ============================================================
// FUNÇÃO PRINCIPAL
// Recebe apenas ticker de AÇÃO (ex: "PETR4", "VALE3")
// ============================================================

async function scrapingAcoes(ticker) {
  // Estrutura de erro com diagnóstico
  const resultadoErro = {
    ticker: ticker,
    // 18 indicadores exclusivos de Ações
    pl: "ERRO",
    pvp: "ERRO",
    liquidezMediaDiaria: "ERRO",
    evebitda: "ERRO",
    dividaLiquidaPL: "ERRO",
    liquidezCorrente: "ERRO",
    margemEBITDA: "ERRO",
    valorFirma: "ERRO",
    roe: "ERRO",
    roic: "ERRO",
    roa: "ERRO",
    margemLiquida: "ERRO",
    margemBruta: "ERRO",
    dyPayout: "ERRO",
    crescimentoReceita: "ERRO",
    crescimentoLucro: "ERRO",
    dividaBrutaPL: "ERRO",
    coberturaJuros: "ERRO",
    // Diagnóstico
    erroDiagnostico: "Sem diagnóstico",
    etapaFalha: "desconhecida"
  };

  console.log("========================================");
  console.log(`INICIANDO SCRAPING AÇÕES: ${ticker}`);
  console.log(`TIMESTAMP: ${new Date().toISOString()}`);

  try {
    // ====================================================
    // 1. VALIDAR PARÂMETROS
    // ====================================================
    ticker = String(ticker).trim().toUpperCase();

    console.log(`[${ticker}] Parâmetro validado: ${ticker}`);

    if (!ticker) {
      const erro = `Ticker inválido: "${ticker}"`;
      console.error(`[${ticker}] ERRO: ${erro}`);
      resultadoErro.erroDiagnostico = erro;
      resultadoErro.etapaFalha = "validacao_parametro";
      return resultadoErro;
    }

    // ====================================================
    // 2. DEFINIR URL DO STATUSINVEST (AÇÕES)
    // ====================================================
    const urlStatusInvest = `https://statusinvest.com.br/acoes/${ticker.toLowerCase()}`;
    console.log(`[${ticker}] URL StatusInvest: ${urlStatusInvest}`);

    // ====================================================
    // 3. MONTAR URL DO WORKER
    // ====================================================
    const urlWorker = PROXY_CLOUDFLARE + "?url=" + encodeURIComponent(urlStatusInvest);
    console.log(`[${ticker}] URL Worker: ${urlWorker}`);

    // ====================================================
    // 4. FETCH COM LIMITE DE 30 SEGUNDOS
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
    // 5. STATUS HTTP
    // ====================================================
    console.log(`[${ticker}] Status HTTP: ${resposta.status} ${resposta.statusText}`);

    if (!resposta.ok) {
      const erro = `Worker retornou HTTP ${resposta.status} ${resposta.statusText}`;
      console.error(`[${ticker}] ERRO: ${erro}`);
      resultadoErro.erroDiagnostico = erro;
      resultadoErro.etapaFalha = "http_status";
      return resultadoErro;
    }

    // ====================================================
    // 6. LER HTML
    // ====================================================
    console.log(`[${ticker}] Lendo HTML...`);

    let html;
    try {
      html = await resposta.text();
    } catch (erro) {
      const erroMensagem = `Erro ao ler HTML: ${erro.message || erro.toString()}`;
      console.error(`[${ticker}] ERRO: ${erroMensagem}`);
      resultadoErro.erroDiagnostico = erroMensagem;
      resultadoErro.etapaFalha = "leitura_html";
      return resultadoErro;
    }

    console.log(`[${ticker}] HTML recebido: ${html.length} caracteres`);

    if (!html || html.length === 0) {
      const erro = "HTML vazio (0 caracteres)";
      console.error(`[${ticker}] ERRO: ${erro}`);
      resultadoErro.erroDiagnostico = erro;
      resultadoErro.etapaFalha = "html_vazio";
      return resultadoErro;
    }

    // ====================================================
    // 7. TRANSFORMAR HTML EM DOM
    // ====================================================
    console.log(`[${ticker}] Criando DOM...`);

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

    if (!documento || !documento.documentElement) {
      const erro = "DOM não foi criado corretamente";
      console.error(`[${ticker}] ERRO: ${erro}`);
      resultadoErro.erroDiagnostico = erro;
      resultadoErro.etapaFalha = "dom_vazio";
      return resultadoErro;
    }

    // ====================================================
    // 8. FUNÇÃO DE EXTRAÇÃO PADRÃO (reutilizada)
    // ====================================================

    function obterValorPorTitulo(titulo) {
      const elementos = documento.querySelectorAll("h3, small, span");
      for (const elemento of elementos) {
        const texto = elemento.textContent.trim().toUpperCase();
        if (texto.includes(titulo.toUpperCase())) {
          let pai = elemento.closest("div");
          let tentativas = 0;
          while (pai && tentativas < 6) {
            const valor = pai.querySelector("strong.value");
            if (valor) {
              const textoValor = valor.textContent.trim();
              if (textoValor) {
                return textoValor;
              }
            }
            pai = pai.parentElement;
            tentativas++;
          }
        }
      }
      return null;
    }

    // ====================================================
    // 9. FUNÇÕES DE EXTRAÇÃO ESPECÍFICAS PARA AÇÕES
    // ====================================================

    // 9.1 ROE, ROIC, ROA (aparecem como "ROE", "ROIC", "ROA")
    function obterROE() { return obterValorPorTitulo("ROE"); }
    function obterROIC() { return obterValorPorTitulo("ROIC"); }
    function obterROA() { return obterValorPorTitulo("ROA"); }

    // 9.2 Margens
    function obterMargemLiquida() { return obterValorPorTitulo("MARGEM LÍQUIDA"); }
    function obterMargemBruta() { return obterValorPorTitulo("MARGEM BRUTA"); }
    function obterMargemEBITDA() { return obterValorPorTitulo("MARGEM EBITDA"); }

    // 9.3 Payout
    function obterDYPayout() { 
      let valor = obterValorPorTitulo("PAYOUT");
      if (!valor) valor = obterValorPorTitulo("ÍNDICE DE DISTRIBUIÇÃO");
      return valor;
    }

    // 9.4 Crescimento
    function obterCrescimentoReceita() {
      return obterValorPorTitulo("CRESCIMENTO DA RECEITA") || 
             obterValorPorTitulo("CRESCIMENTO RECEITA");
    }
    
    function obterCrescimentoLucro() {
      return obterValorPorTitulo("CRESCIMENTO DO LUCRO") ||
             obterValorPorTitulo("CRESCIMENTO LUCRO");
    }

    // ====================================================
    // 10. EXTRAIR TODOS OS 18 INDICADORES
    // ====================================================
    console.log(`[${ticker}] Extraindo 18 indicadores de ações...`);

    // Valuation
    const pl = obterValorPorTitulo("P/L");
    const pvp = obterValorPorTitulo("P/VP");
    const evebitda = obterValorPorTitulo("EV/EBITDA");
    const valorFirma = obterValorPorTitulo("VALOR DE FIIs") || 
                       obterValorPorTitulo("ENTERPRISE VALUE");

    // Endividamento
    const dividaLiquidaPL = obterValorPorTitulo("DÍVIDA LÍQUIDA/PL");
    const dividaBrutaPL = obterValorPorTitulo("DÍVIDA BRUTA/PL");
    const coberturaJuros = obterValorPorTitulo("COBERTURA DE JUROS") ||
                           obterValorPorTitulo("COBERTURA JUROS");

    // Rentabilidade
    const roe = obterROE();
    const roic = obterROIC();
    const roa = obterROA();
    const margemLiquida = obterMargemLiquida();
    const margemBruta = obterMargemBruta();
    const margemEBITDA = obterMargemEBITDA();

    // Liquidez
    const liquidezMediaDiaria = obterValorPorTitulo("LIQUIDEZ MÉDIA DIÁRIA") ||
                                obterValorPorTitulo("LIQUIDEZ MÉDIA");

    const liquidezCorrente = obterValorPorTitulo("LIQUIDEZ CORRENTE");  
    
    // Dividendos
    const dyPayout = obterDYPayout();

    // Crescimento
    const crescimentoReceita = obterCrescimentoReceita();
    const crescimentoLucro = obterCrescimentoLucro();

    // ====================================================
    // 11. DIAGNÓSTICO
    // ====================================================
    const indicadores = [
      { nome: "PL", valor: pl },
      { nome: "PVP", valor: pvp },
      { nome: "LiquidezMediaDiaria", valor: liquidezMediaDiaria },
      { nome: "EVEBITDA", valor: evebitda },
      { nome: "DividaLiquidaPL", valor: dividaLiquidaPL },
      { nome: "LiquidezCorrente", valor: liquidezCorrente },
      { nome: "MargemEBITDA", valor: margemEBITDA },
      { nome: "ValorFirma", valor: valorFirma },
      { nome: "ROE", valor: roe },
      { nome: "ROIC", valor: roic },
      { nome: "ROA", valor: roa },
      { nome: "MargemLiquida", valor: margemLiquida },
      { nome: "MargemBruta", valor: margemBruta },
      { nome: "DYPayout", valor: dyPayout },
      { nome: "CrescimentoReceita", valor: crescimentoReceita },
      { nome: "CrescimentoLucro", valor: crescimentoLucro },
      { nome: "DividaBrutaPL", valor: dividaBrutaPL },
      { nome: "CoberturaJuros", valor: coberturaJuros }
    ];

    const naoEncontrados = indicadores
      .filter(i => !i.valor)
      .map(i => i.nome);

    // ====================================================
    // 12. LOG DOS RESULTADOS
    // ====================================================
    console.log(`[${ticker}] ========== RESULTADOS AÇÕES ==========`);
    for (const i of indicadores) {
      console.log(`  ${i.nome.padEnd(22)}: ${i.valor || "❌ NÃO ENCONTRADO"}`);
    }

    if (naoEncontrados.length > 0) {
      console.warn(`[${ticker}] ⚠️ INDICADORES NÃO ENCONTRADOS (${naoEncontrados.length}):`);
      for (const nome of naoEncontrados) {
        console.warn(`  - ${nome}`);
      }
    } else {
      console.log(`[${ticker}] ✅ TODOS OS 18 INDICADORES ENCONTRADOS!`);
    }

    // ====================================================
    // 13. VALIDAR VALOR PRINCIPAL (PL)
    // ====================================================
    if (!pl) {
      const erro = "PL não encontrado - scraping falhou";
      console.error(`[${ticker}] ERRO: ${erro}`);
      resultadoErro.erroDiagnostico = erro;
      resultadoErro.etapaFalha = "pl_nao_encontrado";
      return resultadoErro;
    }

    // ====================================================
    // 14. RETORNAR OBJETO
    // ====================================================
    const resultado = {
      ticker: ticker,
      pl: pl || "ERRO",
      pvp: pvp || "ERRO",
      liquidezMediaDiaria: liquidezMediaDiaria || "ERRO",
      evebitda: evebitda || "ERRO",
      dividaLiquidaPL: dividaLiquidaPL || "ERRO",
      liquidezCorrente: liquidezCorrente || "ERRO",
      margemEBITDA: margemEBITDA || "ERRO",
      valorFirma: valorFirma || "ERRO",
      roe: roe || "ERRO",
      roic: roic || "ERRO",
      roa: roa || "ERRO",
      margemLiquida: margemLiquida || "ERRO",
      margemBruta: margemBruta || "ERRO",
      dyPayout: dyPayout || "ERRO",
      crescimentoReceita: crescimentoReceita || "ERRO",
      crescimentoLucro: crescimentoLucro || "ERRO",
      dividaBrutaPL: dividaBrutaPL || "ERRO",
      coberturaJuros: coberturaJuros || "ERRO",
      // Diagnóstico
      diagnostico: {
        indicadoresNaoEncontrados: naoEncontrados,
        totalIndicadores: 18,
        encontrados: 18 - naoEncontrados.length
      }
    };

    console.log(`[${ticker}] SCRAPING AÇÕES CONCLUÍDO - ${resultado.diagnostico.encontrados}/18 encontrados`);
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
    scrapingAcoes
};
