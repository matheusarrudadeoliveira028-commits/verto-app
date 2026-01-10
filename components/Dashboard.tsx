import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  capital: number;
  lucro: number;
  multas: number; // Nova prop
};

export default function Dashboard({ capital, lucro, multas }: Props) {
  return (
    <View style={styles.dash}>
      <View style={styles.dashI}>
        <Text style={styles.dashL}>CAPITAL</Text>
        <Text style={[styles.dashV, { color: '#2C3E50' }]}>
          R$ {capital.toFixed(2)}
        </Text>
      </View>
      
      <View style={styles.divisor} />
      
      <View style={styles.dashI}>
        <Text style={styles.dashL}>LUCRO TOTAL</Text>
        <Text style={[styles.dashV, { color: '#27AE60' }]}>
          R$ {lucro.toFixed(2)}
        </Text>
      </View>

      <View style={styles.divisor} />

      <View style={styles.dashI}>
        <Text style={styles.dashL}>MULTAS</Text>
        <Text style={[styles.dashV, { color: '#E67E22' }]}>
          R$ {multas.toFixed(2)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dash: { 
    backgroundColor: '#FFF', 
    padding: 15, 
    borderRadius: 12, 
    marginBottom: 15, 
    flexDirection: 'row', 
    elevation: 2,
    justifyContent: 'space-between'
  },
  dashI: { flex: 1, alignItems: 'center' },
  dashL: { fontSize: 8, color: '#999', fontWeight: 'bold', marginBottom: 2 },
  dashV: { fontSize: 13, fontWeight: 'bold' }, // Reduzi um pouco para caber
  divisor: { width: 1, backgroundColor: '#EEE', height: '100%' }
});