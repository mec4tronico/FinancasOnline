// ============================================================
// ABA RENTABILIDADE
// ============================================================
//
// Responsabilidades:
// 1. Obter os dados já lidos do patrimonio_consolidado.csv
//    (reaproveitando carregarPatrimonio() de aba_patrimonio.js)
// 2. Montar (uma única vez) a estrutura visual da aba dentro
//    de <section id="tab-rentabilidade">
// 3. Desenhar/atualizar 4 visualizações de desempenho:
//    3.1 Valorização (barras)
//    3.2 Dividend Yield (barras)
//    3.3 Faixa de 52 semanas (mín/máx + preço atual)
//    3.4 Heatmap de desempenho (grade colorida)
//
// NÃO faz:
// - leitura ou conversão do CSV
// - scraping
// - cálculo de indicadores
// - gravação de dados
//
// Chart.js já é carregado globalmente pelo index.html
// (<script src=".../chart.umd.min.js">), então é usado aqui
// como window.Chart, sem import de módulo.
// ============================================================


import {
  carregarPatrimonio
} from "./aba_patrimonio.js";


// ============================================================
// CONFIGURAÇÃO
// ============================================================

const ID_SECAO = "tab-rentabilidade";

// Limite (em %) usado para calibrar a intensidade das cores do heatmap
const LIMITE_HEATMAP = 20;


// ============================================================
// ESTADO DOS GRÁFICOS (para destruir antes de recriar)
// ============================================================

let graficoValorizacao = null;
let graficoDY = null;
let graficoFaixa52 = null;


// ============================================================
// UTILITÁRIO: TEXTO DO CSV → NÚMERO
// (mesma lógica usada em aba_patrimonio.js, mantida aqui de
// forma independente para não criar acoplamento entre módulos)
// ============================================================

function converterParaNumero(valorTexto) {

  if (valorTexto === undefined || valorTexto === null) {
    return NaN;
  }

  let texto = String(valorTexto).trim();

  if (texto === "") {
    return NaN;
  }

  texto = texto
    .replace(/^R\$\s?/, "")
    .replace(/%$/, "")
    .trim();

  if (/,\d{1,3}$/.test(texto) && texto.includes(".")) {
    texto = texto.replace(/\./g, "").replace(",", ".");
  } else if (/,\d{1,3}$/.test(texto)) {
    texto = texto.replace(",", ".");
  }

  return parseFloat(texto);
}


function formatarPercentual(valor, comSinal = false) {

  if (isNaN(valor)) {
    return "-";
  }

  const sinal = comSinal && valor > 0 ? "+" : "";

  const formatado = valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return `${sinal}${formatado}%`;
}


// ============================================================
// ESTILOS (injetados uma única vez)
// ============================================================

let estilosInjetados = false;

function injetarEstilos() {

  if (estilosInjetados) {
    return;
  }

  const estilo = document.createElement("style");

  estilo.id = "fr-estilos-rentabilidade";

  estilo.textContent = `
    #tab-rentabilidade .charts-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 20px;
    }

    #tab-rentabilidade .chart-card-wide {
      grid-column: 1 / -1;
    }

    #tab-rentabilidade .chart-area {
      position: relative;
      height: 320px;
    }

    .fr-heatmap-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
      gap: 10px;
    }

    .fr-heatmap-celula {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 14px 8px;
      border-radius: 10px;
      font-family: "Inter", "Segoe UI", Roboto, Arial, sans-serif;
      box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.05);
    }

    .fr-heatmap-ativo {
      font-weight: 700;
      font-size: 13.5px;
      color: #1f2933;
    }

    .fr-heatmap-valor {
      font-size: 13px;
      font-weight: 600;
      color: #1f2933;
    }
  `;

  document.head.appendChild(estilo);

  estilosInjetados = true;
}


// ============================================================
// ESTRUTURA VISUAL DA ABA (montada uma única vez)
// ============================================================

