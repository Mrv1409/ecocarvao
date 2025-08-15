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
  Truck,
  XCircle,
  ArrowLeft,
  FileText,
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
import jsPDF from 'jspdf';

interface Venda {
  id?: string;
  numeroVenda: string;
  nomeCliente: string;
  total: number;
  status: 'pendente' | 'confirmado' | 'entregue' | 'cancelado';
  formaPagamento: 'dinheiro' | 'cartao' | 'pix' | 'transferencia' | 'parcelado';
  dataVenda: Date;
  documentoFiscal?: {
    numero: string;
    tipo: 'nfe' | 'nfce' | 'boleto' | 'recibo';
    status: 'emitido' | 'enviado' | 'pago' | 'cancelado';
  };
}

export default function Vendas() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarModalNota, setMostrarModalNota] = useState(false);
  const [modoModal, setModoModal] = useState<'criar' | 'editar'>('criar');
  const [vendaEditando, setVendaEditando] = useState<Venda | null>(null);
  const [vendaParaNota, setVendaParaNota] = useState<Venda | null>(null);
  const [salvando, setSalvando] = useState(false);
  
  const [formData, setFormData] = useState({
    numeroVenda: '',
    nomeCliente: '',
    total: 0,
    status: 'pendente' as 'pendente' | 'confirmado' | 'entregue' | 'cancelado',
    formaPagamento: 'dinheiro' as 'dinheiro' | 'cartao' | 'pix' | 'transferencia' | 'parcelado',
    dataVenda: new Date()
  });

  const [formNota, setFormNota] = useState({
    numero: '',
    tipo: 'nfe' as 'nfe' | 'nfce' | 'boleto' | 'recibo',
    status: 'emitido' as 'emitido' | 'enviado' | 'pago' | 'cancelado'
  });

  // Função para gerar PDF da nota fiscal
  const gerarPDF = (venda: Venda, dadosNota: typeof formNota) => {
    const pdf = new jsPDF();
    
    // Configuração da fonte
    pdf.setFont('helvetica');
    
    // Header da empresa
    pdf.setFillColor(34, 197, 94); // Verde
    pdf.rect(0, 0, 210, 25, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.text('ECO CARVÃO', 20, 15);
    
    pdf.setFontSize(10);
    pdf.text('Sistema de Gestão Empresarial', 20, 20);
    
    // Título do documento
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(16);
    const tipoDoc = {
      nfe: 'NOTA FISCAL ELETRÔNICA',
      nfce: 'NOTA FISCAL DE CONSUMIDOR ELETRÔNICA',
      boleto: 'BOLETO BANCÁRIO',
      recibo: 'RECIBO DE PAGAMENTO'
    };
    pdf.text(tipoDoc[dadosNota.tipo], 20, 40);
    
    // Linha separadora
    pdf.setLineWidth(0.5);
    pdf.line(20, 45, 190, 45);
    
    // Informações da nota
    pdf.setFontSize(12);
    pdf.text('INFORMAÇÕES DO DOCUMENTO', 20, 55);
    
    pdf.setFontSize(10);
    pdf.text(`Número: ${dadosNota.numero}`, 20, 65);
    pdf.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 20, 72);
    pdf.text(`Status: ${dadosNota.status.toUpperCase()}`, 20, 79);
    
    // Informações da venda
    pdf.setFontSize(12);
    pdf.text('DADOS DA VENDA', 20, 95);
    
    pdf.setFontSize(10);
    pdf.text(`Venda Nº: ${venda.numeroVenda}`, 20, 105);
    pdf.text(`Cliente: ${venda.nomeCliente}`, 20, 112);
    pdf.text(`Data da Venda: ${venda.dataVenda.toLocaleDateString('pt-BR')}`, 20, 119);
    pdf.text(`Forma de Pagamento: ${venda.formaPagamento.toUpperCase()}`, 20, 126);
    pdf.text(`Status da Venda: ${venda.status.toUpperCase()}`, 20, 133);
    
    // Valor total
    pdf.setFontSize(14);
    pdf.setTextColor(34, 197, 94);
    pdf.text(`VALOR TOTAL: ${formatarMoeda(venda.total)}`, 20, 150);
    
    // Footer
    pdf.setTextColor(128, 128, 128);
    pdf.setFontSize(8);
    pdf.text('Este documento foi gerado automaticamente pelo sistema Eco Carvão', 20, 280);
    pdf.text(`Documento gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, 285);
    
    // Salvar o PDF
    pdf.save(`${dadosNota.tipo.toUpperCase()}_${dadosNota.numero}.pdf`);
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
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarVendas();
  }, []);

  const resetForm = () => {
    const novoNumero = `V${Date.now().toString().slice(-6)}`;
    setFormData({
      numeroVenda: novoNumero,
      nomeCliente: '',
      total: 0,
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
      numeroVenda: venda.numeroVenda,
      nomeCliente: venda.nomeCliente,
      total: venda.total,
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
      numero: `NF${Date.now().toString().slice(-6)}`,
      tipo: 'nfe',
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
        // Salvar dados da nota no Firebase
        await updateDoc(doc(db, 'vendas', vendaParaNota.id), {
          documentoFiscal: formNota
        });
        
        // Gerar e baixar o PDF
        gerarPDF(vendaParaNota, formNota);
        
        await carregarVendas();
        fecharModal();
        alert('Nota fiscal emitida e PDF gerado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao emitir nota:', error);
      alert('Erro ao emitir nota. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  // Função para baixar PDF de uma nota já emitida
  const baixarPDFExistente = (venda: Venda) => {
    if (venda.documentoFiscal) {
      gerarPDF(venda, venda.documentoFiscal);
    }
  };

  const excluirVenda = async (id: string, numero: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a venda ${numero}?`)) {
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

  const vendasFiltradas = vendas.filter(venda =>
    !termoBusca || 
    venda.numeroVenda.toLowerCase().includes(termoBusca.toLowerCase()) ||
    venda.nomeCliente.toLowerCase().includes(termoBusca.toLowerCase())
  );

  const StatusBadge = ({ status }: { status: 'pendente' | 'confirmado' | 'entregue' | 'cancelado' }) => {
    const config = {
      pendente: { cor: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30', icone: Clock, texto: 'Pendente' },
      confirmado: { cor: 'bg-blue-500/20 text-blue-300 border-blue-400/30', icone: CheckCircle, texto: 'Confirmado' },
      entregue: { cor: 'bg-green-500/20 text-green-300 border-green-400/30', icone: Truck, texto: 'Entregue' },
      cancelado: { cor: 'bg-red-500/20 text-red-300 border-red-400/30', icone: XCircle, texto: 'Cancelado' }
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
                  <p className="text-xs sm:text-base text-gray-300">Gerencie suas vendas e notas</p>
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
              placeholder="Buscar por número ou cliente..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400 text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase">Venda</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase">Cliente</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase">Total</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase hidden md:table-cell">Pagamento</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase hidden lg:table-cell">Data</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-xs font-medium text-gray-300 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody>
                {vendasFiltradas.map(venda => (
                  <tr key={venda.id} className="hover:bg-white/5 border-b border-white/10">
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="text-xs sm:text-sm font-medium text-white">{venda.numeroVenda}</div>
                      {venda.documentoFiscal && (
                        <div className="text-xs text-green-400">NF: {venda.documentoFiscal.numero}</div>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="text-xs sm:text-sm text-white">{venda.nomeCliente}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-green-400 font-semibold">
                      {formatarMoeda(venda.total)}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <StatusBadge status={venda.status} />
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-300 capitalize hidden md:table-cell">
                      {venda.formaPagamento}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-300 hidden lg:table-cell">
                      {formatarData(venda.dataVenda)}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                      <div className="flex gap-1 sm:gap-2 justify-end">
                        {!venda.documentoFiscal && venda.status === 'confirmado' && (
                          <button 
                            onClick={() => abrirModalNota(venda)}
                            className="p-1 sm:p-2 text-green-400 hover:bg-green-500/20 rounded-full"
                            title="Emitir Nota"
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
                          onClick={() => excluirVenda(venda.id!, venda.numeroVenda)}
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

        {/* Empty State */}
        {vendasFiltradas.length === 0 && (
          <div className="bg-write/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 p-8 sm:p-12 text-center">
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
          
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {modoModal === 'criar' ? 'Nova Venda' : 'Editar Venda'}
              </h2>
              <button onClick={fecharModal} className="p-1 sm:p-2 hover:bg-white/10 rounded-full">
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <form onSubmit={handleSubmit} id="form-venda" className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Número da Venda</label>
                    <input
                      type="text"
                      value={formData.numeroVenda}
                      onChange={(e) => setFormData({...formData, numeroVenda: e.target.value})}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 text-white"
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Cliente *</label>
                    <input
                      type="text"
                      required
                      value={formData.nomeCliente}
                      onChange={(e) => setFormData({...formData, nomeCliente: e.target.value})}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Total *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.total}
                      onChange={(e) => setFormData({...formData, total: parseFloat(e.target.value) || 0})}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                    <select
                      value={formData.status}//eslint-disable-next-line
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 text-white"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="confirmado">Confirmado</option>
                      <option value="entregue">Entregue</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Forma de Pagamento</label>
                    <select
                      value={formData.formaPagamento}//eslint-disable-next-line
                      onChange={(e) => setFormData({...formData, formaPagamento: e.target.value as any})}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 text-white"
                    >
                      <option value="dinheiro">Dinheiro</option>
                      <option value="cartao">Cartão</option>
                      <option value="pix">PIX</option>
                      <option value="transferencia">Transferência</option>
                      <option value="parcelado">Parcelado</option>
                    </select>
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

      {/* Modal Emitir Nota */}
      {mostrarModalNota && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={fecharModal} />
          
          <div className="relative w-full max-w-md bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">Emitir Nota Fiscal</h2>
              <button onClick={fecharModal} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-5 h-5 text-gray-300" />
              </button>
            </div>

            <div className="p-4 sm:p-6">
              <div className="mb-4 p-3 bg-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-300">
                  Venda: <strong>{vendaParaNota?.numeroVenda}</strong><br/>
                  Cliente: <strong>{vendaParaNota?.nomeCliente}</strong><br/>
                  Total: <strong>{vendaParaNota && formatarMoeda(vendaParaNota.total)}</strong>
                </p>
              </div>

              <form onSubmit={handleSubmitNota} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Número da Nota</label>
                  <input
                    type="text"
                    value={formNota.numero}
                    onChange={(e) => setFormNota({...formNota, numero: e.target.value})}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 text-white"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Documento</label>
                  <select
                    value={formNota.tipo}//eslint-disable-next-line
                    onChange={(e) => setFormNota({...formNota, tipo: e.target.value as any})}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 text-white"
                  >
                    <option value="nfe">NFe</option>
                    <option value="nfce">NFCe</option>
                    <option value="boleto">Boleto</option>
                    <option value="recibo">Recibo</option>
                  </select>
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
  );
}