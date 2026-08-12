/* ==========================================================================
   CONFIGURAÇÕES E CONSTANTES
   ========================================================================== */
const ARQUIVO_CARTEIRA = 'carteira_b3_consolidada.csv';
const ARQUIVO_MERCADO = 'dados_mercados.csv';
const TEMPO_LIMITE_24H = 24 * 60 * 60 * 1000; // 24 horas em milissegundos
const DELAY_SCRAPING = 1500; // 1.5 segundos entre requisições

/* ==========================================================================
   INICIALIZAÇÃO E CONTROLE DE ABAS
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  configurarNavegacaoAbas();
  iniciarCarteiraConsolidada();
  iniciarAplicacao();
});

function configurarNavegacaoAbas() {
  const botoesAba = document.querySelectorAll('.aba-botao');
  const conteudosAba = document.querySelectorAll('.aba-conteudo');

  botoesAba.forEach(botao => {
    botao.addEventListener('click', () => {
      const abaAlvo = botao.getAttribute('data-aba');

      botoesAba.forEach(b => b.classList.remove('ativa'));
      conteudosAba.forEach(c => c.classList.remove('ativa'));

      botao.classList.add('ativa');
      const elementoAlvo = document.getElementById(abaAlvo);
      if (elementoAlvo) {
        elementoAlvo.classList.add('ativa');
      }
    });
  });
}

/* ==========================================================================
   ABA 2: CARTEIRA CONSOLIDADA
   ========================================================================== */
async function iniciarCarteiraConsolidada() {
  const conteinerResultado = document.getElementById('resultado-carteira');
  if (!conteinerResultado) return;

  try {
    const conteudoCSV = await buscarArquivo(ARQUIVO_CARTEIRA);
    const dadosCarteira = processarCSVCarteira(conteudoCSV);
    exibirTabelaCarteira(dadosCarteira);
  } catch (erro) {
    mostrarErroCarteira(`Erro ao carregar carteira: ${erro.message}`);
  }
}

function processarCSVCarteira(conteudoCSV) {
  const linhas = conteudoCSV.split('\n').filter(linha => linha.trim() !== '');
  if (linhas.length <= 1) return [];

  const dados = [];
  // Ignora o cabeçalho (i = 1)
  for (let i = 1; i < linhas.length; i++) {
    const colunas = linhas[i].split(';').map(col => col.trim());
    if (colunas.length >= 5) {
      dados.push({
        ticker: colunas[0],
        tipo: colunas[1],
        quantidade: colunas[2],
        totalInvestido: colunas[3],
        dataPrimeiraCompra: colunas[4]
      });
    }
  }
  return dados;
}

