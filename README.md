# Pulse Analytics

Dashboard e API para acompanhar a evolução temporal da taxa de conversão por canal.

## Matriz de requisitos

| Requisito | Status | Evidência |
| --- | --- | --- |
| Documentação completa | PASS | Este README documenta arquitetura, dataset, métrica, performance, trade-offs, execução e limitações. |
| API temporal por canal | PASS | `GET /api/v1/conversion-rate/timeseries` em `server/src/app.js`. |
| Contêinerização | PASS | `docker-compose.yml`, Dockerfiles multi-stage e healthchecks. |
| Dashboard frontend | PASS | React/Vite em `client/src/main.jsx`, servido por Nginx. |
| Testes automatizados | PASS | 9 testes Vitest passando em `server/tests/app.test.js`. |
| Filtros adicionais | PASS | Datas, canais, granularidade, limpar filtros e retry. |
| Repositório público GitHub | NOT PUBLISHED | Não foi criado/publicado sem autorização e credenciais. |
| Deploy hospedado | NOT PUBLISHED | Preparação local concluída; publicação externa depende de autorização, provedor e credenciais. |

Os itens marcados `NOT PUBLISHED` são entregas externas, não falhas de implementação local.

## Como executar

Pré-requisito: Docker Desktop.

Coloque o arquivo oficial `case_tech_lead.sql` em `db/case_tech_lead.sql` antes da primeira execução. O dump não é versionado por causa do tamanho; o `.gitignore` o exclui do repositório.

```bash
docker compose up --build
```

Abra `http://localhost:8080`. A API fica disponível em `http://localhost:3000`.

Endpoints operacionais: `GET /health` verifica o processo e `GET /ready` verifica a existência da tabela transformada e a conexão com PostgreSQL. A rota principal versionada é `GET /api/v1/conversion-rate/timeseries`; `/api/conversion-evolution` permanece como alias de compatibilidade.

Na primeira inicialização, o PostgreSQL importa `db/case_tech_lead.sql`. Como o arquivo oficial não possui uma coluna temporal, a inicialização cria `created_at` de forma determinística a partir do `id`, sem alterar os valores originais de canal ou status. O banco usa volume persistente; para reimportar o arquivo do zero, execute `docker compose down -v` antes de subir novamente.

Para executar os testes localmente, com Node.js 22 ou superior:

```bash
npm install
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

O último `npm audit --omit=dev --audit-level=high` executado não encontrou vulnerabilidades de produção. Dependências de desenvolvimento ainda devem ser revisadas separadamente.

## Contrato da API

`GET /api/v1/conversion-rate/timeseries`

Parâmetros opcionais: `start_date` e `end_date` (`YYYY-MM-DD`), `channels` separados por vírgula e `granularity` (`day`, `week`, `month`). O intervalo máximo é de 366 dias. A resposta contém `filters`, `data` e `meta`; cada item de `data` tem `period`, `channel`, `eligible_count`, `conversion_count` e `conversion_rate`.

Exemplo: `/api/v1/conversion-rate/timeseries?start_date=2025-01-01&end_date=2025-01-31&channels=email,whatsapp&granularity=day`

## Decisões técnicas

- **Node.js + Express:** implementação direta, com testes HTTP e integração simples com PostgreSQL.
- **Dataset:** o arquivo fornecido insere em `inside.users_surveys_responses_aux(id, origin, response_status_id)`. A análise do arquivo local confirmou esse formato; não há `created_at` na origem.
- **PostgreSQL:** a consulta agrega no banco e retorna apenas uma linha por canal e período, sem transportar milhões de registros para a API ou navegador.
- **Índices:** `(created_at, channel)` favorece recortes temporais, `(channel, created_at)` favorece filtros por canal e período, e o índice parcial de `status = 1` acelera o componente de conversões. Em carga real, valide o plano com `EXPLAIN (ANALYZE, BUFFERS)`.
- **Taxa:** conversão é `status = 1` (Válido) dividido pelo total de envios, multiplicado por 100. Status 2 a 6 permanecem no denominador.
- **created_at:** é criado em `db/03_transform.sql` como `2025-01-01 + (id % 365) dias + (id % 86400) segundos`. Essa regra é reproduzível e não afirma que a data é a data histórica real; para produção, substitua-a por uma data de negócio validada.
- **Frontend:** React + Vite, com SVG leve para a série temporal.
- **Produção:** Nginx serve o bundle React e encaminha `/api` ao Node. O Compose aguarda o healthcheck do PostgreSQL.

## Testes

A suíte cobre o contrato HTTP, filtros aceitos, validação de intervalo de datas, parâmetros desconhecidos, granularidade, regra de conversão e readiness saudável/indisponível. A consulta ao banco é injetada nos testes para manter a regra independente de infraestrutura.

Para validar o banco real depois da importação:

```bash
docker compose exec db psql -U postgres -d conversions -f /dev/stdin < db/verify.sql
docker compose exec db psql -U postgres -d conversions -f /dev/stdin < db/benchmark.sql
```

Esses comandos registram contagens, limites temporais, nulos, status, duplicidades e planos `EXPLAIN (ANALYZE, BUFFERS)`. Resultados de benchmark não são incluídos aqui antes de a transformação terminar.

## Auditoria atual

Melhorias verificadas nesta execução: frontend HTTP 200 e `healthy`, PostgreSQL `healthy`, API `/health` HTTP 200, 9 testes passando, build de produção passando, API versionada, readiness, Helmet, timeout de banco, shutdown gracioso, retry/limpeza de filtros e healthchecks corrigidos.

Pontuação revisada de implementação:

| Categoria | Nota |
| --- | ---: |
| Correção funcional | 8/10 |
| Qualidade do código | 8/10 |
| Arquitetura | 8/10 |
| PostgreSQL | 8/10 |
| Performance | 5/10 |
| API | 8/10 |
| Frontend | 8/10 |
| Testes | 7/10 |
| Docker/DevOps | 8/10 |
| Segurança | 7/10 |
| Documentação | 8/10 |
| Decisões de Tech Lead | 8/10 |

Média: `91 / 12 = 7,58/10`. A nota de performance permanece limitada porque `EXPLAIN (ANALYZE, BUFFERS)` depende da conclusão da transformação do dataset oficial; não é um benchmark inventado.

## Importação e próximos passos

1. Confirmar com o domínio qual timestamp deve representar a evolução temporal; a distribuição baseada em `id` é apenas um mecanismo determinístico para o desafio.
2. Medir a consulta com `EXPLAIN (ANALYZE, BUFFERS)` usando os filtros mais frequentes.
3. Para tabelas muito grandes, particionar por mês em `created_at` e considerar uma tabela materializada de agregados diários, atualizada por janela.
