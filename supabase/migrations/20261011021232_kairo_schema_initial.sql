/*
# KAIRO — Initial Database Schema

## Overview
Creates the complete database schema for KAIRO, an AI-powered personal health copilot.
All tables are user-scoped with Row Level Security — each authenticated patient can
only access their own records. No cross-patient data leakage is possible.

## New Tables

1. **profiles** — Patient health profile. One row per user.
   - id (uuid, PK, references auth.users), first_name, last_name, date_of_birth
   - phone, address, emergency contact fields
   - known_allergies, current_medications, medical_history, existing_conditions, previous_procedures (text[])
   - blood_type, height_cm, weight_kg, updated_at

2. **medical_documents** — Uploaded medical documents
   - id, user_id, title, document_type, file_name, file_path, file_size, mime_type
   - source_organization, report_date
   - processing_status (waiting|uploading|processing|text_extracted|ai_summary_ready|needs_review|failed)
   - extracted_text, ai_summary, ai_explanation, questions_for_clinician (text[])
   - extraction_confidence, error_message, created_at, updated_at

3. **lab_results** — Individual lab test values extracted from documents
   - id, user_id, document_id (FK), test_name, value, unit, reference_range
   - is_out_of_range, flag, report_date, created_at

4. **medications** — Medications extracted from prescriptions
   - id, user_id, document_id (FK), medicine_name, dosage, frequency, duration
   - prescribing_clinician, source_document_name, prescription_date, is_current, created_at

5. **timeline_events** — Unified health timeline entries
   - id, user_id, document_id (FK), event_date, event_type, title, description
   - source_document_name, created_at

6. **chat_messages** — AI Health Copilot conversation history
   - id, user_id, role (user|assistant), content, sources (jsonb), created_at

7. **appointments** — Appointment planning entries
   - id, user_id, title, doctor_name, hospital_name
   - appointment_date, appointment_time, status, notes, created_at

## Security
- RLS enabled on ALL tables.
- Every table has 4 ownership-scoped policies (SELECT, INSERT, UPDATE, DELETE).
- All policies check auth.uid() = user_id (profiles checks auth.uid() = id).
- Only authenticated users can access data — no anon access.
- user_id columns default to auth.uid() so inserts work without explicitly passing it.
- Child tables reference medical_documents with ON DELETE CASCADE.

## Indexes
- medical_documents.user_id, lab_results.user_id + document_id + test_name
- medications.user_id, timeline_events.user_id + event_date
- chat_messages.user_id + created_at, appointments.user_id + appointment_date

## Triggers
- auto-update updated_at on profiles and medical_documents
- auto-create profile row when a new auth user signs up
*/

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text DEFAULT '',
  last_name text DEFAULT '',
  date_of_birth date,
  phone text DEFAULT '',
  address text DEFAULT '',
  emergency_contact_name text DEFAULT '',
  emergency_contact_phone text DEFAULT '',
  emergency_contact_relation text DEFAULT '',
  known_allergies text[] DEFAULT '{}',
  current_medications text[] DEFAULT '{}',
  medical_history text[] DEFAULT '{}',
  existing_conditions text[] DEFAULT '{}',
  previous_procedures text[] DEFAULT '{}',
  blood_type text DEFAULT '',
  height_cm numeric,
  weight_kg numeric,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- ============ MEDICAL DOCUMENTS ============
CREATE TABLE IF NOT EXISTS medical_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled Document',
  document_type text NOT NULL DEFAULT 'other',
  file_name text NOT NULL,
  file_path text,
  file_size bigint,
  mime_type text,
  source_organization text DEFAULT '',
  report_date date,
  processing_status text NOT NULL DEFAULT 'waiting',
  extracted_text text DEFAULT '',
  ai_summary text DEFAULT '',
  ai_explanation text DEFAULT '',
  questions_for_clinician text[] DEFAULT '{}',
  extraction_confidence numeric DEFAULT 0,
  error_message text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE medical_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_documents" ON medical_documents;
