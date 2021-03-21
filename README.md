<br />

<img width="275" alt="Adonis Bull" src="https://user-images.githubusercontent.com/16545335/71373449-f2146880-2595-11ea-8a8c-9f51384a3f22.png">

<p align="center">
  <h2>A <a href="https://github.com/taskforcesh/bullmq">Bull</a> provider for <a href="https://adonisjs.com/">AdonisJS</a> </br>
  Adonis Bull provides an easy way to start using Bull.
  </h2>
</p>

<div>

[![build-image]][build-url] [![coveralls-image]][coveralls-url] [![license-image]][license-url] [![npm-image]][npm-url]

</div>

<br />

> **This documentation refers to the stable version of Adonis Bull, for Adonis v4.x** <br /> > **If you are using Adonis v5, [click here](https://github.com/Rocketseat/adonis-bull/tree/alpha).**

## Why

Using Bull with Adonis shouldn't be hard. It shouldn't require dozens of steps to configure it. That's why adonis-bull exists. It provides an easy way to use queues when developing applications with AdonisJS.

## Install

```sh
adonis install @rocketseat/adonis-bull
```

## Usage

Register the Bull commands at `start/app.js`

```js
const aceProviders = ['@rocketseat/adonis-bull/providers/Command']
```

Register the Bull provider at `start/app.js`

```js
const providers = [
  //...
  '@rocketseat/adonis-bull/providers/Bull',
]
```

Create a file with the `jobs` that will be processed at `start/jobs.js`:

```js
module.exports = ['App/Jobs/UserRegisterEmail']
```

Add the config file at `config/bull.js`:

```js
'use strict'

const Env = use('Env')

module.exports = {
  // redis connection
  connection: Env.get('BULL_CONNECTION', 'bull'),
  bull: {
    redis: {
      host: '127.0.0.1',
      port: 6379,
      password: null,
      db: 0,
      keyPrefix: '',
    },
  },
  remote: 'redis://redis.example.com?password=correcthorsebatterystaple',
}
```

In the above file you can define redis connections, there you can pass all `Bull` queue configurations described [here](https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md#queue).

Create a file to initiate `Bull` at `preloads/bull.js`:

```js
const Bull = use('Rocketseat/Bull')

Bull.process()
  // Optionally you can start BullBoard:
  .ui(9999, 'localhost') // http://localhost:9999
// You don't need to specify either port or hostname, the default port number is 9999 and the default hostname is localhost
```

Add .preLoad in server.js to initialize the bull preload

```js
new Ignitor(require('@adonisjs/fold'))
  .appRoot(__dirname)
  .preLoad('preloads/bull') // Add This Line
  .fireHttpServer()
  .catch(console.error)
```

## Creating your job

Create a class that mandatorily has the methods `key` and `handle`.

The `key` method is the unique identification of each job. It has to be a `static get` method.

The `handle` is the method that contains the functionality of your `job`.

```js
const Mail = use('Mail')

class UserRegisterEmail {
  static get key() {
    return 'UserRegisterEmail-key'
  }

  async handle(job) {
    const { data } = job // the 'data' variable has user data

    await Mail.send('emails.welcome', data, (message) => {
      message
        .to(data.email)
        .from('<from-email>')
        .subject('Welcome to yardstick')
    })

    return data
  }
}

module.exports = UserRegisterEmail
```

You can use the `connection` static get method to specify which connection your `job` will work.

```js
class UserRegisterEmail {
  // ...
  static get connection() {
    return 'remote'
  }
}
```

### Events

The package has support for all events triggered in the bull, just add "on" and complete with the name of the event
Ex: `onCompleted()`, `onActive()`, `onWaiting()` and etc.

```js
class UserRegisterEmail {
  ...
  onCompleted(job, result) {}
  onActive(job) {}
  ...
}

module.exports = UserRegisterEmail;

```

## Processing the jobs

### Simple job

You can share the `job` of any `controller`, `hook` or any other place you might like:

```js
const User = use('App/Models/User')
const Bull = use('Rocketseat/Bull')
const Job = use('App/Jobs/UserRegisterEmail')

class UserController {
  store ({ request, response }) {
    const data = request.only(['email', 'name', 'password'])

    const user = await User.create(data)


    Bull.add(Job.key, user)
  }
}

module.exports = UserController
```

### Scheduled job

Sometimes it is necessary to schedule a job instead of shooting it imediately. You should use `schedule` for that:

```js
const User = use('App/Models/User')
const Bull = use('Rocketseat/Bull')
const Job = use('App/Jobs/HolidayOnSaleEmail')

class HolidayOnSaleController {
  store ({ request, response }) {
    const data = request.only(['date', 'product_list']) // 2019-11-15 12:00:00

    const products = await ProductOnSale.create(data)


    Bull.schedule(Job.key, products, data.date)
  }
}

module.exports = HolidayOnSaleController
```

This `job` will be sent only on the specific date, wich for example here is on November 15th at noon.

When finishing a date, never use past dates because it will cause an error.

other ways of using `schedule`:

```js
Bull.schedule(key, data, new Date('2019-11-15 12:00:00'))
Bull.schedule(key, data, '2 hours') // 2 hours from now
Bull.schedule(key, data, 60 * 1000) // 1 minute from now.
```

### Advanced jobs

You can use the own `Bull` configs to improve your job:

```js
Bull.add(key, data, {
  repeat: {
    cron: '0 30 12 * * WED,FRI',
  },
})
```

This `job` will be run at 12:30 PM, only on wednesdays and fridays.

### Exceptions

To have a bigger control over errors that might occur on the line, the events that fail can be manipulated at the file `App/Exceptions/QueueHandler.js`:

```js
const Sentry = use('Sentry')

class QueueHandler {
  async report(error, job) {
    Sentry.configureScope((scope) => {
      scope.setExtra(job)
    })

    Sentry.captureException(error)
  }
}

module.exports = QueueHandler
```

## Contributing

Thank you for being interested in making this package better. We encourage everyone to help improve this project with new features, bug fixes, or performance improvements. Please take a little bit of your time to read our guide to make this process faster and easier.

### Contribution Guidelines

To understand how to submit an issue, commit and create pull requests, check our [Contribution Guidelines](/.github/CONTRIBUTING.md).

### Code of Conduct

We expect you to follow our [Code of Conduct](/.github/CODE_OF_CONDUCT.md). You can read it to understand what kind of behavior will and will not be tolerated.

## License

MIT License © [Rocketseat](https://github.com/Rocketseat)

[npm-image]: https://img.shields.io/npm/v/@rocketseat/adonis-bull?color=8257E5&style=for-the-badge
[npm-url]: https://www.npmjs.com/package/@rocketseat/adonis-bull 'npm'
[license-url]: LICENSE.md
[license-image]: https://img.shields.io/github/license/adonisjs/adonis-framework?color=8257E5&style=for-the-badge
[build-url]: https://github.com/Rocketseat/adonis-bull/actions
[build-image]: https://img.shields.io/github/workflow/status/Rocketseat/adonis-bull/Node.js/master?color=8257E5&style=for-the-badge
[coveralls-image]: https://img.shields.io/coveralls/github/Rocketseat/adonis-bull/master?color=8257E5&style=for-the-badge
[coveralls-url]: https://coveralls.io/github/Rocketseat/adonis-bull?branch=master
