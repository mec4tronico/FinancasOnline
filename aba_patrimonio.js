// ============================================================
// ABA PATRIMÔNIO CONSOLIDADO
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
      coluna;


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


      td.textContent =
        registro[coluna];


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
