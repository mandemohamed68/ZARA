import React, { useState, useMemo, useRef } from 'react';
import ReactBarcode from 'react-barcode';
import * as XLSX from 'xlsx';
import { Product, ProductVariant, ProductMovement, AppSettings } from '../types';
import { 
  Plus, Edit2, Trash2, Package, Search, ChevronDown, Filter, MoreVertical, X, 
  Shirt, Baby, Footprints, Watch, ShoppingBag, History as HistoryIcon, 
  Barcode as BarcodeIcon, ShieldAlert, Boxes, Truck, Image as ImageIcon, 
  Download, FlaskConical, Sparkles, Gem, Sun, SprayCan, Glasses, 
  Printer, ArrowLeft, Layers, CheckCircle2, AlertCircle,
  Palette, Brush, Crown, Scissors, Wind, Upload, FileText, FileSpreadsheet, TrendingUp, Coins
} from 'lucide-react';
import { CATEGORIES, PRESET_IMAGES } from '../data';
import { motion, AnimatePresence } from 'motion/react';
import { uploadImage } from '../utils/fileHelper';

interface InventoryProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  movements: ProductMovement[];
  trackMovement: (productId: string, variantId: string, type: ProductMovement['type'], quantity: number, reason: string) => void;
  settings?: AppSettings;
}

const RenderProductIcon = ({ iconName, className }: { iconName: string, className?: string }) => {
  const getIconColor = (name: string) => {
    switch (name) {
      case 'Shirt': return 'text-amber-800 bg-amber-50';
      case 'Baby': return 'text-sky-800 bg-sky-50';
      case 'Footprints': return 'text-rose-800 bg-rose-50';
      case 'Watch': return 'text-indigo-800 bg-indigo-50';
      case 'ShoppingBag': return 'text-slate-800 bg-slate-50';
      case 'FlaskConical': return 'text-purple-800 bg-purple-50';
      case 'Sparkles': return 'text-pink-800 bg-pink-50';
      case 'Gem': return 'text-blue-800 bg-blue-50';
      case 'Sun': return 'text-orange-800 bg-orange-50';
      case 'SprayCan': return 'text-cyan-800 bg-cyan-50';
      case 'Glasses': return 'text-neutral-800 bg-neutral-100';
      case 'Palette': return 'text-fuchsia-800 bg-fuchsia-50';
      case 'Brush': return 'text-pink-600 bg-pink-50';
      case 'Crown': return 'text-yellow-700 bg-yellow-50';
      case 'Scissors': return 'text-neutral-600 bg-neutral-50';
      case 'Wind': return 'text-teal-600 bg-teal-50';
      default: return 'text-neutral-800 bg-neutral-50';
    }
  };

  const icons: Record<string, React.ReactNode> = {
    'Shirt': <Shirt className={className} />,
    'Baby': <Baby className={className} />,
    'Footprints': <Footprints className={className} />,
    'Watch': <Watch className={className} />,
    'ShoppingBag': <ShoppingBag className={className} />,
    'FlaskConical': <FlaskConical className={className} />,
    'Sparkles': <Sparkles className={className} />,
    'Gem': <Gem className={className} />,
    'Sun': <Sun className={className} />,
    'SprayCan': <SprayCan className={className} />,
    'Glasses': <Glasses className={className} />,
    'Palette': <Palette className={className} />,
    'Brush': <Brush className={className} />,
    'Crown': <Crown className={className} />,
    'Scissors': <Scissors className={className} />,
    'Wind': <Wind className={className} />,
  };
  
  return (
    <div className={`p-2 rounded-full ${getIconColor(iconName)}`}>
      {icons[iconName] || <Package className={className} />}
    </div>
  );
};

