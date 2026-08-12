// Configuração do Proxy CORS para rodar no GitHub Pages sem bloqueio
const CORS_PROXY = "https://api.allorigins.win/raw?url=";

// Intervalo de segurança entre requisições (1.5 segundos)
const DELAY_BETWEEN_REQUESTS_MS = 1500;

document.addEventListener("DOMContentLoaded", () => {
    iniciarProcessamento();
});

async function iniciarProcessamento() {
    try {
        // 1. Ler o CSV original do GitHub
        const resposta = await fetch("./carteira_b3_consolidada.csv");
        if (!resposta.ok) throw new Error("Não foi possível carregar o CSV original.");
        
        const textoCSV = await resposta.text();
        const linhas = processarCSV(textoCSV);

        if (linhas.length <= 1) {
            console.error("Arquivo CSV vazio ou sem dados válidos.");
            return;
        }

        const cabecalhos = linhas[0];
        const dados = linhas.slice(1);

        // 2. Preencher a Tabela 1 (Dados Originais do CSV)
        preencherTabela1(cabecalhos, dados);

        // 3. Extrair Tickers da 1ª Coluna
        const tickers = dados.map(linha => linha[0].trim().toUpperCase()).filter(t => t.length > 0);

        // 4. Iniciar o Loop de Scraping no Status Invest
        await executarLoopScraping(tickers);

    } catch (erro) {
        console.error("Erro no fluxo principal:", erro);
    }
}

// Converte texto bruto em formato de linhas e colunas
function processarCSV(texto) {
    const linhas = texto.trim().split("\n");
    return linhas.map(linha => {
        // Suporta delimitadores por vírgula ou ponto e vírgula
        const delimitador = linha.includes(";") ? ";" : ",";
        return linha.split(delimitador).map(celula => celula.replace(/^["']|["']$/g, "").trim());
    });
}

// Renderiza a Tabela 1
function preencherTabela1(cabecalhos, dados) {
    const tbody = document.querySelector("#tabela-original tbody");
    tbody.innerHTML = "";

    dados.forEach(linha => {
        const tr = document.createElement("tr");
        linha.forEach(celula => {
            const td = document.createElement("td");
            td.textContent = celula;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

// Executa o Loop Sequencial de Busca com Delay
async function executarLoopScraping(tickers) {
    const tbodyScraping = document.querySelector("#tabela-scraping tbody");
    tbodyScraping.innerHTML = "";

    for (const ticker of tickers) {
        // Linha temporária com status "Carregando"
        const tr = document.createElement("tr");
        tr.id = `ticker-${ticker}`;
        tr.innerHTML = `
            <td><strong>${ticker}</strong></td>
            <td colspan="5" class="carregando">Buscando dados no Status Invest...</td>
        `;
        tbodyScraping.appendChild(tr);

        // Busca dados no Status Invest
        const dadosAtivo = await buscarIndicadoresStatusInvest(ticker);

        // Atualiza a linha com os dados extraídos ou com ERRO
        renderizarLinhaScraping(tr, ticker, dadosAtivo);

        // Pausa para evitar bloqueio por excesso de requisições
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS_MS));
    }
}

// Tradução da lógica Python (Requests + BeautifulSoup) para JS (Fetch + DOMParser)
async function buscarIndicadoresStatusInvest(ticker) {
    // Retorno padrão em caso de erro absoluto
    const respostaErro = {
        valorAtual: "ERRO",
        min52: "ERRO",
        max52: "ERRO",
        dy: "ERRO",
        valorizacao: "ERRO"
    };

    try {
        // Tickers de FIIs geralmente terminam em 11 (ex: KNCR11). Ações em 3, 4, 5, 6, 34.
        const ehFII = ticker.endsWith("11");
        const categoria = ehFII ? "fundos-imobiliarios" : "acoes";
        
        let urlAlvo = `https://statusinvest.com.br/${categoria}/${ticker.toLowerCase()}`;
        let htmlText = await realizarFetchComProxy(urlAlvo);

        // Se a primeira tentativa falhar e for ticker 11 (pode ser BDR ou Ação Unit), tenta a rota de ações
        if (!htmlText && ehFII) {
            urlAlvo = `https://statusinvest.com.br/acoes/${ticker.toLowerCase()}`;
            htmlText = await realizarFetchComProxy(urlAlvo);
        }

        if (!htmlText) return respostaErro;

        // Converter texto HTML recebido em documento navegável via DOM
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");

        // Função interna que replica a lógica da função 'get_value_by_title' do seu Python
        const getValueByTitle = (titleText) => {
            try {
                const elementos = doc.querySelectorAll("h3, small, span");
                for (const elem of elementos) {
                    if (elem.textContent.toUpperCase().includes(titleText.toUpperCase())) {
                        const parent = elem.closest("div");
                        if (parent) {
                            const valElem = parent.querySelector("strong.value");
                            if (valElem) return valElem.textContent.trim();
                        }
                    }
                }
            } catch (e) {
                return "ERRO";
            }
            return "N/A";
        };

        const valorAtual = getValueByTitle("VALOR ATUAL");
        
        // Se não encontrar nem o Valor Atual, consideraremos que a busca falhou para aquele ticker
        if (valorAtual === "N/A" || valorAtual === "") {
            return respostaErro;
        }

        return {
            valorAtual: valorAtual !== "N/A" ? `R$ ${valorAtual}` : "ERRO",
            min52: getValueByTitle("MIN. 52 SEMANAS") !== "N/A" ? `R$ ${getValueByTitle("MIN. 52 SEMANAS")}` : "ERRO",
            max52: getValueByTitle("MÁX. 52 SEMANAS") !== "N/A" ? `R$ ${getValueByTitle("MÁX. 52 SEMANAS")}` : "ERRO",
            dy: getValueByTitle("DIVIDEND YIELD") !== "N/A" ? `${getValueByTitle("DIVIDEND YIELD")}%` : "ERRO",
            valorizacao: getValueByTitle("VALORIZAÇÃO (12M)") !== "N/A" ? `${getValueByTitle("VALORIZAÇÃO (12M)")}%` : "ERRO"
        };

    } catch (e) {
        return respostaErro;
    }
}

// Faz o download da página contornando regras de CORS
async function realizarFetchComProxy(url) {
    try {
        const response = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
        if (!response.ok) return null;
        return await response.text();
    } catch (e) {
        return null;
    }
}

// Atualiza a linha da Tabela 2
function renderizarLinhaScraping(tr, ticker, dados) {
    const contemErro = Object.values(dados).includes("ERRO");
    const classeCss = contemErro ? "classe-erro" : "";

    tr.innerHTML = `
        <td><strong>${ticker}</strong></td>
        <td class="${dados.valorAtual === 'ERRO' ? 'classe-erro' : ''}">${dados.valorAtual}</td>
        <td class="${dados.min52 === 'ERRO' ? 'classe-erro' : ''}">${dados.min52}</td>
        <td class="${dados.max52 === 'ERRO' ? 'classe-erro' : ''}">${dados.max52}</td>
        <td class="${dados.dy === 'ERRO' ? 'classe-erro' : ''}">${dados.dy}</td>
        <td class="${dados.valorizacao === 'ERRO' ? 'classe-erro' : ''}">${dados.valorizacao}</td>
    `;
}
