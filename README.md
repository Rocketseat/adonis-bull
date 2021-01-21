<h1 align="center">
  <img width="275" alt="Adonis Bull" src="https://user-images.githubusercontent.com/16545335/71373449-f2146880-2595-11ea-8a8c-9f51384a3f22.png">
</h1>

<p align="center">
  A <a href="https://github.com/taskforcesh/bullmq">Bull</a> provider for the Adonis framework. </br>
  Adonis Bull provides an easy way to start using Bull. The fastest, most reliable, Redis-based queue for Node.
</p>

<br /><br />

# Table of Contents
- [Install](#install)
  - [Yarn](#yarn)
  - [Npm](#npm)
- [Setup](#setup)
- [Initialization](#initialization)
  - [Ace command](#ace-command)
  - [Http server](#http-server)
- [Usage](#usage)
  - [Creating your job](#creating-your-job)
  - [Events](#events)
  - [Processing the jobs](#processing-the-jobs)
    - [Simple job](#simple-job)
    - [Scheduled job](#scheduled-job)
    - [Advanced jobs](#advanced-jobs)
  - [Exceptions](#exceptions)



<br /><br />

## Install
#
Let's start by installing the package in our project.

#### YARN

```
yarn add @rocketseat/adonis-bull@alpha
```

#### NPM

```
npm install @rocketseat/adonis-bull@alpha
```

<br /><br />

## Setup
#

Okay, now we need to configure the project. But don't worry, we will do this for you with a command.

```
node ace invoke @rocketseat/adonis-bull@alpha
```

You must choose between two start options: `ace command` or `http server`. <br /><br />
_You can get more information about these options in the [initialization](#initialization) session_

<br />

### Connections

After executing the `invoke` command the `config/bull.ts` file will be created, where you can define the **Redis** connections. A local connection already exists by default. 

To add more connections it is important to make sure that it is also defined in the contracts.

An important step is to set the environment variables in your `.env` and validate them in the` env.ts` file

```js
BULL_REDIS_HOST: Env.schema.string({ format: 'host' }),
BULL_REDIS_PORT: Env.schema.number(),
BULL_REDIS_PASSWORD: Env.schema.string.optional(),
```

<br /><br />

## Initialization
#


The bull can be started in two different ways and this was defined by you in the [setup](#setup) session

### `ace command`

The bull will be in a separate instance from the http server. To initialize it you can execute the command:

```
node ace bull:listen
```

You can define a port with the `--port` flag and you can initialize the [bull-board](https://github.com/vcapretz/bull-board) with the `--board` flag.

<br />

### `http server`

When selecting this option a startup file will be created `start / bull.ts`, with which the bull will be started together with its server and will share the same instance. Your `start / bull.ts` file should look like this:

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

The bull board will only be started in the development environment and by default on port `9999`.

<br /> <br />

## Usage
#

### Creating your job

Create a new job file by executing the following ace command.

```bash
node ace make:job userRegisterEmail

# ✔  create    app/Jobs/UserRegisterEmail.ts
```

This command will create a file with the `jobs` that will be processed at `start/jobs.ts` e adicionará o job criado:

```ts
const jobs = ["App/Jobs/UserRegisterEmail"]

export default jobs
```

O seu job será gerado dentro de `app/Jobs`. <br />
_Exemplo da implementação de um job para envio de e-mails._ 

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
...
import { JobsOptions, QueueOptions, WorkerOptions, Job } from 'bullmq'

export default class UserRegisterEmail implements JobContract {
  ...
  public options: JobsOptions = {}

  public queueOptions: QueueOptions = {}

  public workerOptions: WorkerOptions = {}
}
```

<br />

### Events
#

You can config the events related to the `job` to have more control over it

```ts
...
import Ws from 'App/Services/Ws'

export default class UserRegisterEmail implements JobContract {
  ...

  boot(queue) {
    queue.on('complete', (job, result) => {
      Ws
        .getChannel('admin:notifications')
        .topic('admin:notifications')
        .broadcast('new:user', result)
    })
  }
}
```

<br />

### Processing the jobs
#

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

<br />

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

This `job` will be sent only on the specific date, wich for example here is on November 15th at noon.

When finishing a date, never use past dates because it will cause an error.

other ways of using `schedule`:

```ts
Bull.schedule(key, data, new Date("2019-11-15 12:00:00"));
Bull.schedule(key, data, 60 * 1000); // 1 minute from now.
```

Or with a third party lib:

```ts
import humanInterval from 'human-interval'

Bull.schedule(key, data, humanInterval("2 hours")); // 2 hours from now
```

<br />

### Advanced jobs

You can use the own `Bull` configs to improve your job:

```ts
Bull.add(key, data, {
  repeat: {
    cron: "0 30 12 * * WED,FRI"
  }
});
```

This `job` will be run at 12:30 PM, only on wednesdays and fridays.

<br />

### Exceptions
#

To have a bigger control over errors that might occur on the line, the events that fail can be manipulated at the file `app/Exceptions/Handler.ts`:

```ts
import Sentry from 'App/Services/Sentry'

import Logger from '@ioc:Adonis/Core/Logger'
import HttpExceptionHandler from '@ioc:Adonis/Core/HttpExceptionHandler'

export default class ExceptionHandler extends HttpExceptionHandler {
  constructor () {
    super(Logger)
  }

  async report(error, job) {
    Sentry.configureScope(scope => {
      scope.setExtra(job);
    });

    Sentry.captureException(error);
  }
}
```
