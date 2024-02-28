const varChange = require('./nodeTemplate/varChange')
const deviceOutput = require('./nodeTemplate/deviceOutput')
const deviceGetSetVar = require('./nodeTemplate/deviceGetSetVar')
const loop = require('./nodeTemplate/loop')
const onLoad = require('./nodeTemplate/onLoad')

const GRAPH_NAME = 'xiaomi-hub-proxy-home-assistant'

/**
 * @param {import('./gateway').Gateway} gateway
 */
async function createEmptyGraph(gateway) {
  const emptyGraph = {
    "id": String(Date.now()),
    "userData": {
      "name": GRAPH_NAME,
      "transform": {
        "x": 0,
        "y": 0,
        "scale": 1,
        "rotate": 0
      },
      "lastUpdateTime": Date.now(),
      "version": 0
    },
    "uiType": "test",
    "enable": true
  }

  await gateway.saveRule([], emptyGraph)

  return emptyGraph
}

/**
 * @param {import('./gateway').Gateway} gateway
 */
async function getDeviceConfigMap(gateway, deviceList) {
  const { promise, deviceConfigMap } = deviceList.reduce((acc, device) => {
    acc.promise = acc.promise.then(async () => {
      const deviceConfig = await gateway.getDeviceConfig(device.urn)
      acc.deviceConfigMap[device.did] = deviceConfig
    })
    return acc
  }, { promise: Promise.resolve(), deviceConfigMap: {} })

  await promise

  return deviceConfigMap
}

function createVarId() {
  return "".concat("V").concat(Array.from(crypto.getRandomValues(new Uint32Array(10))).map((function(e) {
      return "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"[e % 62]
  }
  )).join(""))
}

function createVarName(property) {
  return `${property.did}_${property.siid}_${property.piid}_${property.description}`
}

function getVarConfig(property) {
  const baseConfig = {
    id: createVarId(),
    scope: property.varScope,
    type: 'number',
    userData: { name: createVarName(property) },
    value: (() => {
      if (property.dtype === 'boolean') return 0
      if (property.dtype === 'int') {
        if ('valueRange' in property) return property.valueRange.min
        if ('valueList' in property) return property.valueList[0].value
      }
      return 0
    })(),
  }
  return baseConfig
}

function getOperator(property) {
  if ('valueRange' in property) return 'between'
  if ('valueList' in property) return '='
  // 有可能属性是一个只读属性
  return null
}

class Graph {
  /**
   *
   * @param {{gateway: import('./gateway').Gateway}} options
   */
  constructor(options) {
    this.gateway = options.gateway
    this.varScope = null
  }

  async init() {
    const graphList = await this.gateway.getGraphList()
    const hubGraph = graphList.find((item) => item.userData.name === GRAPH_NAME) || await createEmptyGraph(this.gateway)
    const deviceList = await this.gateway.getDeviceList()

    const deviceConfigMap = await getDeviceConfigMap(this.gateway, deviceList)

    this.deviceList = deviceList
    this.deviceConfigMap = deviceConfigMap
    this.varScope = `R${hubGraph.id}`

    await this.initVarList()

    // 创建变量
    await Promise.all(
      this.varListToAdd.map((varItem) => {
        return this.gateway.createVar({
          scope: varItem.scope,
          id: varItem.id,
          type: varItem.type,
          value: varItem.value,
          userData: varItem.userData
        })
      })
    )

    // TODO: 暂时注释
    // const ruleList = this.createRuleList()
    // await this.gateway.saveRule(ruleList, hubGraph)

    // 移除不用的变量
    await Promise.all(
      this.varListToDelete.map((varItem) => {
        return this.gateway.deleteVar({
          scope: varItem.scope,
          id: varItem.id,
        })
      })
    )
  }

