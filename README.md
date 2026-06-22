# NDAgent - Analyseur de conformité de NDA client alimenté par l'IA

NDAgent est une application web conçue pour automatiser le processus de révision des accords de non-divulgation (NDA) des clients. Elle extrait le texte des NDA clients téléchargés (au format PDF ou DOCX), compare les clauses à un **NDA de référence** géré par le backend et à une liste de contrôle de conformité spécifique (**clausier**), puis identifie les problèmes de conformité à l'aide de modèles d'IA **Ollama** locaux.

## Architecture
- **Backend** : Node.js/Express, TypeScript, Multer, PDF-Parse, Mammoth, connexion fetch native à l'API Ollama.
- **Frontend** : React (Vite, TypeScript), Axios, Material UI (MUI).
- **Orchestration** : Docker, Docker Compose, Nginx (comme hôte statique et reverse proxy).

---

## Prérequis
1. **Node.js** (v18+) & **npm**
2. **Docker** & **Docker Compose** (pour le mode production)
3. **Ollama** (installé et démarré localement)
   - Téléchargement sur : [ollama.com](https://ollama.com)
   - Récupérez le modèle requis (le modèle par défaut est `mistral`, configurable dans le fichier `.env` en développement ou `docker-compose.yml` en production) :
     ```bash
     ollama pull mistral
     ```

---

## Mode Développement

Lancez le frontend et le backend dans des terminaux distincts pour bénéficier du rechargement à chaud (hot reloading) :

### 1. Démarrer le Backend
1. Allez dans le dossier `backend` :
   ```bash
   cd backend
   ```
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Définissez vos configurations dans le fichier `.env` (déjà configuré par défaut).
4. Lancez le serveur en mode développement :
   ```bash
   npm run dev
   ```
   *Le backend démarre à l'adresse : `http://localhost:3000`*

### 2. Démarrer le Frontend
1. Allez dans le dossier `frontend` :
   ```bash
   cd frontend
   ```
2. Définissez votre configuration dans le fichier `.env` (`VITE_API_URL=http://localhost:3000/api`).
3. Lancez l'application en mode développement :
   ```bash
   npm run dev
   ```
   *Le frontend démarre à l'adresse : `http://localhost:5173`*

---

## Mode Production / Conteneurisé

Vous pouvez exécuter l'ensemble de l'application de manière conteneurisée à l'aide de Docker Compose :

1. Définissez ou ajustez les variables d'environnement du backend (telles que `OLLAMA_API_URL`, `OLLAMA_MODEL`, `OLLAMA_NUM_CTX` ou `ADMIN_PASSWORD`) directement dans le fichier `docker-compose.yml` sous la section `environment` du service `backend`.
2. Construisez et lancez les conteneurs depuis la racine du projet :
   ```bash
   docker-compose up --build
   ```
3. Ouvrez votre navigateur aux adresses suivantes :
   - **Frontend** : `http://localhost:3030`
   - **Vérification de l'état du Backend (Health Check)** : `http://localhost:3000/api/health`

*Note : Dans Docker, le backend communique avec l'instance Ollama de la machine hôte via le nom d'hôte `host.docker.internal`.*

---

## Configurations de Référence
Les documents de référence sont situés dans :
- `backend/reference/reference-nda.txt` : Le modèle d'accord standard de référence.
- `backend/reference/clausier.json` : La liste de contrôle des règles définissant les conditions (descriptions des niveaux de criticité Élevé/Moyen/Faible).
