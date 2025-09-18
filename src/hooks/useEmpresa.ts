import { useEmpresaContext, TipoEmpresa, EmpresaInfo } from '@/contexts/EmpresaContext';

/**
 * Hook personalizado que facilita o uso do contexto de empresa
 * e adiciona funcionalidades extras
 */
export function useEmpresa() {
  const context = useEmpresaContext();

  /**
   * Gera o nome da coleção com o prefixo da empresa ativa
   * @param nomeBase - Nome base da coleção (ex: 'funcionarios')
   * @returns Nome completo da coleção (ex: 'galpao_funcionarios')
   */
  const getCollectionName = (nomeBase: string): string => {
    return `${context.empresaInfo.prefixo}_${nomeBase}`;
  };

  /**
   * Gera o nome da coleção para uma empresa específica
   * @param nomeBase - Nome base da coleção
   * @param empresa - Tipo da empresa específica
   * @returns Nome completo da coleção
   */
  const getCollectionNameFor = (nomeBase: string, empresa: TipoEmpresa): string => {
    const empresaInfo = context.todasEmpresas.find(e => e.id === empresa);
    return `${empresaInfo?.prefixo}_${nomeBase}`;
  };

  /**
   * Verifica se uma empresa específica está ativa
   * @param empresa - Tipo da empresa para verificar
   * @returns true se a empresa estiver ativa
   */
  const isEmpresaAtiva = (empresa: TipoEmpresa): boolean => {
    return context.empresaAtiva === empresa;
  };

  /**
   * Retorna as cores CSS da empresa ativa para usar em gradientes
   */
  const getCoresEmpresa = () => {
    return context.empresaInfo.cor;
  };

  /**
   * Retorna informações da empresa oposta à ativa
   */
  const getEmpresaOposta = (): EmpresaInfo => {
    const empresaOposta = context.empresaAtiva === 'galpao' ? 'distribuidora' : 'galpao';
    return context.todasEmpresas.find(e => e.id === empresaOposta)!;
  };

  return {
    // Do context original
    empresaAtiva: context.empresaAtiva,
    empresaInfo: context.empresaInfo,
    alternarEmpresa: context.alternarEmpresa,
    todasEmpresas: context.todasEmpresas,
    
    // Funções extras
    getCollectionName,
    getCollectionNameFor,
    isEmpresaAtiva,
    getCoresEmpresa,
    getEmpresaOposta,
  };
}