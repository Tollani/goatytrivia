import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Shield, Upload, Users, CheckCircle, DollarSign } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function AdminOverlay() {
  const { walletAddress } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [pendingPurchases, setPendingPurchases] = useState<any[]>([]);
  const [pendingClaims, setPendingClaims] = useState<any[]>([]);

  // Check admin status server-side
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!walletAddress) {
        setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase.rpc('is_wallet_admin', {
        wallet_addr: walletAddress
      });

      if (!error && data === true) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [walletAddress]);

  const loadAdminData = async () => {
    if (!isAdmin) return;

    // Load users
    const { data: usersData } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setUsers(usersData || []);

    // Load pending purchases
    const { data: purchasesData } = await supabase
      .from('purchases')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setPendingPurchases(purchasesData || []);

    // Load pending claims
    const { data: claimsData } = await supabase
      .from('claims')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setPendingClaims(claimsData || []);
  };

  const handleUploadQuestions = async () => {
    try {
      // Parse CSV (format: text,category,correct_answer,option_a,option_b,option_c,option_d)
      const lines = csvData.trim().split('\n');
      const questions = lines.map(line => {
        const [text, category, correct, a, b, c, d] = line.split(',').map(s => s.trim());
        return {
          text,
          category: category as 'CT' | 'Web3' | 'News',
          correct_answer: correct,
          options: { a, b, c, d },
          is_active: true,
          expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        };
      });

      const { error } = await supabase.from('questions').insert(questions);
      
      if (error) throw error;
      
      toast.success(`Added ${questions.length} questions!`);
      setCsvData('');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload questions');
    }
  };

  const confirmPurchase = async (purchaseId: string, walletAddr: string, quantity: number) => {
    try {
      // Update purchase status
      await supabase
        .from('purchases')
        .update({ 
          status: 'confirmed',
          tokens_credited: quantity,
          verified_at: new Date().toISOString()
        })
        .eq('id', purchaseId);

      // Add credits to user
      const { data: user } = await supabase
        .from('users')
        .select('credits')
        .eq('wallet_address', walletAddr)
        .single();

      if (user) {
        await supabase
          .from('users')
          .update({ credits: user.credits + quantity })
          .eq('wallet_address', walletAddr);
      }

      toast.success('Purchase confirmed!');
      loadAdminData();
    } catch (error: any) {
      console.error('Confirm error:', error);
      toast.error('Failed to confirm purchase');
    }
  };

  const confirmClaim = async (claimId: string) => {
    try {
      await supabase
        .from('claims')
        .update({ 
          status: 'approved',
          processed_at: new Date().toISOString()
        })
        .eq('id', claimId);

      toast.success('Claim approved!');
      loadAdminData();
    } catch (error: any) {
      console.error('Approve error:', error);
      toast.error('Failed to approve claim');
    }
  };

  if (!isAdmin) return null;

  return (
    <>
      <Button
        onClick={() => {
          setIsOpen(true);
          loadAdminData();
        }}
        variant="ghost"
        size="icon"
        className="fixed top-20 right-4 z-50 bg-primary/20 hover:bg-primary/30 neon-border"
      >
        <Shield className="h-5 w-5 text-primary" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-gradient-card border-primary max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="neon-text text-2xl flex items-center gap-2">
              <Shield className="h-6 w-6" />
              GOAT Admin Panel
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="questions" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="questions">Questions</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="purchases">Purchases</TabsTrigger>
              <TabsTrigger value="claims">Claims</TabsTrigger>
            </TabsList>

            <TabsContent value="questions" className="space-y-4">
              <Card className="p-4 bg-background/50">
                <div className="flex items-center gap-2 mb-3">
                  <Upload className="h-5 w-5 text-primary" />
                  <h3 className="font-bold">Upload Questions (CSV)</h3>
                </div>
                <Textarea
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  placeholder="text,category,correct,option_a,option_b,option_c,option_d&#10;Example:&#10;Which token hit ATH?,ct,b,BTC,SOL,ETH,DOGE"
                  rows={8}
                  className="font-mono text-xs mb-3"
                />
                <Button onClick={handleUploadQuestions} className="w-full">
                  Upload Questions
                </Button>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="space-y-2">
              <div className="text-sm text-muted-foreground mb-2">Total: {users.length}</div>
              {users.map(user => (
                <Card key={user.id} className="p-3 bg-background/50">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Wallet:</span> {user.wallet_address}</div>
                    <div><span className="text-muted-foreground">Chain:</span> {user.chain}</div>
                    <div><span className="text-muted-foreground">Credits:</span> {user.credits}</div>
                    <div><span className="text-muted-foreground">Points:</span> {user.points}</div>
                    <div><span className="text-muted-foreground">Balance:</span> ${user.balance}</div>
                    <div><span className="text-muted-foreground">Streak:</span> {user.streak}</div>
                  </div>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="purchases" className="space-y-2">
              <div className="text-sm text-muted-foreground mb-2">Pending: {pendingPurchases.length}</div>
              {pendingPurchases.map(purchase => (
                <Card key={purchase.id} className="p-3 bg-background/50">
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div><span className="text-muted-foreground">Wallet:</span> {purchase.wallet_address}</div>
                    <div><span className="text-muted-foreground">Quantity:</span> {purchase.quantity}</div>
                    <div><span className="text-muted-foreground">Amount:</span> ${purchase.amount}</div>
                    <div><span className="text-muted-foreground">Chain:</span> {purchase.chain}</div>
                    <div className="col-span-2"><span className="text-muted-foreground">TX:</span> {purchase.tx_hash}</div>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => confirmPurchase(purchase.id, purchase.wallet_address, purchase.quantity)}
                    className="w-full"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirm Purchase
                  </Button>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="claims" className="space-y-2">
              <div className="text-sm text-muted-foreground mb-2">Pending: {pendingClaims.length}</div>
              {pendingClaims.map(claim => (
                <Card key={claim.id} className="p-3 bg-background/50">
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div><span className="text-muted-foreground">Wallet:</span> {claim.wallet_address}</div>
                    <div><span className="text-muted-foreground">Amount:</span> ${claim.amount}</div>
                    <div><span className="text-muted-foreground">Points:</span> {claim.points_redeemed}</div>
                    <div><span className="text-muted-foreground">Chain:</span> {claim.chain}</div>
                    <div className="col-span-2"><span className="text-muted-foreground">Code:</span> {claim.code}</div>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => confirmClaim(claim.id)}
                    className="w-full"
                  >
                    <DollarSign className="mr-2 h-4 w-4" />
                    Approve & Pay
                  </Button>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
