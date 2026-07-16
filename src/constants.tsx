import React from 'react';
import { 
  BookOpen, Target, Users, ShoppingCart, Package, 
  BarChart3, Settings, ShieldCheck, HardDrive, CalendarDays 
} from 'lucide-react';

export interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export const documentSections: Section[] = [
  {
    id: 'presentation',
    title: '1. Présentation du Projet',
    icon: <BookOpen className="w-5 h-5" />,
    content: (
      <div className="space-y-4 text-gray-700">
        <p>
          Ce cahier des charges définit les spécifications fonctionnelles et techniques pour la création d'un <strong>logiciel de gestion de caisse (Point of Sale - POS)</strong> moderne, intuitif et complet, destiné au secteur du commerce de détail (magasins de vente).
        </p>
        <p>
          Le logiciel a pour but de centraliser l'encaissement, la gestion des stocks, le suivi des performances commerciales et la fidélisation client au sein d'une interface unique. Il se veut facile d'utilisation pour limiter le temps de formation des vendeurs tout en offrant des fonctionnalités avancées pour la gestion back-office.
        </p>
        <div className="bg-blue-50 p-4 border border-blue-100 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">Périmètre du projet :</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-900">
            <li>Module Front-office : Terminal d'encaissement (POS).</li>
            <li>Module Back-office : Gestion de stock, achats, et statistiques.</li>
            <li>Support multi-périphériques (Caisse tactile, tablette, PC).</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'objectifs',
    title: '2. Objectifs Stratégiques',
    icon: <Target className="w-5 h-5" />,
    content: (
      <div className="space-y-4 text-gray-700">
        <ul className="space-y-4">
          <li className="flex items-start">
            <span className="flex items-center justify-center bg-gray-100 rounded-full w-8 h-8 mr-3 shrink-0 font-bold text-gray-700">1</span>
            <div>
              <strong className="block text-gray-900">Fluidifier le passage en caisse</strong>
              Réduire le temps d'attente des clients grâce à une interface d'encaissement réactive, la lecture de codes-barres rapide et la gestion simplifiée des paiements.
            </div>
          </li>
          <li className="flex items-start">
            <span className="flex items-center justify-center bg-gray-100 rounded-full w-8 h-8 mr-3 shrink-0 font-bold text-gray-700">2</span>
            <div>
              <strong className="block text-gray-900">Optimiser la gestion des stocks</strong>
              Suivre l'inventaire en temps réel pour éviter les ruptures de stock ou le sur-stockage, et automatiser les processus de réapprovisionnement.
            </div>
          </li>
          <li className="flex items-start">
            <span className="flex items-center justify-center bg-gray-100 rounded-full w-8 h-8 mr-3 shrink-0 font-bold text-gray-700">3</span>
            <div>
              <strong className="block text-gray-900">Générer des données analytiques</strong>
              Offrir aux gérants une visibilité immédiate sur les indicateurs de performance (CA, marges, top ventes) pour faciliter la prise de décision.
            </div>
          </li>
        </ul>
      </div>
    )
  },
  {
    id: 'utilisateurs',
    title: '3. Profils Utilisateurs',
    icon: <Users className="w-5 h-5" />,
    content: (
      <div className="space-y-6 text-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-5 shadow-sm bg-white">
            <h3 className="font-semibold text-lg text-gray-900 mb-2 border-b pb-2">Vendeur / Caissier</h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Accès restreint au module d'encaissement.</li>
              <li>Création de tickets, ajout de produits, rendu de monnaie.</li>
              <li>Saisie des informations clients pour la fidélité.</li>
              <li>Clôture de caisse simplifiée (Ticket X et Z).</li>
            </ul>
          </div>
          <div className="border border-gray-200 rounded-lg p-5 shadow-sm bg-white">
            <h3 className="font-semibold text-lg text-gray-900 mb-2 border-b pb-2">Manager (Chef de magasin)</h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Mêmes droits que le caissier + Annulation de tickets complexes.</li>
              <li>Application de remises exceptionnelles.</li>
              <li>Gestion des stocks au jour le jour et des retours clients.</li>
              <li>Accès au dashboard de la boutique.</li>
            </ul>
          </div>
          <div className="border border-gray-200 rounded-lg p-5 shadow-sm bg-white md:col-span-2">
            <h3 className="font-semibold text-lg text-gray-900 mb-2 border-b pb-2">Administrateur / Gérant</h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Droits complets sur le système (Back-office et Front-office).</li>
              <li>Création des profils utilisateurs et gestion des permissions.</li>
              <li>Gestion du catalogue, des prix et des règles de TVA.</li>
              <li>Export comptable et accès aux statistiques globales.</li>
            </ul>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'fonctionnalites',
    title: '4. Périmètre Fonctionnel',
    icon: <Settings className="w-5 h-5" />,
    content: (
      <div className="space-y-6 text-gray-700">
        
        {/* Module de Caisse */}
        <div>
          <h3 className="flex items-center text-lg font-semibold text-indigo-700 mb-3">
            <ShoppingCart className="w-5 h-5 mr-2" />
            4.1. Module d'Encaissement (Front-Office)
          </h3>
          <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li><strong>Ajout de produits :</strong> Via Scan de code-barres, recherche par nom, ou boutons favoris (produits sans code-barres).</li>
              <li><strong>Paiement multi-médias :</strong> Espèces, Carte Bancaire, Chèque, Carte cadeau, Avoir, paiement combiné.</li>
              <li><strong>Opérations courantes :</strong> Remise (%, €), mise en attente du ticket, annulation de ligne, remboursement.</li>
              <li><strong>Édition :</strong> Impression du ticket de caisse, envoi par e-mail ou SMS (Ticket Dématérialisé).</li>
              <li><strong>Gestion des retours :</strong> Conversion d'article retourné en avoir ou remboursement.</li>
            </ul>
          </div>
        </div>

        {/* Module Catalogue et Stock */}
        <div>
          <h3 className="flex items-center text-lg font-semibold text-indigo-700 mb-3">
            <Package className="w-5 h-5 mr-2" />
            4.2. Gestion du Catalogue et des Stocks
          </h3>
          <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li><strong>Base articles :</strong> Création de fiches produits (Nom, prix HT/TTC, catégorie, TVA, code-barres, fournisseur).</li>
              <li><strong>Variantes :</strong> Gestion des déclinaisons (Tailles, Couleurs).</li>
              <li><strong>Gestion des Stocks :</strong> Suivi des quantités en temps réel, mouvements d'entrée/sortie.</li>
              <li><strong>Alertes :</strong> Notification de stock bas / rupture imminente.</li>
              <li><strong>Inventaire :</strong> Module de saisie pour inventaire annuel ou tournant, génération d'écarts de stock.</li>
            </ul>
          </div>
        </div>

        {/* Module CRM */}
        <div>
          <h3 className="flex items-center text-lg font-semibold text-indigo-700 mb-3">
            <Users className="w-5 h-5 mr-2" />
            4.3. Fidélité et Clients (CRM)
          </h3>
          <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Création de fiches clients rapides en caisse (Nom, Téléphone, Email).</li>
              <li>Historique des achats rattaché au client (Pratique pour le SAV).</li>
              <li>Gestion de points de fidélité ou d'une cagnotte (ex: 1€ = 1 point).</li>
              <li>Génération de bons de réduction selon des paliers.</li>
            </ul>
          </div>
        </div>

        {/* Module Dashboard et Compta */}
        <div>
          <h3 className="flex items-center text-lg font-semibold text-indigo-700 mb-3">
            <BarChart3 className="w-5 h-5 mr-2" />
            4.4. Statistiques, Clôture et Comptabilité
          </h3>
          <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li><strong>Dashboard :</strong> CA du jour en temps réel, nombre de ventes, panier moyen.</li>
              <li><strong>Clôture de Caisse :</strong> Impression du ticket X (lecture) et ticket Z (clôture comptable), comptage du fond de caisse.</li>
              <li><strong>Palmarès :</strong> Statistiques des produits les plus vendus / les plus rentables.</li>
              <li><strong>Exports :</strong> Exportation des données (CSV/Excel) formatées pour le logiciel du comptable (répartition de la TVA).</li>
            </ul>
          </div>
        </div>

      </div>
    )
  },
  {
    id: 'technique',
    title: '5. Exigences Techniques et Matérielles',
    icon: <HardDrive className="w-5 h-5" />,
    content: (
      <div className="space-y-4 text-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 border border-gray-200 rounded-md">
            <h4 className="font-semibold block mb-2 text-gray-900 border-b pb-1">Architecture</h4>
            <p className="text-sm">Le logiciel privilégiera une architecture <strong>Cloud / SaaS (Web et application locale)</strong> centralisant les données, avec impérativement un mode de <strong>fonctionnement hors-ligne (Offline-first)</strong> permettant d'encaisser même sans connexion internet (synchronisation différée).</p>
          </div>
          <div className="bg-white p-4 border border-gray-200 rounded-md">
            <h4 className="font-semibold block mb-2 text-gray-900 border-b pb-1">Compatibilité Matérielle</h4>
            <p className="text-sm">Le terminal (Front-Office) doit s'interfacer avec les périphériques locaux standards :</p>
            <ul className="list-disc list-inside text-sm mt-2 text-gray-600">
              <li>Écrans tactiles (Windows/iOS/Android).</li>
              <li>Tiroirs-caisses (ouverture via USB/RJ11).</li>
              <li>Imprimantes tickets thermiques (ex: Epson, Citizen).</li>
              <li>Lecteurs / Douchettes codes-barres 1D/2D.</li>
              <li>Terminaux de Paiement Électronique (TPE).</li>
            </ul>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'securite',
    title: '6. Sécurité et Cadre Légal',
    icon: <ShieldCheck className="w-5 h-5" />,
    content: (
      <div className="space-y-4 text-gray-700">
        <ul className="space-y-3">
          <li className="bg-orange-50 p-4 border-l-4 border-orange-500 rounded-r-md">
            <h4 className="font-bold text-orange-800">Inaltérabilité des données</h4>
            <p className="text-sm text-orange-900 mt-1">Conformité stricte aux lois de finances (selon le pays, ex: norme NF525 en France). Les données d'encaissement et tickets validés doivent être inaltérables, sécurisés, archivés. Toute modification / annulation doit générer une trace (log) irréversible.</p>
          </li>
          <li className="bg-blue-50 p-4 border-l-4 border-blue-500 rounded-r-md">
            <h4 className="font-bold text-blue-800">Conformité RGPD</h4>
            <p className="text-sm text-blue-900 mt-1">Les données clients récoltées pour la fidélité doivent pouvoir être anonymisées ou supprimées sur demande. Gestion du consentement explicite pour l'envoi de SMS/Emails marketing.</p>
          </li>
          <li className="bg-gray-50 p-4 border-l-4 border-gray-500 rounded-r-md">
            <h4 className="font-bold text-gray-800">Sauvegarde et Continuité</h4>
            <p className="text-sm text-gray-900 mt-1">Des sauvegardes automatiques de la base de données doivent être effectuées de manière journalière sur des serveurs distants cryptés pour prévenir toute perte de données en cas de panne matérielle.</p>
          </li>
        </ul>
      </div>
    )
  },
  {
    id: 'livrables',
    title: '7. Phasage et Livrables',
    icon: <CalendarDays className="w-5 h-5" />,
    content: (
      <div className="text-gray-700 text-sm">
        <div className="relative border-l border-gray-200 ml-3 pl-6 space-y-6">
          <div className="relative">
            <div className="absolute -left-[30px] top-1 bg-indigo-600 w-3 h-3 rounded-full border-4 border-indigo-100"></div>
            <h4 className="font-bold text-gray-900 text-base">Phase 1 : Cadrage et UX/UI Design</h4>
            <p className="mt-1">Validation de l'arborescence, maquettes fil-de-fer (wireframes), validation de l'interface de caisse (optimisation tactile), création du design system.</p>
          </div>
          <div className="relative">
             <div className="absolute -left-[30px] top-1 bg-indigo-600 w-3 h-3 rounded-full border-4 border-indigo-100"></div>
            <h4 className="font-bold text-gray-900 text-base">Phase 2 : Développement du Core System</h4>
            <p className="mt-1">Back-end, base de données, gestion du catalogue, interface Vendeur (Encaissement de base).</p>
          </div>
          <div className="relative">
             <div className="absolute -left-[30px] top-1 bg-indigo-600 w-3 h-3 rounded-full border-4 border-indigo-100"></div>
            <h4 className="font-bold text-gray-900 text-base">Phase 3 : Interface Matérielle & Hors-ligne</h4>
            <p className="mt-1">Connexion des périphériques (Imprimante, douchette). Mise en place du stockage local pour le mode hors-ligne.</p>
          </div>
          <div className="relative">
             <div className="absolute -left-[30px] top-1 bg-indigo-600 w-3 h-3 rounded-full border-4 border-indigo-100"></div>
            <h4 className="font-bold text-gray-900 text-base">Phase 4 : Tests & Déploiement Bêta</h4>
            <p className="mt-1">Installation sur un poste pilote réel. Formation de l'équipe restreinte, test de robustesse sur une journée de charge.</p>
          </div>
           <div className="relative">
             <div className="absolute -left-[30px] top-1 bg-indigo-600 w-3 h-3 rounded-full border-4 border-indigo-100"></div>
            <h4 className="font-bold text-gray-900 text-base">Phase 5 : Déploiement final</h4>
            <p className="mt-1">Livraison V1, code source, documentation technique et manuels d'utilisation. Début de la TMA (Tierce Maintenance Applicative).</p>
          </div>
        </div>
      </div>
    )
  }
];
