import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, TrendingUp, Users } from "lucide-react";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { Link } from "wouter";

export default function Home() {
  let { user, loading, error, isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-background/80">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-8" />}
            <span className="text-xl font-bold">{APP_TITLE}</span>
          </div>
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Welcome, {user?.name}</span>
              <Link href="/dashboard">
                <Button>Dashboard</Button>
              </Link>
            </div>
          ) : (
            <a href={getLoginUrl()}>
              <Button>Sign In</Button>
            </a>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-5xl font-bold tracking-tight">
              Automate Your Instagram
              <span className="block text-primary mt-2">For Sustainable Energy</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              AI-powered content generation and posting for PowerPlant Energy's Instagram account.
              Grow your audience with automated posts about SAF, bioenergy, and renewable energy.
            </p>
            
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="lg" className="text-lg px-8">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <a href={getLoginUrl()}>
                <Button size="lg" className="text-lg px-8">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>
            )}
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-5xl mx-auto">
            <div className="p-6 rounded-lg border bg-card">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Content Generation</h3>
              <p className="text-sm text-muted-foreground">
                Automatically generate engaging posts about sustainable fuels, SAF, and bioenergy using advanced AI.
              </p>
            </div>

            <div className="p-6 rounded-lg border bg-card">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Smart Scheduling</h3>
              <p className="text-sm text-muted-foreground">
                Randomized posting schedule with 100+ posts in the first few days to build your audience quickly.
              </p>
            </div>

            <div className="p-6 rounded-lg border bg-card">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Follower Growth</h3>
              <p className="text-sm text-muted-foreground">
                Automatically follow aligned accounts in the renewable energy and sustainable fuels space.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 PowerPlant Energy. Powered by AI automation.</p>
        </div>
      </footer>
    </div>
  );
}
