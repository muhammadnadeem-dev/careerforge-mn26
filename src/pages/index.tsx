
import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { seo } from '../seo'

export default function Landing() {
  return (
    <>
      <Seo {...seo} path="/" />

      <main
        data-testid="static-landing"
        className="flex min-h-screen items-center justify-center bg-[#F7F6FC] px-6 text-[#25213A]"
      >
        <div className="max-w-xl text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            CareerForge
          </h1>

          <p className="mt-4 text-lg text-gray-600">
            Your career, built with confidence.
          </p>

          <p className="mt-3 text-sm text-gray-500">
            Prepare for your next opportunity with AI-powered career tools.
          </p>

          <Link
            to="/home"
            className="mt-8 inline-flex items-center justify-center rounded-xl bg-[#6046A5] px-7 py-3 font-semibold text-white shadow-sm transition hover:bg-[#50388F]"
          >
            Continue to CareerForge
          </Link>
        </div>
      </main>
    </>
  )
}