  async initVarList() {
    const oldVarList = await this.gateway.getVarList(this.varScope)
    const oldVarNameMap = oldVarList.reduce((acc, varItem) => {
      acc[varItem.userData.name] = varItem
      return acc
    }, {})

    const { varList } = this.deviceList.reduce((acc, device) => {
      const { did } = device
      const deviceConfig = this.deviceConfigMap[did]

      deviceConfig.propertyGet.forEach((property) => {
        const varName = createVarName({ did, ...property })

        if (oldVarNameMap[varName]) {
          acc.varList.push(oldVarNameMap[varName])
          return
        }

        const varItem = getVarConfig({ did, varScope: this.varScope, ...property })
        acc.varList.push(varItem)
      })

      return acc
    }, { varList: [] })

    const varNameMap = varList.reduce((acc, varItem) => {
      acc[varItem.userData.name] = varItem
      return acc
    }, {})

    const varListToAdd = varList.reduce((acc, varItem) => {
      if (!oldVarNameMap[varItem.userData.name]) {
        acc.push(varItem)
      }
      return acc
    }, [])

    const varListToDelete = oldVarList.reduce((acc, varItem) => {
      if (!varNameMap[varItem.userData.name]) {
        acc.push(varItem)
      }
      return acc
    }, [])

    this.varList = varList
    this.varNameMap = varNameMap
    this.varListToAdd = varListToAdd
    this.varListToDelete = varListToDelete
  }

  getVarId(property) {
    const varName = createVarName(property)
    return this.varNameMap[varName]?.id
  }

  createRuleList() {
    const { ruleOfVarChange, ruleOfDeviceGetSetVar } = this.deviceList.reduce((acc, device) => {
      const { did, urn } = device
      const deviceConfig = this.deviceConfigMap[did]

      // 设备的属性分propertyGet和propertySet, 如果在propertyGet但是没在propertySet, 说明是只读属性
      // TODO: 如果属性值有变化，就同步到设备，这个属性只能从propertySet获取，因为只有这里的属性才是可配置属性
      // TODO: 每10s钟从设备同步过来的属性，可以从propertyGet获取，这里的属性都是可读属性，而这里的属性的值可以同步给home assistant
      deviceConfig.propertyGet.forEach((property) => {
        const operator = getOperator(property)
        if (operator === '=') {
          const list = property.valueList.map((valueItem) => {
            const deviceOutputConfig = deviceOutput({
              did,
              siid: property.siid,
              piid: property.piid,
              value: valueItem.value,
              urn,
            })

            return [
              varChange({
                varId: this.getVarId({ did, ...property }),
                varScope: this.varScope,
                operator,
                v1: Number(valueItem.value),
                output: [
                  `${deviceOutputConfig.id}.trigger`,
                ]
              }),
              deviceOutputConfig,
            ]
          }).flat()

          acc.ruleOfVarChange.push(...list)
        }
        if (operator === 'between') {
          const deviceOutputConfig = deviceOutput({
            did,
            siid: property.siid,
            piid: property.piid,
            urn,
            varId: this.getVarId({ did, ...property }),
            min: property.valueRange.min,
            max: property.valueRange.max,
            varScope: this.varScope,
            step: property.valueRange.step,
          })

          const list = [
            varChange({
              varId: this.getVarId({ did, ...property }),
              varScope: this.varScope,
              operator,
              v1: Number(property.valueRange.min),
              v2: Number(property.valueRange.max),
              output: [
                `${deviceOutputConfig.id}.trigger`,
              ]
            }),
            deviceOutputConfig,
          ]
          acc.ruleOfVarChange.push(...list)
        }

        acc.ruleOfDeviceGetSetVar.push(
          deviceGetSetVar({
            urn,
            did,
            siid: property.siid,
            piid: property.piid,
            varId: this.getVarId({ did, ...property }),
            varScope: this.varScope,
          })
        )
      })

      return acc
    }, {
      ruleOfDeviceGetSetVar: [],
      ruleOfVarChange: []
    })

    const loopRule = loop({
      interval: 10000,
      output: ruleOfDeviceGetSetVar.map((r) => `${r.id}.input`),
    })

    const ruleList = [
      onLoad({
        output: [
          `${loopRule.id}.start`,
        ]
      }),
      loopRule,
      ...ruleOfDeviceGetSetVar,
      ...ruleOfVarChange,
    ]

    return ruleList
  }
}

exports.Graph = Graph
