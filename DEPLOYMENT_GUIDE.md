# GUIDE COMPLET DE DÉPLOIEMENT ET D'INSTALLATION DE A À Z (DEBIAN 12)
## Application POS (Point de Vente) — ZARA GALLERY
### Rédigé spécialement pour débutant — Pas-à-pas sans connaissances préalables requises

Ce guide complet vous accompagne étape par étape pour installer, configurer et lancer votre logiciel de caisse **Zara Gallery** sur un serveur local équipé du système d'exploitation **Debian 12 (Bookworm)**. 

Grâce à notre configuration préparée, l'intégralité du système (le serveur de caisse, l'interface utilisateur, la base de données MariaDB pré-remplie avec vos données identiques, et l'outil d'administration phpMyAdmin) démarrera automatiquement d'un seul coup.

---

## SOMMAIRE
1. **Architecture Globale (Comprendre le système)**
2. **Étape 1 : Connexion à votre Serveur Debian 12**
3. **Étape 2 : Préparation du Système et mise à jour**
4. **Étape 3 : Installation de Docker et Docker Compose (Indispensable)**
5. **Étape 4 : Transfert des fichiers de l'application sur le serveur**
6. **Étape 5 : Lancement rapide de l'application**
7. **Étape 6 : Restauration et Gestion de la Base de Données (Dump SQL)**
8. **Étape 7 : Ouverture du réseau local pour connecter les caisses/tablettes**
9. **Étape 8 : Guide d'impression de reçus**
10. **Aide aux erreurs fréquentes (Dépannage débutant)**

---

## 1. ARCHITECTURE GLOBALE
L’application fonctionne de manière isolée et sécurisée grâce à trois modules communicants :
* **Le Serveur POS (Zara App) :** Fait tourner l'interface de caisse et l'API de vente (Exposé sur le port `6000` ou `7000` via docker-compose car le 3000 est occupé).
* **La Base de données (MariaDB) :** Enregistre de manière ultra-sécurisée les ventes, articles, clients et sessions (Port `3306`), avec le nouveau système de partitionnement automatique.
* **phpMyAdmin :** Une interface Web visuelle pour regarder et modifier la base de données en toute simplicité (Port `8080`).

---

## ÉTAPE 1 : CONNEXION À VOTRE SERVEUR DEBIAN 12
Vous devez d'abord vous connecter à votre serveur de caisse local pour exécuter les commandes.
* **Option A (Écran branché sur le serveur) :** Ouvrez simplement l'application **Terminal** (ou Console).
* **Option B (Connexion à distance via SSH) :** Depuis votre ordinateur habituel, ouvrez une invite de commandes ou un terminal et tapez :
  ```bash
  ssh utilisateur@adresse_ip_du_serveur
  ```
  *(Remplacez `utilisateur` par votre nom d'utilisateur Debian et `adresse_ip_du_serveur` par l'IP de votre serveur local, ex: `192.168.1.100`)*

---

## ÉTAPE 2 : PRÉPARATION DU SYSTÈME ET MISE À JOUR
Pour installer en toute tranquillité, assurez-vous d'utiliser les droits administrateur de votre serveur. Passez en mode `root` ou utilisez `sudo` avant chaque commande.

1. Mettez à jour la liste des paquets de votre serveur pour être sûr d'avoir les dernières versions de sécurité :
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
2. Installez quelques outils de base nécessaires pour la suite :
   ```bash
   sudo apt install -y curl git nano ca-certificates gnupg
   ```

---

## ÉTAPE 3 : INSTALLATION DE DOCKER ET DOCKER COMPOSE
Pour éviter d'installer manuellement des serveurs MariaDB compliqués sur Debian 12, nous installons **Docker**, qui gère tout en arrière-plan.

Exécutez ce script officiel sécurisé pour installer Docker d'une seule traite sur votre Debian 12 :

1. **Configuration des clés d'accès Docker :**
   ```bash
   sudo install -m 0755 -d /etc/apt/keyrings
   sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
   sudo chmod a+r /etc/apt/keyrings/docker.asc
   ```

2. **Ajout du dépôt officiel Docker à Debian :**
   ```bash
   echo \
     "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
     $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
     sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
   ```

