# HANDA Production Infrastructure Plan

This plan defines the first production-ready infrastructure for HANDA without overbuilding it. The goal is a setup DICT can understand, operate, audit, and scale: one Go backend, one relational database, AWS-managed primitives, and no Redis/Kubernetes/OpenSearch until evidence says they are needed.

## Target Architecture

```text
eGovPH Super App
  -> Cloudflare CDN/WAF/DDoS
  -> AWS ALB
  -> EC2 Auto Scaling Group
  -> Go API containers via Docker Compose
  -> RDS PostgreSQL Multi-AZ
  -> AWS KMS / Secrets Manager / CloudWatch
```

## Core Decisions

| Area | Decision |
| --- | --- |
| Region | AWS Singapore, single region, Multi-AZ |
| Edge | Cloudflare for CDN/WAF/DDoS |
| Gateway | AWS ALB, no Nginx |
| Runtime | EC2 Auto Scaling Group + Docker Compose |
| Backend | Single Go modular monolith |
| Database | RDS PostgreSQL Multi-AZ |
| Realtime | SSE for barangay dashboard counts |
| Cache/Broker | None day one; Redis only if metrics require fanout/session/rate-limit coordination |
| Logs | CloudWatch first; OpenSearch only if mandated or needed |
| Secrets | AWS Secrets Manager or SSM Parameter Store |
| Keys | AWS KMS |
| DR | RPO <= 5 minutes, RTO <= 30 minutes |

## Network Layout

Use one VPC split across at least two Availability Zones.

Public subnets:

- AWS ALB only.
- NAT gateway only if private instances need outbound internet access for updates/pulls.

Private app subnets:

- EC2 instances in Auto Scaling Group.
- Instances accept inbound traffic only from ALB security group.
- No SSH from the public internet. Use SSM Session Manager.

Private data subnets:

- RDS PostgreSQL.
- RDS accepts traffic only from app security group.
- No public database endpoint.

Cloudflare:

- Terminates public edge traffic.
- Enforces WAF and DDoS protections.
- Forwards only to ALB.
- Use Cloudflare IP allowlisting on ALB if operationally practical.

## Compute Runtime

Start with EC2 Auto Scaling Group because it is simpler to explain and inspect than Kubernetes.

Pilot:

- 2 x `t3.small` or `t3.medium` EC2 instances across AZs.
- Docker Compose runs the Go API container.
- ALB health checks remove bad instances.

City/province:

- 2-4 x `t3.medium` or `t3.large`.
- Scale on CPU, memory, ALB request count, and SSE connection pressure.

National surge:

- 4-12 x Graviton `c7g`/`m7g` large-class instances after load testing.
- Add RDS read replica only if database reads are the bottleneck.
- Add Redis only if SSE fanout across instances becomes the bottleneck.

No-downtime scale-out requirements:

- ALB keeps routing traffic to healthy existing instances while new EC2 instances boot.
- New instances receive traffic only after ALB health checks pass.
- The Go API must be stateless; sessions, idempotency keys, check-ins, and audit events live in shared storage, not local instance memory.
- Docker Compose services must start automatically from launch template/user data.
- ASG scale-out is not instant; assume 1-5+ minutes before new instances become healthy.
- For predictable national disaster risk, pre-scale before traffic arrives instead of waiting for alarms.

Warm capacity model:

- Normal operations: 2 instances.
- Disaster watch: pre-scale to 4-6 instances.
- Active national event: allow 8-12+ instances based on load-test results.

No Kubernetes in the first production deployment. Move to ECS/EKS only when EC2 operations become harder than the platform overhead.

## Database Plan

Use RDS PostgreSQL Multi-AZ.

Baseline config:

- Private subnet group.
- Encryption at rest enabled.
- Automated backups and point-in-time recovery.
- Deletion protection enabled for production.
- Performance Insights enabled if budget allows.
- Maintenance window outside expected government operating peak.

Schema must support:

- `citizens`
- `staff_accounts`
- `assessments`
- `assessment_questions`
- `check_ins`
- `idempotency_keys`
- `audit_events`

Important constraints:

- Dedupe check-ins by `(assessment_id, citizen_uniqid_hash)`.
- Require idempotency key on check-in submission.
- Scope tenant reads/writes by `barangay_code`.
- Keep `barangay_code`, `assessment_id`, status, and timestamps indexable.
- Encrypt PII columns at the app layer.

## Security Plan

Citizen auth:

- Citizens authenticate through eGovPH SSO.
- eGovPH partner secret is used only by the backend.
- Frontend never receives partner secrets or database credentials.

Staff auth:

- HANDA-managed barangay staff accounts.
- Semantic emails such as `captain.<barangay_code>@egov.ph`.
- MFA required.
- Staff accounts are separate from citizen identities to avoid mutating 32M eGovPH records during official turnover.

Tenant isolation:

- Backend enforces `barangay_code` on every barangay-scoped query and mutation.
- Frontend role checks are cosmetic only.
- Add automated tests proving one barangay cannot access another barangay's data.

