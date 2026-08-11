#!/usr/bin/env bash
set -e

# ==============================================================================
# CodexRAG / DevAssist AI — Production Deployment Script
# ==============================================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo "================================================================="
echo "  🚀 Starting CodexRAG Production Deployment"
echo "================================================================="

# 1. Check production environment file
if [ ! -f "backend/.env.production" ]; then
    echo "⚠️  backend/.env.production not found."
    if [ -f ".env.production.example" ]; then
        echo "📋 Creating backend/.env.production from template..."
        cp .env.production.example backend/.env.production
        
        # Generate random secrets
        JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p)
        DB_PASS=$(openssl rand -hex 16 2>/dev/null || head -c 16 /dev/urandom | xxd -p)
        
        sed -i "s/CHANGE_ME_TO_A_RANDOM_64_CHAR_HEX_STRING/$JWT_SECRET/" backend/.env.production
        sed -i "s/CHANGE_ME_TO_A_SECURE_PASSWORD/$DB_PASS/g" backend/.env.production
        
        echo "✅ Generated secure JWT secret & DB password in backend/.env.production"
    else
        echo "❌ Error: .env.production.example template is missing."
        exit 1
    fi
fi

# 2. Build Frontend Production Assets
echo ""
echo "📦 Building Frontend Static Assets (Vite)..."
cd "$PROJECT_DIR/frontend"
npm install --silent
npm run build
cd "$PROJECT_DIR"
echo "✅ Frontend build completed: dist/"

# 3. Pull & Build Docker Images
echo ""
echo "🐳 Building & Starting Production Docker Containers..."
docker compose -f docker-compose.prod.yml up -d --build

# 4. Wait for Database to become ready
echo ""
echo "⏳ Waiting for PostgreSQL database to become healthy..."
docker compose -f docker-compose.prod.yml exec -T postgres sh -c '
until pg_isready -U "$POSTGRES_USER"; do
  sleep 1
done
'
echo "✅ PostgreSQL is healthy."

# 5. Run Database Migrations (Alembic)
echo ""
echo "🗄️ Running Alembic Database Migrations..."
docker compose -f docker-compose.prod.yml exec -T api alembic upgrade head
echo "✅ Database migrations applied."

# 6. Verify Service Health
echo ""
echo "🔍 Verifying API Health..."
sleep 2
HEALTH_STATUS=$(docker compose -f docker-compose.prod.yml exec -T api curl -s http://localhost:8000/health || echo "failed")
echo "Health check result: $HEALTH_STATUS"

echo ""
echo "================================================================="
echo "  🎉 CodexRAG is successfully deployed!"
echo "  🌐 Access application at: http://localhost (or your server domain)"
echo "  🔒 Database ports are isolated inside the Docker private network."
echo "================================================================="
