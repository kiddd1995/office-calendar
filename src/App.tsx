import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CalendarRange,
  Home,
  Loader2,
  LogOut,
  RefreshCw,
  Settings2,
  Sparkles,
} from 'lucide-react'
import './App.css'
import { AdminLogin } from './components/AdminLogin'
import { CourseCalendar } from './components/CourseCalendar'
import { EventEditor } from './components/EventEditor'
import { WorkCalendar } from './components/WorkCalendar'
import {
  getSupabaseClient,
  supabase,
  supabaseConfigurationError,
} from './lib/supabaseClient'
import { calendarEventService } from './services/calendarEventService'
import type { CalendarEvent } from './types/calendar'

interface EventLoadStateProps {
  error?: string
  onRetry?: () => void
}

function EventLoadState({ error, onRetry }: EventLoadStateProps) {
  return (
    <section className={`event-load-state ${error ? 'error-state' : ''}`} role={error ? 'alert' : 'status'}>
      {error ? <AlertTriangle size={28} /> : <Loader2 className="spin" size={28} />}
      <strong>{error ? '課程活動載入失敗' : '正在載入課程活動'}</strong>
      <p>{error ?? '正在從 Supabase 取得最新活動資料…'}</p>
      {error && onRetry && (
        <button type="button" className="primary-button" onClick={onRetry}>
          <RefreshCw size={16} />重新載入
        </button>
      )}
    </section>
  )
}

function App() {
  const [activeView, setActiveView] = useState<'courses' | 'work'>('courses')
  const [route, setRoute] = useState(() =>
    window.location.hash === '#/edit' ? 'edit' : 'view',
  )
  const [publicEvents, setPublicEvents] = useState<CalendarEvent[]>([])
  const [publicLoading, setPublicLoading] = useState(true)
  const [publicError, setPublicError] = useState('')
  const [adminEvents, setAdminEvents] = useState<CalendarEvent[]>([])
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)

  const loadVisibleEvents = useCallback(async () => {
    setPublicLoading(true)
    setPublicError('')
    try {
      setPublicEvents(await calendarEventService.getVisibleEvents())
    } catch (error) {
      setPublicEvents([])
      setPublicError(
        error instanceof Error ? error.message : '無法載入課程活動，請稍後再試。',
      )
    } finally {
      setPublicLoading(false)
    }
  }, [])

  const loadAdminEvents = useCallback(async () => {
    setAdminLoading(true)
    setAdminError('')
    try {
      setAdminEvents(await calendarEventService.getAllEvents())
    } catch (error) {
      setAdminEvents([])
      setAdminError(
        error instanceof Error ? error.message : '無法載入管理活動資料，請稍後再試。',
      )
    } finally {
      setAdminLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadVisibleEvents()

    const handleHashChange = () => {
      setRoute(window.location.hash === '#/edit' ? 'edit' : 'view')
    }
    window.addEventListener('hashchange', handleHashChange)

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [loadVisibleEvents])

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false)
      return
    }

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) setAuthError('無法確認登入狀態，請重新登入。')
      setSession(data.session)
      setAuthLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
      if (!nextSession) setAdminEvents([])
    })

    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) void loadAdminEvents()
  }, [loadAdminEvents, session])

  const refreshEvents = async () => {
    await Promise.all([loadAdminEvents(), loadVisibleEvents()])
  }

  const logoutEditor = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    setAuthError('')
    try {
      const { error } = await getSupabaseClient().auth.signOut()
      if (error) setAuthError('登出失敗，請稍後再試。')
    } catch {
      setAuthError('登出服務暫時無法連線，請稍後再試。')
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="app-shell">
      <header className={`site-header ${route === 'edit' ? 'editor-route' : ''}`}>
        <div className="brand-cluster">
          <a
            className="brand"
            href="https://kiddd1995.github.io/mobile-office/"
            aria-label="行動辦公室首頁"
          >
            <span className="brand-mark"><Sparkles size={20} /></span>
            <span>
              <strong>行動辦公室</strong>
              <small>Mobile Office Portal</small>
            </span>
          </a>
          <a
            className="home-link"
            href="https://kiddd1995.github.io/mobile-office/"
            aria-label="回到行動辦公室首頁"
          >
            <Home size={15} />
            <span className="home-link-long">回到首頁</span>
            <span className="home-link-short">首頁</span>
          </a>
        </div>
        {route === 'view' ? (
          <nav className="main-tabs" aria-label="主要行事曆切換">
            <button type="button" className={activeView === 'courses' ? 'active' : ''} onClick={() => setActiveView('courses')}>
              <BookOpen size={18} />課程活動
            </button>
            <button
              type="button"
              className={activeView === 'work' ? 'active' : ''}
              onClick={() => setActiveView('work')}
              aria-label="公司工作月／發薪日"
            >
              <CalendarRange size={18} />公司工作月／發薪日
            </button>
          </nav>
        ) : (
          <strong className="editor-header-title"><Settings2 size={17} />活動編輯模式</strong>
        )}
        <div className="header-actions">
          {route === 'view' ? (
            <a className="view-mode mode-link" href="#/edit"><Settings2 size={13} />編輯</a>
          ) : (
            <>
              <a className="view-mode mode-link" href="#/"><ArrowLeft size={13} />一般檢視</a>
              {session && (
                <button type="button" className="view-mode mode-link" onClick={logoutEditor} disabled={loggingOut}>
                  <LogOut size={13} />{loggingOut ? '登出中…' : '登出'}
                </button>
              )}
            </>
          )}
        </div>
      </header>

      <main>
        <div className="page-intro">
          <div>
            <p className="eyebrow">{route === 'edit' ? 'CALENDAR ADMIN' : 'OFFICE CALENDAR'}</p>
            <h1>行動辦公室行事曆</h1>
            <p>快速掌握課程活動、公司工作月與發薪資訊</p>
          </div>
          <span className="status-chip">
            <i />
            {route === 'edit' || activeView === 'courses'
              ? '課程資料 Supabase'
              : '工作月正式 Excel'}
            {' · '}
            {new Intl.DateTimeFormat('zh-TW').format(new Date())}
          </span>
        </div>

        {authError && <div className="operation-error page-operation-error" role="alert">{authError}</div>}

        {route === 'edit' && authLoading ? (
          <EventLoadState />
        ) : route === 'edit' && session ? (
          <EventEditor
            events={adminEvents}
            loading={adminLoading}
            error={adminError}
            onReload={refreshEvents}
          />
        ) : route === 'edit' ? (
          <AdminLogin onAuthenticated={setSession} />
        ) : activeView === 'courses' ? (
          publicLoading ? (
            <EventLoadState />
          ) : publicError || supabaseConfigurationError ? (
            <EventLoadState
              error={publicError || supabaseConfigurationError || undefined}
              onRetry={loadVisibleEvents}
            />
          ) : (
            <CourseCalendar events={publicEvents} />
          )
        ) : (
          <WorkCalendar />
        )}
      </main>

      <footer>
        <span>行動辦公室行事曆</span>
        <span>課程活動 Supabase · 公司工作月／發薪日正式 Excel</span>
      </footer>
    </div>
  )
}

export default App
