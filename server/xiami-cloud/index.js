const { XiaomiCloud, SERVERS } = require('./xiaomi-cloud')
const {
  createSeparatePromise,
  getXiaomiCloud,
  getHubPasscodeByXiaomiAccount,
  getDevicesByXiaomiAccount,
} = require('./helpers')

exports.XiaomiCloud = XiaomiCloud
exports.SERVERS = SERVERS

exports.createSeparatePromise = createSeparatePromise
exports.getXiaomiCloud = getXiaomiCloud
exports.getHubPasscodeByXiaomiAccount = getHubPasscodeByXiaomiAccount
exports.getDevicesByXiaomiAccount = getDevicesByXiaomiAccount
