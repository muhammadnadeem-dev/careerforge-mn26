import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FileText,
  History,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Plus,
  X,
  Loader2,
  Sparkles,
} from 'lucide-react'
import {
  useAuth,
  AuthOverlay,
  getAuthToken,
  useQuery,
  useR2Files,
} from 'deepspace'
import { ChatPanel } from '../../../components/ChatPanel'

const CHAT_W_MIN = 320
const CHAT_W_MAX = 720
const CHAT_W_DEFAULT = 380
const STORAGE_OPEN = 'ai-chat-open'
const STORAGE_WIDTH = 'ai-chat-width'
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

interface ChatRow {
  userId: string
  title?: string
}

interface Attachment {
  fileName: string
  fileKey: string
  mimeType: string
  fileSize: number
  ownerId: string
}

interface ExternalMessage {
  id: string
  content: string
}

function loadOpen(): boolean {
  try {
    return localStorage.getItem(STORAGE_OPEN) !== '0'
  } catch {
    return true
  }
}

function loadWidth(): number {
  try {
    const value = parseInt(localStorage.getItem(STORAGE_WIDTH) ?? '', 10)
    if (!isNaN(value) && value >= CHAT_W_MIN && value <= CHAT_W_MAX) return value
  } catch {
    // Use default width.
  }
  return CHAT_W_DEFAULT
}

function formatRelative(ts?: string): string {
  if (!ts) return ''
  const time = Date.parse(ts)
  if (Number.isNaN(time)) return ''
  const diff = Math.max(0, Date.now() - time)
  if (diff < 60_000) return 'now'
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return `${Math.floor(days / 7)}w`
}

async function extractPdfText(blob: Blob): Promise<string> {
  const [pdfjs, workerModule] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?worker'),
  ])

  const PdfWorker = workerModule.default
  pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker()

  const buffer = await blob.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buffer }).promise

  try {
    const pages: string[] = []

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      const pageText = (content.items as Array<{ str?: string }>)
        .map((item) => item.str ?? '')
        .join(' ')
      pages.push(pageText)
    }

    return pages.join('\n\n')
  } finally {
    await pdf.destroy()
  }
}

