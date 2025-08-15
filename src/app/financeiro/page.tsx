'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  Search, 
  Plus, 
  Filter,
  Edit2,
  Trash2,
  X,
  Save,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowLeft,
  Download
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';

interface Movimentacao {
  id?: string;
  tipo: 'entrada' | 'saida';
  categoria: string;
  descricao: string;
  valor: number;
  status: 'pendente' | 'pago' | 'vencido';
  dataVencimento: Date;
  dataPagamento?: Date;
  formaPagamento?: string;
  // 🆕 CAMPOS-CHAVE para integração
  clienteId?: string;
  nomeCliente?: string;
  pedidoId?: string;
  observacoes?: string;
}

interface FiltroFinanceiro {
  tipo?: 'entrada' | 'saida';
  categoria?: string;
  status?: 'pendente' | 'pago' | 'vencido';
  clienteId?: string;
}

export default function Financeiro() {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [filtros, setFiltros] = useState<FiltroFinanceiro>({});
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoModal, setModoModal] = useState<'criar' | 'editar'>('criar');
  const [movimentacaoEditando, setMovimentacaoEditando] = useState<Movimentacao | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [formData, setFormData] = useState({
    tipo: 'entrada' as 'entrada' | 'saida',
    categoria: '',
    descricao: '',
    valor: 0,
    status: 'pendente' as 'pendente' | 'pago' | 'vencido',
    dataVencimento: new Date().toISOString().split('T')[0],
    dataPagamento: '',
    formaPagamento: '',
    clienteId: '',
    nomeCliente: '',
    pedidoId: '',
    observacoes: ''
  });

  // Carregar movimentações do Firebase
  const carregarMovimentacoes = async () => {
    try {
      const q = query(collection(db, 'movimentacoes'), orderBy('dataVencimento', 'desc'));
      const snapshot = await getDocs(q);
      const movimentacoesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dataVencimento: doc.data().dataVencimento?.toDate() || new Date(),
        dataPagamento: doc.data().dataPagamento?.toDate() || undefined
      })) as Movimentacao[];
      setMovimentacoes(movimentacoesData);
    } catch (error) {
      console.error('Erro ao carregar movimentações:', error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarMovimentacoes();
  }, []);

  // Métricas calculadas
  const metricas = useMemo(() => {
    const entradas = movimentacoes
      .filter(m => m.tipo === 'entrada' && m.status === 'pago')
      .reduce((acc, m) => acc + m.valor, 0);
    
    const saidas = movimentacoes
      .filter(m => m.tipo === 'saida' && m.status === 'pago')
      .reduce((acc, m) => acc + m.valor, 0);

    const pendentes = movimentacoes
      .filter(m => m.status === 'pendente')
      .reduce((acc, m) => acc + m.valor, 0);

    return {
      saldo: entradas - saidas,
      totalEntradas: entradas,
      totalSaidas: saidas,
      totalPendentes: pendentes,
      contasPendentes: movimentacoes.filter(m => m.status === 'pendente').length,
      contasVencidas: movimentacoes.filter(m => m.status === 'vencido').length
    };
  }, [movimentacoes]);

  const resetForm = () => {
    setFormData({
      tipo: 'entrada',
      categoria: '',
      descricao: '',
      valor: 0,
      status: 'pendente',
      dataVencimento: new Date().toISOString().split('T')[0],
      dataPagamento: '',
      formaPagamento: '',
      clienteId: '',
      nomeCliente: '',
      pedidoId: '',
      observacoes: ''
    });
  };

  const abrirModalCriar = () => {
    resetForm();
    setModoModal('criar');
    setMostrarModal(true);
  };

  const abrirModalEditar = (movimentacao: Movimentacao) => {
    setFormData({
      tipo: movimentacao.tipo,
      categoria: movimentacao.categoria,
      descricao: movimentacao.descricao,
      valor: movimentacao.valor,
      status: movimentacao.status,
      dataVencimento: movimentacao.dataVencimento.toISOString().split('T')[0],
      dataPagamento: movimentacao.dataPagamento ? movimentacao.dataPagamento.toISOString().split('T')[0] : '',
      formaPagamento: movimentacao.formaPagamento || '',
      clienteId: movimentacao.clienteId || '',
      nomeCliente: movimentacao.nomeCliente || '',
      pedidoId: movimentacao.pedidoId || '',
      observacoes: movimentacao.observacoes || ''
    });
    setMovimentacaoEditando(movimentacao);
    setModoModal('editar');
    setMostrarModal(true);
  };

  const fecharModal = () => {
    setMostrarModal(false);
    setMovimentacaoEditando(null);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);

    try {
      const dadosParaSalvar = {
        ...formData,
        valor: parseFloat(formData.valor.toString()),
        dataVencimento: new Date(formData.dataVencimento),
        dataPagamento: formData.dataPagamento ? new Date(formData.dataPagamento) : null,
        clienteId: formData.clienteId || null,
        nomeCliente: formData.nomeCliente || null,
        pedidoId: formData.pedidoId || null,
      };

      if (modoModal === 'criar') {
        await addDoc(collection(db, 'movimentacoes'), dadosParaSalvar);
      } else if (movimentacaoEditando?.id) {
        await updateDoc(doc(db, 'movimentacoes', movimentacaoEditando.id), dadosParaSalvar);
      }
      
      await carregarMovimentacoes();
      fecharModal();
    } catch (error) {
      console.error('Erro ao salvar movimentação:', error);
      alert('Erro ao salvar movimentação. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const excluirMovimentacao = async (id: string, descricao: string) => {
    if (window.confirm(`Tem certeza que deseja excluir "${descricao}"?`)) {
      try {
        await deleteDoc(doc(db, 'movimentacoes', id));
        await carregarMovimentacoes();
      } catch (error) {
        console.error('Erro ao excluir movimentação:', error);
        alert('Erro ao excluir movimentação. Tente novamente.');
      }
    }
  };

  const formatarMoeda = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  const formatarData = (data: Date): string => {
    return new Intl.DateTimeFormat('pt-BR').format(data);
  };

  const movimentacoesFiltradas = useMemo(() => {
    return movimentacoes.filter(movimentacao => {
      const matchBusca = !termoBusca || 
        movimentacao.descricao.toLowerCase().includes(termoBusca.toLowerCase()) ||
        movimentacao.categoria.toLowerCase().includes(termoBusca.toLowerCase()) ||
        (movimentacao.nomeCliente && movimentacao.nomeCliente.toLowerCase().includes(termoBusca.toLowerCase()));

      const matchTipo = !filtros.tipo || movimentacao.tipo === filtros.tipo;
      const matchStatus = !filtros.status || movimentacao.status === filtros.status;
      const matchCategoria = !filtros.categoria || movimentacao.categoria === filtros.categoria;
      const matchCliente = !filtros.clienteId || movimentacao.clienteId === filtros.clienteId;

      return matchBusca && matchTipo && matchStatus && matchCategoria && matchCliente;
    });
  }, [movimentacoes, termoBusca, filtros]);

  const StatusBadge = ({ status }: { status: 'pendente' | 'pago' | 'vencido' }) => {
    const config = {
      pago: { cor: 'bg-green-500/20 text-green-300 border-green-400/30', icone: CheckCircle, texto: 'Pago' },
      pendente: { cor: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30', icone: Clock, texto: 'Pendente' },
      vencido: { cor: 'bg-red-500/20 text-red-300 border-red-400/30', icone: AlertCircle, texto: 'Vencido' }
    };
    
    const { cor, icone: Icone, texto } = config[status];
    
    return (
      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${cor}`}>
        <Icone className="w-3 h-3" />
        {texto}
      </div>
    );
  };

  const TipoBadge = ({ tipo }: { tipo: 'entrada' | 'saida' }) => (
    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${
      tipo === 'entrada' 
        ? 'bg-green-500/20 text-green-300 border-green-400/30' 
        : 'bg-red-500/20 text-red-300 border-red-400/30'
    }`}>
      {tipo === 'entrada' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {tipo === 'entrada' ? 'Entrada' : 'Saída'}
    </div>
  );

  if (carregando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-green-900 flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-green-900 p-4 sm:p-6 lg:p-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4 sm:mb-0">
              {/* Botão Voltar */}
              <Link 
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </Link>
              
              <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-green-600">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Financeiro</h1>
                <p className="text-gray-300">Controle suas finanças e fluxo de caixa</p>
              </div>
            </div>
            <div className="flex gap-3 self-end sm:self-auto">
              <button className="flex items-center gap-2 px-4 py-3 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-xl hover:bg-blue-500/30 transition-all">
                <Download className="w-4 h-4" />
                Relatório
              </button>
              <button 
                onClick={abrirModalCriar}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all"
              >
                <Plus className="w-4 h-4" />
                Nova Movimentação
              </button>
            </div>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500/20 rounded-xl">
                <DollarSign className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-sm font-medium text-gray-300">Saldo Atual</span>
            </div>
            <p className={`text-2xl font-bold ${metricas.saldo >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatarMoeda(metricas.saldo)}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-500/20 rounded-xl">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-sm font-medium text-gray-300">Entradas</span>
            </div>
            <p className="text-2xl font-bold text-green-400">{formatarMoeda(metricas.totalEntradas)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-500/20 rounded-xl">
                <TrendingDown className="w-5 h-5 text-red-400" />
              </div>
              <span className="text-sm font-medium text-gray-300">Saídas</span>
            </div>
            <p className="text-2xl font-bold text-red-400">{formatarMoeda(metricas.totalSaidas)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-yellow-500/20 rounded-xl">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <span className="text-sm font-medium text-gray-300">Pendentes</span>
            </div>
            <p className="text-lg font-bold text-yellow-400">{formatarMoeda(metricas.totalPendentes)}</p>
            <p className="text-sm text-gray-400">{metricas.contasPendentes} contas</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-500/20 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <span className="text-sm font-medium text-gray-300">Vencidas</span>
            </div>
            <p className="text-2xl font-bold text-red-400">{metricas.contasVencidas}</p>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex-1 relative w-full lg:w-auto">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por descrição, categoria ou cliente..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 text-white placeholder-gray-400"
              />
            </div>
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className={`flex items-center gap-2 px-4 py-3 border rounded-xl transition-all ${
                mostrarFiltros 
                  ? 'bg-green-500/20 border-green-400/30 text-green-300'
                  : 'border-white/20 hover:bg-white/10 text-gray-300'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filtros
            </button>
          </div>

          {/* Filtros Expandidos */}
          {mostrarFiltros && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tipo</label>
                <select
                  value={filtros.tipo || ''}
                  onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value as 'entrada' | 'saida' || undefined })}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 text-white"
                >
                  <option value="">Todos</option>
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select
                  value={filtros.status || ''}
                  onChange={(e) => setFiltros({ ...filtros, status: e.target.value as 'pendente' | 'pago' | 'vencido' || undefined })}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 text-white"
                >
                  <option value="">Todos</option>
                  <option value="pago">Pago</option>
                  <option value="pendente">Pendente</option>
                  <option value="vencido">Vencido</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Categoria</label>
                <select
                  value={filtros.categoria || ''}
                  onChange={(e) => setFiltros({ ...filtros, categoria: e.target.value || undefined })}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 text-white"
                >
                  <option value="">Todas</option>
                  <option value="Vendas">Vendas</option>
                  <option value="Fornecedores">Fornecedores</option>
                  <option value="Salários">Salários</option>
                  <option value="Manutenção">Manutenção</option>
                  <option value="Combustível">Combustível</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setFiltros({})}
                  className="w-full px-4 py-3 text-gray-300 border border-white/20 rounded-xl hover:bg-white/10 transition-colors"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lista de Movimentações */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Descrição</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Tipo</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Valor</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Cliente/Funcionário</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Vencimento</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-300 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody>
                {movimentacoesFiltradas.map(movimentacao => (
                  <tr key={movimentacao.id} className="hover:bg-white/5 border-b border-white/10">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-white">{movimentacao.descricao}</div>
                      <div className="text-sm text-gray-300">{movimentacao.categoria}</div>
                    </td>
                    <td className="px-6 py-4">
                      <TipoBadge tipo={movimentacao.tipo} />
                    </td>
                    <td className="px-6 py-4">
                      <div className={`text-sm font-medium ${
                        movimentacao.tipo === 'entrada' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {movimentacao.tipo === 'entrada' ? '+' : '-'} {formatarMoeda(movimentacao.valor)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-white">
                        {movimentacao.nomeCliente && `Cliente: ${movimentacao.nomeCliente}`}
                        {!movimentacao.nomeCliente && '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-white">{formatarData(movimentacao.dataVencimento)}</div>
                      {movimentacao.dataPagamento && (
                        <div className="text-sm text-gray-300">Pago: {formatarData(movimentacao.dataPagamento)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={movimentacao.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button 
                          onClick={() => abrirModalEditar(movimentacao)}
                          className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-full"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => excluirMovimentacao(movimentacao.id!, movimentacao.descricao)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-full"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Empty State */}
        {movimentacoesFiltradas.length === 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-12 text-center">
            <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Nenhuma movimentação encontrada</h3>
            <p className="text-gray-300 mb-6">
              {termoBusca || Object.keys(filtros).length > 0 
                ? 'Tente ajustar os filtros ou termo de busca'
                : 'Comece registrando sua primeira movimentação financeira'
              }
            </p>
            <button 
              onClick={abrirModalCriar}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl mx-auto"
            >
              <Plus className="w-4 h-4" />
              Nova Movimentação
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={fecharModal} />
          
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">
                {modoModal === 'criar' ? 'Nova Movimentação' : 'Editar Movimentação'}
              </h2>
              <button onClick={fecharModal} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-5 h-5 text-gray-300" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Dados Principais */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Dados Principais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tipo *</label>
                    <select
                      required
                      value={formData.tipo}
                      onChange={(e) => setFormData({...formData, tipo: e.target.value as 'entrada' | 'saida'})}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 text-white"
                    >
                      <option value="entrada">Entrada</option>
                      <option value="saida">Saída</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Categoria *</label>
                    <select
                      required
                      value={formData.categoria}
                      onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 text-white"
                    >
                      <option value="">Selecione a Categoria</option>
                      <option value="Vendas">Vendas</option>
                      <option value="Fornecedores">Fornecedores</option>
                      <option value="Salários">Salários</option>
                      <option value="Manutenção">Manutenção</option>
                      <option value="Combustível">Combustível</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Descrição *</label>
                    <input
                      type="text"
                      required
                      value={formData.descricao}
                      onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                      placeholder="Ex: Pagamento de cliente, Salário de funcionário..."
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 text-white placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Valor *</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={formData.valor}
                      onChange={(e) => setFormData({...formData, valor: parseFloat(e.target.value)})}
                      placeholder="0.00"
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 text-white placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Data de Vencimento *</label>
                    <input
                      type="date"
                      required
                      value={formData.dataVencimento}
                      onChange={(e) => setFormData({...formData, dataVencimento: e.target.value})}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Status e Pagamento */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Status e Pagamento</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Status *</label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as 'pendente' | 'pago' | 'vencido'})}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 text-white"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="pago">Pago</option>
                      <option value="vencido">Vencido</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Data de Pagamento</label>
                    <input
                      type="date"
                      value={formData.dataPagamento}
                      onChange={(e) => setFormData({...formData, dataPagamento: e.target.value})}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 text-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Forma de Pagamento</label>
                    <input
                      type="text"
                      value={formData.formaPagamento}
                      onChange={(e) => setFormData({...formData, formaPagamento: e.target.value})}
                      placeholder="Ex: Cartão de Crédito, PIX, Dinheiro"
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 text-white placeholder-gray-400"
                    />
                  </div>
                </div>
              </div>

              {/* Integração */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Integração (Opcional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Cliente</label>
                    <input
                      type="text"
                      value={formData.nomeCliente}
                      onChange={(e) => setFormData({...formData, nomeCliente: e.target.value})}
                      placeholder="Nome do Cliente"
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 text-white placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">ID do Pedido</label>
                    <input
                      type="text"
                      value={formData.pedidoId}
                      onChange={(e) => setFormData({...formData, pedidoId: e.target.value})}
                      placeholder="Ex: #00123"
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 text-white placeholder-gray-400"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Observações</label>
                    <textarea
                      value={formData.observacoes}
                      onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                      rows={3}
                      placeholder="Adicione notas ou detalhes importantes aqui..."
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 text-white placeholder-gray-400"
                    />
                  </div>
                </div>
              </div>

              {/* Botões do Footer */}
              <div className="flex flex-col sm:flex-row justify-end gap-4 border-t border-white/10 pt-6">
                <button
                  type="button"
                  onClick={fecharModal}
                  className="px-6 py-3 border border-white/20 text-gray-300 rounded-xl hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-all ${
                    salvando 
                      ? 'bg-green-500/50 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                  }`}
                >
                  {salvando ? (
                    'Salvando...'
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Salvar Movimentação
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}