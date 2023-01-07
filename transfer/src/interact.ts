import { fetchAccount, isReady, Mina, PrivateKey, PublicKey, shutdown, UInt64 } from 'snarkyjs';
import fs from 'fs/promises';
import { Transfer } from './Transfer.js';

// check command line arg
if (process.argv.length < 4)
  throw Error(`Missing arguments.

Usage:
node build/src/interact.js <network> <amount>

Example:
node build/src/interact.js sandbox 5
`);
Error.stackTraceLimit = 1000;
let network = process.argv[2];
let amount = process.argv[3];

// parse config and private key from file
type Config = { networks: Record<string, { url: string; keyPath: string }> };
let configJson: Config = JSON.parse(await fs.readFile('config.json', 'utf8'));
let config = configJson.networks[network];
let key: { privateKey: string } = JSON.parse(
  await fs.readFile(config.keyPath, 'utf8')
);

await isReady;

let zkAppKey = PrivateKey.fromBase58(key.privateKey);

// set up Mina instance and contract we interact with
const Network = Mina.Network(config.url);
Mina.setActiveInstance(Network);
let zkAppAddress = zkAppKey.toPublicKey();
let zkApp = new Transfer(zkAppAddress);

// compile the contract to create prover keys
console.log('compile the contract...');
await Transfer.compile();

try {
  await fetchAccount({ publicKey: zkAppAddress });

  // call update() and send transaction
  console.log('build transaction and create proof...')

  let tx = await Mina.transaction({ feePayerKey: zkAppKey, fee: 0.1e9 }, () => {
    zkApp.transfer(zkAppAddress, UInt64.from(amount));
  });
  await tx.prove();
  console.log('send transaction...');
  let sentTx = await tx.send();

  if (sentTx.hash() !== undefined) {
    console.log(`
Success! Update transaction sent.

Your smart contract state will be updated
as soon as the transaction is included in a block.
Transaction hash: ${sentTx.hash()}
`);
  }
}
catch (err: any) {
  console.log(err.message);
}
shutdown();
