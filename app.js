import {
    buscarIndicadoresStatusInvest
} from "./scraping.js";


// ============================================================
// CONFIGURAÇÃO
// ============================================================

const ARQUIVO_CSV = "./patrimonio_consolidado.csv";

const COLUNAS = [
    "Ativo",
    "Tipo",
    "Quantidade",
    "TotalInvestido",
    "DataPrimeiraCompra",
    "DataAtualizacao",
    "ValorAtual",
    "Min52",
    "Max52",
    "DY",
    "Valorizacao",
    "ValorAtualPosicao",
    "LucroPrejuizo",
    "Rentabilidade",
    "PesoCarteira",
    "RendaAnualEstimada",
    "RendaMensalEstimada",
    "ValorPosicaoMax52",
    "ValorPosicaoMin52",
    "PotencialFinanceiroMax52",
    "RiscoFinanceiroMin52"
];


// ============================================================
// ESTADO DO PROGRAMA
// ============================================================

let patrimonio = [];


// ============================================================
// ELEMENTOS DA INTERFACE
// ============================================================

const status = document.getElementById("status");
const resultado = document.getElementById("resultado");
const btnCarregar = document.getElementById("btnCarregar");
const btnScraping = document.getElementById("btnScraping");
const btnBaixar = document.getElementById("btnBaixar");
let btnAtualizarTodos = null;


// ============================================================
// BOTÃO DE ATUALIZAÇÃO COMPLETA
// Criado pelo JavaScript para preservar a estrutura do HTML.
// ============================================================

function criarBotaoAtualizarTodos() {

    if (document.getElementById("btnAtualizarTodos")) {
        return document.getElementById("btnAtualizarTodos");
    }

    const botao = document.createElement("button");

    botao.id = "btnAtualizarTodos";
    botao.textContent = "Atualizar todos";

    if (btnScraping) {
        btnScraping.insertAdjacentElement("afterend", botao);
    } else if (btnBaixar) {
        btnBaixar.insertAdjacentElement("beforebegin", botao);
    }

    return botao;
}


// ============================================================
// MENSAGEM DE STATUS
// ============================================================

function mostrarStatus(mensagem) {

    if (status) {
        status.textContent = mensagem;
    }

    console.log(mensagem);
}


// ============================================================
// LER CSV
// ============================================================

async function carregarCSV() {

    mostrarStatus(
        "Carregando patrimonio_consolidado.csv..."
    );

    const resposta = await fetch(ARQUIVO_CSV);

    if (!resposta.ok) {

        throw new Error(
            `Não foi possível carregar ${ARQUIVO_CSV}`
        );
    }

    const texto = await resposta.text();

    patrimonio = converterCSVParaPatrimonio(texto);

    mostrarStatus(
        `${patrimonio.length} ativos carregados.`
    );

    mostrarPatrimonio();
}


// ============================================================
// CONVERTER CSV → OBJETOS
// ============================================================

function converterCSVParaPatrimonio(texto) {

    const linhas = texto
        .trim()
        .split(/\r?\n/);

    if (linhas.length === 0) {
        throw new Error("CSV vazio.");
    }

    const cabecalho = linhas[0]
        .split(",")
        .map(valor => valor.trim());

    // --------------------------------------------------------
    // VALIDAR 21 COLUNAS
    // --------------------------------------------------------

    if (cabecalho.length !== 21) {

        throw new Error(
            `CSV possui ${cabecalho.length} colunas. ` +
            `Esperadas: 21.`
        );
    }

    // --------------------------------------------------------
    // VALIDAR NOME E ORDEM
    // --------------------------------------------------------

    for (let i = 0; i < COLUNAS.length; i++) {

        if (cabecalho[i] !== COLUNAS[i]) {

            throw new Error(
                `Coluna ${i + 1} incorreta.\n` +
                `Esperada: ${COLUNAS[i]}\n` +
                `Encontrada: ${cabecalho[i]}`
            );
        }
    }

    // --------------------------------------------------------
    // CONVERTER REGISTROS
    // --------------------------------------------------------

    const dados = [];

    for (let i = 1; i < linhas.length; i++) {

        if (!linhas[i].trim()) {
            continue;
        }

        const valores = linhas[i].split(",");

        if (valores.length !== 21) {

            throw new Error(
                `Linha ${i + 1} possui ` +
                `${valores.length} colunas. ` +
                `Esperadas: 21.`
            );
        }

        const registro = {};

        for (let j = 0; j < COLUNAS.length; j++) {

            registro[COLUNAS[j]] =
                valores[j];
        }

        dados.push(registro);
    }

    return dados;
}


// ============================================================
// LOCALIZAR ATIVO
// ============================================================

function encontrarAtivo(ticker) {

    return patrimonio.find(
        item => item.Ativo === ticker
    );
}


