<h1 align="center">
  <img width="275" alt="Adonis Bull" src="https://user-images.githubusercontent.com/16545335/71373449-f2146880-2595-11ea-8a8c-9f51384a3f22.png">
</h1>

<p align="center">
  A <a href="https://github.com/OptimalBits/bull/">Bull</a> provider for the Adonis framework. </br>
  Adonis Bull provides an easy way to start using Bull. The fastest, most reliable, Redis-based queue for Node.
</p>

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
  connection: Env.get("BULL_CONNECTION", "bull"),
  bull: {
    redis: {
      host: "127.0.0.1",
      port: 6379,
      password: null,
      db: 0,
      keyPrefix: ""
    }
  },
  remote: "redis://redis.example.com?password=correcthorsebatterystaple"
};
```

In the above file you can define redis connections, there you can pass all `Bull` queue configurations described [here](https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md#queue).

Create a file to initiate `Bull` at `preloads/bull.js`:

```js
const Bull = use("Rocketseat/Bull");

Bull.process()
  // Optionally you can start BullBoard:
  .ui(9999); // http://localhost:9999
// You don't need to specify the port, the default number is 9999
```

Add .preLoad in server.js to initialize the bull preload

```
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

You can use the `connection` static get method to specify which connection your `job` will work.

```js
class UserRegisterEmail {
  // ...
  static get connection() {
    return "remote";
  }
}
```

### Events

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
