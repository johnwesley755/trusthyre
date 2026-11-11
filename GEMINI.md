# TrustHyre Project Instructions & Architecture Rules

## Critical Rule: Row-Level Security (RLS) Enforcement

Every database table in this project—both in local PostgreSQL and Neon DB in production—**must have Row-Level Security (RLS) strictly enforced**.

Whenever you add or modify a model in [`node-backend/prisma/schema.prisma`](file:///c:/Users/johnw/OneDrive/Desktop/GIT/trust-hire-v2/node-backend/prisma/schema.prisma) or create a new database table via SQL migration:
1. **You must immediately enable and force RLS**:
   ```sql
   ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.<table_name> FORCE ROW LEVEL SECURITY;
   ```
2. **You must define explicit, granular policies** for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
3. **You must update the master migration file**:
   [`node-backend/prisma/migrations/20261111_neon_rls_security_hardening.sql`](file:///c:/Users/johnw/OneDrive/Desktop/GIT/trust-hire-v2/node-backend/prisma/migrations/20261111_neon_rls_security_hardening.sql)
4. Follow the patterns in [`node-backend/prisma/RLS_RULES.md`](file:///c:/Users/johnw/OneDrive/Desktop/GIT/trust-hire-v2/node-backend/prisma/RLS_RULES.md):
   - Always wrap helper functions in scalar subqueries: `(SELECT current_app_user_id())`.
   - Never skip `FORCE ROW LEVEL SECURITY`.
   - Admin access must be gated by `is_app_admin()`.

---

## Theme & UI Rules
- When working on frontends, follow the guidelines in [`frontends/unified-pwa/THEME_RULES.md`](file:///c:/Users/johnw/OneDrive/Desktop/GIT/trust-hire-v2/frontends/unified-pwa/THEME_RULES.md).
- Candidate resume views must always maintain clean light paper styling (`#ffffff` sheet with `#111827` ink) even in dark mode.

