const { XiaomiCloud } = require('./xiaomi-cloud')

/**
 * 创建一个分离的promise, 可用于需要单独返回promise, resolve, reject的场景
 */
const createSeparatePromise = () => {
  let resolveT
  let rejectT
  const p = new Promise((resolve, reject) => {
    resolveT = resolve
    rejectT = reject
  })

  return {
    promise: p,
    resolve: resolveT,
    reject: rejectT,
  }
}

exports.createSeparatePromise = createSeparatePromise

/**
 * @type {(xiaomiAccount: any) => Promise<XiaomiCloud>}
 */
const getXiaomiCloud = (() => {
  const cloudCache = {}
  return async (xiaomiAccount) => {
    const { servers, username, password } = xiaomiAccount
    if (cloudCache[username]) return cloudCache[username]
    const cloud = new XiaomiCloud(servers)
    const { promise, resolve, reject } = createSeparatePromise()
    cloudCache[username] = promise
    try {
      const result = await cloud.login(username, password)
      if (!result) {
        reject(new Error('小米账号/密码不对'))
        return
      }
      resolve(cloud)
    } catch (error) {
      reject(error)
    }
    return promise
  }
})()
exports.getXiaomiCloud = getXiaomiCloud

/**
 * @returns {Promise<string>}
 */
async function getHubPasscodeByXiaomiAccount(xiaomiAccount, did) {
  const cloud = await getXiaomiCloud(xiaomiAccount)
  const { passcode } = await cloud.getHubPasscode(did)
  return passcode
}

exports.getHubPasscodeByXiaomiAccount = getHubPasscodeByXiaomiAccount

/**
 * @returns {Promise<{model: string, did: string, localip: string}[]>}
 */
async function getDevicesByXiaomiAccount(xiaomiAccount) {
  const cloud = await getXiaomiCloud(xiaomiAccount)
  const { list } = await cloud.getDevices()
  return list
}

exports.getDevicesByXiaomiAccount = getDevicesByXiaomiAccount
