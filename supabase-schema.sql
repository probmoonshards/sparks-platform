-- ============================================================
-- SPARKS Platform — Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS student_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author_name TEXT,
  grade TEXT,
  subject TEXT,
  school_year TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS note_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_key TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ⚠️  If you already ran this schema before, run this line to add the new column:
-- ALTER TABLE capstones ADD COLUMN IF NOT EXISTS school_year TEXT;

CREATE TABLE IF NOT EXISTS capstones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author_name TEXT,
  project_type TEXT,
  school_year TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS capstone_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capstone_id UUID REFERENCES capstones(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_key TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE student_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE capstones ENABLE ROW LEVEL SECURITY;
ALTER TABLE capstone_files ENABLE ROW LEVEL SECURITY;

-- Public policies
CREATE POLICY "public_select_notes"    ON notes    FOR SELECT USING (true);
CREATE POLICY "public_insert_notes"    ON notes    FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_notes"    ON notes    FOR UPDATE USING (true);
CREATE POLICY "public_delete_notes"    ON notes    FOR DELETE USING (true);

CREATE POLICY "public_select_nf"       ON note_files    FOR SELECT USING (true);
CREATE POLICY "public_insert_nf"       ON note_files    FOR INSERT WITH CHECK (true);

CREATE POLICY "public_select_caps"     ON capstones FOR SELECT USING (true);
CREATE POLICY "public_insert_caps"     ON capstones FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_caps"     ON capstones FOR UPDATE USING (true);
CREATE POLICY "public_delete_caps"     ON capstones FOR DELETE USING (true);

CREATE POLICY "public_select_cf"       ON capstone_files FOR SELECT USING (true);
CREATE POLICY "public_insert_cf"       ON capstone_files FOR INSERT WITH CHECK (true);

CREATE POLICY "public_select_sessions" ON student_sessions FOR SELECT USING (true);
CREATE POLICY "public_insert_sessions" ON student_sessions FOR INSERT WITH CHECK (true);

-- Storage bucket (run AFTER creating sparks-files bucket manually)
CREATE POLICY "public_read_storage"   ON storage.objects FOR SELECT USING (bucket_id = 'sparks-files');
CREATE POLICY "public_upload_storage" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'sparks-files');
CREATE POLICY "public_delete_storage" ON storage.objects FOR DELETE USING (bucket_id = 'sparks-files');
