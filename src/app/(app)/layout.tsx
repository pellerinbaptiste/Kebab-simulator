import { AuthGuard } from "@/components/auth/auth-guard";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { StoreProvider } from "@/lib/store";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <StoreProvider>
        <AppHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-5 pb-28">{children}</main>
        <BottomNav />
      </StoreProvider>
    </AuthGuard>
  );
}
