-- Remove a tabela antiga de testes para evitar conflitos
DROP TABLE IF EXISTS links;

-- 1. Tabela de Páginas (O usuário pode ter várias, limitaremos a 10 no back-end)
CREATE TABLE IF NOT EXISTS pages (
  uuid TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- A URL única. Ex: "gabriel", "apexdev"
  title TEXT NOT NULL,
  theme_color TEXT DEFAULT '#0f172a',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
);

-- 2. Tabela de Pastas (Para organizar os links dentro de uma página)
CREATE TABLE IF NOT EXISTS folders (
  uuid TEXT PRIMARY KEY,
  page_uuid TEXT NOT NULL,
  title TEXT NOT NULL,
  order_index INTEGER DEFAULT 0, -- Para controlar a ordem das pastas na tela
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (page_uuid) REFERENCES pages(uuid) ON DELETE CASCADE
);

-- 3. Tabela de Links (O coração do sistema)
CREATE TABLE IF NOT EXISTS links (
  uuid TEXT PRIMARY KEY,
  page_uuid TEXT NOT NULL,
  folder_uuid TEXT, -- Fica vazio (NULL) se o link for "solto" fora de uma pasta
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  order_index INTEGER DEFAULT 0, -- Para reordenar os links
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (page_uuid) REFERENCES pages(uuid) ON DELETE CASCADE,
  FOREIGN KEY (folder_uuid) REFERENCES folders(uuid) ON DELETE SET NULL
);