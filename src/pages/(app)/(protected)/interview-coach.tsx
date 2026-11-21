
import { useState } from 'react'
import {
  Mic,
  Sparkles,
  MessageSquare,
  Loader2,
} from 'lucide-react'
import { useAuth, AuthOverlay, getAuthToken } from 'deepspace'
import { ChatPanel } from '../../../components/ChatPanel'

interface ExternalMessage {
  id: string
  content: string
}

export default function InterviewCoachPage() {
  const { isLoaded, isSignedIn, userId } = useAuth()

  const [showAuth, setShowAuth] = useState(false)
  const [jobTitle, setJobTitle] = useState('')
  const [company, setCompany] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [interviewType, setInterviewType] = useState('Both')
  const [creatingChat, setCreatingChat] = useState(false)
  const [chatId, setChatId] = useState<string | null>(null)
  const [externalMessage, setExternalMessage] =
    useState<ExternalMessage | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function startInterview() {
    if (!jobTitle.trim()) {
      setError('Please enter the job title.')
      return
    }

    setCreatingChat(true)
    setError(null)

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

      if (!response.ok) {
        throw new Error(`Could not create interview: ${response.status}`)
      }

      const data = await response.json() as {
        chat?: { recordId?: string }
      }

      const newChatId = data.chat?.recordId

      if (!newChatId) {
        throw new Error('The new chat ID was not returned.')
      }

      setChatId(newChatId)

      const prompt = `You are CareerForge Interview Coach, a professional and supportive interview coach.

INTERVIEW DETAILS
Job title: ${jobTitle.trim()}
Company: ${company.trim() || 'Not specified'}
Interview type: ${interviewType}
Job description:
${jobDescription.trim() || 'Not provided'}

YOUR INSTRUCTIONS
1. Conduct a realistic mock interview tailored to the supplied job title and job description.
2. Ask one question at a time. Do not show all questions at once.
3. Include relevant general, behavioral, and technical questions when appropriate for the role.
4. Do not invent company-specific facts or claim knowledge that was not provided.
5. Wait for the candidate's answer before evaluating it.
6. After each answer, provide:
   - Strengths: what the candidate did well.
   - Improvements: what could be clearer or stronger.
   - Example: a stronger sample answer, without inventing personal experience or achievements.
7. Ask the next interview question after the feedback.
8. Be encouraging, professional, realistic, and constructive.
9. If the candidate does not know an answer, explain the relevant concept and help them learn.
10. Keep the interview focused on the selected role.

Begin by briefly welcoming the candidate and asking the first interview question. Do not provide the answer to the question before the candidate responds.`

      setExternalMessage({
        id: `interview-${Date.now()}`,
        content: prompt,
      })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not start the interview.',
      )
    } finally {
      setCreatingChat(false)
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
              Sign in to use Interview Coach
            </h2>

            <p className="text-sm text-muted-foreground">
              Practice interviews and receive personalized feedback.
            </p>

            <button
              onClick={() => setShowAuth(true)}
              className="rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground"
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
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-[#F8F7FC] px-4 py-4 sm:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4">
        {/* PAGE HEADING */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600 ring-1 ring-emerald-200/70 shadow-sm">
            <Mic className="h-5 w-5" strokeWidth={1.75} />
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Interview Coach
            </h1>

            <p className="text-sm text-muted-foreground">
              Practice interviews and improve your answers with AI feedback.
            </p>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
          {/* INTERVIEW SETUP */}
          <section className="h-fit space-y-3 rounded-2xl border border-[#EAE7F2] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#6046A5]" />

              <h2 className="text-lg font-semibold text-[#25213A]">
                Interview Setup
              </h2>
            </div>

            <div className="space-y-2">
              <label htmlFor="job-title" className="text-sm font-medium">
                Job title *
              </label>

              <input
                id="job-title"
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value)}
                placeholder="e.g. Software Engineering Intern"
                className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="company" className="text-sm font-medium">
                Company (optional)
              </label>

              <input
                id="company"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                placeholder="e.g. Microsoft"
                className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="interview-type" className="text-sm font-medium">
                Interview type
              </label>

              <select
                id="interview-type"
                value={interviewType}
                onChange={(event) => setInterviewType(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option>Both</option>
                <option>Behavioral</option>
                <option>Technical</option>
                <option>General</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="job-description" className="text-sm font-medium">
                Job description (optional)
              </label>

              <textarea
                id="job-description"
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Paste the job description to get more relevant questions..."
                rows={3}
                className="w-full resize-y rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={() => void startInterview()}
              disabled={creatingChat || !jobTitle.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creatingChat ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting interview...
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4" />
                  Start Interview
                </>
              )}
            </button>

            <p className="text-xs leading-relaxed text-muted-foreground">
              Your coach will ask one question at a time and give feedback after
              each answer.
            </p>
          </section>

          {/* INTERVIEW CONVERSATION */}
          <section className="flex min-h-[500px] flex-col overflow-hidden rounded-2xl border border-[#EAE7F2] bg-white shadow-sm">
            {chatId ? (
              <ChatPanel
                chatId={chatId}
                userId={userId}
                onChatCreated={setChatId}
                disabled={creatingChat}
                externalMessage={externalMessage}
                className="!bg-transparent"
                compact
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0EBFA] text-[#6046A5]">
                  <MessageSquare className="h-7 w-7" />
                </div>

                <h2 className="text-lg font-semibold text-[#25213A]">
                  Ready to practice?
                </h2>

                <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Enter a job title and select Start Interview. Your AI coach
                  will begin with a tailored interview question.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
