-- ============================================================================
-- Genesis Air Systems — Field Service Management Platform
-- Initial Schema Migration
-- ============================================================================
-- Run this in your Supabase SQL Editor after creating the project.
-- Tables: profiles, customers, technicians, jobs, estimates, invoices, etc.
-- Includes RLS policies for: admins, techs, and customers (portal users)
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- PROFILES (extends auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'dispatcher', 'tech', 'customer')),
  customer_id UUID,
  technician_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ----------------------------------------------------------------------------
-- CUSTOMERS (residential + commercial)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_type TEXT NOT NULL CHECK (customer_type IN ('residential', 'commercial')),
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active);

-- ----------------------------------------------------------------------------
-- TECHNICIANS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS technicians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  license_number TEXT,
  hire_date DATE,
  hourly_rate NUMERIC(10, 2),
  current_status TEXT DEFAULT 'available' CHECK (current_status IN ('available', 'on_job', 'en_route', 'on_break', 'off_duty')),
  current_job_id UUID,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_techs_active ON technicians(is_active);
CREATE INDEX IF NOT EXISTS idx_techs_status ON technicians(current_status);

-- ----------------------------------------------------------------------------
-- JOBS (the core service work table)
-- ----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS job_number_seq START 1000;

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_number TEXT UNIQUE NOT NULL DEFAULT ('GAS-' || nextval('job_number_seq')::TEXT),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  customer_type TEXT,
  service_type TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'unassigned' CHECK (status IN ('unassigned', 'scheduled', 'en_route', 'in_progress', 'completed', 'cancelled')),
  assigned_tech_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
  assigned_tech_name TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  estimated_duration_minutes INTEGER DEFAULT 60,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  internal_notes TEXT,
  customer_signature TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_customer ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_tech ON jobs(assigned_tech_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled ON jobs(scheduled_at);

-- ----------------------------------------------------------------------------
-- ESTIMATES
-- ----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS estimate_number_seq START 1000;

CREATE TABLE IF NOT EXISTS estimates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimate_number TEXT UNIQUE NOT NULL DEFAULT ('EST-' || nextval('estimate_number_seq')::TEXT),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'declined', 'expired')),
  subtotal NUMERIC(12, 2) DEFAULT 0,
  tax_rate NUMERIC(5, 4) DEFAULT 0,
  tax_amount NUMERIC(12, 2) DEFAULT 0,
  total_amount NUMERIC(12, 2) DEFAULT 0,
  notes TEXT,
  terms TEXT,
  valid_until DATE,
  sent_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS estimate_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10, 2) DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL,
  line_total NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estimates_customer ON estimates(customer_id);
CREATE INDEX IF NOT EXISTS idx_estimate_lines_estimate ON estimate_line_items(estimate_id);

-- ----------------------------------------------------------------------------
-- INVOICES
-- ----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1000;

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE NOT NULL DEFAULT ('INV-' || nextval('invoice_number_seq')::TEXT),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'pending', 'paid', 'overdue', 'cancelled')),
  subtotal NUMERIC(12, 2) DEFAULT 0,
  tax_rate NUMERIC(5, 4) DEFAULT 0,
  tax_amount NUMERIC(12, 2) DEFAULT 0,
  total_amount NUMERIC(12, 2) DEFAULT 0,
  amount_paid NUMERIC(12, 2) DEFAULT 0,
  notes TEXT,
  payment_terms TEXT DEFAULT 'Net 30',
  issued_at TIMESTAMPTZ,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10, 2) DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL,
  line_total NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_line_items(invoice_id);

-- ----------------------------------------------------------------------------
-- Updated_at trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['profiles', 'customers', 'technicians', 'jobs', 'estimates', 'invoices'])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_updated_at_%I ON %I;
      CREATE TRIGGER set_updated_at_%I
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    ', t, t, t, t);
  END LOOP;
END $$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

-- Helper function to check role
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'dispatcher', 'tech')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'dispatcher')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_customer_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT customer_id FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES policies
DROP POLICY IF EXISTS profiles_select_own ON profiles;
CREATE POLICY profiles_select_own ON profiles FOR SELECT
  USING (id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_update_own ON profiles FOR UPDATE
  USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

-- CUSTOMERS policies (admin/staff full, customers see their own)
DROP POLICY IF EXISTS customers_staff_all ON customers;
CREATE POLICY customers_staff_all ON customers FOR ALL
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS customers_select_own ON customers;
CREATE POLICY customers_select_own ON customers FOR SELECT
  USING (id = current_customer_id());

-- TECHNICIANS policies (staff read all, admin write)
DROP POLICY IF EXISTS techs_staff_select ON technicians;
CREATE POLICY techs_staff_select ON technicians FOR SELECT
  USING (is_staff());

DROP POLICY IF EXISTS techs_admin_write ON technicians;
CREATE POLICY techs_admin_write ON technicians FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- JOBS policies (staff full, customers see their own jobs only)
DROP POLICY IF EXISTS jobs_staff_all ON jobs;
CREATE POLICY jobs_staff_all ON jobs FOR ALL
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS jobs_customer_select ON jobs;
CREATE POLICY jobs_customer_select ON jobs FOR SELECT
  USING (customer_id = current_customer_id());

-- ESTIMATES policies
DROP POLICY IF EXISTS estimates_staff_all ON estimates;
CREATE POLICY estimates_staff_all ON estimates FOR ALL
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS estimates_customer_select ON estimates;
CREATE POLICY estimates_customer_select ON estimates FOR SELECT
  USING (customer_id = current_customer_id() AND status IN ('sent', 'approved', 'declined'));

DROP POLICY IF EXISTS estimate_lines_select ON estimate_line_items;
CREATE POLICY estimate_lines_select ON estimate_line_items FOR SELECT
  USING (
    is_staff() OR
    EXISTS (SELECT 1 FROM estimates WHERE estimates.id = estimate_line_items.estimate_id AND estimates.customer_id = current_customer_id() AND estimates.status IN ('sent', 'approved', 'declined'))
  );

DROP POLICY IF EXISTS estimate_lines_staff_write ON estimate_line_items;
CREATE POLICY estimate_lines_staff_write ON estimate_line_items FOR ALL
  USING (is_staff()) WITH CHECK (is_staff());

-- INVOICES policies
DROP POLICY IF EXISTS invoices_staff_all ON invoices;
CREATE POLICY invoices_staff_all ON invoices FOR ALL
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS invoices_customer_select ON invoices;
CREATE POLICY invoices_customer_select ON invoices FOR SELECT
  USING (customer_id = current_customer_id() AND status IN ('sent', 'pending', 'paid', 'overdue'));

DROP POLICY IF EXISTS invoice_lines_select ON invoice_line_items;
CREATE POLICY invoice_lines_select ON invoice_line_items FOR SELECT
  USING (
    is_staff() OR
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_line_items.invoice_id AND invoices.customer_id = current_customer_id() AND invoices.status IN ('sent', 'pending', 'paid', 'overdue'))
  );

DROP POLICY IF EXISTS invoice_lines_staff_write ON invoice_line_items;
CREATE POLICY invoice_lines_staff_write ON invoice_line_items FOR ALL
  USING (is_staff()) WITH CHECK (is_staff());

-- ============================================================================
-- INITIAL ADMIN BOOTSTRAP
-- ============================================================================
-- After first signup, run this in SQL Editor to make yourself an admin:
--   UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
-- ============================================================================
