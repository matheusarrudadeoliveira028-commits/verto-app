// types/index.ts

export interface Contrato {
  id: number;
  capital: number;
  taxa: number;
  lucroTotal: number;
  multasPagas?: number; 
  
  frequencia: 'MENSAL' | 'SEMANAL' | 'DIARIO';
  diasDiario?: number; 

  // PARCELAMENTO
  totalParcelas?: number;
  parcelasPagas?: number;
  valorParcela?: number;
  
  // NOVO CAMPO: Quanto de lucro tem dentro de cada parcela?
  lucroJurosPorParcela?: number;

  dataInicio: string;
  proximoVencimento: string;
  garantia: string;
  valorMultaDiaria?: number;
  
  status: 'ATIVO' | 'QUITADO' | 'PARCELADO';
  movimentacoes: string[];
}

export interface Cliente {
  nome: string;
  whatsapp: string;
  endereco: string;
  indicacao: string;
  reputacao: string;
  contratos: Contrato[];
}

export interface Totais {
  rua: number;
  lucro: number;
  multas: number;
}