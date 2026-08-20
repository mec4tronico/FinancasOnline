// ============================================================
// ABA CARTEIRA
// ============================================================
//
// Responsabilidade:
// - Ler patrimonio_consolidado.csv quando a aba for aberta
// - Utilizar o processarDadosCSV() existente em aba_configuracao.js
// - Calcular e exibir os 5 KPIs
// - Criar gráfico de distribuição por ativo
// - Criar gráfico de patrimônio por classe
// - Criar gráfico de lucro/prejuízo
// - Criar tabela resumida da carteira abaixo dos gráficos
//
// O arquivo NÃO altera o patrimônio e NÃO grava CSV.
// Ele apenas lê e apresenta os dados atuais.
//
// A tabela utiliza somente:
//
// Ativo
// Tipo
// Quantidade
// ValorAtual
// ValorAtualPosicao
// LucroPrejuizo
// PesoCarteira
//
// ============================================================


import {
  processarDadosCSV
} from "./aba_configuracao.js";


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
// COLUNAS DA TABELA DA CARTEIRA
// ============================================================
//
// IMPORTANTE:
// Os nomes são usados para localizar as colunas
// no cabeçalho do CSV.
//
// Portanto, a posição física da coluna no CSV não importa.
//
// ============================================================

const COLUNAS_TABELA_CARTEIRA = [

  "Ativo",

  "Tipo",

  "Quantidade",

  "ValorAtual",

  "ValorAtualPosicao",

  "LucroPrejuizo",

  "PesoCarteira"

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


  let texto =
    String(valor ?? "")
      .trim()
      .replace(/\s/g, "")
      .replace(/R\$/gi, "")
      .replace(/%/g, "");


  if (texto.includes(",")) {

    texto =
      texto
        .replace(/\./g, "")
        .replace(",", ".");

  }


  const numero =
    Number(texto);


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
// ESCAPAR HTML
// ============================================================

function escaparHTML(valor) {

  return String(valor ?? "")

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;")

    .replace(/'/g, "&#039;");

}


// ============================================================
// ATUALIZAR TEXTO
// ============================================================

function atualizarTexto(id, texto) {

  const elemento =
    document.getElementById(id);


  if (elemento) {

    elemento.textContent =
      texto;

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

    ? texto.charAt(0).toUpperCase() +
      texto.slice(1)

    : "Outros";

}


// ============================================================
// LER CSV
// ============================================================
//
// O processamento do CSV NÃO é duplicado aqui.
//
// A função existente em aba_configuracao.js é utilizada.
//
// ============================================================

async function carregarPatrimonioCarteira() {

  const urlCSV =
    `${ARQUIVO_CSV}?atualizadoEm=${Date.now()}`;


  const resposta =
    await fetch(

      urlCSV,

      {
        cache: "no-store"
      }

    );


  if (!resposta.ok) {

    throw new Error(

      `Não foi possível carregar ` +

      `patrimonio_consolidado.csv ` +

      `(HTTP ${resposta.status}).`

    );

  }


  const textoCSV =
    await resposta.text();


  if (!textoCSV.trim()) {

    throw new Error(
      "O arquivo patrimonio_consolidado.csv está vazio."
    );

  }


  return processarDadosCSV(
    textoCSV
  );

}


// ============================================================
// CONVERTER ARRAY DO CSV → OBJETO
// ============================================================
//
// processarDadosCSV() retorna:
//
// {
//   cabecalhosCSV,
//   dadosPatrimonio
// }
//
// dadosPatrimonio contém arrays.
//
// Os gráficos antigos trabalham com objetos.
//
// Esta função faz somente essa conversão.
//
// ============================================================

function converterDadosParaObjetos(
  cabecalhosCSV,
  dadosPatrimonio
) {

  return dadosPatrimonio.map(

    linha => {

      const registro = {};


      cabecalhosCSV.forEach(

        (nomeColuna, indice) => {

          registro[nomeColuna] =
            linha[indice] ?? "";

        }

      );


      return registro;

    }

  );

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

      graficosCarteira[nome] =
        null;

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

    formatarMoeda(
      patrimonioAtual
    )

  );


  atualizarTexto(

    "kpiInvestido",

    formatarMoeda(
      totalInvestido
    )

  );


  atualizarTexto(

    "kpiLucro",

    formatarMoeda(
      lucroPrejuizo
    )

  );


  atualizarTexto(

    "kpiRentabilidade",

    formatarPercentual(
      rentabilidade
    )

  );


  atualizarTexto(

    "kpiRendaMensal",

    formatarMoeda(
      rendaMensal
    )

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

    new Chart(

      canvas,

      {

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

              position: "left",

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

                          `${formatarPercentualRosca(
                            percentual
                          )}`,

                        fillStyle:

                          dataset
                            .backgroundColor[
                              indice
                            ],

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

                    `Valor: ${formatarMoeda(
                      valor
                    )}`,

                    `Participação: ${formatarPercentualRosca(
                      percentual
                    )}`

                  ];

                }

              }

            }

          }

        }

      }

    );

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

  const rendaPorClasse = {};


  for (const posicao of posicoes) {

    totaisPorClasse[
      posicao.classe
    ] =

      (

        totaisPorClasse[
          posicao.classe
        ] || 0

      ) +

      posicao.valorAtualPosicao;


    rendaPorClasse[
      posicao.classe
    ] =

      (

        rendaPorClasse[
          posicao.classe
        ] || 0

      ) +

      posicao.rendaMensal;

  }


  const classes =
    Object.keys(
      totaisPorClasse
    );


  graficosCarteira.classes =

    new Chart(

      canvas,

      {

        type: "bar",

        data: {

          labels:

            classes.map(

              classe =>

                `${classe} — ${formatarMoeda(
                  rendaPorClasse[classe] || 0
                )}/mês`

            ),

          datasets: [{

            label: "Patrimônio",

            data:

              classes.map(

                classe =>

                  totaisPorClasse[
                    classe
                  ]

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

                    formatarMoeda(
                      valor
                    )

              },

              border: {

                display: false

              }

            }

          }

        }

      }

    );

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


  // ==========================================================
  // DETECTAR CELULAR
  // ==========================================================

  const ehCelular =

    window.matchMedia(
      "(max-width: 700px)"
    ).matches;


  // ==========================================================
  // GRÁFICO
  // ==========================================================

  graficosCarteira.lucroPrejuizo =

    new Chart(

      canvas,

      {

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


          // ==================================================
          // CELULAR = BARRAS HORIZONTAIS
          // DESKTOP = BARRAS VERTICAIS
          // ==================================================

          indexAxis:

            ehCelular
              ? "y"
              : "x",


          scales: {

            // =================================================
            // EIXO X
            // =================================================

            x: {

              grid: {

                display:
                  ehCelular
                    ? true
                    : false

              },


              ticks: {

                callback:

                  valor =>

                    ehCelular

                      ? formatarMoeda(valor)

                      : valor

              },


              border: {

                display: false

              }

            },


            // =================================================
            // EIXO Y
            // =================================================

            y: {

              grid: {

                display:
                  ehCelular
                    ? false
                    : true

              },


              ticks: {

                autoSkip:
                  false,

                font: {

                  size:
                    ehCelular
                      ? 11
                      : 12

                }

              },


              border: {

                display: false

              }

            }

          }

        }

      }

    );

}


