import App from './app';
import dotenv from 'dotenv';
import "reflect-metadata";
import HealthController from './controller/health-controller';
import { environment } from './environment/environment';

//Load environment variables
dotenv.config()

const PORT: number = environment.appPort;

new App(
    [
        new HealthController()
    ],
    PORT,
).listen();

