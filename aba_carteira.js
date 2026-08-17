
// ============================================================
// ABA CARTEIRA CONSOLIDADA
// ============================================================
// Responsabilidade:
// - Ler patrimonio_consolidado.csv quando a aba for aberta
// - Calcular e exibir os 5 KPIs
// - Criar gráfico de distribuição por ativo
// - Criar gráfico de patrimônio por classe
// - Criar gráfico de lucro/prejuízo
//
// O arquivo NÃO altera o patrimônio e NÃO grava CSV.
// Ele apenas lê e apresenta os dados atuais.
// ============================================================


// ============================================================
// CONFIGURAÇÃO
// ============================================================

const ARQUIVO_CSV =
  "https://raw.githubusercontent.com/mec4tronico/FinancasOnline/main/" +
  "patrimonio_consolidado.csv";


// ============================================================
// ESTADO DOS GRÁFICOS
// ============================================================

const graficosCarteira = {
  distribuicao: null,
  classes: null,
  lucroPrejuizo: null
};


// ============================================================
// COLUNAS OFICIAIS
// ============================================================

const COLUNAS = [
  "Ativo",
  "Tipo",
  "Quantidade",
  "TotalInvestido",
  "DataPrimeiraCompra",
  "DataAtualizacao",
  "ValorAtual",
  "Min52",
  "Max52",
  "DY",
  "Valorizacao",
  "ValorAtualPosicao",
  "LucroPrejuizo",
  "Rentabilidade",
  "PesoCarteira",
  "RendaAnualEstimada",
  "RendaMensalEstimada",
  "ValorPosicaoMax52",
  "ValorPosicaoMin52",
  "PotencialFinanceiroMax52",
  "RiscoFinanceiroMin52"
];


// ============================================================
// CONVERTER NÚMERO
// ============================================================

function converterNumeroParaGrafico(valor) {

  if (typeof valor === "number") {

    return Number.isFinite(valor)
      ? valor
      : 0;
  }

  let texto = String(valor ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/%/g, "");

  if (texto.includes(",")) {

    texto = texto
      .replace(/\./g, "")
      .replace(",", ".");
  }

  const numero = Number(texto);

  return Number.isFinite(numero)
    ? numero
    : 0;
}


// ============================================================
// FORMATAR MOEDA
// ============================================================

function formatarMoeda(valor) {

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(valor);
}


// ============================================================
// FORMATAR PERCENTUAL
// ============================================================

function formatarPercentual(valor) {

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(valor) + "%";
}


// ============================================================
// FORMATAR PERCENTUAL DA ROSCA
// 3 CASAS DECIMAIS
// ============================================================

function formatarPercentualRosca(valor) {

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  }).format(valor) + "%";
}


// ============================================================
// ATUALIZAR TEXTO
// ============================================================

function atualizarTexto(id, texto) {

  const elemento =
    document.getElementById(id);

  if (elemento) {
    elemento.textContent = texto;
  }
}


// ============================================================
// NORMALIZAR CLASSE
// ============================================================

function normalizarClasse(tipo) {

  const texto =
    String(tipo ?? "")
      .trim()
      .toLowerCase();

  if (
    texto === "acoes" ||
    texto === "ações"
  ) {
    return "Ações";
  }

  if (
    texto === "fii" ||
    texto === "fiis"
  ) {
    return "FIIs";
  }

  return texto
    ? texto.charAt(0).toUpperCase() + texto.slice(1)
    : "Outros";
}


// ============================================================
// SEPARAR LINHA CSV
// ============================================================

function separarLinhaCSV(linha) {

  const valores = [];

  let valorAtual = "";
  let dentroDeAspas = false;

  for (
    let indice = 0;
    indice < linha.length;
    indice++
  ) {

    const caractere =
      linha[indice];

    if (caractere === '"') {

      if (
        dentroDeAspas &&
        linha[indice + 1] === '"'
      ) {

        valorAtual += '"';
        indice++;

      } else {

        dentroDeAspas =
          !dentroDeAspas;
      }

    } else if (
      caractere === "," &&
      !dentroDeAspas
    ) {

      valores.push(valorAtual);
      valorAtual = "";

    } else {

      valorAtual += caractere;
    }
  }

  if (dentroDeAspas) {

    throw new Error(
      "CSV possui aspas não fechadas."
    );
  }

  valores.push(valorAtual);

  return valores;
}


// ============================================================
// CONVERTER CSV
// ============================================================

