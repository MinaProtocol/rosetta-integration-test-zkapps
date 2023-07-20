import {
  DeployArgs,
  Permissions,
  PublicKey,
  SmartContract,
  UInt64,
  method,
} from 'snarkyjs';

export class Transfer extends SmartContract {
  initialBalance: string | number | UInt64 | undefined;

  constructor(
    zkAppAddress: PublicKey,
    initialBalance?: string | number | UInt64 | undefined
  ) {
    super(zkAppAddress);

    this.initialBalance = initialBalance;
  }

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.account.permissions.set({
      ...Permissions.default(),
      send: Permissions.proofOrSignature(),
    });
    if (this.initialBalance != undefined) {
      this.balance.addInPlace(this.initialBalance);
    }
  }

  @method transfer(receiverAddress: PublicKey, amount: UInt64) {
    this.send({
      to: receiverAddress,
      amount,
    });
  }
}
