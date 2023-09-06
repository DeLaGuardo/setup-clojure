import * as core from '@actions/core'
import * as io from '@actions/io'
import * as tc from '@actions/tool-cache'
import * as exec from '@actions/exec'
import * as http from '@actions/http-client'
import * as path from 'path'
import * as os from 'os'
import * as fs from './fs'
import * as utils from './utils'

export const identifier = 'ClojureToolsDeps'

const client = new http.HttpClient('actions/setup-clojure', undefined, {
  allowRetries: true,
  maxRetries: 1
})

async function toolVersion(
  version: string,
  githubAuth?: string
): Promise<string> {
  if (version === 'latest') {
    const res = await client.getJson<{tag_name: string}>(
      'https://api.github.com/repos/clojure/brew-install/releases/latest',
      githubAuth ? {Authorization: githubAuth} : undefined
    )
    const versionString = res.result?.tag_name
    if (versionString) {
      return versionString
    }

    throw new Error(`Can't obtain latest Clojure CLI version`)
  } else {
    return version
  }
}

async function getUrls(
  tag: string,
  githubAuth?: string
): Promise<{posix?: string; linux: string; windows: string}> {
  const res = await client.getJson<{
    assets: {browser_download_url: string}[]
  }>(
    `https://api.github.com/repos/clojure/brew-install/releases/tags/${tag}`,
    githubAuth ? {Authorization: githubAuth} : undefined
  )

  const assets = res.result?.assets
  if (assets) {
    return {
      posix: `https://github.com/clojure/brew-install/releases/download/${tag}/posix-install.sh`,
      linux: `https://github.com/clojure/brew-install/releases/download/${tag}/linux-install.sh`,
      windows: `github.com/clojure/brew-install/releases/download/${tag}/win-install.ps1`
    }
  } else {
    return {
      linux: `https://download.clojure.org/install/linux-install-${tag}.sh`,
      windows: `download.clojure.org/install/win-install-${tag}.ps1`
    }
  }
}

export async function setup(
  requestedVersion: string,
  githubToken?: string
): Promise<void> {
  const version = await toolVersion(requestedVersion, githubToken)
  const installDir = utils.isWindows()
    ? 'C:\\Program Files\\WindowsPowerShell\\Modules'
    : '/tmp/usr/local/opt'
  const toolPath = tc.find(
    identifier,
    utils.getCacheVersionString(version),
    os.arch()
  )

  if (toolPath) {
    core.info(`Clojure CLI found in cache ${toolPath}`)
    await fs.mkdir(installDir, {recursive: true})
    await fs.cp(toolPath, path.join(installDir, 'ClojureTools'), {
      recursive: true
    })
  } else {
    const {linux, posix, windows} = await getUrls(version, githubToken)

    if (utils.isWindows()) {
      await exec.exec(`powershell -c "iwr -useb ${windows} | iex"`, [], {
        // Install to a modules location common to powershell/pwsh
        env: {PSModulePath: installDir},
        input: Buffer.from('1')
      })

      core.debug(
        `clojure tools deps installed to ${path.join(
          installDir,
          'ClojureTools'
        )}`
      )
      await tc.cacheDir(
        path.join(installDir, 'ClojureTools'),
        identifier,
        utils.getCacheVersionString(version)
      )
    } else {
      let clojureInstallScript

      if (utils.isMacOS()) {
        if (posix) {
          clojureInstallScript = await tc.downloadTool(
            posix,
            undefined,
            githubToken
          )
        } else {
          clojureInstallScript = await tc.downloadTool(
            linux,
            undefined,
            githubToken
          )
          await MacOSDeps(clojureInstallScript, githubToken)
        }
      } else {
        clojureInstallScript = await tc.downloadTool(
          linux,
          undefined,
          githubToken
        )
      }

      const clojureToolsDir = await runLinuxInstall(
        clojureInstallScript,
        path.join(installDir, 'ClojureTools')
      )
      core.debug(`clojure tools deps installed to ${clojureToolsDir}`)
      await tc.cacheDir(
        clojureToolsDir,
        identifier,
        utils.getCacheVersionString(version)
      )
    }
  }

  core.exportVariable(
    'CLOJURE_INSTALL_DIR',
    path.join(installDir, 'ClojureTools')
  )
  if (!utils.isWindows()) {
    core.addPath(path.join(installDir, 'ClojureTools', 'bin'))
  }
}

async function runLinuxInstall(
  installScript: string,
  destinationFolder: string
): Promise<string> {
  await io.mkdirP(destinationFolder)

  const file = path.normalize(installScript)
  await exec.exec('bash', [file, '--prefix', destinationFolder])

  return destinationFolder
}

async function MacOSDeps(file: string, githubToken?: string): Promise<void> {
  const data = await fs.readFile(file, 'utf-8')
  const newValue = data.replace(
    /install -D/gim,
    '$(brew --prefix coreutils)/bin/ginstall -D'
  )
  await fs.writeFile(file, newValue, 'utf-8')
  const env = githubToken
    ? {env: {HOMEBREW_GITHUB_API_TOKEN: githubToken}}
    : undefined
  await exec.exec('brew', ['install', 'coreutils'], env)
}

export async function getLatestDepsClj(githubAuth?: string): Promise<string> {
  const res = await client.getJson<{tag_name: string}>(
    `https://api.github.com/repos/borkdude/deps.clj/releases/latest`,
    githubAuth ? {Authorization: githubAuth} : undefined
  )

  const result = res.result?.tag_name?.replace(/^v/, '')
  if (result) {
    return result
  }

  throw new Error(`Can't obtain latest deps.clj version`)
}
