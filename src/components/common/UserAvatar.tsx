import { cn } from '@/lib/utils';
import { initialsOf, placeholderClass } from '../../lib/avatar';

type AvatarLike = { id: string; display_name: string | null; avatar_url?: string | null };

export type UserAvatarProps = {
  profile: AvatarLike | null | undefined;
  /** 30 / 44 / 72 px per DESIGN.md, or any pixel size. */
  size?: 'sm' | 'md' | 'lg' | number;
  /** Users are circles; events use `square` (8px radius, 12px at 72). */
  shape?: 'circle' | 'square';
  className?: string;
};

const SIZES = { sm: 30, md: 44, lg: 72 } as const;

/** Solid placeholder tile (ph-1…6 by id hash) with two initials, or the avatar image when set. */
export function UserAvatar({ profile, size = 'md', shape = 'circle', className }: UserAvatarProps) {
  const px = typeof size === 'number' ? size : SIZES[size];
  const name = profile?.display_name ?? '';
  const radius = shape === 'circle' ? 'rounded-full' : px >= 72 ? 'rounded-xl' : 'rounded-lg';
  const fontSize = Math.max(11, Math.round(px * 0.36));
  const style = { width: px, height: px, fontSize };

  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={name}
        width={px}
        height={px}
        style={style}
        className={cn('shrink-0 object-cover', radius, className)}
        loading="lazy"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={style}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center font-bold leading-none text-foreground',
        radius,
        placeholderClass(profile?.id),
        className,
      )}
      data-testid="avatar-placeholder"
    >
      {initialsOf(name)}
    </span>
  );
}
