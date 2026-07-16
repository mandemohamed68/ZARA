# GUIDE DE DÉPLOIEMENT DE PRODUCTION AVEC PM2 & SQLITE — DEBIAN
### Rédigé pour ZARA GALLERY

Ce guide complet détaille les instructions étape par étape pour déployer l'application de point de vente et gestion de boutique **ZARA GALLERY** directement sur votre serveur Debian (Debian 11 / Debian 12) en utilisant **PM2** pour le contrôle du processus Node.js et **SQLite** de manière native. 

---

## 📋 Table des Matières
1. [Pourquoi ce choix (PM2 + SQLite Direct) et comment vos données sont sauvegardées ?](#-pourquoi-ce-choix-pm2--sqlite-direct-et-comment-vos-données-sont-sauvegardées-)
2. [Étape 1 : Préparation & Sécurisation de l'OS Debian en SSH](#étape-1--préparation--sécurisation-de-los-debian-en-ssh)
3. [Étape 2 : Installation des prérequis de compilation (Node.js, C++ Compiler, SQLite3)](#étape-2--installation-des-prérequis-de-compilation-nodejs-c-compiler-sqlite3)
4. [Étape 3 : Installation globale de PM2](#étape-3--installation-globale-de-pm2)
5. [Étape 4 : Déploiement du Code Source sur le Serveur](#étape-4--déploiement-du-code-source-sur-le-serveur)
6. [Étape 5 : Installation des dépendances & Build de production](#étape-5--installation-des-dépendances--build-de-production)
7. [Étape 6 : Lancement de l'Application avec PM2](#étape-6--lancement-de-lapplication-avec-pm2)
8. [Étape 7 : Où se trouve mon fichier SQLite et comment visualiser/extraire mes données ?](#étape-7--où-se-trouve-mon-fichier-sqlite-et-comment-visualiserextraire-mes-données-)
9. [Étape 8 : Procédure de Mise à Jour Securisée de l'Application (Sans perte de données !)](#étape-8--procédure-de-mise-à-jour-securisée-de-lapplication-sans-perte-de-données-)
10. [Étape 9 : Configuration Reverse Proxy Nginx & Certificats HTTPS SSL](#étape-9--configuration-reverse-proxy-nginx--certificats-https-ssl)
11. [Étape 10 : Script de Sauvegarde Quotidienne Automatique (Cron Backup)](#étape-10--script-de-sauvegarde-quotidienne-automatique-cron-backup)

---

## 🛠 Pourquoi ce choix (PM2 + SQLite Direct) et comment vos données sont sauvegardées ?

Plutôt que d'utiliser des conteneurs isolés (Docker), vous exécutez l'application directement sur le système d'exploitation Debian avec **PM2**.

*   **SQLite Ultra-rapide** : L'application utilise `better-sqlite3` configuré en mode **WAL (Write-Ahead Logging)** pour garantir des écritures instantanées sécurisées.
*   **Emplacement de la Base de Données** : La base de données est stockée sur votre disque dur Debian sous forme d'un simple fichier hautement optimisé nommé `zara_database.sqlite` situé à la racine de votre dossier de déploiement (`/var/www/zara-gallery/zaragallery/zara_database.sqlite`).
*   **Résistance aux Mises à Jour** : Les modifications de code, re-builds ou redémarrages de PM2 ne touchent jamais à vos fichiers de données SQLite. Vos clients, ventes, paniers et produits sont conservés indéfiniment.

---

## Étape 1 : Préparation & Sécurisation de l'OS Debian en SSH

Connectez-vous en SSH à votre serveur Debian avec vos identifiants root :
```bash
ssh root@IP_DE_VOTRE_SERVEUR
```

Mettez à jour la liste des paquets de Debian et instaurez les utilitaires de base :
```bash
apt update && apt upgrade -y
apt install -y curl git ufw htop build-essential wget
```

Configurez le Pare-feu UFW (Firewall) pour sécuriser l'accès aux ports d'administration, d'application et de site web :
```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp
ufw --force enable
```

---

## Étape 2 : Installation des prérequis de compilation (Node.js, C++ Compiler, SQLite3)

Puisque nous utilisons `better-sqlite3`, le système d'exploitation compile automatiquement des liaisons binaires natives C++ lors de l'installation pour une vitesse de base de données inégalable. Nous devons donc installer Node.js (version 20) ainsi que la suite de compilateurs système de base :

```bash
# 1. Ajouter le référentiel officiel NodeSource pour Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

# 2. Installer Node.js et les outils de développement système
apt install -y nodejs build-essential python3 g++ make sqlite3

# 3. Vérifier les versions installées
node -v
npm -v
sqlite3 --version
```

---

## Étape 3 : Installation globale de PM2

**PM2** est l'outil d'excellence pour gérer vos applications Node.js en production sous Debian. Il surveille l'application en arrière-plan, redémarre le serveur en cas de panne de courant ou d'erreur système, et fournit des métriques d'IP en direct.

Installez PM2 de manière globale sur le système :
```bash
npm install -g pm2
pm2 --version
```

---

## Étape 4 : Déploiement du Code Source sur le Serveur

Rendez-vous dans le répertoire de votre site web sur le serveur. Si vous êtes déjà dans `/var/www/zara-gallery/zaragallery`, assurez-vous que les fichiers soient propres :

```bash
cd /var/www/zara-gallery/zaragallery
```

Créez le fichier de production de vos variables d'environnement secrètes :
```bash
nano .env
```
Ajoutez les définitions suivantes (en remplaçant par vos valeurs si vous configurez d'autres ports ou l'intelligence artificielle Gemini) :
```env
PORT=3000
NODE_ENV=production
# Si vous utilisez l'IA Zara (génération d'images et texte) :
GEMINI_API_KEY=votre_cle_api_securisee
```

---

## Étape 5 : Installation des dépendances & Build de production

Exécutez l'installation des modules node d'après le manifeste. Le compilateur C++ `node-gyp` va compiler en local les dépendances de `better-sqlite3` pour Debian de manière automatisée.

```bash
# 1. Installer l'intégralité des modules NPM requis
npm install

# 2. Compiler l'interface web (React + Vite) et le serveur d'API (Express compilé via esbuild)
npm run build
```

*Remarque : La commande de compilation crée un fichier exécutable backend unique de production ultra-rapide sous `dist/server.cjs` ainsi que les fichiers HTML/JS statiques optimisés pour le navigateur au sein du répertoire `/var/www/zara-gallery/zaragallery/dist`.*

---

## Étape 6 : Lancement de l'Application avec PM2

Lancez l'application en tâche de fond avec PM2 en ciblant directement le code de serveur compilé de production :

```bash
pm2 start dist/server.cjs --name "zara-gallery"
```

Pour s'assurer que PM2 redémarre l'application automatiquement si votre serveur Debian subit un reboot électrique complet, configurez la persistance système :

```bash
# Générer la commande de démarrage en tâche planifiée automatique pour root
pm2 startup
```
*Copiez la commande affichée sur votre terminal par PM2 (qui ressemble à `sudo env PATH=$PATH... pm2 startup systemd -u root --hp ...`), collez-la et appuyez sur Entrée.*

Une fois cela fait, sauvegardez l'état actuel de PM2 pour qu'il s'en rappelle au démarrage :
```bash
pm2 save
```

### Commandes utiles pour administrer l'application avec PM2
*   **Voir l'état de l'application en temps réel** : `pm2 status`
*   **Voir les logs en direct** (très utile pour surveiller les transactions de stocks) : `pm2 logs zara-gallery`
*   **Redémarrer l'application** : `pm2 restart zara-gallery`
*   **Arrêter l'application** : `pm2 stop zara-gallery`
*   **Moniteur système CPU/Mémoire en temps réel** : `pm2 monit`

---

## Étape 7 : Où se trouve mon fichier SQLite et comment visualiser/extraire mes données ?

Comme l'application tourne maintenant en local sur PM2, l'ensemble de votre base de données est contenue dans un fichier unique sur votre serveur !

### 📁 1. Localisation physique du fichier SQLite :
Le fichier est localisé à l'adresse root du projet :
```bash
/var/www/zara-gallery/zaragallery/zara_database.sqlite
```
*(Vous verrez également un fichier `zara_database.sqlite-wal` et `zara_database.sqlite-shm`. Ce sont des journaux d'indexation temporaires écrits par SQLite pour améliorer la vitesse et éviter la corruption de fichier. Laissez-les s'exécuter naturellement).*

### 📥 2. Récupérer ou Visualiser vos données :
Vous disposez de trois options très confortables :

*   **Option A : Téléchargement en un clic depuis le navigateur (Interface d'administration)** :
    Allez simplement sur votre navigateur sur :
    *   `http://IP_DE_VOTRE_SERVEUR:3000/api/db/download` -> Télécharge le fichier brut **zara_database.sqlite** directement sur votre ordinateur. Vous pouvez l'ouvrir avec des logiciels gratuits comme **DB Browser for SQLite** ou **DBeaver** pour inspecter et trier toutes vos tables !
    *   `http://IP_DE_VOTRE_SERVEUR:3000/api/db/dump` -> Génère un **SQL Schema & Data Dump standard (.sql)** au format texte contenant toutes les requêtes d'insertion, parfait si vous devez migrer les données d'un serveur Debian à un autre !

*   **Option B : Inspecter directement en ligne de commande SSH** :
    ```bash
    cd /var/www/zara-gallery/zaragallery
    sqlite3 zara_database.sqlite
    ```
    Une fois connecté à l'invite sqlite3, vous pouvez lancer vos requêtes SQL ordinaires :
    *   `.tables` pour lister toutes vos tables (ex: `transactions_history`, `app_state`).
    *   `SELECT * FROM transactions_history;` pour voir les rapports de vos ventes d'articles.
    *   `.exit` pour quitter l'invite.

*   **Option C : Télécharger à travers la console SSH avec SCP** :
    Exécutez cette commande depuis votre ordinateur local (votre Mac ou PC Windows) pour copier le fichier SQLite actif vers vos téléchargements :
    ```bash
    scp root@IP_DE_VOTRE_SERVEUR:/var/www/zara-gallery/zaragallery/zara_database.sqlite ~/Downloads/
    ```

---

## Étape 8 : Procédure de Mise à Jour Securisée de l'Application (Sans perte de données !)

Lorsque l'application est améliorée ou que vous mettez à jour le code, **votre base SQLite ne sera jamais écrasée**. Utilisez cette procédure simple, sécurisée et éprouvée pour effectuer l'intégration continue de vos mises à jour :

```bash
# 1. Se positionner dans le dossier de Zara Gallery
cd /var/www/zara-gallery/zaragallery

# 2. Récupérer les nouveaux fichiers applicatifs (par exemple par Git ou transfert SFTP)
git pull

# 3. Installer les nouvelles dépendances npm éventuelles sans perturber la production
npm install

# 4. Compiler la nouvelle interface web et le serveur
npm run build

# 5. Redémarrer l'application avec PM2 pour appliquer les nouveautés instantanément
pm2 restart zara-gallery
```
**Et c'est tout !** Votre serveur d'API recharge les connexions réseau en une demi-seconde. Vos rapports de caisse enregistrés, utilisateurs, stocks et paniers d'attente s'affichent toujours, intacts et fidèles.

---

## Étape 9 : Configuration Reverse Proxy Nginx & Certificats HTTPS SSL

Pour que l'application soit accessible au public de manière hautement sécurisée sur le port par défaut (80 / 443) au lieu de devoir forcer le port `:3000` à la fin de l'URL, nous mettons en place Nginx :

Installez Nginx :
```bash
apt install -y nginx
```

Supprimez l'hôte virtuel par défaut :
```bash
rm /etc/nginx/sites-enabled/default
```

Créez un profil de configuration pour Zara Gallery :
```bash
nano /etc/nginx/sites-available/zara-gallery
```

Collez la configuration proxy optimisée suivante (veillez à remplacer `caisse.zara-gallery.com` par votre propre nom de domaine ou l'adresse IP globale de votre serveur) :
```nginx
server {
    listen 80;
    server_name caisse.zara-gallery.com; # Modifiez avec votre nom de domaine

    # Compression GZIP pour des chargements de pages ultra-rapides
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    location / {
        proxy_pass http://127.0.0.1:3000; # Redirection vers le serveur d'API PM2
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Autoriser l'envoi d'images d'articles ou rapports volumineux (jusqu'à 50 Mo)
    client_max_body_size 50M;
}
```

Activez cette nouvelle configuration et relancez Nginx :
```bash
ln -s /etc/nginx/sites-available/zara-gallery /etc/nginx/sites-enabled/
nginx -t     # Assure que la syntaxe est irréprochable
systemctl restart nginx
```

### Sécuriser gratuitement avec un certificat SSL Certbot (HTTPS) :
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d caisse.zara-gallery.com
```
*Suivez les invites intuitives à l'écran. Certbot se chargera de configurer vos redirections HTTP vers HTTPS de manière automatique ainsi que le renouvellement automatique de vos certificats SSL tous les 3 mois.*

---

## Étape 10 : Script de Sauvegarde Quotidienne Automatique (Cron Backup)

La base SQLite est stockée dans un fichier unique sur disque dur, ce qui rend son processus de copie de sauvegarde enfantin. Créons un script de sauvegarde automatique à chaud :

Créez le ficher de script système :
```bash
nano /usr/local/bin/backup-sqlite.sh
```

Ajoutez les lignes de script de production suivantes, programmées pour cloner à chaud le fichier SQLite actif vers un répertoire de quarantaine, tout en nettoyant les anciennes copies obsolètes pour préserver votre disque dur :

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/zara-gallery-sqlite"
DATE=$(date +'%Y-%m-%d_%Hh%M')
mkdir -p "$BACKUP_DIR"

# 1. Sauvegarder la base de données SQLITE active actuelle
cp /var/www/zara-gallery/zaragallery/zara_database.sqlite "$BACKUP_DIR/zara_backup_$DATE.sqlite"

# 2. Sauvegarder optionnellement un dump SQL lisible en texte
curl -s http://127.0.0.1:3000/api/db/dump > "$BACKUP_DIR/zara_dump_$DATE.sql"

# 3. Supprimer systématiquement les sauvegardes âgées de plus de 30 jours
find "$BACKUP_DIR" -type f -mtime +30 -delete

echo "[$(date)] Sauvegarde native SQLite effectuée avec succès." >> /var/log/zara-backups.log
```

Rendez le script hautement exécutable sur Debian :
```bash
chmod +x /usr/local/bin/backup-sqlite.sh
```

Programmez une tâche récurrente automatisée avec Cron pour déclencher l'écriture d'une sauvegarde chaque jour à 21h00 :
```bash
(crontab -l 2>/dev/null; echo "0 21 * * * /usr/local/bin/backup-sqlite.sh >/dev/null 2>&1") | crontab -
```

---

### 🎉 Félicitations ! Votre boutique de point de vente ZARA GALLERY est à présent parfaitement configurée en PM2 avec SQLite. Votre infrastructure est autonome, compacte, et hautement résiliente face aux redémarrages serveur !
