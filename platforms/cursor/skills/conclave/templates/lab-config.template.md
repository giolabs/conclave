---
lab_config_version: "2.0"
# ─────────────────────────────────────────────────────────────────────────────
# COPY THIS FILE → conclave/lab-config.md and fill in real values.
# conclave/lab-config.md MUST be gitignored — add this line to .gitignore:
#
#   conclave/lab-config.md
#
# This template (lab-config.template.md) IS committed — it documents the schema.
# conclave/lab-config.md is NEVER committed — it contains local/integration
# environment values for lab test execution by the QA agent.
#
# The QA agent reads this file at execution time and exports each var to the
# shell before running the Verify command. Values never appear in any log,
# artifact, or Evidence log entry — only variable names do.
# ─────────────────────────────────────────────────────────────────────────────

# ── ENVIRONMENTS ──────────────────────────────────────────────────────────────
# The QA agent uses the "integration" env when running /conclave-qa --lab
# (the Verify command runs on the integration branch against this environment).
# Falls back to "local" when an integration key is absent, with a warning.

environments:
  local:
    base_url: "http://localhost:3000"   # URL of the running local dev server
    vars:
      # Flat env var map for local execution. Keys must match exactly what
      # the Tech Lead wrote in the lab spec's Verify command.
      # Example:
      # DATABASE_URL: "postgresql://localhost:5432/myapp_test"
      # API_BASE_URL: "http://localhost:3000"
      # AUTH_TOKEN: "local-test-token"

  integration:
    base_url: ""                        # e.g. https://staging.myapp.com
    vars:
      # Same keys as local.vars but pointing to the integration environment.
      # Example:
      # DATABASE_URL: ""
      # API_BASE_URL: ""
      # AUTH_TOKEN: ""

# ── RUNNER ────────────────────────────────────────────────────────────────────

runner:
  default: auto                         # auto | playwright | newman | bash
  playwright:
    browser: chromium                   # chromium | firefox | webkit
    headed: false                       # true to open a browser window during execution
    timeout_ms: 30000
    retries: 1
  newman:
    timeout_ms: 30000
    reporter: json
  bash:
    timeout_seconds: 120

# ── AUTH / CREDENTIALS ────────────────────────────────────────────────────────
# Pre-issued test credentials only. Never production values.
# These populate the named env vars listed in the Variable registry below.

auth:
  e2e_user_email: ""                    # E2E_USER_EMAIL — test user for browser-driven flows
  e2e_user_password: ""                 # E2E_USER_PASSWORD
  api_key: ""                           # API_KEY — generic API key for direct API calls
  auth_token: ""                        # AUTH_TOKEN — pre-issued JWT/Bearer for protected endpoints

# ── DATABASES ─────────────────────────────────────────────────────────────────
# Fill only the databases your project uses. Leave unused blocks empty.

databases:
  postgres:
    url: ""                             # LAB_DATABASE_URL — postgresql://user:pass@host:5432/db_test
    schema: "public"                    # LAB_DB_SCHEMA
  mysql:
    url: ""                             # LAB_MYSQL_URL — mysql://user:pass@host:3306/db_test
  mongodb:
    url: ""                             # LAB_MONGODB_URL — mongodb://user:pass@host:27017/db_test
  redis:
    url: ""                             # LAB_REDIS_URL — redis://host:6379/1 (use DB index ≠ 0)

# ── MICROSERVICES / CONTRACTS ─────────────────────────────────────────────────
# For service-to-service integration tests and Pact contract verification.

microservices:
  pact_broker_url: ""                   # PACT_BROKER_URL
  pact_broker_token: ""                 # PACT_BROKER_TOKEN
  pact_consumer: ""                     # PACT_CONSUMER — service name as registered in Pact Broker
  service_b_base_url: ""               # SERVICE_B_BASE_URL — URL of a downstream service
  service_b_api_key: ""                # SERVICE_B_API_KEY

# ── AWS ───────────────────────────────────────────────────────────────────────
# Use a test-scoped IAM role with minimum permissions. Never production keys.

aws:
  region: ""                            # LAB_AWS_REGION — e.g. us-east-1
  access_key_id: ""                     # LAB_AWS_ACCESS_KEY_ID — test-scoped IAM role
  secret_access_key: ""                # LAB_AWS_SECRET_ACCESS_KEY
  role_arn: ""                          # LAB_AWS_ROLE_ARN — optional, for assume-role flows
  resources:
    sqs_queue_url: ""                   # LAB_SQS_QUEUE_URL
    sns_topic_arn: ""                   # LAB_SNS_TOPIC_ARN
    dynamodb_table: ""                  # LAB_DYNAMODB_TABLE — test table name
    s3_bucket: ""                       # LAB_S3_BUCKET — test bucket name
    lambda_function: ""                 # LAB_LAMBDA_FUNCTION — function name or ARN
    rds_host: ""                        # LAB_RDS_HOST — RDS endpoint of test DB

