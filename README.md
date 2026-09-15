# Equipment Meter Reader

Projeto de estudo para registrar leituras de horímetro e odômetro a partir de imagens

## Stack atual

- Node.js 22 + TypeScript
- Fastify
- Zod
- Prisma + PostgreSQL
- Vitest + Fastify `inject()`
- ESLint + Prettier
- Docker + Docker Compose

## Estrutura atual

```text
equipment-meter-reader/
├── backend/
│   ├── prisma/
│   ├── src/
│   ├── tests/
│   ├── Dockerfile
│   └── package.json
├── uploads/
├── .env.example
├── docker-compose.yml
└── README.md
```

O frontend, Gemini e os endpoints de leitura serão desenvolvidos ainda.

## Configuração

Crie o arquivo de ambiente na raiz:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

A variável `GEMINI_API_KEY` já aparece como placeholder, mas só será usada quando a integração com Gemini for desenvolvida.

## Executar com Docker Compose

```bash
docker compose up --build
```

O Compose inicia o PostgreSQL e o backend. Na inicialização, o backend aplica as migrations e executa o seed idempotente.

API:

```text
http://localhost:3333
```

Health check:

```bash
curl http://localhost:3333/health
```

No PowerShell:

```powershell
Invoke-RestMethod http://localhost:3333/health
```

Resposta esperada:

```json
{
  "status": "ok"
}
```

## Executar o backend localmente

Com PostgreSQL acessível pela `DATABASE_URL` do `.env`:

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
npm run build
npm start
```

## Validações

No diretório `backend/`:

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

## Banco

O seed cria três equipamentos de exemplo:

- `EMP-001` - Escavadeira hidráulica
- `EMP-002` - Empilhadeira
- `EMP-003` - Caminhão de serviço

`Reading` possui relação com `Equipment` e uma coluna `measure_date` usada para reforçar no banco a regra de apenas uma leitura por equipamento, tipo e dia.

## Endpoint disponível nesta etapa

### `GET /health`

Retorna o estado de liveness da aplicação.

Os três endpoints de negócio serão adicionados posteriormente.
