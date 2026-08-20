// ============================================================
// scraping.js
// Consulta StatusInvest através do Cloudflare Worker
// ============================================================

const PROXY_CLOUDFLARE = "https://financasonline.augusto-gouveia2000.workers.dev/";
const TIMEOUT_30_SEGUNDOS = 30000;

// ============================================================
// FUNÇÃO PRINCIPAL
// Recebe:
// ticker = "AXIA3"
// tipo = "acoes"
// ou:
// ticker = "KNCR11"
// tipo = "fii"
// ============================================================

async function buscarIndicadoresStatusInvest(ticker, tipo) {
  const resultadoErro = {
    ticker: ticker,
    valorAtual: "ERRO",
    min52: "ERRO",
    max52: "ERRO",
    dy: "ERRO",
    valorizacao: "ERRO",
    // Novos campos comuns
    setor: "ERRO",
    subsetor: "ERRO",
    segmento: "ERRO",
    participacaoIndices: "ERRO",
    freeFloat: "ERRO"
  };

  console.log("========================================");
  console.log(`INICIANDO SCRAPING: ${ticker} / ${tipo}`);

  try {
    // ====================================================
    // 1. VALIDAR
    // ====================================================
    ticker = String(ticker).trim().toUpperCase();
    tipo = String(tipo).trim().toLowerCase();

    console.log(`[${ticker}] Parâmetros OK`);

    if (!ticker || (tipo !== "acoes" && tipo !== "fii")) {
      console.error(`[${ticker}] Parâmetros inválidos.`);
      return resultadoErro;
    }

    // ====================================================
    // 2. DEFINIR URL DO STATUSINVEST
    // ====================================================
    const categoria = tipo === "fii" ? "fundos-imobiliarios" : "acoes";
    const urlStatusInvest = `https://statusinvest.com.br/` + `${categoria}/` + `${ticker.toLowerCase()}`;

    console.log(`[${ticker}] StatusInvest:`, urlStatusInvest);

    // ====================================================
    // 3. MONTAR URL DO WORKER
    // ====================================================
    const urlWorker = PROXY_CLOUDFLARE + "?url=" + encodeURIComponent(urlStatusInvest);

    console.log(`[${ticker}] Worker:`, urlWorker);

    // ====================================================
    // 4. FETCH COM LIMITE DE 30 SEGUNDOS
    // ====================================================
    console.log(`[${ticker}] Acessando Worker...`);

    const controlador = new AbortController();
    const timeout = setTimeout(() => {
      controlador.abort();
    }, TIMEOUT_30_SEGUNDOS);

    let resposta;

    try {
      resposta = await fetch(urlWorker, {
        method: "GET",
        cache: "no-store",
        signal: controlador.signal
      });
    } catch (erro) {
      clearTimeout(timeout);
      if (erro.name === "AbortError") {
        console.error(`[${ticker}] ERRO: timeout de 30 segundos.`);
      } else {
        console.error(`[${ticker}] ERRO ao acessar Worker.`);
        console.error(erro);
      }
      return resultadoErro;
    }

    clearTimeout(timeout);

    // ====================================================
    // 5. STATUS HTTP
    // ====================================================
    console.log(`[${ticker}] HTTP:`, resposta.status);

    if (!resposta.ok) {
      console.error(`[${ticker}] Worker retornou HTTP ${resposta.status}`);
      return resultadoErro;
    }

    // ====================================================
    // 6. LER HTML
    // ====================================================
    console.log(`[${ticker}] Lendo HTML...`);

    const html = await resposta.text();

    console.log(`[${ticker}] HTML recebido:`, html.length, "caracteres");

    if (!html || html.length === 0) {
      console.error(`[${ticker}] HTML vazio.`);
      return resultadoErro;
    }

    // ====================================================
    // 7. TRANSFORMAR HTML EM DOM
    // ====================================================
    const parser = new DOMParser();
    const documento = parser.parseFromString(html, "text/html");

    console.log(`[${ticker}] DOM criado.`);

    // ====================================================
    // 8. FUNÇÃO DE EXTRAÇÃO PADRÃO
    // Usada para:
    // - Valor Atual
    // - Mín. 52 semanas
    // - Máx. 52 semanas
    // - Valorização 12M
    // - Setor, Subsetor, Segmento
    // - Free Float
    // Também continua sendo usada para DY dos FIIs.
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
    // 9. FUNÇÃO ESPECÍFICA PARA DY DAS AÇÕES - CORRIGIDA
    // No StatusInvest, para ações, o Dividend Yield
    // aparece na seção principal como:
    // Dividend Yield
    // 6,34 %
    // Últimos 12 meses
    // A estrutura HTML dessa seção é diferente da
    // estrutura que encontramos nos FIIs.
    // Por isso as ações possuem uma busca própria.
    // CORREÇÃO: Mantém relação estrutural entre título e valor,
    // não busca qualquer strong.value em ancestral grande.
    // ====================================================

    function obterDY12MAcao() {

    console.log(
        `[${ticker}] Procurando DY 12M específico de ação...`
    );

    // ====================================================
    // Estrutura atual do StatusInvest:
    //
    // <div ...>
    //   <div title="Dividend Yield com base nos últimos 12 meses">
    //       ...
    //       <h3>Dividend Yield</h3>
    //       ...
    //   </div>
    //
    //   <strong class="value">6,33</strong>
    //   <span>%</span>
    // </div>
    //
    // O percentual NÃO está dentro do strong.value.
    // ====================================================

    const elementos =
        documento.querySelectorAll("h3");

    for (const elemento of elementos) {

        const texto =
            elemento.textContent
                .trim()
                .toUpperCase();

        if (texto !== "DIVIDEND YIELD") {
            continue;
        }

        // Procura o bloco principal do indicador.
        const bloco =
            elemento.closest(".info");

        if (!bloco) {
            continue;
        }

        const valor =
            bloco.querySelector("strong.value");

        if (!valor) {
            continue;
        }

        const dyEncontrado =
            valor.textContent.trim();

        if (
            /^\d+[,.]\d+$/.test(
                dyEncontrado
            )
        ) {

            console.log(
                `[${ticker}] DY 12M encontrado:`,
                dyEncontrado
            );

            return dyEncontrado;
        }
    }

    console.error(
        `[${ticker}] DY 12M de ação não encontrado.`
    );

    return null;
}

    // ====================================================
    // 9.1 FUNÇÃO ESPECÍFICA PARA PARTICIPAÇÃO EM ÍNDICES
    // No StatusInvest, os índices aparecem em uma seção
    // específica com múltiplos valores separados por ponto e vírgula.
    // ====================================================

    function obterParticipacaoIndices(documento) {
      console.log(`[${ticker}] Procurando Participação em Índices...`);

      // Primeiro tenta com o método padrão
      let resultado = obterValorPorTitulo("PARTICIPAÇÃO EM ÍNDICES");
      if (resultado) {
        console.log(`[${ticker}] Índices encontrados (método 1):`, resultado);
        return resultado;
      }

      // Tenta buscar por "Índices" ou "Índices de Referência"
      resultado = obterValorPorTitulo("ÍNDICES");
      if (resultado) {
        console.log(`[${ticker}] Índices encontrados (método 2):`, resultado);
        return resultado;
      }

      // Busca em uma seção específica (se existir)
      const secoes = documento.querySelectorAll("div.info");
      for (const secao of secoes) {
        const titulo = secao.querySelector("h3, small, span");
        if (titulo) {
          const texto = titulo.textContent.trim().toUpperCase();
          if (texto.includes("ÍNDICES") || texto.includes("PARTICIPAÇÃO")) {
            const valor = secao.querySelector("strong.value");
            if (valor) {
              const textoValor = valor.textContent.trim();
              if (textoValor) {
                console.log(`[${ticker}] Índices encontrados (método 3):`, textoValor);
                return textoValor;
              }
            }
          }
        }
      }

      console.error(`[${ticker}] Participação em Índices não encontrado.`);
      return null;
    }

    // ====================================================
    // 9.2 FUNÇÃO ESPECÍFICA PARA FREE FLOAT
    // O Free Float pode aparecer como "Free Float" ou "Free-Float"
    // e pode ter o símbolo de percentual.
    // ====================================================

    function obterFreeFloat(documento) {
      console.log(`[${ticker}] Procurando Free Float...`);

      // Tenta com o método padrão
      let resultado = obterValorPorTitulo("FREE FLOAT");
      if (resultado) {
        console.log(`[${ticker}] Free Float encontrado (método 1):`, resultado);
        return resultado;
      }

      // Tenta com "FREE-FLOAT"
      resultado = obterValorPorTitulo("FREE-FLOAT");
      if (resultado) {
        console.log(`[${ticker}] Free Float encontrado (método 2):`, resultado);
        return resultado;
      }

      // Busca em uma seção específica
      const secoes = documento.querySelectorAll("div.info");
      for (const secao of secoes) {
        const titulo = secao.querySelector("h3, small, span");
        if (titulo) {
          const texto = titulo.textContent.trim().toUpperCase();
          if (texto.includes("FREE FLOAT") || texto.includes("FREE-FLOAT")) {
            const valor = secao.querySelector("strong.value");
            if (valor) {
              const textoValor = valor.textContent.trim();
              if (textoValor) {
                console.log(`[${ticker}] Free Float encontrado (método 3):`, textoValor);
                return textoValor;
              }
            }
          }
        }
      }

      console.error(`[${ticker}] Free Float não encontrado.`);
      return null;
    }

    // ====================================================
    // 10. EXTRAIR OS 5 INDICADORES ATUAIS
    // ====================================================
    console.log(`[${ticker}] Extraindo indicadores básicos...`);

    const valorAtual = obterValorPorTitulo("VALOR ATUAL");
    const min52 = obterValorPorTitulo("MIN. 52 SEMANAS");
    const max52 = obterValorPorTitulo("MÁX. 52 SEMANAS");

    // DY com tratamento especial
    let dy;
    if (tipo === "acoes") {
      dy = obterDY12MAcao();
    } else {
      dy = obterValorPorTitulo("DIVIDEND YIELD");
    }

    const valorizacao = obterValorPorTitulo("VALORIZAÇÃO (12M)");

    // ====================================================
    // 10.1 NOVOS INDICADORES COMUNS (adicionados)
    // ====================================================
    console.log(`[${ticker}] Extraindo indicadores comuns...`);

    // Usa a função padrão para Setor, Subsetor e Segmento
    const setor = obterValorPorTitulo("SETOR");
    const subsetor = obterValorPorTitulo("SUBSETOR");
    const segmento = obterValorPorTitulo("SEGMENTO");

    // Usa funções específicas para Índices e Free Float
    const participacaoIndices = obterParticipacaoIndices(documento);
    const freeFloat = obterFreeFloat(documento);

    // ====================================================
    // 11. LOG DOS RESULTADOS
    // ====================================================
    console.log(`[${ticker}] Resultados da extração:`);
    console.log(`  Valor Atual:`, valorAtual);
    console.log(`  Mín. 52 Semanas:`, min52);
    console.log(`  Máx. 52 Semanas:`, max52);
    console.log(`  DY 12M:`, dy);
    console.log(`  Valorização 12M:`, valorizacao);
    console.log(`  Setor:`, setor);
    console.log(`  Subsetor:`, subsetor);
    console.log(`  Segmento:`, segmento);
    console.log(`  Participação em Índices:`, participacaoIndices);
    console.log(`  Free Float:`, freeFloat);

    // ====================================================
    // 12. VALIDAR VALOR PRINCIPAL
    // ====================================================
    if (!valorAtual) {
      console.error(`[${ticker}] Valor Atual não encontrado.`);
      return resultadoErro;
    }

    // ====================================================
    // 13. RETORNAR OBJETO (ATUALIZADO)
    // ====================================================
    const resultado = {
      // Básicos (já existentes)
      ticker: ticker,
      valorAtual: valorAtual || "ERRO",
      min52: min52 || "ERRO",
      max52: max52 || "ERRO",
      dy: dy || "ERRO",
      valorizacao: valorizacao || "ERRO",
      
      // Novos (comuns)
      setor: setor || "ERRO",
      subsetor: subsetor || "ERRO",
      segmento: segmento || "ERRO",
      participacaoIndices: participacaoIndices || "ERRO",
      freeFloat: freeFloat || "ERRO"
    };

    console.log(`[${ticker}] SCRAPING CONCLUÍDO`);
    console.log(resultado);
    console.log("========================================");

    return resultado;
  } catch (erro) {
    console.error(`[${ticker}] ERRO INESPERADO`);
    console.error(erro);
    return resultadoErro;
  }
}

export {
    buscarIndicadoresStatusInvest
};
