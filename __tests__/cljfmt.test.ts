import _os from 'os'
import * as _core from '@actions/core'
import * as _tc from '@actions/tool-cache'
import * as cljfmt from '../src/cljfmt'

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

describe('cljfmt tests', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('getLatestCljFmt', () => {
    it('uses tag_name as latest version', async () => {
      getJson.mockResolvedValueOnce({
        result: {tag_name: '1.2.3'}
      })
      const res = await cljfmt.getLatestCljFmt()
      expect(res).toBe('1.2.3')
      expect(getJson).toHaveBeenCalledWith(
        'https://api.github.com/repos/weavejester/cljfmt/releases/latest',
        undefined
      )
    })

    it('supports authorization', async () => {
      getJson.mockResolvedValueOnce({
        result: {tag_name: '1.2.3'}
      })
      const res = await cljfmt.getLatestCljFmt('token 123')
      expect(res).toBe('1.2.3')
      expect(getJson).toHaveBeenCalledWith(
        'https://api.github.com/repos/weavejester/cljfmt/releases/latest',
        {Authorization: 'token 123'}
      )
    })

    it('throws on http client error', async () => {
      getJson.mockRejectedValueOnce(new Error('some error'))
      await expect(cljfmt.getLatestCljFmt()).rejects.toThrow('some error')
    })

    it('throws on wrong client answer', async () => {
      getJson.mockResolvedValueOnce({result: {foo: 'bar'}})
      await expect(cljfmt.getLatestCljFmt()).rejects.toThrow(
        `Can't obtain latest cljfmt version`
      )
    })
  })

  describe('getArtifactName', () => {
    test.each`
      platform    | artifact
      ${'win32'}  | ${`cljfmt-1.2.3-win-amd64.zip`}
      ${'darwin'} | ${`cljfmt-1.2.3-darwin-amd64.tar.gz`}
      ${'linux'}  | ${`cljfmt-1.2.3-linux-amd64.tar.gz`}
      ${'foobar'} | ${`cljfmt-1.2.3-linux-amd64.tar.gz`}
    `('$platform -> $artifact', ({platform, artifact}) => {
      os.platform.mockReturnValueOnce(platform as never)
      expect(cljfmt.getArtifactName('1.2.3')).toBe(artifact)
    })
  })

  describe('getArtifactUrl', () => {
    test.each`
      platform    | artifact
      ${'win32'}  | ${`cljfmt-1.2.3-win-amd64.zip`}
      ${'darwin'} | ${`cljfmt-1.2.3-darwin-amd64.tar.gz`}
      ${'linux'}  | ${`cljfmt-1.2.3-linux-amd64.tar.gz`}
      ${'foobar'} | ${`cljfmt-1.2.3-linux-amd64.tar.gz`}
    `('$platform -> $artifact', ({platform, artifact}) => {
      os.platform.mockReturnValueOnce(platform as never)
      expect(cljfmt.getArtifactUrl('1.2.3')).toBe(
        `https://github.com/weavejester/cljfmt/releases/download/1.2.3/${artifact}`
      )
    })
  })

  describe('setup', () => {
    it('uses cache', async () => {
      tc.find.mockReturnValueOnce('/foo/bar')

      await cljfmt.setup('1.2.3')

      expect(tc.find).toHaveBeenCalledWith('cljfmt', '1.2.3')
      expect(core.addPath).toHaveBeenCalledWith('/foo/bar')
    })

    it('uses cache', async () => {
      tc.find.mockReturnValueOnce('/foo/bar')

      await cljfmt.setup('1.2.3')

      expect(tc.find).toHaveBeenCalledWith('cljfmt', '1.2.3')
      expect(core.addPath).toHaveBeenCalledWith('/foo/bar')
    })

    it('fetches exact version', async () => {
      tc.downloadTool.mockResolvedValueOnce('/foo/cljfmt.tar.gz')
      tc.extractTar.mockResolvedValueOnce('/bar/baz')
      tc.cacheDir.mockResolvedValueOnce('/qux')

      await cljfmt.setup('1.2.3', 'token 123')

      expect(tc.find).toHaveBeenCalledWith('cljfmt', '1.2.3')
      expect(tc.downloadTool).toHaveBeenCalledWith(
        'https://github.com/weavejester/cljfmt/releases/download/1.2.3/cljfmt-1.2.3-linux-amd64.tar.gz',
        undefined,
        'token 123'
      )
      expect(tc.cacheDir).toHaveBeenCalledWith('/bar/baz', 'cljfmt', '1.2.3')
      expect(core.addPath).toHaveBeenCalledWith('/qux')
    })

    it('fetches latest version', async () => {
      getJson.mockResolvedValueOnce({
        result: {tag_name: '9.9.9'}
      })
      tc.downloadTool.mockResolvedValueOnce('/foo/cljfmt.tar.gz')
      tc.extractTar.mockResolvedValueOnce('/bar/baz')
      tc.cacheDir.mockResolvedValueOnce('/qux')

      await cljfmt.setup('latest', 'token 123')

      expect(getJson).toHaveBeenCalledWith(
        'https://api.github.com/repos/weavejester/cljfmt/releases/latest',
        {Authorization: 'token 123'}
      )
      expect(tc.find).toHaveBeenCalledWith('cljfmt', '9.9.9')
      expect(tc.downloadTool).toHaveBeenCalledWith(
        'https://github.com/weavejester/cljfmt/releases/download/9.9.9/cljfmt-9.9.9-linux-amd64.tar.gz',
        undefined,
        'token 123'
      )
      expect(tc.cacheDir).toHaveBeenCalledWith('/bar/baz', 'cljfmt', '9.9.9')
      expect(core.addPath).toHaveBeenCalledWith('/qux')
    })
  })
})