export default function AiChatPage() {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const { readFile } = useR2Files()

  const [showAuth, setShowAuth] = useState(false)
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState<boolean>(loadOpen)
  const [chatWidth, setChatWidth] = useState<number>(loadWidth)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [creatingChat, setCreatingChat] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [selectedResume, setSelectedResume] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisStage, setAnalysisStage] = useState<
    'idle' | 'downloading' | 'extracting' | 'sent'
  >('idle')
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [externalMessage, setExternalMessage] = useState<ExternalMessage | null>(null)

  const chatCardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_OPEN, chatOpen ? '1' : '0')
    } catch {
      // Storage is optional.
    }
  }, [chatOpen])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_WIDTH, String(chatWidth))
    } catch {
      // Storage is optional.
    }
  }, [chatWidth])

  const { records: chatsRaw } = useQuery<ChatRow>('ai-chats', {
    where: { userId: userId ?? '__none__' },
    orderBy: 'updatedAt',
    orderDir: 'desc',
    limit: 50,
  })

  const { records: attachmentRecords } = useQuery<Attachment>('attachments', {
    where: { ownerId: userId ?? '__none__' },
    orderBy: 'createdAt',
    orderDir: 'desc',
    limit: 100,
  })

  const attachments = useMemo(
    () =>
      attachmentRecords
        .filter((record) => record.data.mimeType === 'application/pdf')
        .sort(
          (a, b) =>
            Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? ''),
        ),
    [attachmentRecords],
  )

  const chats = useMemo(
    () =>
      [...chatsRaw].sort((a, b) => {
        const aTime = Date.parse(a.updatedAt ?? a.createdAt ?? '') || 0
        const bTime = Date.parse(b.updatedAt ?? b.createdAt ?? '') || 0
        return bTime - aTime
      }),
    [chatsRaw],
  )

  const activeChat = useMemo(
    () => chats.find((chat) => chat.recordId === activeChatId) ?? null,
    [chats, activeChatId],
  )

  const activeTitle =
    (activeChat?.data.title ?? '').trim() || (activeChatId ? 'Untitled' : 'New chat')

  useEffect(() => {
    if (!dragging) return

    function onMove(event: MouseEvent) {
      if (!chatCardRef.current) return
      const rect = chatCardRef.current.getBoundingClientRect()
      const width = rect.right - event.clientX
      setChatWidth(Math.max(CHAT_W_MIN, Math.min(CHAT_W_MAX, width)))
    }

    function endDrag() {
      setDragging(false)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', endDrag)
    window.addEventListener('blur', endDrag)
    document.addEventListener('visibilitychange', endDrag)

    const previousCursor = document.body.style.cursor
    const previousSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', endDrag)
      window.removeEventListener('blur', endDrag)
      document.removeEventListener('visibilitychange', endDrag)
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousSelect
    }
  }, [dragging])

  const handleSelect = useCallback((id: string) => {
    setActiveChatId(id)
    setChatOpen(true)
    setHistoryOpen(false)
  }, [])

  const closeHistory = useCallback(() => setHistoryOpen(false), [])

  const handleNew = useCallback(async () => {
    setActiveChatId(null)
    setChatOpen(true)
    setHistoryOpen(false)
    setCreateError(null)
    setCreatingChat(true)

    try {
      const token = await getAuthToken()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) headers.Authorization = `Bearer ${token}`

      const response = await fetch('/api/ai/chats', {
        method: 'POST',
        headers,
      })

      if (!response.ok) throw new Error(`Create chat failed: ${response.status}`)

      const data = (await response.json()) as {
        chat?: { recordId?: string }
      }

      if (data.chat?.recordId) setActiveChatId(data.chat.recordId)
    } catch (error) {
      console.error('[careerforge] create chat failed:', error)
      setCreateError(error instanceof Error ? error.message : 'Failed to create chat')
    } finally {
      setCreatingChat(false)
    }
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    setActionError(null)

    try {
      const token = await getAuthToken()
      const headers: Record<string, string> = {}
      if (token) headers.Authorization = `Bearer ${token}`

      const response = await fetch(`/api/ai/chats/${id}`, {
        method: 'DELETE',
        headers,
      })

      if (!response.ok) throw new Error(`Delete failed: ${response.status}`)
      setActiveChatId((current) => (current === id ? null : current))
    } catch (error) {
      console.error('[careerforge] delete failed:', error)
      setActionError(
        error instanceof Error
          ? `Couldn't delete chat: ${error.message}`
          : "Couldn't delete chat",
      )
    }
  }, [])

  const handleRename = useCallback(async (id: string, title: string) => {
    setActionError(null)

    try {
      const token = await getAuthToken()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) headers.Authorization = `Bearer ${token}`

      const response = await fetch(`/api/ai/chats/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ title }),
      })

      if (!response.ok) throw new Error(`Rename failed: ${response.status}`)
    } catch (error) {
      console.error('[careerforge] rename failed:', error)
      setActionError(
        error instanceof Error
          ? `Couldn't rename chat: ${error.message}`
          : "Couldn't rename chat",
      )
    }
  }, [])

  async function analyzeResume() {
    const selected = attachments.find(
      (record) => record.recordId === selectedResume,
    )

    if (!selected) {
      setAnalysisError('Please select a PDF résumé first.')
      return
    }

    setAnalyzing(true)
    setAnalysisStage('downloading')
    setAnalysisError(null)
    setChatOpen(true)
    setHistoryOpen(false)

    try {
      const response = await readFile(selected.data.fileKey)

      if (!response.ok) {
        throw new Error(`Could not download résumé: ${response.status}`)
      }

      const blob = await response.blob()
      setAnalysisStage('extracting')

      const resumeText = (await extractPdfText(blob))
        .replace(/\s+/g, ' ')
        .trim()

      if (!resumeText) {
        throw new Error(
          'No selectable text was found. This may be a scanned PDF. Please upload a text-based PDF.',
        )
      }

      if (resumeText.length < 150) {
        throw new Error(
          'Very little text could be extracted. Please check that your PDF contains readable résumé text.',
        )
      }

      const limitedText = resumeText.slice(0, 60000)
      const wasTruncated = resumeText.length > 60000

      const prompt = `You are CareerForge, a careful and evidence-based professional résumé reviewer.

You have been given the extracted text of an actual uploaded résumé.

IMPORTANT RULES:
- Base your review on the résumé text provided below.
- Do not invent employers, dates, job duties, education, skills, projects, achievements, or qualifications.
- Do not assume information is missing if it may simply be written differently.
- Distinguish confirmed facts from suggestions and uncertainties.
- When identifying a strength or weakness, cite the exact résumé section, employer, skill, or wording that supports your observation.
- If a detail cannot be verified from the résumé, explicitly say so.
- Do not claim to have evaluated visual formatting from extracted text alone.
- Do not rewrite the entire résumé unless asked.
- Give practical recommendations appropriate for a college student and job seeker.

REVIEW THE RÉSUMÉ IN THESE SECTIONS:

1. Overall assessment
Explain what the résumé currently communicates and which roles it appears best suited for.

2. Strong points
Identify specific strengths. For each one, explain what evidence in the résumé supports it.

3. Weak points and missing information
Identify unclear wording, missing details, gaps, and inconsistencies. Do not label something missing unless it is genuinely absent from the extracted text.

4. Skills and experience identified
List the actual technical skills, tools, coursework, projects, work responsibilities, and qualifications found in the résumé. Separate confirmed information from information that needs clarification.

5. Specific wording improvements
Show the original wording and a stronger suggested version. Never add an achievement, number, or responsibility that the original does not support.

6. Formatting and organization
Discuss structure and readability only to the extent that the extracted text allows. Clearly state when visual formatting cannot be assessed from extracted text.

7. Recommended changes
Give the five most important improvements in priority order.

8. Career direction
Evaluate these two possible directions separately:
- Quality control and medical-device manufacturing.
- Computer science and software development.

Explain which résumé evidence supports each direction and what additional information would strengthen each version.

9. Questions for the résumé owner
Ask only questions needed to clarify uncertain dates, responsibilities, achievements, skills, or education. Do not guess the answers.

Before finishing, check that every factual observation is supported by the supplied résumé text.

PDF filename: ${selected.data.fileName}
Extracted text length: ${resumeText.length} characters.
${wasTruncated ? 'Note: The extracted text exceeded 60,000 characters and was shortened for this review.' : ''}

--- BEGIN EXTRACTED RÉSUMÉ TEXT ---
${limitedText}
--- END EXTRACTED RÉSUMÉ TEXT ---`

      setExternalMessage({
        id: `resume-analysis-${Date.now()}`,
        content: prompt,
      })
      setAnalysisStage('sent')
    } catch (error) {
      console.error('[careerforge] résumé analysis failed:', error)
      setAnalysisStage('idle')
      setAnalysisError(
        error instanceof Error
          ? error.message
          : 'Could not analyze this résumé.',
      )
    } finally {
      setAnalyzing(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (!isSignedIn || !userId) {
    return (
      <>
        <div className="flex h-full items-center justify-center px-4">
          <div className="max-w-md space-y-4 text-center">
            <h2 className="text-xl font-semibold text-foreground">
              Sign in to use CareerForge
            </h2>
            <p className="text-sm text-muted-foreground">
              Sign in to analyze your résumé and practice interviews.
            </p>
            <button
              onClick={() => setShowAuth(true)}
              className="rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Sign in
            </button>
          </div>
        </div>
        {showAuth && <AuthOverlay onClose={() => setShowAuth(false)} />}
      </>
    )
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col gap-3 overflow-y-auto bg-[#F8F7FC] p-3 md:flex-row md:overflow-hidden md:p-4">
      <div className="flex min-h-[420px] min-w-0 flex-1 items-center justify-center overflow-y-auto rounded-2xl border border-[#EAE7F2] bg-white p-4 shadow-sm sm:p-6 md:h-full md:p-8">
        <div className="w-full max-w-2xl space-y-6">
          <div className="space-y-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0EBFA] text-[#6046A5]">
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              CareerForge
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Improve your résumé with AI-powered feedback. Select a résumé you've
              uploaded and get practical suggestions to strengthen your application.
            </p>
          </div>

          <div className="rounded-2xl border border-[#EAE7F2] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-[#25213A]">
                Résumé Analyzer
              </h2>
            </div>

            {attachments.length === 0 ? (
              <div className="space-y-3 rounded-lg border border-dashed border-border p-5 text-center">
                <p className="text-sm text-muted-foreground">
                  You haven't uploaded a PDF résumé yet.
                </p>
                <a
                  href="/attachments"
                  className="inline-flex rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Upload a résumé
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                <label
                  htmlFor="resume-select"
                  className="block text-sm font-medium text-foreground"
                >
                  Choose your résumé
                </label>

                <select
                  id="resume-select"
                  value={selectedResume}
                  onChange={(event) => {
                    setSelectedResume(event.target.value)
                    setAnalysisError(null)
                    setAnalysisStage('idle')
                  }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Select a PDF file...</option>
                  {attachments.map((record) => (
                    <option key={record.recordId} value={record.recordId}>
                      {record.data.fileName}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => void analyzeResume()}
                  disabled={!selectedResume || analyzing}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {analysisStage === 'extracting'
                        ? 'Extracting PDF text...'
                        : 'Downloading résumé...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Analyze my résumé
                    </>
                  )}
                </button>

                <p className="text-xs leading-relaxed text-muted-foreground">
                  Your PDF is downloaded, its selectable text is extracted, and
                  that text is sent to the AI assistant for feedback.
                </p>

                {analysisStage === 'downloading' && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="flex items-center gap-2 rounded-lg border border-[#EAE7F2] bg-[#F8F7FC] p-3 text-sm text-[#6046A5]"
                  >
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    Downloading your résumé...
                  </div>
                )}

                {analysisStage === 'extracting' && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="flex items-center gap-2 rounded-lg border border-[#EAE7F2] bg-[#F8F7FC] p-3 text-sm text-[#6046A5]"
                  >
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    Reading the PDF and extracting its text...
                  </div>
                )}

                {analysisStage === 'sent' && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
                  >
                    Résumé text sent to the AI chat. Your review will appear in
                    the conversation panel.
                  </div>
                )}
              </div>
            )}

            {analysisError && (
              <div
                role="alert"
                className="mt-3 space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              >
                <p>{analysisError}</p>
                <button
                  type="button"
                  onClick={() => void analyzeResume()}
                  disabled={!selectedResume || analyzing}
                  className="rounded-md border border-destructive/30 px-3 py-1.5 text-xs font-semibold hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Try again
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground">
                Résumé feedback
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Identify strengths, gaps, and ways to improve your résumé.
              </p>
            </div>

            <div className="rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground">
                AI career assistant
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Ask follow-up questions about your résumé and job applications.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={chatCardRef}
        style={{
          width: chatOpen ? undefined : 0,
          marginLeft: chatOpen ? 0 : -8,
          transition: dragging
            ? 'none'
            : `width 220ms ${EASE}, margin-left 220ms ${EASE}`,
          '--chat-panel-width': `${chatWidth}px`,
        } as React.CSSProperties}
        className={`relative h-[min(70vh,680px)] w-full shrink-0 md:h-full md:w-[var(--chat-panel-width)] ${
          chatOpen ? 'block' : 'hidden md:block'
        }`}
      >
        {chatOpen && (
          <div className="hidden md:block">
            <ResizeHandle
              onStart={() => setDragging(true)}
              dragging={dragging}
            />
          </div>
        )}

        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 md:inset-y-0 md:right-0 md:left-auto md:w-[var(--chat-panel-width)]">
            <ChatPanel
              chatId={activeChatId}
              userId={userId}
              onChatCreated={setActiveChatId}
              disabled={creatingChat}
              externalMessage={externalMessage}
              className="!bg-transparent"
              compact
              header={
                <>
                  <ChatHeaderBar
                    chatId={activeChatId}
                    title={activeTitle}
                    onRename={handleRename}
                    onNew={handleNew}
                    onHistory={() => setHistoryOpen(true)}
                  />

                  {createError && (
                    <ErrorBanner
                      message={createError}
                      onRetry={() => void handleNew()}
                      onDismiss={() => setCreateError(null)}
                    />
                  )}

                  {actionError && (
                    <ErrorBanner
                      message={actionError}
                      onDismiss={() => setActionError(null)}
                    />
                  )}
                </>
              }
            />
          </div>
        </div>
      </div>

      <ChatHistoryOverlay
        open={historyOpen}
        chats={chats}
        activeChatId={activeChatId}
        onClose={closeHistory}
        onSelect={handleSelect}
        onDelete={handleDelete}
      />

      <PanelToggleButton
        open={chatOpen}
        onClick={() => setChatOpen((value) => !value)}
      />
    </div>
  )
}

function ErrorBanner({
  message,
  onRetry,
  onDismiss,
}: {
  message: string
  onRetry?: () => void
  onDismiss: () => void
}) {
  return (
    <div
      role="alert"
      className="mx-4 mb-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
    >
      <div className="flex items-start gap-2">
        <span className="flex-1 leading-relaxed">{message}</span>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md border border-destructive/30 px-2 py-0.5 text-[12px] font-medium hover:bg-destructive/10"
          >
            Retry
          </button>
        )}

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="rounded-md px-1 text-[14px] leading-none hover:bg-destructive/10"
        >
          ×
        </button>
      </div>
    </div>
  )
}

function ChatHeaderBar({
  chatId,
  title,
  onRename,
  onNew,
  onHistory,
}: {
  chatId: string | null
  title: string
  onRename: (id: string, title: string) => Promise<void>
  onNew: () => void
  onHistory: () => void
}) {
  return (
    <div className="flex h-11 shrink-0 items-center gap-1 pl-2 pr-12">
      <div className="min-w-0 flex-1">
        <ChatTitleBar chatId={chatId} title={title} onRename={onRename} />
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <HeaderIconButton label="New chat" onClick={onNew}>
          <Plus className="h-3.5 w-3.5" />
        </HeaderIconButton>

        <HeaderIconButton label="History" onClick={onHistory}>
          <History className="h-3.5 w-3.5" />
        </HeaderIconButton>
      </div>
    </div>
  )
}

function HeaderIconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  )
}

