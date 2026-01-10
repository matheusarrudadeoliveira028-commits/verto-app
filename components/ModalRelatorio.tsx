import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Cliente } from '../types';

interface Props {
  visivel: boolean;
  fechar: () => void;
  clientes: Cliente[];
}

export default function ModalRelatorio({ visivel, fechar, clientes }: Props) {
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const [dataIni, setDataIni] = useState(primeiroDia.toLocaleDateString('pt-BR'));
  const [dataFim, setDataFim] = useState(hoje.toLocaleDateString('pt-BR'));
  const [loading, setLoading] = useState(false);

  // Converte "DD/MM/AAAA" para Date
  const parseData = (dataStr: string) => {
    try {
      const partes = dataStr.split('/');
      if (partes.length !== 3) return new Date('');
      return new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0]));
    } catch (e) { return new Date(''); }
  };

  // Extrai valor monetário de uma string (ex: "R$ 1.200,50")
  const extrairValor = (texto: string) => {
    const match = texto.match(/R\$\s?([\d\.,]+)/);
    if (match) {
      let valorLimpo = match[1];
      if (valorLimpo.includes(',')) {
        valorLimpo = valorLimpo.replace(/\./g, '').replace(',', '.');
      } 
      return parseFloat(valorLimpo);
    }
    return 0;
  };

  // Tenta extrair especificamente o valor da multa (ex: "Multa R$ 20,00")
  const extrairMulta = (texto: string) => {
    // Procura por "Multa R$ ..." ignorando case
    const match = texto.match(/(?:Multa|multa)\s*R\$\s?([\d\.,]+)/);
    if (match) {
      let valorLimpo = match[1];
      if (valorLimpo.includes(',')) {
        valorLimpo = valorLimpo.replace(/\./g, '').replace(',', '.');
      }
      return parseFloat(valorLimpo);
    }
    return 0;
  };

  const gerarRelatorio = async () => {
    try {
      setLoading(true);
      const dtInicio = parseData(dataIni);
      const dtFim = parseData(dataFim);
      
      if (isNaN(dtInicio.getTime()) || isNaN(dtFim.getTime())) {
        Alert.alert("Erro", "Datas inválidas.");
        setLoading(false);
        return;
      }
      
      dtFim.setHours(23, 59, 59);

      // Totais
      let totalInvestido = 0;
      let totalEntradaBruta = 0;
      let totalLucroJuros = 0;
      let totalMultas = 0;

      let htmlInvestimentos = '';
      let htmlEntradas = '';

      clientes.forEach(cli => {
        (cli.contratos || []).forEach(con => {
          
          // --- 1. SAÍDAS (NOVOS EMPRÉSTIMOS) ---
          let dataCon = parseData(con.dataInicio);
          // Fallback se não tiver dataInicio válida
          if (isNaN(dataCon.getTime()) && con.movimentacoes?.length > 0) {
             const primeiraMov = con.movimentacoes[con.movimentacoes.length - 1]; 
             dataCon = parseData(primeiraMov.split(':')[0]);
          }

          if (!isNaN(dataCon.getTime()) && dataCon >= dtInicio && dataCon <= dtFim) {
            totalInvestido += (con.capital || 0); 
            htmlInvestimentos += `
              <tr>
                <td>${dataCon.toLocaleDateString('pt-BR')}</td>
                <td>${cli.nome}</td>
                <td>R$ ${(con.capital || 0).toFixed(2)}</td>
              </tr>
            `;
          }

          // --- 2. ENTRADAS (PAGAMENTOS) ---
          (con.movimentacoes || []).forEach(mov => {
            const partes = mov.split(':');
            if (partes.length < 2) return;
            
            const dataMovStr = partes[0].trim();
            const dataMov = parseData(dataMovStr);
            const descricao = partes.slice(1).join(':').trim();

            if (!isNaN(dataMov.getTime()) && dataMov >= dtInicio && dataMov <= dtFim) {
              const valorTotalItem = extrairValor(descricao);
              
              if (valorTotalItem > 0) {
                // Ignora "Iniciado" e "Acordo" pois não são entradas de caixa
                if (descricao.toLowerCase().includes('iniciado') || descricao.toLowerCase().includes('acordo')) {
                    return; 
                }

                // IDENTIFICAÇÃO DOS COMPONENTES
                const valMulta = extrairMulta(descricao);
                let valLucro = 0;
                let valCapital = 0;
                let tipo = 'Outros';

                if (descricao.toLowerCase().includes('parcela')) {
                    tipo = 'Parcela';
                    // Na parcela: Lucro é fixo (calculado na criação) + Multa é extra
                    const lucroPrevisto = con.lucroJurosPorParcela || 0;
                    
                    valLucro = lucroPrevisto;
                    // Capital é o que sobra: Total - Multa - LucroJuros
                    // (Proteção para não ficar negativo se o valor pago for parcial)
                    valCapital = valorTotalItem - valMulta - valLucro;
                    if (valCapital < 0) valCapital = 0; 

                } else if (descricao.toLowerCase().includes('renova')) {
                    tipo = 'Renovação';
                    // Renovação é pura receita de juros/multa. Não abate capital.
                    valLucro = valorTotalItem - valMulta;
                    valCapital = 0;

                } else if (descricao.toLowerCase().includes('quitado')) {
                    tipo = 'Quitação';
                    // Na quitação, é difícil saber quanto é Juro exato sem histórico complexo.
                    // Vamos separar a Multa. O resto vai como "Capital+Juros" para não mentir.
                    // Assumiremos Lucro 0 aqui para não inflar sem certeza, ou você pode definir uma regra.
                    valCapital = valorTotalItem - valMulta; 
                    valLucro = 0; // Deixa zerado ou põe um asterisco
                } else {
                    // Outros pagamentos avulsos
                    valCapital = valorTotalItem - valMulta;
                }

                // Somatórios Gerais
                totalEntradaBruta += valorTotalItem;
                totalMultas += valMulta;
                totalLucroJuros += valLucro;

                // Estilo para tabela
                const styleMulta = valMulta > 0 ? 'color: #E67E22; font-weight:bold;' : 'color: #CCC;';
                const styleLucro = valLucro > 0 ? 'color: #27AE60; font-weight:bold;' : 'color: #CCC;';

                htmlEntradas += `
                  <tr>
                    <td>${dataMov.toLocaleDateString('pt-BR')}</td>
                    <td>${cli.nome}</td>
                    <td><span style="font-size:10px; background:#EEE; padding:2px 4px; border-radius:4px;">${tipo}</span></td>
                    <td style="font-weight:bold;">R$ ${valorTotalItem.toFixed(2)}</td>
                    <td style="color:#555;">R$ ${valCapital.toFixed(2)}</td>
                    <td style="${styleLucro}">R$ ${valLucro.toFixed(2)}</td>
                    <td style="${styleMulta}">R$ ${valMulta.toFixed(2)}</td>
                  </tr>
                `;
              }
            }
          });
        });
      });

      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body { font-family: sans-serif; padding: 15px; color: #333; }
              h1 { text-align: center; color: #2C3E50; margin-bottom: 5px; }
              .periodo { text-align: center; color: #7F8C8D; margin-bottom: 20px; font-size: 14px; }
              
              .cards-container { display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; margin-bottom: 30px; }
              .card { flex: 1; min-width: 45%; background: #F8F9FA; padding: 10px; border-radius: 8px; border: 1px solid #EEE; text-align: center; }
              .card-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
              .card-value { font-size: 18px; font-weight: bold; margin-top: 5px; }
              
              .txt-red { color: #C0392B; }
              .txt-blue { color: #2980B9; }
              .txt-green { color: #27AE60; }
              .txt-orange { color: #E67E22; }

              h2 { font-size: 14px; border-bottom: 2px solid #34495E; padding-bottom: 5px; margin-top: 25px; text-transform: uppercase; }
              
              table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 10px; }
              th { background: #34495E; color: #FFF; padding: 6px; text-align: left; }
              td { border-bottom: 1px solid #EEE; padding: 6px; }
              tr:nth-child(even) { background: #F9F9F9; }
              
              .footer { margin-top: 40px; text-align: center; font-size: 9px; color: #AAA; }
            </style>
          </head>
          <body>
            <h1>Relatório Financeiro</h1>
            <div class="periodo">${dataIni} até ${dataFim}</div>

            <div class="cards-container">
              <div class="card">
                <div class="card-label">Investido (Saída)</div>
                <div class="card-value txt-red">R$ ${totalInvestido.toFixed(2)}</div>
              </div>
              <div class="card">
                <div class="card-label">Arrecadado (Bruto)</div>
                <div class="card-value txt-blue">R$ ${totalEntradaBruta.toFixed(2)}</div>
              </div>
              <div class="card">
                <div class="card-label">Lucro Juros</div>
                <div class="card-value txt-green">R$ ${totalLucroJuros.toFixed(2)}</div>
              </div>
              <div class="card">
                <div class="card-label">Total Multas</div>
                <div class="card-value txt-orange">R$ ${totalMultas.toFixed(2)}</div>
              </div>
            </div>

            <h2>Detalhamento de Entradas</h2>
            ${htmlEntradas ? `
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>Tipo</th>
                    <th>Total Pago</th>
                    <th>Capital Ret.</th>
                    <th>Lucro</th>
                    <th>Multa</th>
                  </tr>
                </thead>
                <tbody>
                  ${htmlEntradas}
                </tbody>
              </table>
            ` : '<p>Nenhuma entrada registrada no período.</p>'}

            <h2>Novos Empréstimos</h2>
            ${htmlInvestimentos ? `
              <table>
                <thead>
                  <tr><th>Data</th><th>Cliente</th><th>Valor</th></tr>
                </thead>
                <tbody>
                  ${htmlInvestimentos}
                </tbody>
              </table>
            ` : '<p>Nenhum empréstimo no período.</p>'}

            <div class="footer">Gerado em ${new Date().toLocaleString('pt-BR')} pelo App Verto</div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      setLoading(false);
      fechar();

    } catch (error) {
      Alert.alert('Erro', 'Falha ao gerar PDF');
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <Modal visible={visivel} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.titulo}>Relatório Financeiro</Text>
          
          <Text style={styles.label}>Data Início</Text>
          <TextInput 
            style={styles.input} 
            value={dataIni} 
            onChangeText={setDataIni} 
            keyboardType="numbers-and-punctuation"
            placeholder="DD/MM/AAAA"
          />

          <Text style={styles.label}>Data Fim</Text>
          <TextInput 
            style={styles.input} 
            value={dataFim} 
            onChangeText={setDataFim}
            keyboardType="numbers-and-punctuation"
            placeholder="DD/MM/AAAA"
          />

          {loading ? (
            <ActivityIndicator size="large" color="#2C3E50" style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.botoes}>
              <TouchableOpacity style={[styles.btn, styles.btnCancelar]} onPress={fechar}>
                <Text style={styles.btnTxt}>Fechar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnGerar]} onPress={gerarRelatorio}>
                <Ionicons name="print-outline" size={20} color="#FFF" style={{ marginRight: 5 }} />
                <Text style={[styles.btnTxt, { color: '#FFF' }]}>Gerar PDF</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '85%', backgroundColor: '#FFF', borderRadius: 12, padding: 20, elevation: 5 },
  titulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#2C3E50' },
  label: { fontSize: 14, color: '#666', marginBottom: 4, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16, backgroundColor: '#F9F9F9' },
  botoes: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btn: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  btnCancelar: { backgroundColor: '#E0E0E0' },
  btnGerar: { backgroundColor: '#2C3E50' },
  btnTxt: { fontWeight: 'bold', fontSize: 16 }
});