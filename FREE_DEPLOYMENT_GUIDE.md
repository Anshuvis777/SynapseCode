# 🌐 Complete 100% Free Deployment Guide (CodexRAG / RepoMind AI)

This guide walks you through deploying the complete application **100% free forever ($0 / month)** without any upfront credit card charges.

---

## 📑 Deployment Options Summary

| Feature | Method 1: Cloud Managed Stack (Zero Server Management) | Method 2: Oracle Cloud Always-Free VPS (All-in-One Docker) |
|---|---|---|
| **Frontend** | **Vercel** (Global Edge CDN, Free SSL) | Self-hosted inside Docker via Nginx |
| **Backend API & Worker** | **Render.com** (Free Web Service) | Docker container on VPS |
| **PostgreSQL DB** | **Supabase** (500 MB Free Tier) | PostgreSQL container on VPS |
| **Vector DB** | **Qdrant Cloud** (1 GB Free Permanent Cluster) | Qdrant container on VPS |
| **Redis Broker** | **Upstash Redis** (10,000 requests/day Free) | Redis container on VPS |
| **RAM / Resources** | Distributed Cloud Serverless | **24 GB RAM, 4 OCPU, 200 GB SSD** (Free Forever) |
| **Setup Time** | ~10 minutes | ~15 minutes |

---

# 🚀 Method 1: Cloud Managed Free Stack (Recommended)

```mermaid
graph TD
    Client["User Browser"] -->|Free Host & SSL| Vercel["Frontend: Vercel"]
    Vercel -->|API Calls (HTTPS)| Render["Backend API: Render.com"]
    Render -->|Postgres Pooling| Supabase["Database: Supabase (500MB Free)"]
    Render -->|Vector Search (HTTPS)| QdrantCloud["Vector DB: Qdrant Cloud (1GB Free)"]
    Render -->|Celery Broker| Upstash["Redis: Upstash (10k req/day)"]
    Render -->|BYOK Free Inference| Groq["LLM: Groq Free Tier"]
```

---

### Step 1: Create Free Cloud Databases (5 mins)

