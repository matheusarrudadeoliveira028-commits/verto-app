import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';
import { Contrato } from '../types';

type Props = {
  visivel: boolean;
  clienteNome: string;
  fechar: () => void;
  salvar: (novoContrato: Contrato) => void;
};

export default function ModalNovoEmprestimo({ visivel, clienteNome, fechar, salvar }: Props) {
  const [valor, setValor] = useState('');
  const [juros, setJuros] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [garantia, setGarantia] = useState('');
  const [multa, setMulta] = useState('');
  
  // ALTERADO: Estado inicial com SEMANAL
  const [frequencia, setFrequencia] = useState<'MENSAL' | 'SEMANAL' | 'DIARIO'>('MENSAL');
  const [diasDiario, setDiasDiario] = useState('');

  const handleSalvar = () => {
    if (!valor || !juros || !dataInicio) return Alert.alert("Erro", "Preencha os campos principais");
    if (frequencia === 'DIARIO' && !diasDiario) return Alert.alert("Erro", "Informe a quantidade de dias");

    try {
      const capital = parseFloat(valor);
      const taxa = parseFloat(juros);
      const valMulta = multa ? parseFloat(multa) : 0;
      const qtdDias = diasDiario ? parseInt(diasDiario) : 0;

      const p = dataInicio.split('/');
      const dataVenc = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));

      // LÓGICA ATUALIZADA
      if (frequencia === 'MENSAL') {
        dataVenc.setMonth(dataVenc.getMonth() + 1);
      } else if (frequencia === 'SEMANAL') {
        dataVenc.setDate(dataVenc.getDate() + 7); // Soma 7 dias
      } else if (frequencia === 'DIARIO') {
        dataVenc.setDate(dataVenc.getDate() + qtdDias);
      }

      const novoContrato: Contrato = {
        id: Date.now(),
        capital,
        taxa,
        lucroTotal: 0,
        multasPagas: 0,
        frequencia,        
        diasDiario: qtdDias, 
        dataInicio,
        proximoVencimento: dataVenc.toLocaleDateString('pt-BR'),
        // \u00F3 = ó
        garantia: garantia || 'Nota Promiss\u00F3ria', 
        valorMultaDiaria: valMulta,
        status: 'ATIVO',
        // \u00E9 = é
        movimentacoes: [`${dataInicio}: Empr\u00E9stimo ${frequencia} iniciado (R$ ${capital})`] 
      };

      salvar(novoContrato);
      setValor(''); setJuros(''); setDataInicio(''); setGarantia(''); setMulta('');
      setFrequencia('MENSAL'); setDiasDiario('');
      
    } catch (e) { Alert.alert("Erro", "Data inv\u00E1lida (use DD/MM/AAAA)"); }
  };

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={fechar}>
      <View style={styles.mF}>
        <View style={styles.mC}>
          {/* \u00E9 = é */}
          <Text style={styles.mT}>Novo Empr{'\u00E9'}stimo: {clienteNome}</Text>
          
          {/* \u00EA = ê (Frequência) */}
          <Text style={styles.label}>Frequ{'\u00EA'}ncia do Pagamento</Text>
          <View style={styles.boxFreq}>
            <TouchableOpacity 
              style={[styles.btnFreq, frequencia === 'MENSAL' && styles.btnFreqAtivo]} 
              onPress={() => setFrequencia('MENSAL')}>
              <Text style={[styles.txtFreq, frequencia === 'MENSAL' && styles.txtFreqAtivo]}>Mensal</Text>
            </TouchableOpacity>

            {/* BOTÃO ALTERADO PARA SEMANAL */}
            <TouchableOpacity 
              style={[styles.btnFreq, frequencia === 'SEMANAL' && styles.btnFreqAtivo]} 
              onPress={() => setFrequencia('SEMANAL')}>
              <Text style={[styles.txtFreq, frequencia === 'SEMANAL' && styles.txtFreqAtivo]}>Semanal</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btnFreq, frequencia === 'DIARIO' && styles.btnFreqAtivo]} 
              onPress={() => setFrequencia('DIARIO')}>
              {/* \u00E1 = á (Diário) */}
              <Text style={[styles.txtFreq, frequencia === 'DIARIO' && styles.txtFreqAtivo]}>Di{'\u00E1'}rio</Text>
            </TouchableOpacity>
          </View>

          {frequencia === 'DIARIO' && (
            <TextInput 
              placeholder="Quantos dias? (Ex: 20)" 
              style={styles.input} 
              keyboardType="numeric" 
              value={diasDiario} 
              onChangeText={setDiasDiario} 
            />
          )}

          <TextInput placeholder="Valor (R$)" style={styles.input} keyboardType="numeric" value={valor} onChangeText={setValor} />
          <TextInput placeholder="Juros (%)" style={styles.input} keyboardType="numeric" value={juros} onChangeText={setJuros} />
          
          {/* Placeholder corrigido */}
          <TextInput 
            placeholder={"Data In\u00EDcio (DD/MM/AAAA)"} 
            style={styles.input} 
            value={dataInicio} 
            onChangeText={setDataInicio} 
          />
          
          <TextInput placeholder="Garantia (Opcional)" style={styles.input} value={garantia} onChangeText={setGarantia} />
          <TextInput placeholder="Multa por atraso (R$)" style={[styles.input, { borderColor: '#E74C3C', borderWidth: 1 }]} keyboardType="numeric" value={multa} onChangeText={setMulta} />
          
          <TouchableOpacity style={styles.btnP} onPress={handleSalvar}>
            <Text style={styles.btnTxt}>CONFIRMAR</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={fechar} style={styles.btnCancel}>
            <Text style={{color:'#999'}}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mF: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  mC: { backgroundColor: '#FFF', width: '85%', padding: 20, borderRadius: 15 },
  mT: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  label: { fontSize: 12, color: '#666', marginBottom: 5, fontWeight: 'bold' },
  input: { backgroundColor: '#F1F3F4', padding: 12, borderRadius: 8, marginBottom: 10, color: '#333' },
  boxFreq: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  btnFreq: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8, backgroundColor: '#EEE', marginHorizontal: 2 },
  btnFreqAtivo: { backgroundColor: '#2980B9' },
  txtFreq: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  txtFreqAtivo: { color: '#FFF' },
  btnP: { backgroundColor: '#27AE60', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 5 },
  btnTxt: { color: '#FFF', fontWeight: 'bold' },
  btnCancel: { marginTop: 15, alignItems: 'center', padding: 10 }
});