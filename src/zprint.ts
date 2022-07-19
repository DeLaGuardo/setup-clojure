import * as core from '@actions/core'
import * as http from '@actions/http-client'
import * as os from 'os'
import * as tc from '@actions/tool-cache'
import * as fs from './fs'

export const identifier = 'zprint'

export async function getLatestZprint(githubAuth?: string): Promise<string> {
  const client = new http.HttpClient('actions/setup-zprint', undefined, {
    allowRetries: true,
    maxRetries: 3
  })

  const res = await client.getJson<{tag_name: string}>(
    `https://api.github.com/repos/kkinnear/zprint/releases/latest`,
    githubAuth ? {Authorization: githubAuth} : undefined
  )

  const result = res.result?.tag_name?.replace(/^v/, '')
  if (result) {
    return result
  }

  throw new Error(`Can't obtain latest zprint version`)
}

export function getArtifactName(version: string): string {
  const platform = os.platform()
  switch (platform) {
    case 'win32':
      return `zprint-filter-${version}`
    case 'darwin':
      return `zprintm-${version}`
    default:
      return `zprintl-${version}`
  }
}

export function getArtifactUrl(version: string): string {
  const archiveName = getArtifactName(version)
  return `https://github.com/kkinnear/zprint/releases/download/${version}/${archiveName}`
}

export async function setup(
  version: string,
  githubAuth?: string
): Promise<void> {
  const ver = version === 'latest' ? await getLatestZprint(githubAuth) : version

  let toolDir = tc.find(identifier, ver)
  if (!toolDir) {
    const archiveUrl = getArtifactUrl(ver)
    core.info(`Artifact: ${archiveUrl}`)

    const artifactFile = await tc.downloadTool(
      archiveUrl,
      undefined,
      githubAuth
    )

    await fs.chmod(artifactFile, '0755')

    toolDir = await tc.cacheFile(artifactFile, identifier, 'zprint', ver)
    core.info(`Saved: ${toolDir}`)
  } else {
    core.info(`Cached: ${toolDir}`)
  }

  core.addPath(toolDir)
}
