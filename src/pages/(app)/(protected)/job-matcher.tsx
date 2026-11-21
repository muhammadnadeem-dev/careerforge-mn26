
import { useMemo, useState } from 'react'
import {
  FileText,
  Sparkles,
  Target,
  Loader2,
  AlertCircle,
  Upload,
  CheckCircle2,
  File,
} from 'lucide-react'
import { useAuth, useQuery, useR2Files } from 'deepspace'
import { ChatPanel } from '../../../components/ChatPanel'

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

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Size unavailable'

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function JobMatcherPage() {
  const { userId } = useAuth()
  const { readFile } = useR2Files()

  const { records } = useQuery<Attachment>('attachments', {
    where: { ownerId: userId ?? '__none__' },
    orderBy: 'createdAt',
    orderDir: 'desc',
    limit: 100,
  })

  const resumes = useMemo(
    () =>
      records.filter(
        (record) => record.data.mimeType === 'application/pdf',
      ),
    [records],
  )

  const [selectedResume, setSelectedResume] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [matching, setMatching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [externalMessage, setExternalMessage] =
    useState<ExternalMessage | null>(null)

  const selectedResumeRecord = useMemo(
    () => resumes.find((record) => record.recordId === selectedResume),
    [resumes, selectedResume],
  )

  async function matchJob() {
    const selected = resumes.find(
      (record) => record.recordId === selectedResume,
    )

    if (!selected) {
      setError('Please select a résumé first.')
      return
    }

    if (jobDescription.trim().length < 100) {
      setError(
        'Please paste a job description containing at least 100 characters.',
      )
      return
    }

    setMatching(true)
    setError(null)

    try {
      const response = await readFile(selected.data.fileKey)

      if (!response.ok) {
        throw new Error(`Could not download résumé: ${response.status}`)
      }

      const blob = await response.blob()

      const resumeText = (await extractPdfText(blob))
        .replace(/\s+/g, ' ')
        .trim()

      if (!resumeText || resumeText.length < 150) {
        throw new Error(
          'Could not extract enough readable text. Please use a text-based PDF résumé.',
        )
      }

      const prompt = `You are CareerForge Job Matcher, an evidence-based career matching assistant.

Compare the candidate's actual résumé with the job description below.

IMPORTANT RULES:
- Use only information supported by the résumé and job description.
- Never invent skills, experience, qualifications, employers, or achievements.
- Do not treat a missing keyword as proof that the candidate lacks that skill.
- Distinguish confirmed matches from possible transferable skills.
- Explain uncertainty whenever the available information is insufficient.
- Do not guarantee that the candidate will be hired or interviewed.
- Treat the match score as an approximate assessment, not a scientifically validated hiring probability.

PROVIDE YOUR ANALYSIS IN THIS FORMAT:

1. Overall Match Score
Give an estimated score from 0–100 and explain the main reasons behind it.

2. Strong Matches
Identify the candidate's skills, education, projects, and experience that directly match the job requirements. Cite résumé evidence.

3. Partially Matching or Transferable Skills
Identify relevant experience that may transfer to this position. Explain why.

4. Missing or Unverified Requirements
List important job requirements that the résumé does not clearly demonstrate. Do not assume the candidate lacks them.

5. Skills Comparison
Separate required skills into:
- Clearly demonstrated
- Partially demonstrated
- Not demonstrated in the résumé

6. Recommended Résumé Improvements
Suggest truthful wording improvements that better highlight relevant experience. Never invent accomplishments.

7. Interview Preparation
Provide five likely interview questions based on the actual job requirements and the candidate's demonstrated background.

8. Final Recommendation
Explain whether applying appears reasonable and identify the most important areas to strengthen.

RÉSUMÉ:
${resumeText.slice(0, 60000)}

JOB DESCRIPTION:
${jobDescription.trim().slice(0, 20000)}`

      setExternalMessage({
        id: `job-match-${Date.now()}`,
        content: prompt,
      })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not compare this résumé.',
      )
    } finally {
      setMatching(false)
    }
  }

  return (
    <div className="min-h-full overflow-y-auto bg-[#F0ECF8] p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        {/* Page heading */}
        <div className="mb-8">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E7DFF6] text-[#6046A5] shadow-sm">
            <Target className="h-6 w-6" />
          </div>

          <h1 className="text-2xl font-bold text-[#25213A]">
            Job Matcher
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5F5A70]">
            Compare your résumé with a job description and discover how well
            your experience matches the position.
          </p>
        </div>

        <div className="grid items-stretch gap-6 lg:grid-cols-2">
          {/* Résumé selection card */}
          <section className="flex flex-col rounded-2xl border border-[#DCD3EF] bg-white p-6 shadow-[0_4px_16px_-5px_rgba(65,43,112,0.13)]">
            <div className="mb-5 flex items-center gap-3">
              <FileText className="h-5 w-5 text-[#6046A5]" />

              <h2 className="font-semibold text-[#25213A]">
                Your résumé
              </h2>
            </div>

            {resumes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#DCD3EF] bg-[#FAF8FD] p-5 text-center">
                <FileText className="mx-auto mb-3 h-8 w-8 text-[#A69BC0]" />

                <p className="text-sm text-[#5F5A70]">
                  No PDF résumé found in your uploads.
                </p>

                <a
                  href="/attachments"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#6046A5] underline underline-offset-4"
                >
                  <Upload className="h-4 w-4" />
                  Upload a résumé
                </a>
              </div>
            ) : (
              <>
                <label
                  htmlFor="resume-select"
                  className="mb-2 block text-xs font-medium text-[#5F5A70]"
                >
                  Choose an uploaded PDF
                </label>

                <select
                  id="resume-select"
                  value={selectedResume}
                  onChange={(event) => {
                    setSelectedResume(event.target.value)
                    setError(null)
                  }}
                  className="w-full rounded-xl border border-[#DCD3EF] bg-white px-3 py-3 text-sm text-[#25213A] outline-none transition focus:border-[#6046A5] focus:ring-2 focus:ring-[#6046A5]/20"
                >
                  <option value="">Select your résumé...</option>

                  {resumes.map((record) => (
                    <option key={record.recordId} value={record.recordId}>
                      {record.data.fileName}
                    </option>
                  ))}
                </select>

                {selectedResumeRecord ? (
                  <div className="mt-5 rounded-xl border border-[#CFC2E8] bg-[#F1ECFA] p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E2D7F5] text-[#6046A5]">
                        <FileText className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-[#6046A5]">
                            Selected résumé
                          </p>

                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        </div>

                        <p className="mt-1 break-all text-sm font-bold text-[#38265F]">
                          {selectedResumeRecord.data.fileName}
                        </p>

                        <p className="mt-1 text-xs font-medium text-[#62527F]">
                          PDF document ·{' '}
                          {formatFileSize(selectedResumeRecord.data.fileSize)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 border-t border-[#DCD3EF] pt-3">
                      <p className="text-xs leading-5 text-[#5F5A70]">
                        This résumé will be used to identify matching skills,
                        relevant experience, and areas you could strengthen.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-[#CFC2E8] bg-[#F1ECFA] p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E2D7F5] text-[#6046A5]">
                        <FileText className="h-5 w-5" />
                      </div>

                      <div>
                        <p className="text-sm font-bold text-[#38265F]">
                          Your résumé will appear here
                        </p>

                        <p className="mt-1 text-xs font-medium text-[#62527F]">
                          Select a PDF above to see its details.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="mt-auto pt-5">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E5DDF1] bg-[#F7F4FC] p-3">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 shrink-0 text-[#6046A5]" />

                  <div>
                    <p className="text-xs font-semibold text-[#49435D]">
                      Need to upload a new PDF?
                    </p>

                    <p className="mt-0.5 text-[11px] text-[#6B6580]">
                      Manage your résumé files
                    </p>
                  </div>
                </div>

                <a
                  href="/attachments"
                  className="shrink-0 rounded-lg border border-[#DCD3EF] bg-white px-3 py-2 text-xs font-semibold text-[#6046A5] transition hover:bg-[#EEE8F8]"
                >
                  Upload
                </a>
              </div>
            </div>
          </section>

          {/* Job description card */}
          <section className="flex flex-col rounded-2xl border border-[#DCD3EF] bg-white p-6 shadow-[0_4px_16px_-5px_rgba(65,43,112,0.13)]">
            <div className="mb-5 flex items-center gap-3">
              <Target className="h-5 w-5 text-[#6046A5]" />

              <h2 className="font-semibold text-[#25213A]">
                Job description
              </h2>
            </div>

            <label
              htmlFor="job-description"
              className="mb-2 block text-xs font-medium text-[#5F5A70]"
            >
              Paste the job posting
            </label>

            <textarea
              id="job-description"
              value={jobDescription}
              onChange={(event) => {
                setJobDescription(event.target.value)
                if (error) setError(null)
              }}
              placeholder="Paste the job title, role summary, responsibilities, and required skills here. Include the qualifications and experience the employer is looking for."
              rows={9}
              maxLength={20000}
              className="min-h-[230px] w-full flex-1 resize-y rounded-xl border border-[#DCD3EF] bg-white p-3 text-sm leading-6 text-[#25213A] outline-none transition placeholder:text-[#857F96] focus:border-[#6046A5] focus:ring-2 focus:ring-[#6046A5]/20"
            />

            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-xs text-[#6B6580]">
                Minimum 100 characters
              </p>

              <p className="text-right text-xs text-[#6B6580]">
                {jobDescription.length.toLocaleString()} / 20,000 characters
              </p>
            </div>

            <div className="mt-4 rounded-xl border border-[#E5DDF1] bg-[#F7F4FC] p-3">
              <p className="text-xs leading-5 text-[#5F5A70]">
                <span className="font-semibold text-[#6046A5]">
                  Tip:
                </span>{' '}
                Include the required skills and qualifications for a more
                useful comparison.
              </p>
            </div>
          </section>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Match button */}
        <button
          type="button"
          onClick={() => void matchJob()}
          disabled={!selectedResume || !jobDescription.trim() || matching}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#6046A5] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_4px_12px_-3px_rgba(96,70,165,0.35)] transition hover:bg-[#493477] disabled:cursor-not-allowed disabled:!bg-[#6046A5] disabled:!text-white disabled:!opacity-100 disabled:shadow-[0_4px_12px_-3px_rgba(96,70,165,0.35)]"
        >
          {matching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Comparing your résumé...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Match my résumé
            </>
          )}
        </button>

        <p className="mt-3 text-center text-xs text-[#6B6580]">
          {!selectedResume
            ? 'Step 1: choose your résumé above.'
            : jobDescription.trim().length < 100
              ? 'Step 2: paste at least 100 characters of the job description to continue.'
              : 'Your analysis is generated from your uploaded résumé and the job description you provide.'}
        </p>

        {/* AI matching results */}
        {externalMessage && userId && (
          <section className="mt-8 h-[650px] overflow-hidden rounded-2xl border border-[#DCD3EF] bg-white shadow-[0_4px_16px_-5px_rgba(65,43,112,0.13)]">
            <ChatPanel
              chatId={null}
              userId={userId}
              onChatCreated={() => undefined}
              externalMessage={externalMessage}
              className="!bg-transparent"
              compact
            />
          </section>
        )}
      </div>
    </div>
  )
}
