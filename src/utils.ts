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

export function versionGte(a: string, b: string): boolean {
  const parse = (v: string): number[] =>
    v.split('.').map(segment => parseInt(segment, 10) || 0)
  const pa = parse(a)
  const pb = parse(b)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0
    const y = pb[i] ?? 0
    if (x !== y) return x > y
  }
  return true
}

export function isWindows(): boolean {
  return platform.isWindows
}

export function isMacOS(): boolean {
  return platform.isMacOS
}
