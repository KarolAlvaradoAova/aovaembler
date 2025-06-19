import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-black group-[.toaster]:text-yellow-400 group-[.toaster]:border-yellow-400 group-[.toaster]:shadow-yellow',
          description: 'group-[.toast]:text-yellow-300',
          actionButton:
            'group-[.toast]:bg-yellow-400 group-[.toast]:text-black',
          cancelButton:
            'group-[.toast]:bg-black group-[.toast]:text-yellow-400',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