3. **Installation de Docker et ses outils :**
   ```bash
   sudo apt update
   sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
   ```

4. **Vérification que l'installation s'est bien déroulée :**
   ```bash
   sudo docker --version
   sudo docker compose version
   ```
   *(Si les versions s'affichent à l'écran, Docker est parfaitement installé !)*

5. **Paramétrage optionnel de l'utilisateur (Pour ne pas avoir à ré-écrire `sudo` partout) :**
   ```bash
   sudo usermod -aG docker $USER
   ```
   *Note : Déconnectez-vous de votre session et reconnectez-vous pour appliquer ce filtre d'utilisateur.*

---

## ÉTAPE 4 : TRANSFERT DES FICHIERS DE L'APPLICATION SUR LE SERVEUR
Pour faire fonctionner le POS sur votre Debian 12, vous devez y copier le code source de l'application.

* **Méthode A (Facile par Clé USB ou SFTP) :**
  Utilisez un logiciel gratuit comme **FileZilla** ou **WinSCP** pour glisser-déposer tous les dossiers de ce projet dans un répertoire sur votre serveur Debian (par exemple, créez un dossier `/home/votre_nom/zara-pos`).
* **Méthode B (Via Git si vous utilisez un dépôt privé) :**
  ```bash
  cd /home/votre_nom/
  git clone <lien_de_votre_depot> zara-pos
  cd zara-pos
  ```

---

## ÉTAPE 5 : LANCEMENT RAPIDE DE L'APPLICATION
Une fois dans le dossier contenant vos fichiers (où se trouvent les fichiers `docker-compose.yml`, `Dockerfile` et `init_db.sql`) :

1. **Créez votre fichier de configuration d'environnement :**
   Créez un fichier nommé `.env` à la racine :
   ```bash
   nano .env
   ```
   Copiez-collez ces lignes exactes dedans :
   ```env
   NODE_ENV=production
   PORT=3000
   USE_MARIADB=true
   DB_HOST=db
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=zara_password
   DB_NAME=zara_db
   ```
   *(Pour enregistrer avec le logiciel `nano` : appuyez sur `Ctrl+O` puis `Entrée`, et quittez avec `Ctrl+X`)*

2. **Démarrez l'application POS ZARA en une ligne :**
   ```bash
   sudo docker compose up -d --build
   ```

**Que se passe-t-il après avoir lancé cette commande ?**
* Docker construit votre interface utilisateur et démarre l'application sur le port **`3000`**.
* Docker télécharge et démarre une base de données MariaDB dédiée.
* **IMPORT AUTOMATIQUE :** Parce que notre système est bien pensé, à la toute première seconde de création de la base de données, Docker lit directement le fichier **`init_db.sql`** à la racine et l'importe de façon 100% automatique pour vous fournir une base identique et immédiatement opérationnelle !

---

## ÉTAPE 6 : RESTAURATION ET GESTION DE LA BASE DE DONNÉES (DUMP SQL)
Si vous souhaitez réimporter manuellement ou mettre à jour un dump SQL à n'importe quel moment :

### Méthode 1 : Ré-importation manuelle simplifiée (Ligne de commande)
Si vous venez d'obtenir un nouveau fichier de sauvegarde de votre base de données nommé `init_db.sql`, placez-le dans le dossier du projet, puis exécutez ces deux commandes :
```bash
# 1. Copier le fichier SQL dans le conteneur de données
sudo docker cp init_db.sql zara_mariadb:/init_db.sql

# 2. Exécuter l'import vers la base active zara_db
sudo docker exec -i zara_mariadb mysql -u root -p"zara_password" zara_db < init_db.sql
```

### Méthode 2 : Import / Export graphique avec phpMyAdmin (Le plus simple pour débutants)
1. Ouvrez votre navigateur internet habituel.
2. Saisissez l'adresse : `http://[ADRESSE_IP_DE_VOTRE_DEBIAN]:8080` (ou `http://localhost:8080` si vous êtes physiquement sur le serveur).
3. Connectez-vous avec les identifiants :
   * **Utilisateur :** `root`
   * **Mot de passe :** `zara_password`
4. Cliquez sur la base de données **`zara_db`** à gauche.
5. Sélectionnez l'onglet **Import** en haut, choisissez votre fichier `.sql` ou le dump, et cliquez sur **Exécuter** tout en bas de l'écran. C'est fait !

