import {
  IoTDataPlaneClient,
  PublishCommand,
} from '@aws-sdk/client-iot-data-plane'
import { env } from '../../config/env.js'

const client = new IoTDataPlaneClient({
  endpoint: `https://${env.IOT_ENDPOINT}`,
  region: env.AWS_REGION,
})

export async function publishIot(
  topic: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await client.send(
    new PublishCommand({
      topic,
      payload: new TextEncoder().encode(JSON.stringify(payload)),
      qos: 1,
    }),
  )
}
