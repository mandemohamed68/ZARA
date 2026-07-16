import React, { useState } from 'react';
import { Promotion } from '../types';
import { Image as ImageIcon, Plus, Trash2, Edit2, CheckCircle2, XCircle, X } from 'lucide-react';

interface PromotionManagerProps {
  promotions: Promotion[];
  setPromotions: React.Dispatch<React.SetStateAction<Promotion[]>>;
  settings?: any;
}

export default function PromotionManager({ promotions, setPromotions, settings }: PromotionManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'BANNER' | 'POPUP'>('BANNER');
  const [discountValue, setDiscountValue] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const promoData: Promotion = {
      id: editingPromo?.id || `PROMO-${Date.now()}`,
      title,
      type,
      discountValue: parseInt(discountValue) || 0,
      imageUrl,
      isActive: editingPromo ? editingPromo.isActive : true
    };

    if (editingPromo) {
      setPromotions(promotions.map(p => p.id === editingPromo.id ? promoData : p));
    } else {
      setPromotions([...promotions, promoData]);
    }
    closeModal();
  };

  const openModal = (promo?: Promotion) => {
    if (promo) {
      setEditingPromo(promo);
      setTitle(promo.title);
      setType(promo.type);
      setDiscountValue(promo.discountValue?.toString() || '');
      setImageUrl(promo.imageUrl);
    } else {
      setEditingPromo(null);
      setTitle('');
      setType('BANNER');
      setDiscountValue('');
      setImageUrl('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPromo(null);
  };

  const toggleStatus = (id: string) => {
    setPromotions(promotions.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
  };

  const deletePromo = (id: string) => {
    if (confirm("Supprimer cette promotion ?")) {
      setPromotions(promotions.filter(p => p.id !== id));
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-white flex-1 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-12 border-b border-neutral-100 pb-8">
          <div>
            <h2 className="text-4xl font-black text-black tracking-tighter uppercase mb-2 flex items-center gap-4">
              <ImageIcon className="w-10 h-10" /> Marketing & Pub
            </h2>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em]">Gestion des bannières et offres spéciales {settings?.storeName || 'ZARA GALLERY'}</p>
          </div>
          <button 
            onClick={() => openModal()}
            className="bg-black text-white px-8 py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-800 transition shadow-xl"
          >
            <Plus className="w-4 h-4 mr-2 inline" /> Créer Campagne
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {promotions.map(promo => (
            <div key={promo.id} className={`border-2 transition-all p-6 relative group ${promo.isActive ? 'border-black bg-white shadow-2xl' : 'border-neutral-100 bg-neutral-50 grayscale opacity-60'}`}>
              <div className="flex justify-between items-start mb-6">
                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-neutral-100">{promo.type}</span>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openModal(promo)} className="p-2 hover:bg-neutral-100 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deletePromo(promo.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              <h3 className="text-lg font-black uppercase tracking-tighter mb-2 leading-tight">{promo.title}</h3>
              {promo.discountValue && (
                <p className="text-3xl font-black text-black mb-4">-{promo.discountValue}%</p>
              )}
              
              <div className="mt-8 flex justify-between items-center bg-neutral-50 p-3">
                <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">Statut : {promo.isActive ? 'Actif' : 'Désactivé'}</span>
                <button 
                  onClick={() => toggleStatus(promo.id)}
                  className={`p-2 transition-colors ${promo.isActive ? 'text-green-600 hover:text-green-700' : 'text-neutral-400 hover:text-black'}`}
                >
                  {promo.isActive ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                </button>
              </div>
            </div>
          ))}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white max-w-xl w-full p-10 border-2 border-black animate-in zoom-in duration-150 relative">
               <button onClick={closeModal} className="absolute right-6 top-6 text-neutral-400 hover:text-black transition-colors">
                  <X className="w-6 h-6" />
               </button>
               
               <h3 className="text-2xl font-black uppercase tracking-tighter mb-8">Configurer la Campagne</h3>

               <form onSubmit={handleSave} className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] block mb-2">Titre de l'Offre</label>
                    <input 
                      required
                      type="text" 
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full text-lg font-black py-3 border-b-2 border-neutral-100 focus:border-black outline-none transition-all uppercase"
                      placeholder="Ex: SOLDES DE PRINTEMPS"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] block mb-2">Type d'affichage</label>
                      <select 
                        value={type}
                        onChange={e => setType(e.target.value as any)}
                        className="w-full bg-neutral-50 p-4 text-[10px] font-black uppercase tracking-widest outline-none border-b-2 border-neutral-100 focus:border-black"
                      >
                         <option value="BANNER">Bannière Fixe</option>
                         <option value="POPUP">Notification Popup</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] block mb-2">Valeur Remise (%)</label>
                      <input 
                        type="number" 
                        value={discountValue}
                        onChange={e => setDiscountValue(e.target.value)}
                        className="w-full bg-neutral-50 p-4 text-xs font-black outline-none border-b-2 border-neutral-100 focus:border-black"
                        placeholder="10"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-black text-white py-5 text-[11px] font-black uppercase tracking-[0.3em] hover:bg-neutral-800 transition shadow-2xl mt-8"
                  >
                    Enregistrer et Publier
                  </button>
               </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
