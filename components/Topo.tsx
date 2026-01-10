import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share, Alert } from 'react-native';

// Aqui definimos que o Topo precisa receber os dados para fazer o backup
type Props = {
  dados: any;
};

export default function Topo({ dados }: Props) {
  
  // A função de backup agora mora aqui
  const exportarBackup = async () => {
    try {
      const jsonDados = JSON.stringify(dados);
      await Share.share({ message: jsonDados, title: 'Backup Verto' });
    } catch (error) {
      Alert.alert("Erro", "Falha no backup");
    }
  };

  return (
    <View style={styles.headerTop}>
      <Text style={styles.logo}>VERTO</Text>
      <TouchableOpacity onPress={exportarBackup} style={styles.btnBackup}>
        <Text style={styles.btnTxtBackup}>BACKUP</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  logo: { fontSize: 24, fontWeight: 'bold', color: '#27AE60' },
  btnBackup: { backgroundColor: '#34495E', padding: 8, borderRadius: 8 },
  btnTxtBackup: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
});