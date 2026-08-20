// ============================================================
// scrapingfiis.js
// Extrai indicadores fundamentalistas específicos para FIIs
// COM RELATÓRIO DE ERRO DETALHADO
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
    // Relatório detalhado de extração
    relatorioExtracao: {}
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
    // 8. FUNÇÃO DE EXTRAÇÃO COM RELATÓRIO
    // ====================================================

    function obterValorFII(titulo, titulosAlternativos = []) {
    // Relatório detalhado da extração
    const relatorio = {
        tituloBuscado: titulo,
        titulosAlternativos: titulosAlternativos,
        timestamp: new Date().toISOString(),
        etapas: [],
        sucesso: false,
        valorEncontrado: null,
        erro: null
    };

    function adicionarEtapa(nome, dados) {
        relatorio.etapas.push({
            etapa: nome,
            ...dados,
            timestamp: new Date().toISOString()
        });
    }

    console.log(`[${ticker}] ========================================`);
    console.log(`[${ticker}] 🔍 Buscando "${titulo}" para FII...`);
    adicionarEtapa("Início", { mensagem: `Buscando "${titulo}"` });

    try {
        // Lista de títulos a procurar (principal + alternativos)
        const titulosBusca = [titulo, ...titulosAlternativos].map(t => t.toUpperCase());
        adicionarEtapa("Títulos para busca", { titulos: titulosBusca });

        // Verifica se o documento está disponível
        if (!documento || !documento.documentElement) {
            const erro = "DOM não está disponível";
            relatorio.erro = erro;
            adicionarEtapa("Erro", { mensagem: erro });
            console.error(`[${ticker}] ❌ ${erro}`);
            return null;
        }
        adicionarEtapa("DOM disponível", { status: "OK" });

        // 1. Busca TODOS os blocos .info em toda a página
        const blocos = documento.querySelectorAll("div.info");
        adicionarEtapa("Blocos .info encontrados", { quantidade: blocos.length });

        if (blocos.length === 0) {
            // Tenta buscar outras possíveis classes
            const outrasClasses = documento.querySelectorAll(".info, .info-item, .indicator-item, .fundamental-item");
            adicionarEtapa("Blocos com outras classes", { 
                quantidade: outrasClasses.length,
                classes: ["info", "info-item", "indicator-item", "fundamental-item"]
            });

            if (outrasClasses.length === 0) {
                const erro = "Nenhum bloco de indicador encontrado na página";
                relatorio.erro = erro;
                adicionarEtapa("Erro", { mensagem: erro });
                console.error(`[${ticker}] ❌ ${erro}`);
                return null;
            }
            // Usar os blocos encontrados com outras classes
            blocos = outrasClasses;
            adicionarEtapa("Usando blocos com outras classes", { quantidade: blocos.length });
        }

        // 2. Percorrer todos os blocos
        let blocosPercorridos = 0;
        let titulosEncontrados = [];
        let valoresEncontrados = [];

        for (const bloco of blocos) {
            blocosPercorridos++;
            
            // Tenta encontrar o título no bloco usando diferentes seletores
            const seletoresTitulo = [
                ".info-title h3",
                ".info-title",
                "h3",
                ".title",
                ".label",
                ".indicator-name"
            ];
            
            let tituloElement = null;
            let seletorUsado = null;
            
            for (const seletor of seletoresTitulo) {
                const el = bloco.querySelector(seletor);
                if (el && el.textContent.trim()) {
                    tituloElement = el;
                    seletorUsado = seletor;
                    break;
                }
            }

            if (!tituloElement) {
                continue;
            }

            const textoEncontrado = tituloElement.textContent.trim().toUpperCase();
            titulosEncontrados.push(textoEncontrado);

            // Verifica se o texto do título corresponde a algum dos títulos buscados
            let correspondeu = false;
            for (const busca of titulosBusca) {
                if (textoEncontrado.includes(busca)) {
                    correspondeu = true;
                    adicionarEtapa("Título correspondente", {
                        busca: busca,
                        textoEncontrado: textoEncontrado,
                        seletor: seletorUsado
                    });

                    // Busca o valor usando diferentes seletores
                    const seletoresValor = [
                        ".info-value strong.value",
                        ".info-value .value",
                        "strong.value",
                        ".value",
                        ".info-value",
                        ".value-container"
                    ];

                    let valorElement = null;
                    let seletorValorUsado = null;

                    for (const seletor of seletoresValor) {
                        const el = bloco.querySelector(seletor);
                        if (el && el.textContent.trim()) {
                            valorElement = el;
                            seletorValorUsado = seletor;
                            break;
                        }
                    }

                    if (valorElement) {
                        const valor = valorElement.textContent.trim();
                        if (valor) {
                            relatorio.sucesso = true;
                            relatorio.valorEncontrado = valor;
                            adicionarEtapa("Valor encontrado", {
                                valor: valor,
                                seletor: seletorValorUsado,
                                textoCompleto: valorElement.textContent.trim()
                            });
                            console.log(`[${ticker}] ✅ "${busca}" encontrado: "${valor}"`);
                            return valor;
                        } else {
                            adicionarEtapa("Valor vazio", {
                                seletor: seletorValorUsado,
                                texto: valorElement.textContent
                            });
                        }
                    } else {
                        adicionarEtapa("Valor não encontrado", {
                            seletoresTentados: seletoresValor,
                            htmlDoBloco: bloco.innerHTML.substring(0, 200) + "..."
                        });
                    }
                    break;
                }
            }
        }

        // Se chegou aqui, não encontrou
        adicionarEtapa("Resultado final", {
            sucesso: false,
            blocosPercorridos: blocosPercorridos,
            titulosEncontrados: titulosEncontrados.slice(0, 10), // limitar para não poluir
            totalTitulosEncontrados: titulosEncontrados.length
        });

        console.warn(`[${ticker}] ❌ "${titulo}" não encontrado para FII.`);
        console.warn(`[${ticker}] 📋 Relatório:`, JSON.stringify(relatorio, null, 2));
        
        return null;

    } catch (erro) {
        relatorio.erro = erro.message || erro.toString();
        relatorio.sucesso = false;
        adicionarEtapa("Exceção", {
            mensagem: erro.message || erro.toString(),
            stack: erro.stack
        });
        console.error(`[${ticker}] ❌ Erro ao buscar "${titulo}":`, erro);
        console.error(`[${ticker}] 📋 Relatório de erro:`, JSON.stringify(relatorio, null, 2));
        return null;
    }
}

    // ====================================================
    // 9. EXTRAIR TODOS OS 10 INDICADORES
    // ====================================================
    console.log(`[${ticker}] Extraindo 10 indicadores de FIIs...`);

    // Mapeamento dos indicadores com seus títulos exatos no HTML
    const capRate = obterValorFII("Cap Rate", ["Cap. Rate"]);
    const rendimentoMensal = obterValorFII("Último Rendimento");
    const rendimento12M = obterValorFII("Rendimento 12M", ["Rendimento Últimos 12 Meses"]);
    const vacanciaMedia = obterValorFII("Vacância Média");
    const vacanciaFisica = obterValorFII("Vacância Física");
    const vacanciaFinanceira = obterValorFII("Vacância Financeira");
    const qtdImoveis = obterValorFII("Quantidade de Imóveis", ["Nº de Imóveis"]);
    const alavancagem = obterValorFII("Alavancagem", ["Endividamento"]);
    const prazoContratos = obterValorFII("Prazo Médio dos Contratos", ["Prazo Médio"]);
    const rentabilidadeImobiliaria = obterValorFII("Rentabilidade Imobiliária", ["Rent. Imobiliária"]);

    // ====================================================
    // 10. DIAGNÓSTICO
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
    // 11. LOG DOS RESULTADOS
    // ====================================================
    console.log(`[${ticker}] ========== RESULTADOS FIIs ==========`);
    for (const i of indicadores) {
      console.log(`  ${i.nome.padEnd(22)}: ${i.valor || "❌ NÃO ENCONTRADO"}`);
    }

    if (naoEncontrados.length > 0) {
      console.warn(`[${ticker}] ⚠️ INDICADORES NÃO ENCONTRADOS (${naoEncontrados.length}):`);
      for (const nome of naoEncontrados) {
        console.warn(`  - ${nome}`);
        // Mostra o relatório detalhado para o indicador não encontrado
        const relatorio = resultadoErro.relatorioExtracao[nome];
        if (relatorio) {
          console.warn(`    Relatório:`, relatorio);
        }
      }
    } else {
      console.log(`[${ticker}] ✅ TODOS OS 10 INDICADORES ENCONTRADOS!`);
    }

    // ====================================================
    // 12. VALIDAR VALOR PRINCIPAL (CapRate)
    // ====================================================
    if (!capRate) {
      const erro = "CapRate não encontrado - scraping falhou";
      console.error(`[${ticker}] ERRO: ${erro}`);
      resultadoErro.erroDiagnostico = erro;
      resultadoErro.etapaFalha = "caprate_nao_encontrado";
      // Adiciona o relatório completo no erro
      resultadoErro.relatorioCompleto = resultadoErro.relatorioExtracao;
      return resultadoErro;
    }

    // ====================================================
    // 13. RETORNAR OBJETO
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
      },
      // Relatório detalhado
      relatorioExtracao: resultadoErro.relatorioExtracao
    };

    console.log(`[${ticker}] SCRAPING FIIs CONCLUÍDO - ${resultado.diagnostico.encontrados}/10 encontrados`);
    console.log(`[${ticker}] Relatório de extração:`, resultado.relatorioExtracao);
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