# ── GCP ───────────────────────────────────────────────────────────────────────
# Use a dedicated service account with minimum IAM roles for the test project.

gcp:
  project_id: ""                        # LAB_GCP_PROJECT_ID
  region: ""                            # LAB_GCP_REGION — e.g. us-central1
  sa_key_json_base64: ""               # LAB_GCP_SA_KEY_JSON — base64 of service account JSON key
  resources:
    pubsub_topic: ""                    # LAB_GCP_PUBSUB_TOPIC — topic name (not full path)
    firestore_collection: ""            # LAB_GCP_FIRESTORE_COLLECTION
    bigquery_dataset: ""               # LAB_GCP_BIGQUERY_DATASET — dataset ID
    cloud_sql_url: ""                  # LAB_GCP_CLOUD_SQL_URL — connection string

# ── AZURE ─────────────────────────────────────────────────────────────────────
# Use an App Registration scoped to the test resource group only.

azure:
  subscription_id: ""                   # LAB_AZURE_SUBSCRIPTION_ID
  tenant_id: ""                         # LAB_AZURE_TENANT_ID
  client_id: ""                         # LAB_AZURE_CLIENT_ID — App Registration client ID
  client_secret: ""                     # LAB_AZURE_CLIENT_SECRET
  resource_group: ""                    # LAB_AZURE_RESOURCE_GROUP — test resource group only
  resources:
    servicebus_namespace: ""            # LAB_AZURE_SERVICEBUS_NAMESPACE
    servicebus_queue: ""                # LAB_AZURE_SERVICEBUS_QUEUE
    cosmos_account: ""                  # LAB_AZURE_COSMOS_ACCOUNT
    cosmos_db: ""                       # LAB_AZURE_COSMOS_DB
    cosmos_container: ""               # LAB_AZURE_COSMOS_CONTAINER
    sql_connection: ""                  # LAB_AZURE_SQL_CONNECTION

# ── TERRAFORM / IAC ───────────────────────────────────────────────────────────

terraform:
  workspace: ""                         # LAB_TF_WORKSPACE — e.g. staging
  state_key: ""                         # LAB_TF_STATE_KEY — key in remote backend
  backend_bucket: ""                    # LAB_TF_BACKEND_BUCKET — S3/GCS/Azure blob container
  var_file: ""                          # LAB_TF_VAR_FILE — relative path to .tfvars for this env

# ── TEST SAFETY ───────────────────────────────────────────────────────────────
# The QA agent enforces these rules before running any Verify command.

safety:
  test_tag_prefix: "lab"               # Prefix for all test-created resources (appended with run timestamp)
  data_ttl_seconds: 3600               # Max age of test data — the Verify command cleanup should respect this
  email_sink: ""                        # Domain for test user emails (e.g. mailinator.com, inbucket.local)
  payment_mode: test                    # MUST be "test" — the QA agent refuses "live"
  stripe_secret_key: ""                # STRIPE_SECRET_KEY — MUST start with sk_test_ (agent-enforced)
---

# Lab Config — Variable Registry

<!-- ─────────────────────────────────────────────────────────────────────────
  The Variable registry below is the most important section for the Tech Lead:
  it lists the env var NAMES the TL may reference in generated Verify commands.
  Only names from this registry may appear in a lab spec's Verify command.
  If a variable is not listed here, the TL will return status: blocked.

  Fill in the rows that apply to your project. Delete rows that do not apply.
  The values live in the YAML frontmatter above (gitignored).
───────────────────────────────────────────────────────────────────────────── -->

## Variable registry

### Auth / Credentials

| Env var name | Source in frontmatter | Purpose | Integration type |
|---|---|---|---|
| E2E_USER_EMAIL | auth.e2e_user_email | Test user for browser-driven flows | FE→BE, Full stack |
| E2E_USER_PASSWORD | auth.e2e_user_password | Test user password | FE→BE, Full stack |
| API_KEY | auth.api_key | Generic API key for direct API calls | FE→BE, Microservices |
| AUTH_TOKEN | auth.auth_token | Pre-issued JWT/Bearer for protected endpoints | FE→BE, BE→DB, Microservices |
| STRIPE_SECRET_KEY | safety.stripe_secret_key | Stripe test key — must start with sk_test_ | FE→BE, Full stack |

