-- SQL Database Dump for Zara Gallery POS
-- Compatible with MariaDB 10+ and MySQL 8.0+
-- Prepared for Debian deployment

-- (Database selection handled by the command-line client)

-- 1. Create table structure
CREATE TABLE IF NOT EXISTS `app_state` (
  `id` INT PRIMARY KEY,
  `data` LONGTEXT NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.1 Create partitioned transactional table for history and analytics (Partition by YEAR)
CREATE TABLE IF NOT EXISTS `transactions_history` (
  `id` VARCHAR(255) NOT NULL,
  `date` DATETIME NOT NULL,
  `client_name` VARCHAR(255) DEFAULT NULL,
  `total` DECIMAL(10,2) DEFAULT '0.00',
  `payment_method` VARCHAR(100) DEFAULT NULL,
  `items` JSON DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
PARTITION BY RANGE (YEAR(`date`)) (
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION p2025 VALUES LESS THAN (2026),
  PARTITION p2026 VALUES LESS THAN (2027),
  PARTITION p2027 VALUES LESS THAN (2028),
  PARTITION p2028 VALUES LESS THAN (2029),
  PARTITION p2029 VALUES LESS THAN (2030),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- 2. Insert or update initial dataset
INSERT INTO `app_state` (`id`, `data`)
VALUES (1, '{
  "products": [
    {
      "id": "1",
      "name": "Robe d\'été Fleurie",
      "basePrice": 15000,
      "category": "Femme",
      "subCategory": "Robes",
      "imageColor": "Shirt",
      "variants": [
        {
          "id": "v-1-Rouge-S",
          "size": "S",
          "color": "Rouge",
          "stock": 6,
          "barcode": "20000100"
        },
        {
          "id": "v-1-Rouge-M",
          "size": "M",
          "color": "Rouge",
          "stock": 3,
          "barcode": "20000101"
        },
        {
          "id": "v-1-Rouge-L",
          "size": "L",
          "color": "Rouge",
          "stock": 9,
          "barcode": "20000102"
        },
        {
          "id": "v-1-Bleu-S",
          "size": "S",
          "color": "Bleu",
          "stock": 7,
          "barcode": "20000103"
        },
        {
          "id": "v-1-Bleu-M",
          "size": "M",
          "color": "Bleu",
          "stock": 5,
          "barcode": "20000104"
        },
        {
          "id": "v-1-Bleu-L",
          "size": "L",
          "color": "Bleu",
          "stock": 2,
          "barcode": "20000105"
        },
        {
          "id": "v-1-Jaune-S",
          "size": "S",
          "color": "Jaune",
          "stock": 8,
          "barcode": "20000106"
        },
        {
          "id": "v-1-Jaune-M",
          "size": "M",
          "color": "Jaune",
          "stock": 8,
          "barcode": "20000107"
        },
        {
          "id": "v-1-Jaune-L",
          "size": "L",
          "color": "Jaune",
          "stock": 5,
          "barcode": "20000108"
        }
      ]
    },
    {
      "id": "2",
      "name": "Costume 2 Pièces Slim",
      "basePrice": 45000,
      "category": "Homme",
      "subCategory": "Costumes",
      "imageColor": "Shirt",
      "variants": [
        {
          "id": "v-2-Noir-48",
          "size": "48",
          "color": "Noir",
          "stock": 2,
          "barcode": "20000200"
        },
        {
          "id": "v-2-Noir-50",
          "size": "50",
          "color": "Noir",
          "stock": 5,
          "barcode": "20000201"
        },
        {
          "id": "v-2-Noir-52",
          "size": "52",
          "color": "Noir",
          "stock": 6,
          "barcode": "20000202"
        },
        {
          "id": "v-2-Noir-54",
          "size": "54",
          "color": "Noir",
          "stock": 3,
          "barcode": "20000203"
        },
        {
          "id": "v-2-Bleu Marine-48",
          "size": "48",
          "color": "Bleu Marine",
          "stock": 3,
          "barcode": "20000204"
        },
        {
          "id": "v-2-Bleu Marine-50",
          "size": "50",
          "color": "Bleu Marine",
          "stock": 2,
          "barcode": "20000205"
        },
        {
          "id": "v-2-Bleu Marine-52",
          "size": "52",
          "color": "Bleu Marine",
          "stock": 6,
          "barcode": "20000206"
        },
        {
          "id": "v-2-Bleu Marine-54",
          "size": "54",
          "color": "Bleu Marine",
          "stock": 5,
          "barcode": "20000207"
        },
        {
          "id": "v-2-Gris-48",
          "size": "48",
          "color": "Gris",
          "stock": 3,
          "barcode": "20000208"
        },
        {
          "id": "v-2-Gris-50",
          "size": "50",
          "color": "Gris",
          "stock": 5,
          "barcode": "20000209"
        },
        {
          "id": "v-2-Gris-52",
          "size": "52",
          "color": "Gris",
          "stock": 3,
          "barcode": "20000210"
        },
        {
          "id": "v-2-Gris-54",
          "size": "54",
          "color": "Gris",
          "stock": 4,
          "barcode": "20000211"
        }
      ]
    },
    {
      "id": "3",
      "name": "T-shirt Basique Col V",
      "basePrice": 5000,
      "category": "Homme",
      "subCategory": "T-Shirts",
      "imageColor": "Shirt",
      "variants": [
        {
          "id": "v-3-Blanc-M",
          "size": "M",
          "color": "Blanc",
          "stock": 9,
          "barcode": "20000300"
        },
        {
          "id": "v-3-Blanc-L",
          "size": "L",
          "color": "Blanc",
          "stock": 8,
          "barcode": "20000301"
        },
        {
          "id": "v-3-Blanc-XL",
          "size": "XL",
          "color": "Blanc",
          "stock": 18,
          "barcode": "20000302"
        },
        {
          "id": "v-3-Blanc-XXL",
          "size": "XXL",
          "color": "Blanc",
          "stock": 19,
          "barcode": "20000303"
        },
        {
          "id": "v-3-Noir-M",
          "size": "M",
          "color": "Noir",
          "stock": 11,
          "barcode": "20000304"
        },
        {
          "id": "v-3-Noir-L",
          "size": "L",
          "color": "Noir",
          "stock": 11,
          "barcode": "20000305"
        },
        {
          "id": "v-3-Noir-XL",
          "size": "XL",
          "color": "Noir",
          "stock": 21,
          "barcode": "20000306"
        },
        {
          "id": "v-3-Noir-XXL",
          "size": "XXL",
          "color": "Noir",
          "stock": 7,
          "barcode": "20000307"
        },
        {
          "id": "v-3-Gris-M",
          "size": "M",
          "color": "Gris",
          "stock": 8,
          "barcode": "20000308"
        },
        {
          "id": "v-3-Gris-L",
          "size": "L",
          "color": "Gris",
          "stock": 15,
          "barcode": "20000309"
        },
        {
          "id": "v-3-Gris-XL",
          "size": "XL",
          "color": "Gris",
          "stock": 3,
          "barcode": "20000310"
        },
        {
          "id": "v-3-Gris-XXL",
          "size": "XXL",
          "color": "Gris",
          "stock": 4,
          "barcode": "20000311"
        }
      ]
    },
    {
      "id": "4",
      "name": "Ensemble Bébé Coton",
      "basePrice": 8500,
      "category": "Bébé",
      "subCategory": "Ensembles",
      "imageColor": "Baby",
      "variants": [
        {
          "id": "v-4-Mixte-3 mois",
          "size": "3 mois",
          "color": "Mixte",
          "stock": 4,
          "barcode": "20000400"
        },
        {
          "id": "v-4-Mixte-6 mois",
          "size": "6 mois",
          "color": "Mixte",
          "stock": 14,
          "barcode": "20000401"
        },
        {
          "id": "v-4-Mixte-12 mois",
          "size": "12 mois",
          "color": "Mixte",
          "stock": 16,
          "barcode": "20000402"
        },
        {
          "id": "v-4-Rose-3 mois",
          "size": "3 mois",
          "color": "Rose",
          "stock": 12,
          "barcode": "20000403"
        },
        {
          "id": "v-4-Rose-6 mois",
          "size": "6 mois",
          "color": "Rose",
          "stock": 11,
          "barcode": "20000404"
        },
        {
          "id": "v-4-Rose-12 mois",
          "size": "12 mois",
          "color": "Rose",
          "stock": 7,
          "barcode": "20000405"
        },
        {
          "id": "v-4-Bleu-3 mois",
          "size": "3 mois",
          "color": "Bleu",
          "stock": 8,
          "barcode": "20000406"
        },
        {
          "id": "v-4-Bleu-6 mois",
          "size": "6 mois",
          "color": "Bleu",
          "stock": 11,
          "barcode": "20000407"
        },
        {
          "id": "v-4-Bleu-12 mois",
          "size": "12 mois",
          "color": "Bleu",
          "stock": 5,
          "barcode": "20000408"
        }
      ]
    },
    {
      "id": "5",
      "name": "Jean Skinny Taille Haute",
      "basePrice": 12000,
      "category": "Femme",
      "subCategory": "Pantalons",
      "imageColor": "Shirt",
      "variants": [
        {
          "id": "v-5-Bleu Brut-36",
          "size": "36",
          "color": "Bleu Brut",
          "stock": 11,
          "barcode": "20000500"
        },
        {
          "id": "v-5-Bleu Brut-38",
          "size": "38",
          "color": "Bleu Brut",
          "stock": 8,
          "barcode": "20000501"
        },
        {
          "id": "v-5-Bleu Brut-40",
          "size": "40",
          "color": "Bleu Brut",
          "stock": 7,
          "barcode": "20000502"
        },
        {
          "id": "v-5-Bleu Brut-42",
          "size": "42",
          "color": "Bleu Brut",
          "stock": 2,
          "barcode": "20000503"
        },
        {
          "id": "v-5-Noir-36",
          "size": "36",
          "color": "Noir",
          "stock": 6,
          "barcode": "20000504"
        },
        {
          "id": "v-5-Noir-38",
          "size": "38",
          "color": "Noir",
          "stock": 3,
          "barcode": "20000505"
        },
        {
          "id": "v-5-Noir-40",
          "size": "40",
          "color": "Noir",
          "stock": 13,
          "barcode": "20000506"
        },
        {
          "id": "v-5-Noir-42",
          "size": "42",
          "color": "Noir",
          "stock": 9,
          "barcode": "20000507"
        },
        {
          "id": "v-5-Bleu Clair-36",
          "size": "36",
          "color": "Bleu Clair",
          "stock": 2,
          "barcode": "20000508"
        },
        {
          "id": "v-5-Bleu Clair-38",
          "size": "38",
          "color": "Bleu Clair",
          "stock": 3,
          "barcode": "20000509"
        },
        {
          "id": "v-5-Bleu Clair-40",
          "size": "40",
          "color": "Bleu Clair",
          "stock": 10,
          "barcode": "20000510"
        },
        {
          "id": "v-5-Bleu Clair-42",
          "size": "42",
          "color": "Bleu Clair",
          "stock": 6,
          "barcode": "20000511"
        }
      ]
    },
    {
      "id": "6",
      "name": "Chemise Manche Longue",
      "basePrice": 10000,
      "category": "Homme",
      "subCategory": "Chemises",
      "imageColor": "Shirt",
      "variants": [
        {
          "id": "v-6-Blanc-S",
          "size": "S",
          "color": "Blanc",
          "stock": 3,
          "barcode": "20000600"
        },
        {
          "id": "v-6-Blanc-M",
          "size": "M",
          "color": "Blanc",
          "stock": 9,
          "barcode": "20000601"
        },
        {
          "id": "v-6-Blanc-L",
          "size": "L",
          "color": "Blanc",
          "stock": 7,
          "barcode": "20000602"
        },
        {
          "id": "v-6-Blanc-XL",
          "size": "XL",
          "color": "Blanc",
          "stock": 11,
          "barcode": "20000603"
        },
        {
          "id": "v-6-Bleu Ciel-S",
          "size": "S",
          "color": "Bleu Ciel",
          "stock": 7,
          "barcode": "20000604"
        },
        {
          "id": "v-6-Bleu Ciel-M",
          "size": "M",
          "color": "Bleu Ciel",
          "stock": 3,
          "barcode": "20000605"
        },
        {
          "id": "v-6-Bleu Ciel-L",
          "size": "L",
          "color": "Bleu Ciel",
          "stock": 5,
          "barcode": "20000606"
        },
        {
          "id": "v-6-Bleu Ciel-XL",
          "size": "XL",
          "color": "Bleu Ciel",
          "stock": 6,
          "barcode": "20000607"
        },
        {
          "id": "v-6-Rayé-S",
          "size": "S",
          "color": "Rayé",
          "stock": 3,
          "barcode": "20000608"
        },
        {
          "id": "v-6-Rayé-M",
          "size": "M",
          "color": "Rayé",
          "stock": 8,
          "barcode": "20000609"
        },
        {
          "id": "v-6-Rayé-L",
          "size": "L",
          "color": "Rayé",
          "stock": 9,
          "barcode": "20000610"
        },
        {
          "id": "v-6-Rayé-XL",
          "size": "XL",
          "color": "Rayé",
          "stock": 7,
          "barcode": "20000611"
        }
      ]
    },
    {
      "id": "7",
      "name": "Robe de Soirée Paillettes",
      "basePrice": 25000,
      "category": "Femme",
      "subCategory": "Robes",
      "imageColor": "Shirt",
      "variants": [
        {
          "id": "v-7-Or-S",
          "size": "S",
          "color": "Or",
          "stock": 5,
          "barcode": "20000700"
        },
        {
          "id": "v-7-Or-M",
          "size": "M",
          "color": "Or",
          "stock": 3,
          "barcode": "20000701"
        },
        {
          "id": "v-7-Or-L",
          "size": "L",
          "color": "Or",
          "stock": 4,
          "barcode": "20000702"
        },
        {
          "id": "v-7-Argent-S",
          "size": "S",
          "color": "Argent",
          "stock": 2,
          "barcode": "20000703"
        },
        {
          "id": "v-7-Argent-M",
          "size": "M",
          "color": "Argent",
          "stock": 5,
          "barcode": "20000704"
        },
        {
          "id": "v-7-Argent-L",
          "size": "L",
          "color": "Argent",
          "stock": 2,
          "barcode": "20000705"
        },
        {
          "id": "v-7-Noir-S",
          "size": "S",
          "color": "Noir",
          "stock": 3,
          "barcode": "20000706"
        },
        {
          "id": "v-7-Noir-M",
          "size": "M",
          "color": "Noir",
          "stock": 5,
          "barcode": "20000707"
        },
        {
          "id": "v-7-Noir-L",
          "size": "L",
          "color": "Noir",
          "stock": 2,
          "barcode": "20000708"
        }
      ]
    },
    {
      "id": "8",
      "name": "Baskets Urbaines Enfant",
      "basePrice": 12500,
      "category": "Enfant",
      "subCategory": "Chaussures",
      "imageColor": "Footprints",
      "variants": [
        {
          "id": "v-8-Blanc/Rouge-28",
          "size": "28",
          "color": "Blanc/Rouge",
          "stock": 3,
          "barcode": "20000800"
        },
        {
          "id": "v-8-Blanc/Rouge-30",
          "size": "30",
          "color": "Blanc/Rouge",
          "stock": 3,
          "barcode": "20000801"
        },
        {
          "id": "v-8-Blanc/Rouge-32",
          "size": "32",
          "color": "Blanc/Rouge",
          "stock": 4,
          "barcode": "20000802"
        },
        {
          "id": "v-8-Blanc/Rouge-34",
          "size": "34",
          "color": "Blanc/Rouge",
          "stock": 4,
          "barcode": "20000803"
        },
        {
          "id": "v-8-Noir-28",
          "size": "28",
          "color": "Noir",
          "stock": 7,
          "barcode": "20000804"
        },
        {
          "id": "v-8-Noir-30",
          "size": "30",
          "color": "Noir",
          "stock": 6,
          "barcode": "20000805"
        },
        {
          "id": "v-8-Noir-32",
          "size": "32",
          "color": "Noir",
          "stock": 3,
          "barcode": "20000806"
        },
        {
          "id": "v-8-Noir-34",
          "size": "34",
          "color": "Noir",
          "stock": 9,
          "barcode": "20000807"
        }
      ]
    },
    {
      "id": "9",
      "name": "Sac à Main Cuir PU",
      "basePrice": 18000,
      "category": "Accessoires",
      "subCategory": "Sacs",
      "imageColor": "ShoppingBag",
      "variants": [
        {
          "id": "v-9-Marron-Unique",
          "size": "Unique",
          "color": "Marron",
          "stock": 2,
          "barcode": "20000900"
        },
        {
          "id": "v-9-Noir-Unique",
          "size": "Unique",
          "color": "Noir",
          "stock": 6,
          "barcode": "20000901"
        },
        {
          "id": "v-9-Beige-Unique",
          "size": "Unique",
          "color": "Beige",
          "stock": 5,
          "barcode": "20000902"
        }
      ]
    },
    {
      "id": "10",
      "name": "Polo Garçon Brodé",
      "basePrice": 6000,
      "category": "Enfant",
      "subCategory": "T-Shirts",
      "imageColor": "Shirt",
      "variants": [
        {
          "id": "v-10-Bleu Marine-4 ans",
          "size": "4 ans",
          "color": "Bleu Marine",
          "stock": 16,
          "barcode": "200001000"
        },
        {
          "id": "v-10-Bleu Marine-6 ans",
          "size": "6 ans",
          "color": "Bleu Marine",
          "stock": 4,
          "barcode": "200001001"
        },
        {
          "id": "v-10-Bleu Marine-8 ans",
          "size": "8 ans",
          "color": "Bleu Marine",
          "stock": 7,
          "barcode": "200001002"
        },
        {
          "id": "v-10-Bleu Marine-10 ans",
          "size": "10 ans",
          "color": "Bleu Marine",
          "stock": 13,
          "barcode": "200001003"
        },
        {
          "id": "v-10-Rouge-4 ans",
          "size": "4 ans",
          "color": "Rouge",
          "stock": 16,
          "barcode": "200001004"
        },
        {
          "id": "v-10-Rouge-6 ans",
          "size": "6 ans",
          "color": "Rouge",
          "stock": 14,
          "barcode": "200001005"
        },
        {
          "id": "v-10-Rouge-8 ans",
          "size": "8 ans",
          "color": "Rouge",
          "stock": 12,
          "barcode": "200001006"
        },
        {
          "id": "v-10-Rouge-10 ans",
          "size": "10 ans",
          "color": "Rouge",
          "stock": 13,
          "barcode": "200001007"
        },
        {
          "id": "v-10-Blanc-4 ans",
          "size": "4 ans",
          "color": "Blanc",
          "stock": 4,
          "barcode": "200001008"
        },
        {
          "id": "v-10-Blanc-6 ans",
          "size": "6 ans",
          "color": "Blanc",
          "stock": 15,
          "barcode": "200001009"
        },
        {
          "id": "v-10-Blanc-8 ans",
          "size": "8 ans",
          "color": "Blanc",
          "stock": 9,
          "barcode": "200001010"
        },
        {
          "id": "v-10-Blanc-10 ans",
          "size": "10 ans",
          "color": "Blanc",
          "stock": 2,
          "barcode": "200001011"
        }
      ]
    },
    {
      "id": "11",
      "name": "Escarpins Vernis",
      "basePrice": 16000,
      "category": "Chaussures",
      "subCategory": "Femme",
      "imageColor": "Footprints",
      "variants": [
        {
          "id": "v-11-Rouge-37",
          "size": "37",
          "color": "Rouge",
          "stock": 5,
          "barcode": "200001100"
        },
        {
          "id": "v-11-Rouge-38",
          "size": "38",
          "color": "Rouge",
          "stock": 6,
          "barcode": "200001101"
        },
        {
          "id": "v-11-Rouge-39",
          "size": "39",
          "color": "Rouge",
          "stock": 3,
          "barcode": "200001102"
        },
        {
          "id": "v-11-Rouge-40",
          "size": "40",
          "color": "Rouge",
          "stock": 3,
          "barcode": "200001103"
        },
        {
          "id": "v-11-Noir-37",
          "size": "37",
          "color": "Noir",
          "stock": 5,
          "barcode": "200001104"
        },
        {
          "id": "v-11-Noir-38",
          "size": "38",
          "color": "Noir",
          "stock": 7,
          "barcode": "200001105"
        },
        {
          "id": "v-11-Noir-39",
          "size": "39",
          "color": "Noir",
          "stock": 7,
          "barcode": "200001106"
        },
        {
          "id": "v-11-Noir-40",
          "size": "40",
          "color": "Noir",
          "stock": 5,
          "barcode": "200001107"
        },
        {
          "id": "v-11-Nude-37",
          "size": "37",
          "color": "Nude",
          "stock": 2,
          "barcode": "200001108"
        },
        {
          "id": "v-11-Nude-38",
          "size": "38",
          "color": "Nude",
          "stock": 6,
          "barcode": "200001109"
        },
        {
          "id": "v-11-Nude-39",
          "size": "39",
          "color": "Nude",
          "stock": 4,
          "barcode": "200001110"
        },
        {
          "id": "v-11-Nude-40",
          "size": "40",
          "color": "Nude",
          "stock": 4,
          "barcode": "200001111"
        }
      ]
    },
    {
      "id": "12",
      "name": "Ceinture Automatique",
      "basePrice": 5500,
      "category": "Accessoires",
      "subCategory": "Homme",
      "imageColor": "Watch",
      "variants": [
        {
          "id": "v-12-Noir-Unique",
          "size": "Unique",
          "color": "Noir",
          "stock": 13,
          "barcode": "200001200"
        },
        {
          "id": "v-12-Marron-Unique",
          "size": "Unique",
          "color": "Marron",
          "stock": 13,
          "barcode": "200001201"
        }
      ]
    }
  ],
  "orders": [
    {
      "id": "TKT-NGBCS",
      "date": "2026-05-30T14:54:14.271Z",
      "cashier": "SAWADOGO ODILE (Caisse Principale)",
      "items": [
        {
          "id": "1780152706154",
          "product": {
            "id": "3",
            "name": "T-shirt Basique Col V",
            "basePrice": 5000,
            "category": "Homme",
            "subCategory": "T-Shirts",
            "imageColor": "Shirt",
            "variants": [
              {
                "id": "v-3-Blanc-M",
                "size": "M",
                "color": "Blanc",
                "stock": 9,
                "barcode": "20000300"
              },
              {
                "id": "v-3-Blanc-L",
                "size": "L",
                "color": "Blanc",
                "stock": 8,
                "barcode": "20000301"
              },
              {
                "id": "v-3-Blanc-XL",
                "size": "XL",
                "color": "Blanc",
                "stock": 18,
                "barcode": "20000302"
              },
              {
                "id": "v-3-Blanc-XXL",
                "size": "XXL",
                "color": "Blanc",
                "stock": 19,
                "barcode": "20000303"
              },
              {
                "id": "v-3-Noir-M",
                "size": "M",
                "color": "Noir",
                "stock": 13,
                "barcode": "20000304"
              },
              {
                "id": "v-3-Noir-L",
                "size": "L",
                "color": "Noir",
                "stock": 11,
                "barcode": "20000305"
              },
              {
                "id": "v-3-Noir-XL",
                "size": "XL",
                "color": "Noir",
                "stock": 21,
                "barcode": "20000306"
              },
              {
                "id": "v-3-Noir-XXL",
                "size": "XXL",
                "color": "Noir",
                "stock": 7,
                "barcode": "20000307"
              },
              {
                "id": "v-3-Gris-M",
                "size": "M",
                "color": "Gris",
                "stock": 8,
                "barcode": "20000308"
              },
              {
                "id": "v-3-Gris-L",
                "size": "L",
                "color": "Gris",
                "stock": 15,
                "barcode": "20000309"
              },
              {
                "id": "v-3-Gris-XL",
                "size": "XL",
                "color": "Gris",
                "stock": 3,
                "barcode": "20000310"
              },
              {
                "id": "v-3-Gris-XXL",
                "size": "XXL",
                "color": "Gris",
                "stock": 4,
                "barcode": "20000311"
              }
            ]
          },
          "variant": {
            "id": "v-3-Noir-M",
            "size": "M",
            "color": "Noir",
            "stock": 13,
            "barcode": "20000304"
          },
          "quantity": 2,
          "discount": 0
        }
      ],
      "subtotal": 10000,
      "tax": 0,
      "discountTotal": 0,
      "total": 10000,
      "payments": [
        {
          "method": "CASH",
          "amount": 10000
        },
        {
          "method": "CASH",
          "amount": 10000
        }
      ],
      "status": "COMPLETED"
    },
    {
      "id": "TKT-5BMXB",
      "date": "2026-05-30T14:40:51.121Z",
      "cashier": "SAWADOGO ODILE (Caisse Principale)",
      "items": [
        {
          "id": "1780151964201",
          "product": {
            "id": "1",
            "name": "Robe d\'été Fleurie",
            "basePrice": 15000,
            "category": "Femme",
            "subCategory": "Robes",
            "imageColor": "Shirt",
            "variants": [
              {
                "id": "v-1-Rouge-S",
                "size": "S",
                "color": "Rouge",
                "stock": 6,
                "barcode": "20000100"
              },
              {
                "id": "v-1-Rouge-M",
                "size": "M",
                "color": "Rouge",
                "stock": 3,
                "barcode": "20000101"
              },
              {
                "id": "v-1-Rouge-L",
                "size": "L",
                "color": "Rouge",
                "stock": 9,
                "barcode": "20000102"
              },
              {
                "id": "v-1-Bleu-S",
                "size": "S",
                "color": "Bleu",
                "stock": 7,
                "barcode": "20000103"
              },
              {
                "id": "v-1-Bleu-M",
                "size": "M",
                "color": "Bleu",
                "stock": 7,
                "barcode": "20000104"
              },
              {
                "id": "v-1-Bleu-L",
                "size": "L",
                "color": "Bleu",
                "stock": 2,
                "barcode": "20000105"
              },
              {
                "id": "v-1-Jaune-S",
                "size": "S",
                "color": "Jaune",
                "stock": 8,
                "barcode": "20000106"
              },
              {
                "id": "v-1-Jaune-M",
                "size": "M",
                "color": "Jaune",
                "stock": 8,
                "barcode": "20000107"
              },
              {
                "id": "v-1-Jaune-L",
                "size": "L",
                "color": "Jaune",
                "stock": 5,
                "barcode": "20000108"
              }
            ]
          },
          "variant": {
            "id": "v-1-Bleu-M",
            "size": "M",
            "color": "Bleu",
            "stock": 7,
            "barcode": "20000104"
          },
          "quantity": 2,
          "discount": 0
        },
        {
          "id": "1780151982558",
          "product": {
            "id": "10",
            "name": "Polo Garçon Brodé",
            "basePrice": 6000,
            "category": "Enfant",
            "subCategory": "T-Shirts",
            "imageColor": "Shirt",
            "variants": [
              {
                "id": "v-10-Bleu Marine-4 ans",
                "size": "4 ans",
                "color": "Bleu Marine",
                "stock": 16,
                "barcode": "200001000"
              },
              {
                "id": "v-10-Bleu Marine-6 ans",
                "size": "6 ans",
                "color": "Bleu Marine",
                "stock": 4,
                "barcode": "200001001"
              },
              {
                "id": "v-10-Bleu Marine-8 ans",
                "size": "8 ans",
                "color": "Bleu Marine",
                "stock": 7,
                "barcode": "200001002"
              },
              {
                "id": "v-10-Bleu Marine-10 ans",
                "size": "10 ans",
                "color": "Bleu Marine",
                "stock": 13,
                "barcode": "200001003"
              },
              {
                "id": "v-10-Rouge-4 ans",
                "size": "4 ans",
                "color": "Rouge",
                "stock": 16,
                "barcode": "200001004"
              },
              {
                "id": "v-10-Rouge-6 ans",
                "size": "6 ans",
                "color": "Rouge",
                "stock": 15,
                "barcode": "200001005"
              },
              {
                "id": "v-10-Rouge-8 ans",
                "size": "8 ans",
                "color": "Rouge",
                "stock": 12,
                "barcode": "200001006"
              },
              {
                "id": "v-10-Rouge-10 ans",
                "size": "10 ans",
                "color": "Rouge",
                "stock": 13,
                "barcode": "200001007"
              },
              {
                "id": "v-10-Blanc-4 ans",
                "size": "4 ans",
                "color": "Blanc",
                "stock": 4,
                "barcode": "200001008"
              },
              {
                "id": "v-10-Blanc-6 ans",
                "size": "6 ans",
                "color": "Blanc",
                "stock": 15,
                "barcode": "200001009"
              },
              {
                "id": "v-10-Blanc-8 ans",
                "size": "8 ans",
                "color": "Blanc",
                "stock": 9,
                "barcode": "200001010"
              },
              {
                "id": "v-10-Blanc-10 ans",
                "size": "10 ans",
                "color": "Blanc",
                "stock": 2,
                "barcode": "200001011"
              }
            ]
          },
          "variant": {
            "id": "v-10-Rouge-6 ans",
            "size": "6 ans",
            "color": "Rouge",
            "stock": 15,
            "barcode": "200001005"
          },
          "quantity": 1,
          "discount": 0
        }
      ],
      "subtotal": 36000,
      "tax": 6480,
      "discountTotal": 0,
      "total": 42480,
      "payments": [
        {
          "method": "CASH",
          "amount": 42480
        },
        {
          "method": "CASH",
          "amount": 42480
        }
      ],
      "status": "COMPLETED"
    },
    {
      "id": "TKT-8782V",
      "date": "2026-04-20T17:22:57.307Z",
      "cashier": "SAWADOGO ODILE (Caisse Principale)",
      "customer": {
        "id": "CUST-1776704647312",
        "name": "sali",
        "phone": "770010102",
        "loyaltyPoints": 0,
        "totalSpent": 0
      },
      "items": [
        {
          "id": "1776705760738",
          "product": {
            "id": "1",
            "name": "Robe d\'été Fleurie",
            "basePrice": 15000,
            "category": "Femme",
            "subCategory": "Robes",
            "imageColor": "Shirt",
            "variants": [
              {
                "id": "v-1-Rouge-S",
                "size": "S",
                "color": "Rouge",
                "stock": 6,
                "barcode": "20000100"
              },
              {
                "id": "v-1-Rouge-M",
                "size": "M",
                "color": "Rouge",
                "stock": 3,
                "barcode": "20000101"
              },
              {
                "id": "v-1-Rouge-L",
                "size": "L",
                "color": "Rouge",
                "stock": 9,
                "barcode": "20000102"
              },
              {
                "id": "v-1-Bleu-S",
                "size": "S",
                "color": "Bleu",
                "stock": 8,
                "barcode": "20000103"
              },
              {
                "id": "v-1-Bleu-M",
                "size": "M",
                "color": "Bleu",
                "stock": 7,
                "barcode": "20000104"
              },
              {
                "id": "v-1-Bleu-L",
                "size": "L",
                "color": "Bleu",
                "stock": 2,
                "barcode": "20000105"
              },
              {
                "id": "v-1-Jaune-S",
                "size": "S",
                "color": "Jaune",
                "stock": 8,
                "barcode": "20000106"
              },
              {
                "id": "v-1-Jaune-M",
                "size": "M",
                "color": "Jaune",
                "stock": 8,
                "barcode": "20000107"
              },
              {
                "id": "v-1-Jaune-L",
                "size": "L",
                "color": "Jaune",
                "stock": 5,
                "barcode": "20000108"
              }
            ]
          },
          "variant": {
            "id": "v-1-Bleu-S",
            "size": "S",
            "color": "Bleu",
            "stock": 8,
            "barcode": "20000103"
          },
          "quantity": 1,
          "discount": 0
        }
      ],
      "subtotal": 15000,
      "tax": 2700,
      "discountTotal": 0,
      "total": 17700,
      "payments": [
        {
          "method": "CASH",
          "amount": 0
        },
        {
          "method": "CASH",
          "amount": 17700
        }
      ],
      "status": "COMPLETED"
    },
    {
      "id": "TKT-M4E59",
      "date": "2026-04-20T17:20:00.504Z",
      "cashier": "MANDE MOHEMED",
      "customer": {
        "id": "CUST-1776697254226",
        "name": "BADIEL APPOLINAIRE",
        "phone": "78214948",
        "loyaltyPoints": 0,
        "totalSpent": 0
      },
      "items": [
        {
          "id": "1776705589677",
          "product": {
            "id": "3",
            "name": "T-shirt Basique Col V",
            "basePrice": 5000,
            "category": "Homme",
            "subCategory": "T-Shirts",
            "imageColor": "Shirt",
            "variants": [
              {
                "id": "v-3-Blanc-M",
                "size": "M",
                "color": "Blanc",
                "stock": 9,
                "barcode": "20000300"
              },
              {
                "id": "v-3-Blanc-L",
                "size": "L",
                "color": "Blanc",
                "stock": 8,
                "barcode": "20000301"
              },
              {
                "id": "v-3-Blanc-XL",
                "size": "XL",
                "color": "Blanc",
                "stock": 19,
                "barcode": "20000302"
              },
              {
                "id": "v-3-Blanc-XXL",
                "size": "XXL",
                "color": "Blanc",
                "stock": 19,
                "barcode": "20000303"
              },
              {
                "id": "v-3-Noir-M",
                "size": "M",
                "color": "Noir",
                "stock": 14,
                "barcode": "20000304"
              },
              {
                "id": "v-3-Noir-L",
                "size": "L",
                "color": "Noir",
                "stock": 13,
                "barcode": "20000305"
              },
              {
                "id": "v-3-Noir-XL",
                "size": "XL",
                "color": "Noir",
                "stock": 21,
                "barcode": "20000306"
              },
              {
                "id": "v-3-Noir-XXL",
                "size": "XXL",
                "color": "Noir",
                "stock": 7,
                "barcode": "20000307"
              },
              {
                "id": "v-3-Gris-M",
                "size": "M",
                "color": "Gris",
                "stock": 8,
                "barcode": "20000308"
              },
              {
                "id": "v-3-Gris-L",
                "size": "L",
                "color": "Gris",
                "stock": 15,
                "barcode": "20000309"
              },
              {
                "id": "v-3-Gris-XL",
                "size": "XL",
                "color": "Gris",
                "stock": 3,
                "barcode": "20000310"
              },
              {
                "id": "v-3-Gris-XXL",
                "size": "XXL",
                "color": "Gris",
                "stock": 4,
                "barcode": "20000311"
              }
            ]
          },
          "variant": {
            "id": "v-3-Noir-M",
            "size": "M",
            "color": "Noir",
            "stock": 14,
            "barcode": "20000304"
          },
          "quantity": 1,
          "discount": 0
        },
        {
          "id": "1776705590784",
          "product": {
            "id": "3",
            "name": "T-shirt Basique Col V",
            "basePrice": 5000,
            "category": "Homme",
            "subCategory": "T-Shirts",
            "imageColor": "Shirt",
            "variants": [
              {
                "id": "v-3-Blanc-M",
                "size": "M",
                "color": "Blanc",
                "stock": 9,
                "barcode": "20000300"
              },
              {
                "id": "v-3-Blanc-L",
                "size": "L",
                "color": "Blanc",
                "stock": 8,
                "barcode": "20000301"
              },
              {
                "id": "v-3-Blanc-XL",
                "size": "XL",
                "color": "Blanc",
                "stock": 19,
                "barcode": "20000302"
              },
              {
                "id": "v-3-Blanc-XXL",
                "size": "XXL",
                "color": "Blanc",
                "stock": 19,
                "barcode": "20000303"
              },
              {
                "id": "v-3-Noir-M",
                "size": "M",
                "color": "Noir",
                "stock": 14,
                "barcode": "20000304"
              },
              {
                "id": "v-3-Noir-L",
                "size": "L",
                "color": "Noir",
                "stock": 13,
                "barcode": "20000305"
              },
              {
                "id": "v-3-Noir-XL",
                "size": "XL",
                "color": "Noir",
                "stock": 21,
                "barcode": "20000306"
              },
              {
                "id": "v-3-Noir-XXL",
                "size": "XXL",
                "color": "Noir",
                "stock": 7,
                "barcode": "20000307"
              },
              {
                "id": "v-3-Gris-M",
                "size": "M",
                "color": "Gris",
                "stock": 8,
                "barcode": "20000308"
              },
              {
                "id": "v-3-Gris-L",
                "size": "L",
                "color": "Gris",
                "stock": 15,
                "barcode": "20000309"
              },
              {
                "id": "v-3-Gris-XL",
                "size": "XL",
                "color": "Gris",
                "stock": 3,
                "barcode": "20000310"
              },
              {
                "id": "v-3-Gris-XXL",
                "size": "XXL",
                "color": "Gris",
                "stock": 4,
                "barcode": "20000311"
              }
            ]
          },
          "variant": {
            "id": "v-3-Noir-L",
            "size": "L",
            "color": "Noir",
            "stock": 13,
            "barcode": "20000305"
          },
          "quantity": 2,
          "discount": 0
        },
        {
          "id": "1776705592041",
          "product": {
            "id": "3",
            "name": "T-shirt Basique Col V",
            "basePrice": 5000,
            "category": "Homme",
            "subCategory": "T-Shirts",
            "imageColor": "Shirt",
            "variants": [
              {
                "id": "v-3-Blanc-M",
                "size": "M",
                "color": "Blanc",
                "stock": 9,
                "barcode": "20000300"
              },
              {
                "id": "v-3-Blanc-L",
                "size": "L",
                "color": "Blanc",
                "stock": 8,
                "barcode": "20000301"
              },
              {
                "id": "v-3-Blanc-XL",
                "size": "XL",
                "color": "Blanc",
                "stock": 19,
                "barcode": "20000302"
              },
              {
                "id": "v-3-Blanc-XXL",
                "size": "XXL",
                "color": "Blanc",
                "stock": 19,
                "barcode": "20000303"
              },
              {
                "id": "v-3-Noir-M",
                "size": "M",
                "color": "Noir",
                "stock": 14,
                "barcode": "20000304"
              },
              {
                "id": "v-3-Noir-L",
                "size": "L",
                "color": "Noir",
                "stock": 13,
                "barcode": "20000305"
              },
              {
                "id": "v-3-Noir-XL",
                "size": "XL",
                "color": "Noir",
                "stock": 21,
                "barcode": "20000306"
              },
              {
                "id": "v-3-Noir-XXL",
                "size": "XXL",
                "color": "Noir",
                "stock": 7,
                "barcode": "20000307"
              },
              {
                "id": "v-3-Gris-M",
                "size": "M",
                "color": "Gris",
                "stock": 8,
                "barcode": "20000308"
              },
              {
                "id": "v-3-Gris-L",
                "size": "L",
                "color": "Gris",
                "stock": 15,
                "barcode": "20000309"
              },
              {
                "id": "v-3-Gris-XL",
                "size": "XL",
                "color": "Gris",
                "stock": 3,
                "barcode": "20000310"
              },
              {
                "id": "v-3-Gris-XXL",
                "size": "XXL",
                "color": "Gris",
                "stock": 4,
                "barcode": "20000311"
              }
            ]
          },
          "variant": {
            "id": "v-3-Blanc-XL",
            "size": "XL",
            "color": "Blanc",
            "stock": 19,
            "barcode": "20000302"
          },
          "quantity": 1,
          "discount": 0
        }
      ],
      "subtotal": 20000,
      "tax": 3600,
      "discountTotal": 0,
      "total": 23600,
      "payments": [
        {
          "method": "CASH",
          "amount": 0
        },
        {
          "method": "CASH",
          "amount": 23600
        }
      ],
      "status": "COMPLETED"
    },
    {
      "id": "TKT-VAA9M",
      "date": "2026-04-20T17:19:35.977Z",
      "cashier": "MANDE MOHEMED",
      "customer": {
        "id": "CUST-1776704647312",
        "name": "sali",
        "phone": "770010102",
        "loyaltyPoints": 0,
        "totalSpent": 0
      },
      "items": [
        {
          "id": "1776704554714",
          "product": {
            "id": "1",
            "name": "Robe d\'été Fleurie",
            "basePrice": 15000,
            "category": "Femme",
            "subCategory": "Robes",
            "imageColor": "Shirt",
            "variants": [
              {
                "id": "v-1-Rouge-S",
                "size": "S",
                "color": "Rouge",
                "stock": 6,
                "barcode": "20000100"
              },
              {
                "id": "v-1-Rouge-M",
                "size": "M",
                "color": "Rouge",
                "stock": 3,
                "barcode": "20000101"
              },
              {
                "id": "v-1-Rouge-L",
                "size": "L",
                "color": "Rouge",
                "stock": 10,
                "barcode": "20000102"
              },
              {
                "id": "v-1-Bleu-S",
                "size": "S",
                "color": "Bleu",
                "stock": 8,
                "barcode": "20000103"
              },
              {
                "id": "v-1-Bleu-M",
                "size": "M",
                "color": "Bleu",
                "stock": 7,
                "barcode": "20000104"
              },
              {
                "id": "v-1-Bleu-L",
                "size": "L",
                "color": "Bleu",
                "stock": 2,
                "barcode": "20000105"
              },
              {
                "id": "v-1-Jaune-S",
                "size": "S",
                "color": "Jaune",
                "stock": 8,
                "barcode": "20000106"
              },
              {
                "id": "v-1-Jaune-M",
                "size": "M",
                "color": "Jaune",
                "stock": 8,
                "barcode": "20000107"
              },
              {
                "id": "v-1-Jaune-L",
                "size": "L",
                "color": "Jaune",
                "stock": 5,
                "barcode": "20000108"
              }
            ]
          },
          "variant": {
            "id": "v-1-Rouge-L",
            "size": "L",
            "color": "Rouge",
            "stock": 10,
            "barcode": "20000102"
          },
          "quantity": 1,
          "discount": 0
        },
        {
          "id": "1776704589466",
          "product": {
            "id": "2",
            "name": "Costume 2 Pièces Slim",
            "basePrice": 45000,
            "category": "Homme",
            "subCategory": "Costumes",
            "imageColor": "Shirt",
            "variants": [
              {
                "id": "v-2-Noir-48",
                "size": "48",
                "color": "Noir",
                "stock": 2,
                "barcode": "20000200"
              },
              {
                "id": "v-2-Noir-50",
                "size": "50",
                "color": "Noir",
                "stock": 5,
                "barcode": "20000201"
              },
              {
                "id": "v-2-Noir-52",
                "size": "52",
                "color": "Noir",
                "stock": 6,
                "barcode": "20000202"
              },
              {
                "id": "v-2-Noir-54",
                "size": "54",
                "color": "Noir",
                "stock": 3,
                "barcode": "20000203"
              },
              {
                "id": "v-2-Bleu Marine-48",
                "size": "48",
                "color": "Bleu Marine",
                "stock": 3,
                "barcode": "20000204"
              },
              {
                "id": "v-2-Bleu Marine-50",
                "size": "50",
                "color": "Bleu Marine",
                "stock": 3,
                "barcode": "20000205"
              },
              {
                "id": "v-2-Bleu Marine-52",
                "size": "52",
                "color": "Bleu Marine",
                "stock": 6,
                "barcode": "20000206"
              },
              {
                "id": "v-2-Bleu Marine-54",
                "size": "54",
                "color": "Bleu Marine",
                "stock": 5,
                "barcode": "20000207"
              },
              {
                "id": "v-2-Gris-48",
                "size": "48",
                "color": "Gris",
                "stock": 3,
                "barcode": "20000208"
              },
              {
                "id": "v-2-Gris-50",
                "size": "50",
                "color": "Gris",
                "stock": 5,
                "barcode": "20000209"
              },
              {
                "id": "v-2-Gris-52",
                "size": "52",
                "color": "Gris",
                "stock": 3,
                "barcode": "20000210"
              },
              {
                "id": "v-2-Gris-54",
                "size": "54",
                "color": "Gris",
                "stock": 4,
                "barcode": "20000211"
              }
            ]
          },
          "variant": {
            "id": "v-2-Bleu Marine-50",
            "size": "50",
            "color": "Bleu Marine",
            "stock": 3,
            "barcode": "20000205"
          },
          "quantity": 1,
          "discount": 0
        }
      ],
      "subtotal": 60000,
      "tax": 10800,
      "discountTotal": 0,
      "total": 70800,
      "payments": [
        {
          "method": "CASH",
          "amount": 0
        },
        {
          "method": "CASH",
          "amount": 70800
        }
      ],
      "status": "COMPLETED"
    },
    {
      "id": "TKT-BLJ38",
      "date": "2026-04-20T16:49:40.443Z",
      "cashier": "MANDE MOHEMED",
      "items": [
        {
          "id": "1776703759903",
          "product": {
            "id": "1",
            "name": "Robe d\'été Fleurie",
            "basePrice": 15000,
            "category": "Femme",
            "subCategory": "Robes",
            "imageColor": "Shirt",
            "variants": [
              {
                "id": "v-1-Rouge-S",
                "size": "S",
                "color": "Rouge",
                "stock": 6,
                "barcode": "20000100"
              },
              {
                "id": "v-1-Rouge-M",
                "size": "M",
                "color": "Rouge",
                "stock": 3,
                "barcode": "20000101"
              },
              {
                "id": "v-1-Rouge-L",
                "size": "L",
                "color": "Rouge",
                "stock": 10,
                "barcode": "20000102"
              },
              {
                "id": "v-1-Bleu-S",
                "size": "S",
                "color": "Bleu",
                "stock": 8,
                "barcode": "20000103"
              },
              {
                "id": "v-1-Bleu-M",
                "size": "M",
                "color": "Bleu",
                "stock": 11,
                "barcode": "20000104"
              },
              {
                "id": "v-1-Bleu-L",
                "size": "L",
                "color": "Bleu",
                "stock": 3,
                "barcode": "20000105"
              },
              {
                "id": "v-1-Jaune-S",
                "size": "S",
                "color": "Jaune",
                "stock": 8,
                "barcode": "20000106"
              },
              {
                "id": "v-1-Jaune-M",
                "size": "M",
                "color": "Jaune",
                "stock": 8,
                "barcode": "20000107"
              },
              {
                "id": "v-1-Jaune-L",
                "size": "L",
                "color": "Jaune",
                "stock": 5,
                "barcode": "20000108"
              }
            ]
          },
          "variant": {
            "id": "v-1-Bleu-M",
            "size": "M",
            "color": "Bleu",
            "stock": 11,
            "barcode": "20000104"
          },
          "quantity": 4,
          "discount": 0
        },
        {
          "id": "1776703767915",
          "product": {
            "id": "1",
            "name": "Robe d\'été Fleurie",
            "basePrice": 15000,
            "category": "Femme",
            "subCategory": "Robes",
            "imageColor": "Shirt",
            "variants": [
              {
                "id": "v-1-Rouge-S",
                "size": "S",
                "color": "Rouge",
                "stock": 6,
                "barcode": "20000100"
              },
              {
                "id": "v-1-Rouge-M",
                "size": "M",
                "color": "Rouge",
                "stock": 3,
                "barcode": "20000101"
              },
              {
                "id": "v-1-Rouge-L",
                "size": "L",
                "color": "Rouge",
                "stock": 10,
                "barcode": "20000102"
              },
              {
                "id": "v-1-Bleu-S",
                "size": "S",
                "color": "Bleu",
                "stock": 8,
                "barcode": "20000103"
              },
              {
                "id": "v-1-Bleu-M",
                "size": "M",
                "color": "Bleu",
                "stock": 11,
                "barcode": "20000104"
              },
              {
                "id": "v-1-Bleu-L",
                "size": "L",
                "color": "Bleu",
                "stock": 3,
                "barcode": "20000105"
              },
              {
                "id": "v-1-Jaune-S",
                "size": "S",
                "color": "Jaune",
                "stock": 8,
                "barcode": "20000106"
              },
              {
                "id": "v-1-Jaune-M",
                "size": "M",
                "color": "Jaune",
                "stock": 8,
                "barcode": "20000107"
              },
              {
                "id": "v-1-Jaune-L",
                "size": "L",
                "color": "Jaune",
                "stock": 5,
                "barcode": "20000108"
              }
            ]
          },
          "variant": {
            "id": "v-1-Bleu-L",
            "size": "L",
            "color": "Bleu",
            "stock": 3,
            "barcode": "20000105"
          },
          "quantity": 1,
          "discount": 0
        }
      ],
      "subtotal": 75000,
      "tax": 13500,
      "discountTotal": 0,
      "total": 88500,
      "payments": [
        {
          "method": "CASH",
          "amount": 0
        },
        {
          "method": "CASH",
          "amount": 88500
        }
      ],
      "status": "COMPLETED"
    },
    {
      "id": "TKT-J7VIF",
      "date": "2026-04-20T16:46:24.258Z",
      "cashier": "MANDE MOHEMED",
      "items": [
        {
          "id": "1776703571899",
          "product": {
            "id": "6",
            "name": "Chemise Manche Longue",
            "basePrice": 10000,
            "category": "Homme",
            "subCategory": "Chemises",
            "imageColor": "Shirt",
            "variants": [
              {
                "id": "v-6-Blanc-S",
                "size": "S",
                "color": "Blanc",
                "stock": 3,
                "barcode": "20000600"
              },
              {
                "id": "v-6-Blanc-M",
                "size": "M",
                "color": "Blanc",
                "stock": 9,
                "barcode": "20000601"
              },
              {
                "id": "v-6-Blanc-L",
                "size": "L",
                "color": "Blanc",
                "stock": 7,
                "barcode": "20000602"
              },
              {
                "id": "v-6-Blanc-XL",
                "size": "XL",
                "color": "Blanc",
                "stock": 11,
                "barcode": "20000603"
              },
              {
                "id": "v-6-Bleu Ciel-S",
                "size": "S",
                "color": "Bleu Ciel",
                "stock": 7,
                "barcode": "20000604"
              },
              {
                "id": "v-6-Bleu Ciel-M",
                "size": "M",
                "color": "Bleu Ciel",
                "stock": 3,
                "barcode": "20000605"
              },
              {
                "id": "v-6-Bleu Ciel-L",
                "size": "L",
                "color": "Bleu Ciel",
                "stock": 5,
                "barcode": "20000606"
              },
              {
                "id": "v-6-Bleu Ciel-XL",
                "size": "XL",
                "color": "Bleu Ciel",
                "stock": 8,
                "barcode": "20000607"
              },
              {
                "id": "v-6-Rayé-S",
                "size": "S",
                "color": "Rayé",
                "stock": 3,
                "barcode": "20000608"
              },
              {
                "id": "v-6-Rayé-M",
                "size": "M",
                "color": "Rayé",
                "stock": 8,
                "barcode": "20000609"
              },
              {
                "id": "v-6-Rayé-L",
                "size": "L",
                "color": "Rayé",
                "stock": 9,
                "barcode": "20000610"
              },
              {
                "id": "v-6-Rayé-XL",
                "size": "XL",
                "color": "Rayé",
                "stock": 7,
                "barcode": "20000611"
              }
            ]
          },
          "variant": {
            "id": "v-6-Bleu Ciel-XL",
            "size": "XL",
            "color": "Bleu Ciel",
            "stock": 8,
            "barcode": "20000607"
          },
          "quantity": 2,
          "discount": 0
        }
      ],
      "subtotal": 20000,
      "tax": 3600,
      "discountTotal": 0,
      "total": 23600,
      "payments": [
        {
          "method": "CASH",
          "amount": 23600
        }
      ],
      "status": "COMPLETED"
    },
    {
      "id": "TKT-QU9JG",
      "date": "2026-04-20T16:14:45.080Z",
      "cashier": "MANDE MOHEMED",
      "items": [
        {
          "id": "1776701674975",
          "product": {
            "id": "6",
            "name": "Chemise Manche Longue",
            "basePrice": 10000,
            "category": "Homme",
            "subCategory": "Chemises",
            "imageColor": "Shirt",
            "variants": [
              {
                "id": "v-6-Blanc-S",
                "size": "S",
                "color": "Blanc",
                "stock": 3,
                "barcode": "20000600"
              },
              {
                "id": "v-6-Blanc-M",
                "size": "M",
                "color": "Blanc",
                "stock": 9,
                "barcode": "20000601"
              },
              {
                "id": "v-6-Blanc-L",
                "size": "L",
                "color": "Blanc",
                "stock": 7,
                "barcode": "20000602"
              },
              {
                "id": "v-6-Blanc-XL",
                "size": "XL",
                "color": "Blanc",
                "stock": 11,
                "barcode": "20000603"
              },
              {
                "id": "v-6-Bleu Ciel-S",
                "size": "S",
                "color": "Bleu Ciel",
                "stock": 7,
                "barcode": "20000604"
              },
              {
                "id": "v-6-Bleu Ciel-M",
                "size": "M",
                "color": "Bleu Ciel",
                "stock": 3,
                "barcode": "20000605"
              },
              {
                "id": "v-6-Bleu Ciel-L",
                "size": "L",
                "color": "Bleu Ciel",
                "stock": 6,
                "barcode": "20000606"
              },
              {
                "id": "v-6-Bleu Ciel-XL",
                "size": "XL",
                "color": "Bleu Ciel",
                "stock": 9,
                "barcode": "20000607"
              },
              {
                "id": "v-6-Rayé-S",
                "size": "S",
                "color": "Rayé",
                "stock": 3,
                "barcode": "20000608"
              },
              {
                "id": "v-6-Rayé-M",
                "size": "M",
                "color": "Rayé",
                "stock": 8,
                "barcode": "20000609"
              },
              {
                "id": "v-6-Rayé-L",
                "size": "L",
                "color": "Rayé",
                "stock": 9,
                "barcode": "20000610"
              },
              {
                "id": "v-6-Rayé-XL",
                "size": "XL",
                "color": "Rayé",
                "stock": 7,
                "barcode": "20000611"
              }
            ]
          },
          "variant": {
            "id": "v-6-Bleu Ciel-XL",
            "size": "XL",
            "color": "Bleu Ciel",
            "stock": 9,
            "barcode": "20000607"
          },
          "quantity": 1,
          "discount": 0
        },
        {
          "id": "1776701677055",
          "product": {
            "id": "6",
            "name": "Chemise Manche Longue",
            "basePrice": 10000,
            "category": "Homme",
            "subCategory": "Chemises",
            "imageColor": "Shirt",
            "variants": [
              {
                "id": "v-6-Blanc-S",
                "size": "S",
                "color": "Blanc",
                "stock": 3,
                "barcode": "20000600"
              },
              {
                "id": "v-6-Blanc-M",
                "size": "M",
                "color": "Blanc",
                "stock": 9,
                "barcode": "20000601"
              },
              {
                "id": "v-6-Blanc-L",
                "size": "L",
                "color": "Blanc",
                "stock": 7,
                "barcode": "20000602"
              },
              {
                "id": "v-6-Blanc-XL",
                "size": "XL",
                "color": "Blanc",
                "stock": 11,
                "barcode": "20000603"
              },
              {
                "id": "v-6-Bleu Ciel-S",
                "size": "S",
                "color": "Bleu Ciel",
                "stock": 7,
                "barcode": "20000604"
              },
              {
                "id": "v-6-Bleu Ciel-M",
                "size": "M",
                "color": "Bleu Ciel",
                "stock": 3,
                "barcode": "20000605"
              },
              {
                "id": "v-6-Bleu Ciel-L",
                "size": "L",
                "color": "Bleu Ciel",
                "stock": 6,
                "barcode": "20000606"
              },
              {
                "id": "v-6-Bleu Ciel-XL",
                "size": "XL",
                "color": "Bleu Ciel",
                "stock": 9,
                "barcode": "20000607"
              },
              {
                "id": "v-6-Rayé-S",
                "size": "S",
                "color": "Rayé",
                "stock": 3,
                "barcode": "20000608"
              },
              {
                "id": "v-6-Rayé-M",
                "size": "M",
                "color": "Rayé",
                "stock": 8,
                "barcode": "20000609"
              },
              {
                "id": "v-6-Rayé-L",
                "size": "L",
                "color": "Rayé",
                "stock": 9,
                "barcode": "20000610"
              },
              {
                "id": "v-6-Rayé-XL",
                "size": "XL",
                "color": "Rayé",
                "stock": 7,
                "barcode": "20000611"
              }
            ]
          },
          "variant": {
            "id": "v-6-Bleu Ciel-L",
            "size": "L",
            "color": "Bleu Ciel",
            "stock": 6,
            "barcode": "20000606"
          },
          "quantity": 1,
          "discount": 0
        }
      ],
      "subtotal": 20000,
      "tax": 3600,
      "discountTotal": 0,
      "total": 23600,
      "payments": [
        {
          "method": "CASH",
          "amount": 0
        },
        {
          "method": "CASH",
          "amount": 23600
        }
      ],
      "status": "COMPLETED"
    },
    {
      "id": "TKT-PB6S2",
      "date": "2026-04-20T16:07:43.088Z",
      "cashier": "SAWADOGO ODILE (Caisse Principale)",
      "items": [
        {
          "id": "1776701199521",
          "product": {
            "id": "6",
            "name": "Chemise Manche Longue",
            "basePrice": 10000,
            "category": "Homme",
            "subCategory": "Chemises",
            "imageColor": "Shirt",
            "variants": [
              {
                "id": "v-6-Blanc-S",
                "size": "S",
                "color": "Blanc",
                "stock": 3,
                "barcode": "20000600"
              },
              {
                "id": "v-6-Blanc-M",
                "size": "M",
                "color": "Blanc",
                "stock": 9,
                "barcode": "20000601"
              },
              {
                "id": "v-6-Blanc-L",
                "size": "L",
                "color": "Blanc",
                "stock": 7,
                "barcode": "20000602"
              },
              {
                "id": "v-6-Blanc-XL",
                "size": "XL",
                "color": "Blanc",
                "stock": 11,
                "barcode": "20000603"
              },
              {
                "id": "v-6-Bleu Ciel-S",
                "size": "S",
                "color": "Bleu Ciel",
                "stock": 7,
                "barcode": "20000604"
              },
              {
                "id": "v-6-Bleu Ciel-M",
                "size": "M",
                "color": "Bleu Ciel",
                "stock": 3,
                "barcode": "20000605"
              },
              {
                "id": "v-6-Bleu Ciel-L",
                "size": "L",
                "color": "Bleu Ciel",
                "stock": 6,
                "barcode": "20000606"
              },
              {
                "id": "v-6-Bleu Ciel-XL",
                "size": "XL",
                "color": "Bleu Ciel",
                "stock": 10,
                "barcode": "20000607"
              },
              {
                "id": "v-6-Rayé-S",
                "size": "S",
                "color": "Rayé",
                "stock": 3,
                "barcode": "20000608"
              },
              {
                "id": "v-6-Rayé-M",
                "size": "M",
                "color": "Rayé",
                "stock": 8,
                "barcode": "20000609"
              },
              {
                "id": "v-6-Rayé-L",
                "size": "L",
                "color": "Rayé",
                "stock": 9,
                "barcode": "20000610"
              },
              {
                "id": "v-6-Rayé-XL",
                "size": "XL",
                "color": "Rayé",
                "stock": 7,
                "barcode": "20000611"
              }
            ]
          },
          "variant": {
            "id": "v-6-Bleu Ciel-XL",
            "size": "XL",
            "color": "Bleu Ciel",
            "stock": 10,
            "barcode": "20000607"
          },
          "quantity": 1,
          "discount": 0
        },
        {
          "id": "1776701201706",
          "product": {
            "id": "5",
            "name": "Jean Skinny Taille Haute",
            "basePrice": 12000,
            "category": "Femme",
            "subCategory": "Pantalons",
            "imageColor": "Shirt",
            "variants": [
              {
                "id": "v-5-Bleu Brut-36",
                "size": "36",
                "color": "Bleu Brut",
                "stock": 11,
                "barcode": "20000500"
              },
              {
                "id": "v-5-Bleu Brut-38",
                "size": "38",
                "color": "Bleu Brut",
                "stock": 8,
                "barcode": "20000501"
              },
              {
                "id": "v-5-Bleu Brut-40",
                "size": "40",
                "color": "Bleu Brut",
                "stock": 7,
                "barcode": "20000502"
              },
              {
                "id": "v-5-Bleu Brut-42",
                "size": "42",
                "color": "Bleu Brut",
                "stock": 2,
                "barcode": "20000503"
              },
              {
                "id": "v-5-Noir-36",
                "size": "36",
                "color": "Noir",
                "stock": 6,
                "barcode": "20000504"
              },
              {
                "id": "v-5-Noir-38",
                "size": "38",
                "color": "Noir",
                "stock": 4,
                "barcode": "20000505"
              },
              {
                "id": "v-5-Noir-40",
                "size": "40",
                "color": "Noir",
                "stock": 13,
                "barcode": "20000506"
              },
              {
                "id": "v-5-Noir-42",
                "size": "42",
                "color": "Noir",
                "stock": 9,
                "barcode": "20000507"
              },
              {
                "id": "v-5-Bleu Clair-36",
                "size": "36",
                "color": "Bleu Clair",
                "stock": 2,
                "barcode": "20000508"
              },
              {
                "id": "v-5-Bleu Clair-38",
                "size": "38",
                "color": "Bleu Clair",
                "stock": 3,
                "barcode": "20000509"
              },
              {
                "id": "v-5-Bleu Clair-40",
                "size": "40",
                "color": "Bleu Clair",
                "stock": 10,
                "barcode": "20000510"
              },
              {
                "id": "v-5-Bleu Clair-42",
                "size": "42",
                "color": "Bleu Clair",
                "stock": 6,
                "barcode": "20000511"
              }
            ]
          },
          "variant": {
            "id": "v-5-Noir-38",
            "size": "38",
            "color": "Noir",
            "stock": 4,
            "barcode": "20000505"
          },
          "quantity": 1,
          "discount": 0
        }
      ],
      "subtotal": 22000,
      "tax": 0,
      "discountTotal": 0,
      "total": 22000,
      "payments": [
        {
          "method": "CASH",
          "amount": 22000
        }
      ],
      "status": "COMPLETED"
    }
  ],
  "users": [
    {
      "id": "1",
      "name": "MANDE MOHEMED",
      "pin": "1111",
      "role": "ADMIN",
      "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      "isActive": true
    },
    {
      "id": "2",
      "name": "ANDRE GOUBA",
      "pin": "2222",
      "role": "MANAGER",
      "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      "isActive": true
    },
    {
      "id": "3",
      "name": "SAWADOGO ODILE (Caisse Principale)",
      "pin": "3333",
      "role": "CAISSIER",
      "avatar": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
      "isActive": true
    }
  ],
  "cashMovements": [
    {
      "id": "MOV-1776697716057",
      "type": "OUT",
      "amount": 750000,
      "reason": "RETRAIT",
      "date": "2026-04-20T15:08:36.057Z",
      "user": "MANDE MOHEMED"
    },
    {
      "id": "MOV-1776697689048",
      "type": "IN",
      "amount": 500000,
      "reason": "ACHAT",
      "date": "2026-04-20T15:08:09.048Z",
      "user": "MANDE MOHEMED"
    }
  ],
  "auditLogs": [
    {
      "id": "LOG-1781686290888",
      "timestamp": "2026-06-17T08:51:30.888Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1781685020225",
      "timestamp": "2026-06-17T08:30:20.225Z",
      "user": "System",
      "action": "PAYMENT_UNLOCKED",
      "details": "Le système de paiement est maintenant ouvert.",
      "severity": "INFO"
    },
    {
      "id": "LOG-1781683694630",
      "timestamp": "2026-06-17T08:08:14.630Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de ANDRE GOUBA (MANAGER)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1781683684109",
      "timestamp": "2026-06-17T08:08:04.109Z",
      "user": "MANDE MOHEMED",
      "action": "USER_LOGOUT",
      "details": "Déconnexion de MANDE MOHEMED",
      "severity": "INFO"
    },
    {
      "id": "LOG-1781683542638",
      "timestamp": "2026-06-17T08:05:42.638Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1781648798282",
      "timestamp": "2026-06-16T22:26:38.282Z",
      "user": "MANDE MOHEMED",
      "action": "USER_LOGOUT",
      "details": "Déconnexion de MANDE MOHEMED",
      "severity": "INFO"
    },
    {
      "id": "LOG-1781648631768",
      "timestamp": "2026-06-16T22:23:51.768Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1781648320883",
      "timestamp": "2026-06-16T22:18:40.883Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1781648085004",
      "timestamp": "2026-06-16T22:14:45.004Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1781647988694",
      "timestamp": "2026-06-16T22:13:08.694Z",
      "user": "MANDE MOHEMED",
      "action": "USER_LOGOUT",
      "details": "Déconnexion de MANDE MOHEMED",
      "severity": "INFO"
    },
    {
      "id": "LOG-1781647954274",
      "timestamp": "2026-06-16T22:12:34.274Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1781647897369",
      "timestamp": "2026-06-16T22:11:37.370Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de SAWADOGO ODILE (Caisse Principale) (CAISSIER)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1781647895208",
      "timestamp": "2026-06-16T22:11:35.208Z",
      "user": "ANDRE GOUBA",
      "action": "USER_LOGOUT",
      "details": "Déconnexion de ANDRE GOUBA",
      "severity": "INFO"
    },
    {
      "id": "LOG-1781647859771",
      "timestamp": "2026-06-16T22:10:59.771Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de ANDRE GOUBA (MANAGER)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1781647430074",
      "timestamp": "2026-06-16T22:03:50.074Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1781646990379",
      "timestamp": "2026-06-16T21:56:30.379Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1780165232021",
      "timestamp": "2026-05-30T18:20:32.021Z",
      "user": "System",
      "action": "PAYMENT_LOCKED",
      "details": "Les paiements ont été verrouillés automatiquement à 18:20.",
      "severity": "INFO"
    },
    {
      "id": "LOG-1780153292625",
      "timestamp": "2026-05-30T15:01:32.625Z",
      "user": "ANDRE GOUBA",
      "action": "USER_LOGOUT",
      "details": "Déconnexion de ANDRE GOUBA",
      "severity": "INFO"
    },
    {
      "id": "LOG-1780153271962",
      "timestamp": "2026-05-30T15:01:11.962Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de ANDRE GOUBA (MANAGER)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1780153269008",
      "timestamp": "2026-05-30T15:01:09.008Z",
      "user": "SAWADOGO ODILE (Caisse Principale)",
      "action": "USER_LOGOUT",
      "details": "Déconnexion de SAWADOGO ODILE (Caisse Principale)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1780153258884",
      "timestamp": "2026-05-30T15:00:58.884Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de SAWADOGO ODILE (Caisse Principale) (CAISSIER)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1780153255504",
      "timestamp": "2026-05-30T15:00:55.504Z",
      "user": "MANDE MOHEMED",
      "action": "USER_LOGOUT",
      "details": "Déconnexion de MANDE MOHEMED",
      "severity": "INFO"
    },
    {
      "id": "LOG-1780153229120",
      "timestamp": "2026-05-30T15:00:29.120Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1780153225195",
      "timestamp": "2026-05-30T15:00:25.195Z",
      "user": "MANDE MOHEMED",
      "action": "USER_LOGOUT",
      "details": "Déconnexion de MANDE MOHEMED",
      "severity": "INFO"
    },
    {
      "id": "LOG-1780152976345",
      "timestamp": "2026-05-30T14:56:16.345Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1780152973711",
      "timestamp": "2026-05-30T14:56:13.711Z",
      "user": "SAWADOGO ODILE (Caisse Principale)",
      "action": "USER_LOGOUT",
      "details": "Déconnexion de SAWADOGO ODILE (Caisse Principale)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1780152854271",
      "timestamp": "2026-05-30T14:54:14.271Z",
      "user": "SAWADOGO ODILE (Caisse Principale)",
      "action": "SALE_COMPLETED",
      "details": "Vente #TKT-NGBCS complétée par SAWADOGO ODILE (Caisse Principale). Total: 10000 F CFA.",
      "severity": "INFO"
    },
    {
      "id": "LOG-1780152663870",
      "timestamp": "2026-05-30T14:51:03.870Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de SAWADOGO ODILE (Caisse Principale) (CAISSIER)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1780152660531",
      "timestamp": "2026-05-30T14:51:00.531Z",
      "user": "ANDRE GOUBA",
      "action": "USER_LOGOUT",
      "details": "Déconnexion de ANDRE GOUBA",
      "severity": "INFO"
    },
    {
      "id": "LOG-1780152647447",
      "timestamp": "2026-05-30T14:50:47.447Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de ANDRE GOUBA (MANAGER)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1780152644759",
      "timestamp": "2026-05-30T14:50:44.759Z",
      "user": "MANDE MOHEMED",
      "action": "USER_LOGOUT",
      "details": "Déconnexion de MANDE MOHEMED",
      "severity": "INFO"
    },
    {
      "id": "LOG-1780152579582",
      "timestamp": "2026-05-30T14:49:39.582Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1780152403352",
      "timestamp": "2026-05-30T14:46:43.352Z",
      "user": "MANDE MOHEMED",
      "action": "USER_LOGOUT",
      "details": "Déconnexion de MANDE MOHEMED",
      "severity": "INFO"
    },
    {
      "id": "LOG-1780152119113",
      "timestamp": "2026-05-30T14:41:59.113Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1780152051123",
      "timestamp": "2026-05-30T14:40:51.123Z",
      "user": "SAWADOGO ODILE (Caisse Principale)",
      "action": "SALE_COMPLETED",
      "details": "Vente #TKT-5BMXB complétée par SAWADOGO ODILE (Caisse Principale). Total: 42480 F CFA.",
      "severity": "INFO"
    },
    {
      "id": "LOG-1780146312341",
      "timestamp": "2026-05-30T13:05:12.341Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de SAWADOGO ODILE (Caisse Principale) (CAISSIER)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1780146308479",
      "timestamp": "2026-05-30T13:05:08.479Z",
      "user": "ANDRE GOUBA",
      "action": "USER_LOGOUT",
      "details": "Déconnexion de ANDRE GOUBA",
      "severity": "INFO"
    },
    {
      "id": "LOG-1780146304885",
      "timestamp": "2026-05-30T13:05:04.885Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de ANDRE GOUBA (MANAGER)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1780146303082",
      "timestamp": "2026-05-30T13:05:03.082Z",
      "user": "MANDE MOHEMED",
      "action": "USER_LOGOUT",
      "details": "Déconnexion de MANDE MOHEMED",
      "severity": "INFO"
    },
    {
      "id": "LOG-1780146300982",
      "timestamp": "2026-05-30T13:05:00.982Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1780130566165",
      "timestamp": "2026-05-30T08:42:46.165Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1780130328598",
      "timestamp": "2026-05-30T08:38:48.598Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1780129821705",
      "timestamp": "2026-05-30T08:30:21.705Z",
      "user": "System",
      "action": "PAYMENT_UNLOCKED",
      "details": "Le système de paiement est maintenant ouvert.",
      "severity": "INFO"
    },
    {
      "id": "LOG-1780129759591",
      "timestamp": "2026-05-30T08:29:19.591Z",
      "user": "System",
      "action": "PAYMENT_LOCKED",
      "details": "Les paiements ont été verrouillés automatiquement à 08:29.",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776786565852",
      "timestamp": "2026-04-21T15:49:25.852Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776786437957",
      "timestamp": "2026-04-21T15:47:17.957Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de ANDRE GOUBA (MANAGER)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776786436405",
      "timestamp": "2026-04-21T15:47:16.405Z",
      "user": "MANDE MOHEMED",
      "action": "USER_LOGOUT",
      "details": "Déconnexion de MANDE MOHEMED",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776786402820",
      "timestamp": "2026-04-21T15:46:42.820Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776784831291",
      "timestamp": "2026-04-21T15:20:31.291Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776784048646",
      "timestamp": "2026-04-21T15:07:28.646Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776706104770",
      "timestamp": "2026-04-20T17:28:24.770Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776705777307",
      "timestamp": "2026-04-20T17:22:57.307Z",
      "user": "SAWADOGO ODILE (Caisse Principale)",
      "action": "SALE_COMPLETED",
      "details": "Vente #TKT-8782V complétée par SAWADOGO ODILE (Caisse Principale). Total: 17700 F CFA.",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776705719639",
      "timestamp": "2026-04-20T17:21:59.639Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de SAWADOGO ODILE (Caisse Principale) (CAISSIER)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776705717760",
      "timestamp": "2026-04-20T17:21:57.760Z",
      "user": "ANDRE GOUBA",
      "action": "USER_LOGOUT",
      "details": "Déconnexion de ANDRE GOUBA",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776705671784",
      "timestamp": "2026-04-20T17:21:11.784Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de ANDRE GOUBA (MANAGER)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776705669672",
      "timestamp": "2026-04-20T17:21:09.672Z",
      "user": "MANDE MOHEMED",
      "action": "USER_LOGOUT",
      "details": "Déconnexion de MANDE MOHEMED",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776705600504",
      "timestamp": "2026-04-20T17:20:00.504Z",
      "user": "MANDE MOHEMED",
      "action": "SALE_COMPLETED",
      "details": "Vente #TKT-M4E59 complétée par MANDE MOHEMED. Total: 23600 F CFA.",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776705575977",
      "timestamp": "2026-04-20T17:19:35.977Z",
      "user": "MANDE MOHEMED",
      "action": "SALE_COMPLETED",
      "details": "Vente #TKT-VAA9M complétée par MANDE MOHEMED. Total: 70800 F CFA.",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776704647312",
      "timestamp": "2026-04-20T17:04:07.312Z",
      "user": "MANDE MOHEMED",
      "action": "CUSTOMER_CREATED",
      "details": "Nouveau client sali (770010102) créé par MANDE MOHEMED",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776704473630",
      "timestamp": "2026-04-20T17:01:13.630Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776704331184",
      "timestamp": "2026-04-20T16:58:51.184Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776703998010",
      "timestamp": "2026-04-20T16:53:18.010Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776703780444",
      "timestamp": "2026-04-20T16:49:40.444Z",
      "user": "MANDE MOHEMED",
      "action": "SALE_COMPLETED",
      "details": "Vente #TKT-BLJ38 complétée par MANDE MOHEMED. Total: 88500 F CFA.",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776703758290",
      "timestamp": "2026-04-20T16:49:18.290Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776703584259",
      "timestamp": "2026-04-20T16:46:24.259Z",
      "user": "MANDE MOHEMED",
      "action": "SALE_COMPLETED",
      "details": "Vente #TKT-J7VIF complétée par MANDE MOHEMED. Total: 23600 F CFA.",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776703562934",
      "timestamp": "2026-04-20T16:46:02.934Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776703269468",
      "timestamp": "2026-04-20T16:41:09.468Z",
      "user": "MANDE MOHEMED",
      "action": "USER_LOGOUT",
      "details": "Déconnexion de MANDE MOHEMED",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776703212872",
      "timestamp": "2026-04-20T16:40:12.872Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776703210525",
      "timestamp": "2026-04-20T16:40:10.525Z",
      "user": "SAWADOGO ODILE (Caisse Principale)",
      "action": "USER_LOGOUT",
      "details": "Déconnexion de SAWADOGO ODILE (Caisse Principale)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776703207546",
      "timestamp": "2026-04-20T16:40:07.546Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de SAWADOGO ODILE (Caisse Principale) (CAISSIER)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776703072479",
      "timestamp": "2026-04-20T16:37:52.480Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de SAWADOGO ODILE (Caisse Principale) (CAISSIER)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776703027795",
      "timestamp": "2026-04-20T16:37:07.795Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de SAWADOGO ODILE (Caisse Principale) (CAISSIER)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776702915236",
      "timestamp": "2026-04-20T16:35:15.236Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de SAWADOGO ODILE (Caisse Principale) (CAISSIER)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776702525261",
      "timestamp": "2026-04-20T16:28:45.261Z",
      "user": "MANDE MOHEMED",
      "action": "USER_LOGOUT",
      "details": "Déconnexion de MANDE MOHEMED",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776702515978",
      "timestamp": "2026-04-20T16:28:35.978Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776701720023",
      "timestamp": "2026-04-20T16:15:20.023Z",
      "user": "MANDE MOHEMED",
      "action": "USER_LOGOUT",
      "details": "Déconnexion de MANDE MOHEMED",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776701685081",
      "timestamp": "2026-04-20T16:14:45.081Z",
      "user": "MANDE MOHEMED",
      "action": "SALE_COMPLETED",
      "details": "Vente #TKT-QU9JG complétée par MANDE MOHEMED. Total: 23600 F CFA.",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776701643834",
      "timestamp": "2026-04-20T16:14:03.834Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776701322281",
      "timestamp": "2026-04-20T16:08:42.282Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776701319945",
      "timestamp": "2026-04-20T16:08:39.945Z",
      "user": "SAWADOGO ODILE (Caisse Principale)",
      "action": "USER_LOGOUT",
      "details": "Déconnexion de SAWADOGO ODILE (Caisse Principale)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776701263088",
      "timestamp": "2026-04-20T16:07:43.088Z",
      "user": "SAWADOGO ODILE (Caisse Principale)",
      "action": "SALE_COMPLETED",
      "details": "Vente #TKT-PB6S2 complétée par SAWADOGO ODILE (Caisse Principale). Total: 22000 F CFA.",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776701191098",
      "timestamp": "2026-04-20T16:06:31.098Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de SAWADOGO ODILE (Caisse Principale) (CAISSIER)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776701189256",
      "timestamp": "2026-04-20T16:06:29.256Z",
      "user": "ANDRE GOUBA",
      "action": "USER_LOGOUT",
      "details": "Déconnexion de ANDRE GOUBA",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776701167973",
      "timestamp": "2026-04-20T16:06:07.973Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de ANDRE GOUBA (MANAGER)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776701165633",
      "timestamp": "2026-04-20T16:06:05.633Z",
      "user": "MANDE MOHEMED",
      "action": "USER_LOGOUT",
      "details": "Déconnexion de MANDE MOHEMED",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776701099475",
      "timestamp": "2026-04-20T16:04:59.475Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776699444632",
      "timestamp": "2026-04-20T15:37:24.632Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776697865613",
      "timestamp": "2026-04-20T15:11:05.613Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776697861527",
      "timestamp": "2026-04-20T15:11:01.527Z",
      "user": "MANDE MOHEMED",
      "action": "USER_LOGOUT",
      "details": "Déconnexion de MANDE MOHEMED",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776697626577",
      "timestamp": "2026-04-20T15:07:06.577Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de MANDE MOHEMED (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776697528463",
      "timestamp": "2026-04-20T15:05:28.463Z",
      "user": "Alimata (Direction)",
      "action": "TICKET_HELD",
      "details": "Ticket \\"Client 1\\" mis en attente par Alimata (Direction)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776697063013",
      "timestamp": "2026-04-20T14:57:43.013Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de Alimata (Direction) (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776692719686",
      "timestamp": "2026-04-20T13:45:19.686Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de Alimata (Direction) (ADMIN)",
      "severity": "INFO"
    },
    {
      "id": "LOG-1776691311790",
      "timestamp": "2026-04-20T13:21:51.790Z",
      "user": "System",
      "action": "USER_LOGIN",
      "details": "Connexion de Alimata (Direction) (ADMIN)",
      "severity": "INFO"
    }
  ],
  "customers": [
    {
      "id": "c1",
      "name": "Moussa Traoré",
      "phone": "70000000",
      "loyaltyPoints": 150,
      "totalSpent": 45000
    },
    {
      "id": "c2",
      "name": "Awa Diallo",
      "phone": "76000000",
      "loyaltyPoints": 300,
      "totalSpent": 95000
    },
    {
      "id": "CUST-1776697254226",
      "name": "BADIEL APPOLINAIRE",
      "phone": "78214948",
      "loyaltyPoints": 0,
      "totalSpent": 0
    },
    {
      "id": "CUST-1776704647312",
      "name": "sali",
      "phone": "770010102",
      "loyaltyPoints": 0,
      "totalSpent": 0
    }
  ],
  "promotions": [
    {
      "id": "p1",
      "title": "Opération Spéciale : -10% dès 3 articles",
      "imageUrl": "",
      "isActive": false,
      "type": "BANNER",
      "discountValue": 10
    }
  ],
  "stockMovements": [
    {
      "id": "MOV-1780152854271",
      "productId": "3",
      "variantId": "v-3-Noir-M",
      "type": "SALE",
      "quantity": -2,
      "reason": "Vente Order #TKT-NGBCS",
      "date": "2026-05-30T14:54:14.271Z",
      "user": "SAWADOGO ODILE (Caisse Principale)"
    },
    {
      "id": "MOV-1780152051123",
      "productId": "10",
      "variantId": "v-10-Rouge-6 ans",
      "type": "SALE",
      "quantity": -1,
      "reason": "Vente Order #TKT-5BMXB",
      "date": "2026-05-30T14:40:51.123Z",
      "user": "SAWADOGO ODILE (Caisse Principale)"
    },
    {
      "id": "MOV-1780152051123",
      "productId": "1",
      "variantId": "v-1-Bleu-M",
      "type": "SALE",
      "quantity": -2,
      "reason": "Vente Order #TKT-5BMXB",
      "date": "2026-05-30T14:40:51.123Z",
      "user": "SAWADOGO ODILE (Caisse Principale)"
    },
    {
      "id": "MOV-1776705777307",
      "productId": "1",
      "variantId": "v-1-Bleu-S",
      "type": "SALE",
      "quantity": -1,
      "reason": "Vente Order #TKT-8782V",
      "date": "2026-04-20T17:22:57.307Z",
      "user": "SAWADOGO ODILE (Caisse Principale)"
    },
    {
      "id": "MOV-1776705600504",
      "productId": "3",
      "variantId": "v-3-Blanc-XL",
      "type": "SALE",
      "quantity": -1,
      "reason": "Vente Order #TKT-M4E59",
      "date": "2026-04-20T17:20:00.504Z",
      "user": "MANDE MOHEMED"
    },
    {
      "id": "MOV-1776705600504",
      "productId": "3",
      "variantId": "v-3-Noir-L",
      "type": "SALE",
      "quantity": -2,
      "reason": "Vente Order #TKT-M4E59",
      "date": "2026-04-20T17:20:00.504Z",
      "user": "MANDE MOHEMED"
    },
    {
      "id": "MOV-1776705600504",
      "productId": "3",
      "variantId": "v-3-Noir-M",
      "type": "SALE",
      "quantity": -1,
      "reason": "Vente Order #TKT-M4E59",
      "date": "2026-04-20T17:20:00.504Z",
      "user": "MANDE MOHEMED"
    },
    {
      "id": "MOV-1776705575977",
      "productId": "2",
      "variantId": "v-2-Bleu Marine-50",
      "type": "SALE",
      "quantity": -1,
      "reason": "Vente Order #TKT-VAA9M",
      "date": "2026-04-20T17:19:35.977Z",
      "user": "MANDE MOHEMED"
    },
    {
      "id": "MOV-1776705575977",
      "productId": "1",
      "variantId": "v-1-Rouge-L",
      "type": "SALE",
      "quantity": -1,
      "reason": "Vente Order #TKT-VAA9M",
      "date": "2026-04-20T17:19:35.977Z",
      "user": "MANDE MOHEMED"
    },
    {
      "id": "MOV-1776703780444",
      "productId": "1",
      "variantId": "v-1-Bleu-L",
      "type": "SALE",
      "quantity": -1,
      "reason": "Vente Order #TKT-BLJ38",
      "date": "2026-04-20T16:49:40.444Z",
      "user": "MANDE MOHEMED"
    },
    {
      "id": "MOV-1776703780444",
      "productId": "1",
      "variantId": "v-1-Bleu-M",
      "type": "SALE",
      "quantity": -4,
      "reason": "Vente Order #TKT-BLJ38",
      "date": "2026-04-20T16:49:40.444Z",
      "user": "MANDE MOHEMED"
    },
    {
      "id": "MOV-1776703584259",
      "productId": "6",
      "variantId": "v-6-Bleu Ciel-XL",
      "type": "SALE",
      "quantity": -2,
      "reason": "Vente Order #TKT-J7VIF",
      "date": "2026-04-20T16:46:24.259Z",
      "user": "MANDE MOHEMED"
    },
    {
      "id": "MOV-1776701685081",
      "productId": "6",
      "variantId": "v-6-Bleu Ciel-L",
      "type": "SALE",
      "quantity": -1,
      "reason": "Vente Order #TKT-QU9JG",
      "date": "2026-04-20T16:14:45.081Z",
      "user": "MANDE MOHEMED"
    },
    {
      "id": "MOV-1776701685081",
      "productId": "6",
      "variantId": "v-6-Bleu Ciel-XL",
      "type": "SALE",
      "quantity": -1,
      "reason": "Vente Order #TKT-QU9JG",
      "date": "2026-04-20T16:14:45.081Z",
      "user": "MANDE MOHEMED"
    },
    {
      "id": "MOV-1776701263088",
      "productId": "5",
      "variantId": "v-5-Noir-38",
      "type": "SALE",
      "quantity": -1,
      "reason": "Vente Order #TKT-PB6S2",
      "date": "2026-04-20T16:07:43.088Z",
      "user": "SAWADOGO ODILE (Caisse Principale)"
    },
    {
      "id": "MOV-1776701263088",
      "productId": "6",
      "variantId": "v-6-Bleu Ciel-XL",
      "type": "SALE",
      "quantity": -1,
      "reason": "Vente Order #TKT-PB6S2",
      "date": "2026-04-20T16:07:43.088Z",
      "user": "SAWADOGO ODILE (Caisse Principale)"
    }
  ],
  "messages": [
    {
      "id": "MSG-1776705660741",
      "senderId": "1",
      "text": "Bonjour a tous",
      "timestamp": "2026-04-20T17:21:00.741Z"
    },
    {
      "id": "MSG-1776705725710",
      "senderId": "3",
      "text": "bonjour ",
      "timestamp": "2026-04-20T17:22:05.710Z"
    }
  ],
  "pendingTickets": [],
  "settings": {
    "isPaymentLocked": false,
    "manualLock": false,
    "autoLockEnabled": true,
    "openingTime": "08:30",
    "closingTime": "18:00",
    "isCashSessionRequired": false,
    "logoUrl": "/uploads/1781683646953-LOGOZARAGALLERYFIN.png",
    "storeName": "ZARA GALLERY",
    "storeAddress": "Ouagadougou, Burkina Faso",
    "storePhone": "+226 25 30 00 00"
  },
  "wholesalers": [
    {
      "id": "GROS-1",
      "name": "Omar Sy",
      "companyName": "Dakar Fripes Gros",
      "phone": "+221 77 555 11 22",
      "email": "omar@grosfripes.sn",
      "address": "Grand Yoff, Dakar",
      "balance": 0,
      "creditLimit": 5000000,
      "createdAt": "2026-06-16T21:33:50.876Z"
    },
    {
      "id": "GROS-2",
      "name": "Alou Diallo",
      "companyName": "Diallo Frères Import",
      "phone": "+221 70 444 33 22",
      "email": "contact@diallobros.com",
      "address": "Marché HLM, Dakar",
      "balance": 1450000,
      "creditLimit": 8000000,
      "createdAt": "2026-06-16T21:33:50.876Z"
    }
  ],
  "wholesaleOrders": [],
  "currentSession": null,
  "sessionsHistory": [],
  "lastUpdated": "2026-06-17T08:52:20.730Z"
}')
ON DUPLICATE KEY UPDATE 
  `data` = VALUES(`data`);

-- Dump complete
