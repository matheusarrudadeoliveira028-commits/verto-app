import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';

type Props = {
  visivel: boolean;
  clienteOriginal: any;
  fechar: () => void;
  salvar: (dadosAtualizados: any) => void;
};

export default function ModalEditarCliente({ visivel, clienteOriginal, fechar, salvar }: Props) {
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [endereco, setEndereco] = useState('');
  const [indicacao, setIndicacao] = useState('');
  const [reputacao, setReputacao] = useState('');

  useEffect(() => {
    if (clienteOriginal) {
      setNome(clienteOriginal.nome || '');
      setWhatsapp(clienteOriginal.whatsapp || '');
      setEndereco(clienteOriginal.endereco || '');
      setIndicacao(clienteOriginal.indicacao || '');
      setReputacao(clienteOriginal.reputacao || '');
    }
  }, [clienteOriginal]);

  const handleSalvar = () => {
    if (!nome.trim()) return Alert.alert("Erro", "Nome obrigat\u00F3rio");
    
    salvar({
      nome: nome.trim().toUpperCase(),
      whatsapp,
      endereco,
      indicacao,
      reputacao
    });
  };

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={fechar}>
      <View style={styles.mF}>
        <View style={styles.mC}>
          <Text style={styles.mT}>Editar Cliente</Text>
          
          <TextInput 
            placeholder="Nome" 
            style={styles.input} 
            value={nome} 
            onChangeText={setNome} 
          />
          <TextInput 
            placeholder="WhatsApp" 
            style={styles.input} 
            value={whatsapp} 
            onChangeText={setWhatsapp} 
            keyboardType="phone-pad" 
          />
          
          {/* AQUI ESTÁ O SEGREDO: Usamos {"texto"} para forçar o código */}
          <TextInput 
            placeholder={"Endere\u00E7o"} 
            style={styles.input} 
            value={endereco} 
            onChangeText={setEndereco} 
          />
          
          <TextInput 
            placeholder={"Indica\u00E7\u00E3o"} 
            style={styles.input} 
            value={indicacao} 
            onChangeText={setIndicacao} 
          />
          
          <TextInput 
            placeholder={"Reputa\u00E7\u00E3o"} 
            style={styles.input} 
            value={reputacao} 
            onChangeText={setReputacao} 
          />
          
          <TouchableOpacity style={styles.btnP} onPress={handleSalvar}>
            <Text style={styles.btnTxt}>{"SALVAR MUDAN\u00C7AS"}</Text>
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
  input: { backgroundColor: '#F1F3F4', padding: 12, borderRadius: 8, marginBottom: 10, color: '#333' },
  btnP: { backgroundColor: '#27AE60', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnTxt: { color: '#FFF', fontWeight: 'bold' },
  btnCancel: { marginTop: 15, alignItems: 'center', padding: 10 }
});