// ============================================================
// VALIDAR RESULTADO DO SCRAPING
// ============================================================

function dadosScrapingValidos(dados) {

    if (!dados) {
        return false;
    }

    const camposObrigatorios = [
        "valorAtual",
        "min52",
        "max52",
        "dy",
        "valorizacao"
    ];

    for (const campo of camposObrigatorios) {

        const valor = dados[campo];

        if (
            valor === undefined ||
            valor === null ||
            (typeof valor === "string" && valor.trim() === "") ||
            (typeof valor === "string" && valor.trim() === "ERRO")
        ) {
            return false;
        }
    }

    return true;
}


// ============================================================
// SCRAPING DE TODOS OS ATIVOS
// ============================================================

async function atualizarTodosOsAtivos() {

    if (patrimonio.length === 0) {
        throw new Error(
            "Carregue o patrim\u00f4nio antes de atualizar todos os ativos."
        );
    }

    const total = patrimonio.length;
    let atualizados = 0;
    let erros = 0;
    const mensagens = [];

    function registrarProgresso(mensagem) {

        mensagens.push(mensagem);
        console.log(mensagem);

        if (resultado) {
            resultado.textContent = mensagens.join("\n");
        }
    }

    registrarProgresso("========================================");
    registrarProgresso("SCRAPING DO PATRIM\u00d4NIO");
    registrarProgresso("========================================");

    for (let indice = 0; indice < total; indice++) {

        const registro = patrimonio[indice];

        registrarProgresso("");
        registrarProgresso(
            `Processando ${indice + 1}/${total}: ${registro.Ativo}`
        );
        registrarProgresso(`Tipo: ${registro.Tipo}`);

        try {

            const dados =
                await buscarIndicadoresStatusInvest(
                    registro.Ativo,
                    registro.Tipo
                );

            if (!dadosScrapingValidos(dados)) {

                erros++;
                registrarProgresso("Resultado: ERRO");
                registrarProgresso("Dados anteriores mantidos.");

                continue;
            }

            // Atualiza exclusivamente as colunas 6–11.
            registro.DataAtualizacao = formatarDataAtualizacao();
            registro.ValorAtual = dados.valorAtual;
            registro.Min52 = dados.min52;
            registro.Max52 = dados.max52;
            registro.DY = dados.dy;
            registro.Valorizacao = dados.valorizacao;

            atualizados++;
            registrarProgresso("Resultado: OK");

        } catch (erro) {

            // Nenhuma atribui\u00e7\u00e3o ocorre antes da valida\u00e7\u00e3o, logo as
            // colunas 6–11 permanecem intactas neste caso.
            console.error(
                `Erro no scraping de ${registro.Ativo}:`,
                erro
            );

            erros++;
            registrarProgresso("Resultado: ERRO");
            registrarProgresso("Dados anteriores mantidos.");
        }
    }

    registrarProgresso("");
    registrarProgresso("========================================");
    registrarProgresso("SCRAPING CONCLU\u00cdDO");
    registrarProgresso("========================================");
    registrarProgresso(`Total de ativos: ${total}`);
    registrarProgresso(`Atualizados com sucesso: ${atualizados}`);
    registrarProgresso(`Com erro: ${erros}`);
    registrarProgresso(`Mantidos sem altera\u00e7\u00e3o: ${erros}`);

    mostrarPatrimonio();
    mostrarStatus(
        `Scraping conclu\u00eddo: ${atualizados} atualizados, ${erros} mantidos.`
    );
}


// ============================================================
// ATUALIZAR SOMENTE COLUNAS 6–11
// ============================================================

async function atualizarAtivoComScraping(ticker) {

    const registro = encontrarAtivo(ticker);

    if (!registro) {

        throw new Error(
            `Ativo ${ticker} não encontrado.`
        );
    }

    mostrarStatus(
        `Executando scraping para ${ticker}...`
    );

    console.log(
        `Scraping: ${ticker} / ${registro.Tipo}`
    );

    const dados =
        await buscarIndicadoresStatusInvest(
            registro.Ativo,
            registro.Tipo
        );

    console.log(
        "Resultado do scraping:",
        dados
    );

    // --------------------------------------------------------
    // REGRA FUNDAMENTAL
    //
    // Se qualquer dado obrigatório estiver inválido,
    // NÃO ALTERAR NENHUMA DAS COLUNAS 6–11.
    // --------------------------------------------------------

    if (!dadosScrapingValidos(dados)) {

        mostrarStatus(
            `Scraping de ${ticker} falhou. ` +
            `Dados anteriores foram mantidos.`
        );

        resultado.textContent =
            JSON.stringify(
                dados,
                null,
                2
            );

        return false;
    }

    // --------------------------------------------------------
    // TODOS OS DADOS VÁLIDOS
    // Agora podemos atualizar 6–11.
    // --------------------------------------------------------

    registro.DataAtualizacao =
        formatarDataAtualizacao();

    registro.ValorAtual =
        dados.valorAtual;

    registro.Min52 =
        dados.min52;

    registro.Max52 =
        dados.max52;

    registro.DY =
        dados.dy;

    registro.Valorizacao =
        dados.valorizacao;

    mostrarStatus(
        `${ticker} atualizado com sucesso.`
    );

    resultado.textContent =
        JSON.stringify(
            dados,
            null,
            2
        );

    mostrarPatrimonio();

    return true;
}


