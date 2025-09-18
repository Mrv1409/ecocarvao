'use client';

import { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Edit2,
  Trash2,
  X,
  Save,
  CheckCircle,
  Clock,
  ArrowLeft,
  FileText,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Users,
  Package
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
import jsPDF from 'jspdf';

interface Cliente {
  id: string;
  nome: string;
  documento: string;
  email: string;
  telefone: string;
  cidade: string;
  status: 'ativo' | 'inativo' | 'bloqueado';
}

interface Produto {
  id: string;
  nome: string;
  precoVenda: number;
  categoria: string;
  fornecedor: string;
  empresa?: 'galpao' | 'distribuidora';
}

interface Venda {
  id?: string;
  descricao: string;
  nomeCliente: string;
  clienteId: string;
  nomeProduto: string;
  produtoId: string;
  precoProduto: number;
  quantidade: number;
  total: number;
  tipoEmpresa: 'galpao' | 'distribuidora';
  status: 'pendente' | 'confirmado';
  formaPagamento: 'dinheiro' | 'cartao' | 'pix';
  dataVenda: Date;
  documentoFiscal?: {
    numero: string;
    tipo: 'recibo';
    status: 'emitido' | 'enviado' | 'pago' | 'cancelado';
  };
}

export default function Vendas() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarModalNota, setMostrarModalNota] = useState(false);
  const [modoModal, setModoModal] = useState<'criar' | 'editar'>('criar');
  const [vendaEditando, setVendaEditando] = useState<Venda | null>(null);
  const [vendaParaNota, setVendaParaNota] = useState<Venda | null>(null);
  const [salvando, setSalvando] = useState(false);
  
  // Estados para paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(20);
  
  const [formData, setFormData] = useState({
    descricao: '',
    nomeCliente: '',
    clienteId: '',
    nomeProduto: '',
    produtoId: '',
    precoProduto: 0,
    quantidade: 1,
    total: 0,
    tipoEmpresa: 'galpao' as 'galpao' | 'distribuidora',
    status: 'pendente' as 'pendente' | 'confirmado',
    formaPagamento: 'dinheiro' as 'dinheiro' | 'cartao' | 'pix',
    dataVenda: new Date()
  });

  const [formNota, setFormNota] = useState({
    numero: '',
    tipo: 'recibo' as const,
    status: 'emitido' as 'emitido' | 'enviado' | 'pago' | 'cancelado'
  });

  // Função para gerar PDF do recibo
  const gerarPDF = (venda: Venda, dadosNota: typeof formNota) => {
    const pdf = new jsPDF();
    
    // Configuração da fonte
    pdf.setFont('helvetica');
    
    // Header da empresa
    pdf.setFillColor(34, 197, 94); // Verde
    pdf.rect(0, 0, 210, 25, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    const nomeEmpresa = venda.tipoEmpresa === 'galpao' ? 'GALPÃO ECO CARVÃO' : 'DISTRIBUIDORA ECO CARVÃO';
    pdf.text(nomeEmpresa, 20, 15);
    
    pdf.setFontSize(10);
    pdf.text('Sistema de Gestão Empresarial', 20, 20);
    
    // Título do documento
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(16);
    pdf.text('RECIBO DE PAGAMENTO', 20, 40);
    
    // Linha separadora
    pdf.setLineWidth(0.5);
    pdf.line(20, 45, 190, 45);
    
    // Informações do recibo
    pdf.setFontSize(12);
    pdf.text('INFORMAÇÕES DO DOCUMENTO', 20, 55);
    
    pdf.setFontSize(10);
    pdf.text(`Número: ${dadosNota.numero}`, 20, 65);
    pdf.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 20, 72);
    pdf.text(`Status: ${dadosNota.status.toUpperCase()}`, 20, 79);
    pdf.text(`Unidade: ${venda.tipoEmpresa.toUpperCase()}`, 20, 86);
    
    // Informações da venda
    pdf.setFontSize(12);
    pdf.text('DADOS DA VENDA', 20, 100);
    
    pdf.setFontSize(10);
    pdf.text(`Descrição: ${venda.descricao}`, 20, 110);
    pdf.text(`Cliente: ${venda.nomeCliente}`, 20, 117);
    pdf.text(`Produto: ${venda.nomeProduto}`, 20, 124);
    pdf.text(`Quantidade: ${venda.quantidade}`, 20, 131);
    pdf.text(`Preço unitário: ${formatarMoeda(venda.precoProduto)}`, 20, 138);
    pdf.text(`Data da Venda: ${venda.dataVenda.toLocaleDateString('pt-BR')}`, 20, 145);
    pdf.text(`Forma de Pagamento: ${venda.formaPagamento.toUpperCase()}`, 20, 152);
    pdf.text(`Status da Venda: ${venda.status.toUpperCase()}`, 20, 159);
    
    // Valor total
    pdf.setFontSize(14);
    pdf.setTextColor(34, 197, 94);
    pdf.text(`VALOR TOTAL: ${formatarMoeda(venda.total)}`, 20, 175);
    
    // Footer
    pdf.setTextColor(128, 128, 128);
    pdf.setFontSize(8);
    pdf.text('Este documento foi gerado automaticamente pelo sistema Eco Carvão', 20, 280);
    pdf.text(`Documento gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, 285);
    
    // Salvar o PDF
    pdf.save(`RECIBO_${dadosNota.numero}.pdf`);
  };

  // Carregar todos os clientes - SEM FILTRO
  const carregarClientes = async () => {
    try {
      const q = query(collection(db, 'clientes'), orderBy('nome'));
      const snapshot = await getDocs(q);
      const clientesData = snapshot.docs.map(doc => ({
        id: doc.id,
        nome: doc.data().nome,
        documento: doc.data().documento,
        email: doc.data().email || '',
        telefone: doc.data().telefone || '',
        cidade: doc.data().cidade || '',
        status: doc.data().status || 'ativo'
      })) as Cliente[];
      setClientes(clientesData);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  // Carregar todos os produtos - SEM FILTRO
  const carregarProdutos = async () => {
    try {
      const q = query(collection(db, 'produtos'), orderBy('nome'));
      const snapshot = await getDocs(q);
      const produtosData = snapshot.docs.map(doc => ({
        id: doc.id,
        nome: doc.data().nome,
        precoVenda: doc.data().precoVenda || 0,
        categoria: doc.data().categoria || '',
        fornecedor: doc.data().fornecedor || '',
        empresa: doc.data().empresa
      })) as Produto[];
      setProdutos(produtosData);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  // Carregar vendas
  const carregarVendas = async () => {
    try {
      const q = query(collection(db, 'vendas'), orderBy('dataVenda', 'desc'));
      const snapshot = await getDocs(q);
      const vendasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dataVenda: doc.data().dataVenda?.toDate() || new Date()
      })) as Venda[];
      setVendas(vendasData);
      setPaginaAtual(1); // Reset página ao carregar novos dados
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    Promise.all([carregarVendas(), carregarClientes(), carregarProdutos()]);
  }, []);

  // Calcular total automaticamente
  useEffect(() => {
    const total = formData.precoProduto * formData.quantidade;
    setFormData(prev => ({ ...prev, total }));
  }, [formData.precoProduto, formData.quantidade]);

  const resetForm = () => {
    setFormData({
      descricao: '',
      nomeCliente: '',
      clienteId: '',
      nomeProduto: '',
      produtoId: '',
      precoProduto: 0,
      quantidade: 1,
      total: 0,
      tipoEmpresa: 'galpao',
      status: 'pendente',
      formaPagamento: 'dinheiro',
      dataVenda: new Date()
    });
  };

  const abrirModalCriar = () => {
    resetForm();
    setModoModal('criar');
    setMostrarModal(true);
  };

  const abrirModalEditar = (venda: Venda) => {
    setFormData({
      descricao: venda.descricao,
      nomeCliente: venda.nomeCliente,
      clienteId: venda.clienteId,
      nomeProduto: venda.nomeProduto,
      produtoId: venda.produtoId,
      precoProduto: venda.precoProduto,
      quantidade: venda.quantidade,
      total: venda.total,
      tipoEmpresa: venda.tipoEmpresa,
      status: venda.status,
      formaPagamento: venda.formaPagamento,
      dataVenda: venda.dataVenda
    });
    setVendaEditando(venda);
    setModoModal('editar');
    setMostrarModal(true);
  };

  const abrirModalNota = (venda: Venda) => {
    setVendaParaNota(venda);
    setFormNota({
      numero: `REC${Date.now().toString().slice(-6)}`,
      tipo: 'recibo',
      status: 'emitido'
    });
    setMostrarModalNota(true);
  };

  const fecharModal = () => {
    setMostrarModal(false);
    setMostrarModalNota(false);
    setVendaEditando(null);
    setVendaParaNota(null);
    resetForm();
  };

  const selecionarCliente = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (cliente) {
      setFormData(prev => ({
        ...prev,
        clienteId,
        nomeCliente: cliente.nome
      }));
    }
  };

  const selecionarProduto = (produtoId: string) => {
    const produto = produtos.find(p => p.id === produtoId);
    if (produto) {
      setFormData(prev => ({
        ...prev,
        produtoId,
        nomeProduto: produto.nome,
        precoProduto: produto.precoVenda
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);

    try {
      if (modoModal === 'criar') {
        await addDoc(collection(db, 'vendas'), formData);
      } else if (vendaEditando?.id) {
        await updateDoc(doc(db, 'vendas', vendaEditando.id), formData);
      }
      await carregarVendas();
      fecharModal();
    } catch (error) {
      console.error('Erro ao salvar venda:', error);
      alert('Erro ao salvar venda. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const handleSubmitNota = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);

    try {
      if (vendaParaNota?.id) {
        await updateDoc(doc(db, 'vendas', vendaParaNota.id), {
          documentoFiscal: formNota
        });
        
        gerarPDF(vendaParaNota, formNota);
        
        await carregarVendas();
        fecharModal();
        alert('Recibo emitido e PDF gerado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao emitir recibo:', error);
      alert('Erro ao emitir recibo. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const baixarPDFExistente = (venda: Venda) => {
    if (venda.documentoFiscal) {
      gerarPDF(venda, venda.documentoFiscal);
    }
  };

  const excluirVenda = async (id: string, descricao: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a venda "${descricao}"?`)) {
      try {
        await deleteDoc(doc(db, 'vendas', id));
        await carregarVendas();
      } catch (error) {
        console.error('Erro ao excluir venda:', error);
        alert('Erro ao excluir venda. Tente novamente.');
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

  // Filtro e paginação
  const vendasFiltradas = vendas.filter(venda =>
    !termoBusca || 
    venda.descricao.toLowerCase().includes(termoBusca.toLowerCase()) ||
    venda.nomeCliente.toLowerCase().includes(termoBusca.toLowerCase()) ||
    venda.nomeProduto.toLowerCase().includes(termoBusca.toLowerCase())
  );

  // Reset página quando termo de busca muda
  useEffect(() => {
    setPaginaAtual(1);
  }, [termoBusca]);

  // Cálculos de paginação
  const totalItens = vendasFiltradas.length;
  const totalPaginas = Math.ceil(totalItens / itensPorPagina);
  const inicioIndice = (paginaAtual - 1) * itensPorPagina;
  const fimIndice = inicioIndice + itensPorPagina;
  const vendasPaginadas = vendasFiltradas.slice(inicioIndice, fimIndice);

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

  const StatusBadge = ({ status }: { status: 'pendente' | 'confirmado' }) => {
    const config = {
      pendente: { cor: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30', icone: Clock, texto: 'Pendente' },
      confirmado: { cor: 'bg-green-500/20 text-green-300 border-green-400/30', icone: CheckCircle, texto: 'Confirmado' }
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
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <Link 
                href="/dashboard"
                className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg sm:rounded-xl transition-all text-sm sm:text-base"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600">
                  <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white">Vendas</h1>
                  <p className="text-xs sm:text-base text-gray-300">Gerencie vendas e recibos</p>
                </div>
              </div>
            </div>
            <button 
              onClick={abrirModalCriar}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg sm:rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all text-sm sm:text-base"
            >
              <Plus className="w-4 h-4" />
              Nova Venda
            </button>
          </div>
        </div>

        {/* Busca */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 p-4 sm:p-6">
          <div className="relative">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar vendas..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400 text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Lista com paginação */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase">Descrição</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase">Cliente</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase hidden md:table-cell">Produto</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase">Total</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase hidden lg:table-cell">Empresa</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase hidden xl:table-cell">Data</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-xs font-medium text-gray-300 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody>
                {vendasPaginadas.map(venda => (
                  <tr key={venda.id} className="hover:bg-white/5 border-b border-white/10">
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="text-xs sm:text-sm font-medium text-white">{venda.descricao}</div>
                      {venda.documentoFiscal && (
                        <div className="text-xs text-green-400">Recibo: {venda.documentoFiscal.numero}</div>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="text-xs sm:text-sm text-white">{venda.nomeCliente}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                      <div className="text-xs sm:text-sm text-white">{venda.nomeProduto}</div>
                      <div className="text-xs text-gray-300">Qtd: {venda.quantidade}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-green-400 font-semibold">
                      {formatarMoeda(venda.total)}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <StatusBadge status={venda.status} />
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-300 capitalize hidden lg:table-cell">
                      {venda.tipoEmpresa}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-300 hidden xl:table-cell">
                      {formatarData(venda.dataVenda)}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                      <div className="flex gap-1 sm:gap-2 justify-end">
                        {!venda.documentoFiscal && venda.status === 'confirmado' && (
                          <button 
                            onClick={() => abrirModalNota(venda)}
                            className="p-1 sm:p-2 text-green-400 hover:bg-green-500/20 rounded-full"
                            title="Emitir Recibo"
                          >
                            <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        )}
                        {venda.documentoFiscal && (
                          <button 
                            onClick={() => baixarPDFExistente(venda)}
                            className="p-1 sm:p-2 text-green-400 hover:bg-green-500/20 rounded-full"
                            title="Baixar PDF"
                          >
                            <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => abrirModalEditar(venda)}
                          className="p-1 sm:p-2 text-blue-400 hover:bg-blue-500/20 rounded-full"
                        >
                          <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <button 
                          onClick={() => excluirVenda(venda.id!, venda.descricao)}
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
                  Mostrando {inicioIndice + 1} a {Math.min(fimIndice, totalItens)} de {totalItens} vendas
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
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
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
            ){'}'}
        </div>
        )}
        
        
        {/* Empty State */}
        {vendasFiltradas.length === 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 p-8 sm:p-12 text-center">
            <ShoppingCart className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-white mb-2">Nenhuma venda encontrada</h3>
            <p className="text-sm text-gray-300 mb-6">Comece registrando sua primeira venda</p>
            <button 
              onClick={abrirModalCriar}
              className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg sm:rounded-xl mx-auto text-sm sm:text-base"
            >
              <Plus className="w-4 h-4" />
              Nova Venda
            </button>
          </div>
        )}
      </div>

      {/* Modal Nova/Editar Venda */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={fecharModal} />
          
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {modoModal === 'criar' ? 'Nova Venda' : 'Editar Venda'}
              </h2>
              <button onClick={fecharModal} className="p-1 sm:p-2 hover:bg-white/10 rounded-full">
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <form onSubmit={handleSubmit} id="form-venda" className="space-y-6">
                {/* Informações Básicas */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Informações Básicas</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Descrição *</label>
                      <input
                        type="text"
                        required
                        value={formData.descricao}
                        onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                        placeholder="Ex: Venda à vista, Parcelamento 3x, Observações..."
                        className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                      />
                    </div>

                    {/* Tipo de Empresa - Radio Buttons */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-3">Tipo de Empresa *</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="tipoEmpresa"
                            value="galpao"
                            checked={formData.tipoEmpresa === 'galpao'}
                            onChange={(e) => setFormData({...formData, tipoEmpresa: e.target.value as 'galpao' | 'distribuidora'})}
                            className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 focus:ring-blue-500 focus:ring-2"
                          />
                          <span className="text-sm text-white">Galpão</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="tipoEmpresa"
                            value="distribuidora"
                            checked={formData.tipoEmpresa === 'distribuidora'}
                            onChange={(e) => setFormData({...formData, tipoEmpresa: e.target.value as 'galpao' | 'distribuidora'})}
                            className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 focus:ring-blue-500 focus:ring-2"
                          />
                          <span className="text-sm text-white">Distribuidora</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cliente e Produto */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Cliente e Produto</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Select Cliente */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <Users className="w-4 h-4 inline mr-2" />
                        Cliente *
                      </label>
                      <select
                        required
                        value={formData.clienteId}
                        onChange={(e) => selecionarCliente(e.target.value)}
                        className="w-full p-3 bg-gray-800/50 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 text-white"
                        style={{ backgroundColor: 'rgba(55, 65, 81, 0.5)' }}
                      >
                        <option value="" style={{ backgroundColor: 'rgb(55, 65, 81)' }}>Selecione um cliente</option>
                        {clientes.map(cliente => (
                          <option 
                            key={cliente.id} 
                            value={cliente.id}
                            style={{ backgroundColor: 'rgb(55, 65, 81)', color: 'white' }}
                          >
                            {cliente.nome} - {cliente.documento}
                          </option>
                        ))}
                      </select>
                      {clientes.length === 0 && (
                        <p className="text-xs text-yellow-400 mt-1">Nenhum cliente cadastrado</p>
                      )}
                    </div>

                    {/* Select Produto */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <Package className="w-4 h-4 inline mr-2" />
                        Produto *
                      </label>
                      <select
                        required
                        value={formData.produtoId}
                        onChange={(e) => selecionarProduto(e.target.value)}
                        className="w-full p-3 bg-gray-800/50 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 text-white"
                        style={{ backgroundColor: 'rgba(55, 65, 81, 0.5)' }}
                      >
                        <option value="" style={{ backgroundColor: 'rgb(55, 65, 81)' }}>Selecione um produto</option>
                        {produtos.map(produto => (
                          <option 
                            key={produto.id} 
                            value={produto.id}
                            style={{ backgroundColor: 'rgb(55, 65, 81)', color: 'white' }}
                          >
                            {produto.nome} - {formatarMoeda(produto.precoVenda)}
                          </option>
                        ))}
                      </select>
                      {produtos.length === 0 && (
                        <p className="text-xs text-yellow-400 mt-1">Nenhum produto cadastrado</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Valores */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Valores</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Quantidade *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={formData.quantidade}
                        onChange={(e) => setFormData({...formData, quantidade: parseInt(e.target.value) || 1})}
                        className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Preço Unitário</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.precoProduto}
                        onChange={(e) => setFormData({...formData, precoProduto: parseFloat(e.target.value) || 0})}
                        className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Total</label>
                      <input
                        type="text"
                        value={formatarMoeda(formData.total)}
                        readOnly
                        className="w-full p-3 bg-green-500/20 border border-green-400/30 rounded-xl text-green-300 font-semibold cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* Status e Pagamento */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Status e Pagamento</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value as 'pendente' | 'confirmado'})}
                        className="w-full p-3 bg-gray-800/50 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 text-white"
                        style={{ backgroundColor: 'rgba(55, 65, 81, 0.5)' }}
                      >
                        <option value="pendente" style={{ backgroundColor: 'rgb(55, 65, 81)' }}>Pendente</option>
                        <option value="confirmado" style={{ backgroundColor: 'rgb(55, 65, 81)' }}>Confirmado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Forma de Pagamento</label>
                      <select
                        value={formData.formaPagamento}
                        onChange={(e) => setFormData({...formData, formaPagamento: e.target.value as 'dinheiro' | 'cartao' | 'pix'})}
                        className="w-full p-3 bg-gray-800/50 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 text-white"
                        style={{ backgroundColor: 'rgba(55, 65, 81, 0.5)' }}
                      >
                        <option value="dinheiro" style={{ backgroundColor: 'rgb(55, 65, 81)' }}>Dinheiro</option>
                        <option value="cartao" style={{ backgroundColor: 'rgb(55, 65, 81)' }}>Cartão</option>
                        <option value="pix" style={{ backgroundColor: 'rgb(55, 65, 81)' }}>PIX</option>
                      </select>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="flex gap-4 p-4 sm:p-6 border-t border-white/10">
              <button
                type="button"
                onClick={fecharModal}
                className="flex-1 px-6 py-3 text-gray-300 border border-white/20 rounded-xl hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="form-venda"
                disabled={salvando}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50"
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

      {/* Modal Emitir Recibo */}
      {mostrarModalNota && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={fecharModal} />
          
          <div className="relative w-full max-w-md bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">Emitir Recibo</h2>
              <button onClick={fecharModal} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-5 h-5 text-gray-300" />
              </button>
            </div>

            <div className="p-4 sm:p-6">
              <div className="mb-4 p-3 bg-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-300">
                  Descrição: <strong>{vendaParaNota?.descricao}</strong><br/>
                  Cliente: <strong>{vendaParaNota?.nomeCliente}</strong><br/>
                  Produto: <strong>{vendaParaNota?.nomeProduto}</strong><br/>
                  Total: <strong>{vendaParaNota && formatarMoeda(vendaParaNota.total)}</strong>
                </p>
              </div>

              <form onSubmit={handleSubmitNota} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Número do Recibo</label>
                  <input
                    type="text"
                    value={formNota.numero}
                    onChange={(e) => setFormNota({...formNota, numero: e.target.value})}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 text-white"
                    readOnly
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={fecharModal}
                    className="flex-1 px-6 py-3 text-gray-300 border border-white/20 rounded-xl hover:bg-white/10"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvando}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 disabled:opacity-50"
                  >
                    {salvando ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Emitindo...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" />
                        Emitir PDF
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
    </div>
  </div>
  )
}
