import { atualizarAbaCarteira } from "./aba_carteira.js";
import { iniciarAbaConfiguracao, carregarAbaConfiguracao } from "./aba_configuracao.js";

document.addEventListener("DOMContentLoaded", () => {
    // ===================================================================
    // 1. INICIALIZAÇÃO DA CARTEIRA (REGRA PRINCIPAL)
    // ===================================================================
    // A aba Carteira é atualizada automaticamente e de forma independente
    // na inicialização do site.
    try {
        atualizarAbaCarteira();
    } catch (e) {
        console.error("Erro ao atualizar a aba carteira:", e);
    }

    // Inicializa a aba de configuração (para preparar listeners de botões internos, se houver)
    try {
        if (typeof iniciarAbaConfiguracao === "function") {
            iniciarAbaConfiguracao();
        }
    } catch (e) {
        console.error("Erro ao iniciar a aba de configuração:", e);
    }

    // ===================================================================
    // 2. ESTRUTURA OFICIAL DAS 7 ABAS
    // ===================================================================
    // IDs baseados na estrutura do index.html
    const abasOficiais = [
        "carteira",
        "tabela-carteira",
        "rentabilidade",
        "tabela-rentabilidade",
        "mercado",
        "tabela-mercado",
        "configuracao"
    ];

    // Lógica central de navegação visual
    function navegarPara(abaAlvo) {
        abasOficiais.forEach(aba => {
            // Suporte aos IDs mais comuns utilizados no index.html
            const section = document.getElementById(aba) || document.getElementById(`aba-${aba}`);
            const btn = document.getElementById(`btn-${aba}`) || document.getElementById(`nav-${aba}`);

            // Controle de visibilidade dos sections
            if (section) {
                if (aba === abaAlvo) {
                    section.style.display = "block"; // Mostra o section correspondente
                    section.classList.add("active");
                } else {
                    section.style.display = "none";  // Esconde os demais
                    section.classList.remove("active");
                }
            }

            // Controle visual dos botões
            if (btn) {
                if (aba === abaAlvo) {
                    btn.classList.add("active");     // Ativa o botão correspondente
                } else {
                    btn.classList.remove("active");
                }
            }
        });

        // ===================================================================
        // 3. EXECUÇÃO DE LÓGICA ESPECÍFICA AO ABRIR ABA
        // ===================================================================
        if (abaAlvo === "configuracao") {
            try {
                carregarAbaConfiguracao();
            } catch (e) {
                console.error("Erro ao carregar os dados da aba de Configuração:", e);
            }
        }
        
        // NOTA: As abas sem módulo (como Tabela Carteira, Mercado, etc)
        // passam apenas pelo controle visual do loop e não chamam funções inexistentes.
    }

    // ===================================================================
    // 4. REGISTRAR EVENTOS DE NAVEGAÇÃO
    // ===================================================================
    abasOficiais.forEach(aba => {
        const btn = document.getElementById(`btn-${aba}`) || document.getElementById(`nav-${aba}`);
        if (btn) {
            btn.addEventListener("click", () => {
                navegarPara(aba);
            });
        }
    });

    // ===================================================================
    // 5. ABRIR SITE AUTOMATICAMENTE NA PRIMEIRA ABA: CARTEIRA
    // ===================================================================
    navegarPara("carteira");
});