### URLs and Endpoints

| Env var name | Source in frontmatter | Purpose | Integration type |
|---|---|---|---|
| PLAYWRIGHT_BASE_URL | environments.*.base_url | App base URL for Playwright browser tests | FE→BE, Full stack |
| API_BASE_URL | environments.*.base_url | API root URL for Newman / curl calls | FE→BE, BE→BE |
| SERVICE_B_BASE_URL | microservices.service_b_base_url | URL of a downstream service | BE→BE |
| PACT_BROKER_URL | microservices.pact_broker_url | Pact Broker URL | BE→BE contracts |

### Databases

| Env var name | Source in frontmatter | Purpose | Integration type |
|---|---|---|---|
| LAB_DATABASE_URL | databases.postgres.url | PostgreSQL test DB connection | BE→DB, Full stack |
| LAB_MYSQL_URL | databases.mysql.url | MySQL test DB connection | BE→DB |
| LAB_MONGODB_URL | databases.mongodb.url | MongoDB test DB connection | BE→DB |
| LAB_REDIS_URL | databases.redis.url | Redis test instance (DB index ≠ 0) | BE→DB |

### AWS Resources

| Env var name | Source in frontmatter | Purpose | Integration type |
|---|---|---|---|
| LAB_AWS_REGION | aws.region | AWS region | BE→AWS |
| LAB_AWS_ACCESS_KEY_ID | aws.access_key_id | Test-scoped IAM access key | BE→AWS |
| LAB_AWS_SECRET_ACCESS_KEY | aws.secret_access_key | Test-scoped IAM secret | BE→AWS |
| LAB_AWS_ROLE_ARN | aws.role_arn | IAM role to assume (optional) | BE→AWS |
| LAB_SQS_QUEUE_URL | aws.resources.sqs_queue_url | SQS test queue URL | BE→AWS |
| LAB_SNS_TOPIC_ARN | aws.resources.sns_topic_arn | SNS topic ARN | BE→AWS |
| LAB_DYNAMODB_TABLE | aws.resources.dynamodb_table | DynamoDB test table name | BE→AWS |
| LAB_S3_BUCKET | aws.resources.s3_bucket | S3 test bucket name | BE→AWS |
| LAB_LAMBDA_FUNCTION | aws.resources.lambda_function | Lambda function name or ARN | BE→AWS |
| LAB_RDS_HOST | aws.resources.rds_host | RDS test instance host | BE→AWS |

### GCP Resources

| Env var name | Source in frontmatter | Purpose | Integration type |
|---|---|---|---|
| LAB_GCP_PROJECT_ID | gcp.project_id | GCP test project ID | BE→GCP |
| LAB_GCP_REGION | gcp.region | GCP region | BE→GCP |
| LAB_GCP_SA_KEY_JSON | gcp.sa_key_json_base64 | Service account JSON (base64) | BE→GCP |
| LAB_GCP_PUBSUB_TOPIC | gcp.resources.pubsub_topic | Pub/Sub topic name | BE→GCP |
| LAB_GCP_FIRESTORE_COLLECTION | gcp.resources.firestore_collection | Firestore collection | BE→GCP |
| LAB_GCP_BIGQUERY_DATASET | gcp.resources.bigquery_dataset | BigQuery dataset ID | BE→GCP |
| LAB_GCP_CLOUD_SQL_URL | gcp.resources.cloud_sql_url | Cloud SQL connection string | BE→GCP |

### Azure Resources

| Env var name | Source in frontmatter | Purpose | Integration type |
|---|---|---|---|
| LAB_AZURE_SUBSCRIPTION_ID | azure.subscription_id | Azure subscription ID | BE→Azure |
| LAB_AZURE_TENANT_ID | azure.tenant_id | Azure tenant ID | BE→Azure |
| LAB_AZURE_CLIENT_ID | azure.client_id | App Registration client ID | BE→Azure |
| LAB_AZURE_CLIENT_SECRET | azure.client_secret | App Registration client secret | BE→Azure |
| LAB_AZURE_RESOURCE_GROUP | azure.resource_group | Test resource group | BE→Azure |
| LAB_AZURE_SERVICEBUS_NAMESPACE | azure.resources.servicebus_namespace | Service Bus namespace | BE→Azure |
| LAB_AZURE_SERVICEBUS_QUEUE | azure.resources.servicebus_queue | Service Bus queue name | BE→Azure |
| LAB_AZURE_COSMOS_ACCOUNT | azure.resources.cosmos_account | Cosmos DB account name | BE→Azure |
| LAB_AZURE_COSMOS_DB | azure.resources.cosmos_db | Cosmos DB database name | BE→Azure |
| LAB_AZURE_COSMOS_CONTAINER | azure.resources.cosmos_container | Cosmos DB container/collection | BE→Azure |
| LAB_AZURE_SQL_CONNECTION | azure.resources.sql_connection | Azure SQL connection string | BE→Azure |

