import { MainNav } from '@/components/main-nav';
import { UserNav } from '@/components/user-nav';

export function Layout({ children, user, onLogout }: { children: React.ReactNode; user: any; onLogout: () => void }) {
  const isMobile = user?.type === 'repartidor';
  
  if (isMobile) {
    return (
      <div className="mobile-container">
        <div className="mobile-header">
          <div className="flex items-center space-x-3">
            <img 
              src="/imagenes/loglember.jpg" 
              alt="Logo" 
              className="h-8 w-auto rounded-lg border border-yellow-400/30" 
            />
            <div>
              <h1 className="text-lg font-bold text-gradient">Embler</h1>
              <p className="text-xs text-muted">{user?.nombre}</p>
            </div>
          </div>
          
          <UserNav user={user} onLogout={onLogout} />
        </div>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 to-black">
      {/* Desktop Header */}
      <header className="desktop-header">
        <div className="desktop-container">
          <div className="flex h-16 items-center justify-between">
            {/* Logo Section */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img 
                  src="/imagenes/loglember.jpg" 
                  alt="Logo Embler" 
                  className="h-10 w-auto rounded-lg border border-yellow-400/30" 
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gradient">Embler</h1>
                <p className="text-xs text-muted">
                  {user?.type === 'almacenista' ? 'Panel de almacén' : 'Panel de administración'}
                </p>
              </div>
            </div>

            {/* Navigation */}
            <MainNav className="hidden md:flex" />

            {/* User Navigation */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-muted">Sistema activo</span>
              </div>
              <UserNav user={user} onLogout={onLogout} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="desktop-container py-8">
        <div className="animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}