import Stripe from 'stripe';
import dotenv from "dotenv";
dotenv.config();

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const STRIPE_KEY = process.env.STRIPE_PRIVATE_KEY!;
const STRIPE_API_VERSION = '2022-08-01';

export default new Stripe(STRIPE_KEY, { apiVersion: STRIPE_API_VERSION },);