function garantirEstruturaSecao() {

  const secao =
    document.getElementById(ID_SECAO);

  if (!secao) {

    console.error(
      `Elemento <section id="${ID_SECAO}"> não encontrado.`
    );

    return null;
  }

  if (secao.dataset.montado === "true") {
    return secao;
  }

  secao.innerHTML = `
    <div class="page-heading">
      <div>
        <span class="eyebrow"><i class="fa-solid fa-arrow-trend-up"></i> Desempenho</span>
        <h1>Rentabilidade</h1>
        <p>Como cada ativo tem performado dentro da sua carteira.</p>
      </div>
    </div>

    <div class="charts-grid">

      <article class="chart-card">
        <div class="chart-heading">
          <h2><i class="fa-solid fa-chart-column"></i> Valorização</h2>
          <p>Valorização percentual de cada ativo.</p>
        </div>
        <div class="chart-area">
          <canvas id="graficoValorizacao"></canvas>
        </div>
      </article>

      <article class="chart-card">
        <div class="chart-heading">
          <h2><i class="fa-solid fa-coins"></i> Dividend Yield</h2>
          <p>Comparativo de DY entre os ativos.</p>
        </div>
        <div class="chart-area">
          <canvas id="graficoDY"></canvas>
        </div>
      </article>

      <article class="chart-card chart-card-wide">
        <div class="chart-heading">
          <h2><i class="fa-solid fa-arrows-left-right"></i> Faixa de 52 semanas</h2>
          <p>Posição do preço atual entre a mínima e a máxima de 52 semanas.</p>
        </div>
        <div class="chart-area">
          <canvas id="graficoFaixa52"></canvas>
        </div>
      </article>

      <article class="chart-card chart-card-wide">
        <div class="chart-heading">
          <h2><i class="fa-solid fa-table-cells"></i> Heatmap de desempenho</h2>
          <p>Visão rápida de ganhos e perdas (rentabilidade) por ativo.</p>
        </div>
        <div id="heatmapDesempenho" class="fr-heatmap-grid"></div>
      </article>

    </div>
  `;

  secao.dataset.montado = "true";

  injetarEstilos();

  return secao;
}


// ============================================================
// 3.1 — VALORIZAÇÃO (BARRAS)
// ============================================================

function renderizarValorizacao(patrimonio) {

  const canvas =
    document.getElementById("graficoValorizacao");

  if (!canvas) {
    return;
  }

  const rotulos =
    patrimonio.map(registro => registro.Ativo);

  const valores =
    patrimonio.map(registro =>
      converterParaNumero(registro.Valorizacao)
    );

  const cores =
    valores.map(valor => {
      if (isNaN(valor) || valor === 0) return "#9aa5b1";
      return valor > 0 ? "#1b8a4c" : "#c62828";
    });

  if (graficoValorizacao) {
    graficoValorizacao.destroy();
  }

  graficoValorizacao = new window.Chart(canvas, {
    type: "bar",
    data: {
      labels: rotulos,
      datasets: [{
        label: "Valorização",
        data: valores,
        backgroundColor: cores,
        borderRadius: 4,
        maxBarThickness: 34
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: contexto =>
              ` Valorização: ${formatarPercentual(contexto.parsed.y, true)}`
          }
        }
      },
      scales: {
        x: {
          ticks: { autoSkip: false }
        },
        y: {
          ticks: {
            callback: valor => `${valor}%`
          }
        }
      }
    }
  });
}


// ============================================================
// 3.2 — DIVIDEND YIELD (BARRAS)
// ============================================================

function renderizarDY(patrimonio) {

  const canvas =
    document.getElementById("graficoDY");

  if (!canvas) {
    return;
  }

  const rotulos =
    patrimonio.map(registro => registro.Ativo);

  const valores =
    patrimonio.map(registro =>
      converterParaNumero(registro.DY)
    );

  if (graficoDY) {
    graficoDY.destroy();
  }

  graficoDY = new window.Chart(canvas, {
    type: "bar",
    data: {
      labels: rotulos,
      datasets: [{
        label: "Dividend Yield",
        data: valores,
        backgroundColor: "#c9a227",
        borderRadius: 4,
        maxBarThickness: 34
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: contexto =>
              ` DY: ${formatarPercentual(contexto.parsed.y)}`
          }
        }
      },
      scales: {
        x: {
          ticks: { autoSkip: false }
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: valor => `${valor}%`
          }
        }
      }
    }
  });
}


// ============================================================
// 3.3 — FAIXA DE 52 SEMANAS
// ============================================================
//
// Barra flutuante [Min52, Max52] na horizontal, com um ponto
// marcando o ValorAtual dentro dessa faixa.
// ============================================================

