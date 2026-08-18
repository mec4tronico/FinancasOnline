import { atualizarAbaCarteira } from "./aba_carteira.js";
import { iniciarAbaConfiguracao, carregarAbaConfiguracao } from "./aba_configuracao.js";

document.addEventListener("DOMContentLoaded", () => {
    // ===================================================================
    // 1. INICIALIZAÇÃO DA CARTEIRA (REGRA PRINCIPAL)
    // ===================================================================
    // Executa imediatamente para carregar os gráficos da Carteira sem depender de cliques
    try {
        atualizarAbaCarteira();
    } catch (e) {
        console.error("Erro ao inicializar a aba carteira:", e);
    }

    // Inicializa a aba de configuração (listeners internos, se houver)
    try {
        if (typeof iniciarAbaConfiguracao === "function") {
            iniciarAbaConfiguracao();
        }
    } catch (e) {
        console.error("Erro ao iniciar a aba de configuração:", e);
    }

    // ===================================================================
    // 2. NAVEGAÇÃO DINÂMICA BASEADA NO HTML (.tab-button e data-tab)
    // ===================================================================
    const botoesAbas = document.querySelectorAll(".tab-button");

    function navegarPara(idAbaAlvo) {
        botoesAbas.forEach(botao => {
            const dataTabBotao = botao.dataset.tab;
            const sectionReal = document.getElementById(dataTabBotao);

            if (dataTabBotao === idAbaAlvo) {
                // Ativa o botão correspondente
                botao.classList.add("active");
                botao.setAttribute("aria-selected", "true");

                // Mostra a section correspondente
                if (sectionReal) {
                    sectionReal.removeAttribute("hidden");
                    sectionReal.style.display = "block";
                    sectionReal.classList.add("active");
                }
            } else {
                // Desativa os demais botões
                botao.classList.remove("active");
                botao.setAttribute("aria-selected", "false");

                // Esconde as outras sections
                if (sectionReal) {
                    sectionReal.setAttribute("hidden", "");
                    sectionReal.style.display = "none";
                    sectionReal.classList.remove("active");
                }
            }
        });

        // ===================================================================
        // 3. LÓGICA DE EXECUÇÃO DA ABA CONFIGURAÇÃO
        // ===================================================================
        if (idAbaAlvo && idAbaAlvo.toLowerCase().includes("configuracao")) {
            try {
                carregarAbaConfiguracao();
            } catch (e) {
                console.error("Erro ao carregar os dados da aba de Configuração:", e);
            }
        }
    }

    // ===================================================================
    // 4. REGISTRAR EVENTOS DE CLIQUE NOS BOTÕES
    // ===================================================================
    let primeiraAbaCarteira = null;

    botoesAbas.forEach(botao => {
        const idAlvo = botao.dataset.tab;

        // Identifica qual data-tab pertence à Carteira principal
        if (idAlvo && idAlvo.toLowerCase().includes("carteira") && !idAlvo.toLowerCase().includes("tabela")) {
            primeiraAbaCarteira = idAlvo;
        }

        if (idAlvo) {
            botao.addEventListener("click", () => {
                navegarPara(idAlvo);
            });
        }
    });

    // ===================================================================
    // 5. ABRIR SITE AUTOMATICAMENTE NA PRIMEIRA ABA (CARTEIRA)
    // ===================================================================
    if (primeiraAbaCarteira) {
        navegarPara(primeiraAbaCarteira);
    } else if (botoesAbas.length > 0) {
        navegarPara(botoesAbas[0].dataset.tab);
    }
});
