import * as core from '@actions/core'
import * as http from '@actions/http-client'
import * as os from 'os'
import * as tc from '@actions/tool-cache'

export const identifier = 'cljfmt'

export async function getLatestCljFmt(githubAuth?: string): Promise<string> {
  const client = new http.HttpClient('actions/setup-cljfmt', undefined, {
    allowRetries: true,
    maxRetries: 1
  })

  const res = await client.getJson<{tag_name: string}>(
    `https://api.github.com/repos/weavejester/cljfmt/releases/latest`,
    githubAuth ? {Authorization: githubAuth} : undefined
  )

  const result = res.result?.tag_name
  if (result) {
    return result
  }

  throw new Error(`Can't obtain latest cljfmt version`)
}

export function getArtifactName(version: string): string {
  const platform = os.platform()
  switch (platform) {
    case 'win32':
      return `cljfmt-${version}-win-amd64.zip`
    case 'darwin':
      return `cljfmt-${version}-darwin-amd64.tar.gz`
    default:
      return `cljfmt-${version}-linux-amd64.tar.gz`
  }
}

export function getArtifactUrl(version: string): string {
  const archiveName = getArtifactName(version)
  return `https://github.com/weavejester/cljfmt/releases/download/${version}/${archiveName}`
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
  const ver = version === 'latest' ? await getLatestCljFmt(githubAuth) : version

  let toolDir = tc.find(identifier, ver)
  if (!toolDir) {
    const archiveUrl = getArtifactUrl(ver)
    core.info(`Downloading: ${archiveUrl}`)

    const artifactFile = await tc.downloadTool(
      archiveUrl,
      undefined,
      githubAuth
    )

    const extractedDir = await extract(artifactFile)
    toolDir = await tc.cacheDir(extractedDir, identifier, ver)
    core.info(`Caching directory: ${toolDir}`)
  } else {
    core.info(`Using cached directory: ${toolDir}`)
  }

  core.addPath(toolDir)
}
