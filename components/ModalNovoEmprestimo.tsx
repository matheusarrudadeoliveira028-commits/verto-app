import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Contrato } from '../types';

interface Props {
  visivel: boolean;
  fechar: () => void;
  salvar: (novo: Contrato) => void;
  clienteNome: string;
}

export default function ModalNovoEmprestimo({ visivel, fechar, salvar, clienteNome }: Props) {
  const [capital, setCapital] = useState('');
  const [taxa, setTaxa] = useState('20');
  const [frequencia, setFrequencia] = useState('SEMANAL');
  const [multa, setMulta] = useState('');
  const [diasDiario, setDiasDiario] = useState('20');
  
  // Novos Campos
  const [garantia, setGarantia] = useState('');
  const [dataInicio, setDataInicio] = useState('');

  // Seta a data de hoje ao abrir
  useEffect(() => {
    if (visivel) {
      setDataInicio(new Date().toLocaleDateString('pt-BR'));
    }
  }, [visivel]);

  const handleSalvar = () => {
    if (!capital) {
      Alert.alert("Erro", "Informe o valor do empréstimo");
      return;
    }

    const novo: any = {
      id: Date.now(),
      capital: parseFloat(capital.replace(',', '.')),
      taxa: parseFloat(taxa.replace(',', '.')),
      frequencia,
      dataInicio: dataInicio, // Usa a data escolhida
      garantia: garantia,     // Salva a garantia
      status: 'ATIVO',
      movimentacoes: []
    };

    if (frequencia !== 'DIARIO' && multa) {
      novo.valorMultaDiaria = parseFloat(multa.replace(',', '.'));
    } else {
      novo.valorMultaDiaria = 0;
    }

    if (frequencia === 'DIARIO') {
        novo.diasDiario = parseInt(diasDiario);
    }

    salvar(novo);
    
    // Limpa
    setCapital('');
    setTaxa('20');
    setMulta('');
    setDiasDiario('20');
    setFrequencia('SEMANAL');
    setGarantia('');
  };

  return (
    <Modal visible={visivel} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.titulo}>Novo Empréstimo</Text>
            <TouchableOpacity onPress={fechar}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.subtitulo}>Cliente: {clienteNome}</Text>

          <ScrollView style={{ maxHeight: 450 }}>
            
            <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.label}>Valor (R$)</Text>
                    <TextInput 
                      style={styles.input} 
                      value={capital} 
                      onChangeText={setCapital} 
                      keyboardType="numeric" 
                      placeholder="0.00"
                      autoFocus
                    />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Data Início</Text>
                    <TextInput 
                      style={styles.input} 
                      value={dataInicio} 
                      onChangeText={setDataInicio} 
                      keyboardType="numbers-and-punctuation" 
                      placeholder="DD/MM/AAAA"
                    />
                </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>Taxa (%)</Text>
                <TextInput 
                  style={styles.input} 
                  value={taxa} 
                  onChangeText={setTaxa} 
                  keyboardType="numeric" 
                />
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Modalidade</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={frequencia}
                    onValueChange={(itemValue: any) => setFrequencia(itemValue)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Semanal (4x)" value="SEMANAL" />
                    <Picker.Item label="Diário" value="DIARIO" />
                    <Picker.Item label="Mensal" value="MENSAL" />
                  </Picker>
                </View>
              </View>
            </View>
            
            {frequencia === 'DIARIO' ? (
              <View>
                 <Text style={styles.label}>Quantidade de Dias</Text>
                 <TextInput 
                    style={styles.input} 
                    value={diasDiario} 
                    onChangeText={setDiasDiario} 
                    keyboardType="numeric"
                 />
                 <Text style={styles.hint}>* Sem multa automática.</Text>
              </View>
            ) : (
              <View>
                <Text style={styles.label}>Multa Diária (R$)</Text>
                <TextInput 
                  style={styles.input} 
                  value={multa} 
                  onChangeText={setMulta} 
                  keyboardType="numeric" 
                  placeholder="Ex: 10.00 (Opcional)"
                />
              </View>
            )}

            <Text style={styles.label}>Garantia (Opcional)</Text>
            <TextInput 
              style={styles.input} 
              value={garantia} 
              onChangeText={setGarantia} 
              placeholder="Ex: Celular, Moto, etc."
            />

          </ScrollView>

          <TouchableOpacity style={styles.btnSalvar} onPress={handleSalvar}>
            <Text style={styles.btnTxt}>Criar Empréstimo</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '90%', backgroundColor: '#FFF', borderRadius: 15, padding: 20, elevation: 5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  titulo: { fontSize: 20, fontWeight: 'bold', color: '#2C3E50' },
  subtitulo: { fontSize: 14, color: '#7F8C8D', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16, backgroundColor: '#FAFAFA' },
  row: { flexDirection: 'row', marginBottom: 5 },
  pickerContainer: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, overflow: 'hidden', height: 50, justifyContent: 'center', backgroundColor: '#FAFAFA' },
  picker: { width: '100%' },
  btnSalvar: { backgroundColor: '#2C3E50', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  btnTxt: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  hint: { fontSize: 12, color: '#999', marginTop: -10, marginBottom: 15, fontStyle: 'italic' }
});