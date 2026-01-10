import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';

type Props = {
  aoSalvar: (dadosNovoCliente: any) => void;
  aoSolicitarImportacao: () => void;
};

export default function TelaCadastro({ aoSalvar, aoSolicitarImportacao }: Props) {
  // As variáveis agora moram aqui, não pesam mais no arquivo principal
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [endereco, setEndereco] = useState('');
  const [indicacao, setIndicacao] = useState('');
  const [reputacao, setReputacao] = useState('');

  const handleSalvar = () => {
    if (!nome.trim()) return Alert.alert("Erro", "Nome obrigat\u00F3rio");
    
    // Manda o pacote pronto para o Pai salvar
    aoSalvar({
      nome: nome.trim().toUpperCase(),
      whatsapp,
      endereco,
      indicacao,
      reputacao,
      contratos: []
    });

    // Limpa os campos
    setNome('');
    setWhatsapp('');
    setEndereco('');
    setIndicacao('');
    setReputacao('');
  };

  return (
    <View style={styles.form}>
      <Text style={{marginBottom:10, fontWeight:'bold', color:'#27AE60'}}>CADASTRAR NOVO</Text>
      
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
        <Text style={styles.btnTxt}>SALVAR CLIENTE</Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={aoSolicitarImportacao} style={{marginTop:30, alignSelf:'center'}}>
        <Text style={{color:'#999'}}>Restaurar Backup</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { backgroundColor: '#FFF', padding: 20, borderRadius: 15 },
  input: { backgroundColor: '#F1F3F4', padding: 12, borderRadius: 8, marginBottom: 10, color: '#333' },
  btnP: { backgroundColor: '#27AE60', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnTxt: { color: '#FFF', fontWeight: 'bold' },
});