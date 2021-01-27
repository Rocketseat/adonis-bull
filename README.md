<h1 align="center">
  <img width="275" alt="Adonis Bull" src="https://user-images.githubusercontent.com/16545335/71373449-f2146880-2595-11ea-8a8c-9f51384a3f22.png">
</h1>

<p align="center">
  A <a href="https://github.com/taskforcesh/bullmq">Bull</a> provider for <a href="https://adonisjs.com/">AdonisJs</a> </br>
  Adonis Bull provides an easy way to start using Bull. The fastest, most reliable, Redis-based queue for Node.
</p>

<br />

> This documentation refers to the next version of Adonis Bull, which adds support to Adonis v5. <br />
> If you are using Adonis 4.x, [click here](https://github.com/Rocketseat/adonis-bull/tree/master).

## Table of Contents

- [Getting Started](#getting-started)
- [Setup](#setup)
  * [Connections](#connections)
- [Initialization](#initialization)
  * [ace command](#ace-command)
  * [http server](#http-server)
- [Usage](#usage)
  * [Creating your job](#creating-your-job)
  * [Events](#events)
  * [Processing the jobs](#processing-the-jobs)
  * [Simple job](#simple-job)
  * [Scheduled job](#scheduled-job)
    + [Other ways of using schedule](#other-ways-of-using-schedule)
    + [Using schedule with a third party lib](#using-schedule-with-a-third-party-lib)
  * [Advanced jobs](#advanced-jobs)
  * [Exceptions](#exceptions)
- [Contributing](#contributing)
  * [Contribution Guidelines](#contribution-guidelines)
  * [Code of Conduct](#code-of-conduct)
- [License](#license)


## Getting Started

Let's start by installing the package in our project.

**Yarn**:

```sh
yarn add @rocketseat/adonis-bull@alpha
```

**NPM**:

```sh
npm install @rocketseat/adonis-bull@alpha
```

## Setup

You can configure the project by running the following command:

```sh
node ace invoke @rocketseat/adonis-bull
```

When prompted, you must choose between two start options: `ace command` or `http server`.

_ps: If you don't know what option you should choose. Check the [initialization](#initialization) session._

### Connections

After executing the `invoke` command the `config/bull.ts` file will be created, where you can define the **Redis** connections. A local connection already exists by default.

To add more connections it is important to make sure that it is also defined in the contracts.

An important step is to set the environment variables in your `.env` and validate them in the `env.ts` file.

```js
BULL_REDIS_HOST: Env.schema.string({ format: 'host' }),
BULL_REDIS_PORT: Env.schema.number(),
BULL_REDIS_PASSWORD: Env.schema.string.optional(),
```

## Initialization

The bull can be started in two different ways and this was defined by you in the [setup](#setup) session.

### `ace command`

The bull will be in a separate instance from the HTTP server. To initialize it you can execute the command:

```sh
node ace bull:listen
```

You can define a port with the `--port` flag and you can initialize the [bull-board](https://github.com/vcapretz/bull-board) with the `--board` flag.

### `http server`

When selecting this option a startup file will be created at `start/bull.ts`. The bull will be started together with its server and will share the same instance.

The `start/bull.ts` file will look like this:

```js
import Bull from '@ioc:Rocketseat/Bull'
import Env from '@ioc:Adonis/Core/Env'

const PORT = 9999
const isDevelopment = Env.get('NODE_ENV') === 'development'

Bull.process()

if (isDevelopment) {
  Bull.ui(PORT)
}
```

The bull board will start in the development environment on port `9999`.

## Usage

### Creating your job

Create a new job file by executing the following ace command:

```bash
node ace make:job userRegisterEmail

# ✔  create    app/Jobs/UserRegisterEmail.ts
```

This command will generate a file at `app/Jobs` and add the created job at `start/jobs.ts`.

```ts
const jobs = ["App/Jobs/UserRegisterEmail"]

export default jobs
```

This is an example of how to implement a job for sending emails:

```ts
import { JobContract } from '@ioc:Rocketseat/Bull'
import Mail from '@ioc:Adonis/Addons/Mail'

export default class UserRegisterEmail implements JobContract {
  public key = 'UserRegisterEmail'

  public async handle(job) {
    const { data } = job; // the 'data' variable has user data

    await Mail.send("emails.welcome", data, message => {
      message
        .to(data.email)
        .from("<from-email>")
        .subject("Welcome to yardstick");
    });

    return data;
  }
}
```

You can override the default `configs`.

```ts
import { JobsOptions, QueueOptions, WorkerOptions, Job } from 'bullmq'

export default class UserRegisterEmail implements JobContract {
  ...
  public options: JobsOptions = {}

  public queueOptions: QueueOptions = {}

  public workerOptions: WorkerOptions = {}

  public concurrency = 1

...
}
```

### Events

The package has support for all events triggered by bull.

To define an event you must prefix it with "on" and add the event name (e.g., `onCompleted()`, `onActive()`, `onWaiting()` and etc).

```ts
export default class UserRegisterEmail implements JobContract {
  ...
  public onCompleted(job, result) {}
  public onActive(job) {}
  ...
}
```

### Processing the jobs

### Simple job

You can share the `job` of any `controller`, `hook` or any other place you might like:

```ts
import User from 'App/Models/User'
import Bull from '@ioc:Rocketseat/Bull'
import Job from 'App/Jobs/UserRegisterEmail'

export default class UserController {
  store ({ request, response }) {
    const data = request.only(['email', 'name', 'password'])

    const user = await User.create(data)


    Bull.add(Job.key, user)
  }
}
```

### Scheduled job

Sometimes it is necessary to schedule a job instead of shooting it imediately. You should use `schedule` for that:

```ts
import User from 'App/Models/User'
import ProductOnSale from 'App/Services/ProductOnSale'
import Bull from '@ioc:Rocketseat/Bull'
import Job from 'App/Jobs/UserRegisterEmail'
import parseISO from 'date-fns/parseISO'

export default class HolidayOnSaleController {
  store ({ request, response }) {
    const data = request.only(['date', 'product_list']) // 2020-11-06T12:00:00

    const products = await ProductOnSale.create(data)

    Bull.schedule(Job.key, products, parseISO(data.date))
  }
}
```

This `job` will be sent only on the specific date.

If a date has already passed, an error will occur.

#### Other ways of using schedule

```ts
Bull.schedule(key, data, new Date("2019-11-15 12:00:00"));
Bull.schedule(key, data, 60 * 1000); // 1 minute from now.
```

#### Using schedule with a third party lib

```ts
import humanInterval from 'human-interval'

Bull.schedule(key, data, humanInterval("2 hours")); // 2 hours from now
```

### Advanced jobs

You can use the own `Bull` configs to improve your job:

```ts
Bull.add(key, data, {
  repeat: {
    cron: "0 30 12 * * WED,FRI"
  }
});
```

This `job` will run at 12:30 PM, on Wednesdays and Fridays.

### Exceptions

To have better control over errors that can occur in jobs, events that fail can be handled by creating an `ExceptionHandler`:

```sh
node ace bull:exception
```

A `BullHandler.ts` file will be generated at `App/Exceptions`.

You can change this file to handle job errors as you prefer. Here is an example using **Sentry**:

```ts
import BullExceptionHandler from '@ioc:Rocketseat/Bull/BullExceptionHandler'
import { Job } from '@ioc:Rocketseat/Bull'
import Env from '@ioc:Adonis/Core/Env'
import Logger from '@ioc:Adonis/Core/Logger'
import Sentry from 'App/Services/Sentry'

const isDevelopment = Env.get('NODE_ENV') === 'development'

export default class JobExceptionHandler extends BullExceptionHandler {
  constructor () {
    super(Logger)
  }

  public async handle (error: Error, job: Job) {
    if (isDevelopment) {
      this.logger.error(`key=${job.name} id=${job.id} error=${error.message}`)
    } else {
      Sentry.configureScope(scope => {
        scope.setExtra(job);
      });

      Sentry.captureException(error);
    }
  }
}
```

## Contributing

Thank you for being interested in making this package better. We encourage everyone to help improve this project with new features, bug fixes, or performance improvements. Please take a little bit of your time to read our guide to make this process faster and easier.

### Contribution Guidelines

To understand how to submit an issue, commit and create pull requests, check our [Contribution Guidelines](/.github/CONTRIBUTING.md).

### Code of Conduct

We expect you to follow our [Code of Conduct](/.github/CODE_OF_CONDUCT.md). You can read it to understand what kind of behavior will and will not be tolerated.

## License

MIT License © [Rocketseat](https://github.com/Rocketseat)
