import * as core from '@actions/core'
import * as io from '@actions/io'
import * as tc from '@actions/tool-cache'
import * as exec from '@actions/exec'
import * as http from '@actions/http-client'
import * as path from 'path'
import * as os from 'os'
import * as fs from './fs'
import * as utils from './utils'

export async function setup(
  version: string,
  githubToken?: string
): Promise<void> {
  let toolPath = tc.find(
    'ClojureToolsDeps',
    utils.getCacheVersionString(version),
    os.arch()
  )

  if (toolPath && version !== 'latest') {
    core.info(`Clojure CLI found in cache ${toolPath}`)
  } else {
    const tempDir: string = path.join(
      utils.getTempDir(),
      `temp_${Math.floor(Math.random() * 2000000000)}`
    )
    const clojureInstallScript = await tc.downloadTool(
      `https://download.clojure.org/install/linux-install${
        version === 'latest' ? '' : `-${version}`
      }.sh`
    )

    if (utils.isMacOS()) {
      await MacOSDeps(clojureInstallScript, githubToken)
    }

    const clojureToolsDir = await runLinuxInstall(clojureInstallScript, tempDir)
    core.debug(`clojure tools deps installed to ${clojureToolsDir}`)
    toolPath = await tc.cacheDir(
      clojureToolsDir,
      'ClojureToolsDeps',
      utils.getCacheVersionString(version)
    )
  }

  const installDir = path.join(toolPath, 'lib', 'clojure')
  core.exportVariable('CLOJURE_INSTALL_DIR', installDir)
  core.addPath(path.join(toolPath, 'bin'))
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
  const client = new http.HttpClient('actions/setup-clojure', undefined, {
    allowRetries: true,
    maxRetries: 3
  })

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

export async function setupWindows(
  version: string,
  cmdExeWorkaround: string,
  githubAuth?: string
): Promise<void> {
  if (cmdExeWorkaround) {
    let depsCljVersion = cmdExeWorkaround
    if (depsCljVersion === 'latest') {
      depsCljVersion = await getLatestDepsClj(githubAuth)
    }
    let clojureExePath = tc.find('deps.clj', depsCljVersion)
    if (!clojureExePath) {
      const archiveUrl = `https://github.com/borkdude/deps.clj/releases/download/v${depsCljVersion}/deps.clj-${depsCljVersion}-windows-amd64.zip`
      core.info(`archiveUrl = ${archiveUrl}`)

      const archivePath = await tc.downloadTool(
        archiveUrl,
        undefined,
        githubAuth
      )
      core.info(`archivePath = ${archivePath}`)

      const depsExePath = await tc.extractZip(archivePath)
      const depsExe = path.join(depsExePath, 'deps.exe')
      core.info(`depsExe = ${depsExe}`)

      clojureExePath = await tc.cacheFile(
        depsExe,
        'clojure.exe',
        'deps.clj',
        depsCljVersion
      )
      core.info(`clojureExePath = ${clojureExePath}`)

      const clojureExe = path.join(clojureExePath, 'clojure.exe')
      await fs.chmod(clojureExe, '0755')
    }

    core.addPath(clojureExePath)
    return
  }

  const url = `download.clojure.org/install/win-install${
    version === 'latest' ? '' : `-${version}`
  }.ps1`
  await exec.exec(`powershell -c "iwr -useb ${url} | iex"`, [], {
    input: Buffer.from('1')
  })
}
