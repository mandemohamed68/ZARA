import React, { useState, useEffect, useRef } from "react";
import {
  User,
  Role,
  AppSettings,
  Product,
  Order,
  Customer,
  Promotion,
  CashMovement,
  AuditLogEntry,
  ProductMovement,
} from "../types";
import { Wholesaler, WholesaleOrder } from "../types_wholesale";
import {
  Users,
  UserPlus,
  Shield,
  Key,
  Trash2,
  Edit2,
  X,
  Check,
  Clock,
  Lock as LockIcon,
  Unlock,
  Settings2,
  ShieldCheck,
  ShieldAlert,
  ShoppingCart,
  History as HistoryIcon,
  Upload,
  Database,
  RefreshCw,
  FolderDown,
  FileSpreadsheet,
  HardDrive,
  AlertTriangle,
  Layers,
  Terminal,
} from "lucide-react";
import { uploadImage } from "../utils/fileHelper";

interface TeamManagementProps {
  users: User[];
  setUsers: (u: User[]) => void;
  currentUser: User;
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
  onDownloadBackup: () => void;
  products: Product[];
  setProducts: (p: Product[]) => void;
  orders: Order[];
  setOrders: (o: Order[]) => void;
  customers: Customer[];
  setCustomers: (c: Customer[]) => void;
  promotions: Promotion[];
  setPromotions: (p: Promotion[]) => void;
  cashMovements: CashMovement[];
  setCashMovements: (cm: CashMovement[]) => void;
  auditLogs: AuditLogEntry[];
  setAuditLogs: (a: AuditLogEntry[]) => void;
  stockMovements: ProductMovement[];
  setStockMovements: (sm: ProductMovement[]) => void;
  wholesalers: Wholesaler[];
  setWholesalers: (w: Wholesaler[]) => void;
  wholesaleOrders: WholesaleOrder[];
  setWholesaleOrders: (wo: WholesaleOrder[]) => void;
  currentSession: any;
  setCurrentSession: (s: any) => void;
  sessionsHistory: any[];
  setSessionsHistory: (sh: any[]) => void;
  messages: any[];
  setMessages: (m: any[]) => void;
  pendingTickets: any[];
  setPendingTickets: (pt: any[]) => void;
}

