class SomeJob {
  static get key () {
    return 'SomeJob-key'
  }

  async handle () {
    return 'good luck'
  }
}

module.exports = SomeJob
