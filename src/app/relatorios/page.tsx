'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft,
  Search,
  Filter,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Eye,
  X,
  FileText,
  Download,//eslint-disable-next-line
  Building2
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Interfaces
interface RegistroFiltrado {
  id: string;
  tipo: 'venda' | 'produto' | 'cliente' | 'funcionario' | 'movimentacao';
  titulo: string;
  subtitulo: string;
  valor?: number;
  status?: string;
  empresa?: 'galpao' | 'distribuidora';
  data: Date;
  link: string;
}

interface FiltrosAtivos {
  busca: string;
  tipo: string;
  empresa: string;
  dataInicio: string;
  dataFim: string;
  status: string;
}

const TIPOS_OPCOES = [
  { value: '', label: 'Todos os tipos' },
  { value: 'venda', label: 'Vendas' },
  { value: 'produto', label: 'Produtos' },
  { value: 'cliente', label: 'Clientes' },
  { value: 'funcionario', label: 'Funcionários' },
  { value: 'movimentacao', label: 'Financeiro' }
];

const EMPRESAS_OPCOES = [
  { value: '', label: 'Todas as empresas' },
  { value: 'galpao', label: 'Galpão' },
  { value: 'distribuidora', label: 'Distribuidora' }
];

export default function RelatoriosBuscaAvancada() {
  const [registros, setRegistros] = useState<RegistroFiltrado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosAtivos>({
    busca: '',
    tipo: '',
    empresa: '',
    dataInicio: '',
    dataFim: '',
    status: ''
  });
  
  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [registrosPorPagina] = useState(20);
  const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina);

  // Função auxiliar para buscar todos os registros (reutilizável)
  const buscarTodosRegistros = async (filtrosParaBusca: FiltrosAtivos) => {
    const todosRegistros: RegistroFiltrado[] = [];

    // 1. VENDAS
    if (!filtrosParaBusca.tipo || filtrosParaBusca.tipo === 'venda') {
      try {
        let vendasQuery = query(collection(db, 'vendas'));
        
        if (filtrosParaBusca.empresa) {
          vendasQuery = query(vendasQuery, where('empresa', '==', filtrosParaBusca.empresa));
        }
        if (filtrosParaBusca.dataInicio) {
          const dataInicio = Timestamp.fromDate(new Date(filtrosParaBusca.dataInicio + 'T00:00:00'));
          vendasQuery = query(vendasQuery, where('dataVenda', '>=', dataInicio));
        }
        if (filtrosParaBusca.dataFim) {
          const dataFim = Timestamp.fromDate(new Date(filtrosParaBusca.dataFim + 'T23:59:59'));
          vendasQuery = query(vendasQuery, where('dataVenda', '<=', dataFim));
        }
        if (filtrosParaBusca.status) {
          vendasQuery = query(vendasQuery, where('status', '==', filtrosParaBusca.status));
        }
        
        vendasQuery = query(vendasQuery, orderBy('dataVenda', 'desc'));
        
        const vendasSnapshot = await getDocs(vendasQuery);
        
        vendasSnapshot.forEach((doc) => {
          const data = doc.data();
          const dataVenda = data.dataVenda?.toDate() || new Date();
          
          if (filtrosParaBusca.busca) {
            const termoBusca = filtrosParaBusca.busca.toLowerCase();
            const titulo = `Venda ${data.numeroVenda || doc.id.slice(0, 8)}`.toLowerCase();
            const subtitulo = `Cliente: ${data.nomeCliente || 'N/A'}`.toLowerCase();
            
            if (!titulo.includes(termoBusca) && !subtitulo.includes(termoBusca)) {
              return;
            }
          }
          
          todosRegistros.push({
            id: doc.id,
            tipo: 'venda',
            titulo: `Venda ${data.numeroVenda || doc.id.slice(0, 8)}`,
            subtitulo: `Cliente: ${data.nomeCliente || 'N/A'}`,
            valor: data.total || 0,
            status: data.status || 'pendente',
            empresa: data.empresa || 'galpao',
            data: dataVenda,
            link: `/vendas?search=${data.numeroVenda || doc.id}`
          });
        });
      } catch (error) {
        console.error('Erro ao carregar vendas:', error);
      }
    }

    // 2. PRODUTOS
    if (!filtrosParaBusca.tipo || filtrosParaBusca.tipo === 'produto') {
      try {
        let produtosQuery = query(collection(db, 'produtos'));
        
        if (filtrosParaBusca.empresa) {
          produtosQuery = query(produtosQuery, where('empresa', '==', filtrosParaBusca.empresa));
        }
        if (filtrosParaBusca.dataInicio) {
          const dataInicio = Timestamp.fromDate(new Date(filtrosParaBusca.dataInicio + 'T00:00:00'));
          produtosQuery = query(produtosQuery, where('createdAt', '>=', dataInicio));
        }
        if (filtrosParaBusca.dataFim) {
          const dataFim = Timestamp.fromDate(new Date(filtrosParaBusca.dataFim + 'T23:59:59'));
          produtosQuery = query(produtosQuery, where('createdAt', '<=', dataFim));
        }
        
        produtosQuery = query(produtosQuery, orderBy('createdAt', 'desc'));
        
        const produtosSnapshot = await getDocs(produtosQuery);
        
        produtosSnapshot.forEach((doc) => {
          const data = doc.data();
          const dataCriacao = data.createdAt?.toDate() || new Date();
          const statusProduto = data.ativo ? 'ativo' : 'inativo';
          
          if (filtrosParaBusca.status && statusProduto !== filtrosParaBusca.status) {
            return;
          }
          
          if (filtrosParaBusca.busca) {
            const termoBusca = filtrosParaBusca.busca.toLowerCase();
            const titulo = (data.nome || 'Produto sem nome').toLowerCase();
            const subtitulo = `Estoque: ${data.estoque || 0} | Categoria: ${data.categoria || 'N/A'}`.toLowerCase();
            
            if (!titulo.includes(termoBusca) && !subtitulo.includes(termoBusca)) {
              return;
            }
          }
          
          todosRegistros.push({
            id: doc.id,
            tipo: 'produto',
            titulo: data.nome || 'Produto sem nome',
            subtitulo: `Estoque: ${data.estoque || 0} | Categoria: ${data.categoria || 'N/A'}`,
            valor: data.precoVenda || 0,
            status: statusProduto,
            empresa: data.empresa || 'galpao',
            data: dataCriacao,
            link: `/produtos?search=${data.nome || ''}`
          });
        });
      } catch (error) {
        console.error('Erro ao carregar produtos:', error);
      }
    }

    // 3. CLIENTES
    if (!filtrosParaBusca.tipo || filtrosParaBusca.tipo === 'cliente') {
      try {
        let clientesQuery = query(collection(db, 'clientes'));
        
        if (filtrosParaBusca.empresa) {
          clientesQuery = query(clientesQuery, where('empresa', '==', filtrosParaBusca.empresa));
        }
        if (filtrosParaBusca.dataInicio) {
          const dataInicio = Timestamp.fromDate(new Date(filtrosParaBusca.dataInicio + 'T00:00:00'));
          clientesQuery = query(clientesQuery, where('createdAt', '>=', dataInicio));
        }
        if (filtrosParaBusca.dataFim) {
          const dataFim = Timestamp.fromDate(new Date(filtrosParaBusca.dataFim + 'T23:59:59'));
          clientesQuery = query(clientesQuery, where('createdAt', '<=', dataFim));
        }
        if (filtrosParaBusca.status) {
          clientesQuery = query(clientesQuery, where('status', '==', filtrosParaBusca.status));
        }
        
        clientesQuery = query(clientesQuery, orderBy('createdAt', 'desc'));
        
        const clientesSnapshot = await getDocs(clientesQuery);
        
        clientesSnapshot.forEach((doc) => {
          const data = doc.data();
          const dataCriacao = data.createdAt?.toDate() || new Date();
          
          if (filtrosParaBusca.busca) {
            const termoBusca = filtrosParaBusca.busca.toLowerCase();
            const titulo = (data.nome || 'Cliente sem nome').toLowerCase();
            const subtitulo = `${data.tipo === 'juridica' ? 'CNPJ' : 'CPF'}: ${data.documento || 'N/A'}`.toLowerCase();
            
            if (!titulo.includes(termoBusca) && !subtitulo.includes(termoBusca)) {
              return;
            }
          }
          
          todosRegistros.push({
            id: doc.id,
            tipo: 'cliente',
            titulo: data.nome || 'Cliente sem nome',
            subtitulo: `${data.tipo === 'juridica' ? 'CNPJ' : 'CPF'}: ${data.documento || 'N/A'}`,
            valor: data.totalComprado || 0,
            status: data.status || 'ativo',
            empresa: data.empresa || 'galpao',
            data: dataCriacao,
            link: `/clientes?search=${data.nome || ''}`
          });
        });
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
      }
    }

    // 4. FUNCIONÁRIOS
    if (!filtrosParaBusca.tipo || filtrosParaBusca.tipo === 'funcionario') {
      try {
        let funcionariosQuery = query(collection(db, 'funcionarios'));
        
        if (filtrosParaBusca.empresa) {
          funcionariosQuery = query(funcionariosQuery, where('empresa', '==', filtrosParaBusca.empresa));
        }
        
        const funcionariosSnapshot = await getDocs(funcionariosQuery);
        
        funcionariosSnapshot.forEach((doc) => {
          const data = doc.data();
          const dataAdmissao = data.dataAdmissao ? new Date(data.dataAdmissao) : new Date();
          
          if (filtrosParaBusca.dataInicio && dataAdmissao < new Date(filtrosParaBusca.dataInicio + 'T00:00:00')) {
            return;
          }
          if (filtrosParaBusca.dataFim && dataAdmissao > new Date(filtrosParaBusca.dataFim + 'T23:59:59')) {
            return;
          }
          
          if (filtrosParaBusca.status && data.status !== filtrosParaBusca.status) {
            return;
          }
          
          if (filtrosParaBusca.busca) {
            const termoBusca = filtrosParaBusca.busca.toLowerCase();
            const titulo = (data.nome || 'Funcionário sem nome').toLowerCase();
            const subtitulo = `Admissão: ${dataAdmissao.toLocaleDateString('pt-BR')}`.toLowerCase();
            
            if (!titulo.includes(termoBusca) && !subtitulo.includes(termoBusca)) {
              return;
            }
          }
          
          todosRegistros.push({
            id: doc.id,
            tipo: 'funcionario',
            titulo: data.nome || 'Funcionário sem nome',
            subtitulo: `Admissão: ${dataAdmissao.toLocaleDateString('pt-BR')}`,
            valor: data.salario || 0,
            status: data.status || 'ativo',
            empresa: data.empresa || 'galpao',
            data: dataAdmissao,
            link: `/pessoal?search=${data.nome || ''}`
          });
        });
      } catch (error) {
        console.error('Erro ao carregar funcionários:', error);
      }
    }

    // 5. MOVIMENTAÇÕES
    if (!filtrosParaBusca.tipo || filtrosParaBusca.tipo === 'movimentacao') {
      try {
        let movimentacoesQuery = query(collection(db, 'movimentacoes'));
        
        if (filtrosParaBusca.empresa) {
          movimentacoesQuery = query(movimentacoesQuery, where('empresa', '==', filtrosParaBusca.empresa));
        }
        if (filtrosParaBusca.dataInicio) {
          const dataInicio = Timestamp.fromDate(new Date(filtrosParaBusca.dataInicio + 'T00:00:00'));
          movimentacoesQuery = query(movimentacoesQuery, where('dataVencimento', '>=', dataInicio));
        }
        if (filtrosParaBusca.dataFim) {
          const dataFim = Timestamp.fromDate(new Date(filtrosParaBusca.dataFim + 'T23:59:59'));
          movimentacoesQuery = query(movimentacoesQuery, where('dataVencimento', '<=', dataFim));
        }
        if (filtrosParaBusca.status) {
          movimentacoesQuery = query(movimentacoesQuery, where('status', '==', filtrosParaBusca.status));
        }
        
        movimentacoesQuery = query(movimentacoesQuery, orderBy('dataVencimento', 'desc'));
        
        const movimentacoesSnapshot = await getDocs(movimentacoesQuery);
        
        movimentacoesSnapshot.forEach((doc) => {
          const data = doc.data();
          const dataVencimento = data.dataVencimento?.toDate() || new Date();
          
          if (filtrosParaBusca.busca) {
            const termoBusca = filtrosParaBusca.busca.toLowerCase();
            const titulo = `${data.tipo === 'entrada' ? 'Receita' : 'Despesa'}: ${data.categoria || 'N/A'}`.toLowerCase();
            const subtitulo = (data.descricao || 'Sem descrição').toLowerCase();
            
            if (!titulo.includes(termoBusca) && !subtitulo.includes(termoBusca)) {
              return;
            }
          }
          
          todosRegistros.push({
            id: doc.id,
            tipo: 'movimentacao',
            titulo: `${data.tipo === 'entrada' ? 'Receita' : 'Despesa'}: ${data.categoria || 'N/A'}`,
            subtitulo: data.descricao || 'Sem descrição',
            valor: data.valor || 0,
            status: data.status || 'pendente',
            empresa: data.empresa || 'galpao',
            data: dataVencimento,
            link: `/financeiro`
          });
        });
      } catch (error) {
        console.error('Erro ao carregar movimentações:', error);
      }
    }

    // Ordenar por data (mais recentes primeiro)
    todosRegistros.sort((a, b) => b.data.getTime() - a.data.getTime());
    
    return todosRegistros;
  };

  // Função para buscar registros com paginação
  const buscarRegistros = useCallback(async (novaPagina = 1, filtrosParaBusca = filtros) => {
    try {
      setCarregando(true);
      
      const todosRegistros = await buscarTodosRegistros(filtrosParaBusca);
      
      // Aplicar paginação
      const inicio = (novaPagina - 1) * registrosPorPagina;
      const fim = inicio + registrosPorPagina;
      const registrosPaginados = todosRegistros.slice(inicio, fim);
      
      setRegistros(registrosPaginados);
      setTotalRegistros(todosRegistros.length);
      setPaginaAtual(novaPagina);
      
    } catch (error) {
      console.error('Erro ao buscar registros:', error);
    } finally {
      setCarregando(false);
    }
  }, [filtros, registrosPorPagina]);

  // Função para gerar PDF
  const gerarPDF = async () => {
    try {
      setGerandoPDF(true);
      
      // Buscar TODOS os registros com os filtros atuais
      const todosRegistros = await buscarTodosRegistros(filtros);

      if (todosRegistros.length === 0) {
        alert('Nenhum registro encontrado para gerar o PDF');
        return;
      }

      // Criar PDF
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Cabeçalho
      doc.setFontSize(24);
      doc.setTextColor(34, 139, 34); // Verde
      doc.text('Eco-Carvão', 148, 20, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Relatório de Registros', 148, 28, { align: 'center' });
      
      // Informações do relatório
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 38);
      doc.text(`Total de registros: ${todosRegistros.length}`, 14, 43);

      // Filtros aplicados
      let yPos = 48;
      if (filtros.tipo || filtros.empresa || filtros.dataInicio || filtros.dataFim || filtros.status || filtros.busca) {
        doc.text('Filtros aplicados:', 14, yPos);
        yPos += 4;
        
        if (filtros.tipo) {
          const tipoLabel = TIPOS_OPCOES.find(t => t.value === filtros.tipo)?.label;
          doc.text(`• Tipo: ${tipoLabel}`, 14, yPos);
          yPos += 4;
        }
        if (filtros.empresa) {
          const empresaLabel = EMPRESAS_OPCOES.find(e => e.value === filtros.empresa)?.label;
          doc.text(`• Empresa: ${empresaLabel}`, 14, yPos);
          yPos += 4;
        }
        if (filtros.dataInicio) {
          doc.text(`• Data início: ${new Date(filtros.dataInicio).toLocaleDateString('pt-BR')}`, 14, yPos);
          yPos += 4;
        }
        if (filtros.dataFim) {
          doc.text(`• Data fim: ${new Date(filtros.dataFim).toLocaleDateString('pt-BR')}`, 14, yPos);
          yPos += 4;
        }
        if (filtros.status) {
          doc.text(`• Status: ${filtros.status}`, 14, yPos);
          yPos += 4;
        }
        if (filtros.busca) {
          doc.text(`• Busca: ${filtros.busca}`, 14, yPos);
          yPos += 4;
        }
        yPos += 3;
      }

      // Preparar dados da tabela
      const dadosTabela = todosRegistros.map(reg => [
        reg.data.toLocaleDateString('pt-BR'),
        reg.tipo.toUpperCase(),
        `${reg.titulo}\n${reg.subtitulo}`,
        reg.empresa === 'galpao' ? 'Galpão' : 'Distribuidora',
        reg.status?.toUpperCase() || '-',
        reg.valor !== undefined ? `R$ ${reg.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'
      ]);

      // Calcular totais
      const totalGeral = todosRegistros.reduce((acc, reg) => acc + (reg.valor || 0), 0);

      // Adicionar tabela
      autoTable(doc, {
        startY: yPos,
        head: [['Data', 'Tipo', 'Descrição', 'Empresa', 'Status', 'Valor']],
        body: dadosTabela,
        foot: [['', '', '', '', 'TOTAL:', `R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]],
        theme: 'grid',
        headStyles: {
          fillColor: [34, 139, 34],
          textColor: 255,
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center'
        },
        footStyles: {
          fillColor: [240, 240, 240],
          textColor: 0,
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'right'
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: 22, halign: 'center' },
          1: { cellWidth: 22, halign: 'center' },
          2: { cellWidth: 85 },
          3: { cellWidth: 28, halign: 'center' },
          4: { cellWidth: 22, halign: 'center' },
          5: { cellWidth: 28, halign: 'right' }
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(
            `Página ${data.pageNumber} de ${pageCount}`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
          );
        }
      });

      // Salvar PDF
      const dataAtual = new Date().toISOString().split('T')[0];
      doc.save(`relatorio-eco-carvao-${dataAtual}.pdf`);

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setGerandoPDF(false);
    }
  };

  // UseEffect com controle manual dos filtros
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      buscarRegistros(1, filtros);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filtros.busca, filtros.tipo, filtros.empresa, filtros.dataInicio, filtros.dataFim, filtros.status, buscarRegistros, filtros]);

  // Carregar dados iniciais
  useEffect(() => {
    buscarRegistros(1, filtros);
  }, [buscarRegistros, filtros]);

  // Função para limpar filtros
  const limparFiltros = () => {
    setFiltros({
      busca: '',
      tipo: '',
      empresa: '',
      dataInicio: '',
      dataFim: '',
      status: ''
    });
  };

  // Função para formatar moeda
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  // Função para formatar data
  const formatarData = (data: Date) => {
    return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Função para obter cor do status
  const getCorStatus = (status: string) => {
    switch (status) {
      case 'confirmado':
      case 'entregue':
      case 'pago':
      case 'ativo':
        return 'bg-green-500/20 text-green-300 border-green-400/30';
      case 'pendente':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30';
      case 'cancelado':
      case 'vencido':
      case 'inativo':
        return 'bg-red-500/20 text-red-300 border-red-400/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-400/30';
    }
  };

  // Badge da empresa
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

  // Navegação de página
  const irParaPagina = (pagina: number) => {
    if (pagina >= 1 && pagina <= totalPaginas) {
      buscarRegistros(pagina, filtros);
    }
  };

  if (carregando && registros.length === 0) {
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
                <div className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white">Relatórios</h1>
                  <p className="text-sm text-gray-300">Histórico e busca avançada</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={gerarPDF}
                disabled={gerandoPDF || totalRegistros === 0}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Download className={`w-4 h-4 ${gerandoPDF ? 'animate-bounce' : ''}`} />
                <span>{gerandoPDF ? 'Gerando...' : 'Baixar PDF'}</span>
              </button>
              
              <button 
                onClick={() => buscarRegistros(paginaAtual, filtros)}
                disabled={carregando}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Atualizar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-300" />
              <h2 className="text-lg font-medium text-white">Filtros</h2>
            </div>
            
            {(filtros.busca || filtros.tipo || filtros.empresa || filtros.dataInicio || filtros.dataFim || filtros.status) && (
              <button
                onClick={limparFiltros}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition-all"
              >
                <X className="w-3 h-3" />
                Limpar
              </button>
            )}
          </div>
          
          <div className="space-y-4">
            {/* Primeira linha - Busca */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1.5">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Nome, descrição, número..."
                  value={filtros.busca}
                  onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
                  className="w-full pl-9 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                />
              </div>
            </div>

            {/* Segunda linha - Filtros principais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1.5">Tipo</label>
                <select
                  value={filtros.tipo}
                  onChange={(e) => setFiltros(prev => ({ ...prev, tipo: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-800/90 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
                >
                  {TIPOS_OPCOES.map(opcao => (
                    <option key={opcao.value} value={opcao.value}>
                      {opcao.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Empresa */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1.5">Empresa</label>
                <select
                  value={filtros.empresa}
                  onChange={(e) => setFiltros(prev => ({ ...prev, empresa: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-800/90 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
                >
                  {EMPRESAS_OPCOES.map(opcao => (
                    <option key={opcao.value} value={opcao.value}>
                      {opcao.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data Início */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1.5">Data Início</label>
                <input
                  type="date"
                  value={filtros.dataInicio}
                  onChange={(e) => setFiltros(prev => ({ ...prev, dataInicio: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
                />
              </div>

              {/* Data Fim */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1.5">Data Fim</label>
                <input
                  type="date"
                  value={filtros.dataFim}
                  onChange={(e) => setFiltros(prev => ({ ...prev, dataFim: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
                />
              </div>
            </div>

            {/* Terceira linha - Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1.5">Status</label>
                <select
                  value={filtros.status}
                  onChange={(e) => setFiltros(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-800/90 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
                >
                  <option value="">Todos os status</option>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="pendente">Pendente</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="pago">Pago</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
          <div className="p-6 border-b border-white/10 flex justify-between items-center">
            <h3 className="text-lg font-medium text-white">
              Resultados ({totalRegistros} registros)
            </h3>
            <div className="text-sm text-gray-300">
              Página {paginaAtual} de {totalPaginas}
            </div>
          </div>
          
          {carregando ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-3 animate-spin" />
              <p className="text-gray-300">Carregando registros...</p>
            </div>
          ) : registros.length === 0 ? (
            <div className="p-12 text-center">
              <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-white mb-2">Nenhum resultado encontrado</h4>
              <p className="text-gray-300 mb-4">
                Tente ajustar os filtros ou fazer uma nova busca
              </p>
              <button
                onClick={limparFiltros}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Registro</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Empresa</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Tipo</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Valor</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Data</th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-300 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registros.map((registro) => (
                      <tr key={`${registro.tipo}-${registro.id}`} className="hover:bg-white/5 border-b border-white/10">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-white">{registro.titulo}</div>
                          <div className="text-xs text-gray-300">{registro.subtitulo}</div>
                        </td>
                        <td className="px-6 py-4">
                          <EmpresaBadge empresa={registro.empresa} />
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-gray-500/20 text-gray-300 text-xs rounded-full uppercase font-medium border border-gray-400/30">
                            {registro.tipo}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {registro.status && (
                            <span className={`px-2 py-1 text-xs rounded-full border font-medium ${getCorStatus(registro.status)}`}>
                              {registro.status}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {registro.valor !== undefined && (
                            <span className="text-sm font-medium text-green-400">
                              {formatarMoeda(registro.valor)}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">
                          {formatarData(registro.data)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link 
                            href={registro.link}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 text-sm transition-all justify-center"
                          >
                            <Eye className="w-4 h-4" />
                            Ver
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Mobile/Tablet Cards */}
        <div className="lg:hidden space-y-3">
          {carregando ? (
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
              <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-3 animate-spin" />
              <p className="text-gray-300">Carregando registros...</p>
            </div>
          ) : registros.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 sm:p-12 text-center">
              <Search className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
              <h4 className="text-base sm:text-lg font-medium text-white mb-2">Nenhum resultado encontrado</h4>
              <p className="text-sm text-gray-300 mb-6">
                Tente ajustar os filtros ou fazer uma nova busca
              </p>
              <button
                onClick={limparFiltros}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <>
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4 mb-4">
                <div className="flex justify-between items-center text-sm text-gray-300">
                  <span>Resultados: {totalRegistros} registros</span>
                  <span>Página {paginaAtual} de {totalPaginas}</span>
                </div>
              </div>

              {registros.map((registro) => (
                <div key={`${registro.tipo}-${registro.id}`} className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-white truncate">{registro.titulo}</h3>
                      <p className="text-xs text-gray-300 mt-1">{registro.subtitulo}</p>
                    </div>
                    <Link 
                      href={registro.link}
                      className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 text-xs transition-all ml-2 flex-shrink-0"
                    >
                      <Eye className="w-3 h-3" />
                      Ver
                    </Link>
                  </div>
                  
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex gap-2">
                      <EmpresaBadge empresa={registro.empresa} />
                      <span className="px-2 py-1 bg-gray-500/20 text-gray-300 text-xs rounded-full uppercase font-medium border border-gray-400/30">
                        {registro.tipo}
                      </span>
                    </div>
                    {registro.status && (
                      <span className={`px-2 py-1 text-xs rounded-full border font-medium ${getCorStatus(registro.status)}`}>
                        {registro.status}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <span className="text-gray-400">Data:</span>
                      <span className="text-gray-300 ml-1">{formatarData(registro.data)}</span>
                    </div>
                    {registro.valor !== undefined && (
                      <div>
                        <span className="text-green-400 font-medium">{formatarMoeda(registro.valor)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && !carregando && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-300 order-2 sm:order-1">
                Mostrando {((paginaAtual - 1) * registrosPorPagina) + 1} a {Math.min(paginaAtual * registrosPorPagina, totalRegistros)} de {totalRegistros} registros
              </div>
              
              <div className="flex items-center gap-2 order-1 sm:order-2">
                <button
                  onClick={() => irParaPagina(paginaAtual - 1)}
                  disabled={paginaAtual <= 1}
                  className="flex items-center gap-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 text-white transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </button>
                
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                    let pagina;
                    if (totalPaginas <= 5) {
                      pagina = i + 1;
                    } else if (paginaAtual <= 3) {
                      pagina = i + 1;
                    } else if (paginaAtual >= totalPaginas - 2) {
                      pagina = totalPaginas - 4 + i;
                    } else {
                      pagina = paginaAtual - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pagina}
                        onClick={() => irParaPagina(pagina)}
                        className={`w-8 h-8 rounded-lg transition-all ${
                          pagina === paginaAtual 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white/10 border border-white/20 text-gray-300 hover:bg-white/20'
                        }`}
                      >
                        {pagina}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => irParaPagina(paginaAtual + 1)}
                  disabled={paginaAtual >= totalPaginas}
                  className="flex items-center gap-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 text-white transition-all"
                >
                  <span className="hidden sm:inline">Próximo</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}