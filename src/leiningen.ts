import * as core from '@actions/core'
import * as io from '@actions/io'
import * as tc from '@actions/tool-cache'
import * as exec from '@actions/exec'
import * as path from 'path'
import * as os from 'os'
import * as fs from './fs'
import * as utils from './utils'

export const identifier = 'Leiningen'

const LEIN_JAR_BASE_URL =
  'https://github.com/technomancy/leiningen/releases/download'

export async function setup(
  version: string,
  githubAuth?: string
): Promise<void> {
  let toolPath = tc.find(
    identifier,
    utils.getCacheVersionString(version),
    os.arch()
  )

  if (toolPath && version !== 'latest') {
    core.info(`Leiningen found in cache ${toolPath}`)
  } else {
    // Resolve 'latest' to actual version number
    const resolvedVersion =
      version === 'latest' ? await getLatestVersion(githubAuth) : version

    const binScripts = []
    if (utils.isWindows()) {
      for (const ext of ['ps1', 'bat']) {
        binScripts.push(
          await tc.downloadTool(
            `https://raw.githubusercontent.com/technomancy/leiningen/${
              version === 'latest' ? 'stable' : version
            }/bin/lein.${ext}`,
            path.join(utils.getTempDir(), `lein.${ext}`),
            githubAuth
          )
        )
      }
    } else {
      binScripts.push(
        await tc.downloadTool(
          `https://raw.githubusercontent.com/technomancy/leiningen/${
            version === 'latest' ? 'stable' : version
          }/bin/lein`,
          path.join(utils.getTempDir(), 'lein'),
          githubAuth
        )
      )
    }

    const jarFileName = `leiningen-${resolvedVersion}-standalone.jar`
    const jarUrl = `${LEIN_JAR_BASE_URL}/${resolvedVersion}/${jarFileName}`
    core.info(`Downloading Leiningen JAR from ${jarUrl}`)

    const jarPath = await tc.downloadTool(
      jarUrl,
      path.join(utils.getTempDir(), jarFileName),
      githubAuth
    )

    const tempDir: string = path.join(
      utils.getTempDir(),
      `temp_${Math.floor(Math.random() * 2000000000)}`
    )
    const leiningenDir = await installLeiningen(
      binScripts,
      jarPath,
      resolvedVersion,
      tempDir
    )
    core.debug(`Leiningen installed to ${leiningenDir}`)
    toolPath = await tc.cacheDir(
      leiningenDir,
      identifier,
      utils.getCacheVersionString(version)
    )
  }

  const leiningenJarPath = await leiningenJar(toolPath)

  if (leiningenJarPath !== null) {
    core.exportVariable('LEIN_JAR', leiningenJarPath)
  }

  core.exportVariable('LEIN_HOME', toolPath)
  core.addPath(path.join(toolPath, 'bin'))
}

async function getLatestVersion(githubAuth?: string): Promise<string> {
  const response = await fetch(
    'https://api.github.com/repos/technomancy/leiningen/releases/latest',
    {
      headers: githubAuth ? {Authorization: githubAuth} : {}
    }
  )
  if (!response.ok) {
    throw new Error(
      `Failed to fetch latest Leiningen version: ${response.statusText}`
    )
  }
  const data = (await response.json()) as {tag_name: string}
  return data.tag_name
}

async function installLeiningen(
  binScripts: string[],
  jarPath: string,
  version: string,
  destinationFolder: string
): Promise<string> {
  await io.mkdirP(destinationFolder)

  const toolDir = path.join(destinationFolder, 'leiningen')

  for (const binScript of binScripts) {
    const bin = path.normalize(binScript)
    const binStats = await fs.stat(bin)
    if (binStats.isFile()) {
      const binDir = path.join(toolDir, 'bin')

      await io.mkdirP(binDir)

      await io.mv(bin, path.join(binDir, `${path.basename(bin)}`))

      if (!utils.isWindows()) {
        await fs.chmod(path.join(binDir, 'lein'), '0755')
      }
    } else {
      throw new Error('Not a file')
    }
  }

  const selfInstallsDir = path.join(toolDir, 'self-installs')
  await io.mkdirP(selfInstallsDir)
  const jarFileName = `leiningen-${version}-standalone.jar`
  await io.mv(jarPath, path.join(selfInstallsDir, jarFileName))

  const version_cmd = utils.isWindows()
    ? 'powershell .\\lein.ps1 version'
    : './lein version'

  const env: {[key: string]: string} = {
    LEIN_HOME: toolDir
  }

  if (process.env['PATH']) {
    env['PATH'] = process.env['PATH']
  }
  if (process.env['JAVA_CMD']) {
    env['JAVA_CMD'] = process.env['JAVA_CMD']
  }

  await exec.exec(version_cmd, [], {
    cwd: path.join(toolDir, 'bin'),
    env
  })

  return toolDir
}

async function leiningenJar(toolPath: string): Promise<string | null> {
  const files = await fs.readdir(path.join(toolPath, 'self-installs'))
  if (files) {
    for (const file of files) {
      if (file.endsWith('.jar')) {
        return path.join(toolPath, 'self-installs', file)
      }
    }
  }

  return null
}
