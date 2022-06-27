import _os from 'os'
import * as _core from '@actions/core'
import * as _tc from '@actions/tool-cache'
import * as _fs from 'fs/promises'
import * as zprint from '../src/zprint'

const getJson = jest.fn()
jest.mock('@actions/http-client', () => ({
  HttpClient: function () {
    return {getJson}
  }
}))

jest.mock('os')
const os: jest.Mocked<typeof _os> = _os as never

jest.mock('@actions/tool-cache')
const tc: jest.Mocked<typeof _tc> = _tc as never

jest.mock('@actions/core')
const core: jest.Mocked<typeof _core> = _core as never

jest.mock('fs/promises')
const fs: jest.Mocked<typeof _fs> = _fs as never

describe('zprint tests', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('getLatestZprint', () => {
    it('uses tag_name as latest version', async () => {
      getJson.mockResolvedValueOnce({
        result: {tag_name: 'v1.2.3'}
      })
      const res = await zprint.getLatestZprint()
      expect(res).toBe('1.2.3')
      expect(getJson).toHaveBeenCalledWith(
        'https://api.github.com/repos/kkinnear/zprint/releases/latest',
        undefined
      )
    })

    it('supports authorization', async () => {
      getJson.mockResolvedValueOnce({
        result: {tag_name: 'v1.2.3'}
      })
      const res = await zprint.getLatestZprint('token 123')
      expect(res).toBe('1.2.3')
      expect(getJson).toHaveBeenCalledWith(
        'https://api.github.com/repos/kkinnear/zprint/releases/latest',
        {Authorization: 'token 123'}
      )
    })

    it('throws on http client error', async () => {
      getJson.mockRejectedValueOnce(new Error('some error'))
      await expect(zprint.getLatestZprint()).rejects.toThrow('some error')
    })

    it('throws on wrong client answer', async () => {
      getJson.mockResolvedValueOnce({result: {foo: 'bar'}})
      await expect(zprint.getLatestZprint()).rejects.toThrow(
        `Can't obtain latest zprint version`
      )
    })
  })

  describe('getArtifactName', () => {
    test.each`
      platform    | artifact
      ${'win32'}  | ${`zprint-filter-1.2.3`}
      ${'darwin'} | ${`zprintm-1.2.3`}
      ${'linux'}  | ${`zprintl-1.2.3`}
      ${'foobar'} | ${`zprintl-1.2.3`}
    `('$platform -> $artifact', ({platform, artifact}) => {
      os.platform.mockReturnValueOnce(platform as never)
      expect(zprint.getArtifactName('1.2.3')).toBe(artifact)
    })
  })

  describe('getArtifactUrl', () => {
    test.each`
      platform    | artifact
      ${'win32'}  | ${`zprint-filter-1.2.3`}
      ${'darwin'} | ${`zprintm-1.2.3`}
      ${'linux'}  | ${`zprintl-1.2.3`}
      ${'foobar'} | ${`zprintl-1.2.3`}
    `('$platform -> $artifact', ({platform, artifact}) => {
      os.platform.mockReturnValueOnce(platform as never)
      expect(zprint.getArtifactUrl('1.2.3')).toBe(
        `https://github.com/kkinnear/zprint/releases/download/1.2.3/${artifact}`
      )
    })
  })

  describe('setup', () => {
    it('uses cache', async () => {
      tc.find.mockReturnValueOnce('/foo/bar')

      await zprint.setup('1.2.3')

      expect(tc.find).toHaveBeenCalledWith('zprint', '1.2.3')
      expect(core.addPath).toHaveBeenCalledWith('/foo/bar')
    })

    it('fetches exact version', async () => {
      tc.downloadTool.mockResolvedValueOnce('/foo/zprint')
      tc.cacheFile.mockResolvedValueOnce('/bar/zprint')

      await zprint.setup('1.2.3', 'token 123')

      expect(tc.find).toHaveBeenCalledWith('zprint', '1.2.3')
      expect(tc.downloadTool).toHaveBeenCalledWith(
        'https://github.com/kkinnear/zprint/releases/download/1.2.3/zprintl-1.2.3',
        undefined,
        'token 123'
      )
      expect(tc.cacheFile).toHaveBeenCalledWith(
        '/foo/zprint',
        'zprint',
        'zprint',
        '1.2.3'
      )
      expect(core.addPath).toHaveBeenCalledWith('/bar/zprint')
    })

    it('fetches latest version', async () => {
      getJson.mockResolvedValueOnce({
        result: {tag_name: 'v9.9.9'}
      })
      tc.downloadTool.mockResolvedValueOnce('/foo/zprint')
      tc.cacheFile.mockResolvedValueOnce('/bar/zprint')

      await zprint.setup('latest', 'token 123')

      expect(getJson).toHaveBeenCalledWith(
        'https://api.github.com/repos/kkinnear/zprint/releases/latest',
        {Authorization: 'token 123'}
      )
      expect(tc.find).toHaveBeenCalledWith('zprint', '9.9.9')
      expect(tc.downloadTool).toHaveBeenCalledWith(
        'https://github.com/kkinnear/zprint/releases/download/9.9.9/zprintl-9.9.9',
        undefined,
        'token 123'
      )
      expect(tc.cacheFile).toHaveBeenCalledWith('/foo/zprint', 'zprint', 'zprint', '9.9.9')
      expect(core.addPath).toHaveBeenCalledWith('/bar/zprint')
    })
  })
})
