// ============================================================================
// APP.JS
// ============================================================================
//
// Responsável por:
//
// - Inicializar a aplicação
// - Inicializar a aba Carteira automaticamente
// - Inicializar a aba Configuração
// - Controlar a navegação entre as abas
// - Carregar Rentabilidade quando a aba for aberta
// - Carregar Mercado quando a aba for aberta
//
// ============================================================================


// ============================================================================
// IMPORTAÇÕES
// ============================================================================

import {
    atualizarAbaCarteira
} from "./aba_carteira.js";


import {
    iniciarAbaConfiguracao,
    carregarAbaConfiguracao
} from "./aba_configuracao.js";


import {
    atualizarAbaRentabilidade
} from "./aba_rentabilidade.js";


import {
    atualizarAbaMercado
} from "./aba_mercado.js";

// ============================================================================
// APP.JS (com adições para ABA AÇÕES)
// ============================================================================

import { iniciarAbaAcoes } from "./aba_acoes.js";


// ============================================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ============================================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {


        // ====================================================================
        // 1. INICIALIZAÇÃO DA CARTEIRA
        // ====================================================================
        //
        // A Carteira é a primeira aba.
        //
        // Ela deve ser carregada automaticamente quando o site abrir.
        //
        // Carrega:
        // - KPIs
        // - Gráfico de distribuição
        // - Gráfico de patrimônio por classe
        // - Gráfico de lucro/prejuízo
        // - Tabela da carteira
        //
        // ====================================================================

        atualizarAbaCarteira()
            .catch(
                erro => {

                    console.error(
                        "Erro ao inicializar a aba Carteira:",
                        erro
                    );

                }
            );


        // ====================================================================
        // 2. INICIALIZAÇÃO DA CONFIGURAÇÃO
        // ====================================================================
        //
        // A Configuração precisa ser inicializada uma vez para preparar
        // seus controles e eventos.
        //
        // O carregamento dos dados continua acontecendo quando a aba
        // for acessada.
        //
        // ====================================================================

        try {

            if (
                typeof iniciarAbaConfiguracao ===
                "function"
            ) {

                iniciarAbaConfiguracao();

            }

        } catch (erro) {

            console.error(
                "Erro ao iniciar a aba Configuração:",
                erro
            );

        }
        
        // ====================================================================
        // 2.5 INICIALIZAÇÃO DA ABA AÇÕES
        // ====================================================================

        try {
            if (typeof iniciarAbaAcoes === "function") {
                iniciarAbaAcoes();
            }
        } catch (erro) {
            console.error("Erro ao iniciar a aba Ações:", erro);
        }


        // ====================================================================
        // 3. LOCALIZAR BOTÕES DAS ABAS
        // ====================================================================

        const botoesAbas =
            document.querySelectorAll(
                ".tab-button"
            );


        // ====================================================================
        // 4. FUNÇÃO DE NAVEGAÇÃO
        // ====================================================================

        function navegarPara(idAbaAlvo) {


            // =================================================================
            // PERCORRER TODAS AS ABAS
            // =================================================================

            botoesAbas.forEach(
                botao => {


                    const idAba =
                        botao.dataset.tab;


                    const section =
                        document.getElementById(
                            idAba
                        );


                    // =========================================================
                    // ABA ATIVA
                    // =========================================================

                    if (
                        idAba === idAbaAlvo
                    ) {

                        botao.classList.add(
                            "active"
                        );


                        botao.setAttribute(
                            "aria-selected",
                            "true"
                        );


                        if (section) {

                            section.removeAttribute(
                                "hidden"
                            );


                            section.style.display =
                                "block";


                            section.classList.add(
                                "active"
                            );

                        }

                    }


                    // =========================================================
                    // DEMAIS ABAS
                    // =========================================================

                    else {

                        botao.classList.remove(
                            "active"
                        );


                        botao.setAttribute(
                            "aria-selected",
                            "false"
                        );


                        if (section) {

                            section.setAttribute(
                                "hidden",
                                ""
                            );


                            section.style.display =
                                "none";


                            section.classList.remove(
                                "active"
                            );

                        }

                    }

                }
            );


            // =================================================================
            // 5. CARREGAR CONTEÚDO DA ABA CONFIGURAÇÃO
            // =================================================================
            //
            // Sempre que a aba Configuração for aberta,
            // seus dados são recarregados.
            //
            // =================================================================

            if (
                idAbaAlvo ===
                "tab-configuracao"
            ) {

                try {

                    const resultado =
                        carregarAbaConfiguracao();


                    // Caso a função seja assíncrona,
                    // também capturamos erros da Promise.

                    if (
                        resultado &&
                        typeof resultado.catch ===
                        "function"
                    ) {

                        resultado.catch(
                            erro => {

                                console.error(
                                    "Erro ao carregar a aba Configuração:",
                                    erro
                                );

                            }
                        );

                    }

                } catch (erro) {

                    console.error(
                        "Erro ao carregar a aba Configuração:",
                        erro
                    );

                }

            }


            // =================================================================
            // 6. CARREGAR ABA RENTABILIDADE
            // =================================================================
            //
            // A Rentabilidade não é carregada na inicialização.
            //
            // Ela é carregada somente quando o usuário clicar nela.
            //
            // =================================================================

            if (
                idAbaAlvo ===
                "tab-rentabilidade"
            ) {

                try {

                    const resultado =
                        atualizarAbaRentabilidade();


                    // Captura erros caso a função seja assíncrona.

                    if (
                        resultado &&
                        typeof resultado.catch ===
                        "function"
                    ) {

                        resultado.catch(
                            erro => {

                                console.error(
                                    "Erro ao carregar a aba Rentabilidade:",
                                    erro
                                );

                            }
                        );

                    }

                } catch (erro) {

                    console.error(
                        "Erro ao carregar a aba Rentabilidade:",
                        erro
                    );

                }

            }


            // =================================================================
            // 7. CARREGAR ABA MERCADO
            // =================================================================
            //
            // A aba Mercado também é carregada somente quando acessada.
            //
            // =================================================================

            if (
                idAbaAlvo ===
                "tab-mercado"
            ) {

                try {

                    const resultado =
                        atualizarAbaMercado();


                    // Captura erros caso a função seja assíncrona.

                    if (
                        resultado &&
                        typeof resultado.catch ===
                        "function"
                    ) {

                        resultado.catch(
                            erro => {

                                console.error(
                                    "Erro ao carregar a aba Mercado:",
                                    erro
                                );

                            }
                        );

                    }

                } catch (erro) {

                    console.error(
                        "Erro ao carregar a aba Mercado:",
                        erro
                    );

                }

            }

        }
        // ====================================================================
        // 6.5 CARREGAR ABA AÇÕES
        // ====================================================================

        if (idAbaAlvo === "tab-acoes") {
            try {
                const resultado = iniciarAbaAcoes();
                if (resultado && typeof resultado.catch === "function") {
                    resultado.catch(erro => {
                        console.error("Erro ao carregar a aba Ações:", erro);
                    });
                }
            } catch (erro) {
                console.error("Erro ao carregar a aba Ações:", erro);
            }
        }

        // ====================================================================
        // 8. REGISTRAR CLIQUES DOS BOTÕES DAS ABAS
        // ====================================================================

        botoesAbas.forEach(
            botao => {


                const idAlvo =
                    botao.dataset.tab;


                if (!idAlvo) {

                    return;

                }


                botao.addEventListener(
                    "click",
                    () => {

                        navegarPara(
                            idAlvo
                        );

                    }
                );

            }
        );


        // ====================================================================
        // 9. ABRIR CARTEIRA AUTOMATICAMENTE
        // ====================================================================
        //
        // A Carteira é a primeira aba da aplicação.
        //
        // Portanto, ao abrir o site:
        //
        // - Carteira fica visível
        // - As outras abas ficam ocultas
        // - O botão Carteira recebe a classe "active"
        //
        // ====================================================================

        const primeiraAbaCarteira =
            document.getElementById(
                "tab-carteira"
            );


        if (
            primeiraAbaCarteira
        ) {

            navegarPara(
                "tab-carteira"
            );

        } else {

            console.error(
                "A aba Carteira (#tab-carteira) não foi encontrada no HTML."
            );

        }

    }
);
