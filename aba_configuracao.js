/**
 * ============================================================================
 * MÓDULO: CONFIGURAÇÃO (aba_configuracao.js)
 * ============================================================================
 * Responsável por carregar, exibir, gerenciar e salvar os dados da aba Configuração.
 *
 * Arquivo utilizado:
 * patrimonio_consolidado.csv
 *
 * IMPORTANTE:
 * - CSV separado por vírgula.
 * - Campos entre aspas podem conter vírgulas.
 * - Preserva exatamente a ordem das linhas.
 * - Não aplica ordenação.
 * - Compatível com as 40 colunas atuais.
 * ============================================================================
 */

const ARQUIVO_CSV = 'patrimonio_consolidado.csv';

let dadosPatrimonio = [];
let cabecalhosCSV = [];

/**
 * Parser CSV compatível com:
 * - separador por vírgula
 * - campos entre aspas
 * - vírgulas dentro de campos
 * - aspas escapadas como ""
 */
function parseCSV(texto) {
    const linhas = [];
    let linha = [];
    let campo = '';
    let dentroDeAspas = false;

    for (let i = 0; i < texto.length; i++) {
        const caractere = texto[i];
        const proximo = texto[i + 1];

        if (caractere === '"') {
            if (dentroDeAspas && proximo === '"') {
                campo += '"';
                i++;
            } else {
                dentroDeAspas = !dentroDeAspas;
            }
        } else if (caractere === ',' && !dentroDeAspas) {
            linha.push(campo);
            campo = '';
        } else if ((caractere === '\n' || caractere === '\r') && !dentroDeAspas) {
            if (caractere === '\r' && proximo === '\n') {
                i++;
            }

            linha.push(campo);
            campo = '';

            if (linha.some(valor => valor.trim() !== '')) {
                linhas.push(linha);
            }

            linha = [];
        } else {
            campo += caractere;
        }
    }

    if (campo !== '' || linha.length > 0) {
        linha.push(campo);

        if (linha.some(valor => valor.trim() !== '')) {
            linhas.push(linha);
        }
    }

    return linhas;
}

/**
 * Escapa conteúdo para inserção segura no HTML.
 */
