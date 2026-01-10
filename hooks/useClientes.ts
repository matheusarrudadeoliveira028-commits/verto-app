import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Cliente, Contrato } from '../types';

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const saved = await AsyncStorage.getItem('@verto_v27_fixed');
      if (saved) {
        const parsed = JSON.parse(saved);
        setClientes(Array.isArray(parsed) ? parsed : []);
      }
    } catch (e) { console.log("Erro ao carregar"); }
  };

  const salvarNoBanco = async (novaLista: Cliente[]) => {
    try {
      setClientes(novaLista);
      await AsyncStorage.setItem('@verto_v27_fixed', JSON.stringify(novaLista));
    } catch (e) { Alert.alert("Erro", "Falha ao salvar"); }
  };

  // --- CÁLCULOS ---
  const calcularTotais = () => {
    let capitalTotal = 0, lucro = 0, multas = 0;
    clientes.forEach(cli => {
      (cli.contratos || []).forEach(con => {
        if (con.status === 'ATIVO' || con.status === 'PARCELADO') {
          capitalTotal += (con.capital || 0);
        }
        lucro += (con.lucroTotal || 0);
        multas += (con.multasPagas || 0);
      });
    });
    // Retornamos como 'rua' se o seu Dashboard antigo usar 'rua', ou 'capital' se já tiver mudado.
    // Para garantir, vou retornar os dois nomes, assim funciona em qualquer versão.
    return { rua: capitalTotal, capital: capitalTotal, lucro, multas };
  };

  const converterData = (dataStr: string) => {
    const [dia, mes, ano] = dataStr.split('/');
    return new Date(Number(ano), Number(mes) - 1, Number(dia));
  };

  // --- CRUD BÁSICO ---
  const adicionarCliente = async (novoCliente: Cliente) => {
    const lista = [novoCliente, ...clientes];
    await salvarNoBanco(lista);
  };

  const editarCliente = async (nomeAntigo: string, dadosAtualizados: Partial<Cliente>) => {
    const lista = clientes.map(c => c.nome === nomeAntigo ? { ...c, ...dadosAtualizados } : c);
    await salvarNoBanco(lista);
  };

  const excluirCliente = (nomeCliente: string) => {
    Alert.alert("Excluir", "Tem certeza?", [
      { text: "Cancelar" },
      { text: "Apagar", style: 'destructive', onPress: async () => {
          const lista = clientes.filter(c => c.nome !== nomeCliente);
          await salvarNoBanco(lista);
        } 
      }
    ]);
  };

  // --- AQUI ESTÁ A LÓGICA DO DIÁRIO ---
  const adicionarContrato = async (nomeCliente: string, novoContrato: Contrato) => {
    
    // 1. SEMANAL (4 Parcelas)
    if (novoContrato.frequencia === 'SEMANAL') {
      const jurosTotal = novoContrato.capital * (novoContrato.taxa / 100);
      const montanteTotal = novoContrato.capital + jurosTotal;
      const valorParcela = montanteTotal / 4;
      const lucroPorParcela = jurosTotal / 4;

      novoContrato.status = 'PARCELADO';
      novoContrato.totalParcelas = 4;
      novoContrato.parcelasPagas = 0;
      novoContrato.valorParcela = valorParcela;
      novoContrato.lucroJurosPorParcela = lucroPorParcela; 
      
      const dtInicio = new Date();
      dtInicio.setDate(dtInicio.getDate() + 7);
      novoContrato.proximoVencimento = dtInicio.toLocaleDateString('pt-BR');

      novoContrato.movimentacoes = [
        `${new Date().toLocaleDateString('pt-BR')}: Semanal Iniciado -> 4x de R$ ${valorParcela.toFixed(2)}`
      ];
    }

    // 2. DIÁRIO (Parcelas = Dias escolhidos)
    else if (novoContrato.frequencia === 'DIARIO' && novoContrato.diasDiario && novoContrato.diasDiario > 0) {
      const jurosTotal = novoContrato.capital * (novoContrato.taxa / 100); // Ex: 1000 + 20% = 200 juros
      const montanteTotal = novoContrato.capital + jurosTotal; // Total 1200
      const qtdDias = novoContrato.diasDiario; // Ex: 20 dias

      // CALCULO DIÁRIO: 1200 / 20 = 60 reais por dia
      const valorParcela = montanteTotal / qtdDias;
      const lucroPorParcela = jurosTotal / qtdDias;

      novoContrato.status = 'PARCELADO'; 
      novoContrato.totalParcelas = qtdDias;
      novoContrato.parcelasPagas = 0;
      novoContrato.valorParcela = valorParcela;
      novoContrato.lucroJurosPorParcela = lucroPorParcela;

      // DATA: Primeiro pagamento é AMANHÃ (+1 dia)
      const dtAmanha = new Date();
      dtAmanha.setDate(dtAmanha.getDate() + 1);
      novoContrato.proximoVencimento = dtAmanha.toLocaleDateString('pt-BR');

      novoContrato.movimentacoes = [
        `${new Date().toLocaleDateString('pt-BR')}: Diário Iniciado -> ${qtdDias} dias de R$ ${valorParcela.toFixed(2)}`
      ];
    }

    const lista = clientes.map(c => c.nome === nomeCliente ? { ...c, contratos: [novoContrato, ...(c.contratos || [])] } : c);
    await salvarNoBanco(lista);
  };

  const editarContrato = async (nomeCliente: string, contratoId: number, dadosAtualizados: Partial<Contrato>) => {
    const lista = clientes.map(cli => {
      if(cli.nome === nomeCliente) {
        const novosContratos = (cli.contratos || []).map(con => {
          if(con.id === contratoId) return { ...con, ...dadosAtualizados };
          return con;
        });
        return { ...cli, contratos: novosContratos };
      }
      return cli;
    });
    await salvarNoBanco(lista);
  };

  const excluirContrato = (contratoId: number) => {
    Alert.alert("Excluir", "Apagar este empr\u00E9stimo?", [
      { text: "Cancelar" },
      { text: "Apagar", style: 'destructive', onPress: async () => {
          const lista = clientes.map(c => ({
            ...c,
            contratos: (c.contratos || []).filter(con => con.id !== contratoId)
          }));
          await salvarNoBanco(lista);
        }
      }
    ]);
  };

  // --- RENOVAR E QUITAR ---
  const acaoRenovarQuitar = async (tipo: string, contrato: Contrato, nomeCliente: string, dataInformada: string) => {
    try {
      const vJuro = contrato.capital * (contrato.taxa / 100);
      let vMulta = 0;
      
      // Lógica de Multa
      if (contrato.valorMultaDiaria && contrato.valorMultaDiaria > 0) {
        const dataPagamento = converterData(dataInformada);
        const dataVencimento = converterData(contrato.proximoVencimento);
        const diffDays = Math.ceil((dataPagamento.getTime() - dataVencimento.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
            vMulta = diffDays * contrato.valorMultaDiaria;
        }
      }

      const lucroOperacao = vJuro + vMulta;

      const lista = clientes.map(cli => {
        if (cli.nome === nomeCliente) {
          const cons = (cli.contratos || []).map(con => {
            if (con.id === contrato.id) {
              let h = [...(con.movimentacoes || [])];
              
              if (tipo === 'RENOVAR') {
                const nD = converterData(dataInformada);
                // Renovar
                if (con.frequencia === 'SEMANAL') nD.setDate(nD.getDate() + 7);
                else if (con.frequencia === 'DIARIO') nD.setDate(nD.getDate() + 1); // Renovar Diário joga pra amanhã
                else nD.setMonth(nD.getMonth() + 1);

                let msg = `${dataInformada}: RENOVA\u00C7\u00C3O + R$ ${lucroOperacao.toFixed(2)}`;
                if(vMulta > 0) msg += ` (Multa R$ ${vMulta.toFixed(2)})`;
                
                h.unshift(msg);
                return { ...con, lucroTotal: (con.lucroTotal||0)+lucroOperacao, multasPagas: (con.multasPagas||0)+vMulta, proximoVencimento: nD.toLocaleDateString('pt-BR'), movimentacoes: h };
              
              } else {
                // Quitar
                const totalParaQuitar = contrato.capital + lucroOperacao;
                h.unshift(`${dataInformada}: QUITADO - Recebido: R$ ${totalParaQuitar.toFixed(2)}`);
                return { ...con, status: 'QUITADO' as const, lucroTotal: (con.lucroTotal||0)+lucroOperacao, multasPagas: (con.multasPagas||0)+vMulta, movimentacoes: h };
              }
            }
            return con;
          });
          return { ...cli, contratos: cons };
        }
        return cli;
      });
      
      await salvarNoBanco(lista);
    } catch (e) { Alert.alert("Erro", "Data inv\u00E1lida"); }
  };

  const criarAcordo = async (nomeCliente: string, contratoId: number, valorTotal: number, qtdParcelas: number, dataPrimeira: string, multaDiaria: number) => {
    const valorParcela = valorTotal / qtdParcelas;
    const lista = clientes.map(cli => {
      if(cli.nome === nomeCliente) {
        const cons = (cli.contratos || []).map(con => {
          if(con.id === contratoId) {
            const saldoAnterior = con.capital || 0;
            const lucroTotalDoAcordo = valorTotal - saldoAnterior;
            const lucroPorParcela = lucroTotalDoAcordo > 0 ? (lucroTotalDoAcordo / qtdParcelas) : 0;
            return {
              ...con,
              status: 'PARCELADO' as const,
              capital: valorTotal,
              totalParcelas: qtdParcelas,
              parcelasPagas: 0,
              valorParcela: valorParcela,
              valorMultaDiaria: multaDiaria, 
              lucroJurosPorParcela: lucroPorParcela,
              proximoVencimento: dataPrimeira,
              movimentacoes: [`${dataPrimeira}: ACORDO -> R$ ${valorTotal.toFixed(2)} (${qtdParcelas}x)`, ...(con.movimentacoes || [])]
            };
          }
          return con;
        });
        return { ...cli, contratos: cons };
      }
      return cli;
    });
    await salvarNoBanco(lista);
  };

  // --- PAGAMENTO DE PARCELA ---
  const pagarParcela = async (nomeCliente: string, contrato: Contrato, dataPagamento: string) => {
    try {
      let vMulta = 0;
      let diasAtraso = 0;
      
      if (contrato.valorMultaDiaria && contrato.valorMultaDiaria > 0) {
        const dtPag = converterData(dataPagamento);
        const dtVenc = converterData(contrato.proximoVencimento);
        const diffTime = dtPag.getTime() - dtVenc.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > 0) {
          diasAtraso = diffDays;
          vMulta = diffDays * contrato.valorMultaDiaria;
        }
      }

      const lista = clientes.map(cli => {
        if(cli.nome === nomeCliente) {
          const cons = (cli.contratos || []).map(con => {
            if(con.id === contrato.id) {
              const novaQtdPagas = (con.parcelasPagas || 0) + 1;
              const novoSaldo = (con.capital || 0) - (con.valorParcela || 0);
              const novaMultaAcumulada = (con.multasPagas || 0) + vMulta;
              const lucroDaParcela = con.lucroJurosPorParcela || 0;
              const novoLucroTotal = (con.lucroTotal || 0) + lucroDaParcela + vMulta;
              
              let h = [...(con.movimentacoes || [])];
              let msg = `${dataPagamento}: Parcela ${novaQtdPagas}/${con.totalParcelas} (R$ ${con.valorParcela?.toFixed(2)})`;
              if (vMulta > 0) msg += ` + Multa R$ ${vMulta.toFixed(2)}`;
              h.unshift(msg);

              if (novaQtdPagas >= (con.totalParcelas || 0) || novoSaldo <= 0.1) {
                h.unshift(`${dataPagamento}: CONTRATO FINALIZADO!`);
                return { 
                  ...con, 
                  status: 'QUITADO' as const, 
                  capital: 0, 
                  parcelasPagas: novaQtdPagas,
                  multasPagas: novaMultaAcumulada,
                  lucroTotal: novoLucroTotal,
                  movimentacoes: h 
                };
              } else {
                const nD = converterData(contrato.proximoVencimento); 
                
                // --- ATUALIZA A PRÓXIMA DATA ---
                if (contrato.frequencia === 'SEMANAL') {
                    nD.setDate(nD.getDate() + 7);
                } else if (contrato.frequencia === 'DIARIO') {
                    nD.setDate(nD.getDate() + 1); // PULA 1 DIA APENAS
                } else {
                    nD.setMonth(nD.getMonth() + 1);
                }

                return {
                  ...con,
                  capital: novoSaldo,
                  parcelasPagas: novaQtdPagas,
                  multasPagas: novaMultaAcumulada,
                  lucroTotal: novoLucroTotal,
                  proximoVencimento: nD.toLocaleDateString('pt-BR'),
                  movimentacoes: h
                };
              }
            }
            return con;
          });
          return { ...cli, contratos: cons };
        }
        return cli;
      });

      await salvarNoBanco(lista);
      if (vMulta > 0) Alert.alert("Multa Aplicada", `R$ ${vMulta.toFixed(2)} de multa.`);

    } catch (e) { Alert.alert("Erro", "Verifique a data"); }
  };

  const importarDados = (dados: Cliente[]) => { salvarNoBanco(dados); };

  return {
    clientes, 
    // MANTIVE OS DOIS NOMES PARA NÃO QUEBRAR O LAYOUT ANTIGO
    totais: calcularTotais(), 
    adicionarCliente, editarCliente, excluirCliente,
    adicionarContrato, editarContrato, excluirContrato, acaoRenovarQuitar, criarAcordo, pagarParcela, importarDados
  };
}