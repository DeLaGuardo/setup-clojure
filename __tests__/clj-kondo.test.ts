import _os from 'os'
import * as _core from '@actions/core'
import * as _tc from '@actions/tool-cache'
import * as cljKondo from '../src/clj-kondo'

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

describe('clj-kondo tests', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('getLatestCljKondo', () => {
    it('uses tag_name as latest version', async () => {
      getJson.mockResolvedValueOnce({
        result: {tag_name: 'v1.2.3'}
      })
      const res = await cljKondo.getLatestCljKondo()
      expect(res).toBe('1.2.3')
      expect(getJson).toHaveBeenCalledWith(
        'https://api.github.com/repos/clj-kondo/clj-kondo/releases/latest',
        undefined
      )
    })

    it('supports authorization', async () => {
      getJson.mockResolvedValueOnce({
        result: {tag_name: 'v1.2.3'}
      })
      const res = await cljKondo.getLatestCljKondo('token 123')
      expect(res).toBe('1.2.3')
      expect(getJson).toHaveBeenCalledWith(
        'https://api.github.com/repos/clj-kondo/clj-kondo/releases/latest',
        {Authorization: 'token 123'}
      )
    })

    it('throws on http client error', async () => {
      getJson.mockRejectedValueOnce(new Error('some error'))
      await expect(cljKondo.getLatestCljKondo()).rejects.toThrow('some error')
    })

    it('throws on wrong client answer', async () => {
      getJson.mockResolvedValueOnce({result: {foo: 'bar'}})
      await expect(cljKondo.getLatestCljKondo()).rejects.toThrow(
        `Can't obtain latest clj-kondo version`
      )
    })
  })

  describe('getArtifactName', () => {
    test.each`
      platform    | artifact
      ${'win32'}  | ${`clj-kondo-1.2.3-windows-amd64.zip`}
      ${'darwin'} | ${`clj-kondo-1.2.3-macos-amd64.zip`}
      ${'linux'}  | ${`clj-kondo-1.2.3-linux-amd64.zip`}
      ${'foobar'} | ${`clj-kondo-1.2.3-linux-amd64.zip`}
    `('$platform -> $artifact', ({platform, artifact}) => {
      os.platform.mockReturnValueOnce(platform as never)
      expect(cljKondo.getArtifactName('1.2.3')).toBe(artifact)
    })
  })

  describe('getArtifactUrl', () => {
    test.each`
      platform    | artifact
      ${'win32'}  | ${`clj-kondo-1.2.3-windows-amd64.zip`}
      ${'darwin'} | ${`clj-kondo-1.2.3-macos-amd64.zip`}
      ${'linux'}  | ${`clj-kondo-1.2.3-linux-amd64.zip`}
      ${'foobar'} | ${`clj-kondo-1.2.3-linux-amd64.zip`}
    `('$platform -> $artifact', ({platform, artifact}) => {
      os.platform.mockReturnValueOnce(platform as never)
      expect(cljKondo.getArtifactUrl('1.2.3')).toBe(
        `https://github.com/clj-kondo/clj-kondo/releases/download/v1.2.3/${artifact}`
      )
    })
  })

  describe('setup', () => {
    it('uses cache', async () => {
      tc.find.mockReturnValueOnce('/foo/bar')

      await cljKondo.setup('1.2.3')

      expect(tc.find).toHaveBeenCalledWith('clj-kondo', '1.2.3')
      expect(core.addPath).toHaveBeenCalledWith('/foo/bar')
    })

    it('uses cache', async () => {
      tc.find.mockReturnValueOnce('/foo/bar')

      await cljKondo.setup('1.2.3')

      expect(tc.find).toHaveBeenCalledWith('clj-kondo', '1.2.3')
      expect(core.addPath).toHaveBeenCalledWith('/foo/bar')
    })

    it('fetches exact version', async () => {
      tc.downloadTool.mockResolvedValueOnce('/foo/cljKondo.tar.gz')
      tc.extractZip.mockResolvedValueOnce('/bar/baz')
      tc.cacheDir.mockResolvedValueOnce('/qux')

      await cljKondo.setup('1.2.3', 'token 123')

      expect(tc.find).toHaveBeenCalledWith('clj-kondo', '1.2.3')
      expect(tc.downloadTool).toHaveBeenCalledWith(
        'https://github.com/clj-kondo/clj-kondo/releases/download/v1.2.3/clj-kondo-1.2.3-linux-amd64.zip',
        undefined,
        'token 123'
      )
      expect(tc.cacheDir).toHaveBeenCalledWith('/bar/baz', 'clj-kondo', '1.2.3')
      expect(core.addPath).toHaveBeenCalledWith('/qux')
    })

    it('fetches latest version', async () => {
      getJson.mockResolvedValueOnce({
        result: {tag_name: 'v9.9.9'}
      })
      tc.downloadTool.mockResolvedValueOnce('/foo/cljKondo.tar.gz')
      tc.extractZip.mockResolvedValueOnce('/bar/baz')
      tc.cacheDir.mockResolvedValueOnce('/qux')

      await cljKondo.setup('latest', 'token 123')

      expect(getJson).toHaveBeenCalledWith(
        'https://api.github.com/repos/clj-kondo/clj-kondo/releases/latest',
        {Authorization: 'token 123'}
      )
      expect(tc.find).toHaveBeenCalledWith('clj-kondo', '9.9.9')
      expect(tc.downloadTool).toHaveBeenCalledWith(
        'https://github.com/clj-kondo/clj-kondo/releases/download/v9.9.9/clj-kondo-9.9.9-linux-amd64.zip',
        undefined,
        'token 123'
      )
      expect(tc.cacheDir).toHaveBeenCalledWith('/bar/baz', 'clj-kondo', '9.9.9')
      expect(core.addPath).toHaveBeenCalledWith('/qux')
    })
  })
})
