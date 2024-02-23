const axios = require('axios').default
const { CookieJar } = require('tough-cookie')
const { HttpCookieAgent, HttpsCookieAgent } = require('http-cookie-agent/http')
const crypto = require('node:crypto')
const assert = require('node:assert')
const base64url = require('base64url').default
const { RC4 } = require('./rc4')

const SERVERS = ["cn", "de", "i2", "ru", "sg", "us"]
exports.SERVERS = SERVERS

const ACCESS_KEY = 'IOS00026747c5acafc2'

function getRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function createSession() {
  const deviceId = getRandomString(16)
  const jar = new CookieJar()
  jar.setCookieSync(
    `sdkVersion=3.8.6`,
    'https://account.xiaomi.com'
  )
  jar.setCookieSync(
    `deviceId=${deviceId}`,
    'https://account.xiaomi.com'
  )
  const session = axios.create({
    httpAgent: new HttpCookieAgent({ cookies: { jar } }),
    httpsAgent: new HttpsCookieAgent({ cookies: { jar } }),
    headers: {
      'User-Agent': `Android-7.1.1-1.0.0-ONEPLUS A3010-136-${deviceId} APP/xiaomi.smarthome APPV/62830`,
    },
  })

  return { session, deviceId, jar }
}

function generateNonce() {
  const currentTime = Math.floor(Date.now() / 60000)
  const randomBytes = crypto.randomBytes(8) // 生成一个长度为 8 字节的随机字节串
  const timeBytes = Buffer.alloc(4) // 创建一个长度为 4 字节的缓冲区
  timeBytes.writeUInt32BE(currentTime, 0) // 将当前时间写入缓冲区，使用大端序

  const nonce = Buffer.concat([randomBytes, timeBytes]) // 将随机字节串和时间字节串拼接在一起
  return base64url.toBase64(base64url.encode(nonce)) // 对拼接后的字节串进行 Base64 编码
}

function generateSignedNonce(ssecret, nonce) {
  const m = crypto.createHash('sha256')
  const ssecretBuffer = Buffer.from(base64url.toBuffer(ssecret), 'binary')
  const nonceBuffer = Buffer.from(base64url.toBuffer(nonce), 'binary')

  m.update(ssecretBuffer);
  m.update(nonceBuffer);

  const b = m.digest()

  return base64url.toBase64(base64url.encode(b))
}

function generateSignature(url, signed_nonce, data) {
  const keys = Object.keys(data).sort()
  const dataString = keys.map(key => `${key}=${data[key]}`).join('&')
  const sign = `POST&${url}&${dataString}&${signed_nonce}`
  const signature = crypto.createHash('sha1').update(sign).digest()
  return base64url.toBase64(base64url.encode(signature))
}

function encryptRc4(pwd, data) {
  const rc4 = new RC4(Buffer.from(base64url.toBuffer(pwd), 'binary')).init1024()
  const encryptedData = rc4.crypt(Buffer.from(data, 'binary'))
  return base64url.toBase64(base64url.encode(encryptedData))
}

function decryptRc4(pwd, data) {
  const rc4 = new RC4(Buffer.from(base64url.toBuffer(pwd), 'binary')).init1024()
  const decryptedData = rc4.crypt(Buffer.from(base64url.toBuffer(data), 'binary'))
  return decryptedData
}

function getBaseUrl(server) {
  const baseUrl = server === 'cn'
    ? 'https://api.io.mi.com/app'
    : `https://${server}.api.io.mi.com/app`
  return baseUrl
}

class XiaomiCloud {
  /**
   * @param {string[]} servers
   */
  constructor(servers) {
    this.servers = servers
    const { session, deviceId, jar } = createSession()
    this.session = session
    this.jar = jar
    this.deviceId = deviceId
  }

