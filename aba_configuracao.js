// ============================================================
// ABA CONFIGURAÇÃO
// ============================================================
//
// Responsabilidades:
// 1. Ler patrimonio_consolidado.csv
// 2. Converter o CSV para registros
// 3. Validar as 21 colunas oficiais
// 4. Montar a tabela da aba Patrimônio Consolidado
// 5. Controlar o botão "Atualizar Mercado"
// 6. Chamar atualizarMercado()
// 7. Recarregar a tabela após a atualização
//
// NÃO faz:
// - scraping diretamente
// - cálculos diretamente
// - gravação do CSV diretamente
//
// Essas funções são executadas por outros módulos.
// ============================================================


// ============================================================
// IMPORTA ATUALIZADOR DE MERCADO
// ============================================================

import {
  atualizarMercado
} from "./atualizar.js";


// ============================================================
// CONFIGURAÇÃO
// ============================================================

const ARQUIVO_CSV =
  "https://raw.githubusercontent.com/mec4tronico/FinancasOnline/main/" +
  "patrimonio_consolidado.csv";


// ============================================================
// 21 COLUNAS OFICIAIS
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
// APRESENTAÇÃO DA TABELA (SOMENTE VISUAL)
// ============================================================
//
// Nada nesta seção altera dados, ordem ou cálculos.
// Serve apenas para formatar o que já existe em `patrimonio`
// no momento de desenhar a tabela em tela.
// ============================================================

// ------------------------------------------------------------
// Nomes amigáveis das colunas (exibição apenas)
// ------------------------------------------------------------

const NOMES_COLUNAS = {
  Ativo: "Ativo",
  Tipo: "Tipo",
  Quantidade: "Quantidade",
  TotalInvestido: "Total Investido",
  DataPrimeiraCompra: "1ª Compra",
  DataAtualizacao: "Atualização",
  ValorAtual: "Valor Atual",
  Min52: "Mín. 52 semanas",
  Max52: "Máx. 52 semanas",
  DY: "DY",
  Valorizacao: "Valorização",
  ValorAtualPosicao: "Posição Atual",
  LucroPrejuizo: "Lucro / Prejuízo",
  Rentabilidade: "Rentabilidade",
  PesoCarteira: "Peso na Carteira",
  RendaAnualEstimada: "Renda Anual Estimada",
  RendaMensalEstimada: "Renda Mensal Estimada",
  ValorPosicaoMax52: "Posição Máx. 52s",
  ValorPosicaoMin52: "Posição Mín. 52s",
  PotencialFinanceiroMax52: "Potencial Máx. 52s",
  RiscoFinanceiroMin52: "Risco Mín. 52s"
};


// ------------------------------------------------------------
// Alinhamento de cada coluna
// ------------------------------------------------------------

const ALINHAMENTO_COLUNAS = {
  Ativo: "esquerda",
  Tipo: "esquerda",
  Quantidade: "direita",
  TotalInvestido: "direita",
  DataPrimeiraCompra: "centro",
  DataAtualizacao: "centro",
  ValorAtual: "direita",
  Min52: "direita",
  Max52: "direita",
  DY: "direita",
  Valorizacao: "direita",
  ValorAtualPosicao: "direita",
  LucroPrejuizo: "direita",
  Rentabilidade: "direita",
  PesoCarteira: "direita",
  RendaAnualEstimada: "direita",
  RendaMensalEstimada: "direita",
  ValorPosicaoMax52: "direita",
  ValorPosicaoMin52: "direita",
  PotencialFinanceiroMax52: "direita",
  RiscoFinanceiroMin52: "direita"
};


// ------------------------------------------------------------
// Colunas monetárias e percentuais
// ------------------------------------------------------------

const COLUNAS_MONETARIAS = [
  "TotalInvestido",
  "ValorAtual",
  "Min52",
  "Max52",
  "ValorAtualPosicao",
  "LucroPrejuizo",
  "RendaAnualEstimada",
  "RendaMensalEstimada",
  "ValorPosicaoMax52",
  "ValorPosicaoMin52",
  "PotencialFinanceiroMax52",
  "RiscoFinanceiroMin52"
];

