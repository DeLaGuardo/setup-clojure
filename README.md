# setup-clojure

This action sets up Clojure tools environment for using in GitHub Actions.

* [Clojure CLI](https://clojure.org/guides/deps_and_cli)
* [leiningen](https://leiningen.org/)
* [boot-clj](https://boot-clj.github.io/)
* [babashka](https://babashka.org/)
* [clj-kondo](https://github.com/clj-kondo/clj-kondo)
* [cljstyle](https://github.com/greglook/cljstyle)
* [deps.clj](https://github.com/borkdude/deps.clj)
* [zprint](https://github.com/kkinnear/zprint)

All three major tools (Clojure CLI, leiningen and boot-clj) available for MacOS, Ubuntu and Windows based runners. Please look at [Smoke Test Workflow file](https://github.com/DeLaGuardo/setup-clojure/blob/master/.github/workflows/smoke-tests.yml) for compatibility matrix.

# Usage

Here is a snippet for your workflow file:

```yaml
name: Example workflow

on: [push]

jobs:

  clojure:

    strategy:
      matrix:
        os: [ubuntu-latest, macOS-latest, windows-latest]

    runs-on: ${{ matrix.os }}

    steps:
      - name: Checkout
        uses: actions/checkout@v3

      # It is important to install java before installing clojure tools which needs java
      # exclusions: babashka, clj-kondo and cljstyle
      - name: Prepare java
        uses: actions/setup-java@v3
        with:
          distribution: 'zulu'
          java-version: '8'

      - name: Install clojure tools
        uses: DeLaGuardo/setup-clojure@9.0
        with:
          # Install just one or all simultaneously
          # The value must indicate a particular version of the tool, or use 'latest'
          # to always provision the latest version
          cli: 1.10.1.693              # Clojure CLI based on tools.deps
          lein: 2.9.1                  # Leiningen
          boot: 2.8.3                  # Boot.clj
          bb: 0.7.8                    # Babashka
          clj-kondo: 2022.05.31        # Clj-kondo
          cljstyle: 0.15.0             # cljstyle
          cmd-exe-workaround: 'latest' # Replaces `clojure` with `deps.clj` on Windows
          zprint: 1.2.3                # zprint

      - name: Execute clojure code on Linux and MacOS
        if: ${{ matrix.os != 'windows-latest' }}
        run: clojure -e "(+ 1 1)"
        shell: bash

      - name: Execute clojure code on Windows
        if: ${{ matrix.os == 'windows-latest' }}
        run: clojure -e "(+ 1 1)"
        shell: powershell
        
      - name: Get leiningen version
        run: lein -v
        
      - name: Get boot version
        run: boot -V

      - name: Get babashka version
        run: bb --version

      - name: Get clj-kondo version
        run: clj-kondo --version

      - name: Get cljstyle version
        # cljstyle is not yet available for windows
        if: ${{ matrix.os != 'windows-latest' }}
        run: cljstyle version

      - name: Get zprint version
        run: zprint --version
```

For more application cases please check [Smoke Test Workflow file](https://github.com/DeLaGuardo/setup-clojure/blob/master/.github/workflows/smoke-tests.yml)

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
