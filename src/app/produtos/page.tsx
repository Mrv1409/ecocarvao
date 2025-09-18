'use client';

import { useState, useEffect } from 'react';
import { Package, Search, Plus, Edit2, Trash2, X, Save, AlertTriangle, ArrowLeft } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';

interface Produto {
  id?: string;
  nome: string;
  empresa?: 'galpao' | 'distribuidora';
  categoria: string;
  precoCompra: number;
  precoVenda: number;
  estoque: number;
  estoqueMinimo: number;
  fornecedor: string;
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
    empresa: 'galpao' as 'galpao' | 'distribuidora',
    categoria: '',
    precoCompra: 0,
    precoVenda: 0,
    estoque: 0,
    estoqueMinimo: 0,
    fornecedor: ''
  });

  const carregarProdutos = async () => {
    try {
      setCarregando(true);
      const q = query(collection(db, 'produtos'), orderBy('nome'));
      const snapshot = await getDocs(q);
      const produtosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
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
      empresa: 'galpao',
      categoria: '',
      precoCompra: 0,
      precoVenda: 0,
      estoque: 0,
      estoqueMinimo: 0,
      fornecedor: ''
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
      empresa: produto.empresa || 'galpao',
      categoria: produto.categoria,
      precoCompra: produto.precoCompra,
      precoVenda: produto.precoVenda,
      estoque: produto.estoque,
      estoqueMinimo: produto.estoqueMinimo,
      fornecedor: produto.fornecedor
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
      if (modoModal === 'criar') {
        await addDoc(collection(db, 'produtos'), formData);
      } else if (produtoEditando?.id) {
        await updateDoc(doc(db, 'produtos', produtoEditando.id), formData);
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
      }
    }
  };

  const formatarMoeda = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  const calcularMargem = (precoVenda: number, precoCompra: number): number => {
    if (precoVenda === 0) return 0;
    return ((precoVenda - precoCompra) / precoVenda) * 100;
  };

  const produtosFiltrados = produtos.filter(produto =>
    !termoBusca || 
    produto.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
    produto.categoria.toLowerCase().includes(termoBusca.toLowerCase()) ||
    produto.fornecedor.toLowerCase().includes(termoBusca.toLowerCase())
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
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-green-900 p-2 sm:p-4">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-green-400 to-green-600">
                  <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white">Produtos</h1>
                  <p className="text-sm text-gray-300">Gerencie seu estoque</p>
                </div>
              </div>
            </div>
            
            <button 
              onClick={abrirModalCriar} 
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="sm:inline">Novo Produto</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 p-4 sm:p-6">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 text-white placeholder-gray-400"
            />
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Produto</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Empresa</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Categoria</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Preços</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Estoque</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Fornecedor</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Margem</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-300 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtosFiltrados.map(produto => (
                  <tr key={produto.id} className="hover:bg-white/5 border-b border-white/10">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-white">{produto.nome}</div>
                    </td>
                    <td className="px-6 py-4">
                      <EmpresaBadge empresa={produto.empresa} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-300">{produto.categoria}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-green-400">{formatarMoeda(produto.precoVenda)}</div>
                      <div className="text-xs text-gray-300">Custo: {formatarMoeda(produto.precoCompra)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium ${produto.estoque <= produto.estoqueMinimo ? 'text-red-400' : 'text-white'}`}>
                        {produto.estoque}
                      </span>
                      {produto.estoque <= produto.estoqueMinimo && (
                        <div className="text-xs text-red-300">Baixo</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {produto.fornecedor}
                    </td>
                    <td className="px-6 py-4 text-sm text-blue-400">
                      {calcularMargem(produto.precoVenda, produto.precoCompra).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => abrirModalEditar(produto)} className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-full">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => excluirProduto(produto.id!, produto.nome)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-full">
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

        {/* Mobile/Tablet Cards */}
        <div className="lg:hidden space-y-3">
          {produtosFiltrados.map(produto => (
            <div key={produto.id} className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">{produto.nome}</h3>
                  <p className="text-xs text-gray-300 mt-1">{produto.categoria}</p>
                </div>
                <div className="flex gap-1 ml-2">
                  <button onClick={() => abrirModalEditar(produto)} className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded-lg">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => excluirProduto(produto.id!, produto.nome)} className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              
              <div className="flex justify-between items-center mb-2">
                <EmpresaBadge empresa={produto.empresa} />
                <span className="text-xs text-blue-400 font-medium">
                  {calcularMargem(produto.precoVenda, produto.precoCompra).toFixed(1)}%
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-400">Venda:</span>
                  <span className="text-green-400 font-medium ml-1">{formatarMoeda(produto.precoVenda)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Custo:</span>
                  <span className="text-gray-300 ml-1">{formatarMoeda(produto.precoCompra)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Estoque:</span>
                  <span className={`font-medium ml-1 ${produto.estoque <= produto.estoqueMinimo ? 'text-red-400' : 'text-white'}`}>
                    {produto.estoque}
                    {produto.estoque <= produto.estoqueMinimo && <span className="text-red-300"> (Baixo)</span>}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Fornecedor:</span>
                  <span className="text-gray-300 ml-1 truncate">{produto.fornecedor}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {produtosFiltrados.length === 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 p-8 sm:p-12 text-center">
            <Package className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-white mb-2">Nenhum produto encontrado</h3>
            <p className="text-sm text-gray-300 mb-6">Comece cadastrando seu primeiro produto</p>
            <button 
              onClick={abrirModalCriar} 
              className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl mx-auto"
            >
              <Plus className="w-4 h-4" />
              Novo Produto
            </button>
          </div>
        )}
      </div>

      {/* Modal Otimizado */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={fecharModal} />
          
          <div className="relative w-full max-w-lg sm:max-w-2xl bg-white/10 backdrop-blur-md rounded-t-2xl sm:rounded-2xl border border-white/20 max-h-[90vh] sm:max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 flex-shrink-0">
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {modoModal === 'criar' ? 'Novo Produto' : 'Editar Produto'}
              </h2>
              <button onClick={fecharModal} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-5 h-5 text-gray-300" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nome e Empresa */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome *</label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                      className="w-full p-2.5 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-500 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Empresa *</label>
                    <select
                      value={formData.empresa}
                      onChange={(e) => setFormData({...formData, empresa: e.target.value as 'galpao' | 'distribuidora'})}
                      className="w-full p-2.5 bg-gray-800/50 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-500 text-white text-sm"
                    >
                      <option value="galpao">Galpão</option>
                      <option value="distribuidora">Distribuidora</option>
                    </select>
                  </div>
                </div>

                {/* Categoria e Fornecedor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Categoria *</label>
                    <input
                      type="text"
                      required
                      value={formData.categoria}
                      onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                      className="w-full p-2.5 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-500 text-white text-sm"
                      placeholder="Ex: Ração, Medicamento..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Fornecedor *</label>
                    <input
                      type="text"
                      required
                      value={formData.fornecedor}
                      onChange={(e) => setFormData({...formData, fornecedor: e.target.value})}
                      className="w-full p-2.5 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-500 text-white text-sm"
                    />
                  </div>
                </div>

                {/* Preços */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Preço Compra *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={formData.precoCompra}
                      onChange={(e) => setFormData({...formData, precoCompra: parseFloat(e.target.value) || 0})}
                      className="w-full p-2.5 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-500 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Preço Venda *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={formData.precoVenda}
                      onChange={(e) => setFormData({...formData, precoVenda: parseFloat(e.target.value) || 0})}
                      className="w-full p-2.5 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-500 text-white text-sm"
                    />
                  </div>
                </div>

                {/* Estoque */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Estoque *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formData.estoque}
                      onChange={(e) => setFormData({...formData, estoque: parseInt(e.target.value) || 0})}
                      className="w-full p-2.5 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-500 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Estoque Mínimo *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formData.estoqueMinimo}
                      onChange={(e) => setFormData({...formData, estoqueMinimo: parseInt(e.target.value) || 0})}
                      className="w-full p-2.5 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-500 text-white text-sm"
                    />
                  </div>
                </div>

                {/* Margem de Lucro */}
                {formData.precoVenda > 0 && formData.precoCompra > 0 && (
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="text-xs text-gray-300">Margem de Lucro:</span>
                      <span className="text-sm font-semibold text-blue-400">
                        {calcularMargem(formData.precoVenda, formData.precoCompra).toFixed(1)}%
                      </span>
                      <span className="text-xs text-gray-300">
                        (Lucro: {formatarMoeda(formData.precoVenda - formData.precoCompra)})
                      </span>
                    </div>
                  </div>
                )}

                {/* Alerta Estoque */}
                {formData.estoque <= formData.estoqueMinimo && formData.estoqueMinimo > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      <span className="text-sm text-yellow-300">Atenção: Estoque abaixo do mínimo</span>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 sm:p-5 border-t border-white/10 flex-shrink-0">
              <button
                type="button"
                onClick={fecharModal}
                className="flex-1 px-4 py-2.5 text-gray-300 border border-white/20 rounded-lg hover:bg-white/10 text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={salvando}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 text-sm"
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
          </div>
        </div>
      )}
    </div>
  );
}