import * as core from '@actions/core'
import * as io from '@actions/io'
import * as tc from '@actions/tool-cache'
import * as exec from '@actions/exec'
import * as path from 'path'
import * as os from 'os'
import * as fs from './fs'
import * as utils from './utils'

export const identifier = 'Boot'

function getTempDirectory(): string {
  let tempDirectory = process.env['RUNNER_TEMP'] || ''

  if (!tempDirectory) {
    let baseLocation
    if (utils.isWindows()) {
      baseLocation = process.env['USERPROFILE'] || 'C:\\'
    } else {
      if (process.platform === 'darwin') {
        baseLocation = '/Users'
      } else {
        baseLocation = '/home'
      }
    }
    tempDirectory = path.join(baseLocation, 'actions', 'temp')
  }
  return tempDirectory
}

export async function setup(
  version: string,
  githubAuth?: string
): Promise<void> {
  let toolPath = tc.find(
    identifier,
    utils.getCacheVersionString(version),
    os.arch()
  )

  if (utils.isWindows()) {
    await setWindowsRegistry()
  }

  if (toolPath && version !== 'latest') {
    core.info(`Boot found in cache ${toolPath}`)
  } else {
    const bootBootstrapFile = await tc.downloadTool(
      `https://github.com/boot-clj/boot-bin/releases/download/latest/boot.${
        utils.isWindows() ? 'exe' : 'sh'
      }`,
      undefined,
      githubAuth
    )
    const tempDir: string = path.join(
      getTempDirectory(),
      `temp_${Math.floor(Math.random() * 2000000000)}`
    )
    const bootDir = await installBoot(bootBootstrapFile, tempDir, version)
    core.debug(`Boot installed to ${bootDir}`)
    toolPath = await tc.cacheDir(
      bootDir,
      identifier,
      utils.getCacheVersionString(version)
    )
  }

  core.exportVariable('BOOT_HOME', toolPath)
  if (version !== 'latest') {
    core.exportVariable('BOOT_VERSION', version)
  }
  core.addPath(path.join(toolPath, 'bin'))
}

async function installBoot(
  binScript: string,
  destinationFolder: string,
  version: string
): Promise<string> {
  await io.mkdirP(destinationFolder)

  const bin = path.normalize(binScript)
  const binStats = await fs.stat(bin)
  if (binStats.isFile()) {
    const binDir = path.join(destinationFolder, 'boot', 'bin')

    await io.mkdirP(binDir)

    await io.mv(
      bin,
      path.join(binDir, `boot${utils.isWindows() ? '.exe' : ''}`)
    )

    if (!utils.isWindows()) {
      await fs.chmod(path.join(binDir, `boot`), '0755')
    }

    let env: {[key: string]: string} = {}
    if (version === 'latest') {
      env = {
        BOOT_HOME: path.join(destinationFolder, 'boot')
      }
    } else {
      env = {
        BOOT_HOME: path.join(destinationFolder, 'boot'),
        BOOT_VERSION: version
      }
    }

    if (process.env['PATH']) {
      env['PATH'] = process.env['PATH']
    }
    if (process.env['JAVA_CMD']) {
      env['JAVA_CMD'] = process.env['JAVA_CMD']
    }

    await exec.exec(
      `./boot${utils.isWindows() ? '.exe' : ''} ${
        version === 'latest' ? '-u' : '-V'
      }`,
      [],
      {
        cwd: path.join(destinationFolder, 'boot', 'bin'),
        env
      }
    )

    return path.join(destinationFolder, 'boot')
  } else {
    throw new Error('Not a file')
  }
}

async function setWindowsRegistry(): Promise<void> {
  let java_version = ''

  await exec.exec(`java -cp dist JavaVersion`, [], {
    listeners: {
      stdout: (data: Buffer) => {
        java_version += data.toString()
      }
    }
  })

  await exec.exec(
    `reg add "HKLM\\SOFTWARE\\JavaSoft\\Java Runtime Environment" /v CurrentVersion /d ${java_version.trim()} /f`
  )

  await exec.exec(
    `reg add "HKLM\\SOFTWARE\\JavaSoft\\Java Runtime Environment\\${java_version.trim()}" /v JavaHome /d "${
      process.env['JAVA_HOME']
    }" /f`
  )
}