function ChatHistoryOverlay({
  open,
  chats,
  activeChatId,
  onClose,
  onSelect,
  onDelete,
}: {
  open: boolean
  chats: Array<{
    recordId: string
    data: ChatRow
    createdAt?: string
    updatedAt?: string
  }>
  activeChatId: string | null
  onClose: () => void
  onSelect: (id: string) => void
  onDelete: (id: string) => Promise<void>
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    const previousFocus = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('keydown', onKey)
      previousFocus?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="absolute inset-2 z-40 flex justify-end" onClick={onClose}>
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(270deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.35) 35%, rgba(0,0,0,0.15) 100%)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Chat history"
        onClick={(event) => event.stopPropagation()}
        className="relative flex h-full w-full max-w-[320px] flex-col rounded-2xl border border-border/40 bg-background/95"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div className="flex shrink-0 items-center justify-between px-4 py-3">
          <span className="text-[12px] font-semibold tracking-wide text-foreground">
            History
          </span>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close history"
            className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-foreground hover:bg-muted"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
          {chats.length === 0 ? (
            <div className="text-[12px] text-muted-foreground">
              No previous conversations.
            </div>
          ) : (
            chats.map((chat) => (
              <ChatHistoryRow
                key={chat.recordId}
                title={chat.data.title}
                timestamp={formatRelative(chat.updatedAt ?? chat.createdAt)}
                active={chat.recordId === activeChatId}
                onSelect={() => onSelect(chat.recordId)}
                onDelete={() => void onDelete(chat.recordId)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function ChatHistoryRow({
  title,
  timestamp,
  active,
  onSelect,
  onDelete,
}: {
  title?: string
  timestamp: string
  active: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const display = (title ?? '').trim() || 'Untitled'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
      className={`group relative flex w-full shrink-0 cursor-pointer flex-col rounded-lg border border-transparent px-3 py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-foreground/20 ${
        active
          ? 'border-border/60 bg-muted'
          : 'hover:border-border hover:bg-muted/60'
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`min-w-0 flex-1 truncate text-[12px] ${
            active
              ? 'font-semibold text-foreground'
              : 'font-medium text-foreground/90'
          }`}
        >
          {display}
        </span>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onDelete()
          }}
          aria-label={`Delete ${display}`}
          tabIndex={-1}
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 opacity-0 transition-all group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {timestamp && (
        <span className="mt-0.5 text-[10px] tabular-nums text-foreground/60">
          {timestamp}
        </span>
      )}
    </div>
  )
}

function PanelToggleButton({
  open,
  onClick,
}: {
  open: boolean
  onClick: () => void
}) {
  const label = open ? 'Close assistant' : 'Open assistant'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="absolute z-30 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      style={{ right: 16, top: 16 }}
    >
      {open ? (
        <PanelRightClose className="h-3.5 w-3.5" />
      ) : (
        <PanelRightOpen className="h-3.5 w-3.5" />
      )}
    </button>
  )
}

function ChatTitleBar({
  chatId,
  title,
  onRename,
}: {
  chatId: string | null
  title: string
  onRename: (id: string, title: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setDraft(title)
  }, [title, editing])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function commit() {
    if (!editing) return
    setEditing(false)
    const next = draft.trim()
    if (chatId && next && next !== title) void onRename(chatId, next)
    else setDraft(title)
  }

  if (!chatId) {
    return (
      <div className="flex h-9 min-w-0 items-center px-2 text-[13px] text-muted-foreground">
        {title}
      </div>
    )
  }

  if (editing) {
    return (
      <div className="flex h-9 min-w-0 items-center px-2">
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit()
            }
            if (event.key === 'Escape') {
              setDraft(title)
              setEditing(false)
            }
          }}
          className="block w-full bg-transparent text-[13px] font-medium text-foreground outline-none"
        />
      </div>
    )
  }

  return (
    <div className="flex h-9 min-w-0 items-center px-2">
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="Rename chat"
        className="group inline-flex min-w-0 max-w-full cursor-pointer items-center gap-1.5"
      >
        <span className="min-w-0 truncate text-[13px] font-medium text-foreground/85">
          {title}
        </span>
        <Pencil className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
      </button>
    </div>
  )
}

function ResizeHandle({
  onStart,
  dragging,
}: {
  onStart: () => void
  dragging: boolean
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onMouseDown={(event) => {
        event.preventDefault()
        onStart()
      }}
      className="group absolute -left-2 top-0 z-20 h-full w-2 cursor-col-resize"
    >
      <span
        className={`pointer-events-none absolute inset-y-2 left-1/2 w-px -translate-x-1/2 transition-colors ${
          dragging ? 'bg-primary' : 'bg-transparent group-hover:bg-border'
        }`}
      />
    </div>
  )
}