'use client';

import { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  Edit2,
  Trash2,
  X,
  Save,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Tag,
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

interface Produto {
  id?: string;
  nome: string;
  codigoBarras: string;
  categoria: 'racoes' | 'medicamentos' | 'brinquedos' | 'higiene' | 'acessorios';
  descricao: string;
  precoCompra: number;
  precoVenda: number;
  estoque: number;
  estoqueMinimo: number;
  unidade: string;
  fornecedor: string;
  fornecedorId?: string; // Campo-chave para integração
  ativo: boolean;
  totalVendido: number; // Campo-chave para integração financeira
  ultimaVenda?: Date; // Campo-chave para histórico
  clientesQueCompraram: string[]; // Campo-chave para integração com clientes
  dataUltimaEntrada?: Date;
}

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoModal, setModoModal] = useState<'criar' | 'editar'>('criar');
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);
  const [salvando, setSalvando] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '',
    codigoBarras: '',
    categoria: 'racoes' as 'racoes' | 'medicamentos' | 'insumos' | 'brinquedos' | 'higiene' | 'acessorios',
    descricao: '',
    precoCompra: 0,
    precoVenda: 0,
    estoque: 0,
    estoqueMinimo: 0,
    unidade: 'un',
    fornecedor: '',
    fornecedorId: '',
    ativo: true,
    totalVendido: 0,
    ultimaVenda: undefined as Date | undefined,
    clientesQueCompraram: [] as string[],
    dataUltimaEntrada: undefined as Date | undefined
  });

  // Carregar produtos
  const carregarProdutos = async () => {
    try {
      const q = query(collection(db, 'produtos'), orderBy('nome'));
      const snapshot = await getDocs(q);
      const produtosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        totalVendido: doc.data().totalVendido || 0,
        clientesQueCompraram: doc.data().clientesQueCompraram || [],
        ultimaVenda: doc.data().ultimaVenda?.toDate() || undefined,
        dataUltimaEntrada: doc.data().dataUltimaEntrada?.toDate() || undefined
      })) as Produto[];
      setProdutos(produtosData);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarProdutos();
  }, []);

  const resetForm = () => {
    setFormData({
      nome: '',
      codigoBarras: '',
      categoria: 'racoes',
      descricao: '',
      precoCompra: 0,
      precoVenda: 0,
      estoque: 0,
      estoqueMinimo: 0,
      unidade: 'un',
      fornecedor: '',
      fornecedorId: '',
      ativo: true,
      totalVendido: 0,
      ultimaVenda: undefined,
      clientesQueCompraram: [],
      dataUltimaEntrada: undefined
    });
  };

  const abrirModalCriar = () => {
    resetForm();
    setModoModal('criar');
    setMostrarModal(true);
  };

  const abrirModalEditar = (produto: Produto) => {
    setFormData({
      nome: produto.nome,
      codigoBarras: produto.codigoBarras,
      categoria: produto.categoria,
      descricao: produto.descricao,
      precoCompra: produto.precoCompra,
      precoVenda: produto.precoVenda,
      estoque: produto.estoque,
      estoqueMinimo: produto.estoqueMinimo,
      unidade: produto.unidade,
      fornecedor: produto.fornecedor,
      fornecedorId: produto.fornecedorId || '',
      ativo: produto.ativo,
      totalVendido: produto.totalVendido,
      ultimaVenda: produto.ultimaVenda,
      clientesQueCompraram: produto.clientesQueCompraram,
      dataUltimaEntrada: produto.dataUltimaEntrada
    });
    setProdutoEditando(produto);
    setModoModal('editar');
    setMostrarModal(true);
  };

  const fecharModal = () => {
    setMostrarModal(false);
    setProdutoEditando(null);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);

    try {
      const dadosParaSalvar = {
        ...formData,
        ultimaVenda: formData.ultimaVenda || null,
        dataUltimaEntrada: formData.dataUltimaEntrada || null
      };

      if (modoModal === 'criar') {
        await addDoc(collection(db, 'produtos'), dadosParaSalvar);
      } else if (produtoEditando?.id) {
        await updateDoc(doc(db, 'produtos', produtoEditando.id), dadosParaSalvar);
      }
      await carregarProdutos();
      fecharModal();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      alert('Erro ao salvar produto. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const excluirProduto = async (id: string, nome: string) => {
    if (window.confirm(`Tem certeza que deseja excluir ${nome}?`)) {
      try {
        await deleteDoc(doc(db, 'produtos', id));
        await carregarProdutos();
      } catch (error) {
        console.error('Erro ao excluir produto:', error);
        alert('Erro ao excluir produto. Tente novamente.');
      }
    }
  };

  const formatarMoeda = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  const calcularMargem = (precoVenda: number, precoCompra: number): number => {
    if (precoVenda === 0) return 0;
    return ((precoVenda - precoCompra) / precoVenda) * 100;
  };

  const produtosFiltrados = produtos.filter(produto =>
    !termoBusca || 
    produto.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
    produto.codigoBarras.includes(termoBusca) ||
    produto.fornecedor.toLowerCase().includes(termoBusca.toLowerCase()) ||
    produto.categoria.toLowerCase().includes(termoBusca.toLowerCase())
  );

  const StatusBadge = ({ status }: { status: boolean }) => {
    const config = status 
      ? { cor: 'bg-green-500/20 text-green-300 border-green-400/30', icone: CheckCircle, texto: 'Ativo' }
      : { cor: 'bg-red-500/20 text-red-300 border-red-400/30', icone: XCircle, texto: 'Inativo' };
    
    const { cor, icone: Icone, texto } = config;
    
    return (
      <div className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs font-medium border ${cor}`}>
        <Icone className="w-3 h-3" />
        <span className="hidden sm:inline">{texto}</span>
      </div>
    );
  };

  const CategoriaBadge = ({ categoria }: { categoria: string }) => {
    const config: Record<string, { cor: string; texto: string }> = {
      racoes: { cor: 'bg-orange-500/20 text-orange-300 border-orange-400/30', texto: 'Rações' },
      medicamentos: { cor: 'bg-red-500/20 text-red-300 border-red-400/30', texto: 'Medicamentos' },
      brinquedos: { cor: 'bg-pink-500/20 text-pink-300 border-pink-400/30', texto: 'Brinquedos' },
      higiene: { cor: 'bg-blue-500/20 text-blue-300 border-blue-400/30', texto: 'Higiene' },
      acessorios: { cor: 'bg-purple-500/20 text-purple-300 border-purple-400/30', texto: 'Acessórios' }
    };
    
    const { cor, texto } = config[categoria] || config.racoes;
    
    return (
      <div className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs font-medium border ${cor}`}>
        <Tag className="w-3 h-3" />
        <span className="hidden sm:inline">{texto}</span>
      </div>
    );
  };

  const EstoqueBadge = ({ produto }: { produto: Produto }) => {
    if (produto.estoque === 0) {
      return (
        <div className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs font-medium border bg-red-500/20 text-red-300 border-red-400/30">
          <XCircle className="w-3 h-3" />
          <span className="hidden sm:inline">Zerado</span>
        </div>
      );
    }
    
    if (produto.estoque <= produto.estoqueMinimo) {
      return (
        <div className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs font-medium border bg-yellow-500/20 text-yellow-300 border-yellow-400/30">
          <AlertTriangle className="w-3 h-3" />
          <span className="hidden sm:inline">Baixo</span>
        </div>
      );
    }
    
    return (
      <div className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs font-medium border bg-green-500/20 text-green-300 border-green-400/30">
        <CheckCircle className="w-3 h-3" />
        <span className="hidden sm:inline">Normal</span>
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
        {/* Header - Responsivo */}
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
                  <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white">Produtos</h1>
                  <p className="text-xs sm:text-base text-gray-300">Gerencie seu estoque</p>
                </div>
              </div>
            </div>
            <button 
              onClick={abrirModalCriar}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg sm:rounded-xl hover:from-green-600 hover:to-green-700 transition-all text-sm sm:text-base"
            >
              <Plus className="w-4 h-4" />
              Novo Produto
            </button>
          </div>
        </div>

        {/* Busca - Responsiva */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 p-4 sm:p-6">
          <div className="relative">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, código, fornecedor..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 text-white placeholder-gray-400 text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Lista - Responsiva com scroll horizontal em mobile */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase">Produto</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase hidden sm:table-cell">Categoria</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase hidden lg:table-cell">Preços</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase">Estoque</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase hidden md:table-cell">Fornecedor</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase hidden xl:table-cell">Margem</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-xs font-medium text-gray-300 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtosFiltrados.map(produto => (
                  <tr key={produto.id} className="hover:bg-white/5 border-b border-white/10">
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="text-xs sm:text-sm font-medium text-white">{produto.nome}</div>
                      <div className="text-xs text-gray-300">{produto.codigoBarras}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell">
                      <CategoriaBadge categoria={produto.categoria} />
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 hidden lg:table-cell">
                      <div className="text-xs sm:text-sm text-green-400">{formatarMoeda(produto.precoVenda)}</div>
                      <div className="text-xs text-gray-300">Custo: {formatarMoeda(produto.precoCompra)}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`text-xs sm:text-sm font-medium ${produto.estoque <= produto.estoqueMinimo ? 'text-red-400' : 'text-white'}`}>
                          {produto.estoque} {produto.unidade}
                        </span>
                        <EstoqueBadge produto={produto} />
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <StatusBadge status={produto.ativo} />
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-300 hidden md:table-cell">
                      {produto.fornecedor}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-blue-400 hidden xl:table-cell">
                      {calcularMargem(produto.precoVenda, produto.precoCompra).toFixed(1)}%
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                      <div className="flex gap-1 sm:gap-2 justify-end">
                        <button 
                          onClick={() => abrirModalEditar(produto)}
                          className="p-1 sm:p-2 text-blue-400 hover:bg-blue-500/20 rounded-full"
                        >
                          <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <button 
                          onClick={() => excluirProduto(produto.id!, produto.nome)}
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
        </div>

        {/* Empty State - Responsivo */}
        {produtosFiltrados.length === 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 p-8 sm:p-12 text-center">
            <Package className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-white mb-2">Nenhum produto encontrado</h3>
            <p className="text-sm text-gray-300 mb-6">Comece cadastrando seu primeiro produto</p>
            <button 
              onClick={abrirModalCriar}
              className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg sm:rounded-xl mx-auto text-sm sm:text-base"
            >
              <Plus className="w-4 h-4" />
              Novo Produto
            </button>
          </div>
        )}
      </div>

      {/* Modal - RESPONSIVO */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={fecharModal} />
          
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 flex flex-col">
            {/* Header do Modal - Fixo */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {modoModal === 'criar' ? 'Novo Produto' : 'Editar Produto'}
              </h2>
              <button onClick={fecharModal} className="p-1 sm:p-2 hover:bg-white/10 rounded-full">
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" />
              </button>
            </div>

            {/* Conteúdo do Form - Scrollável */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <form onSubmit={handleSubmit} id="form-produto" className="space-y-4 sm:space-y-6">
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
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">Código de Barras *</label>
                      <input
                        type="text"
                        required
                        value={formData.codigoBarras}
                        onChange={(e) => setFormData({...formData, codigoBarras: e.target.value})}
                        className="w-full p-2 sm:p-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 text-white text-sm sm:text-base"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-200 mb-1 sm:mb-2">Categoria</label>
                      <select
                        value={formData.categoria}
                        onChange={(e) => setFormData({...formData, categoria: e.target.value as 'racoes' | 'medicamentos' | 'brinquedos' | 'higiene' | 'acessorios'})}
                        className="w-full p-2 sm:p-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 text-green-500 text-sm sm:text-base"
                      >
                        <option value="racoes">Rações</option>
                        <option value="medicamentos">Medicamentos</option>
                        <option value="brinquedos">Brinquedos</option>
                        <option value="higiene">Higiene</option>
                        <option value="acessorios">Acessórios</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-200 mb-1 sm:mb-2">Unidade</label>
                      <select
                        value={formData.unidade}
                        onChange={(e) => setFormData({...formData, unidade: e.target.value})}
                        className="w-full p-2 sm:p-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 text-white text-sm sm:text-base"
                      >
                        <option value="un">Unidade</option>
                        <option value="kg">Quilograma</option>
                        <option value="g">Grama</option>
                        <option value="l">Litro</option>
                        <option value="ml">Mililitro</option>
                        <option value="m">Metro</option>
                        <option value="cm">Centímetro</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">Descrição</label>
                      <textarea
                        value={formData.descricao}
                        onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                        rows={3}
                        className="w-full p-2 sm:p-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 text-white text-sm sm:text-base"
                        placeholder="Descrição detalhada do produto..."
                      />
                    </div>
                  </div>
                </div>

                {/* Preços */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Preços</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">Preço de Compra *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={formData.precoCompra}
                        onChange={(e) => setFormData({...formData, precoCompra: parseFloat(e.target.value) || 0})}
                        className="w-full p-2 sm:p-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 text-white text-sm sm:text-base"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">Preço de Venda *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={formData.precoVenda}
                        onChange={(e) => setFormData({...formData, precoVenda: parseFloat(e.target.value) || 0})}
                        className="w-full p-2 sm:p-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 text-white text-sm sm:text-base"
                      />
                    </div>

                    {formData.precoVenda > 0 && formData.precoCompra > 0 && (
                      <div className="sm:col-span-2">
                        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                          <span className="text-xs text-gray-300">Margem de Lucro: </span>
                          <span className="text-sm font-semibold text-blue-400">
                            {calcularMargem(formData.precoVenda, formData.precoCompra).toFixed(1)}%
                          </span>
                          <span className="text-xs text-gray-300 ml-2">
                            (Lucro: {formatarMoeda(formData.precoVenda - formData.precoCompra)})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Estoque */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Controle de Estoque</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">Quantidade em Estoque *</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={formData.estoque}
                        onChange={(e) => setFormData({...formData, estoque: parseInt(e.target.value) || 0})}
                        className="w-full p-2 sm:p-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 text-white text-sm sm:text-base"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">Estoque Mínimo *</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={formData.estoqueMinimo}
                        onChange={(e) => setFormData({...formData, estoqueMinimo: parseInt(e.target.value) || 0})}
                        className="w-full p-2 sm:p-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 text-white text-sm sm:text-base"
                      />
                    </div>

                    {formData.estoque <= formData.estoqueMinimo && formData.estoqueMinimo > 0 && (
                      <div className="sm:col-span-2">
                        <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm text-yellow-300">
                              Atenção: Estoque abaixo do mínimo recomendado
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Fornecedor e Status */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Fornecedor e Status</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">Fornecedor *</label>
                      <input
                        type="text"
                        required
                        value={formData.fornecedor}
                        onChange={(e) => setFormData({...formData, fornecedor: e.target.value})}
                        className="w-full p-2 sm:p-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 text-white text-sm sm:text-base"
                        placeholder="Nome do fornecedor"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">ID do Fornecedor</label>
                      <input
                        type="text"
                        value={formData.fornecedorId}
                        onChange={(e) => setFormData({...formData, fornecedorId: e.target.value})}
                        className="w-full p-2 sm:p-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 text-white text-sm sm:text-base"
                        placeholder="Código/ID do fornecedor"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-gray-300">
                        <input
                          type="checkbox"
                          checked={formData.ativo}
                          onChange={(e) => setFormData({...formData, ativo: e.target.checked})}
                          className="rounded border-gray-600 bg-white/10 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-xs sm:text-sm font-medium">Produto Ativo</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Informações Adicionais - Campos de Integração */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Informações Comerciais</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">Total Vendido</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.totalVendido}
                        onChange={(e) => setFormData({...formData, totalVendido: parseFloat(e.target.value) || 0})}
                        className="w-full p-2 sm:p-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 text-white text-sm sm:text-base"
                        placeholder="Valor total já vendido"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">Clientes que Compraram</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.clientesQueCompraram.length}
                        readOnly
                        className="w-full p-2 sm:p-3 bg-white/5 border border-white/20 rounded-lg sm:rounded-xl text-gray-400 text-sm sm:text-base"
                        placeholder="Será atualizado automaticamente"
                      />
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-xs text-gray-400 mb-2">
                      <strong>Campos de Integração:</strong> Os campos &quot;Total Vendido&quot; e &quot;Clientes que Compraram&quot; 
                      são automaticamente atualizados quando vendas são registradas no sistema, permitindo 
                      total integração entre produtos, clientes e financeiro.
                    </p>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer do Modal - Fixo */}
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
                form="form-produto"
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