const { network, ethers } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  log("----------------------------------------------------")
  log("Deploying FunWithStorage and waiting for confirmations...")
  const funWithStorage = await deploy("FunWithStorage", {
    from: deployer,
    args: [],
    log: true,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: network.config.blockConfirmations || 1,
  })

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(funWithStorage.address, [])
  }

  log("Logging storage...")
  for (let i = 0; i < 12; i++) {
    log(
      `Location ${i}: ${await ethers.provider.getStorageAt(
        funWithStorage.address,
        i
      )}`
    )
  }

  // You can use this to trace!
  //   const trace = await network.provider.send("debug_traceTransaction", [
  //     funWithStorage.transactionHash,
  //   ])
  //   console.log("trace", trace)
  //   for (structLog in trace.structLogs) {
  //     if (trace.structLogs[structLog].op == "SSTORE") {
  //       console.log(trace.structLogs[structLog])
  //     }
  //   }

  const add32bits = (a, b) => {
    let ndigits = 64,
      d
    ;(carry = 0), (result = "")
    a = a.slice(2)
    b = b.slice(2)

    for (let i = ndigits - 1; i >= 0; i--) {
      d = parseInt(a[i], 16) + parseInt(b[i], 16) + carry
      carry = d >> 4
      result = (d & 15).toString(16) + result
    }

    return "0x" + result
  }

  // 0x405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ace
  for (let x = 0; x < 3; x++) {
    const elementLocation = ethers.utils.solidityKeccak256(["uint256"], [2])
    const newLocation = add32bits(
      elementLocation,
      ethers.utils.hexZeroPad(x, 32)
    )

    const arrayElement = await ethers.provider.getStorageAt(
      funWithStorage.address,
      newLocation
    )
    log(`Array Location ${x} => ${newLocation}: ${arrayElement}`)
  }

  for (let x = 0; x < 3; x++) {
    const newLocation = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(["uint256", "uint256"], [x + "", "3"])
    )

    const arrayElement = await ethers.provider.getStorageAt(
      funWithStorage.address,
      newLocation
    )
    log(`Map Location ${x} => ${newLocation}: ${arrayElement}`)
  }

  // Can you write a function that finds the storage slot of the arrays and mappings?
  // And then find the data in those slots?
}

module.exports.tags = ["storage"]