function escaparHTML(valor) {
    return String(valor)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
function converterNumeroParaGrafico(valor) {

  if (typeof valor === "number") {

    return Number.isFinite(valor)
      ? valor
      : 0;
  }

  let texto = String(valor ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/%/g, "");

  if (texto.includes(",")) {

    texto = texto
      .replace(/\./g, "")
      .replace(",", ".");
  }

  const numero = Number(texto);

  return Number.isFinite(numero)
    ? numero
    : 0;
}


// ============================================================
// FORMATAR MOEDA
// ============================================================

function formatarMoeda(valor) {

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(valor);
}


// ============================================================
// FORMATAR PERCENTUAL
// ============================================================

function formatarPercentual(valor) {

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(valor) + "%";
}
/**
 * Escapa um campo para gravação em CSV.
 */
function escaparCSV(valor) {
    const texto = String(valor ?? '');

    if (
        texto.includes(',') ||
        texto.includes('"') ||
        texto.includes('\n') ||
        texto.includes('\r')
    ) {
        return `"${texto.replace(/"/g, '""')}"`;
    }

    return texto;
}

/**
 * ============================================================================
 * CARREGAMENTO PRINCIPAL
 * ============================================================================
 */
async function carregarAbaConfiguracao() {
    const container =
        document.getElementById('container-tabela-configuracao') ||
        document.querySelector('.tabela-container');

    try {
        console.log(`[Módulo Configuração] Carregando ${ARQUIVO_CSV}...`);

        if (container) {
            container.innerHTML = `
                <div class="status-carregamento">
                    Carregando Patrimônio Consolidado...
                </div>
            `;
        }

        const timestamp = Date.now();

        const response = await fetch(
            `${ARQUIVO_CSV}?t=${timestamp}`,
            {
                cache: 'no-store'
            }
        );

        if (!response.ok) {
            throw new Error(
                `Erro ao acessar ${ARQUIVO_CSV}. Status: ${response.status}`
            );
        }

        const textoCSV = await response.text();

        if (!textoCSV.trim()) {
            throw new Error('O arquivo CSV está vazio.');
        }

        processarDadosCSV(textoCSV);
        renderizarTabelaConfiguracao();

        console.log(
            `[Módulo Configuração] CSV carregado: ${dadosPatrimonio.length} ativos, ${cabecalhosCSV.length} colunas.`
        );

    } catch (error) {
        console.error(
            '[Módulo Configuração] Erro ao carregar os dados:',
            error
        );

        exibirMensagemErro(
            `Falha ao carregar os dados de configuração. Detalhes: ${error.message}`
        );
    }
}

/**
 * ============================================================================
 * PROCESSAMENTO DO CSV
 * ============================================================================
 */
function processarDadosCSV(textoCSV) {
    const linhas = parseCSV(textoCSV);

    if (linhas.length === 0) {
        dadosPatrimonio = [];
        cabecalhosCSV = [];
        return;
    }

    cabecalhosCSV = linhas[0].map(cabecalho =>
        cabecalho.trim()
    );

    dadosPatrimonio = linhas.slice(1).map(linha => {
        const dados = [...linha];

        // Garante que cada registro tenha exatamente
        // a mesma quantidade de colunas do cabeçalho.
        while (dados.length < cabecalhosCSV.length) {
            dados.push('');
        }

        if (dados.length > cabecalhosCSV.length) {
            dados.length = cabecalhosCSV.length;
        }

        return dados;
    });

    console.log(
        `[Módulo Configuração] Estrutura detectada: ${cabecalhosCSV.length} colunas x ${dadosPatrimonio.length} ativos.`
    );
}

/**
 * ============================================================================
 * RENDERIZAÇÃO
 * ============================================================================
 */
function renderizarTabelaConfiguracao() {
    const container =
        document.getElementById('container-tabela-configuracao') ||
        document.querySelector('.tabela-container');

    if (!container) {
        console.warn(
            '[Módulo Configuração] Container da tabela não encontrado.'
        );
        return;
    }

    let html = `
        <div class="cabecalho-aba">
            <h2>Patrimônio Consolidado</h2>

            <div class="acoes-aba">
                <button
                    id="btn-atualizar-mercado"
                    class="btn-padrao"
                >
                    Atualizar Mercado
                </button>

                <button
                    id="btn-salvar-configuracao"
                    class="btn-padrao btn-sucesso"
                >
                    Salvar Alterações
                </button>
            </div>
        </div>

        <div class="status-tabela">
            ${dadosPatrimonio.length} ativos · ${cabecalhosCSV.length} colunas
        </div>

        <div class="tabela-scroll">
            <table id="tabela-configuracao" class="tabela-dados">
                <thead>
                    <tr>
    `;

    cabecalhosCSV.forEach(cabecalho => {
        html += `<th>${escaparHTML(cabecalho)}</th>`;
    });

    html += `
                    </tr>
                </thead>

                <tbody>
    `;

    if (dadosPatrimonio.length > 0) {

        dadosPatrimonio.forEach((linhaDados, indexLinha) => {

            html += `<tr data-index="${indexLinha}">`;

            linhaDados.forEach((celula, indexColuna) => {

                const texto = String(celula ?? '');

                const numeroNormalizado = texto
                    .replace(/\./g, '')
                    .replace(',', '.')
                    .replace('%', '')
                    .trim();

                const ehNumero =
                    texto !== '' &&
                    !isNaN(Number(numeroNormalizado));

                const classeAlinhamento =
                    ehNumero ? 'text-right' : 'text-left';

                html += `
                    <td
                        contenteditable="true"
                        class="celula-editavel ${classeAlinhamento}"
                        data-col="${indexColuna}"
                    >${escaparHTML(texto)}</td>
                `;
            });

            html += `</tr>`;
        });

    } else {

        html += `
            <tr>
                <td
                    colspan="${cabecalhosCSV.length || 40}"
                    class="text-center"
                >
                    Nenhum dado patrimonial encontrado.
                </td>
            </tr>
        `;
    }

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;

    configurarEventosInterativos();
}

/**
 * ============================================================================
 * EVENTOS
 * ============================================================================
 */
function configurarEventosInterativos() {

    const btnAtualizarMercado =
        document.getElementById('btn-atualizar-mercado');

    if (btnAtualizarMercado) {

        btnAtualizarMercado.addEventListener('click', () => {

            console.log(
                '[Módulo Configuração] Iniciando atualização de mercado...'
            );

            if (
                typeof window.atualizarCotacoesMercado ===
                'function'
            ) {

                window.atualizarCotacoesMercado();

            } else {

                console.warn(
                    '[Módulo Configuração] Função atualizarCotacoesMercado não encontrada.'
                );

                alert(
                    'Módulo de atualização de mercado não encontrado.'
                );
            }
        });
    }

    const btnSalvar =
        document.getElementById('btn-salvar-configuracao');

    if (btnSalvar) {
        btnSalvar.addEventListener(
            'click',
            salvarAbaConfiguracao
        );
    }

    const tabela =
        document.getElementById('tabela-configuracao');

    if (tabela) {

        tabela.addEventListener('input', event => {

            if (
                event.target.tagName === 'TD' &&
                event.target.hasAttribute('contenteditable')
            ) {

                const tr =
                    event.target.closest('tr');

                const indexLinha =
                    Number(tr.getAttribute('data-index'));

                const indexColuna =
                    Number(event.target.getAttribute('data-col'));

                if (
                    dadosPatrimonio[indexLinha] &&
                    !isNaN(indexColuna)
                ) {

                    dadosPatrimonio[indexLinha][indexColuna] =
                        event.target.innerText.trim();
                }
            }
        });
    }
}

/**
 * ============================================================================
 * SALVAR CSV
 * ============================================================================
 */
async function salvarAbaConfiguracao() {

    try {

        console.log(
            `[Módulo Configuração] Salvando ${ARQUIVO_CSV}...`
        );

        let conteudoCSV =
            cabecalhosCSV
                .map(escaparCSV)
                .join(',') +
            '\n';

        dadosPatrimonio.forEach(linha => {

            conteudoCSV +=
                linha
                    .map(escaparCSV)
                    .join(',') +
                '\n';
        });

        const response = await fetch(
            'salvar_csv.php',
            {
                method: 'POST',

                headers: {
                    'Content-Type':
                        'application/x-www-form-urlencoded'
                },

                body:
                    `arquivo=${encodeURIComponent(ARQUIVO_CSV)}` +
                    `&conteudo=${encodeURIComponent(conteudoCSV)}`
            }
        );

        if (!response.ok) {
            throw new Error(
                'Falha ao salvar o arquivo no servidor.'
            );
        }

        alert(
            'Dados da configuração salvos com sucesso!'
        );

        await carregarAbaConfiguracao();

    } catch (error) {

        console.error(
            '[Módulo Configuração] Erro ao salvar:',
            error
        );

        alert(
            `Erro ao salvar os dados: ${error.message}`
        );
    }
}

/**
 * ============================================================================
 * MENSAGEM DE ERRO
 * ============================================================================
 */
function exibirMensagemErro(mensagem) {

    const container =
        document.getElementById(
            'container-tabela-configuracao'
        ) ||
        document.querySelector('.tabela-container');

    if (container) {

        container.innerHTML = `
            <div class="alerta-erro">
                <strong>Erro:</strong>
                ${escaparHTML(mensagem)}
            </div>
        `;
    }
}

/**
 * ============================================================================
 * INICIALIZAÇÃO
 * ============================================================================
 */
function iniciarAbaConfiguracao() {

    console.log(
        '[Módulo Configuração] Inicializando a aba...'
    );

    carregarAbaConfiguracao();
}

/**
 * ============================================================================
 * EXPORTS
 * ============================================================================
 */
export {
    iniciarAbaConfiguracao,
    carregarAbaConfiguracao
};
