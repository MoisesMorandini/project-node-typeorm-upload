import { EntityRepository, Repository, getRepository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const balanceDefault: Balance = {
      income: 0,
      outcome: 0,
      total: 0,
    };

    const transactionsRepository = getRepository(Transaction);
    const transactions = await transactionsRepository.find();

    const balance = transactions.reduce((accumulator, currently) => {
      if (currently.type === 'income') {
        accumulator.income += currently.value;
      } else {
        accumulator.outcome += currently.value;
      }
      accumulator.total = accumulator.income - accumulator.outcome;
      return accumulator;
    }, balanceDefault);
    return balance;
  }
}

export default TransactionsRepository;