const COLUNAS_PERCENTUAIS = [
  "DY",
  "Valorizacao",
  "Rentabilidade",
  "PesoCarteira"
];

// Colunas onde o sinal do valor define a cor (verde/vermelho)
const COLUNAS_COM_COR = [
  ...COLUNAS_MONETARIAS,
  ...COLUNAS_PERCENTUAIS
];


// ------------------------------------------------------------
// Utilitário: transforma um texto do CSV em número,
// sem alterar o valor original armazenado em `patrimonio`.
// ------------------------------------------------------------

function converterParaNumero(valorTexto) {

  if (valorTexto === undefined || valorTexto === null) {
    return NaN;
  }

  let texto = String(valorTexto).trim();

  if (texto === "") {
    return NaN;
  }

  // Remove eventual "R$ " ou "%" apenas para leitura numérica
  texto = texto
    .replace(/^R\$\s?/, "")
    .replace(/%$/, "")
    .trim();

  // Formato "1.234,56" (pt-BR) → "1234.56"
  if (/,\d{1,3}$/.test(texto) && texto.includes(".")) {
    texto = texto.replace(/\./g, "").replace(",", ".");
  } else if (/,\d{1,3}$/.test(texto)) {
    texto = texto.replace(",", ".");
  }

  const numero = parseFloat(texto);

  return numero;
}


// ------------------------------------------------------------
// Formatação monetária: "R$ 1.234,56" / "-R$ 1.234,56"
// ------------------------------------------------------------

function formatarMoeda(valorTexto) {

  const numero = converterParaNumero(valorTexto);

  if (isNaN(numero)) {
    return valorTexto ?? "";
  }

  const formatado = Math.abs(numero).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const sinal = numero < 0 ? "-" : "";

  return `${sinal}R$ ${formatado}`;
}


// ------------------------------------------------------------
// Formatação percentual: "24,35%"
// Se já vier com "%" no CSV, não duplica.
// ------------------------------------------------------------

function formatarPercentual(valorTexto) {

  if (valorTexto === undefined || valorTexto === null) {
    return "";
  }

  const textoOriginal = String(valorTexto).trim();

  if (textoOriginal.endsWith("%")) {
    return textoOriginal;
  }

  const numero = converterParaNumero(textoOriginal);

  if (isNaN(numero)) {
    return textoOriginal;
  }

  const formatado = numero.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return `${formatado}%`;
}


// ------------------------------------------------------------
// Formatação de quantidade: sem casas decimais desnecessárias
// ------------------------------------------------------------

function formatarQuantidade(valorTexto) {

  const numero = converterParaNumero(valorTexto);

  if (isNaN(numero)) {
    return valorTexto ?? "";
  }

  if (Number.isInteger(numero)) {
    return numero.toLocaleString("pt-BR");
  }

  return numero.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4
  });
}


// ------------------------------------------------------------
// Formatação de DataAtualizacao:
// "2026-08-18 18:15:41" → "18/08/2026 18:15"
// DataPrimeiraCompra é mantida como está (já vem dd/mm/aaaa).
// ------------------------------------------------------------

function formatarDataAtualizacao(valorTexto) {

  if (!valorTexto) {
    return valorTexto ?? "";
  }

  const texto = String(valorTexto).trim();

  const correspondencia = texto.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/
  );

  if (!correspondencia) {
    return texto;
  }

  const [, ano, mes, dia, hora, minuto] = correspondencia;

  return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
}


// ------------------------------------------------------------
// Classe de cor conforme sinal do valor
// ------------------------------------------------------------

function classeCorPorSinal(valorTexto) {

  const numero = converterParaNumero(valorTexto);

  if (isNaN(numero) || numero === 0) {
    return "fo-valor-neutro";
  }

  return numero > 0 ? "fo-valor-positivo" : "fo-valor-negativo";
}


// ------------------------------------------------------------
// Formata o valor de exibição de uma célula, de acordo
// com o tipo da coluna. Não altera `registro[coluna]`.
// ------------------------------------------------------------

