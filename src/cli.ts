import * as core from '@actions/core'
import * as io from '@actions/io'
import * as tc from '@actions/tool-cache'
import * as exec from '@actions/exec'
import * as http from '@actions/http-client'
import * as path from 'path'
import * as os from 'os'
import * as fs from './fs'
import * as utils from './utils'
import * as crypto from 'crypto'

export const identifier = 'ClojureToolsDeps'

const client = new http.HttpClient('actions/setup-clojure', undefined, {
  allowRetries: true,
  maxRetries: 1
})

async function toolVersion(
  version: string,
  githubAuth?: string
): Promise<string> {
  core.debug('=== Check tool version')
  if (version === 'latest') {
    const url = utils.isWindows()
      ? 'https://api.github.com/repos/casselc/clj-msi/releases/latest'
      : 'https://api.github.com/repos/clojure/brew-install/releases/latest'
    const res = await client.getJson<{tag_name: string}>(
      url,
      githubAuth ? {Authorization: githubAuth} : {}
    )
    const versionString = res.result?.tag_name
    if (versionString) {
      return versionString.replace(/^v/, '')
    }

    throw new Error(`Can't obtain latest Clojure CLI version`)
  } else {
    return version
  }
}

function isResourceProvided(
  target: string,
  assets: {browser_download_url: string}[]
): boolean {
  for (const asset of assets) {
    if (asset.browser_download_url === target) {
      return true
    }
  }
  return false
}

async function getUrls(
  tag: string,
  githubAuth?: string
): Promise<{posix?: string; linux: string; windows: string}> {
  core.debug('=== Get download URLs')
  const res = await client.getJson<{
    assets: {browser_download_url: string}[]
  }>(
    `https://api.github.com/repos/clojure/brew-install/releases/tags/${tag}`,
    githubAuth
      ? {
          Authorization: githubAuth
        }
      : {}
  )
  const posix_install_url = `https://github.com/clojure/brew-install/releases/download/${tag}/posix-install.sh`

  const assets = res.result?.assets
  if (assets && isResourceProvided(posix_install_url, assets)) {
    return {
      posix: posix_install_url,
      linux: `https://github.com/clojure/brew-install/releases/download/${tag}/linux-install.sh`,
      windows: `https://github.com/casselc/clj-msi/releases/tag/v${tag}/clojure-${tag}.msi`
    }
  } else {
    return {
      linux: `https://download.clojure.org/install/linux-install-${tag}.sh`,
      windows: `https://github.com/casselc/clj-msi/releases/tag/v${tag}/clojure-${tag}.msi`
    }
  }
}

export async function setup(
  requestedVersion: string,
  githubToken: string,
  githubAuthToken?: string
): Promise<void> {
  const version = await toolVersion(requestedVersion, githubAuthToken)
  const installDir = utils.isWindows() ? 'C:\\tools' : '/tmp/usr/local/opt'
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
    const {linux, posix, windows} = await getUrls(version, githubAuthToken)

    const url = utils.isMacOS()
      ? posix || linux
      : utils.isWindows()
        ? windows
        : linux

    const installerFileName = url.split(/\//).pop() || ''
    const outputDir = path.join(utils.getTempDir(), crypto.randomUUID())
    const outputFile = path.join(outputDir, installerFileName)

    let clojureInstallScript
    if (utils.isWindows()) {
      await exec.exec(
        'gh',
        [
          'release',
          '-R',
          'casselc/clj-msi',
          'download',
          `v${version}`,
          '-D',
          `${outputDir}`
        ],
        {
          env: {GH_TOKEN: githubToken}
        }
      )
      clojureInstallScript = path.join(outputDir, `clojure-${version}.msi`)
    } else {
      clojureInstallScript = await tc.downloadTool(url, outputFile, githubToken)
    }

    core.debug(
      `Finish downloading of installation script to ${clojureInstallScript}`
    )

    if (utils.isMacOS() && !posix) {
      await MacOSDeps(clojureInstallScript, githubToken)
    }

    const clojureToolsDir = utils.isWindows()
      ? await runWindowsInstall(
          clojureInstallScript,
          path.join(installDir, 'ClojureTools'),
          githubToken
        )
      : await runLinuxInstall(
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

  core.exportVariable(
    'CLOJURE_INSTALL_DIR',
    path.join(installDir, 'ClojureTools')
  )
  if (utils.isWindows()) {
    core.addPath(path.join(installDir, 'ClojureTools'))
  } else {
    core.addPath(path.join(installDir, 'ClojureTools', 'bin'))
  }
}

async function runLinuxInstall(
  installScript: string,
  destinationFolder: string
): Promise<string> {
  core.debug('=== Install on Linux')
  await io.mkdirP(destinationFolder)

  const file = path.normalize(installScript)
  await exec.exec('bash', [file, '--prefix', destinationFolder])

  return destinationFolder
}

async function runWindowsInstall(
  installScript: string,
  destinationFolder: string,
  githubAuth: string
): Promise<string> {
  core.debug('=== Install on Windows')
  await io.mkdirP(destinationFolder)

  core.debug(`installing from ${installScript} to ${destinationFolder}`)
  await exec.getExecOutput(
    'msiexec',
    [
      '/i',
      `"${installScript}"`,
      '/qn',
      `APPLICATIONFOLDER="${destinationFolder}"`
    ],
    {
      env: {GH_TOKEN: githubAuth},
      windowsVerbatimArguments: true
    }
  )

  return destinationFolder
}

async function MacOSDeps(file: string, githubAuth: string): Promise<void> {
  core.debug('=== Install extra deps for MacOS')
  const data = await fs.readFile(file, 'utf-8')
  const newValue = data.replace(
    /install -D/gim,
    '$(brew --prefix coreutils)/bin/ginstall -D'
  )
  await fs.writeFile(file, newValue, 'utf-8')
  await exec.exec('brew', ['install', 'coreutils'], {
    env: {
      HOMEBREW_GITHUB_API_TOKEN: githubAuth,
      HOMEBREW_NO_INSTALL_CLEANUP: 'true',
      HOME: process.env['HOME'] || ''
    }
  })
}

export async function getLatestDepsClj(githubAuth: string): Promise<string> {
  core.debug('=== Fetch latest version of deps clj')
  const res = await client.getJson<{tag_name: string}>(
    `https://api.github.com/repos/borkdude/deps.clj/releases/latest`,
    {Authorization: githubAuth}
  )

  const result = res.result?.tag_name?.replace(/^v/, '')
  if (result) {
    return result
  }

  throw new Error(`Can't obtain latest deps.clj version`)
}
