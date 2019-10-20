# setup-clojure

This action sets up clojure tools environment for using in GitHub Actions.

* clojure cli
* leiningen
* boot-clj

# Usage

```yaml
steps:
- uses: actions/checkout@latest
- uses: actions/setup-java@v1
  with:
    java-version: '9.0.4' // The JDK version to make available on the path. Required to run any clojure command line tools.
- uses: DeLaGuardo/setup-clojure@1.0
  with:
    tools-deps: '1.10.1.469'
- run: clojure -Sdescribe
```

For more usecases please check [Smoke Test Workflow file](https://github.com/DeLaGuardo/setup-clojure/blob/master/.github/workflows/smoke-tests.yml)

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
