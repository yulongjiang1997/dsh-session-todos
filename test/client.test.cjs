const assert = require('node:assert/strict')
const { join } = require('node:path')

const loaded = []
global.window = {
  __ModuleLoader__: {
    load(definition) {
      loaded.push(definition)
    },
  },
  localStorage: {
    store: new Map(),
    getItem(key) {
      return this.store.has(key) ? this.store.get(key) : null
    },
    setItem(key, value) {
      this.store.set(key, value)
    },
  },
}

const ReactStub = {
  Component: class {
    constructor(props) {
      this.props = props
      this.state = {}
    }
  },
  createElement() {
    return null
  },
  useState() {
    return [undefined, () => {}]
  },
  useEffect() {},
  useRef() {
    return { current: null }
  },
  Fragment: {},
}

const ReactDomStub = {
  createPortal() {
    return null
  },
}

require(join(__dirname, '..', 'client.js'))

assert.equal(loaded.length, 1, 'client module registered one definition')
assert.equal(loaded[0].id, '@local/dsh-session-todos')

const api = loaded[0].factory((name) => {
  if (name === 'react') return ReactStub
  if (name === 'react-dom') return ReactDomStub
  throw new Error('unexpected require: ' + name)
})
assert.ok(Array.isArray(api.inject), 'inject list exported')
assert.equal(typeof api.apply, 'function')
const testing = api.__testing
assert.ok(testing, 'testing hooks exported')

const todo = {
  id: 't1',
  workspaceId: 'w1',
  workspacePath: 'D:/work/demo',
  title: 'Title',
  prompt: 'First line\nsecond line',
  status: 'pending',
  createdAt: 1000,
  updatedAt: 1000,
}
assert.equal(testing.sanitizeTodo(todo).prompt, todo.prompt)
assert.equal(testing.sanitizeTodo({ ...todo, id: '' }), undefined)
assert.equal(testing.sanitizeTodo({ ...todo, prompt: '   ' }), undefined)
assert.equal(testing.sanitizeTodo({ ...todo, workspaceId: '', workspacePath: '' }), undefined)
assert.equal(testing.sanitizeList([todo, todo, { id: 'x' }]).length, 1)

const merged = testing.mergeTodos(
  [{ ...todo, title: 'old', updatedAt: 1000 }],
  [
    { ...todo, title: 'new', updatedAt: 2000 },
    { ...todo, id: 't2', title: 'second' },
  ],
)
assert.equal(merged.length, 2)
assert.equal(merged.find((item) => item.id === 't1').title, 'new')

assert.equal(testing.firstLine('\n# Heading\ntext', 40), 'Heading')
assert.equal(testing.firstLine('   ', 40), '')
assert.equal(testing.timeLabel(0, 1000, (key) => key), 'time.now')

// Apply with the smallest fake Client context; this proves the slot
// registrations and the load path do not throw.
const registrations = []
const noop = () => () => {}
const snapshot = (value) => ({ getSnapshot: () => value, subscribe: () => () => {} })
const slots = {
  inject(_key, callback) {
    callback()
  },
  register(spec, component) {
    registrations.push({ spec, component })
    return () => {}
  },
}
const fakeCtx = {
  locale: {
    register: noop,
    bind: () => (key) => key,
  },
  effect(callback) {
    return callback() || (() => {})
  },
  get(name) {
    if (name === 'workspaces') return { list: snapshot({ phase: 'ready', items: [] }) }
    if (name === 'sessions') {
      return {
        list: snapshot({ phase: 'ready', ids: [], byId: {} }),
        scope: () => undefined,
        binding: () => undefined,
      }
    }
    if (name === 'uiWorkspace') return { openSession() {} }
    return undefined
  },
  remote: { session: { create: async () => ({ ok: false }), prompt: async () => ({ ok: false }) } },
  layout: { selectPanel() {} },
  slots,
}

global.document = {
  head: { appendChild() {} },
  createElement() {
    return { dataset: {}, textContent: '', remove() {} }
  },
}
global.fetch = async () => ({ ok: true, json: async () => ({ ok: true, todos: [] }) })

const result = api.apply(fakeCtx)
assert.ok(result && result.__testing, 'apply returned testing hooks')
assert.deepEqual(
  registrations.map((entry) => entry.spec.name),
  ['conversation.input.left'],
)
assert.equal(registrations[0].spec.id, 'session-todos')
assert.equal(typeof registrations[0].spec.inject, 'function')

console.log('client.test: ok')