// ============================================================
// DATA/HORA
// ============================================================

function formatarDataAtualizacao() {

    const agora = new Date();

    const ano =
        agora.getFullYear();

    const mes =
        String(
            agora.getMonth() + 1
        ).padStart(2, "0");

    const dia =
        String(
            agora.getDate()
        ).padStart(2, "0");

    const hora =
        String(
            agora.getHours()
        ).padStart(2, "0");

    const minuto =
        String(
            agora.getMinutes()
        ).padStart(2, "0");

    const segundo =
        String(
            agora.getSeconds()
        ).padStart(2, "0");

    return (
        `${ano}-${mes}-${dia} ` +
        `${hora}:${minuto}:${segundo}`
    );
}


// ============================================================
// MOSTRAR PATRIMÔNIO
// ============================================================

function mostrarPatrimonio() {

    const tabela =
        document.getElementById("tabela");

    if (!tabela) {
        return;
    }

    tabela.innerHTML = "";

    // --------------------------------------------------------
    // CABEÇALHO
    // --------------------------------------------------------

    const thead =
        document.createElement("thead");

    const linhaCabecalho =
        document.createElement("tr");

    for (const coluna of COLUNAS) {

        const th =
            document.createElement("th");

        th.textContent = coluna;

        linhaCabecalho.appendChild(th);
    }

    thead.appendChild(linhaCabecalho);

    // --------------------------------------------------------
    // CORPO
    // --------------------------------------------------------

    const tbody =
        document.createElement("tbody");

    for (const registro of patrimonio) {

        const tr =
            document.createElement("tr");

        for (const coluna of COLUNAS) {

            const td =
                document.createElement("td");

            td.textContent =
                registro[coluna];

            tr.appendChild(td);
        }

        tbody.appendChild(tr);
    }

    tabela.appendChild(thead);
    tabela.appendChild(tbody);
}


// ============================================================
// GERAR CSV
// ============================================================

function gerarCSV() {

    const linhas = [];

    // Cabeçalho
    linhas.push(
        COLUNAS.join(",")
    );

    // Dados
    for (const registro of patrimonio) {

        const valores =
            COLUNAS.map(
                coluna => registro[coluna]
            );

        linhas.push(
            valores.join(",")
        );
    }

    return linhas.join("\n");
}


// ============================================================
// BAIXAR CSV
// ============================================================

function baixarCSV() {

    const csv =
        gerarCSV();

    const blob =
        new Blob(
            [csv],
            {
                type: "text/csv;charset=utf-8;"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download =
        "patrimonio_consolidado_atualizado.csv";

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

    mostrarStatus(
        "CSV atualizado gerado para download."
    );
}


// ============================================================
// EVENTOS
// ============================================================

if (btnCarregar) {

    btnCarregar.addEventListener(
        "click",
        async () => {

            try {

                await carregarCSV();

            } catch (erro) {

                console.error(erro);

                mostrarStatus(
                    `ERRO: ${erro.message}`
                );
            }
        }
    );
}


if (btnScraping) {

    btnScraping.addEventListener(
        "click",
        async () => {

            try {

                await atualizarAtivoComScraping(
                    "AXIA3"
                );

            } catch (erro) {

                console.error(erro);

                mostrarStatus(
                    `ERRO: ${erro.message}`
                );
            }
        }
    );
}


btnAtualizarTodos = criarBotaoAtualizarTodos();

if (btnAtualizarTodos) {

    btnAtualizarTodos.addEventListener(
        "click",
        async () => {

            btnAtualizarTodos.disabled = true;

            try {

                await atualizarTodosOsAtivos();

            } catch (erro) {

                console.error(erro);

                mostrarStatus(
                    `ERRO: ${erro.message}`
                );

            } finally {

                btnAtualizarTodos.disabled = false;
            }
        }
    );
}


if (btnBaixar) {

    btnBaixar.addEventListener(
        "click",
        baixarCSV
    );
}


// ============================================================
// INICIALIZAÇÃO
// ============================================================

mostrarStatus(
    "Aplicação pronta."
);
