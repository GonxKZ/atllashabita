import { useRef, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

import { resolveDuration } from '@/animations';
import { useAuthStore } from '../../state/auth';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { cn } from '../ui/cn';

export interface UserCardProps {
  /**
   * Nombre del usuario. Si se omite y existe sesión, se usa el del store.
   * Esto permite reutilizar el componente en stories pasando un nombre fijo.
   */
  name?: string;
  subtitle?: string;
  avatarUrl?: string;
  indicator?: {
    label: string;
    /** Valor 0-100 mostrado como chip. */
    value: number;
  };
  action?: {
    label: string;
    icon?: ReactNode;
    onClick?: () => void;
  };
  className?: string;
}

const FALLBACK_NAME = 'Invitado';

export function UserCard({
  name,
  subtitle,
  avatarUrl,
  indicator,
  action,
  className,
}: UserCardProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

  // Si el llamador no fija un nombre fijo, derivamos del usuario en sesión.
  // El subtitle por defecto comunica el estado de la sesión: "Cuenta personal"
  // si hay sesión activa, "Inicia sesión" si no.
  const resolvedName = name ?? user?.name ?? FALLBACK_NAME;
  const resolvedSubtitle = subtitle ?? (user ? 'Cuenta personal' : 'Inicia sesión');
  const resolvedAvatar = avatarUrl ?? user?.avatarUrl;

  // Animación de entrada con un leve "pop" + fade. La combinación es
  // barata (solo transform + opacity) y respeta prefers-reduced-motion.
  useGSAP(
    () => {
      const node = rootRef.current;
      if (!node) return;
      gsap.from(node, {
        opacity: 0,
        scale: 0.96,
        duration: resolveDuration(0.45),
        delay: 0.15,
        ease: 'back.out(1.2)',
        clearProps: 'transform,opacity',
      });
    },
    { scope: rootRef }
  );

  return (
    <div
      ref={(node) => {
        rootRef.current = node;
      }}
      // Tarjeta blanca con borde sutil y sombra suave: sigue el diseño del
      // comp donde la card del usuario flota sobre el fondo `surface-soft`.
      className={cn(
        'flex flex-col gap-3 rounded-2xl bg-white p-3',
        'border border-[color:var(--color-line-soft)] shadow-[var(--shadow-card)]',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar name={resolvedName} src={resolvedAvatar} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-ink-900 truncate text-sm font-semibold">
            Hola, {resolvedName.split(' ')[0]}
          </p>
          {resolvedSubtitle ? (
            <p className="text-ink-500 truncate text-xs">{resolvedSubtitle}</p>
          ) : null}
        </div>
        {indicator ? (
          // El badge "74" del comp es un círculo verde claro con número
          // verde oscuro; usamos `aria-label` para que el lector de pantalla
          // anuncie también la etiqueta semántica del indicador.
          <span
            aria-label={`${indicator.label}: ${indicator.value}`}
            className="bg-brand-100 text-brand-700 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums"
          >
            {indicator.value}
          </span>
        ) : null}
      </div>
      {action ? (
        <Button
          variant="subtle"
          size="sm"
          fullWidth
          leadingIcon={action.icon}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      ) : null}
      {user ? (
        <Button
          variant="ghost"
          size="sm"
          fullWidth
          leadingIcon={<LogOut size={14} />}
          onClick={() => {
            signOut();
            navigate('/');
          }}
        >
          Cerrar sesión
        </Button>
      ) : (
        <Link
          to="/login"
          className={cn(
            'inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors',
            'bg-brand-50 text-brand-700 hover:bg-brand-100 active:bg-brand-200',
            'focus-visible:ring-brand-300 focus-visible:ring-2 focus-visible:outline-none'
          )}
        >
          Iniciar sesión
        </Link>
      )}
    </div>
  );
}
