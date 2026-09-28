import { useEffect, useRef, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import { useUpdateProfile, useUploadAvatar } from '../../lib/queries';
import type { Profile } from '../../lib/types';
import { UserAvatar } from '../common/UserAvatar';
import { secondaryButtonClass } from '../common/buttonClasses';
import { authInputClass, FieldMessage } from './AuthForm';
import { checkAvatarFile, MAX_BIO_LENGTH, profileSchema, type ProfileValues } from './logic';

export type ProfileFormProps = { profile: Profile };

/** display_name + bio (the only profile columns a user may change) and the avatar uploader. */
export function ProfileForm({ profile }: ProfileFormProps) {
  const t = useT();
  const update = useUpdateProfile();
  const upload = useUploadAvatar();
  const fileRef = useRef<HTMLInputElement>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { display_name: profile.display_name, bio: profile.bio ?? '' },
  });

  // keep the form in sync when the profile is refreshed elsewhere (avatar upload, other tab)
  useEffect(() => {
    reset({ display_name: profile.display_name, bio: profile.bio ?? '' });
  }, [profile.display_name, profile.bio, reset]);

  const bioLength = (watch('bio') ?? '').length;

  const onSubmit = handleSubmit((values) => {
    update.mutate(
      { display_name: values.display_name, bio: values.bio ? values.bio : null },
      { onSuccess: () => toast.success(t('account.profile.saved')) },
    );
  });

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const problem = checkAvatarFile(file);
    if (problem) {
      toast.error(t(`errors.${problem}`));
      return;
    }
    upload.mutate(file, { onSuccess: () => toast.success(t('account.profile.avatarSaved')) });
  };

  return (
    <section className="mt-panel p-4 sm:p-5" aria-labelledby="mt-profile-title">
      <h2 id="mt-profile-title" className="text-[14px] font-semibold">
        {t('account.profile.title')}
      </h2>

      <div className="mt-4 flex items-center gap-4">
        <UserAvatar profile={profile} size="lg" />
        <div className="space-y-1.5">
          <input
            ref={fileRef}
            id="mt-avatar-file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={onFile}
            disabled={upload.isPending}
            aria-label={t('account.profile.avatar')}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn('h-10 text-[13px] sm:h-9', secondaryButtonClass)}
            onClick={() => fileRef.current?.click()}
            disabled={upload.isPending}
          >
            <Camera aria-hidden="true" />
            {upload.isPending ? t('account.common.uploading') : t('account.profile.avatarChange')}
          </Button>
          <p className="text-[12px] text-muted-foreground">{t('account.profile.avatarHint')}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="mt-profile-name">{t('account.profile.displayName')}</Label>
          <Input
            id="mt-profile-name"
            type="text"
            autoComplete="name"
            maxLength={40}
            className={cn(authInputClass, 'max-w-md', errors.display_name && 'border-destructive')}
            aria-invalid={!!errors.display_name}
            aria-describedby={cn('mt-profile-name-hint', errors.display_name && 'mt-profile-name-error')}
            {...register('display_name')}
          />
          <p id="mt-profile-name-hint" className="text-[12px] text-muted-foreground">
            {t('account.profile.displayNameHint')}
          </p>
          <FieldMessage id="mt-profile-name-error" message={errors.display_name?.message && t(errors.display_name.message)} />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="mt-profile-bio">
              {t('account.profile.bio')} <span className="font-normal text-muted-foreground">({t('common.optional')})</span>
            </Label>
            <span className="text-[12px] tabular-nums text-muted-foreground" aria-live="polite">
              {t('account.profile.bioCount', { count: bioLength })}
            </span>
          </div>
          <Textarea
            id="mt-profile-bio"
            rows={3}
            maxLength={MAX_BIO_LENGTH}
            placeholder={t('account.profile.bioPlaceholder')}
            className={cn('max-w-xl bg-background text-[13px]', errors.bio && 'border-destructive')}
            aria-invalid={!!errors.bio}
            aria-describedby={errors.bio ? 'mt-profile-bio-error' : undefined}
            {...register('bio')}
          />
          <FieldMessage id="mt-profile-bio-error" message={errors.bio?.message && t(errors.bio.message)} />
        </div>

        <Button type="submit" size="sm" className="h-10 text-[13px] font-semibold sm:h-9" disabled={!isDirty || update.isPending}>
          {update.isPending ? t('common.saving') : t('common.save')}
        </Button>
      </form>
    </section>
  );
}
