import _os from 'os'
import * as _core from '@actions/core'
import * as _tc from '@actions/tool-cache'
import * as cljstyle from '../src/cljstyle'

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

describe('cljstyle tests', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('getLatestCljstyle', () => {
    it('uses tag_name as latest version', async () => {
      getJson.mockResolvedValueOnce({
        result: {tag_name: '1.2.3'}
      })
      const res = await cljstyle.getLatestCljstyle()
      expect(res).toBe('1.2.3')
      expect(getJson).toHaveBeenCalledWith(
        'https://api.github.com/repos/greglook/cljstyle/releases/latest',
        undefined
      )
    })

    it('supports authorization', async () => {
      getJson.mockResolvedValueOnce({
        result: {tag_name: '1.2.3'}
      })
      const res = await cljstyle.getLatestCljstyle('token 123')
      expect(res).toBe('1.2.3')
      expect(getJson).toHaveBeenCalledWith(
        'https://api.github.com/repos/greglook/cljstyle/releases/latest',
        {Authorization: 'token 123'}
      )
    })

    it('throws on http client error', async () => {
      getJson.mockRejectedValueOnce(new Error('some error'))
      await expect(cljstyle.getLatestCljstyle()).rejects.toThrow('some error')
    })

    it('throws on wrong client answer', async () => {
      getJson.mockResolvedValueOnce({result: {foo: 'bar'}})
      await expect(cljstyle.getLatestCljstyle()).rejects.toThrow(
        `Can't obtain latest cljstyle version`
      )
    })
  })

  describe('getArtifactName', () => {
    test.each`
      platform    | artifact
      ${'darwin'} | ${`cljstyle_1.2.3_macos_amd64.zip`}
      ${'linux'}  | ${`cljstyle_1.2.3_linux_amd64.zip`}
      ${'foobar'} | ${`cljstyle_1.2.3_linux_amd64.zip`}
    `('$platform -> $artifact', ({platform, artifact}) => {
      os.platform.mockReturnValueOnce(platform as never)
      expect(cljstyle.getArtifactName('1.2.3')).toBe(artifact)
    })
  })

  describe('getArtifactUrl', () => {
    test.each`
      platform    | version     | artifact
      ${'darwin'} | ${'1.2.3'}  | ${`cljstyle_1.2.3_macos_amd64.zip`}
      ${'linux'}  | ${'1.2.3'}  | ${`cljstyle_1.2.3_linux_amd64.zip`}
      ${'foobar'} | ${'1.2.3'}  | ${`cljstyle_1.2.3_linux_amd64.zip`}
      ${'darwin'} | ${'0.15.0'} | ${`cljstyle_0.15.0_macos.zip`}
      ${'linux'}  | ${'0.15.0'} | ${`cljstyle_0.15.0_linux.zip`}
      ${'foobar'} | ${'0.15.0'} | ${`cljstyle_0.15.0_linux.zip`}
    `('$platform -> $artifact', ({platform, version, artifact}) => {
      os.platform.mockReturnValueOnce(platform as never)
      expect(cljstyle.getArtifactUrl(version)).toBe(
        `https://github.com/greglook/cljstyle/releases/download/${version}/${artifact}`
      )
    })
  })

  describe('setup', () => {
    it('uses cache', async () => {
      tc.find.mockReturnValueOnce('/foo/bar')

      await cljstyle.setup('1.2.3')

      expect(tc.find).toHaveBeenCalledWith('cljstyle', '1.2.3')
      expect(core.addPath).toHaveBeenCalledWith('/foo/bar')
    })

    it('uses cache', async () => {
      tc.find.mockReturnValueOnce('/foo/bar')

      await cljstyle.setup('1.2.3')

      expect(tc.find).toHaveBeenCalledWith('cljstyle', '1.2.3')
      expect(core.addPath).toHaveBeenCalledWith('/foo/bar')
    })

    it('fetches exact version', async () => {
      tc.downloadTool.mockResolvedValueOnce('/foo/cljstyle.tar.gz')
      tc.extractZip.mockResolvedValueOnce('/bar/baz')
      tc.cacheDir.mockResolvedValueOnce('/qux')

      await cljstyle.setup('1.2.3', 'token 123')

      expect(tc.find).toHaveBeenCalledWith('cljstyle', '1.2.3')
      expect(tc.downloadTool).toHaveBeenCalledWith(
        'https://github.com/greglook/cljstyle/releases/download/1.2.3/cljstyle_1.2.3_linux_amd64.zip',
        undefined,
        'token 123'
      )
      expect(tc.cacheDir).toHaveBeenCalledWith('/bar/baz', 'cljstyle', '1.2.3')
      expect(core.addPath).toHaveBeenCalledWith('/qux')
    })

    it('fetches latest version', async () => {
      getJson.mockResolvedValueOnce({
        result: {tag_name: 'v9.9.9'}
      })
      tc.downloadTool.mockResolvedValueOnce('/foo/cljstyle.tar.gz')
      tc.extractZip.mockResolvedValueOnce('/bar/baz')
      tc.cacheDir.mockResolvedValueOnce('/qux')

      await cljstyle.setup('latest', 'token 123')

      expect(getJson).toHaveBeenCalledWith(
        'https://api.github.com/repos/greglook/cljstyle/releases/latest',
        {Authorization: 'token 123'}
      )
      expect(tc.find).toHaveBeenCalledWith('cljstyle', '9.9.9')
      expect(tc.downloadTool).toHaveBeenCalledWith(
        'https://github.com/greglook/cljstyle/releases/download/9.9.9/cljstyle_9.9.9_linux_amd64.zip',
        undefined,
        'token 123'
      )
      expect(tc.cacheDir).toHaveBeenCalledWith('/bar/baz', 'cljstyle', '9.9.9')
      expect(core.addPath).toHaveBeenCalledWith('/qux')
    })
  })
})