#### 1.1 PostgreSQL on Supabase
1. Go to [https://supabase.com](https://supabase.com) and click **Start your project**.
2. Create a new Organization and Project (e.g. `codexrag-db`).
3. Choose a strong Database Password and select your nearest region.
4. Go to **Project Settings** ➔ **Database** ➔ **Connection string** ➔ Select **URI**:
   - Copy the URI format:
     ```
     postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
     ```
   - For our FastAPI async stack, format it as:
     `DATABASE_URL=postgresql+asyncpg://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
     `DATABASE_URL_SYNC=postgresql+psycopg2://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`

#### 1.2 Qdrant Vector Cloud
1. Go to [https://cloud.qdrant.io](https://cloud.qdrant.io) and sign up with GitHub.
2. Click **Create Cluster** ➔ Select **Free Tier (1 GB RAM / 0.5 vCPU)** ➔ Choose region ➔ Click **Create**.
3. Under **Cluster Details**, copy:
   - **Cluster Endpoint:** `https://xxxxxx-xxxx.eu-central.aws.cloud.qdrant.io:6333`
   - **API Key:** Click **Data access control** ➔ **Generate API Key** ➔ Copy the key.

#### 1.3 Upstash Serverless Redis
1. Go to [https://upstash.com](https://upstash.com) and sign in.
2. Click **Create Database** ➔ Name: `codexrag-redis` ➔ Type: **Regional** (Free) ➔ Click **Create**.
3. Under **Connect to your database** ➔ Select **Node / Python** or **Redis URL**:
   - Copy the connection string:
     ```
     rediss://default:[YOUR-PASSWORD]@[YOUR-ENDPOINT].upstash.io:6379
     ```

---

### Step 2: Deploy Backend API on Render.com (3 mins)

1. Go to [https://render.com](https://render.com) and sign in with GitHub.
2. Click **New +** ➔ **Web Service**.
3. Select your repository: `Anshuvis777/RAG-project`.
4. Configure settings:
   - **Name:** `codexrag-api`
   - **Region:** Nearest to your database region (e.g., Frankfurt / Oregon / Singapore).
   - **Root Directory:** `backend`
   - **Runtime:** `Docker`
   - **Instance Type:** `Free` (0.5 CPU, 512MB RAM)
5. Scroll down to **Environment Variables** and add:

| Key | Value | Note |
|---|---|---|
| `APP_NAME` | `CodexRAG` | App display name |
| `APP_ENV` | `production` | Production mode |
| `DEBUG` | `false` | Disable debug docs |
| `JWT_SECRET_KEY` | *(Generate 64-char string)* | `openssl rand -hex 32` |
| `DATABASE_URL` | `postgresql+asyncpg://postgres....` | Supabase URI with `+asyncpg` |
| `DATABASE_URL_SYNC` | `postgresql+psycopg2://postgres....` | Supabase URI with `+psycopg2` |
| `REDIS_URL` | `rediss://default:...` | Upstash Redis URI |
| `CELERY_BROKER_URL` | `rediss://default:...` | Upstash Redis URI |
| `QDRANT_HOST` | `xxxx.cloud.qdrant.io` | Qdrant endpoint host (without https://) |
| `QDRANT_PORT` | `6333` | Qdrant port |
| `QDRANT_API_KEY` | *(Your Qdrant API Key)* | Qdrant cloud key |
| `EMBEDDING_PROVIDER` | `fastembed` | Fast local ONNX embeddings |
| `LLM_PROVIDER` | `groq` | Groq BYOK provider |
| `CORS_ORIGINS` | `*` *(or your Vercel URL)* | Allowed frontend origins |

6. Click **Create Web Service**. Render will build the Docker container and provide a live HTTPS URL:
   `https://codexrag-api.onrender.com`

---

### Step 3: Deploy Frontend on Vercel (2 mins)

1. Go to [https://vercel.com](https://vercel.com) and log in with GitHub.
2. Click **Add New...** ➔ **Project**.
3. Import `Anshuvis777/RAG-project`.
4. Configure Project Settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click Edit ➔ select `frontend` ➔ Click Continue.
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Under **Environment Variables**, add:
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `https://codexrag-api.onrender.com/api` (Your Render backend URL + `/api`)
6. Click **Deploy**.
7. In ~30 seconds, your site will be live at:
   `https://rag-project-xxxxx.vercel.app` (or your custom domain)!

---

# 💻 Method 2: Oracle Cloud Always-Free VPS (24 GB RAM, All-in-One)

If you prefer having everything on a **single powerful machine** without splitting across multiple services:

### Step 1: Claim Free Oracle Cloud Instance
1. Sign up at [https://www.oracle.com/cloud/free/](https://www.oracle.com/cloud/free/).
2. Go to **Compute** ➔ **Instances** ➔ **Create Instance**.
3. Image: **Ubuntu 22.04 LTS**.
4. Shape: **Ampere ARM (VM.Standard.A1.Flex)** ➔ Configure **4 OCPU, 24 GB RAM, 100 GB Boot Volume** *(100% Free Forever)*.
5. Add your SSH Public Key and click **Create**.

### Step 2: Deploy in 1 Single Command
SSH into your server and run:
```bash
# Update and install Docker
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git

# Clone your repo
git clone https://github.com/Anshuvis777/RAG-project.git /opt/codexrag
cd /opt/codexrag

# Run automated deployment
./scripts/deploy.sh
```

Everything (Nginx, React Frontend, FastAPI, Celery Worker, PostgreSQL, Redis, Qdrant) will automatically start and run 24x7!

---

## 🔒 Post-Deployment Checklist

- [x] Register account on your live URL.
- [x] Click Profile avatar in bottom-left ➔ Enter your **Groq API Key**.
- [x] Link repository: `https://github.com/Anshuvis777/FuelNet`.
- [x] Open AI Chat and test semantic code questions!
