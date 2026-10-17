import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';

interface LoginPageProps {
  onLogin: (email: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('admin@cgpit.ac.in');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);

    // Try backend auth first, fallback to demo login
    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          localStorage.setItem('tg_token', data.token);
        }
        localStorage.setItem('tg_user', JSON.stringify({ email, name: data.name || 'Admin' }));
        onLogin(email);
        return;
      }
    } catch {
      // Backend not available, use demo mode
    }

    // Demo login — accept any credentials
    await new Promise(r => setTimeout(r, 800));
    localStorage.setItem('tg_user', JSON.stringify({ email, name: 'Administrator' }));
    setIsLoading(false);
    onLogin(email);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tg-bg-root)' }}>
      <div className="w-full max-w-md mx-4">
        {/* Brand */}
        <div className="text-center mb-8 flex flex-col items-center">
          <BrandLogo size="lg" className="justify-center mb-3" />
          <p className="text-xs text-slate-500 font-medium">
            Sign in to access your institutional scheduling workspace
          </p>
        </div>


        {/* Login Card */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--tg-text-primary)' }}>Sign in</h2>
          <p className="text-xs mb-5" style={{ color: 'var(--tg-text-muted)' }}>
            Enter your credentials to access the platform
          </p>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg text-xs font-medium" style={{
              background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: 'var(--tg-text-muted)' }}>
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--tg-text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@institution.edu"
                  className="input-field pl-10"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: 'var(--tg-text-muted)' }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--tg-text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="input-field pl-10 pr-10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ color: 'var(--tg-text-muted)' }}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-3.5 h-3.5 rounded accent-blue-600" />
                <span className="text-xs" style={{ color: 'var(--tg-text-secondary)' }}>Remember me</span>
              </label>
              <a href="#" className="text-xs font-medium" style={{ color: 'var(--tg-brand)' }}>
                Forgot password?
              </a>
            </div>

            <button type="submit" disabled={isLoading}
              className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2">
              {isLoading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-5">
          <p className="text-[10px]" style={{ color: 'var(--tg-text-muted)' }}>
            Demo mode: any email/password combination works
          </p>
        </div>
      </div>
    </div>
  );
}
