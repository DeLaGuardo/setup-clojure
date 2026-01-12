import * as core from '@actions/core'
import * as http from '@actions/http-client'
import * as os from 'os'
import * as tc from '@actions/tool-cache'

export const identifier = 'cljstyle'

export async function getLatestCljstyle(githubAuth?: string): Promise<string> {
  const client = new http.HttpClient('actions/setup-clojure', undefined, {
    allowRetries: true,
    maxRetries: 1
  })

  const res = await client.getJson<{tag_name: string}>(
    `https://api.github.com/repos/greglook/cljstyle/releases/latest`,
    githubAuth ? {Authorization: githubAuth} : undefined
  )

  const result = res.result?.tag_name?.replace(/^v/, '')
  if (result) {
    return result
  }

  throw new Error(`Can't obtain latest cljstyle version`)
}

export function getArtifactName(version: string): string {
  const [major, minor] = version.split('.').map(n => parseInt(n))
  const platform = os.platform()
  const arch = os.arch() === 'arm64' ? 'arm64' : 'amd64'

  if (major > 0 || minor > 15) {
    switch (platform) {
      case 'darwin':
        return `cljstyle_${version}_macos_${arch}.zip`
      default:
        return `cljstyle_${version}_linux_${arch}.zip`
    }
  } else {
    if (arch !== 'amd64') {
      throw new Error('This cljstyle version only supports x86-64 architecture.')
    }
    switch (platform) {
      case 'darwin':
        return `cljstyle_${version}_macos.tar.gz`
      default:
        return `cljstyle_${version}_linux.tar.gz`
    }
  }
}

export function getArtifactUrl(version: string): string {
  const archiveName = getArtifactName(version)
  return `https://github.com/greglook/cljstyle/releases/download/${version}/${archiveName}`
}

export async function setup(
  version: string,
  githubAuth?: string
): Promise<void> {
  const ver =
    version === 'latest' ? await getLatestCljstyle(githubAuth) : version

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
