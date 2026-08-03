import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';

import routes from './src/routes/index.js';
import { errorHandler } from './src/utils/response.handler.js';
import stripeWebhookRoutes from './src/routes/stripe.routes.js';

const app = express();

app.use(cors('*'));
app.use(morgan('dev'));

// Stripe webhook must be before bodyParser.json()
app.use('/api/stripe', stripeWebhookRoutes);


// Now JSON parser AFTER webhooks
app.use(bodyParser.json());


app.get('/', (req, res) => {
    res.send('Hello World!!');
});

app.use('/api', routes);

app.use((req, res) => {
    res.status(404).send('The requested endpoint does not exist on the server.');
});


// GLOBAL ERROR HANDLER
app.use(errorHandler);

export default app;
