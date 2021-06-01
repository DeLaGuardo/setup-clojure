# setup-clojure

This action sets up Clojure tools environment for using in GitHub Actions.

* Clojure CLI
* Leiningen
* boot-clj

All three major tools available for MacOS and ubuntu based runners, Leiningen and Clojure CLI also available on Windows

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
        uses: actions/checkout@v2

      - name: Prepare java
        uses: actions/setup-java@v1
        with:
          java-version: 1.8

      - name: Install clojure tools
        uses: DeLaGuardo/setup-clojure@3.4
        with:
          # Install just one or all simultaneously
          cli: 1.10.1.693 # Clojure CLI based on tools.deps
          lein: 2.9.1     # or use 'latest' to always provision latest version of leiningen
          boot: 2.8.3     # or use 'latest' to always provision latest version of boot

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
        # Boot is not yet available for windows
        if: ${{ matrix.os != 'windows-latest' }}
        run: boot -V
```

For more application cases please check [Smoke Test Workflow file](https://github.com/DeLaGuardo/setup-clojure/blob/master/.github/workflows/smoke-tests.yml)

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
