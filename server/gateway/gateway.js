const { webpackModule } = require("./polyfill")
const { getHubPasscodeByXiaomiAccount, createSeparatePromise } = require('../xiami-cloud')

const moduleId = 60936

const mainModule = webpackModule.resolve(moduleId)

class Gateway {
  /**
   * @param {{host: string, did: string, xiaomiAccount: { username: string, password: string, servers: string[] }}} options
   */
  constructor(options) {
    const { host, did, xiaomiAccount } = options
    this.host = host
    this.did = did
    this.xiaomiAccount = xiaomiAccount
  }

  async init() {
    const { promise, resolve, reject } = createSeparatePromise()

    this.initPromise = promise

    const g4 = new mainModule.G4({
      host: this.host,
      protocols: ["passcode"],
    })

    g4.onRequestPasscode = async () => {
      const passcode = await getHubPasscodeByXiaomiAccount(this.xiaomiAccount, this.did)
      g4.setPasscode(passcode)
    }

    g4.onSecureSessionEstablish = async () => {
      // // TODO: mainModule.kd是一个通用模块，如果要同时管理多个gateway, 估计会有问题，后面测试一下试试
      await mainModule.kd.init(g4)
      this.g4 = g4
      resolve()
    }

    await promise
  }

  async saveRule(ruleList, graphCfg) {
    // await mainModule.kd.init(this.g4)
    await mainModule.kd.saveRule(ruleList, graphCfg)
  }

  async getDeviceList() {
    // await mainModule.kd.init(this.g4)
    const deviceMap = await mainModule.kd.getDevList()
    const deviceList = Object.keys(deviceMap).map((did) => {
      return { did, ...deviceMap[did] }
    })
    return deviceList
  }

  async getRuleContent(graphCfg) {
    // await mainModule.kd.init(this.g4)
    const ruleContent = await mainModule.kd.getRuleContent(graphCfg)
    return ruleContent
  }

  async getGraphList() {
    const graphList = await this.g4.callAPI("getGraphList", {}, 5e3)
    return graphList
  }

  /**
   * @param {{scope: string, id: string, type: string, value: any, userData: any}} varConfig
   */
  async createVar(varConfig) {
    const result = await this.g4.callAPI("createVar", varConfig, 5e3)
    return result
  }

  /**
   * @param {{scope: string, id: string}} varConfig
   */
  async deleteVar(varConfig) {
    const params = { scope: varConfig.scope, id: varConfig.id }
    await this.g4.callAPI('deleteVar', params, 5e3)
  }

  /**
   * @param {string} scope
   */
  async getVarList(scope) {
    const varMap = await this.g4.callAPI('getVarList', { scope })
    const varList = Object.keys(varMap).map((id) => {
      return { id, scope, ...varMap[id] }
    })
    return varList
  }

  /**
   * @param {string} urn
   */
  async getDeviceConfig(urn) {
    const deviceConfig = await mainModule.ut.parse(urn)
    return deviceConfig
  }
}

exports.Gateway = Gateway
