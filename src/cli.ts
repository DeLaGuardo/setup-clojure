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
  maxRetries: 3
})

async function toolVersion(version: string): Promise<string> {
  if (version === 'latest') {
    const res = await client.get(
      'https://download.clojure.org/install/stable.properties'
    )
    const versionString = await res.readBody()
    return versionString.split(' ')[0]
  } else {
    return version
  }
}

export async function setup(
  requestedVersion: string,
  githubToken?: string
): Promise<void> {
  const version = await toolVersion(requestedVersion)
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
    if (utils.isWindows()) {
      const url = `download.clojure.org/install/win-install-${version}.ps1`

      await exec.exec(`powershell -c "iwr -useb ${url} | iex"`, [], {
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
      const clojureInstallScript = await tc.downloadTool(
        `https://download.clojure.org/install/linux-install-${version}.sh`
      )

      if (utils.isMacOS()) {
        await MacOSDeps(clojureInstallScript, githubToken)
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
