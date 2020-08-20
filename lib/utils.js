"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWindows = exports.getTempDir = exports.getCacheVersionString = void 0;
const path = __importStar(require("path"));
function getCacheVersionString(version) {
    const versionArray = version.split('.');
    const major = versionArray[0];
    const minor = versionArray.length > 1 ? versionArray[1] : '0';
    const patch = versionArray.length > 2 ? versionArray.slice(2).join('-') : '0';
    return `${major}.${minor}.${patch}`;
}
exports.getCacheVersionString = getCacheVersionString;
function getTempDir() {
    let tempDirectory = process.env.RUNNER_TEMP;
    if (tempDirectory === undefined) {
        let baseLocation;
        if (isWindows()) {
            // On windows use the USERPROFILE env variable
            baseLocation = process.env['USERPROFILE']
                ? process.env['USERPROFILE']
                : 'C:\\';
        }
        else {
            if (process.platform === 'darwin') {
                baseLocation = '/Users';
            }
            else {
                baseLocation = '/home';
            }
        }
        tempDirectory = path.join(baseLocation, 'actions', 'temp');
    }
    return tempDirectory;
}
exports.getTempDir = getTempDir;
function isWindows() {
    return process.platform === 'win32';
}
exports.isWindows = isWindows;