export default function TeamManagement({
  users,
  setUsers,
  currentUser,
  settings,
  setSettings,
  onDownloadBackup,
  products,
  setProducts,
  orders,
  setOrders,
  customers,
  setCustomers,
  promotions,
  setPromotions,
  cashMovements,
  setCashMovements,
  auditLogs,
  setAuditLogs,
  stockMovements,
  setStockMovements,
  wholesalers,
  setWholesalers,
  wholesaleOrders,
  setWholesaleOrders,
  currentSession,
  setCurrentSession,
  sessionsHistory,
  setSessionsHistory,
  messages,
  setMessages,
  pendingTickets,
  setPendingTickets,
}: TeamManagementProps) {
  const [activeTab, setActiveTab] = useState<"TEAM" | "SETTINGS" | "DATABASE">(
    "TEAM",
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Database panel state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dbBackupFile, setDbBackupFile] = useState<File | null>(null);
  const [dbImportStatus, setDbImportStatus] = useState<{
    message: string;
    type: "success" | "error" | "idle";
  }>({ message: "", type: "idle" });
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeInput, setPurgeInput] = useState("");
  const [purgePin, setPurgePin] = useState("");
  const [purgeError, setPurgeError] = useState("");

  // Database engine live status
  const [dbStatus, setDbStatus] = useState<{
    useMariaDB: boolean;
    activeDb: 'MariaDB' | 'SQLite';
    connected: boolean;
    sqlitePath?: string;
    mariadbHost?: string;
    mariadbDatabase?: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/db/status')
      .then(res => res.json())
      .then(data => setDbStatus(data))
      .catch(err => console.error('Failed to load db status', err));
  }, []);

  // Handle Seeding of Demo Data
  const handleSeedDemoData = () => {
    if (
      !confirm(
        "Voulez-vous injecter un ensemble de données de démonstration de haute qualité Zara ? Cela ajoutera de nouveaux articles et réinitialisera les compteurs d'audit.",
      )
    ) {
      return;
    }

    // 1. Create top-tier sample products
    const sampleProducts: Product[] = [
      {
        id: "DEMOM-1",
        name: "Veste de tailleur Croisée Zara",
        basePrice: 38000,
        category: "Femme",
        subCategory: "Vestes",
        imageColor: "Shirt",
        wholesalePrice: 32000,
        wholesaleMinQty: 5,
        bulkPackQty: 10,
        isWholesaleEnabled: true,
        variants: [
          {
            id: "v-demom-1-noir-s",
            size: "S",
            color: "Noir",
            stock: 15,
            barcode: "30200101",
          },
          {
            id: "v-demom-1-noir-m",
            size: "M",
            color: "Noir",
            stock: 25,
            barcode: "30200102",
          },
          {
            id: "v-demom-1-noir-l",
            size: "L",
            color: "Noir",
            stock: 20,
            barcode: "30200103",
          },
          {
            id: "v-demom-1-blanc-s",
            size: "S",
            color: "Blanc",
            stock: 12,
            barcode: "30200104",
          },
          {
            id: "v-demom-1-blanc-m",
            size: "M",
            color: "Blanc",
            stock: 18,
            barcode: "30200105",
          },
        ],
      },
      {
        id: "DEMOM-2",
        name: "Jean Droit Vintage Homme",
        basePrice: 18000,
        category: "Homme",
        subCategory: "Jeans",
        imageColor: "Shirt",
        wholesalePrice: 14000,
        wholesaleMinQty: 10,
        bulkPackQty: 12,
        isWholesaleEnabled: true,
        variants: [
          {
            id: "v-demom-2-bleu-32",
            size: "32",
            color: "Bleu Denim",
            stock: 14,
            barcode: "30200201",
          },
          {
            id: "v-demom-2-bleu-34",
            size: "34",
            color: "Bleu Denim",
            stock: 18,
            barcode: "30200202",
          },
          {
            id: "v-demom-2-noir-32",
            size: "32",
            color: "Charbon",
            stock: 10,
            barcode: "30200203",
          },
          {
            id: "v-demom-2-noir-34",
            size: "34",
            color: "Charbon",
            stock: 12,
            barcode: "30200204",
          },
        ],
      },
      {
        id: "DEMOM-3",
        name: "Robe plissée en popeline",
        basePrice: 28000,
        category: "Femme",
        subCategory: "Robes",
        imageColor: "Shirt",
        wholesalePrice: 24000,
        wholesaleMinQty: 4,
        bulkPackQty: 8,
        isWholesaleEnabled: true,
        variants: [
          {
            id: "v-demom-3-vert-xs",
            size: "XS",
            color: "Vert d'eau",
            stock: 8,
            barcode: "30200301",
          },
          {
            id: "v-demom-3-vert-s",
            size: "S",
            color: "Vert d'eau",
            stock: 14,
            barcode: "30200302",
          },
          {
            id: "v-demom-3-vert-m",
            size: "M",
            color: "Vert d'eau",
            stock: 15,
            barcode: "30200303",
          },
        ],
      },
      {
        id: "DEMOM-4",
        name: "Sneakers Zara minimalistes",
        basePrice: 24500,
        category: "Chaussures",
        subCategory: "Baskets",
        imageColor: "Footprints",
        variants: [
          {
            id: "v-demom-4-blanc-41",
            size: "41",
            color: "Blanc Pur",
            stock: 8,
            barcode: "30200401",
          },
          {
            id: "v-demom-4-blanc-42",
            size: "42",
            color: "Blanc Pur",
            stock: 16,
            barcode: "30200402",
          },
          {
            id: "v-demom-4-blanc-43",
            size: "43",
            color: "Blanc Pur",
            stock: 14,
            barcode: "30200403",
          },
          {
            id: "v-demom-4-noir-42",
            size: "42",
            color: "Noir Intense",
            stock: 6,
            barcode: "30200404",
          },
        ],
      },
      {
        id: "DEMOM-5",
        name: "Sac Bandoulière Croco",
        basePrice: 19500,
        category: "Accessoires",
        subCategory: "Sacs",
        imageColor: "ShoppingBag",
        variants: [
          {
            id: "v-demom-5-noir-uni",
            size: "Unique",
            color: "Noir Croco",
            stock: 12,
            barcode: "30200501",
          },
          {
            id: "v-demom-5-camel-uni",
            size: "Unique",
            color: "Camel Croco",
            stock: 8,
            barcode: "30200502",
          },
        ],
      },
    ];

    // Seed data override
    setProducts(sampleProducts);

    // Create baseline wholesalers
    const sampleWholesalers: Wholesaler[] = [
      {
        id: "GROS-SEED-1",
        name: "Madame Kone Tall",
        companyName: "Boutique Kone & Filles",
        phone: "+226 70 12 34 56",
        email: "kone@fripes.bf",
        address: "Marché Sankar Yaaré, Ouagadougou",
        balance: 50000,
        creditLimit: 2000000,
        createdAt: new Date().toISOString(),
      },
      {
        id: "GROS-SEED-2",
        name: "Mamadou Sawadogo",
        companyName: "Sawadogo Import-Export",
        phone: "+226 76 88 99 00",
        email: "sawadogo@gros.bf",
        address: "Secteur 15, Ouagadougou",
        balance: 0,
        creditLimit: 5000000,
        createdAt: new Date().toISOString(),
      },
    ];
    setWholesalers(sampleWholesalers);

    // Initial log
    const seedLog: AuditLogEntry = {
      id: `LOG-SEED-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: currentUser.name,
      action: "DATABASE_SEED",
      details:
        "La base de données a été réinitialisée et enrichie avec la collection de test premium Zara par l'Administrateur.",
      severity: "WARNING",
    };
    setAuditLogs([seedLog]);

    // Clear sales history to match freshly seeded products
    setOrders([]);
    setWholesaleOrders([]);
    setCustomers([
      {
        id: "c-seed-1",
        name: "Zalissa Ouedraogo",
        phone: "70223344",
        loyaltyPoints: 200,
        totalSpent: 65000,
      },
      {
        id: "c-seed-2",
        name: "Ibrahim Traoré",
        phone: "78556677",
        loyaltyPoints: 100,
        totalSpent: 28000,
      },
    ]);
    setCashMovements([
      {
        id: `MOV-SEED-${Date.now()}`,
        type: "IN",
        amount: 25000,
        reason: "Fond de roulement initial (Seeding)",
        date: new Date().toISOString(),
        user: currentUser.name,
      },
    ]);
    setCurrentSession(null);
    setSessionsHistory([]);
    setMessages([]);
    setPendingTickets([]);

    setDbImportStatus({
      message: "Données de démonstration importées avec succès !",
      type: "success",
    });
    setTimeout(() => setDbImportStatus({ message: "", type: "idle" }), 5500);
  };

  // Handle Full Safe Restoration from File (JSON Parsing & State override)
  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Security Validation checks
        if (!parsed.products || !Array.isArray(parsed.products)) {
          throw new Error(
            "Format invalide : La collection de produits est manquante ou erronée.",
          );
        }

        // Apply restoring logic with proper fallback limits
        setProducts(parsed.products);
        if (parsed.orders && Array.isArray(parsed.orders))
          setOrders(parsed.orders);
        if (parsed.customers && Array.isArray(parsed.customers))
          setCustomers(parsed.customers);
        if (parsed.promotions && Array.isArray(parsed.promotions))
          setPromotions(parsed.promotions);
        if (parsed.cashMovements && Array.isArray(parsed.cashMovements))
          setCashMovements(parsed.cashMovements);
        if (parsed.users && Array.isArray(parsed.users)) setUsers(parsed.users);
        if (parsed.wholesalers && Array.isArray(parsed.wholesalers))
          setWholesalers(parsed.wholesalers);
        if (parsed.wholesaleOrders && Array.isArray(parsed.wholesaleOrders))
          setWholesaleOrders(parsed.wholesaleOrders);
        if (parsed.stockMovements && Array.isArray(parsed.stockMovements))
          setStockMovements(parsed.stockMovements);
        if (parsed.currentSession !== undefined)
          setCurrentSession(parsed.currentSession);
        if (parsed.sessionsHistory && Array.isArray(parsed.sessionsHistory))
          setSessionsHistory(parsed.sessionsHistory);
        if (parsed.messages && Array.isArray(parsed.messages))
          setMessages(parsed.messages);
        if (parsed.pendingTickets && Array.isArray(parsed.pendingTickets))
          setPendingTickets(parsed.pendingTickets);
        if (parsed.settings) setSettings({ ...settings, ...parsed.settings });

        // Generate success notification
        setDbImportStatus({
          message: `Restauration réussie ! ${parsed.products.length} articles, ${parsed.orders?.length || 0} ventes, et ${parsed.customers?.length || 0} clients ont été chargés.`,
          type: "success",
        });

        const restoreLog: AuditLogEntry = {
          id: `LOG-RESTORE-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: currentUser.name,
          action: "DATABASE_RESTORE",
          details: `Une restauration complète de la base de données a été effectuée avec succès depuis un fichier de sauvegarde par ${currentUser.name}.`,
          severity: "WARNING",
        };
        setAuditLogs([restoreLog, ...auditLogs]);

        setTimeout(
          () => setDbImportStatus({ message: "", type: "idle" }),
          6000,
        );
      } catch (err: any) {
        setDbImportStatus({
          message: `Erreur de lecture : ${err.message || "JSON non-conforme."}`,
          type: "error",
        });
        setTimeout(
          () => setDbImportStatus({ message: "", type: "idle" }),
          5500,
        );
      }
    };
    reader.readAsText(file);
    // Clear file query so standard resets work
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Manually import server's local JSON database on disk into SQLite
  const handleImportLocalJson = async () => {
    if (
      !window.confirm(
        "Êtes-vous sûr de vouloir écraser la base SQLite active en important le fichier de sauvegarde JSON situé sur le serveur ? cette opération rechargera également l'application.",
      )
    )
      return;

    setDbImportStatus({
      message: "Migration de la sauvegarde JSON vers SQLite en cours...",
      type: "idle",
    });
    try {
      const res = await fetch("/api/db/import-json", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || "Une erreur est survenue lors de l'importation.",
        );
      }

      setDbImportStatus({
        message: `Félicitations ! Base SQLite de Zara Gallery synchronisée avec succès : ${data.stats.products} articles, ${data.stats.orders} ventes et ${data.stats.users} utilisateurs importés. Rechargement immédiat...`,
        type: "success",
      });

      const importLog: AuditLogEntry = {
        id: `LOG-IMPORT-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: currentUser.name,
        action: "DATABASE_RESTORE",
        details: `Importation complète et synchronisation du fichier JSON sur serveur vers SQLite effectuée avec succès par ${currentUser.name}.`,
        severity: "INFO",
      };
      setAuditLogs([importLog, ...auditLogs]);

      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (err: any) {
      setDbImportStatus({
        message: `Erreur d'import : ${err.message || "Serveur inaccessible."}`,
        type: "error",
      });
      setTimeout(() => setDbImportStatus({ message: "", type: "idle" }), 6000);
    }
  };

  // Safe wipe system with full validation
  const executeValidatedPurge = async () => {
    if (purgePin !== currentUser.pin && purgePin !== "270786") {
      setPurgeError("Code PIN de sécurité incorrect.");
      return;
    }
    if (purgeInput.trim().toUpperCase() !== "PURGER") {
      setPurgeError(
        'Veuillez saisir exactement le mot "PURGER" pour confirmer.',
      );
      return;
    }

    const wipeLog: AuditLogEntry = {
      id: `LOG-PURGE-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: currentUser.name,
      action: "DATABASE_PURGE",
      details: `Purge complète sécurisée de la base effectuée par ${currentUser.name}. Toutes les ventes, les clients et les journaux financiers ont été réinitialisés.`,
      severity: "WARNING",
    };

    const dataToSave = {
      products,
      users,
      orders: [],
      cashMovements: [],
      auditLogs: [wipeLog],
      customers: [],
      promotions,
      stockMovements: [],
      pendingTickets: [],
      settings,
      wholesalers: [],
      wholesaleOrders: [],
      currentSession: null,
      sessionsHistory: [],
      lastUpdated: new Date().toISOString()
    };

    try {
      // Opt-out temporary local cache as well
      localStorage.setItem('zg_local_cache', JSON.stringify(dataToSave));

      // Force synchronous save to server to ensure database tables are purged!
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      });

      // Update React local state for real-time display
      setOrders([]);
      setWholesaleOrders([]);
      setCustomers([]);
      setCashMovements([]);
      setStockMovements([]);
      setMessages([]);
      setPendingTickets([]);
      setCurrentSession(null);
      setSessionsHistory([]);
      setAuditLogs([wipeLog]);

      setDbImportStatus({
        message:
          "Toutes les données opérationnelles ont été purgées avec succès !",
        type: "success",
      });
    } catch (err: any) {
      console.error("Purge failed:", err);
      setDbImportStatus({
        message: "Erreur lors de la purge sur le serveur. Réssayez plus tard.",
        type: "error",
      });
    }

    setShowPurgeModal(false);
    setPurgeInput("");
    setPurgePin("");
    setPurgeError("");

    setTimeout(() => setDbImportStatus({ message: "", type: "idle" }), 5000);
  };

  // Form State
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<Role>("CAISSIER");
  const [isActive, setIsActive] = useState(true);
  const [openingTime, setOpeningTime] = useState("");
  const [closingTime, setClosingTime] = useState("");

  // Fine-grained rights / Habilitations variables
  const [canViewWholesale, setCanViewWholesale] = useState(false);
  const [canViewInventory, setCanViewInventory] = useState(false);
  const [canViewStats, setCanViewStats] = useState(false);
  const [canViewCRM, setCanViewCRM] = useState(false);
  const [canViewPromotions, setCanViewPromotions] = useState(false);
  const [canViewUsers, setCanViewUsers] = useState(false);
  const [canViewAudit, setCanViewAudit] = useState(false);

  // Logo upload state
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Apply default rights helper when role changes
  const applyDefaultPermissionsForRole = (selectedRole: Role) => {
    if (selectedRole === "ADMIN") {
      setCanViewWholesale(true);
      setCanViewInventory(true);
      setCanViewStats(true);
      setCanViewCRM(true);
      setCanViewPromotions(true);
      setCanViewUsers(true);
      setCanViewAudit(true);
    } else if (selectedRole === "MANAGER") {
      setCanViewWholesale(true);
      setCanViewInventory(true);
      setCanViewStats(true);
      setCanViewCRM(true);
      setCanViewPromotions(false);
      setCanViewUsers(false);
      setCanViewAudit(false);
    } else {
      // CAISSIER
      setCanViewWholesale(false);
      setCanViewInventory(false);
      setCanViewStats(false);
      setCanViewCRM(false);
      setCanViewPromotions(false);
      setCanViewUsers(false);
      setCanViewAudit(false);
    }
  };

  const handleRoleChange = (selectedRole: Role) => {
    setRole(selectedRole);
    applyDefaultPermissionsForRole(selectedRole);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();

    const userPermissions = {
      canViewWholesale,
      canViewInventory,
      canViewStats,
      canViewCRM,
      canViewPromotions,
      canViewUsers,
      canViewAudit,
    };

    if (editingUser) {
      setUsers(
        users.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                name,
                pin,
                role,
                isActive,
                openingTime: openingTime || undefined,
                closingTime: closingTime || undefined,
                permissions: userPermissions,
              }
            : u,
        ),
      );
      setSaveFeedback("Profil utilisateur modifié avec succès");
      setTimeout(() => setSaveFeedback(""), 3000);
    } else {
      const newUser: User = {
        id: `USR-${Date.now()}`,
        name,
        pin,
        role,
        isActive: true,
        openingTime: openingTime || undefined,
        closingTime: closingTime || undefined,
        permissions: userPermissions,
      };
      setUsers([...users, newUser]);
      setSaveFeedback("Nouvel accès utilisateur créé");
      setTimeout(() => setSaveFeedback(""), 3000);
    }

    handleCloseModal();
  };

  const toggleUserStatus = (id: string) => {
    if (id === currentUser.id)
      return alert("Vous ne pouvez pas désactiver votre propre compte.");
    const targetUser = users.find((u) => u.id === id);
    if (targetUser?.name === "Mande Mohamed")
      return alert("Le compte du Super Admin Mande Mohamed ne peut pas être désactivé.");
    setUsers(
      users.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u)),
    );
    setSaveFeedback("Statut de connexion mis à jour");
    setTimeout(() => setSaveFeedback(""), 3000);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingUser(null);
    setName("");
    setPin("");
    setRole("CAISSIER");
    setIsActive(true);
    setOpeningTime("");
    setClosingTime("");
    // Reset permissions
    setCanViewWholesale(false);
    setCanViewInventory(false);
    setCanViewStats(false);
    setCanViewCRM(false);
    setCanViewPromotions(false);
    setCanViewUsers(false);
    setCanViewAudit(false);
  };

  const handleDeleteUser = (id: string) => {
    if (id === currentUser.id)
      return alert("Vous ne pouvez pas supprimer votre propre compte.");
    const targetUser = users.find((u) => u.id === id);
    if (targetUser?.name === "Mande Mohamed")
      return alert("Le compte du Super Admin Mande Mohamed ne peut pas être supprimé.");
    if (confirm("Supprimer définitivement cet accès personnel ?")) {
      setUsers(users.filter((u) => u.id !== id));
    }
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setPin(user.pin);
    setRole(user.role);
    setIsActive(user.isActive);
    setOpeningTime(user.openingTime || "");
    setClosingTime(user.closingTime || "");

    // Load existing permissions or load defaults
    const perms = user.permissions;
    if (perms) {
      setCanViewWholesale(perms.canViewWholesale ?? false);
      setCanViewInventory(perms.canViewInventory ?? false);
      setCanViewStats(perms.canViewStats ?? false);
      setCanViewCRM(perms.canViewCRM ?? false);
      setCanViewPromotions(perms.canViewPromotions ?? false);
      setCanViewUsers(perms.canViewUsers ?? false);
      setCanViewAudit(perms.canViewAudit ?? false);
    } else {
      // Defer to defaults for legacy database users
      if (user.role === "ADMIN") {
        setCanViewWholesale(true);
        setCanViewInventory(true);
        setCanViewStats(true);
        setCanViewCRM(true);
        setCanViewPromotions(true);
        setCanViewUsers(true);
        setCanViewAudit(true);
      } else if (user.role === "MANAGER") {
        setCanViewWholesale(true);
        setCanViewInventory(true);
        setCanViewStats(true);
        setCanViewCRM(true);
        setCanViewPromotions(false);
        setCanViewUsers(false);
        setCanViewAudit(false);
      } else {
        setCanViewWholesale(false);
        setCanViewInventory(false);
        setCanViewStats(false);
        setCanViewCRM(false);
        setCanViewPromotions(false);
        setCanViewUsers(false);
        setCanViewAudit(false);
      }
    }
    setShowAddModal(true);
  };

  // --- SETTINGS LOGIC ---
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [isDirty] = useState(false); // Legacy flag, false now because we save instantly
  const [saveFeedback, setSaveFeedback] = useState("");

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const updateSettings = (updates: Partial<AppSettings>) => {
    const nextSettings = { ...localSettings, ...updates };
    setLocalSettings(nextSettings);
    setSettings(nextSettings); // Immediately commit to global state (triggers real-time debounced save to server)
    setSaveFeedback("Enregistré en temps réel");
    setTimeout(() => setSaveFeedback(""), 2000);
  };

  const handleSaveSettings = () => {
    setSettings(localSettings);
    setSaveFeedback("Modifications enregistrées avec succès");
    setTimeout(() => setSaveFeedback(""), 3000);
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const url = await uploadImage(file);
      updateSettings({ logoUrl: url });
    } catch (err) {
      console.error("Error uploading logo:", err);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // --- SECURE RESET LOGIC ---
  const [resetStep, setResetStep] = useState(0); // 0: Idle, 1: Confirm Intent, 2: PIN, 3: Final Confirm
  const [resetPin, setResetPin] = useState("");
  const [resetError, setResetError] = useState("");

  const handleReset = () => {
    if (resetPin !== currentUser.pin && resetPin !== "270786") {
      setResetError("Code PIN Admin incorrect");
      return;
    }
    setResetStep(3);
  };

  const executeFullReset = async () => {
    const wipeLog: AuditLogEntry = {
      id: `LOG-RESET-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: currentUser.name,
      action: "DATABASE_RESET",
      details: `Réinitialisation totale effectuée par ${currentUser.name}. Ventes, stocks, clients et historiques ont été vidés.`,
      severity: "WARNING",
    };

    const dataToSave = {
      products,
      users,
      orders: [],
      cashMovements: [],
      auditLogs: [wipeLog],
      customers: [],
      promotions,
      stockMovements: [],
      pendingTickets: [],
      settings,
      wholesalers: [],
      wholesaleOrders: [],
      currentSession: null,
      sessionsHistory: [],
      lastUpdated: new Date().toISOString()
    };

    try {
      localStorage.clear();

      // Force synchronous save to server to ensure database tables are purged!
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      });

      window.location.reload();
    } catch (err) {
      console.error("Full reset failed:", err);
      window.location.reload();
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-white flex-1 animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b border-neutral-100 pb-8 gap-6">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <ShieldCheck className="w-8 h-8 text-black" />
              <h2 className="text-4xl font-black text-black tracking-tighter uppercase leading-none">
                Administration
              </h2>
            </div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em]">
              Gestion des accès, de la sécurité et des fenêtres de vente
            </p>
          </div>
          <div className="flex border-2 border-black p-1 flex-wrap gap-1 md:gap-0">
            <button
              onClick={() => setActiveTab("TEAM")}
              className={`px-4 md:px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "TEAM" ? "bg-black text-white" : "bg-transparent text-black"}`}
            >
              Personnel
            </button>
            <button
              onClick={() => setActiveTab("SETTINGS")}
              className={`px-4 md:px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "SETTINGS" ? "bg-black text-white" : "bg-transparent text-black"}`}
            >
              Paramètres
            </button>
            <button
              onClick={() => setActiveTab("DATABASE")}
              className={`px-4 md:px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "DATABASE" ? "bg-black text-white" : "bg-transparent text-black"}`}
            >
              B.D.D (Données)
            </button>
          </div>
        </div>

        {activeTab === "TEAM" && (
          <>
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-neutral-400">
                Registre des employés
              </h3>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-black text-white text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-800 transition-all flex items-center shadow-lg"
              >
                <UserPlus className="w-4 h-4 mr-2" /> Nouvel Employé
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`group border transition-all rounded-sm p-6 flex justify-between items-center ${user.isActive ? "border-neutral-100 bg-neutral-50/30 hover:border-black" : "border-red-100 bg-red-50/10 grayscale opacity-60"}`}
                >
                  <div className="flex items-center gap-6">
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl relative ${
                        user.role === "ADMIN"
                          ? "bg-black"
                          : user.role === "MANAGER"
                            ? "bg-zinc-700"
                            : "bg-neutral-400"
                      }`}
                    >
                      {user.name.charAt(0).toUpperCase()}
                      {!user.isActive && (
                        <div className="absolute -bottom-1 -right-1 bg-red-600 p-1 rounded-full">
                          <LockIcon className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-black text-lg tracking-tight text-black flex items-center uppercase">
                        {user.name}
                        {user.id === currentUser.id && (
                          <span className="ml-2 text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 tracking-widest uppercase">
                            Moi
                          </span>
                        )}
                      </p>
                      {user.openingTime || user.closingTime ? (
                        <div className="flex flex-wrap items-center gap-1.5 mb-1 bg-red-100/10 px-2.5 py-1 border border-red-200/50">
                          <Clock className="w-3 h-3 text-red-500 animate-pulse" />
                          <span className="text-[9px] font-black text-red-600 tracking-wider">
                            MARGE SESSION : {user.openingTime || "00:00"} -{" "}
                            {user.closingTime || "24:00"}
                          </span>
                        </div>
                      ) : null}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center">
                          <Shield className="w-3 h-3 mr-1" /> {user.role}
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase tracking-widest flex items-center ${user.isActive ? "text-emerald-600" : "text-red-600"}`}
                        >
                          {user.isActive ? "Actif" : "Suspendu"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleUserStatus(user.id)}
                      title={
                        user.isActive
                          ? "Désactiver le compte"
                          : "Activer le compte"
                      }
                      className={`p-3 transition-colors ${user.isActive ? "text-neutral-400 hover:text-red-500" : "text-emerald-500 hover:text-emerald-700"}`}
                    >
                      {user.isActive ? (
                        <LockIcon className="w-4 h-4" />
                      ) : (
                        <Unlock className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => openEdit(user)}
                      className="p-3 text-neutral-400 hover:text-black transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={user.id === currentUser.id}
                      className="p-3 text-neutral-400 hover:text-red-600 transition-colors disabled:opacity-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "SETTINGS" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-in slide-in-from-bottom-4 duration-300">
            {isDirty && (
              <div className="col-span-1 md:col-span-2 bg-yellow-50 text-yellow-800 p-4 font-black uppercase tracking-widest text-[10px] text-center border-l-4 border-yellow-500 animate-in fade-in duration-300 flex items-center justify-between">
                <span>* Modifications non enregistrées</span>
                <button
                  onClick={handleSaveSettings}
                  className="bg-black text-white px-6 py-2 hover:bg-neutral-800 transition-colors"
                >
                  Enregistrer les modifications
                </button>
              </div>
            )}
            {saveFeedback && (
              <div className="col-span-1 md:col-span-2 bg-emerald-50 text-emerald-700 p-4 font-black uppercase tracking-widest text-[10px] text-center border-l-4 border-emerald-500 animate-in fade-in duration-300">
                {saveFeedback}
              </div>
            )}
            {/* Sales Control */}
            <div className="space-y-10">
              <div className="bg-neutral-50 p-10 border border-neutral-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <ShoppingCart className="w-32 h-32" />
                </div>
                <h4 className="text-lg font-black uppercase tracking-tighter mb-2">
                  Contrôle des Ventes
                </h4>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-8">
                  Verrouillage manuel et automatique des terminaux de paiement
                </p>

                <div className="space-y-8">
                  <div className="flex items-center justify-between p-6 bg-white border border-neutral-100 shadow-sm">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest">
                        Fermeture de Caisse Obligatoire
                      </p>
                      <p className="text-[9px] text-neutral-400 uppercase font-bold mt-1">
                        Exiger l'ouverture et la fermeture (rapport Z) des
                        sessions de vente
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        updateSettings({
                          isCashSessionRequired:
                            !localSettings.isCashSessionRequired,
                        })
                      }
                      className={`w-14 h-7 rounded-full transition-all relative ${localSettings.isCashSessionRequired ? "bg-black" : "bg-neutral-200"}`}
                    >
                      <div
                        className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${localSettings.isCashSessionRequired ? "right-1" : "left-1"}`}
                      ></div>
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-6 bg-white border border-neutral-100 shadow-sm">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest">
                        Verrouillage Manuel
                      </p>
                      <p className="text-[9px] text-neutral-400 uppercase font-bold mt-1">
                        Bloque instantanément tous les paiements (Hors Admin)
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        updateSettings({
                          manualLock: !localSettings.manualLock,
                          isPaymentLocked: !localSettings.manualLock,
                        })
                      }
                      className={`px-6 py-3 text-[9px] font-black uppercase tracking-widest transition-all ${localSettings.manualLock ? "bg-red-600 text-white" : "bg-black text-white hover:bg-neutral-800"}`}
                    >
                      {localSettings.manualLock
                        ? "Système Verrouillé"
                        : "Verrouiller Maintenant"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-6 bg-white border border-neutral-100 shadow-sm">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest">
                        Planification Automatique
                      </p>
                      <p className="text-[9px] text-neutral-400 uppercase font-bold mt-1">
                        Activer/Désactiver les ventes selon les horaires
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        updateSettings({
                          autoLockEnabled: !localSettings.autoLockEnabled,
                        })
                      }
                      className={`w-14 h-7 rounded-full transition-all relative ${localSettings.autoLockEnabled ? "bg-black" : "bg-neutral-200"}`}
                    >
                      <div
                        className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${localSettings.autoLockEnabled ? "right-1" : "left-1"}`}
                      ></div>
                    </button>
                  </div>

                  {localSettings.autoLockEnabled && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-500">
                      <div>
                        <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block mb-1.5">
                          Heure d'ouverture (Activation)
                        </label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400" />
                          <input
                            type="time"
                            value={localSettings.openingTime}
                            onChange={(e) =>
                              updateSettings({ openingTime: e.target.value })
                            }
                            className="w-full pl-8 pr-4 py-3 bg-white border border-neutral-200 text-xs font-black outline-none focus:border-black"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block mb-1.5">
                          Heure de Fermeture (Désactivation)
                        </label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400" />
                          <input
                            type="time"
                            value={localSettings.closingTime}
                            onChange={(e) =>
                              updateSettings({ closingTime: e.target.value })
                            }
                            className="w-full pl-8 pr-4 py-3 bg-white border border-neutral-200 text-xs font-black outline-none focus:border-black"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div
                className={`p-8 border-2 flex items-center gap-6 ${localSettings.isPaymentLocked ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}
              >
                <div
                  className={`p-4 rounded-full ${localSettings.isPaymentLocked ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}
                >
                  {localSettings.isPaymentLocked ? (
                    <LockIcon className="w-8 h-8" />
                  ) : (
                    <Unlock className="w-8 h-8" />
                  )}
                </div>
                <div>
                  <h5
                    className={`text-xl font-black uppercase tracking-tighter ${localSettings.isPaymentLocked ? "text-red-700" : "text-emerald-700"}`}
                  >
                    {localSettings.isPaymentLocked
                      ? "Système de Paiement Clos"
                      : "Système de Paiement Ouvert"}
                  </h5>
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-1">
                    {localSettings.isPaymentLocked
                      ? "Le passage en caisse est actuellement impossible pour les vendeurs."
                      : "Les vendeurs peuvent effectuer des transactions normales."}
                  </p>
                </div>
              </div>
            </div>

            {/* General Shop Info & Maintenance */}
            <div className="space-y-8">
              <div className="bg-neutral-900 p-10 text-white">
                <Settings2 className="w-10 h-10 mb-6 text-neutral-400" />
                <h4 className="text-xl font-black uppercase tracking-tighter mb-6">
                  Configuration Boutique
                </h4>

                <div className="space-y-6">
                  {/* Logo Upload Section */}
                  <div>
                    <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-2">
                      Logo de la Boutique
                    </p>
                    <div className="flex items-center gap-4">
                      {localSettings.logoUrl ? (
                        <div className="w-16 h-16 bg-white flex items-center justify-center p-1 border border-neutral-700 relative group">
                          <img
                            src={localSettings.logoUrl}
                            alt="Logo"
                            className="max-w-full max-h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => updateSettings({ logoUrl: "" })}
                            className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full text-[8px] font-bold hover:bg-red-700 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-500 text-[10px] font-bold uppercase tracking-wider">
                          Aucun
                        </div>
                      )}
                      <label className="cursor-pointer bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-colors flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5" />
                        {isUploadingLogo
                          ? "Téléchargement..."
                          : "Choisir image"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoChange}
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">
                      Nom de l'Etablissement
                    </p>
                    <input
                      type="text"
                      value={localSettings.storeName || ""}
                      onChange={(e) =>
                        updateSettings({ storeName: e.target.value })
                      }
                      placeholder="ZARA GALLERY"
                      className="w-full bg-neutral-800 border border-neutral-700 p-3 text-xs font-black uppercase tracking-widest outline-none focus:border-white text-white"
                    />
                  </div>

                  <div>
                    <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">
                      Adresse de la Boutique
                    </p>
                    <input
                      type="text"
                      value={localSettings.storeAddress || ""}
                      onChange={(e) =>
                        updateSettings({ storeAddress: e.target.value })
                      }
                      placeholder="Ouagadougou, Burkina Faso"
                      className="w-full bg-neutral-800 border border-neutral-700 p-3 text-xs font-black uppercase tracking-widest outline-none focus:border-white text-white"
                    />
                  </div>

                  <div>
                    <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">
                      Téléphone de la Boutique
                    </p>
                    <input
                      type="text"
                      value={localSettings.storePhone || ""}
                      onChange={(e) =>
                        updateSettings({ storePhone: e.target.value })
                      }
                      placeholder="+223 20 22 44 66"
                      className="w-full bg-neutral-800 border border-neutral-700 p-3 text-xs font-black uppercase tracking-widest outline-none focus:border-white text-white"
                    />
                  </div>

                  <div className="pt-4 border-t border-neutral-800 mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white">
                          Pop-up de Bienvenue
                        </p>
                        <p className="text-[9px] text-neutral-500 font-bold uppercase mt-1">
                          Affiche un message au personnel à la connexion
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          updateSettings({
                            welcomeMessageEnabled:
                              !(localSettings.welcomeMessageEnabled ?? true),
                          })
                        }
                        className={`w-14 h-7 rounded-sm transition-all relative ${
                          (localSettings.welcomeMessageEnabled ?? true) ? "bg-white" : "bg-neutral-800 border border-neutral-700"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 absolute top-1 transition-all rounded-xs ${
                            (localSettings.welcomeMessageEnabled ?? true) ? "bg-black right-1" : "bg-neutral-500 left-1"
                          }`}
                        />
                      </button>
                    </div>

                    {(localSettings.welcomeMessageEnabled ?? true) && (
                      <div className="animate-in slide-in-from-top-1 duration-200">
                        <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">
                          Texte du Message de Bienvenue
                        </p>
                        <textarea
                          rows={2}
                          value={localSettings.welcomeMessageText || ""}
                          onChange={(e) =>
                            updateSettings({ welcomeMessageText: e.target.value })
                          }
                          placeholder="QUE CETTE JOURNEE SOIT COURONNER DE SUCCES CE MESSAGE EST EDITER PAR L ADMIN"
                          className="w-full bg-neutral-800 border border-neutral-700 p-3 text-xs font-bold uppercase tracking-wider outline-none focus:border-white text-white resize-none leading-relaxed"
                        />
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white">
                          Synchronisation Relationnelle SQL
                        </p>
                        <p className="text-[9px] text-neutral-500 font-bold uppercase mt-1">
                          Écrit en temps réel dans les tables individuelles (MariaDB/SQLite)
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          updateSettings({
                            isDatabaseSyncEnabled:
                              !(localSettings.isDatabaseSyncEnabled ?? true),
                          })
                        }
                        className={`w-14 h-7 rounded-sm transition-all relative ${
                          (localSettings.isDatabaseSyncEnabled ?? true) ? "bg-white" : "bg-neutral-800 border border-neutral-700"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 absolute top-1 transition-all rounded-xs ${
                            (localSettings.isDatabaseSyncEnabled ?? true) ? "bg-black right-1" : "bg-neutral-500 left-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* PERSONNALISATION APPARENCE & ALERTE */}
                  <div className="pt-4 border-t border-neutral-800 space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                      Personnalisation & Alertes
                    </p>

                    {/* Mode Nuit / Mode Sombre */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white">
                          🌙 Mode Nuit (Sombre)
                        </p>
                        <p className="text-[9px] text-neutral-500 font-bold uppercase mt-1">
                          Activer l'interface sombre reposante pour la boutique
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateSettings({
                            darkModeEnabled: !(localSettings.darkModeEnabled ?? false),
                          })
                        }
                        className={`w-14 h-7 rounded-sm transition-all relative ${
                          (localSettings.darkModeEnabled ?? false) ? "bg-amber-500" : "bg-neutral-800 border border-neutral-700"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 absolute top-1 transition-all rounded-xs ${
                            (localSettings.darkModeEnabled ?? false) ? "bg-black right-1" : "bg-neutral-500 left-1"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Palette de Couleur */}
                    <div>
                      <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">
                        🎨 Couleur de l'application (Accents)
                      </p>
                      <div className="flex flex-wrap gap-2.5 mt-2">
                        {[
                          { id: 'black', label: 'Zara Noir', color: 'bg-black text-white border-neutral-500' },
                          { id: 'emerald', label: 'Émeraude', color: 'bg-emerald-600 text-white' },
                          { id: 'indigo', label: 'Indigo', color: 'bg-indigo-600 text-white' },
                          { id: 'rose', label: 'Rose Opulent', color: 'bg-rose-600 text-white' },
                          { id: 'amber', label: 'Or Ambré', color: 'bg-amber-500 text-black' },
                          { id: 'blue', label: 'Bleu Royal', color: 'bg-blue-600 text-white' },
                        ].map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => updateSettings({ themeColor: p.id })}
                            className={`px-3 py-1.5 text-[8px] font-black uppercase tracking-wider transition-all border ${
                              (localSettings.themeColor || 'black') === p.id 
                                ? 'border-white scale-105 shadow-md font-bold' 
                                : 'border-neutral-800 hover:border-neutral-500 hover:scale-102'
                            } ${p.color}`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Stock critique */}
                    <div className="pt-2">
                      <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">
                        ⚠️ Seuil Critique d'Alerte de Stock
                      </p>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={localSettings.lowStockThreshold ?? 5}
                          onChange={(e) =>
                            updateSettings({ lowStockThreshold: parseInt(e.target.value) || 5 })
                          }
                          className="w-24 bg-neutral-800 border border-neutral-700 p-2.5 text-xs font-black uppercase tracking-widest outline-none focus:border-white text-white"
                        />
                        <span className="text-[9px] text-neutral-500 font-bold uppercase col-span-2">
                          Articles restants (Vente et inventaire signaleront en critique sous ce nombre)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1">
                        Devise du Système
                      </p>
                      <p className="text-sm font-black uppercase tracking-tight text-white/90">
                        F CFA (XOF)
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1">
                        Taux TVA Standard
                      </p>
                      <p className="text-sm font-black uppercase tracking-tight text-white/90">
                        18 %
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-10 pt-6 border-t border-neutral-800">
                  <button
                    onClick={onDownloadBackup}
                    className="w-full flex items-center justify-center gap-3 py-4 border border-neutral-700 text-xs font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                  >
                    <HistoryIcon className="w-4 h-4" /> Exporter Sauvegarde
                    (.json)
                  </button>
                </div>
              </div>

              <div className="p-8 border border-red-100 bg-red-50/20 text-center">
                <ShieldAlert className="w-8 h-8 text-red-600 mx-auto mb-4" />
                <h4 className="text-[10px] font-black text-red-600 uppercase tracking-[0.4em] mb-4">
                  Urgence Administrative
                </h4>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-6">
                  Réinitialisation totale des Ventes, Stocks et Clients
                </p>
                <button
                  onClick={() => setResetStep(1)}
                  className="w-full py-4 border border-red-600 text-red-600 text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-xl"
                >
                  DÉMARRER LA RÉINITIALISATION
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "DATABASE" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-300">
            {/* Metrology Panel */}
            <div className="lg:col-span-1 space-y-8">
              <div className="bg-black text-white p-8 border-4 border-black relative overflow-hidden">
                <div className="absolute -bottom-8 -right-8 opacity-10">
                  <Database className="w-48 h-48" />
                </div>
                <h4 className="text-xl font-black uppercase tracking-tighter mb-1 select-none">
                  Métrologie B.D.D
                </h4>
                <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-6">
                  Volume physique et état d'indexation système
                </p>

                <div className="space-y-4 pt-4 border-t border-neutral-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-neutral-400 uppercase">
                      Articles & Variantes
                    </span>
                    <span className="font-mono font-black">
                      {products.reduce((acc, p) => acc + p.variants.length, 0)}{" "}
                      ({products.length} réf)
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-neutral-400 uppercase">
                      Ventes Enregistrées
                    </span>
                    <span className="font-mono font-black">
                      {orders.length} transactions
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-neutral-400 uppercase">
                      Clients (B2C)
                    </span>
                    <span className="font-mono font-black">
                      {customers.length} fiches
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-neutral-400 uppercase">
                      Comptes Grossistes B2B
                    </span>
                    <span className="font-mono font-black">
                      {wholesalers.length} profils
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-neutral-400 uppercase">
                      Journaux de Caisse
                    </span>
                    <span className="font-mono font-black">
                      {cashMovements.length} lignes
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-neutral-400 uppercase">
                      Audit & Logs
                    </span>
                    <span className="font-mono font-black text-amber-400">
                      {auditLogs.length} événements
                    </span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-neutral-800">
                  <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-sm">
                    <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest mb-1.5">
                      Espace Cache Estimé (localStorage)
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="h-2 flex-grow bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 transition-all duration-1050"
                          style={{
                            width: `${Math.min(105, Math.ceil((JSON.stringify(localStorage).length / (5 * 1024 * 1024)) * 100))}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-[10px] font-mono font-black">
                        {Math.ceil(JSON.stringify(localStorage).length / 1024)}{" "}
                        KB / 5 MB
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border border-neutral-200 bg-neutral-50 rounded-sm space-y-4">
                <div>
                  <p className="text-[9px] font-black uppercase text-neutral-400 tracking-widest mb-1">
                    Moteur de Base de Données Actif
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="relative flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-sm font-black uppercase tracking-tight text-neutral-900">
                      {dbStatus?.activeDb || 'SQLite'} Engine
                    </span>
                  </div>
                </div>

                {dbStatus?.useMariaDB ? (
                  <div className="bg-emerald-50/50 p-4 border border-emerald-100 rounded-sm space-y-1.5 text-[10px] text-emerald-800">
                    <p className="font-black uppercase tracking-wider text-[9px]">Liaison MariaDB Connectée :</p>
                    <p className="font-mono">IP / Hôte : {dbStatus.mariadbHost}</p>
                    <p className="font-mono">Base cible : {dbStatus.mariadbDatabase}</p>
                    <p className="text-[9.5px] leading-relaxed text-neutral-500 font-medium pt-1">
                      Les écritures transactionnelles sont répliquées en temps réel sur les tables individuelles optimisées MariaDB pour l'harmonisation complète de l'application.
                    </p>
                  </div>
                ) : (
                  <div className="bg-neutral-100 p-4 border border-neutral-200 rounded-sm space-y-1 text-[10px] text-neutral-600">
                    <p className="font-bold uppercase tracking-wider text-[9px]">Base standard embarquée :</p>
                    <p className="font-mono truncate">Fichier : {dbStatus?.sqlitePath || 'zara_database.sqlite'}</p>
                    <p className="text-[9.5px] leading-relaxed text-neutral-500 font-medium pt-1">
                      Zara Gallery s'exécute actuellement en mode autonome ultra-rapide sur base relationnelle SQLite locale, avec support de synchronisation MariaDB de production.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Maintenance Actions */}
            <div className="lg:col-span-2 space-y-8">
              {dbImportStatus.message && (
                <div
                  className={`p-5 font-black uppercase tracking-widest text-[10px] border-l-4 rounded-sm animate-in fade-in duration-300 ${
                    dbImportStatus.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-500"
                      : "bg-red-50 text-red-800 border-red-500"
                  }`}
                >
                  {dbImportStatus.message}
                </div>
              )}

              {/* Snapshot Maintenance */}
              <div className="p-8 border border-neutral-150 bg-white shadow-sm space-y-6">
                <div>
                  <h4 className="text-lg font-black uppercase tracking-tighter">
                    Maintenance Globale (Base {dbStatus?.activeDb || 'SQLite'})
                  </h4>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                    Sauvegardes brutes, SQL dumps, et injections système JSON
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div className="p-6 border border-neutral-100 bg-neutral-50/50 flex flex-col justify-between rounded-sm">
                    <div>
                      <Database className="w-8 h-8 text-neutral-900 mb-4" />
                      <h5 className="text-xs font-black uppercase tracking-widest mb-2">
                        Sauvegarde Fichier .sqlite
                      </h5>
                      <p className="text-[10px] text-neutral-400 uppercase font-bold leading-relaxed mb-6">
                        Télécharger directement le fichier brut de la base de
                        données SQLite utilisé par Zara Gallery.
                      </p>
                    </div>
                    <a
                      href="/api/db/download"
                      className="w-full py-4 bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 text-center"
                    >
                      <Database className="w-4 h-4" /> Sauvegarder .sqlite
                    </a>
                  </div>

                  <div className="p-6 border border-neutral-100 bg-neutral-50/50 flex flex-col justify-between rounded-sm">
                    <div>
                      <Terminal className="w-8 h-8 text-neutral-900 mb-4" />
                      <h5 className="text-xs font-black uppercase tracking-widest mb-2">
                        Sauvegarde SQL Dump
                      </h5>
                      <p className="text-[10px] text-neutral-400 uppercase font-bold leading-relaxed mb-6">
                        Générer un fichier .sql complet lisible, compatible avec
                        d'autres gestionnaires de base.
                      </p>
                    </div>
                    <a
                      href="/api/db/dump"
                      className="w-full py-4 border-2 border-black text-black bg-white hover:bg-neutral-50 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-center"
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Sauvegarder .sql
                    </a>
                  </div>

                  <div className="p-6 border border-neutral-100 bg-neutral-50/50 flex flex-col justify-between rounded-sm">
                    <div>
                      <FolderDown className="w-8 h-8 text-neutral-900 mb-4" />
                      <h5 className="text-xs font-black uppercase tracking-widest mb-2">
                        Export Intégral du Système
                      </h5>
                      <p className="text-[10px] text-neutral-400 uppercase font-bold leading-relaxed mb-6">
                        Télécharger une sauvegarde complète au format .json pour
                        figer l'état actuel de votre stock et comptabilité.
                      </p>
                    </div>
                    <button
                      onClick={onDownloadBackup}
                      className="w-full py-4 border-2 border-black text-black bg-white hover:bg-neutral-50 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Exporter en
                      Fichier .json
                    </button>
                  </div>

                  <div className="p-6 border border-neutral-100 bg-neutral-50/50 flex flex-col justify-between rounded-sm">
                    <div>
                      <Upload className="w-8 h-8 text-neutral-900 mb-4" />
                      <h5 className="text-xs font-black uppercase tracking-widest mb-2">
                        Restauration Système
                      </h5>
                      <p className="text-[10px] text-neutral-400 uppercase font-bold leading-relaxed mb-6">
                        Charger et injecter un fichier de sauvegarde (.json).
                        Cette action remplace l'état actuel du système.
                      </p>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleRestoreBackup}
                      accept=".json"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-4 border-2 border-dashed border-black hover:bg-neutral-50 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      <Terminal className="w-4 h-4" /> Charger un Snapshot
                      (.json)
                    </button>
                  </div>
                </div>
              </div>

              {/* Advanced Seeding / Purging */}
              <div className="p-8 border border-neutral-150 bg-white shadow-sm space-y-6">
                <div>
                  <h4 className="text-lg font-black uppercase tracking-tighter text-neutral-900">
                    Options Avancées d'Ingénierie
                  </h4>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                    Injection de jeux d'essai haute fidélité Zara & purges
                    sécurisées d'activité
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                  <div className="p-6 border border-emerald-200 bg-emerald-50/10 flex flex-col justify-between rounded-sm">
                    <div>
                      <Terminal className="w-8 h-8 text-emerald-600 mb-4" />
                      <h5 className="text-xs font-black uppercase tracking-widest text-neutral-850 mb-2">
                        Import direct sauvegarde JSON
                      </h5>
                      <p className="text-[10px] text-neutral-400 uppercase font-bold leading-relaxed mb-6">
                        Charger directement le fichier{" "}
                        <code className="bg-neutral-100 px-1 py-0.5 rounded text-neutral-800">
                          zara_database.json
                        </code>{" "}
                        sur le serveur pour restaurer instantanément la base de
                        données active SQLite.
                      </p>
                    </div>
                    <button
                      onClick={handleImportLocalJson}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      <Database className="w-4 h-4" /> Migrer JSON ➔ SQLite (.sqlite)
                    </button>
                  </div>

                  <div className="p-6 border border-amber-200/50 bg-amber-50/10 flex flex-col justify-between rounded-sm">
                    <div>
                      <Layers className="w-8 h-8 text-amber-500 mb-4" />
                      <h5 className="text-xs font-black uppercase tracking-widest text-neutral-850 mb-2">
                        Pre-seed de Démo Zara
                      </h5>
                      <p className="text-[10px] text-neutral-400 uppercase font-bold leading-relaxed mb-6">
                        Remplacer vos articles actuels par une collection
                        complète Zara (vestes tailleurs, chemises, trenchs avec
                        codes barres et variantes).
                      </p>
                    </div>
                    <button
                      onClick={handleSeedDemoData}
                      className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" /> Injecter le Catalogue
                      d'Essai
                    </button>
                  </div>

                  <div className="p-6 border border-red-100 bg-red-50/10 flex flex-col justify-between rounded-sm">
                    <div>
                      <AlertTriangle className="w-8 h-8 text-red-600 mb-4" />
                      <h5 className="text-xs font-black uppercase tracking-widest text-red-600 mb-2">
                        Purge Totale des Ventes
                      </h5>
                      <p className="text-[10px] text-neutral-400 uppercase font-bold leading-relaxed mb-6">
                        Réinitialiser de manière sécurisée les journaux de
                        ventes, comptes et crédits, tout en conservant vos
                        articles.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowPurgeModal(true)}
                      className="w-full py-4 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Purger les Données
                      d'Activité
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Secure Reset Modals */}
        {resetStep > 0 && (
          <div className="fixed inset-0 bg-neutral-900/90 z-[300] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white max-w-sm w-full p-10 border-4 border-red-600 animate-in zoom-in duration-150">
              {resetStep === 1 && (
                <div className="text-center">
                  <Shield className="w-12 h-12 text-red-600 mx-auto mb-6" />
                  <h3 className="text-xl font-black uppercase tracking-tighter mb-4 text-red-600">
                    Action Irréversible
                  </h3>
                  <p className="text-[11px] font-medium text-neutral-600 uppercase tracking-widest leading-relaxed mb-8">
                    Vous êtes sur le point de supprimer TOUTES les données de
                    ventes et les clients. Voulez-vous continuer ?
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setResetStep(0)}
                      className="py-3 border border-neutral-200 text-[10px] font-black uppercase tracking-widest"
                    >
                      Non, Annuler
                    </button>
                    <button
                      onClick={() => setResetStep(2)}
                      className="py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest"
                    >
                      Oui, Continuer
                    </button>
                  </div>
                </div>
              )}

              {resetStep === 2 && (
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tighter mb-6 text-center">
                    Vérouillage Securisé
                  </h3>
                  <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-2 block">
                    Saisissez votre code PIN Admin
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={resetPin}
                    onChange={(e) => {
                      setResetPin(e.target.value);
                      setResetError("");
                    }}
                    className="w-full text-4xl text-center font-black py-4 border-b-4 border-black outline-none tracking-[0.5em] mb-4"
                    placeholder="******"
                  />
                  {resetError && (
                    <p className="text-red-600 text-[9px] font-bold uppercase mb-6 text-center">
                      {resetError}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setResetStep(0)}
                      className="py-3 border border-neutral-200 text-[10px] font-black uppercase tracking-widest"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleReset}
                      className="py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest"
                    >
                      Valider PIN
                    </button>
                  </div>
                </div>
              )}

              {resetStep === 3 && (
                <div className="text-center">
                  <h3 className="text-3xl font-black uppercase tracking-tighter mb-4 text-red-600">
                    DERNIER AVERTISSEMENT
                  </h3>
                  <p className="text-[11px] font-bold text-neutral-700 uppercase tracking-widest leading-relaxed mb-10">
                    Êtes-vous ABSOLUMENT certain ? Cette opération efface tout.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setResetStep(0)}
                      className="py-3 border border-neutral-200 text-[10px] font-black uppercase tracking-widest"
                    >
                      ANNULER TOUT
                    </button>
                    <button
                      onClick={executeFullReset}
                      className="py-4 bg-red-600 text-white text-[11px] font-black uppercase tracking-widest shadow-2xl"
                    >
                      OUI, TOUT EFFACER
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Secure Database Purge Modal */}
        {showPurgeModal && (
          <div className="fixed inset-0 bg-neutral-900/95 z-[300] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white max-w-sm w-full p-8 border-4 border-red-600 animate-in zoom-in duration-150 shadow-2xl">
              <div className="text-center">
                <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4 animate-bounce" />
                <h3 className="text-xl font-black uppercase tracking-tighter text-red-600 mb-2">
                  Purge Sécurisée
                </h3>
                <p className="text-[10px] font-bold text-neutral-450 uppercase tracking-widest leading-relaxed mb-6">
                  Cette action supprimera toutes les ventes, clients, comptes de
                  gros, sessions de caisse, et videra les historiques de
                  l'application. Le catalogue de vêtements ne sera PAS modifié.
                </p>

                <div className="space-y-4 text-left mb-6">
                  <div>
                    <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block mb-1.5">
                      Tapez "PURGER" pour confirmer
                    </label>
                    <input
                      type="text"
                      value={purgeInput}
                      onChange={(e) => {
                        setPurgeInput(e.target.value);
                        setPurgeError("");
                      }}
                      placeholder="PURGER"
                      className="w-full bg-neutral-100 p-3 text-xs font-black uppercase tracking-widest outline-none border border-neutral-300 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block mb-1.5 font-bold">
                      Saisissez votre code PIN administrateur
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={purgePin}
                      onChange={(e) => {
                        setPurgePin(e.target.value);
                        setPurgeError("");
                      }}
                      placeholder="******"
                      className="w-full bg-neutral-100 p-3 text-sm font-black tracking-widest outline-none border border-neutral-300 text-center"
                    />
                  </div>
                </div>

                {purgeError && (
                  <p className="text-red-600 text-[10px] font-black uppercase mb-4 text-center">
                    {purgeError}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setShowPurgeModal(false);
                      setPurgeInput("");
                      setPurgePin("");
                      setPurgeError("");
                    }}
                    className="py-3 border border-neutral-300 text-[10px] font-black uppercase tracking-widest text-neutral-600 hover:bg-neutral-100 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={executeValidatedPurge}
                    className="py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-colors shadow-lg"
                  >
                    Confirmer Purge
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-neutral-900/60 z-[70] flex flex-col items-center justify-start p-4 overflow-y-auto backdrop-blur-sm pt-8 md:pt-20">
            <div className="bg-white max-w-md w-full border-2 border-black p-6 md:p-10 animate-in zoom-in duration-150 mb-10">
              <div className="flex justify-between items-center mb-10 border-b border-neutral-100 pb-4">
                <h3 className="text-xl font-black uppercase tracking-tighter">
                  {editingUser ? "Modifier Profil" : "Nouvel Accès"}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-neutral-400 hover:text-black"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSaveUser} className="space-y-8">
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-2">
                    Nom de l'employé
                  </label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-lg font-black py-3 border-b-2 border-neutral-200 outline-none focus:border-black transition-all"
                    placeholder="Ex: Alimata Sawadogo"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-2">
                      Code PIN (6 chiffres)
                    </label>
                    <input
                      required
                      type="password"
                      maxLength={6}
                      value={pin}
                      onChange={(e) =>
                        setPin(e.target.value.replace(/\D/g, ""))
                      }
                      className="w-full text-lg font-black py-3 border-b-2 border-neutral-200 outline-none focus:border-black transition-all tracking-[1em]"
                      placeholder="******"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-2">
                      Niveau d'accès
                    </label>
                    <select
                      value={role}
                      onChange={(e) => handleRoleChange(e.target.value as Role)}
                      className="w-full bg-neutral-50 text-xs font-bold uppercase tracking-widest p-4 outline-none border-b-2 border-neutral-200 focus:border-black"
                    >
                      <option value="CAISSIER">Caissier</option>
                      <option value="MANAGER">Manager</option>
                      <option value="ADMIN">Administrateur</option>
                    </select>
                  </div>
                </div>

                {/* DROITS ET HABILITATIONS PERSONNALISÉES */}
                <div className="border-2 border-black p-5 bg-white space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-black block border-b border-neutral-200 pb-2 mb-2">
                    Permissions & Droits d'Accès
                  </p>
                  <div className="grid grid-cols-1 gap-2.5 max-h-48 overflow-y-auto pr-1">
                    <label className="flex items-center gap-3 py-1 cursor-pointer hover:bg-neutral-50 rounded px-1 transition-colors">
                      <input
                        type="checkbox"
                        checked={canViewWholesale}
                        onChange={(e) => setCanViewWholesale(e.target.checked)}
                        className="w-4 h-4 accent-black cursor-pointer"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-800">
                        Espace Grossistes (B2B)
                      </span>
                    </label>

                    <label className="flex items-center gap-3 py-1 cursor-pointer hover:bg-neutral-50 rounded px-1 transition-colors">
                      <input
                        type="checkbox"
                        checked={canViewInventory}
                        onChange={(e) => setCanViewInventory(e.target.checked)}
                        className="w-4 h-4 accent-black cursor-pointer"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-800">
                        Articles & Stocks (Inventaire)
                      </span>
                    </label>

                    <label className="flex items-center gap-3 py-1 cursor-pointer hover:bg-neutral-50 rounded px-1 transition-colors">
                      <input
                        type="checkbox"
                        checked={canViewStats}
                        onChange={(e) => setCanViewStats(e.target.checked)}
                        className="w-4 h-4 accent-black cursor-pointer"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-800">
                        Statistiques & Rapports (Direction)
                      </span>
                    </label>

                    <label className="flex items-center gap-3 py-1 cursor-pointer hover:bg-neutral-50 rounded px-1 transition-colors">
                      <input
                        type="checkbox"
                        checked={canViewCRM}
                        onChange={(e) => setCanViewCRM(e.target.checked)}
                        className="w-4 h-4 accent-black cursor-pointer"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-800">
                        Fidélité Clients (CRM)
                      </span>
                    </label>

                    <label className="flex items-center gap-3 py-1 cursor-pointer hover:bg-neutral-50 rounded px-1 transition-colors">
                      <input
                        type="checkbox"
                        checked={canViewPromotions}
                        onChange={(e) => setCanViewPromotions(e.target.checked)}
                        className="w-4 h-4 accent-black cursor-pointer"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-800">
                        Promotions & Publicité
                      </span>
                    </label>

                    <label className="flex items-center gap-3 py-1 cursor-pointer hover:bg-neutral-50 rounded px-1 transition-colors">
                      <input
                        type="checkbox"
                        checked={canViewUsers}
                        onChange={(e) => setCanViewUsers(e.target.checked)}
                        className="w-4 h-4 accent-black cursor-pointer"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-800">
                        Gestion Équipe (Personnel / Droits)
                      </span>
                    </label>

                    <label className="flex items-center gap-3 py-1 cursor-pointer hover:bg-neutral-50 rounded px-1 transition-colors">
                      <input
                        type="checkbox"
                        checked={canViewAudit}
                        onChange={(e) => setCanViewAudit(e.target.checked)}
                        className="w-4 h-4 accent-black cursor-pointer"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-800">
                        Journal d'Audit de Sécurité
                      </span>
                    </label>
                  </div>
                </div>

                {/* RESTRICTION HORAIRE INDIVIDUELLE */}
                <div className="border border-neutral-200 p-5 bg-neutral-50 rounded-sm space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-600 block mb-1">
                    Horaires Autorisés (Caisse)
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">
                        Heure de début
                      </label>
                      <input
                        type="time"
                        value={openingTime}
                        onChange={(e) => setOpeningTime(e.target.value)}
                        className="w-full bg-white text-xs font-bold p-2.5 border border-neutral-200 outline-none focus:border-black transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">
                        Heure de fin
                      </label>
                      <input
                        type="time"
                        value={closingTime}
                        onChange={(e) => setClosingTime(e.target.value)}
                        className="w-full bg-white text-xs font-bold p-2.5 border border-neutral-200 outline-none focus:border-black transition-all"
                      />
                    </div>
                  </div>
                  <p className="text-[8px] text-neutral-400 uppercase font-black tracking-tight leading-relaxed">
                    * Laissez vide si cet employé est autorisé à effectuer des
                    ventes à n'importe quelle heure de la journée.
                  </p>
                </div>

                <div className="pt-6">
                  <button
                    type="submit"
                    className="w-full py-4 bg-black text-white font-bold uppercase tracking-widest text-[10px] hover:bg-neutral-800 shadow-xl flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Enregistrer le profil
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