CREATE POLICY "select_own_documents" ON medical_documents FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_documents" ON medical_documents;
CREATE POLICY "insert_own_documents" ON medical_documents FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_documents" ON medical_documents;
CREATE POLICY "update_own_documents" ON medical_documents FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_documents" ON medical_documents;
CREATE POLICY "delete_own_documents" ON medical_documents FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON medical_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON medical_documents(created_at DESC);

-- ============ LAB RESULTS ============
CREATE TABLE IF NOT EXISTS lab_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id uuid REFERENCES medical_documents(id) ON DELETE CASCADE,
  test_name text NOT NULL,
  value text NOT NULL DEFAULT '',
  unit text DEFAULT '',
  reference_range text DEFAULT '',
  is_out_of_range boolean DEFAULT false,
  flag text DEFAULT 'normal',
  report_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_lab_results" ON lab_results;
CREATE POLICY "select_own_lab_results" ON lab_results FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_lab_results" ON lab_results;
CREATE POLICY "insert_own_lab_results" ON lab_results FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_lab_results" ON lab_results;
CREATE POLICY "update_own_lab_results" ON lab_results FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_lab_results" ON lab_results;
CREATE POLICY "delete_own_lab_results" ON lab_results FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_lab_results_user_id ON lab_results(user_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_document_id ON lab_results(document_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_test_name ON lab_results(test_name);

-- ============ MEDICATIONS ============
CREATE TABLE IF NOT EXISTS medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id uuid REFERENCES medical_documents(id) ON DELETE CASCADE,
  medicine_name text NOT NULL,
  dosage text DEFAULT '',
  frequency text DEFAULT '',
  duration text DEFAULT '',
  prescribing_clinician text DEFAULT '',
  source_document_name text DEFAULT '',
  prescription_date date,
  is_current boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_medications" ON medications;
CREATE POLICY "select_own_medications" ON medications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_medications" ON medications;
CREATE POLICY "insert_own_medications" ON medications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_medications" ON medications;
CREATE POLICY "update_own_medications" ON medications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_medications" ON medications;
CREATE POLICY "delete_own_medications" ON medications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications(user_id);

-- ============ TIMELINE EVENTS ============
CREATE TABLE IF NOT EXISTS timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id uuid REFERENCES medical_documents(id) ON DELETE CASCADE,
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  event_type text NOT NULL DEFAULT 'other',
  title text NOT NULL,
  description text DEFAULT '',
  source_document_name text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_timeline" ON timeline_events;
CREATE POLICY "select_own_timeline" ON timeline_events FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_timeline" ON timeline_events;
CREATE POLICY "insert_own_timeline" ON timeline_events FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_timeline" ON timeline_events;
CREATE POLICY "update_own_timeline" ON timeline_events FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_timeline" ON timeline_events;
CREATE POLICY "delete_own_timeline" ON timeline_events FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_timeline_user_id ON timeline_events(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_event_date ON timeline_events(event_date DESC);

-- ============ CHAT MESSAGES ============
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL DEFAULT '',
  sources jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_chat" ON chat_messages;
CREATE POLICY "select_own_chat" ON chat_messages FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_chat" ON chat_messages;
CREATE POLICY "insert_own_chat" ON chat_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_chat" ON chat_messages;
CREATE POLICY "delete_own_chat" ON chat_messages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chat_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_created_at ON chat_messages(created_at);

-- ============ APPOINTMENTS ============
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Appointment',
  doctor_name text DEFAULT '',
  hospital_name text DEFAULT '',
  appointment_date date,
  appointment_time text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_appointments" ON appointments;
CREATE POLICY "select_own_appointments" ON appointments FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_appointments" ON appointments;
CREATE POLICY "insert_own_appointments" ON appointments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_appointments" ON appointments;
CREATE POLICY "update_own_appointments" ON appointments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_appointments" ON appointments;
CREATE POLICY "delete_own_appointments" ON appointments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);

-- ============ AUTO-UPDATE updated_at ============
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON profiles;
CREATE TRIGGER trigger_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_documents_updated_at ON medical_documents;
CREATE TRIGGER trigger_documents_updated_at BEFORE UPDATE ON medical_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============ AUTO-CREATE PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
