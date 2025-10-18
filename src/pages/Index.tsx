import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/contexts/WalletContext';
import { WalletConnect } from '@/components/WalletConnect';
import { SimulatedCreditPurchase } from '@/components/SimulatedCreditPurchase';
import { ClaimVoucher } from '@/components/ClaimVoucher';
import { BalanceHUD } from '@/components/BalanceHUD';
import { GameHistory } from '@/components/GameHistory';
import { AdminOverlay } from '@/components/AdminOverlay';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, Users, ExternalLink, DollarSign, Trophy, TrendingUp, ArrowRight, Zap } from 'lucide-react';
import goatHero from '@/assets/goat-hero.png';

export default function Index() {
  const navigate = useNavigate();
  const { isConnected, credits, points, streak } = useWallet();

  const handleStartGame = () => {
    if (credits < 1) {
      return;
    }
    navigate('/game');
  };

  return (
    <div className="min-h-screen bg-gradient-dark overflow-x-hidden">
      <AdminOverlay />
      
      {/* Header */}
      <header className="border-b border-primary/20 sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold neon-text tracking-wider" style={{ textShadow: '2px 2px 0 white, -2px -2px 0 white, 2px -2px 0 white, -2px 2px 0 white' }}>
            GOATY
          </h1>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-12 md:py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-20 md:opacity-30">
          <img 
            src={goatHero} 
            alt="GOATY Hero" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-4 md:space-y-6">
            <h2 className="text-4xl sm:text-5xl md:text-7xl font-bold neon-text">
              GOAT RUSH
            </h2>
            <p className="text-base sm:text-lg md:text-2xl text-foreground px-4">
              Rush daily questions from <span className="text-primary">CT</span>,{' '}
              <span className="text-accent">Web3</span>, and{' '}
              <span className="text-secondary">world news</span> to earn{' '}
              <span className="neon-text">USDC rewards</span>
            </p>
            
            {/* How It Works Flow */}
            <div className="flex items-center justify-center gap-4 pt-6 flex-wrap px-4">
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center neon-glow">
                  <DollarSign className="w-8 h-8 text-primary" />
                </div>
                <span className="text-sm font-semibold text-primary">Add USDC</span>
              </div>
              
              <ArrowRight className="w-6 h-6 text-muted-foreground hidden sm:block" />
              
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center neon-glow">
                  <Trophy className="w-8 h-8 text-accent" />
                </div>
                <span className="text-sm font-semibold text-accent">Win Game</span>
              </div>
              
              <ArrowRight className="w-6 h-6 text-muted-foreground hidden sm:block" />
              
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-secondary/20 border-2 border-secondary flex items-center justify-center neon-glow">
                  <TrendingUp className="w-8 h-8 text-secondary" />
                </div>
                <span className="text-sm font-semibold text-secondary">Earn 2x Stake</span>
              </div>
            </div>

            {isConnected && (
              <div className="space-y-4 pt-4">
                <BalanceHUD />
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  {credits >= 1 ? (
                    <Button 
                      onClick={handleStartGame}
                      size="lg"
                      className="bg-gradient-primary text-black font-bold text-xl h-14 px-8 neon-glow-strong animate-pulse-glow"
                    >
                      <Play className="mr-2 h-6 w-6" />
                      START GOAT RUSH
                    </Button>
                  ) : (
                    <div className="text-center space-y-2">
                      <p className="text-muted-foreground text-sm">Need credits to play!</p>
                      <SimulatedCreditPurchase />
                    </div>
                  )}
                  
                  <ClaimVoucher />
                  
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => window.open('https://discord.gg/goaty', '_blank')}
                    className="neon-border h-14"
                  >
                    <Users className="mr-2 h-5 w-5" />
                    Join Discord
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </div>

                {/* Preview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
                  <Card className="p-4 bg-gradient-card border-2 border-primary/50 hover:border-primary transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-xs font-bold bg-primary/20 text-primary px-2 py-1 rounded">CT</span>
                      <Zap className="h-5 w-5 text-accent" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      "Which meme coin just hit ATH this week?"
                    </p>
                    <Button 
                      onClick={handleStartGame}
                      disabled={credits < 1}
                      size="sm"
                      className="w-full"
                      variant={credits >= 1 ? "default" : "outline"}
                    >
                      {credits >= 1 ? 'Activate Rush' : 'Need Credits'}
                    </Button>
                  </Card>

                  <Card className="p-4 bg-gradient-card border-2 border-accent/50 hover:border-accent transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-xs font-bold bg-accent/20 text-accent px-2 py-1 rounded">Web3</span>
                      <Zap className="h-5 w-5 text-accent" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      "Which L2 launched a new airdrop campaign?"
                    </p>
                    <Button 
                      onClick={handleStartGame}
                      disabled={credits < 1}
                      size="sm"
                      className="w-full"
                      variant={credits >= 1 ? "default" : "outline"}
                    >
                      {credits >= 1 ? 'Activate Rush' : 'Need Credits'}
                    </Button>
                  </Card>

                  <Card className="p-4 bg-gradient-card border-2 border-secondary/50 hover:border-secondary transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-xs font-bold bg-secondary/20 text-secondary px-2 py-1 rounded">News</span>
                      <Zap className="h-5 w-5 text-accent" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      "What major tech company announced AI integration?"
                    </p>
                    <Button 
                      onClick={handleStartGame}
                      disabled={credits < 1}
                      size="sm"
                      className="w-full"
                      variant={credits >= 1 ? "default" : "outline"}
                    >
                      {credits >= 1 ? 'Activate Rush' : 'Need Credits'}
                    </Button>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-8 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
            <Card className="p-4 md:p-6 bg-gradient-card border-2 border-primary text-center">
              <div className="text-4xl md:text-5xl mb-3 md:mb-4">🎯</div>
              <h3 className="text-lg md:text-xl font-bold neon-text mb-2">3 Questions</h3>
              <p className="text-sm md:text-base text-muted-foreground">
                Answer all 3 correctly in under 3 seconds each to win $2 USDC
              </p>
            </Card>
            
            <Card className="p-4 md:p-6 bg-gradient-card border-2 border-accent text-center">
              <div className="text-4xl md:text-5xl mb-3 md:mb-4">⚡</div>
              <h3 className="text-lg md:text-xl font-bold text-accent mb-2">Daily Fresh</h3>
              <p className="text-sm md:text-base text-muted-foreground">
                New questions daily from CT, Web3 news, and world events
              </p>
            </Card>
            
            <Card className="p-4 md:p-6 bg-gradient-card border-2 border-secondary text-center sm:col-span-2 md:col-span-1">
              <div className="text-4xl md:text-5xl mb-3 md:mb-4">💰</div>
              <h3 className="text-lg md:text-xl font-bold text-secondary mb-2">Claim Rewards</h3>
              <p className="text-sm md:text-base text-muted-foreground">
                Reach $10 balance to claim your GOAT voucher via Discord
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Game History */}
      {isConnected && (
        <section className="py-8 md:py-16">
          <div className="container mx-auto px-4 max-w-2xl">
            <GameHistory />
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-primary/20 py-6 md:py-8 mt-12 md:mt-20">
        <div className="container mx-auto px-4 text-center text-xs md:text-sm text-muted-foreground space-y-2">
          <p>
            On-chain USDC purchases. Manual Discord redemptions. 18+ skill-based game.
          </p>
          <p className="text-xs">
            GOATY © 2025 | Built for Web3 GOATs
          </p>
        </div>
      </footer>
    </div>
  );
}
