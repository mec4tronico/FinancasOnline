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
// - Carregar Ações quando a aba for aberta (NOVO)
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
// IMPORTAÇÃO DA NOVA ABA AÇÕES
// ============================================================================

import {
    iniciarAbaAcoes
} from "./aba_acoes.js";

// ============================================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ============================================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        // ====================================================================
        // 1. INICIALIZAÇÃO DA CARTEIRA
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
        // 3. INICIALIZAÇÃO DA ABA AÇÕES (NOVO)
        // ====================================================================

        try {
            if (
                typeof iniciarAbaAcoes ===
                "function"
            ) {
                iniciarAbaAcoes();
            }
        } catch (erro) {
            console.error(
                "Erro ao iniciar a aba Ações:",
                erro
            );
        }

        // ====================================================================
        // 4. LOCALIZAR BOTÕES DAS ABAS
        // ====================================================================

        const botoesAbas =
            document.querySelectorAll(
                ".tab-button"
            );

        // ====================================================================
        // 5. FUNÇÃO DE NAVEGAÇÃO
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
            // 6. CARREGAR CONTEÚDO DA ABA CONFIGURAÇÃO
            // =================================================================

            if (
                idAbaAlvo ===
                "tab-configuracao"
            ) {

                try {

                    const resultado =
                        carregarAbaConfiguracao();

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
            // 7. CARREGAR ABA RENTABILIDADE
            // =================================================================

            if (
                idAbaAlvo ===
                "tab-rentabilidade"
            ) {

                try {

                    const resultado =
                        atualizarAbaRentabilidade();

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
            // 8. CARREGAR ABA MERCADO
            // =================================================================

            if (
                idAbaAlvo ===
                "tab-mercado"
            ) {

                try {

                    const resultado =
                        atualizarAbaMercado();

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

            // =================================================================
            // 9. CARREGAR ABA AÇÕES (NOVO)
            // =================================================================
            //
            // A aba Ações é carregada somente quando acessada.
            //
            // =================================================================

            if (
                idAbaAlvo ===
                "tab-acoes"
            ) {

                try {

                    const resultado =
                        iniciarAbaAcoes();

                    if (
                        resultado &&
                        typeof resultado.catch ===
                        "function"
                    ) {

                        resultado.catch(
                            erro => {

                                console.error(
                                    "Erro ao carregar a aba Ações:",
                                    erro
                                );

                            }
                        );

                    }

                } catch (erro) {

                    console.error(
                        "Erro ao carregar a aba Ações:",
                        erro
                    );

                }

            }

        }

        // ====================================================================
        // 10. REGISTRAR CLIQUES DOS BOTÕES DAS ABAS
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
        // 11. ABRIR CARTEIRA AUTOMATICAMENTE
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
