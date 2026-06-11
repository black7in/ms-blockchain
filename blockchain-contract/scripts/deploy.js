const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Desplegando contrato con la cuenta:", deployer.address);

  const FacturaRegistry = await hre.ethers.getContractFactory("FacturaRegistry");
  const contrato = await FacturaRegistry.deploy();
  await contrato.waitForDeployment();

  const direccion = await contrato.getAddress();
  console.log("FacturaRegistry desplegado en:", direccion);
  console.log("");
  console.log("Guarda esta direccion y agregala a CONTRACT_ADDRESS en .env de ms-blockchain:");
  console.log("CONTRACT_ADDRESS=" + direccion);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
