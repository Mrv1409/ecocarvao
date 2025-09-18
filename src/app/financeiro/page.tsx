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
  Download,
  ChevronLeft,
  ChevronRight
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
  empresa?: 'galpao' | 'distribuidora';
  tipo: 'entrada' | 'saida';
  descricao: string;
  valor: number;
  status: 'pendente' | 'pago' | 'vencido';
  dataVencimento: Date;
  dataPagamento?: Date;
  formaPagamento?: string;
  observacoes?: string;
}

interface FiltroFinanceiro {
  tipo?: 'entrada' | 'saida';
  status?: 'pendente' | 'pago' | 'vencido';
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
  
  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);

  const [formData, setFormData] = useState({
    empresa: 'galpao' as 'galpao' | 'distribuidora',
    tipo: 'entrada' as 'entrada' | 'saida',
    descricao: '',
    valor: 0,
    status: 'pendente' as 'pendente' | 'pago' | 'vencido',
    dataVencimento: new Date().toISOString().split('T')[0],
    dataPagamento: '',
    formaPagamento: '',
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

  // Métricas calculadas - Geral + Por Empresa
  const metricas = useMemo(() => {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    
    const movimentacoesMes = movimentacoes.filter(m => 
      m.dataVencimento >= inicioMes && m.dataVencimento <= fimMes
    );

    // Métricas Gerais
    const entradas = movimentacoes
      .filter(m => m.tipo === 'entrada' && m.status === 'pago')
      .reduce((acc, m) => acc + m.valor, 0);
    
    const saidas = movimentacoes
      .filter(m => m.tipo === 'saida' && m.status === 'pago')
      .reduce((acc, m) => acc + m.valor, 0);

    const pendentes = movimentacoes
      .filter(m => m.status === 'pendente')
      .reduce((acc, m) => acc + m.valor, 0);

    // Métricas por Empresa (Mensais)
    const galpao = {
      entradas: movimentacoesMes
        .filter(m => m.empresa === 'galpao' && m.tipo === 'entrada' && m.status === 'pago')
        .reduce((acc, m) => acc + m.valor, 0),
      saidas: movimentacoesMes
        .filter(m => m.empresa === 'galpao' && m.tipo === 'saida' && m.status === 'pago')
        .reduce((acc, m) => acc + m.valor, 0)
    };

    const distribuidora = {
      entradas: movimentacoesMes
        .filter(m => m.empresa === 'distribuidora' && m.tipo === 'entrada' && m.status === 'pago')
        .reduce((acc, m) => acc + m.valor, 0),
      saidas: movimentacoesMes
        .filter(m => m.empresa === 'distribuidora' && m.tipo === 'saida' && m.status === 'pago')
        .reduce((acc, m) => acc + m.valor, 0)
    };

    return {
      saldo: entradas - saidas,
      totalEntradas: entradas,
      totalSaidas: saidas,
      totalPendentes: pendentes,
      contasPendentes: movimentacoes.filter(m => m.status === 'pendente').length,
      contasVencidas: movimentacoes.filter(m => m.status === 'vencido').length,
      galpao: {
        saldo: galpao.entradas - galpao.saidas,
        entradas: galpao.entradas,
        saidas: galpao.saidas
      },
      distribuidora: {
        saldo: distribuidora.entradas - distribuidora.saidas,
        entradas: distribuidora.entradas,
        saidas: distribuidora.saidas
      }
    };
  }, [movimentacoes]);

  const resetForm = () => {
    setFormData({
      empresa: 'galpao',
      tipo: 'entrada',
      descricao: '',
      valor: 0,
      status: 'pendente',
      dataVencimento: new Date().toISOString().split('T')[0],
      dataPagamento: '',
      formaPagamento: '',
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
      empresa: movimentacao.empresa || 'galpao',
      tipo: movimentacao.tipo,
      descricao: movimentacao.descricao,
      valor: movimentacao.valor,
      status: movimentacao.status,
      dataVencimento: movimentacao.dataVencimento.toISOString().split('T')[0],
      dataPagamento: movimentacao.dataPagamento ? movimentacao.dataPagamento.toISOString().split('T')[0] : '',
      formaPagamento: movimentacao.formaPagamento || '',
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
        movimentacao.descricao.toLowerCase().includes(termoBusca.toLowerCase());

      const matchTipo = !filtros.tipo || movimentacao.tipo === filtros.tipo;
      const matchStatus = !filtros.status || movimentacao.status === filtros.status;

      return matchBusca && matchTipo && matchStatus;
    });
  }, [movimentacoes, termoBusca, filtros]);

  // Cálculos de paginação
  const totalItens = movimentacoesFiltradas.length;
  const totalPaginas = Math.ceil(totalItens / itensPorPagina);
  const indiceInicio = (paginaAtual - 1) * itensPorPagina;
  const indiceFim = indiceInicio + itensPorPagina;
  const itensPaginaAtual = movimentacoesFiltradas.slice(indiceInicio, indiceFim);

  const irParaPagina = (pagina: number) => {
    setPaginaAtual(Math.max(1, Math.min(pagina, totalPaginas)));
  };

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

  const EmpresaBadge = ({ empresa }: { empresa: 'galpao' | 'distribuidora' | undefined }) => {
    const config = {
      galpao: { cor: 'bg-blue-500/20 text-blue-300 border-blue-400/30', texto: 'Galpão' },
      distribuidora: { cor: 'bg-purple-500/20 text-purple-300 border-purple-400/30', texto: 'Distribuidora' },
      undefined: { cor: 'bg-gray-500/20 text-gray-300 border-gray-400/30', texto: 'Não definido' }
    };
    
    const empresaKey = empresa || 'undefined';
    const { cor, texto } = config[empresaKey as keyof typeof config];
    
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${cor}`}>
        <span>{texto}</span>
      </div>
    );
  };

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
              <Link 
                href="/relatorios"
                className="flex items-center gap-2 px-4 py-3 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-xl hover:bg-blue-500/30 transition-all"
              >
                <Download className="w-4 h-4" />
                Relatório
              </Link>
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

        {/* Métricas Gerais */}
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

        {/* Métricas por Empresa */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Galpão */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/20 rounded-xl">
                <DollarSign className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-white">🏭 Galpão (Mensal)</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Entradas:</span>
                <span className="text-lg font-bold text-green-400">{formatarMoeda(metricas.galpao.entradas)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Saídas:</span>
                <span className="text-lg font-bold text-red-400">{formatarMoeda(metricas.galpao.saidas)}</span>
              </div>
              <div className="border-t border-white/10 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-300">Saldo:</span>
                  <span className={`text-xl font-bold ${metricas.galpao.saldo >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatarMoeda(metricas.galpao.saldo)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Distribuidora */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/20 rounded-xl">
                <DollarSign className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-white">🚚 Distribuidora (Mensal)</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Entradas:</span>
                <span className="text-lg font-bold text-green-400">{formatarMoeda(metricas.distribuidora.entradas)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Saídas:</span>
                <span className="text-lg font-bold text-red-400">{formatarMoeda(metricas.distribuidora.saidas)}</span>
              </div>
              <div className="border-t border-white/10 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-300">Saldo:</span>
                  <span className={`text-xl font-bold ${metricas.distribuidora.saldo >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatarMoeda(metricas.distribuidora.saldo)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex-1 relative w-full lg:w-auto">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por descrição..."
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tipo</label>
                <select
                  value={filtros.tipo || ''}
                  onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value as 'entrada' | 'saida' || undefined })}
                  className="w-full p-3 bg-gray-800/50 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 text-white"
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
                  className="w-full p-3 bg-gray-800/50 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 text-white"
                >
                  <option value="">Todos</option>
                  <option value="pago">Pago</option>
                  <option value="pendente">Pendente</option>
                  <option value="vencido">Vencido</option>
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
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Empresa</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Tipo</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Valor</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Vencimento</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-300 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody>
                {itensPaginaAtual.map(movimentacao => (
                  <tr key={movimentacao.id} className="hover:bg-white/5 border-b border-white/10">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-white">{movimentacao.descricao}</div>
                      {movimentacao.formaPagamento && (
                        <div className="text-xs text-gray-300">{movimentacao.formaPagamento}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <EmpresaBadge empresa={movimentacao.empresa} />
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

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-300">
                  Mostrando {indiceInicio + 1} a {Math.min(indiceFim, totalItens)} de {totalItens} registros
                </span>
                <select
                  value={itensPorPagina}
                  onChange={(e) => {
                    setItensPorPagina(Number(e.target.value));
                    setPaginaAtual(1);
                  }}
                  className="px-3 py-1 bg-gray-800/50 border border-white/20 rounded-lg text-white text-sm"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => irParaPagina(paginaAtual - 1)}
                  disabled={paginaAtual === 1}
                  className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                    let pageNum;
                    if (totalPaginas <= 5) {
                      pageNum = i + 1;
                    } else if (paginaAtual <= 3) {
                      pageNum = i + 1;
                    } else if (paginaAtual >= totalPaginas - 2) {
                      pageNum = totalPaginas - 4 + i;
                    } else {
                      pageNum = paginaAtual - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => irParaPagina(pageNum)}
                        className={`px-3 py-2 rounded-lg text-sm ${
                          paginaAtual === pageNum
                            ? 'bg-green-500 text-white'
                            : 'text-gray-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => irParaPagina(paginaAtual + 1)}
                  disabled={paginaAtual === totalPaginas}
                  className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

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
          
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
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
              {/* Empresa e Tipo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Empresa *</label>
                  <select
                    required
                    value={formData.empresa}
                    onChange={(e) => setFormData({...formData, empresa: e.target.value as 'galpao' | 'distribuidora'})}
                    className="w-full p-3 bg-gray-800/50 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 text-white"
                  >
                    <option value="galpao">Galpão</option>
                    <option value="distribuidora">Distribuidora</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tipo *</label>
                  <select
                    required
                    value={formData.tipo}
                    onChange={(e) => setFormData({...formData, tipo: e.target.value as 'entrada' | 'saida'})}
                    className="w-full p-3 bg-gray-800/50 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 text-white"
                  >
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                  </select>
                </div>
              </div>

              {/* Descrição */}
              <div>
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

              {/* Valor e Data de Vencimento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              {/* Data de Pagamento e Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Data de Pagamento</label>
                  <input
                    type="date"
                    value={formData.dataPagamento}
                    onChange={(e) => setFormData({...formData, dataPagamento: e.target.value})}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status *</label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as 'pendente' | 'pago' | 'vencido'})}
                    className="w-full p-3 bg-gray-800/50 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 text-white"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="pago">Pago</option>
                    <option value="vencido">Vencido</option>
                  </select>
                </div>
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Forma de Pagamento</label>
                <input
                  type="text"
                  value={formData.formaPagamento}
                  onChange={(e) => setFormData({...formData, formaPagamento: e.target.value})}
                  placeholder="Ex: Cartão de Crédito, PIX, Dinheiro"
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 text-white placeholder-gray-400"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Observações</label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  rows={3}
                  placeholder="Adicione notas ou detalhes importantes aqui..."
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 text-white placeholder-gray-400"
                />
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
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {modoModal === 'criar' ? 'Cadastrar' : 'Atualizar'}
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