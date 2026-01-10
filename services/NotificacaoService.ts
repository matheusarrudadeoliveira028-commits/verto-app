import * as Notifications from 'expo-notifications';
import { Cliente } from '../types';

// Configuração da Notificação
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function verificarNotificacoes(clientes: Cliente[]) {
  // 1. Pede permissão (se ainda não tiver)
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    if (newStatus !== 'granted') return;
  }

  // 2. Conta tudo que está pendente (Hoje + Atrasados)
  let qtdCobrancas = 0;
  let valorTotal = 0;
  
  const hoje = new Date();
  hoje.setHours(0,0,0,0);

  clientes.forEach(cli => {
    (cli.contratos || []).forEach(con => {
      // Considera apenas contratos Ativos ou Parcelados
      if (con.status === 'ATIVO' || con.status === 'PARCELADO') {
        const p = con.proximoVencimento.split('/');
        const dataVenc = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
        
        // Se a data de vencimento for HOJE ou ANTES DE HOJE (Atrasado)
        if (dataVenc.getTime() <= hoje.getTime()) {
          qtdCobrancas++;
          
          if(con.status === 'PARCELADO') {
            valorTotal += (con.valorParcela || 0);
          } else {
            // Se for quitação total, soma capital + juros
            valorTotal += (con.capital + (con.capital * (con.taxa/100)));
          }
        }
      }
    });
  });

  // 3. Manda a notificação do Chefe
  if (qtdCobrancas > 0) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Bom dia, chefe! 🎩",
        body: `O Sr. tem ${qtdCobrancas} cobranças para fazer hoje (Total: R$ ${valorTotal.toFixed(2)})`,
        sound: true,
      },
      trigger: null, // Manda na hora
    });
  }
}