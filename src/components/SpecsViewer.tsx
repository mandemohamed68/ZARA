import React from 'react';
import { documentSections } from '../constants';
import { FileText, Printer } from 'lucide-react';

export default function SpecsViewer() {
  return (
    <div className="h-full overflow-y-auto bg-gray-50 flex-1 p-6 print:p-0">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 print:border-none print:shadow-none">
        
        <div className="flex justify-between items-center mb-10 pb-8 border-b border-gray-200">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Cahier des Charges</h1>
            <p className="text-lg text-gray-500 mt-2">Spécifications pour la Création du Logiciel de Caisse</p>
          </div>
          <button onClick={() => window.print()} className="px-5 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 font-bold flex items-center print:hidden transition">
            <Printer className="w-5 h-5 mr-2" /> Imprimer Document
          </button>
        </div>

        {documentSections.map((section, index) => (
          <div key={section.id} id={section.id} className={`scroll-mt-24 ${index !== 0 ? 'mt-14 pt-10 border-t border-gray-100' : ''}`}>
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 mr-4 border border-indigo-100">
                {section.icon}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{section.title}</h2>
            </div>
            <div className="prose prose-indigo prose-sm sm:prose-base max-w-none text-gray-600 leading-relaxed">
              {section.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
