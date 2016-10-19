// You will need redis to be installed and running on default settings to run
// this example without errors
const debug = require('debug')('jsw:index')
const koa = require('koa')
const hb = require('koa-handlebars')
const static = require('koa-static')
const router = require('koa-router')()
const redis = require('redis')
const config = require('config3')
const path = require('path')

const app = koa()
const db = redis.createClient()

// getValue - a function demonstrating how to "promisify" a traditional callback
// based function. This is used to get values from redis using the GET command,
// and returns a promise that you can yield safely.
const getValue = function (key) {
  return new Promise((resolve, reject) => {
    db.get(key, (err, reply) => {
      if (err) {
        return reject(err)
      }
      resolve(reply.toString())
    })
  })
}

// Performance tracking. This is a simple example of how to measure a request's
// performance using the yield keyword in a koa middleware.
app.use(function *(next) {
  const start = Date.now()
  yield next
  const end = Date.now()
  debug(`${this.request.method} ${this.request.url}\t${end - start}ms`)
})

// Template support. We set views and layouts to the same directory to simplify
// matters. In production this should be set to separate directories to promote
// better separation of concerns.
app.use(hb({
  defaultLayout: 'main',
  root: __dirname,
  viewsDir: 'view',
  layoutsDir: 'view'
}))

// Sets a value into redis using the SET command, and renders a view after that
router.get('/set/:key/:value', function *() {
  const key = this.params.key
  const value = this.params.value

  db.set(key, value)

  yield this.render('talk', {
    msg: `set ${key} to ${value}`
  })
})

// Gets the value of a key in redis using the GET command and renders a view
// showing that value
router.get('/get/:key', function *() {
  const key = this.params.key
  const value = yield getValue(key)

  yield this.render('talk', {
    msg: value
  })
})

// Attach the router to the koa app as a middleware
app.use(router.routes())
  .use(router.allowedMethods())

// Make sure this is dead last. Serves static files from public
app.use(static(path.join('.', 'public')))

// Only start the app if this is run directly by node (so we can easily test)
if (require.main === module) {
  debug(`Listening to port ${config.port}`)
  app.listen(config.port)
} else {
  module.exports = app
}