function exibirTabelaCarteira(dados) {
  const conteinerResultado = document.getElementById('resultado-carteira');
  if (!conteinerResultado) return;

  if (dados.length === 0) {
    conteinerResultado.innerHTML = '<p>Nenhum dado encontrado na carteira.</p>';
    return;
  }

  let html = `
    <table class="tabela-carteira">
      <thead>
        <tr>
          <th>Ativo</th>
          <th>Tipo</th>
          <th>Quantidade</th>
          <th>Total Investido</th>
          <th>Data 1ª Compra</th>
        </tr>
      </thead>
      <tbody>
  `;

  dados.forEach(item => {
    html += `
      <tr>
        <td><strong>${item.ticker}</strong></td>
        <td>${item.tipo}</td>
        <td>${item.quantidade}</td>
        <td>${item.totalInvestido}</td>
        <td>${item.dataPrimeiraCompra}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  conteinerResultado.innerHTML = html;
}

function mostrarErroCarteira(mensagem) {
  const conteinerResultado = document.getElementById('resultado-carteira');
  if (conteinerResultado) {
    conteinerResultado.innerHTML = `<p class="erro">${mensagem}</p>`;
  }
}

async function lerCSVCarteira(caminhoArquivo) {
  const conteudoCSV = await buscarArquivo(caminhoArquivo);
  return processarCSVCarteira(conteudoCSV);
}

/* ==========================================================================
   ABA 3: DADOS DE MERCADO (SCRAPING E FLUXO PRINCIPAL)
   ========================================================================== */
async function iniciarAplicacao() {
  const conteinerMercado = document.getElementById('resultado-scraping');
  if (!conteinerMercado) return;

  try {
    // CORREÇÃO: Utiliza lerCSVCarteira para ler o arquivo separado por ';'
    const carteira = await lerCSVCarteira(ARQUIVO_CARTEIRA);
    const ativos = extrairAtivosDaCarteira(carteira);

    if (ativos.length === 0) {
      conteinerMercado.innerHTML = '<p>Nenhum ativo encontrado para processar dados de mercado.</p>';
      return;
    }

    let dadosMercado = [];
    let precisaAtualizar = true;

    try {
      const conteudoMercado = await buscarArquivo(ARQUIVO_MERCADO);
      dadosMercado = lerCSV(conteudoMercado);

      if (dadosMercado.length > 0) {
        precisaAtualizar = verificarNecessidadeAtualizacao(dadosMercado);
      }
    } catch (e) {
      console.log('Arquivo de mercado não encontrado ou inválido. Um novo será criado.');
      precisaAtualizar = true;
    }

    if (precisaAtualizar) {
      conteinerMercado.innerHTML = '<p class="status-info">Atualizando dados de mercado via scraping...</p>';
      dadosMercado = await executarScrapingParaAtivos(ativos);
    } else {
      conteinerMercado.innerHTML = '<p class="status-sucesso">Dados de mercado atualizados (dentro da janela de 24h).</p>';
    }

    exibirDadosMercado(dadosMercado);

  } catch (erro) {
    console.error('Erro no fluxo principal de mercado:', erro);
    if (conteinerMercado) {
      conteinerMercado.innerHTML = `<p class="erro">Erro no fluxo de mercado: ${erro.message}</p>`;
    }
  }
}

function extrairAtivosDaCarteira(dadosCarteira) {
  if (!Array.isArray(dadosCarteira)) return [];

  return dadosCarteira.map(item => {
    // Se o item for objeto (retornado por lerCSVCarteira) ou array de colunas
    const ticker = (typeof item === 'object' && item.ticker) ? item.ticker : item[0];
    const tipoBruto = (typeof item === 'object' && item.tipo) ? item.tipo : item[1];

    let tipo = String(tipoBruto || '').toLowerCase().trim();
    if (tipo.includes('fii')) {
      tipo = 'fii';
    } else {
      tipo = 'acoes';
    }

    return {
      ticker: String(ticker || '').toUpperCase().trim(),
      tipo: tipo
    };
  }).filter(ativo => ativo.ticker !== '');
}

/* ==========================================================================
   PARSER CSV GENÉRICO (SEPARADO POR VÍRGULA - DADOS_MERCADOS.CSV)
   ========================================================================== */
function lerCSV(conteudoCSV) {
  if (!conteudoCSV || typeof conteudoCSV !== 'string') return [];

  const linhas = conteudoCSV.split('\n').filter(linha => linha.trim() !== '');
  if (linhas.length <= 1) return [];

  const cabecalho = linhas[0].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
  const resultados = [];

  for (let i = 1; i < linhas.length; i++) {
    const valores = linhas[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    if (valores.length === cabecalho.length) {
      const objeto = {};
      cabecalho.forEach((chave, index) => {
        objeto[chave] = valores[index];
      });
      resultados.push(objeto);
    }
  }

  return resultados;
}

/* ==========================================================================
   UTILITÁRIOS DE REDE, DATA E SCRAPING
   ========================================================================== */
async function buscarArquivo(caminho) {
  const resposta = await fetch(caminho, { cache: 'no-cache' });
  if (!resposta.ok) {
    throw new Error(`Não foi possível carregar o arquivo: ${caminho}`);
  }
  return await resposta.text();
}

function verificarNecessidadeAtualizacao(dadosMercado) {
  if (!dadosMercado || dadosMercado.length === 0) return true;

  let ultimaData = 0;
  dadosMercado.forEach(item => {
    if (item.data_atualizacao || item.dataAtualizacao || item.timestamp) {
      const dataStr = item.data_atualizacao || item.dataAtualizacao || item.timestamp;
      const t = new Date(dataStr).getTime();
      if (!isNaN(t) && t > ultimaData) {
        ultimaData = t;
      }
    }
  });

  if (ultimaData === 0) return true;
  const agora = Date.now();
  return (agora - ultimaData) > TEMPO_LIMITE_24H;
}

async function executarScrapingParaAtivos(ativos) {
  const resultados = [];

  for (const ativo of ativos) {
    try {
      // Simulação ou chamada real do scraping JS / Worker
      let dados = null;
      if (typeof realizarScrapingAtivo === 'function') {
        dados = await realizarScrapingAtivo(ativo.ticker, ativo.tipo);
      } else {
        dados = {
          ticker: ativo.ticker,
          tipo: ativo.tipo,
          preco: 'N/A',
          data_atualizacao: new Date().toISOString()
        };
      }
      resultados.push(dados);
      await aguardar(DELAY_SCRAPING);
    } catch (err) {
      console.error(`Erro ao obter dados para ${ativo.ticker}:`, err);
    }
  }

  return resultados;
}

function aguardar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function exibirDadosMercado(dados) {
  const conteiner = document.getElementById('resultado-scraping');
  if (!conteiner) return;

  if (!dados || dados.length === 0) {
    conteiner.innerHTML += '<p>Nenhum dado de mercado disponível.</p>';
    return;
  }

  let html = '<h3>Dados de Mercado Atualizados</h3><ul class="lista-mercado">';
  dados.forEach(item => {
    html += `<li><strong>${item.ticker || item.Ativo}</strong> (${item.tipo || 'N/A'}): ${item.preco || item.Preco || 'Ok'}</li>`;
  });
  html += '</ul>';

  conteiner.innerHTML = html;
}
