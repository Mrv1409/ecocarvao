'use client';

import { useState } from 'react';
import { ChevronDown, Building2, Factory } from 'lucide-react';
import { useEmpresa } from '@/hooks/useEmpresa';
import { TipoEmpresa } from '@/contexts/EmpresaContext';

interface SeletorEmpresaProps {
  variant?: 'header' | 'sidebar' | 'inline';
  showLabel?: boolean;
}

export default function SeletorEmpresa({ 
  variant = 'header', 
  showLabel = true 
}: SeletorEmpresaProps) {
  const { 
    empresaAtiva, 
    empresaInfo, 
    alternarEmpresa, 
    todasEmpresas,
    getCoresEmpresa 
  } = useEmpresa();
  
  const [dropdownAberto, setDropdownAberto] = useState(false);

  const handleAlternarEmpresa = (empresa: TipoEmpresa) => {
    alternarEmpresa(empresa);
    setDropdownAberto(false);
  };

  const getIconeEmpresa = (tipo: TipoEmpresa) => {
    const icons = {
      galpao: <Factory className="w-4 h-4 sm:w-5 sm:h-5" />,
      distribuidora: <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
    };
    return icons[tipo];
  };

  // Variantes de estilo
  const variantStyles = {
    header: 'bg-white/10 backdrop-blur-md border-white/20',
    sidebar: 'bg-gray-800 border-gray-700',
    inline: 'bg-white border-gray-200'
  };

  const textColorClass = variant === 'inline' ? 'text-gray-900' : 'text-white';
  const hoverColorClass = variant === 'inline' ? 'hover:bg-gray-50' : 'hover:bg-white/10';

  return (
    <div className="relative">
      {/* Botão Principal */}
      <button
        onClick={() => setDropdownAberto(!dropdownAberto)}
        className={`
          flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 
          ${variantStyles[variant]} border rounded-lg sm:rounded-xl 
          ${hoverColorClass} transition-all group min-w-0
        `}
      >
        {/* Ícone */}
        <div className={`flex-shrink-0 p-1 sm:p-2 rounded-lg bg-gradient-to-r ${getCoresEmpresa()}`}>
          {getIconeEmpresa(empresaAtiva)}
        </div>
        
        {/* Nome da Empresa */}
        <div className="flex-1 text-left min-w-0">
          {showLabel && (
            <div className={`text-xs ${variant === 'inline' ? 'text-gray-500' : 'text-gray-400'} hidden sm:block`}>
              Empresa Ativa
            </div>
          )}
          <div className={`text-sm sm:text-base font-medium ${textColorClass} truncate`}>
            {empresaInfo.nome}
          </div>
        </div>

        {/* Seta */}
        <ChevronDown 
          className={`
            w-4 h-4 flex-shrink-0 transition-transform 
            ${dropdownAberto ? 'rotate-180' : ''} 
            ${variant === 'inline' ? 'text-gray-400' : 'text-gray-300'}
          `} 
        />
      </button>

      {/* Dropdown */}
      {dropdownAberto && (
        <>
          {/* Overlay para fechar */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setDropdownAberto(false)}
          />
          
          {/* Menu Dropdown */}
          <div className={`
            absolute top-full left-0 right-0 mt-2 
            ${variantStyles[variant]} border rounded-lg sm:rounded-xl 
            shadow-xl z-50 overflow-hidden
          `}>
            {todasEmpresas.map((empresa) => (
              <button
                key={empresa.id}
                onClick={() => handleAlternarEmpresa(empresa.id)}
                className={`
                  w-full flex items-center gap-3 px-3 sm:px-4 py-3 sm:py-4
                  ${hoverColorClass} transition-all text-left
                  ${empresa.id === empresaAtiva ? 
                    (variant === 'inline' ? 'bg-blue-50' : 'bg-white/5') : ''
                  }
                `}
              >
                {/* Ícone da Empresa */}
                <div className={`
                  flex-shrink-0 p-2 rounded-lg bg-gradient-to-r ${empresa.cor}
                  ${empresa.id === empresaAtiva ? 'ring-2 ring-white/50' : ''}
                `}>
                  {getIconeEmpresa(empresa.id)}
                </div>

                {/* Informações */}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm sm:text-base font-medium ${textColorClass} truncate`}>
                    {empresa.nome}
                  </div>
                  <div className={`text-xs ${variant === 'inline' ? 'text-gray-500' : 'text-gray-400'}`}>
                    {empresa.id === empresaAtiva ? 'Ativa' : 'Clique para alternar'}
                  </div>
                </div>

                {/* Indicador Ativo */}
                {empresa.id === empresaAtiva && (
                  <div className={`
                    w-2 h-2 rounded-full bg-gradient-to-r ${empresa.cor} flex-shrink-0
                  `} />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}