function formatarValorExibicao(coluna, valorOriginal) {

  if (COLUNAS_MONETARIAS.includes(coluna)) {
    return formatarMoeda(valorOriginal);
  }

  if (COLUNAS_PERCENTUAIS.includes(coluna)) {
    return formatarPercentual(valorOriginal);
  }

  if (coluna === "Quantidade") {
    return formatarQuantidade(valorOriginal);
  }

  if (coluna === "DataAtualizacao") {
    return formatarDataAtualizacao(valorOriginal);
  }

  return valorOriginal;
}


// ------------------------------------------------------------
// Injeta o CSS da tabela uma única vez na página
// ------------------------------------------------------------

let estilosInjetados = false;

function injetarEstilosTabela() {

  if (estilosInjetados) {
    return;
  }

  const estilo = document.createElement("style");

  estilo.id = "fo-estilos-tabela-patrimonio";

  estilo.textContent = `
    .fo-tabela-container {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      border: 1px solid #e2e2e2;
      border-radius: 8px;
    }

    .fo-tabela-container table {
      border-collapse: collapse;
      width: max-content;
      min-width: 100%;
      font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 14.5px;
    }

    .fo-tabela-container thead th {
      position: sticky;
      top: 0;
      z-index: 2;
      background-color: #1f2933;
      color: #ffffff;
      font-size: 15px;
      font-weight: 700;
      padding: 10px 14px;
      white-space: nowrap;
      text-align: left;
      border-bottom: 2px solid #0f1620;
    }

    .fo-tabela-container tbody td {
      padding: 8px 14px;
      white-space: nowrap;
      border-bottom: 1px solid #ececec;
      color: #2b2b2b;
    }

    .fo-tabela-container tbody tr:nth-child(even) {
      background-color: #fafafa;
    }

    .fo-tabela-container tbody tr:hover {
      background-color: #f0f4f8;
    }

    .fo-alinhar-esquerda {
      text-align: left;
    }

    .fo-alinhar-direita {
      text-align: right;
    }

    .fo-alinhar-centro {
      text-align: center;
    }

    .fo-ativo-destaque {
      font-weight: 700;
      color: #1f2933;
    }

    .fo-valor-positivo {
      color: #1b8a4c;
    }

    .fo-valor-negativo {
      color: #c62828;
    }

    .fo-valor-neutro {
      color: #2b2b2b;
    }
  `;

  document.head.appendChild(estilo);

  estilosInjetados = true;
}


// ------------------------------------------------------------
// Garante que a tabela esteja dentro de um container
// com rolagem horizontal, sem alterar o id da tabela.
// ------------------------------------------------------------

function garantirContainerComRolagem(tabela) {

  const paiAtual = tabela.parentNode;

  if (
    paiAtual &&
    paiAtual.classList &&
    paiAtual.classList.contains("fo-tabela-container")
  ) {
    return;
  }

  const container = document.createElement("div");

  container.className = "fo-tabela-container";

  paiAtual.insertBefore(container, tabela);

  container.appendChild(tabela);
}


// ============================================================
// ESTADO DA ABA
// ============================================================

let patrimonio = [];


// ============================================================
// ESTADO DO BOTÃO
// ============================================================

let botaoAtualizar = null;


// ============================================================
// STATUS
// ============================================================

function mostrarStatus(mensagem) {

  const elemento =
    document.getElementById("status");

  if (elemento) {
    elemento.textContent = mensagem;
  }

  console.log(mensagem);
}


// ============================================================
// CRIAR BOTÃO ATUALIZAR MERCADO
// ============================================================

