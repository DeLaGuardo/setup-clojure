import os from 'os'
import * as path from 'path'
import {VERSION} from './version'
import * as core from '@actions/core'

export function getCacheVersionString(version: string): string {
  const versionArray = version.split('.')
  const major = versionArray[0]
  const minor = versionArray.length > 1 ? versionArray[1] : '0'
  const patch = versionArray.length > 2 ? versionArray.slice(2).join('-') : '0'
  return `${major}.${minor}.${patch}-${VERSION}`
}

export function getTempDir(): string {
  let tempDirectory = process.env.RUNNER_TEMP
  if (tempDirectory === undefined) {
    let baseLocation
    if (isWindows()) {
      // On windows use the USERPROFILE env variable
      baseLocation = process.env['USERPROFILE']
        ? process.env['USERPROFILE']
        : 'C:\\'
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

export function isWindows(): boolean {
  return os.platform() === 'win32'
}

export function isMacOS(): boolean {
  return os.platform() === 'darwin'
}

export type Tools = {
  LEIN_VERSION: string | null | undefined
  BOOT_VERSION: string | null | undefined
  TDEPS_VERSION: string | null | undefined
  CLI_VERSION: string | null | undefined
  CMD_EXE_WORKAROUND: string | null | undefined
  BB_VERSION: string | null | undefined
  CLJ_KONDO_VERSION: string | null | undefined
  CLJSTYLE_VERSION: string | null | undefined
  ZPRINT_VERSION: string | null | undefined
}

export function getTools(): Tools {
  const LEIN_VERSION = core.getInput('lein')
  const BOOT_VERSION = core.getInput('boot')
  const TDEPS_VERSION = core.getInput('tools-deps')
  const CLI_VERSION = core.getInput('cli')
  const CMD_EXE_WORKAROUND = core.getInput('cmd-exe-workaround')
  const BB_VERSION = core.getInput('bb')
  const CLJ_KONDO_VERSION = core.getInput('clj-kondo')
  const CLJSTYLE_VERSION = core.getInput('cljstyle')
  const ZPRINT_VERSION = core.getInput('zprint')

  return {
    LEIN_VERSION,
    BOOT_VERSION,
    TDEPS_VERSION,
    CLI_VERSION,
    CMD_EXE_WORKAROUND,
    BB_VERSION,
    CLJ_KONDO_VERSION,
    CLJSTYLE_VERSION,
    ZPRINT_VERSION
  }
}
