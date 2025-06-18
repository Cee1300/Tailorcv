const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const client = new BedrockRuntimeClient({ region: 'us-east-1' });

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    let body;

    // ✅ Handle both API Gateway and test console inputs
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (err) {
        console.error('Invalid JSON body:', event.body);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid JSON in body' }),
        };
      }
    } else {
      body = event;
    }

    const { resume, jobDescription } = body;

    if (!resume || !jobDescription) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Resume and job description are required.' }),
      };
    }

    const prompt = `
You are a professional resume and cover letter writer.

Based on the applicant’s resume:
${resume}

And the job description:
${jobDescription}

Generate two clearly labeled sections:

Tailored Resume:
(Provide the revised resume here)

Custom Cover Letter:
(Provide the tailored cover letter here)
`;

    const input = {
      modelId: 'amazon.titan-tg1-large',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        inputText: prompt,
        textGenerationConfig: {
          maxTokenCount: 600,
          temperature: 0.7,
          topP: 0.9,
        },
      }),
    };

    const command = new InvokeModelCommand(input);
    const response = await client.send(command);
    const responseBody = await response.body.transformToString();

    const output = JSON.parse(responseBody).results?.[0]?.outputText || 'No result generated';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ result: output }),
    };
  } catch (error) {
    console.error('Bedrock error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error generating content' }),
    };
  }
};