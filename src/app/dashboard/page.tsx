'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Users, 
  Package, 
  DollarSign,
  ShoppingCart,
  UserPlus,
  PackagePlus,
  LucideIcon,
  AlertTriangle,
  Leaf,
  Menu,
  X,
  Home,
  LogOut,
  RefreshCw,
  Activity
} from 'lucide-react';

// Interfaces dos dados
interface Cliente {
  id?: string;
  nome: string;
  documento: string;
  tipo: 'fisica' | 'juridica';
  email: string;
  telefone: string;
  cidade: string;
  status: 'ativo' | 'inativo' | 'bloqueado';
  limiteCredito: number;
  totalComprado: number;
  valorPendente: number;
  ultimaCompra?: Date;
}

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
  fornecedorId?: string;
  ativo: boolean;
  totalVendido: number;
  ultimaVenda?: Date;
  clientesQueCompraram: string[];
  dataUltimaEntrada?: Date;
}

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
  clienteId?: string;
  nomeCliente?: string;
  pedidoId?: string;
  observacoes?: string;
}

interface Funcionario {
  id?: string;
  nome: string;
  documento: string;
  email: string;
  telefone: string;
  endereco: string;
  dataAdmissao: string;
  salario: number;
  status: 'ativo' | 'inativo';
}

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

interface DashboardData {
  clientes: {
    total: number;
    ativos: number;
    bloqueados: number;
    valorPendente: number;
  };
  produtos: {
    total: number;
    valorEstoque: number;
    estoquesBaixos: number;
    produtosAtivos: number;
  };
  financeiro: {
    entradas: number;
    saidas: number;
    saldoAtual: number;
    pendentes: number;
    vencidas: number;
  };
  pessoal: {
    funcionarios: number;
    funcionariosAtivos: number;
    folhaSalarial: number;
  };
  vendas: {
    totalVendas: number;
    valorTotalVendas: number;
  };
}

