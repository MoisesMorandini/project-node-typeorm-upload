import fs from 'fs';
import csvParse from 'csv-parse';
import { getCustomRepository, getRepository, In } from 'typeorm';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(path: string): Promise<Transaction[]> {
    const readCSVStrem = fs.createReadStream(path);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStrem.pipe(parseStream);

    const transactionsCSV: CSVTransaction[] = [];
    const categoriesCSV: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line;
      categoriesCSV.push(category);
      transactionsCSV.push({ title, type, value, category });
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    const categoryRepository = getRepository(Category);
    const existentCategories = await categoryRepository.find({
      where: {
        title: In(categoriesCSV),
      },
    });

    const existentCategoriesTitle = existentCategories.map(
      (category: Category) => category.title,
    );

    const addCategoriesTitles = categoriesCSV
      .filter(category => !existentCategoriesTitle.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoryRepository.create(
      addCategoriesTitles.map(title => ({
        title,
      })),
    );
    await categoryRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];
    const transactionRepository = getCustomRepository(TransactionsRepository);
    const createdTransactions = transactionRepository.create(
      transactionsCSV.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionRepository.save(createdTransactions);

    await fs.promises.unlink(path);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