function criarBotaoAtualizarMercado() {

  // ----------------------------------------------------------
  // Se o botão já existe, não cria outro
  // ----------------------------------------------------------

  if (
    document.getElementById(
      "btnAtualizarMercado"
    )
  ) {

    botaoAtualizar =
      document.getElementById(
        "btnAtualizarMercado"
      );

    return;
  }


  // ----------------------------------------------------------
  // Criar botão
  // ----------------------------------------------------------

  botaoAtualizar =
    document.createElement("button");

  botaoAtualizar.id =
    "btnAtualizarMercado";

  botaoAtualizar.type =
    "button";

  botaoAtualizar.textContent =
    "Atualizar Mercado";


  // ----------------------------------------------------------
  // Estilo básico
  // ----------------------------------------------------------

  botaoAtualizar.style.padding =
    "10px 18px";

  botaoAtualizar.style.marginBottom =
    "15px";

  botaoAtualizar.style.cursor =
    "pointer";


  // ----------------------------------------------------------
  // Evento do botão
  // ----------------------------------------------------------

  botaoAtualizar.addEventListener(
    "click",
    atualizarMercadoDaAba
  );


  // ----------------------------------------------------------
  // Inserir antes da tabela
  // ----------------------------------------------------------

  const tabela =
    document.getElementById("tabela");


  if (tabela) {

    tabela.parentNode.insertBefore(
      botaoAtualizar,
      tabela
    );

  } else {

    document.body.appendChild(
      botaoAtualizar
    );

  }
}


// ============================================================
// BOTÃO → ATUALIZAR MERCADO
// ============================================================
//
// Fluxo:
//
// [ Atualizar Mercado ]
//          ↓
// atualizarMercado()
//          ↓
// carregarPatrimonio()
// ============================================================

async function atualizarMercadoDaAba() {

  if (!botaoAtualizar) {

    botaoAtualizar =
      document.getElementById(
        "btnAtualizarMercado"
      );

  }


  // ----------------------------------------------------------
  // Desabilitar botão durante atualização
  // ----------------------------------------------------------

  if (botaoAtualizar) {

    botaoAtualizar.disabled =
      true;

    botaoAtualizar.textContent =
      "Atualizando Mercado...";

    botaoAtualizar.style.cursor =
      "wait";
  }


  try {

    mostrarStatus(
      "========================================\n" +
      "ATUALIZAÇÃO DE MERCADO\n" +
      "========================================\n" +
      "\n" +
      "Iniciando atualização..."
    );


    // ========================================================
    // 1. CHAMA atualizar.js
    // ========================================================

    const resultado =
      await atualizarMercado({

        onProgress: mensagem => {

          mostrarStatus(
            mensagem
          );

        }

      });


    // ========================================================
    // 2. MOSTRA RESULTADO
    // ========================================================

    console.log(
      "Resultado da atualização:",
      resultado
    );


    mostrarStatus(
      "========================================\n" +
      "ATUALIZAÇÃO DE MERCADO CONCLUÍDA\n" +
      "========================================\n" +
      "\n" +
      `Total de ativos: ${resultado?.total ?? patrimonio.length}\n` +
      `Atualizados: ${resultado?.atualizados ?? 0}\n` +
      `Erros: ${resultado?.erros ?? 0}\n` +
      `Mantidos: ${resultado?.mantidos ?? 0}\n` +
      "\n" +
      "Recarregando patrimônio..."
    );


    // ========================================================
    // 3. RECARREGA O CSV
    // ========================================================

    await carregarPatrimonio();


    // ========================================================
    // 4. CONFIRMA RECARREGAMENTO
    // ========================================================

    mostrarStatus(
      `${patrimonio.length} ativos carregados após atualização.`
    );


  } catch (erro) {

    console.error(
      "Erro ao atualizar mercado:",
      erro
    );


    mostrarStatus(
      "ERRO AO ATUALIZAR MERCADO:\n" +
      erro.message
    );


  } finally {

    // --------------------------------------------------------
    // Liberar botão
    // --------------------------------------------------------

    if (botaoAtualizar) {

      botaoAtualizar.disabled =
        false;

      botaoAtualizar.textContent =
        "Atualizar Mercado";

      botaoAtualizar.style.cursor =
        "pointer";
    }

  }
}


// ============================================================
// LER CSV
// ============================================================

