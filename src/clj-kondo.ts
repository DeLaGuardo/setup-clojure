import * as core from '@actions/core'
import * as http from '@actions/http-client'
import * as os from 'os'
import * as tc from '@actions/tool-cache'

export const identifier = 'clj-kondo'

export async function getLatestCljKondo(githubAuth?: string): Promise<string> {
  const client = new http.HttpClient('actions/setup-clj-kondo', undefined, {
    allowRetries: true,
    maxRetries: 1
  })

  const res = await client.getJson<{tag_name: string}>(
    `https://api.github.com/repos/clj-kondo/clj-kondo/releases/latest`,
    githubAuth ? {Authorization: githubAuth} : undefined
  )

  const result = res.result?.tag_name?.replace(/^v/, '')
  if (result) {
    return result
  }

  throw new Error(`Can't obtain latest clj-kondo version`)
}

export function getArtifactName(version: string): string {
  const platform = os.platform()
  const arch = os.arch() === 'arm64' ? 'aarch64' : 'amd64'
  
  switch (platform) {
    case 'win32':
      return `clj-kondo-${version}-windows-${arch}.zip`
    case 'darwin':
      return `clj-kondo-${version}-macos-${arch}.zip`
    default:
      return `clj-kondo-${version}-linux-${arch}.zip`
  }
}

export function getArtifactUrl(version: string): string {
  const archiveName = getArtifactName(version)
  return `https://github.com/clj-kondo/clj-kondo/releases/download/v${version}/${archiveName}`
}

export async function setup(
  version: string,
  githubAuth?: string
): Promise<void> {
  const ver =
    version === 'latest' ? await getLatestCljKondo(githubAuth) : version

  let toolDir = tc.find(identifier, ver)
  if (!toolDir) {
    const archiveUrl = getArtifactUrl(ver)
    core.info(`Downloading: ${archiveUrl}`)

    const artifactFile = await tc.downloadTool(
      archiveUrl,
      undefined,
      githubAuth
    )

    const extractedDir = await tc.extractZip(artifactFile)
    toolDir = await tc.cacheDir(extractedDir, identifier, ver)
    core.info(`Caching directory: ${toolDir}`)
  } else {
    core.info(`Using cached directory: ${toolDir}`)
  }

  core.addPath(toolDir)
}
