import { ThemeProvider } from '@/components/theme-provider';
import { Layout } from '@/components/layout';
import { Routes as AdminRoutes } from '@/components/routes';
import { RepartidorView } from '@/components/routes/repartidor-view';
import { AlmacenistaView } from '@/components/routes/almacenista-view';
import {
  BrowserRouter,
  Routes as RouterRoutes,
  Route,
  Navigate,
} from 'react-router-dom';
import { useState, useEffect } from 'react';

// Tipo para usuarios del CSV
interface CSVUser {
  id_u: string;
  type_u: string;
  user_u: string;
  pass_u: string;
  suc_u: string;
  name_u: string;
}

type User = { username: string; type: 'admin' | 'repartidor' | 'almacenista'; nombre: string; id_u: string } | null;

function App() {
  const [user, setUser] = useState<User>(null);
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [csvUsers, setCsvUsers] = useState<CSVUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar usuarios desde CSV al inicio
  useEffect(() => {
    fetch('/data/csv dbs/users.csv')
      .then(res => res.text())
      .then(text => {
        // Parsear CSV a objeto
        const lines = text.split('\n').filter(Boolean);
        const headers = lines[0].split(',').map(h => h.trim());
        const data = lines.slice(1).map(line => {
          const values = line.split(',');
          const obj: any = {};
          headers.forEach((h, i) => { obj[h] = values[i]; });
          return obj;
        });
        setCsvUsers(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error cargando usuarios:', error);
        setLoading(false);
      });
  }, []);

  // Restaurar usuario desde localStorage al cargar la app
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = window.localStorage.getItem('user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {}
      }
    }
  }, []);

  function getUserType(type_u: string): 'admin' | 'almacenista' | 'repartidor' {
    switch (type_u) {
      case 'admin': return 'admin';
      case 'almacenista': return 'almacenista';
      case 'repartidor': return 'repartidor';
      default: return 'repartidor';
    }
  }

  function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const { username, password } = form;
    
    // Buscar usuario en CSV por user_u y pass_u
    const foundUser = csvUsers.find(u => 
      u.user_u === username && u.pass_u === password
    );

    if (foundUser) {
      const loggedUser = { 
        username, 
        type: getUserType(foundUser.type_u), 
        nombre: foundUser.name_u,
        id_u: foundUser.id_u
      };
      setUser(loggedUser);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('user', JSON.stringify(loggedUser));
      }
      setError('');
    } else {
      setError('Usuario o contraseña incorrectos');
    }
  }

  function handleLogout() {
    setUser(null);
    setForm({ username: '', password: '' });
    setError('');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('user');
      window.localStorage.setItem('userType', '');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
          <p className="text-white mt-4">Cargando sistema...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('userType', '');
    }
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo Section */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="relative inline-block">
              <img 
                src="/imagenes/loglember.jpg" 
                alt="Logo Embler" 
                className="h-24 w-auto mx-auto rounded-2xl border border-yellow-400/30 shadow-xl" 
              />
              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 rounded-2xl blur opacity-75"></div>
            </div>
            <h1 className="text-3xl font-bold text-gradient mt-6 mb-2">Embler</h1>
            <p className="text-muted text-sm">Sistema de gestión logística</p>
          </div>

          {/* Login Form */}
          <div className="card-modern p-8 animate-slide-up">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-white mb-2">Iniciar sesión</h2>
                <p className="text-subtle text-sm">Ingresa tus credenciales para continuar</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Usuario
                  </label>
                  <input
                    className="input-modern"
                    placeholder="Ingresa tu usuario"
                    value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Contraseña
                  </label>
                  <input
                    className="input-modern"
                    placeholder="Ingresa tu contraseña"
                    type="password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  />
                </div>
              </div>

              {error && (
                <div className="status-indicator status-error animate-scale-in">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <button type="submit" className="btn-primary w-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Iniciar sesión
              </button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6 pt-6 border-t border-yellow-400/20">
              <p className="text-xs text-subtle text-center mb-3">Credenciales de prueba:</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center p-2 bg-zinc-900/50 rounded-lg">
                  <p className="font-medium text-yellow-400">Admin</p>
                  <p className="text-zinc-400">admin/admin123</p>
                </div>
                <div className="text-center p-2 bg-zinc-900/50 rounded-lg">
                  <p className="font-medium text-blue-400">Almacén</p>
                  <p className="text-zinc-400">pedro/almacen1</p>
                </div>
                <div className="text-center p-2 bg-zinc-900/50 rounded-lg">
                  <p className="font-medium text-green-400">Reparto</p>
                  <p className="text-zinc-400">juan/reparto1</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (typeof window !== 'undefined') {
    window.localStorage.setItem('userType', user.type);
  }

  return (
    <BrowserRouter>
      <ThemeProvider defaultTheme="dark" storageKey="embler-theme">
        <Layout user={user} onLogout={handleLogout}>
          <RouterRoutes>
            {user.type === 'admin' && <Route path="/rutas" element={<AdminRoutes />} />}
            {user.type === 'repartidor' && <Route path="/repartidor" element={<RepartidorView />} />}
            {user.type === 'almacenista' && <Route path="/almacenista" element={<AlmacenistaView />} />}
            <Route path="*" element={<Navigate to={user.type === 'admin' ? '/rutas' : user.type === 'repartidor' ? '/repartidor' : '/almacenista'} replace />} />
          </RouterRoutes>
        </Layout>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;