// ============================================================
// ABA MERCADO
// ============================================================
// Estrutura inicial.
// Conteúdo será implementado futuramente.
// ============================================================

function atualizarAbaMercado() {

    const container =
        document.getElementById("tab-mercado");

    if (!container) {

        console.error(
            "[Aba Mercado] Container #tab-mercado não encontrado."
        );

        return;

    }

    container.innerHTML = `
        <div class="placeholder-card">

            <div class="placeholder-icon">
                <i class="fa-solid fa-chart-line"></i>
            </div>

            <span class="badge">
                Em desenvolvimento
            </span>

            <h2>Mercado</h2>

            <p>
                Esta aba ainda vai ser implementada no futuro.
            </p>

        </div>
    `;

}

export {
    atualizarAbaMercado
};
