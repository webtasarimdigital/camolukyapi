import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_ROUTES = ["/login", "/teklif-onizleme"];

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://placeholder-url.supabase.co";

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "placeholder-anon-key";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  // Login olmayan kullanıcı → login'e yönlendir
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Login olmuş kullanıcı login'e girerse → rolüne göre yönlendir
  if (user && pathname === "/login") {
    const role = request.cookies.get("app_active_role")?.value;
    const url = request.nextUrl.clone();
    if (role === "depo" || role === "sofor") {
      url.pathname = "/sevkiyat";
    } else if (role === "tali_bayi" || role === "bayi") {
      url.pathname = "/urunler";
    } else if (role === "satis") {
      url.pathname = "/teklifler";
    } else {
      url.pathname = "/dashboard";
    }
    return NextResponse.redirect(url);
  }

  // Rol bazlı sayfa koruması (Sunucu seviyesinde anında yönlendirme)
  if (user && !pathname.startsWith("/api") && !pathname.startsWith("/auth")) {
    const role = request.cookies.get("app_active_role")?.value;
    if (role === "depo" || role === "sofor") {
      if (!pathname.startsWith("/sevkiyat") && pathname !== "/login") {
        const url = request.nextUrl.clone();
        url.pathname = "/sevkiyat";
        return NextResponse.redirect(url);
      }
    } else if (role === "tali_bayi" || role === "bayi") {
      const allowedBayi = ["/urunler", "/stok", "/portallar"];
      const isAllowed = allowedBayi.some((r) => pathname.startsWith(r)) && !pathname.startsWith("/urunler/yeni");
      if (!isAllowed && pathname !== "/login") {
        const url = request.nextUrl.clone();
        url.pathname = "/urunler";
        return NextResponse.redirect(url);
      }
    } else if (role === "satis") {
      const allowedSatis = [
        "/teklif",
        "/teklifler",
        "/satis",
        "/satislar",
        "/sevkiyat",
        "/musteriler",
        "/urunler",
        "/stok",
        "/arama",
      ];
      const isAllowed = allowedSatis.some((r) => pathname.startsWith(r));
      if (!isAllowed && pathname !== "/login") {
        const url = request.nextUrl.clone();
        url.pathname = "/teklifler";
        return NextResponse.redirect(url);
      }
    } else if (role === "muhasebe1") {
      const forbiddenMuhasebe1 = [
        "/personel",
        "/kiralar",
        "/ortak-cari",
        "/finans",
        "/raporlar",
        "/kullanicilar",
        "/ayarlar",
        "/audit",
      ];
      if (forbiddenMuhasebe1.some((prefix) => pathname.startsWith(prefix))) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
