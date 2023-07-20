import fs from 'fs/promises';
import { AccountUpdate, Mina, PrivateKey, PublicKey, UInt64 } from 'snarkyjs';
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
const deployAlias = process.argv[2];
const recipientAddress = process.argv[3];
const amount = process.argv[4];

// parse config and private key from file
type Config = {
  deployAliases: Record<
    string,
    {
      url: string;
      keyPath: string;
      fee: string;
      feepayerKeyPath: string;
      feepayerAlias: string;
    }
  >;
};
let configJson: Config = JSON.parse(await fs.readFile('config.json', 'utf8'));
let config = configJson.deployAliases[deployAlias];
let feepayerKeysBase58: { privateKey: string; publicKey: string } = JSON.parse(
  await fs.readFile(config.feepayerKeyPath, 'utf8')
);

let zkAppKeysBase58: { privateKey: string; publicKey: string } = JSON.parse(
  await fs.readFile(config.keyPath, 'utf8')
);

let feepayerKey = PrivateKey.fromBase58(feepayerKeysBase58.privateKey);
let zkAppKey = PrivateKey.fromBase58(zkAppKeysBase58.privateKey);

// set up Mina instance and contract we interact with
const Network = Mina.Network(config.url);
const fee = Number(config.fee) * 1e9; // in nanomina (1 billion = 1.0 mina)
Mina.setActiveInstance(Network);
let feepayerAddress = feepayerKey.toPublicKey();
let zkAppAddress = zkAppKey.toPublicKey();
let zkApp = new Transfer(zkAppAddress);

// compile the contract to create prover keys
console.log('compile the contract...');
await Transfer.compile();
try {
  // call transfer() and send transaction
  console.log('build transaction and create proof...');

  let tx = await Mina.transaction({ sender: feepayerAddress, fee }, () => {
    const feePayerUpdate = AccountUpdate.createSigned(feepayerAddress);
    feePayerUpdate.send({ to: zkAppAddress, amount: UInt64.from(500) });
    zkApp.transfer(PublicKey.fromBase58(recipientAddress), UInt64.from(amount));
  });
  tx.sign([feepayerKey]);
  await tx.prove();
  console.log('send transaction...');
  let sentTx = await tx.send();

  if (sentTx?.hash() !== undefined) {
    console.log(`
  Success! Update transaction sent.
  
  Your smart contract state will be updated
  as soon as the transaction is included in a block:
  https://berkeley.minaexplorer.com/transaction/${sentTx.hash()}
  `);
  }
} catch (err: any) {
  console.log(err.message);
}
