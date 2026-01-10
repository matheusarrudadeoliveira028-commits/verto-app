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

  // --- CORREÇÃO DO PARSER DE VALORES ---
  const limparValor = (valorStr: string) => {
    if (!valorStr) return 0;

    // Cenário 1: Formato Brasileiro (tem vírgula para decimal) -> Ex: 1.200,50
    if (valorStr.includes(',')) {
      // Remove pontos de milhar e troca vírgula por ponto
      return parseFloat(valorStr.replace(/\./g, '').replace(',', '.'));
    }
    
    // Cenário 2: Formato Sistema/JS (só tem ponto para decimal) -> Ex: 1200.50
    // Se só tiver ponto, o parseFloat já entende. 
    // MAS CUIDADO: Se tiver mais de um ponto (1.200.50 - erro raro), isso quebraria.
    // Como toFixed(2) gera apenas um ponto, o parseFloat direto resolve.
    return parseFloat(valorStr);
  };

  const buscarValor = (texto: string, chave: string) => {
    // Procura por "Chave R$ 10,00" ou "Chave: R$ 10.00"
    const regex = new RegExp(`${chave}[^0-9]*([0-9.,]+)`, 'i');
    const match = texto.match(regex);
    if (match) {
      return limparValor(match[1]);
    }
    return 0;
  };

  const extrairTotal = (texto: string) => {
    // Pega o primeiro valor monetário que encontrar
    const match = texto.match(/R\$\s?([\d\.,]+)/);
    if (match) {
      return limparValor(match[1]);
    }
    return 0;
  };
  // -------------------------------------

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

      let totalInvestido = 0;
      let totalRecebidoBruto = 0;
      let totalLucroLiquido = 0; 
      let totalMultasRecolhidas = 0;

      let htmlInvestimentos = '';
      let htmlEntradas = '';

      clientes.forEach(cli => {
        (cli.contratos || []).forEach(con => {
          
          // --- SAÍDAS (NOVOS EMPRÉSTIMOS) ---
          let dataCon = parseData(con.dataInicio);
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

          // --- ENTRADAS (MOVIMENTAÇÕES) ---
          (con.movimentacoes || []).forEach(mov => {
            const partes = mov.split(':');
            if (partes.length < 2) return;
            
            const dataMovStr = partes[0].trim();
            const dataMov = parseData(dataMovStr);
            const descricao = partes.slice(1).join(':').trim();

            if (!isNaN(dataMov.getTime()) && dataMov >= dtInicio && dataMov <= dtFim) {
              
              if (descricao.toLowerCase().includes('iniciado') || descricao.toLowerCase().includes('acordo')) return;

              let valTotal = extrairTotal(descricao);
              let valMulta = 0;
              let valLucro = 0;
              let valCapital = 0;
              let tipo = 'Pagamento';

              // === LÓGICA DE VALORES ===
              
              const temLucroExpl = buscarValor(descricao, 'Lucro');
              const temMultaExpl = buscarValor(descricao, 'Multa');
              const temCapitalExpl = buscarValor(descricao, 'Capital');

              if (temLucroExpl > 0 || temCapitalExpl > 0) {
                // Se encontrou valores explícitos (Novo Log)
                valLucro = temLucroExpl;
                valMulta = temMultaExpl;
                valCapital = temCapitalExpl;
                
                // Recalcula total se necessário para bater com a soma
                const somaInterna = valLucro + valMulta + valCapital;
                // Se a diferença for pequena (centavos) ou se valTotal for 0, confia na soma
                if (Math.abs(somaInterna - valTotal) > 0.1) {
                    // Mantém o valTotal lido, mas ajusta o capital se for inconsistente
                    // Ou confia na soma interna como a verdade
                    valTotal = somaInterna; 
                }
              } 
              else {
                // === LOG ANTIGO (ESTIMATIVA) ===
                valMulta = buscarValor(descricao, 'Multa'); 

                if (descricao.toLowerCase().includes('parcela')) {
                    tipo = 'Parcela';
                    if (con.lucroJurosPorParcela) {
                        valLucro = con.lucroJurosPorParcela;
                    } else if (con.taxa > 0) {
                        const base = (valTotal - valMulta) / (1 + (con.taxa/100));
                        valLucro = (valTotal - valMulta) - base;
                    }
                    valCapital = valTotal - valMulta - valLucro;

                } else if (descricao.toLowerCase().includes('renova')) {
                    tipo = 'Renovação';
                    valLucro = valTotal - valMulta;
                    valCapital = 0;

                } else if (descricao.toLowerCase().includes('quitado')) {
                    tipo = 'Quitação';
                    // Fallback para quitação antiga sem detalhes
                    const capitalEstimado = con.capital || 0;
                    if (valTotal >= capitalEstimado) {
                        valCapital = capitalEstimado;
                        valLucro = valTotal - valCapital - valMulta;
                    } else {
                        valCapital = valTotal - valMulta;
                        valLucro = 0;
                    }
                } else {
                    valCapital = valTotal - valMulta;
                }
              }

              if (valLucro < 0) valLucro = 0;
              if (valCapital < 0) valCapital = 0;

              totalRecebidoBruto += valTotal;
              totalMultasRecolhidas += valMulta;
              totalLucroLiquido += valLucro;

              // Estilos de visualização
              const styleLucro = valLucro > 0 ? 'color:#27AE60; font-weight:bold;' : 'color:#CCC;';
              const styleMulta = valMulta > 0 ? 'color:#E67E22; font-weight:bold;' : 'color:#CCC;';
              
              if (descricao.toLowerCase().includes('quitado')) tipo = 'Quitação';
              if (descricao.toLowerCase().includes('renova')) tipo = 'Renovação';

              htmlEntradas += `
                <tr>
                  <td>${dataMov.toLocaleDateString('pt-BR')}</td>
                  <td>${cli.nome}</td>
                  <td><span style="font-size:9px; background:#EEE; padding:2px 4px; border-radius:4px;">${tipo}</span></td>
                  <td style="font-weight:bold;">R$ ${valTotal.toFixed(2)}</td>
                  <td style="color:#7F8C8D;">R$ ${valCapital.toFixed(2)}</td>
                  <td style="${styleLucro}">R$ ${valLucro.toFixed(2)}</td>
                  <td style="${styleMulta}">R$ ${valMulta.toFixed(2)}</td>
                </tr>
              `;
            }
          });
        });
      });

      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 15px; color: #333; }
              h1 { text-align: center; color: #2C3E50; margin-bottom: 5px; font-size: 22px; }
              .periodo { text-align: center; color: #7F8C8D; margin-bottom: 25px; font-size: 12px; }
              
              .resumo-grid { display: flex; flex-direction: row; justify-content: space-between; margin-bottom: 30px; gap: 8px; }
              .card { flex: 1; background: #F8F9FA; padding: 10px 5px; border-radius: 8px; border: 1px solid #E0E0E0; text-align: center; }
              .card-lbl { font-size: 9px; color: #666; text-transform: uppercase; font-weight: bold; margin-bottom: 4px; }
              .card-val { font-size: 16px; font-weight: bold; }
              
              .red { color: #C0392B; }
              .blue { color: #2980B9; }
              .green { color: #27AE60; }
              .orange { color: #D35400; }

              h2 { font-size: 14px; border-bottom: 2px solid #34495E; padding-bottom: 5px; margin-top: 25px; text-transform: uppercase; color: #34495E; }
              
              table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 10px; }
              th { background: #34495E; color: #FFF; padding: 6px 4px; text-align: left; }
              td { border-bottom: 1px solid #EEE; padding: 8px 4px; vertical-align: middle; }
              tr:nth-child(even) { background: #FCFDFE; }
              
              .footer { margin-top: 40px; text-align: center; font-size: 9px; color: #AAA; border-top: 1px solid #EEE; padding-top: 10px; }
            </style>
          </head>
          <body>
            <h1>Relatório Financeiro</h1>
            <div class="periodo">Período: ${dataIni} até ${dataFim}</div>

            <div class="resumo-grid">
              <div class="card">
                <div class="card-lbl">Investido</div>
                <div class="card-val red">R$ ${totalInvestido.toFixed(2)}</div>
              </div>
              <div class="card">
                <div class="card-lbl">Total Recebido</div>
                <div class="card-val blue">R$ ${totalRecebidoBruto.toFixed(2)}</div>
              </div>
              <div class="card">
                <div class="card-lbl">Lucro (Juros)</div>
                <div class="card-val green">R$ ${totalLucroLiquido.toFixed(2)}</div>
              </div>
              <div class="card">
                <div class="card-lbl">Multas</div>
                <div class="card-val orange">R$ ${totalMultasRecolhidas.toFixed(2)}</div>
              </div>
            </div>

            <h2>Entradas (Pagamentos)</h2>
            ${htmlEntradas ? `
              <table>
                <thead>
                  <tr>
                    <th width="15%">Data</th>
                    <th width="20%">Cliente</th>
                    <th width="12%">Tipo</th>
                    <th width="15%">Total</th>
                    <th width="14%">Capital</th>
                    <th width="12%">Lucro</th>
                    <th width="12%">Multa</th>
                  </tr>
                </thead>
                <tbody>
                  ${htmlEntradas}
                </tbody>
              </table>
            ` : '<p style="text-align:center; color:#999; margin-top:10px;">Nenhum recebimento.</p>'}

            <h2>Saídas (Empréstimos)</h2>
            ${htmlInvestimentos ? `
              <table>
                <thead>
                  <tr><th width="20%">Data</th><th width="50%">Cliente</th><th width="30%">Valor</th></tr>
                </thead>
                <tbody>
                  ${htmlInvestimentos}
                </tbody>
              </table>
            ` : '<p style="text-align:center; color:#999; margin-top:10px;">Nenhum empréstimo.</p>'}

            <div class="footer">Gerado em ${new Date().toLocaleString('pt-BR')}</div>
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
          <TextInput style={styles.input} value={dataIni} onChangeText={setDataIni} keyboardType="numbers-and-punctuation" placeholder="DD/MM/AAAA" />
          <Text style={styles.label}>Data Fim</Text>
          <TextInput style={styles.input} value={dataFim} onChangeText={setDataFim} keyboardType="numbers-and-punctuation" placeholder="DD/MM/AAAA" />
          {loading ? ( <ActivityIndicator size="large" color="#2C3E50" style={{ marginTop: 20 }} /> ) : (
            <View style={styles.botoes}>
              <TouchableOpacity style={[styles.btn, styles.btnCancelar]} onPress={fechar}><Text style={styles.btnTxt}>Fechar</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnGerar]} onPress={gerarRelatorio}><Ionicons name="print-outline" size={20} color="#FFF" style={{ marginRight: 5 }} /><Text style={[styles.btnTxt, { color: '#FFF' }]}>Gerar PDF</Text></TouchableOpacity>
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