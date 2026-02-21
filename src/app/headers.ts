import { RouteMiddleware } from "rwsdk/router";

export const setCommonHeaders =
  (): RouteMiddleware =>
  ({ response, rw: { nonce } }) => {
    if (!import.meta.env.VITE_IS_DEV_SERVER) {
      // Forces browsers to always use HTTPS for a specified time period (2 years)
      response.headers.set(
        "Strict-Transport-Security",
        "max-age=63072000; includeSubDomains; preload",
      );
    }

    // Forces browser to use the declared content-type instead of trying to guess/sniff it
    response.headers.set("X-Content-Type-Options", "nosniff");

    // Stops browsers from sending the referring webpage URL in HTTP headers
    response.headers.set("Referrer-Policy", "no-referrer");

    // Explicitly disables access to specific browser features/APIs
    response.headers.set(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=()",
    );

    // Belt-and-suspenders clickjacking protection — older browsers ignore CSP frame-ancestors
    // and rely on this header instead. Both must be set for full coverage.
    response.headers.set("X-Frame-Options", "SAMEORIGIN");

    // Defines trusted sources for content loading and script execution.
    // Notes on intentional directives:
    //   'unsafe-eval'    — kept for rwsdk module loading compatibility; do not remove without testing
    //   'unsafe-inline'  — kept in style-src; rwsdk framework may inject style tags at runtime;
    //                       React style={{}} props are applied via the DOM API and are NOT blocked by CSP
    //   frame-ancestors  — belt-and-suspenders with X-Frame-Options above
    response.headers.set(
      "Content-Security-Policy",
      `default-src 'self'; script-src 'self' 'unsafe-eval' 'nonce-${nonce}' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; frame-ancestors 'self'; frame-src 'self' https://challenges.cloudflare.com; object-src 'none';`,
    );
  };
