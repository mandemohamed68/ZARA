import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, User } from '../types';
import { MessageSquare, Send, X, Shield, Users } from 'lucide-react';

interface ChatProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  currentUser: User;
  users: User[];
}

export default function Chat({ isOpen, onClose, messages, setMessages, currentUser, users }: ChatProps) {
  const [inputText, setInputText] = useState('');
  const [activeTarget, setActiveTarget] = useState<string>('GLOBAL'); // 'GLOBAL', 'AUDIT' (Admin), or userId
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, activeTarget]);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (activeTarget === 'AUDIT') return; // Cannot send in audit mode

    const newMessage: ChatMessage = {
      id: `MSG-${Date.now()}`,
      senderId: currentUser.id,
      receiverId: activeTarget,
      text: inputText,
      timestamp: new Date().toISOString()
    };

    setMessages([...messages, newMessage]);
    setInputText('');
  };

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Inconnu';
  
  const isAdmin = currentUser.role === 'ADMIN';

  // Filter messages based on active target
  const displayMessages = messages.filter(msg => {
    const isGlobalMsg = !msg.receiverId || msg.receiverId === 'GLOBAL';
    
    if (activeTarget === 'GLOBAL') {
      return isGlobalMsg;
    } else if (activeTarget === 'AUDIT' && isAdmin) {
      return !isGlobalMsg; // Show all direct messages
    } else {
      // Direct message between currentUser and activeTarget
      return (
        (msg.senderId === currentUser.id && msg.receiverId === activeTarget) ||
        (msg.senderId === activeTarget && msg.receiverId === currentUser.id)
      );
    }
  });

  return (
    <div className="fixed inset-y-0 right-0 w-80 lg:w-96 bg-white shadow-[0_0_50px_rgba(0,0,0,0.15)] z-[110] border-l border-neutral-100 flex flex-col animate-in slide-in-from-right-full duration-300">
      
      {/* Header */}
      <div className="h-24 bg-black text-white px-8 flex items-center justify-between shadow-lg">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neutral-900 flex items-center justify-center rounded-sm">
               <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
               <h3 className="text-sm font-black uppercase tracking-widest leading-none">Intercom Zara</h3>
               <p className="text-[10px] text-neutral-500 font-bold uppercase mt-1 tracking-widest">Échanges Discrets</p>
            </div>
         </div>
         <button onClick={onClose} className="p-2 hover:bg-neutral-900 rounded-full transition-colors">
            <X className="w-5 h-5" />
         </button>
      </div>

      {/* Target Selector */}
      <div className="bg-neutral-100 border-b border-neutral-200 flex overflow-x-auto hide-scrollbar">
         <button 
           onClick={() => setActiveTarget('GLOBAL')}
           className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-colors flex items-center gap-2 ${activeTarget === 'GLOBAL' ? 'bg-white text-black border-b-2 border-black' : 'text-neutral-500 hover:text-black'}`}
         >
           <Users className="w-3 h-3" />
           Général
         </button>
         
         {isAdmin && (
           <button 
             onClick={() => setActiveTarget('AUDIT')}
             className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-colors flex items-center gap-1 ${activeTarget === 'AUDIT' ? 'bg-red-50 text-red-600 border-b-2 border-red-600' : 'text-neutral-500 hover:text-red-500'}`}
           >
             <Shield className="w-3 h-3" />
             Audit
           </button>
         )}

         {users.filter(u => u.id !== currentUser.id && u.isActive).map(u => (
           <button 
             key={u.id}
             onClick={() => setActiveTarget(u.id)}
             className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-colors ${activeTarget === u.id ? 'bg-white text-black border-b-2 border-black' : 'text-neutral-500 hover:text-black'}`}
           >
             {u.name}
           </button>
         ))}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-neutral-50/50 flex flex-col hide-scrollbar">
         {displayMessages.length === 0 && (
           <div className="flex-1 flex flex-col items-center justify-center text-neutral-300 opacity-50 px-10 text-center">
              <MessageSquare className="w-12 h-12 mb-4" />
              <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">Aucun message pour le moment.</p>
           </div>
         )}
         
         {displayMessages.map((msg) => {
           const isMine = msg.senderId === currentUser.id;
           // If in audit mode, show different alignment based on sender so it's not all one side
           const isAudit = activeTarget === 'AUDIT';
           const alignRight = isAudit ? false : isMine;
           
           return (
             <div key={msg.id} className={`flex flex-col ${alignRight ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-end gap-2 max-w-[95%] ${alignRight ? 'flex-row-reverse' : 'flex-row'}`}>
                   <div className={`p-4 text-xs font-medium leading-relaxed shadow-sm ${alignRight ? 'bg-black text-white rounded-t-xl rounded-bl-xl' : 'bg-white text-black border border-neutral-100 rounded-t-xl rounded-br-xl'}`}>
                      {msg.text}
                   </div>
                </div>
                <div className={`flex gap-2 items-center mt-1.5 ${alignRight ? 'justify-end' : 'justify-start'}`}>
                   <p className={`text-[8px] font-black uppercase tracking-widest ${alignRight ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      {isAudit ? `${getUserName(msg.senderId)} ➔ ${getUserName(msg.receiverId || '')}` : getUserName(msg.senderId)} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   </p>
                </div>
             </div>
           );
         })}
      </div>

      {/* Input */}
      {activeTarget !== 'AUDIT' ? (
        <form onSubmit={handleSend} className="p-6 bg-white border-t border-neutral-100 flex items-center gap-4">
           <input 
             type="text" 
             value={inputText}
             onChange={(e) => setInputText(e.target.value)}
             placeholder={activeTarget === 'GLOBAL' ? "Message général..." : `Message à ${getUserName(activeTarget)}...`}
             className="flex-1 bg-neutral-50 border-none px-6 py-4 text-[11px] font-bold outline-none focus:ring-1 focus:ring-black transition-all rounded-sm uppercase tracking-wider"
           />
           <button 
             type="submit" 
             disabled={!inputText.trim()}
             className="p-4 bg-black text-white hover:bg-neutral-800 disabled:opacity-20 transition-all shadow-xl rounded-sm"
           >
              <Send className="w-4 h-4" />
           </button>
        </form>
      ) : (
        <div className="p-6 bg-red-50 border-t border-red-100 text-center">
           <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">Mode Lecture Seule (Audit)</p>
        </div>
      )}
    </div>
  );
}