export default function Inventory({ products, setProducts, movements, trackMovement, settings }: InventoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newSubCategory, setNewSubCategory] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newIcon, setNewIcon] = useState('Shirt');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newIsWholesaleEnabled, setNewIsWholesaleEnabled] = useState(false);
  const [newWholesalePrice, setNewWholesalePrice] = useState('');
  const [newWholesaleMinQty, setNewWholesaleMinQty] = useState('');
  const [newVariants, setNewVariants] = useState<ProductVariant[]>([
    { id: 'v-' + Date.now(), size: '', color: '', stock: 0, barcode: '' }
  ]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.variants.some(v => v.barcode.includes(searchTerm));
      const matchesCategory = selectedCategory === 'Tous' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const stats = useMemo(() => {
    const totalArticles = products.length;
    const totalStock = products.reduce((acc, p) => acc + p.variants.reduce((vAcc, v) => vAcc + v.stock, 0), 0);
    const lowStockThreshold = settings?.lowStockThreshold || 5;
    const lowStock = products.filter(p => p.variants.some(v => v.stock <= lowStockThreshold)).length;
    const totalValue = products.reduce((acc, p) => acc + (p.basePrice * p.variants.reduce((vAcc, v) => vAcc + v.stock, 0)), 0);
    return { totalArticles, totalStock, lowStock, totalValue };
  }, [products, settings]);

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const productData: Product = {
      id: editingProduct?.id || 'p-' + Date.now(),
      name: newName,
      category: newCategory,
      subCategory: newSubCategory,
      basePrice: parseFloat(newPrice),
      imageColor: newIcon,
      imageUrl: newImageUrl,
      isWholesaleEnabled: newIsWholesaleEnabled,
      wholesalePrice: newIsWholesaleEnabled ? parseFloat(newWholesalePrice) : undefined,
      wholesaleMinQty: newIsWholesaleEnabled ? parseInt(newWholesaleMinQty) : undefined,
      variants: newVariants
    };

    if (editingProduct) {
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? productData : p));
      
      // Track stock changes for existing variants
      editingProduct.variants.forEach(oldV => {
        const newV = newVariants.find(nv => nv.id === oldV.id);
        if (newV && newV.stock !== oldV.stock) {
          const diff = newV.stock - oldV.stock;
          trackMovement(productData.id, newV.id, 'ADJUSTMENT', diff, 'Mise à jour manuelle du stock');
        }
      });
    } else {
      setProducts(prev => [productData, ...prev]);
      // Track initial stock
      productData.variants.forEach(v => {
        if (v.stock > 0) {
          trackMovement(productData.id, v.id, 'RESTOCK', v.stock, 'Stock initial');
        }
      });
    }

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingProduct(null);
    setNewName('');
    setNewCategory('');
    setNewSubCategory('');
    setNewPrice('');
    setNewIcon('Shirt');
    setNewImageUrl('');
    setNewIsWholesaleEnabled(false);
    setNewWholesalePrice('');
    setNewWholesaleMinQty('');
    setNewVariants([{ id: 'v-' + Date.now(), size: '', color: '', stock: 0, barcode: '' }]);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setNewName(product.name);
    setNewCategory(product.category);
    setNewSubCategory(product.subCategory || '');
    setNewPrice(product.basePrice.toString());
    setNewIcon(product.imageColor);
    setNewImageUrl(product.imageUrl || '');
    setNewIsWholesaleEnabled(!!product.isWholesaleEnabled);
    setNewWholesalePrice(product.wholesalePrice?.toString() || '');
    setNewWholesaleMinQty(product.wholesaleMinQty?.toString() || '');
    setNewVariants(product.variants.map(v => ({ ...v })));
    setIsModalOpen(true);
  };

  const addVariant = () => {
    setNewVariants(prev => [...prev, { id: 'v-' + Date.now(), size: '', color: '', stock: 0, barcode: '' }]);
  };

  const updateVariant = (id: string, field: keyof ProductVariant, value: any) => {
    setNewVariants(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const removeVariant = (id: string) => {
    if (newVariants.length > 1) {
      setNewVariants(prev => prev.filter(v => v.id !== id));
    }
  };

  const generateBarcode = (idx: number) => {
    const prefix = 'ZARA';
    const random = Math.floor(100000 + Math.random() * 900000);
    const barcode = `${prefix}-${random}`;
    setNewVariants(prev => {
      const updated = [...prev];
      updated[idx].barcode = barcode;
      return updated;
    });
  };

  // Model Excel Generator with the structure matching the user's uploaded perfume model
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const headers = [
      "Nom du parfum", 
      "Catégorie", 
      "Type", 
      "Contenance / quantité", 
      "Prix de Vente (FCFA)", 
      "Sous-Catégorie", 
      "Stock", 
      "Code-barres"
    ];

    // Sample data to make it incredibly clear
    const data = [
      {
        "Nom du parfum": "BURNT VANILLA 01",
        "Catégorie": "Parfums",
        "Type": "EDP",
        "Contenance / quantité": "100ML",
        "Prix de Vente (FCFA)": 45000,
        "Sous-Catégorie": "Collection Homme",
        "Stock": 15,
        "Code-barres": "ZARA-987123"
      },
      {
        "Nom du parfum": "BURNT VANILLA 01",
        "Catégorie": "Parfums",
        "Type": "EDP",
        "Contenance / quantité": "30ML",
        "Prix de Vente (FCFA)": 20000,
        "Sous-Catégorie": "Collection Homme",
        "Stock": 8,
        "Code-barres": "ZARA-987124"
      },
      {
        "Nom du parfum": "VIBRANT LEATHER + OUD VIBRANT",
        "Catégorie": "Parfums",
        "Type": "EDP",
        "Contenance / quantité": "2X60ML",
        "Prix de Vente (FCFA)": 55000,
        "Sous-Catégorie": "Duo Pack Homme",
        "Stock": 10,
        "Code-barres": "ZARA-543210"
      },
      {
        "Nom du parfum": "Robe Plissée Premium",
        "Catégorie": "Femme",
        "Type": "Vêtements",
        "Contenance / quantité": "M",
        "Prix de Vente (FCFA)": 35000,
        "Sous-Catégorie": "Robes",
        "Stock": 20,
        "Code-barres": "ZARA-112233"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    XLSX.utils.book_append_sheet(wb, ws, "Modèle Zara");
    XLSX.writeFile(wb, "modele_importation_zara.xlsx");
  };

  // Detailed complete professional Excel export
  const handleExportDetailedReport = () => {
    const wb = XLSX.utils.book_new();
    
    // Sheet 1: Global Summary
    const lowStockThreshold = settings?.lowStockThreshold || 5;
    const totalArticles = products.length;
    const totalStock = products.reduce((acc, p) => acc + p.variants.reduce((vAcc, v) => vAcc + v.stock, 0), 0);
    const lowStock = products.filter(p => p.variants.some(v => v.stock <= lowStockThreshold)).length;
    const totalValue = products.reduce((acc, p) => acc + (p.basePrice * p.variants.reduce((vAcc, v) => vAcc + v.stock, 0)), 0);

    const summaryData = [
      { "Métrique d'Inventaire": "Date de l'inventaire", "Valeur": new Date().toLocaleString('fr-FR') },
      { "Métrique d'Inventaire": "Nombre d'Articles Uniques", "Valeur": totalArticles },
      { "Métrique d'Inventaire": "Quantité Totale en Stock", "Valeur": totalStock },
      { "Métrique d'Inventaire": "Articles en Alerte Stock Bas", "Valeur": lowStock },
      { "Métrique d'Inventaire": "Valeur Globale de l'Inventaire (FCFA)", "Valeur": totalValue },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);

    // Sheet 2: Detailed variants report
    const detailedHeaders = [
      "ID Produit",
      "Nom de l'Article",
      "Catégorie",
      "Sous-Catégorie",
      "Type / Concentration",
      "Contenance / Taille",
      "Code-barres",
      "Stock Actuel",
      "Prix Unitaire (FCFA)",
      "Valeur du Stock (FCFA)",
      "Statut de Stock",
      "Tarif de Gros Actif",
      "Prix de Gros (FCFA)",
      "Quantité Min. de Gros"
    ];

    const detailedRows = products.flatMap(p => 
      p.variants.map(v => {
        const stockVal = p.basePrice * v.stock;
        let status = "SUFFISANT";
        if (v.stock === 0) status = "RUPTURE";
        else if (v.stock <= lowStockThreshold) status = "CRITIQUE (STOCK BAS)";

        return {
          "ID Produit": p.id,
          "Nom de l'Article": p.name,
          "Catégorie": p.category,
          "Sous-Catégorie": p.subCategory || "-",
          "Type / Concentration": v.color || "-",
          "Contenance / Taille": v.size || "-",
          "Code-barres": v.barcode || "-",
          "Stock Actuel": v.stock,
          "Prix Unitaire (FCFA)": p.basePrice,
          "Valeur du Stock (FCFA)": stockVal,
          "Statut de Stock": status,
          "Tarif de Gros Actif": p.isWholesaleEnabled ? "OUI" : "NON",
          "Prix de Gros (FCFA)": p.isWholesaleEnabled ? (p.wholesalePrice || 0) : "-",
          "Quantité Min. de Gros": p.isWholesaleEnabled ? (p.wholesaleMinQty || 0) : "-"
        };
      })
    );

    const wsDetails = XLSX.utils.json_to_sheet(detailedRows, { header: detailedHeaders });

    // Sheet 3: Category breakdown
    const categoriesSet = Array.from(new Set(products.map(p => p.category)));
    const categoryRows = categoriesSet.map(cat => {
      const catProducts = products.filter(p => p.category === cat);
      const catUniqueCount = catProducts.length;
      const catQty = catProducts.reduce((acc, p) => acc + p.variants.reduce((vAcc, v) => vAcc + v.stock, 0), 0);
      const catVal = catProducts.reduce((acc, p) => acc + (p.basePrice * p.variants.reduce((vAcc, v) => vAcc + v.stock, 0)), 0);
      return {
        "Catégorie": cat,
        "Nombre d'Articles Uniques": catUniqueCount,
        "Total Articles en Stock": catQty,
        "Valeur Totale Stock (FCFA)": catVal
      };
    });
    const wsCategory = XLSX.utils.json_to_sheet(categoryRows);

    XLSX.utils.book_append_sheet(wb, wsSummary, "Synthèse Globale");
    XLSX.utils.book_append_sheet(wb, wsDetails, "Inventaire Détaillé");
    XLSX.utils.book_append_sheet(wb, wsCategory, "Analyse par Catégorie");

    XLSX.writeFile(wb, `Inventaire_Zara_Detaille_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Excel Importer
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (rows.length === 0) {
          alert("Le fichier Excel est vide.");
          return;
        }

        // Helper to match column headers case-insensitively and loosely
        const getVal = (row: any, candidates: string[]) => {
          for (const cand of candidates) {
            const lowCand = cand.toLowerCase();
            for (const key of Object.keys(row)) {
              const lowKey = key.toLowerCase().trim();
              if (lowKey === lowCand || lowKey.includes(lowCand) || lowCand.includes(lowKey)) {
                return row[key];
              }
            }
          }
          return undefined;
        };

        const parsedProducts: Record<string, Product> = {};

        rows.forEach((row, idx) => {
          // Columns matching: Nom du parfum, Catégorie, Type, Contenance / quantité, Prix, Stock, Barcode
          const pName = getVal(row, ["nom du parfum", "nom de l'article", "nom", "name", "article", "parfum"])?.toString() || `Produit Importé #${idx + 1}`;
          const pCategory = getVal(row, ["catégorie", "categorie", "category"])?.toString() || "Parfums";
          const pSubCategory = getVal(row, ["sous-catégorie", "sous-categorie", "sub-category", "subcategory"])?.toString() || "";
          const pPrice = parseFloat(getVal(row, ["prix", "prix de vente", "price", "baseprice", "prix de vente (fcfa)"]) || "0");
          const pType = getVal(row, ["type", "couleur", "color"])?.toString() || "EDP";
          const pQty = getVal(row, ["contenance / quantité", "contenance", "quantité", "taille", "size"])?.toString() || "100ML";
          const pStock = parseInt(getVal(row, ["stock", "quantite", "quantity", "en stock"]) || "0");
          const pBarcode = getVal(row, ["code-barres", "code barres", "barcode", "code-barre"])?.toString() || `ZARA-IMP-${Math.floor(100000 + Math.random() * 900000)}`;

          const variant: ProductVariant = {
            id: 'v-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
            size: pQty,
            color: pType,
            stock: pStock,
            barcode: pBarcode
          };

          const key = pName.trim().toLowerCase();

          if (parsedProducts[key]) {
            parsedProducts[key].variants.push(variant);
            // Update other optional values if not already present
            if (!parsedProducts[key].category) parsedProducts[key].category = pCategory;
            if (!parsedProducts[key].subCategory) parsedProducts[key].subCategory = pSubCategory;
          } else {
            parsedProducts[key] = {
              id: 'p-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
              name: pName,
              category: pCategory,
              subCategory: pSubCategory,
              basePrice: pPrice,
              imageColor: pCategory.toLowerCase().includes('parfum') ? 'FlaskConical' : 'Shirt',
              imageUrl: '',
              isWholesaleEnabled: false,
              variants: [variant]
            };
          }
        });

        const newProductsArray = Object.values(parsedProducts);

        // Append to state
        setProducts(prev => [...newProductsArray, ...prev]);

        // Log and track stock movements for the restock log
        newProductsArray.forEach(p => {
          p.variants.forEach(v => {
            if (v.stock > 0) {
              trackMovement(p.id, v.id, 'RESTOCK', v.stock, 'Importation de fichier Excel');
            }
          });
        });

        alert(`Succès ! ${newProductsArray.length} fiches articles importées avec succès (comprenant leurs variantes de contenance/type/stock).`);
      } catch (err) {
        console.error(err);
        alert("Erreur lors de la lecture du fichier Excel. Assurez-vous que l'extension est bien .xlsx ou .xls.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // clear
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file);
      setNewImageUrl(url);
    } catch (err) {
      alert('Erreur lors de l\'upload de l\'image');
    }
  };

  const deleteProduct = (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer cet article de l\'inventaire ?')) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-50 overflow-hidden">
      {/* Header & Stats */}
      <div className="p-8 bg-white border-b border-neutral-100">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-black flex items-center gap-3">
              <Package className="w-8 h-8 text-neutral-400" />
              Inventaire <span className="text-neutral-300 font-light">Zara</span>
            </h1>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em] mt-1 ml-11">Gestion des stocks et des fiches articles</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportExcel} 
              accept=".xlsx, .xls" 
              className="hidden" 
            />
            <button 
              onClick={handleDownloadTemplate}
              className="px-5 py-4 border border-neutral-200 text-neutral-600 hover:border-black hover:text-black text-[10px] font-black uppercase tracking-[0.25em] flex items-center gap-2 transition-all active:scale-95 bg-white shadow-sm cursor-pointer"
              title="Télécharger le modèle de fichier Excel d'importation"
            >
              <Download className="w-4 h-4" />
              Modèle Excel
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-4 border border-neutral-200 text-neutral-600 hover:border-black hover:text-black text-[10px] font-black uppercase tracking-[0.25em] flex items-center gap-2 transition-all active:scale-95 bg-white shadow-sm cursor-pointer"
              title="Importer des articles à partir d'un fichier Excel"
            >
              <Upload className="w-4 h-4" />
              Importer Excel
            </button>
            <button 
              onClick={() => setShowReportModal(true)}
              className="px-5 py-4 bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 hover:border-amber-400 text-[10px] font-black uppercase tracking-[0.25em] flex items-center gap-2 transition-all active:scale-95 shadow-sm cursor-pointer"
              title="Générer un rapport d'inventaire complet, professionnel et détaillé"
            >
              <FileText className="w-4 h-4 text-amber-700" />
              Inventaire Détaillé Pro
            </button>
            <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="group relative px-6 py-4 bg-black text-white text-[10px] font-black uppercase tracking-[0.25em] flex items-center gap-2.5 hover:bg-neutral-800 transition-all shadow-xl active:scale-95 cursor-pointer ml-auto lg:ml-0"
            >
              <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
              Nouvel Article Zara
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Articles Uniques', value: stats.totalArticles, icon: <Layers />, color: 'bg-neutral-50' },
            { label: 'Stock Total', value: stats.totalStock, icon: <BarcodeIcon />, color: 'bg-neutral-50' },
            { label: 'Alertes Stock Bas', value: stats.lowStock, icon: <AlertCircle />, color: stats.lowStock > 0 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-neutral-50' },
            { label: 'Valeur Inventaire', value: `${stats.totalValue.toLocaleString()} FCFA`, icon: <Gem />, color: 'bg-black text-white' }
          ].map((stat, i) => (
            <div key={i} className={`p-6 border border-neutral-100 flex items-center justify-between shadow-sm transition-all hover:shadow-md ${stat.color}`}>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">{stat.label}</p>
                <p className="text-xl font-black tracking-tight">{stat.value}</p>
              </div>
              <div className="opacity-20">{stat.icon}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="px-8 py-6 flex flex-col md:flex-row gap-6 items-center bg-neutral-50/50 border-b border-neutral-100">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 group-focus-within:text-black transition-colors" />
          <input 
            type="text" 
            placeholder="RECHERCHER UN ARTICLE (NOM, CATÉGORIE, BARCODE)..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-white border border-neutral-100 text-[10px] font-bold uppercase tracking-widest outline-none focus:border-black transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          {['Tous', ...CATEGORIES.filter(c => c !== 'Tous')].map(cat => (
            <button 
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-4 text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${selectedCategory === cat ? 'bg-black text-white border-black' : 'bg-white text-neutral-400 border-neutral-100 hover:border-black hover:text-black'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product List */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          <AnimatePresence>
            {filteredProducts.map(product => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={product.id} 
                className="bg-white border border-neutral-100 group hover:border-black transition-all flex flex-col shadow-sm hover:shadow-2xl relative overflow-hidden"
              >
                <div className="h-56 bg-neutral-50 relative flex items-center justify-center overflow-hidden">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-20 h-20 bg-white border-2 border-neutral-100 rounded-full flex items-center justify-center text-neutral-200">
                      <RenderProductIcon iconName={product.imageColor} className="w-10 h-10" />
                    </div>
                  )}
                  <div className="absolute top-4 right-4 flex gap-2 translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                    <button onClick={() => openEditModal(product)} className="p-2.5 bg-white text-black border border-black hover:bg-black hover:text-white transition-all shadow-xl">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setBarcodeProduct(product)} className="p-2.5 bg-white text-neutral-400 border border-neutral-200 hover:border-black hover:text-black transition-all shadow-xl">
                      <BarcodeIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteProduct(product.id)} className="p-2.5 bg-white text-red-600 border border-red-600 hover:bg-red-600 hover:text-white transition-all shadow-xl">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1.5 bg-black text-white text-[8px] font-black uppercase tracking-widest">{product.category}</span>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-black text-lg leading-tight uppercase tracking-tight text-black">{product.name}</h3>
                      <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mt-1">{product.subCategory || 'SANS SOUS-CATÉGORIE'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-black leading-none">{product.basePrice.toLocaleString()}</p>
                      <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest mt-1">FCFA</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mt-auto">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-neutral-400 border-b border-neutral-50 pb-2">
                      <span>Tailles / Couleurs</span>
                      <span>Stock</span>
                    </div>
                    {product.variants.slice(0, 3).map(v => (
                      <div key={v.id} className="flex justify-between items-center group/v">
                        <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">{v.size} - {v.color}</span>
                        <span className={`text-[10px] font-black ${v.stock <= (settings?.lowStockThreshold || 5) ? 'text-red-600' : 'text-black'}`}>
                          {v.stock}
                        </span>
                      </div>
                    ))}
                    {product.variants.length > 3 && (
                      <button onClick={() => openEditModal(product)} className="w-full text-center py-2 text-[8px] font-black text-neutral-400 uppercase tracking-widest hover:text-black transition-colors">
                        + {product.variants.length - 3} autres variantes
                      </button>
                    )}
                  </div>
                </div>
                {product.isWholesaleEnabled && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" title="Tarif de gros activé"></div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-neutral-900/60 z-[150] grid place-items-center overflow-y-auto p-4 py-12 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white max-w-4xl w-full border-2 border-black my-8 relative flex flex-col h-fit max-h-[90vh] shadow-2xl"
            >
              <div className="p-8 border-b border-neutral-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter">{editingProduct ? 'Modifier l\'Article Zara' : 'Nouvel Article Zara'}</h3>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Configuration de la fiche produit et des stocks</p>
                </div>
                <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-neutral-300 hover:text-black transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSaveProduct} className="p-10 overflow-y-auto custom-scrollbar flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                  {/* Left Column: Info & Image */}
                  <div className="space-y-8">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400 border-b border-neutral-100 pb-2">Informations Générales</h4>
                    
                    <div>
                      <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest block mb-2">Nom de l'Article</label>
                      <input required type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full text-lg font-black py-2 border-b-2 border-neutral-100 outline-none focus:border-black transition-all uppercase" placeholder="Ex: Chemise Oversize en Lin" />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest block mb-2">Catégorie</label>
                        <input 
                          required 
                          list="category-list"
                          type="text" 
                          value={newCategory} 
                          onChange={e => setNewCategory(e.target.value)} 
                          className="w-full bg-neutral-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none border-b border-neutral-200 focus:border-black" 
                          placeholder="Choisir ou saisir..."
                        />
                        <datalist id="category-list">
                          {Array.from(new Set([...CATEGORIES.filter(c => c !== 'Tous'), ...products.map(p => p.category)])).map(cat => (
                            <option key={cat} value={cat} />
                          ))}
                        </datalist>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest block mb-2">Sous-Catégorie</label>
                        <input 
                          type="text" 
                          list="subcategory-list"
                          value={newSubCategory} 
                          onChange={e => setNewSubCategory(e.target.value)} 
                          className="w-full text-[10px] font-black py-3 border-b-2 border-neutral-100 outline-none focus:border-black transition-all uppercase" 
                          placeholder="Ex: Collection Été" 
                        />
                        <datalist id="subcategory-list">
                          {Array.from(new Set(products.map(p => p.subCategory).filter(Boolean))).map(sub => (
                            <option key={sub} value={sub} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest block mb-2">Prix de Vente (FCFA)</label>
                        <input required type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} className="w-full text-xl font-black py-2 border-b-2 border-neutral-100 outline-none focus:border-black transition-all" placeholder="0" />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest block mb-2">Icône de Repère</label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            'Shirt', 'Baby', 'Footprints', 'Watch', 'ShoppingBag', 
                            'FlaskConical', 'Wind', 'SprayCan', 
                            'Sparkles', 'Palette', 'Brush', 
                            'Gem', 'Crown', 'Glasses', 'Scissors', 'Sun'
                          ].map(icon => (
                            <button 
                              key={icon} 
                              type="button" 
                              onClick={() => setNewIcon(icon)} 
                              className={`p-2 border transition-all ${newIcon === icon ? 'border-black bg-black text-white' : 'border-neutral-100 text-neutral-400 hover:border-black'}`}
                              title={icon}
                            >
                              <div className="w-5 h-5 flex items-center justify-center">
                                <RenderProductIcon iconName={icon} className="w-4 h-4 border-0 bg-transparent text-inherit" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest block mb-3">Image de l'Article</label>
                      <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-6">
                          <div className="w-24 h-24 bg-neutral-50 border-2 border-dashed border-neutral-200 flex items-center justify-center relative overflow-hidden group">
                            {newImageUrl ? (
                              <>
                                <img src={newImageUrl} alt="Preview" className="w-full h-full object-cover" />
                                <button onClick={() => setNewImageUrl('')} className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <X className="w-6 h-6" />
                                </button>
                              </>
                            ) : (
                              <ImageIcon className="w-8 h-8 text-neutral-300" />
                            )}
                          </div>
                          <div className="flex-1">
                            <input type="file" accept="image/*" onChange={handleImageUpload} id="product-img-upload" className="hidden" />
                            <label htmlFor="product-img-upload" className="inline-block px-4 py-2 border border-black text-[9px] font-black uppercase tracking-widest cursor-pointer hover:bg-black hover:text-white transition-all mb-2">Choisir une Image</label>
                            <p className="text-[8px] text-neutral-400 leading-relaxed font-bold uppercase">Formats : JPG, PNG, WEBP. Taille max : 2MB.</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">Ou choisir une image prédéfinie :</p>
                          <div className="grid grid-cols-4 gap-2">
                            {PRESET_IMAGES.map(img => (
                              <button 
                                key={img.url}
                                type="button"
                                onClick={() => setNewImageUrl(img.url)}
                                className={`group relative h-16 border-2 transition-all overflow-hidden ${newImageUrl === img.url ? 'border-black' : 'border-transparent hover:border-neutral-300'}`}
                              >
                                <img src={img.url} alt={img.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all flex items-center justify-center">
                                  <span className="text-[6px] font-black text-white uppercase tracking-tighter text-center px-1 leading-none drop-shadow-md">{img.name}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Variants */}
                  <div className="space-y-8">
                    <div className="flex justify-between items-center border-b border-neutral-100 pb-2">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400">Variantes & Stock</h4>
                      <button type="button" onClick={addVariant} className="text-[9px] font-black uppercase tracking-widest text-neutral-900 flex items-center hover:opacity-100 opacity-60">
                        <Plus className="w-3 h-3 mr-1" /> Ajouter Variante
                      </button>
                    </div>

                    <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                      {newVariants.map((v, idx) => (
                        <div key={v.id} className="p-4 bg-neutral-50 border border-neutral-100 relative group animate-in slide-in-from-right-4 duration-300">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="text-[7px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Taille</label>
                              <input required type="text" value={v.size} onChange={e => updateVariant(v.id, 'size', e.target.value)} className="w-full bg-white px-3 py-2 text-[9px] font-black uppercase tracking-widest outline-none border border-neutral-200 focus:border-black" placeholder="S, M, 38..." />
                            </div>
                            <div>
                              <label className="text-[7px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Couleur</label>
                              <input required type="text" value={v.color} onChange={e => updateVariant(v.id, 'color', e.target.value)} className="w-full bg-white px-3 py-2 text-[9px] font-black uppercase tracking-widest outline-none border border-neutral-200 focus:border-black" placeholder="Noir, Blanc..." />
                            </div>
                            <div>
                              <label className="text-[7px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Stock</label>
                              <input required type="number" value={v.stock} onChange={e => updateVariant(v.id, 'stock', parseInt(e.target.value) || 0)} className="w-full bg-white px-3 py-2 text-[9px] font-black outline-none border border-neutral-200 focus:border-black" />
                            </div>
                          </div>
                          <div className="mt-3 flex justify-between items-center">
                            <div className="flex-1">
                              <label className="text-[7px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Code-Barres</label>
                              <div className="flex gap-2">
                                <input type="text" value={v.barcode} onChange={e => updateVariant(v.id, 'barcode', e.target.value)} placeholder="Scanner ou saisir" className="w-full bg-white px-3 py-2 text-[8px] font-mono outline-none border border-neutral-200 focus:border-black" />
                                <button type="button" onClick={() => generateBarcode(idx)} className="px-3 bg-black text-white text-[8px] font-bold tracking-widest uppercase hover:bg-neutral-800 transition-colors shrink-0">Générer</button>
                              </div>
                            </div>
                            {newVariants.length > 1 && (
                              <button type="button" onClick={() => removeVariant(v.id)} className="ml-4 p-2 text-neutral-300 hover:text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 space-y-4">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" id="wholesale-toggle" checked={newIsWholesaleEnabled} onChange={e => setNewIsWholesaleEnabled(e.target.checked)} className="w-4 h-4 accent-black" />
                        <label htmlFor="wholesale-toggle" className="text-[9px] font-black uppercase tracking-widest cursor-pointer">Activer les Tarifs de Gros</label>
                      </div>
                      
                      {newIsWholesaleEnabled && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div>
                            <label className="text-[7px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Prix de Gros (FCFA)</label>
                            <input required={newIsWholesaleEnabled} type="number" value={newWholesalePrice} onChange={e => setNewWholesalePrice(e.target.value)} className="w-full bg-white px-3 py-2 text-[9px] font-black outline-none border border-neutral-200 focus:border-black" placeholder="0" />
                          </div>
                          <div>
                            <label className="text-[7px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Qté Min. de Gros</label>
                            <input required={newIsWholesaleEnabled} type="number" value={newWholesaleMinQty} onChange={e => setNewWholesaleMinQty(e.target.value)} className="w-full bg-white px-3 py-2 text-[9px] font-black outline-none border border-neutral-200 focus:border-black" placeholder="10" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-10 border-t border-neutral-100 sticky bottom-0 bg-white">
                  <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="flex-1 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400 border border-neutral-100 hover:text-black hover:border-black transition-all">Abandonner</button>
                  <button type="submit" className="flex-[2] py-5 bg-black text-white text-[10px] font-black uppercase tracking-[0.4em] hover:bg-neutral-800 transition-all shadow-2xl">Enregistrer la Fiche Zara</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Barcode Generation Modal */}
      <AnimatePresence>
        {barcodeProduct && (
          <div className="fixed inset-0 bg-neutral-900/90 z-[200] grid place-items-center p-4 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white max-w-4xl w-full p-10 border-2 border-black"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter mb-1">Étiquettes Barcode</h3>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Génération des étiquettes pour {barcodeProduct.name}</p>
                </div>
                <button onClick={() => setBarcodeProduct(null)} className="text-neutral-400 hover:text-black">
                  <X className="w-8 h-8" />
                </button>
              </div>

              <div id="barcode-print-area" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-10 max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar bg-neutral-50 p-6 border border-neutral-100">
                {barcodeProduct.variants.flatMap(v => 
                  Array.from({ length: Math.max(1, v.stock) }).map((_, idx) => (
                    <div key={`${v.id}-${idx}`} className="bg-white p-3 border border-neutral-100 flex flex-col items-center">
                      <p className="text-[7px] font-black uppercase text-neutral-400 mb-1 truncate w-full text-center">{v.color} / {v.size}</p>
                      <div className="w-full overflow-hidden flex justify-center py-2">
                        <ReactBarcode 
                          value={v.barcode || `ZARA-${v.id}`} 
                          width={1} 
                          height={30} 
                          fontSize={8}
                          background="transparent"
                        />
                      </div>
                      <p className="text-[8px] font-black text-black mt-1">{barcodeProduct.basePrice.toLocaleString()} FCFA</p>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-4">
                <button onClick={() => window.print()} className="flex-1 py-5 bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-neutral-800 transition-all flex items-center justify-center gap-3">
                  <Printer className="w-4 h-4" /> Imprimer les Étiquettes
                </button>
                <button onClick={() => setBarcodeProduct(null)} className="flex-1 py-5 border border-black text-[10px] font-black uppercase tracking-widest hover:bg-neutral-50 transition-all">
                  Terminer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Professional Detailed Inventory Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 bg-neutral-900/95 z-[210] flex flex-col p-4 md:p-8 overflow-y-auto backdrop-blur-md print:p-0 print:bg-white">
            <style dangerouslySetInnerHTML={{__html: `
              @media print {
                body * {
                  visibility: hidden;
                }
                #professional-inventory-report, #professional-inventory-report * {
                  visibility: visible;
                }
                #professional-inventory-report {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  background: white !important;
                  color: black !important;
                  box-shadow: none !important;
                  border: none !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}} />

            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white max-w-6xl w-full mx-auto my-auto border-2 border-black shadow-2xl flex flex-col overflow-hidden print:border-0 print:shadow-none"
            >
              {/* Header Actions - Hidden during printing */}
              <div className="no-print p-6 bg-neutral-900 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-800">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-500" />
                    Rapport d'Inventaire Professionnel
                  </h3>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">Visualisez, imprimez et exportez l'état complet du stock</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={handleExportDetailedReport}
                    className="px-4 py-2 bg-neutral-800 border border-neutral-700 text-white hover:bg-neutral-700 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-green-500" />
                    Exporter Excel Complet
                  </button>
                  <button 
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-amber-500 text-black hover:bg-amber-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Imprimer le Rapport (PDF)
                  </button>
                  <button 
                    onClick={() => setShowReportModal(false)}
                    className="p-2 bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Document Printable Content */}
              <div id="professional-inventory-report" className="bg-white p-8 md:p-12 text-black flex-1 overflow-y-auto max-h-[80vh] print:max-h-none print:overflow-visible">
                {/* Brand Header */}
                <div className="flex justify-between items-start border-b-4 border-black pb-8 mb-8">
                  <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter">ZARA BOUTIQUE</h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 mt-1">PARFUMERIE & PRÊT-À-PORTER DE LUXE</p>
                    <p className="text-[9px] text-neutral-400 font-bold uppercase mt-3">Sénégal • Service d'Inventaire Automatisé</p>
                  </div>
                  <div className="text-right">
                    <div className="bg-black text-white px-4 py-1.5 text-[9px] font-black uppercase tracking-widest inline-block mb-3">
                      DOCUMENT OFFICIEL
                    </div>
                    <p className="text-[9px] text-neutral-400 font-bold uppercase">Réf : INV-{new Date().toISOString().slice(0, 10).replace(/-/g, '')}</p>
                    <p className="text-[9px] text-neutral-400 font-bold uppercase mt-1">Date : {new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}</p>
                  </div>
                </div>

                <div className="text-center mb-8">
                  <h2 className="text-2xl font-black uppercase tracking-widest border-y border-black/10 py-3">RAPPORT TECHNIQUE D'INVENTAIRE DES STOCKS</h2>
                </div>

                {/* Synthesis KPI Section */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="p-4 border border-neutral-200 bg-neutral-50">
                    <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest mb-1">Articles Uniques</p>
                    <p className="text-2xl font-black tracking-tight">{stats.totalArticles}</p>
                    <p className="text-[7px] text-neutral-400 font-bold uppercase mt-1">Références actives</p>
                  </div>
                  <div className="p-4 border border-neutral-200 bg-neutral-50">
                    <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest mb-1">Pièces en Stock</p>
                    <p className="text-2xl font-black tracking-tight">{stats.totalStock}</p>
                    <p className="text-[7px] text-neutral-400 font-bold uppercase mt-1">Unis physiques réelles</p>
                  </div>
                  <div className="p-4 border border-neutral-200 bg-neutral-50">
                    <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest mb-1">Alertes Stock Bas</p>
                    <p className={`text-2xl font-black tracking-tight ${stats.lowStock > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {stats.lowStock}
                    </p>
                    <p className="text-[7px] text-neutral-400 font-bold uppercase mt-1">Ruptures ou seuils atteints</p>
                  </div>
                  <div className="p-4 border border-black bg-black text-white">
                    <p className="text-[8px] font-black text-neutral-300 uppercase tracking-widest mb-1">Actifs de Stockage</p>
                    <p className="text-lg md:text-xl font-black tracking-tight">{stats.totalValue.toLocaleString()} FCFA</p>
                    <p className="text-[7px] text-neutral-300 font-bold uppercase mt-1">Valeur nette d'achat/vente</p>
                  </div>
                </div>

                {/* Category Synthesis Analysis */}
                <div className="mb-10">
                  <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-neutral-400" />
                    1. Ventilation Analytique par Catégories
                  </h3>
                  <div className="border border-neutral-200 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-neutral-100 border-b border-neutral-200 text-[8px] font-black uppercase tracking-widest text-neutral-600">
                          <th className="p-3">Catégorie</th>
                          <th className="p-3 text-center">Fiches Articles</th>
                          <th className="p-3 text-center">Quantité Physique Stockée</th>
                          <th className="p-3 text-right">Valeur Estimée (FCFA)</th>
                          <th className="p-3 text-center">Statut d'Alerte</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 text-[9px]">
                        {Array.from(new Set(products.map(p => p.category))).map(cat => {
                          const catProducts = products.filter(p => p.category === cat);
                          const count = catProducts.length;
                          const qty = catProducts.reduce((acc, p) => acc + p.variants.reduce((vAcc, v) => vAcc + v.stock, 0), 0);
                          const value = catProducts.reduce((acc, p) => acc + (p.basePrice * p.variants.reduce((vAcc, v) => vAcc + v.stock, 0)), 0);
                          const hasAlert = catProducts.some(p => p.variants.some(v => v.stock <= (settings?.lowStockThreshold || 5)));
                          
                          return (
                            <tr key={cat} className="hover:bg-neutral-50/50">
                              <td className="p-3 font-black uppercase tracking-widest">{cat}</td>
                              <td className="p-3 text-center font-bold text-neutral-500">{count}</td>
                              <td className="p-3 text-center font-bold">{qty}</td>
                              <td className="p-3 text-right font-black">{value.toLocaleString()} FCFA</td>
                              <td className="p-3 text-center font-bold">
                                {hasAlert ? (
                                  <span className="text-[8px] px-2 py-0.5 bg-red-100 text-red-800 font-black uppercase tracking-wider rounded">Alerte</span>
                                ) : (
                                  <span className="text-[8px] px-2 py-0.5 bg-green-100 text-green-800 font-black uppercase tracking-wider rounded">OK</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Main Detailed Catalog */}
                <div className="mb-12">
                  <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-neutral-400" />
                    2. Registre Nominatif & État Détaillé des Articles
                  </h3>
                  <div className="border border-neutral-200 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-neutral-100 border-b border-neutral-200 text-[8px] font-black uppercase tracking-widest text-neutral-600">
                          <th className="p-3">Désignation de l'Article</th>
                          <th className="p-3">Catégorie / Sous-Catégorie</th>
                          <th className="p-3">Type / Concentration</th>
                          <th className="p-3 text-center">Taille / Volume</th>
                          <th className="p-3 text-center">Code-Barres</th>
                          <th className="p-3 text-center">Stock</th>
                          <th className="p-3 text-right">Unit. (FCFA)</th>
                          <th className="p-3 text-right">Total (FCFA)</th>
                          <th className="p-3 text-center">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 text-[8px] font-medium text-neutral-700">
                        {products.flatMap(p => 
                          p.variants.map(v => {
                            const lowStockThreshold = settings?.lowStockThreshold || 5;
                            const isLow = v.stock <= lowStockThreshold;
                            const isRupture = v.stock === 0;

                            return (
                              <tr key={v.id} className="hover:bg-neutral-50/50">
                                <td className="p-3 font-black text-black uppercase">{p.name}</td>
                                <td className="p-3 font-bold uppercase text-[7px] text-neutral-400">
                                  {p.category} <span className="font-normal block text-[6px]">{p.subCategory || '-'}</span>
                                </td>
                                <td className="p-3 font-semibold uppercase">{v.color || "Standard"}</td>
                                <td className="p-3 text-center font-bold uppercase">{v.size || "S/M"}</td>
                                <td className="p-3 text-center font-mono text-[7px] text-neutral-400">{v.barcode || "-"}</td>
                                <td className={`p-3 text-center font-black ${isRupture ? 'text-red-500' : isLow ? 'text-amber-600' : 'text-black'}`}>
                                  {v.stock}
                                </td>
                                <td className="p-3 text-right font-semibold">{p.basePrice.toLocaleString()}</td>
                                <td className="p-3 text-right font-black text-black">{(p.basePrice * v.stock).toLocaleString()}</td>
                                <td className="p-3 text-center font-bold">
                                  {isRupture ? (
                                    <span className="text-[6px] px-1.5 py-0.5 bg-red-100 text-red-700 uppercase font-black tracking-tighter rounded">Rupture</span>
                                  ) : isLow ? (
                                    <span className="text-[6px] px-1.5 py-0.5 bg-amber-100 text-amber-700 uppercase font-black tracking-tighter rounded">Alerte</span>
                                  ) : (
                                    <span className="text-[6px] px-1.5 py-0.5 bg-green-100 text-green-700 uppercase font-black tracking-tighter rounded">Correct</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer Validation & Signatures */}
                <div className="grid grid-cols-2 gap-8 border-t border-dashed border-neutral-300 pt-8 mt-12">
                  <div>
                    <h4 className="text-[9px] font-black uppercase tracking-wider text-neutral-400 mb-8">Visa de l'Agent de Saisie / Auditeur</h4>
                    <div className="border-b border-neutral-300 w-48 h-8 mb-2"></div>
                    <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">Nom : _____________________</p>
                    <p className="text-[7px] text-neutral-300 font-bold uppercase mt-1">Signature & Mention "Certifié exact"</p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <h4 className="text-[9px] font-black uppercase tracking-wider text-neutral-400 mb-8 w-48 text-left">Validation de la Direction</h4>
                    <div className="border-b border-neutral-300 w-48 h-8 mb-2"></div>
                    <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest text-left w-48">Date : ____/____/2026</p>
                    <p className="text-[7px] text-neutral-300 font-bold uppercase mt-1 text-left w-48">Cachet Zara Sénégal & Signature</p>
                  </div>
                </div>

                {/* Automated verification watermark */}
                <div className="mt-16 text-center text-[7px] text-neutral-300 font-bold uppercase tracking-widest border-t border-neutral-100 pt-4">
                  Généré informatiquement via Zara Stock Control System • f286983b-33f8-41ee-b3f6-01d3584db7a2
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