function converterCSVParaPatrimonio(texto) {

  const linhas =
    texto
      .trim()
      .split(/\r?\n/);

  if (linhas.length === 0) {

    throw new Error(
      "CSV vazio."
    );
  }

  const cabecalho =
    separarLinhaCSV(linhas[0])
      .map(valor => valor.trim());

  if (cabecalho.length !== 21) {

    throw new Error(
      `CSV possui ${cabecalho.length} colunas. ` +
      `Esperadas: 21.`
    );
  }

  for (
    let indice = 0;
    indice < COLUNAS.length;
    indice++
  ) {

    if (
      cabecalho[indice] !==
      COLUNAS[indice]
    ) {

      throw new Error(
        `Coluna ${indice + 1} incorreta. ` +
        `Esperada: ${COLUNAS[indice]}. ` +
        `Encontrada: ${cabecalho[indice]}.`
      );
    }
  }

  const dados = [];

  for (
    let indice = 1;
    indice < linhas.length;
    indice++
  ) {

    if (!linhas[indice].trim()) {
      continue;
    }

    const valores =
      separarLinhaCSV(linhas[indice]);

    if (valores.length !== 21) {

      throw new Error(
        `Linha ${indice + 1} possui ` +
        `${valores.length} colunas. ` +
        `Esperadas: 21.`
      );
    }

    const registro = {};

    for (
      let coluna = 0;
      coluna < COLUNAS.length;
      coluna++
    ) {

      registro[COLUNAS[coluna]] =
        valores[coluna];
    }

    dados.push(registro);
  }

  return dados;
}


// ============================================================
// LER CSV
// ============================================================

async function carregarPatrimonioCarteira() {

  // Cache-busting obrigatório:
  // cada abertura da aba busca uma versão nova.

  const urlCSV =
    `${ARQUIVO_CSV}?atualizadoEm=${Date.now()}`;

  const resposta =
    await fetch(urlCSV, {
      cache: "no-store"
    });

  if (!resposta.ok) {

    throw new Error(
      `Não foi possível carregar ` +
      `patrimonio_consolidado.csv ` +
      `(HTTP ${resposta.status}).`
    );
  }

  const texto =
    await resposta.text();

  return converterCSVParaPatrimonio(texto);
}


// ============================================================
// DESTRUIR GRÁFICOS ANTERIORES
// ============================================================

function destruirGraficosCarteira() {

  for (
    const nome of
    Object.keys(graficosCarteira)
  ) {

    if (graficosCarteira[nome]) {

      graficosCarteira[nome].destroy();

      graficosCarteira[nome] = null;
    }
  }
}


// ============================================================
// ATUALIZAR KPIs
// ============================================================

function atualizarKPIs(posicoes) {

  const patrimonioAtual =
    posicoes.reduce(
      (total, posicao) =>
        total +
        posicao.valorAtualPosicao,
      0
    );

  const totalInvestido =
    posicoes.reduce(
      (total, posicao) =>
        total +
        posicao.totalInvestido,
      0
    );

  const lucroPrejuizo =
    posicoes.reduce(
      (total, posicao) =>
        total +
        posicao.lucroPrejuizo,
      0
    );

  const rendaMensal =
    posicoes.reduce(
      (total, posicao) =>
        total +
        posicao.rendaMensal,
      0
    );

  const rentabilidade =
    totalInvestido === 0
      ? 0
      : (
          lucroPrejuizo /
          totalInvestido
        ) * 100;

  atualizarTexto(
    "kpiPatrimonio",
    formatarMoeda(patrimonioAtual)
  );

  atualizarTexto(
    "kpiInvestido",
    formatarMoeda(totalInvestido)
  );

  atualizarTexto(
    "kpiLucro",
    formatarMoeda(lucroPrejuizo)
  );

  atualizarTexto(
    "kpiRentabilidade",
    formatarPercentual(rentabilidade)
  );

  atualizarTexto(
    "kpiRendaMensal",
    formatarMoeda(rendaMensal)
  );

  const iconeLucro =
    document.getElementById(
      "kpiLucroIcone"
    );

  if (iconeLucro) {

    iconeLucro.classList.toggle(
      "kpi-red",
      lucroPrejuizo < 0
    );

    iconeLucro.classList.toggle(
      "kpi-green",
      lucroPrejuizo >= 0
    );

    iconeLucro.innerHTML =
      lucroPrejuizo < 0
        ? '<i class="fa-solid fa-arrow-trend-down"></i>'
        : '<i class="fa-solid fa-arrow-trend-up"></i>';
  }

  return {
    patrimonioAtual,
    totalInvestido,
    lucroPrejuizo,
    rendaMensal,
    rentabilidade
  };
}


