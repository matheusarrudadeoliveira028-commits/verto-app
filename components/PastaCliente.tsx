import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Cliente, Contrato } from '../types';

type Props = {
  cliente: Cliente;
  expandido: boolean;
  aoExpandir: () => void;
  aoNovoEmprestimo: () => void;
  aoEditarCliente: () => void;
  aoExcluirCliente: () => void;
  aoEditarContrato: (c: Contrato) => void;
  aoExcluirContrato: (id: number) => void;
  aoRenovarOuQuitar: (tipo: string, c: Contrato) => void;
  aoNegociar: (c: Contrato) => void;
  aoPagarParcela: (c: Contrato) => void;
};

export default function PastaCliente({ 
  cliente, expandido, aoExpandir, aoNovoEmprestimo, 
  aoEditarCliente, aoExcluirCliente, aoEditarContrato, aoExcluirContrato, 
  aoRenovarOuQuitar, aoNegociar, aoPagarParcela 
}: Props) {

  const abrirWhatsapp = (numero: string) => {
    if (!numero) return Alert.alert("Ops", "Cliente sem número cadastrado.");
    const apenasNumeros = numero.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/55${apenasNumeros}`);
  };

  // --- GERAR PDF TOP (CORRIGIDO UTF-8) ---
  const gerarPDF = async (con: Contrato) => {
    try {
      const linhasHistorico = (con.movimentacoes || []).map(m => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; color: #555;">${m}</td>
        </tr>
      `).join('');

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #333; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2C3E50; padding-bottom: 15px; }
              .title { font-size: 24px; font-weight: bold; color: #2C3E50; margin: 0; }
              .subtitle { font-size: 14px; color: #7F8C8D; margin-top: 5px; }
              
              .box { background-color: #F4F6F7; padding: 20px; border-radius: 8px; margin-bottom: 25px; border: 1px solid #E5E8E8; }
              .box-title { font-size: 16px; font-weight: bold; color: #2980B9; margin-top: 0; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; }
              
              .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
              .label { font-weight: bold; color: #555; }
              .value { color: #000; }
              
              .highlight { color: #27AE60; font-weight: bold; }
              .danger { color: #C0392B; font-weight: bold; }

              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th { text-align: left; background-color: #ECF0F1; padding: 12px; border-bottom: 2px solid #BDC3C7; color: #2C3E50; }
              
              .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #BDC3C7; border-top: 1px solid #EEE; padding-top: 10px; }
            </style>
          </head>
          <body>
            
            <div class="header">
              <h1 class="title">Extrato Financeiro</h1>
              <p class="subtitle">Relatório Detalhado de Empréstimo</p>
            </div>

            <div class="box">
              <h3 class="box-title">👤 Dados do Cliente</h3>
              <div class="row"><span class="label">Nome:</span> <span class="value">${cliente.nome}</span></div>
              <div class="row"><span class="label">Telefone:</span> <span class="value">${cliente.whatsapp || '--'}</span></div>
            </div>

            <div class="box" style="background-color: #FEF9E7; border-color: #F1C40F;">
              <h3 class="box-title" style="color: #D35400;">💰 Resumo do Contrato #${con.id}</h3>
              
              <div class="row">
                <span class="label">Status Atual:</span> 
                <span class="value" style="font-weight:bold;">${con.status}</span>
              </div>
              
              <hr style="border: 0; border-top: 1px solid #E5E8E8; margin: 10px 0;">

              <div class="row">
                <span class="label">Saldo Devedor Atual (Capital na Rua):</span> 
                <span class="value danger">R$ ${con.capital.toFixed(2)}</span>
              </div>

              <div class="row">
                <span class="label">Lucro Gerado (Juros + Multas):</span> 
                <span class="value highlight">R$ ${(con.lucroTotal || 0).toFixed(2)}</span>
              </div>
              
              <div class="row">
                 <span class="label">Configuração:</span>
                 <span class="value">${con.status === 'PARCELADO' ? `Parcelado em ${con.totalParcelas}x` : `${con.taxa}% de Juros (${con.frequencia})`}</span>
              </div>
            </div>

            <h3 style="color: #2C3E50; border-bottom: 2px solid #eee; padding-bottom: 10px;">📜 Histórico de Movimentações</h3>
            <table>
              <thead>
                <tr><th>Descrição da Ocorrência</th></tr>
              </thead>
              <tbody>
                ${linhasHistorico.length > 0 ? linhasHistorico : '<tr><td style="padding:15px">Nenhuma movimentação registrada.</td></tr>'}
              </tbody>
            </table>

            <div class="footer">
              Documento gerado pelo App Verto em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
            </div>

          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });

    } catch (error) { Alert.alert("Erro", "Falha ao gerar PDF."); }
  };

  // Cálculos do Resumo da Pasta
  let dividaTotal = 0, lucroTotal = 0, multaTotal = 0;
  (cliente.contratos || []).forEach(con => {
    if (con.status === 'ATIVO' || con.status === 'PARCELADO') dividaTotal += (con.capital || 0);
    lucroTotal += (con.lucroTotal || 0);
    multaTotal += (con.multasPagas || 0);
  });
  
  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={aoExpandir} style={styles.header}>
        <View style={{flex: 1}}>
          <View style={styles.linhaTitulo}>
             <Text style={styles.nome}>{cliente.nome}</Text>
             <Text style={styles.seta}>{expandido ? '▲' : '▼'}</Text>
          </View>
          <View style={styles.resumoHeader}>
            <Text style={styles.txtResumo}>Rua: <Text style={{color:'#C0392B'}}>R$ {dividaTotal.toFixed(0)}</Text></Text>
            <Text style={styles.txtResumo}>Lucro: <Text style={{color:'#27AE60'}}>R$ {lucroTotal.toFixed(0)}</Text></Text>
            <Text style={styles.txtResumo}>Multas: <Text style={{color:'#E67E22'}}>R$ {multaTotal.toFixed(0)}</Text></Text>
          </View>
        </View>
      </TouchableOpacity>

      {expandido && (
        <View style={styles.corpo}>
          <View style={styles.fichaCadastral}>
            <TouchableOpacity onPress={() => abrirWhatsapp(cliente.whatsapp)} style={styles.btnZap}>
              <Text style={styles.txtZap}>💬 Conversar no WhatsApp</Text>
            </TouchableOpacity>
            <Text style={styles.linhaFicha}>📍 {cliente.endereco || 'Sem endereço'}</Text>
            {cliente.indicacao ? <Text style={styles.linhaFicha}>🤝 Indicado por: {cliente.indicacao}</Text> : null}
            <Text style={styles.linhaFicha}>⭐ Reputação: {cliente.reputacao || 'Neutro'}</Text>
          </View>

          <View style={styles.acoesCliente}>
            <TouchableOpacity onPress={aoEditarCliente} style={styles.btnAcaoCli}><Text style={styles.txtAcaoCli}>Editar</Text></TouchableOpacity>
            <TouchableOpacity onPress={aoNovoEmprestimo} style={[styles.btnAcaoCli, {backgroundColor:'#27AE60'}]}><Text style={[styles.txtAcaoCli, {color:'#FFF'}]}>+ Empréstimo</Text></TouchableOpacity>
            <TouchableOpacity onPress={aoExcluirCliente} style={[styles.btnAcaoCli, {backgroundColor:'#E74C3C'}]}><Text style={[styles.txtAcaoCli, {color:'#FFF'}]}>Excluir</Text></TouchableOpacity>
          </View>

          {cliente.contratos && cliente.contratos.map((con) => (
            <View key={con.id} style={[styles.contrato, con.status === 'QUITADO' && styles.quitado]}>
              <View style={styles.conHeader}>
                <View>
                  <Text style={styles.conId}>Contrato #{con.id}</Text>
                  <Text style={styles.conValor}>R$ {con.capital?.toFixed(2)}</Text>
                </View>
                <View style={{flexDirection:'row', alignItems:'center', gap: 10}}>
                  <View style={[styles.badge, con.status === 'QUITADO' ? {backgroundColor:'#CCC'} : con.status === 'PARCELADO' ? {backgroundColor:'#8E44AD'} : {backgroundColor:'#E67E22'}]}>
                    <Text style={styles.badgeTxt}>{con.status}</Text>
                  </View>
                  <TouchableOpacity onPress={() => gerarPDF(con)} style={styles.btnExportar}><Text style={{fontSize:16}}>📄</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => aoEditarContrato(con)}><Text style={{fontSize:18}}>✎</Text></TouchableOpacity>
                </View>
              </View>

              <Text style={styles.info}>Vence: {con.proximoVencimento}</Text>
              <Text style={styles.info}>🔐 Garantia: {con.garantia || 'Nenhuma'}</Text>

              {con.status === 'PARCELADO' ? (
                 <View style={{marginTop: 5}}>
                   <Text style={{fontWeight:'bold', color:'#8E44AD'}}>
                     Progresso: {con.parcelasPagas}/{con.totalParcelas} Pagas (R$ {con.valorParcela?.toFixed(2)})
                   </Text>
                 </View>
              ) : (
                 <Text style={styles.info}>Juros: {con.taxa}% ({con.frequencia || 'MENSAL'})</Text>
              )}

              {con.status !== 'QUITADO' && (
                <View style={styles.botoesCon}>
                  {con.status === 'ATIVO' ? (
                    <>
                      <TouchableOpacity onPress={() => aoRenovarOuQuitar('RENOVAR', con)} style={styles.btnRenovar}><Text style={styles.txtBtn}>RENOVAR</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => aoRenovarOuQuitar('QUITAR', con)} style={styles.btnQuitar}><Text style={styles.txtBtn}>QUITAR</Text></TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity onPress={() => aoPagarParcela(con)} style={styles.btnParcela}><Text style={styles.txtBtn}>PAGAR PARCELA {((con.parcelasPagas||0)+1)}/{con.totalParcelas}</Text></TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => aoExcluirContrato(con.id)} style={styles.btnLixo}><Text>🗑</Text></TouchableOpacity>
                </View>
              )}

              {con.status === 'ATIVO' && (
                <TouchableOpacity onPress={() => aoNegociar(con)} style={styles.btnNegociar}><Text style={styles.txtBtn}>NEGOCIAR / PARCELAR DÍVIDA</Text></TouchableOpacity>
              )}

              <View style={styles.historico}>
                 <Text style={{fontSize:10, fontWeight:'bold', color:'#999', marginBottom:2}}>ÚLTIMAS MOVIMENTAÇÕES:</Text>
                 {con.movimentacoes?.slice(0, 3).map((m, k) => <Text key={k} style={{fontSize:10, color:'#555'}}>{m}</Text>)}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: 10, marginBottom: 10, elevation: 2 },
  header: { padding: 15 },
  linhaTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  nome: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
  seta: { fontSize: 18, color: '#BDC3C7' },
  resumoHeader: { flexDirection: 'row', gap: 15 },
  txtResumo: { fontSize: 12, color: '#555', fontWeight: 'bold' },
  corpo: { padding: 15, borderTopWidth: 1, borderTopColor: '#F0F2F5' },
  fichaCadastral: { backgroundColor: '#F8F9FA', padding: 10, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#EEE' },
  btnZap: { backgroundColor: '#25D366', paddingVertical: 8, borderRadius: 20, alignItems: 'center', marginBottom: 10, flexDirection: 'row', justifyContent: 'center' },
  txtZap: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  linhaFicha: { fontSize: 13, color: '#444', marginBottom: 3 },
  acoesCliente: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 15 },
  btnAcaoCli: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#EEE', marginLeft: 8 },
  txtAcaoCli: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  contrato: { backgroundColor: '#F8F9F9', borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E5E8E8' },
  quitado: { opacity: 0.6, backgroundColor: '#EAEDED' },
  conHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 },
  conId: { fontSize: 10, color: '#7F8C8D', fontWeight: 'bold' },
  conValor: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeTxt: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  btnExportar: { paddingHorizontal: 5 },
  info: { fontSize: 12, color: '#555', marginBottom: 2 },
  botoesCon: { flexDirection: 'row', marginTop: 10, gap: 8 },
  btnRenovar: { flex: 1, backgroundColor: '#2980B9', padding: 10, borderRadius: 6, alignItems: 'center' },
  btnQuitar: { flex: 1, backgroundColor: '#27AE60', padding: 10, borderRadius: 6, alignItems: 'center' },
  btnParcela: { flex: 1, backgroundColor: '#8E44AD', padding: 10, borderRadius: 6, alignItems: 'center' },
  btnLixo: { padding: 10, justifyContent: 'center' },
  txtBtn: { color: '#FFF', fontWeight: 'bold', fontSize: 11 },
  btnNegociar: { marginTop: 8, backgroundColor: '#9B59B6', padding: 8, borderRadius: 6, alignItems: 'center' },
  historico: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#DDD', paddingTop: 5 }
});