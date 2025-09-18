'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Tipos para as empresas
export type TipoEmpresa = 'galpao' | 'distribuidora';

export interface EmpresaInfo {
  id: TipoEmpresa;
  nome: string;
  prefixo: string;
  cor: string;
  icone: string;
}

// Configuração das empresas
export const empresasConfig: Record<TipoEmpresa, EmpresaInfo> = {
  galpao: {
    id: 'galpao',
    nome: 'Galpão de Produção',
    prefixo: 'galpao',
    cor: 'from-blue-500 to-blue-600',
    icone: '🏭'
  },
  distribuidora: {
    id: 'distribuidora',
    nome: 'Distribuidora',
    prefixo: 'dist',
    cor: 'from-purple-500 to-purple-600',
    icone: '🚚'
  }
};

// Interface do Context
interface EmpresaContextType {
  empresaAtiva: TipoEmpresa;
  empresaInfo: EmpresaInfo;
  alternarEmpresa: (empresa: TipoEmpresa) => void;
  todasEmpresas: EmpresaInfo[];
}

// Criando o Context
const EmpresaContext = createContext<EmpresaContextType | undefined>(undefined);

// Props do Provider
interface EmpresaProviderProps {
  children: ReactNode;
}

// Provider Component
export function EmpresaProvider({ children }: EmpresaProviderProps) {
  const [empresaAtiva, setEmpresaAtiva] = useState<TipoEmpresa>('galpao');

  // Carregar empresa salva no localStorage ao inicializar
  useEffect(() => {
    const empresaSalva = localStorage.getItem('empresa_ativa') as TipoEmpresa;
    if (empresaSalva && empresasConfig[empresaSalva]) {
      setEmpresaAtiva(empresaSalva);
    }
  }, []);

  // Salvar no localStorage quando mudar
  useEffect(() => {
    localStorage.setItem('empresa_ativa', empresaAtiva);
  }, [empresaAtiva]);

  const alternarEmpresa = (empresa: TipoEmpresa) => {
    setEmpresaAtiva(empresa);
  };

  const empresaInfo = empresasConfig[empresaAtiva];
  const todasEmpresas = Object.values(empresasConfig);

  const value: EmpresaContextType = {
    empresaAtiva,
    empresaInfo,
    alternarEmpresa,
    todasEmpresas
  };

  return (
    <EmpresaContext.Provider value={value}>
      {children}
    </EmpresaContext.Provider>
  );
}

// Hook personalizado para usar o context
export function useEmpresaContext() {
  const context = useContext(EmpresaContext);
  
  if (context === undefined) {
    throw new Error('useEmpresaContext deve ser usado dentro de um EmpresaProvider');
  }
  
  return context;
}