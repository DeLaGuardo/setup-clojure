import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as http from '@actions/http-client'

import * as os from 'os'
import * as fs from 'fs'

export const identifier = 'Babashka'

export function linuxCanRunDynamic(): boolean {
  try {
    // plain alpine has no /lib64, but gcompat shims the glibc loader path
    // onto musl and the dynamic binary still fails there
    if (fs.readdirSync('/lib').some(f => f.startsWith('ld-musl-'))) {
      return false
    }
    // the dynamic binary hardcodes this interpreter
    return fs.existsSync('/lib64/ld-linux-x86-64.so.2')
  } catch {
    return false
  }
}

export async function getLatestBabashka(githubAuth?: string): Promise<string> {
  const client = new http.HttpClient('actions/setup-clojure', undefined, {
    allowRetries: true,
    maxRetries: 1
  })

  const res = await client.getJson<{tag_name: string}>(
    `https://api.github.com/repos/babashka/babashka/releases/latest`,
    githubAuth ? {Authorization: githubAuth} : undefined
  )

  const result = res.result?.tag_name?.replace(/^v/, '')
  if (result) {
    return result
  }

  throw new Error(`Can't obtain latest Babashka version`)
}

export function getArtifactName(version: string): string {
  const platform = os.platform()
  const arch = os.arch() === 'arm64' ? 'aarch64' : 'amd64'

  switch (platform) {
    case 'win32':
      return `babashka-${version}-windows-${arch}.zip`
    case 'darwin':
      return `babashka-${version}-macos-${arch}.tar.gz`
    default:
      // the amd64 dynamic binary links everything statically except glibc,
      // the fully static musl binary stays the fallback for e.g. alpine
      // containers
      if (arch === 'amd64' && linuxCanRunDynamic()) {
        return `babashka-${version}-linux-${arch}.tar.gz`
      }
      return `babashka-${version}-linux-${arch}-static.tar.gz`
  }
}

export function getArtifactUrl(version: string): string {
  const archiveName = getArtifactName(version)
  return `https://github.com/babashka/babashka/releases/download/v${version}/${archiveName}`
}

export async function extract(source: string): Promise<string> {
  return source.endsWith('.zip')
    ? await tc.extractZip(source)
    : await tc.extractTar(source)
}

export async function setup(
  version: string,
  githubAuth?: string
): Promise<void> {
  const ver =
    version === 'latest' ? await getLatestBabashka(githubAuth) : version

  let toolDir = tc.find(identifier, ver)
  if (!toolDir) {
    const archiveUrl = getArtifactUrl(ver)
    const archiveDir = await tc.downloadTool(archiveUrl, undefined, githubAuth)
    toolDir = await extract(archiveDir)
    await tc.cacheDir(toolDir, identifier, ver)
  }

  core.addPath(toolDir)
}
