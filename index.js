const { webpackModule } = require("./polyfill");
const varChange = require('./nodeTemplate/varChange')
const deviceOutput = require('./nodeTemplate/deviceOutput')
const deviceGetSetVar = require('./nodeTemplate/deviceGetSetVar')
const loop = require('./nodeTemplate/loop')
const onLoad = require('./nodeTemplate/onLoad')

const GRAPH_NAME = 'xiaomi-hub-proxy-home-assistant'

const moduleId = 60936

const mainModule = webpackModule.resolve(moduleId);

const g4 = new mainModule.G4({
  host: "192.168.31.248",
  protocols: ["passcode"],
});

g4.onRequestPasscode = () => {
  g4.setPasscode("736664");
};

async function createEmptyGraph() {
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

  await await mainModule.kd.saveRule(
    [],
    emptyGraph
  )

  return emptyGraph
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
  return '='
}

/**
 * 根据当前用户所有的设备，生成对应的ruleContent
 */
async function generateRuleContent(hubGraph) {
  const did = "62274205"
  const deviceMap = await mainModule.kd.getDevList()
  const urn = deviceMap['62274205'].urn
  // 根据urn获取设备对应的可用配置
  const parseResult = await mainModule.ut.parse(urn)
  const varScope = `R${hubGraph.id}`

  const varList = parseResult.propertyGet.map((item) => getVarConfig({ did, varScope, ...item }))

  const getVarId = (property) => {
    return varList.find((varItem) => varItem.userData.name === createVarName({ did, ...property })).id
  }

  const ruleOfVarChange = parseResult.propertyGet.map((item) => {
    const operator = getOperator(item)
    if (operator === '=') {
      return item.valueList.map((valueItem) => {
        const deviceOutputConfig = deviceOutput({
          did,
          siid: item.siid,
          piid: item.piid,
          value: valueItem.value,
          urn,
        })

        return [
          varChange({
            varId: getVarId(item),
            varScope,
            operator,
            v1: Number(valueItem.value),
            output: [
              `${deviceOutputConfig.id}.trigger`,
            ]
          }),
          deviceOutputConfig,
        ]
      }).flat()
    }

    if (operator === 'between') {
      const deviceOutputConfig = deviceOutput({
        did,
        siid: item.siid,
        piid: item.piid,
        urn,
        varId: getVarId(item),
        min: item.valueRange.min,
        max: item.valueRange.max,
        varScope,
        step: item.valueRange.step,
      })
      return [
        varChange({
          varId: getVarId(item),
          varScope,
          operator,
          v1: Number(item.valueRange.min),
          v2: Number(item.valueRange.max),
          output: [
            `${deviceOutputConfig.id}.trigger`,
          ]
        }),
        deviceOutputConfig,
      ]
    }

    return []
  }).flat()

  const ruleOfDeviceGetSetVar = parseResult.propertyGet.map((item) => {
    return deviceGetSetVar({
      urn,
      did,
      siid: item.siid,
      piid: item.piid,
      varId: getVarId(item),
      varScope,
    })
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

  // 创建变量
  await Promise.all(
    varList.map((varItem) => {
      return g4.callAPI("createVar", {
        scope: varItem.scope,
        id: varItem.id,
        type: varItem.type,
        value: varItem.value,
        userData: varItem.userData
      }, 5e3)
    })
  )

  // 保存规则
  await mainModule.kd.saveRule(ruleList, hubGraph)
}

g4.onSecureSessionEstablish = async () => {
  await mainModule.kd.init(g4);

  const graphList = await g4.callAPI("getGraphList", {}, 5e3)
  const hubGraph = graphList.find((item) => item.userData.name === GRAPH_NAME) || await createEmptyGraph()
  await generateRuleContent(hubGraph)

  // const deviceMap = await mainModule.kd.getDevList();
  // const { scopes: scopeList } = await g4.callAPI('getVarScopeList', {})
  // console.log('scopeList: ', scopeList)
  // const varList = await g4.callAPI('getVarList', { scope: scopeList[1] })
  // console.log('varList: ', varList)

  // const graph = await g4.callAPI('getGraph', { id: graphList[1].id }, 5e3)
  // console.log('graph: ', graph)
  // 根据urn获取设备对应的可用配置
  // const parseResult = await mainModule.ut.parse(deviceMap['62274205'].urn)
  // console.log('parseResult: ', parseResult)

  // const ruleContent = await mainModule.kd.getRuleContent(hubGraph)
  // console.log('ruleContent: ', ruleContent)
}
