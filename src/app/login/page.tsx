'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn, Leaf } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    if (!email.includes('@')) {
      setError('Por favor, insira um email válido');
      return;
    }

    if (password.length < 3) {
      setError('A senha deve ter pelo menos 3 caracteres');
      return;
    }

    setLoading(true);
    setError('');

    // Credenciais específicas
    const validEmail = 'campolimpoecocarvao@gmail.com';
    const validPassword = 'ecocarvao2025';

    setTimeout(() => {
      if (email === validEmail && password === validPassword) {
        console.log('Login realizado:', { email });
        router.push('/dashboard');
      } else {
        setLoading(false);
        setError('Serviço Indisponivel');
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-green-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-green-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-20 left-20 w-64 h-64 bg-white/5 rounded-full blur-2xl"></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-green-600 shadow-xl shadow-green-500/25">
            <Leaf className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-white">
            Eco Carvão
          </h2>
          <p className="mt-2 text-gray-300">
            Faça login para acessar o sistema
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Senha
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-3 pr-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300 transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300 transition-colors" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
              <div className="text-sm text-red-300">
                {error}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Entrando...
                </div>
              ) : (
                <div className="flex items-center">
                  <LogIn className="h-5 w-5 mr-2" />
                  Entrar
                </div>
              )}
            </button>
          </div>
        </form>

        {/* Info */}
        <div className="mt-6 p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
          <p className="text-xs text-gray-400 text-center">
            💡 <strong>Para testar:</strong> Use qualquer email válido e senha com 3+ caracteres
          </p>
        </div>
      </div>
    </div>
  );
}