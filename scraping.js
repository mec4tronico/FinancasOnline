// ============================================================
// scraping.js
// Consulta StatusInvest através do Cloudflare Worker
// Extrai APENAS os 5 indicadores básicos
// ============================================================

const PROXY_CLOUDFLARE = "https://financasonline.augusto-gouveia2000.workers.dev/";
const TIMEOUT_30_SEGUNDOS = 30000;

// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================

async function buscarIndicadoresStatusInvest(ticker, tipo) {
  // Estrutura de erro com diagnóstico
  const resultadoErro = {
    ticker: ticker,
    valorAtual: "ERRO",
    min52: "ERRO",
    max52: "ERRO",
    dy: "ERRO",
    valorizacao: "ERRO",
    erroDiagnostico: "Sem diagnóstico",
    etapaFalha: "desconhecida"
  };

  console.log("========================================");
  console.log(`INICIANDO SCRAPING: ${ticker} / ${tipo}`);
  console.log(`TIMESTAMP: ${new Date().toISOString()}`);

  try {
    // ====================================================
    // 1. VALIDAR PARÂMETROS
    // ====================================================
    ticker = String(ticker).trim().toUpperCase();
    tipo = String(tipo).trim().toLowerCase();

    console.log(`[${ticker}] Parâmetros validados: ticker=${ticker}, tipo=${tipo}`);

    if (!ticker || (tipo !== "acoes" && tipo !== "fii")) {
      const erro = `Parâmetros inválidos: ticker="${ticker}", tipo="${tipo}"`;
      console.error(`[${ticker}] ERRO: ${erro}`);
      resultadoErro.erroDiagnostico = erro;
      resultadoErro.etapaFalha = "validacao_parametros";
      return resultadoErro;
    }

    // ====================================================
    // 2. DEFINIR URL DO STATUSINVEST
    // ====================================================
    const categoria = tipo === "fii" ? "fundos-imobiliarios" : "acoes";
    const urlStatusInvest = `https://statusinvest.com.br/${categoria}/${ticker.toLowerCase()}`;
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
      const erro = "DOM não foi criado corretamente (documentElement vazio)";
      console.error(`[${ticker}] ERRO: ${erro}`);
      resultadoErro.erroDiagnostico = erro;
      resultadoErro.etapaFalha = "dom_vazio";
      return resultadoErro;
    }

    // ====================================================
    // 8. FUNÇÃO DE EXTRAÇÃO PADRÃO
    // ====================================================

    function obterValorPorTitulo(titulo) {
      const elementos = documento.querySelectorAll("h3, small, span");
      let encontrados = 0;

      for (const elemento of elementos) {
        const texto = elemento.textContent.trim().toUpperCase();
        if (texto.includes(titulo.toUpperCase())) {
          encontrados++;
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

      if (encontrados > 0) {
        console.warn(`[${ticker}] Título "${titulo}" encontrado ${encontrados} vez(es), mas valor não extraído`);
      }

      return null;
    }

    // ====================================================
    // 9. FUNÇÃO ESPECÍFICA PARA DY DAS AÇÕES
    // ====================================================

    function obterDY12MAcao() {
      console.log(`[${ticker}] Buscando DY 12M específico de ação...`);

      const elementos = documento.querySelectorAll("h3");
      let encontrados = 0;

      for (const elemento of elementos) {
        const texto = elemento.textContent.trim().toUpperCase();
        if (texto !== "DIVIDEND YIELD") {
          continue;
        }

        encontrados++;
        const bloco = elemento.closest(".info");
        if (!bloco) {
          console.warn(`[${ticker}] Título "DIVIDEND YIELD" encontrado, mas bloco .info não encontrado`);
          continue;
        }

        const valor = bloco.querySelector("strong.value");
        if (!valor) {
          console.warn(`[${ticker}] Bloco .info encontrado, mas strong.value não encontrado`);
          continue;
        }

        const dyEncontrado = valor.textContent.trim();
        if (/^\d+[,.]\d+$/.test(dyEncontrado)) {
          console.log(`[${ticker}] DY 12M encontrado: ${dyEncontrado}`);
          return dyEncontrado;
        } else {
          console.warn(`[${ticker}] Valor encontrado não parece ser DY: "${dyEncontrado}"`);
        }
      }

      if (encontrados === 0) {
        console.warn(`[${ticker}] Título "DIVIDEND YIELD" não encontrado na página`);
      } else {
        console.warn(`[${ticker}] Título "DIVIDEND YIELD" encontrado ${encontrados} vez(es), mas não foi possível extrair o valor`);
      }

      return null;
    }

    // ====================================================
    // 10. EXTRAIR OS 5 INDICADORES BÁSICOS
    // ====================================================
    console.log(`[${ticker}] Extraindo indicadores básicos...`);

    const valorAtual = obterValorPorTitulo("VALOR ATUAL");
    const min52 = obterValorPorTitulo("MIN. 52 SEMANAS");
    const max52 = obterValorPorTitulo("MÁX. 52 SEMANAS");

    let dy;
    if (tipo === "acoes") {
      dy = obterDY12MAcao();
    } else {
      dy = obterValorPorTitulo("DIVIDEND YIELD");
    }

    const valorizacao = obterValorPorTitulo("VALORIZAÇÃO (12M)");

    // ====================================================
    // 11. DIAGNÓSTICO
    // ====================================================
    const indicadoresNaoEncontrados = [];

    if (!valorAtual) indicadoresNaoEncontrados.push("VALOR ATUAL");
    if (!min52) indicadoresNaoEncontrados.push("MIN. 52 SEMANAS");
    if (!max52) indicadoresNaoEncontrados.push("MÁX. 52 SEMANAS");
    if (!dy) indicadoresNaoEncontrados.push("DY");
    if (!valorizacao) indicadoresNaoEncontrados.push("VALORIZAÇÃO (12M)");

    // ====================================================
    // 12. LOG DOS RESULTADOS
    // ====================================================
    console.log(`[${ticker}] ========== RESULTADOS ==========`);
    console.log(`  Valor Atual:           ${valorAtual || "❌ NÃO ENCONTRADO"}`);
    console.log(`  Mín. 52 Semanas:       ${min52 || "❌ NÃO ENCONTRADO"}`);
    console.log(`  Máx. 52 Semanas:       ${max52 || "❌ NÃO ENCONTRADO"}`);
    console.log(`  DY 12M:                ${dy || "❌ NÃO ENCONTRADO"}`);
    console.log(`  Valorização 12M:       ${valorizacao || "❌ NÃO ENCONTRADO"}`);

    if (indicadoresNaoEncontrados.length > 0) {
      console.warn(`[${ticker}] ⚠️ INDICADORES NÃO ENCONTRADOS (${indicadoresNaoEncontrados.length}):`);
      for (const indicador of indicadoresNaoEncontrados) {
        console.warn(`  - ${indicador}`);
      }
    } else {
      console.log(`[${ticker}] ✅ TODOS OS 5 INDICADORES ENCONTRADOS!`);
    }

    // ====================================================
    // 13. VALIDAR VALOR PRINCIPAL
    // ====================================================
    if (!valorAtual) {
      const erro = "Valor Atual não encontrado - scraping falhou";
      console.error(`[${ticker}] ERRO: ${erro}`);
      resultadoErro.erroDiagnostico = erro;
      resultadoErro.etapaFalha = "valor_atual_nao_encontrado";
      resultadoErro.indicadoresNaoEncontrados = indicadoresNaoEncontrados;
      return resultadoErro;
    }

    // ====================================================
    // 14. RETORNAR OBJETO
    // ====================================================
    const resultado = {
      ticker: ticker,
      valorAtual: valorAtual || "ERRO",
      min52: min52 || "ERRO",
      max52: max52 || "ERRO",
      dy: dy || "ERRO",
      valorizacao: valorizacao || "ERRO",
      diagnostico: {
        indicadoresNaoEncontrados: indicadoresNaoEncontrados,
        totalIndicadores: 5,
        encontrados: 5 - indicadoresNaoEncontrados.length
      }
    };

    console.log(`[${ticker}] SCRAPING CONCLUÍDO - ${resultado.diagnostico.encontrados}/5 indicadores encontrados`);
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
    buscarIndicadoresStatusInvest
};
