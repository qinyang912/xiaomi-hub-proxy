const {
  SERVERS,
  getXiaomiCloud,
  getDevicesByXiaomiAccount,
} = require('./xiami-cloud')
const {
  addOneXiaomiAccount,
} = require('./gateway')
const {
  addXiaomiAccount,
  getXiaomiAccount,
} = require('./store')

// Pass --options via CLI arguments in command to enable these options.
const options = {}

/**
 *
 * @param {import('fastify').FastifyInstance} fastify
 * @param {*} opts
 */
module.exports = async function (fastify, opts) {
  fastify.register(require('@fastify/sensible'))
  fastify.register(require('@fastify/formbody'))

  fastify.register(require('@fastify/jwt'), {
    // TODO: 这个地方的secret应该随机生成，每个用户部署的时候，根据用户的环境生成一个
    secret: 'xxxx',
    sign: { expiresIn: '5d' },
  })
  fastify.decorate('auth', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (error) {
      reply.send(error)
    }
  })
  fastify.decorate('xiaomiAccount', async (request, reply) => {
    try {
      const account = getXiaomiAccount(request.user.username)
      request.xiaomiAccount = account
    } catch (error) {
      reply.send(error)
    }
  })

  fastify.post(
    '/init-xiaomi-cloud',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            username: { type: 'string' },
            password: { type: 'string' },
            servers: {
              type: 'array',
              items: {
                enum: SERVERS.slice(0),
              },
            },
          },
          required: ['username', 'password'],
        },
      },
    },
    async (request, replay) => {
      const { body: { username, password, servers = ['cn'] } } = request

      const xiaomiAccount = {
        servers,
        username,
        password,
      }

      await getXiaomiCloud(xiaomiAccount)

      addXiaomiAccount(xiaomiAccount)

      // TODO: 暂时屏蔽
      // await addOneXiaomiAccount(xiaomiAccount)

      const token = await replay.jwtSign({ username })

      return { token }
    }
  )

  // 获取中枢网关列表
  fastify.get(
    '/gateway/list',
    {
      onRequest: [fastify.auth, fastify.xiaomiAccount],
    },
    async (request, replay) => {
      const devices = await getDevicesByXiaomiAccount(request.xiaomiAccount)
      return devices.filter((device) => device.model === 'xiaomi.gateway.hub1')
    }
  )

  // 获取某个中枢网关下面的设备列表
  fastify.get(
    '/devices',
    {
      onRequest: [fastify.auth],
      schema: {
        querystring: {
          type: 'object',
          properties: {
            gatewayDid: {
              type: 'string'
            },
          },
          required: ['gatewayDid'],
        },
      },
    },
    async (request, reply) => {
      return []
    },
  )
}

module.exports.options = options
