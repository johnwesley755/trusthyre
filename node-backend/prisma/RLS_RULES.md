# Mandatory Database Security & Row-Level Security (RLS) Protocol

> **CRITICAL DIRECTIVE FOR ALL AI AGENTS & DEVELOPERS**  
> Every PostgreSQL table in this project (both local and Neon DB in production) is strictly protected by **Row-Level Security (RLS)**.  
> Unprotected tables are a catastrophic security vulnerability (BOLA/IDOR) and are strictly forbidden.

---

## 1. The Core Rule

Whenever you:
1. Add a new `model` to [`node-backend/prisma/schema.prisma`](file:///c:/Users/johnw/OneDrive/Desktop/GIT/trust-hire-v2/node-backend/prisma/schema.prisma), OR
2. Generate or run a SQL migration that creates a table (`CREATE TABLE ...`),

**YOU MUST IMMEDIATELY:**
1. Enable RLS and Force RLS on the table:
   ```sql
   ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.<table_name> FORCE ROW LEVEL SECURITY;
   ```
2. Define explicit, role-aware policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
3. Update [`node-backend/prisma/migrations/20261111_neon_rls_security_hardening.sql`](file:///c:/Users/johnw/OneDrive/Desktop/GIT/trust-hire-v2/node-backend/prisma/migrations/20261111_neon_rls_security_hardening.sql) with the new policies so production Neon DB always stays synchronized.

---

## 2. Standard Policy Patterns

Use the built-in foundation functions in all policies:

```sql
-- Helper functions already defined in database:
-- public.current_app_user_id() -> returns current user UUID as text
-- public.current_app_user_role() -> returns 'WORKER', 'EMPLOYER', 'ADMIN', 'SUPER_ADMIN', or 'ANONYMOUS'
-- public.is_app_admin() -> returns true if caller is ADMIN, SUPER_ADMIN, or bypass is set
```

### Pattern A: User/Tenant Owned Data (e.g., alerts, settings, private records)
```sql
ALTER TABLE public.example_user_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.example_user_table FORCE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "example_select" ON public.example_user_table
FOR SELECT USING (
  is_app_admin() 
  OR user_id = (SELECT current_app_user_id())
);

-- INSERT
CREATE POLICY "example_insert" ON public.example_user_table
FOR INSERT WITH CHECK (
  is_app_admin() 
  OR user_id = (SELECT current_app_user_id())
);

-- UPDATE
CREATE POLICY "example_update" ON public.example_user_table
FOR UPDATE USING (
  is_app_admin() 
  OR user_id = (SELECT current_app_user_id())
) WITH CHECK (
  is_app_admin() 
  OR user_id = (SELECT current_app_user_id())
);

-- DELETE
CREATE POLICY "example_delete" ON public.example_user_table
FOR DELETE USING (
  is_app_admin() 
  OR user_id = (SELECT current_app_user_id())
);
```

### Pattern B: Public Read, Owner / Admin Write (e.g., job posts, public catalogs)
```sql
ALTER TABLE public.example_public_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.example_public_catalog FORCE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "example_public_read" ON public.example_public_catalog
FOR SELECT USING (is_active = true OR is_app_admin());

-- Admin write
CREATE POLICY "example_admin_write" ON public.example_public_catalog
FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());
```

---

## 3. Strict Rules & Anti-Patterns

1. **NEVER use bare `current_app_user_id()`**: Always wrap in a scalar subquery: `(SELECT current_app_user_id())`. This ensures PostgreSQL caches the value per query rather than recalculating it per row (10x-100x performance difference).
2. **NEVER skip `FORCE ROW LEVEL SECURITY`**: Neon DB connects as `neondb_owner` by default. Table owners bypass RLS unless `FORCE ROW LEVEL SECURITY` is applied.
3. **NEVER use global session variables across connection pools**: In application code, use transaction-scoped `set_config('app.current_user_id', $1, true)` (with the 3rd argument `true`) so pooled connections never leak user context across requests.
4. **ALWAYS keep migration file updated**: [`node-backend/prisma/migrations/20261111_neon_rls_security_hardening.sql`](file:///c:/Users/johnw/OneDrive/Desktop/GIT/trust-hire-v2/node-backend/prisma/migrations/20261111_neon_rls_security_hardening.sql) must reflect every table in the database.

