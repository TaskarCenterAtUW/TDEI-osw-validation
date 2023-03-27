import dotenv from 'dotenv';
import { ServiceProvider } from 'nodets-ms-core/lib/types/provider';
dotenv.config();
/**
 * Contains all the configurations required for setting up the core project
 * While most of the parameters are optional, appInsights connection is 
 * a required parameter since it is auto imported in the `tdei_logger.ts`
 */
export const environment = {
    appName: process.env.npm_package_name,
    eventBus: {
        connectionString: process.env.EVENT_BUS_CONNECTION,
        uploadTopic: process.env.UPLOAD_TOPIC,
        uploadSubscription: process.env.UPLOAD_SUBSCRIPTION,
        validationTopic: process.env.VALIDATION_TOPIC
    },
    appPort: parseInt(process.env.APPLICATION_PORT ?? "8080"),
    authPermissionUrl: process.env.AUTH_PERMISSION_URL,
    authProvider: <ServiceProvider>(process.env.AUTH_SIMULATE ? "Simulated" : "Hosted")
}