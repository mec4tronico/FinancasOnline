import {
    buscarIndicadoresStatusInvest
} from "./scraping.js";


// ============================================================
// CONFIGURAÇÃO
// ============================================================

const ARQUIVO_CSV =
    "https://raw.githubusercontent.com/mec4tronico/FinancasOnline/main/" +
    "patrimonio_consolidado.csv";
const URL_WORKER_CSV =
    "https://financasonline-csv.augusto-gouveia2000.workers.dev/";

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
const botoesAbas = document.querySelectorAll(".tab-button");
const conteudosAbas = document.querySelectorAll(".tab-content");
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

    if (btnCarregar) {
        btnCarregar.insertAdjacentElement("afterend", botao);
    }

    return botao;
}


// ============================================================
// NAVEGAÇÃO POR ABAS
// ============================================================

function ativarAba(idAba) {

    for (const botao of botoesAbas) {

        const estaAtiva = botao.dataset.tab === idAba;

        botao.classList.toggle("active", estaAtiva);
        botao.setAttribute("aria-selected", String(estaAtiva));
    }

    for (const conteudo of conteudosAbas) {

        const estaAtiva = conteudo.id === idAba;

        conteudo.classList.toggle("active", estaAtiva);
        conteudo.hidden = !estaAtiva;
    }
}


function configurarAbas() {

    for (const botao of botoesAbas) {

        botao.addEventListener("click", () => {
            ativarAba(botao.dataset.tab);
        });
    }
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

async function carregarCSV(forcarAtualizacao = false) {

    mostrarStatus(
        "Carregando patrimonio_consolidado.csv do GitHub..."
    );

    const urlCSV = forcarAtualizacao
        ? `${ARQUIVO_CSV}?atualizadoEm=${Date.now()}`
        : ARQUIVO_CSV;

    const resposta = await fetch(urlCSV, {
        cache: "no-store"
    });

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

    const cabecalho = separarLinhaCSV(linhas[0])
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

        const valores = separarLinhaCSV(linhas[i]);

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
// LER LINHA CSV
// Aceita valores entre aspas, incluindo vírgulas decimais como
// "49,84" e aspas escapadas no padrão CSV ("").
// ============================================================

function separarLinhaCSV(linha) {

    const valores = [];
    let valorAtual = "";
    let dentroDeAspas = false;

    for (let indice = 0; indice < linha.length; indice++) {

        const caractere = linha[indice];

        if (caractere === '"') {

            if (
                dentroDeAspas &&
                linha[indice + 1] === '"'
            ) {

                valorAtual += '"';
                indice++;

            } else {

                dentroDeAspas = !dentroDeAspas;
            }

        } else if (caractere === "," && !dentroDeAspas) {

            valores.push(valorAtual);
            valorAtual = "";

        } else {

            valorAtual += caractere;
        }
    }

    if (dentroDeAspas) {
        throw new Error("CSV possui aspas não fechadas.");
    }

    valores.push(valorAtual);

    return valores;
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

    registrarProgresso("");
    registrarProgresso("Gravando patrimonio_consolidado.csv...");

    const respostaGravacao = await gravarPatrimonioNoWorker();

    registrarProgresso("CSV gravado com sucesso no GitHub.");

    if (respostaGravacao.commit) {
        registrarProgresso(
            `Commit: ${respostaGravacao.commit}`
        );
    }

    registrarProgresso("Recarregando patrimônio gravado...");

    try {

        await carregarCSV(true);
        registrarProgresso("Tabela recarregada com os dados gravados.");

    } catch (erro) {

        console.error("Erro ao recarregar CSV gravado:", erro);
        registrarProgresso(
            "CSV foi gravado, mas não foi possível recarregá-lo agora."
        );
    }

    mostrarStatus(
        `Scraping e grava\u00e7\u00e3o conclu\u00eddos: ` +
        `${atualizados} atualizados, ${erros} mantidos.`
    );
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
// GERAR E GRAVAR CSV
// ============================================================

function gerarCSVPatrimonio() {

    const linhas = [COLUNAS.join(",")];

    for (const registro of patrimonio) {

        const valores = COLUNAS.map(coluna =>
            escaparValorCSV(registro[coluna])
        );

        linhas.push(valores.join(","));
    }

    return linhas.join("\n");
}


function escaparValorCSV(valor) {

    if (valor === undefined || valor === null) {
        return "";
    }

    const texto = String(valor);

    if (
        texto.includes(",") ||
        texto.includes('"') ||
        texto.includes("\n") ||
        texto.includes("\r")
    ) {
        return `"${texto.replace(/"/g, '""')}"`;
    }

    return texto;
}


async function gravarPatrimonioNoWorker() {

    const resposta = await fetch(URL_WORKER_CSV, {
        method: "POST",
        headers: {
            "Content-Type": "text/csv; charset=UTF-8"
        },
        body: gerarCSVPatrimonio()
    });

    let dados;

    try {
        dados = await resposta.json();
    } catch {
        throw new Error(
            `Worker de CSV retornou uma resposta inv\u00e1lida (HTTP ${resposta.status}).`
        );
    }

    if (!resposta.ok || !dados.sucesso) {
        throw new Error(
            dados.erro ||
            `Worker de CSV retornou HTTP ${resposta.status}.`
        );
    }

    return dados;
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


// ============================================================
// INICIALIZAÇÃO
// ============================================================

configurarAbas();

mostrarStatus(
    "Aplicação pronta."
);