  /**
   * @param {string} username
   * @param {string} password
   */
  async login(username, password) {
    const payload = await this.loginStep1()
    const data = await this.loginStep2(username, password, payload)
    if (!data.location) return false
    const token = await this.loginStep3(data.location)

    this.auth = {
      'ssecurity': data.ssecurity,
    }

    this.servers.forEach((server) => {
      const baseUrl = getBaseUrl(server)
      this.jar.setCookieSync(
        `userId=${data.userId}`,
        baseUrl,
      )
      this.jar.setCookieSync(
        `locale=en_US`,
        baseUrl,
      )
      this.jar.setCookieSync(
        `serviceToken=${token}`,
        baseUrl
      )
    })

    return true
  }

  async loginStep1() {
    const result = await this.session.get(
      'https://account.xiaomi.com/pass/serviceLogin',
      {
        params: {
          sid: 'xiaomiio',
          '_json': 'true'
        },
      }
    ).then((res) => res.data)

    const jsonResult = JSON.parse(result.slice(11))

    return ['sid', 'qs', 'callback', '_sign'].reduce((acc, key) => {
      acc[key] = jsonResult[key]
      return acc
    }, {})
  }

  /**
   * @param {string} username
   * @param {string} password
   * @param {any} payload
   */
  async loginStep2(username, password, payload) {
    const md5 = crypto.createHash('md5')
    md5.update(password)
    const hash = md5.digest('hex').toUpperCase();
    const result = await this.session.post(
      'https://account.xiaomi.com/pass/serviceLoginAuth2',
      {
        ...payload,
        user: username,
        hash,
      },
      {
        params: {
          '_json': 'true'
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    ).then((res) => res.data)

    const jsonResult = JSON.parse(result.slice(11))
    return jsonResult
  }

  async loginStep3(location) {
    await this.session.get(location)
    const cookies = this.jar.getCookiesSync(location)
    return cookies.find(cookie => cookie.key === 'serviceToken')?.value
  }

  /**
   * 获取登录验证码
   * @param {string} did
   * @returns {Promise<{passcode: string}>}
   */
  async getHubPasscode(did) {
    const payload = {
      method: 'miIO.get_central_link_passcode',
      accessKey: ACCESS_KEY,
      params: {},
    }
    const result = await this.requestFromServers(
      `/home/rpc/${did}`,
      payload,
    )
    return result
  }

  async getRooms() {
    const payload = {
      fg: true,
      fetch_share: true,
      limit: 300,
    }
    const result = await this.requestFromServers(
      '/v2/homeroom/gethome',
      payload,
    )
    return result
  }

  async getDevices() {
    const payload = {
      getVirtualModel: true,
      getHuamiDevices: 1,
      get_split_device: false,
      support_smart_home: true,
    }

    const result = await this.requestFromServers(
      '/v2/home/device_list_page',
      payload,
    )
    return result
  }

  async requestFromServers(url, payload) {
    for (const server of this.servers) {
      const result = await this.request(server, url, payload)
      if (result) return result
    }
  }

  /**
   *
   * @param {string} server
   * @param {string} url
   * @param {object} payload
   */
  async request(server, url, payload) {
    assert(SERVERS.includes(server), `Wrong server: ${server}`)
    const baseUrl = getBaseUrl(server)

    const data = JSON.stringify(payload)

    const nonce = generateNonce()

    const signedNonce = generateSignedNonce(this.auth.ssecurity, nonce)
    let params = { data }
    params.rc4_hash__ = generateSignature(url, signedNonce, params)

    params = Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, encryptRc4(signedNonce, v)])
    )

    params.signature = generateSignature(url, signedNonce, params)
    params.ssecurity = this.auth.ssecurity
    params._nonce = nonce

    const result = await this.session.post(
      baseUrl + url,
      params,
      {
        headers: {
          'Accept-Encoding': 'identity',
          'Content-Type': 'application/x-www-form-urlencoded',
          'x-xiaomi-protocal-flag-cli': 'PROTOCAL-HTTP2',
          'MIOT-ENCRYPT-ALGORITHM': 'ENCRYPT-RC4',
        }
      }
    ).then((res) => res.data)

    const jsonResult = JSON.parse(
      decryptRc4(signedNonce, result).toString(),
    )

    assert(jsonResult.code === 0, jsonResult.result)

    return jsonResult.result
  }
}

exports.XiaomiCloud = XiaomiCloud
