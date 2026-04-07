import Link from "next/link";
import Image from "next/image";
import { getSession } from "@/lib/auth-session";
import { SiteHeaderNav } from "@/components/site-header-nav";
import { SITE_LOGO_PUBLIC_PATH, siteLogoExists } from "@/lib/site-logo";

export async function SiteHeader() {
  const session = await getSession();
  const hasLogo = siteLogoExists();

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-[var(--card)]/92 backdrop-blur-md dark:border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className={
            hasLogo
              ? "inline-flex min-h-14 shrink-0 items-center self-start sm:min-h-[4.5rem]"
              : "shrink-0 font-[family-name:var(--font-display)] text-lg font-medium tracking-tight text-ink sm:text-xl"
          }
          aria-label="Le pote d'un pote — accueil"
        >
          {hasLogo ? (
            <Image
              src={SITE_LOGO_PUBLIC_PATH}
              alt="Le pote d'un pote"
              width={400}
              height={96}
              className="h-14 w-auto max-h-14 max-w-[min(100%,22rem)] object-contain object-left sm:h-[4.5rem] sm:max-h-[4.5rem] sm:max-w-[26rem]"
              priority
            />
          ) : (
            <>Le pote d&apos;un pote</>
          )}
        </Link>

        <SiteHeaderNav isLoggedIn={session != null} />
      </div>
    </header>
  );
}
