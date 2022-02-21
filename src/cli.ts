import * as core from '@actions/core'
import * as io from '@actions/io'
import * as tc from '@actions/tool-cache'
import * as exec from '@actions/exec'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
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
  fs.readFile(file, 'utf-8', function (err, data) {
    if (err) throw err

    const newValue = data.replace(
      /install -D/gim,
      '$(brew --prefix coreutils)/bin/ginstall -D'
    )

    fs.writeFile(file, newValue, 'utf-8', function (e) {
      if (e) throw e
    })
  })
  const env = githubToken
    ? {env: {HOMEBREW_GITHUB_API_TOKEN: githubToken}}
    : undefined
  await exec.exec('brew', ['install', 'coreutils'], env)
}

export async function setupWindows(version: string): Promise<void> {
  const url = `download.clojure.org/install/win-install${
    version === 'latest' ? '' : `-${version}`
  }.ps1`
  exec.exec(`powershell -c "iwr -useb ${url} | iex"`, [], {
    input: Buffer.from('1')
  })
}
