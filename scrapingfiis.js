// ============================================================
// scrapingfiis.js
// Extrai indicadores fundamentalistas específicos para FIIs
// ============================================================

const PROXY_CLOUDFLARE = "https://financasonline.augusto-gouveia2000.workers.dev/";
const TIMEOUT_30_SEGUNDOS = 30000;

// ============================================================
// FUNÇÃO PRINCIPAL
// Recebe apenas ticker de FII (ex: "HCTR11", "VSLH11")
// ============================================================

async function scrapingFIIs(ticker) {
  // Estrutura de erro com diagnóstico
  const resultadoErro = {
    ticker: ticker,
    // 10 indicadores exclusivos de FIIs
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
    // Diagnóstico
    erroDiagnostico: "Sem diagnóstico",
    etapaFalha: "desconhecida"
  };

  console.log("========================================");
  console.log(`INICIANDO SCRAPING FIIs: ${ticker}`);
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
    // 2. DEFINIR URL DO STATUSINVEST (FIIs)
    // ====================================================
    const urlStatusInvest = `https://statusinvest.com.br/fundos-imobiliarios/${ticker.toLowerCase()}`;
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
    // 9. FUNÇÃO ESPECÍFICA PARA EXTRAIR INDICADORES DE FIIs
    // Usa a seção #indicators para maior precisão
    // ====================================================

   function obterValorFII(titulo, titulosAlternativos = []) {
    console.log(`[${ticker}] Buscando "${titulo}" para FII...`);

    // Seção principal de indicadores
    const secaoIndicators = documento.getElementById("indicators");
    if (!secaoIndicators) {
        console.warn(`[${ticker}] Seção #indicators não encontrada.`);
        return null;
    }

    // Lista de títulos a procurar (principal + alternativos)
    const titulosBusca = [titulo, ...titulosAlternativos];

    // Procura em todos os blocos .info dentro da seção
    const blocos = secaoIndicators.querySelectorAll("div.info");
    for (const bloco of blocos) {
        // Tenta encontrar o título no bloco
        const tituloElement = bloco.querySelector("h3, .info-title h3, .title");
        if (!tituloElement) continue;

        const textoEncontrado = tituloElement.textContent.trim();
        // Verifica se o texto do título corresponde a algum dos títulos buscados
        for (const busca of titulosBusca) {
            if (textoEncontrado.toUpperCase().includes(busca.toUpperCase())) {
                // Encontrou o título, agora busca o valor
                const valorElement = bloco.querySelector("strong.value, .value");
                if (valorElement) {
                    const valor = valorElement.textContent.trim();
                    if (valor) {
                        console.log(`[${ticker}] "${busca}" encontrado: ${valor}`);
                        return valor;
                    }
                }
                // Se não achou strong.value, tenta o próximo elemento que pode ter o valor
                const valorFallback = bloco.querySelector(".info-value, .info-value span");
                if (valorFallback) {
                    const valor = valorFallback.textContent.trim();
                    if (valor) {
                        console.log(`[${ticker}] "${busca}" encontrado (fallback): ${valor}`);
                        return valor;
                    }
                }
                console.warn(`[${ticker}] Título "${busca}" encontrado, mas valor não extraído.`);
                break;
            }
        }
    }

    console.warn(`[${ticker}] "${titulo}" não encontrado para FII.`);
    return null;
}

    // ====================================================
    // 10. EXTRAIR TODOS OS 10 INDICADORES
    // ====================================================
    console.log(`[${ticker}] Extraindo 10 indicadores de FIIs...`);

    // Mapeamento dos indicadores com seus títulos exatos no HTML
    const capRate = obterValorFII("Cap Rate");
    const rendimentoMensal = obterValorFII("Último Rendimento");
    const rendimento12M = obterValorFII("Rendimento 12M");
    const vacanciaMedia = obterValorFII("Vacância Média");
    const vacanciaFisica = obterValorFII("Vacância Física");
    const vacanciaFinanceira = obterValorFII("Vacância Financeira");
    const qtdImoveis = obterValorFII("Quantidade de Imóveis");
    const alavancagem = obterValorFII("Alavancagem") || obterValorFII("Endividamento");
    const prazoContratos = obterValorFII("Prazo Médio dos Contratos") || obterValorFII("Prazo Médio");
    const rentabilidadeImobiliaria = obterValorFII("Rentabilidade Imobiliária") || obterValorFII("Rent. Imobiliária");

    // ====================================================
    // 11. DIAGNÓSTICO
    // ====================================================
    const indicadores = [
      { nome: "CapRate", valor: capRate },
      { nome: "RendimentoMensal", valor: rendimentoMensal },
      { nome: "Rendimento12M", valor: rendimento12M },
      { nome: "VacanciaMedia", valor: vacanciaMedia },
      { nome: "VacanciaFisica", valor: vacanciaFisica },
      { nome: "VacanciaFinanceira", valor: vacanciaFinanceira },
      { nome: "QtdImoveis", valor: qtdImoveis },
      { nome: "Alavancagem", valor: alavancagem },
      { nome: "PrazoContratos", valor: prazoContratos },
      { nome: "RentabilidadeImobiliaria", valor: rentabilidadeImobiliaria }
    ];

    const naoEncontrados = indicadores
      .filter(i => !i.valor)
      .map(i => i.nome);

    // ====================================================
    // 12. LOG DOS RESULTADOS
    // ====================================================
    console.log(`[${ticker}] ========== RESULTADOS FIIs ==========`);
    for (const i of indicadores) {
      console.log(`  ${i.nome.padEnd(22)}: ${i.valor || "❌ NÃO ENCONTRADO"}`);
    }

    if (naoEncontrados.length > 0) {
      console.warn(`[${ticker}] ⚠️ INDICADORES NÃO ENCONTRADOS (${naoEncontrados.length}):`);
      for (const nome of naoEncontrados) {
        console.warn(`  - ${nome}`);
      }
    } else {
      console.log(`[${ticker}] ✅ TODOS OS 10 INDICADORES ENCONTRADOS!`);
    }

    // ====================================================
    // 13. VALIDAR VALOR PRINCIPAL (CapRate)
    // ====================================================
    if (!capRate) {
      const erro = "CapRate não encontrado - scraping falhou";
      console.error(`[${ticker}] ERRO: ${erro}`);
      resultadoErro.erroDiagnostico = erro;
      resultadoErro.etapaFalha = "caprate_nao_encontrado";
      return resultadoErro;
    }

    // ====================================================
    // 14. RETORNAR OBJETO
    // ====================================================
    const resultado = {
      ticker: ticker,
      capRate: capRate || "ERRO",
      rendimentoMensal: rendimentoMensal || "ERRO",
      rendimento12M: rendimento12M || "ERRO",
      vacanciaMedia: vacanciaMedia || "ERRO",
      vacanciaFisica: vacanciaFisica || "ERRO",
      vacanciaFinanceira: vacanciaFinanceira || "ERRO",
      qtdImoveis: qtdImoveis || "ERRO",
      alavancagem: alavancagem || "ERRO",
      prazoContratos: prazoContratos || "ERRO",
      rentabilidadeImobiliaria: rentabilidadeImobiliaria || "ERRO",
      // Diagnóstico
      diagnostico: {
        indicadoresNaoEncontrados: naoEncontrados,
        totalIndicadores: 10,
        encontrados: 10 - naoEncontrados.length
      }
    };

    console.log(`[${ticker}] SCRAPING FIIs CONCLUÍDO - ${resultado.diagnostico.encontrados}/10 encontrados`);
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
