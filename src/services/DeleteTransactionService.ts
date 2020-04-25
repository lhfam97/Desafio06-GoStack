import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  id: string;
}
class DeleteTransactionService {
  public async execute({ id }: Request): Promise<void> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const findTransactionRepository = await transactionsRepository.findOne({
      where: { id },
    });

    if (findTransactionRepository) {
      await transactionsRepository.remove(findTransactionRepository);
    } else {
      throw new AppError('Transaction do not exist');
    }
  }
}
export default DeleteTransactionService;