// ============================================================
// GRÁFICO DE ROSCA
// ============================================================

function criarGraficoDistribuicao(
  posicoes,
  patrimonioAtual,
  cores,
  opcoesBase
) {

  const canvas =
    document.getElementById(
      "graficoDistribuicaoAtivos"
    );

  if (!canvas) {
    return;
  }

  // ----------------------------------------------------------
  // Ordenação:
  // maior patrimônio → menor patrimônio
  // ----------------------------------------------------------

  const posicoesOrdenadas =
    [...posicoes]
      .filter(
        posicao =>
          posicao.valorAtualPosicao > 0
      )
      .sort(
        (a, b) =>
          b.valorAtualPosicao -
          a.valorAtualPosicao
      );

  graficosCarteira.distribuicao =
    new Chart(canvas, {

      type: "doughnut",

      data: {

        labels:
          posicoesOrdenadas.map(
            posicao =>
              posicao.ativo
          ),

        datasets: [{

          data:
            posicoesOrdenadas.map(
              posicao =>
                posicao.valorAtualPosicao
            ),

          backgroundColor:
            posicoesOrdenadas.map(
              (_, indice) =>
                cores[
                  indice %
                  cores.length
                ]
            ),

          borderWidth: 2,

          borderColor: "#ffffff"
        }]
      },

      options: {

        ...opcoesBase,

        cutout: "62%",

        plugins: {

          ...opcoesBase.plugins,

          legend: {

            ...opcoesBase.plugins.legend,

            labels: {

              ...opcoesBase.plugins.legend.labels,

              generateLabels: chart => {

                const dataset =
                  chart.data.datasets[0];

                return chart.data.labels.map(
                  (label, indice) => {

                    const valor =
                      Number(
                        dataset.data[indice]
                      );

                    const percentual =
                      patrimonioAtual > 0
                        ? (
                            valor /
                            patrimonioAtual
                          ) * 100
                        : 0;

                    return {

                      text:
                        `${label} — ` +
                        `${formatarPercentualRosca(percentual)}`,

                      fillStyle:
                        dataset
                          .backgroundColor[indice],

                      strokeStyle:
                        dataset.borderColor,

                      lineWidth:
                        dataset.borderWidth,

                      hidden: false,

                      index: indice
                    };
                  }
                );
              }
            }
          },

          tooltip: {

            callbacks: {

              label: contexto => {

                const valor =
                  Number(
                    contexto.parsed
                  );

                const percentual =
                  patrimonioAtual > 0
                    ? (
                        valor /
                        patrimonioAtual
                      ) * 100
                    : 0;

                return [
                  `${contexto.label}`,
                  `Valor: ${formatarMoeda(valor)}`,
                  `Participação: ${formatarPercentualRosca(percentual)}`
                ];
              }
            }
          }
        }
      }
    });
}


// ============================================================
// GRÁFICO PATRIMÔNIO POR CLASSE
// ============================================================

function criarGraficoClasses(
  posicoes,
  cores,
  opcoesBase
) {

  const canvas =
    document.getElementById(
      "graficoPatrimonioClasses"
    );

  if (!canvas) {
    return;
  }

  const totaisPorClasse = {};

  for (const posicao of posicoes) {

    totaisPorClasse[posicao.classe] =
      (
        totaisPorClasse[posicao.classe] ||
        0
      ) +
      posicao.valorAtualPosicao;
  }

  graficosCarteira.classes =
    new Chart(canvas, {

      type: "bar",

      data: {

        labels:
          Object.keys(
            totaisPorClasse
          ),

        datasets: [{

          label: "Patrimônio",

          data:
            Object.values(
              totaisPorClasse
            ),

          backgroundColor:
            "#2563eb",

          borderRadius: 7,

          maxBarThickness: 56
        }]
      },

      options: {

        ...opcoesBase,

        scales: {

          x: {
            grid: {
              display: false
            }
          },

          y: {

            ticks: {
              callback:
                valor =>
                  formatarMoeda(valor)
            },

            border: {
              display: false
            }
          }
        }
      }
    });
}


// ============================================================
// GRÁFICO LUCRO / PREJUÍZO
// ============================================================