export default function Dashboard() {
  const router = useRouter();
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string>('');
  const [dados, setDados] = useState<DashboardData>({
    clientes: { total: 0, ativos: 0, bloqueados: 0, valorPendente: 0 },
    produtos: { total: 0, valorEstoque: 0, estoquesBaixos: 0, produtosAtivos: 0 },
    financeiro: { entradas: 0, saidas: 0, saldoAtual: 0, pendentes: 0, vencidas: 0 },
    pessoal: { funcionarios: 0, funcionariosAtivos: 0, folhaSalarial: 0 },
    vendas: { totalVendas: 0, valorTotalVendas: 0 }
  });

  // Função para buscar dados do Firebase
  const buscarDadosFirebase = async () => {
    try {
      setCarregando(true);
      
      // Buscar dados em paralelo das 5 coleções (incluindo vendas)
      const [clientesSnapshot, produtosSnapshot, movimentacoesSnapshot, funcionariosSnapshot, vendasSnapshot] = await Promise.all([
        getDocs(collection(db, 'clientes')),
        getDocs(collection(db, 'produtos')),
        getDocs(collection(db, 'movimentacoes')),
        getDocs(collection(db, 'funcionarios')),
        getDocs(collection(db, 'vendas'))
      ]);

      // Processar dados dos CLIENTES
      const clientes: Cliente[] = [];
      clientesSnapshot.forEach((doc) => {
        clientes.push({ id: doc.id, ...doc.data() } as Cliente);
      });

      const totalClientes = clientes.length;
      const clientesAtivos = clientes.filter(c => c.status === 'ativo').length;
      const clientesBloqueados = clientes.filter(c => c.status === 'bloqueado').length;
      const valorPendenteTotal = clientes.reduce((sum, c) => sum + (c.valorPendente || 0), 0);

      // Processar dados dos PRODUTOS
      const produtos: Produto[] = [];
      produtosSnapshot.forEach((doc) => {
        produtos.push({ id: doc.id, ...doc.data() } as Produto);
      });

      const totalProdutos = produtos.length;
      const produtosAtivos = produtos.filter(p => p.ativo).length;
      const valorEstoque = produtos.reduce((sum, p) => sum + (p.precoCompra * p.estoque), 0);
      const estoquesBaixos = produtos.filter(p => p.ativo && p.estoque <= p.estoqueMinimo).length;

      // Processar dados das MOVIMENTAÇÕES
      const movimentacoes: Movimentacao[] = [];
      movimentacoesSnapshot.forEach((doc) => {
        const data = doc.data();
        // Converter timestamps do Firestore para Date se necessário
        if (data.dataVencimento?.toDate) {
          data.dataVencimento = data.dataVencimento.toDate();
        }
        if (data.dataPagamento?.toDate) {
          data.dataPagamento = data.dataPagamento.toDate();
        }
        movimentacoes.push({ id: doc.id, ...data } as Movimentacao);
      });

      // Calcular métricas financeiras do mês atual
      const agora = new Date();
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
      const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);

      const movimentacoesMes = movimentacoes.filter(m => {
        const dataVenc = new Date(m.dataVencimento);
        return dataVenc >= inicioMes && dataVenc <= fimMes;
      });

      const entradasMes = movimentacoesMes
        .filter(m => m.tipo === 'entrada' && m.status === 'pago')
        .reduce((sum, m) => sum + m.valor, 0);

      const saidasMes = movimentacoesMes
        .filter(m => m.tipo === 'saida' && m.status === 'pago')
        .reduce((sum, m) => sum + m.valor, 0);

      const pendentes = movimentacoes
        .filter(m => m.status === 'pendente')
        .reduce((sum, m) => sum + m.valor, 0);

      const hoje = new Date();
      const vencidas = movimentacoes
        .filter(m => m.status === 'pendente' && new Date(m.dataVencimento) < hoje)
        .reduce((sum, m) => sum + m.valor, 0);

      // Processar dados dos FUNCIONÁRIOS
      const funcionarios: Funcionario[] = [];
      funcionariosSnapshot.forEach((doc) => {
        funcionarios.push({ id: doc.id, ...doc.data() } as Funcionario);
      });

      const totalFuncionarios = funcionarios.length;
      const funcionariosAtivos = funcionarios.filter(f => f.status === 'ativo').length;
      const folhaSalarial = funcionarios
        .filter(f => f.status === 'ativo')
        .reduce((sum, f) => sum + f.salario, 0);

      // Processar dados das VENDAS
      const vendas: Venda[] = [];
      vendasSnapshot.forEach((doc) => {
        const data = doc.data();
        // Converter timestamp do Firestore para Date se necessário
        if (data.dataVenda?.toDate) {
          data.dataVenda = data.dataVenda.toDate();
        }
        vendas.push({ id: doc.id, ...data } as Venda);
      });

      const totalVendas = vendas.length;
      const valorTotalVendas = vendas.reduce((sum, v) => sum + (v.total || 0), 0);

      // Montar dados do dashboard
      const dadosCalculados: DashboardData = {
        clientes: {
          total: totalClientes,
          ativos: clientesAtivos,
          bloqueados: clientesBloqueados,
          valorPendente: valorPendenteTotal
        },
        produtos: {
          total: totalProdutos,
          produtosAtivos,
          valorEstoque,
          estoquesBaixos
        },
        financeiro: {
          entradas: entradasMes,
          saidas: saidasMes,
          saldoAtual: entradasMes - saidasMes,
          pendentes,
          vencidas
        },
        pessoal: {
          funcionarios: totalFuncionarios,
          funcionariosAtivos,
          folhaSalarial
        },
        vendas: {
          totalVendas: totalVendas,
          valorTotalVendas: valorTotalVendas
        }
      };

      setDados(dadosCalculados);
      setUltimaAtualizacao(new Date().toLocaleString('pt-BR'));
      
    } catch (error) {
      console.error('Erro ao buscar dados do Firebase:', error);
      alert('Erro ao carregar dados do dashboard. Verifique sua conexão.');
    } finally {
      setCarregando(false);
    }
  };

  // Carrega dados na inicialização
  useEffect(() => {
    buscarDadosFirebase();
  }, []);

  // Função para atualizar dados
  const atualizarDados = () => {
    buscarDadosFirebase();
  };

  // Função de navegação
  const navegarPara = (rota: string) => {
    router.push(rota);
  };

  // Função para formatar moeda
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  // Componente Card de Métrica com Loading
  const CardMetrica = ({ titulo, valor, icone: Icone, corFundo, corIcone, carregando: cardCarregando }: {
    titulo: string;
    valor: string | number;
    icone: LucideIcon;
    corFundo: string;
    corIcone: string;
    carregando: boolean;
  }) => (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-gray-300 text-sm font-medium">{titulo}</p>
          {cardCarregando ? (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-16 h-8 bg-gray-500/20 rounded animate-pulse"></div>
              <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
            </div>
          ) : (
            <p className="text-2xl font-bold mt-2 text-white">
              {valor}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${corFundo} group-hover:scale-110 transition-transform duration-300`}>
          <Icone className={`w-6 h-6 ${corIcone}`} />
        </div>
      </div>
    </div>
  );

  // Componente Botão de Ação
  const BotaoAcao = ({ titulo, icone: Icone, aoClicar, corFundo }: {
    titulo: string;
    icone: LucideIcon;
    aoClicar: () => void;
    corFundo: string;
  }) => (
    <button
      onClick={aoClicar}
      className={`flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-white font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${corFundo}`}
    >
      <Icone className="w-5 h-5" />
      <span className="hidden sm:inline">{titulo}</span>
    </button>
  );

  // Items do menu
  const menuItems = [
    { icone: Home, titulo: 'Dashboard', ativo: true, rota: '/dashboard' },
    { icone: Users, titulo: 'Clientes', rota: '/clientes' },
    { icone: Package, titulo: 'Produtos', rota: '/produtos' },
    { icone: Users, titulo: 'Funcionários', rota: '/pessoal' },
    { icone: DollarSign, titulo: 'Financeiro', rota: '/financeiro' },
    { icone: ShoppingCart, titulo: 'Vendas', rota: '/vendas' },
   ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-green-900 relative">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-green-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-20 left-20 w-64 h-64 bg-white/5 rounded-full blur-2xl"></div>
        <div className="absolute top-1/2 right-1/3 w-32 h-32 bg-green-400/5 rounded-full blur-xl animate-pulse"></div>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-black/50 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/25">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">Eco Carvão</h1>
              <p className="text-gray-400 text-xs">Sistema de Gestão</p>
            </div>
          </div>
          <button 
            onClick={() => setSidebarAberta(false)}
            className="lg:hidden text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4">
          <ul className="space-y-2">
            {menuItems.map((item, index) => (
              <li key={index}>
                <button 
                  onClick={() => item.rota && navegarPara(item.rota)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-300 ${
                    item.ativo 
                      ? 'bg-green-500/20 text-white border border-green-500/30' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icone className="w-5 h-5" />
                  {item.titulo}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <button 
            onClick={() => navegarPara('/')}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-red-500/10 rounded-xl transition-all duration-300"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-64 relative z-10">
        {/* Header */}
        <header className="bg-black/30 backdrop-blur-md border-b border-white/10 p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarAberta(true)}
                className="lg:hidden text-white hover:text-green-400 transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                <p className="text-gray-300 text-sm">Visão geral do seu negócio</p>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <div className="flex items-center gap-3">
                <button 
                  onClick={atualizarDados}
                  disabled={carregando}
                  className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                  title="Atualizar dados"
                >
                  <RefreshCw className={`w-5 h-5 ${carregando ? 'animate-spin' : ''}`} />
                </button>
                <div>
                  <p className="text-gray-400 text-sm">Última atualização</p>
                  <p className="text-white text-sm font-medium">
                    {ultimaAtualizacao || 'Carregando...'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6 space-y-6">
          {/* Métricas Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <CardMetrica
              titulo="Total de Clientes"
              valor={dados.clientes.total}
              icone={Users}
              corFundo="bg-blue-500/20"
              corIcone="text-blue-400"
              carregando={carregando}
            />
            <CardMetrica
              titulo="Produtos Cadastrados"
              valor={dados.produtos.total}
              icone={Package}
              corFundo="bg-green-500/20"
              corIcone="text-green-400"
              carregando={carregando}
            />
            <CardMetrica
              titulo="Total de Vendas"
              valor={dados.vendas.totalVendas}
              icone={ShoppingCart}
              corFundo="bg-purple-500/20"
              corIcone="text-purple-400"
              carregando={carregando}
            />
            <CardMetrica
              titulo="Valor em Vendas"
              valor={formatarMoeda(dados.vendas.valorTotalVendas)}
              icone={DollarSign}
              corFundo="bg-orange-500/20"
              corIcone="text-orange-400"
              carregando={carregando}
            />
            <CardMetrica
              titulo="Estoque Baixo"
              valor={dados.produtos.estoquesBaixos}
              icone={AlertTriangle}
              corFundo="bg-red-500/20"
              corIcone="text-red-400"
              carregando={carregando}
            />
          </div>

          {/* Métricas Expandidas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card Produtos e Estoque */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl">
              <div className="flex items-center gap-2 mb-6">
                <Package className="w-5 h-5 text-green-400" />
                <h2 className="text-lg font-semibold text-white">Gestão de Estoque</h2>
              </div>
              {carregando ? (
                <div className="space-y-4">
                  <div className="h-4 bg-gray-500/20 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-500/20 rounded animate-pulse w-3/4"></div>
                  <div className="h-4 bg-gray-500/20 rounded animate-pulse w-1/2"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-green-500/10 rounded-xl">
                    <span className="text-green-300 font-medium">Valor Total em Estoque</span>
                    <span className="text-green-400 font-bold text-xl">{formatarMoeda(dados.produtos.valorEstoque)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-white/5 rounded-xl">
                      <p className="text-gray-300 text-sm">Produtos Ativos</p>
                      <p className="text-white text-2xl font-bold">{dados.produtos.produtosAtivos}</p>
                    </div>
                    <div className="text-center p-3 bg-red-500/10 rounded-xl">
                      <p className="text-red-300 text-sm">Estoque Baixo</p>
                      <p className="text-red-400 text-2xl font-bold">{dados.produtos.estoquesBaixos}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Card Funcionários */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl">
              <div className="flex items-center gap-2 mb-6">
                <Users className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Gestão de Pessoal</h2>
              </div>
              {carregando ? (
                <div className="space-y-4">
                  <div className="h-4 bg-gray-500/20 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-500/20 rounded animate-pulse w-3/4"></div>
                  <div className="h-4 bg-gray-500/20 rounded animate-pulse w-1/2"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-blue-500/10 rounded-xl">
                    <span className="text-blue-300 font-medium">Folha de Pagamento</span>
                    <span className="text-blue-400 font-bold text-xl">{formatarMoeda(dados.pessoal.folhaSalarial)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-white/5 rounded-xl">
                      <p className="text-gray-300 text-sm">Funcionários Ativos</p>
                      <p className="text-white text-2xl font-bold">{dados.pessoal.funcionariosAtivos}</p>
                    </div>
                    <div className="text-center p-3 bg-blue-500/10 rounded-xl">
                      <p className="text-blue-300 text-sm">Média Salarial</p>
                      <p className="text-blue-400 text-lg font-bold">
                        {dados.pessoal.funcionariosAtivos > 0 ? formatarMoeda(dados.pessoal.folhaSalarial / dados.pessoal.funcionariosAtivos) : 'R$ 0,00'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Resumo Financeiro */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              Resumo Financeiro Mensal
            </h2>
            {carregando ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 bg-white/5 rounded-xl">
                    <div className="h-4 bg-gray-500/20 rounded animate-pulse mb-2"></div>
                    <div className="h-8 bg-gray-500/20 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm font-medium text-green-300">Entradas do Mês</span>
                  </div>
                  <p className="text-xl font-bold text-green-400">{formatarMoeda(dados.financeiro.entradas)}</p>
                </div>
                <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    <span className="text-sm font-medium text-red-300">Saídas do Mês</span>
                  </div>
                  <p className="text-xl font-bold text-red-400">{formatarMoeda(dados.financeiro.saidas)}</p>
                </div>
                <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="text-sm font-medium text-blue-300">Saldo Atual</span>
                  </div>
                  <p className="text-xl font-bold text-blue-400">{formatarMoeda(dados.financeiro.saldoAtual)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Ações Rápidas */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-4">Ações Rápidas</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <BotaoAcao
                titulo="Novo Cliente"
                icone={UserPlus}
                aoClicar={() => navegarPara('/clientes')}
                corFundo="bg-blue-500 hover:bg-blue-600"
              />
              <BotaoAcao
                titulo="Novo Produto"
                icone={PackagePlus}
                aoClicar={() => navegarPara('/produtos')}
                corFundo="bg-green-500 hover:bg-green-600"
              />
              <BotaoAcao
                titulo="Nova Venda"
                icone={ShoppingCart}
                aoClicar={() => navegarPara('/vendas')}
                corFundo="bg-purple-500 hover:bg-purple-600"
              />
              <BotaoAcao
                titulo="Financeiro"
                icone={DollarSign}
                aoClicar={() => navegarPara('/financeiro')}
                corFundo="bg-orange-500 hover:bg-orange-600"
              />
            </div>
          </div>

          {/* Status do Sistema */}
          <div className="text-center text-gray-400 text-sm">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Sistema conectado e funcionando normalmente</span>
              {carregando && <RefreshCw className="w-4 h-4 animate-spin ml-2" />}
            </div>
          </div>
        </main>
      
      {/* Overlay para mobile quando sidebar está aberta */}
      {sidebarAberta && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarAberta(false)}
        ></div>
      )}
    </div>
    </div>
  
  );
}