# Equipment Meter Reader

Aplicação web para registrar leituras de horímetro e odômetro a partir de fotografias de painéis de equipamentos. O backend valida a imagem, usa o Google Gemini para extrair o valor, persiste a leitura e permite confirmação ou correção antes da consulta no histórico.

## Stack

**Backend:** Node.js 22, TypeScript, Fastify, Zod, Prisma, PostgreSQL, Google Gemini API, Vitest, ESLint e Prettier

**Frontend:** React 19, TypeScript, Vite, CSS e `fetch`

**Infraestrutura:** Docker e Docker Compose

**Documentação:** OpenAPI 3.1 e Swagger UI

**CI:** GitHub Actions

## Arquitetura resumida

```text
Browser
  |
  v
React + Nginx
  |
  v
Fastify API
  |-----------------> Google Gemini
  |
  +-----------------> PostgreSQL
  |
  +-----------------> uploads/
```

A integração com Gemini fica isolada por uma interface de leitura, enquanto regras de negócio e persistência permanecem no serviço e repositório da aplicação.

## Requisitos

- Docker com Docker Compose
- Chave da Google Gemini API para processar imagens reais

Para desenvolvimento sem Docker também são necessários Node.js 22+ e npm.

## Configuração

Crie o `.env` a partir do exemplo:

```powershell
Copy-Item .env.example .env
```

Variáveis principais:

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_TIMEOUT_MS=30000
POSTGRES_PORT=5432
BACKEND_PORT=3333
FRONTEND_PORT=5173
```

A chave real do Gemini deve existir somente no `.env` local e nunca deve ser versionada.

## Executar com Docker Compose

```powershell
docker compose up --build
```

Serviços:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3333
Swagger:  http://localhost:3333/docs
Health:   http://localhost:3333/health
```

O Compose mantém os dados do PostgreSQL em volume nomeado e as imagens processadas na pasta `uploads/` do projeto.

## Executar testes e gates

Backend:

```powershell
cd backend
npm ci
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

Frontend:

```powershell
cd frontend
npm ci
npm run typecheck
npm run build
```

Na raiz, valide também a configuração e a execução integrada:

```powershell
docker compose config
docker compose up --build
```

Evite compartilhar a saída completa de `docker compose config` quando o `.env` possuir segredos, pois variáveis podem ser expandidas no terminal.

## Endpoints

| Método  | Endpoint                    | Finalidade                                        |
| ------- | --------------------------- | ------------------------------------------------- |
| `GET`   | `/health`                   | Liveness da API                                   |
| `POST`  | `/readings`                 | Processar uma imagem e criar uma leitura          |
| `PATCH` | `/readings/:uuid/confirm`   | Confirmar ou corrigir o valor detectado           |
| `GET`   | `/equipment/:code/readings` | Consultar histórico, com filtro opcional por tipo |
| `GET`   | `/docs`                     | Swagger UI                                        |
| `GET`   | `/docs/openapi.json`        | Documento OpenAPI                                 |

A documentação detalhada de requests, responses, parâmetros, exemplos, códigos HTTP e erros fica centralizada no Swagger para evitar duplicação no README.

## Regras principais

- Tipos de leitura: `HOURMETER` e `ODOMETER`
- Imagens aceitas: JPEG e PNG em Base64 data URL
- Tamanho máximo da imagem decodificada: 5 MiB
- Uma leitura por equipamento, tipo e dia
- O filtro `measure_type` do histórico é case-insensitive
- Uma leitura confirmada não pode ser confirmada novamente
- A confirmação pode manter o valor detectado ou registrar um valor corrigido

## Decisões técnicas

- Zod valida a entrada HTTP e mantém schemas de negócio explícitos
- Prisma concentra acesso ao PostgreSQL
- O Gemini é acessado por uma abstração própria, permitindo testes sem chamadas reais à IA
- O frontend usa estado local e `fetch`, sem biblioteca de estado global ou componentes pesados
- O CI executa apenas os gates necessários e não realiza deploy
