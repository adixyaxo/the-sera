-- Add GTD fields to cards table
ALTER TABLE cards 
  ADD COLUMN IF NOT EXISTS project_id uuid,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS deadline timestamp with time zone,
  ADD COLUMN IF NOT EXISTS gtd_status text DEFAULT 'LATER';

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text DEFAULT 'ACTIVE',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create tags table (life areas)
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#7E9EF9',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Create card_tags junction table
CREATE TABLE IF NOT EXISTS card_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id text REFERENCES cards(card_id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(card_id, tag_id)
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_tags ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- Tags policies
CREATE POLICY "Users can view their own tags"
  ON tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tags"
  ON tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags"
  ON tags FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags"
  ON tags FOR DELETE
  USING (auth.uid() = user_id);

-- Card tags policies
CREATE POLICY "Users can view their own card tags"
  ON card_tags FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM cards WHERE cards.card_id = card_tags.card_id AND cards.user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own card tags"
  ON card_tags FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM cards WHERE cards.card_id = card_tags.card_id AND cards.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own card tags"
  ON card_tags FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM cards WHERE cards.card_id = card_tags.card_id AND cards.user_id = auth.uid()
  ));

-- Insert default life area tags for existing users
INSERT INTO tags (user_id, name, color)
SELECT DISTINCT user_id, tag, color FROM (
  VALUES 
    ('Health', '#10b981'),
    ('Academics', '#3b82f6'),
    ('Finance', '#f59e0b'),
    ('Career', '#8b5cf6'),
    ('Skills', '#ec4899'),
    ('Personal Growth', '#06b6d4'),
    ('Relationships', '#f43f5e'),
    ('Home', '#84cc16'),
    ('Mental Health', '#6366f1')
) AS default_tags(tag, color)
CROSS JOIN (SELECT DISTINCT user_id FROM cards WHERE user_id IS NOT NULL) AS users
ON CONFLICT (user_id, name) DO NOTHING;

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for projects
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();