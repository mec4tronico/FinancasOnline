// ============================================================
// APP.JS
// ============================================================
//
// Responsabilidade:
//
// 1. Organizar a navegação entre as 7 abas
// 2. Iniciar a aba CARTEIRA ao abrir o site
// 3. Iniciar a aba CONFIGURAÇÃO quando ela for acessada
// 4. Não implementar lógica das abas que ainda não possuem módulo
//
// Estrutura:
//
// 1. CARTEIRA
// 2. TABELA CARTEIRA
// 3. RENTABILIDADE
// 4. TABELA RENTABILIDADE
// 5. MERCADO
// 6. TABELA MERCADO
// 7. CONFIGURAÇÃO
//
// ============================================================


// ============================================================
// MÓDULO CARTEIRA
// ============================================================

import {
  atualizarAbaCarteira
} from "./aba_carteira.js";


// ============================================================
// MÓDULO CONFIGURAÇÃO
// ============================================================
//
// O antigo aba_patrimonio.js foi renomeado para:
//
// aba_configuracao.js
//
// Neste momento mantemos as funções que já existiam no módulo
// antigo, para não alterar a lógica interna dele.
// ============================================================

import {
  iniciarAbaPatrimonio,
  carregarPatrimonio
} from "./aba_configuracao.js";


// ============================================================
// ELEMENTOS DA INTERFACE
// ============================================================

const botoesAbas = document.querySelectorAll(".tab-button");
const conteudosAbas = document.querySelectorAll(".tab-content");


// ============================================================
// NAVEGAÇÃO POR ABAS
// ============================================================

async function ativarAba(idAba) {

  // ----------------------------------------------------------
  // Ativa o botão correspondente
  // ----------------------------------------------------------

  for (const botao of botoesAbas) {

    const estaAtiva = botao.dataset.tab === idAba;

    botao.classList.toggle("active", estaAtiva);

    botao.setAttribute(
      "aria-selected",
      String(estaAtiva)
    );
  }


  // ----------------------------------------------------------
  // Mostra somente o conteúdo da aba selecionada
  // ----------------------------------------------------------

  for (const conteudo of conteudosAbas) {

    const estaAtiva = conteudo.id === idAba;

    conteudo.classList.toggle(
      "active",
      estaAtiva
    );

    conteudo.hidden = !estaAtiva;
  }


  // ==========================================================
  // 1. CARTEIRA
  // ==========================================================

  if (idAba === "tab-carteira") {

    try {

      await atualizarAbaCarteira();

    } catch (erro) {

      console.error(
        "Erro ao atualizar a aba Carteira:",
        erro
      );

    }

    return;
  }


  // ==========================================================
  // 2. TABELA CARTEIRA
  // ==========================================================
  //
  // Ainda não possui módulo próprio.
  // Não executar nenhuma lógica aqui.
  // ==========================================================

  if (idAba === "tab-tabela-carteira") {
    return;
  }


  // ==========================================================
  // 3. RENTABILIDADE
  // ==========================================================
  //
  // Ainda não possui módulo próprio.
  // ==========================================================

  if (idAba === "tab-rentabilidade") {
    return;
  }


  // ==========================================================
  // 4. TABELA RENTABILIDADE
  // ==========================================================
  //
  // Ainda não possui módulo próprio.
  // ==========================================================

  if (idAba === "tab-tabela-rentabilidade") {
    return;
  }


  // ==========================================================
  // 5. MERCADO
  // ==========================================================
  //
  // Ainda não possui módulo próprio.
  // ==========================================================

  if (idAba === "tab-mercado") {
    return;
  }


  // ==========================================================
  // 6. TABELA MERCADO
  // ==========================================================
  //
  // Ainda não possui módulo próprio.
  // ==========================================================

  if (idAba === "tab-tabela-mercado") {
    return;
  }


  // ==========================================================
  // 7. CONFIGURAÇÃO
  // ==========================================================
  //
  // É o módulo que substituiu aba_patrimonio.js.
  //
  // A tabela completa e o botão Atualizar Mercado continuam
  // sendo responsabilidade do aba_configuracao.js.
  // ==========================================================

  if (idAba === "tab-configuracao") {

    try {

      await carregarPatrimonio();

    } catch (erro) {

      console.error(
        "Erro ao carregar a aba Configuração:",
        erro
      );

    }

    return;
  }

}


// ============================================================
// CONFIGURAÇÃO DOS BOTÕES DAS ABAS
// ============================================================

function configurarAbas() {

  for (const botao of botoesAbas) {

    botao.addEventListener(
      "click",
      async () => {

        await ativarAba(
          botao.dataset.tab
        );

      }
    );

  }

}


// ============================================================
// INICIALIZAÇÃO
// ============================================================
//
// A aba principal agora é CARTEIRA.
//
// Portanto, ao abrir o site:
//
// CARTEIRA → atualiza automaticamente.
//
// A CONFIGURAÇÃO não é aberta automaticamente.
// ============================================================

configurarAbas();


atualizarAbaCarteira().catch((erro) => {

  console.error(
    "Erro ao iniciar a aba Carteira:",
    erro
  );

});
