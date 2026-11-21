
import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AuthOverlay, useAuthProfileReady, signOut } from 'deepspace'
import { ChevronDown, LogOut, Menu, X } from 'lucide-react'
import type { Role } from '../constants'
import { nav } from '../nav'
import { cn } from '../lib/utils'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui'

export default function Navigation() {
  const { isLoaded, isSignedIn, user, userLoading } = useAuthProfileReady({
    requireUser: true,
  })

  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const profileReady = !isSignedIn || (!userLoading && !!user)
  const userRole = (user?.role ?? 'anonymous') as Role | 'anonymous'

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const visibleNav = nav.filter((item) => {
    if (item.devOnly && !import.meta.env.DEV) return false
    if (!item.roles) return true
    if (!profileReady) return false
    if (userRole === 'admin') return true
    return item.roles.includes(userRole as Role)
  })

  const navLink = (item: (typeof nav)[number]) => {
    const active =
      item.path === '/home'
        ? location.pathname === '/home'
        : location.pathname.startsWith(item.path)

    return (
      <Link
        key={item.path}
        to={item.path}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'rounded-xl px-4 py-2.5 text-sm transition duration-200',
          active
            ? 'bg-[#F0EAFE] font-bold text-[#6046A5]'
            : 'font-semibold text-[#625D70] hover:bg-[#F7F5FB] hover:text-[#6046A5]',
        )}
      >
        {item.label}
      </Link>
    )
  }

  return (
    <>
      <nav
        data-testid="app-navigation"
        className="sticky top-0 z-40 border-b border-[#EAE7F2] bg-white/95 shadow-sm backdrop-blur-md"
      >
        <div className="mx-auto flex h-[76px] max-w-7xl items-center gap-5 px-5 md:px-8">

          {/* BRAND */}
          <Link
            to="/home"
            className="shrink-0 text-sm font-extrabold tracking-tight text-[#25213A]"
          >
            CareerForge
          </Link>

          {/* DESKTOP NAVIGATION */}
          <div className="hidden flex-1 items-center gap-2 md:flex">
            {visibleNav.map(navLink)}
          </div>

          <div className="flex-1 md:hidden" />

          {/* ACCOUNT LOADING */}
          {!isLoaded ? null : isSignedIn && !profileReady ? (
            <div className="flex items-center gap-2 rounded-full border border-[#EAE7F2] bg-white py-1 pl-1 pr-2.5">
              <div className="h-7 w-7 animate-pulse rounded-full bg-[#F0EAFE]" />
              <div className="hidden h-4 w-20 animate-pulse rounded-md bg-[#F0EAFE] sm:block" />
            </div>
          ) : isSignedIn && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    aria-label="Account menu"
                    className="group flex items-center gap-2 rounded-full border border-[#EAE7F2] bg-white py-1 pl-1 pr-2.5 text-sm transition hover:bg-[#F7F5FB]"
                  >
                    <Avatar className="h-8 w-8 ring-1 ring-inset ring-[#EAE7F2]">
                      <AvatarImage
                        src={user.imageUrl ?? undefined}
                        referrerPolicy="no-referrer"
                      />
                      <AvatarFallback className="bg-[#F0EAFE] text-[11px] font-bold text-[#6046A5]">
                        {(user.name?.[0] ?? user.email?.[0] ?? '?').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <span
                      data-testid="nav-user-name"
                      className="hidden max-w-[140px] truncate font-semibold text-[#25213A] sm:inline"
                    >
                      {user.name || user.email}
                    </span>

                    <ChevronDown
                      className="h-3.5 w-3.5 text-[#8B849B] transition-transform duration-150 group-data-[popup-open]:rotate-180"
                      aria-hidden
                    />
                  </button>
                }
              />

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="truncate font-medium text-foreground">
                    {user.name || 'Signed in'}
                  </div>
                  <div
                    data-testid="nav-user-email"
                    className="truncate text-xs font-normal text-muted-foreground"
                  >
                    {user.email}
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut aria-hidden />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              data-testid="nav-sign-in-button"
              onClick={() => setShowAuthModal(true)}
              className="rounded-xl bg-[#6046A5] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#493477]"
            >
              Sign in
            </button>
          )}

          {/* MOBILE MENU BUTTON */}
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#625D70] transition hover:bg-[#F0EAFE] hover:text-[#6046A5] md:hidden"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden />
            ) : (
              <Menu className="h-5 w-5" aria-hidden />
            )}
          </button>
        </div>

        {/* MOBILE NAVIGATION */}
        {mobileMenuOpen && (
          <div className="flex flex-col gap-1 border-t border-[#EAE7F2] bg-white px-5 py-3 md:hidden">
            {visibleNav.map(navLink)}
          </div>
        )}
      </nav>

      {showAuthModal && (
        <AuthOverlay onClose={() => setShowAuthModal(false)} />
      )}
    </>
  )
}
