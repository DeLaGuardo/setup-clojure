import * as core from '@actions/core'
import * as io from '@actions/io'
import * as tc from '@actions/tool-cache'
import * as exec from '@actions/exec'
import * as path from 'path'
import * as os from 'os'
import * as fs from './fs'
import * as utils from './utils'

export const identifier = 'Leiningen'

export async function setup(
  version: string,
  githubAuth?: string
): Promise<void> {
  const isWindows = utils.isWindows()

  let toolPath = tc.find(
    identifier,
    utils.getCacheVersionString(version),
    os.arch()
  )

  if (toolPath && version !== 'latest') {
    core.info(`Leiningen found in cache ${toolPath}`)
  } else {
    const binScripts = []
    if (isWindows) {
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

    const tempDir: string = path.join(
      utils.getTempDir(),
      `temp_${Math.floor(Math.random() * 2000000000)}`
    )
    const leiningenDir = await installLeiningen(binScripts, tempDir)
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

async function installLeiningen(
  binScripts: string[],
  destinationFolder: string
): Promise<string> {
  const isWindows = utils.isWindows()

  await io.mkdirP(destinationFolder)

  for (const binScript of binScripts) {
    const bin = path.normalize(binScript)
    const binStats = await fs.stat(bin)
    if (binStats.isFile()) {
      const binDir = path.join(destinationFolder, 'leiningen', 'bin')

      await io.mkdirP(binDir)

      await io.mv(bin, path.join(binDir, `${path.basename(bin)}`))

      if (!isWindows) {
        await fs.chmod(path.join(binDir, 'lein'), '0755')
      }
    } else {
      throw new Error('Not a file')
    }
  }

  const version_cmd = isWindows
    ? 'powershell .\\lein.ps1 self-install'
    : './lein version'

  const toolDir = path.join(destinationFolder, 'leiningen')
  const leiningenJarPath = await leiningenJar(toolDir)

  const env: {[key: string]: string} = {
    LEIN_HOME: toolDir
  }

  if (leiningenJarPath !== null) {
    env['LEIN_JAR'] = leiningenJarPath
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
