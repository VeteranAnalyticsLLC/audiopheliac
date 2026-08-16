import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_NAME = "The Audiopheliac";
const host = import.meta.env.VITE_PUBLIC_HOSTNAME;
const assetBase = import.meta.env.BASE_URL || "/";
const ogImage = host
  ? `https://${host}${assetBase}og.jpg`.replace(/([^:]\/)\/+/g, "$1")
  : undefined;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "The Audiopheliac Kit — turn a Casio Privia PX-870 into a drum machine. USB-MIDI, pads, sequencer, WAV and GM MIDI for Ableton, Audacity, and Suno.",
      },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      { name: "theme-color", content: "#0A0A0B" },
      { name: "twitter:card", content: "summary_large_image" },
      ...(ogImage
        ? [
            { property: "og:image", content: ogImage },
            { property: "og:image:width", content: "1200" },
            { property: "og:image:height", content: "630" },
          ]
        : []),
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: `${assetBase}favicon.svg` },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: `${assetBase}__grok/manifest.webmanifest` },
      { rel: "apple-touch-icon", href: `${assetBase}__grok/icon-180.png` },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&family=Unica+One&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="en" className="dark antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-bg text-fg">
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              classNames: {
                toast: "bg-raised text-fg border-border",
              },
            }}
          />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
