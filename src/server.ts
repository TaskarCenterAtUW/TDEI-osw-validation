import App from './app';
import dotenv from 'dotenv';
import "reflect-metadata";
import { environment } from './environment/environment';
import healthController from './controller/health-controller';

//Load environment variables
dotenv.config()

const PORT: number = environment.appPort;

new App(
    [
        healthController
    ],
    PORT,
).listen();

