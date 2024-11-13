import * as path from 'path'
import {VERSION} from './version'
import {platform} from '@actions/core'

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
    if (platform.isWindows) {
      // On windows use the USERPROFILE env variable
      baseLocation = process.env['USERPROFILE']
        ? process.env['USERPROFILE']
        : 'C:\\'
    } else if (platform.isMacOS) {
      baseLocation = '/Users'
    } else {
      baseLocation = '/home'
    }
    tempDirectory = path.join(baseLocation, 'actions', 'temp')
  }
  return tempDirectory
}

export function isWindows(): boolean {
  return platform.isWindows
}

export function isMacOS(): boolean {
  return platform.isMacOS
}
