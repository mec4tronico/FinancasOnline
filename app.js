const ARQUIVO_CARTEIRA = "./carteira_b3_consolidada.csv";
const ARQUIVO_DADOS_MERCADO = "./dados_mercado.csv";
const VALIDADE_DADOS_HORAS = 24;

document.addEventListener("DOMContentLoaded", () => {
    iniciarAplicacao();
});


// ============================================================
// FLUXO PRINCIPAL DA APLICAÇÃO
// ============================================================

async function iniciarAplicacao() {

    try {

        // --------------------------------------------------------
        // 1. Ler carteira B3
        // --------------------------------------------------------

        const textoCarteira =
            await lerArquivoCSV(ARQUIVO_CARTEIRA);

        const linhasCarteira =
            processarCSV(textoCarteira);


        if (linhasCarteira.length <= 1) {
            console.error(
                "Carteira B3 vazia ou sem dados válidos."
            );
            return;
        }


        // --------------------------------------------------------
        // 2. Exibir Tabela 1
        // --------------------------------------------------------

        const cabecalhosCarteira =
            linhasCarteira[0];

        const dadosCarteira =
            linhasCarteira.slice(1);

        preencherTabela1(
            cabecalhosCarteira,
            dadosCarteira
        );


        // --------------------------------------------------------
        // 3. Verificar dados_mercado.csv
        // --------------------------------------------------------

        let precisaAtualizar =
            true;


        try {

            const textoMercado =
                await lerArquivoCSV(
                    ARQUIVO_DADOS_MERCADO
                );


            const dataAtualizacao =
                obterDataAtualizacao(
                    textoMercado
                );


            if (dataAtualizacao) {

                const agora =
                    new Date();


                const diferencaMs =
                    agora.getTime() -
                    dataAtualizacao.getTime();


                const diferencaHoras =
                    diferencaMs /
                    (1000 * 60 * 60);


                if (
                    diferencaHoras >= 0 &&
                    diferencaHoras < VALIDADE_DADOS_HORAS
                ) {

                    precisaAtualizar = false;

                }

            }

        } catch (erro) {

            // Se o arquivo não existir ou não puder
            // ser lido, será gerado novamente.

            precisaAtualizar = true;

        }


        // --------------------------------------------------------
        // 4. Se necessário, gerar dados_mercado.csv
        // --------------------------------------------------------

        if (precisaAtualizar) {

            await gerarDadosMercado(
                dadosCarteira
            );

        }


        // --------------------------------------------------------
        // 5. Ler dados_mercado.csv
        // --------------------------------------------------------

        const textoMercadoFinal =
            await lerArquivoCSV(
                ARQUIVO_DADOS_MERCADO
            );


        const linhasMercado =
            processarCSV(
                textoMercadoFinal
            );


        if (linhasMercado.length <= 1) {

            console.error(
                "dados_mercado.csv vazio ou sem dados válidos."
            );

            return;
        }


        // --------------------------------------------------------
        // 6. Exibir Tabela 2
        // --------------------------------------------------------

        const cabecalhosMercado =
            linhasMercado[0];

        const dadosMercado =
            linhasMercado.slice(1);

        preencherTabela2(
            cabecalhosMercado,
            dadosMercado
        );


    } catch (erro) {

        console.error(
            "Erro na aplicação:",
            erro
        );

    }

}


// ============================================================
// LÊ UM ARQUIVO CSV
// ============================================================

async function lerArquivoCSV(caminho) {

    const resposta =
        await fetch(caminho);


    if (!resposta.ok) {

        throw new Error(
            `Não foi possível carregar ${caminho}.`
        );

    }


    return await resposta.text();

}


// ============================================================
// CONVERTE TEXTO CSV EM LINHAS E COLUNAS
// ============================================================

function processarCSV(texto) {

    const linhas =
        texto
            .trim()
            .split(/\r?\n/);


    return linhas.map(linha => {

        const delimitador =
            linha.includes(";")
                ? ";"
                : ",";


        return linha
            .split(delimitador)
            .map(celula =>
                celula
                    .replace(/^["']|["']$/g, "")
                    .trim()
            );

    });

}


// ============================================================
// PREENCHE TABELA 1
// ============================================================

function preencherTabela1(
    cabecalhos,
    dados
) {

    const tbody =
        document.querySelector(
            "#tabela-original tbody"
        );


    if (!tbody) {

        console.error(
            "Tabela original não encontrada."
        );

        return;
    }


    tbody.innerHTML = "";


    dados.forEach(linha => {

        const tr =
            document.createElement("tr");


        linha.forEach(celula => {

            const td =
                document.createElement("td");


            td.textContent =
                celula;


            tr.appendChild(td);

        });


        tbody.appendChild(tr);

    });

}


// ============================================================
// PREENCHE TABELA 2
// ============================================================

function preencherTabela2(
    cabecalhos,
    dados
) {

    const tbody =
        document.querySelector(
            "#tabela-scraping tbody"
        );


    if (!tbody) {

        console.error(
            "Tabela de dados de mercado não encontrada."
        );

        return;
    }


    tbody.innerHTML = "";


    dados.forEach(linha => {

        const tr =
            document.createElement("tr");


        linha.forEach(celula => {

            const td =
                document.createElement("td");


            td.textContent =
                celula;


            tr.appendChild(td);

        });


        tbody.appendChild(tr);

    });

}


// ============================================================
// OBTÉM A DATA GERAL DE ATUALIZAÇÃO DO CSV
// ============================================================

function obterDataAtualizacao(textoCSV) {

    const primeiraLinha =
        textoCSV
            .trim()
            .split(/\r?\n/)[0];


    if (!primeiraLinha) {
        return null;
    }


    const partes =
        primeiraLinha
            .split(";");


    if (
        partes.length < 2 ||
        partes[0].trim().toLowerCase() !==
        "atualizado em"
    ) {

        return null;

    }


    const textoData =
        partes[1].trim();


    // Esperado:
    // DD/MM/AAAA HH:MM:SS

    const correspondencia =
        textoData.match(
            /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/
        );


    if (!correspondencia) {
        return null;
    }


    const dia =
        Number(correspondencia[1]);

    const mes =
        Number(correspondencia[2]) - 1;

    const ano =
        Number(correspondencia[3]);

    const hora =
        Number(correspondencia[4]);

    const minuto =
        Number(correspondencia[5]);

    const segundo =
        Number(correspondencia[6]);


    return new Date(
        ano,
        mes,
        dia,
        hora,
        minuto,
        segundo
    );

}


// ============================================================
// CHAMA O ESCRITOR DO CSV
// ============================================================

async function gerarDadosMercado(
    dadosCarteira
) {

    if (
        typeof gerarArquivoDadosMercado !==
        "function"
    ) {

        throw new Error(
            "A função gerarArquivoDadosMercado " +
            "do arquivo escreverCSV.js não está disponível."
        );

    }


    await gerarArquivoDadosMercado(
        dadosCarteira
    );

}
:::
