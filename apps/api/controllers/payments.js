import stripe from '../utils/stripe.js';
import { PrismaClient } from '@prisma/client';
import { sendTelegramNotification } from '../utils/telegram.js';
import { CLERK_SECRET_KEY } from '../config/clerkConfig.js';
import fetch from 'node-fetch';
const prisma = new PrismaClient();

// ✅ URL для продакшена
// eslint-disable-next-line no-undef
const FRONTEND_URL = process.env.FRONTEND_URL || "https://worknowjob.com";

export const createCheckoutSession = async (req, res) => {
  const { clerkUserId, priceId } = req.body;

  if (!clerkUserId) {
    return res.status(400).json({ error: 'clerkUserId is required' });
  }

  let user, finalPriceId;

  try {
    // 🔹 Получаем пользователя из базы
    user = await prisma.user.findUnique({
      where: { clerkUserId },
    });

    if (!user || !user.email) {
      return res.status(404).json({ error: 'Пользователь не найден или отсутствует email' });
    }

    // ✅ Формируем ссылки для продакшена
    const successUrl = `${FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${FRONTEND_URL}/cancel`;

    // 🔹 Выбираем нужный priceId
    const defaultPriceId = 'price_1Qt63NCOLiDbHvw13PRhpenX'; // Test mode recurring subscription price ID
    finalPriceId = priceId || defaultPriceId;

    console.log('🔍 Creating Stripe session with:', {
      clerkUserId,
      priceId: finalPriceId,
      userEmail: user.email,
      successUrl,
      cancelUrl
    });

    // 🔹 Создаем Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: user.email,
      line_items: [
        {
          price: finalPriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { clerkUserId, priceId: finalPriceId },
    });

    console.log('✅ Stripe session created successfully:', session.id);
    res.json({ url: session.url });
  } catch (error) {
    console.error('❌ Ошибка при создании Checkout Session:', error);
    console.error('❌ Error details:', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
      raw: error.raw
    });
    console.error('❌ Request data:', { clerkUserId, priceId, userEmail: user?.email });
    res.status(500).json({ error: 'Ошибка при создании сессии' });
  }
};

export const activatePremium = async (req, res) => {
  const { sessionId } = req.body;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const clerkUserId = session.metadata.clerkUserId; // Получаем ID пользователя
    const subscriptionId = session.subscription; // ID подписки в Stripe
    const priceId = session.metadata.priceId;

    if (session.payment_status === 'paid') {
      const user = await prisma.user.update({
        where: { clerkUserId },
        data: {
          isPremium: true,
          premiumEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 дней подписки
          isAutoRenewal: !!subscriptionId,
          stripeSubscriptionId: subscriptionId || null,
          premiumDeluxe: priceId === 'price_1RfHjiCOLiDbHvw1repgIbnK',
        },
        include: { jobs: { include: { city: true } } }, // Подгружаем вакансии
      });

      // 🔹 Отправляем уведомление в Telegram
      await sendTelegramNotification(user, user.jobs);

      // Если deluxe — отправляем автоматическое сообщение
      if (priceId === 'price_1RfHjiCOLiDbHvw1repgIbnK') {
        // Можно кастомизировать текст и контакты менеджера
        await prisma.message.create({
          data: {
            clerkUserId,
            title: 'Добро пожаловать в Premium Deluxe!',
            body: 'Для активации функции автопостинга напишите вашему персональному менеджеру: <a href="mailto:peterbaikov12@gmail.com">peterbaikov12@gmail.com</a>',
            type: 'system',
          }
        });
        // Email отправится автоматически через триггер в контроллере messages.js
      } else {
        // Обычный премиум — поздравительное письмо и сообщение
        const title = 'Спасибо за покупку премиум-подписки на WorkNow!';
        const body = `Здравствуйте!<br><br>
          Спасибо, что приобрели премиум-подписку на WorkNow.<br>
          Ваша подписка активирована.<br>
          <b>Чек об оплате был отправлен на ваш электронный адрес.</b><br><br>
          Если у вас возникнут вопросы — пишите в поддержку!`;
        await prisma.message.create({
          data: {
            clerkUserId,
            title,
            body,
            type: 'system',
          }
        });
        // Email отправится автоматически через триггер в контроллере messages.js
      }

      // --- Обновляем publicMetadata в Clerk ---
      const publicMetadata = {
        isPremium: true,
        premiumDeluxe: priceId === 'price_1RfHjiCOLiDbHvw1repgIbnK',
      };
      await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        },
        body: JSON.stringify({ public_metadata: publicMetadata }),
      });
      // --- конец обновления Clerk ---

      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Платеж не прошел' });
    }
  } catch (error) {
    console.error('❌ Ошибка активации премиума:', error);
    res.status(500).json({ error: 'Ошибка активации премиума' });
  }
};

