import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { Wallet, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function WalletConnect() {
  const { walletAddress, chain, isConnected, connectWallet, disconnectWallet, switchChain } = useWallet();

  if (isConnected) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="neon-border text-xs sm:text-sm px-2 sm:px-4">
            <Wallet className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{walletAddress}</span>
            <ChevronDown className="h-4 w-4 sm:ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-card border-border z-50">

          <DropdownMenuItem onClick={disconnectWallet} className="text-destructive cursor-pointer">
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="neon-border text-xs sm:text-sm px-2 sm:px-3">
            {chain === 'solana' ? 'SOL' : 'Base'}
            <ChevronDown className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-card border-border z-50">
          <DropdownMenuItem onClick={() => switchChain('solana')} className="cursor-pointer">
            Solana (Phantom)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => switchChain('base')} className="cursor-pointer">
            Base (MetaMask)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <Button onClick={connectWallet} size="sm" className="bg-gradient-primary text-black font-bold neon-glow text-xs sm:text-sm px-2 sm:px-4">
        <Wallet className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">Connect</span>
      </Button>
    </div>
  );
}
