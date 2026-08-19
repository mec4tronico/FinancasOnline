import { atualizarAbaCarteira } from "./aba_carteira.js";
import {
    iniciarAbaConfiguracao,
    carregarAbaConfiguracao
} from "./aba_configuracao.js";


document.addEventListener("DOMContentLoaded", () => {

    // ===================================================================
    // 1. INICIALIZAÇÃO DA CARTEIRA
    // ===================================================================
    //
    // A Carteira é a primeira aba e deve carregar automaticamente:
    // - KPIs
    // - 3 gráficos
    // - tabela da carteira
    //
    // Tudo é carregado pelo aba_carteira.js
    //

    atualizarAbaCarteira()
        .catch(erro => {

            console.error(
                "Erro ao inicializar a aba Carteira:",
                erro
            );

        });


    // ===================================================================
    // 2. INICIALIZAÇÃO DA CONFIGURAÇÃO
    // ===================================================================

    try {

        if (
            typeof iniciarAbaConfiguracao === "function"
        ) {

            iniciarAbaConfiguracao();

        }

    } catch (erro) {

        console.error(
            "Erro ao iniciar a aba Configuração:",
            erro
        );

    }


    // ===================================================================
    // 3. NAVEGAÇÃO ENTRE ABAS
    // ===================================================================

    const botoesAbas =
        document.querySelectorAll(".tab-button");


    function navegarPara(idAbaAlvo) {

        botoesAbas.forEach(botao => {

            const idAba =
                botao.dataset.tab;

            const section =
                document.getElementById(idAba);


            // -----------------------------------------------------------
            // ABA ATIVA
            // -----------------------------------------------------------

            if (
                idAba === idAbaAlvo
            ) {

                botao.classList.add("active");

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


            // -----------------------------------------------------------
            // DEMAIS ABAS
            // -----------------------------------------------------------

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

        });


        // ===================================================================
        // 4. CONFIGURAÇÃO
        // ===================================================================
        //
        // Quando entrar na Configuração, o CSV completo é recarregado.
        //

        if (
            idAbaAlvo ===
            "tab-configuracao"
        ) {

            try {

                carregarAbaConfiguracao();

            } catch (erro) {

                console.error(
                    "Erro ao carregar a aba Configuração:",
                    erro
                );

            }

        }

    }


    // ===================================================================
    // 5. REGISTRAR CLIQUES DAS ABAS
    // ===================================================================

    botoesAbas.forEach(botao => {

        const idAlvo =
            botao.dataset.tab;


        if (!idAlvo) {
            return;
        }


        botao.addEventListener(
            "click",
            () => {

                navegarPara(idAlvo);

            }
        );

    });


    // ===================================================================
    // 6. ABRIR CARTEIRA AUTOMATICAMENTE
    // ===================================================================

    const primeiraAbaCarteira =
        document.getElementById(
            "tab-carteira"
        );


    if (primeiraAbaCarteira) {

        navegarPara(
            "tab-carteira"
        );

    }

});
