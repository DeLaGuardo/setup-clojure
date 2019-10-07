import * as core from '@actions/core';
import * as lein from './leiningen';
import * as boot from './boot';
import * as tdeps from './tdeps';

const IS_WINDOWS = process.platform === 'win32';

async function run() {
    try {
        const Lein = core.getInput('lein');
        const Boot = core.getInput('boot');
        const Tdeps = core.getInput('tools-deps');

        if (IS_WINDOWS) {
            throw new Error('Windows is not supported yet.');
        }

        if (Lein) {
            lein.setup(Lein);
        }

        if (Boot) {
            boot.setup(Boot);
        }

        if (Tdeps) {
            tdeps.setup(Tdeps);
        }

        if (!Boot && !Lein && !Tdeps) {
            throw new Error('You must specify at least one clojure tool.');
        }
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
