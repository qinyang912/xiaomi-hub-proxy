const { Graph } = require('./graph')
const { Gateway } = require('./gateway')
const { getDevicesByXiaomiAccount } = require('../xiami-cloud')

async function addOneXiaomiAccount(xiaomiAccount) {
  const devices = await getDevicesByXiaomiAccount(xiaomiAccount)
  const gatewayDeviceList = devices.filter((device) => device.model === 'xiaomi.gateway.hub1')

  gatewayDeviceList.forEach(async (device) => {
    const gateway = new Gateway({
      host: device.localip,
      did: device.did,
      xiaomiAccount,
    })
    await gateway.init()

    const graph = new Graph({ gateway })
    await graph.init()
  })
}

exports.addOneXiaomiAccount = addOneXiaomiAccount
