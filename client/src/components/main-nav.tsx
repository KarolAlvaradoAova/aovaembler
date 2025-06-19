import { cn } from '@/lib/utils';

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <nav
      className={cn('flex items-center space-x-8 lg:space-x-12 text-lg font-semibold text-yellow-400', className)}
      {...props}
    >
      {/* Aquí puedes agregar enlaces principales si lo deseas */}
    </nav>
  );
}