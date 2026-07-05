import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/*', cors({
  origin: ['http://localhost:4200', 'https://click-base.pages.dev']
}))

app.get('/', (c) => {
  return c.text('API do ClickBase rodando!')
})

app.post('/api/auth/google', async (c) => {
  try {
    const body = await c.req.json()
    const token = body.token

    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (char) {
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
      crypto.randomUUID(),
      payload.email,
      payload.name,
      payload.picture,
      payload.sub
    ).run()

    return c.json({
      success: true,
      message: 'Usuário autenticado com sucesso no ClickBase!',
      user: { name: payload.name, email: payload.email, picture: payload.picture }
    })

  } catch (error) {
    console.error("Erro no login:", error)
    return c.json({ success: false, error: 'Falha ao processar o login' }, 500)
  }
})

app.get('/api/user/:email', async (c) => {
  const email = c.req.param('email')

  const user = await c.env.DB.prepare(
    "SELECT * FROM users WHERE email = ?"
  ).bind(email).first()

  if (!user) {
    return c.json({ error: 'Usuário não encontrado' }, 404)
  }

  return c.json({ user })
})

app.post('/api/pages', async (c) => {
  try {
    const body = await c.req.json();
    const { user_email, title, slug } = body;

    const { results: userPages } = await c.env.DB.prepare(
      "SELECT count(*) as total FROM pages WHERE user_email = ?"
    ).bind(user_email).all();

    const totalPages = (userPages[0] as any).total;

    if (totalPages >= 10) {
      return c.json({ success: false, error: 'Limite de 10 páginas atingido.' }, 400);
    }

    const existingPage = await c.env.DB.prepare(
      "SELECT uuid FROM pages WHERE slug = ?"
    ).bind(slug).first();

    if (existingPage) {
      return c.json({ success: false, error: 'Esta URL já está em uso. Escolha outra.' }, 400);
    }

    const uuid = crypto.randomUUID();

    await c.env.DB.prepare(`
      INSERT INTO pages (uuid, user_email, slug, title)
      VALUES (?, ?, ?, ?)
    `).bind(uuid, user_email, slug, title).run();

    return c.json({ success: true, page: { uuid, slug, title } });
  } catch (error) {
    console.error("Erro ao criar página:", error);
    return c.json({ success: false, error: 'Falha interna ao criar a página' }, 500);
  }
});

app.get('/api/pages/:email', async (c) => {
  const email = c.req.param('email');

  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM pages 
      WHERE user_email = ? 
      ORDER BY created_at DESC
    `).bind(email).all();

    return c.json({ success: true, pages: results });
  } catch (error) {
    console.error("Erro ao buscar páginas:", error);
    return c.json({ success: false, error: 'Falha ao buscar as páginas' }, 500);
  }
});

app.get('/api/pages/check-slug/:slug', async (c) => {
  const slug = c.req.param('slug');
  
  try {
    const existingPage = await c.env.DB.prepare(
      "SELECT uuid FROM pages WHERE slug = ?"
    ).bind(slug).first();

    return c.json({ available: !existingPage });
  } catch (error) {
    return c.json({ available: false, error: 'Erro ao verificar' }, 500);
  }
});

export default app