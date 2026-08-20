// ============================================================
// scraping.js
// Consulta StatusInvest através do Cloudflare Worker
// COM LOGS DETALHADOS DE DIAGNÓSTICO
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
    setor: "ERRO",
    subsetor: "ERRO",
    segmento: "ERRO",
    participacaoIndices: "ERRO",
    freeFloat: "ERRO",
    // Diagnóstico
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

    // Verifica se o HTML parece ser válido (contém tags básicas)
    if (!html.includes("<html") && !html.includes("<!DOCTYPE")) {
      console.warn(`[${ticker}] ATENÇÃO: HTML não parece ser uma página válida (sem tags html/doctype)`);
      // Não falha ainda, pois pode ser HTML parcial
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

    // Verifica se o DOM foi criado corretamente
    if (!documento || !documento.documentElement) {
      const erro = "DOM não foi criado corretamente (documentElement vazio)";
      console.error(`[${ticker}] ERRO: ${erro}`);
      resultadoErro.erroDiagnostico = erro;
      resultadoErro.etapaFalha = "dom_vazio";
      return resultadoErro;
    }

    // Verifica se a página parece ser do StatusInvest (título)
    const tituloPagina = documento.querySelector("title")?.textContent || "Título não encontrado";
    console.log(`[${ticker}] Título da página: "${tituloPagina}"`);

    if (!tituloPagina.includes(ticker) && !tituloPagina.includes("StatusInvest")) {
      console.warn(`[${ticker}] ATENÇÃO: Título da página não contém ticker "${ticker}" nem "StatusInvest"`);
      // Não falha ainda, mas fica registrado
    }

    // ====================================================
    // 8. FUNÇÃO DE EXTRAÇÃO PADRÃO (COM LOG)
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
      
      // Se encontrou o título mas não o valor, registra
      if (encontrados > 0) {
        console.warn(`[${ticker}] Título "${titulo}" encontrado ${encontrados} vez(es), mas valor não extraído`);
      }
      
      return null;
    }

    // ====================================================
    // 9. FUNÇÃO ESPECÍFICA PARA DY DAS AÇÕES (COM LOG)
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
    // 9.1 FUNÇÃO PARA PARTICIPAÇÃO EM ÍNDICES (COM LOG)
    // ====================================================

    function obterParticipacaoIndices() {
      console.log(`[${ticker}] Buscando Participação em Índices...`);

      // Método 1: Título padrão
      let resultado = obterValorPorTitulo("PARTICIPAÇÃO EM ÍNDICES");
      if (resultado) {
        console.log(`[${ticker}] Índices encontrados (método 1): "${resultado}"`);
        return resultado;
      }

      // Método 2: Título alternativo
      resultado = obterValorPorTitulo("ÍNDICES");
      if (resultado) {
        console.log(`[${ticker}] Índices encontrados (método 2): "${resultado}"`);
        return resultado;
      }

      // Método 3: Busca em seções específicas
      const secoes = documento.querySelectorAll("div.info");
      console.log(`[${ticker}] Verificando ${secoes.length} seções .info para índices...`);
      
      for (const secao of secoes) {
        const titulo = secao.querySelector("h3, small, span");
        if (titulo) {
          const texto = titulo.textContent.trim().toUpperCase();
          if (texto.includes("ÍNDICES") || texto.includes("PARTICIPAÇÃO")) {
            const valor = secao.querySelector("strong.value");
            if (valor) {
              const textoValor = valor.textContent.trim();
              if (textoValor) {
                console.log(`[${ticker}] Índices encontrados (método 3): "${textoValor}"`);
                return textoValor;
              }
            }
          }
        }
      }

      console.warn(`[${ticker}] Participação em Índices não encontrado em nenhum método`);
      return null;
    }

    // ====================================================
    // 9.2 FUNÇÃO PARA FREE FLOAT (COM LOG)
    // ====================================================

    function obterFreeFloat() {
      console.log(`[${ticker}] Buscando Free Float...`);

      // Método 1: "FREE FLOAT"
      let resultado = obterValorPorTitulo("FREE FLOAT");
      if (resultado) {
        console.log(`[${ticker}] Free Float encontrado (método 1): "${resultado}"`);
        return resultado;
      }

      // Método 2: "FREE-FLOAT"
      resultado = obterValorPorTitulo("FREE-FLOAT");
      if (resultado) {
        console.log(`[${ticker}] Free Float encontrado (método 2): "${resultado}"`);
        return resultado;
      }

      // Método 3: Busca em seções específicas
      const secoes = documento.querySelectorAll("div.info");
      console.log(`[${ticker}] Verificando ${secoes.length} seções .info para Free Float...`);
      
      for (const secao of secoes) {
        const titulo = secao.querySelector("h3, small, span");
        if (titulo) {
          const texto = titulo.textContent.trim().toUpperCase();
          if (texto.includes("FREE FLOAT") || texto.includes("FREE-FLOAT")) {
            const valor = secao.querySelector("strong.value");
            if (valor) {
              const textoValor = valor.textContent.trim();
              if (textoValor) {
                console.log(`[${ticker}] Free Float encontrado (método 3): "${textoValor}"`);
                return textoValor;
              }
            }
          }
        }
      }

      console.warn(`[${ticker}] Free Float não encontrado em nenhum método`);
      return null;
    }

    // ====================================================
    // 10. EXTRAIR OS 5 INDICADORES ATUAIS (COM LOG)
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
    // 10.1 NOVOS INDICADORES COMUNS (COM LOG)
    // ====================================================
    console.log(`[${ticker}] Extraindo indicadores comuns...`);

    const setor = obterValorPorTitulo("SETOR");
    const subsetor = obterValorPorTitulo("SUBSETOR");
    const segmento = obterValorPorTitulo("SEGMENTO");
    const participacaoIndices = obterParticipacaoIndices();
    const freeFloat = obterFreeFloat();

    // ====================================================
    // 11. DIAGNÓSTICO DETALHADO DOS INDICADORES NÃO ENCONTRADOS
    // ====================================================
    const indicadoresNaoEncontrados = [];
    
    if (!valorAtual) indicadoresNaoEncontrados.push("VALOR ATUAL");
    if (!min52) indicadoresNaoEncontrados.push("MIN. 52 SEMANAS");
    if (!max52) indicadoresNaoEncontrados.push("MÁX. 52 SEMANAS");
    if (!dy) indicadoresNaoEncontrados.push("DY");
    if (!valorizacao) indicadoresNaoEncontrados.push("VALORIZAÇÃO (12M)");
    if (!setor) indicadoresNaoEncontrados.push("SETOR");
    if (!subsetor) indicadoresNaoEncontrados.push("SUBSETOR");
    if (!segmento) indicadoresNaoEncontrados.push("SEGMENTO");
    if (!participacaoIndices) indicadoresNaoEncontrados.push("PARTICIPAÇÃO EM ÍNDICES");
    if (!freeFloat) indicadoresNaoEncontrados.push("FREE FLOAT");

    // ====================================================
    // 12. LOG DOS RESULTADOS
    // ====================================================
    console.log(`[${ticker}] ========== RESULTADOS ==========`);
    console.log(`  Valor Atual:           ${valorAtual || "❌ NÃO ENCONTRADO"}`);
    console.log(`  Mín. 52 Semanas:       ${min52 || "❌ NÃO ENCONTRADO"}`);
    console.log(`  Máx. 52 Semanas:       ${max52 || "❌ NÃO ENCONTRADO"}`);
    console.log(`  DY 12M:                ${dy || "❌ NÃO ENCONTRADO"}`);
    console.log(`  Valorização 12M:       ${valorizacao || "❌ NÃO ENCONTRADO"}`);
    console.log(`  Setor:                 ${setor || "❌ NÃO ENCONTRADO"}`);
    console.log(`  Subsetor:              ${subsetor || "❌ NÃO ENCONTRADO"}`);
    console.log(`  Segmento:              ${segmento || "❌ NÃO ENCONTRADO"}`);
    console.log(`  Participação Índices:  ${participacaoIndices || "❌ NÃO ENCONTRADO"}`);
    console.log(`  Free Float:            ${freeFloat || "❌ NÃO ENCONTRADO"}`);

    if (indicadoresNaoEncontrados.length > 0) {
      console.warn(`[${ticker}] ⚠️ INDICADORES NÃO ENCONTRADOS (${indicadoresNaoEncontrados.length}):`);
      for (const indicador of indicadoresNaoEncontrados) {
        console.warn(`  - ${indicador}`);
      }
    } else {
      console.log(`[${ticker}] ✅ TODOS OS INDICADORES ENCONTRADOS!`);
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
    // 14. RETORNAR OBJETO (ATUALIZADO COM DIAGNÓSTICO)
    // ====================================================
    const resultado = {
      ticker: ticker,
      valorAtual: valorAtual || "ERRO",
      min52: min52 || "ERRO",
      max52: max52 || "ERRO",
      dy: dy || "ERRO",
      valorizacao: valorizacao || "ERRO",
      setor: setor || "ERRO",
      subsetor: subsetor || "ERRO",
      segmento: segmento || "ERRO",
      participacaoIndices: participacaoIndices || "ERRO",
      freeFloat: freeFloat || "ERRO",
      // Diagnóstico (não usado pelo atualizar.js, mas útil para debug)
      diagnostico: {
        indicadoresNaoEncontrados: indicadoresNaoEncontrados,
        totalIndicadores: 10,
        encontrados: 10 - indicadoresNaoEncontrados.length
      }
    };

    console.log(`[${ticker}] SCRAPING CONCLUÍDO - ${resultado.diagnostico.encontrados}/10 indicadores encontrados`);
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
