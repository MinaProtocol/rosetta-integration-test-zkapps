import {
  DeployArgs,
  Permissions,
  PublicKey,
  SmartContract,
  UInt64,
  method,
} from 'snarkyjs';

export class Transfer extends SmartContract {
  constructor(zkAppAddress: PublicKey) {
    super(zkAppAddress);
  }

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.account.permissions.set({
      ...Permissions.default(),
      send: Permissions.proofOrSignature(),
    });
  }

  @method transfer(receiverAddress: PublicKey, amount: UInt64) {
    this.send({
      to: receiverAddress,
      amount,
    });
  }
}
