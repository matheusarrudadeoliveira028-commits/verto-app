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
  // Datas iniciais: Primeiro dia do mês atual e dia atual
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const [dataIni, setDataIni] = useState(primeiroDia.toLocaleDateString('pt-BR'));
  const [dataFim, setDataFim] = useState(hoje.toLocaleDateString('pt-BR'));
  const [loading, setLoading] = useState(false);

  // Função auxiliar para converter "DD/MM/AAAA" em Date
  const parseData = (dataStr: string) => {
    try {
      const partes = dataStr.split('/');
      if (partes.length !== 3) return new Date(''); // Data inválida
      return new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0]));
    } catch (e) {
      return new Date('');
    }
  };

  const extrairValorMonetario = (texto: string) => {
    // Tenta achar padrões como "R$ 100,00" ou "R$ 100.00"
    const match = texto.match(/R\$\s?([\d\.,]+)/);
    if (match) {
      let valorLimpo = match[1];
      // Se tiver ',' assume que é decimal brasileiro. Remove pontos de milhar.
      if (valorLimpo.includes(',')) {
        valorLimpo = valorLimpo.replace(/\./g, '').replace(',', '.');
      } 
      // Se só tiver ponto, assume que é decimal (ex: 100.50) ou milhar (1.000). 
      // No contexto BR, '1.000' costuma ser mil. Mas em JS parseFloat('1.000') é 1.
      // Vamos assumir padrão BR: tira ponto, troca virgula.
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
        Alert.alert("Erro", "Datas inválidas. Use o formato DD/MM/AAAA");
        setLoading(false);
        return;
      }
      
      // Ajusta fim para pegar o dia todo (23:59:59)
      dtFim.setHours(23, 59, 59);

      let totalCapitalInvestido = 0;
      let totalLucroEstimado = 0;
      let totalEntradasBrutas = 0;

      let listaInvestimentos: string[] = [];
      let listaEntradas: string[] = [];

      clientes.forEach(cli => {
        (cli.contratos || []).forEach(con => {
          
          // --- 1. CAPITAL INVESTIDO (SAÍDAS) ---
          // Tenta descobrir a data de início real do contrato
          let dataCon = parseData(con.dataInicio);
          
          // Se dataInicio for inválida, tenta pegar da primeira movimentação
          if (isNaN(dataCon.getTime()) && con.movimentacoes && con.movimentacoes.length > 0) {
             const primeiraMov = con.movimentacoes[con.movimentacoes.length - 1]; 
             const dataStr = primeiraMov.split(':')[0];
             dataCon = parseData(dataStr);
          }

          // Se a data do contrato cair neste período
          if (!isNaN(dataCon.getTime()) && dataCon >= dtInicio && dataCon <= dtFim) {
            totalCapitalInvestido += (con.capital || 0); 
            listaInvestimentos.push(`
              <tr>
                <td>${cli.nome}</td>
                <td>${dataCon.toLocaleDateString('pt-BR')}</td>
                <td>R$ ${(con.capital || 0).toFixed(2)}</td>
              </tr>
            `);
          }

          // --- 2. ENTRADAS E LUCROS (MOVIMENTAÇÕES) ---
          (con.movimentacoes || []).forEach(mov => {
            const partes = mov.split(':');
            if (partes.length < 2) return;
            
            const dataMovStr = partes[0].trim();
            const dataMov = parseData(dataMovStr);
            const descricao = partes.slice(1).join(':').trim();

            if (!isNaN(dataMov.getTime()) && dataMov >= dtInicio && dataMov <= dtFim) {
              const valorMov = extrairValorMonetario(descricao);
              
              if (valorMov > 0) {
                let tipo = 'Outros';
                let lucroItem = 0;

                // Ignora a criação do empréstimo nas entradas
                if (descricao.toLowerCase().includes('iniciado') || descricao.toLowerCase().includes('acordo')) {
                    return; 
                }
                
                if (descricao.toLowerCase().includes('parcela')) {
                    tipo = 'Parcela';
                    lucroItem = con.lucroJurosPorParcela || 0;
                    totalEntradasBrutas += valorMov;
                    totalLucroEstimado += lucroItem;
                } else if (descricao.toLowerCase().includes('renova')) {
                    tipo = 'Renovação';
                    lucroItem = valorMov; 
                    totalEntradasBrutas += valorMov;
                    totalLucroEstimado += lucroItem;
                } else if (descricao.toLowerCase().includes('quitado')) {
                    tipo = 'Quitação';
                    // Na quitação, entra o valor total. Lucro é difícil precisar sem histórico completo.
                    // Vamos considerar entrada bruta apenas.
                    totalEntradasBrutas += valorMov;
                } else {
                    totalEntradasBrutas += valorMov;
                }

                listaEntradas.push(`
                  <tr>
                    <td>${cli.nome}</td>
                    <td>${dataMov.toLocaleDateString('pt-BR')}</td>
                    <td>${tipo}</td>
                    <td>R$ ${valorMov.toFixed(2)}</td>
                    <td style="color: green;">${lucroItem > 0 ? '+ R$ ' + lucroItem.toFixed(2) : '-'}</td>
                  </tr>
                `);
              }
            }
          });
        });
      });

      // HTML DO PDF
      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
              h1 { color: #2C3E50; text-align: center; margin-bottom: 5px; }
              h3 { color: #7F8C8D; text-align: center; margin-top: 0; font-weight: normal; }
              .resumo { display: flex; justify-content: space-around; margin: 30px 0; background: #F8F9FA; padding: 15px; border-radius: 8px; border: 1px solid #EEE; }
              .card { text-align: center; }
              .card-lbl { font-size: 10px; color: #777; text-transform: uppercase; }
              .card-val { font-size: 18px; font-weight: bold; margin-top: 5px; }
              .green { color: #27AE60; }
              .red { color: #C0392B; }
              .blue { color: #2980B9; }
              
              table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
              th { background-color: #34495E; color: white; padding: 8px; text-align: left; }
              td { border-bottom: 1px solid #EEE; padding: 8px; }
              tr:nth-child(even) { background-color: #F9F9F9; }
              
              .section-title { margin-top: 30px; border-bottom: 2px solid #34495E; padding-bottom: 5px; font-size: 14px; font-weight: bold; text-transform: uppercase; }
              .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #999; }
            </style>
          </head>
          <body>
            <h1>Relatório Financeiro</h1>
            <h3>${dataIni} até ${dataFim}</h3>

            <div class="resumo">
              <div class="card">
                <div class="card-lbl">Capital Emprestado</div>
                <div class="card-val red">R$ ${totalCapitalInvestido.toFixed(2)}</div>
              </div>
              <div class="card">
                <div class="card-lbl">Entrada Bruta</div>
                <div class="card-val blue">R$ ${totalEntradasBrutas.toFixed(2)}</div>
              </div>
              <div class="card">
                <div class="card-lbl">Lucro Estimado</div>
                <div class="card-val green">R$ ${totalLucroEstimado.toFixed(2)}</div>
              </div>
            </div>

            <div class="section-title">Saídas (Novos Empréstimos)</div>
            ${listaInvestimentos.length > 0 ? `
              <table>
                <tr><th>Cliente</th><th>Data</th><th>Valor</th></tr>
                ${listaInvestimentos.join('')}
              </table>
            ` : '<p style="font-size:12px; color:#999;">Nenhum empréstimo novo neste período.</p>'}

            <div class="section-title">Entradas (Pagamentos)</div>
            ${listaEntradas.length > 0 ? `
              <table>
                <tr><th>Cliente</th><th>Data</th><th>Tipo</th><th>Valor Pago</th><th>Lucro Aprox.</th></tr>
                ${listaEntradas.join('')}
              </table>
            ` : '<p style="font-size:12px; color:#999;">Nenhum pagamento recebido neste período.</p>'}

            <div class="footer">
              Gerado automaticamente pelo AppEmprestimos em ${new Date().toLocaleString('pt-BR')}
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      setLoading(false);
      fechar();

    } catch (error) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <Modal visible={visivel} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.titulo}>Gerar Relatório PDF</Text>
          
          <Text style={styles.label}>Data Início (DD/MM/AAAA)</Text>
          <TextInput 
            style={styles.input} 
            value={dataIni} 
            onChangeText={setDataIni} 
            keyboardType="numbers-and-punctuation"
            placeholder="Ex: 01/01/2025"
          />

          <Text style={styles.label}>Data Fim (DD/MM/AAAA)</Text>
          <TextInput 
            style={styles.input} 
            value={dataFim} 
            onChangeText={setDataFim}
            keyboardType="numbers-and-punctuation"
            placeholder="Ex: 31/01/2025"
          />

          {loading ? (
            <ActivityIndicator size="large" color="#2C3E50" style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.botoes}>
              <TouchableOpacity style={[styles.btn, styles.btnCancelar]} onPress={fechar}>
                <Text style={styles.btnTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnGerar]} onPress={gerarRelatorio}>
                <Ionicons name="document-text-outline" size={20} color="#FFF" style={{ marginRight: 5 }} />
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '85%', backgroundColor: '#FFF', borderRadius: 15, padding: 20, elevation: 5 },
  titulo: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#2C3E50' },
  label: { fontSize: 14, color: '#666', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, marginBottom: 15, fontSize: 16, backgroundColor: '#FAFAFA' },
  botoes: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  btn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  btnCancelar: { backgroundColor: '#EEE', marginRight: 10 },
  btnGerar: { backgroundColor: '#2C3E50' },
  btnTxt: { fontWeight: 'bold' }
});