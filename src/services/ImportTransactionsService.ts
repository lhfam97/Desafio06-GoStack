import { getCustomRepository, getRepository, In, TransactionRepository } from 'typeorm';
import path from 'path';
import fs from 'fs';
import csvParse from 'csv-parse';
import uploadConfig from '../config/upload';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

import Category from '../models/Category';
interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}
interface Request {
  filePath: string;
}
class ImportTransactionsService {
  async execute({ filePath }: Request): Promise<Transaction[]> {
    const newTransactions: CSVTransaction[] = [];
    const categories: string[] = []
    const transactionRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);
    const fileCsvPath = path.join(uploadConfig.directory, filePath);
    const contactsReadStream = await fs.createReadStream(fileCsvPath);

    const parsers = csvParse({
      delimiter: ',',
      from_line: 2,
    });

    const parseCSV = contactsReadStream.pipe(parsers);

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) => cell.trim())
      if (!title || !type || !value) return;
      categories.push(category);

      newTransactions.push({ title, type, value, category });

    })

    await new Promise(resolve => parseCSV.on('end', resolve));


    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];

    const createdTransactions = transactionRepository.create(
      newTransactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(category => category.title = transaction.category)
      }))
    )

    await transactionRepository.save(createdTransactions);

    await fs.promises.unlink(fileCsvPath);

    return createdTransactions;

  }
}

export default ImportTransactionsService;
