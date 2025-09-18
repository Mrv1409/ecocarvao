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

interface Funcionario {
  id?: string;
  nome: string;
  documento: string;
  empresa: 'galpao' | 'distribuidora'; 
  email: string;
  telefone: string;
  endereco: string;
  dataAdmissao: string;
  salario: number;
  status: 'ativo' | 'inativo';
}

export default function Pessoal() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoModal, setModoModal] = useState<'criar' | 'editar'>('criar');
  const [funcionarioEditando, setFuncionarioEditando] = useState<Funcionario | null>(null);
  const [salvando, setSalvando] = useState(false);
  
  // Estados para paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(20);
  
  const [formData, setFormData] = useState({
    nome: '',
    documento: '',
    empresa: 'galpao' as 'galpao' | 'distribuidora',
    email: '',
    telefone: '',
    endereco: '',
    dataAdmissao: '',
    salario: 0,
    status: 'ativo' as 'ativo' | 'inativo'
  });

  // Carregar funcionários da collection única
  const carregarFuncionarios = async () => {
    try {
      setCarregando(true);
      const q = query(collection(db, 'funcionarios'), orderBy('nome'));
      const snapshot = await getDocs(q);
      const funcionariosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        salario: doc.data().salario || 0
      })) as Funcionario[];
      setFuncionarios(funcionariosData);
      setPaginaAtual(1); // Reset página ao carregar novos dados
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarFuncionarios();
  }, []);

  const resetForm = () => {
    setFormData({
      nome: '',
      documento: '',
      empresa: 'galpao',
      email: '',
      telefone: '',
      endereco: '',
      dataAdmissao: '',
      salario: 0,
      status: 'ativo'
    });
  };

  const abrirModalCriar = () => {
    resetForm();
    setModoModal('criar');
    setMostrarModal(true);
  };

  const abrirModalEditar = (funcionario: Funcionario) => {
    setFormData({
      nome: funcionario.nome,
      documento: funcionario.documento,
      empresa: funcionario.empresa,
      email: funcionario.email,
      telefone: funcionario.telefone,
      endereco: funcionario.endereco,
      dataAdmissao: funcionario.dataAdmissao,
      salario: funcionario.salario,
      status: funcionario.status
    });
    setFuncionarioEditando(funcionario);
    setModoModal('editar');
    setMostrarModal(true);
  };

  const fecharModal = () => {
    setMostrarModal(false);
    setFuncionarioEditando(null);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);

    try {
      const dadosParaSalvar = {
        ...formData
      };

      if (modoModal === 'criar') {
        await addDoc(collection(db, 'funcionarios'), dadosParaSalvar);
      } else if (funcionarioEditando?.id) {
        await updateDoc(doc(db, 'funcionarios', funcionarioEditando.id), dadosParaSalvar);
      }
      await carregarFuncionarios();
      fecharModal();
    } catch (error) {
      console.error('Erro ao salvar funcionário:', error);
      alert('Erro ao salvar funcionário. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const excluirFuncionario = async (id: string, nome: string) => {
    if (window.confirm(`Tem certeza que deseja excluir ${nome}?`)) {
      try {
        await deleteDoc(doc(db, 'funcionarios', id));
        await carregarFuncionarios();
      } catch (error) {
        console.error('Erro ao excluir funcionário:', error);
        alert('Erro ao excluir funcionário. Tente novamente.');
      }
    }
  };

  const formatarMoeda = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  const formatarCPF = (cpf: string): string => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatarData = (data: string): string => {
    if (!data) return '';
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  // Filtro e paginação
  const funcionariosFiltrados = funcionarios.filter(funcionario =>
    !termoBusca || 
    funcionario.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
    funcionario.documento.includes(termoBusca) ||
    funcionario.email.toLowerCase().includes(termoBusca.toLowerCase())
  );

  // Reset página quando termo de busca muda
  useEffect(() => {
    setPaginaAtual(1);
  }, [termoBusca]);

  // Cálculos de paginação
  const totalItens = funcionariosFiltrados.length;
  const totalPaginas = Math.ceil(totalItens / itensPorPagina);
  const inicioIndice = (paginaAtual - 1) * itensPorPagina;
  const fimIndice = inicioIndice + itensPorPagina;
  const funcionariosPaginados = funcionariosFiltrados.slice(inicioIndice, fimIndice);

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

  const StatusBadge = ({ status }: { status: 'ativo' | 'inativo' }) => {
    const config = {
      ativo: { cor: 'bg-green-500/20 text-green-300 border-green-400/30', icone: CheckCircle, texto: 'Ativo' },
      inativo: { cor: 'bg-gray-500/20 text-gray-300 border-gray-400/30', icone: XCircle, texto: 'Inativo' }
    };
    
    const { cor, icone: Icone, texto } = config[status];
    
    return (
      <div className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs font-medium border ${cor}`}>
        <Icone className="w-3 h-3" />
        <span className="hidden sm:inline">{texto}</span>
      </div>
    );
  };

  const EmpresaBadge = ({ empresa }: { empresa: 'galpao' | 'distribuidora' | undefined }) => {
    const config = {
      galpao: { cor: 'bg-blue-500/20 text-blue-300 border-blue-400/30', texto: 'Galpão' },
      distribuidora: { cor: 'bg-purple-500/20 text-purple-300 border-purple-400/30', texto: 'Distribuidora' },
      undefined: { cor: 'bg-gray-500/20 text-gray-300 border-gray-400/30', texto: 'Não definido' }
    };
    
    const empresaKey = empresa || 'undefined';
    const { cor, texto } = config[empresaKey as keyof typeof config];
    
    return (
      <div className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs font-medium border ${cor}`}>
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
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-green-900 p-2 sm:p-4 lg:p-8">
      <div className="space-y-4 sm:space-y-6">
        {/* Header simplificado */}
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
                  <h1 className="text-xl sm:text-2xl font-bold text-white">Funcionários</h1>
                  <p className="text-xs sm:text-base text-gray-300">Gerencie sua equipe</p>
                </div>
              </div>
            </div>
            
            <button 
              onClick={abrirModalCriar}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg sm:rounded-xl hover:from-green-600 hover:to-green-700 transition-all text-sm sm:text-base"
            >
              <Plus className="w-4 h-4" />
              Novo Funcionário
            </button>
          </div>
        </div>

        {/* Busca */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 p-4 sm:p-6">
          <div className="relative">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar funcionários..."
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
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase hidden sm:table-cell">CPF</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase">Empresa</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase hidden lg:table-cell">Contato</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase hidden md:table-cell">Admissão</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase hidden xl:table-cell">Salário</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-xs font-medium text-gray-300 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody>
                {funcionariosPaginados.map(funcionario => (
                  <tr key={funcionario.id} className="hover:bg-white/5 border-b border-white/10">
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="text-xs sm:text-sm font-medium text-white">{funcionario.nome}</div>
                      <div className="text-xs text-gray-300 sm:hidden">{formatarCPF(funcionario.documento)}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell">
                      <span className="text-xs sm:text-sm text-gray-300">{formatarCPF(funcionario.documento)}</span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <EmpresaBadge empresa={funcionario.empresa} />
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 hidden lg:table-cell">
                      <div className="text-xs sm:text-sm text-white">{funcionario.email}</div>
                      <div className="text-xs text-gray-300">{funcionario.telefone}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-300 hidden md:table-cell">
                      {formatarData(funcionario.dataAdmissao)}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <StatusBadge status={funcionario.status} />
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-green-400 hidden xl:table-cell">
                      {formatarMoeda(funcionario.salario)}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                      <div className="flex gap-1 sm:gap-2 justify-end">
                        <button 
                          onClick={() => abrirModalEditar(funcionario)}
                          className="p-1 sm:p-2 text-blue-400 hover:bg-blue-500/20 rounded-full"
                        >
                          <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <button 
                          onClick={() => excluirFuncionario(funcionario.id!, funcionario.nome)}
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
                  Mostrando {inicioIndice + 1} a {Math.min(fimIndice, totalItens)} de {totalItens} funcionários
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
        {funcionariosFiltrados.length === 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 p-8 sm:p-12 text-center">
            <Users className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-white mb-2">Nenhum funcionário encontrado</h3>
            <p className="text-sm text-gray-300 mb-6">Comece cadastrando seu primeiro funcionário</p>
            <button 
              onClick={abrirModalCriar}
              className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg sm:rounded-xl mx-auto text-sm sm:text-base"
            >
              <Plus className="w-4 h-4" />
              Novo Funcionário
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={fecharModal} />
          
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {modoModal === 'criar' ? 'Novo Funcionário' : 'Editar Funcionário'}
              </h2>
              <button onClick={fecharModal} className="p-1 sm:p-2 hover:bg-white/10 rounded-full">
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <form onSubmit={handleSubmit} id="form-funcionario" className="space-y-4 sm:space-y-6">
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
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">CPF *</label>
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
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">Data Admissão *</label>
                      <input
                        type="date"
                        required
                        value={formData.dataAdmissao}
                        onChange={(e) => setFormData({...formData, dataAdmissao: e.target.value})}
                        className="w-full p-2 sm:p-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 text-white text-sm sm:text-base"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value as 'ativo' | 'inativo'})}
                        className="w-full p-2 sm:p-3 bg-gray-800/50 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 text-white text-sm sm:text-base"
                        style={{ backgroundColor: 'rgba(55, 65, 81, 0.5)' }}
                      >
                        <option value="ativo" style={{ backgroundColor: 'rgb(55, 65, 81)' }}>Ativo</option>
                        <option value="inativo" style={{ backgroundColor: 'rgb(55, 65, 81)' }}>Inativo</option>
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
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">Endereço</label>
                      <input
                        type="text"
                        value={formData.endereco}
                        onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                        className="w-full p-2 sm:p-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 text-white text-sm sm:text-base"
                      />
                    </div>
                  </div>
                </div>

                {/* Informações Salariais */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Informações Salariais</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">Salário *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={formData.salario}
                        onChange={(e) => setFormData({...formData, salario: parseFloat(e.target.value) || 0})}
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
                form="form-funcionario"
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