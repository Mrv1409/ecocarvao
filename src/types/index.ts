import { Timestamp } from 'firebase/firestore';
import { ReactNode } from 'react';

// 👤 USUÁRIOS E AUTENTICAÇÃO
export interface Usuario {
  id: string;
  email: string;
  nome: string;
  cargo: 'admin' | 'gerente' | 'vendedor' | 'operador';
  ativo: boolean;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

// 🏠 ENDEREÇO (reutilizável)
export interface Endereco {
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}

// 📞 CONTATO (reutilizável)
export interface Contato {
  telefone: string;
  celular?: string;
  email: string;
  whatsapp?: string;
}

// 🏢 CLIENTES
export interface Cliente {
  id: string;
  nome: string;
  documento: string; // CPF/CNPJ
  tipo: 'fisica' | 'juridica';
  contato: Contato;
  endereco: Endereco;
  status: 'ativo' | 'inativo' | 'bloqueado';
  limiteCredito: number;
  totalComprado: number;
  valorPendente: number;
  ultimaCompra: Timestamp;
  observacoes?: string;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

// 👥 PESSOAL/FUNCIONÁRIOS
export interface Funcionario {
  id: string;
  nome: string;
  cpf: string;
  rg: string;
  cargo: string;
  setor: string;
  contato: Contato;
  endereco: Endereco;
  salario: number;
  dataAdmissao: string;
  dataDemissao?: string;
  status: 'ativo' | 'afastado' | 'demitido';
  observacoes?: string;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

// 📦 PRODUTOS
export interface Produto {
  custo(preco: number, custo: number): number;
  fornecedor: ReactNode;
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  unidade: string; // kg, ton, saco, unid, etc.
  precoCompra: number;
  precoVenda: number;
  estoque: number;
  estoqueMinimo: number;
  codigoBarras?: string;
  localizacao?: string; // onde fica no estoque
  ativo: boolean;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

// 📝 ITENS DO PEDIDO
export interface ItemPedido {
  produtoId: string;
  nomeProduto: string;
  quantidade: number;
  precoUnitario: number;
  total: number;
}

// 🛒 PEDIDOS/VENDAS
export interface Pedido {
  id: string;
  numeroVenda: string;
  clienteId: string;
  nomeCliente: string;
  itens: ItemPedido[];
  subtotal: number;
  desconto: number;
  total: number;
  status: 'pendente' | 'confirmado' | 'entregue' | 'cancelado';
  formaPagamento: 'dinheiro' | 'cartao' | 'pix' | 'transferencia' | 'parcelado';
  dataVencimento: Timestamp;
  funcionarioId: string;
  nomeFuncionario: string;
  observacoes?: string;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

// 💰 MOVIMENTAÇÕES FINANCEIRAS
export interface Movimentacao {
  id: string;
  tipo: 'entrada' | 'saida';
  categoria: string;
  descricao: string;
  valor: number;
  status: 'pendente' | 'pago' | 'vencido';
  dataVencimento: Timestamp;
  dataPagamento?: Timestamp;
  formaPagamento?: string;
  clienteId?: string;
  pedidoId?: string;
  funcionarioId?: string;
  criadoEm: Timestamp;
}

// 📊 CATEGORIAS FINANCEIRAS
export interface CategoriaFinanceira {
  id: string;
  nome: string;
  tipo: 'entrada' | 'saida';
  cor?: string;
  ativo: boolean;
  criadoEm: Timestamp;
}

// 📄 DOCUMENTOS FISCAIS
export interface DocumentoFiscal {
  id: string;
  tipo: 'nfe' | 'nfce' | 'boleto' | 'recibo';
  numero: string;
  clienteId: string;
  pedidoId?: string;
  valor: number;
  status: 'emitido' | 'enviado' | 'pago' | 'cancelado';
  dataEmissao: Timestamp;
  dataVencimento?: Timestamp;
  caminhoXml?: string;
  caminhoPdf?: string;
  criadoEm: Timestamp;
}

// 📈 MÉTRICAS DASHBOARD
export interface MetricasDashboard {
  totalClientes: number;
  totalProdutos: number;
  vendasMes: number;
  receitaMes: number;
  produtosBaixoEstoque: number;
  contasVencer: number;
}

// 📊 DADOS GRÁFICO VENDAS
export interface DadosVenda {
  dia: string;
  vendas: number;
  valor?: number;
}

// 🏆 PRODUTOS EM DESTAQUE
export interface ProdutoDestaque {
  nome: string;
  vendas: number;
  valor: number;
}

// 🏭 CONFIGURAÇÕES DA EMPRESA
export interface ConfiguracaoEmpresa {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  endereco: string;
  contato: string;
  logo?: string;
  cores?: {
    primaria: string;
    secundaria: string;
  };
  configuracoesFiscais?: {
    regime: 'simples' | 'presumido' | 'real';
    ie?: string;
    im?: string;
  };
  atualizadoEm: Timestamp;
}

// 🔄 MOVIMENTAÇÃO DE ESTOQUE
export interface MovimentacaoEstoque {
  id: string;
  produtoId: string;
  nomeProduto: string;
  tipo: 'entrada' | 'saida' | 'ajuste';
  quantidade: number;
  motivo: string;
  pedidoId?: string;
  funcionarioId: string;
  nomeFuncionario: string;
  criadoEm: Timestamp;
}

// 🎯 TIPOS AUXILIARES
export type CargoUsuario = Usuario['cargo'];
export type StatusCliente = Cliente['status'];
export type TipoCliente = Cliente['tipo'];
export type StatusPedido = Pedido['status'];
export type StatusFuncionario = Funcionario['status'];
export type TipoMovimentacao = Movimentacao['tipo'];
export type StatusMovimentacao = Movimentacao['status'];
export type FormaPagamento = Pedido['formaPagamento'];
export type TipoDocumento = DocumentoFiscal['tipo'];
export type StatusDocumento = DocumentoFiscal['status'];
export type TipoMovimentacaoEstoque = MovimentacaoEstoque['tipo'];

// 📋 FILTROS E CONSULTAS
export interface FiltroClientes {
  nome?: string;
  tipo?: TipoCliente;
  status?: StatusCliente;
  cidade?: string;
}

export interface FiltroProdutos {
  estoqueBaixo: boolean;
  nome?: string;
  categoria?: string;
  ativo?: boolean;
  baixoEstoque?: boolean;
}

export interface FiltroPedidos {
  clienteId?: string;
  status?: StatusPedido;
  dataInicio?: Timestamp;
  dataFim?: Timestamp;
  funcionarioId?: string;
}

export interface FiltroFinanceiro {
  tipo?: TipoMovimentacao;
  categoria?: string;
  status?: StatusMovimentacao;
  dataInicio?: Timestamp;
  dataFim?: Timestamp;
}

// 📊 RELATÓRIOS
export interface RelatorioVendas {
  periodo: string;
  totalVendas: number;
  valorTotal: number;
  ticketMedio: number;
  produtosMaisVendidos: ProdutoDestaque[];
}

export interface RelatorioFinanceiro {
  periodo: string;
  totalEntradas: number;
  totalSaidas: number;
  saldo: number;
  categorias: Array<{
    nome: string;
    valor: number;
    percentual: number;
  }>;
}