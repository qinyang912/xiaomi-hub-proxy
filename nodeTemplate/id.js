exports.getId = (() => {
  let currentId = Date.now()
  return () => {
    return currentId++
  }
})()
