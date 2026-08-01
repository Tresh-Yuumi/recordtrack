import { clearSessionCookie, createSessionCookie, isAdminRequest, verifyPassword } from './_lib/auth.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'GET') {
    return res.status(200).json({ isAdmin: isAdminRequest(req) })
  }

  if (req.method === 'POST') {
    try {
      if (!verifyPassword(req.body?.password || '')) {
        return res.status(401).json({ error: '密码错误' })
      }
      res.setHeader('Set-Cookie', createSessionCookie())
      return res.status(200).json({ isAdmin: true })
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', clearSessionCookie())
    return res.status(200).json({ isAdmin: false })
  }

  res.setHeader('Allow', 'GET, POST, DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
