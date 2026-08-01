import crypto from 'node:crypto'

const COOKIE_NAME = 'recordtrack_admin'
const SESSION_MAX_AGE = 60 * 60 * 24 * 30

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not configured')
  return secret
}

function sign(value) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('base64url')
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

function parseCookies(header = '') {
  return Object.fromEntries(
    header.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
      const separator = part.indexOf('=')
      return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))]
    })
  )
}

export function verifyPassword(password) {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) throw new Error('ADMIN_PASSWORD is not configured')
  return safeEqual(password, expected)
}

export function createSessionCookie() {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE })).toString('base64url')
  const token = `${payload}.${sign(payload)}`
  return `${COOKIE_NAME}=${token}; Max-Age=${SESSION_MAX_AGE}; Path=/; HttpOnly; Secure; SameSite=Strict`
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`
}

export function isAdminRequest(req) {
  try {
    const token = parseCookies(req.headers.cookie)[COOKIE_NAME]
    if (!token) return false
    const [payload, signature] = token.split('.')
    if (!payload || !signature || !safeEqual(signature, sign(payload))) return false
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return Number(session.exp) > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

export function requireAdmin(req, res) {
  if (isAdminRequest(req)) return true
  res.status(401).json({ error: '管理会话已失效，请重新输入密码' })
  return false
}
