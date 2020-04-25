import { getRepository, getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import Category from '../models/Category';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

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
    // if (type !== 'income' && type !== 'outcome') {
    //   throw new AppError('This type do not exist', 400);
    // }
    const transactionRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const balance = await transactionRepository.getBalance();
    if (balance.total < value && type === 'outcome') {
      throw new AppError('You do not have enough balance');
    }

    let checkCategoryExists = await categoriesRepository.findOne({
      where: { title: category },
    });
    if (!checkCategoryExists) {
      const newCategory = categoriesRepository.create({
        title: category,
      });
      await categoriesRepository.save(newCategory);
      checkCategoryExists = newCategory;
    }
    const transaction = transactionRepository.create({
      title,
      value,
      type,
      category_id: checkCategoryExists.id,
    });
    await transactionRepository.save(transaction);
    return transaction;
  }
}

export default CreateTransactionService;
