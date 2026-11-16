/**
 * Workspace session-todos — browser half.
 *
 * A to-do is a pre-stored session instruction. It lives in the current
 * Session's Workspace, so the only UI is a composer popover: click the
 * bookmark control in the composer toolbar, see every to-do for this
 * Workspace, and send one straight into the current conversation.
 *
 * The Host half owns durability (`$DSH_HOME/dsh-session-todos.json`); page
 * storage is only the same-origin cache because the Web GUI's loopback port
 * changes between launches.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-session-todos',
  factory(require) {
    const React = require('react')
    const ReactDOM = require('react-dom')
    const h = React.createElement

    const NS = 'sessionTodos'
    const API_URL = '/__dsh-session-todos/todos'
    const STORAGE_KEY = 'dsh.session.todos.v1'
    const STYLE_ID = '@local/dsh-session-todos/popover.css'
    const MAX_TODOS = 150
    const MAX_PROMPT_CHARS = 20000
    const MAX_TITLE_CHARS = 200
    const PANEL_WIDTH = 380

    /* ------------------------------------------------------------------ */
    /* Localization                                                        */
    /* ------------------------------------------------------------------ */

    const zh = {
      'trigger.label': '会话待办',
      'trigger.short': '待办',
      'trigger.hint': '查看当前工作区的待办，或把输入框草稿存为待办',
      'trigger.count': '{n}',

      'pop.title': '会话待办',
      'pop.subtitle': '当前工作区',
      'pop.subtitleFallback': '当前会话',
      'pop.close': '关闭',
      'pop.new': '存为待办',
      'pop.newHint': '把输入框里的内容预存下来',
      'pop.newEmpty': '新建空白',
      'pop.clearDone': '清除已发送',
      'pop.clearing': '清除中…',

      'form.title': '标题',
      'form.titlePlaceholder': '可留空，默认取指令第一行',
      'form.prompt': '会话指令',
      'form.promptPlaceholder': '写下这次要对 Agent 说的内容；之后随时可以发送到当前会话。',
      'form.save': '存为待办',
      'form.saveEdit': '保存修改',
      'form.cancel': '取消',
      'form.fromDraft': '带入当前草稿',
      'form.requiredPrompt': '请先写下会话指令。',
      'form.requiredWorkspace': '当前会话没有可用的工作区路径。',
      'form.preset': 'Agent 预设：{name}',

      'item.send': '发送',
      'item.sending': '发送中…',
      'item.again': '再发',
      'item.edit': '编辑',
      'item.delete': '删除',
      'item.deleteConfirm': '确认删除？',
      'item.deleteYes': '删除',
      'item.cancel': '取消',
      'item.done': '已发送',
      'item.pending': '待发送',

      'empty.title': '当前工作区还没有待办',
      'empty.hint': '点上方「存为待办」把输入框草稿存下来，之后一键发送到当前会话。',

      'notice.saved': '已存为待办。',
      'notice.updated': '待办已更新。',
      'notice.deleted': '待办已删除。',
      'notice.sent': '已发送到当前会话。',
      'notice.sendFailed': '发送失败：{message}',
      'notice.saveFailed': '保存失败：{message}',
      'notice.cleared': '已清除发送记录。',
      'notice.noDraft': '输入框是空的，已打开新建待办。',

      'time.now': '刚刚',
      'time.minutes': '{n} 分钟前',
      'time.hours': '{n} 小时前',
      'time.days': '{n} 天前',
      'time.months': '{n} 个月前',
      'time.years': '{n} 年前',

      'error.generic': '操作失败。',
      'error.missing': '这条待办已不存在。',
      'error.workspace': '当前会话没有可用的工作区路径。',
    }

    const en = {
      'trigger.label': 'Session to-dos',
      'trigger.short': 'To-dos',
      'trigger.hint': 'See this workspace’s to-dos, or save the composer draft as one',
      'trigger.count': '{n}',

      'pop.title': 'Session to-dos',
      'pop.subtitle': 'Current workspace',
      'pop.subtitleFallback': 'Current session',
      'pop.close': 'Close',
      'pop.new': 'Save draft',
      'pop.newHint': 'Pre-store what is in the composer',
      'pop.newEmpty': 'Blank to-do',
      'pop.clearDone': 'Clear sent',
      'pop.clearing': 'Clearing…',

      'form.title': 'Title',
      'form.titlePlaceholder': 'Optional; defaults to the first line',
      'form.prompt': 'Instruction',
      'form.promptPlaceholder': 'Write what this session should say to the agent; send it into the current conversation later.',
      'form.save': 'Save to-do',
      'form.saveEdit': 'Save changes',
      'form.cancel': 'Cancel',
      'form.fromDraft': 'Use composer draft',
      'form.requiredPrompt': 'Write the instruction first.',
      'form.requiredWorkspace': 'The current session has no usable workspace path.',
      'form.preset': 'Agent preset: {name}',

      'item.send': 'Send',
      'item.sending': 'Sending…',
      'item.again': 'Send again',
      'item.edit': 'Edit',
      'item.delete': 'Delete',
      'item.deleteConfirm': 'Delete this?',
      'item.deleteYes': 'Delete',
      'item.cancel': 'Cancel',
      'item.done': 'Sent',
      'item.pending': 'Pending',

      'empty.title': 'No to-dos in this workspace yet',
      'empty.hint': 'Use “Save draft” above to pre-store the composer text, then send it into this conversation whenever you like.',

      'notice.saved': 'Saved as a to-do.',
      'notice.updated': 'To-do updated.',
      'notice.deleted': 'To-do deleted.',
      'notice.sent': 'Sent into the current conversation.',
      'notice.sendFailed': 'Send failed: {message}',
      'notice.saveFailed': 'Save failed: {message}',
      'notice.cleared': 'Sent history cleared.',
      'notice.noDraft': 'The composer was empty; opened a new to-do.',

      'time.now': 'just now',
      'time.minutes': '{n} min ago',
      'time.hours': '{n} h ago',
      'time.days': '{n} d ago',
      'time.months': '{n} mo ago',
      'time.years': '{n} y ago',

      'error.generic': 'The operation failed.',
      'error.missing': 'That to-do no longer exists.',
      'error.workspace': 'The current session has no usable workspace path.',
    }

    /* ------------------------------------------------------------------ */
    /* Utilities                                                           */
    /* ------------------------------------------------------------------ */

    function asObject(value) {
      return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {}
    }

    function finite(value, fallback) {
      return typeof value === 'number' && Number.isFinite(value) ? value : fallback
    }

    function textOf(value, limit) {
      return typeof value === 'string' ? value.slice(0, limit) : ''
    }

    function newId() {
      return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
    }

    function basename(path) {
      if (typeof path !== 'string' || path === '') return ''
      const trimmed = path.replace(/[/\\]+$/, '')
      const at = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))
      return trimmed.slice(at + 1) || trimmed
    }

    function firstLine(value, limit) {
      const line = String(value || '')
        .split(/\r?\n/)
        .map((part) => part.trim())
        .find((part) => part !== '')
      if (line === undefined) return ''
      return line.replace(/^#{1,6}\s*/, '').slice(0, limit)
    }

    function timeLabel(at, now, t) {
      const minute = 60000
      const hour = 3600000
      const day = 86400000
      const delta = Math.max(0, now - finite(at, 0))
      if (delta < minute) return t('time.now')
      if (delta < hour) return t('time.minutes', { n: Math.floor(delta / minute) })
      if (delta < day) return t('time.hours', { n: Math.floor(delta / hour) })
      if (delta < 30 * day) return t('time.days', { n: Math.floor(delta / day) })
      if (delta < 365 * day) return t('time.months', { n: Math.floor(delta / (30 * day)) })
      return t('time.years', { n: Math.floor(delta / (365 * day)) })
    }

    function resolvedTimeZone() {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone
      } catch {
        return undefined
      }
    }

    function createStore(initial) {
      let value = initial
      const listeners = new Set()
      return {
        getSnapshot: () => value,
        subscribe(listener) {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
        set(next) {
          if (next === value) return
          value = next
          for (const listener of [...listeners]) listener()
        },
      }
    }

    function useStore(store) {
      const [value, setValue] = React.useState(() => store.getSnapshot())
      React.useEffect(() => {
        const read = () => setValue(store.getSnapshot())
        read()
        return store.subscribe(read)
      }, [store])
      return value
    }

    /* ------------------------------------------------------------------ */
    /* Durable rows                                                        */
    /* ------------------------------------------------------------------ */

    function sanitizeTodo(raw) {
      if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return undefined
      const prompt = textOf(raw.prompt, MAX_PROMPT_CHARS)
      if (prompt.trim() === '') return undefined
      const workspaceId = textOf(raw.workspaceId, 240)
      const workspacePath = textOf(raw.workspacePath, 4096)
      if (workspaceId === '' && workspacePath === '') return undefined
      const id = textOf(raw.id, 120)
      if (id === '') return undefined
      const createdAt = finite(raw.createdAt, Date.now())
      const todo = {
        id,
        workspaceId,
        workspacePath,
        title: textOf(raw.title, MAX_TITLE_CHARS),
        prompt,
        status: raw.status === 'done' ? 'done' : 'pending',
        createdAt,
        updatedAt: finite(raw.updatedAt, createdAt),
      }
      const agentPreset = textOf(raw.agentPreset, 240)
      if (agentPreset !== '') todo.agentPreset = agentPreset
      const sessionId = textOf(raw.sessionId, 240)
      if (sessionId !== '') todo.sessionId = sessionId
      const sentAt = finite(raw.sentAt, undefined)
      if (sentAt !== undefined) todo.sentAt = sentAt
      return todo
    }

    function sanitizeList(raw) {
      if (!Array.isArray(raw)) return []
      const seen = new Set()
      const out = []
      for (const value of raw) {
        const todo = sanitizeTodo(value)
        if (todo === undefined || seen.has(todo.id)) continue
        seen.add(todo.id)
        out.push(todo)
        if (out.length >= MAX_TODOS) break
      }
      return out
    }

    function mergeTodos(hostTodos, localTodos) {
      const map = new Map()
      for (const todo of sanitizeList(hostTodos)) map.set(todo.id, todo)
      for (const todo of sanitizeList(localTodos)) {
        const previous = map.get(todo.id)
        if (previous === undefined || todo.updatedAt >= previous.updatedAt) map.set(todo.id, todo)
      }
      return [...map.values()]
    }

    function readLocal() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (raw === null) return []
        const parsed = asObject(JSON.parse(raw))
        return sanitizeList(parsed.todos)
      } catch {
        return []
      }
    }

    function writeLocal(todos) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, todos }))
      } catch {
        /* The Host copy still owns durability. */
      }
    }

    async function fetchHostTodos() {
      try {
        const response = await fetch(API_URL, { cache: 'no-store', credentials: 'same-origin' })
        if (!response.ok) return null
        const data = await response.json()
        if (data === null || typeof data !== 'object' || data.ok !== true || !Array.isArray(data.todos)) return null
        return sanitizeList(data.todos)
      } catch {
        return null
      }
    }

    function pushHostTodos(todos) {
      try {
        fetch(API_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ todos }),
          cache: 'no-store',
          credentials: 'same-origin',
        }).catch(() => {})
      } catch {
        /* The Host half may still be loading. */
      }
    }

    /* ------------------------------------------------------------------ */
    /* Styles                                                              */
    /* ------------------------------------------------------------------ */

    const CSS = [
      '.stdo-wrap{position:relative;display:inline-flex;flex:none}',
      '.stdo-trigger{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:4px;height:26px;padding:0 7px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;line-height:16px;cursor:pointer;white-space:nowrap}',
      '.stdo-trigger:hover,.stdo-trigger[aria-expanded="true"]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
      '.stdo-trigger:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}',
      '.stdo-count{position:absolute;top:-2px;right:-3px;display:inline-flex;align-items:center;justify-content:center;min-width:13px;height:13px;padding:0 3px;border-radius:999px;background:var(--dsw-alias-brand-primary);color:#fff;font-size:9px;line-height:13px;font-weight:700;pointer-events:none}',
      '.stdo-pop{position:fixed;z-index:1000;display:flex;flex-direction:column;min-height:0;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-overlay);box-shadow:0 14px 36px color-mix(in srgb,#000 26%,transparent);color:var(--dsw-alias-label-primary);font:inherit;overflow:hidden;outline:none}',
      '.stdo-head{display:flex;align-items:flex-start;gap:10px;padding:12px 14px 10px;border-bottom:1px solid var(--dsw-alias-border-l1)}',
      '.stdo-head-text{flex:1 1 auto;min-width:0}',
      '.stdo-title{margin:0;font-size:13.5px;line-height:20px;font-weight:650}',
      '.stdo-sub{margin:2px 0 0;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.stdo-close{flex:none;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}',
      '.stdo-close:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
      '.stdo-body{display:flex;flex-direction:column;gap:8px;min-height:0;overflow:auto;padding:10px 12px 12px}',
      '.stdo-bar{display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
      '.stdo-bar .stdo-spacer{flex:1 1 auto}',
      '.stdo-btn{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:5px;height:26px;padding:0 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:11.5px;line-height:16px;cursor:pointer;white-space:nowrap}',
      '.stdo-btn:hover{background:var(--dsw-alias-bg-layer-2)}',
      '.stdo-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}',
      '.stdo-btn:disabled{opacity:.55;cursor:default}',
      '.stdo-btn.is-primary{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:#fff}',
      '.stdo-btn.is-primary:hover{filter:brightness(1.06)}',
      '.stdo-btn.is-ghost{border-color:transparent;background:transparent;color:var(--dsw-alias-label-secondary)}',
      '.stdo-btn.is-ghost:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
      '.stdo-btn.is-danger{border-color:transparent;background:transparent;color:var(--dsw-alias-state-error-primary)}',
      '.stdo-btn.is-danger:hover{background:var(--dsw-alias-bg-layer-2)}',
      '.stdo-form{display:flex;flex-direction:column;gap:7px;padding:10px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-1)}',
      '.stdo-field{display:flex;flex-direction:column;gap:4px;min-width:0}',
      '.stdo-label{font-size:10.5px;line-height:15px;font-weight:600;color:var(--dsw-alias-label-secondary)}',
      '.stdo-input,.stdo-textarea{box-sizing:border-box;width:100%;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:18px;padding:6px 8px;outline:none}',
      '.stdo-input::placeholder,.stdo-textarea::placeholder{color:var(--dsw-alias-label-secondary);opacity:.8}',
      '.stdo-input:focus,.stdo-textarea:focus{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-brand-primary) 20%,transparent)}',
      '.stdo-textarea{min-height:76px;max-height:180px;resize:vertical;line-height:1.5}',
      '.stdo-hint{font-size:10.5px;line-height:15px;color:var(--dsw-alias-label-secondary)}',
      '.stdo-notice{padding:6px 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;font-size:11px;line-height:16px}',
      '.stdo-notice.is-error{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 45%,transparent);color:var(--dsw-alias-state-error-primary)}',
      '.stdo-notice.is-success{border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 45%,transparent);color:var(--dsw-alias-state-success-primary)}',
      '.stdo-list{display:flex;flex-direction:column;gap:1px}',
      '.stdo-row{display:flex;align-items:flex-start;gap:8px;padding:8px 7px;border-radius:8px}',
      '.stdo-row:hover{background:var(--dsw-alias-bg-layer-1)}',
      '.stdo-row-main{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px}',
      '.stdo-row-head{display:flex;align-items:center;gap:6px;min-width:0}',
      '.stdo-row-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:17px;font-weight:600}',
      '.stdo-state{flex:none;padding:0 5px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);font-size:9px;line-height:14px;color:var(--dsw-alias-label-secondary)}',
      '.stdo-state.is-done{color:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 40%,transparent)}',
      '.stdo-row-text{margin:0;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word}',
      '.stdo-row-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:10px;line-height:14px;color:var(--dsw-alias-label-secondary)}',
      '.stdo-actions{flex:none;display:flex;align-items:center;gap:3px;flex-wrap:wrap;justify-content:flex-end}',
      '.stdo-actions .stdo-btn{height:24px;padding:0 7px;font-size:11px}',
      '.stdo-confirm{display:flex;align-items:center;gap:4px;font-size:10px;color:var(--dsw-alias-label-secondary)}',
      '.stdo-empty{display:flex;flex-direction:column;gap:4px;padding:18px 12px;text-align:center;color:var(--dsw-alias-label-secondary)}',
      '.stdo-empty-title{font-size:12px;line-height:18px;font-weight:600;color:var(--dsw-alias-label-primary)}',
      '.stdo-empty-hint{font-size:11px;line-height:16px}',
      '@media (max-width: 520px){.stdo-pop{max-width:calc(100vw - 24px)}}',
    ].join('')

    /* ------------------------------------------------------------------ */
    /* Icons                                                               */
    /* ------------------------------------------------------------------ */

    function icon(paths, size) {
      return h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: size || 15,
          height: size || 15,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block', flex: 'none' },
        },
        paths.map((d, index) => h('path', { key: index, d })),
      )
    }

    const ICONS = {
      bookmark: icon(['M4 2.5h8v11L8 10.6 4 13.5z']),
      checklist: icon(['M5 2.5h6v2H5z', 'M3.5 3.5h9v10h-9z', 'M6 7h4', 'M6 9.5h4', 'M6 12h2']),
      close: icon(['M4 4l8 8', 'M12 4l-8 8']),
      send: icon(['M2.5 8h9', 'M8.2 4.6L11.6 8l-3.4 3.4']),
      pencil: icon(['M10.8 2.8l2.4 2.4-7.6 7.6-3.2.8.8-3.2 7.6-7.6z']),
      trash: icon(['M2.8 4.5h10.4', 'M6.3 4.5V3h3.4v1.5', 'M4.2 4.5l.5 8.3h6.6l.5-8.3']),
      plus: icon(['M8 3.5v9', 'M3.5 8h9']),
    }

    /* ------------------------------------------------------------------ */
    /* Popover                                                             */
    /* ------------------------------------------------------------------ */

    function workspaceOf(workspaces, sessions, sessionId) {
      const items = Array.isArray(workspaces.items) ? workspaces.items : []
      const summary = asObject(sessions.byId)[sessionId]
      const owner =
        items.find((item) => Array.isArray(item.sessionIds) && item.sessionIds.includes(sessionId)) ||
        items.find((item) => summary !== undefined && item.path === summary.cwd)
      if (owner !== undefined) {
        const stored = typeof owner.title === 'string' ? owner.title : ''
        return {
          workspaceId: owner.workspaceId,
          workspacePath: typeof owner.path === 'string' ? owner.path : '',
          title: stored !== '' && stored !== 'default-workspace' ? stored : basename(owner.path),
        }
      }
      const cwd = summary !== undefined && typeof summary.cwd === 'string' ? summary.cwd : ''
      return { workspaceId: '', workspacePath: cwd, title: '' }
    }

    class TodoBoundary extends React.Component {
      constructor(props) {
        super(props)
        this.state = { failed: false }
      }

      static getDerivedStateFromError() {
        return { failed: true }
      }

      componentDidCatch(error, info) {
        console.error('session-todos: popover render failed', error, info?.componentStack)
      }

      render() {
        return this.state.failed ? null : this.props.children
      }
    }

    function TodoTrigger(props) {
      const t = typeof props.t === 'function' ? props.t : (key) => key
      const api = asObject(props.api)
      const todos = useStore(props.todosStore)
      const workspaces = useStore(props.workspacesStore)
      const sessions = useStore(props.sessionsStore)

      const [open, setOpen] = React.useState(false)
      const [form, setForm] = React.useState(null)
      const [notice, setNotice] = React.useState(null)
      const [sendingId, setSendingId] = React.useState(null)
      const [confirmId, setConfirmId] = React.useState(null)
      const [position, setPosition] = React.useState(null)
      const triggerRef = React.useRef(null)
      const panelRef = React.useRef(null)
      const promptRef = React.useRef(null)

      const scope = workspaceOf(workspaces, sessions, props.sessionId)
      const visible = todos
        .filter((todo) => (scope.workspaceId !== '' ? todo.workspaceId === scope.workspaceId : true))
        .sort((left, right) => {
          if (left.status !== right.status) return left.status === 'pending' ? -1 : 1
          return (right.sentAt || right.createdAt) - (left.sentAt || left.createdAt)
        })
      const pendingCount = visible.filter((todo) => todo.status !== 'done').length

      React.useEffect(() => {
        if (!open) return undefined
        const measure = () => {
          const anchor = triggerRef.current
          if (anchor === null) return
          const rect = anchor.getBoundingClientRect()
          const width = Math.min(PANEL_WIDTH, window.innerWidth - 24)
          const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))
          const gap = 8
          const spaceAbove = rect.top - 12
          const spaceBelow = window.innerHeight - rect.bottom - 12
          if (spaceAbove >= 260 || spaceAbove >= spaceBelow) {
            setPosition({
              left,
              width,
              bottom: window.innerHeight - rect.top + gap,
              maxHeight: Math.max(200, Math.min(520, spaceAbove)),
            })
          } else {
            setPosition({
              left,
              width,
              top: rect.bottom + gap,
              maxHeight: Math.max(200, Math.min(520, spaceBelow)),
            })
          }
        }
        measure()
        window.addEventListener('resize', measure)
        window.addEventListener('scroll', measure, true)
        return () => {
          window.removeEventListener('resize', measure)
          window.removeEventListener('scroll', measure, true)
        }
      }, [open])

      React.useEffect(() => {
        if (!open) return undefined
        const onPointerDown = (event) => {
          const target = event.target
          if (panelRef.current !== null && panelRef.current.contains(target)) return
          if (triggerRef.current !== null && triggerRef.current.contains(target)) return
          setOpen(false)
        }
        const onKeyDown = (event) => {
          if (event.key !== 'Escape') return
          event.preventDefault()
          event.stopPropagation()
          if (form !== null) setForm(null)
          else setOpen(false)
        }
        document.addEventListener('pointerdown', onPointerDown, true)
        document.addEventListener('keydown', onKeyDown, true)
        return () => {
          document.removeEventListener('pointerdown', onPointerDown, true)
          document.removeEventListener('keydown', onKeyDown, true)
        }
      }, [open, form])

      React.useEffect(() => {
        if (notice === null) return undefined
        const timer = window.setTimeout(() => setNotice(null), 4200)
        return () => window.clearTimeout(timer)
      }, [notice])

      React.useEffect(() => {
        if (form === null) return
        if (promptRef.current !== null) promptRef.current.focus()
      }, [form?.editingId, form?.prompt === ''])

      React.useEffect(() => {
        if (!open || position === null || form !== null) return
        if (panelRef.current !== null) panelRef.current.focus({ preventScroll: true })
      }, [open, position, form])

      function startForm(withDraft) {
        const draft = withDraft && typeof props.readDraft === 'function' ? props.readDraft() : { draft: '', agentPreset: '' }
        setForm({
          editingId: null,
          title: draft.draft.trim() === '' ? '' : firstLine(draft.draft, 80),
          prompt: draft.draft,
          agentPreset: draft.agentPreset || '',
        })
        setNotice(draft.draft.trim() === '' ? { level: 'info', message: t('notice.noDraft') } : null)
        setConfirmId(null)
      }

      function editForm(todo) {
        setForm({
          editingId: todo.id,
          title: todo.title,
          prompt: todo.prompt,
          agentPreset: todo.agentPreset || '',
        })
        setConfirmId(null)
      }

      function useDraft() {
        const draft = typeof props.readDraft === 'function' ? props.readDraft() : { draft: '', agentPreset: '' }
        if (draft.draft.trim() === '') {
          setNotice({ level: 'info', message: t('notice.noDraft') })
          return
        }
        setForm((current) => ({
          editingId: current === null ? null : current.editingId,
          title: current !== null && current.title !== '' ? current.title : firstLine(draft.draft, 80),
          prompt: draft.draft,
          agentPreset: draft.agentPreset || (current === null ? '' : current.agentPreset),
        }))
      }

      function submitForm() {
        if (form === null) return
        const prompt = form.prompt.trim()
        if (prompt === '') {
          setNotice({ level: 'error', message: t('form.requiredPrompt') })
          return
        }
        const outcome = api.saveTodo({
          editingId: form.editingId,
          title: form.title,
          prompt,
          agentPreset: form.agentPreset,
          workspaceId: scope.workspaceId,
          workspacePath: scope.workspacePath,
        })
        if (outcome === undefined || outcome.ok !== true) {
          const message = outcome !== undefined && outcome.error !== undefined ? outcome.error : t('error.generic')
          setNotice({ level: 'error', message: t('notice.saveFailed', { message }) })
          return
        }
        setNotice({ level: 'success', message: form.editingId === null ? t('notice.saved') : t('notice.updated') })
        setForm(null)
      }

      async function send(todo) {
        if (sendingId !== null) return
        setSendingId(todo.id)
        setNotice(null)
        const result = await api.sendTodo(todo.id, props.sessionId)
        setSendingId(null)
        if (result === undefined || result.ok !== true) {
          const message = result !== undefined && result.error !== undefined ? result.error : t('error.generic')
          setNotice({ level: 'error', message: t('notice.sendFailed', { message }) })
          return
        }
        setOpen(false)
      }

      function remove(todo) {
        api.deleteTodo(todo.id)
        setConfirmId(null)
        setNotice({ level: 'success', message: t('notice.deleted') })
      }

      function clearDone() {
        api.clearDone(scope.workspaceId)
        setNotice({ level: 'success', message: t('notice.cleared') })
      }

      const hasDone = visible.some((todo) => todo.status === 'done')
      const popover =
        open && position !== null
          ? ReactDOM.createPortal(
              h(
                'div',
                {
                  ref: panelRef,
                  className: 'stdo-pop',
                  role: 'dialog',
                  tabIndex: -1,
                  'aria-label': t('pop.title'),
                  style: position,
                  onClick: (event) => event.stopPropagation(),
                },
                h(
                  'div',
                  { className: 'stdo-head' },
                  h(
                    'div',
                    { className: 'stdo-head-text' },
                    h('div', { className: 'stdo-title' }, t('pop.title')),
                    h(
                      'div',
                      { className: 'stdo-sub', title: scope.workspacePath || undefined },
                      scope.title !== '' ? scope.title : t('pop.subtitleFallback'),
                    ),
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'stdo-close',
                      'aria-label': t('pop.close'),
                      title: t('pop.close'),
                      onClick: () => setOpen(false),
                    },
                    ICONS.close,
                  ),
                ),
                h(
                  'div',
                  { className: 'stdo-body' },
                  h(
                    'div',
                    { className: 'stdo-bar' },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'stdo-btn is-primary',
                        onClick: () => startForm(true),
                      },
                      ICONS.bookmark,
                      t('pop.new'),
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'stdo-btn is-ghost',
                        onClick: () => startForm(false),
                      },
                      ICONS.plus,
                      t('pop.newEmpty'),
                    ),
                    h('span', { className: 'stdo-spacer' }),
                    hasDone
                      ? h(
                          'button',
                          { type: 'button', className: 'stdo-btn is-ghost', onClick: clearDone },
                          t('pop.clearDone'),
                        )
                      : null,
                  ),

                  notice !== null
                    ? h(
                        'div',
                        {
                          className:
                            'stdo-notice' +
                            (notice.level === 'error' ? ' is-error' : notice.level === 'success' ? ' is-success' : ''),
                          role: 'status',
                        },
                        notice.message,
                      )
                    : null,

                  form !== null
                    ? h(
                        'div',
                        { className: 'stdo-form' },
                        h(
                          'label',
                          { className: 'stdo-field' },
                          h('span', { className: 'stdo-label' }, t('form.title')),
                          h('input', {
                            className: 'stdo-input',
                            type: 'text',
                            value: form.title,
                            maxLength: 200,
                            placeholder: t('form.titlePlaceholder'),
                            onChange: (event) => setForm((current) => ({ ...current, title: event.target.value })),
                          }),
                        ),
                        h(
                          'label',
                          { className: 'stdo-field' },
                          h('span', { className: 'stdo-label' }, t('form.prompt')),
                          h('textarea', {
                            ref: promptRef,
                            className: 'stdo-textarea',
                            value: form.prompt,
                            maxLength: 20000,
                            placeholder: t('form.promptPlaceholder'),
                            onChange: (event) => setForm((current) => ({ ...current, prompt: event.target.value })),
                            onKeyDown: (event) => {
                              if (event.key === 'Escape') {
                                event.preventDefault()
                                setForm(null)
                              }
                            },
                          }),
                        ),
                        form.agentPreset !== ''
                          ? h('div', { className: 'stdo-hint' }, t('form.preset', { name: form.agentPreset }))
                          : null,
                        h(
                          'div',
                          { className: 'stdo-bar' },
                          h(
                            'button',
                            { type: 'button', className: 'stdo-btn is-primary', onClick: submitForm },
                            form.editingId === null ? t('form.save') : t('form.saveEdit'),
                          ),
                          h(
                            'button',
                            { type: 'button', className: 'stdo-btn is-ghost', onClick: useDraft },
                            t('form.fromDraft'),
                          ),
                          h('span', { className: 'stdo-spacer' }),
                          h(
                            'button',
                            { type: 'button', className: 'stdo-btn is-ghost', onClick: () => setForm(null) },
                            t('form.cancel'),
                          ),
                        ),
                      )
                    : null,

                  visible.length === 0 && form === null
                    ? h(
                        'div',
                        { className: 'stdo-empty' },
                        h('div', { className: 'stdo-empty-title' }, t('empty.title')),
                        h('div', { className: 'stdo-empty-hint' }, t('empty.hint')),
                      )
                    : null,

                  visible.length > 0
                    ? h(
                        'div',
                        { className: 'stdo-list' },
                        visible.map((todo) =>
                          h(
                            'div',
                            { className: 'stdo-row', key: todo.id },
                            h(
                              'div',
                              { className: 'stdo-row-main' },
                              h(
                                'div',
                                { className: 'stdo-row-head' },
                                h(
                                  'span',
                                  { className: 'stdo-row-title' },
                                  todo.title || firstLine(todo.prompt, 80) || t('error.missing'),
                                ),
                                h(
                                  'span',
                                  { className: 'stdo-state' + (todo.status === 'done' ? ' is-done' : '') },
                                  todo.status === 'done' ? t('item.done') : t('item.pending'),
                                ),
                              ),
                              h('p', { className: 'stdo-row-text' }, todo.prompt),
                              h(
                                'div',
                                { className: 'stdo-row-meta' },
                                h('span', null, timeLabel(todo.createdAt, Date.now(), t)),
                                todo.agentPreset ? h('span', null, todo.agentPreset) : null,
                              ),
                            ),
                            h(
                              'div',
                              { className: 'stdo-actions' },
                              confirmId === todo.id
                                ? h(
                                    'span',
                                    { className: 'stdo-confirm' },
                                    t('item.deleteConfirm'),
                                    h(
                                      'button',
                                      { type: 'button', className: 'stdo-btn is-danger', onClick: () => remove(todo) },
                                      t('item.deleteYes'),
                                    ),
                                    h(
                                      'button',
                                      { type: 'button', className: 'stdo-btn is-ghost', onClick: () => setConfirmId(null) },
                                      t('item.cancel'),
                                    ),
                                  )
                                : h(
                                    React.Fragment,
                                    null,
                                    h(
                                      'button',
                                      {
                                        type: 'button',
                                        className: 'stdo-btn is-primary',
                                        disabled: sendingId !== null,
                                        onClick: () => send(todo),
                                      },
                                      sendingId === todo.id
                                        ? t('item.sending')
                                        : todo.status === 'done'
                                          ? t('item.again')
                                          : t('item.send'),
                                    ),
                                    h(
                                      'button',
                                      {
                                        type: 'button',
                                        className: 'stdo-btn is-ghost',
                                        'aria-label': t('item.edit'),
                                        title: t('item.edit'),
                                        onClick: () => editForm(todo),
                                      },
                                      ICONS.pencil,
                                    ),
                                    h(
                                      'button',
                                      {
                                        type: 'button',
                                        className: 'stdo-btn is-ghost',
                                        'aria-label': t('item.delete'),
                                        title: t('item.delete'),
                                        onClick: () => setConfirmId(todo.id),
                                      },
                                      ICONS.trash,
                                    ),
                                  ),
                            ),
                          ),
                        ),
                      )
                    : null,
                ),
              ),
              document.body,
            )
          : null

      return h(
        'span',
        { className: 'stdo-wrap' },
        h(
          'button',
          {
            ref: triggerRef,
            type: 'button',
            className: 'stdo-trigger',
            'aria-label': t('trigger.label'),
            'aria-expanded': open ? 'true' : 'false',
            title: t('trigger.hint'),
            onClick: () => {
              if (open) setOpen(false)
              else {
                setOpen(true)
                setForm(null)
                setNotice(null)
              }
            },
            onPointerDown: (event) => event.stopPropagation(),
          },
          ICONS.checklist,
          h('span', { className: 'stdo-trigger-label' }, t('trigger.short')),
          pendingCount > 0 ? h('span', { className: 'stdo-count' }, pendingCount > 99 ? '99+' : String(pendingCount)) : null,
        ),
        popover,
      )
    }

    /* ------------------------------------------------------------------ */
    /* Plugin                                                              */
    /* ------------------------------------------------------------------ */

    function TodoSurface(props) {
      return h(TodoBoundary, null, h(TodoTrigger, props))
    }

    const inject = ['slots', 'locale', 'workspaces', 'sessions', 'remote', 'remote.session']

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'session-todos: dictionaries')
      const t = ctx.locale.bind(NS)

      ctx.effect(() => {
        if (typeof styles !== 'undefined' && styles !== null && typeof styles.insert === 'function') {
          return styles.insert(CSS)
        }
        const tag = document.createElement('style')
        tag.dataset.plugin = '@local/dsh-session-todos'
        tag.dataset.pluginCss = STYLE_ID
        tag.textContent = CSS
        document.head.appendChild(tag)
        return () => tag.remove()
      }, 'session-todos: styles')

      const workspaces = ctx.get('workspaces')
      const sessions = ctx.get('sessions')
      if (workspaces === undefined || sessions === undefined) {
        console.warn('session-todos: workspace services are unavailable')
        return
      }

      const todoStore = createStore(readLocal())
      let loaded = false

      function workspaceItems() {
        return Array.isArray(workspaces.list.getSnapshot().items) ? workspaces.list.getSnapshot().items : []
      }

      function findTodo(id) {
        return todoStore.getSnapshot().find((todo) => todo.id === id)
      }

      function updateTodo(id, patch) {
        const now = Date.now()
        todoStore.set(
          todoStore.getSnapshot().map((todo) =>
            todo.id === id
              ? { ...todo, ...patch, updatedAt: patch.updatedAt !== undefined ? patch.updatedAt : now }
              : todo,
          ),
        )
      }

      function currentWorkspacePath(sessionId) {
        const summary = asObject(sessions.list.getSnapshot().byId)[sessionId]
        if (summary !== undefined && typeof summary.cwd === 'string') return summary.cwd
        return ''
      }

      function saveTodo(input) {
        const prompt = String(input.prompt || '').trim()
        if (prompt === '') return { ok: false, error: t('form.requiredPrompt') }
        const workspaceId = String(input.workspaceId || '')
        const workspacePath = String(input.workspacePath || '')
        if (workspaceId === '' && workspacePath === '') return { ok: false, error: t('form.requiredWorkspace') }
        const now = Date.now()
        const title = String(input.title || '').trim().slice(0, MAX_TITLE_CHARS) || firstLine(prompt, 80)
        const agentPreset = String(input.agentPreset || '').trim().slice(0, 240)
        if (input.editingId !== undefined && input.editingId !== null) {
          const existing = findTodo(input.editingId)
          if (existing === undefined) return { ok: false, error: t('error.missing') }
          const next = {
            ...existing,
            workspaceId,
            workspacePath,
            title,
            prompt: prompt.slice(0, MAX_PROMPT_CHARS),
            updatedAt: now,
          }
          if (agentPreset === '') delete next.agentPreset
          else next.agentPreset = agentPreset
          todoStore.set(todoStore.getSnapshot().map((todo) => (todo.id === existing.id ? next : todo)))
          return { ok: true, id: next.id }
        }
        const todo = {
          id: newId(),
          workspaceId,
          workspacePath,
          title,
          prompt: prompt.slice(0, MAX_PROMPT_CHARS),
          status: 'pending',
          createdAt: now,
          updatedAt: now,
        }
        if (agentPreset !== '') todo.agentPreset = agentPreset
        todoStore.set([todo, ...todoStore.getSnapshot()].slice(0, MAX_TODOS))
        return { ok: true, id: todo.id }
      }

      function deleteTodo(id) {
        todoStore.set(todoStore.getSnapshot().filter((todo) => todo.id !== id))
      }

      function clearDone(workspaceId) {
        todoStore.set(
          todoStore.getSnapshot().filter((todo) => todo.status !== 'done' || (workspaceId !== '' && todo.workspaceId !== workspaceId)),
        )
      }

      async function sendTodo(id, sessionId) {
        const todo = findTodo(id)
        if (todo === undefined) return { ok: false, error: t('error.missing') }
        const content = [{ type: 'text', text: todo.prompt }]
        let result
        try {
          const binding = sessions.binding(sessionId)
          if (binding !== undefined && binding.session !== undefined && typeof binding.session.prompt === 'function') {
            result = await binding.session.prompt(content, 'queue')
          } else {
            const timeZone = resolvedTimeZone()
            result = await ctx.remote.session.prompt({
              requestId: newId(),
              sessionId,
              mode: 'queue',
              content,
              ...(timeZone === undefined ? {} : { clientTimeZone: timeZone }),
            })
          }
        } catch (error) {
          return { ok: false, error: error instanceof Error ? error.message : String(error) }
        }
        if (result === undefined || result === null || result.ok !== true) {
          const message = result && result.error && result.error.message ? result.error.message : t('error.generic')
          return { ok: false, error: message }
        }
        const now = Date.now()
        updateTodo(id, { status: 'done', sessionId, sentAt: now, updatedAt: now })
        return { ok: true }
      }

      function readDraft(sessionId) {
        let draft = ''
        let agentPreset = ''
        try {
          const scope = sessions.scope(sessionId)
          if (scope !== undefined) {
            const conversation = scope.get('conversation')
            if (conversation !== undefined && conversation !== null) {
              draft = conversation.input.for(scope).state.getSnapshot().draft || ''
            }
          }
        } catch (error) {
          console.warn('session-todos: could not read the composer draft', error)
        }
        try {
          const binding = sessions.binding(sessionId)
          const value = binding?.session?.projections?.faceOf?.('agentPreset')?.getSnapshot?.()
          if (typeof value === 'string') agentPreset = value
        } catch (error) {
          console.warn('session-todos: could not read the session preset', error)
        }
        return { draft, agentPreset }
      }

      const api = { saveTodo, deleteTodo, clearDone, sendTodo }

      ctx.effect(() => {
        let cancelled = false
        const local = readLocal()
        if (local.length > 0) todoStore.set(mergeTodos([], local))
        const load = async () => {
          let hostTodos = null
          for (let attempt = 1; attempt <= 6 && hostTodos === null && !cancelled; attempt += 1) {
            hostTodos = await fetchHostTodos()
            if (hostTodos === null && attempt < 6) await new Promise((resolve) => setTimeout(resolve, attempt * 900))
          }
          if (cancelled) return
          if (hostTodos !== null) todoStore.set(mergeTodos(hostTodos, todoStore.getSnapshot()))
          loaded = true
          writeLocal(todoStore.getSnapshot())
          pushHostTodos(todoStore.getSnapshot())
        }
        load()
        return () => {
          cancelled = true
        }
      }, 'session-todos: load')

      ctx.effect(
        () =>
          todoStore.subscribe(() => {
            const todos = todoStore.getSnapshot()
            writeLocal(todos)
            if (loaded) pushHostTodos(todos)
          }),
        'session-todos: persist',
      )

      ctx.slots.inject('conversation.input.left', () =>
        ctx.slots.register(
          {
            name: 'conversation.input.left',
            id: 'session-todos',
            order: 20,
            locale: NS,
            inject: (sessionId) => ({
              sessionId,
              todosStore: todoStore,
              workspacesStore: workspaces.list,
              sessionsStore: sessions.list,
              api,
              readDraft: () => readDraft(sessionId),
            }),
          },
          TodoSurface,
        ),
      )

      // Keep the pure halves reachable for headless checks.
      return {
        __testing: { sanitizeTodo, sanitizeList, mergeTodos, firstLine, readDraft },
      }
    }

    const testing = {
      sanitizeTodo,
      sanitizeList,
      mergeTodos,
      firstLine,
      timeLabel,
    }

    return { inject, apply, __testing: testing }
  },
})
