import Transaction from '../models/transaction.model.js';

export const getTransactionsByUser = async (userId, options = {}) => {
    const page = Math.max(parseInt(options.page, 10) || 1, 1);
    const limit = Math.max(parseInt(options.limit, 10) || 25, 1);
    const sort = options.sort || 'createdAt';
    const order = options.order === 'asc' ? 1 : -1;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
        Transaction.find({ userId })
            .populate({
                path: 'campaignId',
                select: 'campaignName',
                model: 'Campaign',
            })
            .skip(skip)
            .limit(limit)
            .sort({ [sort]: order })
            .exec(),
        Transaction.countDocuments({ userId }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
        transactions,
        total,
        page,
        limit,
        totalPages,
    };
};
