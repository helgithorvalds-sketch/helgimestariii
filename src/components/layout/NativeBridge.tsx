import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { initNativeShell, registerPush } from '../../lib/native';

/** Phone-app wiring (renders nothing): deep links, back button, push once signed in. */
export function NativeBridge() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    void initNativeShell((to) => navigate(to)).then((fn) => (cleanup = fn));
    return () => cleanup?.();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    let cleanup: (() => void) | undefined;
    void registerPush((to) => navigate(to)).then((fn) => (cleanup = fn));
    return () => cleanup?.();
  }, [user, navigate]);

  return null;
}
