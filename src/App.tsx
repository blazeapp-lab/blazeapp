import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Search from "./pages/Search";
import Settings from "./pages/Settings";
import PostDetail from "./pages/PostDetail";
import Notifications from "./pages/Notifications";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";
import Header from "@/components/Header";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/*" element={
              <MainLayout user={user}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/search" element={<Search currentUserId={user?.id} />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/profile/:userId" element={<Profile currentUserId={user?.id} />} />
                  <Route path="/post/:postId" element={<PostDetail currentUserId={user?.id} />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </MainLayout>
            } />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

const MainLayout = ({ user, children }: { user: User | null; children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-background">
      <Header userId={user?.id} />
      <main className="max-w-7xl mx-auto p-6">
        {children}
      </main>
    </div>
  );
};

export default App;