Encryption:

- TLS in transit.
- RDS encryption at rest.
- App-level PII encryption with KMS-managed keys.
- `citizen_uniqid` stored hashed for lookup and encrypted only if original recovery is required.

Network controls:

- Cloudflare -> ALB only.
- ALB -> EC2 only.
- EC2 -> RDS only.
- Use mTLS or IP allowlisting for eGovPH-to-HANDA backend calls when eGovPH supports it.

## Realtime Plan

Use SSE, not websocket, for dashboard counts.

Reason:

- Dashboard counts are server-to-client updates.
- No bidirectional socket protocol is needed.
- SSE is easier to run behind Cloudflare and ALB.
- Client can retry with backoff.

Endpoint shape:

```text
GET /v1/assessments/:assessment_id/events
```

Rules:

- Only active disaster dashboards connect.
- No polling fallback in first production design.
- Start with in-process fanout.
- Add Redis later only if multiple app instances need coordinated fanout.

## Observability

Start with CloudWatch, structured logs, and alarms.

Log every request with:

- request ID
- correlation ID
- route
- status
- latency
- instance/container ID
- barangay code where safe
- actor type
- audit event ID where applicable

Metrics:

- ALB 5xx/4xx
- target response time
- target unhealthy count
- EC2 CPU/memory/disk
- RDS CPU/connections/storage/replica lag if any
- check-in write latency
- SSE active connections
- failed auth attempts
- idempotency conflicts

Alerts:

- ALB 5xx spike
- no healthy targets
- RDS high CPU/connections/storage
- check-in write failures
- audit insert failures
- backup failures

OpenSearch is not day one. Add it only if CloudWatch cannot satisfy DICT log search/retention needs.

## CI/CD And Releases

Pipeline stages:

1. Lint and test frontend/backend.
2. Build Docker image.
3. Run migration checks.
4. Terraform plan review.
5. Deploy to staging.
6. Smoke test staging.
7. Deploy to production with rolling ASG replacement.
8. Smoke test production.

Rollback:

- Keep previous image tag.
- Roll ASG back to previous launch template/user data/image tag.
- Migrations must be backward-compatible so rollback does not require emergency DB surgery.

Secrets:

- Store production secrets in AWS Secrets Manager or SSM.
- CI/CD injects secrets at deploy/runtime only.
- No frontend `VITE_*` secret for eGovPH partner credentials.

## Backup And Disaster Recovery

Target:

- RPO <= 5 minutes.
- RTO <= 30 minutes.

Mechanism:

- RDS Multi-AZ for AZ failure.
- Automated backups with point-in-time recovery.
- Regular snapshots before risky migrations.
- Restore drill in staging before production signoff.

Runbook must cover:

- RDS restore.
- EC2 instance replacement.
- Rollback to previous app version.
- Cloudflare/ALB fail-open/fail-closed behavior.
- How to operate if eGovPH SSO is degraded.

## Load Testing Gates

Test before production:

- Normal traffic: 30-50 req/s.
- Disaster surge: 300-500 req/s.
- SSE connections for active-disaster barangays only.
- Idempotent retry storms from mobile clients.
- RDS write contention on check-ins.

Scale in this order:

1. Fix indexes and query shape.
2. Increase app instance count.
3. Increase DB instance class.
4. Add read replica for read-heavy dashboard/reporting paths.
5. Add Redis for SSE fanout/session/rate-limit coordination.
6. Consider ECS/EKS only after EC2 operations become the bottleneck.

## Cost Tiers

These are technical Q&A estimates, not procurement-final numbers.

| Tier | App | DB | Monthly estimate |
| --- | --- | --- | --- |
| Pilot | 2 x `t3.small/t3.medium` | RDS `db.t4g.medium` Multi-AZ | PHP 20k-60k |
| City/province | 2-4 x `t3.medium/t3.large` | RDS `db.t4g.large/r6g.large` Multi-AZ | PHP 80k-250k |
| National surge | 4-12 x `c7g/m7g` large-class | RDS `r6g.xlarge+`, read replica if needed | PHP 300k-1M+ during surge |

Cost can rise with NAT gateways, Cloudflare plan, log retention, backup storage, OpenSearch, data transfer, and stricter compliance tooling.

## First Build Checklist

- Create Terraform project structure.
- Build VPC, subnets, route tables, security groups.
- Build ALB and target group.
- Build EC2 launch template and ASG.
- Build RDS PostgreSQL Multi-AZ.
- Build KMS keys and Secrets Manager/SSM entries.
- Add `docker-compose.prod.yml` for Go API.
- Add CI/CD pipeline with staging first.
- Add CloudWatch logs, metrics, and alarms.
- Add restore drill runbook.
- Run load tests before production go-live.

## Explicitly Deferred

- Redis.
- Kubernetes/EKS.
- ECS migration.
- OpenSearch.
- Cross-region active-active.
- National rollup dashboard.
- Queue broker.
- Complex service mesh.

Deferred does not mean rejected forever. It means the first production architecture should earn each extra service with measurements.