### Comment faire une nouvelle sauvegarde (Sauvegarde brute SQL) ?
Pour exporter votre base de données à tout moment vers un fichier SQL de secours utilisable :
```bash
sudo docker exec -t zara_mariadb mysqldump -u root -p"zara_password" zara_db > ma_sauvegarde_zara.sql
```

---

## ÉTAPE 7 : OUVERTURE DU RÉSEAU LOCAL POUR CONNECTER LES CAISSES / TABLETTES
Pour pouvoir ouvrir l'écran de caisse depuis d'autres appareils connectés en magasin (ex: tablettes d'iPad/Android des vendeurs, autres ordinateurs, téléphones portables de l'équipe) :

1. **Autoriser l'accès à travers le pare-feu Debian :**
   Si vous avez activé un pare-feu sur Debian (comme `ufw`), vous devez autoriser le port de votre application (6000) et éventuellement phpMyAdmin (8080) :
   ```bash
   sudo ufw allow 6000/tcp
   sudo ufw allow 8080/tcp
   sudo ufw reload
   ```

2. **Trouver l'adresse IP de votre serveur Debian sur le réseau Wi-Fi/Ethernet :**
   Exécutez la commande suivante :
   ```bash
   hostname -I
   ```
   *(La console va vous afficher une adresse comme `192.168.1.50`)*

3. **Se connecter depuis n'importe quel autre appareil :**
   Connectez l'iPad, la tablette ou l'ordinateur portable du magasin sur **le même Wi-Fi** que votre serveur Debian.
   Ouvrez un navigateur (Google chrome, Safari) et tapez :
   ```text
   http://192.168.1.50:6000/
   ```
   *(En remplaçant `192.168.1.50` par l'IP affichée à l'étape précédente)*. L'interface s'affichera instantanément !

---

## ÉTAPE 8 : GUIDE GÉNERAL D'IMPRESSION DE REÇUS
L'application intègre un utilitaire d'impression propre pour formater n'importe quel ticket.

1. **Impression Directe en plein écran (Recommandée) :**
   À cause des restrictions de sécurité intégrées par les éditeurs de cloud (les bacs à sable "Sandbox"), l'impression directe ne fonctionne pas bien à l'intérieur d'un "aperçu" intégré. 
   **C'est normal !** Une fois l'application ouverte dans son propre onglet ou sur votre serveur Debian (ex: htp://localhost:6000), le bouton **Imprimer** lancera immédiatement la fenêtre d'impression native de l'OS avec un formatage idéal pour ticket de caisse de boutique.
2. **Configuration Système de l’imprimante thermique (80mm) :**
   * Connectez votre imprimante sur la caisse active.
   * Lorsque l'aperçu avant impression s'ouvre :
     * Définissez la **Destination** sur votre imprimante thermique (Xprinter, Epson, etc.).
     * Réglez les **Marges** sur **"Aucun"** ou **"Minimum"**.
     * Décochez l'option **"En-têtes et pieds de page"** pour empêcher d'imprimer la date ou l'URL du navigateur en haut et en bas du ticket.
     * Pour une disposition parfaite, assurez-vous d'avoir coché **"Graphismes d'arrière-plan"** pour voir le logo et les lignes esthétiques.

---

## 10. AIDE AUX ERREURS FRÉQUENTES (DÉPANNAGE DÉBUTANT)

### "Erreur : Port 6000 déjà utilisé"
Si un autre programme utilise le port 6000 sur votre Debian 12, ouvrez le fichier `docker-compose.yml` et remplacez `"6000:3000"` par `"7000:3000"`. Relancez l'application.

### "Comment voir si mes conteneurs fonctionnent correctement ?"
```bash
sudo docker compose ps
```
Cette commande affiche en vert si le POS, phpMyAdmin et MariaDB sont en cours d'exécution.

### "Je veux voir les lignes de logs pour comprendre une erreur"
```bash
sudo docker compose logs -f
```

---
*Félicitations ! Votre logiciel de Point de Vente Zara Gallery est maintenant configuré de manière professionnelle et prêt à être exploité de manière autonome au sein de votre enseigne sur Debian 12.*
