# GUIDE DE DÉPLOIEMENT DE PRODUCTION AVEC PM2 & MARIADB (OU SQLITE) — DEBIAN / UBUNTU
### Rédigé pour ZARA GALLERY

Ce guide détaille étape par étape comment déployer l'application **Zara Gallery** sur votre serveur Debian ou Ubuntu avec le serveur de base de données **MariaDB** entièrement configuré pour synchroniser automatiquement toutes les tables structurées en parallèle de la sauvegarde JSON.

---

## 📋 Table des Matières
1. [Étape 1 : Préparation & Sécurisation de l'OS Debian](#étape-1--préparation--sécurisation-de-los-debian)
2. [Étape 2 : Installation des prérequis de base (Node.js, Compilateur, Outils)](#étape-2--installation-des-prérequis-de-base-nodejs-compilateur-outils)
3. [Étape 3 : Installation et Configuration Réseau de MariaDB](#étape-3--installation-et-configuration-réseau-de-mariadb)
4. [Étape 4 : Déploiement des Fichiers de l'Application](#étape-4--déploiement-des-fichiers-de-lapplication)
5. [Étape 5 : Configuration des Variables d'Environnement (.env)](#étape-5--configuration-des-variables-denvironnement-env)
6. [Étape 6 : Installation Globale de PM2 & Compilation (Build)](#étape-6--installation-globale-de-pm2--compilation-build)
7. [Étape 7 : Lancement de l'Application et Persistance PM2](#étape-7--lancement-de-lapplication-et-persistance-pm2)
8. [Étape 8 : Reverse Proxy Nginx & HTTPS SSL Gratuit](#étape-8--reverse-proxy-nginx--https-ssl-gratuit)
9. [Étape 9 : Sauvegardes Automatiques et Dumps de Base de Données](#étape-9--sauvegardes-automatiques-et-dumps-de-base-de-données)

---

## Étape 1 : Préparation & Sécurisation de l'OS Debian

Connectez-vous à votre machine en SSH :
```bash
ssh root@IP_DE_VOTRE_SERVEUR
```

Mettez à jour votre système et installez les outils système élémentaires :
```bash
apt update && apt upgrade -y
apt install -y curl git ufw htop build-essential wget sudo
```

Configurez le pare-feu système **UFW** :
```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp
ufw --force enable
```

---

## Étape 2 : Installation des prérequis de base (Node.js, Compilateur, Outils)

L'application a besoin de **Node.js v20** (LTS) et d'un compilateur pour le driver SQLite de secours (`better-sqlite3`) :

```bash
# 1. Configurer le dépôt officiel NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

# 2. Installer Node.js et les outils de compilation
apt install -y nodejs build-essential python3 g++ make sqlite3
```

---

## Étape 3 : Installation et Configuration Réseau de MariaDB

### 1. Installer le serveur MariaDB
```bash
apt install -y mariadb-server
```

### 2. Sécuriser l'installation MariaDB (Recommandé)
Configurez le mot de passe root et supprimez les autorisations d'anonymes :
```bash
mysql_secure_installation
```
*(Suivez les invites : définissez un mot de passe `root` fort pour MariaDB, répondez **Y** (Oui) à toutes les autres questions).*

### 3. Créer la Base de Données et l'Utilisateur Dédié à Zara Gallery
Connectez-vous à la console MariaDB :
```bash
mysql -u root -p
```

Une fois dans le shell MariaDB, exécutez ces commandes :
```sql
-- Création de la base de données
CREATE DATABASE IF NOT EXISTS zara_gallery DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Création de l'utilisateur applicatif (Remplacez 'ZaraSecurePassword123!' par un mot de passe de votre choix)
CREATE USER 'zara_user'@'localhost' IDENTIFIED BY 'ZaraSecurePassword123!';

-- Attribution de toutes les permissions nécessaires sur la base
GRANT ALL PRIVILEGES ON zara_gallery.* TO 'zara_user'@'localhost';

-- Appliquer les changements et quitter
FLUSH PRIVILEGES;
EXIT;
```

### 4. Importer le Dump de Base de Données d'Origine (`init_db.sql`)
Pour charger immédiatement la structure des tables de production ainsi que le jeu d'articles, d'utilisateurs et de configurations par défaut de **Zara Gallery**, exécutez la commande d'import suivante :
```bash
# Se placer dans le répertoire où se trouve le projet
cd /var/www/zara-gallery/zaragallery

# Importer le dump d'origine dans la base de données
mysql -u zara_user -p'ZaraSecurePassword123!' zara_gallery < init_db.sql
```

---

## Étape 4 : Déploiement des Fichiers de l'Application

Copiez les fichiers de l'application dans le répertoire `/var/www/zara-gallery/zaragallery` sur votre serveur Debian (soit via Git, soit par transfert SFTP comme FileZilla).

```bash
# Assurez-vous que le répertoire existe et attribuez-lui les droits adéquats
mkdir -p /var/www/zara-gallery/zaragallery
cd /var/www/zara-gallery/zaragallery
```

---

## Étape 5 : Configuration des Variables d'Environnement (.env)

Créez le fichier de configuration de l'environnement de production :
```bash
nano .env
```

Ajoutez précisément les lignes de configuration suivantes. Si d'aventure MariaDB devenait inaccessible, l'application repulsera immédiatement son fonctionnement sans coupure sur le module secondaire **SQLite** local !

```env
PORT=3000
NODE_ENV=production

# --- CONFIGURATION MARIADB (BASE ACTIVE PRIMAIRE) ---
DB_HOST=localhost
DB_USER=zara_user
DB_PASSWORD=ZaraSecurePassword123!
DB_NAME=zara_gallery

# --- OPTIONNEL : INTELLIGENCE ARTIFICIELLE ZARA ---
GEMINI_API_KEY=votre_cle_api_securisee_si_disponible
```
*(Appuyez sur `Ctrl+O` puis `Entrée` pour enregistrer, et `Ctrl+X` pour quitter).*

---

## Étape 6 : Installation Globale de PM2 & Compilation (Build)

Installez PM2 de manière globale pour piloter l'exécution de l'application :
```bash
npm install -g pm2
```

Installez toutes les dépendances locales requises et lancez la compilation complète :
```bash
# 1. Installation des paquets
npm install

# 2. Build de production (Génère le paquet web statique dist/ et compile server.ts en un fichier unique condensé dist/server.cjs)
npm run build
```

---

## Étape 7 : Lancement de l'Application et Persistance PM2

Lancez l'application en arrière-plan permanente via PM2 :
```bash
pm2 start dist/server.cjs --name "zara-gallery"
```

Configurez PM2 pour qu'il redémarre instantanément l'application au redémarrage physique de la machine physique :
```bash
pm2 startup
```
*(Copiez-collez la commande `sudo env PATH=...` qui s'affiche sous votre écran, puis validez).*

Ensuite, enregistrez l'état actuel de fonctionnement :
```bash
pm2 save
```

### 📊 Outils d'Administration PM2 :
* **Vérifier l'état en direct** : `pm2 status`
* **Écouter les logs d'activité et SQL en continu** : `pm2 logs zara-gallery`
* **Redémarrer le serveur** : `pm2 restart zara-gallery`
* **Surveiller l'efficacité CPU & RAM** : `pm2 monit`

---

## Étape 8 : Reverse Proxy Nginx & HTTPS SSL Gratuit

Pour que l'application de caisse soit proprement accessible via le port HTTP standard (80 / 443) sans forcer le port `:3000` :

### 1. Installer Nginx
```bash
apt install -y nginx
```

### 2. Nettoyer la configuration par défaut
```bash
rm /etc/nginx/sites-enabled/default
```

### 3. Créer la configuration Zara Gallery
```bash
nano /etc/nginx/sites-available/zara-gallery
```

Collez la configuration suivante (remplacez `caisse.zara-gallery.com` par l'IP de votre serveur ou votre nom de domaine) :
```nginx
server {
    listen 80;
    server_name caisse.zara-gallery.com;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 50M;
}
```

### 4. Activer et redémarrer Nginx
```bash
ln -s /etc/nginx/sites-available/zara-gallery /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 5. (Optionnel) Certificat SSL Let's Encrypt (HTTPS sécurisé gratuit) :
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d caisse.zara-gallery.com
```

---

## Étape 9 : Sauvegardes Automatiques et Dumps de Base de Données

Puisque les données sont fidèlement reliées à la fois dans MariaDB et dans le fichier backup local `zara_database.json`, l'extraction des données est extrêmement simple !

### 1. Télécharger un dump SQL MariaDB / SQLite depuis le navigateur
Vous pouvez vous rendre sur :
* `http://IP_DE_VOTRE_SERVEUR/api/db/dump` -> Génère instantanément un script SQL complet `.sql` d'insertion de l'intégralité de vos tables (Idéal pour des sauvegardes sur clé USB).

### 2. Planifier un script de backup automatique de MariaDB
Créez le script système :
```bash
nano /usr/local/bin/backup-mariadb.sh
```

Collez-y ce script :
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/zara-gallery-db"
DATE=$(date +'%Y-%m-%d_%Hh%M')
mkdir -p "$BACKUP_DIR"

# Dump structuré de MariaDB
mysqldump -u zara_user -p'ZaraSecurePassword123!' zara_gallery > "$BACKUP_DIR/zara_mariadb_backup_$DATE.sql"

# Copie par sécurité du fichier JSON brut
cp /var/www/zara-gallery/zaragallery/zara_database.json "$BACKUP_DIR/zara_json_backup_$DATE.json" 2>/dev/null

# Suppression des sauvegardes de plus de 45 jours
find "$BACKUP_DIR" -type f -mtime +45 -delete

echo "[$(date)] Backup MariaDB complet effectué" >> /var/log/zara-db-backups.log
```

Rendez-le exécutable :
```bash
chmod +x /usr/local/bin/backup-mariadb.sh
```

Programmez-le dans crontab pour qu'il tourne automatiquement tous les soirs à 21h30 :
```bash
(crontab -l 2>/dev/null; echo "30 21 * * * /usr/local/bin/backup-mariadb.sh >/dev/null 2>&1") | crontab -
```

---
### 🎉 Félicitations ! Votre infrastructure Zara Gallery est désormais sécurisée, optimisée sous Debian, et hautement résiliente avec MariaDB !
