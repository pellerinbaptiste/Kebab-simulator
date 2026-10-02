import { AuthGuard } from "@/components/auth/auth-guard";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { fetchPolymarketQuestions } from "@/lib/polymarket";
import { StoreProvider } from "@/lib/store";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Exécuté au moment du build (site statique) : vraies questions d'actualité.
  // Le navigateur rafraîchit ensuite les cotes (voir StoreProvider).
  const news = await fetchPolymarketQuestions();

  return (
    <AuthGuard>
      <StoreProvider initialNews={news}>
        <AppHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-5 pb-28">{children}</main>
        <BottomNav />
      </StoreProvider>
    </AuthGuard>
  );
}
