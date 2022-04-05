import _os from 'os'
import * as _core from '@actions/core'
import * as _tc from '@actions/tool-cache'
import * as bb from '../src/babashka'

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

describe('tdeps tests', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('getLatestBabashka', () => {
    it('uses tag_name as latest version', async () => {
      getJson.mockResolvedValueOnce({
        result: {tag_name: 'v1.2.3'}
      })
      const res = await bb.getLatestBabashka()
      expect(res).toBe('1.2.3')
      expect(getJson).toHaveBeenCalledWith(
        'https://api.github.com/repos/babashka/babashka/releases/latest',
        undefined
      )
    })

    it('supports authorization', async () => {
      getJson.mockResolvedValueOnce({
        result: {tag_name: 'v1.2.3'}
      })
      const res = await bb.getLatestBabashka('token 123')
      expect(res).toBe('1.2.3')
      expect(getJson).toHaveBeenCalledWith(
        'https://api.github.com/repos/babashka/babashka/releases/latest',
        {Authorization: 'token 123'}
      )
    })

    it('throws on http client error', async () => {
      getJson.mockRejectedValueOnce(new Error('some error'))
      await expect(bb.getLatestBabashka()).rejects.toThrow('some error')
    })

    it('throws on wrong client answer', async () => {
      getJson.mockResolvedValueOnce({result: {foo: 'bar'}})
      await expect(bb.getLatestBabashka()).rejects.toThrow(
        `Can't obtain latest Babashka version`
      )
    })
  })

  describe('getArtifactName', () => {
    test.each`
      platform    | artifact
      ${'win32'}  | ${`babashka-1.2.3-windows-amd64.zip`}
      ${'darwin'} | ${`babashka-1.2.3-macos-amd64.tar.gz`}
      ${'linux'}  | ${`babashka-1.2.3-linux-amd64-static.tar.gz`}
      ${'foobar'} | ${`babashka-1.2.3-linux-amd64-static.tar.gz`}
    `('$platform -> $artifact', ({platform, artifact}) => {
      os.platform.mockReturnValueOnce(platform as never)
      expect(bb.getArtifactName('1.2.3')).toBe(artifact)
    })
  })

  describe('getArtifactUrl', () => {
    test.each`
      platform    | artifact
      ${'win32'}  | ${`babashka-1.2.3-windows-amd64.zip`}
      ${'darwin'} | ${`babashka-1.2.3-macos-amd64.tar.gz`}
      ${'linux'}  | ${`babashka-1.2.3-linux-amd64-static.tar.gz`}
      ${'foobar'} | ${`babashka-1.2.3-linux-amd64-static.tar.gz`}
    `('$platform -> $artifact', ({platform, artifact}) => {
      os.platform.mockReturnValueOnce(platform as never)
      expect(bb.getArtifactUrl('1.2.3')).toBe(
        `https://github.com/babashka/babashka/releases/download/v1.2.3/${artifact}`
      )
    })
  })

  describe('extract', () => {
    it('detects zip', () => {
      bb.extract('foobar.zip')
      expect(tc.extractZip).toHaveBeenCalled()
      expect(tc.extractTar).not.toHaveBeenCalled()
    })

    it('detects tar.gz', () => {
      bb.extract('foobar.tar.gz')
      expect(tc.extractZip).not.toHaveBeenCalled()
      expect(tc.extractTar).toHaveBeenCalled()
    })
  })

  describe('setup', () => {
    it('uses cache', async () => {
      tc.find.mockReturnValueOnce('/foo/bar')

      await bb.setup('1.2.3')

      expect(tc.find).toHaveBeenCalledWith('Babashka', '1.2.3')
      expect(core.addPath).toHaveBeenCalledWith('/foo/bar')
    })

    it('uses cache', async () => {
      tc.find.mockReturnValueOnce('/foo/bar')

      await bb.setup('1.2.3')

      expect(tc.find).toHaveBeenCalledWith('Babashka', '1.2.3')
      expect(core.addPath).toHaveBeenCalledWith('/foo/bar')
    })

    it('fetches exact version', async () => {
      tc.downloadTool.mockResolvedValueOnce('/foo/bb.tar.gz')
      tc.extractTar.mockResolvedValueOnce('/bar/baz')

      await bb.setup('1.2.3', 'token 123')

      expect(tc.find).toHaveBeenCalledWith('Babashka', '1.2.3')
      expect(tc.downloadTool).toHaveBeenCalledWith(
        'https://github.com/babashka/babashka/releases/download/v1.2.3/babashka-1.2.3-linux-amd64-static.tar.gz',
        undefined,
        'token 123'
      )
      expect(tc.cacheDir).toHaveBeenCalledWith('/bar/baz', 'Babashka', '1.2.3')
      expect(core.addPath).toHaveBeenCalledWith('/bar/baz')
    })

    it('fetches latest version', async () => {
      getJson.mockResolvedValueOnce({
        result: {tag_name: 'v9.9.9'}
      })
      tc.downloadTool.mockResolvedValueOnce('/foo/bb.tar.gz')
      tc.extractTar.mockResolvedValueOnce('/bar/baz')

      await bb.setup('latest', 'token 123')

      expect(getJson).toHaveBeenCalledWith(
        'https://api.github.com/repos/babashka/babashka/releases/latest',
        {Authorization: 'token 123'}
      )
      expect(tc.find).toHaveBeenCalledWith('Babashka', '9.9.9')
      expect(tc.downloadTool).toHaveBeenCalledWith(
        'https://github.com/babashka/babashka/releases/download/v9.9.9/babashka-9.9.9-linux-amd64-static.tar.gz',
        undefined,
        'token 123'
      )
      expect(tc.cacheDir).toHaveBeenCalledWith('/bar/baz', 'Babashka', '9.9.9')
      expect(core.addPath).toHaveBeenCalledWith('/bar/baz')
    })
  })
})
