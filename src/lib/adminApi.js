export async function adminRequest(action, payload = {}) {
  const response = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ action, payload }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(result.error || '管理操作失败')
    error.status = response.status
    throw error
  }
  return result.data
}

export async function getAdminSession({ timeoutMs = 2500 } = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  let response
  try {
    response = await fetch('/api/session', {
      credentials: 'same-origin',
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }
  if (!response.ok) return false
  return Boolean((await response.json()).isAdmin)
}

export async function loginAdmin(password) {
  const response = await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ password }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || '密码验证失败')
  return true
}

export async function logoutAdmin() {
  await fetch('/api/session', { method: 'DELETE', credentials: 'same-origin' })
}
