import express from 'express';
import cors from 'cors';  
import cookieParser from 'cookie-parser';
import {config} from 'dotenv';
config();
import morgan from 'morgan';
import userRoutes from './routes/user.routes.js'
import courseRoutes from './routes/course.routes.js'
import paymentRoutes from './routes/payment.routes.js'
import errorMiddleware from './middlewares/error.middleware.js';
import miscRoutes from './routes/miscellaneous.routes.js';

const app = express();

app.use(express.json()); // If data comes in JSON format, convert it into a JavaScript object
app.use(express.urlencoded({extended:true})); // "If data comes from a form (URL-encoded), convert it into a usable JavaScript object."
// name=deepak&age=22       (convert to)
// {
//   name: "deepak",
//   age: "22"
// }

app.use(cookieParser());

const allowedOrigins = process.env.FRONTEND_URL.split(",");
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

// morgan
app.use(morgan('dev'));

// to check server is up or not
app.use('/ping', function(req,res){
    res.send('/pong');
});

// routes of 3 modules
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1', miscRoutes);


app.use((req,res) => {
    res.status(404).send('OOPS!! 404 page not found');
});

// If you reached here means you did some mistake otherwise above routes should run.
// all next(error) coming here to this errorMiddleware
app.use(errorMiddleware);

export default app;