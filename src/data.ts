import { Product, User, Promotion, Customer, AppSettings } from './types';

export const USERS: User[] = [
  { id: '1', name: 'Mande Mohamed', pin: '270786', role: 'ADMIN', isActive: true, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
  { id: '2', name: 'Alimata (Direction)', pin: '123456', role: 'ADMIN', isActive: true, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
  { id: '3', name: 'Oumar (Manager)', pin: '567890', role: 'MANAGER', isActive: true, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
  { id: '4', name: 'Fatou (Caisse Principale)', pin: '000000', role: 'CAISSIER', isActive: true, avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },
];

export const INITIAL_SETTINGS: AppSettings = {
  isPaymentLocked: false,
  manualLock: false,
  autoLockEnabled: true,
  openingTime: '08:30',
  closingTime: '18:00',
  isCashSessionRequired: true,
  logoUrl: '/logo-web.png',
  storeName: 'ZARA GALLERY',
  storeAddress: 'Ouagadougou, Burkina Faso',
  storePhone: '+226 25 30 00 00',
  welcomeMessageEnabled: true,
  welcomeMessageText: 'QUE CETTE JOURNEE SOIT COURONNER DE SUCCES CE MESSAGE EST EDITER PAR L ADMIN',
  isDatabaseSyncEnabled: true,
  themeColor: 'black',
  darkModeEnabled: false,
  lowStockThreshold: 5
};

export const INITIAL_PROMOTIONS: Promotion[] = [
  { id: 'p1', title: 'Opération Spéciale : -10% dès 3 articles', imageUrl: '', isActive: true, type: 'BANNER', discountValue: 10 },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Moussa Traoré', phone: '70000000', loyaltyPoints: 150, totalSpent: 45000 },
  { id: 'c2', name: 'Awa Diallo', phone: '76000000', loyaltyPoints: 300, totalSpent: 95000 },
];

export const CATEGORIES = ['Tous', 'Femme', 'Homme', 'Enfant', 'Bébé', 'Chaussures', 'Accessoires', 'Parfums', 'Beauté'];

export const PRESET_IMAGES = [
  { name: 'Vêtements Femme', url: 'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?w=400&q=80' },
  { name: 'Vêtements Homme', url: 'https://images.unsplash.com/photo-1594932224828-b4b059b6f6f8?w=400&q=80' },
  { name: 'Parfum Luxe', url: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&q=80' },
  { name: 'Maquillage', url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&q=80' },
  { name: 'Accessoires', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80' },
  { name: 'Montre Zara', url: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&q=80' },
  { name: 'Chaussures', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80' },
  { name: 'Bébé Zara', url: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=400&q=80' },
];

// Helper to generate variants
const generateVariants = (productId: string, sizes: string[], colors: string[], baseStock: number) => {
  const variants = [];
  let barcodeNum = parseInt(`20000${productId}00`);
  
  for (const color of colors) {
    for (const size of sizes) {
      variants.push({
        id: `v-${productId}-${color}-${size}`,
        size,
        color,
        stock: Math.floor(Math.random() * baseStock) + 2, // Random stock between 2 and baseStock
        barcode: (barcodeNum++).toString()
      });
    }
  }
  return variants;
};

export const INITIAL_PRODUCTS: Product[] = [
  { 
    id: '1', name: 'Robe d\'été Fleurie', basePrice: 15000, category: 'Femme', subCategory: 'Robes', imageColor: 'Shirt',
    variants: generateVariants('1', ['S', 'M', 'L'], ['Rouge', 'Bleu', 'Jaune'], 10)
  },
  { 
    id: '2', name: 'Costume 2 Pièces Slim', basePrice: 45000, category: 'Homme', subCategory: 'Costumes', imageColor: 'Shirt',
    variants: generateVariants('2', ['48', '50', '52', '54'], ['Noir', 'Bleu Marine', 'Gris'], 5)
  },
  { 
    id: '3', name: 'T-shirt Basique Col V', basePrice: 5000, category: 'Homme', subCategory: 'T-Shirts', imageColor: 'Shirt',
    variants: generateVariants('3', ['M', 'L', 'XL', 'XXL'], ['Blanc', 'Noir', 'Gris'], 20)
  },
  { 
    id: '4', name: 'Ensemble Bébé Coton', basePrice: 8500, category: 'Bébé', subCategory: 'Ensembles', imageColor: 'Baby',
    variants: generateVariants('4', ['3 mois', '6 mois', '12 mois'], ['Mixte', 'Rose', 'Bleu'], 15)
  },
  { 
    id: '5', name: 'Jean Skinny Taille Haute', basePrice: 12000, category: 'Femme', subCategory: 'Pantalons', imageColor: 'Shirt',
    variants: generateVariants('5', ['36', '38', '40', '42'], ['Bleu Brut', 'Noir', 'Bleu Clair'], 12)
  },
  { 
    id: '6', name: 'Chemise Manche Longue', basePrice: 10000, category: 'Homme', subCategory: 'Chemises', imageColor: 'Shirt',
    variants: generateVariants('6', ['S', 'M', 'L', 'XL'], ['Blanc', 'Bleu Ciel', 'Rayé'], 10)
  },
  { 
    id: '7', name: 'Robe de Soirée Paillettes', basePrice: 25000, category: 'Femme', subCategory: 'Robes', imageColor: 'Shirt',
    variants: generateVariants('7', ['S', 'M', 'L'], ['Or', 'Argent', 'Noir'], 4)
  },
  { 
    id: '8', name: 'Baskets Urbaines Enfant', basePrice: 12500, category: 'Enfant', subCategory: 'Chaussures', imageColor: 'Footprints',
    variants: generateVariants('8', ['28', '30', '32', '34'], ['Blanc/Rouge', 'Noir'], 8)
  },
  { 
    id: '9', name: 'Sac à Main Cuir PU', basePrice: 18000, category: 'Accessoires', subCategory: 'Sacs', imageColor: 'ShoppingBag',
    variants: generateVariants('9', ['Unique'], ['Marron', 'Noir', 'Beige'], 6)
  },
  { 
    id: '10', name: 'Polo Garçon Brodé', basePrice: 6000, category: 'Enfant', subCategory: 'T-Shirts', imageColor: 'Shirt',
    variants: generateVariants('10', ['4 ans', '6 ans', '8 ans', '10 ans'], ['Bleu Marine', 'Rouge', 'Blanc'], 15)
  },
  { 
    id: '11', name: 'Escarpins Vernis', basePrice: 16000, category: 'Chaussures', subCategory: 'Femme', imageColor: 'Footprints',
    variants: generateVariants('11', ['37', '38', '39', '40'], ['Rouge', 'Noir', 'Nude'], 6)
  },
  { 
    id: '12', name: 'Ceinture Automatique', basePrice: 5500, category: 'Accessoires', subCategory: 'Homme', imageColor: 'Watch',
    variants: generateVariants('12', ['Unique'], ['Noir', 'Marron'], 20)
  },
];
