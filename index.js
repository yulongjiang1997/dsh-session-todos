/**
 * Host half of the workspace session-todos bundle.
 *
 * The page keeps its own same-origin cache, but the Web GUI can change its
 * loopback port between launches, which turns every restart into a new origin
 * with empty `localStorage`. The authoritative copy therefore lives in one
 * small JSON file under `$DSH_HOME` and is served over two same-origin routes:
 *
 *   GET  /__dsh-session-todos/todos  -> { ok, todos }
 *   POST /__dsh-session-todos/todos  -> { ok } for { todos }
 *
 * Exact routes bypass the /api admission path, so every request first passes
 * `connection.requestRejection()`: 403 for an untrusted Host/Origin, 401 for a
 * request without an authenticated browser session, undefined to proceed.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

const ROUTE = '/__dsh-session-todos/todos'
const STORE_FILE = 'dsh-session-todos.json'
const MAX_BODY_BYTES = 4 * 1024 * 1024
const MAX_TODOS = 150
const MAX_PROMPT_CHARS = 20000
const MAX_TITLE_CHARS = 200

function dshHome() {
  const fromEnv = process.env.DSH_HOME
  return typeof fromEnv === 'string' && fromEnv.length > 0 ? fromEnv : join(homedir(), '.dsh')
}

function storeFile() {
  return join(dshHome(), STORE_FILE)
}

function stringOf(value, limit) {
  return typeof value === 'string' ? value.slice(0, limit) : ''
}

function finite(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** Keep only well-formed records; the page validates too, but never trust the wire. */
function sanitizeTodo(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const prompt = stringOf(raw.prompt, MAX_PROMPT_CHARS)
  if (prompt.trim() === '') return undefined
  const workspaceId = stringOf(raw.workspaceId, 240)
  const workspacePath = stringOf(raw.workspacePath, 4096)
  if (workspaceId === '' && workspacePath === '') return undefined
  const id = stringOf(raw.id, 120)
  if (id === '') return undefined
  const createdAt = finite(raw.createdAt, 0)
  const status = raw.status === 'done' ? 'done' : 'pending'
  const todo = {
    id,
    workspaceId,
    workspacePath,
    title: stringOf(raw.title, MAX_TITLE_CHARS),
    prompt,
    status,
    createdAt,
    updatedAt: finite(raw.updatedAt, createdAt),
  }
  const agentPreset = stringOf(raw.agentPreset, 240)
  if (agentPreset !== '') todo.agentPreset = agentPreset
  const sessionId = stringOf(raw.sessionId, 240)
  if (sessionId !== '') todo.sessionId = sessionId
  const sentAt = finite(raw.sentAt, undefined)
  if (sentAt !== undefined) todo.sentAt = sentAt
  return todo
}

function sanitizeTodos(raw) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  const todos = []
  for (const value of raw) {
    const todo = sanitizeTodo(value)
    if (todo === undefined || seen.has(todo.id)) continue
    seen.add(todo.id)
    todos.push(todo)
    if (todos.length >= MAX_TODOS) break
  }
  return todos
}

function readTodos() {
  try {
    const parsed = JSON.parse(readFileSync(storeFile(), 'utf8'))
    return sanitizeTodos(parsed !== null && typeof parsed === 'object' ? parsed.todos : undefined)
  } catch {
    return []
  }
}

function writeTodos(todos) {
  const file = storeFile()
  mkdirSync(dirname(file), { recursive: true })
  const temporary = file + '.tmp'
  writeFileSync(temporary, JSON.stringify({ version: 1, todos }, null, 2) + '\n', 'utf8')
  renameSync(temporary, file)
}

function sendJson(response, status, value) {
  const body = JSON.stringify(value)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  })
  response.end(body)
}

function readBody(request, limit = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    request.on('data', (chunk) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      size += buffer.length
      if (size > limit) {
        reject(new Error('request body too large'))
        request.destroy()
        return
      }
      chunks.push(buffer)
    })
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    request.on('error', reject)
  })
}

function registerRoutes(webServer, connection, ctx) {
  ctx.effect(() =>
    webServer.register({
      kind: 'exact',
      path: ROUTE,
      handler: async (request, response) => {
        // Exact routes installed here bypass the /api admission path; apply the
        // same Host/Origin and browser-session fence before touching any data.
        // 403 = untrusted Host/Origin, 401 = no authenticated browser session.
        const refused = connection.requestRejection(request)
        if (refused !== undefined) {
          sendJson(response, refused, {
            ok: false,
            error: refused === 401 ? 'unauthorized' : 'forbidden',
          })
          return
        }
        if (request.method === 'GET') {
          sendJson(response, 200, { ok: true, todos: readTodos() })
          return
        }
        if (request.method === 'POST') {
          try {
            const parsed = JSON.parse((await readBody(request)) || '{}')
            writeTodos(sanitizeTodos(parsed !== null && typeof parsed === 'object' ? parsed.todos : undefined))
            sendJson(response, 200, { ok: true })
          } catch (error) {
            sendJson(response, 400, {
              ok: false,
              error: String(error instanceof Error ? error.message : error),
            })
          }
          return
        }
        sendJson(response, 405, { ok: false, error: 'method not allowed' })
      },
    }),
  )
}

export const inject = ['webServer', 'connection']

export function apply(ctx) {
  const webServer = ctx.get('webServer')
  const connection = ctx.get('connection')
  if (webServer === undefined || connection === undefined) {
    console.warn('session-todos: webServer or connection service is unavailable')
    return
  }
  registerRoutes(webServer, connection, ctx)
}
