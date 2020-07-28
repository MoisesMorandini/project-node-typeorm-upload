import { getCustomRepository, getRepository } from 'typeorm';
import TransactionsRepository from '../repositories/TransactionsRepository';
import AppError from '../errors/AppError';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const categoryRepository = getRepository(Category);
    const categoryExists = await categoryRepository.findOne({
      where: {
        title: category,
      },
    });

    let createCategory: Category;

    if (!categoryExists) {
      createCategory = categoryRepository.create({
        title: category,
      });
      await categoryRepository.save(createCategory);
    } else {
      createCategory = categoryExists;
    }

    const transactionRepository = getCustomRepository(TransactionsRepository);

    if (type === 'outcome') {
      const balance = await transactionRepository.getBalance();
      if (value > balance.total) {
        throw new AppError(
          `Impossible do this action, because you don't have sufficient income!`,
        );
      }
    }

    const transaction = transactionRepository.create({
      title,
      type,
      value,
      category_id: createCategory.id,
    });
    transaction.category = createCategory;
    await transactionRepository.save(transaction);
    return transaction;
  }
}

export default CreateTransactionService;
