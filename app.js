// ============================================================
// APP.JS
// ============================================================
//
// Responsabilidade:
//
// 1. Organizar a navegação entre abas
// 2. Ao abrir o site, iniciar a aba Patrimônio Consolidado
//    (aba_patrimonio.js cuida de carregar o CSV e controlar
//    o botão "Atualizar Mercado")
// 3. Ao entrar em cada uma das demais abas, chamar o módulo
//    correspondente (import dinâmico) — SEM implementar a
//    lógica dessas abas aqui.
//
// Estrutura prevista (mec4tronico):
//
// 1. 📋 Patrimônio Consolidado   -> aba_patrimonio.js (já existe)
// 2. 📊 Carteira Consolidada     -> aba_carteira.js   (já existe)
// 3. 📈 Rentabilidade            -> aba_rentabilidade.js        (a criar)
// 4. 💰 Patrimônio (renda)       -> aba_renda.js                (a criar)
// 5. 📋 Tabela Carteira          -> aba_tabela_carteira.js      (a criar)
// 6. 📋 Tabela Rentabilidade     -> aba_tabela_rentabilidade.js (a criar)
//
// Os módulos marcados "(a criar)" ainda não existem. O import
// é feito de forma DINÂMICA e dentro de try/catch, para que a
// ausência desses arquivos não quebre a aplicação nem as abas
// já funcionais. Assim que cada arquivo for criado exportando
// a função esperada, ele passa a funcionar automaticamente,
// sem precisar editar este app.js de novo.
//
// NÃO é responsabilidade deste arquivo:
// - ler ou converter patrimonio_consolidado.csv
// - fazer scraping
// - calcular colunas
// - gravar o CSV
// - qualquer lógica interna das abas 3 a 6
// ============================================================


import {
  atualizarAbaCarteira
} from "./aba_carteira.js";

import {
  iniciarAbaPatrimonio,
  carregarPatrimonio
} from "./aba_patrimonio.js";


// ============================================================
// MÓDULOS AINDA NÃO IMPLEMENTADOS
// ============================================================
//
// Mapa: id da aba -> { módulo, função exportada esperada }.
// Usado apenas para abas cuja lógica ainda não existe.
// ============================================================

const MODULOS_FUTUROS = {

  "tab-rentabilidade": {
    modulo: "./aba_rentabilidade.js",
    funcao: "atualizarAbaRentabilidade"
  },

  "tab-patrimonio": {
    modulo: "./aba_renda.js",
    funcao: "atualizarAbaRenda"
  },

  "tab-tabela-carteira": {
    modulo: "./aba_tabela_carteira.js",
    funcao: "atualizarAbaTabelaCarteira"
  },

  "tab-tabela-rentabilidade": {
    modulo: "./aba_tabela_rentabilidade.js",
    funcao: "atualizarAbaTabelaRentabilidade"
  }
};


// ============================================================
// ELEMENTOS DA INTERFACE
// ============================================================

const botoesAbas = document.querySelectorAll(".tab-button");
const conteudosAbas = document.querySelectorAll(".tab-content");
const btnCarregar = document.getElementById("btnCarregar");


// ============================================================
// CHAMAR MÓDULO DE UMA ABA AINDA NÃO IMPLEMENTADA
// ============================================================
//
// Faz import dinâmico do módulo previsto para a aba. Se o
// arquivo ainda não existir (404) ou a função esperada ainda
// não estiver exportada, apenas registra um aviso no console
// e a aba continua mostrando seu placeholder "Em desenvolvimento"
// (já presente no index.html).
// ============================================================

async function chamarModuloFuturo(idAba) {

  const config = MODULOS_FUTUROS[idAba];

  if (!config) {
    return;
  }

  try {

    const modulo = await import(config.modulo);

    const funcao = modulo[config.funcao];

    if (typeof funcao !== "function") {

      console.warn(
        `${config.modulo} foi carregado, mas não exporta ` +
        `a função ${config.funcao}().`
      );

      return;
    }

    await funcao();

  } catch (erro) {

    console.warn(
      `Aba "${idAba}" ainda não implementada ` +
      `(${config.modulo}):`,
      erro.message
    );
  }
}


// ============================================================
// NAVEGAÇÃO POR ABAS
// ============================================================

async function ativarAba(idAba) {

  for (const botao of botoesAbas) {

    const estaAtiva = botao.dataset.tab === idAba;

    botao.classList.toggle("active", estaAtiva);
    botao.setAttribute("aria-selected", String(estaAtiva));
  }

  for (const conteudo of conteudosAbas) {

    const estaAtiva = conteudo.id === idAba;

    conteudo.classList.toggle("active", estaAtiva);
    conteudo.hidden = !estaAtiva;
  }

  // ----------------------------------------------------------
  // 1. PATRIMÔNIO CONSOLIDADO
  // ----------------------------------------------------------
  // Já foi iniciada quando o site abriu (ver INICIALIZAÇÃO).
  // Ao reentrar nela, recarrega os dados atuais do CSV.
  // ----------------------------------------------------------

  if (idAba === "tab-patrimonio-consolidado") {

    try {

      await carregarPatrimonio();

    } catch (erro) {

      console.error(
        "Erro ao carregar Patrimônio Consolidado:",
        erro
      );
    }

    return;
  }

  // ----------------------------------------------------------
  // 2. CARTEIRA CONSOLIDADA
  // ----------------------------------------------------------

  if (idAba === "tab-carteira-consolidada") {

    try {

      await atualizarAbaCarteira();

    } catch (erro) {

      console.error(
        "Erro ao atualizar a aba Carteira Consolidada:",
        erro
      );
    }

    return;
  }

  // ----------------------------------------------------------
  // 3 a 6. ABAS AINDA NÃO IMPLEMENTADAS
  // Rentabilidade / Patrimônio (renda) / Tabela Carteira /
  // Tabela Rentabilidade
  // ----------------------------------------------------------

  await chamarModuloFuturo(idAba);
}


function configurarAbas() {

  for (const botao of botoesAbas) {

    botao.addEventListener("click", async () => {
      await ativarAba(botao.dataset.tab);
    });
  }
}


// ============================================================
// BOTÃO "CARREGAR PATRIMÔNIO" (legado no index.html)
// ============================================================
//
// O carregamento agora é automático ao abrir o site, mas o
// botão continua presente no HTML. Ele é mantido como um
// recarregamento manual opcional, usando a função real
// carregarPatrimonio() de aba_patrimonio.js.
// ============================================================

if (btnCarregar) {

  btnCarregar.addEventListener("click", async () => {

    try {

      await carregarPatrimonio();

    } catch (erro) {

      console.error(
        "Erro ao carregar Patrimônio Consolidado:",
        erro
      );
    }
  });
}


// ============================================================
// INICIALIZAÇÃO
// ============================================================

configurarAbas();

iniciarAbaPatrimonio().catch((erro) => {

  console.error(
    "Erro ao iniciar a aba Patrimônio Consolidado:",
    erro
  );
});