async function carregarPatrimonio() {

  mostrarStatus(
    "Carregando PatrimonioConsolidado.csv..."
  );


  // ----------------------------------------------------------
  // Cache busting:
  // garante que a leitura procure o arquivo atualizado.
  // ----------------------------------------------------------

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
      `PatrimonioConsolidado.csv ` +
      `(HTTP ${resposta.status}).`
    );

  }


  const texto =
    await resposta.text();


  patrimonio =
    converterCSVParaPatrimonio(
      texto
    );


  mostrarStatus(
    `${patrimonio.length} ativos carregados.`
  );


  montarTabela();

  return patrimonio;
}


// ============================================================
// CONVERTER CSV → OBJETOS
// ============================================================

function converterCSVParaPatrimonio(texto) {

  const linhas =
    texto
      .trim()
      .split(/\r?\n/);


  if (linhas.length === 0) {

    throw new Error(
      "PatrimonioConsolidado.csv está vazio."
    );

  }


  // ----------------------------------------------------------
  // CABEÇALHO
  // ----------------------------------------------------------

  const cabecalho =
    separarLinhaCSV(
      linhas[0]
    )
      .map(
        valor => valor.trim()
      );


  // ----------------------------------------------------------
  // VALIDAR QUANTIDADE DE COLUNAS
  // ----------------------------------------------------------

  if (cabecalho.length !== 21) {

    throw new Error(
      `PatrimonioConsolidado.csv possui ` +
      `${cabecalho.length} colunas. ` +
      `Esperadas: 21.`
    );

  }


  // ----------------------------------------------------------
  // VALIDAR NOME E ORDEM DAS COLUNAS
  // ----------------------------------------------------------

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
        `Coluna ${indice + 1} incorreta.\n` +
        `Esperada: ${COLUNAS[indice]}\n` +
        `Encontrada: ${cabecalho[indice]}`
      );

    }

  }


  // ----------------------------------------------------------
  // CONVERTER LINHAS
  // ----------------------------------------------------------

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
      separarLinhaCSV(
        linhas[indice]
      );


    // --------------------------------------------------------
    // VALIDAR LINHA
    // --------------------------------------------------------

    if (valores.length !== 21) {

      throw new Error(
        `Linha ${indice + 1} possui ` +
        `${valores.length} colunas. ` +
        `Esperadas: 21.`
      );

    }


    // --------------------------------------------------------
    // CRIAR REGISTRO
    // --------------------------------------------------------

    const registro = {};


    for (
      let coluna = 0;
      coluna < COLUNAS.length;
      coluna++
    ) {

      registro[COLUNAS[coluna]] =
        valores[coluna];

    }


    dados.push(
      registro
    );

  }


  return dados;
}


// ============================================================
// SEPARAR LINHA CSV
//
// Aceita:
// - valores entre aspas
// - vírgulas dentro de valores
// - valores como "49,84"
// - aspas escapadas no padrão CSV
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


    // --------------------------------------------------------
    // ASPAS
    // --------------------------------------------------------

    if (caractere === '"') {

      // Aspas duplas dentro de um campo

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


    // --------------------------------------------------------
    // VÍRGULA SEPARADORA
    // --------------------------------------------------------

    } else if (
      caractere === "," &&
      !dentroDeAspas
    ) {

      valores.push(
        valorAtual
      );

      valorAtual = "";


    // --------------------------------------------------------
    // CARACTERE NORMAL
    // --------------------------------------------------------

    } else {

      valorAtual +=
        caractere;

    }

  }


  // ----------------------------------------------------------
  // VALIDAR ASPAS
  // ----------------------------------------------------------

  if (dentroDeAspas) {

    throw new Error(
      "CSV possui aspas não fechadas."
    );

  }


  // ----------------------------------------------------------
  // ÚLTIMO VALOR
  // ----------------------------------------------------------

  valores.push(
    valorAtual
  );


  return valores;
}


// ============================================================
// MONTAR TABELA
// ============================================================
//
// IMPORTANTE:
// - Não reordena `patrimonio`.
// - Não recalcula nada.
// - Não altera `registro[coluna]`.
// - Apenas formata o texto exibido em cada célula
//   e aplica classes CSS de alinhamento/cor.
// ============================================================

