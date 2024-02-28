const Loki = require('lokijs')
const nodePath = require('node:path')
const nodeFs = require('node:fs')

const dbFolder = nodePath.resolve(process.cwd(), '.data/store')

try {
  nodeFs.mkdirSync(dbFolder, { recursive: true })
} catch (e) {
  // pass
}

/**
 * @type {Loki.Collection}
 */
let XiaomiAccountCollection

const db = new Loki(nodePath.resolve(dbFolder, 'store.db'), {
  autoload: true,
  autosave: true,
  autosaveInterval: 1000,
  autoloadCallback: () => {
    XiaomiAccountCollection = db.getCollection('xiaomi-account')
    if (XiaomiAccountCollection == null) {
      XiaomiAccountCollection = db.addCollection('xiaomi-account')
    }
  },
})

/**
 * 添加小米账号
 */
exports.addXiaomiAccount = function addXiaomiAccount({ username, password, servers }) {
  const xiaomiAccount = { username, password, servers }
  const account = XiaomiAccountCollection.findOne({ username })
  if (account) {
    XiaomiAccountCollection.updateWhere(
      (data) => data.username === username,
      (data) => {
        Object.assign(data, xiaomiAccount)
        return data
      }
    )
  } else {
    XiaomiAccountCollection.insert(xiaomiAccount)
  }
  return xiaomiAccount
}

/**
 * 获取小米账号
 */
exports.getXiaomiAccount = function getXiaomiAccount(username) {
  const account = XiaomiAccountCollection.findOne({ username })
  if (!account) return null
  return {
    username: account.username,
    password: account.password,
    servers: account.servers,
  }
}
