# setup-clojure

This action sets up Clojure tools environment for using in GitHub Actions.

* Clojure CLI
* Leiningen
* boot-clj

# Usage

Here is a snippet for your workflow file:

```yaml
steps:
  - uses: actions/checkout@latest
  - uses: actions/setup-java@v1
    with:
      java-version: '9.0.4' // The JDK version to make available on the path. Required to run any clojure command line tools.
  - uses: DeLaGuardo/setup-clojure@2.0
    with:
      tools-deps: '1.10.1.469'
  - run: clojure -Sdescribe
```

For more application cases please check [Smoke Test Workflow file](https://github.com/DeLaGuardo/setup-clojure/blob/master/.github/workflows/smoke-tests.yml)

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
