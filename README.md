# Casino HA (MongoDB + Node + Socket.IO + Redis + React MUI)

## Requisitos
- Node 18+
- Docker (para HA opcional)
- Una BD Atlas con nombre `casino` y usuario con readWrite

## Variables
Crea `backend/.env` copiando de `.env.example` y pon tu SRV de Atlas.

## Backend local
```bash
cd backend
npm i
cp .env.example .env
# edita MONGODB_URI
npm start
# API en :4000
```

## Frontend local
```bash
cd frontend
npm i
echo VITE_API_BASE=http://localhost:4000 > .env.development
npm run dev
# Abre http://localhost:5173
```

## Alta disponibilidad (2 APIs + Redis + Nginx)
```bash
# en la raíz del proyecto
export MONGODB_URI="mongodb+srv://USER:PASS@CLUSTER.mongodb.net/casino?retryWrites=true&w=majority"
docker compose up -d --build
# entra por http://localhost:8080  (balanceador)
```

### Pruebas
- Publica una apuesta desde el frontend.
- Apaga un nodo: `docker compose stop api1`.
- Los clientes reconectan a través de Nginx y siguen recibiendo eventos gracias al adapter Redis.
