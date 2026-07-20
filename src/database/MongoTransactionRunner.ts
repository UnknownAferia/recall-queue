import mongoose, { type ClientSession } from "mongoose";

export interface TransactionRunner {
  run<T>(operation: (session: ClientSession) => Promise<T>): Promise<T>;
}

export class MongoTransactionRunner implements TransactionRunner {
  public async run<T>(
    operation: (session: ClientSession) => Promise<T>,
  ): Promise<T> {
    return mongoose.connection.transaction(operation);
  }
}
