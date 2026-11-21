
import { Link } from 'react-router-dom'
import { useAuth, useQuery } from 'deepspace'
import {
  ArrowRight,
  FileText,
  Target,
  Mic,
  Sparkles,
  ShieldCheck,
  ChartNoAxesCombined,
  CheckCircle2,
} from 'lucide-react'

type Attachment = {
  fileName: string
  fileKey: string
  mimeType: string
  fileSize: number
  ownerId: string
}

const cardStyle =
  'group flex flex-col rounded-2xl border border-purple-950/[0.06] bg-white p-6 shadow-[0_2px_10px_-3px_rgba(32,18,77,0.06)] transition-all duration-200 hover:border-purple-300/80 hover:shadow-[0_8px_24px_-6px_rgba(96,70,165,0.14)] hover:-translate-y-0.5'

const commitmentCardStyle =
  'rounded-xl border border-purple-950/[0.06] bg-white p-5 shadow-[0_2px_10px_-3px_rgba(32,18,77,0.06)] transition-all duration-200 hover:border-purple-300/80 hover:shadow-[0_8px_24px_-6px_rgba(96,70,165,0.14)] hover:-translate-y-0.5'

export default function HomePage() {
  const { isLoaded, isSignedIn, userId } = useAuth()

  const { records } = useQuery<Attachment>('attachments', {
    where: { ownerId: userId ?? '__none__' },
    orderBy: 'createdAt',
    orderDir: 'desc',
    limit: 100,
  })

  const hasResume = Boolean(
    isSignedIn &&
      records?.some(
        (record) => record.data.mimeType === 'application/pdf'
      )
  )

  const firstName = 'Muhammad Nadeem'

  return (
    <div
      className="min-h-screen bg-[#F8F7FC] text-[#25213A]"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at top, rgba(96, 70, 165, 0.07), transparent 60%)',
      }}
    >
      {/* TOP BRAND HEADER */}
      <header className="sticky top-0 z-40 border-b border-[#EAE7F2] bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 md:px-8">
          <Link to="/home" className="flex shrink-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6046A5] to-[#493477] text-white shadow-md shadow-purple-200">
              <Sparkles size={22} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-[#25213A]">
                Career<span className="text-[#6046A5]">Forge</span>
              </h1>
              <p className="text-[10px] font-bold tracking-[0.18em] text-[#8B849B]">
                BUILD YOUR FUTURE
              </p>
            </div>
          </Link>

          {/* USER PROFILE */}
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-[#25213A]">
                {isSignedIn ? firstName : 'Your account'}
              </p>
              <p className="text-[11px] text-[#8B849B]">
                Career workspace
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#E9E2F8] bg-gradient-to-br from-[#F0EAFE] to-[#E5D9FA] text-sm font-extrabold text-[#6046A5] shadow-sm">
              M
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-9 md:px-8 md:py-11">
        {/* WELCOME SECTION */}
        <section className="mb-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#7658B5]">
            Your personal career workspace
          </p>

          <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            Welcome back, {firstName}!
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500 md:text-base">
            Take the next step toward your career goals. Analyze your résumé,
            discover opportunities, and prepare for your next interview.
          </p>
        </section>

        {/* HERO BANNER */}
        <section className="relative isolate mb-11 overflow-hidden rounded-3xl bg-gradient-to-br from-[#493477] via-[#6046A5] to-[#8064C5] p-7 text-white shadow-xl ring-1 ring-inset ring-white/15 md:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.14),transparent_55%)]" />
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-32 right-1/4 h-72 w-72 rounded-full border border-white/10" />

          <div className="relative grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            {/* HERO LEFT */}
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-purple-100">
                <Sparkles size={13} className="text-[#FBBF24]" />
                YOUR CAREER JOURNEY STARTS HERE
              </span>

              <h3 className="mt-5 max-w-xl text-3xl font-extrabold leading-tight tracking-tight text-white md:text-4xl">
                Turn your experience into your next opportunity.
              </h3>

              <p className="mt-4 max-w-lg text-sm leading-7 text-purple-100">
                Understand your strengths, improve your résumé, and build
                confidence for your next career move.
              </p>

              <Link
                to="/assistant"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#493477] shadow-md shadow-black/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-purple-50 hover:shadow-lg"
              >
                Start Résumé Scan
                <ArrowRight size={17} />
              </Link>

              <p className="mt-4 text-xs text-purple-200">
                Three steps. One stronger career.
              </p>
            </div>

            {/* HERO RIGHT: PROGRESS TRACKER */}
            <div className="rounded-2xl border border-white/15 bg-white/10 p-5 shadow-lg shadow-black/10 backdrop-blur-sm ring-1 ring-inset ring-white/10 md:p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">Your career roadmap</p>
                  <p className="mt-1 text-xs text-purple-200">
                    Three steps toward your next opportunity
                  </p>
                </div>
                <div className="rounded-xl bg-[#F59E0B]/20 p-2 text-[#FBBF24]">
                  <Target size={21} />
                </div>
              </div>

              <div className="space-y-3">
                {/* STEP 1: UPLOAD RÉSUMÉ */}
                <Link
                  to="/attachments"
                  className={`group -mx-2.5 flex items-center gap-4 rounded-xl p-2.5 ring-1 ring-inset transition-all duration-200 ${
                    hasResume
                      ? 'bg-emerald-400/10 ring-emerald-300/30 hover:bg-emerald-400/15'
                      : 'bg-white/10 ring-white/15 hover:bg-white/15'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${
                      hasResume ? 'bg-emerald-500' : 'bg-[#F59E0B]'
                    }`}
                  >
                    <FileText size={19} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      01. Upload résumé
                    </p>
                    <p className="mt-1 text-xs text-purple-200">
                      {hasResume
                        ? 'Your résumé has been uploaded'
                        : 'Review your experience and skills'}
                    </p>
                  </div>

                  {hasResume ? (
                    <CheckCircle2
                      size={21}
                      strokeWidth={2.5}
                      className="shrink-0 rounded-full bg-emerald-400/20 p-0.5 text-emerald-200"
                      aria-label="Résumé uploaded"
                    />
                  ) : (
                    <ArrowRight
                      size={17}
                      className="shrink-0 text-purple-200 transition group-hover:translate-x-1"
                    />
                  )}
                </Link>

                <div className="ml-5 h-4 border-l border-dashed border-white/40" />

                {/* STEP 2 */}
                <Link
                  to="/job-matcher"
                  className="group -mx-2.5 flex items-center gap-4 rounded-xl p-2.5 transition-all duration-200 hover:bg-white/10"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/10 text-white">
                    <Target size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">02. Match with jobs</p>
                    <p className="mt-1 text-xs text-purple-200">
                      Discover relevant opportunities
                    </p>
                  </div>
                  <ArrowRight size={17} className="shrink-0 text-purple-200 transition group-hover:translate-x-1" />
                </Link>

                <div className="ml-5 h-4 border-l border-dashed border-white/40" />

                {/* STEP 3 */}
                <Link
                  to="/interview-coach"
                  className="group -mx-2.5 flex items-center gap-4 rounded-xl p-2.5 transition-all duration-200 hover:bg-white/10"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/10 text-white">
                    <Mic size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">03. Practice interview</p>
                    <p className="mt-1 text-xs text-purple-200">
                      Prepare for your next opportunity
                    </p>
                  </div>
                  <ArrowRight size={17} className="shrink-0 text-purple-200 transition group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CAREER TOOLS */}
        <section className="mb-11">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-xl font-extrabold tracking-tight">
                Career tools
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Everything you need to prepare for your next opportunity.
              </p>
            </div>
            <span className="rounded-full bg-[#F0EAFE] px-3 py-1 text-xs font-semibold text-[#6046A5]">
              3 tools
            </span>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {/* RÉSUMÉ ANALYZER */}
            <Link to="/assistant" className={cardStyle}>
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 text-[#6046A5] ring-1 ring-purple-200/70 shadow-sm transition group-hover:shadow-md">
                <FileText className="h-5 w-5" strokeWidth={1.75} />
              </div>

              <h4 className="text-lg font-bold">Résumé Analyzer</h4>

              <p className="mt-2 flex-1 text-sm leading-6 text-gray-500">
                Upload your résumé and discover strengths, weaknesses,
                and opportunities for improvement.
              </p>

              <div className="mt-6 flex items-center justify-between border-t border-[#F0EDF6] pt-4">
                <span className="text-sm font-bold text-[#6046A5]">
                  Analyze Résumé
                </span>
                <ArrowRight size={18} className="text-[#6046A5] transition group-hover:translate-x-1" />
              </div>
            </Link>

            {/* JOB MATCHER */}
            <Link to="/job-matcher" className={cardStyle}>
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 ring-1 ring-blue-200/70 shadow-sm transition group-hover:shadow-md">
                <Target className="h-5 w-5" strokeWidth={1.75} />
              </div>

              <h4 className="text-lg font-bold">Job Matcher</h4>

              <p className="mt-2 flex-1 text-sm leading-6 text-gray-500">
                Compare your résumé with a job description and identify
                matching and missing skills.
              </p>

              <div className="mt-6 flex items-center justify-between border-t border-[#F0EDF6] pt-4">
                <span className="text-sm font-bold text-[#3474B5]">
                  Find Job Matches
                </span>
                <ArrowRight size={18} className="text-[#3474B5] transition group-hover:translate-x-1" />
              </div>
            </Link>

            {/* INTERVIEW COACH */}
            <Link to="/interview-coach" className={cardStyle}>
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600 ring-1 ring-emerald-200/70 shadow-sm transition group-hover:shadow-md">
                <Mic className="h-5 w-5" strokeWidth={1.75} />
              </div>

              <h4 className="text-lg font-bold">Interview Coach</h4>

              <p className="mt-2 flex-1 text-sm leading-6 text-gray-500">
                Practice interview questions and receive structured feedback on your answers.
              </p>

              <div className="mt-6 flex items-center justify-between border-t border-[#F0EDF6] pt-4">
                <span className="text-sm font-bold text-[#288454]">
                  Start Practicing
                </span>
                <ArrowRight size={18} className="text-[#288454] transition group-hover:translate-x-1" />
              </div>
            </Link>
          </div>
        </section>

        {/* HOW CAREERFORGE KEEPS YOUR ADVICE HONEST */}
        <section className="mt-8 rounded-2xl border border-purple-950/[0.06] bg-white p-6 shadow-[0_2px_10px_-3px_rgba(32,18,77,0.06)] md:p-8">
          <div className="mb-7 max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#F0EAFE] px-3 py-1.5 text-xs font-bold text-[#6046A5]">
              <ShieldCheck size={14} />
              OUR COMMITMENT
            </div>

            <h3 className="text-xl font-extrabold tracking-tight md:text-2xl">
              How CareerForge Keeps Your Advice Honest
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Career guidance should be useful, realistic, and based on the
              information you actually provide.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {/* POINT 1 */}
            <div className={commitmentCardStyle}>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAE2FA] text-[#6046A5]">
                <FileText size={22} />
              </div>

              <h4 className="font-bold text-[#25213A]">
                Based on your real information
              </h4>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Career advice uses the résumé and details you provide.
              </p>
            </div>

            {/* POINT 2 */}
            <div className={commitmentCardStyle}>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#E1F1E8] text-[#288454]">
                <ShieldCheck size={22} />
              </div>

              <h4 className="font-bold text-[#25213A]">
                Never invents skills or experience
              </h4>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Your career history stays authentic. Missing experience is
                not presented as something you have.
              </p>
            </div>

            {/* POINT 3 */}
            <div className={commitmentCardStyle}>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#DFECFA] text-[#3474B5]">
                <ChartNoAxesCombined size={22} />
              </div>

              <h4 className="font-bold text-[#25213A]">
                Scores are estimates, not hiring predictions
              </h4>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Matching scores offer guidance, not a guarantee of interviews
                or job offers.
              </p>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="py-8 text-center text-xs text-gray-400">
          <span className="font-semibold text-[#6046A5]">CareerForge</span>
          {' '}· Build your future with confidence.
        </footer>
      </main>
    </div>
  )
}
