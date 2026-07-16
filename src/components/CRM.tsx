import React, { useState } from 'react';
import { Customer, Order, getVipStatus } from '../types';
import { Users2, Search, History as HistoryIcon, Star, Phone, Plus, X } from 'lucide-react';

interface CRMProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  orders: Order[];
  settings?: any;
}

export default function CRM({ customers, setCustomers, orders, settings }: CRMProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // New Customer Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    if (!matchesSearch) return false;
    if (filterStatus === 'ACTIVE') return !c.suspended;
    if (filterStatus === 'SUSPENDED') return !!c.suspended;
    return true;
  });

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const newCust: Customer = {
      id: `CUST-${Date.now()}`,
      name: newName,
      phone: newPhone,
      loyaltyPoints: 0,
      totalSpent: 0
    };
    setCustomers([...customers, newCust]);
    setNewName('');
    setNewPhone('');
    setIsModalOpen(false);
  };

  const formatFCFA = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount);
  };

  const getCustomerOrders = (phone: string) => {
    return orders.filter(o => o.customer?.phone === phone);
  };

  const handleToggleSuspendCustomer = (cust: Customer) => {
    const updated = customers.map(c => c.id === cust.id ? { ...c, suspended: !c.suspended } : c);
    setCustomers(updated);
    setSelectedCustomer({ ...cust, suspended: !cust.suspended });
  };

  const handleDeleteCustomer = (cust: Customer) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le client ${cust.name} ? Cette action est irréversible.`)) return;
    const updated = customers.filter(c => c.id !== cust.id);
    setCustomers(updated);
    setSelectedCustomer(null);
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-white flex-1 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-12 border-b border-neutral-100 pb-8">
          <div>
            <h2 className="text-4xl font-black text-black tracking-tighter uppercase mb-2 flex items-center gap-4">
              <Users2 className="w-10 h-10" /> Portfolio Clients
            </h2>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em]">Gestion de la fidélité et historisation des achats</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-black text-white px-8 py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-800 transition shadow-xl"
          >
            <Plus className="w-4 h-4 mr-2 inline" /> Nouveau Client
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          
          {/* List Section */}
          <div className="md:col-span-2">
            <div className="mb-4 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input 
                type="text" 
                placeholder="Rechercher par nom ou téléphone..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-neutral-50 border-none text-xs font-bold uppercase tracking-wider outline-none focus:ring-1 focus:ring-black transition-all"
              />
            </div>

            <div className="flex gap-4 mb-8 border-b border-neutral-100 pb-2">
              <button 
                onClick={() => setFilterStatus('ALL')}
                className={`pb-2 px-1 text-[9px] font-black uppercase tracking-[0.15em] border-b-2 transition-all ${filterStatus === 'ALL' ? 'border-black text-black' : 'border-transparent text-neutral-400 hover:text-black'}`}
              >
                Tous ({customers.length})
              </button>
              <button 
                onClick={() => setFilterStatus('ACTIVE')}
                className={`pb-2 px-1 text-[9px] font-black uppercase tracking-[0.15em] border-b-2 transition-all ${filterStatus === 'ACTIVE' ? 'border-black text-black' : 'border-transparent text-neutral-400 hover:text-black'}`}
              >
                Actifs ({customers.filter(c => !c.suspended).length})
              </button>
              <button 
                onClick={() => setFilterStatus('SUSPENDED')}
                className={`pb-2 px-1 text-[9px] font-black uppercase tracking-[0.15em] border-b-2 transition-all ${filterStatus === 'SUSPENDED' ? 'border-red-600 text-red-600' : 'border-transparent text-neutral-400 hover:text-red-500'}`}
              >
                Suspendus ({customers.filter(c => c.suspended).length})
              </button>
            </div>

            <div className="space-y-4">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map(cust => (
                  <div 
                    key={cust.id} 
                    onClick={() => setSelectedCustomer(cust)}
                    className={`p-6 border-2 transition-all cursor-pointer group rounded-none flex justify-between items-center ${
                      selectedCustomer?.id === cust.id 
                        ? 'border-black bg-white shadow-2xl scale-[1.02]' 
                        : cust.suspended 
                          ? 'border-red-100 bg-red-50/20 opacity-75 hover:bg-red-50/35 hover:border-red-200'
                          : 'border-neutral-50 bg-neutral-50 hover:bg-white hover:border-neutral-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                       <div className={`w-12 h-12 flex items-center justify-center font-black text-lg ${cust.suspended ? 'bg-red-900 text-white' : 'bg-black text-white'}`}>
                          {cust.name.charAt(0)}
                       </div>
                       <div>
                          <h4 className="font-black uppercase tracking-tighter text-black flex items-center gap-2">
                            {cust.name}
                            {cust.suspended && (
                              <span className="bg-red-600 text-white px-2 py-0.5 text-[8px] font-black rounded-xs uppercase tracking-widest">
                                Suspendu
                              </span>
                            )}
                          </h4>
                          <p className="text-[10px] font-bold text-neutral-400 uppercase flex items-center gap-2 tracking-widest">
                             <Phone className="w-3 h-3" /> {cust.phone}
                          </p>
                       </div>
                    </div>
                    <div className="text-right font-bold uppercase transition-colors">
                       <p className={`text-xs font-black flex items-center justify-end gap-2 uppercase tracking-widest ${cust.suspended ? 'text-red-700' : 'text-black'}`}>
                          <Star className={`w-3 h-3 ${cust.suspended ? 'text-red-400 fill-red-400' : 'text-amber-500 fill-amber-500'}`} /> {cust.loyaltyPoints} Points
                       </p>
                       <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mt-1">
                          Total Achat : {formatFCFA(cust.totalSpent)}
                       </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 border-2 border-dashed border-neutral-100 text-neutral-300">
                  <Users2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-[10px] font-bold uppercase tracking-widest italic">Aucun client trouvé pour cette sélection</p>
                </div>
              )}
            </div>
          </div>

          {/* Details Section */}
          <div className="bg-neutral-50 p-8 border-l border-neutral-100 flex flex-col h-fit sticky top-0">
             {selectedCustomer ? (
               <div className="animate-in slide-in-from-right-4 duration-300">
                  <div className="text-center mb-10 pb-10 border-b border-neutral-200">
                     <div className="w-24 h-24 bg-black text-white rounded-full flex items-center justify-center font-black text-3xl mx-auto mb-6 shadow-2xl">
                        {selectedCustomer.name.charAt(0)}
                     </div>
                     <h3 className="text-2xl font-black uppercase tracking-tighter text-black">{selectedCustomer.name}</h3>
                     <div className="mt-4 flex justify-center">
                        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${getVipStatus(selectedCustomer.loyaltyPoints).color}`}>
                           MEMBRE {getVipStatus(selectedCustomer.loyaltyPoints).tier} {getVipStatus(selectedCustomer.loyaltyPoints).discount > 0 && `(-${getVipStatus(selectedCustomer.loyaltyPoints).discount}%)`}
                        </span>
                     </div>
                  </div>

                  <div className="space-y-8">
                     <div>
                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                           <HistoryIcon className="w-3 h-3" /> Historique des Transactions
                        </p>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                           {getCustomerOrders(selectedCustomer.phone).length > 0 ? (
                             getCustomerOrders(selectedCustomer.phone).map(order => (
                               <div key={order.id} className="bg-white p-3 border border-neutral-100 flex justify-between items-center text-[10px]">
                                  <div>
                                     <p className="font-black text-black">#{order.id}</p>
                                     <p className="text-neutral-400">{new Date(order.date).toLocaleDateString()}</p>
                                  </div>
                                  <p className="font-black text-black">{formatFCFA(order.total)}</p>
                               </div>
                             ))
                           ) : (
                             <p className="text-[9px] font-bold text-neutral-300 uppercase italic">Aucun achat enregistré à {settings?.storeName || 'ZARA GALLERY'}</p>
                           )}
                        </div>
                     </div>

                     <div className="bg-black p-6 text-white text-center">
                        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.3em] mb-2 font-mono">Rang Fidélité</p>
                        <p className="text-xl font-black uppercase tracking-tighter">Membre {getVipStatus(selectedCustomer.loyaltyPoints).tier}</p>
                        <div className="w-full h-1 bg-white/10 mt-4 rounded-full overflow-hidden">
                           <div className="h-full bg-white transition-all duration-300" style={{ width: `${selectedCustomer.loyaltyPoints < 300 ? (selectedCustomer.loyaltyPoints / 300) * 100 : selectedCustomer.loyaltyPoints < 800 ? ((selectedCustomer.loyaltyPoints - 300) / 500) * 100 : selectedCustomer.loyaltyPoints < 1500 ? ((selectedCustomer.loyaltyPoints - 800) / 700) * 100 : 100}%` }}></div>
                        </div>
                        <p className="text-[9px] font-bold text-neutral-400 mt-2 uppercase">
                           {selectedCustomer.loyaltyPoints < 300
                             ? `Encore ${300 - selectedCustomer.loyaltyPoints} points pour devenir membre SILVER`
                             : selectedCustomer.loyaltyPoints < 800
                             ? `Encore ${800 - selectedCustomer.loyaltyPoints} points pour devenir membre GOLD`
                             : selectedCustomer.loyaltyPoints < 1500
                             ? `Encore ${1500 - selectedCustomer.loyaltyPoints} points pour devenir membre PLATINIUM`
                             : 'Niveau VIP maximum atteint'}
                        </p>
                     </div>

                     <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-200">
                        <button
                           onClick={() => handleToggleSuspendCustomer(selectedCustomer)}
                           className={`py-3 px-4 text-[9px] font-black uppercase tracking-[0.15em] transition-all rounded-none border ${
                              selectedCustomer.suspended
                                 ? 'bg-neutral-900 border-neutral-900 text-white hover:bg-black'
                                 : 'bg-amber-500 border-amber-500 text-black hover:bg-amber-600'
                           }`}
                        >
                           {selectedCustomer.suspended ? 'Réactiver Account' : 'Suspendre Client'}
                        </button>
                        <button
                           onClick={() => handleDeleteCustomer(selectedCustomer)}
                           className="bg-red-600 border border-red-600 text-white py-3 px-4 text-[9px] font-black uppercase tracking-[0.15em] hover:bg-red-700 transition-all rounded-none"
                        >
                           Supprimer
                        </button>
                     </div>
                  </div>
               </div>
             ) : (
               <div className="text-center py-20 text-neutral-300">
                  <Users2 className="w-16 h-16 mx-auto mb-6 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-widest italic">Sélectionner un client pour voir son historique {settings?.storeName || 'ZARA GALLERY'}</p>
               </div>
             )}
          </div>

        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white max-w-xl w-full p-10 border-2 border-black animate-in zoom-in duration-150 relative">
               <button onClick={() => setIsModalOpen(false)} className="absolute right-6 top-6 text-neutral-400 hover:text-black transition-colors">
                  <X className="w-6 h-6" />
               </button>
               
               <h3 className="text-2xl font-black uppercase tracking-tighter mb-8">Enregistrer Nouveau Client</h3>

               <form onSubmit={handleAddCustomer} className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] block mb-2">Nom Complet</label>
                    <input 
                      required
                      type="text" 
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      className="w-full text-lg font-black py-3 border-b-2 border-neutral-100 focus:border-black outline-none transition-all uppercase"
                      placeholder="Ex: Moussa Konaté"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] block mb-2">Numéro Téléphone</label>
                    <input 
                      required
                      type="tel" 
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value)}
                      className="w-full text-lg font-black py-3 border-b-2 border-neutral-100 focus:border-black outline-none transition-all"
                      placeholder="Ex: 70000000"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-black text-white py-5 text-[11px] font-black uppercase tracking-[0.3em] hover:bg-neutral-800 transition shadow-2xl mt-8"
                  >
                    Valider l'Inscription
                  </button>
               </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
