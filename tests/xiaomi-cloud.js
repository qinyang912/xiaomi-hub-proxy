const { MiCloud } = require('../xiaomi-cloud')

async function start() {
  const cloud = new MiCloud(['cn'])
  await cloud.login('xxx', 'xxx')
  // cloud.getHubPasscode('1073905901')
  await cloud.getDevices()
}

start().catch((error) => {
  console.error(error)
  process.exit(1)
})