// ============================================================
// TABELA DA CARTEIRA
// ============================================================
//
// Mostra somente as 7 colunas solicitadas.
//
// A posição das colunas no CSV não importa.
//
// ============================================================

function renderizarTabelaCarteira(

  cabecalhosCSV,

  dadosPatrimonio

) {

  const container =

    document.getElementById(
      "tabelaCarteira"
    );


  if (!container) {

    console.warn(
      "[Carteira] Container da tabela não encontrado."
    );

    return;

  }


  // ----------------------------------------------------------
  // LOCALIZAR AS COLUNAS PELO NOME
  // ----------------------------------------------------------

  const indicesColunas =

    COLUNAS_TABELA_CARTEIRA.map(

      nome =>

        cabecalhosCSV.indexOf(
          nome
        )

    );


  // ----------------------------------------------------------
  // VALIDAR COLUNAS
  // ----------------------------------------------------------

  const colunasNaoEncontradas =

    COLUNAS_TABELA_CARTEIRA.filter(

      (_, indice) =>

        indicesColunas[indice] === -1

    );


  if (
    colunasNaoEncontradas.length > 0
  ) {

    console.error(

      "[Carteira] Colunas não encontradas:",

      colunasNaoEncontradas

    );


    container.innerHTML = `

      <div class="alerta-erro">

        Não foi possível montar a tabela da Carteira.

        Colunas não encontradas:

        ${escaparHTML(
          colunasNaoEncontradas.join(", ")
        )}

      </div>

    `;

    return;

  }


  // ----------------------------------------------------------
  // CABEÇALHO
  // ----------------------------------------------------------

  let html = `

    <div class="content-card portfolio-card tabela-carteira-card">

      <div class="cabecalho-aba">

        <div>

          <h2>Carteira</h2>

        </div>

      </div>


      <div class="tabela-scroll">

        <table
          class="tabela-dados tabela-carteira"
        >

          <thead>

            <tr>

  `;


  COLUNAS_TABELA_CARTEIRA.forEach(

    nomeColuna => {

      html += `

        <th>

          ${escaparHTML(
            nomeColuna
          )}

        </th>

      `;

    }

  );


  html += `

            </tr>

          </thead>


          <tbody>

  `;


  // ----------------------------------------------------------
  // LINHAS
  // ----------------------------------------------------------

  dadosPatrimonio.forEach(

    linha => {

      html += `<tr>`;


      COLUNAS_TABELA_CARTEIRA.forEach(

        (
          nomeColuna,
          indiceTabela
        ) => {

          const indiceCSV =

            indicesColunas[
              indiceTabela
            ];


          const valor =

            linha[
              indiceCSV
            ] ?? "";


          let valorExibicao =
            valor;


          const numero =
            converterNumeroParaGrafico(
              valor
            );


          const ehNumero =

            String(valor).trim() !== "" &&

            Number.isFinite(numero);


          // ------------------------------------------------
          // QUANTIDADE
          // ------------------------------------------------

          if (

            ehNumero &&

            nomeColuna ===
              "Quantidade"

          ) {

            valorExibicao =

              new Intl.NumberFormat(
                "pt-BR"
              ).format(numero);

          }


          // ------------------------------------------------
          // MOEDA
          // ------------------------------------------------

          else if (

            ehNumero &&

            (

              nomeColuna ===
                "ValorAtual" ||

              nomeColuna ===
                "ValorAtualPosicao" ||

              nomeColuna ===
                "LucroPrejuizo"

            )

          ) {

            valorExibicao =
              formatarMoeda(
                numero
              );

          }


          // ------------------------------------------------
          // PERCENTUAL
          // ------------------------------------------------

          else if (

            ehNumero &&

            nomeColuna ===
              "PesoCarteira"

          ) {

            valorExibicao =

              formatarPercentual(
                numero
              );

          }


          // ------------------------------------------------
          // ALINHAMENTO DA CÉLULA
          // ------------------------------------------------
          //
          // Centralizado:
          // - Ativo
          // - Tipo
          // - Quantidade
          // - PesoCarteira
          //
          // Direita:
          // - ValorAtual
          // - ValorAtualPosicao
          // - LucroPrejuizo
          //
          // =================================================

          const classeAlinhamento =

            (

              nomeColuna ===
                "ValorAtual" ||

              nomeColuna ===
                "ValorAtualPosicao" ||

              nomeColuna ===
                "LucroPrejuizo"

            )

              ? "text-right"

              : "text-center";


          html += `

            <td class="${classeAlinhamento}">

              ${escaparHTML(
                valorExibicao
              )}

            </td>

          `;

        }

      );


      html += `</tr>`;

    }

  );


  html += `

          </tbody>

        </table>

      </div>

    </div>

  `;


  container.innerHTML =
    html;

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
  // 1. LER E PROCESSAR CSV
  // ----------------------------------------------------------

  const {

    cabecalhosCSV,

    dadosPatrimonio

  } = await carregarPatrimonioCarteira();


  // ----------------------------------------------------------
  // 2. CONVERTER OS ARRAYS PROCESSADOS PARA OBJETOS
  // ----------------------------------------------------------

  const patrimonio =

    converterDadosParaObjetos(

      cabecalhosCSV,

      dadosPatrimonio

    );


  // ----------------------------------------------------------
  // 3. TRANSFORMAR DADOS PARA OS GRÁFICOS
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

        valorAtual:
          converterNumeroParaGrafico(
            registro.ValorAtual
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
  // 4. KPIs
  // ----------------------------------------------------------

  const totais =
    atualizarKPIs(
      posicoes
    );


  // ----------------------------------------------------------
  // 5. DESTRUIR GRÁFICOS ANTIGOS
  // ----------------------------------------------------------

  destruirGraficosCarteira();


  if (
    posicoes.length === 0
  ) {

    renderizarTabelaCarteira(

      cabecalhosCSV,

      dadosPatrimonio

    );

    return;

  }


  // ----------------------------------------------------------
  // 6. CORES
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
  // 7. CONFIGURAÇÕES DOS GRÁFICOS
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

              formatarMoeda(
                valor
              )

            );

          }

        }

      }

    }

  };


  // ----------------------------------------------------------
  // 8. GRÁFICO DE ROSCA
  // ----------------------------------------------------------

  criarGraficoDistribuicao(

    posicoes,

    totais.patrimonioAtual,

    cores,

    opcoesBase

  );


  // ----------------------------------------------------------
  // 9. GRÁFICO POR CLASSE
  // ----------------------------------------------------------

  criarGraficoClasses(

    posicoes,

    cores,

    opcoesBase

  );


  // ----------------------------------------------------------
  // 10. GRÁFICO LUCRO/PREJUÍZO
  // ----------------------------------------------------------

  criarGraficoLucroPrejuizo(

    posicoes,

    opcoesBase

  );


  // ----------------------------------------------------------
  // 11. TABELA DA CARTEIRA
  // ----------------------------------------------------------

  renderizarTabelaCarteira(

    cabecalhosCSV,

    dadosPatrimonio

  );


  console.log(
    "Carteira atualizada diretamente do CSV."
  );

}


// ============================================================
// EXPORTAÇÃO
// ============================================================

export {

  atualizarAbaCarteira

};
