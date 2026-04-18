import { Outlet, createRootRoute, useRouterState } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { api } from '@convex/_generated/api';
import { AppShell } from '#/components/AppShell';
import '../styles.css';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const { location } = useRouterState();
  const isIntroPage = location.pathname === '/';

  const activeSession = useQuery(api.workoutSessions.getActive);
  const navigate = useNavigate();

  useEffect(() => {
    if (activeSession) {
      void navigate({
        to: '/log/$sessionId',
        params: { sessionId: activeSession._id },
        replace: true,
      });
    }
  }, [activeSession, navigate]);

  if (isIntroPage) {
    return <Outlet />;
  }

  return <AppShell />;
}
