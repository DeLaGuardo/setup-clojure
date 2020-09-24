# setup-clojure

This action sets up Clojure tools environment for using in GitHub Actions.

* Clojure CLI
* Leiningen
* boot-clj

All three major tools available for MacOS and ubuntu based runners, Leiningen also available on Windows

# Usage

Here is a snippet for your workflow file:

```yaml
steps:
- uses: actions/checkout@latest
# The JDK version to make available on the path. Required to run any clojure command line tools.
# You can use any package that providing any JDK here, eg. `actions/setup-java@v1`
# or you can use mine package to provision graalvm on hosted environment.
- uses: DeLaGuardo/setup-graalvm@2.0
  with:
    graalvm-version: '19.3.1.java11'
- uses: DeLaGuardo/setup-clojure@master
  with:
    # To use Clojure CLI 1.10.1.561 based on tools.deps
    cli: '1.10.1.469'
    # leiningen and boot-cli can be installed as well
    lein: 2.9.4
    # For leiningen and boot you could use 'latest' version
    boot: latest
# desired executables will be available
# Please install separatelly rlwrap
# if you are planning to use `clj` instead of `clojure` as a CLI runner
- run: clojure -Sdescribe
- run: lein -v
- run: boot -V
```

For more application cases please check [Smoke Test Workflow file](https://github.com/DeLaGuardo/setup-clojure/blob/master/.github/workflows/smoke-tests.yml)

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
