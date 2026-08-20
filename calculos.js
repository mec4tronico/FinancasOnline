// ============================================================
// calculos.js
// Calcula exclusivamente as colunas 12 a 21 do patrimônio.
// Também fornece cálculos auxiliares utilizados pelas abas.
// ============================================================

function converterNumero(valor, coluna, ativo) {

    if (typeof valor === "number" && Number.isFinite(valor)) {
        return valor;
    }

    if (valor === undefined || valor === null) {
        throw new Error(`${ativo}: ${coluna} está ausente.`);
    }

    let texto = String(valor)
        .trim()
        .replace(/\s/g, "")
        .replace(/R\$/gi, "")
        .replace(/%/g, "");

    if (!texto) {
        throw new Error(`${ativo}: ${coluna} está vazio.`);
    }

    // Aceita tanto 49.84 quanto o formato brasileiro 18.058,53.
    if (texto.includes(",")) {
        texto = texto.replace(/\./g, "").replace(",", ".");
    }

    const numero = Number(texto);

    if (!Number.isFinite(numero)) {
        throw new Error(`${ativo}: ${coluna} não é numérico.`);
    }

    return numero;
}


function formatarResultado(numero) {

    const arredondado = Math.round(
        (numero + Number.EPSILON) * 100
    ) / 100;

    return (Object.is(arredondado, -0) ? 0 : arredondado)
        .toFixed(2);
}


// ============================================================
// CALCULAR MÉDIA DE 52 SEMANAS
// ============================================================
//
// Calcula:
// - Preço médio entre Min52 e Max52
// - Valor fictício da posição nesse preço
// - Renda anual fictícia usando o DY
// - Renda mensal fictícia
//
// Recebe um registro do patrimônio.
//
// Exemplo:
// {
//     Quantidade: "100",
//     Min52: "10,00",
//     Max52: "20,00",
//     DY: "8,00"
// }
//
// Retorna:
// {
//     media52S,
//     valorFicticio,
//     rendaAnualFicticia,
//     rendaMensalFicticia
// }
// ============================================================

export function calcularMedia52S(registro) {

    if (!registro) {
        throw new Error(
            "Não foi informado um registro para calcular a média de 52 semanas."
        );
    }

    const ativo =
        registro.Ativo || "Ativo sem identificação";

    const quantidade = converterNumero(
        registro.Quantidade,
        "Quantidade",
        ativo
    );

    const min52 = converterNumero(
        registro.Min52,
        "Min52",
        ativo
    );

    const max52 = converterNumero(
        registro.Max52,
        "Max52",
        ativo
    );

    const dy = converterNumero(
        registro.DY,
        "DY",
        ativo
    );


    // ------------------------------------------------------------
    // 1. Preço médio entre mínima e máxima de 52 semanas
    // ------------------------------------------------------------

    const media52S =
        (min52 + max52) / 2;


    // ------------------------------------------------------------
    // 2. Valor fictício da posição nesse preço
    // ------------------------------------------------------------

    const valorFicticio =
        quantidade * media52S;


    // ------------------------------------------------------------
    // 3. Renda anual fictícia
    // ------------------------------------------------------------

    const rendaAnualFicticia =
        valorFicticio * dy / 100;


    // ------------------------------------------------------------
    // 4. Renda mensal fictícia
    // ------------------------------------------------------------

    const rendaMensalFicticia =
        rendaAnualFicticia / 12;


    return {
        media52S,
        valorFicticio,
        rendaAnualFicticia,
        rendaMensalFicticia
    };
}


// ============================================================
// FUNÇÃO PRINCIPAL
// Retorna uma nova lista: o app só substitui o patrimônio após
// todos os ativos serem validados e calculados.
// ============================================================

export function calcularColunasPatrimonio(patrimonio) {

    if (!Array.isArray(patrimonio) || patrimonio.length === 0) {
        throw new Error("Não há ativos para calcular.");
    }

    const linhasCalculadas = patrimonio.map(registro => {

        const ativo = registro.Ativo || "Ativo sem identificação";

        const quantidade = converterNumero(
            registro.Quantidade,
            "Quantidade",
            ativo
        );

        const totalInvestido = converterNumero(
            registro.TotalInvestido,
            "TotalInvestido",
            ativo
        );

        const valorAtual = converterNumero(
            registro.ValorAtual,
            "ValorAtual",
            ativo
        );

        const min52 = converterNumero(
            registro.Min52,
            "Min52",
            ativo
        );

        const max52 = converterNumero(
            registro.Max52,
            "Max52",
            ativo
        );

        const dy = converterNumero(
            registro.DY,
            "DY",
            ativo
        );

        const valorAtualPosicao =
            quantidade * valorAtual;

        const lucroPrejuizo =
            valorAtualPosicao - totalInvestido;

        const rendaAnualEstimada =
            valorAtualPosicao * dy / 100;

        const valorPosicaoMax52 =
            quantidade * max52;

        const valorPosicaoMin52 =
            quantidade * min52;

        return {
            registro,
            valorAtualPosicao,
            lucroPrejuizo,

            rentabilidade: totalInvestido === 0
                ? null
                : lucroPrejuizo / totalInvestido * 100,

            rendaAnualEstimada,
            rendaMensalEstimada:
                rendaAnualEstimada / 12,

            valorPosicaoMax52,
            valorPosicaoMin52,

            potencialFinanceiroMax52:
                valorPosicaoMax52 - valorAtualPosicao,

            riscoFinanceiroMin52:
                valorAtualPosicao - valorPosicaoMin52
        };
    });


    const valorTotalDaCarteira =
        linhasCalculadas.reduce(
            (total, linha) =>
                total + linha.valorAtualPosicao,
            0
        );


    if (valorTotalDaCarteira === 0) {
        throw new Error(
            "Valor total da carteira é zero; não é possível calcular PesoCarteira."
        );
    }


    return linhasCalculadas.map(linha => ({

        ...linha.registro,

        ValorAtualPosicao:
            formatarResultado(
                linha.valorAtualPosicao
            ),

        LucroPrejuizo:
            formatarResultado(
                linha.lucroPrejuizo
            ),

        Rentabilidade:
            linha.rentabilidade === null
                ? ""
                : formatarResultado(
                    linha.rentabilidade
                ),

        PesoCarteira:
            formatarResultado(
                linha.valorAtualPosicao /
                valorTotalDaCarteira * 100
            ),

        RendaAnualEstimada:
            formatarResultado(
                linha.rendaAnualEstimada
            ),

        RendaMensalEstimada:
            formatarResultado(
                linha.rendaMensalEstimada
            ),

        ValorPosicaoMax52:
            formatarResultado(
                linha.valorPosicaoMax52
            ),

        ValorPosicaoMin52:
            formatarResultado(
                linha.valorPosicaoMin52
            ),

        PotencialFinanceiroMax52:
            formatarResultado(
                linha.potencialFinanceiroMax52
            ),

        RiscoFinanceiroMin52:
            formatarResultado(
                linha.riscoFinanceiroMin52
            )
    }));
}