function montarTabela() {

  const tabela =
    document.getElementById(
      "tabela"
    );


  if (!tabela) {

    console.error(
      'Elemento <table id="tabela"> não encontrado.'
    );

    return;
  }


  // ----------------------------------------------------------
  // Garantir estilos e container com rolagem horizontal
  // ----------------------------------------------------------

  injetarEstilosTabela();

  garantirContainerComRolagem(tabela);


  // ----------------------------------------------------------
  // LIMPAR TABELA
  // ----------------------------------------------------------

  tabela.innerHTML = "";


  // ==========================================================
  // CABEÇALHO
  // ==========================================================

  const thead =
    document.createElement(
      "thead"
    );


  const linhaCabecalho =
    document.createElement(
      "tr"
    );


  for (const coluna of COLUNAS) {

    const th =
      document.createElement(
        "th"
      );


    th.textContent =
      NOMES_COLUNAS[coluna] ?? coluna;


    linhaCabecalho.appendChild(
      th
    );

  }


  thead.appendChild(
    linhaCabecalho
  );


  // ==========================================================
  // CORPO
  // ==========================================================
  //
  // A ordem percorrida aqui é exatamente a ordem do array
  // `patrimonio`, que por sua vez é exatamente a ordem das
  // linhas do CSV. Nenhum sort() é aplicado.
  // ==========================================================

  const tbody =
    document.createElement(
      "tbody"
    );


  for (const registro of patrimonio) {

    const tr =
      document.createElement(
        "tr"
      );


    for (const coluna of COLUNAS) {

      const td =
        document.createElement(
          "td"
        );


      const valorOriginal =
        registro[coluna];


      // ------------------------------------------------------
      // Alinhamento
      // ------------------------------------------------------

      const alinhamento =
        ALINHAMENTO_COLUNAS[coluna];

      if (alinhamento === "esquerda") {
        td.classList.add("fo-alinhar-esquerda");
      } else if (alinhamento === "direita") {
        td.classList.add("fo-alinhar-direita");
      } else if (alinhamento === "centro") {
        td.classList.add("fo-alinhar-centro");
      }


      // ------------------------------------------------------
      // Texto exibido (formatado) — sem alterar o dado original
      // ------------------------------------------------------

      td.textContent =
        formatarValorExibicao(
          coluna,
          valorOriginal
        );


      // ------------------------------------------------------
      // Destaque da coluna Ativo
      // ------------------------------------------------------

      if (coluna === "Ativo") {
        td.classList.add("fo-ativo-destaque");
      }


      // ------------------------------------------------------
      // Cor por sinal (indicadores financeiros/percentuais)
      // ------------------------------------------------------

      if (COLUNAS_COM_COR.includes(coluna)) {
        td.classList.add(
          classeCorPorSinal(valorOriginal)
        );
      }


      tr.appendChild(
        td
      );

    }


    tbody.appendChild(
      tr
    );

  }


  // ==========================================================
  // INSERIR NA TABELA
  // ==========================================================

  tabela.appendChild(
    thead
  );


  tabela.appendChild(
    tbody
  );
}


// ============================================================
// INICIALIZAÇÃO DA ABA
// ============================================================
//
// Essa função será chamada pelo app.js quando:
// - o site abrir na aba Patrimônio Consolidado
// - ou quando futuramente quisermos recarregar a aba
// ============================================================

async function iniciarAbaPatrimonio() {

  try {

    // --------------------------------------------------------
    // Criar botão
    // --------------------------------------------------------

    criarBotaoAtualizarMercado();


    // --------------------------------------------------------
    // Carregar patrimônio
    // --------------------------------------------------------

    await carregarPatrimonio();


  } catch (erro) {

    console.error(
      "Erro ao carregar Patrimônio Consolidado:",
      erro
    );


    mostrarStatus(
      `ERRO: ${erro.message}`
    );


    throw erro;
  }
}


// ============================================================
// EXPORTAÇÃO
// ============================================================

export {
  iniciarAbaPatrimonio,
  carregarPatrimonio
};
