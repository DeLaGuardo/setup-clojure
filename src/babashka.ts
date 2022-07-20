import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as http from '@actions/http-client'

import * as os from 'os'

export const identifier = 'Babashka'

export async function getLatestBabashka(githubAuth?: string): Promise<string> {
  const client = new http.HttpClient('actions/setup-clojure', undefined, {
    allowRetries: true,
    maxRetries: 3
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
  switch (platform) {
    case 'win32':
      return `babashka-${version}-windows-amd64.zip`
    case 'darwin':
      return `babashka-${version}-macos-amd64.tar.gz`
    default:
      return `babashka-${version}-linux-amd64-static.tar.gz`
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
