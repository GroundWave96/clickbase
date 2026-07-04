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
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(char) {
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

export default app