### Microservices / Contracts

| Env var name | Source in frontmatter | Purpose | Integration type |
|---|---|---|---|
| PACT_BROKER_TOKEN | microservices.pact_broker_token | Pact Broker auth token | BE→BE contracts |
| PACT_CONSUMER | microservices.pact_consumer | Consumer name in Pact Broker | BE→BE contracts |
| SERVICE_B_API_KEY | microservices.service_b_api_key | Auth key for downstream service | BE→BE |

### Terraform / IaC

| Env var name | Source in frontmatter | Purpose | Integration type |
|---|---|---|---|
| LAB_TF_WORKSPACE | terraform.workspace | Terraform workspace (staging/dev) | IaC |
| LAB_TF_STATE_KEY | terraform.state_key | Remote state backend key | IaC |
| LAB_TF_BACKEND_BUCKET | terraform.backend_bucket | State backend bucket/container | IaC |
| LAB_TF_VAR_FILE | terraform.var_file | Path to .tfvars for this env | IaC |

### Test Safety / Idempotency

| Env var name | Source in frontmatter | Purpose | Integration type |
|---|---|---|---|
| LAB_TEST_TAG | safety.test_tag_prefix + timestamp | Prefix for all resources created by this run | all |
| LAB_EMAIL_SINK | safety.email_sink | Domain for test email addresses | FE→BE, Full stack |

## Runner quick reference

| Integration type | Recommended runner | Verify command pattern |
|---|---|---|
| FE → BE (browser) | Playwright | `npx playwright test <file> --reporter=json \| jq -e '.stats.unexpected == 0'` |
| API direct / BE → BE | Newman | `newman run tests/uat/collection.json --reporter json \| jq -e '.run.stats.assertions.failed == 0'` |
| API direct (simple) | curl + jq | `curl -sf $API_BASE_URL/health \| jq -e '.status == "ok"'` |
| BE → DB (integration) | Jest/Pytest/go test | `npm test -- --testPathPattern=integration; echo "exit:$?"` |
| BE → BE (contracts) | Pact CLI | `npx pact-broker can-i-deploy --pacticipant $PACT_CONSUMER ...` |
| BE → AWS | AWS CLI + jq | `aws sqs send-message ... && sleep 5 && aws dynamodb get-item ... \| jq -e '.Item != null'` |
| BE → GCP | gcloud CLI + jq | `gcloud pubsub topics publish ... && sleep 8 && gcloud firestore documents get ... \| jq -e '.fields != null'` |
| BE → Azure | az CLI + jq | `az servicebus message send ... && sleep 8 && az cosmosdb sql item show ... \| jq -e '.id != null'` |
| Full stack | Playwright + DB query | `PLAYWRIGHT_BASE_URL=$PLAYWRIGHT_BASE_URL DATABASE_URL=$LAB_DATABASE_URL npx playwright test tests/e2e/full-flow.spec.ts ...` |
| IaC drift detection | Terraform CLI | `terraform plan -detailed-exitcode ... ; [ $? -eq 0 ]` |

## Pre-conditions checklist

- [ ] `environments.integration.vars` block is filled in (not all empty)
- [ ] `safety.payment_mode` is `test` (never `live`)
- [ ] `safety.stripe_secret_key` starts with `sk_test_` (the QA agent validates this at runtime)
- [ ] AWS credentials are for a test-scoped IAM role (not production keys)
- [ ] GCP service account JSON is stored as base64 in `gcp.sa_key_json_base64`
- [ ] Azure client secret belongs to an App Registration scoped to the test resource group only
- [ ] Test database is reachable from the machine running the QA agent
- [ ] `conclave/lab-config.md` is listed in `.gitignore`

## Notes

<!-- 
Execution notes specific to this environment. Examples:
- "Run `docker-compose up -d db redis` before any backend lab test"
- "Integration env resets nightly at 02:00 UTC — run --lab after 03:00"
- "AWS role requires MFA exemption — use the lab-test IAM policy in infra/iam/lab-test-role.json"
- "GCP SA key must be refreshed monthly — rotation tracked in infra/gcp/service-accounts.md"
- "All test resources use prefix 'lab-YYYYMMDD' — safe to delete anything older than 24h"
-->
