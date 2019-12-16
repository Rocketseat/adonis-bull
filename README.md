# Adonis Bull Provider

This library provides an easy way to start using an asynchronous job queue with AdonisJS.

## Install

`adonis install @rocketseat/adonis-bull`

## Use

Register the Bull provider at `start/app.js`

```js
const providers = [
  //...
  "@rocketseat/adonis-bull/providers/Bull"
];
```

Create a file with the `jobs` that will be processed at `start/jobs.js`:

```js
module.exports = ["App/Jobs/UserRegisterEmail"];
```

Add the config file at `config/bull.js`:

```js
"use strict";

const Env = use("Env");

module.exports = {
  // redis connection
  connection: Env.get("BULL_CONNECTION", "BULL")
};
```

Create a file to initiate `Bull` at `preloads/bull.js`:

```js
const Bull = use("Rocketseat/Bull");

Bull.process();

// Optionally you can start BullBoard:
Bull.ui();
// http://localhost:9999
```

## Creating your job

Create a class that mandatorily has the methods `key` and `handle`.

O método `key` é a identificação única de cada `job`. Ele deve ser um método `static get`.
The `key` method is the unique identification of each job. It has to be a `static get` method.

The `handle` is the method that contains the functionality of your `job`.

```js
const Mail = use("Mail");

class UserRegisterEmail {
  static get key() {
    return "UserRegisterEmail-key";
  }

  async handle(job) {
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

module.exports = UserRegisterEmail;
```

### Events

Você pode configurar os eventos relacionados ao `job` para ter mais controle sobre o mesmo:

You can config the events related to the `job` to have more control over it

```js
const Ws = use('Ws')

class UserRegisterEmail {
  ...

  onCompleted(job, result) {
    Ws
      .getChannel('admin:notifications')
      .topic('admin:notifications')
      .broadcast('new:user', result)
  }
}
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

Outras maneiras de utilizar o `schedule`:
other ways of using `schedule`:

```js
Bull.schedule(key, data, new Date("2019-11-15 12:00:00"));
Bull.schedule(key, data, "2 hours"); // 2 hours from now
Bull.schedule(key, data, 60 * 1000); // 1 minute from now.
```

### Advanced jobs

You can use the own `Bull` configs to improve your job:

```js
Bull.add(key, data, {
  repeat: {
    cron: "0 30 12 * * WED,FRI"
  }
});
```

This `job` will be run at 12:30 PM, only on wednesdays and fridays.

### Exceptions

Para ter um controle maior sobre os erros que ocorrem na sua fila, os eventos que falharem podem ser manipulados no arquivo `App/Exceptions/QueueHandler.js`:

To have a bigger control over errors that might occur on the line, the events that fail can be manipulated at the file `App/Exceptions/QueueHandler.js`:

```js
const Sentry = use("Sentry");

class QueueHandler {
  async report(error, job) {
    Sentry.configureScope(scope => {
      scope.setExtra(job);
    });

    Sentry.captureException(error);
  }
}

module.exports = QueueHandler;
```
