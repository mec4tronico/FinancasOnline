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
    valorizacao: "ERRO"
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
      console.log(`[${ticker}] Procurando DY 12M específico de ação...`);

      // ESTRATÉGIA CORRIGIDA: Buscar container pequeno que contém DY e seu valor,
      // garantindo que não estamos pegando Valorização por engano.

      const candidatosTitulo = documento.querySelectorAll("h1, h2, h3, h4, h5, div, span, small, p, label");

      for (const elemento of candidatosTitulo) {
        const texto = elemento.textContent.trim().toUpperCase();
        if (texto !== "DIVIDEND YIELD") {
          continue;
        }

        // Sobe apenas 3 níveis (não 8) para evitar pegar container gigante com Valorização
        let pai = elemento.parentElement;
        let tentativas = 0;

        while (pai && tentativas < 3) {
          const textoPaiUpper = pai.textContent.toUpperCase();
          const temValorizacaoNoPai = textoPaiUpper.includes("VALORIZAÇÃO");

          // Se o pai contém Valorização, ele é grande demais - só aceita se tiver estrutura que separa DY e Valorização
          // No HTML real da PETR4:
          // Dividend Yield
          // 6,34 %
          // Últimos 12 meses
          // e separadamente:
          // Valorização (12m)
          // 44,60%
          // Esses dois NÃO podem estar no mesmo pai pequeno.

          const valoresNoPai = pai.querySelectorAll("strong.value");

          // CASO 1: Pai pequeno com apenas 1 valor e sem Valorização -> é o DY
          if (valoresNoPai.length === 1 && !temValorizacaoNoPai) {
            const textoValor = valoresNoPai[0].textContent.trim();
            if (/\d+[,.]\d+\s*%/.test(textoValor)) {
              console.log(`[${ticker}] DY 12M encontrado via container específico:`, textoValor);
              return textoValor.replace("%", "").trim();
            }
          }

          // CASO 2: Pai com múltiplos valores mas contém DY e Valorização juntos
          // Precisa garantir que pegamos o valor que pertence ao DY, não à Valorização
          if (valoresNoPai.length >= 1) {
            // Pega o texto do pai para verificar proximidade
            const posDY = textoPaiUpper.indexOf("DIVIDEND YIELD");
            const posValorizacao = textoPaiUpper.indexOf("VALORIZAÇÃO");

            for (const valorEl of valoresNoPai) {
              const textoValor = valorEl.textContent.trim();
              if (!/\d+[,.]\d+\s*%/.test(textoValor)) continue;

              const posValor = textoPaiUpper.indexOf(textoValor.toUpperCase().replace("%", "").trim());

              // Se tem Valorização no pai, o DY deve vir antes e o valor deve estar entre DY e Valorização, com distância curta
              if (posValorizacao !== -1) {
                if (posDY !== -1 && posValor !== -1 && posDY < posValor && posValor < posValorizacao) {
                  // Distância entre DY e seu valor deve ser pequena (<150 chars) - evita pegar Valorização distante
                  if ((posValor - posDY) < 150) {
                    console.log(`[${ticker}] DY 12M encontrado via container com Valorização próxima:`, textoValor);
                    return textoValor.replace("%", "").trim();
                  }
                }
              } else {
                // Sem Valorização no pai, valor deve estar próximo ao título DY (<100 chars)
                if (posDY !== -1 && posValor !== -1 && posValor > posDY && (posValor - posDY) < 100) {
                  console.log(`[${ticker}] DY 12M encontrado via container específico:`, textoValor);
                  return textoValor.replace("%", "").trim();
                }
              }
            }
          }

          pai = pai.parentElement;
          tentativas++;
        }
      }

      // SEGUNDA TENTATIVA CORRIGIDA: Busca em divs pequenos, não em elementos gigantes
      // Evita regex com 500 chars que pegava Valorização por engano
      const divs = documento.querySelectorAll("div");
      for (const div of divs) {
        const textoDiv = div.textContent;
        if (!/Dividend\s+Yield/i.test(textoDiv)) continue;
        // Se div é muito grande e contém Valorização, pula - é container gigante
        if (/Valorização/i.test(textoDiv) && textoDiv.length > 400) continue;

        // Procura porcentagem dentro do mesmo div pequeno (até 100 chars após DY)
        const match = textoDiv.match(/Dividend\s+Yield[\s\S]{0,100}?(\d+[,.]\d+)\s*%/i);
        if (match) {
          // Garante que não é Valorização: verifica se antes da porcentagem não tem "Valorização"
          const trechoAntes = textoDiv.substring(0, textoDiv.indexOf(match[0]) + 20).toUpperCase();
          if (!trechoAntes.includes("VALORIZAÇÃO")) {
            console.log(`[${ticker}] DY 12M encontrado por texto no mesmo card:`, match[1]);
            return match[1].trim();
          }
        }
      }

      console.error(`[${ticker}] DY 12M de ação não encontrado.`);
      return null;
    }

    // ====================================================
    // 10. EXTRAIR OS CINCO DADOS
    // ====================================================
    console.log(`[${ticker}] Extraindo indicadores...`);

    const valorAtual = obterValorPorTitulo("VALOR ATUAL");
    const min52 = obterValorPorTitulo("MIN. 52 SEMANAS");
    const max52 = obterValorPorTitulo("MÁX. 52 SEMANAS");

    // ----------------------------------------------------
    // DY
    // AÇÕES: usar busca específica do Dividend Yield 12M.
    // FII: manter a lógica anterior.
    // ----------------------------------------------------
    let dy;
    if (tipo === "acoes") {
      dy = obterDY12MAcao();
    } else {
      dy = obterValorPorTitulo("DIVIDEND YIELD");
    }

    const valorizacao = obterValorPorTitulo("VALORIZAÇÃO (12M)");

    // ====================================================
    // 11. LOG DOS RESULTADOS
    // ====================================================
    console.log(`[${ticker}] Valor Atual:`, valorAtual);
    console.log(`[${ticker}] Mín. 52 Semanas:`, min52);
    console.log(`[${ticker}] Máx. 52 Semanas:`, max52);
    console.log(`[${ticker}] DY 12M:`, dy);
    console.log(`[${ticker}] Valorização 12M:`, valorizacao);

    // ====================================================
    // 12. VALIDAR VALOR PRINCIPAL
    // ====================================================
    if (!valorAtual) {
      console.error(`[${ticker}] Valor Atual não encontrado.`);
      return resultadoErro;
    }

    // ====================================================
    // 13. RETORNAR OBJETO
    // ====================================================
    const resultado = {
      ticker: ticker,
      valorAtual: valorAtual || "ERRO",
      min52: min52 || "ERRO",
      max52: max52 || "ERRO",
      dy: dy || "ERRO",
      valorizacao: valorizacao || "ERRO"
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
