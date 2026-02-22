import { cn } from '@/lib/utils';

type ContainerProps = {
  children: React.ReactNode;
  size?: 'default' | 'narrow' | 'wide';
  className?: string;
};

const sizeStyles = {
  default: 'max-w-content',
  narrow: 'max-w-narrow',
  wide: 'max-w-wide',
};

export function Container({ children, size = 'default', className }: ContainerProps) {
  return (
    <div className={cn('mx-auto w-full px-5 md:px-6', sizeStyles[size], className)}>
      {children}
    </div>
  );
}
