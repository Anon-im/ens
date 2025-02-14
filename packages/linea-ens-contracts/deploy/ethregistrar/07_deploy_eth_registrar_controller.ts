import { Interface } from 'ethers/lib/utils'
import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const { makeInterfaceId } = require('@openzeppelin/test-helpers')

function computeInterfaceId(iface: Interface) {
  return makeInterfaceId.ERC165(
    Object.values(iface.functions).map((frag) => frag.format('sighash')),
  )
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, network } = hre
  const { deploy } = deployments
  const { deployer, owner } = await getNamedAccounts()

  const registry = await ethers.getContract('ENSRegistry', owner)

  const registrar = await ethers.getContract(
    'BaseRegistrarImplementation',
    owner,
  )
  const reverseRegistrar = await ethers.getContract('ReverseRegistrar', owner)
  const nameWrapper = await ethers.getContract('NameWrapper', owner)
  let pohVerifierAddress
  if (network.tags.reuse_poh_verifier) {
    switch (network.name) {
      case 'lineaMainnet':
        // PohVerifier deployed on Linea Mainnet
        pohVerifierAddress = '0xBf14cFAFD7B83f6de881ae6dc10796ddD7220831'
        break
      case 'lineaSepolia':
        // PohVerifier deployed on Linea Sepolia
        pohVerifierAddress = '0x576754D133C02B2E229F2630Baa2F06110cE9a9A'
        break
      default:
        throw 'Network not supported with reuse_poh_verifier tag'
    }
    console.log(`Reusing PohVerifier at address ${pohVerifierAddress}`)
  } else {
    pohVerifierAddress = (await ethers.getContract('PohVerifier', owner))
      .address
  }
  const pohRegistrationManager = await ethers.getContract(
    'PohRegistrationManager',
    owner,
  )
  const fixedPriceOracle = await ethers.getContract('FixedPriceOracle', owner)
  const baseNode = ethers.utils.namehash(process.env.BASE_DOMAIN + '.eth')
  const baseDomainStr = '.' + process.env.BASE_DOMAIN + '.eth'

  const deployArgs = {
    from: deployer,
    args: [
      registrar.address,
      fixedPriceOracle.address, // Pass the FixedPriceOracle address
      60,
      86400,
      reverseRegistrar.address,
      nameWrapper.address,
      registry.address,
      pohVerifierAddress,
      pohRegistrationManager.address,
      baseNode,
      baseDomainStr,
    ],
    log: true,
  }
  const controller = await deploy('ETHRegistrarController', deployArgs)
  if (!controller.newlyDeployed) return

  await pohRegistrationManager
    .connect(await ethers.getSigner(owner))
    .setManager(controller.address, true)

  console.log('Set registrar as a POH registration manager')

  if (owner !== deployer) {
    const c = await ethers.getContract('ETHRegistrarController', deployer)
    const tx = await c.transferOwnership(owner)
    console.log(
      `Transferring ownership of ETHRegistrarController to ${owner} (tx: ${tx.hash})...`,
    )
    await tx.wait()
  }

  // Only attempt to make controller etc changes directly on testnets
  if (network.name === 'mainnet') return

  console.log(
    'WRAPPER OWNER',
    await nameWrapper.owner(),
    await nameWrapper.signer.getAddress(),
  )
  const tx1 = await nameWrapper.setController(controller.address, true)
  console.log(
    `Adding ETHRegistrarController as a controller of NameWrapper (tx: ${tx1.hash})...`,
  )
  await tx1.wait()

  const tx2 = await reverseRegistrar.setController(controller.address, true)
  console.log(
    `Adding ETHRegistrarController as a controller of ReverseRegistrar (tx: ${tx2.hash})...`,
  )
  await tx2.wait()

  const artifact = await deployments.getArtifact('IETHRegistrarController')
  const interfaceId = computeInterfaceId(new Interface(artifact.abi))

  const resolver = await registry.resolver(ethers.utils.namehash('eth'))
  if (resolver === ethers.constants.AddressZero) {
    console.log(
      `No resolver set for .eth; not setting interface ${interfaceId} for ETH Registrar Controller`,
    )
    return
  }
  const resolverContract = await ethers.getContractAt('OwnedResolver', resolver)
  const tx3 = await resolverContract.setInterface(
    ethers.utils.namehash('eth'),
    interfaceId,
    controller.address,
  )
  console.log(
    `Setting ETHRegistrarController interface ID ${interfaceId} on .eth resolver (tx: ${tx3.hash})...`,
  )
  await tx3.wait()
}

func.tags = ['ethregistrar', 'ETHRegistrarController']
func.dependencies = [
  'ENSRegistry',
  'BaseRegistrarImplementation',
  'ReverseRegistrar',
  'NameWrapper',
  'OwnedResolver',
  'FixedPriceOracle',
  'PohVerifier',
  'PohRegistrationManager',
]

export default func
