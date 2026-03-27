'use client';
import { useEffect, useState } from 'react';
import { Plus, Users, Phone, Trash2, Edit } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, EmptyState, cardCls, btnPrimary, inputCls, selectCls, Badge, BadgeVariant, ConfirmDialog } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

type Employee = {
  id: string; full_name: string; category: string; position: string | null;
  phone: string | null; email: string | null; hire_date: string | null;
  salary: number | null; id_number: string | null; is_active: boolean;
};

const CATEGORY_MAP: Record<string, { l: string; v: BadgeVariant; color: string }> = {
  administration: { l: 'Administration', v: 'info',    color: 'bg-blue-100 text-blue-700' },
  chauffeur:      { l: 'Chauffeur',      v: 'success', color: 'bg-green-100 text-green-700' },
  technique:      { l: 'Technique',      v: 'warning', color: 'bg-amber-100 text-amber-700' },
};

export default function EmployesPage() {
  const { company } = useAuthStore();
  const [items, setItems] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Employee | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const emptyForm = { full_name: '', category: 'administration', position: '', phone: '', email: '', hire_date: '', salary: '', id_number: '', is_active: 'true' };
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    if (!company?.id) return;
    setLoading(true);
    let q = createClient().from('logistics_employees').select('*').eq('company_id', company.id).order('category').order('full_name');
    if (filterCat) q = q.eq('category', filterCat);
    q.then(({ data }) => { setItems((data || []) as any); setLoading(false); });
  };

  useEffect(() => { load(); }, [company?.id, filterCat]);

  const openEdit = (emp: Employee) => {
    setEditItem(emp);
    setForm({
      full_name: emp.full_name, category: emp.category, position: emp.position || '',
      phone: emp.phone || '', email: emp.email || '', hire_date: emp.hire_date || '',
      salary: emp.salary ? String(emp.salary) : '', id_number: emp.id_number || '',
      is_active: String(emp.is_active),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.full_name) { toast.error('Nom requis'); return; }
    setSaving(true);
    const payload = {
      company_id: company!.id, full_name: form.full_name, category: form.category,
      position: form.position || null, phone: form.phone || null, email: form.email || null,
      hire_date: form.hire_date || null, salary: form.salary ? Number(form.salary) : null,
      id_number: form.id_number || null, is_active: form.is_active === 'true',
    };
    let error;
    if (editItem) {
      ({ error } = await createClient().from('logistics_employees').update(payload).eq('id', editItem.id));
    } else {
      ({ error } = await createClient().from('logistics_employees').insert(payload));
    }
    setSaving(false);
    if (error) { toast.error('Erreur: ' + error.message); return; }
    toast.success(editItem ? 'Employé modifié' : 'Employé ajouté');
    setShowForm(false); setEditItem(null); setForm(emptyForm); load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await createClient().from('logistics_employees').delete().eq('id', deleteId);
    toast.success('Supprimé');
    setDeleteId(null); setDeleting(false); load();
  };

  const byCategory = Object.entries(CATEGORY_MAP).map(([key, meta]) => ({
    key, meta, items: items.filter(e => e.category === key),
  })).filter(g => !filterCat || g.key === filterCat);

  return (
    <div>
      <PageHeader title="Employés" subtitle={`${items.length} employé(s) · ${items.filter(e => e.is_active).length} actif(s)`}
        actions={<button onClick={() => { setEditItem(null); setForm(emptyForm); setShowForm(true); }} className={btnPrimary}><Plus size={16} /> Ajouter employé</button>}
      />

      <div className="flex gap-3 mb-5">
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className={selectCls + ' w-44'}>
          <option value="">Toutes catégories</option>
          {Object.entries(CATEGORY_MAP).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
        </select>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={cardCls + ' w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto'}>
            <h3 className="font-bold text-lg text-foreground">{editItem ? 'Modifier employé' : 'Nouvel employé'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Nom complet *</label>
                <input type="text" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Catégorie *</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={selectCls + ' w-full'}>
                  {Object.entries(CATEGORY_MAP).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Poste</label>
                <input type="text" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} className={inputCls + ' w-full'} placeholder="Ex: Secrétaire, Mécanicien..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Téléphone</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Date d'embauche</label>
                <input type="date" value={form.hire_date} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))} className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Salaire (FCFA/mois)</label>
                <input type="number" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} className={inputCls + ' w-full'} min="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">N° CNI / Pièce d'identité</label>
                <input type="text" value={form.id_number} onChange={e => setForm(f => ({ ...f, id_number: e.target.value }))} className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Statut</label>
                <select value={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.value }))} className={selectCls + ' w-full'}>
                  <option value="true">Actif</option>
                  <option value="false">Inactif</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowForm(false); setEditItem(null); }} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Annuler</button>
              <button onClick={handleSave} disabled={saving} className={btnPrimary}>{saving ? '...' : editItem ? 'Modifier' : 'Ajouter'}</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="flex justify-center h-48 items-center"><LoadingSpinner size={32} /></div>
        : items.length === 0 ? <EmptyState icon={<Users size={24} />} title="Aucun employé" action={<button onClick={() => setShowForm(true)} className={btnPrimary}><Plus size={16} />Ajouter</button>} />
          : (
            <div className="space-y-6">
              {byCategory.map(group => (
                <div key={group.key}>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4 ${group.meta.color}`}>
                    {group.meta.l} — {group.items.length} personne(s)
                  </div>
                  {group.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground pl-2">Aucun employé dans cette catégorie</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.items.map(emp => (
                        <div key={emp.id} className={cardCls + ' p-4'}>
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-bold text-foreground">{emp.full_name}</p>
                              <p className="text-xs text-muted-foreground">{emp.position || group.meta.l}</p>
                            </div>
                            <Badge variant={emp.is_active ? 'success' : 'default'}>{emp.is_active ? 'Actif' : 'Inactif'}</Badge>
                          </div>
                          <div className="space-y-1 mb-3">
                            {emp.phone && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Phone size={11} />
                                <span>{emp.phone}</span>
                              </div>
                            )}
                            {emp.salary && <p className="text-xs text-muted-foreground">Salaire: {formatCurrency(emp.salary)}/mois</p>}
                            {emp.hire_date && <p className="text-xs text-muted-foreground">Depuis: {formatDate(emp.hire_date)}</p>}
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(emp)} className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-blue-50 transition-colors"><Edit size={13} /></button>
                            <button onClick={() => setDeleteId(emp.id)} className="p-1.5 text-muted-foreground hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

      <ConfirmDialog open={!!deleteId} title="Supprimer cet employé ?" description="Action irréversible."
        confirmLabel={deleting ? 'Suppression...' : 'Supprimer'} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
