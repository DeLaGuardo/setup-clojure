"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const io = __importStar(require("@actions/io"));
const tc = __importStar(require("@actions/tool-cache"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const utils = __importStar(require("./utils"));
let tempDirectory = process.env['RUNNER_TEMP'] || '';
if (!tempDirectory) {
    let baseLocation;
    if (process.platform === 'darwin') {
        baseLocation = '/Users';
    }
    else {
        baseLocation = '/home';
    }
    tempDirectory = path.join(baseLocation, 'actions', 'temp');
}
function setup(version) {
    return __awaiter(this, void 0, void 0, function* () {
        let toolPath = tc.find('ClojureToolsDeps', utils.getCacheVersionString(version), os.arch());
        if (toolPath) {
            core.info(`Clojure CLI found in cache ${toolPath}`);
        }
        else {
            let clojureToolsFile = yield tc.downloadTool(`https://download.clojure.org/install/clojure-tools-${version}.tar.gz`);
            let tempDir = path.join(tempDirectory, 'temp_' + Math.floor(Math.random() * 2000000000));
            const clojureToolsDir = yield installClojureToolsDeps(clojureToolsFile, tempDir, version);
            core.debug(`clojure tools deps installed to ${clojureToolsDir}`);
            toolPath = yield tc.cacheDir(clojureToolsDir, 'ClojureToolsDeps', utils.getCacheVersionString(version));
        }
        const installDir = path.join(toolPath, 'lib', 'clojure');
        core.exportVariable('CLOJURE_INSTALL_DIR', installDir);
        core.addPath(path.join(toolPath, 'bin'));
    });
}
exports.setup = setup;
function installClojureToolsDeps(installScript, destinationFolder, version) {
    return __awaiter(this, void 0, void 0, function* () {
        yield io.mkdirP(destinationFolder);
        const file = path.normalize(installScript);
        const stats = fs.statSync(file);
        if (stats.isFile()) {
            const binDir = path.join(destinationFolder, 'clojure', 'bin');
            const libDir = path.join(destinationFolder, 'clojure', 'lib');
            const manDir = path.join(destinationFolder, 'clojure', 'share', 'man', 'man1');
            const clojureLibDir = path.join(libDir, 'clojure');
            const clojureLibexecDir = path.join(clojureLibDir, 'libexec');
            yield tc.extractTar(file, destinationFolder);
            const sourceDir = path.join(destinationFolder, 'clojure-tools');
            yield io.mkdirP(binDir);
            yield io.mkdirP(manDir);
            yield io.mkdirP(clojureLibexecDir);
            yield io.mv(path.join(sourceDir, 'deps.edn'), clojureLibDir);
            yield io.mv(path.join(sourceDir, 'example-deps.edn'), clojureLibDir);
            yield io.mv(path.join(sourceDir, `clojure-tools-${version}.jar`), clojureLibexecDir);
            yield readWriteAsync(path.join(sourceDir, 'clojure'), '"$CLOJURE_INSTALL_DIR"');
            yield io.mv(path.join(sourceDir, 'clj'), binDir);
            yield io.mv(path.join(sourceDir, 'clojure'), binDir);
            yield io.mv(path.join(sourceDir, 'clojure.1'), manDir);
            yield io.mv(path.join(sourceDir, 'clj.1'), manDir);
            return path.join(destinationFolder, 'clojure');
        }
        else {
            throw new Error(`Not a file`);
        }
    });
}
function readWriteAsync(file, replacement) {
    return __awaiter(this, void 0, void 0, function* () {
        fs.readFile(file, 'utf-8', function (err, data) {
            if (err)
                throw err;
            var newValue = data.replace(/PREFIX/gim, replacement);
            fs.writeFile(file, newValue, 'utf-8', function (err) {
                if (err)
                    throw err;
            });
        });
    });
}
