const AWS = require("aws-sdk");
const ecs = new AWS.ECS({ region: "us-west-2" });

exports.handler = async (event) => {
    const batchItemFailures = [];
    console.log("PRIVATE_SUBNET_ONE_ID:", process.env.PRIVATE_SUBNET_ONE_ID);
    console.log("PRIVATE_SUBNET_TWO_ID:", process.env.PRIVATE_SUBNET_TWO_ID);
    console.log("SECURITY_GROUP_ID:", process.env.SECURITY_GROUP_ID);

    console.log(`Processing SQS messages from queue:`, event);

    const processRecord = async (record) => {
        const body = JSON.parse(record.body);
        const objectKey = body.key;
        const uuidMatch = objectKey.match(/([0-9a-fA-F-]{36})/);
        const uuid = uuidMatch ? uuidMatch[0] : null;

        if (!uuid) {
            throw new Error('UUID not found in object key');
        }

        console.log("UUID:", uuid);

        const vpcConfiguration = {
            subnets: [process.env.PRIVATE_SUBNET_ONE_ID, process.env.PRIVATE_SUBNET_TWO_ID],
            securityGroups: [process.env.SECURITY_GROUP_ID]
        };

        const params = {
            startedBy: uuid,
            taskDefinition: "web-stream-task",
            cluster: "web-stream-cluster",
            overrides: {
                containerOverrides: [
                    {
                        name: 'web-stream-container',
                        environment: [
                            { name: 'UUID_TO_PROCESS', value: uuid },
                            { name: 'STREAM_URL', value: 'https://transformed-videos-streamer-ritvik.s3.us-west-2.amazonaws.com' }
                        ]
                    }
                ]
            },
            launchType: "FARGATE",
            networkConfiguration: {
                awsvpcConfiguration: vpcConfiguration
            }
        };

        const data = await ecs.runTask(params).promise();
        console.log("Task started successfully:", data);
    };

    try {
        for (const record of event.Records) {
            try {
                await processRecord(record);
            } catch (error) {
                console.error('Error processing record:', record, error);
                batchItemFailures.push({ itemIdentifier: record.messageId });
            }
        }

        return { batchItemFailures };

    } catch (err) {
        console.error('Error processing messages:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Failed to process messages',
                error: err.message,
            }),
        };
    }
};
