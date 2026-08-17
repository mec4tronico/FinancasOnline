// ============================================================
// ABA PATRIMÔNIO CONSOLIDADO
// ============================================================
//
// Responsabilidades:
// 1. Ler PatrimonioConsolidado.csv
// 2. Converter o CSV para registros
// 3. Validar as 21 colunas oficiais
// 4. Montar a tabela da aba Patrimônio Consolidado
//
// NÃO faz:
// - scraping
// - cálculos
// - gravação do CSV
// - atualização de mercado
//
// Essas funções serão executadas por outros módulos.
// ============================================================


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
    await fetch(urlCSV, {
      cache: "no-store"
    });

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
    converterCSVParaPatrimonio(texto);

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
    separarLinhaCSV(linhas[0])
      .map(valor => valor.trim());


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
      separarLinhaCSV(linhas[indice]);


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

    dados.push(registro);
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

      valores.push(valorAtual);

      valorAtual = "";


    // --------------------------------------------------------
    // CARACTERE NORMAL
    // --------------------------------------------------------

    } else {

      valorAtual += caractere;
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

  valores.push(valorAtual);

  return valores;
}


// ============================================================
// MONTAR TABELA
// ============================================================

function montarTabela() {

  const tabela =
    document.getElementById("tabela");

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
    document.createElement("thead");

  const linhaCabecalho =
    document.createElement("tr");


  for (const coluna of COLUNAS) {

    const th =
      document.createElement("th");

    th.textContent =
      coluna;

    linhaCabecalho.appendChild(th);
  }


  thead.appendChild(
    linhaCabecalho
  );


  // ==========================================================
  // CORPO
  // ==========================================================

  const tbody =
    document.createElement("tbody");


  for (const registro of patrimonio) {

    const tr =
      document.createElement("tr");


    for (const coluna of COLUNAS) {

      const td =
        document.createElement("td");

      td.textContent =
        registro[coluna];

      tr.appendChild(td);
    }


    tbody.appendChild(tr);
  }


  // ==========================================================
  // INSERIR NA TABELA
  // ==========================================================

  tabela.appendChild(thead);

  tabela.appendChild(tbody);
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
