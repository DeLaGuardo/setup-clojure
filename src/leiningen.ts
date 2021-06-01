import * as core from '@actions/core'
import * as io from '@actions/io'
import * as tc from '@actions/tool-cache'
import * as exec from '@actions/exec'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as utils from './utils'

const tempDirectory = utils.getTempDir()
const IS_WINDOWS = utils.isWindows()

export async function setup(version: string): Promise<void> {
  let toolPath = tc.find(
    'Leiningen',
    utils.getCacheVersionString(version),
    os.arch()
  )

  if (toolPath && version !== 'latest') {
    core.info(`Leiningen found in cache ${toolPath}`)
  } else {
    const leiningenFile = await tc.downloadTool(
      `https://raw.githubusercontent.com/technomancy/leiningen/${
        version === 'latest' ? 'stable' : version
      }/bin/lein${IS_WINDOWS ? '.ps1' : ''}`
    )
    const tempDir: string = path.join(
      tempDirectory,
      `temp_${Math.floor(Math.random() * 2000000000)}`
    )
    const leiningenDir = await installLeiningen(leiningenFile, tempDir)
    core.debug(`Leiningen installed to ${leiningenDir}`)
    toolPath = await tc.cacheDir(
      leiningenDir,
      'Leiningen',
      utils.getCacheVersionString(version)
    )
  }

  core.exportVariable('LEIN_HOME', toolPath)
  core.addPath(path.join(toolPath, 'bin'))
}

async function installLeiningen(
  binScript: string,
  destinationFolder: string
): Promise<string> {
  await io.mkdirP(destinationFolder)

  const bin = path.normalize(binScript)
  const binStats = fs.statSync(bin)
  if (binStats.isFile()) {
    const binDir = path.join(destinationFolder, 'leiningen', 'bin')

    await io.mkdirP(binDir)

    await io.mv(bin, path.join(binDir, `lein${IS_WINDOWS ? '.ps1' : ''}`))

    if (!IS_WINDOWS) {
      fs.chmodSync(path.join(binDir, `lein`), '0755')
    }

    const version_cmd = IS_WINDOWS
      ? 'powershell .\\lein.ps1 self-install'
      : './lein version'

    const env: {[key: string]: string} = {
      LEIN_HOME: path.join(destinationFolder, 'leiningen')
    }

    if (process.env['PATH']) {
      env['PATH'] = process.env['PATH']
    }
    if (process.env['JAVA_CMD']) {
      env['JAVA_CMD'] = process.env['JAVA_CMD']
    }

    await exec.exec(version_cmd, [], {
      cwd: path.join(destinationFolder, 'leiningen', 'bin'),
      env
    })

    return path.join(destinationFolder, 'leiningen')
  } else {
    throw new Error('Not a file')
  }
}
