import { LogOut, Settings, User } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserNavProps {
  user: { username: string; nombre: string; type: string } | null;
  onLogout: () => void;
}

export function UserNav({ user, onLogout }: UserNavProps) {
  if (!user) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative h-10 w-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 border border-yellow-400/30 hover:border-yellow-400/50 transition-all duration-200">
          <Avatar className="h-10 w-10">
            <AvatarImage src="/avatars/01.png" alt={user.nombre} />
            <AvatarFallback className="bg-transparent text-black font-bold text-sm">
              {user.nombre?.slice(0, 2).toUpperCase() || 'US'}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 card-glass border-yellow-400/30 p-2" align="end" forceMount>
        <DropdownMenuLabel className="font-normal px-3 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center text-black font-bold">
              {user.nombre?.slice(0, 2).toUpperCase() || 'US'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-white leading-none">{user.nombre}</p>
              <p className="text-sm text-muted mt-1">@{user.username}</p>
              <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                user.type === 'admin' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-400/30' :
                user.type === 'repartidor' ? 'bg-green-900/30 text-green-400 border border-green-400/30' :
                'bg-blue-900/30 text-blue-400 border border-blue-400/30'
              }`}>
                {user.type === 'admin' ? 'Administrador' : 
                 user.type === 'repartidor' ? 'Repartidor' : 'Almacenista'}
              </div>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-yellow-400/20 my-2" />
        <DropdownMenuGroup className="space-y-1">
          <DropdownMenuItem className="text-white hover:bg-yellow-400/10 rounded-lg px-3 py-2 cursor-pointer">
            <User className="mr-3 h-4 w-4" />
            <span>Ver perfil</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="text-white hover:bg-yellow-400/10 rounded-lg px-3 py-2 cursor-pointer">
            <Settings className="mr-3 h-4 w-4" />
            <span>Configuración</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-yellow-400/20 my-2" />
        <DropdownMenuItem 
          onClick={onLogout} 
          className="text-red-400 hover:bg-red-900/20 hover:text-red-300 rounded-lg px-3 py-2 cursor-pointer"
        >
          <LogOut className="mr-3 h-4 w-4" />
          <span>Cerrar sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}