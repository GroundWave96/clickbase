import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/*', cors({
  origin: ['http://localhost:4200', 'https://click-base.pages.dev']
}))

// ==========================================
// HEALTH CHECK
// ==========================================
app.get('/', (c) => {
  return c.json({ success: true, data: { message: 'API do ClickBase rodando!' } })
})

// ==========================================
// AUTH & USUÁRIO
// ==========================================
app.post('/api/auth/google', async (c) => {
  try {
    const body = await c.req.json()
    const token = body.token
    
    if (!token) return c.json({ success: false, error: 'Token não fornecido' }, 400)

    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(char => {
      return '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2)
    }).join(''))
    
    const payload = JSON.parse(jsonPayload)

    await c.env.DB.prepare(`
      INSERT INTO users (id, email, name, picture, google_id)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET 
         name = excluded.name, 
         picture = excluded.picture
    `).bind(
      crypto.randomUUID(), payload.email, payload.name, payload.picture, payload.sub
    ).run()

    return c.json({
      success: true,
      data: {
        message: 'Usuário autenticado com sucesso no ClickBase!',
        user: { name: payload.name, email: payload.email, picture: payload.picture }
      }
    })
  } catch (error) {
    console.error("Erro no login:", error)
    return c.json({ success: false, error: 'Falha ao processar o login' }, 500)
  }
})

app.get('/api/user/:email', async (c) => {
  try {
    const email = c.req.param('email')
    const user = await c.env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first()
    
    if (!user) return c.json({ success: false, error: 'Usuário não encontrado' }, 404)
    
    return c.json({ success: true, data: { user } })
  } catch (error) {
    console.error("Erro ao buscar usuário:", error)
    return c.json({ success: false, error: 'Falha ao buscar o usuário' }, 500)
  }
})

// ==========================================
// PÁGINAS
// ==========================================
app.post('/api/pages', async (c) => {
  try {
    const { user_email, title, slug } = await c.req.json()

    const { results: userPages } = await c.env.DB.prepare(
      "SELECT count(*) as total FROM pages WHERE user_email = ?"
    ).bind(user_email).all()
    
    if ((userPages[0] as any).total >= 10) {
      return c.json({ success: false, error: 'Limite de 10 páginas atingido.' }, 400)
    }

    const existingPage = await c.env.DB.prepare("SELECT uuid FROM pages WHERE slug = ?").bind(slug).first()
    
    if (existingPage) {
      return c.json({ success: false, error: 'Esta URL já está em uso. Escolha outra.' }, 400)
    }

    const uuid = crypto.randomUUID()
    await c.env.DB.prepare(`
      INSERT INTO pages (uuid, user_email, slug, title)
      VALUES (?, ?, ?, ?)
    `).bind(uuid, user_email, slug, title).run()

    return c.json({ success: true, data: { page: { uuid, slug, title } } })
  } catch (error) {
    console.error("Erro ao criar página:", error)
    return c.json({ success: false, error: 'Falha interna ao criar a página' }, 500)
  }
})

app.get('/api/pages/:email', async (c) => {
  try {
    const email = c.req.param('email')
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM pages WHERE user_email = ? ORDER BY created_at DESC
    `).bind(email).all()
    
    return c.json({ success: true, data: { pages: results } })
  } catch (error) {
    console.error("Erro ao buscar páginas:", error)
    return c.json({ success: false, error: 'Falha ao buscar as páginas' }, 500)
  }
})

app.get('/api/pages/check-slug/:slug', async (c) => {
  try {
    const slug = c.req.param('slug')
    const existingPage = await c.env.DB.prepare("SELECT uuid FROM pages WHERE slug = ?").bind(slug).first()
    
    return c.json({ success: true, data: { available: !existingPage } })
  } catch (error) {
    return c.json({ success: false, error: 'Erro ao verificar URL' }, 500)
  }
})

app.delete('/api/pages/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare("DELETE FROM pages WHERE uuid = ?").bind(id).run()
    
    return c.json({ success: true, data: { message: 'Página deletada com sucesso' } })
  } catch (error) {
    console.error("Erro ao deletar página:", error)
    return c.json({ success: false, error: 'Falha ao deletar a página' }, 500)
  }
})

// ==========================================
// PASTAS
// ==========================================
app.post('/api/folders', async (c) => {
  try {
    const { page_uuid, title } = await c.req.json()
    const uuid = crypto.randomUUID()
    
    await c.env.DB.prepare(`
      INSERT INTO folders (uuid, page_uuid, title) VALUES (?, ?, ?)
    `).bind(uuid, page_uuid, title).run()

    return c.json({ success: true, data: { folder: { uuid, page_uuid, title } } })
  } catch (error) {
    console.error("Erro ao criar pasta:", error)
    return c.json({ success: false, error: 'Falha ao criar a pasta' }, 500)
  }
})

app.get('/api/folders/:pageId', async (c) => {
  try {
    const pageId = c.req.param('pageId')
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM folders WHERE page_uuid = ? ORDER BY created_at ASC
    `).bind(pageId).all()
    
    return c.json({ success: true, data: { folders: results } })
  } catch (error) {
    console.error("Erro ao buscar pastas:", error)
    return c.json({ success: false, error: 'Falha ao buscar as pastas' }, 500)
  }
})

app.delete('/api/folders/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare("DELETE FROM folders WHERE uuid = ?").bind(id).run()
    
    return c.json({ success: true, data: { message: 'Pasta deletada com sucesso' } })
  } catch (error) {
    console.error("Erro ao deletar pasta:", error)
    return c.json({ success: false, error: 'Falha ao deletar a pasta' }, 500)
  }
})

// ==========================================
// LINKS
// ==========================================
app.post('/api/links', async (c) => {
  try {
    const { page_uuid, folder_uuid, title, url } = await c.req.json()
    const uuid = crypto.randomUUID()
    const folderId = folder_uuid ? folder_uuid : null
    
    await c.env.DB.prepare(`
      INSERT INTO links (uuid, page_uuid, folder_uuid, title, url) VALUES (?, ?, ?, ?, ?)
    `).bind(uuid, page_uuid, folderId, title, url).run()

    return c.json({ success: true, data: { link: { uuid, page_uuid, folder_uuid: folderId, title, url } } })
  } catch (error) {
    console.error("Erro ao criar link:", error)
    return c.json({ success: false, error: 'Falha ao criar o link' }, 500)
  }
})

app.get('/api/links/:pageId', async (c) => {
  try {
    const pageId = c.req.param('pageId')
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM links WHERE page_uuid = ? ORDER BY order_index ASC, created_at ASC
    `).bind(pageId).all()
    
    return c.json({ success: true, data: { links: results } })
  } catch (error) {
    console.error("Erro ao buscar links:", error)
    return c.json({ success: false, error: 'Falha ao buscar os links' }, 500)
  }
})

app.delete('/api/links/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare("DELETE FROM links WHERE uuid = ?").bind(id).run()
    
    return c.json({ success: true, data: { message: 'Link deletado com sucesso' } })
  } catch (error) {
    console.error("Erro ao deletar link:", error)
    return c.json({ success: false, error: 'Falha ao deletar o link' }, 500)
  }
})

// ==========================================
// REORDENAÇÃO (UNIFICADA E OTIMIZADA)
// ==========================================
app.put('/api/reorder-all', async (c) => {
  try {
    const { items } = await c.req.json()
    
    // Aproveitando o Batch do D1 para rodar todas as atualizações juntas
    const statements = items.map((item: any) => {
      const table = item.type === 'folder' ? 'folders' : 'links'
      return c.env.DB.prepare(`UPDATE ${table} SET order_index = ? WHERE uuid = ?`).bind(item.order_index, item.uuid)
    })

    await c.env.DB.batch(statements)
    
    return c.json({ success: true, data: { message: 'Estrutura reordenada com sucesso' } })
  } catch (error) {
    console.error("Erro ao reordenar:", error)
    return c.json({ success: false, error: 'Falha ao reordenar itens' }, 500)
  }
})

// ==========================================
// PÁGINA PÚBLICA (VITRINE)
// ==========================================
app.get('/api/public/:slug', async (c) => {
  try {
    const slug = c.req.param('slug')
    const page = await c.env.DB.prepare("SELECT * FROM pages WHERE slug = ?").bind(slug).first()
    
    if (!page) return c.json({ success: false, error: 'Página não encontrada' }, 404)

    // Agrupando chamadas no D1 Batch para entregar a página pública instantaneamente
    const [foldersResult, linksResult] = await c.env.DB.batch([
      c.env.DB.prepare("SELECT * FROM folders WHERE page_uuid = ? ORDER BY order_index ASC").bind(page.uuid),
      c.env.DB.prepare("SELECT * FROM links WHERE page_uuid = ? ORDER BY order_index ASC").bind(page.uuid)
    ])

    return c.json({
      success: true,
      data: {
        page,
        folders: foldersResult.results,
        links: linksResult.results
      }
    })
  } catch (error) {
    console.error("Erro ao carregar página pública:", error)
    return c.json({ success: false, error: 'Erro interno no servidor' }, 500)
  }
})

// ==========================================
// TRACKING & ANALYTICS (NOVO)
// ==========================================
app.get('/api/go/:linkId', async (c) => {
  try {
    const linkId = c.req.param('linkId')
    
    const link = await c.env.DB.prepare("SELECT url, page_uuid FROM links WHERE uuid = ?").bind(linkId).first()
    
    if (!link) return c.json({ success: false, error: 'Link não encontrado' }, 404)

    // Header injetado nativamente pela infra da Cloudflare
    const country = c.req.header('cf-ipcountry') || 'UNKNOWN'
    
    // (A ser implementado no DB)
    // INSERT INTO clicks (link_uuid, page_uuid, country) VALUES (linkId, link.page_uuid, country)
    
    return c.redirect(link.url as string, 302)
  } catch (error) {
    console.error("Erro no redirecionamento:", error)
    return c.json({ success: false, error: 'Falha ao redirecionar' }, 500)
  }
})

export default app