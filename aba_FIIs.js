// ============================================================
// ABA FIIs
// ============================================================
// Estrutura inicial.
// Conteúdo será implementado futuramente.
// ============================================================

function atualizarAbaFIIs() {

    const container =
        document.getElementById("tab-FIIs");

    if (!container) {

        console.error(
            "[Aba FIIs] Container #tab-FIIs não encontrado."
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

            <h2>FIIs</h2>

            <p>
                Esta aba ainda vai ser implementada no futuro.
            </p>

        </div>
    `;

}

export {
    atualizarAbaFIIs
};
