import React from 'react';
import { AuditLogEntry } from '../types';
import { ShieldCheck, Search, Download, ChevronLeft, ChevronRight, AlertTriangle, Info, Terminal } from 'lucide-react';

interface AuditLogProps {
  logs: AuditLogEntry[];
}

export default function AuditLog({ logs }: AuditLogProps) {
  const [search, setSearch] = React.useState('');
  const [selectedLog, setSelectedLog] = React.useState<AuditLogEntry | null>(null);
  const [severityFilter, setSeverityFilter] = React.useState<'ALL' | 'INFO' | 'WARNING' | 'CRITICAL'>('ALL');
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 15;

  // Filter logs based on search + severity filter
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase());
    
    if (severityFilter === 'ALL') return matchesSearch;
    return matchesSearch && log.severity === severityFilter;
  });

  // Calculate pages
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Auto adjust page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, severityFilter]);

  const getSeverityIcon = (severity: AuditLogEntry['severity']) => {
    switch (severity) {
      case 'CRITICAL': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'WARNING': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: AuditLogEntry['severity']) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50';
      case 'WARNING': return 'text-orange-600 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50';
      default: return 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50';
    }
  };

  const exportLogs = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Date,Utilisateur,Action,Détails,Gravité\n"
      + filteredLogs.map(log => `${log.timestamp},${log.user},${log.action},"${log.details.replace(/"/g, '""')}",${log.severity}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-neutral-50 flex-1 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER SECTION */}
        <div className="bg-white border border-neutral-100 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-black text-white">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-black tracking-tighter uppercase">
                Journal d'Audit
              </h2>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">
                Surveillance administrative en temps réel • Sécurité Zara Gallery
              </p>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={exportLogs}
            className="self-start md:self-center bg-black hover:bg-neutral-800 text-white px-6 py-3.5 text-[10px] font-black uppercase tracking-widest transition shadow-md flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Exporter CSV ({filteredLogs.length})
          </button>
        </div>

        {/* CONTROLS: SEARCH & TABS */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-4 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Rechercher action, utilisateur, détails..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-neutral-200 text-xs font-bold uppercase tracking-wider outline-none focus:border-black transition-all"
            />
          </div>

          <div className="md:col-span-8 flex flex-wrap gap-2 justify-start md:justify-end">
            {(['ALL', 'INFO', 'WARNING', 'CRITICAL'] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setSeverityFilter(sev)}
                className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all border ${
                  severityFilter === sev
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-neutral-500 border-neutral-200 hover:text-black hover:border-neutral-500'
                }`}
              >
                {sev === 'ALL' ? `Tout (${logs.length})` : sev}
              </button>
            ))}
          </div>
        </div>

        {/* LOGS TABLE CONTAINER */}
        <div className="bg-white border border-neutral-100 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/50 border-b border-neutral-100">
                  <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400 w-48">Date & Heure</th>
                  <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400 w-36">Utilisateur</th>
                  <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400 w-44">Action</th>
                  <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">Détails de l'évènement</th>
                  <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400 text-right w-36">Gravité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100/50">
                {paginatedLogs.map((log) => (
                  <tr 
                    key={log.id} 
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-neutral-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="p-5">
                      <p className="text-[10px] font-mono font-bold text-neutral-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('fr-FR')}
                      </p>
                    </td>
                    <td className="p-5">
                      <p className="text-xs font-black uppercase tracking-tight text-neutral-900 group-hover:text-black">
                        {log.user}
                      </p>
                    </td>
                    <td className="p-5">
                      <span className="text-[8px] font-black px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-xs tracking-wider uppercase border border-neutral-200/40">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-5">
                      <p className="text-xs text-neutral-500 leading-relaxed font-medium truncate max-w-lg group-hover:text-neutral-800 dark:group-hover:text-neutral-200">
                        {log.details}
                      </p>
                    </td>
                    <td className="p-5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {getSeverityIcon(log.severity)}
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-sm tracking-widest uppercase ${getSeverityColor(log.severity)}`}>
                          {log.severity}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* EMPTY STATE */}
          {filteredLogs.length === 0 && (
            <div className="p-20 text-center text-neutral-400 uppercase tracking-widest text-xs font-bold bg-neutral-50/20">
              Aucun évènement correspondant
            </div>
          )}

          {/* PAGINATION PANEL */}
          {filteredLogs.length > 0 && (
            <div className="bg-neutral-50 border-t border-neutral-100 px-6 py-4 flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">
                Affichage {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredLogs.length)} sur {filteredLogs.length} logs
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4 text-neutral-600" />
                </button>
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-700 min-w-24 text-center">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4 text-neutral-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-neutral-950/85 z-[200] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
           <div className="bg-white text-black max-w-xl w-full border border-neutral-200 p-8 shadow-2xl animate-in zoom-in-95 duration-150 relative">
              <button 
                type="button"
                onClick={() => setSelectedLog(null)}
                className="absolute right-6 top-6 text-neutral-400 hover:text-black transition-colors"
              >
                ✕
              </button>
              
              <div className="mb-6 border-b border-neutral-100 pb-5">
                 <h3 className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.4em] mb-1">Rapport d'évènement de sécurité</h3>
                 <h2 className="text-2xl font-black uppercase tracking-tighter text-black flex items-center gap-2">
                   <Terminal className="w-5 h-5 text-neutral-400" /> {selectedLog.action}
                 </h2>
              </div>
              
              <div className="space-y-6">
                 <div className="grid grid-cols-2 gap-6">
                    <div>
                       <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Employé / Responsable</label>
                       <p className="text-base font-black uppercase tracking-tight">{selectedLog.user}</p>
                    </div>
                    <div>
                       <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Date exacte</label>
                       <p className="text-xs font-mono font-bold text-neutral-600">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                    </div>
                 </div>
                 
                 <div>
                    <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest block mb-2">Message système / Détails</label>
                    <div className="bg-neutral-50 p-5 border-l-2 border-black italic text-neutral-700 text-xs leading-relaxed font-medium">
                       {selectedLog.details}
                    </div>
                 </div>

                 <div className="pt-4 border-t border-neutral-100 flex justify-between items-center">
                    <span className={`text-[8px] font-black px-3 py-1 rounded-sm tracking-[0.2em] uppercase ${getSeverityColor(selectedLog.severity)}`}>
                       Gravité : {selectedLog.severity}
                    </span>
                    <button 
                      type="button"
                      onClick={() => setSelectedLog(null)}
                      className="text-[9px] font-black uppercase tracking-widest border-b border-black py-1 hover:text-neutral-500 transition-all"
                    >
                      Fermer
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
