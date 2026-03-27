'use client';
import { useEffect, useState } from 'react';
import { Plus, Banknote, TrendingUp, TrendingDown, CreditCard, FileText, Trash2, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, EmptyState, cardCls, btnPrimary, inputCls, selectCls, Badge, BadgeVariant, ConfirmDialog } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

type BankAccount = { id: string; name: string; bank_name: string; account_number: string; account_type: string; balance: number; currency: string; is_active: boolean };
type Transaction = {
  id: string; account_id: string; type: string; amount: number; description: string | null;
  category: string | null; reference: string | null; transaction_date: string;
  cheque_number: string | null; is_reconciled: boolean;
  bank_accounts: { name: string } | null;
};

const TXN_TYPES: Record<string, { l: string; v: BadgeVariant; color: string }> = {
  credit: { l: 'Crédit', v: 'success', color: 'text-green-600' },
  debit:  { l: 'Débit',  v: 'error',   color: 'text-red-600'   },
};

const CATEGORIES = ['carburant', 'salaire', 'maintenance', 'loyer', 'assurance', 'fournitures', 'recette_livraison', 'autre'];

export default function FinancesPage() {
  const { company } = useAuthStore();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAccount, setActiveAccount] = useState<string>('all');
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showTxnForm, setShowTxnForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [acctForm, setAcctForm] = useState({ name: '', bank_name: '', account_number: '', account_type: 'courant', balance: '0', currency: 'XOF' });
  const [txnForm, setTxnForm] = useState({ account_id: '', type: 'debit', amount: '', description: '', category: '', reference: '', transaction_date: new Date().toISOString().split('T')[0], cheque_number: '' });

  const load = () => {
    if (!company?.id) return;
    setLoading(true);
    const sb = createClient();
    Promise.all([
      sb.from('bank_accounts').select('*').eq('company_id', company.id).order('name'),
      sb.from('bank_transactions')
        .select('id,account_id,type,amount,description,category,reference,transaction_date,cheque_number,is_reconciled,bank_accounts(name)')
        .eq('company_id', company.id)
        .order('transaction_date', { ascending: false })
        .limit(50),
    ]).then(([{ data: a }, { data: t }]) => {
      setAccounts((a || []) as any);
      setTransactions((t || []) as any);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [company?.id]);

  const handleSaveAccount = async () => {
    if (!acctForm.name) { toast.error('Nom requis'); return; }
    setSaving(true);
    const { error } = await createClient().from('bank_accounts').insert({
      company_id: company!.id, name: acctForm.name, bank_name: acctForm.bank_name || null,
      account_number: acctForm.account_number || null, account_type: acctForm.account_type,
      balance: Number(acctForm.balance) || 0, currency: acctForm.currency,
    });
    setSaving(false);
    if (error) { toast.error('Erreur: ' + error.message); return; }
    toast.success('Compte ajouté');
    setShowAccountForm(false);
    setAcctForm({ name: '', bank_name: '', account_number: '', account_type: 'courant', balance: '0', currency: 'XOF' });
    load();
  };

  const handleSaveTxn = async () => {
    if (!txnForm.account_id || !txnForm.amount) { toast.error('Compte et montant requis'); return; }
    setSaving(true);
    const sb = createClient();
    const { error } = await sb.from('bank_transactions').insert({
      company_id: company!.id, account_id: txnForm.account_id, type: txnForm.type,
      amount: Number(txnForm.amount), description: txnForm.description || null,
      category: txnForm.category || null, reference: txnForm.reference || null,
      transaction_date: txnForm.transaction_date, cheque_number: txnForm.cheque_number || null,
    });
    if (!error) {
      // Update account balance
      const acct = accounts.find(a => a.id === txnForm.account_id);
      if (acct) {
        const delta = txnForm.type === 'credit' ? Number(txnForm.amount) : -Number(txnForm.amount);
        await sb.from('bank_accounts').update({ balance: acct.balance + delta }).eq('id', acct.id);
      }
    }
    setSaving(false);
    if (error) { toast.error('Erreur: ' + error.message); return; }
    toast.success('Transaction enregistrée');
    setShowTxnForm(false);
    setTxnForm({ account_id: '', type: 'debit', amount: '', description: '', category: '', reference: '', transaction_date: new Date().toISOString().split('T')[0], cheque_number: '' });
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await createClient().from('bank_transactions').delete().eq('id', deleteId);
    toast.success('Supprimé');
    setDeleteId(null); setDeleting(false); load();
  };

  const totalBalance = accounts.filter(a => a.is_active).reduce((s, a) => s + Number(a.balance), 0);
  const filteredTxns = activeAccount === 'all' ? transactions : transactions.filter(t => t.account_id === activeAccount);
  const totalCredit = filteredTxns.filter(t => t.type === 'credit').reduce((s, t) => s + Number(t.amount), 0);
  const totalDebit = filteredTxns.filter(t => t.type === 'debit').reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div>
      <PageHeader title="Finances — Comptes & Banques"
        subtitle={`Solde total: ${formatCurrency(totalBalance)}`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowTxnForm(true)} className={btnPrimary}><Plus size={16} /> Transaction</button>
            <button onClick={() => setShowAccountForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"><Plus size={15} /> Compte</button>
          </div>
        }
      />

      {/* Account cards */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {accounts.map(a => (
            <button key={a.id} onClick={() => setActiveAccount(a.id === activeAccount ? 'all' : a.id)}
              className={`${cardCls} p-4 text-left transition-all ${activeAccount === a.id ? 'ring-2 ring-primary' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-foreground text-sm">{a.name}</p>
                <Banknote size={18} className="text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">{a.bank_name || 'Banque'} · {a.account_type}</p>
              <p className={`text-xl font-black mt-2 ${a.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(a.balance)}</p>
            </button>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-100">
          <p className="text-xs font-semibold text-green-700 uppercase mb-1">Entrées</p>
          <p className="text-xl font-black text-green-700">{formatCurrency(totalCredit)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100">
          <p className="text-xs font-semibold text-red-700 uppercase mb-1">Sorties</p>
          <p className="text-xl font-black text-red-700">{formatCurrency(totalDebit)}</p>
        </div>
        <div className={`p-4 rounded-2xl border ${totalCredit - totalDebit >= 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100' : 'bg-red-50 dark:bg-red-900/20 border-red-100'}`}>
          <p className={`text-xs font-semibold uppercase mb-1 ${totalCredit - totalDebit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>Solde période</p>
          <p className={`text-xl font-black ${totalCredit - totalDebit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{formatCurrency(totalCredit - totalDebit)}</p>
        </div>
      </div>

      {/* Account form modal */}
      {showAccountForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={cardCls + ' w-full max-w-md p-6 space-y-4'}>
            <h3 className="font-bold text-lg text-foreground">Nouveau compte bancaire</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Nom du compte *</label>
                <input type="text" value={acctForm.name} onChange={e => setAcctForm(f => ({ ...f, name: e.target.value }))} className={inputCls + ' w-full'} placeholder="Ex: Compte courant CBAO" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Banque</label>
                <input type="text" value={acctForm.bank_name} onChange={e => setAcctForm(f => ({ ...f, bank_name: e.target.value }))} className={inputCls + ' w-full'} placeholder="CBAO, SGBS, BHS..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
                <select value={acctForm.account_type} onChange={e => setAcctForm(f => ({ ...f, account_type: e.target.value }))} className={selectCls + ' w-full'}>
                  <option value="courant">Courant</option>
                  <option value="epargne">Épargne</option>
                  <option value="caisse">Caisse</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Solde initial (FCFA)</label>
                <input type="number" value={acctForm.balance} onChange={e => setAcctForm(f => ({ ...f, balance: e.target.value }))} className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">N° compte</label>
                <input type="text" value={acctForm.account_number} onChange={e => setAcctForm(f => ({ ...f, account_number: e.target.value }))} className={inputCls + ' w-full'} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAccountForm(false)} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Annuler</button>
              <button onClick={handleSaveAccount} disabled={saving} className={btnPrimary}>{saving ? '...' : 'Créer compte'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction form modal */}
      {showTxnForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={cardCls + ' w-full max-w-md p-6 space-y-4'}>
            <h3 className="font-bold text-lg text-foreground">Nouvelle transaction</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Compte *</label>
                <select value={txnForm.account_id} onChange={e => setTxnForm(f => ({ ...f, account_id: e.target.value }))} className={selectCls + ' w-full'}>
                  <option value="">Sélectionner...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Type *</label>
                <select value={txnForm.type} onChange={e => setTxnForm(f => ({ ...f, type: e.target.value }))} className={selectCls + ' w-full'}>
                  <option value="debit">Débit (sortie)</option>
                  <option value="credit">Crédit (entrée)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Montant (FCFA) *</label>
                <input type="number" value={txnForm.amount} onChange={e => setTxnForm(f => ({ ...f, amount: e.target.value }))} className={inputCls + ' w-full'} min="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Date *</label>
                <input type="date" value={txnForm.transaction_date} onChange={e => setTxnForm(f => ({ ...f, transaction_date: e.target.value }))} className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Catégorie</label>
                <select value={txnForm.category} onChange={e => setTxnForm(f => ({ ...f, category: e.target.value }))} className={selectCls + ' w-full'}>
                  <option value="">Choisir...</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                <input type="text" value={txnForm.description} onChange={e => setTxnForm(f => ({ ...f, description: e.target.value }))} className={inputCls + ' w-full'} placeholder="Libellé de la transaction" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">N° Chèque</label>
                <input type="text" value={txnForm.cheque_number} onChange={e => setTxnForm(f => ({ ...f, cheque_number: e.target.value }))} className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Référence</label>
                <input type="text" value={txnForm.reference} onChange={e => setTxnForm(f => ({ ...f, reference: e.target.value }))} className={inputCls + ' w-full'} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowTxnForm(false)} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Annuler</button>
              <button onClick={handleSaveTxn} disabled={saving} className={btnPrimary}>{saving ? '...' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="flex justify-center h-48 items-center"><LoadingSpinner size={32} /></div>
        : accounts.length === 0 ? <EmptyState icon={<Banknote size={24} />} title="Aucun compte bancaire" description="Créez votre premier compte pour gérer vos finances" action={<button onClick={() => setShowAccountForm(true)} className={btnPrimary}><Plus size={16} />Créer compte</button>} />
          : (
            <div className={cardCls}>
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-foreground">
                  Transactions {activeAccount !== 'all' ? `— ${accounts.find(a => a.id === activeAccount)?.name}` : '— Tous comptes'}
                </h3>
                <p className="text-xs text-muted-foreground">{filteredTxns.length} opérations</p>
              </div>
              {filteredTxns.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">Aucune transaction</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-border">
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Date</th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Description</th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Catégorie</th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Compte</th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Chèque</th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase text-right">Montant</th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Rappr.</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredTxns.map(t => {
                      const tt = TXN_TYPES[t.type] || { l: t.type, v: 'default' as BadgeVariant, color: 'text-foreground' };
                      return (
                        <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(t.transaction_date)}</td>
                          <td className="px-4 py-3 text-foreground max-w-[180px] truncate">{t.description || '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground capitalize">{t.category?.replace(/_/g, ' ') || '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{t.bank_accounts?.name || '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{t.cheque_number || '—'}</td>
                          <td className={`px-4 py-3 font-bold text-right whitespace-nowrap ${tt.color}`}>
                            {t.type === 'credit' ? '+' : '-'}{formatCurrency(t.amount)}
                          </td>
                          <td className="px-4 py-3">
                            {t.is_reconciled ? <CheckCircle size={14} className="text-green-500" /> : <span className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground inline-block" />}
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => setDeleteId(t.id)} className="p-1.5 text-muted-foreground hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

      <ConfirmDialog open={!!deleteId} title="Supprimer cette transaction ?" description="Action irréversible."
        confirmLabel={deleting ? 'Suppression...' : 'Supprimer'} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
