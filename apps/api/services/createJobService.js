import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

export const createJobService = async (jobData) => {
  const { title, description, salary, cityId, categoryId, userId, phone } = jobData;

  try {
    const job = await prisma.job.create({
      data: {
        title,
        description,
        salary: parseInt(salary),
        cityId: parseInt(cityId),
        categoryId: parseInt(categoryId),
        userId,
        phone,
        status: 'ACTIVE',
      },
      include: {
        city: true,
        category: true,
      },
    });

    return job;
  } catch (error) {
    console.error('Error creating job:', error);
    throw new Error('Failed to create job');
  }
}; 