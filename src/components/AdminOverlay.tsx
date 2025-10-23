import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Shield, Upload, Users, CheckCircle, DollarSign, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';

export function AdminOverlay() {
  const { walletAddress } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [users, setUsers] = useState<any[]>([]);
  const [pendingPurchases, setPendingPurchases] = useState<any[]>([]);
  const [pendingClaims, setPendingClaims] = useState<any[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Load question count
    const { count } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('expiry_date', new Date().toISOString().split('T')[0]);
    setQuestionCount(count || 0);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['text/csv', 'application/json', 'text/plain'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(csv|json)$/)) {
      toast.error('Invalid file type. Use CSV or JSON only.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast.error('File too large. Max 2MB.');
      return;
    }

    setSelectedFile(file);
    toast.success(`Selected: ${file.name}`);
  };

  const handleUploadQuestions = async () => {
    if (!selectedFile || !walletAddress) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);
    setUploadProgress(20);

    try {
      const format = selectedFile.name.endsWith('.json') ? 'json' : 'csv';
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('format', format);
      formData.append('wallet_address', walletAddress);

      setUploadProgress(40);

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-questions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: formData,
        }
      );

      setUploadProgress(80);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setUploadProgress(100);

      if (result.errors && result.errors.length > 0) {
        toast.warning(
          `Uploaded ${result.inserted} questions with ${result.total_errors} errors. Check console for details.`,
          { duration: 5000 }
        );
        console.log('Upload errors:', result.errors);
      } else {
        toast.success(`✅ Uploaded ${result.inserted} Questions! New GOAT Bait Ready.`);
      }

      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadAdminData();

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload questions');
    } finally {
      setUploading(false);
      setUploadProgress(0);
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
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-primary" />
                    <h3 className="font-bold">Upload Questions</h3>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Active: {questionCount}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-background/30 p-3 rounded-md text-xs space-y-1">
                    <p className="text-muted-foreground font-semibold">CSV Format (comma-separated):</p>
                    <code className="block text-primary">text,category,correct,a,b,c,d,source_url</code>
                    <p className="text-muted-foreground mt-2">Example:</p>
                    <code className="block">Which GOAT meme won 2024?,ct,b,Pepe,Goatseus,Doge,Wojak,twitter.com</code>
                    <p className="text-muted-foreground mt-2">
                      Categories: <span className="text-primary">ct, web3, news</span> | 
                      Correct: <span className="text-primary">a, b, c, d</span> | 
                      Max 200 rows
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.json"
                      onChange={handleFileSelect}
                      disabled={uploading}
                      className="cursor-pointer"
                    />
                    {selectedFile && (
                      <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                  </div>

                  {uploading && (
                    <div className="space-y-2">
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-xs text-center text-muted-foreground">
                        Processing... {uploadProgress}%
                      </p>
                    </div>
                  )}

                  <Button 
                    onClick={handleUploadQuestions} 
                    disabled={!selectedFile || uploading}
                    className="w-full"
                  >
                    {uploading ? 'Uploading...' : 'Upload Questions'}
                  </Button>
                </div>
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
