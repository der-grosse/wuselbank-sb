import { app, net, protocol } from 'electron'
import { promises as fs } from 'fs'
import { basename, extname, join } from 'path'
import { pathToFileURL } from 'url'
import type { AdLists } from '../shared/ads'

// Custom scheme used to serve ad images from the on-disk ads folder to the
// renderer (the renderer can't read the filesystem directly). URLs look like
// `ad://top/banner.png` / `ad://side/promo.jpg`.
const AD_SCHEME = 'ad'

const AD_CATEGORIES = ['top', 'side'] as const
type AdCategory = (typeof AD_CATEGORIES)[number]

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg'])

/**
 * Location of the ads folder. Kept outside the asar archive so images can be
 * added/removed while the app runs (dev: project root, packaged: resources).
 */
function getAdsDir(): string {
  return app.isPackaged ? join(process.resourcesPath, 'ads') : join(app.getAppPath(), 'ads')
}

/** Must run before `app.whenReady()` so the scheme can serve images securely. */
export function registerAdSchemePrivileged(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: AD_SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
    }
  ])
}

/** Wire up the `ad://` protocol to stream files from the ads folder. */
export function handleAdProtocol(): void {
  protocol.handle(AD_SCHEME, (request) => {
    const url = new URL(request.url)
    const category = url.hostname
    // `basename` strips any path so a filename can't escape the category folder.
    const file = basename(decodeURIComponent(url.pathname))

    if (!isAdCategory(category) || !file) {
      return new Response('Not found', { status: 404 })
    }

    const filePath = join(getAdsDir(), category, file)
    return net.fetch(pathToFileURL(filePath).toString())
  })
}

function isAdCategory(value: string): value is AdCategory {
  return (AD_CATEGORIES as readonly string[]).includes(value)
}

/** List the image files in one category as ready-to-use `ad://` URLs. */
async function listCategory(category: AdCategory): Promise<string[]> {
  try {
    const entries = await fs.readdir(join(getAdsDir(), category), { withFileTypes: true })
    return entries
      .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase()))
      .map((entry) => entry.name)
      .sort()
      .map((name) => `${AD_SCHEME}://${category}/${encodeURIComponent(name)}`)
  } catch {
    // Folder missing or unreadable -> no ads for this placement.
    return []
  }
}

/** Current ads available in each placement. */
export async function listAds(): Promise<AdLists> {
  const [top, side] = await Promise.all([listCategory('top'), listCategory('side')])
  return { top, side }
}
