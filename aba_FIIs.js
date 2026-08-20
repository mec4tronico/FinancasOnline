<!-- Container dos Gráficos (em coluna única) -->
<div id="graficos-fiis-container" style="display: flex; flex-direction: column; gap: 20px; margin-bottom: 30px;">
    <!-- GRÁFICO 1 -->
    <div class="chart-card" style="background: #fff; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h3 style="margin-top: 0; color: #333; font-size: 14px;">📊 Rendimentos Mensal e 12M</h3>
        <div id="grafico-rendimentos" style="height: 300px;"></div>
    </div>

    <!-- GRÁFICO 2 -->
    <div class="chart-card" style="background: #fff; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h3 style="margin-top: 0; color: #333; font-size: 14px;">📉 Vacância (Física, Financeira e Média)</h3>
        <div id="grafico-vacancia" style="height: 300px;"></div>
    </div>

    <!-- GRÁFICO 3 -->
    <div class="chart-card" style="background: #fff; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h3 style="margin-top: 0; color: #333; font-size: 14px;">📈 Alavancagem vs CapRate</h3>
        <div id="grafico-alavancagem-caprate" style="height: 300px;"></div>
    </div>

    <!-- GRÁFICO 4 -->
    <div class="chart-card" style="background: #fff; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h3 style="margin-top: 0; color: #333; font-size: 14px;">⭐ Scorecard de Qualidade do FII</h3>
        <div id="grafico-scorecard-fiis" style="max-height: 300px; overflow-y: auto;"></div>
    </div>
</div>

<!-- Cabeçalho com botão -->
<div class="fiis-header">
    <button id="botao-atualizar-fiis" class="btn-atualizar">🔄 ATUALIZAR FIIs</button>
    <span style="font-size: 12px; color: #6c757d; margin-left: 12px;">Busca os indicadores no StatusInvest</span>
    <span id="ultima-atualizacao-fiis" style="margin-left: auto; font-size: 12px; color: #999;">Última atualização: -</span>
</div>

<!-- Container da tabela -->
<div id="tabela-fiis-container"></div>
