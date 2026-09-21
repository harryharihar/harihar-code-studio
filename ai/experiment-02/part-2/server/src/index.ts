import "dotenv/config";

import express, {
  Request,
  Response,
} from "express";

import OpenAI from "openai";

const app = express();

app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const educationSchema = {
  type: "object",

  properties: {
    intent: {
      type: "string",
      enum: [
        "education_question",
        "out_of_scope",
      ],
    },

    subject: {
      type: "string",
    },

    topic: {
      type: "string",
    },

    difficulty: {
      type: "string",
      enum: [
        "beginner",
        "intermediate",
        "advanced",
      ],
    },

    explanation: {
      type: "string",
    },

    keyPoints: {
      type: "array",

      items: {
        type: "string",
      },
    },

    example: {
      type: "string",
    },
  },

  required: [
    "intent",
    "subject",
    "topic",
    "difficulty",
    "explanation",
    "keyPoints",
    "example",
  ],

  additionalProperties: false,
};

app.get(
  "/health",
  (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      experiment: "02",
    });
  }
);

app.post(
  "/api/education",
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const { prompt } = req.body;

      if (
        !prompt ||
        typeof prompt !== "string"
      ) {
        return res.status(400).json({
          error: "prompt is required",
        });
      }

      console.log(
        "\n=============================="
      );

      console.log(
        "USER PROMPT:"
      );

      console.log(prompt);

      console.log(
        "==============================\n"
      );

      const response =
        await openai.responses.create({
          model: "gpt-5.6",

          input: `
You are an education assistant.

Analyze the user's question and
return a structured educational
response.

If the question is related to
education, classify it as:

education_question

If the question is not related
to education, classify it as:

out_of_scope

User question:

${prompt}
`,

          text: {
            format: {
              type: "json_schema",

              name: "education_response",

              schema: educationSchema,

              strict: true,
            },
          },
        });

      console.log(
        "\nRAW OPENAI RESPONSE:"
      );

      console.log(
        response.output_text
      );

      const education =
        JSON.parse(
          response.output_text
        );

      console.log(
        "\nPARSED EDUCATION RESPONSE:"
      );

      console.log(
        JSON.stringify(
          education,
          null,
          2
        )
      );

      /*
       * React Native will receive:
       *
       * {
       *   education: {
       *     intent: "...",
       *     subject: "...",
       *     topic: "...",
       *     difficulty: "...",
       *     explanation: "...",
       *     keyPoints: [...],
       *     example: "..."
       *   }
       * }
       */

      return res.status(200).json({
        education,
      });
    } catch (error) {
      console.error(
        "\nEDUCATION API ERROR:"
      );

      console.error(error);

      return res.status(500).json({
        error:
          "Something went wrong while processing the education request.",
      });
    }
  }
);

app.listen(
  3000,
  () => {
    console.log(
      "Experiment 02 server running on http://localhost:3000"
    );
  }
);