function criarGraficoLucroPrejuizo(
  posicoes,
  opcoesBase
) {

  const canvas =
    document.getElementById(
      "graficoLucroPrejuizo"
    );

  if (!canvas) {
    return;
  }

  graficosCarteira.lucroPrejuizo =
    new Chart(canvas, {

      type: "bar",

      data: {

        labels:
          posicoes.map(
            posicao =>
              posicao.ativo
          ),

        datasets: [{

          label:
            "Lucro / prejuízo",

          data:
            posicoes.map(
              posicao =>
                posicao.lucroPrejuizo
            ),

          backgroundColor:
            posicoes.map(
              posicao =>
                posicao.lucroPrejuizo >= 0
                  ? "#10b981"
                  : "#ef4444"
            ),

          borderRadius: 6
        }]
      },

      options: {

        ...opcoesBase,

        scales: {

          x: {
            grid: {
              display: false
            }
          },

          y: {

            ticks: {
              callback:
                valor =>
                  formatarMoeda(valor)
            },

            border: {
              display: false
            }
          }
        }
      }
    });
}


// ============================================================
// ATUALIZAR TODA A ABA
// ============================================================

async function atualizarAbaCarteira() {

  if (!window.Chart) {

    throw new Error(
      "Chart.js não está carregado."
    );
  }

  // ----------------------------------------------------------
  // 1. LER CSV NOVAMENTE
  // ----------------------------------------------------------

  const patrimonio =
    await carregarPatrimonioCarteira();

  // ----------------------------------------------------------
  // 2. TRANSFORMAR DADOS
  // ----------------------------------------------------------

  const posicoes =
    patrimonio.map(
      registro => ({

        ativo:
          registro.Ativo,

        classe:
          normalizarClasse(
            registro.Tipo
          ),

        valorAtualPosicao:
          converterNumeroParaGrafico(
            registro.ValorAtualPosicao
          ),

        totalInvestido:
          converterNumeroParaGrafico(
            registro.TotalInvestido
          ),

        lucroPrejuizo:
          converterNumeroParaGrafico(
            registro.LucroPrejuizo
          ),

        rendaMensal:
          converterNumeroParaGrafico(
            registro.RendaMensalEstimada
          )
      })
    );

  // ----------------------------------------------------------
  // 3. KPIs
  // ----------------------------------------------------------

  const totais =
    atualizarKPIs(posicoes);

  // ----------------------------------------------------------
  // 4. DESTRUIR GRÁFICOS ANTIGOS
  // ----------------------------------------------------------

  destruirGraficosCarteira();

  if (posicoes.length === 0) {
    return;
  }

  // ----------------------------------------------------------
  // 5. CORES
  // ----------------------------------------------------------

  const cores = [

    "#059669",
    "#2563eb",
    "#8b5cf6",
    "#f59e0b",
    "#ec4899",
    "#06b6d4",
    "#84cc16",
    "#f97316",
    "#6366f1",
    "#14b8a6"
  ];

  // ----------------------------------------------------------
  // 6. CONFIGURAÇÕES DOS GRÁFICOS
  // ----------------------------------------------------------

  const opcoesBase = {

    responsive: true,

    maintainAspectRatio: false,

    plugins: {

      legend: {

        labels: {

          boxWidth: 11,

          usePointStyle: true,

          pointStyle: "circle",

          font: {
            family: "Inter"
          }
        }
      },

      tooltip: {

        callbacks: {

          label: contexto => {

            const valor =
              contexto.dataset.label
                ? (
                    contexto.parsed.y ??
                    contexto.parsed
                  )
                : contexto.parsed;

            return (
              `${contexto.dataset.label || contexto.label}: ` +
              formatarMoeda(valor)
            );
          }
        }
      }
    }
  };

  // ----------------------------------------------------------
  // 7. GRÁFICO DE ROSCA
  // ----------------------------------------------------------

  criarGraficoDistribuicao(
    posicoes,
    totais.patrimonioAtual,
    cores,
    opcoesBase
  );

  // ----------------------------------------------------------
  // 8. GRÁFICO POR CLASSE
  // ----------------------------------------------------------

  criarGraficoClasses(
    posicoes,
    cores,
    opcoesBase
  );

  // ----------------------------------------------------------
  // 9. GRÁFICO LUCRO/PREJUÍZO
  // ----------------------------------------------------------

  criarGraficoLucroPrejuizo(
    posicoes,
    opcoesBase
  );

  console.log(
    "Carteira Consolidada atualizada diretamente do CSV."
  );
}


// ============================================================
// EXPORTAÇÃO
// ============================================================

export {
  atualizarAbaCarteira
};
```
