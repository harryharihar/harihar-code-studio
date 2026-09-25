# Experiment 03 — Part 1: Tool Calling

## React Native + Node.js + OpenAI

This experiment demonstrates the fundamentals of **AI Tool Calling** by building a practical **AI Order Assistant**.

The application allows a user to ask questions such as:

```text
Where is my order 12345?
```

The AI determines that it needs an application tool, requests the tool call, the backend executes the actual function, and the result is sent back to the AI so it can generate the final response.

## What We Build

The application consists of two parts:

- **React Native / Expo mobile application**
- **Node.js / Express / TypeScript backend**

The backend communicates with OpenAI and is responsible for executing application-defined tools.

Example:

```text
User:
Where is my order 12345?

        ↓

OpenAI:
function_call
getOrderStatus
{ "orderId": "12345" }

        ↓

Backend:
executeTool()

        ↓

Order Service:
getOrderStatus("12345")

        ↓

Order Data:
{
  "found": true,
  "orderId": "12345",
  "status": "out_for_delivery",
  "estimatedDelivery": "Today"
}

        ↓

OpenAI:
function_call_output

        ↓

Final response:
Order 12345 is out for delivery and is expected to arrive today.

        ↓

React Native
```

## Core Concept

The most important concept in this experiment is:

> **The AI decides which tool it needs. The application executes the tool.**

The AI model does **not** directly execute our JavaScript function or access our application database.

Instead:

1. The application sends the user request and available tools to the model.
2. The model decides whether a tool is required.
3. The model returns a `function_call`.
4. The backend reads the function name and arguments.
5. The backend executes the corresponding application function.
6. The backend returns the result as `function_call_output`.
7. The model uses the tool result to generate the final response.
8. React Native displays the response.

## Architecture

```text
┌─────────────────┐
│  React Native   │
│     Mobile      │
└────────┬────────┘
         │
         │ POST /api/chat
         ▼
┌─────────────────┐
│ Node.js /       │
│ Express Backend │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     OpenAI      │
└────────┬────────┘
         │
         │ function_call
         ▼
┌─────────────────┐
│  executeTool()  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Order Service  │
└────────┬────────┘
         │
         ▼
     Order Data
         │
         │ function_call_output
         ▼
┌─────────────────┐
│     OpenAI      │
└────────┬────────┘
         │
         ▼
    Final response
         │
         ▼
┌─────────────────┐
│  React Native   │
└─────────────────┘
```

## Project Structure

```text
part-1/
├── mobile/
│   ├── app/
│   │   └── index.tsx
│   │
│   └── src/
│       └── api/
│           └── chat.ts
│
├── server/
│   ├── src/
│   │   ├── ai/
│   │   │   ├── openai.ts
│   │   │   └── runToolCalling.ts
│   │   │
│   │   ├── data/
│   │   │   └── orders.ts
│   │   │
│   │   ├── services/
│   │   │   └── orderService.ts
│   │   │
│   │   ├── tools/
│   │   │   ├── orderTools.ts
│   │   │   └── toolExecutor.ts
│   │   │
│   │   └── index.ts
│   │
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   └── tsconfig.json
│
└── README.md
```

## Backend Responsibilities

The backend is responsible for:

1. Receiving the user's prompt.
2. Sending the prompt and available tools to OpenAI.
3. Reading the model's `function_call`.
4. Executing the requested application function.
5. Sending the tool result back to OpenAI.
6. Returning the final AI response to React Native.

## Available Tools

### `getOrderStatus`

Returns:

- Order ID
- Current order status
- Estimated delivery

Example:

```json
{
  "orderId": "12345"
}
```

Example result:

```json
{
  "found": true,
  "orderId": "12345",
  "status": "out_for_delivery",
  "estimatedDelivery": "Today"
}
```

### `getOrderDetails`

Returns additional information about an order:

- Customer
- Item
- Quantity
- Total
- Status
- Estimated delivery

Example user request:

```text
What did I order in order 12345?
```

The model can request:

```text
getOrderDetails
```

## Backend Setup

Navigate to the server:

```bash
cd server
```

Install dependencies:

```bash
npm install
```

Create a `.env` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

> Never commit the real `.env` file or an actual API key. Keep the real key only in the local `.env` file.

Start the development server:

```bash
npm run dev
```

The server runs on:

```text
http://localhost:3000
```

## Test the Backend

### Health Check

```bash
curl http://localhost:3000/health
```

### Tool Calling

```bash
curl -X POST http://localhost:3000/api/chat   -H "Content-Type: application/json"   -d '{"prompt":"Where is my order 12345?"}'
```

Expected response:

```json
{
  "response": "Order 12345 is out for delivery and is expected to arrive today."
}
```

## Run the Mobile Application

Navigate to the mobile application:

```bash
cd mobile
```

Start Expo:

```bash
npx expo start
```

Launch the iOS simulator or another supported Expo development target.

The mobile application sends the user's request to:

```text
POST /api/chat
```

The backend handles the complete Tool Calling workflow.

## Security

The OpenAI API key belongs on the backend.

The React Native application should not contain the OpenAI API key.

Use this architecture:

```text
React Native
     ↓
Your Backend
     ↓
OpenAI
```

Not:

```text
React Native
     ↓
OpenAI API directly
```

The `.env` file is intentionally ignored by Git, while `.env.example` contains only a placeholder.

## What We Learned

This experiment covers:

- What Tool Calling is
- How to define application tools
- How the model requests a function
- How to inspect `function_call`
- How the backend executes the requested function
- How to return `function_call_output`
- How to continue the response using the previous response
- How React Native communicates with the backend
- Why tool execution remains under application control
- Why API keys should remain server-side

## Experiment Status

**Experiment 03 — Part 1: Completed**

## Next

Part 2 will build on this foundation and explore a more advanced Tool Calling workflow.

## About Harihar Code Studio

**Harihar Code Studio** focuses on practical software engineering tutorials covering:

- React Native
- Mobile Engineering
- Artificial Intelligence
- LLM integrations
- AI architecture
- Developer tools
- Production engineering

The goal is to understand not only how to implement a feature, but also the architecture and engineering decisions behind it.
