// ============================================================
// scrapingacoes.js (VERSÃO GENÉRICA - EXTRAI ATÉ 30 INDICADORES)
// ============================================================

const PROXY_CLOUDFLARE = "https://financasonline.augusto-gouveia2000.workers.dev/";
const TIMEOUT_30_SEGUNDOS = 30000;

// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================

async function scrapingAcoes(ticker) {
  console.log("========================================");
  console.log(`INICIANDO SCRAPING AÇÕES: ${ticker}`);
  console.log(`TIMESTAMP: ${new Date().toISOString()}`);

  const resultado = {
    ticker: ticker,
    indicadores: {},
    totalEncontrados: 0,
    erroDiagnostico: null
  };

  try {
    // ====================================================
    // 1. VALIDAR PARÂMETROS
    // ====================================================
    ticker = String(ticker).trim().toUpperCase();
    if (!ticker) {
      resultado.erroDiagnostico = `Ticker inválido: "${ticker}"`;
      return resultado;
    }

    // ====================================================
    // 2. DEFINIR URL E BUSCAR HTML
    // ====================================================
    const urlStatusInvest = `https://statusinvest.com.br/acoes/${ticker.toLowerCase()}`;
    const urlWorker = PROXY_CLOUDFLARE + "?url=" + encodeURIComponent(urlStatusInvest);

    console.log(`[${ticker}] URL Worker: ${urlWorker}`);

    const controlador = new AbortController();
    const timeout = setTimeout(() => controlador.abort(), TIMEOUT_30_SEGUNDOS);

    let resposta;
    try {
      resposta = await fetch(urlWorker, {
        method: "GET",
        cache: "no-store",
        signal: controlador.signal
      });
    } catch (erro) {
      clearTimeout(timeout);
      resultado.erroDiagnostico = erro.name === "AbortError" 
        ? `Timeout de ${TIMEOUT_30_SEGUNDOS/1000}s excedido` 
        : `Erro no fetch: ${erro.message}`;
      return resultado;
    }
    clearTimeout(timeout);

    if (!resposta.ok) {
      resultado.erroDiagnostico = `HTTP ${resposta.status}`;
      return resultado;
    }

    const html = await resposta.text();
    if (!html || html.length === 0) {
      resultado.erroDiagnostico = "HTML vazio";
      return resultado;
    }

    // ====================================================
    // 3. CRIAR DOM E EXTRAIR INDICADORES
    // ====================================================
    const parser = new DOMParser();
    const documento = parser.parseFromString(html, "text/html");

    const blocos = documento.querySelectorAll("div.info");
    console.log(`[${ticker}] Encontrados ${blocos.length} blocos .info`);

    const indicadores = {};
    let contador = 0;

    for (const bloco of blocos) {
      if (contador >= 30) break; // Limite de 30 indicadores

      // Tenta encontrar o título
      const tituloElement = bloco.querySelector(".info-title h3, .info-title, h3");
      if (!tituloElement) continue;

      let titulo = tituloElement.textContent.trim();
      // Remove textos longos e descrições
      if (titulo.includes("\n")) {
        titulo = titulo.split("\n")[0].trim();
      }
      if (titulo.length > 100) {
        titulo = titulo.substring(0, 100) + "...";
      }
      if (!titulo) continue;

      // Tenta encontrar o valor
      const valorElement = bloco.querySelector(".info-value strong.value, .info-value .value, strong.value, .value");
      if (!valorElement) continue;

      let valor = valorElement.textContent.trim();
      if (!valor) continue;

      // Remove descrições longas do valor
      if (valor.includes("\n")) {
        valor = valor.split("\n")[0].trim();
      }
      if (valor.length > 50) {
        valor = valor.substring(0, 50) + "...";
      }

      // Armazena o indicador
      indicadores[titulo] = valor;
      contador++;
      console.log(`[${ticker}]   ${titulo}: ${valor}`);
    }

    resultado.indicadores = indicadores;
    resultado.totalEncontrados = Object.keys(indicadores).length;

    console.log(`[${ticker}] Total de indicadores encontrados: ${resultado.totalEncontrados}`);
    console.log("========================================");

    return resultado;

  } catch (erro) {
    console.error(`[${ticker}] ERRO INESPERADO:`, erro);
    resultado.erroDiagnostico = erro.message || "Erro desconhecido";
    return resultado;
  }
}

export {
    scrapingAcoes
};
