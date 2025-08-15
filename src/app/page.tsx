'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Leaf, Zap, Shield, ArrowRight } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    setIsLoading(true);
    // Simula um pequeno delay para melhor UX
    setTimeout(() => {
      router.push('/login');
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-green-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        {/* Gradient Overlays */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-green-500/10 via-transparent to-green-600/20"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-green-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-20 left-20 w-64 h-64 bg-white/5 rounded-full blur-2xl"></div>
        
        {/* Animated Particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
        <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-white rounded-full animate-pulse"></div>
        <div className="absolute top-1/2 right-1/3 w-1.5 h-1.5 bg-green-300 rounded-full animate-ping delay-1000"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-6">
        <div className="text-center max-w-4xl mx-auto">
          
          {/* Logo/Icon */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-green-500/25">
                <Leaf className="w-12 h-12 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                <Zap className="w-3 h-3 text-green-600" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-white via-green-100 to-green-300 bg-clip-text text-transparent">
            Eco Carvão
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-300 mb-4 font-light">
            Sistema de Gestão Sustentável
          </p>
          
          <p className="text-gray-400 mb-12 text-lg max-w-2xl mx-auto leading-relaxed">
            Gerencie seu negócio de forma inteligente e ecológica com nossa plataforma completa de gestão
          </p>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-3xl mx-auto">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <Shield className="w-8 h-8 text-green-400 mb-3 mx-auto" />
              <h3 className="text-white font-semibold mb-2">Seguro</h3>
              <p className="text-gray-400 text-sm">Dados protegidos e criptografados</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <Zap className="w-8 h-8 text-green-400 mb-3 mx-auto" />
              <h3 className="text-white font-semibold mb-2">Rápido</h3>
              <p className="text-gray-400 text-sm">Interface moderna e responsiva</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <Leaf className="w-8 h-8 text-green-400 mb-3 mx-auto" />
              <h3 className="text-white font-semibold mb-2">Sustentável</h3>
              <p className="text-gray-400 text-sm">Gestão consciente e ecológica</p>
            </div>
          </div>

          {/* CTA Button */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="group relative bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-green-500/25 disabled:opacity-70 disabled:cursor-not-allowed min-w-48"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Carregando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Entrar no Sistema
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </button>
          </div>

          {/* Bottom Text */}
          <div className="mt-16 text-gray-500 text-sm">
            <p>© 2024 Eco Carvão. Gestão inteligente para um futuro sustentável.</p>
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-10 right-10 opacity-20">
        <div className="w-32 h-32 border border-green-400/30 rounded-full animate-spin" style={{ animationDuration: '20s' }}></div>
      </div>
      <div className="absolute bottom-10 left-10 opacity-20">
        <div className="w-24 h-24 border border-white/20 rounded-full animate-pulse"></div>
      </div>
    </div>
  );
}