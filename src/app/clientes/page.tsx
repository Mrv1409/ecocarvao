'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit2,
  Trash2,
  X,
  Save,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
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

interface Cliente {
  id?: string;
  nome: string;
  documento: string;
  tipo: 'fisica' | 'juridica';
  empresa: 'galpao' | 'distribuidora';
  email: string;
  telefone: string;
  cidade: string;
  status: 'ativo' | 'inativo' | 'bloqueado';
  limiteCredito: number;
  totalComprado: number;
  valorPendente: number;
  ultimaCompra?: Date;
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoModal, setModoModal] = useState<'criar' | 'editar'>('criar');
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [salvando, setSalvando] = useState(false);
  
  // Estados para paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(20);
  
  const [formData, setFormData] = useState({
    nome: '',
    documento: '',
    tipo: 'fisica' as 'fisica' | 'juridica',
    empresa: 'galpao' as 'galpao' | 'distribuidora',
    email: '',
    telefone: '',
    cidade: '',
    status: 'ativo' as 'ativo' | 'inativo' | 'bloqueado',
    limiteCredito: 0,
    totalComprado: 0,
    valorPendente: 0,
    ultimaCompra: undefined as Date | undefined
  });

  // Carregar clientes da collection única
  const carregarClientes = async () => {
    try {
      setCarregando(true);
      const q = query(collection(db, 'clientes'), orderBy('nome'));
      const snapshot = await getDocs(q);
      const clientesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        totalComprado: doc.data().totalComprado || 0,
        valorPendente: doc.data().valorPendente || 0,
        ultimaCompra: doc.data().ultimaCompra?.toDate() || undefined
      })) as Cliente[];
      setClientes(clientesData);
      setPaginaAtual(1); // Reset página ao carregar novos dados
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarClientes();
  }, []);

  const resetForm = () => {
    setFormData({
      nome: '',
      documento: '',
      tipo: 'fisica',
      empresa: 'galpao',
      email: '',
      telefone: '',
      cidade: '',
      status: 'ativo',
      limiteCredito: 0,
      totalComprado: 0,
      valorPendente: 0,
      ultimaCompra: undefined
    });
  };

  const abrirModalCriar = () => {
    resetForm();
    setModoModal('criar');
    setMostrarModal(true);
  };

  const abrirModalEditar = (cliente: Cliente) => {
    setFormData({
      nome: cliente.nome,
      documento: cliente.documento,
      tipo: cliente.tipo,
      empresa: cliente.empresa,
      email: cliente.email,
      telefone: cliente.telefone,
      cidade: cliente.cidade,
      status: cliente.status,
      limiteCredito: cliente.limiteCredito,
      totalComprado: cliente.totalComprado,
      valorPendente: cliente.valorPendente,
      ultimaCompra: cliente.ultimaCompra
    });
    setClienteEditando(cliente);
    setModoModal('editar');
    setMostrarModal(true);
  };

  const fecharModal = () => {
    setMostrarModal(false);
    setClienteEditando(null);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);

    try {
      const dadosParaSalvar = {
        ...formData,
        ultimaCompra: formData.ultimaCompra || null
      };

      if (modoModal === 'criar') {
        await addDoc(collection(db, 'clientes'), dadosParaSalvar);
      } else if (clienteEditando?.id) {
        await updateDoc(doc(db, 'clientes', clienteEditando.id), dadosParaSalvar);
      }
      await carregarClientes();
      fecharModal();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      alert('Erro ao salvar cliente. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const excluirCliente = async (id: string, nome: string) => {
    if (window.confirm(`Tem certeza que deseja excluir ${nome}?`)) {
      try {
        await deleteDoc(doc(db, 'clientes', id));
        await carregarClientes();
      } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        alert('Erro ao excluir cliente. Tente novamente.');
      }
    }
  };

  const formatarMoeda = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };
//eslint-disable-next-line
  const formatarData = (data?: Date): string => {
    if (!data) return 'Nunca';
    return new Intl.DateTimeFormat('pt-BR').format(data);
  };

  // Filtro e paginação
  const clientesFiltrados = clientes.filter(cliente =>
    !termoBusca || 
    cliente.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
    cliente.documento.includes(termoBusca) ||
    cliente.email.toLowerCase().includes(termoBusca.toLowerCase())
  );

  // Reset página quando termo de busca muda
  useEffect(() => {
    setPaginaAtual(1);
  }, [termoBusca]);

  // Cálculos de paginação
  const totalItens = clientesFiltrados.length;
  const totalPaginas = Math.ceil(totalItens / itensPorPagina);
  const inicioIndice = (paginaAtual - 1) * itensPorPagina;
  const fimIndice = inicioIndice + itensPorPagina;
  const clientesPaginados = clientesFiltrados.slice(inicioIndice, fimIndice);

  // Funções de navegação
  const irParaPagina = (pagina: number) => {
    if (pagina >= 1 && pagina <= totalPaginas) {
      setPaginaAtual(pagina);
    }
  };

  const gerarNumerosPaginas = () => {
    const paginas = [];
    const maxPaginas = 5;
    let inicio = Math.max(1, paginaAtual - Math.floor(maxPaginas / 2));
    const fim = Math.min(totalPaginas, inicio + maxPaginas - 1);
    
    if (fim - inicio + 1 < maxPaginas) {
      inicio = Math.max(1, fim - maxPaginas + 1);
    }
    
    for (let i = inicio; i <= fim; i++) {
      paginas.push(i);
    }
    
    return paginas;
  };

  const StatusBadge = ({ status }: { status: 'ativo' | 'inativo' | 'bloqueado' }) => {
    const config = {
      ativo: { cor: 'bg-green-500/20 text-green-300 border-green-400/30', icone: CheckCircle, texto: 'Ativo' },
      inativo: { cor: 'bg-gray-500/20 text-gray-300 border-gray-400/30', icone: XCircle, texto: 'Inativo' },
      bloqueado: { cor: 'bg-red-500/20 text-red-300 border-red-400/30', icone: AlertCircle, texto: 'Bloqueado' }
    };
    
    const { cor, icone: Icone, texto } = config[status];
    
    return (
      <div className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs font-medium border ${cor}`}>
        <Icone className="w-3 h-3" />
        <span className="hidden sm:inline">{texto}</span>
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
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-green-900 p-2 sm:p-4 lg:p-8">
      <div className="space-y-4 sm:space-y-6">
        {/* Header simplificado - sem seletor de empresa */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
              {/* Botão Voltar */}
              <Link 
                href="/dashboard"
                className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg sm:rounded-xl transition-all text-sm sm:text-base"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-green-400 to-green-600">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white">Clientes</h1>
                  <p className="text-xs sm:text-base text-gray-300">Gerencie sua carteira de clientes</p>
                </div>
              </div>
            </div>
            
            <button 
              onClick={abrirModalCriar}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg sm:rounded-xl hover:from-green-600 hover:to-green-700 transition-all text-sm sm:text-base"
            >
              <Plus className="w-4 h-4" />
              Novo Cliente
            </button>
          </div>
        </div>

        {/* Busca */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 p-4 sm:p-6">
          <div className="relative">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar clientes..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 text-white placeholder-gray-400 text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Lista com dados paginados */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase">Nome</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase hidden sm:table-cell">Empresa</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase hidden lg:table-cell">Contato</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase hidden md:table-cell">Limite</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase hidden xl:table-cell">Total</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase hidden xl:table-cell">Pendente</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-xs font-medium text-gray-300 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientesPaginados.map(cliente => (
                  <tr key={cliente.id} className="hover:bg-white/5 border-b border-white/10">
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="text-xs sm:text-sm font-medium text-white">{cliente.nome}</div>
                      <div className="text-xs text-gray-300 sm:hidden">{cliente.documento}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell">
                      <span className="text-xs sm:text-sm text-gray-300">{cliente.empresa === 'galpao' ? 'galpão' : 'distribuidora'}</span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 hidden lg:table-cell">
                      <div className="text-xs text-gray-300">{cliente.telefone}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <StatusBadge status={cliente.status} />
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-green-400 hidden md:table-cell">
                      {formatarMoeda(cliente.limiteCredito)}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-blue-400 hidden xl:table-cell">
                      {formatarMoeda(cliente.totalComprado)}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-yellow-400 hidden xl:table-cell">
                      {formatarMoeda(cliente.valorPendente)}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                      <div className="flex gap-1 sm:gap-2 justify-end">
                        <button 
                          onClick={() => abrirModalEditar(cliente)}
                          className="p-1 sm:p-2 text-blue-400 hover:bg-blue-500/20 rounded-full"
                        >
                          <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <button 
                          onClick={() => excluirCliente(cliente.id!, cliente.nome)}
                          className="p-1 sm:p-2 text-red-400 hover:bg-red-500/20 rounded-full"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Controles de Paginação */}
          {totalPaginas > 1 && (
            <div className="border-t border-white/10 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-xs sm:text-sm text-gray-300">
                  Mostrando {inicioIndice + 1} a {Math.min(fimIndice, totalItens)} de {totalItens} clientes
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-300">
                    <span className="hidden sm:inline">Por página:</span>
                    <select
                      value={itensPorPagina}
                      onChange={(e) => {
                        setItensPorPagina(Number(e.target.value));
                        setPaginaAtual(1);
                      }}
                      className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-xs sm:text-sm"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                  
                  <div className="h-4 w-px bg-white/20 mx-2" />
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => irParaPagina(1)}
                      disabled={paginaAtual === 1}
                      className="p-1 sm:p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronsLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                    
                    <button
                      onClick={() => irParaPagina(paginaAtual - 1)}
                      disabled={paginaAtual === 1}
                      className="p-1 sm:p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                    
                    {gerarNumerosPaginas().map(numeroPagina => (
                      <button
                        key={numeroPagina}
                        onClick={() => irParaPagina(numeroPagina)}
                        className={`px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm rounded-lg transition-all ${
                          numeroPagina === paginaAtual
                            ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                            : 'text-gray-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {numeroPagina}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => irParaPagina(paginaAtual + 1)}
                      disabled={paginaAtual === totalPaginas}
                      className="p-1 sm:p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                    
                    <button
                      onClick={() => irParaPagina(totalPaginas)}
                      disabled={paginaAtual === totalPaginas}
                      className="p-1 sm:p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronsRight className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Empty State */}
        {clientesFiltrados.length === 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 p-8 sm:p-12 text-center">
            <Users className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-white mb-2">Nenhum cliente encontrado</h3>
            <p className="text-sm text-gray-300 mb-6">Comece cadastrando seu primeiro cliente</p>
            <button 
              onClick={abrirModalCriar}
              className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg sm:rounded-xl mx-auto text-sm sm:text-base"
            >
              <Plus className="w-4 h-4" />
              Novo Cliente
            </button>
          </div>
        )}
      </div>

      {/* Modal - Background dos selects corrigido */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={fecharModal} />
          
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {modoModal === 'criar' ? 'Novo Cliente' : 'Editar Cliente'}
              </h2>
              <button onClick={fecharModal} className="p-1 sm:p-2 hover:bg-white/10 rounded-full">
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <form onSubmit={handleSubmit} id="form-cliente" className="space-y-4 sm:space-y-6">
                {/* Dados Básicos */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Dados Básicos</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">Nome *</label>
                      <input
                        type="text"
                        required
                        value={formData.nome}
                        onChange={(e) => setFormData({...formData, nome: e.target.value})}
                        className="w-full p-2 sm:p-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 text-white text-sm sm:text-base"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">Tipo</label>
                      <select
                        value={formData.tipo}
                        onChange={(e) => setFormData({...formData, tipo: e.target.value as 'fisica' | 'juridica'})}
                        className="w-full p-2 sm:p-3 bg-gray-800/50 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 text-white text-sm sm:text-base"
                        style={{ backgroundColor: 'rgba(55, 65, 81, 0.5)' }}
                      >
                        <option value="fisica" style={{ backgroundColor: 'rgb(55, 65, 81)' }}>Pessoa Física</option>
                        <option value="juridica" style={{ backgroundColor: 'rgb(55, 65, 81)' }}>Pessoa Jurídica</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                        {formData.tipo === 'fisica' ? 'CPF' : 'CNPJ'} *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.documento}
                        onChange={(e) => setFormData({...formData, documento: e.target.value})}
                        className="w-full p-2 sm:p-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 text-white text-sm sm:text-base"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">Empresa *</label>
                      <select
                        value={formData.empresa}
                        onChange={(e) => setFormData({...formData, empresa: e.target.value as 'galpao' | 'distribuidora'})}
                        className="w-full p-2 sm:p-3 bg-gray-800/50 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 text-white text-sm sm:text-base"
                        style={{ backgroundColor: 'rgba(55, 65, 81, 0.5)' }}
                      >
                        <option value="galpao" style={{ backgroundColor: 'rgb(55, 65, 81)' }}>Galpão</option>
                        <option value="distribuidora" style={{ backgroundColor: 'rgb(55, 65, 81)' }}>Distribuidora</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value as 'ativo' | 'inativo' | 'bloqueado'})}
                        className="w-full p-2 sm:p-3 bg-gray-800/50 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 text-white text-sm sm:text-base"
                        style={{ backgroundColor: 'rgba(55, 65, 81, 0.5)' }}
                      >
                        <option value="ativo" style={{ backgroundColor: 'rgb(55, 65, 81)' }}>Ativo</option>
                        <option value="inativo" style={{ backgroundColor: 'rgb(55, 65, 81)' }}>Inativo</option>
                        <option value="bloqueado" style={{ backgroundColor: 'rgb(55, 65, 81)' }}>Bloqueado</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Contato */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Contato</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">Email *</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full p-2 sm:p-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 text-white text-sm sm:text-base"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">Telefone *</label>
                      <input
                        type="tel"
                        required
                        value={formData.telefone}
                        onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                        className="w-full p-2 sm:p-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 text-white text-sm sm:text-base"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">Cidade</label>
                      <input
                        type="text"
                        value={formData.cidade}
                        onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                        className="w-full p-2 sm:p-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 text-white text-sm sm:text-base"
                      />
                    </div>
                  </div>
                </div>

                {/* Informações Financeiras */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Informações Financeiras</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">Limite Crédito</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.limiteCredito}
                        onChange={(e) => setFormData({...formData, limiteCredito: parseFloat(e.target.value) || 0})}
                        className="w-full p-2 sm:p-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 text-white text-sm sm:text-base"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">Total Comprado</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.totalComprado}
                        onChange={(e) => setFormData({...formData, totalComprado: parseFloat(e.target.value) || 0})}
                        className="w-full p-2 sm:p-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 text-white text-sm sm:text-base"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">Valor Pendente</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.valorPendente}
                        onChange={(e) => setFormData({...formData, valorPendente: parseFloat(e.target.value) || 0})}
                        className="w-full p-2 sm:p-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 text-white text-sm sm:text-base"
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="flex gap-3 sm:gap-4 p-4 sm:p-6 border-t border-white/10">
              <button
                type="button"
                onClick={fecharModal}
                className="flex-1 px-4 sm:px-6 py-2 sm:py-3 text-gray-300 border border-white/20 rounded-lg sm:rounded-xl hover:bg-white/10 text-sm sm:text-base"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="form-cliente"
                disabled={salvando}
                className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg sm:rounded-xl hover:from-green-600 hover:to-green-700 disabled:opacity-50 text-sm sm:text-base"
              >
                {salvando ? (
                  <>
                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="hidden sm:inline">Salvando...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                    {modoModal === 'criar' ? 'Cadastrar' : 'Atualizar'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}