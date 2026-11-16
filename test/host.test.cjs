const assert = require('node:assert/strict')
const { mkdtempSync, readFileSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const { Readable } = require('node:stream')
const { pathToFileURL } = require('node:url')

async function main() {
  const home = mkdtempSync(join(tmpdir(), 'dsh-session-todos-'))
  const previousHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    const moduleUrl = pathToFileURL(join(__dirname, '..', 'index.js')).href
    const { apply } = await import(moduleUrl)

    let route
    const webServer = {
      register(spec) {
        route = spec
        return () => {}
      },
    }
    const ctx = {
      get(name) {
        return name === 'webServer' ? webServer : undefined
      },
      effect(callback) {
        return callback()
      },
      inject(_names, callback) {
        callback({ webServer, effect: ctx.effect })
      },
    }
    apply(ctx)
    assert.ok(route, 'route registered')
    assert.equal(route.path, '/__dsh-session-todos/todos')
    assert.equal(route.kind, 'exact')

    const request = (method, body) =>
      new Promise((resolve, reject) => {
        const response = {
          status: 0,
          body: '',
          writeHead(status) {
            this.status = status
          },
          end(value) {
            this.body = value || ''
            resolve(this)
          },
        }
        const source = new Readable({ read() {} })
        source.method = method
        route.handler(source, response).catch(reject)
        if (body !== undefined) source.push(body)
        source.push(null)
      })

    const empty = await request('GET')
    assert.equal(empty.status, 200)
    assert.deepEqual(JSON.parse(empty.body), { ok: true, todos: [] })

    const todo = {
      id: 't1',
      workspaceId: 'w1',
      workspacePath: 'D:/work/demo',
      title: '写季度报告',
      prompt: '起草季度报告。\n包含图表。',
      status: 'pending',
      createdAt: 1000,
      updatedAt: 1000,
    }
    const saved = await request('POST', JSON.stringify({ todos: [todo, { id: 'bad' }] }))
    assert.equal(saved.status, 200)
    assert.equal(JSON.parse(saved.body).ok, true)

    const loaded = await request('GET')
    const loadedBody = JSON.parse(loaded.body)
    assert.equal(loadedBody.todos.length, 1)
    assert.equal(loadedBody.todos[0].prompt, todo.prompt)

    const stored = JSON.parse(readFileSync(join(home, 'dsh-session-todos.json'), 'utf8'))
    assert.equal(stored.version, 1)
    assert.equal(stored.todos.length, 1)

    const malformed = await request('POST', '{not json')
    assert.equal(malformed.status, 400)
    assert.equal(JSON.parse(malformed.body).ok, false)
    console.log('host.test: ok')
  } finally {
    if (previousHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previousHome
    rmSync(home, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