function renderizarFaixa52(patrimonio) {

  const canvas =
    document.getElementById("graficoFaixa52");

  if (!canvas) {
    return;
  }

  const rotulos =
    patrimonio.map(registro => registro.Ativo);

  const faixas =
    patrimonio.map(registro => {

      const minimo = converterParaNumero(registro.Min52);
      const maximo = converterParaNumero(registro.Max52);

      if (isNaN(minimo) || isNaN(maximo)) {
        return [0, 0];
      }

      return [minimo, maximo];
    });

  const precosAtuais =
    patrimonio.map(registro =>
      converterParaNumero(registro.ValorAtual)
    );

  if (graficoFaixa52) {
    graficoFaixa52.destroy();
  }

  graficoFaixa52 = new window.Chart(canvas, {
    data: {
      labels: rotulos,
      datasets: [
        {
          type: "bar",
          label: "Faixa 52 semanas",
          data: faixas,
          backgroundColor: "#cfe3ff",
          borderRadius: 6,
          maxBarThickness: 18
        },
        {
          type: "line",
          label: "Preço atual",
          data: precosAtuais,
          showLine: false,
          pointStyle: "circle",
          pointRadius: 6,
          pointBackgroundColor: "#1f2933",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 1.5
        }
      ]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: { boxWidth: 12 }
        },
        tooltip: {
          callbacks: {
            label: contexto => {

              if (contexto.dataset.type === "line") {
                return ` Preço atual: R$ ${contexto.parsed.x.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              }

              const [minimo, maximo] = contexto.raw;

              const formatarMoedaSimples = valor =>
                valor.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                });

              return ` Faixa: R$ ${formatarMoedaSimples(minimo)} — R$ ${formatarMoedaSimples(maximo)}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            callback: valor => `R$ ${valor}`
          }
        }
      }
    }
  });
}


// ============================================================
// 3.4 — HEATMAP DE DESEMPENHO
// ============================================================
//
// Grade colorida (sem dependência de plugin de heatmap):
// cada célula representa um ativo, colorida conforme a
// Rentabilidade (verde = ganho, vermelho = perda).
// ============================================================

function corHeatmap(valor) {

  if (isNaN(valor) || valor === 0) {
    return "#e9ecef";
  }

  const intensidade =
    Math.min(Math.abs(valor), LIMITE_HEATMAP) / LIMITE_HEATMAP;

  const luminosidade =
    88 - intensidade * 43;

  const matiz =
    valor > 0 ? 142 : 4;

  return `hsl(${matiz}, 65%, ${luminosidade}%)`;
}


function renderizarHeatmap(patrimonio) {

  const container =
    document.getElementById("heatmapDesempenho");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  for (const registro of patrimonio) {

    const valor =
      converterParaNumero(registro.Rentabilidade);

    const celula =
      document.createElement("div");

    celula.className = "fr-heatmap-celula";

    celula.style.backgroundColor =
      corHeatmap(valor);

    const spanAtivo =
      document.createElement("span");

    spanAtivo.className = "fr-heatmap-ativo";
    spanAtivo.textContent = registro.Ativo;

    const spanValor =
      document.createElement("span");

    spanValor.className = "fr-heatmap-valor";
    spanValor.textContent = formatarPercentual(valor, true);

    celula.appendChild(spanAtivo);
    celula.appendChild(spanValor);

    container.appendChild(celula);
  }
}


// ============================================================
// ATUALIZAÇÃO DA ABA
// ============================================================
//
// Função chamada pelo app.js (import dinâmico) toda vez que
// a aba "Rentabilidade" é aberta.
// ============================================================

async function atualizarAbaRentabilidade() {

  const secao =
    garantirEstruturaSecao();

  if (!secao) {
    return;
  }

  if (typeof window.Chart === "undefined") {

    console.error(
      "Chart.js não está disponível (verifique o <script> no index.html)."
    );

    return;
  }

  let patrimonio;

  try {

    patrimonio =
      await carregarPatrimonio();

  } catch (erro) {

    console.error(
      "Erro ao carregar dados para a aba Rentabilidade:",
      erro
    );

    return;
  }

  renderizarValorizacao(patrimonio);
  renderizarDY(patrimonio);
  renderizarFaixa52(patrimonio);
  renderizarHeatmap(patrimonio);
}


// ============================================================
// EXPORTAÇÃO
// ============================================================
//
// Nome exportado deve ser exatamente "atualizarAbaRentabilidade",
// conforme MODULOS_FUTUROS["tab-rentabilidade"] em app.js.
// ============================================================

export {
  atualizarAbaRentabilidade
};