export const cancelAutoRenewal = async (req, res) => {

  const { clerkUserId } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { clerkUserId },
    });

    if (!user) {
      console.error("❌ Ошибка: пользователь не найден.");
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (!user.isAutoRenewal) {
      console.warn("⚠️ Автопродление уже отключено.");
      return res.status(400).json({ error: 'Автопродление уже отключено' });
    }

    if (!user.stripeSubscriptionId) {
      // Нет Stripe-подписки, но автопродление включено — просто отключаем в базе
      console.warn(`⚠️ У пользователя ${user.email} нет stripeSubscriptionId, но isAutoRenewal=true. Отключаем только в базе.`);
      await prisma.user.update({
        where: { clerkUserId },
        data: { isAutoRenewal: false },
      });
      return res.json({ success: true, message: 'Автопродление подписки отключено (без Stripe).' });
    }

    // 🔹 Отключаем автопродление в Stripe
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // 🔹 Обновляем статус в базе
    await prisma.user.update({
      where: { clerkUserId },
      data: { isAutoRenewal: false },
    });

    res.json({ success: true, message: 'Автопродление подписки отключено.' });
  } catch (error) {
    console.error('❌ Ошибка при отключении автообновления:', error);
    res.status(500).json({ error: 'Ошибка при отключении автообновления' });
  }
};

export const addPaymentHistory = async (req, res) => {
  const { clerkUserId, month, amount, type, date } = req.body;
  try {
    const payment = await prisma.payment.create({
      data: {
        clerkUserId,
        month,
        amount,
        type,
        date: new Date(date),
      },
    });
    res.json({ success: true, payment });
  } catch (e) {
    console.error('Ошибка при добавлении платежа:', e);
    res.status(500).json({ error: 'Ошибка при добавлении платежа' });
  }
};

export const getPaymentHistory = async (req, res) => {
  const { clerkUserId } = req.query;

  if (!clerkUserId) {
    return res.status(400).json({ error: 'clerkUserId обязателен' });
  }

  try {
    const payments = await prisma.payment.findMany({
      where: { clerkUserId },
      orderBy: { date: 'desc' },
    });

    res.json({ payments });
  } catch (error) {
    console.error('Ошибка при получении истории платежей:', error);
    res.status(500).json({ error: 'Ошибка при получении истории платежей' });
  }
};

export const renewAutoRenewal = async (req, res) => {
  const { clerkUserId } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    if (user.isAutoRenewal) {
      return res.status(400).json({ error: 'Автопродление уже включено' });
    }
    await prisma.user.update({
      where: { clerkUserId },
      data: { isAutoRenewal: true },
    });
    res.json({ success: true, message: 'Автопродление подписки включено.' });
  } catch (error) {
    console.error('❌ Ошибка при включении автопродления:', error);
    res.status(500).json({ error: 'Ошибка при включении автопродления' });
  }
};

export const getStripePaymentHistory = async (req, res) => {
  const { clerkUserId, limit = 10, offset = 0 } = req.query;
  try {
    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    // Получаем stripeCustomerId или email
    const customerEmail = user.email;
    // Получаем клиента Stripe по email (если нет stripeCustomerId)
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      // Поиск по email
      const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }
    if (!customerId) {
      return res.json({ payments: [], total: 0 });
    }
    // Получаем invoices (можно заменить на charges, если нужно)
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: Number(limit),
      starting_after: offset ? undefined : undefined // Stripe не поддерживает offset, нужна своя пагинация через starting_after
    });
    // Для простоты: только limit, без offset (Stripe рекомендует keyset-пагинацию)
    // Можно реализовать пагинацию через last invoice id (starting_after)
    const payments = invoices.data.map(inv => ({
      id: inv.id,
      amount: inv.amount_paid / 100,
      currency: inv.currency,
      date: new Date(inv.created * 1000),
      status: inv.status,
      description: inv.description,
      period: inv.period_start ? new Date(inv.period_start * 1000) : null,
      type: inv.lines.data[0]?.description || 'Premium',
    }));
    res.json({ payments, total: invoices.data.length });
  } catch (error) {
    console.error('Ошибка при получении истории Stripe:', error);
    res.status(500).json({ error: 'Ошибка при получении истории Stripe' });
  }
};
